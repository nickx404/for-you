const assert = require('node:assert/strict');
const path = require('node:path');
const {createRequire} = require('node:module');
const {chromium} = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({headless: true, channel: 'msedge'});
  try {
    const startupContext = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
    const startupPage = await startupContext.newPage();
    await startupPage.addInitScript(() => sessionStorage.setItem('pippo-sky-transition', String(Date.now())));
    await startupPage.goto(base);
    assert.equal(await startupPage.locator('#passcode-gate').isVisible(), true, 'Passcode paints without a tap');
    assert.equal(await startupPage.evaluate(() => getComputedStyle(document.documentElement, '::after').content), 'none', 'Mobile has no dark transition layer to composite');
    assert.equal(await startupPage.locator('html').evaluate(el => el.matches('.page-arriving, .page-leaving')), false, 'A stale sky transition cannot cover the passcode');
    assert.notEqual(await startupPage.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)', 'Startup background is never black');
    await startupContext.close();

    for (const mobile of [false, true]) {
      for (const reduced of [false, true]) {
        const context = await browser.newContext({viewport: mobile ? {width: 390, height: 844} : {width: 1280, height: 800}, isMobile: mobile, hasTouch: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference'});
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => {
          document.addEventListener('DOMContentLoaded', () => {
            window.arrivedCovered = document.documentElement.classList.contains('page-arriving');
          });
        });
        await page.goto(base);
        await require('./unlock.cjs')(page);
        await page.evaluate(() => window.showScene('scene-sky'));
        await page.locator('#btn-enter-sky').click({modifiers: ['Control']});
        assert.equal(await page.locator('html').getAttribute('class'), null, 'Modified clicks preserve normal browser behavior');
        await page.locator('#btn-enter-sky').click();
        if (!reduced && !mobile) {
          assert.equal(await page.locator('html').evaluate(el => el.classList.contains('page-leaving')), true);
          await page.waitForTimeout(250);
          const opacity = await page.evaluate(() => Number(getComputedStyle(document.documentElement, '::after').opacity));
          assert.ok(opacity > 0 && opacity < 1, 'Departure actually fades before navigation');
          await page.screenshot({path: `screenshots/sky-departure-${mobile ? 'mobile' : 'desktop'}.png`});
        }
        await page.waitForURL('**/sky/index.html');
        assert.equal(await page.evaluate(() => window.arrivedCovered), !reduced && !mobile, 'Only desktop animated arrivals use a cover');
        await page.waitForFunction(() => getComputedStyle(document.documentElement, '::after').opacity === '0');
        assert.equal(await page.locator('.meadow-background img').evaluate(img => img.complete && img.naturalWidth > 0), true);
        await page.locator('#start').click();
        assert.equal(await page.locator('#explore').isVisible(), true);
        await page.goBack();
        await page.waitForSelector('#scene-sky.active');
        await page.waitForFunction(() => !document.documentElement.matches('.page-leaving, .page-arriving'));
        await page.locator('#btn-enter-sky').click();
        await page.waitForURL('**/sky/index.html');
        await page.waitForFunction(() => getComputedStyle(document.documentElement, '::after').opacity === '0');
        assert.deepEqual(errors, []);
        console.log(`${mobile ? 'Mobile' : 'Desktop'}, ${reduced ? 'reduced motion' : 'animated'}: fade, arrival, modified click, Back, and re-entry passed`);
        await context.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
