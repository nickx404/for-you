const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const path = require('node:path');
const runtimeRequire = createRequire(path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const { chromium } = runtimeRequire('playwright');
async function checkMeadow(page, width, height) {
  await page.locator('#sky-mode').selectOption('clouds');
  const image = page.locator('.meadow-background img');
  await image.evaluate(img => img.decode());
  const layout = await image.evaluate(img => {
    const world = document.querySelector('#world').getBoundingClientRect();
    return {width:world.width,height:world.height,source:img.currentSrc,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,fit:getComputedStyle(img).objectFit,position:getComputedStyle(img).objectPosition};
  });
  const mobile = width <= 700;
  assert.ok(layout.source.endsWith(`starry-meadow-${mobile?'mobile':'desktop'}.webp`));
  assert.deepEqual([layout.naturalWidth,layout.naturalHeight],mobile?[1179,2556]:[3840,2160]);
  assert.equal(layout.position,layout.fit==='contain'?'50% 30%':'50% 0%');
  // Conservative bounds include the moon's glow in each supplied composition.
  const moon = mobile ? {left:.66,right:.96,top:.055,bottom:.18} : {left:.70,right:.90,top:.04,bottom:.35};
  const scale = Math[layout.fit==='contain'?'min':'max'](layout.width/layout.naturalWidth,layout.height/layout.naturalHeight);
  const renderedWidth = layout.naturalWidth*scale;
  const renderedHeight = layout.naturalHeight*scale;
  const left = (layout.width-renderedWidth)/2;
  const top = layout.fit==='contain'?(layout.height-renderedHeight)*.3:0;
  if (mobile) {
    assert.equal(layout.fit,'contain','Mobile shows the complete meadow artwork');
    assert.ok(top+renderedHeight<=layout.height+1,'Flowers at the bottom are not cropped');
    assert.ok(top+renderedHeight*.85<Math.min(height,layout.height),'Flower bed is visible in the initial viewport');
  }
  assert.ok(left+moon.left*renderedWidth>=0 && left+moon.right*renderedWidth<=layout.width,'Full moon glow fits horizontally');
  assert.ok(top+moon.top*renderedHeight>=0 && top+moon.bottom*renderedHeight<=Math.min(height,layout.height),'Full moon glow fits vertically in the viewport');
  const disk = mobile ? {left:.74,right:.89,top:.087,bottom:.155} : {left:.755,right:.845,top:.12,bottom:.28};
  const picker = await page.locator('.sky-picker').boundingBox();
  assert.ok(left+disk.right*renderedWidth<=picker.x || left+disk.left*renderedWidth>=picker.x+picker.width || top+disk.bottom*renderedHeight<=picker.y || top+disk.top*renderedHeight>=picker.y+picker.height,'Sky picker does not obscure the moon');
  assert.equal(await page.locator('.hill').first().isVisible(),false);
  assert.equal(await page.evaluate(()=>document.getAnimations().some(a=>a.animationName==='sky-drift')),false);
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`screenshots/meadow-${width}x${height}.png`,fullPage:true});
}
(async () => {
  const browser = await chromium.launch({headless:true,channel:'msedge'});
  for (const [width,height] of [[1366,768],[1920,1080],[393,852],[375,667],[852,393]]) {
    const page = await browser.newPage({viewport:{width,height}});
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.goto((process.env.SKY_URL || 'http://127.0.0.1:4174/sky/index.html'));
    await checkMeadow(page,width,height);
    assert.equal(await page.locator('#welcome').isVisible(),true);
    for(const mode of ['purple','pink','clouds']) {
      await page.locator('#sky-mode').selectOption(mode);
      assert.equal(await page.locator('body').getAttribute('data-sky'),mode);
      assert.equal(await page.locator('.meadow-background').isVisible(),mode==='clouds');
      assert.equal(await page.evaluate(() => document.getAnimations().some(a=>a.animationName==='drift')),mode!=='clouds');
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
      if(i===3) {
        const video=page.locator('.tv video');
        assert.ok((await video.getAttribute('src')).endsWith('for-you-optimized.mp4'));
        await page.getByLabel('Playback speed').selectOption('2');
        assert.equal(await video.evaluate(el=>el.playbackRate),2);
        await video.evaluate(el=>el.play());
        await page.waitForFunction(()=>document.querySelector('.tv video').currentTime>0);
        const box=await page.getByLabel('Playback speed').boundingBox();
        assert.ok(box.x>=0 && box.x+box.width<=width);
      }
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
  const shapes = await browser.newPage();
  for(const [width,height] of [[360,640],[412,823],[360,1000],[2560,720],[700,900],[701,900]]) {
    await shapes.setViewportSize({width,height});
    await shapes.goto((process.env.SKY_URL || 'http://127.0.0.1:4174/sky/index.html'));
    await checkMeadow(shapes,width,height);
    console.log(`Passed background fit at ${width} × ${height}`);
  }
  await shapes.close();
  const quiet = await browser.newPage({reducedMotion:'reduce'});
  await quiet.goto((process.env.SKY_URL || 'http://127.0.0.1:4174/sky/index.html'));
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




