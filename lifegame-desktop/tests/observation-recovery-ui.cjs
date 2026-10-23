"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/observation-recovery-v1",
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
  await page.addInitScript(()=>{
    const NativeWorker=window.Worker;window.recoveryWorkers=[];
    window.Worker=class extends NativeWorker {constructor(url,options){super(url,options);if(String(url).includes('compute-worker'))window.recoveryWorkers.push(this);}};
  });
  const state=()=>page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return {turn:s.world?.turn,running:s.running,pending:s.pending,fault:s.playbackError,holds:s.holds,rows:s.observationTurns,scheduled:s.scheduled,compute:s.compute};});
  const waitTurn=async t=>page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,t,{timeout:20000});
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>__LIFE_TEST__.prepare({seed:'recovery-ui',width:40,height:28,initial:24,lineages:'few'}));
    await page.click('#start');await waitTurn(0);
    await page.evaluate(()=>{
      document.querySelector('#species-key [data-highlight]').click();
      document.querySelector('#display-maximum').click();
      document.querySelector('#display-normal').click();
      const o=__LIFE_TEST__.snapshot().world.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);
    });
    let s=await state();check(s.running&&!s.holds.length,'selection and light settings keep observation running');await waitTurn(s.turn);
    await page.click('#start');s=await state();await page.waitForTimeout(1200);check((await state()).turn===s.turn&&!s.running,'manual pause stays paused');
    await page.click('#change-world');await page.click('#cancel-settings');check(!(await state()).running,'returning from settings preserves a manual pause');
    await page.click('#start');await waitTurn(s.turn);
    await page.click('#change-world');s=await state();check(!s.holds.includes('detail')&&s.holds.includes('settings'),'settings hold is explicit');await page.click('#cancel-settings');await waitTurn(s.turn);
    await page.waitForFunction(()=>__LIFE_TEST__.snapshot().pending?.phase===1);
    const beforeError=await state();
    const committedFingerprint=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    await page.evaluate(()=>recoveryWorkers.at(-1).dispatchEvent(new ErrorEvent('error',{cancelable:true,message:'injected worker failure'})));
    s=await state();check(!s.running&&!!s.fault&&s.pending===null,'worker failure stops safely and clears pending preview');
    check(s.turn===beforeError.turn&&s.rows===s.turn+1&&await page.evaluate(()=>__LIFE_TEST__.fingerprint())===committedFingerprint,'worker failure retains only committed observation rows');
    check(await page.locator('#preview-note').evaluate(el=>el.hidden)&&await page.locator('#turn-stages .active').count()===0,'worker failure clears the intermediate display');
    await page.click('#start');await waitTurn(s.turn);check(!(await state()).fault,'retry resumes after worker failure');
    await page.evaluate(()=>{const original=EcoTransport.apply;EcoTransport.apply=(...args)=>{EcoTransport.apply=original;throw Error('injected one-shot presentation failure');};});
    await page.waitForFunction(()=>!!__LIFE_TEST__.snapshot().playbackError);s=await state();check(!s.running&&s.pending===null,'presentation failure stops safely');
    await page.click('#start');await waitTurn(s.turn);check(!(await state()).fault,'retry resumes after transient presentation failure');
    await page.click('#start');check(errors.length===0,'no unhandled browser errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'24 main individuals, 40x28, Linux Chromium, actual Worker, two injected transient failures'},null,2));
    console.log(JSON.stringify({ok:true,checks}));
  }catch(error){const s=await state();await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,state:s,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
