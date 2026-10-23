"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/graph-idle-updates-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const originalApp=require('node:child_process').execFileSync('git',['show','9ca2144:lifegame-desktop/src/app.js'],{encoding:'utf8'});
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
  await page.addInitScript(()=>{window.graphPaintCount=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='graph-stacked')graphPaintCount++;return clear.apply(this,args);};});
  const origin = "http://127.0.0.1:" + server.address().port;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("request", (r) => {
    if (!r.url().startsWith(origin)) external.push(r.url());
  });
  function check(value, label) {
    assert(value, label);
    checks.push(label);
  }


  const measurements={};
  const reset=()=>page.evaluate(()=>{graphPaintCount=0;});
  const count=()=>page.evaluate(()=>graphPaintCount);
  const state=()=>page.evaluate(()=>({rows:JSON.stringify(__LIFE_TEST__.observations().rows),hash:__LIFE_TEST__.fingerprint(),pixels:['graph-stacked','composition-phases','composition-sex','composition-ages'].map(id=>document.getElementById(id).toDataURL())}));
  async function enter(baseline){
    await page.goto(origin+'/Index.html?smoke=1'+(baseline?'&baseline=1':''));await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{
      window.idleConfig={...__LIFE_TEST__.readConfig(),seed:'graph-idle',terrainSeed:'graph-idle-terrain',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      __LIFE_TEST__.prepare(idleConfig);if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();__LIFE_TEST__.step();
    });await page.waitForTimeout(180);
  }
  async function selectSeveral(){await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;for(const o of w.organisms.filter(o=>o.slot==='main').slice(0,3))__LIFE_TEST__.select(o.cell,o.id);});await page.waitForTimeout(100);}
  async function closeList(){await page.click('#open-results');await page.locator('#results').waitFor({state:'visible'});await page.waitForTimeout(80);await reset();await page.click('#close-results');await page.waitForTimeout(150);return count();}
  try{
    await enter(true);await reset();await selectSeveral();measurements.before={selectionPaints:await count(),listClosePaints:await closeList()};
    check(measurements.before.selectionPaints>=3&&measurements.before.listClosePaints>=2,'prior app repaints unchanged graphs for individual selection and twice for an analysis-free dialog close');
    await enter(false);const before=await state();await reset();await selectSeveral();measurements.after={selectionPaints:await count(),listClosePaints:await closeList()};
    check(measurements.after.selectionPaints===0,'selecting three individuals does not repaint unchanged period graphs');
    check(measurements.after.listClosePaints===0,'closing a results list without analysis does not redraw hidden or unchanged graphs');
    check(JSON.stringify(await state())===JSON.stringify(before),'selection and list-close optimization preserve all graph pixels, recorded rows and biology');
    const paints=await count();await page.waitForTimeout(160);check(await count()===paints,'settled paused view does not repeatedly paint the graphs');
    await reset();await page.selectOption('#graph-group','all');check(await count()>0&&await page.inputValue('#graph-species')==='all','explicit target change still redraws the selected aggregate');
    await reset();await page.evaluate(()=>__LIFE_TEST__.step());check(await count()>0&&await page.locator('#graph-range').textContent()==='0–2T','a newly committed turn still updates the complete period');
    await reset();await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(180);
    check(await count()>0&&await page.locator('#graph-stacked').evaluate(c=>Math.abs(c.width/c.height-c.clientWidth/c.clientHeight)<.04),'paused layout resize still repaints an undistorted graph');
    const live=await state();await page.evaluate(async()=>{const a=__LIFE_TEST__.archive(),s=__LIFE_TEST__.snapshot(),h=__LIFE_TEST__.observations();await a.save(a.capture(s.world,'user-ended',h.snapshot()),'normal');});
    await page.click('#open-results');await page.locator('[data-analyze]').first().click();await page.locator('#results-analysis').waitFor({state:'visible'});
    check(await page.locator('#results-analysis #graphs-panel').isVisible(),'saved-result analysis still receives and draws its graphs');
    await page.selectOption('#graph-group','main');await page.click('#close-results');await page.waitForTimeout(180);
    check(await page.inputValue('#graph-species')==='all'&&await page.locator('.observation-overview #graphs-panel').isVisible()&&JSON.stringify(await state())===JSON.stringify(live),'actual analysis close restores live target, layout, graph pixels and values');
    await reset();await page.evaluate(()=>document.getElementById('results').dispatchEvent(new Event('close')));await page.waitForTimeout(80);check(await count()===0,'a repeated close callback is harmless and does not redraw restored graphs');
    await page.evaluate(()=>__LIFE_TEST__.prepare({...idleConfig,seed:'graph-idle-new',terrainSeed:'graph-idle-new-terrain'}));await page.waitForTimeout(120);check(await page.locator('#graph-range').textContent()==='0–0T','a new world refreshes graphs even with the same target');
    await page.click('#start');const turn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);await selectSeveral();await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,turn,{timeout:20000});check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.running&&!s.holds.length&&!s.playbackError;}),'actual Worker observation continues while selecting individuals');await page.evaluate(()=>__LIFE_TEST__.stop());
    check(errors.length===0,'no uncaught browser or layout errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,measurements,scope:'Linux Chromium small deterministic world, actual selection/list/analysis/resize controls and fresh real-Worker run'},null,2));console.log(JSON.stringify({ok:true,checks,measurements}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,measurements,error:String(error)},null,2));throw error;}
  finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
