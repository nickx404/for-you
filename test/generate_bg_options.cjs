const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

const outDir = 'C:/Users/Saivam Ravi/.gemini/antigravity/brain/ec135342-2084-44bf-a254-568045353c01';

const options = [
  {
    id: 'opt1_pastel_twilight',
    name: 'Option 1: Pastel Twilight & Drifting Clouds',
    css: `
      .cabinet-glass {
        background: linear-gradient(180deg, #352354 0%, #593b7e 40%, #8e5898 70%, #d48ba8 92%, #ffcad4 100%) !important;
      }
      .ceiling-grid {
        opacity: 0.15 !important;
      }
      .glass-sparkle {
        color: #fff9a6 !important;
        text-shadow: 0 0 6px #ffd700;
      }
    `
  },
  {
    id: 'opt2_midnight_constellation',
    name: 'Option 2: Deep Midnight Galaxy & Twinkling Constellations',
    css: `
      .cabinet-glass {
        background: radial-gradient(circle at 50% 30%, #241447 0%, #13092b 60%, #0a0418 100%) !important;
      }
      .ceiling-grid {
        background-image: 
          linear-gradient(to right, rgba(162, 210, 255, 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(162, 210, 255, 0.3) 1px, transparent 1px) !important;
      }
      .glass-sparkle {
        color: #67e8f9 !important;
        text-shadow: 0 0 8px rgba(103, 232, 249, 0.9), 0 0 16px rgba(103, 232, 249, 0.5);
      }
    `
  },
  {
    id: 'opt3_retro_cyber_grid',
    name: 'Option 3: Retro Synthwave & Neon Horizon',
    css: `
      .cabinet-glass {
        background: linear-gradient(180deg, #0f051d 0%, #1f0a38 50%, #3a0d52 80%, #5e115e 100%) !important;
      }
      .ceiling-grid {
        background-image: 
          linear-gradient(to right, rgba(255, 114, 182, 0.45) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(103, 232, 249, 0.45) 1px, transparent 1px) !important;
      }
      .glass-sparkle {
        color: #ff70a6 !important;
        text-shadow: 0 0 8px #ff70a6;
      }
    `
  },
  {
    id: 'opt4_kawaii_star_pattern',
    name: 'Option 4: Kawaii Pastel Star Wallpaper (Japanese UFO Catcher)',
    css: `
      .cabinet-glass {
        background-color: #261942 !important;
        background-image: 
          radial-gradient(circle at 25px 25px, rgba(255, 203, 242, 0.22) 2px, transparent 0),
          radial-gradient(circle at 75px 75px, rgba(189, 224, 254, 0.22) 2px, transparent 0),
          linear-gradient(180deg, rgba(74, 46, 86, 0.6) 0%, rgba(30, 19, 51, 0.8) 100%) !important;
        background-size: 100px 100px, 100px 100px, 100% 100% !important;
      }
      .ceiling-grid {
        opacity: 0.1 !important;
      }
      .glass-sparkle {
        color: #ffd700 !important;
        text-shadow: 0 0 6px #ffd700;
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

  for (const opt of options) {
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

    // Capture zoomed crop of cabinet play area
    const glassLocator = page.locator('.arcade-cabinet');
    const filename = `bg_option_${opt.id}.png`;
    await glassLocator.screenshot({ path: path.join(outDir, filename) });
    console.log(`Saved ${filename}`);
  }

  await browser.close();
}

run().catch(console.error);
