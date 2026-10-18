"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "artifacts/staged-observation",
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
    const rows=[];
    for(const settings of [{observationMode:'river-settlement',width:80,height:56},{observationMode:'lake-foodweb',width:40,height:28}]){
      console.log('start '+JSON.stringify(settings));
      const row=await page.evaluate(async settings=>{
        const config={...settings,seed:'observe39/0',ageModel:'life/1',landscape:'templates',blockTurns:500};
        let world=EcoEngine.create(config),start=performance.now(),firstThreeMs=null,prepareMs=null,costs=[],stageCosts=[],snapshots=[],maxChanged=0,maxBuffered=0;
        const initial=world.stats.main;
        const worker=new Worker('ecology/compute-worker.js');
        return await new Promise((resolve,reject)=>{
          const timeout=setTimeout(()=>{worker.terminate();reject(Error('benchmark timeout'));},600000);
          worker.onerror=e=>{clearTimeout(timeout);worker.terminate();reject(Error(e.message));};
          worker.onmessage=({data:d})=>{
            try{
              if(d.type==='error')throw Error(d.message);
              if(d.type==='ready'){prepareMs=d.prepareMs;worker.postMessage({type:'compute',epoch:1,count:6,limit:500});}
              if(d.type==='turn'){
                costs.push(d.computeMs);stageCosts.push(...d.costs);
                for(const patch of d.patches){maxChanged=Math.max(maxChanged,patch.lists.organisms.changed.length);world=EcoTransport.apply(world,patch);}
                if(world.turn===3)firstThreeMs=performance.now()-start;
                if([1,50,100,150,200,250,300,400,500].includes(world.turn)){
                  const errors=EcoEngine.invariants(world);if(errors.length)throw Error(errors.join(','));
                  snapshots.push({turn:world.turn,main:world.stats.main,food:world.stats.food,P:world.stats.P,Q:world.stats.Q,counts:world.stats.counts});
                }
              }
              if(d.type==='idle'){
                if(world.turn<500&&!world.stopReason)worker.postMessage({type:'compute',epoch:1,count:6,limit:500});
                else {
                  clearTimeout(timeout);worker.terminate();
                  const sorted=costs.slice().sort((a,b)=>a-b),quantile=p=>sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];
                  resolve({config:world.config,initial,finalTurn:world.turn,stopReason:world.stopReason,preparationMs:prepareMs,firstThreeMs,elapsedMs:performance.now()-start,turns:costs.length,meanMs:costs.reduce((a,b)=>a+b,0)/costs.length,p50Ms:quantile(.5),p95Ms:quantile(.95),maxMs:Math.max(...costs),maxStageMs:Math.max(...stageCosts),estimatedPacedSeconds:costs.reduce((n,ms)=>n+Math.max(1000,ms),0)/1000,maxChanged,snapshots,fingerprint:EcoEngine.fingerprint(world)});
                }
              }
            }catch(e){clearTimeout(timeout);worker.terminate();reject(e);}
          };
          worker.postMessage({type:'init',epoch:1,world,observeId:world.organisms.find(o=>o.slot==='main')?.id});
        });
      },settings);
      rows.push(row);await fs.writeFile(path.join(out,'performance.json'),JSON.stringify({app:'4.0.0',environment:'Chromium '+browser.version()+', Linux shared cloud CPU; no drawing or cadence waits',rows},null,2));
      console.log(JSON.stringify({mode:settings.observationMode,turns:row.turns,elapsedMs:row.elapsedMs,p95Ms:row.p95Ms,estimatedPacedSeconds:row.estimatedPacedSeconds}));
    }
  } finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
