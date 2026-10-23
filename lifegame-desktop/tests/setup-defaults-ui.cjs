"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/setup-defaults-v1",
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
  const set=async(id,value)=>page.evaluate(({id,value})=>{const e=document.getElementById(id);if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},{id,value});
  const config=()=>page.evaluate(()=>{const c=__LIFE_TEST__.readConfig();delete c.seed;delete c.terrainSeed;return c;});
  const controls=()=>page.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#setup input[id],#setup select[id],#setup textarea[id]')].map(e=>[e.id,{value:e.value,checked:e.checked,disabled:e.disabled}])));
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    const initial=await config(),initialControls=await controls();
    check(await page.locator('#reset-setup').getAttribute('type')==='button','reset is separate from world generation');
    await set('size','160,112');await set('map-id','lake');await set('initial','200');await set('generation-mode','manual');await set('producer-supply',false);await set('advantage-producer',false);await set('founder-grass','5');await set('information-influence','3');await set('observation-mode','river-settlement');
    await page.click('#reset-setup');
    assert.deepEqual(await config(),initial);check(true,'all creation conditions return to their startup defaults');
    assert.deepEqual(await controls(),initialControls);check(true,'checkboxes and disabled controls return to startup state');
    check(await page.locator('[data-generation-lock]:checked').count()===0,'automatic-generation locks are cleared');
    check(await page.locator('#load').isEnabled()&&await page.locator('#setup').evaluate(e=>e.checkValidity()),'restored defaults are valid and ready to create');
    await set('initial','4');check(await page.locator('#load').isDisabled(),'invalid input is detected before reset');await page.click('#reset-setup');
    check(await page.locator('#load').isEnabled()&&!await page.locator('#setup-message').evaluate(e=>e.classList.contains('error')),'reset clears obsolete input errors');
    await page.evaluate(()=>{__LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'defaults-preserve',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'auto',profile:'high-production',locks:['initial','mapId']}});document.getElementById('focus-view').click();});
    await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>=1);
    await page.click('#change-world');
    const retained=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length,records:__LIFE_TEST__.records().length,generation:__LIFE_TEST__.snapshot().worldGeneration}));
    await page.evaluate(()=>document.getElementById('display-maximum').click());const display=await page.evaluate(()=>({motion:document.getElementById('motion').checked,state:document.getElementById('display-load-state').textContent}));
    await set('generation-mode','manual');await set('initial','200');await set('founder-waterbug','10');await page.click('#reset-setup');
    const after=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length,records:__LIFE_TEST__.records().length,generation:__LIFE_TEST__.snapshot().worldGeneration}));assert.deepEqual(after,retained);check(true,'reset preserves the current world, all observation rows and archive');
    assert.deepEqual(await config(),initial);check(true,'previously resolved generation values are cleared');
    check(await page.evaluate(d=>document.getElementById('motion').checked===d.motion&&document.getElementById('display-load-state').textContent===d.state,display),'display preferences remain unchanged');
    await page.click('#cancel-settings');await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,retained.rows-1);await page.click('#start');
    check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.snapshot().world.config.seed==='defaults-preserve'),'cancel resumes the original world, not a default replacement');
    await page.click('#change-world');await page.click('#reset-setup');await page.evaluate(()=>document.getElementById('setup').requestSubmit());await page.waitForFunction(()=>!document.getElementById('setup').hasAttribute('aria-busy'));
    check(await page.evaluate(()=>!document.body.classList.contains('setup-screen')&&__LIFE_TEST__.snapshot().world.config.width===80&&__LIFE_TEST__.snapshot().world.config.height===56&&__LIFE_TEST__.snapshot().world.config.generationModel==='diverse/1'),'default settings create a new standard-size world');
    check(errors.length===0,'no unhandled browser errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'Linux Chromium; startup condition comparison, live world preservation and one standard-size generation'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
