'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/interaction-audit-v4.2.18');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'interaction-ui',width:40,height:28,initial:80,lineages:'manual',selected:['solar','jelly'],landscape:'templates',mapId:'river',ageModel:'life/1'});__LIFE_TEST__.stop();for(let i=0;i<3;i++)__LIFE_TEST__.step();});
  let snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot());const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  check((await page.locator('#foodweb-leaders').textContent()).includes('戦闘で倒した数'),'combat leader has distinct label');check((await page.locator('#foodweb-leaders').textContent()).includes('動物の死骸から得た栄養'),'animal remains has distinct label');check(!(await page.locator('#foodweb-leaders').textContent()).includes('捕食で優勢'),'misleading live-feed dominance removed');check((await page.locator('#foodweb-leaders').textContent()).includes('一次寄生の多い組合せ'),'current parasite bonds retained');
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=5,{},{timeout:30000});await page.evaluate(()=>__LIFE_TEST__.stop());snapshot=await page.evaluate(()=>__LIFE_TEST__.snapshot());const E=require('../src/ecology/observation-model.js').model(snapshot.world.config.advantageSettings);let atomic=E.create(snapshot.world.config);for(let t=0;t<snapshot.world.turn;t++)atomic=E.step(atomic);check(E.fingerprint(atomic)===await page.evaluate(()=>__LIFE_TEST__.fingerprint()),'real Worker and synchronous biology agree');
  const raw=await page.evaluate(()=>__LIFE_TEST__.observations().snapshot());check(raw.definitions.combat==='combat-observed/1','combat metric version recorded');check(raw.rows.every(r=>r.combatKills!==undefined),'all turns include measured combat zero or counts');
  await page.evaluate(()=>__LIFE_TEST__.finish());const record=(await page.evaluate(()=>__LIFE_TEST__.records())).find(r=>r.schema===2);check(!!record,'new result saved');
  await page.click('#open-results');await page.locator(`[data-analyze="${record.id}"]`).click();await page.waitForSelector('#results-analysis:not([hidden])');check((await page.locator('#foodweb-leaders').textContent()).includes('戦闘で倒した数'),'saved analysis displays same metric');
  let download=page.waitForEvent('download');await page.click('#export-record');const resultFile=await download;await resultFile.saveAs(path.join(out,'saved-result.json'));const saved=JSON.parse(await fs.readFile(path.join(out,'saved-result.json'),'utf8'));check(JSON.stringify(saved.observation.rows)===JSON.stringify(raw.rows),'saved all-turn metrics match original raw rows');
  await page.click('#close-results');check(await page.locator('#graph-stacked').isVisible(),'analysis returns to live graph');
  // Render-only fixtures exercise positive, tied and legacy missing metrics without claiming biological events.
  await page.evaluate(()=>{const row=__LIFE_TEST__.observations().rows.at(-1);row.current.pyramid.leaders.combat=[{id:'solar',name:'日輪',value:2}];row.current.pyramid.leaders.scavenging=[{id:'jelly',name:'浮遊傘',value:3.5}];__LIFE_TEST__.refresh();});let label=await page.locator('#foodweb-leaders').textContent();check(label.includes('日輪 2体')&&label.includes('浮遊傘 3.5 E'),'positive rendering retains different units');await page.screenshot({path:path.join(out,'leaders-render-fixture.png')});
  await page.evaluate(()=>{const row=__LIFE_TEST__.observations().rows.at(-1);delete row.current.pyramid.leaders.combat;delete row.current.pyramid.leaders.scavenging;__LIFE_TEST__.refresh();});label=await page.locator('#foodweb-leaders').textContent();check(label.includes('戦闘で倒した数：未記録')&&label.includes('動物の死骸から得た栄養：未記録'),'legacy missing values are never fabricated zero');
  await page.setViewportSize({width:820,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'expanded role text fits narrow page');check(errors.length===0,'no errors');
  check(errors.length===0,'no browser errors or native dialogs');await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,errors,scope:'Linux Chromium; Worker, all-turn metrics, saved real history; explicit synthetic UI fixtures for positive and missing values'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
