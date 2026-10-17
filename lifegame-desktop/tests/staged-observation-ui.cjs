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
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    check(await page.locator('#speed option').count()===1&&await page.locator('#speed').inputValue()==='0.5','one reference cadence is two seconds per turn');
    await page.selectOption('#size','40,28');await page.selectOption('#observation-mode','river-settlement');
    check(await page.locator('#initial').inputValue()==='160','settlement mode exposes its larger initial cohort');
    check(await page.locator('#map-id').isDisabled()&&await page.locator('#lineages').isDisabled(),'fixed preset parameters are explicit and protected');
    check((await page.locator('#mode-help').textContent()).includes('25%'),'initial food adjustment is explained before creation');
    await page.fill('#seed','staged-ui39');await page.click('#load');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.modeResolved.initialFoodScale===1.25),'resolved mode metadata reaches the actual world');
    const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    await page.evaluate(()=>{
      window.stageWitness=[];window.pausedOnStage2=false;
      const observer=new MutationObserver(()=>{
        const s=__LIFE_TEST__.snapshot();
        if(!s.pending)return;
        stageWitness.push({phase:s.pending.phase,turn:s.world.turn,fingerprint:__LIFE_TEST__.fingerprint(),inert:document.getElementById('selection').inert,note:!document.getElementById('preview-note').hidden});
        if(s.pending.phase===2){document.getElementById('start').click();pausedOnStage2=true;observer.disconnect();}
      });observer.observe(document.getElementById('turn-progress'),{childList:true});
    });
    await page.click('#start');
    await page.waitForFunction(()=>window.pausedOnStage2);
    check(await page.evaluate(()=>stageWitness.some(s=>s.phase===1&&s.turn===0)),'resource preview does not commit the turn');
    check(await page.evaluate(()=>stageWitness.some(s=>s.phase===1&&s.note)),'intermediate display is labelled as a preview');
    check(await page.evaluate(()=>stageWitness.some(s=>s.phase===1&&s.inert)),'uncommitted detail selection is suspended');
    check(await page.evaluate(()=>stageWitness.find(s=>s.phase===2).fingerprint)===before,'feeding and movement preview cannot overwrite the committed world');
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().pending&&__LIFE_TEST__.snapshot().world.turn===0),'pause cancels the private calculation');
    check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'pause restores the exact committed state');
    check(await page.evaluate(()=>__LIFE_TEST__.records().length===0),'preview and cancellation create no archive record');
    await page.evaluate(()=>{
      window.thirdWitness=null;
      const observer=new MutationObserver(()=>{const s=__LIFE_TEST__.snapshot();if(s.pending?.phase===3){thirdWitness={turn:s.world.turn,events:s.pending.events};observer.disconnect();}});
      observer.observe(document.getElementById('turn-progress'),{childList:true});
    });
    const started=await page.evaluate(()=>performance.now());await page.click('#start');
    await page.waitForFunction(()=>window.thirdWitness!==null);
    check(await page.evaluate(()=>thirdWitness.turn===0),'third preview remains provisional until cadence completion');
    check(await page.evaluate(()=>thirdWitness.events.every(t=>['growth','birth','infection'].includes(t))),'growth stage never repeats movement or feeding from the same turn');
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn===1);
    const elapsed=await page.evaluate(()=>performance.now())-started;
    await page.evaluate(()=>document.getElementById('start').click());
    check(elapsed>=1900,'reference cadence does not skip ahead to meet a faster target');
    check(await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;return EcoEngine.fingerprint(w)===EcoEngine.fingerprint(EcoEngine.step(EcoEngine.create(w.config)));}),'animated stages end at the same biological result as an atomic turn');
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'staged-overview.jpg'),type:'jpeg',quality:92});
    await page.click('#detail-view');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,'staged-detail.jpg'),type:'jpeg',quality:92});
    await page.click('#finish-run');
    check(await page.evaluate(()=>__LIFE_TEST__.records()[0].config.modeResolved.id==='river-settlement'),'archive retains the selected mode and versioned conditions');
    await page.click('#open-results');
    check((await page.locator('#results-list').textContent()).includes('河畔・定着観察'),'archive displays which observation mode produced the result');
    await page.locator('[data-replay]').click();await page.click('#start');
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().ended&&__LIFE_TEST__.snapshot().world.turn===1);
    check(await page.evaluate(()=>__LIFE_TEST__.records().length===1),'staged replay never adds a result record');
    await page.click('#change-world');await page.selectOption('#observation-mode','lake-foodweb');
    check((await page.locator('#mode-help').textContent()).includes('50%'),'lake mode explains its separate food adjustment');
    await page.click('#load');await page.click('#start');
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1);await page.click('#reset');
    await page.waitForTimeout(2200);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn===0&&!__LIFE_TEST__.snapshot().running&&!__LIFE_TEST__.snapshot().pending),'reset invalidates all pending callbacks');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.modeResolved.id==='lake-foodweb'),'reset retains the exact lake preset');
    await page.click('#change-world');await page.selectOption('#observation-mode','custom');
    check(await page.locator('#map-id').isEnabled()&&await page.locator('#initial').isEnabled(),'custom mode restores editable initial conditions');
    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mode and stage controls fit a narrow screen');
    check(errors.length===0,'no browser errors: '+errors.join(';'));check(external.length===0,'no external requests');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,app:'3.9.0',checks,errors,external,cadenceMs:2000,observedFirstTurnMs:elapsed,browser:browser.version()},null,2));
    console.log(JSON.stringify({ok:true,checks:checks.length,observedFirstTurnMs:elapsed}));
  } finally { await browser.close();await new Promise(r=>server.close(r)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
