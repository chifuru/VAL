'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),F=require('./cell-archive-fixture.cjs');
(async()=>{
 const root=path.resolve('src'),errors=[],scripts=['hash','map-data','map-templates','landscape','observation-modules','observation-model','replay-version','current-observations','current-archive','cell-archive','archive'];
 const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/backend.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Current backend checks</title>'+scripts.map(x=>'<script src="/ecology/'+x+'.js"></script>').join(''));}const p=path.resolve(root,'.'+pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type','application/javascript');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
 await new Promise((res,rej)=>{server.once('error',rej);server.listen(0,'127.0.0.1',res);});let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/backend.html');
  const result=await page.evaluate(async config=>{
   const E=EcoObservationModel.model(config.advantageSettings),O=EcoCurrentObservations,checks=[],check=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};let w=E.create({...config,currentStateModel:'current-state/1'});const h=O.create(w.config,{signature:EcoReplayVersion,species:E.S.activeSpecies(w)});h.append(w);for(let n=0;n<2;n++){w=E.step(w);h.append(w);}
   const store={getItem:()=>null,setItem:()=>{throw Error('unexpected legacy storage write');}},name='lifegame-current-backend-check',a=EcoArchive.persistent(store,E,EcoReplayVersion,{name});await a.ready;const r=a.capture(w,'backend-check',h.snapshot());check(await a.save(r),'IndexedDB native record save');
   const header=a.list()[0];check(header.schema===4&&header.observation===undefined&&header.final.state===undefined&&header.config.generationResolved===undefined,'compact header excludes history and final state');
   const b=EcoArchive.persistent(store,E,EcoReplayVersion,{name});await b.ready;const loaded=await b.get(r.id);check(loaded.integrity===r.integrity&&loaded.observation.rows.length===3,'reload reads and validates native body');
   const replay=await b.replay(r.id);let again=E.create(replay.config);for(let n=0;n<replay.turn;n++)again=E.step(again);check(E.fingerprint(again)===r.finalFingerprint&&b.list().length===1,'replay from initial conditions never autosaves');
   const db=await new Promise((resolve,reject)=>{const q=indexedDB.open(name,1);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});const write=(store,value)=>new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
   const bad=structuredClone(header);bad.final.counts.solar++;await write('headers',bad);const c=EcoArchive.persistent(store,E,EcoReplayVersion,{name});await c.ready;let refused=false;try{await c.get(r.id);}catch{refused=true;}check(refused,'header/body mismatch is rejected');
   await write('headers',header);await c.retry();const restored=await c.get(r.id);check(JSON.stringify(restored)===JSON.stringify(r),'failed read leaves body unchanged');db.close();
   return {success:true,checks,turns:w.turn,rows:loaded.observation.rows.length,headerCharacters:JSON.stringify(header).length,bodyCharacters:JSON.stringify(r).length};
  },F.config);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({...result,pageErrors:errors},null,2));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
