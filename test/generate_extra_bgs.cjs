const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

const outDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

const extraOptions = [
  {
    id: 'opt_pastel_marquee_match',
    name: 'Option 5: Kawaii Pastel Dreamscape (Continuous with Marquee & Tray)',
    css: `
      .cabinet-glass {
        background: linear-gradient(180deg, #bde0fe 0%, #d8b4fe 40%, #ffcbf2 80%, #ffe5f7 100%) !important;
        box-shadow: 
          inset 0 4px 12px rgba(74, 46, 86, 0.25),
          inset 0 0 16px rgba(255, 255, 255, 0.6) !important;
      }
      .ceiling-grid {
        background-image: 
          linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px) !important;
      }
      .glass-sparkle {
        color: #8b5cf6 !important;
        text-shadow: 0 0 6px #ffffff;
      }
    `
  },
  {
    id: 'opt_sunset_twilight_vivid',
    name: 'Option 6: Magical Twilight Sunset (Deep Purple into Pink Glow)',
    css: `
      .cabinet-glass {
        background: linear-gradient(180deg, #2b1842 0%, #4a286a 35%, #7e3e78 65%, #c85a86 85%, #fca5b9 100%) !important;
        box-shadow: 
          inset 0 8px 20px rgba(0, 0, 0, 0.5),
          inset 0 0 16px rgba(255, 175, 204, 0.3) !important;
      }
      .ceiling-grid {
        opacity: 0.18 !important;
      }
      .glass-sparkle {
        color: #fff9a6 !important;
        text-shadow: 0 0 8px #ffd700;
      }
    `
  }
];

async function run() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1300, height: 860 } });

  await page.goto('http://127.0.0.1:4173');

  await require('./unlock.cjs')(page);
  if (await page.locator('#scene-envelope.active').isVisible()) {
    await page.evaluate(() => window.showScene('scene-claw'));
  }
  await page.waitForSelector('#scene-claw.active');
  await page.waitForTimeout(400);

  for (const opt of extraOptions) {
    await page.evaluate((css) => {
      let tag = document.getElementById('temp-bg-style');
      if (!tag) {
        tag = document.createElement('style');
        tag.id = 'temp-bg-style';
        document.head.appendChild(tag);
      }
      tag.innerHTML = css;
    }, opt.css);

    await page.waitForTimeout(300);

    const glassLocator = page.locator('.arcade-cabinet');
    const filename = `bg_option_${opt.id}.png`;
    await glassLocator.screenshot({ path: path.join(outDir, filename) });
    console.log(`Saved ${filename}`);
  }

  await browser.close();
}

run().catch(console.error);
