'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),F=require('./cell-archive-fixture.cjs');
(async()=>{
 const out=path.resolve('operations/evidence/cell-archive-v1'),root=path.resolve('src'),checks=[],errors=[];await fs.mkdir(out,{recursive:true});
 const check=(value,name)=>{assert(value,name);checks.push(name);};
 const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser,success=false;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1050}});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  const saved=await page.evaluate(async config=>{
   const T=__LIFE_TEST__;T.prepare(config);T.stop();const active=JSON.stringify(T.snapshot().world),E=EcoObservationModel.model(config.advantageSettings),w=E.create(T.snapshot().world.config),h=EcoObservations.create(w.config,EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);
   for(let t=0;t<2;t++){w.turn++;const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.cellLife(w,c);E.finish(w,c);h.append(w);}
   const archive=T.archive();await archive.ready;const record=archive.capture(w,'bounded-cell-ui',h.snapshot()),ok=await archive.save(record),header=archive.list()[0],body=await archive.get(record.id);
   window.__CELL_RECORD__=structuredClone(body);
   return {ok,id:record.id,header,turn:body.turn,definition:body.final.state.definition,rows:body.observation.rows.length,profile:body.final.state.cell.profiles.version,unchanged:JSON.stringify(T.snapshot().world)===active,fp:body.finalFingerprint};
  },F.config);
  check(saved.ok&&saved.definition==='cell-ecosystem-terminal/1'&&saved.rows===3,'IndexedDB persists a real cell result with all three aggregate rows');
  check(!saved.header.observation&&!saved.header.final.state&&!saved.header.config.generationResolved&&saved.header.config.cellModel==='cell-reorganization/1','list header excludes full rows, stocks and generation body');
  check(saved.unchanged,'saving a separate result does not mutate the active world');
  const dbEdit=async(value)=>page.evaluate(async({id,value})=>{const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('lifegame.results.v2',1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});try{await new Promise((resolve,reject)=>{const t=db.transaction('records','readwrite');t.objectStore('records').put(value);t.oncomplete=resolve;t.onabort=()=>reject(t.error);});}finally{db.close();}}, {id:saved.id,value});
  await page.click('#open-results');await page.locator(`[data-analyze="${saved.id}"]`).click();await page.waitForSelector('#results-analysis:not([hidden])');
  check(await page.locator('#results-error').textContent()==='','new saved result opens without a legacy colony-definition error');
  for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations','biomass-pyramid','current-donut'])check(await page.locator('#results-analysis #'+id).isVisible(),'saved analysis displays '+id);
  const values=JSON.parse(await page.locator('#result-final-values').textContent());check(values.final.state.cell.profiles.version==='cell-reorganization/1'&&values.final.state.examples.consumerGroups.items[0].cellLife.version==='cell-life/1','final details retain actual cell environment and cohort life');
  await page.locator('#results-analysis').screenshot({path:path.join(out,'saved-result.png')});
  await page.click('#back-results');await page.locator(`[data-replay="${saved.id}"]`).click();await page.waitForFunction(()=>!document.getElementById('results').open);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().replay&&__LIFE_TEST__.snapshot().world.turn===0&&__LIFE_TEST__.records().length===1),'replay recreates initial conditions without automatic saving');
  const rejected=await page.evaluate(()=>{const T=__LIFE_TEST__,before=JSON.stringify(T.snapshot().world),bad=structuredClone(__CELL_RECORD__);bad.final.state.cell.profiles.profiles[0].temperature++;let refused=false;try{T.prepare(bad.config,bad);}catch{refused=true;}return refused&&JSON.stringify(T.snapshot().world)===before;});check(rejected,'mismatched initial environment cannot replace the live world');
  const before=await page.evaluate(()=>JSON.stringify(__LIFE_TEST__.snapshot().world)),bad=await page.evaluate(()=>{const b=structuredClone(__CELL_RECORD__);b.final.state.cell.state.water.pop();return b;});await dbEdit(bad);
  check(await page.evaluate(async id=>{try{await __LIFE_TEST__.archive().get(id);return false;}catch{return true;}},saved.id),'corrupt cell stock rejects body read');
  check(await page.evaluate(()=>JSON.stringify(__LIFE_TEST__.snapshot().world))===before,'failed record read preserves active world');await dbEdit(await page.evaluate(()=>__CELL_RECORD__));
  check(await page.evaluate(async id=>(await __LIFE_TEST__.archive().get(id)).final.state.cell.profiles.version==='cell-reorganization/1',saved.id),'restoring the original body permits a read without replacing headers');
  const child=await page.evaluate(async()=>{await __LIFE_TEST__.finish('user-ended',{explicit:true});const rows=__LIFE_TEST__.records();return {count:rows.length,child:rows.find(r=>r.originRecordId),parent:rows.find(r=>r.id===__CELL_RECORD__.id)};});
  check(child.count===2&&child.child?.id!==saved.id&&child.child?.originRecordId===saved.id&&child.child.turn===0&&child.parent.turn===2,'explicit partial replay save creates a separate child and preserves parent');
  check(errors.length===0,'no uncaught browser errors or native popups');success=true;
 }finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify({success,checks,errors},null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
