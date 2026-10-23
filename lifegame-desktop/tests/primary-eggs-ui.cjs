"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/primary-eggs-v1/ui",
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
  const value=async(id,value)=>page.evaluate(({id,value})=>{const e=document.getElementById(id);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},{id,value});
  const submit=async()=>{await page.evaluate(()=>document.getElementById('setup').requestSubmit());await page.waitForFunction(()=>!document.getElementById('setup').hasAttribute('aria-busy'));};
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    check(await page.evaluate(()=>__LIFE_TEST__.readConfig().primaryEggModel==='egg/1'),'new-world settings enable egg/1');
    const fixture=await page.evaluate(()=>{
      const c={...__LIFE_TEST__.readConfig(),seed:'egg-ui',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      const w=__LIFE_TEST__.prepare(c);__LIFE_TEST__.stop();const S=EcoEngine.S,host=w.organisms.find(o=>o.infection?.species==='leafparasite'&&S.PrimaryParasite.hostRule('leafparasite',o).role==='first'),p=host.infection;
      w.turn=3;const before=S.PrimaryParasite.summary(w).count;
      w.primaryInocula=[S.PrimaryParasite.inoculum(w,p,{id:'display:egg-free',kind:'contact',cell:host.cell,hostId:null,createdAt:1,expires:21,stage:'terminal',transfer:false,egg:{version:'primary-egg/1',state:'free',attachedAt:null,hatchAt:null}}),S.PrimaryParasite.inoculum(w,p,{id:'display:egg-attached',kind:'contact',cell:host.cell,hostId:host.id,createdAt:1,expires:21,stage:'terminal',transfer:false,egg:{version:'primary-egg/1',state:'attached',attachedAt:2,hatchAt:4}})];
      w.ledger.initialE=S.round(w.ledger.initialE+.12);const summary=S.PrimaryParasite.summary(w);w.stats=EcoEngine.summarize(w);__LIFE_TEST__.refresh();__LIFE_TEST__.select(host.cell,p.id);
      return {config:c,before,after:summary.count,eggs:summary.eggs,host:host.id};
    });
    check(fixture.before===fixture.after&&fixture.eggs.records===2,'two egg batches are separate from living P counts');
    const free=page.locator('[data-inoculum-id="display:egg-free"]'),attached=page.locator('[data-inoculum-id="display:egg-attached"]');
    check((await free.textContent()).includes('卵塊：未付着・滞留'),'free egg is identified as a resting egg batch');
    check((await attached.textContent()).includes('第一宿主に付着')&&(await attached.textContent()).includes('孵化予定 4T'),'attached egg shows its hatch clock');
    check((await free.textContent()).includes('期限 21T')&&(await attached.textContent()).includes('生存するP群体数へは加算しません'),'expiry and non-living-stock meaning remain visible');
    await page.locator('[data-primary-category="external"]').screenshot({path:path.join(out,'egg-batches.png')});
    await page.evaluate(()=>__LIFE_TEST__.openGuide('parasite'));check((await page.locator('#guide-content').textContent()).includes('卵による次世代感染'),'game guide explains the adopted egg lifecycle');await page.locator('#guide').evaluate(e=>e.close());
    await page.evaluate(c=>{delete c.primaryEggModel;delete c.primaryEggSettings;const w=__LIFE_TEST__.prepare(c);__LIFE_TEST__.stop();return w;},fixture.config);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.primaryEggModel===undefined&&!__LIFE_TEST__.snapshot().world.primaryParasiteSummary.eggs),'older world remains on its previous parasite path');
    check(errors.length===0,'no browser runtime errors');check(external.length===0,'no external requests');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'Linux display fixtures and explicit new-world settings only; no claim of natural egg emergence from these screenshots'},null,2));console.log(JSON.stringify({ok:true,checks:checks.length}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
