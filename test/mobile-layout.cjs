const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of [320, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 667 }, isMobile: true, hasTouch: true });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173');
      await require('./unlock.cjs')(page);
      for (const height of [667, 760, 568]) {
        await page.setViewportSize({ width, height });
        for (const id of ['scene-claw', 'scene-window', 'scene-sky']) {
          await page.evaluate(id => window.showScene(id), id);
          await page.waitForTimeout(500);
          const bounds = await page.locator(`#${id}`).boundingBox();
          assert.ok(Math.abs(bounds.height - height) < 1, `${id} fills ${width}x${height}`);
          if (id === 'scene-claw') {
            await page.locator('#scene-claw').evaluate(el => { el.scrollTop = 0; });
            const crown = await page.locator('.cabinet-crown').boundingBox();
            assert.ok(crown.y >= 54, 'Cabinet crown stays below navigation');
            if (height === 667) await page.screenshot({ path: `screenshots/claw-fix-${width}.png` });
            await page.locator('#btn-drop').scrollIntoViewIfNeeded();
            const drop = await page.locator('#btn-drop').boundingBox();
            assert.ok(drop.y >= 0 && drop.y + drop.height <= height, 'Drop control is reachable');
          }
          const background = id === 'scene-window' ? '.room-interior' : id === 'scene-sky' ? '.sky-container' : null;
          if (background) {
            const box = await page.locator(background).boundingBox();
            assert.ok(box.y <= 0 && box.y + box.height >= height, 'Background fills visible height');
          }
        }
      }
      await page.goto(new URL('/sky/index.html', page.url()).href);
      await page.locator('.meadow-background img').evaluate(image => image.decode());
      assert.match(await page.locator('.meadow-background img').evaluate(image => image.currentSrc), /mobile-v2.webp$/);
      await page.waitForFunction(() => document.querySelectorAll('.star-shape').length === 8 && [...document.querySelectorAll('.star-shape')].every(image => image.complete && image.naturalWidth > 0));
      assert.equal(await page.locator('#explore').isVisible(), false, 'All eight stars load before explore opens');
      await page.locator('#start').click();
      assert.equal(await page.locator('.star').count(), 8);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `screenshots/mobile-fix-${width}.png` });
      await page.close();
    }
    console.log('Mobile viewport resizing, cabinet access, and eager sky artwork passed.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

