const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const viewport of [{width:1280,height:800}, {width:768,height:1024}, {width:512,height:676}, {width:390,height:844}, {width:320,height:568}]) {
      const page = await browser.newPage({ viewport });
      await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4174');
      await require('./unlock.cjs')(page);
      await page.evaluate(() => window.showScene('scene-claw'));
      await page.waitForTimeout(600);
      for (const message of [null, 'A mysterious key! Let\'s find the other treasures first, kuttupups! ✨', 'All 3 found! What is this key for? Try clicking it, pippo! ✨']) {
        if (message) await page.locator('#otter-claw-bubble').evaluate((el, text) => { el.textContent = text; }, message);
        const boxes = await page.evaluate(() => {
          const rect = el => el.getBoundingClientRect().toJSON();
          return {
            bubbles: [...document.querySelectorAll('.claw-mascots .speech-bubble')].map(rect),
            mascots: [...document.querySelectorAll('.claw-mascots .mascot')].map(rect),
            controls: [...document.querySelectorAll('#btn-left, #btn-right, #btn-drop, #btn-coin')].map(rect),
            shelf: rect(document.querySelector('#collectibles-shelf'))
          };
        });
        const overlaps = (a,b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        for (const bubble of boxes.bubbles) {
          assert(bubble.left >= 0 && bubble.right <= viewport.width, 'Dialogue fits horizontally');
          for (const control of boxes.controls) assert(!overlaps(bubble,control), 'Dialogue does not cover controls');
          for (const mascot of boxes.mascots) assert(!overlaps(bubble,mascot), 'Dialogue does not cover mascots');
          assert(!overlaps(bubble,boxes.shelf), 'Dialogue does not cover collectibles');
          if (viewport.width <= 840) assert(bubble.top >= Math.max(...boxes.controls.map(box=>box.bottom)) + 8, 'Mobile dialogue stays below controls');
        }
      }
      await page.locator('#btn-left').click();
      await page.locator('#btn-right').click();
      if (viewport.width === 512) {
        await page.locator('#otter-claw-bubble').evaluate(el => { el.textContent = 'Go get that capsule, kuttupups!'; });
        await page.locator('#btn-left').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(__dirname, 'previews/claw-dialogue-fixed.png') });
      }
      console.log(`${viewport.width}x${viewport.height}: short/long dialogue clears arrows, controls, mascots, and shelf`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
