const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4174';
const previews = path.join(__dirname, 'previews');
const center = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const near = (actual, expected, message) => assert(Math.abs(actual - expected) < 1, `${message}: ${actual} vs ${expected}`);

async function checkDialogue(page, selector) {
  const container = page.locator(selector);
  const mascots = await container.locator('.mascot').all();
  for (const bubble of await container.locator('.speech-bubble').all()) {
    const box = await bubble.boundingBox();
    assert(box.y >= 0 && box.x >= 0 && box.x + box.width <= page.viewportSize().width, 'Dialogue stays on screen');
    for (const mascot of mascots) {
      const figure = await mascot.boundingBox();
      assert(box.y + box.height + 8 <= figure.y, 'Dialogue and its tail stay above both mascots');
    }
  }
}

(async () => {
  fs.mkdirSync(previews, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const viewport of [{ width: 2575, height: 1662 }, { width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      const touch = viewport.width < 560;
      const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseUrl);
      await require('./unlock.cjs')(page);
      await page.evaluate(() => window.showScene('scene-window'));
      await page.waitForTimeout(650);
      await checkDialogue(page, '.window-mascots');
      await page.screenshot({ path: path.join(previews, `window-fixed-${viewport.width}.png`) });

      const session = touch ? await context.newCDPSession(page) : null;
      const pointer = async (type, point) => {
        if (touch) {
          await session.send('Input.dispatchTouchEvent', {
            type: { down: 'touchStart', move: 'touchMove', up: 'touchEnd' }[type],
            touchPoints: type === 'up' ? [] : [{ ...point, id: 1 }]
          });
        } else if (type === 'down') {
          await page.mouse.move(point.x, point.y);
          await page.mouse.down();
        } else if (type === 'move') await page.mouse.move(point.x, point.y);
        else await page.mouse.up();
      };
      const key = page.locator('#draggable-key');
      await key.evaluate(el => el.addEventListener('pointerdown', () => {
        window.keyPickupRect = el.getBoundingClientRect().toJSON();
      }, { capture: true }));
      let box = await key.boundingBox();
      let start = center(box);
      await pointer('down', start);
      let held = await key.boundingBox();
      const pickup = await page.evaluate(() => window.keyPickupRect);
      near(held.x, pickup.x, 'No horizontal jump on pickup');
      near(held.y, pickup.y, 'No vertical jump on pickup');
      await pointer('move', { x: start.x + 70, y: start.y + 15 });
      const moved = await key.boundingBox();
      near(moved.x - held.x, 70, 'Visible key follows horizontal movement');
      near(moved.y - held.y, 15, 'Visible key follows vertical movement');
      assert.equal(await page.evaluate(() => window.windowUnlock.isUnlocked), false);
      await pointer('up');
      await page.waitForTimeout(450);
      const returned = center(await key.boundingBox());
      near(returned.x, viewport.width / 2, 'Failed drop restores centered key');

      box = await key.boundingBox();
      // Grab away from the center to verify that the held offset is preserved.
      start = { x: box.x + box.width * 0.4, y: box.y + box.height * 0.3 };
      await pointer('down', start);
      held = await key.boundingBox();
      const target = center(await page.locator('#keyhole').boundingBox());
      const heldCenter = center(held);
      await pointer('move', { x: start.x + target.x - heldCenter.x, y: start.y + target.y - heldCenter.y });
      await page.waitForTimeout(340);
      const snapped = center(await key.boundingBox());
      near(snapped.x, target.x, 'Visible key reaches lock horizontally');
      near(snapped.y, target.y, 'Visible key reaches lock vertically');
      assert.equal(await page.locator('.window-lock.unlocked').count(), 0, 'Key arrives before lock opens');
      if (viewport.width === 1280) await page.screenshot({ path: path.join(previews, 'key-meets-lock.png') });
      await pointer('up');
      await page.waitForSelector('.window-lock.unlocked');
      await page.waitForSelector('#scene-sky.active', { timeout: 8000 });
      await page.locator('#btn-replay').click();
      await page.evaluate(() => window.showScene('scene-window'));
      await page.waitForTimeout(600);
      assert.equal(await key.isVisible(), true);
      near(center(await key.boundingBox()).x, viewport.width / 2, 'Replay restores centered key');

      await page.evaluate(() => window.showScene('scene-claw'));
      await page.waitForTimeout(650);
      await checkDialogue(page, '.claw-mascots');
      assert.deepEqual(errors, []);
      console.log(`${viewport.width}x${viewport.height}: ${touch ? 'touch' : 'mouse'} drag, snap, unlock, replay, and dialogue clearance passed`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
