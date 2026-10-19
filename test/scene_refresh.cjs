const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4174';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseUrl);
      await require('./unlock.cjs')(page);
      await page.waitForSelector('#scene-hello.active');
      const back = page.locator('#scene-back');
      const forward = page.locator('#scene-forward');
      assert(await back.isDisabled());
      assert(await forward.isDisabled());
      await page.locator('#btn-hello-next').click();
      await page.waitForSelector('#scene-isabella.active');
      assert(await forward.isDisabled(), 'Cannot skip to an unseen scene');
      await page.locator('#btn-isabella-next').click();
      await page.waitForSelector('#scene-envelope.active');
      assert(await forward.isDisabled(), 'Envelope must be completed normally');
      await back.click();
      await page.waitForSelector('#scene-isabella.active');
      await page.reload();
      await page.waitForSelector('#scene-isabella.active');
      assert(await forward.isEnabled(), 'Visited scenes survive refresh');
      await forward.click();
      await page.waitForSelector('#scene-envelope.active');
      assert(await forward.isDisabled());
      await page.locator('#wax-seal').click();
      await page.waitForSelector('#scene-envelope[data-state="open"]');
      await back.click();
      await forward.click();
      await page.waitForSelector('#scene-envelope[data-state="sealed"].active');
      for (const scene of ['hello', 'isabella', 'envelope', 'claw', 'window', 'sky']) {
        await page.evaluate(id => window.showScene(id), `scene-${scene}`);
        await page.reload();
        await page.waitForSelector(`#scene-${scene}.active`);
        assert.equal(await page.locator('.scene.active').count(), 1);
        const nav = await page.locator('.scene-navigation').boundingBox();
        const sceneBox = await page.locator(`#scene-${scene}`).boundingBox();
        assert.equal(sceneBox.height, viewport.height, 'Scenes use the full screen without a footer');
        assert(nav.y < 24 && nav.width <= 88 && nav.height <= 44, 'Arrow controls stay compact in the top corner');
        assert(nav.y + nav.height <= viewport.height + 1, 'Controls remain within the screen');
        if (scene === 'claw') {
          await page.screenshot({ path: path.join(require('node:os').tmpdir(), `pippo-navigation-${viewport.width}.png`) });
          const forwardBox = await forward.boundingBox();
          const audio = await page.locator('#audio-toggle').boundingBox();
          assert(nav.x >= 0 && forwardBox.x + forwardBox.width < audio.x, 'Navigation fits beside sound control');
        }
      }
      assert(await forward.isDisabled(), 'Final scene has no forward destination');
      await back.click();
      await page.waitForSelector('#scene-window.active');
      assert(await page.locator('#draggable-key').isVisible(), 'Window can be revisited');
      await page.evaluate(() => window.windowUnlock.magneticSnap(100, 100));
      assert(await back.isDisabled(), 'Navigation waits for the window animation');
      await page.waitForSelector('#scene-sky.active', { timeout: 8000 });
      await page.locator('#btn-replay').click();
      await page.reload();
      await page.waitForSelector('#scene-hello.active');
      assert(await back.isDisabled());
      assert(await forward.isDisabled(), 'Replay clears visited destinations');

      for (const invalid of ['removed-scene', 'audio-toggle']) {
        await page.evaluate(value => sessionStorage.setItem('pippo-current-scene', value), invalid);
        await page.reload();
        await page.waitForSelector('#scene-hello.active');
      }
      assert.deepEqual(errors, []);
      await context.close();
    }

    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage blocked'); } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl);
    await require('./unlock.cjs')(page);
    await page.waitForSelector('#scene-hello.active');
    await page.evaluate(() => window.showScene('scene-claw'));
    await page.waitForSelector('#scene-claw.active');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('Scene refresh and Back/Forward passed on desktop and mobile; progression limits, animation guards, replay, invalid saves, and blocked storage passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
