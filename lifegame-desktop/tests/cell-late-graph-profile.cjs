'use strict';
// Times the unmodified population paint function against saved, real counts.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{
 const app=fs.readFileSync('src/app.js','utf8'),history=JSON.parse(fs.readFileSync('operations/evidence/cell-long-observation-v1/turns.json')),catalogue=require('../src/ecology/catalogue.js'),byId=catalogue.byId;
 assert.equal(history.length,501);const source=app.slice(app.indexOf('  function stackShape('),app.indexOf('  function relationShape('))+app.slice(app.indexOf('  function paintStack('),app.indexOf('  function renderCurrentSummary('));
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{const page=await browser.newPage({viewport:{width:1000,height:800}});await page.setContent('<canvas style="width:320px;height:120px"></canvas>');
 const results=await page.evaluate(({history,source,species})=>{
  let rows=[];const graphObservation=()=>({rows}),stackPaintCache=new WeakMap();eval(source+';window.__paintStack=paintStack');const canvas=document.querySelector('canvas'),cases=[];
  for(const target of ['all','main'])for(const last of [0,100,500]){
   rows=history.slice(0,last+1);const data=rows.map(r=>{const values=Object.fromEntries(Object.entries(r.counts).filter(([id])=>target==='all'||species[id]==='main'));return {turn:r.turn,values,total:Object.values(values).reduce((a,b)=>a+b,0)};});
   const color=(id,i)=>`hsl(${i*31} 65% 65%)`;window.__paintStack(canvas,data,color);const samples=[];for(let i=0;i<3;i++){const t=performance.now();window.__paintStack(canvas,data,color);samples.push(performance.now()-t);}
   cases.push({target,throughTurn:last,points:data.length,series:Object.keys(data[0].values).length,framesMs:samples,meanMs:samples.reduce((a,b)=>a+b)/samples.length});
  }return cases;
 },{history,source,species:Object.fromEntries(Object.entries(byId).map(([id,s])=>[id,s.group]))});
 fs.writeFileSync('operations/evidence/cell-late-runtime-v1/graph-before.json',JSON.stringify({scope:'Actual saved T0..500 population counts; unmodified app paintStack/stackShape extracted into an isolated browser fixture, 320x120 CSS px, three warm draws per case. Excludes composition, SVG relationships, append, layout of the full application and cross-thread transfer.',appSha256:crypto.createHash('sha256').update(app).digest('hex'),results},null,2)+'\n');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
