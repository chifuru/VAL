'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve('src'),out=path.resolve('operations/evidence/cell-finish-ui-v1'),checks=[],errors=[],pictures=[];
 await fs.mkdir(out,{recursive:true});const check=(v,label)=>{assert(v,label);checks.push(label);};let browser,success=false,initialConfig,final,layout;
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1500,height:1050}});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('native '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(async()=>{await EcoArt.ready;await document.fonts.ready;});
  // Keep the diagnostic hook while capturing the normal product toolbar.
  await page.locator('#step').evaluate(e=>{e.hidden=true;});
  check(await page.inputValue('#cell-model-mode')==='legacy','legacy remains the default');
  await page.selectOption('#size','40,28');await page.selectOption('#lineages','few');await page.fill('#initial','84');await page.selectOption('#map-id','river');await page.selectOption('#cell-model-mode','cell');
  check(await page.locator('#load').isDisabled(),'cell mode requires explicit aquatic conditions');await page.selectOption('#cell-aquatic-profile','freshwater-comparison/1');await page.click('#load');
  await page.waitForFunction(()=>!document.body.classList.contains('setup-screen')||document.getElementById('setup-message').classList.contains('error'));
  check(!await page.locator('body').evaluate(e=>e.classList.contains('setup-screen')),'real form creates the comparison world');
  initialConfig=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config);check(initialConfig.cellModel==='cell-reorganization/1'&&initialConfig.cellSettings.aquaticProfile==='freshwater-comparison/1','explicit finite model and water profile reach the world');
  const ready=()=>page.waitForFunction(()=>{__LIFE_TEST__.draw();return !__LIFE_TEST__.snapshot().render.terrainPending;},null,{timeout:20000});
  const state=()=>page.evaluate(()=>{const T=__LIFE_TEST__,s=T.snapshot();return {turn:s.world.turn,rows:T.observations().rows.length,fingerprint:T.fingerprint(),running:s.running,holds:s.holds,fault:s.faultKind,replay:s.replay,records:T.records().length};});
  const advance=async turn=>{await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t||__LIFE_TEST__.snapshot().faultKind,turn,{timeout:25000});check(!(await state()).fault,'normal observation advances without a fault');};
  const clickMain=async()=>{
   await page.locator('#board').scrollIntoViewIfNeeded();
   const point=await page.evaluate(()=>{const T=__LIFE_TEST__,s=T.snapshot(),b=document.getElementById('board').getBoundingClientRect();for(const o of s.world.organisms.filter(o=>o.slot==='main')){const p=T.screenForCell(o.cell,o.id);if(p[0]>4&&p[1]>4&&p[0]<b.width-4&&p[1]<b.height-4)return {x:b.left+p[0],y:b.top+p[1]};}throw Error('No visible main organism');});
   await page.mouse.click(point.x,point.y);check(await page.evaluate(()=>!!__LIFE_TEST__.snapshot().selectedId),'canvas click selects a visible biological ID');
  };
  await page.click('#fit');await ready();await page.click('#start');await advance(1);check((await state()).running&&!(await state()).replay,'ordinary generated world runs without replay');
  await clickMain();await page.click('#inspector-tab-key');await page.locator('.map-key-extra > summary').click();for(const id of ['names-P','grid']){const checked=await page.locator('#'+id).isChecked();await page.locator('#'+id).setChecked(!checked);await page.locator('#'+id).setChecked(checked);}
  const operating=await state();check(operating.running&&operating.holds.length===0,'canvas selection and display toggles keep the same world running');await advance(operating.turn);
  await page.click('#start');const paused=await state();await page.waitForTimeout(300);check(!paused.running&&JSON.stringify(await state())===JSON.stringify(paused),'explicit pause preserves committed turn, graph rows and fingerprint');
  await page.click('#inspector-tab-key');await page.click('#fit');await ready();await page.screenshot({path:path.join(out,'far.png'),fullPage:true});pictures.push('far.png');
  await clickMain();await page.click('#detail-view');await ready();await page.screenshot({path:path.join(out,'near.png'),fullPage:true});pictures.push('near.png');
  layout=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,panels:['#board','#inspector-graphs','#biomass-pyramid','#current-donut','#inspector-details'].map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {selector,visible:!!e.getClientRects().length,x:r.x,y:r.y,width:r.width,height:r.height};})}));
  check(layout.panels.every(p=>p.visible&&p.width>0&&p.height>0),'map, graphs, pyramid, donut and selected detail have visible bounds');
  check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.render.mode==='detail'&&!s.view.simplified;}),'near view uses the existing detailed rendering');
  await page.click('#start');await advance(paused.turn);await page.click('#change-world');const held=await state();check(held.holds.includes('settings'),'entering settings holds observation');
  check(await page.locator('#message').textContent().then(t=>t.includes('新しい世界を作れます')&&!t.includes('準備中')),'settings return describes available recreation instead of an obsolete preparation warning');
  await page.fill('#initial','88');await page.waitForTimeout(300);const editing=await state();check(editing.turn===held.turn&&editing.rows===held.rows&&editing.fingerprint===held.fingerprint,'editing candidate settings preserves the committed world and graph history');
  await page.click('#cancel-settings');check((await state()).running&&(await state()).holds.length===0,'cancel returns to the previously running observation');await advance(held.turn);
  await page.click('#start');final=await state();check(!final.running&&final.rows===final.turn+1&&final.records===0,'final pause keeps every committed graph row without automatically saving');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.initial)===initialConfig.initial,'cancel does not apply the edited initial count');
  check(errors.length===0,'no uncaught browser errors or native dialogs');success=true;
 }finally{
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({success,checks,errors,initialConfig,final,layout,pictures,scope:'One real generated comparison world, ordinary Worker progression, short UI workflow. No 500-turn or Windows verification.'},null,2)+'\n');
  if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
