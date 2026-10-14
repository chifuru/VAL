const fs=require('node:fs'),crypto=require('node:crypto');
const {chromium}=require('/workspace/val-setup/fizzbuzz/node_modules/playwright');
const html=fs.readFileSync('/workspace/VAL/gas-fizzbuzz-webapp/src/Index.html','utf8');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
(async()=>{
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8766/Index.html');
await page.waitForFunction(()=>document.querySelectorAll('#guideSwitch .guide-thumbnail').length===14&&[...document.querySelectorAll('#guideSwitch .guide-thumbnail')].every(x=>x.complete&&x.naturalWidth));
await page.locator('#showLiveBtn').click();
const read=()=>page.evaluate(()=>({input:document.querySelector('#seedInput').value,id:document.querySelector('#creatureId').textContent,run:document.querySelector('#runCount').textContent,mode:document.querySelector('#specimenMode').textContent,notice:document.querySelector('#notice').textContent,log:document.querySelector('#fizzbuzzLog').value,canvas:document.querySelector('#creatureCanvas').toDataURL()}));
const baseline=await read();await page.locator('#seedInput').fill('481');const changed=await read();
const noPreview={beforeId:baseline.id,afterInput:changed.input,afterId:changed.id,sameCanvas:baseline.canvas===changed.canvas};
await page.evaluate(()=>Math.random=()=>.001);await page.locator('#randomButton').click();const random=await read();
const randomMismatch={input:random.input,id:random.id,run:random.run};
await page.locator('#seedInput').fill('1000');await page.locator('#runButton').click();
await page.waitForTimeout(120);const reduced=await read();
const lowMotion={mode:reduced.mode,run:reduced.run,rows:reduced.log?reduced.log.split('\n').length:0};
await page.locator('#skipButton').click();const completed=await read();
const finish={mode:completed.mode,notice:completed.notice,logVisible:await page.locator('#fizzbuzzLog').isVisible(),resultModeElements:await page.locator('[id*=result],[id*=Result]').count(),bodyData:await page.locator('body').getAttribute('data-mode')};
await page.locator('#seedInput').fill('1001');await page.locator('#resetButton').click();const reset=await read();
const resetInvalid={errors:errors.slice(),input:reset.input,run:reset.run,mode:reset.mode,notice:reset.notice};
// Expose the exact current closure for controlled-state render comparisons.
const p2=await context.newPage();
await p2.route('**/Index.html',route=>route.fulfill({contentType:'text/html',body:html.replace('setup();\n})();','window.__audit={paintSpecimen,selected,hash:()=>canvas.toDataURL()};\nsetup();\n})();')}));
await p2.goto('http://127.0.0.1:8766/Index.html');
await p2.waitForFunction(()=>window.__audit&&document.querySelectorAll('#guideSwitch .guide-thumbnail').length===14&&[...document.querySelectorAll('#guideSwitch .guide-thumbnail')].every(x=>x.complete&&x.naturalWidth));
const renderComparison=await p2.evaluate(async()=>{
 const E=window.CreatureEngine,A=window.__audit,C=window.ASSET_CONFIG;
 const g=document.querySelector('#creatureCanvas').getContext('2d');
 const paint=model=>{g.clearRect(0,0,1024,680);A.paintSpecimen(model,0,true,true);return A.hash();};
 const model=E.initial(480);model.stage=1;model.lineage='myth';model.partXp={'myth:mythHeritage':7};
 const model2={...model,points:24,foods:{number:1,fizz:30,buzz:0,fizzbuzz:0}};
 const model3={...model,points:0,foods:{number:1,fizz:0,buzz:30,fizzbuzz:0}};
 const fizz=paint(model2);
 const buzz=paint(model3);
 const model4={...model3,stage:2};const phase3=paint(model4);
 let state=E.initial(480);let before=null;
 for(const line of E.linesFor(480)){
  before=state;state=E.step(state,line,E.plannedEnvironment(state,state.stage===0?'valis':'antimeme'));
  if(state.stage===2)break;
 }
 const heritage=state.heritage[0];
 let rendered=[];const draw=g.drawImage;
 g.drawImage=function(image,...args){rendered.push(image.src);return draw.call(this,image,...args);};
 A.paintSpecimen(state,0,true,true);g.drawImage=draw;
 const detail=heritage.parts.map(part=>({id:part.id,level:part.level,drawn:rendered.includes(C.sources[C.partImages[part.lineage+':'+part.id][part.level-1]])}));
 const hash=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 return {sameFoodColorAndVolume:fizz===buzz,samePhaseSilhouette:buzz===phase3,renderHashes:{fizz30_P24:await hash(fizz),buzz30_P0:await hash(buzz),buzz30_P0_stage2:await hash(phase3)},heritageCount:heritage.parts.length,heritageDrawn:detail,history:state.history};
});
await browser.close();
const result={noPreview,randomMismatch,lowMotion,finish,resetInvalid,renderComparison};
fs.writeFileSync('/tmp/valis-requirements-audit.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
