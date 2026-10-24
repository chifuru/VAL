'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/cell-observation-v1');await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));const check=(v,label)=>{assert(v,label);checks.push(label);};
 const renderReady=()=>page.waitForFunction(()=>{__LIFE_TEST__.draw();return !__LIFE_TEST__.snapshot().render.terrainPending;},null,{timeout:20000});
 const capture=async name=>{const clip=await page.evaluate(()=>{for(const selector of ['#selection','#inspector-details','.workspace > .inspector'])document.querySelector(selector).scrollTop=0;const a=document.querySelector('.habitat').getBoundingClientRect(),b=document.querySelector('.workspace > .inspector').getBoundingClientRect();return {x:a.left,y:Math.min(a.top,b.top),width:b.right-a.left,height:Math.min(innerHeight,Math.max(a.bottom,b.bottom))-Math.min(a.top,b.top)};});await page.screenshot({path:path.join(out,name+'.png'),clip});};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{
   const T=__LIFE_TEST__,S=EcoEngine.S,w=T.prepare({...T.readConfig(),seed:'cell-observation',terrainSeed:'cell-observation',width:40,height:28,initial:24,lineages:'few',mapId:'river',producerModel:'colony/1',largePlantModel:'independent/1',consumerModel:'group/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}});T.stop();
   for(const k of ['organisms','resources','carcasses','pending','searchQ','primaryInocula','hyperInocula','informationField'])w[k]=[];
   const cell=w.tiles.findIndex((t,i)=>i>40*7&&i<40*20&&i%40>10&&i%40<30&&!t.blocked&&['plain','rock','mud'].includes(t.terrain));if(cell<0)throw Error('No land fixture site');
   w.config.cellModel=S.CellSpace.VERSION;w.config.cellSettings=S.CellSpace.settings({aquaticProfile:'freshwater-comparison/1'});S.CellSpace.initialize(w);
   const add=(id,species,opts={},space={})=>{const o=S.organism(w,S.D.byId[species],cell,id,{age:40,birthReady:1000,...opts});if(opts.mutated)o.ryouki.mutated=true;S.CellSpace.assign(w,o,space);w.organisms.push(o);return o;};
   for(let slot=0;slot<3;slot++)for(let i=0;i<3;i++)add('r'+slot+'-'+i,'ryouki',{mutated:true},{state:'settled',slot});
   for(let i=0;i<2;i++)add('moving'+i,'crystal',{}, {state:'moving'});
   for(let i=0;i<6;i++)add('colony'+i,'grass');for(let i=0;i<3;i++)add('tree'+i,'forestcrown');for(let i=0;i<5;i++){const g=add('herd'+i,'grassbug',{age:10,B:4,E:2,M:.1});g.consumerGroup.cohorts=[{age:10,phase:1,n:2,B:4}];g.HP=S.spec(g).capacity[3]*2;}
   for(let i=0;i<6;i++)add('fungus'+i,'fungus');const host=w.organisms.find(o=>o.id==='r0-0');host.infection=S.infection(w,'leafparasite',host.id,0,host.id);host.infection.q=S.hyper(w,host.infection.id,0);
   w.cellState.water[cell]=7;w.tiles[cell].soilM=3;w.cellState.nextMaterial=[{id:'pending-ui',cell,kind:'organic',availableAt:1,E:3,M:.2,B:1}];w.cellState.organic=[{id:'organic-ui',cell,E:2,M:.1,B:1}];w.stats=EcoEngine.summarize(w);window.cellFixture={w,cell,hostId:host.id,p:host.infection.id,q:host.infection.q.id,ids:w.organisms.map(o=>o.id)};T.refresh();if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();T.select(cell,host.id);document.getElementById('detail-view').click();T.draw();
  });await renderReady();
  const initial=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),world:JSON.stringify(cellFixture.w),rows:JSON.stringify(__LIFE_TEST__.observations().rows)}));
  const near=await page.evaluate(()=>{const T=__LIFE_TEST__,b=document.getElementById('board').getBoundingClientRect();return cellFixture.ids.map(id=>{const p=T.screenForCell(cellFixture.cell,id);return {id,hit:T.hitAt(b.left+p[0],b.top+p[1])?.id};});});
  check(near.every(r=>r.id===r.hit),'all 31 biological IDs are independently pickable in detailed view');
  check(await page.locator('[data-cell-summary]').textContent().then(t=>t.includes('6/6群落')&&t.includes('3/3個体')&&t.includes('5/5小集団')&&t.includes('内部 10体')&&t.includes('定住 9個体 / 3枠')&&t.includes('移動 2個体')),'cell summary separates colonies, individuals, groups, internal members and occupied slots');
  check(await page.locator('[data-cell-summary]').textContent().then(t=>t.includes('水 7')&&t.includes('養分M 3')&&t.includes('次T待ち：E 3 / M 0.2 / B 1')),'available water/M and next-turn matter are shown separately');
  for(const id of ['r2-2','moving1','colony4','tree2','herd4','fungus5']){
   const position=await page.evaluate(id=>{const T=__LIFE_TEST__,b=document.getElementById('board').getBoundingClientRect(),p=T.screenForCell(cellFixture.cell,id);return {x:b.left+p[0],y:b.top+p[1]};},id);await page.mouse.click(position.x,position.y);
   check(await page.evaluate(id=>__LIFE_TEST__.snapshot().selectedId===id,id),'detailed pick selects '+id);
  }
  check(await page.locator('[data-cell-organism="fungus5"]').textContent().then(t=>t.includes('基部 1 B')&&t.includes('可食上限 3 B')),'decomposer detail uses the new protected base and edible cap');
  check(await page.locator('[data-cell-organism="colony4"]').textContent().then(t=>t.includes('基部 2 B')&&t.includes('可食上限 20 B')),'colony detail uses new actual biomass bounds');
  check(await page.locator('[data-cell-organism="herd4"]').textContent().then(t=>t.includes('2体の小集団')&&t.includes('上限 8体')&&t.includes('総B 4 / 上限 4')),'herd detail shows real internal members and new capacity');
  await page.locator('#selection [data-portrait="herd4"]').click();check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId==='herd4'),'existing portrait selects the corresponding individual/group without extra selector buttons');
  await page.locator('#selection [data-portrait="colony4"]').focus();await page.keyboard.press('Enter');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId==='colony4'),'portrait ID selection supports keyboard activation');
  for(const key of ['p','q']){await page.evaluate(key=>__LIFE_TEST__.select(cellFixture.cell,cellFixture[key]),key);check(await page.evaluate(key=>__LIFE_TEST__.snapshot().selectedId===cellFixture[key],key),'attached '+key.toUpperCase()+' remains individually selectable');}
  await page.evaluate(()=>__LIFE_TEST__.select(cellFixture.cell,'r0-0'));await capture('near');
  const frozen=await page.locator('#selection').innerHTML();await page.evaluate(()=>{cellFixture.w.organisms.find(o=>o.id==='colony4').E=.123;});await page.evaluate(()=>__LIFE_TEST__.draw());check(await page.locator('#selection').innerHTML()===frozen,'rendering preserves frozen detail until explicit refresh');
  await page.click('#refresh-selection');check(await page.locator('[data-cell-organism="colony4"]').textContent().then(t=>t.includes('E 0.12')),'manual refresh reads the current committed values');
  await page.evaluate(()=>{cellFixture.w.organisms.find(o=>o.id==='colony4').E=4;__LIFE_TEST__.refresh();document.getElementById('fit').click();__LIFE_TEST__.draw();});await renderReady();
  const far=await page.evaluate(()=>{const T=__LIFE_TEST__,b=document.getElementById('board').getBoundingClientRect();return cellFixture.ids.map(id=>{const p=T.screenForCell(cellFixture.cell,id);return {id,hit:T.hitAt(b.left+p[0],b.top+p[1])?.id};});});check(far.every(r=>r.id===r.hit),'all 31 IDs remain independently pickable in overview, including cached basal glyphs');await capture('far');
  const after=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),world:JSON.stringify(cellFixture.w),rows:JSON.stringify(__LIFE_TEST__.observations().rows)}));check(after.hash===initial.hash&&after.world===initial.world&&after.rows===initial.rows,'selection/render/detail refresh do not alter biology, random state or recorded observations');
  await page.evaluate(()=>{__LIFE_TEST__.select(cellFixture.cell,'moving1');document.getElementById('follow-individual').click();cellFixture.w.organisms=cellFixture.w.organisms.filter(o=>o.id!=='moving1');__LIFE_TEST__.refresh();__LIFE_TEST__.select(cellFixture.cell,'moving1');});check(await page.locator('#selection').textContent().then(t=>t.includes('選択したIDは消失')),'a removed ID never silently becomes a neighbouring individual');
  check(errors.length===0,'no uncaught browser errors');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,passed:checks.length,near,far,errors,scope:'internal read-only cell fixture; no public stepping/archive/long-run claim'},null,2)+'\n');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log(JSON.stringify({passed:checks.length,errors:errors.length,out}));
})().catch(e=>{console.error(e);process.exitCode=1;});
