const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');

const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
const outDir = path.join(os.tmpdir(), 'pippo-scene3');
const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';

async function testScenes() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    for (const scenario of [
      { name: 'desktop', viewport: { width: 1280, height: 800 }, input: 'mouse' },
      { name: 'mobile', viewport: { width: 390, height: 844 }, input: 'touch' },
      { name: 'keyboard', viewport: { width: 1280, height: 800 }, input: 'keyboard' },
      { name: 'narrow-reduced', viewport: { width: 320, height: 568 }, input: 'touch', reducedMotion: 'reduce' }
    ]) {
      const context = await browser.newContext({
        viewport: scenario.viewport,
        hasTouch: scenario.input === 'touch',
        isMobile: scenario.input === 'touch',
        reducedMotion: scenario.reducedMotion || 'no-preference'
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      const activate = async selector => {
        const control = page.locator(selector);
        if (scenario.input === 'keyboard') {
          await control.focus();
          await page.keyboard.press('Enter');
        } else if (scenario.input === 'touch') {
          await control.tap();
        } else {
          await control.click();
        }
      };

      await page.goto(baseUrl);

      await require('./unlock.cjs')(page);
      await page.waitForSelector('#btn-hello-next.visible');
      assert.match(await page.textContent('#typewriter-text'), /Hallloosss Kuttupuppss/);
      assert.match(await page.textContent('#otter-speech'), /Hi, Madam Rabbit/);
      assert.match(await page.textContent('#bunny-speech'), /Hi, Mr. Otter/);
      const otterFeet = await page.locator('#hello-mascots .otter').boundingBox();
      const bunnyFeet = await page.locator('#hello-mascots .bunny').boundingBox();
      const otterGround = otterFeet.y + otterFeet.height;
      const bunnyGround = bunnyFeet.y + bunnyFeet.height;
      assert.ok(Math.abs(otterGround - bunnyGround) <= 1, 'Both mascots must stand on the same ground line');
      assert.ok(otterGround > scenario.viewport.height * 0.62 && otterGround < scenario.viewport.height * 0.85, 'Mascots must stand on the meadow grass');
      const continueBox = await page.locator('#btn-hello-next').boundingBox();
      assert.ok(continueBox.y > Math.max(otterGround, bunnyGround) + 16, 'Continue must not cover the mascots');
      assert.equal(await page.locator('.meadow-landscape').evaluate(img => img.naturalWidth), 1200);
      assert.equal(await page.locator('.meadow-landscape').evaluate(img => img.naturalHeight), 675);
      if (scenario.reducedMotion) assert.equal(await page.locator('.meadow-petals').isVisible(), false);
      await page.screenshot({ path: path.join(outDir, `${scenario.name}-hello.png`) });
      await activate('#btn-hello-next');
      await page.waitForSelector('#scene-isabella.active');
      assert.equal(await page.locator('.isabella-gif').isVisible(), true);
      await page.screenshot({ path: path.join(outDir, `${scenario.name}-isabella.png`) });
      await activate('#btn-isabella-next');
      await page.waitForSelector('#scene-envelope.active');
      await page.waitForFunction(() => getComputedStyle(document.getElementById('scene-envelope')).opacity === '1');

      assert.equal(await page.getAttribute('#scene-envelope', 'data-state'), 'sealed');
      assert.equal(await page.locator('#btn-enter-arcade').isVisible(), false);
      assert.equal(await page.locator('#envelope-letter').isVisible(), false);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('a');
      assert.equal(await page.evaluate(() => window.clawGame.state), 'IDLE');
      assert.equal(await page.evaluate(() => window.clawGame.carriageX), 50);
      await page.screenshot({ path: path.join(outDir, `${scenario.name}-sealed.png`) });

      await activate('#wax-seal');
      await page.waitForSelector('#scene-envelope[data-state="open"]');
      assert.equal(await page.getAttribute('#wax-seal', 'aria-expanded'), 'true');
      assert.match(await page.textContent('#envelope-letter'), /For Pippo:\s*Your surprise is waiting just beyond this letter\.\.\. ✨/);
      assert.equal(await page.textContent('#btn-enter-arcade'), 'SHOWWMEE!');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-enter-arcade');
      const letter = await page.locator('#envelope-letter').boundingBox();
      const button = await page.locator('#btn-enter-arcade').boundingBox();
      assert.ok(letter.x >= 0 && letter.x + letter.width <= scenario.viewport.width);
      assert.ok(letter.y >= 0 && button.y + button.height <= scenario.viewport.height);
      await page.screenshot({ path: path.join(outDir, `${scenario.name}-opened.png`) });

      await activate('#btn-enter-arcade');
      // Repeated events must be harmless while the transition is running.
      await page.locator('#btn-enter-arcade').dispatchEvent('click');
      assert.equal(await page.locator('.letter-flight').count(), 1);
      assert.equal(await page.evaluate(() => window.clawGame.state), 'IDLE');
      await page.waitForTimeout(scenario.reducedMotion ? 50 : 450);
      const flight = await page.locator('.letter-flight').boundingBox();
      assert.ok(flight);
      if (!scenario.reducedMotion) assert.ok(flight.width > letter.width);
      await page.screenshot({ path: path.join(outDir, `${scenario.name}-transition.png`) });
      await page.waitForSelector('#scene-claw.active:not(.arcade-arriving)');
      await page.waitForSelector('.letter-flight', { state: 'detached' });
      assert.equal(await page.evaluate(() => window.clawGame.state), 'IDLE');
      await page.screenshot({ path: path.join(outDir, `${scenario.name}-arcade.png`) });
      if (scenario.input === 'keyboard') {
        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(100);
        await page.keyboard.up('ArrowRight');
        assert.ok(await page.evaluate(() => window.clawGame.carriageX > 50));
        assert.equal(await page.evaluate(() => window.clawGame.state), 'IDLE');
      }

      // Exercise the real replay action, then return through the introduction.
      await page.evaluate(() => window.showScene('scene-sky'));
      await activate('#btn-replay');
      await page.waitForSelector('#btn-hello-next.visible');
      await activate('#btn-hello-next');
      await activate('#btn-isabella-next');
      await page.waitForSelector('#scene-envelope.active');
      assert.equal(await page.getAttribute('#scene-envelope', 'data-state'), 'sealed');
      assert.equal(await page.locator('#btn-enter-arcade').isVisible(), false);
      assert.equal(await page.locator('#wax-seal').isEnabled(), true);
      await activate('#wax-seal');
      await page.waitForSelector('#scene-envelope[data-state="open"]');
      await activate('#btn-enter-arcade');
      await page.waitForSelector('#scene-claw.active:not(.arcade-arriving)');
      assert.deepEqual(errors, []);
      console.log(`PASS ${scenario.name}: full intro, envelope, zoom, hidden controls, and replay`);
      await context.close();
    }
    console.log(`Screenshots: ${outDir}`);
  } finally {
    await browser.close();
  }
}

testScenes().catch(err => {
  console.error(err);
  process.exit(1);
});
