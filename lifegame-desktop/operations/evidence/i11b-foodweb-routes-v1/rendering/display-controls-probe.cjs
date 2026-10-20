'use strict';
const fs=require('node:fs/promises'),cp=require('node:child_process'),path=require('node:path'),http=require('node:http'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve('src'),out=path.resolve('operations/evidence/i11b-foodweb-routes-v1/rendering'),index=await fs.readFile(path.join(root,'Index.html'),'utf8'),scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]),at=scripts.indexOf('ecology/renderer.js'),old=cp.execFileSync('git',['show','1b248aa:lifegame-desktop/src/ecology/renderer.js'],{encoding:'utf8'});
 const server=http.createServer(async(req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/fixture.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><body style="margin:0"><canvas id="board" style="display:block;width:980px;height:720px"></canvas>'+scripts.slice(0,at).map(s=>'<script src="'+s+'"></script>').join('')+'<script src="'+(u.searchParams.get('version')==='old'?'/old-renderer.js':'ecology/renderer.js')+'"></script>');}if(u.pathname==='/old-renderer.js'){res.setHeader('Content-Type','application/javascript');return res.end(old);}if(u.pathname==='/favicon.ico')return res.writeHead(204).end();try{const f=path.resolve(root,'.'+u.pathname);res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const rows=[];
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  for(const version of ['old','current']){
   const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:'+server.address().port+'/fixture.html?version='+version);await page.evaluate(()=>EcoArt.ready);
   rows.push({version,...await page.evaluate(async()=>{
    const E=EcoEngine,r=EcoRenderer.create(document.querySelector('#board')),w=E.create({seed:'i09/display-controls',width:40,height:28,initial:80,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1'}),o=w.organisms.find(a=>a.slot==='main'),target=w.organisms.find(a=>a.slot==='main'&&a.id!==o.id);
    o.age=0;o.birthLife=300;target.cell=o.cell+1;target.age=290;target.birthLife=300;w.organisms=[o,target];w.resources=[];w.carcasses=[];w.searchQ=[];w.turn=10;
    w.events=[{id:o.id,cell:o.cell,type:'move',from:o.cell-1,to:o.cell},{id:o.id,cell:o.cell,type:'attack',target:target.id,to:target.cell,actualDamage:2,mitigated:1}];
    const t0=performance.now();r.setWorld(w,true);const setDone=performance.now();r.focus(o.cell,o.id);r.view.animate=true;r.view.duration=1000000;r.view.selected=o.cell;r.view.selectedEntity=o.id;r.view.motion=false;r.view.effects=false;r.view.actionMarks=true;const focusDone=performance.now();r.draw();const drawDone=performance.now();
    const natural={setMs:setDone-t0,focusMs:focusDone-setDone,drawMs:drawDone-focusDone,elapsedMs:drawDone-t0,received:r.diagnostics.actionReceivedTotal,receiptKeys:r.diagnostics.actionReceiptKeys,marks:r.diagnostics.actionMarks,drawn:r.diagnostics.drawn,screen:r.screen(o.cell,o.id),assetLoaded:EcoArt.loaded,terrainPending:r.diagnostics.terrainPending};
    r.beginWorld('delayed');r.setWorld(w,true);const beforeDelay=performance.now();await new Promise(resolve=>setTimeout(resolve,900));r.draw();const delayed={elapsedMs:performance.now()-beforeDelay,received:r.diagnostics.actionReceivedTotal,marks:r.diagnostics.actionMarks.length,drawn:r.diagnostics.drawn};
    const descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now()+10000;Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});let frozen;
    try{r.beginWorld('frozen');r.setWorld(w,true);r.draw();frozen={received:r.diagnostics.actionReceivedTotal,marks:r.diagnostics.actionMarks.length,drawn:r.diagnostics.drawn};}finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;}
    return{species:o.species,natural,delayed,frozen};
   }),errors});await page.close();
  }
  await fs.writeFile(path.join(out,'display-controls-probe.json'),JSON.stringify({baseline:'1b248aa',rows,scope:'Existing display-control fixture, old/current renderer only, same current frozen generated model/art; sequential pages in one browser. Natural timing is diagnostic,900ms deliberate wall-clock delay is not a product performance sample.'},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
