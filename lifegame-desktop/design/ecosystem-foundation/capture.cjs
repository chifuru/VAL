"use strict";
const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'operations/evidence/ecosystem-foundation-v2');
(async()=>{
 const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.png')?'image/png':p.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:1600,height:1160}}),errors=[],network=[],checks=[];page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+'/'))network.push(r.url());});const check=(v,label)=>{assert.ok(v,label);checks.push(label);};
 await page.goto(origin+'/design/ecosystem-foundation/index.html');await page.waitForFunction(()=>window.__FOUNDATION_PREVIEW__?.ready);const before=await page.evaluate(()=>__FOUNDATION_PREVIEW__.signature());
 check(await page.locator('#metrics').textContent().then(t=>t.includes('20/20')&&t.includes('6/6')),'initial screen presents actual configured lineages');
 check(await page.locator('#details').textContent().then(t=>t.includes('主：')&&t.includes('餌：')),'selected cell identifies both independent living slots');
 await page.screenshot({path:path.join(out,'natural-overview.png'),fullPage:true});
 await page.locator('#zoom').click();check(await page.evaluate(()=>__FOUNDATION_PREVIEW__.board.view.scale===48),'zoom resolves overlapping organisms instead of changing occupancy');
 await page.screenshot({path:path.join(out,'layer-detail.png'),fullPage:true});
 const options=await page.locator('#case option').evaluateAll(a=>a.map(x=>x.value));if(options.includes('standard')){await page.locator('#case').selectOption('standard');await page.screenshot({path:path.join(out,'observed-1000.png'),fullPage:true});await page.locator('#zoom').click();await page.screenshot({path:path.join(out,'layer-detail.png'),fullPage:true});check(await page.locator('#turn').textContent().then(t=>t.includes('1000')),'long-run screen displays actual 1000-turn snapshot');}
 if(options.includes('colony')){await page.locator('#case').selectOption('colony');await page.locator('#zoom').click();await page.screenshot({path:path.join(out,'colony-600.png'),fullPage:true});check(await page.locator('#turn').textContent().then(t=>t.includes('600')),'colony candidate is shown separately at its actual observation horizon');}
 await page.locator('#resources').uncheck();await page.locator('#fit').click();await page.setViewportSize({width:640,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow screen has no horizontal overflow');
 check((await page.evaluate(()=>__FOUNDATION_PREVIEW__.signature()))===before,'selection zoom case switching and resource visibility leave snapshots unchanged');check(!errors.length,'no page exceptions');check(!network.length,'no external requests');
 const result={ok:true,version:'foundation/v2',checks,errors,network,platform:process.platform,browser:await browser.version()};await fs.writeFile(path.join(out,'browser.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
