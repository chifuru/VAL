'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright'),{PNG}=require('pngjs'),E=require('../src/composite/creature-engine'),D=require('../src/composite/lineage-definitions'),L4=require('../src/composite/legacy-engine-v4'),config=require('../src/assets/creatures/config.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/desktop-motion'),checks=[];
async function main(){
 await fs.rm(out,{recursive:true,force:true});await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.VALIS_CHROMIUM||undefined}),page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const records=[];window.valis={testMode:true,listSpecimens:async()=>({records,warning:null}),saveSpecimen:async r=>{const i=records.findIndex(x=>x.runId===r.runId);if(i<0)records.push(r);else records[i]=r;return r;},onPrepareClose:()=>()=>{},closeReady:async()=>true};});
 const check=(v,name)=>{assert.ok(v,name);checks.push(name);};
 const call=(name,...args)=>page.evaluate(({name,args})=>window.__VALIS_TEST__[name](...args),{name,args});
 const frame=(s,o)=>page.evaluate(({s,o})=>{const T=window.__VALIS_TEST__,png=T.renderFrame(s,o);return{png,rig:T.motion(),roots:T.attachments(),sources:T.renderedSources()};},{s,o});
 try{
  await page.goto(process.env.VALIS_PREVIEW_URL||'http://127.0.0.1:8766/Index.html');try{await page.waitForFunction(()=>window.__VALIS_TEST__?.snapshot().ready);}catch(error){console.error('Startup diagnostics',JSON.stringify(await page.evaluate(()=>({notice:document.getElementById('notice')?.textContent,status:document.getElementById('session-status')?.textContent,engine:typeof window.CreatureEngine,renderer:typeof window.CreatureRenderer,bridge:typeof window.valis,files:window.VALIS_ASSETS?.files?.length}))),errors);throw error;}
  await call('load',927);const preview=await page.locator('#creature').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);check(preview===await page.locator('#creature').evaluate(c=>c.toDataURL()),'loaded preview remains still before explicit start');
  const examples={},rasters=new Map();for(let n=900;n<=1000;n++){const s=E.runAll(n);if(s.matured&&!examples[s.lineage])examples[s.lineage]=s;}
  for(const l of D.LINEAGES){
   const s=examples[l.id],original=JSON.stringify(s),stills=[];for(const time of [0,750])stills.push(await frame(s,{time,still:true,energyEvents:[{time:time-200,kind:'fizz'}]}));
   assert.equal(stills[0].png,stills[1].png,'still time/events ignored '+l.id);check(stills.every(f=>f.rig===null),'still mode has no motion rig '+l.id);
   let historical;for(let n=900;n<=1000;n++){const candidate=L4.runAll(n);if(candidate.matured&&candidate.lineage===l.id){historical=candidate;break;}}const oldFrame=await frame(historical,{still:true,time:0}),old=PNG.sync.read(await fs.readFile(path.join(root,'operations/evidence/morphology-polish/browser',l.id+'-final.png'))),png=PNG.sync.read(Buffer.from(oldFrame.png.split(',')[1],'base64'));assert.deepEqual(png.data,old.data,'prior4 revised static pixels '+l.id);checks.push('legacy4 revision2 pixels preserved '+l.id);
   const samples=[];
   for(const time of [0,240,720,1200]){
    const f=await frame(s,{time,still:false});samples.push(f);assert.equal(f.rig.mode,l.bodyPlan);
    const body=f.sources.find(p=>p.key==='eco-'+l.id+':body'),source=config.sprites[body.key][body.level-1];
    if(!rasters.has(source.file))rasters.set(source.file,PNG.sync.read(await fs.readFile(path.join(root,'src',source.file))));const raster=rasters.get(source.file);
    for(const link of f.roots){const [x,y]=link.source;assert.ok(raster.data[((source.region[1]+y)*raster.width+source.region[0]+x)*4+3]>=160,'root leaves tissue '+l.id);if(!link.orbit)assert.ok(f.sources.some(p=>p.key===link.key&&p.root&&Math.hypot(p.root[0]-link.point[0],p.root[1]-link.point[1])<.00001),'draw root differs from projected body '+link.key);}
    if(time===240||time===1200)await fs.writeFile(path.join(out,l.id+'-'+time+'.png'),Buffer.from(f.png.split(',')[1],'base64'));
   }
   check(new Set(samples.map(f=>f.png)).size===4,'four distinct living frames '+l.id);
   check(samples.some(f=>f.rig.offsets.some((v,i)=>Math.abs(v-samples[0].rig.offsets[i])>.1)),'body mesh moves independently of whole-canvas breathing '+l.id);
   check(samples.every(f=>f.sources.length===1&&f.roots.length===0),'connected anatomy moves as one mesh '+l.id);
   assert.deepEqual(await frame(s,{time:720,still:false}),samples[2]);check(JSON.stringify(s)===original,'animation leaves calculation state intact '+l.id);
  }
  const s=examples.jelly,plain=await frame(s,{time:1000,still:false}),fed=await frame(s,{time:1000,still:false,energyEvents:[{time:700,kind:'fizz'}]});check(fed.png!==plain.png&&fed.rig.pulse>.9&&fed.rig.events===1,'actual nutrient produces one body absorption response');
  for(const time of [1001,-1]){const f=await frame(s,{time:1000,still:false,energyEvents:[{time,kind:'fizz'}]});check(f.png===plain.png&&f.rig.pulse===0&&f.rig.events===0,'future or expired ingestion produces no ghost packet '+time);}
  await call('run',997,{instant:true});const saved=await call('snapshot');const live0=await page.locator('#creature').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);check(live0!==await page.locator('#creature').evaluate(c=>c.toDataURL()),'completed live creature continues biological movement');assert.deepEqual((await call('snapshot')).records,saved.records);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>window.__VALIS_TEST__.motion()===null);const still0=await page.locator('#creature').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);check(still0===await page.locator('#creature').evaluate(c=>c.toDataURL()),'OS motion preference freezes display without changing stored state');
  for(const kind of ['fizz','buzz','fizzbuzz']){const before=JSON.stringify(s),f=await frame(s,{time:1000,still:false,energyEvents:[{time:650,kind,sequence:600}]});check(f.png!==plain.png,'distinct ecological consumption frame '+kind);check(JSON.stringify(s)===before,'food animation never consumes extra rows '+kind);await fs.writeFile(path.join(out,'food-'+kind+'.png'),Buffer.from(f.png.split(',')[1],'base64'));}
  for(const [i,id]of ['tide','heat','signal','void'].entries()){const habitat=JSON.parse(JSON.stringify(s)),weights=[0,0,0,0];weights[i]=1;habitat.environmentPlan.weights=[weights,weights];const f=await frame(habitat,{still:true});await fs.writeFile(path.join(out,'habitat-'+id+'.png'),Buffer.from(f.png.split(',')[1],'base64'));check(f.sources.length===1,'habitat keeps coherent creature '+id);}
  await page.emulateMedia({reducedMotion:'no-preference'});await call('load',927);
  for(const id of ['jelly','serpent','myth']){
   const encoded=await page.evaluate(async state=>{
    const canvas=document.getElementById('creature'),stream=canvas.captureStream(12),recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:700000}),chunks=[];let raf;
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(resolve=>recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});
    const start=performance.now();function draw(now){window.__VALIS_TEST__.drawFrame(state,{time:now-start,still:false});raf=requestAnimationFrame(draw);}recorder.start(100);raf=requestAnimationFrame(draw);await new Promise(r=>setTimeout(r,3400));cancelAnimationFrame(raf);recorder.stop();stream.getTracks().forEach(t=>t.stop());return done;
   },examples[id]);const bytes=Buffer.from(encoded,'base64');check(bytes.length>5000,'recorded actual animated canvas '+id);await fs.writeFile(path.join(out,id+'.webm'),bytes);
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({scope:'Chromium motion and static preservation; state-driven rendering and actual canvas videos; not a user-hardware FPS benchmark',browser:browser.version(),generatedAt:new Date().toISOString(),checks,errors,lineages:20,staticPriorEdition:'legacy4/app1.3.1/appearanceRevision2/art-v4.1',samplesPerLineage:4,videos:['jelly','serpent','myth']},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors,videos:3}));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
