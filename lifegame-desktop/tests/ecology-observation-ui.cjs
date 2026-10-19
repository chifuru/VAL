'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/ecology-observation-v4.1');await fs.mkdir(out,{recursive:true});
 const server=http.createServer(async(req,res)=>{try{const f=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(path.resolve('src')+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(f));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 function check(v,name){assert(v,name);checks.push(name);}
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1600,height:1100},acceptDownloads:true});page.on('pageerror',e=>{errors.push(String(e));console.error('PAGEERROR',String(e));});
  const origin='http://127.0.0.1:'+server.address().port;await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  check(await page.locator('#seed').isHidden()&&await page.locator('#terrain-seed').isHidden(),'internal seeds hidden in setup');
  await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'observation-ui41',width:40,height:28,initial:80,lineages:'few'}));
  check(await page.locator('#setup').isHidden(),'setup cannot be edited during observation');
  check(await page.locator('[data-highlight]').count()===31,'all 31 species including phytoplankton and parasites can be selected');
  await page.locator('[data-highlight="hyperparasite"]').check();await page.locator('[data-describe="hyperparasite"]').click();
  check(await page.locator('#species-info').isVisible(),'Q has its own explanation');await page.click('#close-species');
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1,{},{timeout:20000});
  await page.dispatchEvent('#board','wheel',{deltaY:-40,clientX:400,clientY:600});
  await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();__LIFE_TEST__.select(s.world.organisms[0].cell,s.world.organisms[0].id);});
  await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2,{},{timeout:20000});
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running&&!__LIFE_TEST__.snapshot().holds.length),'map and detail operations do not pause ecology');
  await page.click('#follow-individual');
  check(await page.evaluate(()=>!!__LIFE_TEST__.snapshot().followId),'explicit individual camera tracking');
  await page.click('#start');const stopped=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);await page.waitForTimeout(1200);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn)===stopped,'manual pause freezes ecological time');
  await page.click('#zoom-in');await page.locator('[data-highlight="grass"]').check();
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.highlights.includes('grass')),'highlight and camera remain operable while paused');
  await page.evaluate(()=>{for(let i=0;i<125;i++)__LIFE_TEST__.step();});
  check(await page.evaluate(()=>__LIFE_TEST__.observations().rows.length===__LIFE_TEST__.snapshot().world.turn+1),'graph keeps all records beyond former 121-point limit');
  await page.click('#close-species');
  await page.locator('.graph-analysis > summary').click();
  await page.locator('#graph-turn').fill('0');await page.locator('#graph-turn').dispatchEvent('input');
  check((await page.locator('#graph-readout').textContent()).includes('参照 0T'),'exact initial turn remains selectable');
  const download=page.waitForEvent('download');await page.click('#export-observation');const d=await download;await d.saveAs(path.join(out,'all-turns.csv'));
  const csv=await fs.readFile(path.join(out,'all-turns.csv'),'utf8');check(csv.includes('"0","population"')&&csv.includes('observation/4.1'),'CSV contains exact turn zero and reproducible conditions');
  await page.locator('#graphs-panel').screenshot({path:path.join(out,'graphs.jpg'),type:'jpeg',quality:87});
  await page.click('#fit');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'overview.jpg'),type:'jpeg',quality:87});
  await page.click('#detail-view');await page.locator('#board').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'detail.jpg'),type:'jpeg',quality:87});
  await page.click('#change-world');check(await page.locator('#setup').isVisible(),'return to initial setup is a real navigation');
  await page.click('#cancel-settings');check(await page.locator('#setup').isHidden(),'return from setup preserves the existing observation');
  check(!errors.length,'no browser runtime errors');
  await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({checks,errors,turn:stopped,scope:'Linux Chromium; no Windows claim'},null,2));console.log(JSON.stringify({passed:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
