'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),F=require('./cell-archive-fixture.cjs');
(async()=>{
 const out=path.resolve('operations/evidence/current-state-interface-v1'),root=path.resolve('src'),checks=[],errors=[];await fs.mkdir(out,{recursive:true});const check=(ok,name)=>{assert(ok,name);checks.push(name);};
 const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser,success=false;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1050}});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  check(await page.evaluate(()=>__LIFE_TEST__.readConfig().currentStateModel===undefined),'ordinary default remains legacy');
  await page.selectOption('#cell-model-mode','cell');await page.selectOption('#cell-aquatic-profile','freshwater-comparison/1');
  check(await page.evaluate(()=>__LIFE_TEST__.readConfig().currentStateModel==='current-state/1'),'explicit cell setup selects current-state for a new world');
  await page.evaluate(config=>{__LIFE_TEST__.prepare({...config,currentStateModel:'current-state/1'});__LIFE_TEST__.stop();},F.config);
  const initial=await page.evaluate(()=>({snapshot:__LIFE_TEST__.snapshot(),schema:__LIFE_TEST__.observations().snapshot().schema}));check(initial.schema==='current-observation-snapshot/1'&&!initial.snapshot.faultKind,'native current world opens through ordinary UI');
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2);await page.click('#start');
  let state=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(!state.running&&!state.faultKind&&state.world.turn>=2,'actual Worker commits turns and pause works');
  const selected=await page.evaluate(()=>{const T=__LIFE_TEST__,w=T.snapshot().world,o=w.organisms.find(o=>o.slot==='main');T.select(o.cell,o.id);return {id:o.id,html:document.getElementById('selection').innerHTML};});
  check(await page.locator('[data-current-information-subject]').count()===1,'selected organism uses current initial-plus-change details');
  await page.screenshot({path:path.join(out,'current-map-detail.png')});
  await page.locator('[data-current-information-subject]').screenshot({path:path.join(out,'current-information-detail.png')});
  const detail=await page.locator('#selection').innerHTML();await page.click('#start');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,state.world.turn);await page.click('#start');
  check(await page.locator('#selection').innerHTML()===detail,'selected details stay at manually chosen instant during observation');
  state=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(!state.faultKind&&!state.running,'paused observation resumes and pauses again');
  const csv=await page.evaluate(async()=>{const h=__LIFE_TEST__.observations(),a=await EcoExport.csv(h),b=await EcoExport.csv(h,{workerFactory:()=>{throw Error('forced fallback');}});return {same:(await a.text())===(await b.text()),exact:(await a.text())===(await new Blob([h.csv()]).text()),rows:h.rows.length,last:h.rows.at(-1).turn};});check(csv.same&&csv.exact&&csv.rows===csv.last+1,'CSV Worker and fallback preserve identical complete native facts');
  const saved=await page.evaluate(async()=>{const T=__LIFE_TEST__;await T.finish('user-ended',{explicit:true});const header=T.records()[0],r=await T.archive().get(header.id);return {id:r.id,schema:r.schema,rows:r.observation.rows.length,turn:r.turn,header:!!header.observation};});check(saved.schema===4&&saved.rows===saved.turn+1&&!saved.header,'explicit finish saves schema4 with compact list header');
  await page.click('#open-results');await page.locator(`[data-analyze="${saved.id}"]`).click();await page.waitForSelector('#results-analysis:not([hidden])');
  for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations','biomass-pyramid','current-donut'])check(await page.locator('#results-analysis #'+id).isVisible(),'saved result displays '+id);
  await page.locator('#results-analysis').screenshot({path:path.join(out,'current-saved-analysis.png')});
  check(await page.locator('#results-error').textContent()==='','saved analysis has no read error');
  await page.click('#back-results');await page.locator(`[data-replay="${saved.id}"]`).click();await page.waitForFunction(()=>!document.getElementById('results').open);
  const replay=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(replay.replay&&replay.world.turn===0&&replay.world.config.currentStateModel==='current-state/1'&&await page.evaluate(()=>__LIFE_TEST__.records().length)===1,'replay uses original initial config and does not autosave');
  check(errors.length===0,'no uncaught browser error or native popup');success=true;
 }finally{await fs.writeFile(path.join(out,'report-browser.json'),JSON.stringify({success,checks,errors},null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));}
 console.log(JSON.stringify({success,checks,errors},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
