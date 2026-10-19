'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),zlib=require('node:zlib');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/rendered-circulation');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src'),checks=[],errors=[];const check=(v,n)=>{assert(v,n);checks.push(n);};
 const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__AUDIT_R__=renderer;').replace('window.__LIFE_TEST__ = {',`window.__AUDIT_PROGRESS__=()=>({turn:world.turn,running,pending:pendingTurn&&{phase:pendingTurn.phase,events:[...(pendingTurn.previewTypes||[])]},cadenceMs:TURN_MS,frames:renderer.diagnostics.frames,drawn:renderer.diagnostics.drawn,mode:renderer.diagnostics.mode,main:world.stats.main,counts:world.stats.counts,compute:{buffered:compute.length,ready:compute.ready,busy:compute.busy,preparationMs:lastPreparationMs},lastMs,rows:observations.rows.length,summaryTurn:document.getElementById('current-summary').dataset.turn,status:document.getElementById('status').textContent});window.__LIFE_TEST__ = {`));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('native '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  await page.evaluate(()=>{const w=__LIFE_TEST__.prepare({seed:'dense-render-24',width:80,height:56,initial:320,lineages:'few',mapId:'river'});__LIFE_TEST__.stop();const mains=w.organisms.filter(o=>o.slot==='main'),score=o=>mains.filter(a=>Math.abs(a.cell%80-o.cell%80)<=3&&Math.abs(Math.floor(a.cell/80)-Math.floor(o.cell/80))<=3).length;window.__DENSE_FOCUS__=mains.sort((a,b)=>score(b)-score(a))[0].cell;});
  await page.click('#focus-view');const density=[];
  for(const mode of ['far','near','separated','near-symbols']){
   if(mode==='far')await page.click('#fit');
   if(mode==='near'){await page.click('#detail-view');await page.evaluate(()=>__AUDIT_R__.focus(__DENSE_FOCUS__));}
   if(mode==='separated')await page.check('#plane-separation');
   if(mode==='near-symbols')await page.check('#simplified');
   await page.waitForTimeout(200);
   const row=await page.evaluate(()=>{const t=__LIFE_TEST__,r=__AUDIT_R__,fp=t.fingerprint(),times=[];r.draw();for(let i=0;i<8;i++){const at=performance.now();r.draw();times.push(performance.now()-at);}times.sort((a,b)=>a-b);const d={...r.diagnostics};return {world:t.snapshot().world.organisms.length,draw:d,medianMs:(times[3]+times[4])/2,maxMs:times[7],readOnly:fp===t.fingerprint(),scale:r.view.scale};});row.mode=mode;density.push(row);await fs.writeFile(path.join(out,'density.json'),JSON.stringify(density,null,2)+'\n');check(row.readOnly,'read-only dense '+mode);if(mode==='far')check(row.draw.drawn===row.world,'dense overview retains every organism');await page.screenshot({path:path.join(out,'dense-'+mode+'.png')});
  }
  if(process.env.LIFEGAME_DENSITY_ONLY==='1'){console.log(JSON.stringify({densityOnly:true,checks}));return;}
  await page.uncheck('#simplified');await page.uncheck('#plane-separation');
  const reference=require('../operations/evidence/circulation-audit-v4.2.19/off.json');await page.evaluate(config=>__LIFE_TEST__.prepare(config),reference.config);await page.click('#fit');
  const started=Date.now();await page.click('#start');const samples=[];let lastReport=-1,nextView=100;
  while(true){
   await page.waitForTimeout(1000);
   const s=await page.evaluate(()=>{const t=__LIFE_TEST__,s=__AUDIT_PROGRESS__();return s;});
   s.elapsedMs=Date.now()-started;samples.push(s);
   if(Math.floor(s.turn/25)>lastReport){lastReport=Math.floor(s.turn/25);console.log(JSON.stringify({turn:s.turn,main:s.main,mode:s.mode,elapsedMs:s.elapsedMs,rows:s.rows,status:s.status}));await fs.writeFile(path.join(out,'progress.json'),JSON.stringify(s,null,2)+'\n');await fs.writeFile(path.join(out,'timeline.json'),JSON.stringify(samples,null,2)+'\n');}
   if(s.turn>=nextView && nextView<500){
    if(nextView===100)await page.click('#detail-view');
    if(nextView===200)await page.check('#plane-separation');
    if(nextView===300)await page.check('#simplified');
    if(nextView===400){await page.uncheck('#simplified');await page.uncheck('#plane-separation');await page.click('#fit');}
    await page.screenshot({path:path.join(out,'live-'+nextView+'.png')});nextView+=100;
   }
   if(s.turn===500&&!s.pending)break;
   if(!s.running && !s.pending)throw Error('unexpected stop at '+s.turn+' '+s.status);
   if(Date.now()-started>1000000)throw Error('500T exceeded audit timeout');
  }
  const final=await page.evaluate(()=>{const t=__LIFE_TEST__,s=t.snapshot(),h=t.observations().snapshot();return {stats:s.world.stats,fingerprint:t.fingerprint(),history:h,frames:s.render.frames,turn:s.world.turn,running:s.running,pending:s.pending,summaryTurn:document.getElementById('current-summary').dataset.turn};});
  check(final.turn===500&&!final.running&&!final.pending,'normal playback stops at the 500T checkpoint');check(final.history.rows.length===501&&final.history.rows.every((r,i)=>r.turn===i),'all 501 committed turns retained without gaps');check(final.summaryTurn==='500','unified current summary reaches final turn');check(JSON.stringify(final.stats)===JSON.stringify(reference.final),'rendered Worker final statistics match independent 500T audit');check(final.fingerprint===reference.fingerprint,'rendered Worker final fingerprint matches independent audit');
  await fs.writeFile(path.join(out,'history.json.gz'),zlib.gzipSync(JSON.stringify(final.history)));await page.screenshot({path:path.join(out,'final-500.png')});await page.evaluate(()=>__LIFE_TEST__.finish());
  const records=await page.evaluate(()=>__LIFE_TEST__.records());const record=records.find(r=>r.turn===500);check(!!record,'500T result saved through IndexedDB');await page.click('#open-results');await page.locator(`[data-analyze="${record.id}"]`).click();await page.waitForSelector('#results-analysis:not([hidden])');check(await page.locator('#current-summary').getAttribute('data-turn')==='500','saved analysis displays final summary');
  const download=page.waitForEvent('download');await page.click('#export-record');const file=await download;await file.saveAs(path.join(out,'saved-result.json'));const saved=JSON.parse(await fs.readFile(path.join(out,'saved-result.json'),'utf8'));check(JSON.stringify(saved.observation.rows)===JSON.stringify(final.history.rows),'saved all-period observations round-trip unchanged');await page.screenshot({path:path.join(out,'saved-analysis.png')});await fs.writeFile(path.join(out,'saved-result.json.gz'),zlib.gzipSync(JSON.stringify(saved)));await fs.unlink(path.join(out,'saved-result.json'));
  await page.click('#close-results');check(await page.locator('#current-summary').getAttribute('data-turn')==='500','closing saved analysis restores live final summary');check(errors.length===0,'no browser errors or native dialogs');
  delete final.history;await fs.writeFile(path.join(out,'report.json'),JSON.stringify({version:require('../package.json').version,checks,errors,density,final,elapsedMs:Date.now()-started,samples,scope:'one river seed, normal 1000ms/turn Worker playback, Linux Chromium; no all-seed balance or Windows certification'},null,2)+'\n');console.log(JSON.stringify({completed:true,checks:checks.length,elapsedMs:Date.now()-started}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
