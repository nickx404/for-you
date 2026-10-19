const {createRequire}=require('node:module');
const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
for(const width of [393,1366]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.SKY_URL||'http://127.0.0.1:4185/sky/index.html');
 await page.locator('#start').click();
 const stars=page.locator('.star');assert.equal(await stars.count(),8);
 for(let index=0;index<8;index++){
  for(let j=0;j<8;j++)assert.equal(await stars.nth(j).isEnabled(),j<=index,`Star ${j+1} availability before ${index+1}`);
  assert.equal(await page.locator('.star.current').getAttribute('data-index'),String(index));
  if(index<7){await stars.nth(index+1).dispatchEvent('click');assert.equal(await page.locator('#card').isVisible(),false,'Cannot bypass the order');}
  await stars.nth(index).click();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#counter').textContent(),`${index+1} of 8 stars discovered`);
  if(index>0){await stars.first().click();await page.keyboard.press('Escape');assert.equal(await page.locator('#counter').textContent(),`${index+1} of 8 stars discovered`,'Reopening does not change progress');}
 }
 assert.equal(await page.locator('.star:disabled').count(),0);
 await page.locator('#next').waitFor();
 for(let j=7;j>=0;j--){await stars.nth(j).click();await page.keyboard.press('Escape');}
 assert.equal(await page.locator('#counter').textContent(),'8 of 8 stars discovered');
 assert.equal(await page.locator('#next').isEnabled(),true);
 assert.deepEqual(errors,[]);console.log(`Ordered unlock and unrestricted revisits passed at ${width}px`);await page.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
