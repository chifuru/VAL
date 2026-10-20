"use strict";
const fs=require("node:fs/promises"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict"),{chromium}=require("playwright");
(async()=>{
  const root=path.resolve("src"),out=__dirname,missing=[],runs=[];let favicon204=false,browser;
  const server=http.createServer(async(req,res)=>{const name=new URL(req.url,"http://localhost").pathname;if(favicon204&&name==="/favicon.ico")return res.writeHead(204).end();try{const file=path.resolve(root,"."+name);if(!file.startsWith(root+path.sep))return res.writeHead(403).end();res.setHeader("Content-Type",file.endsWith(".js")?"application/javascript":file.endsWith(".css")?"text/css":file.endsWith(".png")?"image/png":"text/html");res.end(await fs.readFile(file));}catch{missing.push({path:name,favicon204});res.writeHead(404).end();}});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    browser=await chromium.launch({headless:true,executablePath:"/usr/bin/chromium",args:["--no-sandbox"]});
    for(const fixed of [false,true]){
      favicon204=fixed;const page=await browser.newPage({viewport:{width:1460,height:1030}}),errors=[],consoleErrors=[];page.on("pageerror",e=>errors.push(String(e)));page.on("console",m=>{if(m.type()==="error")consoleErrors.push({text:m.text(),url:m.location().url});});
      await page.goto("http://127.0.0.1:"+server.address().port+"/Index.html?smoke=1");await page.evaluate(()=>EcoArt.ready);await page.waitForTimeout(500);
      if(fixed){await page.evaluate(()=>{const c=__LIFE_TEST__.readConfig();__LIFE_TEST__.prepare({...c,seed:"i11/runtime/console-recheck",terrainSeed:"i11/runtime/console-recheck",width:40,height:28,initial:16,lineages:"manual",selected:["solar"],generationSettings:{version:"diverse-generation-parameters/1",mode:"manual",profile:"standard",locks:[]}});});await page.click("#start");await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=3,null,{timeout:65000});await page.evaluate(()=>__LIFE_TEST__.stop());}
      const state=await page.evaluate(()=>({signature:EcoReplayVersion,loaded:EcoArt.loaded,artErrors:EcoArt.errors,turn:__LIFE_TEST__.snapshot().world?.turn,rows:__LIFE_TEST__.snapshot().observationTurns}));runs.push({favicon204:fixed,errors,consoleErrors,state});await page.close();
    }
    assert(runs[0].errors.length===0&&runs[0].consoleErrors.length===1&&runs[0].consoleErrors[0].url.endsWith("/favicon.ico"));assert(missing.every(r=>r.path==="/favicon.ico"));assert(runs[1].errors.length===0&&runs[1].consoleErrors.length===0&&runs[1].state.loaded&&runs[1].state.artErrors.length===0&&runs[1].state.rows===runs[1].state.turn+1);
    await fs.writeFile(path.join(out,"console-recheck.json"),JSON.stringify({passed:true,runs,missing,scope:"Same frozen app, no product-source changes; first reproduce404URL, then favicon204 harness and a real3T Worker run. The500T equality/performance evidence remains the original run, not this3T check."},null,2)+"\n");
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
