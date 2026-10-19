'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/ecosystem-panels-v4.2.13');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'current-summary-review',width:40,height:28,initial:80,lineages:'few'});__LIFE_TEST__.stop();});
  check(await page.locator('#inspector-graphs').isVisible(),'default shows graphs, without auto-selecting an individual');
  for(const id of ['graph-stacked','composition-phases','composition-sex','composition-ages','graph-relations','foodweb-diagram','biomass-pyramid'])check(await page.locator('#'+id).isVisible(),'visible '+id);
  check(await page.locator('#graph-species').inputValue()==='main','main organisms default');
  check((await page.locator('#pyramid-support').textContent()).includes('未観測'),'initial flow correctly unobserved');
  const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.evaluate(()=>__LIFE_TEST__.refresh());check(fingerprint===await page.evaluate(()=>__LIFE_TEST__.fingerprint()),'render does not mutate biology');
  await page.locator('#graph-species').selectOption('all');check((await page.locator('#composition-sex').getAttribute('aria-label')).includes('現在'),'absolute composition label');
  await page.locator('#graph-species').selectOption('solar');check(await page.locator('#graph-species').inputValue()==='solar','species selection supported');
  await page.locator('#graph-species').selectOption('main');
  await page.screenshot({path:path.join(out,'screen-initial.png')});await page.locator('#inspector-graphs').screenshot({path:path.join(out,'panels-initial.png')});
  await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);});
  check(await page.locator('#inspector-details').isVisible(),'individual replaces graph area');
  await page.locator('#close-species').click();check(await page.locator('#inspector-graphs').isVisible(),'close restores graphs');
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=3,{},{timeout:30000});await page.evaluate(()=>__LIFE_TEST__.stop());
  check(await page.evaluate(()=>__LIFE_TEST__.observations().rows.length===__LIFE_TEST__.snapshot().world.turn+1),'all turns retained during Worker playback');
  check(await page.locator('#graph-species').inputValue()==='main','target preserved across details and playback');
  check(!(await page.locator('#pyramid-support').textContent()).includes('生産 未観測'),'actual production recorded');
  check(await page.locator('#foodweb-diagram [data-observed=true]').count()>0,'actual confirmed flow displayed');
  await page.screenshot({path:path.join(out,'screen-active.png')});await page.locator('#inspector-graphs').screenshot({path:path.join(out,'panels-active.png')});
  const conservation=await page.evaluate(()=>{const r=__LIFE_TEST__.observations().rows.at(-1),p=r.current.pyramid;return Math.abs(p.biomassTotal-r.current.biomass.total)<1e-8;});check(conservation,'live trophic allocation conserves B');
  await page.setViewportSize({width:820,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow layout has no horizontal overflow');
  check(errors.length===0,'no page errors or native dialogs');await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,errors,scope:'Linux Chromium; exact all-turn series, sidebar and live Worker observations'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
