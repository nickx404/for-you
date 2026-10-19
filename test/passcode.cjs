const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const output = path.join(__dirname, 'previews');
  fs.mkdirSync(output, { recursive: true });
  try {
    for (const scenario of [
      { name: 'desktop', viewport: { width: 1280, height: 800 } },
      { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
      { name: 'narrow-reduced', viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    ]) {
      const { name, ...options } = scenario;
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(baseUrl);
      const input = page.locator('#passcode-input');
      assert.equal(await page.locator('#site-content').isVisible(), false);
      assert.equal(await page.locator('.scene.active').count(), 0);
      assert.equal(await page.textContent('#typewriter-text'), '');
      await page.evaluate(() => window.showScene('scene-claw'));
      assert.equal(await page.locator('.scene.active').count(), 0);
      await page.screenshot({ path: path.join(output, `passcode-${name}.png`), fullPage: true });

      await input.fill('16');
      await input.press('Enter');
      assert.match(await page.textContent('#passcode-status'), /all four digits/);
      assert.equal(await page.locator('#passcode-hint').isVisible(), false);
      await input.fill('0000');
      await input.press('Enter');
      assert.match(await page.textContent('#passcode-status'), /Oops/);
      assert.equal(await page.locator('#passcode-hint').isVisible(), false);
      await input.fill('9999');
      await input.press('Enter');
      assert.equal(await page.locator('#passcode-hint').isVisible(), true);
      assert.equal(await page.textContent('#passcode-hint'), 'Need a little hint? Text me 💌');
      await page.screenshot({ path: path.join(output, `passcode-hint-${name}.png`), fullPage: true });

      const pressKey = async key => {
        const button = page.locator(`[data-code-key="${key}"]`);
        if (options.hasTouch) await button.tap();
        else await button.click();
      };
      for (const key of ['1', '6', '1', '4', '9']) await pressKey(key);
      assert.equal(await input.inputValue(), '1614');
      await pressKey('delete');
      await pressKey('3');
      assert.equal(await input.inputValue(), '1613');
      await pressKey('clear');
      assert.equal(await input.inputValue(), '');
      await pressKey('0');
      assert.equal(await input.inputValue(), '0');
      await pressKey('clear');

      // Typing, Backspace, masking, and no automatic submission after four digits.
      await input.pressSequentially('1614');
      await input.press('Backspace');
      await input.press('3');
      assert.equal(await input.inputValue(), '1613');
      assert.equal(await page.locator('.gate-slots').innerText(), '●\n●\n●\n●');
      assert.equal(await input.getAttribute('type'), 'password');
      assert.equal(await page.locator('#passcode-hint').isVisible(), true);
      assert.equal(await page.locator('#passcode-gate').isVisible(), true);
      await input.press('Enter');
      // A second submission during the celebration cannot open twice.
      await page.locator('#passcode-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
      await page.waitForSelector('#scene-hello.active');
      assert.equal(await page.locator('#passcode-gate').isVisible(), false);
      assert.equal(await page.locator('#site-content').getAttribute('inert'), null);
      await page.evaluate(() => window.showScene('scene-isabella'));
      await page.reload();
      await page.waitForSelector('#scene-isabella.active');
      assert.equal(await page.locator('#passcode-gate').isVisible(), false);
      await page.evaluate(() => window.showScene('scene-sky'));
      await page.locator('#btn-replay').click();
      await page.waitForSelector('#scene-hello.active');
      assert.equal(await page.locator('#passcode-gate').isVisible(), false);

      // Simulate the smaller usable viewport while a mobile keyboard is open.
      if (options.isMobile) {
        await page.evaluate(() => sessionStorage.clear());
        await page.setViewportSize({ width: options.viewport.width, height: 360 });
        await page.reload();
        await input.focus();
        await page.locator('#passcode-submit').scrollIntoViewIfNeeded();
        const box = await page.locator('#passcode-submit').boundingBox();
        assert.ok(box.y >= 0 && box.y + box.height <= 360);
        assert.equal(await page.evaluate(() => {
          const gate = document.getElementById('passcode-gate');
          return gate.scrollWidth <= gate.clientWidth;
        }), true);
        await page.screenshot({ path: path.join(output, `passcode-keyboard-${name}.png`) });
      }
      assert.deepEqual(errors, []);
      await context.close();
    }

    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Storage blocked'); } });
    });
    const page = await context.newPage();
    await page.goto(baseUrl);
    await require('./unlock.cjs')(page);
    await page.waitForSelector('#scene-hello.active');
    await page.reload();
    assert.equal(await page.locator('#passcode-gate').isVisible(), true);
    await require('./unlock.cjs')(page);
    await context.close();

    const fresh = await browser.newContext();
    const freshPage = await fresh.newPage();
    await freshPage.goto(baseUrl);
    assert.equal(await freshPage.locator('#passcode-gate').isVisible(), true);
    // insertText uses the same input event path as pasting a four-digit code.
    await freshPage.locator('#passcode-input').focus();
    await freshPage.keyboard.insertText('1613');
    assert.equal(await freshPage.locator('#passcode-input').inputValue(), '1613');
    await freshPage.locator('[data-code-key="clear"]').click();
    for (const digit of '1613') await freshPage.locator(`[data-code-key="${digit}"]`).click();
    await freshPage.locator('#passcode-submit').click();
    await freshPage.waitForSelector('#scene-hello.active');
    await fresh.close();

    const noJS = await browser.newContext({ javaScriptEnabled: false });
    const noJSPage = await noJS.newPage();
    await noJSPage.goto(baseUrl);
    assert.equal(await noJSPage.locator('.gate-noscript').isVisible(), true);
    assert.equal(await noJSPage.locator('#site-content').isVisible(), false);
    await noJS.close();
    console.log('Passcode passed: desktop/mobile, masking, keyboard/paste, hints, navigation guard, refresh/replay, storage blocked, reduced motion, and no JavaScript.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
