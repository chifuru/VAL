"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/record-budget-v1/browser",
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
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{
      const create=EcoObservations.create;EcoObservations.create=(config,version,options)=>{
        const h=create(config,version,{...options,maxBytes:1}),append=h.append;let bootstrap=true;
        h.append=function(w){try{return append(w);}catch(e){if(bootstrap&&w.turn===0&&e.code==='OBSERVATION_CAPACITY'){h.expandCapacity(e.requiredBytes);bootstrap=false;return append(w);}throw e;}};return h;
      };
      __LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'record-budget-ui',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}});
      window.budgetInitialHash=__LIFE_TEST__.fingerprint();document.getElementById('focus-view').click();
    });
    await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().faultKind==='観測記録',null,{timeout:20000});
    const blocked=await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return {turn:s.world.turn,rows:s.observationTurns,running:s.running,pending:s.pending,hash:__LIFE_TEST__.fingerprint(),fault:s.playbackError};});
    check(!blocked.running&&blocked.pending===null&&blocked.rows===blocked.turn+1,'real recorder capacity failure keeps committed rows and clears the preview');
    check(blocked.turn===0&&await page.evaluate(()=>__LIFE_TEST__.fingerprint()===budgetInitialHash),'rejected first turn preserves the initial world fingerprint');
    check(await page.locator('#start').isEnabled()&&(await page.locator('#message').textContent()).includes('再試行で記録容量を拡張'),'finite capacity failure offers an actionable retry');
    await page.click('#start');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,blocked.turn,{timeout:20000});
    await page.evaluate(()=>__LIFE_TEST__.stop());
    check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot(),rows=__LIFE_TEST__.observations().rows;return !s.playbackError&&s.observationTurns===s.world.turn+1&&rows.every((r,i)=>r.turn===i);}), 'capacity expansion resumes the same observation without gaps or duplicates');
    check(await page.evaluate(async()=>{const a=__LIFE_TEST__.archive(),s=__LIFE_TEST__.snapshot(),h=__LIFE_TEST__.observations(),record=a.capture(s.world,'user-ended',h.snapshot());await a.save(record,'normal');const saved=await a.get(record.id);return JSON.stringify(EcoObservations.restore(saved.observation).rows)===JSON.stringify(h.rows);}), 'expanded observation saves to the real archive and restores every committed aggregate');
    check(errors.length===0,'no unhandled browser exceptions');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'Linux Chromium, actual Worker, 40x28, actual small recorder budget with initial-row bootstrap; not a 1GiB allocation'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
