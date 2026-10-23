"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/setup-intent-v2",
  );
  await fs.mkdir(out, { recursive: true });
  const baselineSource=require('node:child_process').execFileSync('git',['show','e32bcac:lifegame-desktop/src/app.js'],{encoding:'utf8'});
  const currentSource=await fs.readFile('src/app.js','utf8');
  assert.equal(currentSource.slice(currentSource.indexOf('  function readConfig()'),currentSource.indexOf('  function message(text)')).replace("parameters({version:'primary-parameters/2',automaticCounts:{tideparasite:8},carrierTurns",'parameters({carrierTurns').replace("      primaryEggSettings:S.PrimaryParasite.eggParameters({version:'primary-egg-parameters/2',waterStepRange:2}),\n",'').replace("      primaryEggModel:'egg/1',\n",''),baselineSource.slice(baselineSource.indexOf('  function readConfig()'),baselineSource.indexOf('  function message(text)')),'readConfig retains the previous contract apart from the explicit egg settings and automatic water founder allocation');
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
  const source=id=>page.locator('#'+id).locator('xpath=ancestor::*[contains(@class,"generation-field")]').getAttribute('data-source');
  const summary=()=>page.locator('#setup-effective-summary').textContent();
  const cfg=async p=>p.evaluate(()=>{const c=__LIFE_TEST__.readConfig();delete c.seed;delete c.terrainSeed;delete c.primaryEggModel;delete c.primaryEggSettings;if(c.primaryParasiteSettings.version==='primary-parameters/2'){c.primaryParasiteSettings.version='primary-parameters/1';delete c.primaryParasiteSettings.automaticCounts;}return c;});
  try {
    const baseline=await browser.newPage();
    await baseline.route('**/app.js',r=>r.continue({url:r.request().url()+'?baseline=1'}));
    await Promise.all([page.goto(origin+'/Index.html?smoke=1'),baseline.goto(origin+'/Index.html?smoke=1')]);
    await page.evaluate(()=>EcoArt.ready);
    const variants=[];
    for(const set of ['custom','river-settlement','lake-foodweb'])for(const mode of ['auto','manual']){
      for(const p of [page,baseline]){
        await p.click('#reset-setup');await p.selectOption('#observation-mode',set);await p.selectOption('#generation-mode',mode);
      }
      assert.deepEqual(await cfg(page),await cfg(baseline));
      const text=await summary();
      check(await source('map-id')===(set!=='custom'?'preset':mode==='auto'?'auto':'specified'),'terrain provenance: '+set+'/'+mode);
      check(set==='custom'?text.includes('作成時に決定'):text.includes('640体')&&text.includes(set==='river-settlement'?'7系統':'5系統'),'effective summary: '+set+'/'+mode);
      check(await page.locator('#generation-profile').isDisabled()===(mode==='manual'),'profile applicability: '+set+'/'+mode);
      variants.push({set,mode,summary:text});
    }
    check(true,'all six variants preserve the baseline config, excluding generated UUIDs');
    await baseline.close();
    await page.click('[data-observation-set="custom"]');await page.selectOption('#generation-mode','auto');
    check(await page.inputValue('#observation-mode')==='custom'&&await page.getAttribute('[data-observation-set="custom"]','aria-pressed')==='true','set cards synchronize the canonical select');
    await value('initial',200);
    check(await source('initial')==='specified'&&(await summary()).includes('200体'),'editing a base value makes it a specified value in the summary');
    await page.locator('#initial').locator('xpath=ancestor::*[contains(@class,"generation-field")]').locator('.generation-auto-return').click();
    check(await source('initial')==='auto'&&!(await summary()).includes('200体'),'return to automatic removes the override without inventing a resolved result');
    await page.selectOption('#generation-mode','manual');await page.selectOption('#map-id','auto');
    check((await summary()).includes('候補から作成時に決定'),'manual terrain auto is still unresolved');
    await value('producer-supply',false);await value('group-plant',false);
    check((await summary()).includes('保存中の供給倍率は使いません')&&await page.locator('#density-plant').locator('xpath=ancestor::*[contains(@class,"generation-field")]').locator('.generation-source').textContent()==='今回は不使用','group OFF and supply OFF are unused, not preset fixed');
    await value('founder-grass',25);
    check(!(await summary()).includes('草本 25'),'disabled saved founder values are excluded from effective conditions');
    await value('group-plant',true);await value('founder-grass',0);
    check((await summary()).includes('草本 初期配置なし'),'explicit zero founder count is distinct from automatic');
    await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.locator('#reset-lower-settings').click();
    check((await summary()).includes('種別初期数は空欄＝自動')&&!(await summary()).includes('草本 初期配置なし'),'lower reset refreshes the effective summary');
    await page.locator('#lower-initial-settings').evaluate(e=>e.open=false);
    await page.locator('[data-setup-target="lower-distribution"]').click();
    check(await page.locator('#lower-initial-settings').evaluate(e=>e.open)&&await page.evaluate(()=>document.activeElement.id==='lower-distribution'),'change link opens the relevant details and focuses its control');
    await page.click('[data-observation-set="river-settlement"]');await page.selectOption('#size','40,28');
    check((await summary()).includes('160体')&&await page.locator('#map-id').isDisabled()&&await page.locator('#producer-supply').isEnabled(),'preset count follows world size and supply stays editable');
    await page.locator('[data-setup-target="map-id"]').click();
    check(await page.evaluate(()=>document.activeElement.id==='observation-mode'),'change link for a preset-fixed value leads to its controlling set');
    await page.click('[data-observation-set="custom"]');await page.selectOption('#generation-mode','auto');await page.selectOption('#map-id','auto');await page.selectOption('#generation-profile','water-focused');
    const profile=await page.evaluate(()=>{
      const e=document.getElementById('map-id');
      for(const o of e.options){if(o.value==='auto')continue;e.value=o.value;e.dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#generation-profile [value="water-focused"]').disabled)return {value:document.getElementById('generation-profile').value,note:document.getElementById('profile-change-note').textContent,visible:!document.getElementById('profile-change-note').hidden};}
    });
    check(profile?.value==='auto'&&profile.visible&&profile.note.includes('戻しました'),'existing unavailable-profile reset is announced locally');
    await page.click('#reset-setup');
    check(await page.locator('#profile-change-note').isHidden(),'reset clears the old profile notice');
    await page.evaluate(()=>{for(const d of document.querySelectorAll('#setup details'))d.open=false;});
    await page.screenshot({path:path.join(out,'setup-desktop.png'),fullPage:true});
    await page.locator('#setup-step-1').screenshot({path:path.join(out,'observation-conditions.png')});
    await page.locator('#setup-step-5').screenshot({path:path.join(out,'effective-conditions.png')});
    await page.click('[data-observation-set="lake-foodweb"]');await page.locator('#setup-step-2').screenshot({path:path.join(out,'preset-values.png')});
    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'390px setup has no horizontal overflow');
    await page.screenshot({path:path.join(out,'setup-mobile.png'),fullPage:true});
    check(errors.length===0,'no browser runtime errors');check(external.length===0,'no external requests');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,app:require('../package.json').version,baseline:'e32bcac',checks,variants,profile,errors,external,browser:browser.version(),scope:'six configuration equivalence comparisons and representative setup UI states; no biology, Windows, distribution or general performance certification'},null,2));console.log(JSON.stringify({ok:true,checks:checks.length}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
