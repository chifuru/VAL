"use strict";
const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  http = require("node:http");
(async () => {
  const out = path.resolve(
    process.env.LIFEGAME_EVIDENCE || "operations/evidence/remaining-cutouts-v1",
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
  const preflight=process.env.CUTOUT_PREFLIGHT==='1';
  try {
    await page.goto(origin+'/Index.html?smoke=1');await page.evaluate(()=>EcoArt.ready);
    const result=await page.evaluate(()=>{
      const S=EcoEngine.S,A=EcoArt,M=EcoVisualManifest;
      const w=__LIFE_TEST__.prepare({...__LIFE_TEST__.readConfig(),seed:'remaining-cutouts',terrainSeed:'cutouts-river',width:40,height:28,initial:24,lineages:'few',mapId:'river',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'auto',locks:[]}});
      if(!document.body.classList.contains('observatory'))document.getElementById('focus-view').click();
      const original=__LIFE_TEST__.fingerprint(),fixture=structuredClone(w),cases=[],raw=[];
      function measure(canvas){const {width:W,height:H}=canvas,p=canvas.getContext('2d').getImageData(0,0,W,H).data;let occupied=0,minX=W,minY=H,maxX=-1,maxY=-1,border=0,transparent=0;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=p[(y*W+x)*4+3];if(a===0)transparent++;if(a<30)continue;occupied++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(x===0||y===0||x===W-1||y===H-1)border++;}
        return {occupied,transparent,rectangleFill:occupied/Math.max(1,(maxX-minX+1)*(maxY-minY+1)),border,bounds:[minX,minY,maxX,maxY]};
      }
      function regions(kind,id,sheet,frames){for(const [index,f]of frames.entries()){const canvas=document.createElement('canvas');canvas.width=f[2];canvas.height=f[3];canvas.getContext('2d').drawImage(A.images[sheet],...f,0,0,f[2],f[3]);raw.push({kind,id,index,...measure(canvas)});}}
      for(const [id,frames]of Object.entries(M.creatures.regions))regions('base',id,M.creatures.sheetBySpecies[id],frames);
      for(const [id,entry]of Object.entries(M.branches))regions('branch',id,entry.sheet,entry.regions);
      for(const [id,frames]of Object.entries(M.food.regions))regions('food',id,'food-atlas',frames);
      regions('prop','prop','habitat-props',M.props.regions);
      const grid=document.createElement('canvas');grid.width=1080;grid.height=780;const gg=grid.getContext('2d');gg.fillStyle='#08272e';gg.fillRect(0,0,grid.width,grid.height);let sample=0;
      function inspect(kind,id,state,paint,example=false){const c=document.createElement('canvas');c.width=384;c.height=300;const before=JSON.stringify(state),ok=paint(c.getContext('2d'),state),metrics=measure(c);cases.push({kind,id,ok:ok!==false,inputUnchanged:before===JSON.stringify(state),...metrics});if(example&&sample<18){const x=(sample%6)*180,y=Math.floor(sample/6)*260;gg.drawImage(c,x+4,y+8,172,215);gg.fillStyle='#d2e5df';gg.font='12px sans-serif';gg.fillText(id,x+4,y+242,172);sample++;}}
      for(const [species,entry]of Object.entries(M.branches)){const source=S.organism(fixture,S.D.byId[species],0,'audit-'+species),forms=[[1,0,0,'male',.35],[3,1,0,'female',.05],[S.D.byId[species].phases.length,2,1,'male',.93]];
        for(const [phase,branch3,branch4,sex,age]of forms){const o={...source,phase,branch3,branch4,sex,age:Math.floor(source.birthLife*age)};inspect('main',species+'/'+phase+'/'+sex,o,(g,o)=>__LIFE_TEST__.drawPortrait(g.canvas,o),['solar','serpent','swarm'].includes(species));}}
      for(const species of [...Object.keys(M.food.regions),'phytoplankton']){const source=S.organism(fixture,S.D.byId[species],0,'audit-'+species);for(const phase of [1,2])inspect('lower',species+'/'+phase,{...source,phase,age:Math.floor(source.birthLife*.35),B:source.B*.5},(g,o)=>EcoRenderer.food(g,o,192,150,384*.27,phase===1?4:5),['algae','grass','waterbug','grassbug'].includes(species));}
      for(let index=0;index<M.props.regions.length;index++)inspect('prop','prop/'+index,{index},g=>A.prop(g,index,192,250,240,1),index===0);
      for(const species of ['tideparasite','leafparasite','hyperparasite'])inspect('legacy-parasite',species,{species,phase:3,stage:'terminal',counter:10,age:25,E:30},(g,o)=>A.parasite(g,o,192,150,80));
      window.cutoutAuditWorld=w;window.cutoutAuditGrid=grid.toDataURL();
      return {raw,cases,worldUnchanged:original===__LIFE_TEST__.fingerprint(),assetErrors:[...A.errors]};
    });
    await fs.writeFile(path.join(out,preflight?'preflight.json':'matrix.json'),JSON.stringify(result,null,2));
    await fs.writeFile(path.join(out,'examples.png'),Buffer.from((await page.evaluate(()=>cutoutAuditGrid)).split(',')[1],'base64'));
    if(!preflight){
      check(result.raw.length===303&&result.raw.every(c=>c.occupied>0&&c.transparent>0&&c.rectangleFill<.97),'all 303 base, branch, lower and prop regions contain nonrectangular transparent artwork');
      check(result.cases.length===96&&result.cases.every(c=>c.ok&&c.occupied>100),'all 96 sampled runtime appearances render visible bodies');
      check(result.cases.every(c=>c.rectangleFill<.97&&c.border===0),'runtime transforms preserve transparent silhouettes and complete portrait margins');
      check(result.cases.every(c=>c.inputUnchanged)&&result.worldUnchanged,'appearance checks do not mutate specimen input or the live world');
      check(result.assetErrors.length===0,'all current artwork sheets load');
      const targets=await page.evaluate(()=>{const w=cutoutAuditWorld;return {main:w.organisms.find(o=>o.slot==='main'),lower:w.organisms.find(o=>o.species==='grassbug')};});
      for(const [group,target]of Object.entries(targets)){
        assert(target,group+' fixture');await page.evaluate(o=>__LIFE_TEST__.select(o.cell,o.id),target);
        const metrics=await page.locator('#selection canvas.portrait').first().evaluate(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let clear=0,filled=0;for(let i=3;i<p.length;i+=4){if(p[i]===0)clear++;if(p[i]>30)filled++;}return {clear,filled};});
        check(metrics.clear>0&&metrics.filled>100,'actual '+group+' inspector uses a transparent nonempty body');
      }
      await page.evaluate(o=>__LIFE_TEST__.select(o.cell,o.id),targets.main);await page.locator('#selection [data-tree]').click();
      check(await page.locator('#guide-content canvas').count()>0,'the actual lineage guide still renders image previews');await page.click('#close-guide');
      check(await page.evaluate(()=>!__LIFE_TEST__.snapshot().running&&!__LIFE_TEST__.snapshot().playbackError),'inspection preserves pause intent without simulation errors');
      check(errors.length===0,'no unhandled browser exceptions');check(external.length===0,'no external requests');
    }
    const report={ok:!preflight,app:require('../package.json').version,checks,errors,external,rawRegions:result.raw.length,runtimeSamples:result.cases.length,rectangles:result.cases.filter(c=>c.rectangleFill>=.97).map(c=>c.id),edgeClips:result.cases.filter(c=>c.border>0).map(c=>c.id),browser:browser.version(),scope:'303 raw regions; 96 runtime appearance fixtures and actual main/lower inspectors; no all-branch-sex-age Cartesian run, animation or Windows certification'};
    await fs.writeFile(path.join(out,preflight?'preflight-summary.json':'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }catch(error){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({checks,errors,error:String(error)},null,2));throw error;}
  finally {await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
