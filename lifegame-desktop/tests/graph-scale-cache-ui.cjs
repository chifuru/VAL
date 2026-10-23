"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/graph-scale-cache-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const originalApp=require('node:child_process').execFileSync('git',['show','HEAD:lifegame-desktop/src/app.js'],{encoding:'utf8'});
  const server = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(
        "src",
        "." + new URL(req.url, "http://localhost").pathname,
      );
      if (!file.startsWith(path.resolve("src") + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "application/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : file.endsWith(".png")
              ? "image/png"
              : "text/html",
      );
      if(file===path.resolve('src/before-app.js'))res.end(originalApp);
      else if(file===path.resolve('src/Index.html')&&new URL(req.url,'http://localhost').searchParams.has('baseline'))res.end((await fs.readFile(file,'utf8')).replace('<script src="app.js">','<script src="before-app.js">'));
      else res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve,reject) => {server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  const browser = await chromium.launch({
    ...(process.platform === "linux"
      ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
      : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1100 },
    }),
    errors = [],
    external = [],
    checks = [];
  const origin = "http://127.0.0.1:" + server.address().port;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => {
    if (!r.url().startsWith(origin)) external.push(r.url());
  });
  function check(value, label) {
    assert(value, label);
    checks.push(label);
  }

  const crypto=require('node:crypto'),digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
  const compared=[];
  async function capture(baseline){
    await page.goto(origin+'/Index.html?smoke=1'+(baseline?'&baseline=1':''));await page.evaluate(()=>EcoArt.ready);await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{
      __LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'graph-scale-cache',terrainSeed:'graph-scale-cache-terrain',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}});
      if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();for(let i=0;i<3;i++)__LIFE_TEST__.step();
    });
    await page.waitForTimeout(180);
    const result={};
    for(const group of ['main','all','plant']){
      await page.selectOption('#graph-group',group);await page.waitForTimeout(30);
      result[group]=await page.evaluate(()=>{
        const ids=['graph-stacked','composition-phases','composition-sex','composition-ages'];return {canvases:ids.map(id=>{const c=document.getElementById(id);return {id,width:c.width,height:c.height,label:c.getAttribute('aria-label'),pixels:c.toDataURL()};}),relations:document.getElementById('graph-relations').outerHTML,range:document.getElementById('graph-range').textContent,rows:JSON.stringify(__LIFE_TEST__.observations().rows),fingerprint:__LIFE_TEST__.fingerprint()};
      });
    }
    return result;
  }
  try {
    const before=await capture(true),after=await capture(false);
    for(const group of ['main','all','plant']){
      check(JSON.stringify(before[group].canvases)===JSON.stringify(after[group].canvases),'four graph bitmaps, labels and scales match the prior app: '+group);
      check(before[group].relations===after[group].relations&&before[group].range===after[group].range,'relationship SVG and full-period range remain unchanged: '+group);
      check(before[group].rows===after[group].rows&&before[group].fingerprint===after[group].fingerprint,'all recorded values and biological fingerprint match: '+group);
      compared.push({group,canvas_sha256:digest(after[group].canvases),rows_sha256:digest(after[group].rows),range:after[group].range});
    }
    check(errors.length===0,'no uncaught browser exceptions');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,compared,scope:'Linux Chromium actual prior/new app; same small deterministic world through T3 and three graph target groups; not a 300000-turn live simulation'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
