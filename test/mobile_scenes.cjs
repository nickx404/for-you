const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function testMobileAll() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const artifactDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

  await page.goto('http://127.0.0.1:4173');

  await require('./unlock.cjs')(page);
  await page.waitForTimeout(600);

  // Scene 3 check (if active)
  const env = page.locator('#scene-envelope.active');
  if (await env.isVisible()) {
    await page.screenshot({ path: path.join(artifactDir, 'mobile_scene3_envelope.png') });
    await page.locator('#wax-seal').click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(artifactDir, 'mobile_scene3_letter.png') });
    await page.locator('#btn-enter-arcade').click({ force: true });
    await page.waitForTimeout(800);
  }

  // Go to scene 5 directly via showScene
  await page.evaluate(() => {
    if (window.showScene) {
      window.showScene('scene-window');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'mobile_scene5_window.png') });

  // Go to scene 6 directly via showScene
  await page.evaluate(() => {
    if (window.showScene) {
      window.showScene('scene-sky');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(artifactDir, 'mobile_scene6_sky.png') });

  await browser.close();
}

testMobileAll().catch(console.error);
