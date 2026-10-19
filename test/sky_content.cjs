const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const width of [375, 1366]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.SKY_URL || 'http://127.0.0.1:4173/sky/index.html');
      await page.locator('#start').click();
      const titles = ['Remember this?', 'The first date?', 'First of many.', 'Something from me', 'A little of what I feel', 'Last option', 'And we still met', 'My favorite photo'];
      const photos = ['first-game-score.png', 'first-date-drawing.png', 'first-of-many.png', null, null, 'just-five-more-minutes.png', 'and-we-still-met.png', 'hold-my-hand.png'];
      for (let index = 0; index < titles.length; index++) {
        await page.locator('.star').nth(index).click();
        assert.equal(await page.locator('#card-title').textContent(), titles[index]);
        if (photos[index]) {
          const image = page.locator('.memory-photo');
          assert.equal(await image.getAttribute('src'), `assets/${photos[index]}`);
          await image.evaluate(img => img.decode());
          assert.ok(await image.evaluate(img => img.naturalWidth > 0));
          assert.ok(await image.evaluate(img => {
            const style = getComputedStyle(img);
            return style.maxHeight === 'none' && style.borderTopWidth === '5px'
              && img.getBoundingClientRect().width >= img.parentElement.clientWidth - 1;
          }), 'Every photo fills the card width with the same white frame');
        }
        if (index === 3) {
          assert.equal(await page.locator('.tv video').getAttribute('src'), 'assets/for-you-optimized.mp4');
          await page.waitForFunction(() => document.querySelector('.tv video').readyState >= 1);
        }
        if (index === 4) {
          const player = page.locator('.song-player');
          assert.equal(await player.getAttribute('src'), 'https://www.youtube.com/embed/lvsL19kX29Y?playsinline=1');
          assert.ok(await player.getAttribute('title'));
          assert.notEqual(await player.getAttribute('allowfullscreen'), null);
          const playerBox = await player.boundingBox();
          assert.ok(playerBox.width >= 200 && playerBox.height >= 200);
          const song = page.getByRole('link', { name: 'Listen on YouTube' });
          assert.equal(await song.getAttribute('href'), 'https://www.youtube.com/watch?v=lvsL19kX29Y');
          assert.equal(await song.getAttribute('target'), '_blank');
          assert.ok((await song.getAttribute('rel')).includes('noopener'));
          const note = page.locator('#card-content > .note');
          assert.equal(await note.textContent(), 'Even if it says “unavailable,” click the link and listen to the whole song :)');
          assert.ok(await note.evaluate(el => parseFloat(getComputedStyle(el).fontSize) < parseFloat(getComputedStyle(el.parentElement.querySelector('p:not(.eyebrow):not(.note)')).fontSize)));
          const reels = page.locator('.reel-link');
          const ids = ['DeOG5a_ApEj', 'Da0UzrNMbAv', 'DRq2QaGADew', 'DeGdYyJAHCk', 'DTyubr4gEFv', 'DR3wiSqgEZj'];
          assert.equal(await reels.count(), 6);
          for (let reel = 0; reel < ids.length; reel++) {
            const link = reels.nth(reel);
            assert.equal(await link.evaluate(el => el.firstChild.textContent), `Reel ${reel + 1} ↗`);
            assert.equal(await link.getAttribute('href'), `https://www.instagram.com/reel/${ids[reel]}/`);
            assert.equal(await link.getAttribute('target'), '_blank');
          }
          assert.equal(await page.locator('.reel-list input').count(), 0);
          const firstReel = reels.first();
          assert.equal(await firstReel.evaluate(el => el.classList.contains('opened')), false);
          await page.context().route('https://www.instagram.com/**', route => route.fulfill({status: 200, contentType: 'text/html', body: 'Reel link test'}));
          const [popup] = await Promise.all([page.waitForEvent('popup'), firstReel.click()]);
          await popup.waitForLoadState('domcontentloaded');
          assert.equal(popup.url(), 'https://www.instagram.com/reel/DeOG5a_ApEj/');
          await popup.close();
          assert.equal(await firstReel.getAttribute('aria-label'), 'Reel 1, opened');
          assert.equal(await page.locator('.reel-link.opened').count(), 1);
          assert.equal(await firstReel.locator('.reel-status').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(40, 115, 68)');
          await page.keyboard.press('Escape');
          await page.locator('.star').nth(4).click();
          assert.equal(await firstReel.getAttribute('aria-label'), 'Reel 1, opened');
          await page.locator('.reel-list').scrollIntoViewIfNeeded();
          await page.screenshot({ path: `screenshots/reels-${width}.png` });
        }
        assert.ok(await page.locator('#card').evaluate(el => el.scrollWidth <= el.clientWidth));
        if ([2, 4, 6, 7].includes(index)) await page.screenshot({ path: `screenshots/star-${index + 1}-${width}.png` });
        await page.keyboard.press('Escape');
        if (index === 4) await page.waitForFunction(() => !document.querySelector('.song-player'));
      }
      assert.equal(await page.locator('#counter').textContent(), '8 of 8 stars discovered');
      await page.locator('#next').waitFor();
      await page.reload();
      await page.locator('#start').click();
      await page.locator('.star').nth(4).click();
      assert.equal(await page.locator('.reel-link').first().getAttribute('aria-label'), 'Reel 1, opened');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Passed all eight cards, images, video, song link and completion at ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
