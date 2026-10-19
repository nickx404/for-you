const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const path = require('node:path');
const {chromium} = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
async function instrumentation(page) {
  await page.addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (destination, ...args) {
      if (this.mediaElement?.id === 'sky-music') window.musicGain = destination;
      return connect.call(this, destination, ...args);
    };
  });
}
async function playing(page) {
  await page.waitForFunction(() => !document.querySelector('#sky-music').paused && document.querySelector('#sky-music').currentTime > 0 && window.musicGain?.gain.value > .28);
}
(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    for (const viewport of [{width:1366,height:768},{width:390,height:844}]) {
      const context = await browser.newContext({viewport, hasTouch:viewport.width < 700, reducedMotion:'reduce'});
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await instrumentation(page);
      await page.goto(`${base}/sky/index.html`);
      const musicToggle = page.locator('#sky-music-control');
      if (await musicToggle.getAttribute('aria-label') === 'Mute sky music') {
        await musicToggle.click();
        await page.waitForFunction(() => document.querySelector('#sky-music').paused);
      }
      await musicToggle.click();
      await playing(page);
      assert.equal(await page.locator('#sky-music').evaluate(audio => audio.loop), true);
      await page.locator('#start').click();
      const videoIndex = await page.evaluate(async () => (await import('/sky/content.js?v=cosmic-ending')).content.stars.findIndex(star => star.video));
      for (let i = 0; i < videoIndex; i++) {
        await page.locator('.star').nth(i).click();
        await page.keyboard.press('Escape');
      }
      await page.locator('.star').nth(videoIndex).click();
      await page.waitForTimeout(400);
      const fading = await page.evaluate(() => ({gain:window.musicGain.gain.value,paused:document.querySelector('#sky-music').paused}));
      assert.ok(fading.gain > .01 && fading.gain < .28 && !fading.paused, 'Music fades rather than stopping abruptly');
      await page.waitForFunction(() => document.querySelector('#sky-music').paused);
      assert.equal(await page.locator('video').evaluate(video => video.paused), true, 'Opening Star 4 pauses music before the video starts');
      await page.locator('video').evaluate(video => video.play());
      const pausedAt = await page.locator('#sky-music').evaluate(audio => audio.currentTime);
      await page.locator('video').evaluate(video => video.pause());
      await page.waitForTimeout(200);
      assert.equal(await page.locator('#sky-music').evaluate(audio => audio.paused), true, 'Music stays quiet during a video pause');
      await page.keyboard.press('Escape');
      await playing(page);
      assert.ok(await page.locator('#sky-music').evaluate(audio => audio.currentTime) > pausedAt, 'Closing resumes from the same music position');
      await page.locator('.star').nth(videoIndex).click();
      await page.locator('video').evaluate(async video => {
        if (video.readyState < 1) await new Promise(resolve => video.addEventListener('loadedmetadata', resolve, {once:true}));
        video.currentTime = video.duration - .2;
        await video.play();
      });
      await page.waitForFunction(() => document.querySelector('video').ended);
      await playing(page);
      await page.waitForTimeout(1100);
      assert.equal(await page.locator('#sky-music').evaluate(audio => audio.paused), false, 'A stale fade timer cannot pause music after the video ends');
      await page.keyboard.press('Escape');
      await page.locator('#sky-music-control').click();
      await page.waitForFunction(() => document.querySelector('#sky-music').paused);
      await page.locator('.star').nth(videoIndex).click();
      await page.locator('video').evaluate(video => video.play());
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1100);
      assert.equal(await page.locator('#sky-music').evaluate(audio => audio.paused), true, 'Leaving video respects the music off setting');
      await page.locator('#sky-music-control').click();
      await playing(page);
      await page.locator('#sky-music').evaluate(audio => { audio.currentTime = audio.duration - .15; });
      await page.waitForFunction(() => !document.querySelector('#sky-music').paused && document.querySelector('#sky-music').currentTime < 2);
      const count = await page.locator('.star').count();
      for (let i = 0; i < count; i++) {
        await page.locator('.star').nth(i).click();
        await page.keyboard.press('Escape');
      }
      await page.locator('#next').click(); await playing(page);
      await page.locator('#answer-yes').click(); await playing(page);
      assert.deepEqual(errors, []);
      await page.screenshot({path:`screenshots/sky-music-${viewport.width}.png`});
      console.log(`Passed loop, fade, video end/exit, mute and finale at ${viewport.width}×${viewport.height}`);
      await context.close();
    }
    const page = await browser.newPage({reducedMotion:'reduce'});
    await instrumentation(page);
    await page.goto(base); await require('./unlock.cjs')(page);
    assert.equal(await page.locator('#sky-music').count(), 0, 'Second track is not loaded in the main scene document');
    await page.waitForFunction(() => window.clawAudio.sceneMusic && !window.clawAudio.sceneMusic.paused);
    const originalPosition = await page.evaluate(() => window.clawAudio.sceneMusic.currentTime);
    await page.evaluate(() => window.showScene('scene-sky'));
    await page.waitForFunction(position => !window.clawAudio.sceneMusic.paused && window.clawAudio.sceneMusic.currentTime > position, originalPosition);
    assert.equal(await page.locator('#sky-music').count(), 0, 'I built a sky for you still uses only the first soundtrack');
    assert.ok(await page.evaluate(() => window.clawAudio.sceneMusic.src.endsWith('/assets/scene-music.mp3')));
    await page.evaluate(() => sessionStorage.setItem('sky-music-position', '45'));
    await page.evaluate(() => window.addEventListener('pagehide', () => sessionStorage.setItem('test-first-track-stopped', String(window.clawAudio.sceneMusic.paused))));
    await page.locator('#btn-enter-sky').click();
    await page.waitForURL('**/sky/index.html');
    await page.locator('#welcome h1').click(); await playing(page);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('test-first-track-stopped')), 'true');
    assert.ok(await page.locator('#sky-music').evaluate(audio => audio.src.endsWith('/sky/assets/sky-music.mp3') && audio.currentTime < 8), 'Second soundtrack begins on I made you a little sky');
    console.log('Passed first-track continuity through I built a sky, then second-track start on the separate Sky welcome page');
    await page.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
