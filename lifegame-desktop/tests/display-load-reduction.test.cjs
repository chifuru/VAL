'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');

test('real renderer keeps display controls independent, preserves detailed bodies and does not mutate the world',async()=>{
  const root=path.resolve(__dirname,'../src'),index=await fs.readFile(path.join(root,'Index.html'),'utf8');
  const scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  const rendererAt=scripts.indexOf('ecology/renderer.js');assert(rendererAt>=0);
  const document='<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="board" style="display:block;width:980px;height:720px"></canvas>'+scripts.slice(0,rendererAt+1).map(src=>'<script src="'+src+'"></script>').join('');
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end(document);return;}
    try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    browser=await require('playwright').chromium.launch({headless:true,...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:'+server.address().port+'/fixture.html');await page.evaluate(()=>EcoArt.ready);
    const result=await page.evaluate(async()=>{
      const E=EcoEngine,S=EcoState,r=EcoRenderer.create(document.querySelector('#board')),
        w=E.create({seed:'i09/display-controls',width:40,height:28,initial:80,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1'});
      const o=w.organisms.find(a=>a.slot==='main'),target=w.organisms.find(a=>a.slot==='main'&&a.id!==o.id);
      o.age=0;o.birthLife=300;target.cell=o.cell+1;target.age=290;target.birthLife=300;
      w.organisms=[o,target];w.resources=[];w.carcasses=[];w.searchQ=[];w.turn=10;
      w.events=[{id:o.id,cell:o.cell,type:'move',from:o.cell-1,to:o.cell},{id:o.id,cell:o.cell,type:'attack',target:target.id,to:target.cell,actualDamage:2,mitigated:1}];
      // This test compares controls in one display frame, not cold asset latency
      // against the independent850ms mark lifetime. Its TTL boundary is covered
      // by action-mark-receipts; keep this frame's clock deterministic.
      const nowDescriptor=Object.getOwnPropertyDescriptor(performance,'now');let clock=performance.now();
      Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});
      try{
      const before=JSON.stringify(w),fingerprint=E.fingerprint(w);r.setWorld(w,true);r.focus(o.cell,o.id);r.view.animate=true;r.view.duration=1000000;r.view.selected=o.cell;r.view.selectedEntity=o.id;
      const read=()=>{r.draw();return structuredClone(r.diagnostics);};
      r.view.motion=false;r.view.effects=false;r.view.actionMarks=true;const marks=read();
      r.view.actionMarks=false;const none=read();
      r.view.effects=true;const effects=read();
      r.view.effects=false;r.view.ageEmphasis=false;r.view.statusMarks=true;const ageOff=read();
      r.view.ageEmphasis=true;const ageOn=read();
      r.view.statusMarks=false;const noStatus=read();
      r.view.simplified=true;const simpleAge=read();r.view.simplified=false;
      r.view.ageEmphasis=false;r.fit();const farOff=read();r.view.ageEmphasis=true;const farOn=read();
      r.view.grid=true;const grid=read();r.view.grid=false;const noGrid=read();
      r.focus(o.cell,o.id);r.view.interactionSimplify=false;r.interact(true);const normalDrag=read();
      r.view.interactionSimplify=true;const reducedDrag=read();
      r.interact(false);clock+=210;const released=read();
      r.view.interactionSimplify=false;const restored=read();
      return {marks,none,effects,ageOff,ageOn,noStatus,simpleAge,farOff,farOn,grid,noGrid,normalDrag,reducedDrag,released,restored,unchanged:before===JSON.stringify(w)&&fingerprint===E.fingerprint(w),assets:EcoArt.errors};
      }finally{if(nowDescriptor)Object.defineProperty(performance,'now',nowDescriptor);else delete performance.now;}
    });
    assert(result.marks.actionMarks.length>0);assert.equal(result.marks.mode,'detail');assert.equal(result.marks.motionActors,0);assert.deepEqual(result.marks.motionKinds,{});
    assert.equal(result.none.actionMarks.length,0);assert.equal(result.none.drawn,result.marks.drawn);
    assert(result.effects.motionKinds.attack>0);assert(result.effects.motionKinds.hit>0);assert(result.effects.motionKinds.block>0);assert.equal(result.effects.actionMarks.length,0);
    assert.equal(result.ageOff.ageMarkers,0);assert.equal(result.ageOn.ageMarkers,2);assert(result.ageOn.statusBadges>0);assert.equal(result.noStatus.ageMarkers,2);assert.equal(result.simpleAge.ageMarkers,2);
    assert.equal(result.farOff.ageMarkers,0);assert.equal(result.farOn.ageMarkers,2);assert(result.grid.gridCells>0);assert.equal(result.noGrid.gridCells,0);
    assert.equal(result.normalDrag.backgroundSimplified,false);assert.equal(result.reducedDrag.backgroundSimplified,true);assert.equal(result.reducedDrag.mode,'detail');assert.equal(result.released.backgroundSimplified,false);assert.equal(result.restored.mode,'detail');
    assert(result.unchanged);assert.deepEqual(errors,[]);assert.deepEqual(result.assets,[]);
  }finally{await browser?.close();await new Promise(r=>server.close(r));}
});
