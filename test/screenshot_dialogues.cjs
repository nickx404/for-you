const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function capture() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  const artifactDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

  await page.goto('http://127.0.0.1:4173');

  await require('./unlock.cjs')(page);
  await page.waitForTimeout(500);

  // Skip envelope if visible
  const env = page.locator('#scene-envelope.active');
  if (await env.isVisible()) {
    await page.locator('#wax-seal').click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('#btn-enter-arcade').click({ force: true });
    await page.waitForTimeout(800);
  }

  // 1. Trigger Golden Decoy Egg (Prank)
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'empty', color: 'gold' } }));
  });
  await page.waitForSelector('#capsule-modal:not(.hidden)');
  // Tap 3 times
  const shell = page.locator('#capsule-shell');
  await shell.click({ force: true });
  await page.waitForTimeout(100);
  await shell.click({ force: true });
  await page.waitForTimeout(100);
  await shell.click({ force: true });
  await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(artifactDir, 'screenshot_prank_dialogues.png'), fullPage: true });
  console.log('Saved screenshot_prank_dialogues.png');

  // Close prank modal
  await page.locator('#btn-try-again:not(.hidden)').click();
  await page.waitForTimeout(500);

  // 2. Trigger Flower Egg
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
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(artifactDir, 'screenshot_flower_dialogues.png'), fullPage: true });
  console.log('Saved screenshot_flower_dialogues.png');

  // Close flower modal
  await page.locator('#btn-collect-continue:not(.hidden)').click();
  await page.waitForTimeout(500);

  // 3. Trigger Chocolate Egg
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
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(artifactDir, 'screenshot_chocolate_dialogues.png'), fullPage: true });
  console.log('Saved screenshot_chocolate_dialogues.png');

  await browser.close();
}

capture().catch(console.error);
