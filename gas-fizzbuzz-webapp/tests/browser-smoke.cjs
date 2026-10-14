'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright'),E=require('../src/composite/creature-engine'),D=require('../src/composite/lineage-definitions');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/desktop-browser'),checks=[];
async function main(){
 await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({executablePath:process.env.VALIS_CHROMIUM||undefined});
 const context=await browser.newContext({viewport:{width:1440,height:960}});const page=await context.newPage(),errors=[],remote=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1')&&!r.url().startsWith('data:'))remote.push(r.url());});
 await context.addInitScript(()=>{window.valis={testMode:true,listSpecimens:async()=>({records:JSON.parse(localStorage.getItem('records')||'[]').sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||b.runId.localeCompare(a.runId)),warning:null}),saveSpecimen:async r=>{const list=JSON.parse(localStorage.getItem('records')||'[]'),i=list.findIndex(x=>x.runId===r.runId);if(i<0)list.push(r);else list[i]=r;localStorage.setItem('records',JSON.stringify(list));return r;},onPrepareClose:()=>()=>{},closeReady:async()=>true};});
 try{
 await page.goto(process.env.VALIS_PREVIEW_URL||'http://127.0.0.1:8766/Index.html');await page.waitForFunction(()=>window.__VALIS_TEST__?.snapshot().ready);
 const call=(method,...args)=>page.evaluate(({method,args})=>window.__VALIS_TEST__[method](...args),{method,args});
 const snapshot=()=>call('snapshot'),check=(condition,name)=>{assert.ok(condition,name);checks.push(name);};
  check((await snapshot()).records.length===0,'preview creates no specimen');
  const before=await call('renderHash');await call('reset',83);const after=await call('renderHash');check(before!==after,'input DNA visibly changes initial anatomy');
  await page.locator('#random').click();await page.waitForFunction(()=>document.getElementById('seed').value==String(window.__VALIS_TEST__.snapshot().state.seed));check((await snapshot()).records.length===0,'random preview keeps N and DNA synchronized without birth');
  await call('run',15,{env:'signal',reduced:false});await call('pause');const paused=await snapshot();await page.waitForTimeout(240);assert.deepEqual((await snapshot()).state,paused.state);checks.push('pause prevents ingestion');
  await call('pause');await page.waitForFunction(()=>window.__VALIS_TEST__.snapshot().runStatus==='complete',{},{timeout:15000});let s=await snapshot();assert.deepEqual(s.state,E.runAll(15,()=> 'signal'));check(s.log===E.linesFor(15).join('\n'),'normal playback keeps original FizzBuzz rows and exact growth');
  const recordId=s.records[0].runId;await call('run',15,{env:'signal',reduced:true});s=await snapshot();check(s.records.length===2&&s.records[0].runId!==recordId,'same N gets separate real run IDs');assert.deepEqual(s.state,E.runAll(15,()=> 'signal'));checks.push('reduced motion equals normal ending');
  await call('run',1000,{env:'signal',reduced:false});await call('skip');s=await snapshot();assert.deepEqual(s.state,E.runAll(1000,()=> 'signal'));check(s.state.points===100&&s.state.matured&&s.log.split('\n').length===1000,'skip reaches maturity at row1000 without truncating log');
  check(s.records.find(r=>r.runId===s.activeRun.runId).snapshots.length===3,'phase cards contain only actual reached states');
  await page.screenshot({path:path.join(out,'observation-mature.png'),fullPage:true});
  const live=await snapshot();await call('selectRecord',recordId);await call('setEnvironment','heat');const viewed=await snapshot();assert.deepEqual(viewed.state,live.state);check(viewed.log===live.log&&viewed.environment===live.environment&&await page.locator('#past-banner').isVisible(),'past record viewing preserves live genome, environment and original log');
  await page.screenshot({path:path.join(out,'past-record.png'),fullPage:true});await call('backToLive');
  const preserved=await snapshot();for(const bad of ['',0,1001,1.5,'NaN']){await assert.rejects(()=>call('reset',bad));assert.deepEqual((await snapshot()).state,preserved.state);}checks.push('invalid resets reject before mutating live individual');
  await call('run',1000,{env:'tide',reduced:false});await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__VALIS_TEST__.snapshot().runStatus==='complete',{},{timeout:15000});await call('persist');check((await snapshot()).state.current===1000,'dynamic OS reduced motion completes current run');await page.emulateMedia({reducedMotion:'no-preference'});
  const expectedRecords=(await snapshot()).records;await page.reload();await page.waitForFunction(()=>window.__VALIS_TEST__?.snapshot().ready);assert.deepEqual((await snapshot()).records,expectedRecords);checks.push('UI restores persisted real records without making preview record');
  check(await page.locator('#records .record').count()===expectedRecords.length,'record panel contains precisely actual runs');check(await page.locator('input[type=range]').count()===0,'no sample level slider or species demonstration controls');
  const hashes=[];
  for(const lineage of D.LINEAGES){
   const states=[];let state=E.initial(1000);for(let i=1;i<=1000;i++){state=E.step(state,E.fmtFizzBuzz(i),E.plannedEnvironment(state,lineage.id));if([0,279,280,620,621,1000].includes(i))states.push(state);}assert.equal(state.lineage,lineage.id);
   const rendered=await page.evaluate(s=>({png:window.__VALIS_TEST__.renderState(s),keys:window.__VALIS_TEST__.renderedKeys()}),state),png=rendered.png;hashes.push(png);await fs.writeFile(path.join(out,lineage.id+'-mature.png'),Buffer.from(png.split(',')[1],'base64'));
   const keys=rendered.keys;for(const part of E.appearanceFor(state).organs.filter(p=>p.level))check(keys.includes(lineage.id+':'+part.id),lineage.id+' renders acquired '+part.id);
   for(const part of E.appearanceFor(state).inheritedOrgans.filter(p=>p.level))assert.ok(keys.includes(part.lineage+':'+part.id),'lost inherited '+part.id);
  }
  check(new Set(hashes).size===14,'all fourteen branches produce distinct actual full-body images');check((await call('missingAssets')).length===0,'every required body and acquired organ resolves locally');
  await page.setViewportSize({width:760,height:620});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'minimum window width has no horizontal clipping');await page.screenshot({path:path.join(out,'minimum-window.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);checks.push('no browser exceptions or external image/network dependencies');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({platform:process.platform,browser:browser.version(),scope:'Chromium UI with injected test persistence; native persistence tested separately',generatedAt:new Date().toISOString(),checks,errors,remote},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,checks},null,2));
 }catch(error){console.error('UI FAILURE',await page.locator('#notice').textContent(),await page.evaluate(()=>{const s=window.__VALIS_TEST__?.snapshot();return s?{status:s.runStatus,current:s.state.current,records:s.records.length}:null;}));throw error;}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
