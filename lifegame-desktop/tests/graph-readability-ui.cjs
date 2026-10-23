"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/graph-readability-v1",
  );
  await fs.mkdir(out, { recursive: true });
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
      res.end(await fs.readFile(file));
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
  const preflight=process.env.GRAPH_PREFLIGHT==='1',measurements={};
  const measure=()=>page.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('#graphs-panel .graph-grid > article')].map(e=>({box:box(e),scrollHeight:e.scrollHeight,clientHeight:e.clientHeight})),canvases:['graph-stacked','composition-phases','composition-sex','composition-ages'].map(id=>{const c=document.getElementById(id);return {id,...box(c),bitmap:[c.width,c.height],ratioError:Math.abs(c.width/c.height-c.getBoundingClientRect().width/c.getBoundingClientRect().height)};}),pyramid:box(document.querySelector('.current-biomass')),graph:box(document.getElementById('graphs-panel')),donut:box(document.querySelector('.current-composition'))};});
  await page.addInitScript(()=>{window.graphPaintCount=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='graph-stacked')graphPaintCount++;return clear.apply(this,args);};});
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{window.readabilityConfig={...__LIFE_TEST__.readConfig(),seed:'graph-readability',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};__LIFE_TEST__.prepare(readabilityConfig);document.getElementById('focus-view').click();__LIFE_TEST__.step();});
    await page.setViewportSize({width:1460,height:1030});await page.waitForTimeout(150);measurements.initial=await measure();
    await page.locator('#current-summary').screenshot({path:path.join(out,'summary-initial.png')});
    const original=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:JSON.stringify(__LIFE_TEST__.observations().rows)}));
    await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(150);measurements.resized=await measure();
    await page.locator('#current-summary').screenshot({path:path.join(out,'summary-resized.png')});
    if(!preflight){
      check(measurements.resized.canvases.every(c=>c.ratioError<.04),'paused resize keeps canvas bitmap and display proportions aligned');
      const paints=await page.evaluate(()=>graphPaintCount);await page.waitForTimeout(200);check(await page.evaluate(()=>graphPaintCount)===paints,'settled paused layout does not continuously repaint the graphs');
      check(measurements.initial.documentWidth<=1460&&measurements.resized.documentWidth<=1280,'desktop summary layouts have no horizontal page overflow');
      check(await page.evaluate(o=>__LIFE_TEST__.fingerprint()===o.hash&&JSON.stringify(__LIFE_TEST__.observations().rows)===o.rows&&!__LIFE_TEST__.snapshot().running,original),'layout changes preserve all observations, biology and pause intent');
      for(const [label,m]of Object.entries(measurements)){check(m.cards.length===3&&m.cards.every((c,i)=>c.box.width>=150&&Math.abs(c.box.y-m.cards[0].box.y)<2&&(i===0||c.box.x>m.cards[i-1].box.x))&&m.cards[2].box.right<=m.pyramid.x,'three readable graph cards stay in one row before the pyramid: '+label);}
    }
    await page.evaluate(()=>{const r=__LIFE_TEST__.observations().rows.at(-1);window.readabilityOriginalRoles=[...r.current.pyramid.roleLayers];r.current.pyramid.roleLayers=[1e8,1e4,10,.001,0];document.getElementById('graph-group').dispatchEvent(new Event('change'));});
    measurements.pyramid=await page.locator('#biomass-pyramid').evaluate(e=>[...e.querySelectorAll('.pyramid-level')].map(r=>({level:r.dataset.level,value:Number(r.dataset.value),width:r.querySelector('i').getBoundingClientRect().width,text:r.querySelector('b').textContent,title:r.title,floor:r.dataset.visualFloor==='true'})));
    if(!preflight){check(measurements.pyramid.filter(r=>r.value>0).every(r=>r.width>=7.9)&&measurements.pyramid.find(r=>r.value===0).width===0,'tiny positive biomass has a visible floor while zero remains zero');check(measurements.pyramid.length===5&&measurements.pyramid[0].level==='4','five trophic roles keep the top-to-base order');check(measurements.pyramid.find(r=>r.value===.001).text.includes('<0.01')&&measurements.pyramid.find(r=>r.value===.001).title.includes('0.001 B'),'tiny positive biomass is never labelled zero and retains its exact value in the tooltip');}
    await page.evaluate(()=>{__LIFE_TEST__.observations().rows.at(-1).current.pyramid.roleLayers=readabilityOriginalRoles;document.getElementById('graph-group').dispatchEvent(new Event('change'));});
    if(!preflight){
      await page.evaluate(async()=>{const a=__LIFE_TEST__.archive(),s=__LIFE_TEST__.snapshot(),h=__LIFE_TEST__.observations();await a.save(a.capture(s.world,'user-ended',h.snapshot()),'normal');});
      await page.click('#open-results');await page.locator('[data-analyze]').first().click();await page.locator('#results-analysis').waitFor({state:'visible'});
      await page.setViewportSize({width:1460,height:1030});await page.waitForTimeout(150);measurements.archive=await measure();
      check(measurements.archive.canvases.every(c=>c.width>150&&c.ratioError<.04),'saved-result canvases also match their new display dimensions');
      await page.locator('#results-analysis #graphs-panel').screenshot({path:path.join(out,'archive-graphs.png')});
      await page.click('#back-results');await page.click('#close-results');await page.waitForTimeout(150);measurements.returned=await measure();
      check(measurements.returned.canvases.every(c=>c.ratioError<.04),'returning from the archive restores undistorted live graphs');
      await page.click('#start');const t=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);await page.setViewportSize({width:1280,height:800});
      await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,t,{timeout:20000});
      check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.running&&!s.holds.length&&!s.playbackError;}),'layout repaint keeps actual Worker observation running');
      await page.evaluate(()=>__LIFE_TEST__.stop());
      check(errors.length===0,'no uncaught browser or ResizeObserver errors');
    }
    await fs.writeFile(path.join(out,preflight?'preflight.json':'report.json'),JSON.stringify({ok:!preflight,checks,errors,measurements,scope:'Linux Chromium; desktop dimensions and a biomass display fixture'},null,2));console.log(JSON.stringify({preflight,checks,measurements}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,measurements,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
