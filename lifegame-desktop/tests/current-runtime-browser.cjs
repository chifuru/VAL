'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve('src'),out=path.resolve(process.argv[2]||'operations/evidence/current-state-runtime-v1'),temp=path.resolve(process.argv[3]||'/tmp/current-runtime'),app=await fs.readFile('src/app.js','utf8'),graphSource=app.slice(app.indexOf('  function stackShape('),app.indexOf('  function renderCurrentSummary(')),errors=[];
 const server=http.createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname,fixture={'/__initial':path.join(temp,'initial.json'),'/__terminal':path.join(temp,'terminal.json'),'/__observations':path.join(temp,'observations.json')},file=fixture[name]||path.resolve(root,'.'+name);if(!fixture[name]&&!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',fixture[name]?'application/json':file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1050},bypassCSP:true});page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');
  const report=await page.evaluate(async graphSource=>{
   await EcoArt.ready;await document.fonts.ready;const [initial,terminal,snapshot]=await Promise.all(['/__initial','/__terminal','/__observations'].map(u=>fetch(u).then(r=>r.json())));EcoEngine.activate(terminal.config);
   const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;left:0;top:0;width:978px;height:431px;z-index:9999';document.body.append(canvas);const r=EcoRenderer.create(canvas);r.view.motion=false;r.view.effects=false;r.view.actionMarks=false;
   const median=xs=>xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)],renders=[];
   for(const [name,w]of [['initial',initial],['terminal',terminal]]){const before=JSON.stringify(w),start=performance.now();r.beginWorld(name);r.setWorld(w);const setWorldMs=performance.now()-start;
    for(const mode of ['far','near']){
     if(mode==='far')r.fit();else{const o=w.organisms.find(o=>o.slot==='main')||w.organisms[0];r.focus(o.cell,o.id);}
     const t=performance.now();r.draw();const firstDrawMs=performance.now()-t,deadline=performance.now()+30000;
     while((!r.prepared||r.diagnostics.terrainPending)&&performance.now()<deadline){await new Promise(resolve=>setTimeout(resolve,30));r.draw();}
     if(!r.prepared||r.diagnostics.terrainPending)throw Error('Terrain not ready');const frames=[];for(let n=0;n<3;n++){const at=performance.now();r.draw();frames.push(performance.now()-at);}
     renders.push({name,mode,turn:w.turn,organisms:w.organisms.length,carcasses:w.carcasses.length,setWorldMs,firstDrawMs,framesMs:frames,medianDrawMs:median(frames),drawn:r.diagnostics.drawn,drawnCarcasses:r.diagnostics.carcasses,actualMode:r.diagnostics.mode});
    }if(JSON.stringify(w)!==before)throw Error('Renderer mutated world');
   }
   const t=performance.now(),history=EcoObservations.restore(snapshot),restoreMs=performance.now()-t;let rows=history.rows;const graphObservation=()=>({rows}),stackPaintCache=new WeakMap(),relationPaintCache=new WeakMap();eval(graphSource+';window.__currentStack=paintStack;window.__currentRelations=relationShape');
   const graph=document.createElement('canvas');graph.style.cssText='position:fixed;left:1000px;top:0;width:320px;height:120px';document.body.append(graph);const graphs=[];
   for(const target of ['all','main'])for(const axis of ['population','phases','sex','ages']){const at=performance.now(),series=history.series(target,axis),seriesMs=performance.now()-at,frames=[];window.__currentStack(graph,series,(_k,i)=>`hsl(${i*31} 65% 65%)`);for(let n=0;n<3;n++){const t=performance.now();window.__currentStack(graph,series,(_k,i)=>`hsl(${i*31} 65% 65%)`);frames.push(performance.now()-t);}graphs.push({target,axis,rows:series.length,throughTurn:series.at(-1).turn,seriesMs,framesMs:frames,medianDrawMs:median(frames)});}
   const at=performance.now(),relations=window.__currentRelations(rows),relationSeriesMs=performance.now()-at;
   return {signature:EcoReplayVersion,fixtureSignature:snapshot.metadata.signature,turn:terminal.turn,renders,graphs,restoreMs,relationSeriesMs,relationPoints:relations.values.map(a=>a.length),worldsUnchanged:true,scope:'Actual retained natural current-state worlds and native full-turn rows. 978x431 renderer, three warm forced draws per view. 320x120 graph using unmodified app functions. Excludes full app DOM/layout, SVG path painting, Worker dispatch and biology. Fixture-only CSP bypass; product CSP unchanged.'};
  },graphSource);assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'browser.json'),JSON.stringify({...report,success:true,errors},null,2)+'\n');console.log(JSON.stringify({success:true,turn:report.turn,renders:report.renders.map(r=>({mode:r.mode,name:r.name,medianMs:r.medianDrawMs})),restoreMs:report.restoreMs}));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
