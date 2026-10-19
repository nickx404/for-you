const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function debug() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', m => console.log('CONSOLE:', m.type(), m.text()));
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:4173');

  await require('./unlock.cjs')(page);
  await page.waitForTimeout(500);

  const el = await page.$('#scene-claw');
  console.log('classList:', await page.evaluate(e => e.className, el));
  console.log('visible:', await el.isVisible());
  console.log('bounding box:', await el.boundingBox());
  await browser.close();
}

debug().catch(console.error);
