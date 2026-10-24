'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),fixture=require('./cell-observation-units-fixture.cjs');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/cell-observation-units-v1');await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));const check=(value,name)=>{assert(value,name);checks.push(name);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{window.liveUnits=__LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),width:40,height:28,initial:24,lineages:'few'});__LIFE_TEST__.stop();});
  await page.evaluate('window.unitsWorld=('+fixture.toString()+')(EcoEngine,true,40,28)');
  await page.evaluate(()=>{
   const E=EcoEngine,w=unitsWorld;const h=EcoObservations.create(w.config,'cell-units-ui',{species:E.S.activeSpecies(w)});h.append(w);
   for(let turn=1;turn<=2;turn++){w.turn=turn;const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.cellLife(w,c);E.finish(w,c);h.append(w);}
   for(const key of Object.keys(liveUnits))delete liveUnits[key];Object.assign(liveUnits,w);Object.defineProperties(__LIFE_TEST__.observations(),Object.getOwnPropertyDescriptors(h));window.unitsHistory=h;
   __LIFE_TEST__.refresh();if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();__LIFE_TEST__.select(18,'r0-0');document.getElementById('fit').click();__LIFE_TEST__.draw();
  });
  const before=await page.evaluate(()=>({world:JSON.stringify(liveUnits),hash:__LIFE_TEST__.fingerprint(),record:JSON.stringify(unitsHistory.snapshot())}));
  check(await page.evaluate(()=>unitsHistory.rows.length===3&&unitsHistory.rows[0].cell.agents===32&&unitsHistory.rows[0].current.total===47),'actual internal T0–T2 observations expose 32 management units and population 47 at T0');
  await page.selectOption('#graph-group','all');
  check(await page.locator('#graph-range').textContent()==='0–2T','the existing population/composition views keep the whole period');
  for(const axis of ['population','phases','ages','sex'])check(await page.evaluate(axis=>unitsHistory.series('all',axis).every((r,i)=>r.total===unitsHistory.rows[i].current.total),axis),'all-organism '+axis+' uses the same population denominator');
  for(const group of ['prey','plant','P','Q']){
   await page.selectOption('#graph-group',group);
   check(await page.evaluate(group=>document.getElementById('graph-species').value===group&&unitsHistory.series(group,'phases').length===3,group),'existing '+group+' graph selection exposes all three turns');
  }
  await page.selectOption('#graph-group','prey');await page.selectOption('#graph-species','grassbug');
  check(await page.locator('#population-legend').textContent().then(t=>t.includes('草棲虫')&&t.includes(String(18))),'species population legend shows internal consumer members, not five group IDs');
  const expected=await page.evaluate(()=>{const r=unitsHistory.rows.at(-1);return {members:r.counts.grassbug,groups:r.cell.layers[3].units,fungi:r.counts.fungus,total:r.current.total};}),breakdown=await page.locator('#food-breakdown').textContent();
  check(breakdown.includes(expected.members+'体・'+expected.groups+'集団')&&breakdown.includes(expected.fungi+'群落'),'current counters distinguish consumer members/groups and decomposer colonies: '+breakdown);
  check(await page.evaluate(()=>['graph-stacked','composition-phases','composition-sex','composition-ages'].every(id=>{const c=document.getElementById(id),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return p.some((v,i)=>i%4===3&&v>0);})), 'all existing population/composition canvases render');
  await page.selectOption('#graph-group','all');await page.selectOption('#donut-view','all');
  check(await page.locator('#current-donut').getAttribute('data-total').then(v=>Number(v)===expected.total),'current composition uses the same current population units');
  check(await page.locator('#biomass-pyramid [data-level="0"]').count()===1,'the existing five-role biomass pyramid is rendered without spatial-layer substitution');
  check(await page.evaluate(()=>{const s=unitsHistory.snapshot(),r=EcoObservations.restore(JSON.parse(JSON.stringify(s)));return JSON.stringify(r.snapshot())===JSON.stringify(s)&&r.csv()===unitsHistory.csv();}),'browser observation JSON restore and CSV remain exact');
  await page.waitForFunction(()=>{__LIFE_TEST__.draw();return !__LIFE_TEST__.snapshot().render.terrainPending;},null,{timeout:20000});
  await page.screenshot({path:path.join(out,'graphs.png')});
  const after=await page.evaluate(()=>({world:JSON.stringify(liveUnits),hash:__LIFE_TEST__.fingerprint(),record:JSON.stringify(unitsHistory.snapshot())}));check(JSON.stringify(before)===JSON.stringify(after),'changing graph targets/donut and rendering leaves the world, random state and committed observations unchanged');
  check(errors.length===0,'no uncaught browser errors');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:checks.length,checks,errors,scope:'internal T0–T2 fixture; existing graph layout/filters, units and read-only snapshot only'},null,2)+'\n');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log(JSON.stringify({passed:checks.length,errors:errors.length,out}));
})().catch(e=>{console.error(e);process.exitCode=1;});
