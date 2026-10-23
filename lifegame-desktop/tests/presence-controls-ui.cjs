"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/presence-controls-v1",
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
  const preflight=process.env.PRESENCE_PREFLIGHT==='1';let located;
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    const fixture=await page.evaluate(()=>{
      window.presenceConfig={...__LIFE_TEST__.readConfig(),seed:'presence-controls',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]},founderCounts:{version:1,species:{},parasites:{leafparasite:4,tideparasite:2,hyperparasite:2}}};
      const w=__LIFE_TEST__.prepare(presenceConfig);window.presenceWorld=w;if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      const S=EcoState,entry=S.PrimaryParasite.entries(w).find(e=>e.host);if(!entry)throw Error('No hosted P display source');if(!entry.p.q){const source=S.HyperParasite.entries(w)[0]?.q;if(!source)throw Error('No Q display source');entry.p.q=structuredClone(source);entry.p.q.id+=':host-fixture';entry.p.q.hostId=entry.p.id;entry.p.q.phase=2;entry.p.q.hyper.state='larva';}
      const center=S.index(w,20,14);entry.host.cell=center;const main=entry.host.slot==='main'?entry.host:w.organisms.find(o=>o.slot==='main');main.cell=center;
      for(const group of ['plant','prey','fungus']){const o=w.organisms.find(o=>S.spec(o).group===group);if(!o)throw Error('No '+group+' label fixture');o.cell=center;}
      function copy(suffix){const p=structuredClone(entry.p);p.id+=':'+suffix;p.hostId=suffix;p.q.id+=':'+suffix;p.q.hostId=p.id;return p;}
      w.carcasses.push({id:'presence-carcass',species:entry.host.species,slot:entry.host.slot,cell:center+1,q:1,E:1,M:0,G:0,created:0,expires:20,payloadExpires:10,infection:copy('carcass')});
      w.pending.push({id:'presence-pending',kind:'primary-migration',infection:copy('pending'),cell:center+2,hostId:entry.host.id,createdAt:0,establishAt:1,expires:2});
      w.carcasses.push({id:'presence-expired',species:entry.host.species,slot:entry.host.slot,cell:center+3,q:1,E:1,M:0,G:0,created:0,expires:20,payloadExpires:0,infection:copy('expired')});
      __LIFE_TEST__.refresh();window.presenceFixture={center,main:main.id,carcass:center+1,pending:center+2,expired:center+3,species:entry.p.species};return presenceFixture;
    });
    await page.evaluate(species=>{document.querySelector('[data-highlight="'+species+'"]').click();document.querySelector('[data-highlight="hyperparasite"]').click();__LIFE_TEST__.draw();},fixture.species);
    located=await page.evaluate(f=>{const cells=__LIFE_TEST__.snapshot().render.highlightedCells;return Object.fromEntries(['carcass','pending','expired'].map(k=>[k,cells.find(c=>c.cell===f[k])||null]));},fixture);
    if(!preflight){
      check(['carcass','pending'].every(k=>located[k]?.ids.includes(fixture.species)&&located[k].ids.includes('hyperparasite')),'living P and its Q are located on both carcass and migration carrier cells');
      check(['carcass','pending'].every(k=>new Set(located[k].colors).size===2),'overlapping P/Q keep two distinct individual lineage colors');
      check(!located.expired,'an expired payload never creates a living-parasite highlight');
      await page.evaluate(()=>{for(const group of ['P','Q'])document.querySelector('[data-highlight-group-color="'+group+'"]').click();__LIFE_TEST__.draw();});
      check(await page.evaluate(f=>{const cells=__LIFE_TEST__.snapshot().render.highlightedCells;return [f.carcass,f.pending].every(cell=>{const c=cells.find(c=>c.cell===cell);return c?.groups.includes('P')&&c.groups.includes('Q')&&c.groupColors.length===2&&c.ids.length===2;});},fixture),'pale class tints coexist with per-lineage colors at external carriers');
      check(await page.evaluate(()=>{const original=EcoState.PrimaryParasite.entries;let calls=0;EcoState.PrimaryParasite.entries=function(...a){calls++;return original.apply(this,a);};try{__LIFE_TEST__.draw();__LIFE_TEST__.draw();__LIFE_TEST__.draw();return calls===0;}finally{EcoState.PrimaryParasite.entries=original;}}),'settled redraws reuse the current-world parasite presence index');
      await page.click('#clear-highlights');await page.evaluate(()=>__LIFE_TEST__.draw());check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return !s.view.highlights.length&&!s.view.highlightGroups.length&&!s.render.highlightedCells.length;}),'clear removes both class and individual highlights');
      await page.locator('[data-highlight-group="main"]').check();check(await page.evaluate(()=>{const members=[...document.querySelectorAll('[data-group="main"] .map-key-item:not([hidden]) [data-highlight]')];return members.length>1&&members.every(i=>i.checked);}), 'class selection selects every currently listed main lineage');
      await page.locator('[data-group="main"] .map-key-item:not([hidden]) [data-highlight]').first().uncheck();check(await page.locator('[data-highlight-group="main"]').evaluate(e=>e.indeterminate),'partial lineage selection is shown as an intermediate class checkbox');await page.click('#clear-highlights');
      await page.evaluate(f=>{__LIFE_TEST__.select(f.center,f.main);document.getElementById('detail-view').click();__LIFE_TEST__.draw();},fixture);
      const off=await page.evaluate(()=>__LIFE_TEST__.snapshot().render.nameLabels);
      check(off.main>0&&off.producer===0&&off.basal===0&&off.prey===0&&off.P===0&&off.Q===0,'near view keeps main names and hides unselected non-main names by default');
      await page.evaluate(()=>{for(const id of ['names-basal','names-prey','names-P','names-Q'])document.getElementById(id).click();__LIFE_TEST__.draw();});
      const on=await page.evaluate(()=>__LIFE_TEST__.snapshot().render.nameLabels);check(on.producer+on.basal>0&&on.prey>0&&on.P>0&&on.Q>0,'existing name controls enable producer, consumer and hosted P/Q labels');
      await page.evaluate(()=>{for(const id of ['names-basal','names-prey','names-P','names-Q'])document.getElementById(id).click();__LIFE_TEST__.draw();});
      check(await page.evaluate(()=>{const n=__LIFE_TEST__.snapshot().render.nameLabels;return n.main>0&&n.producer+n.basal+n.prey+n.P+n.Q===0;}),'switching those names off restores the uncluttered near view');
      await page.evaluate(()=>{__LIFE_TEST__.prepare({...presenceConfig,seed:'presence-running'});});await page.click('#start');const turn=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);
      await page.evaluate(()=>{document.querySelector('[data-highlight-group-color="main"]').click();document.getElementById('names-prey').click();});
      await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,turn,{timeout:20000});check(await page.evaluate(()=>{const s=__LIFE_TEST__.snapshot();return s.running&&!s.holds.length&&!s.playbackError;}),'changing label and class-tint controls keeps actual Worker observation running');await page.evaluate(()=>__LIFE_TEST__.stop());
      await page.goto(origin+'/Index.html');
      check(await page.locator('#step').isHidden()&&await page.locator('#focus-view').isHidden(),'production setup hides retired step and observation-layout controls without the smoke override');
      check(errors.length===0,'no uncaught browser errors');
    }
    await fs.writeFile(path.join(out,preflight?'preflight.json':'report.json'),JSON.stringify({ok:!preflight,checks,errors,fixture,located,scope:'Linux Chromium actual controls, explicit carcass/migration display fixtures and a fresh real-Worker run'},null,2));console.log(JSON.stringify({preflight,checks,located}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,located,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
