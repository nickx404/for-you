const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4173');
    assert.equal(await page.evaluate(() => window.clawAudio.ctx), null, 'No autoplay');
    await page.evaluate(() => {
      window.toneCount = 0;
      const createOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function (...args) {
        window.toneCount++;
        return createOscillator.apply(this, args);
      };
    });
    const tones = () => page.evaluate(() => window.toneCount);
    await page.locator('[data-code-key="1"]').click();
    assert.equal(await tones(), 1);
    assert.equal(await page.evaluate(() => window.clawAudio.ctx.state), 'running');
    assert.equal(await page.locator('.gate-slots span[data-filled]').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.locator('#gate-audio-toggle').click();
    assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-code-key="2"]').click();
    await page.locator('[data-code-key="clear"]').click();
    assert.equal(await tones(), 1, 'Muted keys create no sound');
    await page.locator('#gate-audio-toggle').click();
    const input = page.locator('#passcode-input');
    await input.fill('0000');
    const beforeWrong = await tones();
    await input.press('Enter');
    assert.equal(await tones(), beforeWrong + 2, 'Gentle two-note wrong-code sound');
    await input.fill('1613');
    const beforeUnlock = await tones();
    await input.press('Enter');
    await page.waitForSelector('#scene-hello.active');
    assert.equal(await tones(), beforeUnlock + 4, 'Four-note unlock chime');
    assert.equal(await page.locator('#audio-toggle').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(errors, []);
    await context.close();

    const silentContext = await browser.newContext();
    await silentContext.addInitScript(() => {
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
    });
    const silentPage = await silentContext.newPage();
    const silentErrors = [];
    silentPage.on('pageerror', error => silentErrors.push(error.message));
    await silentPage.goto(process.env.SITE_URL || 'http://127.0.0.1:4173');
    await require('./unlock.cjs')(silentPage);
    await silentPage.waitForSelector('#scene-hello.active');
    assert.deepEqual(silentErrors, [], 'Audio is optional');
    await silentContext.close();
    console.log('PASS passcode sound: no autoplay, real tones, shared mute, wrong/unlock notes, reduced motion, and unsupported audio.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
