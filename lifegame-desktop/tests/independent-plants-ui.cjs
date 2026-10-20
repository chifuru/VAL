'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/independent-plants'),root=path.resolve('src'),checks=[],errors=[];await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});let browser,passed=false,sourceSignature=null;
 const check=(value,name)=>{assert(value,name);checks.push(name);},ids=['forestcrown','starcrown','freshwaterlight'];
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  sourceSignature=await page.evaluate(()=>EcoReplayVersion);
  check(await page.evaluate(()=>typeof EcoArt.producer==='function'&&typeof EcoArt.producerPortrait==='function'),'adopted producer board and portrait art APIs are connected');
  const number=async id=>Number(await page.locator('#'+id).inputValue());
  check(await number('large-plant-land-density')===2&&await number('large-plant-water-density')===2,'land and water automatic density start at2 percent');
  check(await number('large-plant-phase')===1&&await number('large-plant-age')===0&&await number('large-plant-energy')===50,'initial phase age and E are separate settings');
  for(const id of ids)check(await page.inputValue('#founder-'+id)==='','independent initial count defaults to automatic '+id);
  await page.selectOption('#observation-mode','custom');await page.selectOption('#size','40,28');await page.selectOption('#lineages','few');await page.fill('#initial','32');await page.selectOption('#map-id','river');
  await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.locator('#founder-settings').evaluate(e=>e.open=true);
  await page.selectOption('#large-plant-phase','3');for(const [id,n]of Object.entries({'large-plant-land-density':3,'large-plant-water-density':4,'large-plant-age':25,'large-plant-energy':70,'founder-forestcrown':3,'founder-starcrown':2,'founder-freshwaterlight':2}))await page.fill('#'+id,String(n));
  await page.screenshot({path:path.join(out,'independent-settings.png'),fullPage:true});
  await page.click('#load');await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'));
  let snap=await page.evaluate(()=>__LIFE_TEST__.snapshot()),config=snap.world.config;
  check(config.largePlantModel==='independent/1'&&config.producerModel==='colony/1','new UI explicitly selects both compatible producer models');
  assert.deepEqual(config.largePlantSettings,{version:'independent-plant-parameters/1',autoDensity:{land:.03,water:.04},initial:{phase:3,ageFraction:.25,energyFraction:.7}});checks.push('all effective initial settings are retained');
  const plants=snap.world.organisms.filter(o=>o.plant?.version==='independent-plant-state/1');
  check(plants.length===7&&ids.every((id,i)=>plants.filter(o=>o.species===id).length===[3,2,2][i]),'direct counts override automatic density for each independent species');
  check(plants.every(o=>o.slot==='producer'&&o.phase===3&&o.age===Math.floor(o.birthLife*.25)&&o.G===0),'initial high phase does not invent age or earned experience');
  check(await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;return w.organisms.filter(o=>EcoState.LargePlant.is(o)).every(o=>Math.abs(o.E-EcoState.phenotype(w,o).capE*.7)<1e-5);}), 'initial E fraction is applied to each current phase capacity');
  check(Number((await page.locator('#food-count').innerText()).replaceAll(',',''))===snap.world.stats.food+plants.length,'lower-body total includes each independent producer once');
  check(await page.locator('#species-key [data-species]').count()===35&&await page.locator('#graph-species option[value="forestcrown"]').count()===1,'current default legend and graph catalogue include independent plants and Ryouki');
  const initialFingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  for(const plant of ids.map(id=>plants.find(o=>o.species===id))){
   await page.evaluate(o=>__LIFE_TEST__.select(o.cell,o.id),plant);
   const detail=await page.locator('[data-plant-id="'+plant.id+'"]').innerText();
   check(['1個体','年齢','出生時寿命基準','本体','可食量','可食容量','蓄え','累積実績','直近生産','光入力'].every(text=>detail.includes(text))&&!detail.includes('1群落'),'side details keep individual age resources and edible stock '+plant.species);
   await page.locator('[data-plant-id="'+plant.id+'"]').evaluate(e=>e.scrollIntoView({block:'start'}));
   await page.screenshot({path:path.join(out,'independent-details-'+plant.species+'.png')});
  }
  await page.screenshot({path:path.join(out,'independent-details.png')});
  for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations'])check(await page.locator('#'+id).isVisible(),'existing observation graph remains visible '+id);
  await page.locator('[data-plant-id="'+plants.find(o=>o.species==='freshwaterlight').id+'"] [data-tree]').click();
  check(await page.locator('[data-independent-tree] [data-plant-phase="1"]').count()===1&&await page.locator('[data-independent-tree] [data-plant-phase="2"]').count()===1&&await page.locator('[data-independent-tree] [data-plant-phase="3"]').count()===3&&await page.locator('[data-independent-tree] [data-plant-phase="4"]').count()===6,'independent tree exposes I II three III and six IV forms');
  const tree=await page.locator('[data-independent-tree]').innerText();check(tree.includes('実績12')&&tree.includes('累積実績36')&&tree.includes('IVは80')&&tree.includes('I/II相')&&tree.includes('完全浮遊'),'tree separates earned phase mature reproduction and floating movement');
  await page.screenshot({path:path.join(out,'independent-tree.png')});await page.locator('[data-independent-tree] [data-plant-phase="4"]').last().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'independent-tree-finals.png')});await page.click('#close-guide');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===initialFingerprint,'portraits trees and graph inspection leave biological state unchanged');
  await page.click('#change-world');check(await number('large-plant-phase')===3&&await number('large-plant-age')===25&&await number('large-plant-energy')===70&&await number('large-plant-land-density')===3,'return to settings restores independent initial conditions');
  await page.fill('#founder-forestcrown','0');await page.fill('#large-plant-age','10');await page.click('#cancel-settings');check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===initialFingerprint,'cancel preserves exact committed world and initial conditions');
  await page.evaluate(()=>{__LIFE_TEST__.step();__LIFE_TEST__.step();__LIFE_TEST__.stop();});snap=await page.evaluate(()=>__LIFE_TEST__.snapshot());
  check(snap.observationTurns===3&&snap.world.largePlantSummary.turn===2,'all committed turns retain independent-plant observations');
  const observed=await page.evaluate(()=>__LIFE_TEST__.observations().snapshot());
  check(observed.definitions.independentPlants==='independent-plant-observed/1'&&observed.rows.every(r=>r.independentPlants?.turn===r.turn),'saved observation carries the formal definition and every turn');
  check(observed.metadata.species.filter(s=>s.kind==='independent'&&s.slot==='producer').length===3,'saved catalogue keeps individual kind and producer slot');
  await page.evaluate(()=>__LIFE_TEST__.finish());const record=(await page.evaluate(()=>__LIFE_TEST__.records())).find(r=>r.schema===2&&r.config.largePlantModel==='independent/1');check(!!record,'new result is saved to the archive');
  await page.click('#open-results');await page.locator('[data-analyze="'+record.id+'"]').click();await page.waitForSelector('#results-analysis:not([hidden])');await page.selectOption('#graph-species','forestcrown');
  check((await page.locator('#graph-stacked').getAttribute('aria-label')).includes('現在'+observed.rows.at(-1).counts.forestcrown),'saved graph uses independent species counts without duplicating producer bodies');
  await page.screenshot({path:path.join(out,'independent-saved-analysis.png')});await page.click('#close-results');
  await page.evaluate(id=>__LIFE_TEST__.replay(id),record.id);await page.waitForFunction(()=>__LIFE_TEST__.snapshot().replay);
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===initialFingerprint,'replay regenerates exact independent initial world without redrawing branches');
  // Deliberate same-cell fixture: verifies display/selection only, not natural emergence.
  const overlap=await page.evaluate(()=>{const w=__LIFE_TEST__.prepare({...__LIFE_TEST__.snapshot().world.config,seed:'independent-overlap-ui'});__LIFE_TEST__.stop();const plant=w.organisms.find(o=>o.species==='forestcrown'),main=w.organisms.find(o=>o.slot==='main'),colony=w.organisms.find(o=>o.colony?.version==='colony-state/1'),prey=w.organisms.find(o=>EcoState.spec(o).group==='prey');for(const o of [main,colony,prey])o.cell=plant.cell;__LIFE_TEST__.refresh();__LIFE_TEST__.select(plant.cell,plant.id);return {cell:plant.cell,ids:[main.id,colony.id,prey.id,plant.id],plant:plant.id};});
  check(await page.evaluate(ids=>ids.every(id=>document.querySelector('#selection [data-observe="'+id+'"]')),overlap.ids),'same-cell selection keeps main basal colony prey and independent body');
  await page.locator('#selection [data-observe="'+overlap.plant+'"]').click();check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)===overlap.plant,'occupant button selects the independent ID');
  check((await page.locator('#selection [data-observe="'+overlap.plant+'"]').innerText()).startsWith('生産者:'),'producer slot has a distinct occupant label');
  await page.click('#detail-view');await page.waitForTimeout(90);
  for(const id of overlap.ids){
   const target=await page.evaluate(({cell,id})=>{const p=__LIFE_TEST__.screenForCell(cell,id),b=document.getElementById('board').getBoundingClientRect();return {x:b.left+p[0],y:b.top+p[1],hit:__LIFE_TEST__.hitAt(b.left+p[0],b.top+p[1])?.id};},{cell:overlap.cell,id});
   check(target.hit===id,'overlapping board body has its own hit region '+id);await page.mouse.click(target.x,target.y);check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId)===id,'real board click selects exact overlapping ID '+id);
  }
  await page.locator('[data-plant-id="'+overlap.plant+'"]').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(out,'independent-overlap-fixture.png')});
  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'legacy-independent-ui',width:40,height:28,initial:32,lineages:'few'});__LIFE_TEST__.stop();});snap=await page.evaluate(()=>__LIFE_TEST__.snapshot());
  check(snap.world.config.largePlantModel===undefined&&snap.world.organisms.every(o=>!o.plant)&&await page.locator('#species-key [data-species]').count()===31&&await page.locator('#graph-species option[value="forestcrown"]').count()===0,'flagless legacy display stays31 species without plant conversion');
  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'i02-independent-ui',width:40,height:28,initial:32,lineages:'few',producerModel:'colony/1'});__LIFE_TEST__.stop();});snap=await page.evaluate(()=>__LIFE_TEST__.snapshot());
  check(snap.world.config.largePlantModel===undefined&&snap.world.organisms.some(o=>o.colony?.version==='colony-state/1')&&snap.world.organisms.every(o=>!o.plant)&&await page.locator('#species-key [data-species]').count()===31,'I02 colony display does not silently adopt independent plants');
  await page.click('#change-world');await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.fill('#founder-forestcrown','0');await page.fill('#founder-starcrown','0');await page.fill('#founder-freshwaterlight','0');await page.click('#load');await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'));
  snap=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(snap.world.config.largePlantModel==='independent/1'&&snap.world.organisms.every(o=>!o.plant)&&ids.every(id=>snap.world.config.founderCounts.species[id]===0),'explicit zero remains a T0 independent count with the new model active');
  await page.click('#change-world');await page.click('#reset-lower-settings');check((await Promise.all(ids.map(id=>page.inputValue('#founder-'+id)))).every(value=>value==='')&&await number('large-plant-phase')===1&&await number('large-plant-energy')===50,'reset restores automatic independent counts and standard initial state');
  await page.setViewportSize({width:820,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'additional independent controls fit narrow settings');
  check(await page.evaluate(()=>EcoArt.errors.length===0),'all adopted image files load without errors');
  check(errors.length===0,'no browser exceptions or native dialogs');passed=true;console.log(JSON.stringify({checks:checks.length,errors,sourceSignature}));
 }catch(e){errors.push(String(e));throw e;}finally{
  await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({passed,checks,errors,sourceSignature,scope:'Linux Chromium; new initial controls, three individual details, independent tree, existing graph/save/replay, same-cell display fixture, legacy and I02 non-adoption; no population-survival claim'},null,2)+'\n');
  if(browser)await browser.close();await new Promise(r=>server.close(r));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
