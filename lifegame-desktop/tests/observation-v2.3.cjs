'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/observation-v2.3');await fs.mkdir(out,{recursive:true});
 const server=require('node:http').createServer(async(req,res)=>{try{const file=path.resolve('src','.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(path.resolve('src')+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const check=(v,n)=>{assert(v,n);checks.push(n);};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
  await page.evaluate(()=>{localStorage.clear();__LIFE_TEST__.prepare({seed:'observation-detail',width:40,height:28,initial:80});});
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.landscape==='templates'),'app uses the versioned authored map');
  const initial=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  await page.click('#detail-view');await page.waitForTimeout(120);
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().view.scale===160),'near view uses 160 pixels per real cell');
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===initial,'zoom never changes biology');
  await page.click('#fit');await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'overview.png'),fullPage:true});
  await page.evaluate(()=>{for(let i=0;i<90;i++)__LIFE_TEST__.step();});
  const turn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn),fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
  check(await page.evaluate(()=>__LIFE_TEST__.records().length===0),'ordinary pause and steps do not save intermediate results');
  check(await page.evaluate(()=>EcoEngine.invariants(__LIFE_TEST__.snapshot().world).length===0),'authored-map world respects occupancy and finite budgets after 90 turns');
  await page.click('#fit');await page.waitForTimeout(120);await page.screenshot({path:path.join(out,'overview.png'),fullPage:true});
  await page.click('#detail-view');await page.waitForTimeout(150);await page.screenshot({path:path.join(out,'detail.png'),fullPage:true});
  await page.click('#finish-run');check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'explicit finish saves one final result');
  await page.click('#open-results');await page.screenshot({path:path.join(out,'results.png'),fullPage:true});
  await page.click('[data-replay]');
  check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn===0&&__LIFE_TEST__.snapshot().replay),'record starts from turn zero in replay mode');
  check(await page.evaluate(()=>{try{__LIFE_TEST__.prepare({width:0});}catch{}return __LIFE_TEST__.snapshot().replay&&__LIFE_TEST__.snapshot().world.turn===0;}),'invalid setup cannot promote a replay into a recordable normal run');
  await page.evaluate(n=>{for(let i=0;i<n;i++)__LIFE_TEST__.step();},turn);
  check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'replay reaches identical final biological fingerprint');
  check(await page.evaluate(()=>__LIFE_TEST__.records().length===1&&__LIFE_TEST__.snapshot().ended),'replay completion adds no record');
  await page.click('#reset');await page.evaluate(()=>__LIFE_TEST__.step());await page.click('#finish-run');
  check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'replay restart and early finish add no records');
  await page.reload();check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'final record persists across app page reload');
  check(errors.length===0,'no browser exceptions');
  await fs.writeFile(path.join(out,'observation.json'),JSON.stringify({ok:true,checks,turn,fingerprint,errors},null,2)+'\n');console.log(JSON.stringify({ok:true,checks}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
