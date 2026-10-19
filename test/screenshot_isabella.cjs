const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });

  // 1. Desktop screenshot
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('http://127.0.0.1:4173');
    await require('./unlock.cjs')(page);
    await page.evaluate(() => window.showScene('scene-isabella'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(__dirname, 'isabella_desktop.png') });
    console.log('Saved isabella_desktop.png');
    await page.close();
  }

  // 2. Mobile screenshot
  {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    await page.goto('http://127.0.0.1:4173');
    await require('./unlock.cjs')(page);
    await page.evaluate(() => window.showScene('scene-isabella'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(__dirname, 'isabella_mobile.png') });
    console.log('Saved isabella_mobile.png');
    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
