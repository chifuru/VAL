"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/terrain-symbols",
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
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    ...(process.platform === "linux"
      ? { executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" }
      : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1450, height: 1000 },
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
    await page.goto(origin + "/Index.html?smoke=1");
    await page.evaluate(() => EcoArt.ready);
    await page.evaluate(() => {
      const t = __LIFE_TEST__, w = t.prepare({seed:"presence-review",width:40,height:28,initial:80,mapId:"river"});
      const a = w.organisms.filter(o=>o.slot==="main").sort((a,b)=>Math.abs(a.cell-580)-Math.abs(b.cell-580));
      for(const o of a.slice(0,6)){o.phase=3;o.age=50;o.birthLife=240;}
      t.select(a[0].cell); t.refresh();
    });
    check(!await page.locator("#simplified").isChecked(), "close-view symbols are optional by default");
    await page.click("#detail-view"); await page.waitForTimeout(120);
    const before = await page.evaluate(()=>__LIFE_TEST__.fingerprint());
    const anchors = await page.evaluate(()=>__LIFE_TEST__.snapshot().world.organisms.map(o=>__LIFE_TEST__.screenForCell(o.cell)));
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode==="detail"), "near view defaults to detailed creatures");
    await page.locator("#board").screenshot({path:path.join(out,"near-detail.png")});
    await page.check("#simplified"); await page.waitForTimeout(120);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode==="simple"), "near view supports manual symbols");
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.materialPixelsPerCell>=128), "near symbols retain detailed painted terrain");
    assert.deepEqual(await page.evaluate(()=>__LIFE_TEST__.snapshot().world.organisms.map(o=>__LIFE_TEST__.screenForCell(o.cell))),anchors);
    checks.push("changing representation retains every projected organism anchor");
    await page.locator("#board").screenshot({path:path.join(out,"near-symbols.png")});
    await page.click("#fit"); await page.waitForTimeout(120);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode!=="detail"), "overview forces symbols");
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.drawn===__LIFE_TEST__.snapshot().world.organisms.length), "overview retains all real organisms");
    await page.locator("#board").screenshot({path:path.join(out,"far.png")});
    await page.uncheck("#simplified"); await page.waitForTimeout(120);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode!=="detail"), "overview remains symbolic when manual preference is off");
    await page.check("#simplified"); await page.click("#detail-view"); await page.click("#zoom-out"); await page.click("#zoom-in"); await page.waitForTimeout(120);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.mode==="simple"&&__LIFE_TEST__.snapshot().view.simplified), "manual symbol preference survives zoom and camera changes");
    check(await page.evaluate(()=>__LIFE_TEST__.fingerprint())===before,"camera and representation do not change ecology");
    const terrain = await page.evaluate(()=>{
      const w=__LIFE_TEST__.snapshot().world;
      w.tiles=w.tiles.map((t,p)=>({...t,terrain:"plain",env:p%40<20?3:4}));
      const P=EcoProjection.build(w),h=EcoHabitat.create(w,P,EcoArt);
      const a=h.sample(19.5,10.5).frost,b=h.sample(20,10.5).frost,c=h.sample(20.5,10.5).frost;
      const delta=Math.abs(h.sample(20-0.0001,10.5).frost-h.sample(20+0.0001,10.5).frost);
      const slope=EcoHabitat.create(w,{...P,height:(x,y)=>x*.1+y*.1},EcoArt).relief(10,10);
      const opposite=EcoHabitat.create(w,{...P,height:(x,y)=>-x*.1-y*.1},EcoArt).relief(10,10);
      return {a,b,c,delta,lit:slope.light,shadow:opposite.shade};
    });
    check(terrain.a>0&&terrain.a<terrain.b&&terrain.b<terrain.c&&terrain.c<1,"environment textures overlap on both sides of their boundary");
    check(terrain.delta<0.001,"environment material weights are continuous at the boundary");
    check(terrain.lit>0&&terrain.shadow>0,"relief distinguishes sun-facing and shaded slopes");
    await page.evaluate(()=>{
      const t=__LIFE_TEST__,w=t.prepare({seed:"host-detail",width:40,height:28,initial:80,mapId:"river"});
      const a=w.organisms.find(o=>o.slot==="main");a.infection=EcoState.infection(w,"leafparasite",a.id);a.infection.q=EcoState.hyper(w,a.infection.id);t.select(a.cell);t.refresh();
    });
    await page.click("#detail-view"); await page.waitForTimeout(120);
    check(await page.evaluate(()=>{const r=__LIFE_TEST__.snapshot().render;return r.infectedHosts>0&&r.highParasites>0}),"symbol mode retains host P/Q markers");
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.statusBadges>0), "near symbols show separate status badges");
    await page.uncheck("#status-marks"); await page.waitForTimeout(100);
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.statusBadges===0), "status badges can be hidden independently");
    await page.check("#status-marks");
    const badgeCases=await page.evaluate(()=>{
      const t=__LIFE_TEST__,w=t.prepare({seed:"badge-contract",width:40,height:28,initial:80,mapId:"river"}),a=w.organisms.find(o=>o.slot==="main");
      t.select(a.cell);document.getElementById("detail-view").click();
      const original=CanvasRenderingContext2D.prototype.fillText;let texts=[],count=0;
      CanvasRenderingContext2D.prototype.fillText=function(text,...args){texts.push(String(text));return original.call(this,text,...args)};
      try {
        for(const sex of ["male","female",null]) for(const [age,label] of [[0,"幼体"],[50,"成体"],[190,"老齢"]]) for(const phase of [1,2,3,4]) {
          Object.assign(a,{sex,age,phase,birthLife:240,branch3:phase>=3?2:null,branch4:phase===4?1:null});
          texts=[];t.draw();
          const expected=["I","II","III-C","IV-C2"][phase-1];
          if(!texts.includes(sex==="male"?"♂":sex==="female"?"♀":"—")||!texts.includes(label)||!texts.includes(expected))throw Error("Missing state badge "+JSON.stringify({sex,age,phase,texts}));
          count++;
        }
      } finally {CanvasRenderingContext2D.prototype.fillText=original;}
      const before=t.fingerprint();t.draw();if(t.fingerprint()!==before)throw Error("Badges changed ecology");
      return count;
    });
    check(badgeCases===36,"sex, age and all four phases render independently across 36 state combinations");
    await page.evaluate(()=>{const t=__LIFE_TEST__,w=t.prepare({seed:"critical-badge",width:40,height:28,initial:80,mapId:"river"}),a=w.organisms.find(o=>o.slot==="main");a.HP=20;t.select(a.cell);t.refresh();document.getElementById("detail-view").click();});
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().render.criticalMarkers>0),"low-health warning is visible in close view");
    const idle=await page.evaluate(()=>{const t=__LIFE_TEST__;t.drawIfChanged(performance.now()+5000);const n=t.snapshot().render.frames;for(let i=0;i<200;i++)t.drawIfChanged(performance.now()+5000);return t.snapshot().render.frames-n});
    check(idle===0,"200 identical idle updates add zero full redraws");
    await page.setViewportSize({width:480,height:860}); await page.locator("#simplified").scrollIntoViewIfNeeded();
    check(await page.locator("#simplified").isVisible(),"symbol control is reachable on narrow screens");
    check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"narrow view has no horizontal overflow");
    check(errors.length===0,"no browser exceptions"); check(external.length===0,"no external requests");
    await fs.writeFile(path.join(out,"report.json"),JSON.stringify({ok:true,checks,terrain,idle,errors,fixture:"explicit phase III artwork fixture; not natural evolution",browser:browser.version()},null,2));
    console.log(JSON.stringify({ok:true,checks,terrain,idle}));
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
