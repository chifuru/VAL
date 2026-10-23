"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/generation-preflight-v1",
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
  const value=async(id,value)=>page.evaluate(({id,value})=>{const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},{id,value:String(value)});
  const submit=async()=>{await page.evaluate(()=>document.getElementById('setup').requestSubmit());await page.waitForFunction(()=>!document.getElementById('setup').hasAttribute('aria-busy'));};
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await value('observation-mode','custom');await value('generation-mode','manual');await value('size','40,28');await value('map-id','river');await value('lineages','all');await value('initial',84);
    await submit();
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world?.config.initial===84),'standard 21 lineages create with 84 founders');
    check(await page.evaluate(()=>!document.body.classList.contains('setup-screen')&&document.body.classList.contains('observatory')),'successful creation enters observation screen');
    await page.click('#change-world');await value('distribution','weighted');
    await page.evaluate(()=>{const e=document.querySelector('[data-weight="ryouki"]');e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});await value('initial',80);await submit();
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.initial===80&&!__LIFE_TEST__.snapshot().world.organisms.some(o=>o.species==='ryouki')),'zero-weight ryouki is excluded from both minimum count and actual placement');
    await page.click('#change-world');await value('lineages','manual');
    await page.evaluate(()=>{for(const e of document.querySelectorAll('#lineage-options input'))e.checked=false;document.querySelector('#lineage-options input').dispatchEvent(new Event('change',{bubbles:true}));});
    check(await page.locator('#load').isDisabled()&&(await page.locator('#cohort-hint').textContent()).includes('参加'),'empty manual selection disables creation with guidance');
    await value('lineages','few');await value('initial',4);
    check(await page.locator('#load').isDisabled()&&await page.locator('#initial').getAttribute('min')==='20'&&(await page.locator('#setup-message').textContent()).includes('主生物の初期数'),'five lineages require 20 founders before submission with visible field guidance');await value('initial',24);
    await page.evaluate(()=>{document.getElementById('guarantee').checked=true;});await value('founder-grass',1);
    check(await page.locator('#guarantee').isDisabled()&&!await page.locator('#guarantee').isChecked(),'explicit species counts disable incompatible food guarantee');
    await page.evaluate(()=>{const e=document.getElementById('group-plant');e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));});
    check(await page.locator('#founder-grass').isDisabled()&&await page.inputValue('#founder-grass')==='1'&&await page.evaluate(()=>!__LIFE_TEST__.readConfig().founderCounts?.species?.grass),'disabled groups retain their inputs without sending positive founder counts');
    await page.evaluate(()=>{const e=document.getElementById('group-plant');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));});
    check(await page.inputValue('#founder-grass')==='1'&&!await page.locator('#founder-grass').isDisabled(),'reenabling a group restores editable founder values');await value('founder-grass','');
    const before=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length}));
    await page.evaluate(()=>{const original=EcoObservations.create;EcoObservations.create=(...args)=>{EcoObservations.create=original;throw Error('one-shot initial observation failure');};});await submit();
    check(await page.evaluate(b=>__LIFE_TEST__.fingerprint()===b.hash&&__LIFE_TEST__.observations().rows.length===b.rows,before),'generation failure retains the existing world and observation rows');
    check(await page.locator('#load').isEnabled()&&await page.evaluate(()=>document.body.classList.contains('setup-screen')),'failed creation remains retryable in settings');await submit();
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.initial===24&&!document.body.classList.contains('setup-screen')),'retry creates a new world and enters observation');
    await page.click('#change-world');await value('map-id','lake');await value('initial',200);await value('observation-mode','river-settlement');
    check(await page.inputValue('#map-id')==='river'&&await page.locator('#map-id').isDisabled(),'fixed mode replaces and locks an incompatible custom map');await submit();
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.config.mapId==='river'&&__LIFE_TEST__.snapshot().world.config.modeResolved.id==='river-settlement'),'fixed mode generation succeeds after custom edits');
    check(errors.length===0,'no unhandled browser errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'Linux Chromium, 40x28, representative setup cases, one injected T0 recording failure'},null,2));console.log(JSON.stringify({ok:true,checks}));
  } catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error),message:await page.locator('#setup-message').textContent()},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
