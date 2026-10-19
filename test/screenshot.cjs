const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 860 } });

  await page.goto('http://127.0.0.1:4173');

  await require('./unlock.cjs')(page);
  
  if (await page.locator('#scene-envelope.active').isVisible()) {
    await page.evaluate(() => window.showScene('scene-claw'));
  }
  await page.waitForSelector('#scene-claw.active');
  await page.waitForTimeout(400);

  const outDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

  // 1. Initial Scene 4: Golden sparkly hint on shelf, golden egg sparkle in claw pit
  await page.screenshot({ path: path.join(outDir, 'screenshot_golden_sparkly_hint.png') });
  console.log('Saved screenshot_golden_sparkly_hint.png');

  // 2. Open Golden Decoy Egg and burst open
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'empty', color: 'gold' } }));
  });
  await page.waitForSelector('#capsule-modal:not(.hidden)');
  const goldShell = page.locator('#capsule-shell');
  await goldShell.click({ force: true });
  await page.waitForTimeout(100);
  await goldShell.click({ force: true });
  await page.waitForTimeout(100);
  await goldShell.click({ force: true });
  await page.waitForSelector('#capsule-contents:not(.hidden)');
  await page.waitForTimeout(500);

  await page.screenshot({ path: path.join(outDir, 'screenshot_golden_prank_reveal.png') });
  console.log('Saved screenshot_golden_prank_reveal.png');

  // 3. Click Try Again and verify transition to normal shelf hint
  const btnTryAgain = page.locator('#btn-try-again');
  await btnTryAgain.click();
  await page.locator('#capsule-modal').waitFor({ state: 'hidden' });
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(outDir, 'screenshot_post_prank_shelf.png') });
  console.log('Saved screenshot_post_prank_shelf.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
