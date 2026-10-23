"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/inspector-cutouts-v1",
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
  const preflight=process.env.CUTOUT_PREFLIGHT==='1';let matrix;
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    matrix=await page.evaluate(()=>{
      const S=EcoState,A=EcoArt,M=EcoVisualManifest;
      const w=__LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'inspector-cutouts',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]},founderCounts:{version:1,species:{},parasites:{leafparasite:6,tideparasite:6,hyperparasite:4}}});
      window.cutoutWorld=w;document.getElementById('focus-view').click();
      const forms=[[1,0,0],[2,0,0],[3,0,0],[3,1,0],[3,2,0],...[0,1,2].flatMap(b=>[[4,b,0],[4,b,1]])],cases=[];
      for(const species of ['tideparasite','leafparasite'])for(const form of ['A','B','C'])for(let phase=1;phase<=3;phase++)cases.push({name:species+'/'+form+'/'+phase,o:{species,phase,age:40,birthLife:120,stage:'first',counter:0,primary:{version:'primary-state/1',formVersion:'primary-form/1',form}},paint:A.parasitePortrait});
      for(let phase=1;phase<=4;phase++)cases.push({name:'Q/'+phase,o:{species:'hyperparasite',phase,age:20,birthLife:80,maturity:12,hyper:{version:'hyper-state/1',state:phase===4?'adult':'larva'}},paint:A.parasitePortrait});
      for(const species of ['forestcrown','starcrown','freshwaterlight']){const source=S.organism(structuredClone(w),S.D.byId[species],0,'cutout-'+species);for(const [phase,branch3,branch4]of forms)cases.push({name:species+'/'+phase+'/'+branch3+'/'+branch4,o:{...source,phase,branch3,branch4,age:Math.floor(source.birthLife*.35)},paint:A.producerPortrait});}
      const source=S.organism(structuredClone(w),S.D.byId.ryouki,0,'cutout-ryouki');for(const [phase,branch3,branch4,mutated]of [...forms.map(f=>[...f,false]),[2,0,0,true],[4,0,0,true]])cases.push({name:'ryouki/'+phase+'/'+branch3+'/'+branch4+'/'+mutated,o:{...source,phase,branch3,branch4,age:Math.floor(source.birthLife*.35),ryouki:{...source.ryouki,mutated}},paint:A.ryoukiPortrait});
      const grid=document.createElement('canvas');grid.width=1080;grid.height=600;const gg=grid.getContext('2d');gg.fillStyle='#0a2931';gg.fillRect(0,0,grid.width,grid.height);
      const examples=new Set([0,2,8,9,17,18,20,21,22,32,33,43,44,54,55,65,66,67]),rows=[],bodies=new Set();let sample=0;
      for(const [i,entry]of cases.entries()){
        const c=document.createElement('canvas');c.width=c.height=180;const g=c.getContext('2d'),before=JSON.stringify(entry.o),ok=entry.paint(g,entry.o,90,90,58),pixels=g.getImageData(0,0,180,180).data;
        let occupied=0,minX=180,minY=180,maxX=-1,maxY=-1,border=0;
        for(let y=0;y<180;y++)for(let x=0;x<180;x++){const a=pixels[(y*180+x)*4+3];if(a>20){occupied++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(x<4||y<4||x>175||y>175)border++;}}
        bodies.add(c.toDataURL());rows.push({name:entry.name,ok,inputUnchanged:before===JSON.stringify(entry.o),occupied,rectangleFill:occupied/Math.max(1,(maxX-minX+1)*(maxY-minY+1)),border});
        if(examples.has(i)){const x=sample%6*180,y=Math.floor(sample/6)*200;gg.drawImage(c,x,y);gg.fillStyle='#cee8dd';gg.font='10px sans-serif';gg.fillText(entry.name,x+4,y+193,174);sample++;}
      }
      window.cutoutGrid=grid.toDataURL();window.cutoutDistinct=bodies.size;return rows;
    });
    if(!preflight){
      check(matrix.length===68&&matrix.every(r=>r.ok&&r.occupied>100),'all 68 adopted P/Q/plant/ryouki states produce visible portraits');
      check(matrix.every(r=>r.rectangleFill<.97&&r.border===0),'all current portraits have shaped transparent silhouettes with safe outer padding');
      check(matrix.every(r=>r.inputUnchanged),'portrait rendering never changes the organism state');
      check(await page.evaluate(()=>cutoutDistinct)===68,'all adopted phase, branch and mutation portraits remain visually distinct');
      const target=await page.evaluate(()=>{const entry=EcoState.PrimaryParasite.entries(cutoutWorld).find(e=>e.host);if(!entry)throw Error('No living initial P fixture');const p=entry.p;p.phase=3;p.stage='first';p.counter=0;p.primary.form='C';window.cutoutPrimary=entry;__LIFE_TEST__.select(entry.cell,p.id);return {id:p.id,cell:entry.cell};});
      const primary=page.locator('[data-primary-id="'+target.id+'"]');check((await primary.textContent()).includes('本人 III相'),'selected P describes its own third phase independently of its host stage');
      const first=await primary.locator('canvas').evaluate(c=>c.toDataURL()),hash=await page.evaluate(()=>__LIFE_TEST__.fingerprint());
      await page.locator('#refresh-selection').click();check(await page.evaluate(h=>__LIFE_TEST__.fingerprint()===h,hash),'refreshing a portrait preserves biology');
      await page.evaluate(()=>{cutoutPrimary.p.stage='terminal';cutoutPrimary.p.counter=80;__LIFE_TEST__.select(cutoutPrimary.cell,cutoutPrimary.p.id);});
      check(await primary.locator('canvas').evaluate(c=>c.toDataURL())===first&&(await primary.textContent()).includes('本人 III相'),'changing the host lifecycle alone cannot select a different P phase image');
      await primary.locator('[data-tree]').click();await page.locator('[data-primary-tree]').waitFor({state:'visible'});check(await page.locator('[data-primary-tree] [data-primary-phase]').count()===3,'the primary lineage guide retains three explicit own-phase previews');await page.click('#close-guide');
      const q=await page.evaluate(()=>{const entry=EcoState.HyperParasite.entries(cutoutWorld)[0];if(!entry)throw Error('No living initial Q fixture');__LIFE_TEST__.select(entry.cell,entry.q.id);return {id:entry.q.id,phase:entry.q.phase};});
      const hyper=page.locator('[data-hyper-id="'+q.id+'"]');check((await hyper.textContent()).includes('本人 '+['','I','II','III','IV'][q.phase]+'相')&&await hyper.locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((n,i)=>i%4===3&&n>0)),'a real selected Q displays its own phase and a nonempty portrait');
      await hyper.locator('[data-tree]').click();await page.locator('[data-hyper-tree]').waitFor({state:'visible'});check(await page.locator('[data-hyper-tree] [data-hyper-phase]').count()===4,'the Q lineage guide retains four own-phase previews');await page.click('#close-guide');
      check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running&&!__LIFE_TEST__.snapshot().playbackError),'inspection stays paused without simulation errors');
      check(errors.length===0,'no unhandled browser errors');
    }
    await fs.writeFile(path.join(out,'examples.png'),Buffer.from((await page.evaluate(()=>cutoutGrid)).split(',')[1],'base64'));
    await fs.writeFile(path.join(out,preflight?'preflight.json':'report.json'),JSON.stringify({ok:!preflight,checks,errors,matrix,scope:'Linux Chromium, 68 adopted static appearance states and actual selected P/Q; host-stage changes are explicit display fixtures'},null,2));console.log(JSON.stringify({preflight,checks,states:matrix.length,rectangles:matrix.filter(r=>r.rectangleFill>=.97).length}));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,matrix,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
