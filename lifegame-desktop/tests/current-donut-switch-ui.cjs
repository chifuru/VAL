"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/current-donut-switch-v1",
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
    await page.evaluate(()=>{
      window.donutConfig={...__LIFE_TEST__.readConfig(),seed:'donut-ui',terrainSeed:'donut-terrain',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      __LIFE_TEST__.prepare(donutConfig);
      if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      const o=__LIFE_TEST__.snapshot().world.organisms.find(o=>o.slot==='main');__LIFE_TEST__.select(o.cell,o.id);
      window.donutFrozen=document.getElementById('selection').innerHTML;
    });
    check(await page.inputValue('#donut-view')==='all','default retains one all-species chart');
    check(await page.locator('#donut-view option').count()===8,'eight existing category/breakdown views are available');
    const modes=await page.evaluate(()=>{
      const control=document.getElementById('donut-view'),canvas=document.getElementById('current-donut'),g=canvas.getContext('2d'),arc=g.arc,stroke=g.stroke,cat=EcoEngine.S.activeSpecies(__LIFE_TEST__.snapshot().world),current=__LIFE_TEST__.observations().rows.at(-1).current;
      const colorContext=document.createElement('canvas').getContext('2d'),normalize=color=>{colorContext.strokeStyle=color;return colorContext.strokeStyle;},results=[];
      let traces=[],lastArc=null;
      g.arc=function(...args){lastArc=args;return arc.apply(this,args);};g.stroke=function(...args){if(lastArc)traces.push({span:lastArc[4]-lastArc[3],color:this.strokeStyle});return stroke.apply(this,args);};
      try{for(const option of control.options){
        traces=[];control.value=option.value;control.dispatchEvent(new Event('change'));
        const byGroup=option.value==='groups',members=cat.filter(s=>option.value==='all'||s.group===option.value),expected=(byGroup?current.groups.map(a=>({id:a.id,count:a.count,color:EcoRenderer.groupHighlightColor(a.id)})):current.groups.flatMap(a=>members.filter(s=>s.group===a.id).map(s=>({id:s.id,count:current.counts[s.id]||0,color:EcoRenderer.highlightColor(s.id)})))).filter(a=>a.count>0),total=expected.reduce((n,a)=>n+a.count,0);
        const entries=[...document.querySelectorAll('#current-legend [data-donut-entry]')].map(e=>e.dataset.donutEntry);
        results.push({mode:option.value,total,displayed:Number(canvas.dataset.total),entries,expected:expected.map(e=>e.id),arcsMatch:expected.length?traces.length===expected.length&&traces.every((t,i)=>Math.abs(t.span-expected[i].count/total*2*Math.PI)<1e-9&&t.color===normalize(expected[i].color)):traces.length===1&&Math.abs(traces[0].span-2*Math.PI)<1e-9,aria:canvas.getAttribute('aria-label')});
      }}finally{g.arc=arc;g.stroke=stroke;}
      return results;
    });
    for(const result of modes)check(result.total===result.displayed&&JSON.stringify(result.entries)===JSON.stringify(result.expected)&&result.arcsMatch,result.mode+': denominator, legend, arc proportions and board colors match the recorded population');
    await page.selectOption('#donut-view','all');
    check(await page.evaluate(()=>[...document.querySelectorAll('#current-legend [data-donut-entry]')].every(e=>e.dataset.species===e.dataset.donutEntry)),'species legends preserve their existing IDs for board correspondence');
    check(await page.evaluate(()=>document.getElementById('selection').innerHTML===donutFrozen),'chart switching preserves the manually frozen specimen');
    const stopped=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:__LIFE_TEST__.observations().rows.length}));
    await page.selectOption('#donut-view','main');
    check(await page.evaluate(s=>!__LIFE_TEST__.snapshot().running&&__LIFE_TEST__.fingerprint()===s.hash&&__LIFE_TEST__.observations().rows.length===s.rows,stopped),'switching while paused changes no biology, observations or pause intent');
    const other=await page.evaluate(()=>({graph:document.getElementById('graph-species').value,pyramid:document.getElementById('biomass-pyramid').innerHTML}));
    await page.selectOption('#donut-view','P');
    check(await page.evaluate(s=>document.getElementById('graph-species').value===s.graph&&document.getElementById('biomass-pyramid').innerHTML===s.pyramid,other),'donut scope is independent of the three timelines and biomass pyramid');
    await page.click('#start');await page.selectOption('#donut-view','groups');
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().running&&!__LIFE_TEST__.snapshot().holds.length),'changing the live donut does not pause observation');
    await page.waitForFunction(()=>{if(__LIFE_TEST__.snapshot().world.turn<2)return false;__LIFE_TEST__.stop();return true;});
    check(await page.evaluate(()=>Number(document.getElementById('current-donut').dataset.total)===__LIFE_TEST__.observations().rows.at(-1).current.total),'new committed turns update the selected composition');
    await page.click('#speed [data-speed="max"]');
    const partial=await page.evaluate(()=>{__LIFE_TEST__.step();const before=__LIFE_TEST__.snapshot();document.getElementById('donut-view').value='main';document.getElementById('donut-view').dispatchEvent(new Event('change'));const after=__LIFE_TEST__.snapshot();return {lagged:before.lastPresentedTurn<before.world.turn,synced:after.lastPresentedTurn===after.world.turn&&Number(document.getElementById('current-summary').dataset.turn)===after.world.turn,turn:after.world.turn,paused:!after.running};});
    check(partial.lagged&&partial.synced&&partial.paused,'explicit fastest-mode chart switch flushes the partial presentation without starting observation');
    await page.click('#speed [data-speed="1"]');
    await page.evaluate(async()=>{const a=__LIFE_TEST__.archive(),s=__LIFE_TEST__.snapshot(),o=__LIFE_TEST__.observations();await a.save(a.capture(s.world,'user-ended',o.snapshot()),'normal');});
    await page.click('#open-results');await page.locator('[data-analyze]').first().click();await page.locator('#results-analysis').waitFor({state:'visible'});
    await page.selectOption('#donut-view','P');
    const analysis=await page.evaluate(()=>({view:document.getElementById('current-donut').dataset.view,total:Number(document.getElementById('current-donut').dataset.total),live:__LIFE_TEST__.fingerprint()}));
    check(analysis.view==='P'&&Number.isFinite(analysis.total),'saved final observations support the same parasite composition view');
    await page.click('#back-results');await page.click('#close-results');
    check(await page.inputValue('#donut-view')==='main'&&await page.evaluate(h=>__LIFE_TEST__.fingerprint()===h,analysis.live),'leaving saved analysis restores the live donut choice and world');
    await page.selectOption('#donut-view','groups');await page.locator('#current-legend summary').click();
    await page.locator('.current-composition').screenshot({path:path.join(out,'composition-switch.png')});
    await page.locator('.current-composition').evaluate(e=>{e.style.width='180px';e.style.maxWidth='180px';});
    check(await page.locator('.donut-view-control').evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('select').getBoundingClientRect();return b.width>=80&&b.left>=a.left&&b.right<=a.right+1;}),'the selector fits a 180px chart-panel fixture');
    await page.evaluate(()=>__LIFE_TEST__.prepare({...donutConfig,enabled:{...donutConfig.enabled,Q:false}}));
    await page.selectOption('#donut-view','Q');
    check(await page.evaluate(()=>document.getElementById('current-donut').dataset.total==='0'&&document.getElementById('current-donut').getAttribute('aria-label').includes('この対象の生体はありません')&&!document.querySelector('#current-legend [data-donut-entry]')),'an absent category displays zero rather than silently falling back to all life');
    check(errors.length===0,'no browser runtime errors');check(external.length===0,'no external requests');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,app:require('../package.json').version,checks,errors,external,modes,partial,browser:browser.version(),scope:'small world, real Worker, eight views, partial fastest presentation, saved-result round trip; no performance or Windows certification'},null,2));
    console.log(JSON.stringify({ok:true,checks:checks.length,partial}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
