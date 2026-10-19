const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        hasTouch: mobile,
        isMobile: mobile,
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseUrl);
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic), null);
      await page.locator('#passcode-input').fill('0000');
      await page.locator('#passcode-submit').click();
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic), null, 'Wrong codes do not start music');
      await require('./unlock.cjs')(page);
      await page.waitForFunction(() => window.clawAudio.sceneMusic?.currentTime > 0.05);
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.loop), true);
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.volume), 0.25);
      await page.evaluate(() => { window.originalMusic = window.clawAudio.sceneMusic; });
      for (const scene of ['hello', 'isabella', 'envelope', 'claw', 'window', 'sky']) {
        await page.evaluate(id => window.showScene(`scene-${id}`), scene);
        assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic === window.originalMusic), true);
        assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.paused), false);
      }

      // The actual MP3 should wrap from its end without needing a new scene.
      await page.waitForFunction(() => Number.isFinite(window.clawAudio.sceneMusic.duration));
      await page.evaluate(() => {
        const music = window.clawAudio.sceneMusic;
        music.currentTime = music.duration - 0.15;
      });
      await page.waitForFunction(() => window.clawAudio.sceneMusic.currentTime < 2);
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.paused), false);
      await page.locator('#audio-toggle').click();
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.muted), true);
      await page.locator('#audio-toggle').click();
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.muted), false);

      // The opened-window transition must not interrupt this document's music.
      await page.evaluate(() => {
        window.showScene('scene-window');
        document.dispatchEvent(new CustomEvent('windowOpened'));
      });
      await page.waitForSelector('#scene-sky.active');
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.paused), false);
      await page.reload();
      // A browser can block reload autoplay; the existing sound button retries it.
      await page.locator('#audio-toggle').click();
      await page.locator('#audio-toggle').click();
      await page.waitForFunction(() => window.clawAudio.sceneMusic?.currentTime > 0.05);

      await page.locator('#btn-replay').click();
      await page.waitForSelector('#scene-hello.active');
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.paused), false);
      await page.evaluate(() => window.showScene('scene-sky'));
      // Check the departure handler before taking the real link.
      await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusic.paused), true);
      assert.equal(await page.evaluate(() => window.clawAudio.sceneMusicActive), false);
      let leakedMusicRequest = false;
      page.on('request', request => {
        if (request.url().endsWith('/scene-music.mp3')) leakedMusicRequest = true;
      });
      await page.locator('#btn-enter-sky').click();
      await page.waitForURL('**/sky/index.html');
      assert.equal(await page.evaluate(() => typeof window.clawAudio), 'undefined');
      assert.equal(leakedMusicRequest, false, 'Scene music is not loaded on the Sky page');
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${mobile ? 'mobile' : 'desktop'} music: unlock, all six scenes, real MP3 looping, mute, window reveal, reload/replay, and Sky separation.`);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
