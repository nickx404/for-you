const { createRequire } = require('node:module');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const url = process.env.SKY_URL || 'http://127.0.0.1:4173/sky/index.html';

async function noPosition(page) {
  await page.locator('#answer-no').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished.catch(() => {}))));
  return page.locator('#answer-no').boundingBox();
}
async function checkSafePosition(page) {
  await noPosition(page);
  assert.ok(await page.locator('#answer-no').evaluate(button => {
    const b = button.getBoundingClientRect();
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    return b.width >= 44 && b.height >= 44 && b.left >= left && b.top >= top && b.right <= left + (viewport?.width || innerWidth) && b.bottom <= top + (viewport?.height || innerHeight)
      && [...document.querySelectorAll('.question-core, #finale-close, #finale > .sky-music-toggle')].every(el => {
        const r = el.getBoundingClientRect();
        return b.right <= r.left || b.left >= r.right || b.bottom <= r.top || b.top >= r.bottom;
      });
  }), 'No stays visible and outside protected content');
}
async function checkCollage(page, selector) {
  const collage = page.locator(selector);
  assert.ok(await collage.locator('.party-sticker').count() >= 30, 'Dense sticker coverage across the scene');
  assert.ok(await collage.locator('.art-sticker').evaluateAll(nodes => {
    const variants = new Set(nodes.map(el => el.className));
    const count = nodes.length;
    const occurrences = nodes.reduce((counts, el) => counts.set(el.className, (counts.get(el.className) || 0) + 1), new Map());
    const firstCycle = nodes.slice(0, 35).map(el => el.className);
    const newArt = nodes.filter(el => getComputedStyle(el).backgroundImage.includes('/assets/love-sticker-sheet.png'));
    return variants.size >= Math.min(35, count) && new Set(firstCycle).size === firstCycle.length
      && Math.max(...occurrences.values()) <= Math.ceil(count / 35)
      && newArt.length >= 15 && nodes.every(el => getComputedStyle(el).backgroundImage !== 'none' && el.getBoundingClientRect().height > 0);
  }), 'Use the supplied sticker sheets with varied, visible crop windows');
  assert.ok(await collage.evaluate(el => {
    const layer = el.getBoundingClientRect(), scene = el.parentElement.getBoundingClientRect();
    return layer.left <= scene.left && layer.right >= scene.right && layer.top <= scene.top && layer.bottom >= scene.bottom;
  }), 'Sticker grid covers the entire scene');
}
(async () => {
  const browser = await chromium.launch({headless:true, channel:'msedge'});
  try {
    for (const [width, height, reduced] of [[375,667,true],[393,852,false],[430,932,true],[667,375,true],[1366,768,false]]) {
      const context = await browser.newContext({viewport:{width,height}, hasTouch:width < 700, reducedMotion:reduced ? 'reduce' : 'no-preference'});
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.locator('#start').click();
      assert.equal(await page.locator('#next').isVisible(), false);
      const starCount = await page.locator('.star').count();
      for (let i = 0; i < starCount; i++) {
        await page.locator('.star').nth(i).click();
        await page.keyboard.press('Escape');
        if (i < starCount - 1) assert.equal(await page.locator('#next').isVisible(), false);
      }
      await page.locator('#next').waitFor();
      assert.equal(await page.locator('body').evaluate(el => el.classList.contains('rose-sky')), true);
      assert.equal(await page.locator('#constellation > .floating-heart').count(), reduced ? 0 : 6);
      await page.locator('#next').click();
      assert.equal(await page.locator('#finale').evaluate(el => el.open), true);
      assert.match(await page.locator('#question-title').innerText(), /So\.\.\.\s*Is this us\?\s*Officially\?/);
      assert.equal(await page.getByText('You, me, and a little less pretending.', {exact:true}).count(), 0);
      assert.equal(await page.locator('#question-title').evaluate(el => el === document.activeElement), true);
      await checkCollage(page, '#question-stickers');
      assert.equal(await page.getByText('Maybe later', {exact:true}).count(), 0);
      assert.equal(await page.getByRole('button', {name:'Wait… really?'}).count(), 0);
      const initial = await noPosition(page);
      const no = page.locator('#answer-no');
      if (width < 700) await page.touchscreen.tap(initial.x + initial.width/2, initial.y + initial.height/2);
      else await page.mouse.move(initial.x + initial.width/2, initial.y + initial.height/2);
      if (!reduced) {
        const motion = await no.evaluate(el => {
          const animation = el.getAnimations()[0];
          return animation && {duration:animation.effect.getTiming().duration, frames:animation.effect.getKeyframes().map(frame => frame.transform)};
        });
        assert.equal(motion?.duration, 400, 'Hover and touch start a smooth glide');
        assert.notEqual(motion.frames[0], motion.frames.at(-1), 'Glide has distinct start and end positions');
      }
      assert.notDeepEqual(await noPosition(page), initial);
      const destinations = [await noPosition(page)];
      await checkSafePosition(page);
      await no.focus();
      for (const key of ['Enter', ' ', 'Enter']) {
        await page.waitForTimeout(270);
        const before = await noPosition(page);
        await page.keyboard.press(key);
        assert.notDeepEqual(await noPosition(page), before);
        destinations.push(await noPosition(page));
        assert.equal(await no.evaluate(el => el === document.activeElement), true);
        await checkSafePosition(page);
      }
      assert.ok(new Set(destinations.map(position => `${position.x}:${position.y}`)).size >= 3, 'No explores varied positions instead of alternating corners');
      // A pointer press and its synthetic click must cause only one relocation.
      await page.waitForTimeout(270);
      const beforePress = await noPosition(page);
      await no.dispatchEvent('pointerdown', {pointerType:'touch', clientX:beforePress.x+20, clientY:beforePress.y+20});
      const afterPress = await noPosition(page);
      await no.dispatchEvent('click', {detail:1});
      assert.deepEqual(await noPosition(page), afterPress);
      assert.equal(await page.locator('#celebration').isVisible(), false, 'No never accepts the question');
      await checkSafePosition(page);
      await page.setViewportSize({width:height, height:width});
      await page.waitForTimeout(80);
      await checkSafePosition(page);
      await page.setViewportSize({width,height});
      await page.waitForTimeout(80);
      await page.screenshot({path:`screenshots/finale-question-${width}.png`});
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#next').evaluate(el => el === document.activeElement), true);
      await page.locator('#next').click();
      assert.equal(await no.evaluate(el => el.classList.contains('dodging')), false);
      await page.locator('#answer-yes').click();
      if (!reduced) {
        assert.equal(await page.locator('#celebration').isVisible(), false, 'Question remains while hearts fall');
        assert.equal(await page.locator('#heart-rain > span').count(), 96);
        assert.equal(await page.locator('#answer-yes').isDisabled(), true);
        await page.waitForTimeout(2450);
        await page.screenshot({path:`screenshots/heart-rain-filled-${width}.png`});
      }
      await page.locator('#celebration').waitFor({state:'visible'});
      assert.equal(await page.locator('#celebration').isVisible(), true);
      assert.equal(await page.locator('.cheer-bubble').textContent(), 'YAAAYYY!!!');
      for (const selector of ['.cheer-otter', '.cheer-bunny']) {
        await page.locator(selector).evaluate(image => image.decode());
        assert.equal(await page.locator(selector).isVisible(), true);
      }
      assert.ok(await page.locator('.celebration-friends').evaluate(el => {
        const otter = el.querySelector('.cheer-otter').getBoundingClientRect();
        const actions = el.querySelector('.celebration-actions').getBoundingClientRect();
        const bunny = el.querySelector('.cheer-bunny').getBoundingClientRect();
        return otter.right <= actions.left && bunny.left >= actions.right;
      }), 'Otter and Bunny sit on opposite sides of the buttons');
      assert.equal(await page.locator('#celebration-title').evaluate(el => el === document.activeElement), true);
      await checkCollage(page, '#party-stickers');
      assert.equal(await page.locator('#party-burst > span').count(), 0);
      assert.equal(await page.locator('#party-drift > span').count(), reduced ? 0 : 6);
      if (reduced) {
        assert.equal(await page.locator('#celebration').evaluate(el => el.getAnimations({subtree:true}).length), 0);
      }
      const contact = page.getByRole('link', {name:'Come to me', exact:true});
      const contactUrl = new URL(await contact.getAttribute('href'));
      assert.equal(contactUrl.origin, 'https://wa.me');
      assert.equal(contactUrl.searchParams.get('text'), "I'm here");
      assert.equal(await contact.getAttribute('target'), '_blank');
      assert.equal(await page.getByRole('button', {name:'Replay celebration'}).count(), 0);
      assert.equal(await page.locator('#party-burst > span').count(), 0);
      if (!reduced) {
        await page.waitForTimeout(4200);
        assert.equal(await page.locator('#party-burst > span').count(), 0);
      }
      await page.screenshot({path:`screenshots/finale-party-${width}.png`});
      assert.equal(await page.locator('#finale').evaluate(el => el.scrollWidth <= el.clientWidth), true);
      await page.locator('#party-back').click();
      await page.waitForFunction(() => document.activeElement === document.querySelector('#next'));
      assert.equal(await page.locator('#finale').evaluate(el => el.open), false);
      assert.equal(await page.locator('#party-burst > span, #party-drift > span, .party-sticker').count(), 0);
      assert.equal(await page.locator('body').getAttribute('data-sky'), 'clouds');
      assert.equal(await page.locator('#counter').textContent(), `${starCount} of ${starCount} stars discovered`);

      if (!reduced) {
        await page.locator('#next').click();
        await page.locator('#answer-yes').click();
        await page.keyboard.press('Escape');
        await page.locator('#next').click();
        await page.waitForTimeout(2900);
        assert.equal(await page.locator('#celebration').isVisible(), false, 'Closing cancels the pending reveal');
        assert.equal(await page.locator('#heart-rain > span').count(), 0);
        assert.equal(await page.locator('#answer-yes').isEnabled(), true);
        await page.keyboard.press('Escape');
      }
      await page.locator('.star').first().click();
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, []);
      console.log(`Passed finale, dodging, WhatsApp link, return and ${reduced ? 'reduced' : 'full'} motion at ${width}×${height}`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
