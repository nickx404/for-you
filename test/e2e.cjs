const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

// Simple static HTTP server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(__dirname, '..', reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

async function run() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`Server running on http://127.0.0.1:${port}`);

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  try {
    await page.goto(`http://127.0.0.1:${port}`);
    await require('./unlock.cjs')(page);
    console.log('✓ Page loaded');

    // Reach the game through the same introduction a visitor uses.
    await page.locator('#btn-hello-next.visible').click();
    await page.locator('#btn-isabella-next').click();
    await page.locator('#wax-seal').click();
    await page.locator('#btn-enter-arcade:not(.hidden)').click();
    await page.waitForSelector('#scene-claw.active:not(.arcade-arriving)', { timeout: 4000 });
    console.log('✓ Scene 4 (Claw Machine) is active');

    // Check Mascot presence
    const otter = page.locator('.claw-mascots .otter');
    const bunny = page.locator('.claw-mascots .bunny');
    if (!(await otter.isVisible()) || !(await bunny.isVisible())) {
      throw new Error('Mascots not visible in Scene 4');
    }
    console.log('✓ Otter and Bunny mascots visible');

    // Check Nicknames in Scene 4
    const marqueeBadge = await page.textContent('.marquee-badge');
    console.log('  Marquee badge text:', marqueeBadge);
    if (!marqueeBadge.includes('FOR PIPPO')) throw new Error('Marquee badge does not contain FOR PIPPO');

    const otterBubble = await page.textContent('#otter-claw-bubble');
    console.log('  Otter bubble text:', otterBubble);
    if (!otterBubble.includes('kuttupups')) throw new Error('Otter bubble missing kuttupups nickname');

    // 2. Test Permanent Kawaii Pixel Theme & Coin Insertion
    console.log('Testing Pixel Theme & Arcade Coin Slot...');
    const bodyTheme = await page.getAttribute('body', 'data-theme');
    const otterSrc = await otter.getAttribute('src');
    const bunnySrc = await bunny.getAttribute('src');
    if (bodyTheme !== 'pixel' || !otterSrc.includes('pixel') || !bunnySrc.includes('pixel')) {
      throw new Error(`Pixel theme not permanently locked: theme=${bodyTheme}, otter=${otterSrc}, bunny=${bunnySrc}`);
    }
    console.log('✓ Permanent Pixel Theme locked: Otter & Bunny pixel sprites confirmed');

    // Test Coin Slot insertion
    const btnCoin = page.locator('#btn-coin');
    const creditText = page.locator('#credit-display .led-text');
    const initialCredit = await creditText.textContent();
    console.log('  Initial LED credits:', initialCredit);
    await btnCoin.click();
    await page.waitForTimeout(150);
    const updatedCredit = await creditText.textContent();
    console.log('  Updated LED credits after insert:', updatedCredit);
    if (updatedCredit !== '02') throw new Error('Coin insertion failed to increment credit to 02');
    console.log('✓ Coin insert & LED display confirmed');

    // 3. Test Claw Movement, Joystick Tilt & Otter Leaning
    const btnLeft = page.locator('#btn-left');
    const joystickShaft = page.locator('#joystick-shaft');
    await btnLeft.dispatchEvent('pointerdown');
    await page.waitForTimeout(150);
    const otterLeaning = await otter.getAttribute('class');
    const joystickClass = await joystickShaft.getAttribute('class');
    if (!otterLeaning.includes('leaning-left')) {
      console.warn('Otter leaning-left class not detected during movement, classes:', otterLeaning);
    } else {
      console.log('✓ Otter leaning-left confirmed during movement');
    }
    if (!joystickClass.includes('tilt-left')) {
      console.warn('Joystick tilt-left not detected during movement, classes:', joystickClass);
    } else {
      console.log('✓ Ball-top Joystick tilt-left confirmed during movement');
    }
    await btnLeft.dispatchEvent('pointerup');

    // 4. Trigger Claw Drop
    console.log('Dropping claw...');
    const btnDrop = page.locator('#btn-drop');
    await btnDrop.click();

    // Check Bunny anticipation
    await page.waitForTimeout(100);
    const bunnyClasses = await bunny.getAttribute('class');
    console.log('  Bunny classes during drop:', bunnyClasses);

    // Wait for claw to grab, lift, transport to chute, and drop in prize tray
    console.log('Waiting for prize capsule to appear in tray...');
    await page.waitForSelector('.tray-capsule', { timeout: 8000 });
    console.log('✓ Prize capsule arrived in tray!');

    const otterAfterWin = await page.textContent('#otter-claw-bubble');
    console.log('  Otter bubble after prize tray arrival:', otterAfterWin);
    if (!otterAfterWin.includes('pippo')) throw new Error('Tray arrival bubble missing pippo');
    // Ensure suspense is preserved before opening
    if (otterAfterWin.includes('chocolate') || otterAfterWin.includes('flower') || otterAfterWin.includes('empty')) {
      throw new Error('Otter bubble leaked reward content before egg was opened!');
    }
    console.log('✓ Suspense maintained: Otter does not reveal egg contents before cracking');

    // 5. Click Prize Capsule to Open Modal
    console.log('Clicking tray capsule to open cracker modal...');
    await page.locator('.tray-capsule').click({ force: true });
    await page.waitForSelector('#capsule-modal:not(.hidden)');
    console.log('✓ Capsule modal opened!');

    // 6. Tap Capsule 3 Times
    const shell = page.locator('#capsule-shell');
    console.log('Tap 1...');
    await shell.click({ force: true });
    await page.waitForFunction(() => document.getElementById('capsule-shell')?.getAttribute('data-cracks') === '1');
    console.log('✓ Crack stage 1');

    console.log('Tap 2...');
    await shell.click({ force: true });
    await page.waitForFunction(() => document.getElementById('capsule-shell')?.getAttribute('data-cracks') === '2');
    console.log('✓ Crack stage 2');

    console.log('Tap 3 (Burst open)...');
    await shell.click({ force: true });
    await page.waitForFunction(() => document.getElementById('capsule-shell')?.getAttribute('data-cracks') === '3');
    console.log('✓ Crack stage 3');

    // Wait for shell to animate away and contents to be revealed
    console.log('Waiting for contents reveal...');
    await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
    console.log('✓ Prize contents revealed in modal!');

    // Check Collectibles Shelf Initial State
    console.log('Verifying Collectibles Shelf on right side...');
    const shelf = page.locator('#collectibles-shelf');
    if (!(await shelf.isVisible())) throw new Error('Collectibles shelf not visible');
    const initialCounter = await page.textContent('#shelf-counter');
    console.log('  Initial shelf counter:', initialCounter);

    // Verify locked slots display "??"
    const lockedNames = await page.$$eval('.shelf-slot.locked .slot-name', els => els.map(e => e.textContent.trim()));
    console.log('  Locked slot names:', lockedNames);
    if (!lockedNames.every(name => name === '??')) {
      throw new Error(`Locked slot names must all be "??", but got: ${lockedNames.join(', ')}`);
    }
    console.log('✓ All locked shelf slots display "??"');

    // Verify stickers/emotes removed from pink and red eggs
    const redBandText = await page.$eval('#red-capsule .capsule-band', el => el.textContent.trim());
    const pinkBandText = await page.$eval('#pink-capsule .capsule-band', el => el.textContent.trim());
    if (redBandText.includes('🍫') || pinkBandText.includes('🌸')) {
      throw new Error(`Emotes found in egg bands: red="${redBandText}", pink="${pinkBandText}"`);
    }
    console.log('✓ Chocolate and flower stickers removed from capsules');

    // Verify golden egg alone has sparkle
    const goldSparkle = await page.locator('.capsule[data-color="gold"] .egg-sparkle').isVisible();
    if (!goldSparkle) throw new Error('Golden egg is missing sparkle');
    console.log('✓ Golden egg alone has animated sparkle confirmed');

    // Click whichever action button was displayed from the first drop
    const btnAction = page.locator('#btn-collect-continue:not(.hidden), #btn-try-again:not(.hidden)');
    await btnAction.first().waitFor({ state: 'visible', timeout: 3000 });
    await btnAction.first().click();
    await page.locator('#capsule-modal').waitFor({ state: 'hidden' });
    console.log('✓ First modal action completed!');

    // Test Golden Egg Prank Flow:
    console.log('Testing Golden Egg Prank Flow & Initial Hint...');
    const initialHint = await page.textContent('#shelf-hint');
    console.log('  Initial shelf hint:', initialHint);
    if (!initialHint.includes('golden and sparkly')) {
      throw new Error(`Expected initial hint to mention 'golden and sparkly', got: "${initialHint}"`);
    }
    console.log('✓ Initial Shelf Hint correctly reads: "Hint: It might be something golden and sparkly ✨"');

    // Trigger Golden Egg Cracking Modal
    console.log('Triggering Golden Decoy Egg...');
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'empty', color: 'gold' } }));
    });
    await page.waitForSelector('#capsule-modal:not(.hidden)');
    
    // Tap Golden Egg 3 times
    const goldShell = page.locator('#capsule-shell');
    await goldShell.click({ force: true });
    await page.waitForTimeout(100);
    await goldShell.click({ force: true });
    await page.waitForTimeout(100);
    await goldShell.click({ force: true });
    await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });

    // Verify Prank Message & Otter Speech Bubble & Bunny Reaction
    const dudMsgText = await page.textContent('#dud-message-card');
    console.log('  Golden dud message card:', dudMsgText);
    if (!dudMsgText.includes('HAHAHAHAHA, FOOLED YOU HAHAHAA!')) {
      throw new Error(`Golden dud message missing prank text, got: "${dudMsgText}"`);
    }

    const prankOtter = await page.textContent('#otter-claw-bubble');
    console.log('  Otter bubble during prank:', prankOtter);
    if (!prankOtter.includes('HAHAHAHAHA, FOOLED YOU HAHAHAA!')) {
      throw new Error(`Otter bubble missing prank text, got: "${prankOtter}"`);
    }

    const bunnyBubbleDud = await page.textContent('#bunny-claw-bubble');
    console.log('  Bunny bubble during empty/prank:', bunnyBubbleDud);
    if (!bunnyBubbleDud.includes('Ugh soooo annoyinggg')) {
      throw new Error(`Bunny bubble missing empty dialogue, got: "${bunnyBubbleDud}"`);
    }
    console.log('✓ Golden egg prank confirmed: "HAHAHAHAHA, FOOLED YOU HAHAHAA! 🤣🤣😭😜"');
    console.log('✓ Bunny empty capsule reaction confirmed: "Ugh soooo annoyinggg"');

    // Click Try Again on the Golden Egg Modal
    const btnTryAgain = page.locator('#btn-try-again:not(.hidden)');
    await btnTryAgain.waitFor({ state: 'visible', timeout: 3000 });
    await btnTryAgain.click();
    await page.locator('#capsule-modal').waitFor({ state: 'hidden' });

    // Verify Shelf Hint transitioned to normal "Find all 3 treasures! ✨"
    const normalHint = await page.textContent('#shelf-hint');
    console.log('  Post-prank shelf hint:', normalHint);
    if (!normalHint.includes('Find all 3 treasures!')) {
      throw new Error(`Expected hint to revert to 'Find all 3 treasures!', got: "${normalHint}"`);
    }
    console.log('✓ Shelf hint successfully transitioned to normal: "Find all 3 treasures! ✨"');

    // Test Flower Capsule Reveal Dialogues
    console.log('Testing Flower Capsule Dialogues...');
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'flower', color: 'pink' } }));
    });
    await page.waitForSelector('#capsule-modal:not(.hidden)');
    const flowerShell = page.locator('#capsule-shell');
    await flowerShell.click({ force: true });
    await page.waitForTimeout(100);
    await flowerShell.click({ force: true });
    await page.waitForTimeout(100);
    await flowerShell.click({ force: true });
    await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
    await page.waitForTimeout(900);

    const flowerMsg = await page.textContent('#reward-view-flower .reward-message-card');
    console.log('  Flower message card:', flowerMsg);
    if (!flowerMsg.includes('indhaa a special phool for you')) {
      throw new Error(`Flower card missing requested text, got: "${flowerMsg}"`);
    }

    const flowerOtter = await page.textContent('#otter-claw-bubble');
    console.log('  Otter bubble for flower:', flowerOtter);
    if (!flowerOtter.includes('indhaa a special phool for you')) {
      throw new Error(`Otter bubble missing flower text, got: "${flowerOtter}"`);
    }

    const flowerBunny = await page.textContent('#bunny-claw-bubble');
    console.log('  Bunny bubble for flower:', flowerBunny);
    if (!flowerBunny.includes('YAAAYYYYYYYY!!!')) {
      throw new Error(`Bunny bubble missing win dialogue, got: "${flowerBunny}"`);
    }
    console.log('✓ Flower capsule dialogues verified: "indhaa a special phool for you" with pixel icons & Bunny "YAAAYYYYYYYY!!!"');

    // Close flower modal by clicking collect
    const btnCollect = page.locator('#btn-collect-continue:not(.hidden)');
    await btnCollect.click();
    await page.locator('#capsule-modal').waitFor({ state: 'hidden' });

    // Test Chocolate Capsule Reveal Dialogues
    console.log('Testing Chocolate Capsule Dialogues...');
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'chocolate', color: 'red' } }));
    });
    await page.waitForSelector('#capsule-modal:not(.hidden)');
    const chocoShell = page.locator('#capsule-shell');
    await chocoShell.click({ force: true });
    await page.waitForTimeout(100);
    await chocoShell.click({ force: true });
    await page.waitForTimeout(100);
    await chocoShell.click({ force: true });
    await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
    await page.waitForTimeout(900);

    const chocoMsg = await page.textContent('#reward-view-chocolate .reward-message-card');
    console.log('  Chocolate message card:', chocoMsg);
    if (!chocoMsg.includes('indhaaa chokii for the sweetest girl ever :)')) {
      throw new Error(`Chocolate card missing requested text, got: "${chocoMsg}"`);
    }

    const chocoOtter = await page.textContent('#otter-claw-bubble');
    console.log('  Otter bubble for chocolate:', chocoOtter);
    if (!chocoOtter.includes('indhaaa chokii for the sweetest girl ever :)')) {
      throw new Error(`Otter bubble missing chocolate text, got: "${chocoOtter}"`);
    }

    const chocoBunny = await page.textContent('#bunny-claw-bubble');
    console.log('  Bunny bubble for chocolate:', chocoBunny);
    if (!chocoBunny.includes('YAAAYYYYYYYY!!!')) {
      throw new Error(`Bunny bubble missing win dialogue, got: "${chocoBunny}"`);
    }
    console.log('✓ Chocolate capsule dialogues verified: "indhaaa chokii for the sweetest girl ever :) 💕" & Bunny "YAAAYYYYYYYY!!!"');

    // Close chocolate modal by clicking collect
    const btnCollectChoco = page.locator('#btn-collect-continue:not(.hidden)');
    await btnCollectChoco.click();
    await page.locator('#capsule-modal').waitFor({ state: 'hidden' });

    // Complete 3/3 collectibles with the Key
    console.log('Collecting key to complete 3/3 collectibles...');
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('itemCollected', { detail: { reward: 'key' } }));
    });
    await page.waitForTimeout(300);

    const fullCounter = await page.textContent('#shelf-counter');
    console.log('  Full shelf counter:', fullCounter);
    if (!fullCounter.includes('3 / 3')) throw new Error('Shelf counter did not reach 3 / 3');

    // Verify unlocked slot titles revealed
    const unlockedNames = await page.$$eval('.shelf-slot.unlocked .slot-name', els => els.map(e => e.textContent.trim()));
    console.log('  Unlocked slot names:', unlockedNames);
    if (!unlockedNames.includes('CHOCOLATE') || !unlockedNames.includes('FLOWER') || !unlockedNames.includes('GOLDEN KEY')) {
      throw new Error(`Unlocked slot names incomplete: ${unlockedNames.join(', ')}`);
    }
    console.log('✓ Unlocked slot names revealed after finding: CHOCOLATE, FLOWER, GOLDEN KEY');

    // Verify Pointer 👉 points to Golden Key slot
    const keyPointer = page.locator('#key-pointer');
    if (!(await keyPointer.isVisible())) throw new Error('Key pointer not visible after 3/3 found');
    console.log('✓ Animated pointer pointing to Golden Key confirmed!');

    // Click Golden Key in Collectibles shelf to trigger grand reveal
    console.log('Clicking Golden Key in Collectibles shelf...');
    const keySlot = page.locator('#slot-key');
    await keySlot.click({ force: true });
    await page.waitForSelector('#capsule-modal:not(.hidden)');

    // 7. Unroll mini-scroll
    const scroll = page.locator('#mini-scroll');
    await page.waitForSelector('.mini-scroll.unrolled', { timeout: 3000 });
    const scrollText = await page.textContent('.scroll-paper');
    console.log('  Scroll text:', scrollText);
    if (!scrollText.includes('For pippo')) throw new Error('Scroll missing personal message for pippo');

    // 8. Click "Open the window, kuttupups" button
    const btnGotoWindow = page.locator('#btn-goto-window');
    await page.waitForSelector('#btn-goto-window:not(.hidden)');
    const btnText = await btnGotoWindow.textContent();
    console.log('  Button text:', btnText);
    if (!btnText.toLowerCase().includes('kuttupups')) throw new Error('Button text missing kuttupups');

    await btnGotoWindow.click({ force: true });
    console.log('Transitioning to Scene 5 (Arched Window)...');
    await page.waitForSelector('#scene-window.active', { timeout: 4000 });
    console.log('✓ Scene 5 (Arched Window) is active!');

    // Verify Scene 5 elements
    const windowTitle = await page.textContent('.room-title');
    console.log('  Room title:', windowTitle);
    if (!windowTitle.includes('kuttupups')) throw new Error('Room title missing kuttupups');

    const otterWindowBubble = await page.textContent('#otter-window-bubble');
    console.log('  Window Otter bubble:', otterWindowBubble);
    if (!otterWindowBubble.includes('pippo')) throw new Error('Window Otter bubble missing pippo');

    // 9. Drag Golden Key to Keyhole
    console.log('Dragging Golden Key to Padlock...');
    const key = page.locator('#draggable-key');
    const keyhole = page.locator('#keyhole');

    const keyBox = await key.boundingBox();
    const keyholeBox = await keyhole.boundingBox();

    if (!keyBox || !keyholeBox) throw new Error('Bounding boxes for key or keyhole not found');

    const startX = keyBox.x + keyBox.width / 2;
    const startY = keyBox.y + keyBox.height / 2;
    const endX = keyholeBox.x + keyholeBox.width / 2;
    const endY = keyholeBox.y + keyholeBox.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    // Drag towards keyhole
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    console.log('Waiting for padlock unlock & shutters to open...');
    await page.waitForSelector('.window-lock.unlocked', { timeout: 6000 });
    console.log('✓ Padlock unlocked!');

    await page.waitForSelector('.left-shutter.open', { timeout: 6000 });
    await page.waitForSelector('.right-shutter.open', { timeout: 6000 });
    console.log('✓ Wooden shutters swung open in 3D!');

    // 10. Transition to Scene 6 (Starry Sky)
    console.log('Waiting for camera glide and Scene 6 (Sky)...');
    await page.waitForSelector('#scene-sky.active', { timeout: 8000 });
    console.log('✓ Scene 6 (Sky) is active!');

    const skyH1 = await page.textContent('.sky-container h1');
    console.log('  Sky H1 text:', skyH1);
    if (!skyH1.includes('kuttupups')) throw new Error('Sky H1 missing kuttupups');

    const duoVisible = await page.locator('.sky-mascots-float .mascot.duo').isVisible();
    if (!duoVisible) throw new Error('Duo mascots not visible in sky finale');
    console.log('✓ Duo mascot floating in sky finale confirmed!');

    // 11. Test Replay Button
    const btnReplay = page.locator('#btn-replay');
    await btnReplay.click();
    await page.waitForSelector('#scene-hello.active, #scene-claw.active', { timeout: 3000 });
    console.log('✓ Replay button successfully returned to initial scene!');

    if (errors.length > 0) {
      console.warn('Page errors detected:', errors);
      throw new Error('Errors found on page: ' + errors.join('; '));
    }

    console.log('\n========================================');
    console.log('🎉 ALL END-TO-END VERIFICATION CHECKS PASSED!');
    console.log('========================================\n');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch(err => {
  console.error('Test FAILED:', err);
  process.exit(1);
});
