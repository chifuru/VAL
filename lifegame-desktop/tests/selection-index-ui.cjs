"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/selection-index-v1",
  );
  await fs.mkdir(out, { recursive: true });
  const originalApp=require('node:child_process').execFileSync('git',['show','c633805:lifegame-desktop/src/app.js'],{encoding:'utf8'});
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


  const metrics={},comparisons=[];
  async function enter(baseline){
    await page.goto(origin+'/Index.html?smoke=1'+(baseline?'&baseline=1':''));await page.evaluate(()=>EcoArt.ready);
    await page.evaluate(()=>{
      window.indexConfig={...__LIFE_TEST__.readConfig(),seed:'selection-index',terrainSeed:'selection-index-terrain',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}};
      window.indexWorld=__LIFE_TEST__.prepare(indexConfig);if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      window.indexTargets=indexWorld.organisms.filter(o=>o.slot==='main'&&!indexWorld.organisms.some(t=>t.cell===o.cell&&t.infection)).slice(0,3).map(o=>({id:o.id,cell:o.cell}));if(indexTargets.length!==3)throw Error('Need three ordinary target cells');
    });await page.waitForTimeout(100);
    return page.evaluate(()=>{
      const w=indexWorld,S=EcoState,stats={primaryLocates:0,hyperLocates:0,organismFilters:0,resourceFilters:0,carcassFilters:0,resourceIterations:0},outputs=[];
      const p=S.PrimaryParasite.locate,q=S.HyperParasite.locate;S.PrimaryParasite.locate=function(...a){stats.primaryLocates++;return p.apply(this,a);};S.HyperParasite.locate=function(...a){stats.hyperLocates++;return q.apply(this,a);};
      const clean=[];for(const [array,key]of [[w.organisms,'organismFilters'],[w.resources,'resourceFilters'],[w.carcasses,'carcassFilters']]){const original=array.filter;Object.defineProperty(array,'filter',{configurable:true,value:function(...a){stats[key]++;return original.apply(this,a);}});clean.push(()=>delete array.filter);}
      const iterator=w.resources[Symbol.iterator];Object.defineProperty(w.resources,Symbol.iterator,{configurable:true,value:function(){stats.resourceIterations++;return iterator.call(this);}});clean.push(()=>delete w.resources[Symbol.iterator]);
      try{for(const target of indexTargets){__LIFE_TEST__.select(target.cell,target.id);outputs.push({id:target.id,html:document.getElementById('selection').innerHTML,portraits:[...document.querySelectorAll('#selection canvas')].map(c=>c.toDataURL())});}return {stats,outputs};}
      finally{S.PrimaryParasite.locate=p;S.HyperParasite.locate=q;for(const f of clean)f();}
    });
  }
  try{
    const before=await enter(true),after=await enter(false);metrics.before=before.stats;metrics.after=after.stats;
    check(before.stats.primaryLocates>=3&&before.stats.hyperLocates>=3,'prior ordinary selection calls both full parasite locators');
    check(after.stats.primaryLocates===0&&after.stats.hyperLocates===0,'ordinary IDs bypass parasite enumeration');
    check(before.stats.organismFilters>=3&&before.stats.resourceFilters>=3&&before.stats.carcassFilters>=3&&after.stats.organismFilters===0&&after.stats.resourceFilters===0&&after.stats.carcassFilters===0,'cell detail reuses indexed occupants, resources and carcasses instead of global filters');
    check(after.stats.resourceIterations===1&&before.stats.resourceFilters>1,'one shared resource-index pass serves three selections without power-display Map rebuilds');
    check(JSON.stringify(before.outputs)===JSON.stringify(after.outputs),'three ordinary detail HTML and portrait pixels exactly match prior app');
    const unchanged=await page.evaluate(()=>({rows:JSON.stringify(__LIFE_TEST__.observations().rows),hash:__LIFE_TEST__.fingerprint(),ids:indexWorld.organisms.map(o=>o.id)}));
    await page.evaluate(()=>{const w=indexWorld,main=w.organisms.find(o=>o.slot==='main'),food=w.organisms.find(o=>o.slot!=='main'),center=main.cell;food.cell=center;w.resources.push({id:'index-resource',cell:center,kind:'mineral',q:2,E:0,M:2,G:0,expires:null});w.carcasses.push({id:'index-corpse',cell:center,species:main.species,slot:'main',q:1,E:1,M:0,G:0,created:0,expires:20});window.indexFixture={main:main.id,food:food.id,center};__LIFE_TEST__.refresh();__LIFE_TEST__.select(center,null);});
    check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId===indexFixture.main)&&await page.locator('#selection').textContent().then(t=>t.includes('死骸')&&t.includes('鉱物')),'same-cell default selects main and includes resource and carcass after explicit refresh');
    await page.evaluate(()=>__LIFE_TEST__.select(indexFixture.center,null,{groundOnly:true}));check(await page.evaluate(()=>__LIFE_TEST__.snapshot().selectedId===indexFixture.food),'ground-only selection retains lower-occupant priority');
    const order=await page.evaluate(()=>indexWorld.organisms.map(o=>o.id));await page.evaluate(()=>{__LIFE_TEST__.select(indexFixture.center,indexFixture.main);__LIFE_TEST__.select(indexFixture.center,indexFixture.food);});check(JSON.stringify(await page.evaluate(()=>indexWorld.organisms.map(o=>o.id)))===JSON.stringify(order),'sorting displayed occupants never reorders biological rows');
    // Same-turn array replacement must invalidate membership without a refresh hook.
    await page.evaluate(()=>{indexWorld.resources=indexWorld.resources.map(r=>r.id==='index-resource'?{...r,q:7}:r);__LIFE_TEST__.select(indexFixture.center,indexFixture.main);});
    check((await page.locator('#selection').textContent()).includes('量 7'),'replaced resource array is read at the same committed turn');
    await page.evaluate(()=>{indexWorld.organisms=indexWorld.organisms.filter(o=>o.id!==indexFixture.main);__LIFE_TEST__.select(indexFixture.center,indexFixture.main);});check((await page.locator('#selection').textContent()).includes('選択したIDは消失'),'removed ID is never silently replaced by its neighbour');
    await page.evaluate(()=>{const p=EcoState.PrimaryParasite.entries(indexWorld).find(e=>e.host);if(!p)throw Error('Need hosted P');window.indexP=p.p.id;__LIFE_TEST__.select(p.cell,p.p.id);});check(await page.locator('[data-primary-id]').getAttribute('data-primary-id')===await page.evaluate(()=>indexP),'primary parasite still resolves through its lifecycle locator');
    await page.evaluate(()=>{const e=EcoState.HyperParasite.entries(indexWorld)[0];if(!e)throw Error('Need Q');window.indexQ=e.q.id;__LIFE_TEST__.select(e.cell,e.q.id);});check(await page.locator('[data-hyper-id]').getAttribute('data-hyper-id')===await page.evaluate(()=>indexQ),'hyper parasite still resolves its own host or autonomous state');
    await page.evaluate(()=>{window.indexWorld=__LIFE_TEST__.prepare({...indexConfig,seed:'selection-index-new',terrainSeed:'selection-index-new-terrain'});const o=indexWorld.organisms.find(o=>o.slot==='main');window.newIndexTarget=o.id;__LIFE_TEST__.select(o.cell,o.id);});check(await page.locator('#selection [data-portrait]').first().getAttribute('data-portrait')===await page.evaluate(()=>newIndexTarget),'new world replaces the prior-world index');
    const original=await page.evaluate(()=>({hash:__LIFE_TEST__.fingerprint(),rows:JSON.stringify(__LIFE_TEST__.observations().rows),html:document.getElementById('selection').innerHTML}));
    await page.click('#follow-individual');await page.click('#start');const t=await page.evaluate(()=>__LIFE_TEST__.snapshot().world.turn);await page.waitForFunction(t=>__LIFE_TEST__.snapshot().world.turn>t,t,{timeout:20000});
    check(await page.evaluate(h=>{const s=__LIFE_TEST__.snapshot();return s.running&&!s.holds.length&&!s.playbackError&&document.getElementById('selection').innerHTML===h;},original.html),'tracking across real committed turns leaves frozen detail and running intent intact');
    await page.click('#refresh-selection');check(await page.locator('#selection-controls').evaluate(e=>Number(e.dataset.turn))>t,'manual detail refresh sees the new committed turn');await page.evaluate(()=>__LIFE_TEST__.stop());
    check(errors.length===0,'no uncaught browser errors');
    const crypto=require('node:crypto');comparisons.push({ordinary_details_sha256:crypto.createHash('sha256').update(JSON.stringify(after.outputs)).digest('hex')});
    await fs.writeFile(path.join(out,'report.json'),JSON.stringify({ok:true,checks,errors,metrics,comparisons,scope:'Linux Chromium same-seed ordinary details and explicit cell/array fixtures; fresh unmodified world for Worker tracking'},null,2));console.log(JSON.stringify({ok:true,checks,metrics}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,metrics,error:String(error)},null,2));throw error;}
  finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
