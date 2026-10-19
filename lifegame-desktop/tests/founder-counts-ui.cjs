'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/founder-counts-v4.2.16');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.selectOption('#size','40,28');await page.selectOption('#lineages','few');await page.fill('#initial','80');await page.selectOption('#map-id','river');
  await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.locator('#founder-settings').evaluate(e=>e.open=true);
  check(await page.inputValue('#founder-grass')==='','blank defaults to automatic');
  for(const [id,n]of Object.entries({grass:60,algae:40,moss:0,phytoplankton:20,leafparasite:20,tideparasite:10,hyperparasite:40}))await page.fill('#founder-'+id,String(n));
  await page.screenshot({path:path.join(out,'setup.png'),fullPage:true});
  await page.click('#load');if(await page.locator('#setup-message.error').count())throw Error(await page.locator('#setup-message').textContent());await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'),{},{timeout:10000});
  let snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot()),config=snapshot.world.config;
  check(config.founderCounts.species.moss===0,'explicit zero persists');check(config.founderReport.species.grass.actual===60,'species requested count placed exactly');check(config.founderReport.parasites.leafparasite.actual===20,'P count placed exactly');check(config.founderReport.parasites.hyperparasite.actual===40,'Q searching count placed exactly');
  check(await page.locator('#founder-report').isVisible(),'initial report available');await page.locator('#founder-report').evaluate(e=>e.open=true);
  check((await page.locator('#founder-report-content').textContent()).includes('指定 0体'),'zero shown as requested, not automatic');check((await page.locator('#founder-report-content').textContent()).includes('自動'),'unspecified species shown automatic');
  check((await page.locator('#active-mode').textContent()).includes('種別・寄生初期数：調整あり'),'mode override explained');
  for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages'])check(await page.locator('#'+id).isVisible(),'existing panel preserved '+id);
  await page.locator('#founder-report').evaluate(e=>e.open=false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'screen-active.png')});
  await page.click('#change-world');check(await page.inputValue('#founder-moss')==='0','settings return retains zero');await page.fill('#founder-grass','0');await page.click('#load');
  check((await page.locator('#setup-message').textContent()).includes('第一宿主'),'host shortage appears in current UI');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.founderReport.species.grass.actual)===60,'failed generation preserves prior world');
  await page.fill('#founder-grass','60');await page.fill('#founder-algae','17920');await page.click('#load');check((await page.locator('#setup-message').textContent()).includes('配置可能'),'species capacity failure explains placement');
  await page.fill('#founder-algae','40');await page.click('#load');if(await page.locator('#setup-message.error').count())throw Error(await page.locator('#setup-message').textContent());await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'),{},{timeout:10000});check(await page.inputValue('#founder-algae')==='40','retry succeeds and keeps requested value');
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2,{},{timeout:30000});await page.evaluate(()=>__LIFE_TEST__.stop());snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot());
  const E=require('../src/ecology/observation-model.js').model(snapshot.world.config.advantageSettings);let atomic=E.create(snapshot.world.config);for(let t=0;t<snapshot.world.turn;t++)atomic=E.step(atomic);check(E.fingerprint(atomic)===await page.evaluate(()=>__LIFE_TEST__.fingerprint()),'manual conditions Worker/synchronous exact');
  await page.evaluate(()=>__LIFE_TEST__.finish());const record=(await page.evaluate(()=>__LIFE_TEST__.records())).find(r=>r.schema===2);check(record.config.founderCounts.parasites.hyperparasite===40,'archive keeps effective Q request');
  await page.evaluate(id=>__LIFE_TEST__.replay(id),record.id);await page.waitForFunction(()=>__LIFE_TEST__.snapshot().replay);snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot());check(snapshot.world.config.founderReport.species.grass.actual===60,'replay keeps exact initial report');check(snapshot.world.searchQ.length===40,'replay regenerates searching Q count');
  await page.click('#change-world');await page.fill('#founder-grass','99');await page.click('#cancel-settings');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.founderCounts.species.grass)===60,'cancel leaves committed initial settings untouched');
  await page.click('#change-world');await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.click('#reset-lower-settings');check(await page.inputValue('#founder-grass')==='','reset restores automatic');check(await page.inputValue('#founder-moss')==='','reset removes explicit zero');
  await page.setViewportSize({width:820,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'new settings fit narrow viewport');
  await page.click('#load');if(await page.locator('#setup-message.error').count())throw Error(await page.locator('#setup-message').textContent());await page.waitForFunction(()=>!document.body.classList.contains('setup-screen'),{},{timeout:10000});check(!(await page.evaluate(()=>__LIFE_TEST__.snapshot())).world.config.founderCounts,'all blank omits new biological config');check(await page.locator('#founder-report').isHidden(),'old conditions do not retain stale manual report');
  check(errors.length===0,'no browser errors or native dialogs');await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,errors,scope:'Linux Chromium; founder inputs, exact placement, Worker, archive/replay, cancel/failure/retry'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
