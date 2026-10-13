#!/usr/bin/env node
'use strict';
// D1.3.2/D1.3.3 real Chromium smoke. CI screenshots are evidence of execution,
// not an automatic certification of source-mock fidelity or GAS deployment.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require('playwright');

const root=path.resolve(__dirname,'..');
const out=path.join(root,'artifacts/stage5');
fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.join(root,'src/Index.html')).href;
const lineages=['abyss','myth','recursive','sail','gravity','crystal','manyeyes','abyssshell','parallel','memory','serpent','solar','antimeme','valis'];
const report={scope:'file:// Chromium preview, NOT actual GAS service',commit:process.env.GITHUB_SHA||'local',node:process.version,
 checks:[],lineages:[],errors:[],screenshots:[],generatedAt:new Date().toISOString()};
const check=(name,details)=>{report.checks.push({name,status:'PASS',details});console.log('PASS: '+name+(details?' — '+details:''));};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');

async function ready(page){
 await page.goto(url,{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>document.querySelectorAll('#guideSwitch [data-guide]').length===14&&document.querySelectorAll('#evolutionHistory .phase-card').length===4,null,{timeout:60000});
}
async function canvasHash(page){
 return sha(await page.locator('#creatureCanvas').evaluate(el=>el.toDataURL('image/png')));
}
async function tier(page,n){
 await page.locator('#levelPicker').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},n);
}
async function main(){
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  report.browserVersion=browser.version();
  const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await desktop.newPage();
  page.on('pageerror',e=>report.errors.push('desktop: '+e.message));
  await ready(page);
  // Test the actual 68 packed images, then 36 SVG candidates as rendered by Chromium.
  const decoded=await page.evaluate(async()=>{
   const C=window.ASSET_CONFIG;
   const paths=[...Object.values(C.core),...Object.values(C.partImages).flat(),...Object.values(C.lineageImages).flat(),...C.references.map(r=>r.file)];
   const uris=paths.map(p=>(C.sources&&C.sources[p])||p);
   return await Promise.all(uris.map(async(uri,i)=>{
    try{const im=new Image();im.src=uri;await im.decode();return {index:i,ok:im.naturalWidth>0&&im.naturalHeight>0};}
    catch(err){return {index:i,ok:false,message:String(err)};}
   }));
  });
  assert.equal(decoded.length,104);
  assert.deepEqual(decoded.filter(x=>!x.ok),[],'Chromium image decoding failed');
  check('68 packed PNG/WebP/JPEG + 36 draft SVG actual decode','104 / 104');

  for(const id of lineages){
   await page.locator('#guideSwitch [data-guide="'+id+'"]').click();
   assert.equal(await page.locator('#guideSwitch [data-guide="'+id+'"]').getAttribute('aria-pressed'),'true');
   await tier(page,0);
   const level0=await canvasHash(page);
   await tier(page,3);
   const level3=await canvasHash(page);
   assert.notEqual(level0,level3,'no visible Lv0 -> Lv3 Canvas change: '+id);
   report.lineages.push({id,lv0:level0,lv3:level3,distinct:true});
  }
  check('14 lineage codex interactions + Lv0/Lv3 actual Canvas changes','14 / 14');

  await page.locator('#guideSwitch [data-guide="valis"]').click();
  await tier(page,3);
  await page.screenshot({path:path.join(out,'desktop-valis-lv3.png'),fullPage:true});
  report.screenshots.push('desktop-valis-lv3.png');
  await page.locator('#guideSwitch [data-guide="abyss"]').click();
  await page.screenshot({path:path.join(out,'desktop-abyss-draft-lv3.png'),fullPage:true});
  report.screenshots.push('desktop-abyss-draft-lv3.png');

  await page.locator('#showLiveBtn').click();
  await page.locator('#seedInput').fill('15');
  await page.locator('#runButton').click();
  await page.locator('#skipButton').click();
  const fifteen=(await page.locator('#fizzbuzzLog').inputValue()).split('\n');
  assert.equal(fifteen.length,15);
  assert.equal(fifteen[14],'FizzBuzz');
  await page.locator('#seedInput').fill('1000');
  await page.locator('#runButton').click();
  await page.locator('#skipButton').click();
  const thousand=(await page.locator('#fizzbuzzLog').inputValue()).split('\n');
  assert.equal(thousand.length,1000);
  assert.equal(thousand[999],'Buzz');
  assert.match(await page.locator('#maturityStatus').textContent(),/完全成熟/);
  check('local preview: server-independent N=15/1000, skip, complete maturation','1000/1000 records');

  await page.evaluate(()=>{
   window.google={script:{run:{
    withSuccessHandler(fn){this.success=fn;return this;},
    withFailureHandler(fn){this.failure=fn;return this;},
    calculateFizzBuzz(){this.success(['invalid response']);}
   }}};
  });
  await page.locator('#seedInput').fill('15');
  await page.locator('#runButton').click();
  assert.match(await page.locator('#notice').textContent(),/サーバー応答の形式が一致しません/);
  assert.equal(await page.locator('#fizzbuzzLog').inputValue(),'');
  check('mock GAS invalid response is rejected without local fallback');

  const mobile=await browser.newContext({viewport:{width:420,height:860},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:true,hasTouch:true});
  const mp=await mobile.newPage();
  mp.on('pageerror',e=>report.errors.push('mobile: '+e.message));
  await ready(mp);
  const dims=await mp.evaluate(()=>({window:innerWidth,scroll:document.documentElement.scrollWidth,canvas:document.querySelector('#creatureCanvas').getBoundingClientRect().width}));
  assert.ok(dims.scroll<=dims.window+2,'420px horizontal overflow: '+JSON.stringify(dims));
  assert.ok(dims.canvas>150&&dims.canvas<=dims.window+2,'mobile canvas out of bounds');
  await mp.locator('#guideSwitch [data-guide="antimeme"]').click();
  await tier(mp,3);
  await mp.screenshot({path:path.join(out,'mobile-antimeme-lv3.png'),fullPage:true});
  report.screenshots.push('mobile-antimeme-lv3.png');
  await mp.locator('#showLiveBtn').click();
  await mp.locator('#seedInput').fill('15');
  await mp.locator('#runButton').click();
  await mp.locator('#skipButton').click();
  assert.equal((await mp.locator('#fizzbuzzLog').inputValue()).split('\n').length,15);
  check('420px mobile layout, guided preview and playback',JSON.stringify(dims));
  assert.deepEqual(report.errors,[],'browser uncaught exceptions');
  check('uncaught page errors','0');
 }catch(err){
  report.failed={message:err.message,stack:err.stack};
  throw err;
 }finally{
  if(browser)await browser.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
}
main().catch(err=>{console.error(err);process.exitCode=1;});
