"use strict";
const {chromium}=require('playwright'),assert=require('node:assert/strict'),
 fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/map-ui');await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{
  const file=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],external=[],checks=[];
 const origin='http://127.0.0.1:'+server.address().port;
 page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(origin))external.push(r.url());});
 function check(value,label){assert(value,label);checks.push(label);}
 try{
  await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);await page.evaluate(()=>localStorage.clear());
  await page.selectOption('#size','40,28');await page.locator('#advanced-settings').evaluate(e=>e.open=true);await page.selectOption('#lineages','few');
  await page.fill('#seed','biology-ui');await page.fill('#terrain-seed','terrain-ui');
  for(const id of ['river','lake','wetland','ridge','woodland','basin']){
   await page.selectOption('#map-id',id);await page.click('#load');
   check(await page.evaluate(id=>__LIFE_TEST__.snapshot().world.config.mapResolved.id===id,id),id+' selected from actual form');
   check(await page.locator('#map-summary').isVisible() && (await page.textContent('#map-summary')).includes('地形版'),id+' resolved map identity is visible');
   check(await page.evaluate(()=>EcoEngine.invariants(__LIFE_TEST__.snapshot().world).length===0),id+' valid world');
   await page.locator('#board').screenshot({path:path.join(out,id+'.png')});
  }
  const terrain=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.mapResolved.terrainHash);
  const beforeEdit=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  await page.fill('#seed','biology-ui-2');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===beforeEdit,'editing pending settings leaves loaded world unchanged');
  await page.click('#load');check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.mapResolved.terrainHash)===terrain,'biology seed change keeps exact terrain');
  await page.fill('#terrain-seed','terrain-ui-2');await page.click('#load');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.mapResolved.terrainHash)!==terrain,'terrain seed changes allowed obstacle pattern');
  await page.click('#open-guide');await page.click('[data-sheet="system"]');
  check((await page.textContent('#guide-content')).includes('地形用初期値'),'system sheet explains separate terrain and biology seeds');await page.click('#close-guide');
  const initial=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#detail-view');await page.click('#fit');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===initial,'near and overview do not alter world');
  await page.screenshot({path:path.join(out,'overview.png'),fullPage:true});
  await page.click('#detail-view');await page.screenshot({path:path.join(out,'detail.png'),fullPage:true});
  await page.evaluate(()=>{for(let i=0;i<20;i++)__LIFE_TEST__.step();});
  const final=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.click('#finish-run');
  check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'explicit finish stores exactly one record');
  check(await page.evaluate(()=>{const c=__LIFE_TEST__.records()[0].config;return !!(c.mapResolved.dataHash&&c.mapResolved.terrainHash&&c.terrainSeed&&c.seed);}), 'record includes map version hashes and both seeds');
  await page.click('#open-results');await page.click('[data-replay]');await page.evaluate(()=>{for(let i=0;i<20;i++)__LIFE_TEST__.step();});
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===final,'map replay reproduces exact terminal fingerprint');
  check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'replay creates no result');
  await page.evaluate(()=>{const key=EcoArchive.KEY,rows=JSON.parse(localStorage.getItem(key));rows[0].config.mapResolved.terrainHash='corrupt';localStorage.setItem(key,JSON.stringify(rows));});
  await page.click('#open-results');await page.click('[data-replay]');
  check((await page.textContent('#results-error')).includes('指紋'),'tampered map fingerprint is rejected with visible reason');
  await page.click('#close-results');await page.setViewportSize({width:640,height:1000});await page.screenshot({path:path.join(out,'narrow.png'),fullPage:true});
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow viewport has no horizontal overflow');
  check(errors.length===0,'no browser exceptions');check(external.length===0,'no external requests');
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,external,platform:process.platform},null,2)+'\n');console.log(JSON.stringify({ok:true,checks},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
