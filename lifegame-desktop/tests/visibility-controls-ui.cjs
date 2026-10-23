"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/visibility-controls-v1",
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
    const fixture=await page.evaluate(()=>{
      window.visibilityConfig={...__LIFE_TEST__.readConfig(),seed:'visibility-controls',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      const w=__LIFE_TEST__.prepare(visibilityConfig);if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      const S=EcoState,source=w.organisms.find(o=>o.slot==='main'),center=S.index(w,20,14);
      w.organisms=[0,1,2].map((i)=>{const o=structuredClone(source);o.id='visibility-age-'+i;o.cell=center+i;o.phase=3;o.infection=null;o.birthLife=300;const a=S.ageInfo(o);o.age=[0,a.matureAt+2,a.elderlyAt+2][i];return o;});
      w.events=[];w.resources=[];w.carcasses=[];w.searchQ=[];w.pending=[];__LIFE_TEST__.refresh();__LIFE_TEST__.select(center+1,w.organisms[1].id);document.getElementById('detail-view').click();return {center,stages:w.organisms.map(o=>({phase:o.phase,age:S.ageInfo(o).stage}))};
    });
    await page.waitForFunction(()=>{const d=__LIFE_TEST__.snapshot().render;return d.mode==='detail'&&!d.terrainPending;},null,{timeout:60000});
    const before=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    check(fixture.stages.every(o=>o.phase===3)&&new Set(fixture.stages.map(o=>o.age)).size===3,'same-phase display fixture contains juvenile, adult and elderly bodies');
    check((await page.locator('label:has(#age-emphasis)').innerText()).includes('幼体・老齢'),'age control names the visible stages instead of an undefined emphasis');
    const control=async(id,value)=>{await page.locator('#'+id).setChecked(value);await page.evaluate(()=>__LIFE_TEST__.draw());};
    await control('status-marks',false);await control('grid',false);await control('age-emphasis',false);
    const read=()=>page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return {view:s.view,render:s.render,pixels:document.querySelector('#board').toDataURL()};});
    const off=await read();await page.locator('#board').screenshot({path:path.join(out,'near-clean.png')});
    await control('grid',true);const grid=await read();check(grid.render.gridCells>0&&off.render.gridCells===0&&grid.pixels!==off.pixels,'grid checkbox changes actual near pixels and visible cell outlines');
    await control('age-emphasis',true);const age=await read();check(age.render.ageMarkers===2&&off.render.ageMarkers===0&&age.pixels!==grid.pixels,'age checkbox draws separate juvenile and elderly marks; adult remains unmarked');
    check(age.render.mode==='detail'&&age.render.drawn===3,'age and grid do not replace detailed bodies with symbols');
    await page.locator('#board').screenshot({path:path.join(out,'near-grid-age.png')});
    await control('age-emphasis',false);await control('grid',false);const restored=await read();check(restored.pixels===off.pixels,'turning both controls off restores the same detailed board pixels');
    await page.click('#fit');await page.waitForTimeout(80);const farOff=await read();
    await control('grid',true);await control('age-emphasis',true);const far=await read();
    check(far.render.mode!=='detail'&&far.render.gridCells>0&&far.render.ageMarkers===2,'overview retains symbolic bodies with grid and independent age marks');
    check(far.pixels!==farOff.pixels,'overview toggles also change actual output');
    await page.locator('#board').screenshot({path:path.join(out,'far-grid-age.png')});
    await control('simplified',true);await page.click('#detail-view');await page.waitForTimeout(80);const simple=await read();
    check(simple.render.mode==='simple'&&simple.render.ageMarkers===2&&simple.render.gridCells>0,'manual near symbols retain age and grid controls');
    check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,'all display switches leave the same world fingerprint');
    const legend=await page.locator('.age-legend').innerText();check(legend.includes('幼体')&&legend.includes('切欠き')&&legend.includes('年齢と進化相は別'),'visible legend distinguishes ages from evolution phase');
    await control('simplified',false);await control('grid',false);await control('age-emphasis',false);
    await page.evaluate(()=>__LIFE_TEST__.prepare({...visibilityConfig,seed:'visibility-running'}));await page.click('#start');const turn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
    await control('grid',true);await control('age-emphasis',true);
    await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,turn,{timeout:20000});check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.running&&!s.holds.length&&!s.playbackError;}),'real Worker continues during grid and age control changes');await page.evaluate(()=>__LIFE_TEST__.stop());
    check(errors.length===0,'no uncaught browser exceptions');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,fixture,diagnostics:{off:off.render,grid:grid.render,age:age.render,far:far.render,simple:simple.render},scope:'Linux Chromium actual controls and labelled same-phase age fixture; fresh unmodified world for Worker observation; no ecological or perceptual universality claim'},null,2));console.log(JSON.stringify({ok:true,checks}));
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
