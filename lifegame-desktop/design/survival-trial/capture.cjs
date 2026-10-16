"use strict";
const fs=require("node:fs/promises"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict"),{chromium}=require("playwright");
const root=path.resolve(__dirname,"../.."),out=path.join(root,"operations/evidence/survival-trial-v1");
(async()=>{
 const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader("Content-Type",file.endsWith(".js")?"application/javascript":file.endsWith(".png")?"image/png":file.endsWith(".css")?"text/css":"text/html; charset=utf-8");res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));const origin="http://127.0.0.1:"+server.address().port,browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||(process.platform==="linux"?"/usr/bin/chromium":undefined),args:["--no-sandbox"]});
 try{
  const page=await browser.newPage({viewport:{width:1580,height:1100}}),errors=[],network=[],checks=[];page.on("pageerror",e=>errors.push(String(e)));page.on("request",r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin+"/"))network.push(r.url());});const check=(v,label)=>{assert.ok(v,label);checks.push(label);};
  await page.goto(origin+"/design/survival-trial/index.html");await page.waitForFunction(()=>window.__SURVIVAL_PREVIEW__?.ready);
  const before=await page.evaluate(()=>__SURVIVAL_PREVIEW__.inputSignature());
  check(await page.locator("#scores").textContent().then(s=>s.includes("17")&&s.includes("20")),"standard comparison displays actual main-lineage counts");
  check(await page.locator("#right-caption").textContent().then(s=>s.includes("2185")),"snapshot shows observed parasite colonies rather than invented counts");
  await page.screenshot({path:path.join(out,"comparison.png"),fullPage:true});
  await page.locator("#case-select").selectOption("coverage");check(await page.locator("#host").textContent().then(s=>s.includes("高次Q")),"coverage condition shows a real hyperparasite host");
  await page.locator("#focus").click();check(await page.locator(".control-board").isHidden(),"focused colony observation uses the trial board");
  await page.waitForTimeout(100);await page.screenshot({path:path.join(out,"infection-detail.png"),fullPage:true});
  await page.locator("#focus").click();await page.setViewportSize({width:640,height:1000});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"narrow snapshot view does not overflow horizontally");
  check((await page.evaluate(()=>__SURVIVAL_PREVIEW__.inputSignature()))===before,"case changes, focus and resizing never alter observed worlds");check(!errors.length,"no page exceptions");check(!network.length,"preview makes no external requests");
  const r={ok:true,platform:process.platform,browser:await browser.version(),version:"survival-trial/v1",checks,errors,network,serving:"HTTP loopback",note:"Static observation of actual computed worlds, not an implemented production setting."};await fs.writeFile(path.join(out,"browser.json"),JSON.stringify(r,null,2)+"\n");console.log(JSON.stringify(r));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
