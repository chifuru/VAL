"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/selection-combat-index-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const originalApp=require('node:child_process').execFileSync('git',['show','9d33590:lifegame-desktop/src/app.js'],{encoding:'utf8'});
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
  const source=await fs.readFile('src/app.js','utf8'),begin=source.indexOf('  function currentSelectionCombatMaps(){'),end=source.indexOf('  function select(',begin),helper=source.slice(begin,end);
  assert(begin>=0&&end>begin);
  async function capture(baseline,cohabit){
    await page.goto(origin+'/Index.html?smoke=1'+(baseline?'&baseline=1':''));await page.evaluate(()=>EcoArt.ready);await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(cohabit=>{
      window.combatConfig={seed:'selection-combat',terrainSeed:'selection-combat-terrain',width:40,height:28,initial:24,lineages:'manual',selected:['ryouki','solar','whale'],ryoukiModel:'ryouki/1',producerModel:'colony/1',largePlantModel:'independent/1',ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',landscape:'templates',mapId:'river'};
      window.combatWorld=__LIFE_TEST__.prepare(combatConfig);
      if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      const w=combatWorld,targets=w.organisms.filter(o=>cohabit?EcoState.Ryouki.is(o):o.slot==='main'&&!EcoState.Ryouki.is(o)).slice(0,3);
      if(targets.length!==3)throw Error('Need three detail targets');
      if(cohabit)for(const o of targets){o.cell=targets[0].cell;o.ryouki.mutated=true;}
      window.combatTargets=targets.map(o=>({id:o.id,cell:o.cell}));__LIFE_TEST__.refresh();
    },cohabit);
    await page.waitForTimeout(80);
    return page.evaluate(()=>{
      const w=combatWorld,iterator=w.resources[Symbol.iterator],outputs=[],stats={fullMapResourcePasses:0,resourceIterations:0},fingerprint=__LIFE_TEST__.fingerprint(),rows=JSON.stringify(__LIFE_TEST__.observations().rows),ids=w.organisms.map(o=>o.id);
      // EcoState is a dispatch Proxy: replacing its maps property cannot
      // instrument the active profile. Count the real resource passes instead.
      Object.defineProperty(w.resources,Symbol.iterator,{configurable:true,value:function(){stats.resourceIterations++;if(/\bat (?:sharedMaps|maps)\b/.test(new Error().stack))stats.fullMapResourcePasses++;return iterator.call(this);}});
      try{for(const target of combatTargets){__LIFE_TEST__.select(target.cell,target.id);outputs.push({id:target.id,html:document.getElementById('selection').innerHTML,pixels:[...document.querySelectorAll('#selection canvas')].map(c=>c.toDataURL())});}
        return {stats,outputs,unchanged:JSON.stringify(ids)===JSON.stringify(w.organisms.map(o=>o.id))&&fingerprint===__LIFE_TEST__.fingerprint()&&rows===JSON.stringify(__LIFE_TEST__.observations().rows),fingerprint,rows};
      }finally{delete w.resources[Symbol.iterator];}
    });
  }
  try{
    for(const cohabit of [false,true]){
      const name=cohabit?'three cohabiting Ryouki':'three ordinary main organisms',before=await capture(true,cohabit),after=await capture(false,cohabit);metrics[name]={before:before.stats,after:after.stats};
      check(before.stats.fullMapResourcePasses>=6&&after.stats.fullMapResourcePasses===0,name+': no whole-world Map rebuilds for power/cohabitation');
      check(before.stats.resourceIterations>=6&&after.stats.resourceIterations<=1,name+': at most one existing selection-index resource pass');
      check(JSON.stringify(before.outputs)===JSON.stringify(after.outputs),name+': identical detail HTML and all portrait pixels');
      check(before.unchanged&&after.unchanged&&before.fingerprint===after.fingerprint&&before.rows===after.rows,name+': same biology, observation rows and original organism order');
      comparisons.push({scenario:name,details_sha256:digest(after.outputs),rows_sha256:digest(after.rows)});
    }
    const topology=await page.evaluate(helper=>{
      const S=EcoState,w=combatWorld,results=[];
      for(const grouped of [true,false]){
        const config={...w.config};if(!grouped)delete config.ryoukiModel;
        const sample={...w,config},index={organisms:new Map()};
        for(const o of sample.organisms){if(!index.organisms.has(o.cell))index.organisms.set(o.cell,[]);index.organisms.get(o.cell).push(o);}
        const get=new Function('currentSelectionIndex','S','world',helper+';return currentSelectionCombatMaps;')(()=>index,S,sample),a=get(),b=get(),old=S.maps(sample),cells=[...new Set(sample.organisms.map(o=>o.cell))];
        results.push({grouped,reused:a===b,main:cells.every(c=>a.main.get(c)?.id===old.main.get(c)?.id),members:cells.every(c=>JSON.stringify(S.mainAt(a,c).map(o=>o.id))===JSON.stringify(S.mainAt(old,c).map(o=>o.id))),keys:Object.keys(a).sort()});
      }
      return results;
    },helper);
    check(topology.every(t=>t.reused&&t.main&&t.members),'actual helper reuses topology and matches old Map member/order semantics with Ryouki enabled or disabled');
    check(JSON.stringify(topology[0].keys)===JSON.stringify(['main','mainByCell'])&&JSON.stringify(topology[1].keys)===JSON.stringify(['main']),'only the demanded main-position maps are retained');
    // Change topology at the same committed turn via the existing explicit fixture-refresh path.
    const changed=await page.evaluate(()=>{
      const S=EcoState,w=combatWorld,targets=combatTargets.map(t=>w.organisms.find(o=>o.id===t.id));targets[1].cell=S.nearby(w,targets[0].cell)[0];__LIFE_TEST__.refresh();__LIFE_TEST__.select(targets[0].cell,targets[0].id);
      const text=[...document.querySelectorAll('[data-ryouki-state]')].find(e=>e.dataset.ryoukiState===targets[0].id).textContent;return {removed:!text.includes(targets[1].id),kept:text.includes(targets[2].id)};
    });check(changed.removed&&changed.kept,'explicit same-turn refresh discards old cohabitation membership');
    await page.evaluate(()=>{combatWorld.organisms=combatWorld.organisms.filter(o=>o.id!==combatTargets[2].id);__LIFE_TEST__.select(combatTargets[0].cell,combatTargets[0].id);});
    const membership=await page.evaluate(()=>[...document.querySelectorAll('[data-ryouki-state]')].find(e=>e.dataset.ryoukiState===combatTargets[0].id).textContent);
    check(!membership.includes(await page.evaluate(()=>combatTargets[2].id)),'same-turn organism-array replacement invalidates cached membership');
    await page.evaluate(()=>__LIFE_TEST__.select(combatTargets[2].cell,combatTargets[2].id));
    check((await page.locator('#selection').textContent()).includes('選択したIDは消失'),'missing selected ID is not replaced by a cohabitant');
    await page.evaluate(()=>{window.combatWorld=__LIFE_TEST__.prepare({...combatConfig,seed:'selection-combat-new'});const o=combatWorld.organisms.find(o=>o.slot==='main');window.trackedTarget={id:o.id,cell:o.cell};__LIFE_TEST__.select(o.cell,o.id);});
    check(await page.locator('#selection [data-portrait]').first().getAttribute('data-portrait')===await page.evaluate(()=>trackedTarget.id),'new world uses its own current topology and portrait');
    const html=await page.locator('#selection').innerHTML();await page.click('#follow-individual');await page.click('#start');
    const first=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);await page.waitForFunction(first=>__LIFE_TEST__.snapshot().world.turn>first,first,{timeout:20000});
    const tracking=await page.evaluate(html=>{const a=__LIFE_TEST__.snapshot(),o=a.world.organisms.find(o=>o.id===a.followId);return {running:a.running&&!a.holds.length&&!a.playbackError,frozen:document.getElementById('selection').innerHTML===html,position:!!o&&o.cell===a.view.selected,sameId:a.followId===trackedTarget.id};},html);
    check(tracking.running&&tracking.frozen&&tracking.position&&tracking.sameId,'real Worker turn keeps current tracked ID/position and frozen detail independent');
    await page.click('#refresh-selection');check(await page.locator('#selection-controls').evaluate(e=>Number(e.dataset.turn))>first,'manual refresh reads the newly committed turn');await page.evaluate(()=>__LIFE_TEST__.stop());
    check(errors.length===0,'no uncaught browser errors');
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,baseline:'9d33590',app:'4.2.74',source_sha256:crypto.createHash('sha256').update(source).digest('hex'),checks,errors,metrics,comparisons,topology,tracking,scope:'Linux actual prior/current app, two small-world scenarios, explicit cohabitation/invalidations and fresh-world Worker tracking; no long-run speed claim'},null,2));console.log(JSON.stringify({ok:true,checks,metrics}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,metrics,error:String(error)},null,2));throw error;}
  finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
