const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

async function testEmote() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 860 } });
  await page.goto('http://127.0.0.1:4173');
  await require('./unlock.cjs')(page);
  await page.evaluate(() => window.showScene('scene-claw'));
  await page.waitForSelector('#scene-claw.active');

  const outDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

  // Test prank modal with tongue-out.svg (illustrated)
  await page.evaluate(() => {
    document.dispatchEvent(new CustomEvent('openCapsuleModal', { detail: { reward: 'empty', color: 'gold' } }));
    const dudIcon = document.getElementById('dud-icon');
    if (dudIcon) {
      dudIcon.innerHTML = '<img src="assets/tongue-out.svg" width="68" height="68" alt="Tongue Out" style="display:block; margin: 0 auto;">';
    }
    const dudMsg = document.getElementById('dud-message-card');
    if (dudMsg) {
      dudMsg.innerHTML = 'Hahaha, I fooled you! <img src="assets/tongue-out.svg" width="18" height="18" style="vertical-align: -2px; display:inline-block;"><br/>Try again, pippo! 🕹️';
    }
  });

  await page.waitForSelector('#capsule-modal:not(.hidden)');
  const shell = page.locator('#capsule-shell');
  await shell.click({ force: true });
  await shell.click({ force: true });
  await shell.click({ force: true });
  await page.waitForSelector('#capsule-contents:not(.hidden)');
  await page.waitForTimeout(600);

  await page.screenshot({ path: path.join(outDir, 'test_prank_custom_tongue_out.png') });

  // Test pixel version
  await page.evaluate(() => {
    const dudIcon = document.getElementById('dud-icon');
    if (dudIcon) {
      dudIcon.innerHTML = '<img src="assets/tongue-out-pixel.svg" width="68" height="68" alt="Pixel Tongue Out" style="display:block; margin: 0 auto;">';
    }
    const dudMsg = document.getElementById('dud-message-card');
    if (dudMsg) {
      dudMsg.innerHTML = 'Hahaha, I fooled you! <img src="assets/tongue-out-pixel.svg" width="18" height="18" style="vertical-align: -2px; display:inline-block;"><br/>Try again, pippo! 🕹️';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, 'test_prank_pixel_tongue_out.png') });

  await browser.close();
  console.log('Tested both emote options successfully');
}

testEmote().catch(err => {
  console.error(err);
  process.exit(1);
});
