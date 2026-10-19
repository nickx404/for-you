const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function testMobile() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 viewport
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const artifactDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

  await page.goto('http://127.0.0.1:4173');

  await require('./unlock.cjs')(page);
  await page.waitForTimeout(600);

  // Skip envelope if visible
  const env = page.locator('#scene-envelope.active');
  if (await env.isVisible()) {
    await page.locator('#wax-seal').click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('#btn-enter-arcade').click({ force: true });
    await page.waitForTimeout(800);
  }

  // Screenshot Scene 4 Main Arcade Screen on Mobile
  await page.screenshot({ path: path.join(artifactDir, 'mobile_scene4_arcade.png'), fullPage: false });
  console.log('Saved mobile_scene4_arcade.png');

  // Trigger Prank Modal on mobile
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'empty', color: 'gold' } }));
  });
  await page.waitForSelector('#capsule-modal:not(.hidden)');
  const shell = page.locator('#capsule-shell');
  await shell.click({ force: true });
  await page.waitForTimeout(100);
  await shell.click({ force: true });
  await page.waitForTimeout(100);
  await shell.click({ force: true });
  await page.waitForSelector('#capsule-contents:not(.hidden)', { timeout: 3000 });
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(artifactDir, 'mobile_prank_modal.png'), fullPage: false });
  console.log('Saved mobile_prank_modal.png');

  // Close prank modal
  await page.locator('#btn-try-again:not(.hidden)').click();
  await page.waitForTimeout(500);

  // Trigger Flower Modal on mobile
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
  await page.waitForTimeout(800);

  await page.screenshot({ path: path.join(artifactDir, 'mobile_flower_modal.png'), fullPage: false });
  console.log('Saved mobile_flower_modal.png');

  await browser.close();
}

testMobile().catch(console.error);
