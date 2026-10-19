'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/initial-supply-v4.2.14');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  check(await page.locator('#producer-supply').isChecked(),'new UI defaults to producer support');
  await page.locator('#producer-supply').uncheck();check(await page.locator('#supply-land-nutrition').isDisabled(),'disabled support inputs do not participate in validation');await page.locator('#producer-supply').check();
  await page.selectOption('#size','40,28');await page.selectOption('#lineages','few');await page.fill('#initial','80');await page.selectOption('#map-id','river');
  await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.fill('#density-plant','20');await page.fill('#density-fungus','2');await page.fill('#density-prey','10');await page.fill('#resource-info','0');await page.selectOption('#lower-distribution','cluster');
  await page.locator('#producer-supply-settings details').evaluate(e=>e.open=true);await page.fill('#supply-water-nutrition','0.8');
  await page.screenshot({path:path.join(out,'setup.png'),fullPage:true});
  await page.click('#load');await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'));
  let snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(snapshot.world.config.producerSupport.enabled,'support applied');check(snapshot.world.config.producerSupport.water.nutrition===.8,'water setting applied independently');check(snapshot.world.config.initialConditions.density.plant===.2,'direct density applied');check(snapshot.world.config.initialReport.resources.info===0,'zero initial information respected');
  check((await page.locator('#active-mode').textContent()).includes('生産者供給あり'),'effective support explained');check((await page.locator('#active-mode').textContent()).includes('実数/目標'),'actual placement explained');check((await page.locator('#active-mode').textContent()).includes('調整あり'),'manual overrides distinguished from baseline');
  for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages'])check(await page.locator('#'+id).isVisible(),'existing panel preserved '+id);
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2,{},{timeout:30000});await page.evaluate(()=>__LIFE_TEST__.stop());snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(snapshot.world.ledger.producerE>0,'Worker applies accounted external input');
  const E=require('../src/ecology/observation-model.js').model(snapshot.world.config.advantageSettings);let atomic=E.create(snapshot.world.config);for(let t=0;t<snapshot.world.turn;t++)atomic=E.step(atomic);check(E.fingerprint(atomic)===await page.evaluate(()=>__LIFE_TEST__.fingerprint()),'Worker and synchronous model reproduce exact state');
  await page.screenshot({path:path.join(out,'screen-active.png')});
  const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#change-world');check(await page.locator('#producer-supply').isChecked(),'return retains effective support');await page.fill('#density-prey','5');await page.click('#cancel-settings');check(before===await page.evaluate(()=>__LIFE_TEST__.fingerprint()),'cancel preserves observed world');
  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'legacy-ui',width:40,height:28,initial:80,lineages:'few'});__LIFE_TEST__.stop();});check(!await page.locator('#producer-supply').isChecked(),'legacy missing support is displayed OFF');check((await page.locator('#active-mode').textContent()).includes('生産者供給なし'),'legacy OFF described');
  await page.click('#change-world');await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.fill('#density-plant','90');await page.fill('#density-fungus','10');await page.click('#load');check(await page.locator('#setup-message').isVisible(),'invalid density remains visible within current UI');check((await page.locator('#setup-message').textContent()).includes('95%'),'actionable combined density error');
  await page.click('#reset-lower-settings');await page.click('#load');await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'));check(!(await page.evaluate(()=>__LIFE_TEST__.snapshot())).world.config.producerSupport.enabled,'retry with support OFF succeeds');
  await page.click('#change-world');await page.setViewportSize({width:820,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'setup has no horizontal overflow');
  check(errors.length===0,'no browser errors or native dialogs');await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,errors,scope:'Linux Chromium; settings, Worker, legacy OFF, cancel/failure/retry'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
