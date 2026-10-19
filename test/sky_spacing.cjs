const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const [width, height] of [[375,667], [393,852], [1366,768], [1920,923], [3824,1843], [2056,1728], [667,375]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      await page.goto(process.env.SKY_URL || 'http://127.0.0.1:4173/sky/index.html');
      await page.evaluate(() => document.fonts.ready);
      assert.equal((await page.locator('#welcome h1').innerText()).replace(/\s+/g, ' '), 'I made a little sky for you kuttupups');
      assert.equal(await page.locator('.welcome-note').count(), 0);
      if (height > 550) {
        assert.ok(await page.evaluate(() => document.querySelector('#welcome').getBoundingClientRect().bottom + 8 <= document.querySelector('.guide-speech').getBoundingClientRect().top), 'Welcome clears mascot dialogue');
      }
      await page.screenshot({ path: `screenshots/updated-welcome-${width}.png`, fullPage: true });
      await page.locator('#start').click();
      assert.deepEqual(await page.locator('.explore-heading h1, .explore-heading .sky-dedication, .explore-heading > p:last-child').allTextContents(), ['Follow the stars', 'Always by your side, through every star and every story', 'Each one has something I wanted to tell you.']);
      assert.equal(await page.locator('.sky-dedication').evaluate(el => getComputedStyle(el).fontSize), width <= 700 ? '14px' : '16px');
      assert.equal(await page.locator('#sky-mode').count(), 0);
      assert.equal(await page.locator('body').getAttribute('data-sky'), 'clouds');
      const measure = () => page.evaluate(() => {
        const rect = el => {
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
        };
        return {
          heading: rect(document.querySelector('.explore-heading')),
          stars: [...document.querySelectorAll('.star')].map(rect),
          progress: rect(document.querySelector('.progress')),
          speech: rect(document.querySelector('.guide-speech')),
          constellation: rect(document.querySelector('#constellation')),
          mascots: [...document.querySelectorAll('.sky-guides img')].map(rect),
          music: rect(document.querySelector('#sky-music-control')),
          pageHeight: document.documentElement.scrollHeight
        };
      });
      let layout = await measure();
      const separate = (a, b) => a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom;
      const landscape = height <= 550 && width >= 550;
      const minimumSize = landscape ? Math.min(300, height * .72, width * .44) : width <= 700 ? Math.min(300, width * .74, height * .4) - 24 : Math.min(490, height * .43, width * .86);
      assert.ok(layout.constellation.width >= minimumSize - 1);
      assert.equal(await page.locator('.star-label').count(), 0);
      const progressOrder = await page.evaluate(() => {
        const counter = document.querySelector('#counter').getBoundingClientRect();
        const marks = document.querySelector('#progress-marks').getBoundingClientRect();
        const hint = document.querySelector('#progress-hint').getBoundingClientRect();
        return counter.bottom <= marks.top && marks.bottom <= hint.top;
      });
      assert.ok(progressOrder, 'Counter, stars and instruction stack vertically');
      assert.ok(layout.music.top <= 24 && layout.music.right >= width - 24 && layout.music.width <= 28 && layout.music.height <= 28, 'Music control is a small circle in the top right');
      assert.ok(Math.abs(layout.constellation.width - layout.constellation.height) < 1, 'Heart keeps its square proportions');
      assert.ok(layout.stars.every(star => separate(layout.heading, star)), 'Heading clears stars');
      for (let i = 0; i < layout.stars.length; i++) {
        for (let j = i + 1; j < layout.stars.length; j++) {
          const a = layout.stars[i], b = layout.stars[j];
          assert.ok(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom, 'Star buttons stay separated');
        }
      }
      await page.screenshot({ path: `screenshots/spaced-stars-unopened-${width}.png`, fullPage: true });
      for (let i = 0; i < 8; i++) {
        await page.locator('.star').nth(i).click();
        await page.locator('#card-content > button').click();
      }
      await page.locator('#next').waitFor();
      layout = await measure();
      assert.ok(layout.stars.every(star => separate(layout.progress, star)), 'Progress clears stars');
      assert.ok(layout.progress.bottom + 4 <= layout.speech.top, 'Controls stay above dialogue');
      for (const box of [layout.speech, ...layout.mascots, layout.progress, ...layout.stars]) {
        assert.ok(box.top >= 0 && box.bottom <= height && box.left >= 0 && box.right <= width, 'Important content stays inside viewport');
      }
      assert.ok(separate(layout.speech, layout.music), 'Music control clears dialogue');
      assert.ok(layout.pageHeight <= height, 'No scrolling needed');
      await page.screenshot({ path: `screenshots/spaced-stars-${width}.png`, fullPage: true });
      await page.close();
      console.log(`Passed spacing at ${width}x${height}`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
