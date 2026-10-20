'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');

test('confirmed action receipts survive refresh, phase commit and pause rollback with bounded memory',async()=>{
  const root=path.resolve(__dirname,'../src'),out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/action-mark-receipts');
  await fs.mkdir(out,{recursive:true});
  const index=await fs.readFile(path.join(root,'Index.html'),'utf8'),scripts=[...index.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]),rendererAt=scripts.indexOf('ecology/renderer.js');
  assert(rendererAt>=0);
  const fixture='<!doctype html><meta charset="utf-8"><body style="margin:0;background:#07171f"><canvas id="board" style="display:block;width:980px;height:720px"></canvas>'+scripts.slice(0,rendererAt+1).map(src=>'<script src="'+src+'"></script>').join('');
  const server=http.createServer(async(req,res)=>{
    if(req.url==='/fixture.html'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}
    try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':'text/html');let content=await fs.readFile(file);if(file===path.join(root,'app.js'))content=Buffer.from(content.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__MARK_RENDERER__=renderer;'));res.end(content);}catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser,result,passed=false;const errors=[],checks=[];
  try{
    browser=await require('playwright').chromium.launch({headless:true,...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));
    const url='http://127.0.0.1:'+server.address().port;
    await page.goto(url+'/fixture.html');await page.evaluate(()=>EcoArt.ready);
    result=await page.evaluate(async()=>{
      const checks=[],images={},check=(v,n)=>{if(!v)throw Error(n);checks.push(n);},E=EcoEngine,S=EcoState,r=EcoRenderer.create(document.querySelector('#board')),
        w=E.create({seed:'i10/action-receipts',width:40,height:28,initial:24,lineages:'few',ageModel:'life/1',ecologyRevision:'observation/4.1'}),o=w.organisms.find(a=>a.slot==='main'),t=w.organisms.find(a=>a.slot==='main'&&a.id!==o.id);
      t.cell=o.cell+1;w.organisms=[o,t];w.resources=[];w.carcasses=[];w.searchQ=[];w.turn=10;
      const attack={id:o.id,cell:o.cell,type:'attack',target:t.id,to:t.cell,actualDamage:2,mitigated:1},defend={id:o.id,cell:o.cell,type:'defend'},graze={id:o.id,cell:o.cell,type:'feed',source:t.id,sourceType:'plant',tag:'plant'};
      r.beginWorld('first');r.setWorld(w);r.focus(o.cell,o.id);r.draw();for(let attempt=0;attempt<500&&!r.prepared;attempt++){await new Promise(resolve=>setTimeout(resolve,30));r.draw();}check(r.prepared,'detailed terrain and original artwork finish preparing before evidence capture '+JSON.stringify({pending:r.diagnostics.terrainPending,overview:r.diagnostics.overviewBuildMs,near:r.diagnostics.terrainBuildMs,requests:r.diagnostics.terrainRequests,fallback:r.diagnostics.terrainFallback}));
      w.events=[attack,defend,graze];const initial=JSON.stringify(w),fingerprint=E.fingerprint(w),descriptor=Object.getOwnPropertyDescriptor(performance,'now');let clock=100000;
      Object.defineProperty(performance,'now',{configurable:true,value:()=>clock});
      const settle=(world,restart=false)=>{r.setWorld(world,restart);r.view.animate=true;r.view.duration=100000;r.view.motion=false;r.view.effects=false;r.view.actionMarks=true;r.view.selected=o.cell;r.view.selectedEntity=o.id;r.focus(o.cell,o.id);r.draw();return structuredClone(r.diagnostics);},read=()=>{r.draw();return structuredClone(r.diagnostics);};
      try{
        r.beginWorld('first');let d=settle(w,true);check(d.actionMarks.length===3&&new Set(d.actionMarks.map(m=>m.kind)).size===3,'one actor keeps distinct attack defense and grazing marks in the same turn');check(d.actionReceivedTotal===3,'only three distinct received events are counted');images['marks-received.png']=document.querySelector('#board').toDataURL();
        clock+=851;d=read();check(d.actionMarks.length===0,'static marks expire after850ms');images['marks-expired.png']=document.querySelector('#board').toDataURL();
        d=settle(structuredClone(w),true);check(d.actionMarks.length===0&&d.actionReceivedTotal===3,'cloned same-turn refresh and restartMotion never replay expired marks');
        const phase3={...w,events:[{id:o.id,cell:o.cell,type:'birth'},{id:o.id,cell:o.cell,type:'growth'}]};d=settle(phase3,true);check(d.actionMarks.length===2&&d.actionReceivedTotal===5,'later same-turn growth and birth phase adds only its new confirmed actions');
        d=settle({...w,events:[...w.events,...phase3.events]});check(d.actionMarks.length===2&&d.actionReceivedTotal===5,'final full-event commit does not replay the earlier action phase');
        r.view.actionMarks=false;d=read();check(d.actionMarks.length===0&&d.drawn===2,'mark OFF keeps both detailed organisms');r.view.actionMarks=true;d=read();check(d.actionMarks.length===2,'mark ON inside the original lifetime keeps remaining confirmed marks');
        clock+=851;r.view.actionMarks=false;read();r.view.actionMarks=true;d=settle({...w,events:[...w.events,...phase3.events]});check(d.actionMarks.length===0&&d.actionReceivedTotal===5,'display OFF and ON never renews a completed event lifetime');
        const next={...w,turn:11,events:[attack]};d=settle(next,true);check(d.actionMarks.length===1&&d.actionReceivedTotal===6,'same actor and action receives a new mark on the next turn');
        d=settle({...w,turn:10,events:[...w.events,...phase3.events]});check(d.actionMarks.length===0,'pause rollback removes the future preview mark immediately');
        clock+=900;d=settle(next,true);check(d.actionMarks.length===0&&d.actionReceivedTotal===6,'resuming the same preview after rollback never replays its accepted action');
        const continued={...next,events:[attack,{id:o.id,cell:o.cell,type:'growth'}]};d=settle(continued,true);check(d.actionMarks.length===1&&d.actionMarks[0].kind==='growth','unseen later phase after rollback is still accepted');
        r.view.effects=true;d=read();check(d.motionKinds.attack===1&&d.motionKinds.hit===1&&d.motionKinds.block===1,'short attack hit and block effects remain independent of static receipt suppression');r.view.effects=false;
        r.beginWorld('first');d=settle(next);check(d.actionMarks.length===1&&d.actionReceivedTotal===7,'repeating the same generation token does not reset receipts');
        r.beginWorld('second');d=settle(w,true);check(d.actionMarks.length===3&&d.actionReceivedTotal===3,'new explicit generation reaccepts events even with identical seed config and turn');images['marks-new-generation.png']=document.querySelector('#board').toDataURL();
        clock+=900;d=settle({...w,config:{...w.config,seed:'i10/different-world'}});check(d.actionMarks.length===3&&d.actionReceivedTotal===3,'changed world identity also resets receipts for standalone renderers');
        const mutable={...w,turn:12,events:[attack]};d=settle(mutable);mutable.turn=11;mutable.events=[];d=settle(mutable);check(d.actionMarks.length===0,'in-place turn rollback is detected without relying on a mutated world reference');
        r.beginWorld('bounded');const many={...w,turn:20,events:Array.from({length:700},(_,i)=>({...attack,target:'target:'+i}))};d=settle(many);check(d.actionReceiptSaturated&&d.actionReceiptKeys===512,'receipt storage closes a saturated turn at512 keys');check(d.actionMarks.length<=3,'visible marks retain the existing per-actor cap');
        clock+=900;d=settle(many);check(d.actionMarks.length===0&&d.actionReceivedTotal===512,'refresh of a saturated turn cannot replay keys evicted from visible marks');
        d=settle({...many,events:[...many.events,{...defend,target:'new-after-cap'}]});check(d.actionMarks.length===0&&d.actionReceivedTotal===512,'new display events beyond a saturated turn stay suppressed instead of cycling history');
        let bound=0;for(let turn=21;turn<=30;turn++){d=settle({...many,turn});bound=Math.max(bound,d.actionReceiptKeys);check(d.actionReceiptTurns<=3&&d.actionReceiptKeys<=1536,'bounded rolling receipt window at turn'+turn);}
        clock+=900;d=settle({...many,turn:20});check(d.actionMarks.length===0&&d.actionReceiptKeys<=1536,'deep stale rollback cannot reopen a retired receipt turn');
        r.beginWorld('replay');d=settle({...w,turn:20,events:[attack]});check(d.actionMarks.length===1,'explicit new replay generation may display that historical turn again');
        check(JSON.stringify(w)===initial&&E.fingerprint(w)===fingerprint,'receipt collection rendering and display settings leave biological input byte-identical');
        return {checks,images,maximumReceiptKeys:bound,last:structuredClone(r.diagnostics)};
      }finally{if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;}
    });
    checks.push(...result.checks);
    for(const [name,data]of Object.entries(result.images))await fs.writeFile(path.join(out,name),Buffer.from(data.split(',')[1],'base64'));
    await page.goto(url+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    const app=await page.evaluate(()=>{
      const config={...__LIFE_TEST__.readConfig(),seed:'i10/app-generation',width:40,height:28,initial:24,lineages:'few'},r=__MARK_RENDERER__;
      __LIFE_TEST__.prepare(config);const first=__LIFE_TEST__.snapshot().world,o=first.organisms.find(o=>o.slot==='main'),event={id:o.id,cell:o.cell,type:'attack',target:o.id,actualDamage:1};
      first.events=[event];r.setWorld(first);r.focus(o.cell,o.id);r.view.actionMarks=true;r.draw();const before={received:r.diagnostics.actionReceivedTotal,resets:r.diagnostics.actionWorldResets,marks:r.diagnostics.actionMarks.length};
      __LIFE_TEST__.prepare(config);const second=__LIFE_TEST__.snapshot().world;second.events=[event];r.setWorld(second);r.focus(o.cell,o.id);r.draw();const after={received:r.diagnostics.actionReceivedTotal,resets:r.diagnostics.actionWorldResets,marks:r.diagnostics.actionMarks.length};return {before,after};
    });
    assert.equal(app.before.received,1);assert.equal(app.after.received,1);assert.equal(app.before.marks,1);assert.equal(app.after.marks,1);assert.equal(app.after.resets,app.before.resets+1);checks.push('real app prepare gives repeated identical worlds distinct explicit renderer generations');
    assert.deepEqual(errors,[]);checks.push('no browser exceptions');passed=true;
    delete result.images;await fs.writeFile(path.join(out,'result.json'),JSON.stringify({checks,result,app},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,maximumReceiptKeys:result.maximumReceiptKeys,errors}));
  }catch(error){errors.push(String(error));throw error;}finally{
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed,checks,errors,scope:'Linux Chromium; fixed-world display fixtures and actual app generation bridge; stage subset/full commit, rollback, saturation and display independence; no ecological rules or random draws changed'},null,2)+'\n');
    await browser?.close();await new Promise(r=>server.close(r));
  }
});
