"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/hidden-inspector-updates-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const originalApp=require('node:child_process').execFileSync('git',['show','e7186a1:lifegame-desktop/src/app.js'],{encoding:'utf8'});
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
      if(file===path.resolve('src/before-app.js'))res.end(originalApp);
      else if(file===path.resolve('src/Index.html')&&new URL(req.url,'http://localhost').searchParams.has('baseline'))res.end((await fs.readFile(file,'utf8')).replace('<script src="app.js">','<script src="before-app.js">'));
      else res.end(await fs.readFile(file));
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




  const crypto=require('node:crypto'),digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),metrics={},comparisons=[];
  async function capture(baseline){
    await page.goto(origin+'/Index.html?smoke=1'+(baseline?'&baseline=1':''));await page.evaluate(()=>EcoArt.ready);await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{
      window.hiddenConfig={...__LIFE_TEST__.readConfig(),seed:'hidden-panels',terrainSeed:'hidden-panels-terrain',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      window.hiddenWorld=__LIFE_TEST__.prepare(hiddenConfig);if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      const target=hiddenWorld.organisms.find(o=>o.slot==='main');window.hiddenTarget={id:target.id,cell:target.cell,species:target.species};
      const check=document.querySelector('[data-highlight="'+target.species+'"]'),group=document.querySelector('[data-highlight-group-color="main"]');
      check.checked=true;check.dispatchEvent(new Event('change'));group.checked=true;group.dispatchEvent(new Event('change'));
      __LIFE_TEST__.select(target.cell,target.id);document.getElementById('rank-panel').open=true;
      window.panelWrites=run=>{
        const key=document.getElementById('species-key'),ranking=document.getElementById('ranking'),k=new MutationObserver(()=>{}),r=new MutationObserver(()=>{});
        k.observe(key,{childList:true,subtree:true});r.observe(ranking,{childList:true});
        try{run();return {keyCountWrites:k.takeRecords().filter(m=>m.target.nodeType===1&&m.target.matches('[data-count]')).length,rankingWrites:r.takeRecords().length};}finally{k.disconnect();r.disconnect();}
      };
      window.frozenDetail=document.getElementById('selection').innerHTML;
    });await page.waitForTimeout(80);
    const hiddenKey=await page.evaluate(()=>panelWrites(()=>{for(let i=0;i<3;i++)__LIFE_TEST__.step();}));
    const detail=await page.evaluate(()=>({frozen:document.getElementById('selection').innerHTML===frozenDetail,html:document.getElementById('selection').innerHTML,ranking:document.getElementById('ranking').innerHTML,rows:JSON.stringify(__LIFE_TEST__.observations().rows),fingerprint:__LIFE_TEST__.fingerprint()}));
    await page.click('#inspector-tab-key');
    const restoredKey=await page.evaluate(()=>{
      const counts=__LIFE_TEST__.observations().rows.at(-1).current.counts,s=__LIFE_TEST__.snapshot();
      return {html:document.getElementById('species-key').innerHTML,countsCorrect:[...document.querySelectorAll('#species-key [data-count]')].every(e=>e.textContent===String(counts[e.dataset.count]||0)&&e.closest('.map-key-item').hidden===!(counts[e.dataset.count]>0)),highlights:s.view.highlights,groups:s.view.highlightGroups,tab:document.getElementById('inspector-key').hidden};
    });
    const hiddenRanking=await page.evaluate(()=>panelWrites(()=>__LIFE_TEST__.step()));
    await page.focus('#inspector-tab-key');await page.keyboard.press('ArrowLeft');
    const restoredDetail=await page.evaluate(()=>({frozen:document.getElementById('selection').innerHTML===frozenDetail,ranking:document.getElementById('ranking').innerHTML,tab:document.getElementById('inspector-details').hidden,focus:document.activeElement.id}));
    await page.evaluate(()=>document.getElementById('rank-panel').open=false);await page.waitForTimeout(30);
    const closedRanking=await page.evaluate(()=>panelWrites(()=>__LIFE_TEST__.step()));
    const end=await page.evaluate(()=>({rows:JSON.stringify(__LIFE_TEST__.observations().rows),fingerprint:__LIFE_TEST__.fingerprint(),turn:__LIFE_TEST__.snapshot().world.turn}));
    await page.evaluate(()=>{hiddenWorld=__LIFE_TEST__.prepare({...hiddenConfig,seed:'hidden-panels-new'});});
    const newWorld=await page.evaluate(()=>({html:document.getElementById('species-key').innerHTML,tab:document.getElementById('inspector-key').hidden,selected:__LIFE_TEST__.snapshot().selectedId,highlights:__LIFE_TEST__.snapshot().view.highlights}));
    return {hiddenKey,detail,restoredKey,hiddenRanking,restoredDetail,closedRanking,end,newWorld};
  }
  try{
    const before=await capture(true),after=await capture(false);
    metrics.hiddenKey={before:before.hiddenKey,after:after.hiddenKey};metrics.hiddenRanking={before:before.hiddenRanking,after:after.hiddenRanking};
    check(before.hiddenKey.keyCountWrites>0&&after.hiddenKey.keyCountWrites===0,'hidden species/count list receives no count writes across three committed turns');
    check(before.hiddenKey.rankingWrites===3&&after.hiddenKey.rankingWrites===3,'visible open ranking still updates on every committed turn');
    check(before.detail.frozen&&after.detail.frozen&&before.detail.html===after.detail.html,'frozen detail HTML remains identical to prior app');
    check(before.detail.rows===after.detail.rows&&before.detail.fingerprint===after.detail.fingerprint,'three-turn hidden-panel optimization leaves observation rows and biology unchanged');
    check(after.restoredKey.countsCorrect&&!after.restoredKey.tab&&before.restoredKey.html===after.restoredKey.html,'returning to key tab immediately restores latest counts, extinction visibility and HTML');
    check(JSON.stringify(before.restoredKey.highlights)===JSON.stringify(after.restoredKey.highlights)&&JSON.stringify(before.restoredKey.groups)===JSON.stringify(after.restoredKey.groups)&&after.restoredKey.highlights.length>0&&after.restoredKey.groups.includes('main'),'individual and group-color highlights survive hidden-tab turns');
    check(before.hiddenRanking.rankingWrites===1&&after.hiddenRanking.rankingWrites===0,'open ranking under hidden parent receives no regeneration');
    check(after.hiddenRanking.keyCountWrites>0,'visible key list still updates normally');
    check(!after.restoredDetail.tab&&after.restoredDetail.focus==='inspector-tab-details'&&after.restoredDetail.ranking===before.restoredDetail.ranking,'keyboard tab return refreshes open ranking to the latest values');
    check(after.restoredDetail.frozen&&after.restoredDetail.ranking===before.restoredDetail.ranking,'ranking refresh does not refresh frozen individual details');
    check(after.closedRanking.rankingWrites===0&&before.closedRanking.rankingWrites===0,'closed ranking stays idle');
    check(before.end.turn===5&&after.end.turn===5&&before.end.rows===after.end.rows&&before.end.fingerprint===after.end.fingerprint,'all five committed turns and original biology remain identical');
    check(!after.newWorld.tab&&after.newWorld.selected===null&&after.newWorld.highlights.length===0&&before.newWorld.html===after.newWorld.html,'new world resets selection/highlights and starts with current key content');
    comparisons.push({key_sha256:digest(after.restoredKey.html),ranking_sha256:digest(after.restoredDetail.ranking),rows_sha256:digest(after.end.rows)});
    // Fastest commits still retain every row. Explicit tab actions flush only
    // already-committed remainder so the map and newly shown list agree.
    const fast=await page.evaluate(()=>{
      const w=__LIFE_TEST__.prepare({...hiddenConfig,seed:'hidden-panels-fast'}),o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);document.querySelector('#speed [data-speed="max"]').click();
      for(let i=0;i<13;i++)__LIFE_TEST__.step();
      const before=__LIFE_TEST__.snapshot(),hash=__LIFE_TEST__.fingerprint(),rows=JSON.stringify(__LIFE_TEST__.observations().rows);document.getElementById('inspector-tab-key').click();
      const after=__LIFE_TEST__.snapshot(),counts=__LIFE_TEST__.observations().rows.at(-1).current.counts;
      return {beforeTurn:before.world.turn,beforePresented:before.lastPresentedTurn,afterTurn:after.world.turn,afterPresented:after.lastPresentedTurn,rows:after.observationTurns,unchanged:hash===__LIFE_TEST__.fingerprint()&&rows===JSON.stringify(__LIFE_TEST__.observations().rows),mapTurn:Number(document.getElementById('turn').textContent),countsCorrect:[...document.querySelectorAll('#species-key [data-count]')].every(e=>e.textContent===String(counts[e.dataset.count]||0)),running:after.running,holds:after.holds,fault:after.playbackError};
    });
    check(fast.beforeTurn===13&&fast.beforePresented===10&&fast.afterPresented===13&&fast.mapTurn===13&&fast.countsCorrect,'fastest explicit tab change aligns map and list with committed remainder');
    check(fast.afterTurn===13&&fast.rows===14&&fast.unchanged&&!fast.running&&!fast.holds.length&&!fast.fault,'tab refresh does not simulate extra turns, lose rows or change paused intent');
    const closedSelection=await page.evaluate(()=>{
      const w=__LIFE_TEST__.snapshot().world,o=w.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);__LIFE_TEST__.step();
      const a=__LIFE_TEST__.snapshot(),hash=__LIFE_TEST__.fingerprint();document.getElementById('close-species').click();const b=__LIFE_TEST__.snapshot();
      return {turn:b.world.turn,beforePresented:a.lastPresentedTurn,afterPresented:b.lastPresentedTurn,keyVisible:!document.getElementById('inspector-key').hidden,selected:b.selectedId,unchanged:hash===__LIFE_TEST__.fingerprint()};
    });
    check(closedSelection.turn===14&&closedSelection.beforePresented===13&&closedSelection.afterPresented===14&&closedSelection.keyVisible&&closedSelection.selected===null&&closedSelection.unchanged,'clearing selection also aligns the latest committed map/list without recalculation');
    await page.click('#start');await page.waitForFunction(()=>__LIFE_TEST__.snapshot().world.turn>14,null,{timeout:20000});
    const live=await page.evaluate(()=>{document.getElementById('inspector-tab-details').click();document.getElementById('inspector-tab-key').click();const s=__LIFE_TEST__.snapshot();__LIFE_TEST__.stop();return {running:s.running,holds:s.holds,fault:s.playbackError};});
    check(live.running&&!live.holds.length&&!live.fault,'explicit tab switching keeps a real Worker observation running');
    check(errors.length===0,'no uncaught browser errors');
    const source=await fs.readFile('src/app.js','utf8');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,baseline:'e7186a1',app:'4.2.74',source_sha256:crypto.createHash('sha256').update(source).digest('hex'),checks,metrics,comparisons,fast,closedSelection,live,errors,scope:'Linux small deterministic world, five-turn old/new comparison and T13/T14 fastest remainder plus a real Worker continuation; no whole-app speed claim'},null,2));console.log(JSON.stringify({ok:true,checks,metrics,fast,closedSelection,live}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,metrics,errors,error:String(error)},null,2));throw error;}
  finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
