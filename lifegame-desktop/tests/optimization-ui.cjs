'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/optimization');await fs.mkdir(out,{recursive:true});const root=path.resolve('src');
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':file.endsWith('.css')?'text/css':'text/html');let data=await fs.readFile(file);if(file===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[],check=(v,label)=>{assert(v,label);checks.push(label);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);await page.selectOption('#size','40,28');await page.click('#load');if(!await page.evaluate(()=>document.body.classList.contains('observatory')))await page.click('#focus-view');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.randomModel==='table/1'),'new UI conditions explicitly record table random');
  check(await page.locator('#species-key .species-group').count()===6,'presence catalogue has six distinct ecological groups');
  check(await page.evaluate(()=>{const e=document.getElementById('species-key');return getComputedStyle(e).display==='grid'&&e.scrollWidth<=e.clientWidth+1;}),'presence catalogue wraps without horizontal scrolling');
  const names=await page.locator('#species-key h4').allTextContents();check(names.includes('生産者')&&names.includes('一次消費者')&&names.includes('分解者'),'ecological names replace the food-organism category');
  const fields=await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;return {main:w.organisms.find(o=>o.slot==='main').species,prey:w.organisms.find(o=>EcoData.byId[o.species].group==='prey').species};});
  await page.locator(`[data-highlight="${fields.main}"]`).check();await page.locator(`[data-highlight="${fields.prey}"]`).check();
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.highlights.length===2),'grouped controls retain independent multiple highlights');
  await page.locator(`[data-describe="${fields.main}"]`).click();check(await page.locator('#inspector-details').isVisible()&&!await page.locator('#inspector-graphs').isVisible(),'description replaces timelines in the fixed sidebar');await page.click('#close-species');
  await page.click('#detail-view');await page.waitForTimeout(250);await page.waitForFunction(()=>!__LIFE_TEST__.snapshot().render.terrainPending,{},{timeout:30000});
  const requested=await page.evaluate(()=>__LIFE_TEST__.snapshot().render.terrainRequests);await page.evaluate(()=>{__R__.view.x+=(Math.floor(__R__.view.x)%128===127?-1:1);__R__.draw();});await page.waitForTimeout(100);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.terrainRequests)===requested,'small integer camera pan reuses the oversized high-resolution background');
  await page.evaluate(()=>{
   window.__BOARD_BLURS__=0;const proto=CanvasRenderingContext2D.prototype,d=Object.getOwnPropertyDescriptor(proto,'shadowBlur');Object.defineProperty(proto,'shadowBlur',{get:d.get,set(v){if(this.canvas.id==='board'&&v>0)__BOARD_BLURS__++;d.set.call(this,v);},configurable:true});
   const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');window.__FIXTURE__=w;window.__FIXTURE_ID__=o.id;__R__.focus(o.cell,o.id);__R__.view.selectedEntity=o.id;__R__.view.motion=true;__R__.view.animate=true;__R__.view.duration=333;
   w.events=[{id:o.id,type:'attack',target:o.id,actualDamage:0,mitigated:0},{id:o.id,type:'defend'},{id:o.id,type:'feed',sourceType:'plant',tag:'plant',source:o.id,amount:1}];__R__.setWorld(w,true);__R__.draw();
  });
  let report=await page.evaluate(()=>({marks:__R__.diagnostics.actionMarks,kinds:__R__.diagnostics.motionKinds,blurs:__BOARD_BLURS__}));
  check(['attack','defend','graze'].every(kind=>report.marks.some(m=>m.kind===kind)),'attack defense and plant feeding have separately identifiable marks');
  check(report.marks.every(m=>m.x>=0&&m.y>=0),'action marks remain inside the map at the upper edge');
  check(!report.kinds.hit,'an unsuccessful attack does not produce a successful hit effect');check(report.blurs===0,'board draws no per-frame blurred shadows over organisms');
  await page.locator('#step').evaluate(e=>e.hidden=true);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'action-marks-near.png')});
  await page.waitForTimeout(920);await page.evaluate(()=>__R__.draw());check(await page.evaluate(()=>__R__.diagnostics.actionMarks.length===0),'action marks expire without changing turns');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn)===0,'presentation fixtures never advance the ecosystem');
  await page.evaluate(()=>{const w=structuredClone(__FIXTURE__),o=w.organisms.find(o=>o.id===__FIXTURE_ID__);w.turn++;w.events=[{id:o.id,type:'attack',target:o.id,actualDamage:5,mitigated:2},{id:o.id,type:'feed',sourceType:'carcass',tag:'animal',source:'c:'+o.id+':0',amount:1}];__R__.setWorld(w,true);__R__.draw();});
  report=await page.evaluate(()=>({marks:__R__.diagnostics.actionMarks,kinds:__R__.diagnostics.motionKinds}));check(report.kinds.hit>0&&report.kinds.block>0,'measured damage and mitigation produce distinct hit and block effects');check(report.marks.some(m=>m.kind==='scavenge'),'animal-remains feeding has its own mark');
  for(const kind of ['infection','clear','birth','growth','care']){
    const visible=await page.evaluate(kind=>{const w=structuredClone(__FIXTURE__);w.turn=100+['infection','clear','birth','growth','care'].indexOf(kind);w.events=[{id:__FIXTURE_ID__,type:kind}];__R__.setWorld(w,true);__R__.draw();return __R__.diagnostics.actionMarks.some(m=>m.kind===kind);},kind);check(visible,'separate confirmed '+kind+' mark is visible');
  }
  await page.evaluate(()=>{__R__.setWorld(__FIXTURE__);__R__.fit();__R__.draw();});await page.screenshot({path:path.join(out,'grouped-far.png')});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html');check(!await page.locator('#step').isVisible(),'normal product UI does not expose the one-turn debug operation');
  check(errors.length===0,'no browser errors');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
