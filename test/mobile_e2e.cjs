const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function testMobileE2E() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173');
    await require('./unlock.cjs')(page);
    console.log('✓ Mobile page loaded (390x844)');

    // Reach the game through the touch-friendly introduction.
    await page.locator('#btn-hello-next.visible').tap();
    await page.locator('#btn-isabella-next').tap();
    await page.locator('#wax-seal').tap();
    await page.locator('#btn-enter-arcade:not(.hidden)').tap();
    await page.waitForSelector('#scene-claw.active:not(.arcade-arriving)', { timeout: 4000 });
    console.log('✓ Mobile Scene 4 (Claw Machine) active');

    // Verify speech bubbles on mobile do not overflow viewport
    const otterBubbleBox = await page.locator('#otter-claw-bubble').boundingBox();
    const bunnyBubbleBox = await page.locator('#bunny-claw-bubble').boundingBox();

    console.log('  Otter bubble bounding box:', otterBubbleBox);
    console.log('  Bunny bubble bounding box:', bunnyBubbleBox);

    if (!otterBubbleBox || otterBubbleBox.x < 0) {
      throw new Error(`Otter bubble clipped on left edge: x=${otterBubbleBox?.x}`);
    }
    if (!bunnyBubbleBox || (bunnyBubbleBox.x + bunnyBubbleBox.width > 390)) {
      throw new Error(`Bunny bubble clipped on right edge: x+width=${bunnyBubbleBox ? bunnyBubbleBox.x + bunnyBubbleBox.width : 0}`);
    }
    console.log('✓ Mascot speech bubbles stay 100% within mobile viewport boundaries!');

    // 2. Insert Coin
    const btnCoin = page.locator('#btn-coin');
    await btnCoin.tap();
    await page.waitForTimeout(150);
    const creditText = await page.textContent('#credit-display .led-text');
    console.log('  LED credits after mobile tap:', creditText);
    if (creditText !== '02') throw new Error('Coin insert failed on mobile');
    console.log('✓ Mobile coin tap confirmed');

    // 3. Move Joystick Left & Right with touch
    const btnLeft = page.locator('#btn-left');
    await btnLeft.dispatchEvent('pointerdown');
    await page.waitForTimeout(100);
    await btnLeft.dispatchEvent('pointerup');
    console.log('✓ Mobile joystick left touch confirmed');

    // 4. Drop claw
    const btnDrop = page.locator('#btn-drop');
    await btnDrop.tap();
    console.log('✓ Mobile DROP button tapped');

    // Wait for prize in tray
    await page.waitForSelector('.tray-capsule', { timeout: 8000 });
    console.log('✓ Capsule landed in tray on mobile!');

    // Tap tray capsule to open modal
    await page.locator('.tray-capsule').tap();
    await page.waitForSelector('#capsule-modal:not(.hidden)');
    console.log('✓ Mobile capsule modal opened!');

    // Crack 3 times
    const shell = page.locator('#capsule-shell');
    await shell.tap();
    await page.waitForTimeout(120);
    await shell.tap();
    await page.waitForTimeout(120);
    await shell.tap();
    await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
    console.log('✓ Capsule cracked open on mobile!');

    // Click whatever action button is visible
    const btnAction = page.locator('#btn-collect-continue:not(.hidden), #btn-try-again:not(.hidden)');
    await btnAction.first().tap();
    await page.locator('#capsule-modal').waitFor({ state: 'hidden' });
    console.log('✓ First capsule collected/dismissed on mobile');

    // Test Golden Prank on mobile
    console.log('Testing Golden Egg Prank on mobile...');
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'empty', color: 'gold' } }));
    });
    await page.waitForSelector('#capsule-modal:not(.hidden)');
    const goldShell = page.locator('#capsule-shell');
    await goldShell.tap();
    await page.waitForTimeout(100);
    await goldShell.tap();
    await page.waitForTimeout(100);
    await goldShell.tap();
    await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
    await page.waitForTimeout(900);

    const prankOtter = await page.textContent('#otter-claw-bubble');
    console.log('  Mobile Otter bubble on prank:', prankOtter);
    if (!prankOtter.includes('HAHAHAHAHA, FOOLED YOU HAHAHAA!')) {
      throw new Error('Prank bubble missing requested text');
    }

    const prankBunny = await page.textContent('#bunny-claw-bubble');
    console.log('  Mobile Bunny bubble on prank:', prankBunny);
    if (!prankBunny.includes('Ugh soooo annoyinggg')) {
      throw new Error('Prank bunny bubble missing annoyinggg');
    }
    console.log('✓ Mobile prank dialogues confirmed!');

    await page.locator('#btn-try-again:not(.hidden)').tap();
    await page.locator('#capsule-modal').waitFor({ state: 'hidden' });

    // Collect all 3 items to test final progression on mobile
    console.log('Completing all 3 items into collectibles on mobile...');
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('itemCollected', { detail: { reward: 'chocolate' } }));
      document.dispatchEvent(new CustomEvent('itemCollected', { detail: { reward: 'flower' } }));
      document.dispatchEvent(new CustomEvent('itemCollected', { detail: { reward: 'key' } }));
    });
    await page.waitForTimeout(300);

    // Click key in collectibles shelf on mobile
    await page.locator('#slot-key').click({ force: true });
    await page.waitForSelector('#capsule-modal:not(.hidden)');

    // Unroll scroll and click "Lessgo Kuttupups !"
    await page.waitForSelector('.mini-scroll.unrolled', { timeout: 3000 });
    const btnGotoWindow = page.locator('#btn-goto-window');
    await btnGotoWindow.waitFor({ state: 'visible', timeout: 3000 });
    await btnGotoWindow.click({ force: true });

    // Scene 5 (Arched Window)
    await page.waitForSelector('#scene-window.active', { timeout: 4000 });
    console.log('✓ Scene 5 (Window) active on mobile!');

    // Verify key & keyhole bounding boxes
    const key = page.locator('#draggable-key');
    const keyhole = page.locator('#keyhole');
    const keyBox = await key.boundingBox();
    const keyholeBox = await keyhole.boundingBox();

    if (!keyBox || !keyholeBox) throw new Error('Key or keyhole bounding box not found on mobile');

    console.log('  Key position:', keyBox);
    console.log('  Keyhole position:', keyholeBox);

    // Drag key to keyhole using pointer events
    const startX = keyBox.x + keyBox.width / 2;
    const startY = keyBox.y + keyBox.height / 2;
    const endX = keyholeBox.x + keyholeBox.width / 2;
    const endY = keyholeBox.y + keyholeBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(endX, endY, { steps: 12 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    // Verify unlock & transition to Scene 6
    await page.waitForSelector('.window-lock.unlocked', { timeout: 6000 });
    console.log('✓ Mobile window padlock unlocked!');

    await page.waitForSelector('#scene-sky.active', { timeout: 8000 });
    console.log('✓ Scene 6 (Starry Sky) active on mobile!');

    const btnReplay = page.locator('#btn-replay');
    await btnReplay.tap();
    await page.waitForSelector('#scene-hello.active, #scene-claw.active', { timeout: 4000 });
    console.log('✓ Replay button tapped on mobile, successfully returned to initial scene!');

    if (errors.length > 0) {
      throw new Error('Errors found on mobile: ' + errors.join('; '));
    }

    console.log('\n=============================================');
    console.log('🎉 ALL MOBILE RESPONSIVE TESTS PASSED (100%)!');
    console.log('=============================================\n');
  } finally {
    await browser.close();
  }
}

testMobileE2E().catch(err => {
  console.error('Mobile test failed:', err);
  process.exit(1);
});
