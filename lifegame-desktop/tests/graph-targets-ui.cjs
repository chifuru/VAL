"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/graph-targets-v1",
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
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{window.graphConfig={...__LIFE_TEST__.readConfig(),seed:'graph-targets-ui',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};__LIFE_TEST__.prepare(graphConfig);document.getElementById('focus-view').click();});
    check(await page.inputValue('#graph-group')==='main'&&await page.inputValue('#graph-species')==='main','default remains all main organisms');
    for(const group of ['main','plant','prey','fungus','P','Q','all']){
      await page.selectOption('#graph-group',group);
      check(await page.evaluate(group=>{const catalogue=__LIFE_TEST__.observations().metadata.species,options=[...document.getElementById('graph-species').options].map(o=>o.value),expected=[group,...(group==='all'?[]:catalogue.filter(s=>s.group===group).map(s=>s.id))];return JSON.stringify(options)===JSON.stringify(expected)&&document.getElementById('graph-species').value===group;},group),'category options match existing catalogue: '+group);
    }
    await page.selectOption('#graph-group','prey');const species=await page.locator('#graph-species option').nth(1).getAttribute('value');await page.selectOption('#graph-species',species);
    check(await page.evaluate(species=>{const rows=__LIFE_TEST__.observations().rows,series=__LIFE_TEST__.observations().series(document.getElementById('graph-species').value);return series.at(-1).total===(rows.at(-1).counts[species]||0)&&document.getElementById('population-legend').textContent.includes(__LIFE_TEST__.observations().metadata.species.find(s=>s.id===species).name);},species),'individual target retains original aggregation and legend');
    const before=await page.evaluate(()=>{const o=__LIFE_TEST__.snapshot().world.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);return {turn:__LIFE_TEST__.snapshot().world.turn,stamp:document.getElementById('selection-controls').dataset.turn,html:document.getElementById('selection').innerHTML};});
    await page.click('#start');await page.selectOption('#graph-group','plant');await page.selectOption('#graph-species','plant');
    await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>=t+2,before.turn,{timeout:20000});
    check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.running&&!s.holds.length&&!s.playbackError&&document.getElementById('graph-species').value==='plant';}),'target changes keep Worker observation progressing');
    check(await page.evaluate(before=>document.getElementById('selection-controls').dataset.turn===before.stamp&&document.getElementById('selection').innerHTML===before.html,before),'graph targeting preserves the frozen individual detail');
    await page.click('#start');const hash=await page.evaluate(()=>__LIFE_TEST__.fingerprint());await page.selectOption('#graph-group','all');
    check(await page.evaluate(hash=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.fingerprint()===hash&&__LIFE_TEST__.observations().series('all').at(-1).total===Object.values(__LIFE_TEST__.observations().rows.at(-1).counts).reduce((s,n)=>s+n,0),hash),'all-organism targeting preserves paused world and total');
    await page.selectOption('#graph-group','prey');await page.selectOption('#graph-species',species);
    await page.evaluate(async()=>{const a=__LIFE_TEST__.archive(),s=__LIFE_TEST__.snapshot(),o=__LIFE_TEST__.observations();const record=a.capture(s.world,'user-ended',o.snapshot());await a.save(record,'normal');});
    await page.click('#open-results');await page.locator('[data-analyze]').first().click();await page.locator('#results-analysis').waitFor({state:'visible'});await page.selectOption('#graph-group','Q');await page.selectOption('#graph-species','Q');await page.click('#back-results');await page.click('#close-results');
    const restored={group:await page.inputValue('#graph-group'),target:await page.inputValue('#graph-species'),expected:species};await fs.writeFile(path.join(out,'archive-return.json'),JSON.stringify(restored,null,2));check(restored.group==='prey'&&restored.target===species,'archive target changes restore live category and individual on return: '+JSON.stringify(restored));
    await page.locator('#graphs-panel').evaluate(e=>{e.style.width='320px';e.style.maxWidth='320px';});
    check(await page.locator('.graph-targets').evaluate(e=>[...e.querySelectorAll('label')].every(x=>{const a=e.getBoundingClientRect(),b=x.getBoundingClientRect();return a.width>=250&&b.left>=a.left-1&&b.right<=a.right+1&&x.querySelector('select').getBoundingClientRect().width>=80;})),'target controls fit a 320px panel fixture with usable select widths');
    check(errors.length===0,'no unhandled browser exceptions');
    await page.locator('.graph-targets').screenshot({path:path.join(out,'narrow-controls.png')});
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,scope:'Linux Chromium, actual Worker, 40x28, seven target groups, archive round trip and a 320px panel fixture'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
