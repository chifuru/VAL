'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const file=process.argv[2];if(!file)throw Error('Pass retained terminal world.');const root=path.resolve('src'),out=path.resolve(process.argv[3]||'operations/evidence/cell-late-runtime-v1/render-before.json');let browser;
 const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),filePath=url.pathname==='/__terminal'?path.resolve(file):path.resolve(root,'.'+url.pathname);if(url.pathname!=='/__terminal'&&!filePath.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',url.pathname==='/__terminal'?'application/json':filePath.endsWith('.js')?'application/javascript':filePath.endsWith('.css')?'text/css':filePath.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(filePath));}catch{res.writeHead(404).end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});const errors=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1500,height:1050},bypassCSP:true});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');
  const report=await page.evaluate(async()=>{
   await EcoArt.ready;await document.fonts.ready;const terminal=await(await fetch('/__terminal')).json(),E=EcoObservationModel.model(terminal.config.advantageSettings),initial=E.create(terminal.config);
   const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;left:0;top:0;width:978px;height:431px;z-index:9999';document.body.append(canvas);const r=EcoRenderer.create(canvas);r.view.motion=false;r.view.effects=false;r.view.actionMarks=false;
   const results=[];for(const [name,w]of [['initial',initial],['terminal',terminal]]){
    const before=JSON.stringify(w);r.beginWorld(name);const t=performance.now();r.setWorld(w);const setWorldMs=performance.now()-t;
    for(const mode of ['far','near']){
     if(mode==='far')r.fit();else{const o=w.organisms.find(o=>o.slot==='main');r.focus(o.cell,o.id);}
     const cold=performance.now();r.draw();const firstDrawMs=performance.now()-cold,start=performance.now();
     while((!r.prepared||r.diagnostics.terrainPending)&&performance.now()-start<30000){await new Promise(resolve=>setTimeout(resolve,30));r.draw();}
     if(!r.prepared||r.diagnostics.terrainPending)throw Error('Terrain not ready');const frames=[];for(let i=0;i<3;i++){const t=performance.now();r.draw();frames.push(performance.now()-t);}
     results.push({name,mode,turn:w.turn,organisms:w.organisms.length,corpses:w.carcasses.length,setWorldMs,firstDrawMs,framesMs:frames,meanDrawMs:frames.reduce((a,b)=>a+b)/frames.length,drawn:r.diagnostics.drawn,drawnCarcasses:r.diagnostics.carcasses,actualMode:r.diagnostics.mode,terrainPending:!!r.diagnostics.terrainPending});
    }if(JSON.stringify(w)!==before)throw Error('Renderer mutated world');
   }return {scope:'Direct renderer, real T0/T500 states, same 978x431 viewport. Three warm forced draws per view; no graph history, transfer, simulation, motion or action effects are timed.',results,worldsUnchanged:true};
  });assert.equal(errors.length,0);report.errors=errors;report.success=true;await fs.writeFile(out,JSON.stringify(report,null,2)+'\n');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
