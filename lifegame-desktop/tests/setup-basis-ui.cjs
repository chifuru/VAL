"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/setup-basis-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const baselineSource=require('node:child_process').execFileSync('git',['show','4a1ce12:lifegame-desktop/src/app.js'],{encoding:'utf8'});
  const currentSource=await fs.readFile('src/app.js','utf8');
  assert.equal(currentSource.slice(currentSource.indexOf('  function readConfig()'),currentSource.indexOf('  function message(text)')),baselineSource.slice(baselineSource.indexOf('  function readConfig()'),baselineSource.indexOf('  function message(text)')),'readConfig remains byte-identical');
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
      res.end(file.endsWith('/app.js')&&new URL(req.url,'http://localhost').searchParams.has('baseline')?baselineSource:await fs.readFile(file));
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
      viewport: { width: 1440, height: 1000 },
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
  const note=id=>page.locator('#generation-note-'+id).textContent();
  const config=()=>page.evaluate(()=>__LIFE_TEST__.readConfig());
  const get=(o,path)=>path.split('.').reduce((at,k)=>at[k],o);
  const setupFixture=async p=>{
    await p.goto(origin+'/Index.html?smoke=1');await p.evaluate(()=>EcoArt.ready);
    await p.evaluate(()=>{
      const c=__LIFE_TEST__.readConfig();c.width=40;c.height=28;c.initial=24;c.lineages='few';c.mapId='river';c.seed='setup-basis-fixture';c.terrainSeed='setup-basis-fixture';
      c.generationSettings={version:'diverse-generation-parameters/1',mode:'auto',profile:'high-production',locks:['mapId','initial']};
      c.producerSettings.land.capacityB=40;c.producerSettings.land.regrowthB=4;
      c.producerSettings.water.occupancy=.25;c.largePlantSettings.initial.ageFraction=.2;c.informationSettings.influence=2;
      __LIFE_TEST__.prepare(c);
    });
    await p.click('#change-world');
  };
  try {
    const baseline=await browser.newPage();await baseline.route('**/app.js',r=>r.continue({url:r.request().url()+'?baseline=1'}));
    await setupFixture(baseline);
    const oldBefore=await baseline.evaluate(()=>({display:Number(document.getElementById('colony-land-capacity').value),next:__LIFE_TEST__.readConfig().producerSettings.land.capacityB,note:document.getElementById('generation-note-colony-land-capacity').textContent}));
    await baseline.locator('#lower-initial-settings').evaluate(e=>e.open=true);await baseline.click('#reset-lower-settings');
    const oldReset=await baseline.evaluate(()=>({display:Number(document.getElementById('colony-land-capacity').value),next:__LIFE_TEST__.readConfig().producerSettings.land.capacityB}));
    check(oldBefore.display===60&&oldBefore.next===40&&oldBefore.note.includes('表示中の値は基準値')&&oldReset.display===20&&oldReset.next===40,'baseline reproduces misleading basis and ineffective lower reset');
    await baseline.close();
    await setupFixture(page);
    const retained=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length}));
    const before=await config();
    check(Number(await page.inputValue('#colony-land-capacity'))===60&&before.producerSettings.land.capacityB===40,'previous effective value and next base stay distinct');
    check((await note('colony-land-capacity')).includes('40 B／群落'),'capacity note shows the real next basis');
    check((await note('colony-land-regrowth')).includes('4 B／群落／T'),'regrowth basis has absolute units rather than the previous effective percentage');
    check((await note('density-plant-water')).includes('25%')&&(await note('large-plant-age')).includes('20%'),'fractional occupancy and age basis use percentage units');
    check((await note('information-influence')).includes('2'),'information influence shows its retained basis');
    await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);
    await value('colony-water-capacity',45);
    check((await config()).generationSettings.locks.includes('producerSettings.water.capacityB'),'explicit lower override is tracked');
    await page.click('#reset-lower-settings');const reset=await config();
    check(reset.producerSettings.land.capacityB===20&&reset.producerSettings.water.capacityB===20,'lower reset updates the actual next basis, including an overridden field');
    check(reset.producerSettings.land.regrowthB===2&&reset.informationSettings.influence===1&&reset.largePlantSettings.initial.ageFraction===0,'reset also clears retained regrowth, information and age bases');
    check(reset.generationSettings.locks.includes('producerSettings.water.capacityB')&&!reset.generationSettings.locks.includes('producerSettings.land.capacityB'),'reset retains manual/automatic ownership');
    check(reset.initial===before.initial&&reset.mapId===before.mapId&&JSON.stringify(reset.producerSupport)===JSON.stringify(before.producerSupport)&&JSON.stringify(reset.advantageSettings)===JSON.stringify(before.advantageSettings),'main, terrain, supply and advantages are retained');
    await page.locator('#colony-water-capacity').locator('xpath=ancestor::*[contains(@class,"generation-field")]').locator('.generation-auto-return').click();
    await value('colony-land-capacity',33);
    check((await config()).producerSettings.land.capacityB===33,'editing still adopts a new specified value');
    await page.locator('#colony-land-capacity').locator('xpath=ancestor::*[contains(@class,"generation-field")]').locator('.generation-auto-return').click();
    check((await note('colony-land-capacity')).includes('表示中の値は基準値')&&(await config()).producerSettings.land.capacityB===33,'unlock after reset uses the current input as the new base');
    await page.selectOption('#generation-mode','manual');
    check((await note('colony-land-capacity')).includes('表示中の値を使います')&&(await config()).producerSettings.land.capacityB===33,'manual mode keeps direct-value semantics');
    await page.selectOption('#generation-mode','auto');
    await page.locator('#setup-step-4').screenshot({path:path.join(out,'lower-reset.png')});
    await page.click('#cancel-settings');
    check(await page.evaluate(r=>__LIFE_TEST__.fingerprint()===r.hash&&__LIFE_TEST__.observations().rows.length===r.rows,retained),'editing and lower reset leave the current world and records unchanged');
    await page.click('#change-world');await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);
    await page.locator('#colony-land-capacity').locator('xpath=ancestor::*[contains(@class,"generation-field")]').screenshot({path:path.join(out,'generation-basis.png')});
    check((await note('colony-land-capacity')).includes('40 B／群落'),'cancel and reopen restore the current world basis');
    check(!errors.length,'no browser runtime errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,baseline:'4a1ce12',checks,oldBefore,oldReset,beforeBase:before.producerSettings.land,resetBase:reset.producerSettings.land,errors,browser:browser.version(),scope:'small initial fixtures, retained bases and UI resets only; no future biology or Windows/performance/distribution certification'},null,2));console.log(JSON.stringify({ok:true,checks:checks.length}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
