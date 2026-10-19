'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'artifacts/current-summary');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'current-summary-review',width:40,height:28,initial:80,lineages:'few'});__LIFE_TEST__.stop();});
  check(await page.locator('#current-donut').isVisible(),'current composition ring visible');
  check(await page.locator('#population-trend').count()===0,'old redundant trend graph removed');
  const box=await page.locator('.current-summary').boundingBox(),ring=await page.locator('.current-composition').boundingBox(),reading=await page.locator('.current-reading').boundingBox();
  check(ring.x<reading.x&&Math.abs(ring.y-reading.y)<40,'reference left ring and right interpretation retained');
  check(await page.locator('.current-reading dt').allTextContents().then(a=>a.join('/')==='広がり/多様さ/持続性'),'all three original labels retained');
  check(await page.locator('.current-summary progress,.current-summary input[type=range]').count()===0,'no three metric bars reintroduced');
  for(const key of ['breadth','diversity','persistence']){
    check((await page.locator('#current-'+key).textContent()).length>0,'interpretive sentence '+key);
    check((await page.locator('#current-'+key+'-values').textContent()).length>0,'supporting number or unobserved reason '+key);
    check(await page.locator('#current-'+key+'-values').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)<parseFloat(getComputedStyle(e.previousElementSibling).fontSize)),'subordinate readable evidence '+key);
  }
  check((await page.locator('#current-persistence-values').textContent()).includes('判定待ち'),'initial continuity not falsely zero or established');
  check(await page.locator('#current-legend span').count()===6,'six category legend');
  check(await page.locator('.metrics').isVisible(),'existing count row preserved');
  const fingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.evaluate(()=>{__LIFE_TEST__.refresh();__LIFE_TEST__.draw();});check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===fingerprint,'summary rendering does not mutate biology');
  await page.locator('.current-summary').screenshot({path:path.join(out,'summary-current.png')});await page.screenshot({path:path.join(out,'screen-current.png')});
  await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=2,{},{timeout:20000});await page.evaluate(()=>__LIFE_TEST__.stop());
  check((await page.locator('#current-breadth-values').textContent()).includes('T'),'evidence period updates during real Worker playback');
  check(await page.evaluate(()=>__LIFE_TEST__.observations().rows.length===__LIFE_TEST__.snapshot().world.turn+1),'all turns retained during playback');
  await page.locator('.current-summary').screenshot({path:path.join(out,'summary-active.png')});
  await page.setViewportSize({width:820,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow layout does not overflow horizontally');await page.locator('.current-summary').screenshot({path:path.join(out,'summary-narrow.png')});
  check(errors.length===0,'no browser errors');await fs.writeFile(path.join(out,'report.json'),JSON.stringify({checks,errors,scope:'Linux Chromium; current summary only; lower relation diagram/pyramid not implemented'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
