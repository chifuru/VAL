'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright'),{PNG}=require('pngjs'),E=require('../src/composite/creature-engine'),D=require('../src/composite/lineage-definitions'),config=require('../src/assets/creatures/config.json');
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
  await page.goto(process.env.VALIS_PREVIEW_URL||'http://127.0.0.1:8766/Index.html');await page.waitForFunction(()=>window.__VALIS_TEST__?.snapshot().ready);
  await call('load',927);const preview=await page.locator('#creature').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);check(preview===await page.locator('#creature').evaluate(c=>c.toDataURL()),'loaded preview remains still before explicit start');
  const examples={},rasters=new Map();for(let n=900;n<=1000;n++){const s=E.runAll(n);if(s.matured&&!examples[s.lineage])examples[s.lineage]=s;}
  for(const l of D.LINEAGES){
   const s=examples[l.id],original=JSON.stringify(s),stills=[];for(const time of [0,750])stills.push(await frame(s,{time,still:true,energyEvents:[{time:time-200,kind:'fizz'}]}));
   assert.equal(stills[0].png,stills[1].png,'still time/events ignored '+l.id);check(stills.every(f=>f.rig===null),'still mode has no motion rig '+l.id);
   const png=PNG.sync.read(Buffer.from(stills[0].png.split(',')[1],'base64')),old=PNG.sync.read(await fs.readFile(path.join(root,'operations/evidence/morphology-polish/browser',l.id+'-final.png')));assert.deepEqual(png.data,old.data,'prior static pixels '+l.id);checks.push('prior static portrait pixels preserved '+l.id);
   const samples=[];
   for(const time of [0,240,720,1200]){
    const f=await frame(s,{time,still:false});samples.push(f);assert.equal(f.rig.mode,l.bodyPlan);
    const body=f.sources.find(p=>p.key==='bio-'+l.bodyPlan+':body'),source=config.sprites[body.key][3];
    if(!rasters.has(source.file))rasters.set(source.file,PNG.sync.read(await fs.readFile(path.join(root,'src',source.file))));const raster=rasters.get(source.file);
    for(const link of f.roots){const [x,y]=link.source;assert.ok(raster.data[((source.region[1]+y)*raster.width+source.region[0]+x)*4+3]>=160,'root leaves tissue '+l.id);if(!link.orbit)assert.ok(f.sources.some(p=>p.key===link.key&&p.root&&Math.hypot(p.root[0]-link.point[0],p.root[1]-link.point[1])<.00001),'draw root differs from projected body '+link.key);}
    const image=PNG.sync.read(Buffer.from(f.png.split(',')[1],'base64'));let clipped=0;for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){if(x>3&&x<image.width-4&&y>3&&y<image.height-4)continue;const i=(y*image.width+x)*4;if(image.data[i]+image.data[i+1]+image.data[i+2]>350)clipped++;}assert.equal(clipped,0,'animated clipping '+l.id+' at '+time);
    if(time===240||time===1200)await fs.writeFile(path.join(out,l.id+'-'+time+'.png'),Buffer.from(f.png.split(',')[1],'base64'));
   }
   check(new Set(samples.map(f=>f.png)).size===4,'four distinct living frames '+l.id);
   check(samples.some(f=>f.rig.offsets.some((v,i)=>Math.abs(v-samples[0].rig.offsets[i])>.1)),'body mesh moves independently of whole-canvas breathing '+l.id);
   check(samples.some(f=>f.roots.some((p,i)=>Math.hypot(p.point[0]-samples[0].roots[i].point[0],p.point[1]-samples[0].roots[i].point[1])>.1)),'organ roots follow moving body '+l.id);
   assert.deepEqual(await frame(s,{time:720,still:false}),samples[2]);check(JSON.stringify(s)===original,'animation leaves calculation state intact '+l.id);
  }
  const s=examples.jelly,plain=await frame(s,{time:1000,still:false}),fed=await frame(s,{time:1000,still:false,energyEvents:[{time:700,kind:'fizz'}]});check(fed.png!==plain.png&&fed.rig.pulse>.9&&fed.rig.events===1,'actual nutrient produces one body absorption response');
  for(const time of [1001,300]){const f=await frame(s,{time:1000,still:false,energyEvents:[{time,kind:'fizz'}]});check(f.png===plain.png&&f.rig.pulse===0&&f.rig.events===0,'future or expired ingestion produces no ghost packet '+time);}
  await call('run',997,{reduced:true});const saved=await call('snapshot');await page.locator('#reduced').uncheck();const live0=await page.locator('#creature').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);check(live0!==await page.locator('#creature').evaluate(c=>c.toDataURL()),'completed live creature continues biological movement');assert.deepEqual((await call('snapshot')).records,saved.records);
  await page.locator('#reduced').check();const still0=await page.locator('#creature').evaluate(c=>c.toDataURL());await page.waitForTimeout(250);check(still0===await page.locator('#creature').evaluate(c=>c.toDataURL()),'enabling low motion immediately freezes the observed creature');
  await call('load',927);
  for(const id of ['jelly','serpent','myth']){
   const encoded=await page.evaluate(async state=>{
    const canvas=document.getElementById('creature'),stream=canvas.captureStream(12),recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:700000}),chunks=[];let raf;
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(resolve=>recorder.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(chunks,{type:'video/webm'}));});
    const start=performance.now();function draw(now){window.__VALIS_TEST__.drawFrame(state,{time:now-start,still:false});raf=requestAnimationFrame(draw);}recorder.start(100);raf=requestAnimationFrame(draw);await new Promise(r=>setTimeout(r,3400));cancelAnimationFrame(raf);recorder.stop();stream.getTracks().forEach(t=>t.stop());return done;
   },examples[id]);const bytes=Buffer.from(encoded,'base64');check(bytes.length>5000,'recorded actual animated canvas '+id);await fs.writeFile(path.join(out,id+'.webm'),bytes);
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({scope:'Chromium motion and static preservation; state-driven rendering and actual canvas videos; not a user-hardware FPS benchmark',browser:browser.version(),generatedAt:new Date().toISOString(),checks,errors,lineages:20,staticPriorEdition:'app1.3.1/appearanceRevision2/art-v4.1',samplesPerLineage:4,videos:['jelly','serpent','myth']},null,2)+'\n');console.log(JSON.stringify({passed:checks.length,errors,videos:3}));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
