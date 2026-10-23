"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/parasite-founder-preflight-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const baseline=process.env.PARASITE_PREFLIGHT==='1';
  const originalApp=baseline?require('node:child_process').execFileSync('git',['show','HEAD:lifegame-desktop/src/app.js'],{encoding:'utf8'}):null;
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
      res.end(baseline&&file===path.resolve('src/app.js')?originalApp:await fs.readFile(file));
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
    await value('observation-mode','custom');await value('generation-mode','manual');await value('size','40,28');await value('map-id','river');await value('lineages','few');await value('initial',24);
    await page.evaluate(()=>{__LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'parasite-prior-world',terrainSeed:'prior-world'});document.getElementById('change-world').click();});
    await value('founder-leafparasite',0);await value('founder-hyperparasite',0);await value('founder-algae',1);await value('founder-freshwaterlight',0);await value('founder-tideparasite',2);
    if(baseline){
      const allowed=await page.locator('#load').isEnabled();await submit();
      const message=await page.locator('#setup-message').textContent();check(allowed&&message.includes('PLACEMENT_SHORTAGE: 潮環 指定2 / 配置可能1'),'baseline permits a known impossible count and fails only after generation');
      await fs.writeFile(path.join(out,'before.json'),JSON.stringify({checks,message},null,2));console.log(JSON.stringify({checks,message}));return;
    }
    const previous=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length}));
    check(await page.locator('#load').isDisabled()&&await page.locator('#founder-tideparasite').getAttribute('max')==='1','fully specified first-host counts cap direct P before generation');
    check((await page.locator('#setup-message').textContent()).includes('第一宿主は設定上最大1枠'),'known shortage identifies the first-host setting and correction');
    await value('founder-tideparasite',1);check(await page.locator('#load').isEnabled(),'reducing only parasite count clears the restriction');
    await value('founder-algae',2);await value('founder-tideparasite',2);check(await page.locator('#load').isEnabled(),'increasing first-host count also clears the restriction');
    await value('founder-algae',1);await value('founder-freshwaterlight','');check(await page.locator('#load').isEnabled()&&await page.locator('#founder-tideparasite').getAttribute('max')==='17920','an automatic host is not mistaken for zero or capped by stale prior capacity');
    await page.evaluate(()=>{document.getElementById('group-plant').click();});check(await page.locator('#load').isDisabled()&&await page.inputValue('#founder-tideparasite')==='2','disabled producer group blocks positive direct P without changing the value');
    await page.evaluate(()=>{document.getElementById('group-P').click();});check(await page.locator('#load').isEnabled()&&await page.locator('#founder-tideparasite').isDisabled()&&await page.evaluate(()=>!__LIFE_TEST__.readConfig().founderCounts?.parasites?.tideparasite),'disabled parasite group retains but does not submit a blocked count');
    await page.evaluate(()=>{document.getElementById('group-P').click();});await value('founder-tideparasite',0);await value('founder-hyperparasite',1);
    check(await page.locator('#load').isEnabled(),'zero P does not falsely forbid a free adult Q');await value('founder-hyperparasite',0);
    await value('founder-tideparasite','');check(await page.locator('#load').isEnabled(),'automatic parasite count remains valid when first hosts are absent');
    await page.evaluate(()=>document.getElementById('group-plant').click());await value('founder-freshwaterlight',0);await value('founder-algae',2);await value('founder-tideparasite',2);await submit();
    check(await page.evaluate(()=>{const w=__LIFE_TEST__.snapshot().world;return !document.body.classList.contains('setup-screen')&&w.config.founderCounts.parasites.tideparasite===2&&EcoState.PrimaryParasite.entries(w).filter(e=>e.p.species==='tideparasite').length===2;}),'a legal exact count creates the requested P without truncation');
    await page.click('#change-world');
    const old=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length}));
    // Real terrain-generation shortage with an intentionally automatic but zero-density host.
    await value('founder-algae',1);await value('founder-freshwaterlight','');await value('density-plant-water',0);await value('large-plant-water-density',0);await value('founder-tideparasite',2);
    check(await page.locator('#load').isEnabled(),'unknown actual automatic capacity is left to the existing generation rules');
    await submit();const failure=await page.locator('#setup-message').textContent();
    check(failure.includes('潮環')&&failure.includes('第一宿主')&&failure.includes('1枠')&&failure.includes('空欄')&&!failure.includes('GENERATION_FAILED')&&!failure.includes('PLACEMENT_SHORTAGE'),'real automatic-capacity failure shows a targeted correction instead of internal candidate errors');
    check(await page.evaluate(()=>document.activeElement.id==='founder-tideparasite'&&document.getElementById('founder-settings').open),'capacity failure opens the relevant settings and focuses its input');
    check(await page.evaluate(b=>__LIFE_TEST__.fingerprint()===b.hash&&__LIFE_TEST__.observations().rows.length===b.rows,old),'capacity failure preserves the old world and recorded rows');
    await value('founder-tideparasite','');await submit();check(await page.evaluate(()=>!document.body.classList.contains('setup-screen')&&__LIFE_TEST__.snapshot().world.config.founderCounts?.parasites?.tideparasite===undefined),'clearing the direct count retries successfully using normal automatic rules');
    check(errors.length===0,'no uncaught browser exceptions');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,failure,scope:'Linux Chromium actual UI, known host restrictions and real terrain-generation shortage; no modified ecological rules'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error),message:await page.locator('#setup-message').textContent()},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
