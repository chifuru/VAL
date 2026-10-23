"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/observation-speed-v1",
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
  await new Promise((resolve,reject) => { server.once("error",reject);server.listen(0,"127.0.0.1",resolve); });
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
    await page.addInitScript(()=>{
      window.idleJobs=[];
      window.requestIdleCallback=(fn)=>{idleJobs.push(fn);return idleJobs.length;};
    });
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{
      __LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'speed-ui',terrainSeed:'speed-ui-terrain',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}});
      window.speedInitial=__LIFE_TEST__.snapshot().world;
      window.flagIds=['age-emphasis','motion','status-marks','display-effects','display-action-marks','display-slow-graphs','display-simple-background',...Array.from(document.querySelectorAll('[id^="names-"]'),e=>e.id)];
      flagIds.forEach((id,i)=>{const el=document.getElementById(id);el.checked=i%2===0;el.dispatchEvent(new Event('change'));});
      for(const id of ['age-emphasis','motion','status-marks']){const el=document.getElementById(id);el.checked=true;el.dispatchEvent(new Event('change'));}
      document.getElementById('simplified').checked=false;
      document.getElementById('simplified').dispatchEvent(new Event('change'));
      window.flagsBefore=Object.fromEntries(flagIds.map(id=>[id,document.getElementById(id).checked]));
      window.labelBefore=document.getElementById('display-load-state').textContent;
      document.querySelector('#speed [data-speed="2"]').click();
    });
    await page.evaluate(()=>{if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();});
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().cadenceMs===500&&document.querySelector('#speed [data-speed="2"]').getAttribute('aria-pressed')==='true'),'2x cadence is 500ms and selected');
    await page.click('#start');
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1);
    const switchState=await page.evaluate(()=>{
      window.oldWarmJobs=idleJobs.splice(0);
      document.querySelector('#speed [data-speed="max"]').click();
      const s=__LIFE_TEST__.snapshot();return {running:s.running,pending:s.pending};
    });
    check(switchState.running&&switchState.pending===null,'switching mid-preview keeps running from the committed state');
    const forced=await page.evaluate(()=>{
      const s=__LIFE_TEST__.snapshot();return {
        flags:Object.fromEntries(flagIds.map(id=>[id,document.getElementById(id).checked])),
        disabled:flagIds.every(id=>document.getElementById(id).disabled),
        simplified:s.view.simplified,
        noWarm:!EcoArt.warming,
        staleJobs:oldWarmJobs.length,
        stopped:(()=>{oldWarmJobs.forEach(fn=>fn({timeRemaining:()=>50}));return !EcoArt.warming;})()
      };
    });
    check(forced.disabled&&Object.entries(forced.flags).every(([id,v])=>v===(id==='display-slow-graphs')),'fastest disables optional animation, marks, age and names and forces slow graphs');
    check(!forced.simplified,'fastest does not force symbol rendering');
    check(forced.noWarm&&forced.stopped&&forced.staleJobs>0,'queued image prewarming is cancelled in fastest mode');
    await page.waitForFunction(()=>{
      const s=__LIFE_TEST__.snapshot();if(s.world.turn<13)return false;
      window.speedDuring={turn:s.world.turn,presented:s.lastPresentedTurn,rows:s.observationTurns,graphTurn:Number(document.getElementById('current-summary').dataset.turn),mapTurn:Number(document.getElementById('turn').textContent)};
      __LIFE_TEST__.stop();return true;
    },null,{timeout:60000});
    const during=await page.evaluate(()=>speedDuring);
    check(during.presented%10===0&&during.turn-during.presented<10,'fastest presents each tenth committed turn');
    check(during.graphTurn===during.presented&&during.mapTurn===during.presented,'map and graph retain the same presented turn between batches');
    const paused=await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return {running:s.running,turn:s.world.turn,presented:s.lastPresentedTurn,rows:s.observationTurns};});
    check(!paused.running&&paused.presented===paused.turn,'pause flushes the partial display batch');
    check(paused.rows===paused.turn+1,'every committed turn is recorded');
    check(await page.evaluate(()=>{
      let w=window.speedInitial;const s=__LIFE_TEST__.snapshot();
      for(let i=0;i<s.world.turn;i++)w=EcoEngine.step(w);
      return EcoEngine.fingerprint(w)===__LIFE_TEST__.fingerprint();
    }),'fastest UI result equals sequential biology');
    const inspect=await page.evaluate(()=>{
      __LIFE_TEST__.step();let s=__LIFE_TEST__.snapshot();if(s.world.turn%10===0){__LIFE_TEST__.step();s=__LIFE_TEST__.snapshot();}
      const lag=s.lastPresentedTurn<s.world.turn,o=s.world.organisms.find(o=>o.slot==='main');
      __LIFE_TEST__.select(o.cell,o.id);s=__LIFE_TEST__.snapshot();
      return {lag,turn:s.world.turn,presented:s.lastPresentedTurn,graph:Number(document.getElementById('current-summary').dataset.turn),selected:s.selectedId===o.id};
    });
    check(inspect.lag&&inspect.selected&&inspect.turn===inspect.presented&&inspect.turn===inspect.graph,'explicit individual selection flushes a partial batch and synchronizes graphs');
    const graph=await page.evaluate(()=>{
      __LIFE_TEST__.step();const select=document.getElementById('graph-group');select.dispatchEvent(new Event('change'));
      const s=__LIFE_TEST__.snapshot();return s.world.turn===s.lastPresentedTurn&&Number(document.getElementById('current-summary').dataset.turn)===s.world.turn;
    });
    check(graph,'explicit graph target changes flush the current partial batch');
    const hold=await page.evaluate(()=>{__LIFE_TEST__.step();__LIFE_TEST__.openGuide();const s=__LIFE_TEST__.snapshot();return {turn:s.world.turn,presented:s.lastPresentedTurn,holds:s.holds,running:s.running};});
    check(hold.holds.length>0&&hold.turn===hold.presented&&!hold.running,'navigation flushes the current batch and preserves paused intent');
    await page.click('#close-guide');
    await page.click('#speed [data-speed="1"]');
    check(await page.evaluate(()=>flagIds.every(id=>!document.getElementById(id).disabled&&document.getElementById(id).checked===flagsBefore[id])&&document.getElementById('display-load-state').textContent===labelBefore&&__LIFE_TEST__.snapshot().cadenceMs===1000&&!__LIFE_TEST__.snapshot().running),'leaving fastest restores every prior display choice and stays paused');
    check(await page.evaluate(()=>EcoArt.warming),'leaving fastest resumes image prewarming for the current world');
    const resumeTurn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    await page.click('#start');
    await page.waitForFunction(t=>{if(__LIFE_TEST__.snapshot().world.turn<=t)return false;__LIFE_TEST__.stop();return true;},resumeTurn,{timeout:30000});
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().playbackError&&!__LIFE_TEST__.snapshot().running),'normal staged speed resumes after fastest pause');
    check(errors.length===0,'no browser runtime errors');check(external.length===0,'no external requests');
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'speed-controls.png')});
    const report={ok:true,app:require('../package.json').version,checks,errors,external,during,pausedAt:paused.turn,inspection:inspect,browser:browser.version(),scope:'small world, real Worker, bounded turns; no 500T performance or Windows claim'};
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify({ok:true,checks:checks.length,during,pausedAt:paused.turn}));
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
