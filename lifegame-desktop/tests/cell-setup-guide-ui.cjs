'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),fixture=require('./cell-observation-units-fixture.cjs');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/cell-setup-guide-v1');await fs.mkdir(out,{recursive:true});
 const baseline=await fs.readFile(process.env.LIFEGAME_BASELINE_APP||'/tmp/cell-setup-baseline-app.js','utf8'),checks=[],errors=[],check=(value,label)=>{assert(value,label);checks.push(label);};
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),options={viewport:{width:1600,height:1000}},page=await browser.newPage(options),old=await browser.newPage(options);
 for(const p of [page,old]){p.on('pageerror',e=>errors.push(String(e)));p.on('dialog',async d=>{errors.push('native dialog: '+d.message());await d.dismiss();});}
 try{
  await old.route('**/app.js',route=>route.fulfill({contentType:'application/javascript',body:baseline}));
  for(const p of [old,page]){await p.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await p.waitForFunction(()=>!!window.__LIFE_TEST__);}
  check(!await page.locator('#cell-environment-settings').isVisible()&&await page.locator('#cell-temperature').isDisabled(),'legacy settings hide and disable the new environment controls');
  const snapshots=[];
  for(const scenario of ['default','manual-zero','river']){
   const values=[];for(const p of [old,page])values.push(await p.evaluate(scenario=>{
    document.getElementById('reset-setup').click();const set=(id,value)=>{const e=document.getElementById(id);if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));};
    if(scenario==='manual-zero'){set('generation-mode','manual');set('producer-supply',false);for(const id of ['density-plant','density-plant-water','density-fungus','density-prey','resource-mineral','resource-droplet'])set(id,0);}
    if(scenario==='river')set('observation-mode','river-settlement');const c=__LIFE_TEST__.readConfig();delete c.seed;delete c.terrainSeed;return c;
   },scenario));check(JSON.stringify(values[0])===JSON.stringify(values[1]),'legacy '+scenario+' configuration equals main 70205d1');snapshots.push({scenario,equal:true});
  }
  await page.evaluate(()=>{document.getElementById('reset-setup').click();window.legacySetupConfig={...__LIFE_TEST__.readConfig(),width:40,height:28,initial:24,lineages:'few'};window.liveCell=__LIFE_TEST__.prepare(structuredClone(legacySetupConfig));__LIFE_TEST__.stop();});
  await page.evaluate('window.setupFixture=('+fixture.toString()+')(EcoEngine,true,40,28)');
  await page.evaluate(()=>{for(const k of Object.keys(liveCell))delete liveCell[k];Object.assign(liveCell,setupFixture);const h=EcoObservations.create(liveCell.config,'cell-setup-ui',{species:EcoEngine.S.activeSpecies(liveCell)});h.append(liveCell);Object.defineProperties(__LIFE_TEST__.observations(),Object.getOwnPropertyDescriptors(h));__LIFE_TEST__.refresh();});
  const before=await page.evaluate(()=>({world:JSON.stringify(liveCell),hash:__LIFE_TEST__.fingerprint(),rows:JSON.stringify(__LIFE_TEST__.observations().snapshot())}));
  await page.click('#change-world');check(await page.locator('#cell-environment-settings').isVisible(),'new-world return exposes fixed environment candidates');
  check(await page.locator('#observation-mode').isDisabled()&&await page.locator('#generation-mode').isDisabled()&&await page.locator('[data-observation-set="river-settlement"]').isDisabled(),'unsupported preset and automatic adjustments are visible but unavailable');
  check(await page.locator('#producer-supply').isDisabled()&&await page.locator('#colony-land-capacity').isDisabled()&&await page.locator('#colony-water-regrowth').isDisabled(),'legacy support and variable capacity/regrowth are unavailable');
  check(await page.inputValue('#cell-model-mode')==='cell'&&await page.inputValue('#cell-aquatic-profile')==='freshwater-comparison/1','new-world return preserves the chosen comparison model and water condition');
  for(const [id,value]of Object.entries({'cell-temperature':'17.5','cell-landPH':'6.1','cell-waterPH':'7.3','cell-rainScale':'0','cell-lightScale':'0','cell-mineralInput':'0'}))await page.fill('#'+id,value);
  await page.selectOption('#cell-soilQuality','1.25');await page.selectOption('#cell-mineralLevel','rich');
  const candidate=await page.evaluate(()=>__LIFE_TEST__.readConfig());
  check(candidate.cellModel==='cell-reorganization/1'&&candidate.cellSettings.aquaticProfile==='freshwater-comparison/1'&&candidate.cellSettings.temperature===17.5&&candidate.cellSettings.soilQuality===1.25,'candidate read preserves model/version and edited environment');
  check(['rainScale','lightScale','mineralInput'].every(k=>candidate.cellSettings[k]===0)&&candidate.producerSupport.enabled===false&&candidate.producerSettings.land.capacityB===20&&candidate.generationSettings.mode==='manual','zeroes and fixed finite-model conditions reach the candidate config');
  check(await page.locator('#setup-effective-summary').textContent().then(t=>t.includes('17.5℃')&&t.includes('光×0')),'effective-condition summary reflects edited environment');
  await page.fill('#cell-landPH','15');check(await page.locator('#cell-landPH').getAttribute('aria-invalid')==='true'&&await page.locator('#show-setup-issue').isVisible(),'invalid pH is identified beside its input');await page.fill('#cell-landPH','6.1');
  await page.click('#lower-initial-settings > summary');await page.click('#reset-lower-settings');check(await page.inputValue('#cell-temperature')==='17.5','lower initial-quantity reset retains the independently chosen climate');
  await page.click('#reset-setup');const reset=await page.evaluate(()=>__LIFE_TEST__.readConfig());
  check(reset.cellModel===candidate.cellModel&&reset.cellSettings.aquaticProfile===candidate.cellSettings.aquaticProfile&&reset.cellSettings.temperature===20&&reset.cellSettings.lightScale===1,'default reset preserves model/water version and resets only candidate climate');
  await page.selectOption('#cell-aquatic-profile','');await page.evaluate(()=>document.getElementById('setup').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));check(await page.evaluate(()=>JSON.stringify(liveCell)===JSON.stringify(setupFixture)),'unselected water condition cannot bypass the creation guard');await page.selectOption('#cell-aquatic-profile','freshwater-comparison/1');
  await page.locator('#cell-environment-settings').screenshot({path:path.join(out,'environment.png')});
  await page.click('#cancel-settings');check(!await page.locator('body').evaluate(e=>e.classList.contains('setup-screen')),'cancel returns to the current observation');
  for(const name of ['system','food','action','birth']){await page.evaluate(name=>__LIFE_TEST__.openGuide(name),name);check(await page.locator('[data-cell-guide="'+name+'"]').count()===1,'new '+name+' sheet replaces conflicting legacy explanations');if(name==='system')await page.locator('#guide').screenshot({path:path.join(out,'system.png')});await page.click('#close-guide');}
  await page.evaluate(()=>__LIFE_TEST__.openGuide('tree'));await page.selectOption('#tree-select','ryouki');check(await page.locator('#guide-content').textContent().then(t=>t.includes('3枠で最大9個体')&&!t.includes('同セル最大3個体')),'ryouki tree explains nine settled individuals without the old per-cell limit');
  await page.selectOption('#tree-select','forestcrown');check(await page.locator('[data-cell-tree-note]').textContent().then(t=>t.includes('10/20/30/40'))&&await page.locator('[data-plant-phase="4"]').count()===6,'plant tree preserves six branches and explains current phase capacities');
  await page.selectOption('#tree-select','freshwaterlight');check(await page.locator('[data-cell-tree-note]').textContent().then(t=>t.includes('4次')&&t.includes('専用')),'mobile producer remains a fourth-layer organism with dedicated physiology');await page.click('#close-guide');
  const after=await page.evaluate(()=>({world:JSON.stringify(liveCell),hash:__LIFE_TEST__.fingerprint(),rows:JSON.stringify(__LIFE_TEST__.observations().snapshot())}));check(JSON.stringify(before)===JSON.stringify(after),'setup edits/reset/cancel/guide leave the actual world, random state and committed record unchanged');
  await page.evaluate(()=>{__LIFE_TEST__.prepare(structuredClone(legacySetupConfig));__LIFE_TEST__.stop();document.getElementById('change-world').click();});
  const restored={environmentHidden:!await page.locator('#cell-environment-settings').isVisible(),modeEnabled:!await page.locator('#observation-mode').isDisabled(),capacityEnabled:!await page.locator('#colony-land-capacity').isDisabled(),supplyChecked:await page.locator('#producer-supply').isChecked()};
  check(Object.values(restored).every(Boolean),'returning to a legacy world restores its normal editable controls and values: '+JSON.stringify(restored));
  check(errors.length===0,'no uncaught browser errors or native popups');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:checks.length,checks,errors,baseline:'70205d1',legacyConfigurations:snapshots,scope:'candidate setup and read-only new-model guides; no public generation or game save claim'},null,2)+'\n');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log(JSON.stringify({passed:checks.length,errors:errors.length,out}));
})().catch(e=>{console.error(e);process.exitCode=1;});
