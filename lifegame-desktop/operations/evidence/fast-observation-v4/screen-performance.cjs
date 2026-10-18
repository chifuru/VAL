"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/staged-observation",
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
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
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
  try{
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{__LIFE_TEST__.prepare({seed:'observe39/0',observationMode:'river-settlement',width:80,height:56});document.getElementById('focus-view').click();document.getElementById('start').click();});
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=1,{},{timeout:60000});
    const rows=[];
    for(const view of ['overview','detail']){
      if(view==='detail'){await page.click('#detail-view');await page.waitForFunction(()=>!__LIFE_TEST__.snapshot().holds.length&&__LIFE_TEST__.snapshot().world.turn>=2);}
      const start=await page.evaluate(()=>({t:performance.now(),turn:__LIFE_TEST__.snapshot().world.turn}));
      await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>=t+15,start.turn,{timeout:60000});
      const end=await page.evaluate(()=>({t:performance.now(),turn:__LIFE_TEST__.snapshot().world.turn,compute:__LIFE_TEST__.snapshot().compute,main:__LIFE_TEST__.snapshot().world.stats.main}));
      rows.push({view,from:start.turn,to:end.turn,wallMs:end.t-start.t,meanTurnMs:(end.t-start.t)/(end.turn-start.turn),preparationMs:end.compute.preparationMs,main:end.main});
      console.log(JSON.stringify(rows.at(-1)));
    }
    const inputStart=performance.now();await page.dispatchEvent('#board','wheel',{deltaY:30,clientX:700,clientY:500});
    const responseMs=performance.now()-inputStart;
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().holds.includes('map')),'standard map wheel pauses playback while Worker is active');
    await page.evaluate(()=>__LIFE_TEST__.stop());
    await fs.writeFile(path.join(out,'screen-performance.json'),JSON.stringify({app:'4.0.0',browser:browser.version(),map:'river / 80x56 / initial main 640',environment:'Linux shared cloud CPU; real three-stage UI and painted artwork',rows,responseMs,errors,external},null,2));
    check(!errors.length,'no page error');check(!external.length,'no external request');
  } finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
