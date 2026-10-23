"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/setup-flow-v1",
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
    const order=await page.evaluate(()=>({steps:[...document.querySelectorAll('#setup>.setup-step')].map(e=>e.id),top:[...document.querySelectorAll('#setup>.setup-step')].map(e=>e.getBoundingClientRect().top),last:document.getElementById('load').closest('.setup-step').id,groupsFirst:!!(document.getElementById('groups').compareDocumentPosition(document.getElementById('founder-settings'))&Node.DOCUMENT_POSITION_FOLLOWING),duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i)}));
    check(order.steps.join(',')==='setup-step-1,setup-step-2,setup-step-3,setup-step-4,setup-step-5'&&order.top.every((top,i,a)=>!i||top>a[i-1]),'five setup sections follow the same DOM and visual order');
    check(order.last==='setup-step-5'&&order.groupsFirst,'group choices precede dependent initial counts and creation comes last');
    check(!order.duplicateIds.length,'moving controls introduces no duplicated IDs');
    await page.selectOption('#observation-mode','river-settlement');
    await page.locator('#advanced-settings>summary').click();
    check(await page.locator('#map-id').isDisabled()&&await page.locator('#initial').isDisabled()&&await page.locator('#groups input:enabled').count()===0,'fixed mode still locks its map, population and groups');
    check(await page.locator('#lineage-options').isVisible()&&await page.locator('#lineage-options input:enabled').count()===0&&(await page.locator('#main-rule-note').textContent()).includes('自由設定'),'fixed lineage choices stay visible with an explanation above');
    await page.selectOption('#observation-mode','custom');await page.selectOption('#generation-mode','manual');
    check(await page.locator('#generation-profile').isDisabled()&&(await page.locator('#profile-rule-note').textContent()).includes('使用しません'),'manual generation explains why automatic profiles are inactive');
    check(await page.locator('[data-generation-lock="mapId"]').isDisabled()&&await page.locator('[data-generation-lock="mapId"]').isVisible(),'inactive generation locks remain visible instead of disappearing');
    await page.selectOption('#lineages','all');
    check(await page.locator('#lineage-options').isVisible()&&await page.locator('#lineage-options input:enabled').count()===0&&(await page.locator('#lineage-choice-note').textContent()).includes('保存済み'),'unused manual choices are visible and clearly distinguished from actual automatic composition');
    await page.selectOption('#lineages','manual');
    check(await page.locator('#lineage-options input:enabled').count()>0,'choosing manual lineages enables their controls');
    await page.selectOption('#distribution','balanced');
    check(await page.locator('#weight-options').isVisible()&&await page.locator('#weight-options input:enabled').count()===0&&(await page.locator('#weight-choice-note').textContent()).includes('重み付き'),'balanced allocation retains visible inactive weights with its correction');
    await page.selectOption('#distribution','weighted');check(await page.locator('#weight-options input:enabled').count()>0,'weighted allocation makes the retained weights editable');
    await value('group-main',false);
    check(await page.locator('#initial').isDisabled()&&await page.locator('#lineages').isDisabled()&&(await page.locator('#main-rule-note').textContent()).includes('OFF'),'disabling main life deactivates its dependent settings with an explanation');
    await value('group-main',true);await page.selectOption('#distribution','balanced');await page.selectOption('#lineages','few');await page.selectOption('#size','40,28');await value('initial',24);await page.selectOption('#map-id','river');
    await value('producer-supply',false);await page.locator('#producer-supply-settings details').evaluate(e=>e.open=true);
    check(await page.locator('#supply-land-nutrition').isDisabled()&&(await page.locator('#supply-rule-note').textContent()).includes('OFF'),'supply OFF shows its preserved numeric settings as inactive');await value('producer-supply',true);
    await page.locator('#lower-initial-settings').evaluate(e=>e.open=true);await page.locator('#founder-settings').evaluate(e=>e.open=true);await value('founder-grass',2);
    check(await page.locator('#guarantee').isDisabled()&&(await page.locator('#guarantee-rule-note').textContent()).includes('併用できません'),'explicit founders explain why food guarantee cannot be selected');
    await value('group-plant',false);
    check(await page.locator('#founder-grass').isDisabled()&&await page.inputValue('#founder-grass')==='2'&&(await page.locator('#founder-rule-note').textContent()).includes('生産者'),'disabled producer founders retain their values and show the controlling group');
    await value('group-plant',true);await value('founder-grass','');
    await value('founder-algae',1);await value('founder-freshwaterlight',0);await value('founder-tideparasite',2);
    check(await page.locator('#load').isDisabled()&&(await page.locator('#founder-tideparasite-hint').textContent()).includes('合計1枠')&&await page.locator('#founder-tideparasite').getAttribute('aria-invalid')==='true','known host shortage remains blocked and is explained at the field');await value('founder-tideparasite','');await value('founder-algae','');await value('founder-freshwaterlight','');
    await value('initial',4);
    check(await page.locator('#load').isDisabled()&&(await page.locator('#setup-error-initial').textContent()).includes('20以上')&&await page.locator('#show-setup-issue').isVisible(),'population errors appear above the input and provide a repair link');
    await page.click('#show-setup-issue');check(await page.evaluate(()=>document.activeElement.id==='initial'),'the repair button takes focus to the invalid control');
    await value('initial',24);check(await page.locator('#load').isEnabled()&&await page.locator('#setup-error-initial').isHidden()&&!await page.locator('#show-setup-issue').isVisible(),'correcting the field clears the error and re-enables creation');
    check(await page.locator('#initial').getAttribute('aria-invalid')===null&&!((await page.locator('#initial').getAttribute('aria-describedby'))||'').includes('setup-error-initial'),'corrected controls no longer announce a stale field error');
    await page.selectOption('#generation-mode','auto');
    const availability=await page.evaluate(()=>{const select=document.getElementById('map-id');for(const option of select.options){if(option.value==='auto')continue;select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));if(document.querySelector('#generation-profile [value="water-focused"]').disabled)return {blocked:true,note:document.getElementById('profile-rule-note').textContent};}return {blocked:false};});
    check(availability.blocked&&availability.note.includes('水域中心'),'unavailable terrain profiles are disabled and their prerequisite is explained');
    await page.click('#reset-setup');check(await page.locator('#load').isEnabled()&&!await page.locator('#show-setup-issue').isVisible(),'reset synchronizes all step notices and validity');
    await page.setViewportSize({width:390,height:844});
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'the ordered setup fits a 390px viewport without horizontal scrolling');
    await page.screenshot({path:path.join(out,'setup-mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:1000});
    await page.screenshot({path:path.join(out,'setup-desktop.png'),fullPage:true});
    await page.selectOption('#generation-mode','manual');await page.selectOption('#size','40,28');await page.selectOption('#map-id','river');await page.selectOption('#lineages','few');await value('initial',24);await submit();
    check(await page.evaluate(()=>!document.body.classList.contains('setup-screen')&&__LIFE_TEST__.snapshot().world.config.initial===24),'the final action creates the requested world and enters observation');
    const saved=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length,generation:__LIFE_TEST__.snapshot().worldGeneration}));await page.click('#change-world');await value('initial',28);await page.click('#cancel-settings');
    check(await page.evaluate(b=>__LIFE_TEST__.fingerprint()===b.hash&&__LIFE_TEST__.observations().rows.length===b.rows&&__LIFE_TEST__.snapshot().worldGeneration===b.generation&&!__LIFE_TEST__.snapshot().running,saved),'cancelling edited settings preserves the current world, rows and paused intent');
    check(errors.length===0,'no browser runtime errors');check(external.length===0,'no external requests');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,app:require('../package.json').version,checks,errors,external,order,availability,browser:browser.version(),scope:'representative setup states, one small-world creation and cancellation; no all-capacity, Windows or performance certification'},null,2));console.log(JSON.stringify({ok:true,checks:checks.length}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error),message:await page.locator('#setup-message').textContent()},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
