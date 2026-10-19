"use strict";
const {chromium}=require('playwright'),assert=require('node:assert/strict'),
 fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/age-ui');await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{
  const f=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);
  if(!f.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(f));
 }catch{res.writeHead(404).end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
 const browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),checks=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));const check=(v,n)=>{assert(v,n);checks.push(n);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'overview-natural',width:40,height:28,initial:80,lineages:'few',mapId:'river'}));
  await page.waitForTimeout(100);
  check(await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;return [...document.querySelectorAll('#species-key [data-species]')].every(e=>Number(e.querySelector('b').textContent)===w.stats.counts[e.dataset.species]);}),'legend counts match real organisms');
  check(await page.evaluate(()=>Object.keys(EcoRenderer.symbolPaths).length===EcoData.species.length+Object.keys(EcoState.FOOD).length),'every current biological and resource symbol is explicitly defined');
  check(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=48;const g=c.getContext('2d');return new Set(Object.keys(EcoRenderer.symbolPaths).map(id=>{g.clearRect(0,0,48,48);EcoRenderer.symbol(g,id,24,24,18);return c.toDataURL();})).size===EcoData.species.length+Object.keys(EcoState.FOOD).length;}),'all current symbol rasterizations are distinct');
  const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  await page.screenshot({path:path.join(out,'natural-overview.png'),fullPage:true});
  await page.locator('#board').screenshot({path:path.join(out,'natural-board.png')});
  check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.render.drawn===s.world.organisms.length&&s.render.resources===s.world.resources.length&&s.render.carcasses===s.world.carcasses.length;}),'overview draws every organism, resource and carcass without sampling');
  check(await page.locator('#resource-key [data-resource]').count()===8,'all resource kinds including information have a legend');
  await page.click('#detail-view');await page.waitForTimeout(90);await page.screenshot({path:path.join(out,'natural-detail.png'),fullPage:true});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'far and detailed view preserve biology');
  await page.click('#fit');await page.waitForTimeout(90);
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'returning to overview preserves biology');
  // Explicit display fixture; do not step or claim ecological emergence.
  await page.evaluate(()=>{
   const w=__LIFE_TEST__.prepare({seed:'overview-display-fixture',width:40,height:28,initial:80});
   w.organisms=EcoState.D.species.filter(s=>!['P','Q'].includes(s.group)).map((s,i)=>EcoState.organism(w,s,(5+Math.floor(i/9)*5)*40+4+(i%9)*3,'symbol-'+s.id,{phase:s.group==='main'?3:1,age:30}));
   w.searchQ=[];const host=w.organisms.find(o=>o.species==='solar'),food=w.organisms.find(o=>o.species==='grass');food.cell=host.cell;
   host.infection=EcoState.infection(w,'tideparasite',host.id,0);host.infection.q=EcoState.hyper(w,host.infection.id,0);
   w.resources=Object.keys(EcoState.FOOD).map((kind,i)=>({id:'fixture-'+kind,kind,cell:host.cell,q:1,E:1,M:0,G:0,expires:null}));
   w.carcasses=[{id:'fixture-carcass',species:'solar',cell:host.cell,q:1,E:1,M:0,G:0}];w.events=[];w.stats=EcoEngine.summarize(w);__LIFE_TEST__.refresh();__LIFE_TEST__.select(host.cell,host.id);
  });
  await page.click('#fit');await page.waitForTimeout(100);
  check(await page.evaluate(()=>{const r=__LIFE_TEST__.snapshot().render;return r.drawn===28&&r.resources===8&&r.carcasses===1&&r.infectedHosts===1&&r.highParasites===1;}),'fixture retains all 28 bodies, 8 resources, carcass and host P/Q');
  check((await page.textContent('#selection')).includes('情報')&&await page.evaluate(()=>{const ids=[...document.querySelectorAll('#selection [data-observe]')].map(e=>e.dataset.observe);return ids.includes('symbol-solar')&&ids.includes('symbol-grass')&&ids.includes('fixture-carcass')&&ids.length===5;}),'selected overlap exposes both bodies, P/Q, carcass and information');
  const fixture=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  await page.screenshot({path:path.join(out,'symbols-overview-fixture.png'),fullPage:true});
  await page.click('#detail-view');await page.waitForTimeout(100);await page.screenshot({path:path.join(out,'overlap-detail-fixture.png'),fullPage:true});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fixture,'overlap and host fixture has identical biological state at near zoom');
  await page.click('#fit');for(let i=0;i<5;i++)await page.click('#zoom-out');await page.waitForTimeout(90);
  check(await page.locator('#scale-warning').isVisible(),'unreadable scale explicitly asks for zoom or cell selection');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fixture,'extreme zoom does not alter the world');
  await page.setViewportSize({width:640,height:1000});await page.waitForTimeout(90);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'legend and scale warning fit narrow layout');
  await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'large-overview',width:160,height:112,initial:320,lineages:'few'}));await page.waitForTimeout(100);
  check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.render.drawn===s.world.organisms.length&&s.render.resources===s.world.resources.length;}),'large world overview keeps every biological position in the draw set');
  check(errors.length===0,'no browser exceptions');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,fixture:'28 explicitly placed species, one main/food overlap, eight resource kinds, carcass and P/Q; display-only, not naturally evolved; natural screenshots are separate'},null,2)+'\n');console.log(JSON.stringify({ok:true,checks},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
