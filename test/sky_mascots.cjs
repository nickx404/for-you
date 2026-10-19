const {createRequire}=require('node:module');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
const url=process.env.SKY_URL || 'http://127.0.0.1:4173/sky/index.html';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const [width,height] of [[1366,768],[393,852],[375,667],[852,393]]){
const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(url);
await page.locator('.sky-guides img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
assert.ok(await page.evaluate(()=>document.querySelector('.welcome').getBoundingClientRect().bottom<document.querySelector('.guide-speech').getBoundingClientRect().top),'Welcome clears mascot dialogue');
await page.screenshot({path:`screenshots/mascots-welcome-${width}.png`});
await page.locator('#start').click();
assert.equal(await page.getByText('Otter, to Bunny',{exact:true}).count(),0);
assert.ok(await page.locator('.sky-guides').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.left+r.width/2-innerWidth/2)<1;}),'Mascots are centered');
assert.ok(await page.evaluate(()=>{const a=document.querySelector('.guide-otter').getBoundingClientRect(),b=document.querySelector('.guide-bunny').getBoundingClientRect();return b.left-a.right>25;}),'Mascots have a visible gap');
assert.ok(await page.evaluate(()=>{const a=document.querySelector('.star[data-index="4"]').getBoundingClientRect(),b=document.querySelector('#counter').getBoundingClientRect();return a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom;}),'Bottom star clears the counter');
assert.match(await page.locator('#guide-line').textContent(),/Pick a star/);
const overlap=await page.evaluate(()=>{const a=document.querySelector('.sky-guides').getBoundingClientRect(),b=document.querySelector('.progress').getBoundingClientRect(),c=document.querySelector('#constellation').getBoundingClientRect();return {progress:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,constellation:a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top};});
assert.deepEqual(overlap,{progress:false,constellation:false},`Guides clear the controls at ${width}`);
await page.screenshot({path:`screenshots/mascots-explore-${width}.png`});
for(let i=0;i<8;i++){await page.locator('.star').nth(i).click();assert.equal(await page.locator('#card .mascot-conversation img').count(),2);if(i===0)await page.screenshot({path:`screenshots/mascots-card-${width}.png`});await page.keyboard.press('Escape');}
await page.locator('#next').waitFor();
assert.ok(await page.evaluate(()=>{const p=document.querySelector('.progress').getBoundingClientRect(),speech=document.querySelector('.guide-speech').getBoundingClientRect(),stars=document.querySelector('#constellation').getBoundingClientRect();return Math.abs(p.left+p.width/2-innerWidth/2)<1&&p.top>stars.bottom&&p.bottom+8<speech.top;}),'Completed progress is centered below the stars and clears dialogue');
await page.screenshot({path:`screenshots/centered-progress-${width}.png`});
await page.locator('#next').click();assert.equal(await page.locator('.question-mascots').isVisible(),true);
assert.ok(await page.locator('#finale').evaluate(el=>el.scrollWidth<=el.clientWidth));
await page.screenshot({path:`screenshots/mascots-question-${width}.png`});
await page.locator('#answer-yes').click();assert.equal(await page.locator('#celebration').isVisible(),true);assert.deepEqual(errors,[]);console.log(`Mascot flow passed ${width}x${height}`);await page.close();
}
const page=await browser.newPage({viewport:{width:1366,height:768}});await page.goto(url);
for(const [selector,count] of [['.tiny-comet',5],['.pixel-butterfly',6],['.meadow-breeze',3],['.falling-petal',12],['.dust',170]]) assert.equal(await page.locator(selector).count(),count);
assert.equal(await page.locator('.tiny-comet').first().evaluate(el=>getComputedStyle(el).animationName),'comet-pass');
assert.ok(await page.locator('#stardust').isVisible());
assert.equal(await page.locator('.dust').first().evaluate(el=>getComputedStyle(el).animationName),'sky-twinkle');
assert.ok(await page.locator('.tiny-comet').first().evaluate(el=>getComputedStyle(el,'::before').boxShadow.split('rgba').length>1||getComputedStyle(el,'::before').boxShadow.includes(',')));
await page.screenshot({path:'screenshots/living-sky-motion.png'});
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.tiny-comet').first().isVisible(),false);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
