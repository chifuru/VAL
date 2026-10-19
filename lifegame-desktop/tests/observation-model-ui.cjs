'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/observation-model-v4.2');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);

  check(await page.locator('#advantage-settings input:checked').count()===3,'default all three advantages ON in free settings');
  await page.uncheck('#advantage-waterbug');await page.click('#load');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world);
  check(await page.evaluate(()=>EcoData.species.every(s=>{
    const c=document.createElement('canvas');c.width=c.height=48;const g=c.getContext('2d');
    if(!EcoRenderer.symbol(g,s.id,24,24,16,EcoRenderer.symbolColor(s)))return false;
    return g.getImageData(0,0,48,48).data.some((n,i)=>i%4===3&&n>0);
  })),'all thirty-one species including searching Q have visible board and legend symbols');
  const flags=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.advantageSettings);
  check(flags.producer&&!flags.waterbug&&flags.hyperparasite,'form records independently selected flags');
  check((await page.locator('#active-mode').textContent()).includes('水游虫OFF'),'active observation names the disabled advantage');
  await page.screenshot({path:path.join(out,'observation.png')});
  const workerChecks=await page.evaluate(async(config)=>{
    const checks=[];
    for(let mask=0;mask<8;mask++){
      const flags={producer:!!(mask&1),waterbug:!!(mask&2),hyperparasite:!!(mask&4)},E=EcoObservationModel.model(flags),w=E.create(config);
      let expected=w,received=structuredClone(w),turns=0;
      const worker=new Worker('ecology/compute-worker.js');
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(Error('Worker timeout '+mask)),30000);
        worker.onerror=e=>{clearTimeout(timeout);reject(Error(e.message));};
        worker.onmessage=({data:d})=>{try{
          if(d.type==='error')throw Error(d.message);
          if(d.type==='ready')worker.postMessage({type:'compute',epoch:mask,count:2,limit:2});
          if(d.type==='turn'){
            for(const patch of d.patches)received=EcoTransport.apply(received,patch);
            expected=E.step(expected);if(E.fingerprint(expected)!==E.fingerprint(received))throw Error('Worker model mismatch '+mask);
            if(E.invariants(received).length)throw Error('Worker invariant '+mask);turns++;
          }
          if(d.type==='idle'){if(turns!==2)throw Error('Missing turns');clearTimeout(timeout);resolve();}
        }catch(e){clearTimeout(timeout);reject(e);}};
        worker.postMessage({type:'init',epoch:mask,world:w,observeId:null});
      }).finally(()=>worker.terminate());
      checks.push({mask,turns,match:true});
    }
    return checks;
  },require('../operations/evidence/free-support-v2.8/river-off.json').config);
  check(workerChecks.length===8,'real Worker matches synchronous production engine for all eight combinations, two turns each');
  const replay=await page.evaluate(async()=>{
    __LIFE_TEST__.step();__LIFE_TEST__.step();__LIFE_TEST__.step();const hash=__LIFE_TEST__.fingerprint();await __LIFE_TEST__.finish();
    const record=__LIFE_TEST__.records()[0],count=__LIFE_TEST__.records().length;__LIFE_TEST__.replay(record.id);
    const flags=__LIFE_TEST__.snapshot().world.config.advantageSettings;
    for(let i=0;i<record.turn;i++)__LIFE_TEST__.step();await __LIFE_TEST__.finish();
    return{match:hash===__LIFE_TEST__.fingerprint(),unchanged:count===__LIFE_TEST__.records().length,flags};
  });
  check(replay.match&&replay.unchanged&&!replay.flags.waterbug&&replay.flags.producer&&replay.flags.hyperparasite,'saved replay retains flags and final state without automatic duplicate record');
  await page.click('#change-world');
  check(!await page.locator('#advantage-waterbug').isChecked(),'return to initial settings preserves selected OFF');
  await page.screenshot({path:path.join(out,'settings.png')});
  check(errors.length===0,'no browser errors or native dialogs');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,workerChecks,replay},null,2));console.log(JSON.stringify({checks,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
