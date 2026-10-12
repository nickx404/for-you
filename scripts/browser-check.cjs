const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const path = require('node:path');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  for (const [width,height] of [[1366,768],[1920,1080],[390,844]]) {
    const page = await browser.newPage({viewport:{width,height}});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4173');
    for(const mode of ['purple','pink','clouds']) {
      await page.locator('#sky-mode').selectOption(mode);
      assert.equal(await page.locator('body').getAttribute('data-sky'),mode);
      assert.ok(await page.evaluate(() => document.getAnimations().some(a=>['sky-drift','drift'].includes(a.animationName))));
      await page.screenshot({path:`screenshots/${mode}-${width}.png`});
    }
    await page.screenshot({path:`screenshots/welcome-${width}.png`});
    await page.getByRole('button',{name:'Show me'}).click();
    const stars=page.locator('.star'); const count=await stars.count();
    assert.equal(count,6);
    const positions = await stars.evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.left)));
    assert.ok(positions[1]>88 && positions[4]<12);
    const heights = await stars.evaluateAll(nodes=>nodes.map(node=>parseFloat(node.style.top)));
    assert.ok(heights[1]>20 && heights[1]<25 && Math.abs(heights[1]-heights[4])<.01);
    assert.equal(await page.locator('.heart-guide').count(),0);
    assert.equal(await page.locator('.heart-complete').evaluate(el=>getComputedStyle(el).opacity),'0');
    assert.deepEqual(await page.locator('.star-number').allTextContents(),['1','2','3','4','5','6']);
    assert.equal(await page.locator('.check').count(),0);
    assert.ok(await page.locator('.star-shape').evaluateAll(images=>images.every(image=>getComputedStyle(image).filter.includes('grayscale(1)'))));
    assert.equal(await page.locator('.heart-reveal').evaluate(el=>getComputedStyle(el).opacity),'0');
    assert.equal(await page.locator('#next').isEnabled(),false);
    assert.equal(await page.locator('#next').isVisible(),false);
    for (let i=0;i<count;i++) {
      await stars.nth(i).click();
      assert.equal(await page.locator('#card').isVisible(),true);
      await page.keyboard.press('Escape');
      assert.equal(await stars.nth(i).locator('.star-number').isVisible(),false);
      await page.waitForFunction(index=>!getComputedStyle(document.querySelectorAll('.star-shape')[index]).filter.includes('grayscale'),i);
      assert.equal(await page.locator('#counter').textContent(),`${i+1} of ${count} stars discovered`);
      if(i===0) {
        await page.locator('#sky-mode').selectOption('purple');
        await page.locator('#sky-mode').selectOption('pink');
        await page.locator('#sky-mode').selectOption('clouds');
        assert.equal(await page.locator('#counter').textContent(),`1 of ${count} stars discovered`);
      }
      if(i===count-1) {
        await page.waitForFunction(()=>document.querySelector('#constellation').classList.contains('outline-glow'));
        const glowFrames = await page.locator('.heart-glow').evaluate(el=>el.getAnimations()[0].effect.getKeyframes());
        assert.ok(glowFrames[0].clipPath.startsWith('inset(100%'));
        assert.ok(glowFrames.at(-1).clipPath.startsWith('inset(0'));
        assert.equal(await page.locator('.heart-reveal').evaluate(el=>getComputedStyle(el).opacity),'0');
        assert.equal(await page.locator('#next').isEnabled(),false);
        assert.equal(await page.locator('#next').isVisible(),false);
        await page.waitForFunction(() => !document.querySelector('#next').disabled);
      }
      assert.equal(await page.locator('#next').isEnabled(),i===count-1);
      assert.equal(await page.locator('#next').isVisible(),i===count-1);
    }
    await stars.nth(0).click(); await page.getByRole('button',{name:'Keep exploring'}).click();
    assert.equal(await page.locator('#counter').textContent(),`${count} of ${count} stars discovered`);
    await page.screenshot({path:`screenshots/heart-${width}.png`});
    assert.equal(await page.locator('.heart-reveal').evaluate(el=>getComputedStyle(el).opacity),'1');
    assert.ok(await page.locator('.star-shape').evaluateAll(images=>images.every(image=>image.complete && image.naturalWidth>0)));
    assert.ok(await page.locator('.heart-reveal img').evaluate(image=>image.complete && image.naturalWidth>0));
    const outlineBox = await page.locator('.heart-complete').boundingBox();
    const fillBox = await page.locator('.heart-reveal img').boundingBox();
    for(const key of ['x','y','width','height']) assert.ok(Math.abs(outlineBox[key]-fillBox[key])<1);
    for(const mode of ['purple','pink','clouds']) {
      await page.locator('#sky-mode').selectOption(mode);
      assert.equal(await page.locator('#next').isEnabled(),true);
      assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>['pixel-heart-fill','pixel-outline-reveal','outline-glow'].includes(a.animationName) && a.playState==='running')),false);
    }
    await page.locator('#next').click();
    await page.getByRole('button',{name:'Wait… really?'}).click(); assert.equal(await page.locator('#really').isVisible(),true);
    await page.getByRole('button',{name:'Maybe later'}).click();
    await page.getByRole('button',{name:'Back to the question'}).click();
    await page.getByRole('button',{name:'Yes'}).click();
    await page.getByRole('button',{name:'Okay, come to me'}).click();
    assert.equal(await page.locator('#missing-number').isVisible(),true);
    assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:`screenshots/yes-${width}.png`});
    await page.close(); console.log(`Passed full journey at ${width} × ${height}`);
  }
  const quiet = await browser.newPage({reducedMotion:'reduce'});
  await quiet.goto('http://127.0.0.1:4173');
  for(const mode of ['purple','pink','clouds']) {
    await quiet.locator('#sky-mode').selectOption(mode);
    assert.equal(await quiet.evaluate(() => document.getAnimations().some(a=>['sky-drift','drift'].includes(a.animationName))),false);
  }
  await quiet.route('**/assets/smiling-heart.png',route=>route.abort());
  await quiet.reload();
  await quiet.getByRole('button',{name:'Show me'}).click();
  for(let i=0;i<6;i++) {
    await quiet.locator('.star').nth(i).click();
    await quiet.keyboard.press('Escape');
  }
  await quiet.waitForFunction(()=>!document.querySelector('#next').disabled);
  assert.equal(await quiet.locator('.heart-reveal img').isVisible(),false);
  await quiet.close();
  console.log('Passed reduced-motion checks for all three skies');
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});



