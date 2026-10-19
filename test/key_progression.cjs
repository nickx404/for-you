const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of [1280, 390]) {
      for (const order of [['key', 'chocolate', 'flower'], ['chocolate', 'key', 'flower'], ['chocolate', 'flower', 'key']]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: width < 560 });
        await page.addInitScript(() => sessionStorage.setItem('pippo-unlocked', 'true'));
        await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4174');
        await page.evaluate(() => window.showScene('scene-claw'));
        for (const reward of order) {
          await page.evaluate(reward => document.dispatchEvent(new CustomEvent('openCapsuleModal', {
            detail: { reward, color: reward === 'key' ? 'blue' : reward === 'flower' ? 'pink' : 'red' }
          })), reward);
          await page.locator('#capsule-shell').waitFor({ state: 'visible' });
          for (let tap = 0; tap < 3; tap++) await page.locator('#capsule-shell').click({ force: true });
          await page.locator('#btn-collect-continue:not(.hidden)').waitFor();
          assert.equal(await page.locator('#mini-scroll').isVisible(), false, 'Fresh capsules never show the scroll');
          await page.locator('#mini-scroll').dispatchEvent('click');
          await page.locator('#btn-goto-window').dispatchEvent('click');
          assert.equal(await page.locator('#scene-claw.active').count(), 1, 'Early clicks cannot leave the arcade');
          assert.equal(await page.locator('#btn-goto-window').isVisible(), false);
          if (width === 390 && reward === 'key' && order[0] === 'key') {
            await page.screenshot({ path: path.join(__dirname, 'previews/key-without-scroll.png') });
          }
          await page.locator('#btn-collect-continue').click();
          if (reward === 'key' && order.indexOf(reward) < 2) {
            await page.locator('#slot-key').click();
            assert.equal(await page.locator('#capsule-modal').isVisible(), false, 'Shelf key stays locked before 3/3');
          }
        }
        assert.match(await page.locator('#shelf-counter').innerText(), /3 \/ 3/);
        await page.locator('#slot-key').click({ force: true });
        await page.locator('#mini-scroll.unrolled:not(.hidden)').waitFor();
        await page.locator('#btn-goto-window:not(.hidden)').waitFor();
        await page.locator('#btn-goto-window').click();
        await page.locator('#scene-window.active').waitFor();
        console.log(`${width}px ${order.join(' → ')}: scroll only opens from completed shelf; progression works`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
