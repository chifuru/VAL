"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/selection-snapshot-v1",
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
  const stamp=()=>page.locator('#selection-controls').evaluate(e=>Number(e.dataset.turn));
  const waitTurn=async t=>page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>=t,t,{timeout:20000});
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{
      const config={...__LIFE_TEST__.readConfig(),seed:'snapshot-ui',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      window.snapshotConfig=config;__LIFE_TEST__.prepare(config);document.getElementById('focus-view').click();
      const o=__LIFE_TEST__.snapshot().world.organisms.filter(o=>o.slot==='main').sort((a,b)=>(b.birthLife-b.age)-(a.birthLife-a.age))[0];window.snapshotTarget={cell:o.cell,id:o.id};__LIFE_TEST__.select(o.cell,o.id);
      window.frozenHTML=document.getElementById('selection').innerHTML;window.frozenNode=document.getElementById('selection').firstElementChild;
    });
    check(await stamp()===0,'selection records the committed turn');
    await page.click('#follow-individual');await page.click('#start');await waitTurn(2);
    check(await page.evaluate(()=>document.getElementById('selection').innerHTML===frozenHTML&&document.getElementById('selection').firstElementChild===frozenNode),'running and camera tracking preserve detail values and DOM');
    check(await stamp()===0&&(await page.locator('#selection-stamp').textContent()).includes('現在'),'displayed turn remains distinct from the live turn');
    await page.click('#refresh-selection');const refreshed=await stamp();
    check(refreshed>=2&&await page.evaluate(()=>__LIFE_TEST__.snapshot().running&&!__LIFE_TEST__.snapshot().holds.length),'manual refresh captures the latest commit without pausing');
    await page.evaluate(()=>{window.frozenHTML=document.getElementById('selection').innerHTML;window.frozenNode=document.getElementById('selection').firstElementChild;});await waitTurn(refreshed+1);
    check(await page.evaluate(()=>document.getElementById('selection').innerHTML===frozenHTML&&document.getElementById('selection').firstElementChild===frozenNode),'refreshed detail stays fixed on following turns');
    await page.click('#start');const paused=await page.evaluate(()=>({turn:__LIFE_TEST__.snapshot().world.turn,hash:__LIFE_TEST__.fingerprint()}));await page.click('#refresh-selection');
    check(await stamp()===paused.turn&&await page.evaluate(h=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.fingerprint()===h,paused.hash),'refresh while paused preserves biology and pause intent');
    await page.evaluate(()=>__LIFE_TEST__.select(snapshotTarget.cell,snapshotTarget.id));check(await stamp()===paused.turn,'explicit re-selection captures the current state');
    await page.evaluate(()=>__LIFE_TEST__.select(snapshotTarget.cell,null,{information:true}));check(await page.evaluate(()=>__LIFE_TEST__.snapshot().followId===null),'selecting another target releases the previous tracking target');const cellTurn=await stamp();await page.evaluate(()=>{window.frozenHTML=document.getElementById('selection').innerHTML;__LIFE_TEST__.step();});
    check(await stamp()===cellTurn&&await page.evaluate(()=>document.getElementById('selection').innerHTML===frozenHTML),'cell information remains fixed across a turn');await page.click('#refresh-selection');check(await stamp()===cellTurn+1,'cell refresh updates to the current turn');
    await page.evaluate(()=>__LIFE_TEST__.select(snapshotTarget.cell,'missing-fixture-id'));await page.click('#refresh-selection');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId==='missing-fixture-id')&&(await page.locator('#selection').textContent()).includes('消失'),'missing-ID display never switches to another organism');
    await page.click('#inspector-tab-key');await page.locator('#species-key .map-key-item:not([hidden]) [data-describe]').first().click();const speciesTurn=await stamp();await page.evaluate(()=>{window.speciesNode=document.getElementById('species-description').firstElementChild;__LIFE_TEST__.step();});
    check(await stamp()===speciesTurn&&await page.evaluate(()=>document.getElementById('species-description').firstElementChild===speciesNode),'species detail also remains fixed');await page.click('#refresh-selection');check(await stamp()===speciesTurn+1,'species detail has the same explicit refresh control');
    await page.click('#close-species');check(await page.locator('#selection-controls').isHidden(),'clearing selection hides snapshot controls');
    await page.evaluate(()=>{__LIFE_TEST__.prepare({...snapshotConfig,seed:'snapshot-new-world'});});check(await page.locator('#selection-controls').isHidden()&&await page.locator('#selection-stamp').textContent()==='','new worlds clear the previous snapshot');
    check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.observationTurns===s.world.turn+1&&!s.playbackError;}),'observation rows remain consistent');check(errors.length===0,'no unhandled browser errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'Linux Chromium, actual Worker, 40x28, primary snapshot and cell/species controls; explicit missing-ID display fixture'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
