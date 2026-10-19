'use strict';
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(process.env.LIFEGAME_EVIDENCE||'operations/evidence/ecology-guide-v4.2.17');await fs.mkdir(out,{recursive:true});
 const root=path.resolve('src');const server=http.createServer(async(req,res)=>{try{const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.css')?'text/css':f.endsWith('.png')?'image/png':'text/html');let data=await fs.readFile(f);if(f===path.join(root,'app.js'))data=Buffer.from(data.toString().replace('const renderer = R.create($("board"));','const renderer = R.create($("board"));window.__PLANE_R__=renderer;'));res.end(data);}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[],errors=[];
 const check=(v,name)=>{assert(v,name);checks.push(name);};
 try{
  browser=await chromium.launch({...(process.platform==='linux'?{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'}:{}),headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1460,height:1030}});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);




  const config={seed:'guide-ui',width:40,height:28,initial:80,lineages:'manual',selected:['solar','jelly'],landscape:'templates',mapId:'river',ageModel:'life/1',producerSupport:{enabled:true},founderCounts:{version:1,species:{grass:60,algae:40,moss:0,phytoplankton:20,fungus:20,waterbug:30,grassbug:30},parasites:{leafparasite:10,hyperparasite:2}}};
  for(const favored of [true,false]){
    await page.evaluate(c=>{__LIFE_TEST__.prepare(c);__LIFE_TEST__.stop();}, {...config,advantageSettings:{producer:true,waterbug:true,hyperparasite:favored}});
    const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    await page.evaluate(()=>__LIFE_TEST__.openGuide('system'));let text=await page.locator('#guide-content').textContent();
    check(text.includes('3枠')&&!text.includes('同じ餌枠を使います'),'three independent occupancy slots '+favored);check(text.includes('生産者供給')&&text.includes('独立台帳'),'producer support and ledger explained '+favored);check(!text.includes('植物はB3'),'old producer CA removed '+favored);
    await page.evaluate(()=>__LIFE_TEST__.showSheet('action'));text=await page.locator('#guide-content').textContent();check(text.includes('同じターンに行えます')&&!text.includes('1つの合法動作'),'independent movement effect and feeding '+favored);check(text.includes('深水も')&&text.includes('全ての場所への到達を保証'),'crossing and connectivity scope explained '+favored);
    await page.evaluate(()=>__LIFE_TEST__.showSheet('food'));text=await page.locator('#guide-content').textContent();check(text.includes('浮遊微藻')&&text.includes('一次消費者'),'aquatic foodweb and trophic terms '+favored);
    await page.evaluate(()=>__LIFE_TEST__.showSheet('birth'));text=await page.locator('#guide-content').textContent();check(text.includes('相を問わず年齢')&&text.includes('独立'),'age maturity independent of phase '+favored);
    await page.evaluate(()=>__LIFE_TEST__.showSheet('parasite'));text=await page.locator('#guide-content').textContent();check(text.includes(favored?'完全支払い1回':'完全支払い4回')&&text.includes(favored?'更に2回とE0.02':'更に8回とE0.2'),'Q growth matches selected profile '+favored);check(text.includes('2群体を初期配置')&&text.includes('種別指定'),'actual manual Q initial count '+favored);check(text.includes('成熟直後の3ターン')&&text.includes('行動と局所情報'),'limited Q window and behavioral effects '+favored);
    if(favored)await page.screenshot({path:path.join(out,'parasite-guide.png')});
    await page.evaluate(()=>__LIFE_TEST__.showSheet('tree'));await page.selectOption('#tree-select','leafparasite');text=await page.locator('#guide-content').textContent();check(!text.includes('III以上')&&text.includes('成熟主生物'),'P tree uses age maturity '+favored);
    await page.selectOption('#tree-select','hyperparasite');text=await page.locator('#guide-content').textContent();check(text.includes(favored?'完全支払い1回':'完全支払い4回'),'Q tree shares growth conditions '+favored);
    await page.evaluate(()=>__LIFE_TEST__.showSheet('info'));text=await page.locator('#guide-content').textContent();check(text.includes('延長された表現型')&&text.includes('直接書き換えません'),'information leaves DNA and lineages intact '+favored);
    await page.click('#close-guide');check(before===await page.evaluate(()=>__LIFE_TEST__.fingerprint()),'guide operations leave biological state unchanged '+favored);check(await page.locator('#graph-stacked').isVisible(),'return to observation graphs '+favored);
  }
  await page.setViewportSize({width:820,height:900});await page.evaluate(()=>__LIFE_TEST__.openGuide('action'));check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'guide has no horizontal page overflow');
  check(errors.length===0,'no browser errors or native dialogs');await fs.writeFile(path.join(out,'ui-report.json'),JSON.stringify({checks,errors,scope:'Linux Chromium; active-profile guide, age/phase, initial Q, graph return and input invariance'},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,errors}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
