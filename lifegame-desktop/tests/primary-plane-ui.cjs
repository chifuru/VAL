'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/primary-plane-v4.2.1');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);


  check(await page.locator('#plane-separation').getAttribute('type')==='checkbox','separation is a checkbox in the existing display settings');
  check(!await page.locator('#plane-separation').isChecked(),'normal display is the initial state');
  const fixture=await page.evaluate(()=>{
    const w=__LIFE_TEST__.prepare({seed:'plane-review',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river'}),S=EcoState,W=w.config.width;
    let cell=w.tiles.findIndex((t,p)=>p%W>10&&p%W<29&&Math.floor(p/W)>8&&Math.floor(p/W)<18&&!t.blocked&&!EcoProjection.build(w).water(t)&&S.nearby(w,p).some(q=>w.tiles[q].terrain==='shallow'));
    if(cell<0)cell=S.index(w,20,14);const [x,y]=S.xy(w,cell);
    w.organisms=w.organisms.filter(o=>{const[a,b]=S.xy(w,o.cell);return Math.abs(a-x)>3||Math.abs(b-y)>3;});
    const add=(species,id,p,phase)=>{const o=S.organism(w,S.D.byId[species],p,id,{phase,age:40,E:60,HP:100,dna:Object.fromEntries(S.DNA.map(k=>[k,.5]))});w.organisms.push(o);return o;};
    const m=add('solar','plane-main',cell,4),m2=add('crystal','plane-main-2',cell+1,3);m.branch3=1;m.branch4=0;m.sex='male';m2.sex='female';
    const b=add('grass','plane-basal',cell,2),f=add('grassbug','plane-prey',cell,2);
    m.infection=S.infection(w,'leafparasite',m.id);m.infection.q=S.hyper(w,m.infection.id);m.infection.q.phase=3;
    w.searchQ=[];w.events=[];const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=EcoEngine.summarize(w);
    __LIFE_TEST__.stop();__PLANE_R__.setWorld(w);__LIFE_TEST__.select(cell,m.id);__LIFE_TEST__.refresh();
    window.__PLANE_FIXTURE__={w,m,m2,b,f};return{cell,main:m.id,main2:m2.id,prey:f.id,basal:b.id,P:m.infection.id,Q:m.infection.q.id};
  });
  const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  await page.click('#fit');await page.evaluate(()=>__LIFE_TEST__.draw());
  await page.locator('#board').screenshot({path:path.join(out,'far-normal.png')});
  const off=await page.evaluate(()=>({render:__LIFE_TEST__.snapshot().render,positions:Object.fromEntries(__PLANE_FIXTURE__.w.organisms.map(o=>[o.id,__LIFE_TEST__.screenForCell(o.cell,o.id)]))}));
  await page.check('#plane-separation');await page.evaluate(()=>__LIFE_TEST__.draw());
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.planeSeparation),'checking enables primary plane separation');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.drawn===__LIFE_TEST__.snapshot().world.organisms.length),'far view still draws every organism, including all lower layers');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.elevated===__LIFE_TEST__.snapshot().world.stats.main),'only primary organisms are elevated');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'separation does not mutate the biological world');
  await page.locator('#board').screenshot({path:path.join(out,'far-separated.png')});
  await page.uncheck('#plane-separation');await page.click('#detail-view');await page.evaluate(()=>__LIFE_TEST__.draw());
  await page.locator('#board').screenshot({path:path.join(out,'near-normal.png')});
  await page.check('#plane-separation');await page.evaluate(()=>__LIFE_TEST__.draw());
  const pos=await page.evaluate(f=>__LIFE_TEST__.screenForCell(f.cell,f.main),fixture);const board=await page.locator('#board').boundingBox();
  await page.mouse.click(board.x+pos[0],board.y+pos[1]);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)===fixture.main,'clicking the raised main body selects its actual ID');
  const ground=await page.evaluate(f=>__LIFE_TEST__.screenForCell(f.cell),fixture);
  await page.keyboard.down('Shift');await page.mouse.click(board.x+ground[0],board.y+ground[1]);await page.keyboard.up('Shift');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)!==fixture.main,'Shift click can select the base surface beneath a raised main organism');
  const lower=await page.evaluate(f=>__LIFE_TEST__.screenForCell(f.cell,f.prey),fixture);await page.mouse.click(board.x+lower[0],board.y+lower[1]);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)===fixture.prey,'lower prey remains directly selectable');
  await page.evaluate(f=>__LIFE_TEST__.select(f.cell,f.main),fixture);
  await page.locator('#board').screenshot({path:path.join(out,'near-separated.png')});
  await page.screenshot({path:path.join(out,'display-settings.png'),fullPage:true});
  const motion=await page.evaluate(()=>{
    const {w,m,m2,f}=__PLANE_FIXTURE__,r=__PLANE_R__,results={};
    for(const kind of ['feed','attack'])for(const enabled of [false,true]){
      r.view.planeSeparation=enabled;r.view.mode='detail';r.view.selectedEntity=m.id;
      const target=kind==='feed'?f:m2;w.events=[{id:m.id,type:kind,target:target.id,to:target.cell}];
      r.setWorld(w,true);r.view.animate=true;r.view.duration=10000;r.draw();results[kind+enabled]=structuredClone(r.diagnostics.selectedMotionEndpoints);
    }
    w.events=[];r.view.animate=false;r.view.planeSeparation=true;r.setWorld(w);r.draw();return results;
  });
  check(Math.abs(motion.feedfalse.from[1]-motion.feedtrue.from[1]-1.2)<1e-8&&Math.abs(motion.feedfalse.to[1]-motion.feedtrue.to[1])<1e-8,'feeding connects the raised actor to the unchanged lower target');
  check(Math.abs(motion.attackfalse.from[1]-motion.attacktrue.from[1]-1.2)<1e-8&&Math.abs(motion.attackfalse.to[1]-motion.attacktrue.to[1]-1.2)<1e-8,'attack endpoints both follow their primary display plane');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'motion display does not alter biological state after fixture events are restored');
  const attached=await page.evaluate(f=>{
    const w=__PLANE_FIXTURE__.w,p=EcoProjection.build(w),off=EcoDisplayPlane.create(w,p,false),on=EcoDisplayPlane.create(w,p,true);
    return [f.P,f.Q].every(id=>Math.abs(off.entity(id).point[1]-on.entity(id).point[1]-EcoDisplayPlane.LIFT)<1e-9);
  },fixture);check(attached,'attached P and Q follow their actual host plane');
  const qpos=await page.evaluate(f=>__LIFE_TEST__.screenForCell(f.cell,f.Q),fixture);const scale=await page.evaluate(()=>__LIFE_TEST__.snapshot().view.scale);
  await page.mouse.click(board.x+qpos[0]+.09*scale,board.y+qpos[1]);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)===fixture.Q,'the attached Q ring is directly selectable');
  await page.evaluate(f=>__LIFE_TEST__.select(f.cell,f.main),fixture);await page.click('#follow-individual');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().followId)===fixture.main,'tracking stays attached to the selected primary ID');
  await page.uncheck('#plane-separation');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().followId)===fixture.main,'turning separation off preserves tracking identity');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'all display and selection operations preserve the fixture fingerprint');
  const timing=await page.evaluate(()=>{const r=__PLANE_R__,result={};for(const enabled of[false,true]){r.view.planeSeparation=enabled;r.draw();const samples=[];for(let i=0;i<15;i++){const t=performance.now();r.draw();samples.push(performance.now()-t);}result[enabled?'on':'off']={medianMs:samples.sort((a,b)=>a-b)[7],maxMs:Math.max(...samples)};}r.view.planeSeparation=false;return result;});

  const live=await page.evaluate(()=>{
    const w=__LIFE_TEST__.prepare({seed:'plane-live',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river'});
    return structuredClone(w.config);
  });
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1,{},{timeout:30000});
  await page.check('#plane-separation');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.snapshot().view.planeSeparation),'separation can be enabled during playback without pausing ecology');
  await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2,{},{timeout:30000});await page.evaluate(()=>__LIFE_TEST__.stop());
  check(await page.evaluate(config=>{const E=EcoObservationModel.model(config.advantageSettings),s=__LIFE_TEST__.snapshot();let w=E.create(config);for(let t=0;t<s.world.turn;t++)w=E.step(w);return E.fingerprint(w)===__LIFE_TEST__.fingerprint();},live),'Worker playback with separation equals an independent biological recomputation');
  await page.setViewportSize({width:430,height:850});await page.click('#fit');await page.evaluate(()=>__LIFE_TEST__.draw());
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'the added display checkbox does not overflow a narrow screen');
  check(await page.evaluate(()=>{
    const w=__LIFE_TEST__.snapshot().world,b=document.querySelector('#board').getBoundingClientRect();
    return w.organisms.filter(o=>o.slot==='main').every(o=>{const[x,y]=__LIFE_TEST__.screenForCell(o.cell,o.id);return x>=0&&y>=0&&x<=b.width&&y<=b.height;});
  }),'overview fitting keeps all raised primary anchors inside the narrow board');
  check(errors.length===0,'no browser errors or native dialogs');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,fixture,motion,timing,scope:'Linux Chromium; explicit display fixture, not natural evolution'},null,2));console.log(JSON.stringify({checks,errors,timing}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
