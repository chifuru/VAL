"use strict";
const fs=require("node:fs"),path=require("node:path"),{model}=require("./model.cjs");
const CASES={colony:{food:true,budget:true,routes:true,foundation:true,colony:true},foundation:{food:true,budget:true,routes:true,foundation:true},web:{food:true,budget:true,foundation:true},baseline:{},food:{food:true},budget:{food:true,budget:true},routes:{food:true,budget:true,routes:true}};
function observe(variant,config,ticks=300){
 if(!CASES[variant])throw Error("Unknown foundation variant: "+variant);
 const E=model(CASES[variant]),S=E.S,rows={},snapshots=[],started=performance.now();let w=E.create(config),births=0;
 for(const s of S.D.species)rows[s.id]={id:s.id,name:s.name,group:s.group,initial:w.stats.counts[s.id],births:0,deaths:{},aliveTurns:0,intake:0,base:0,action:0,density:0,firstAbsent:w.stats.counts[s.id]?null:0};
 function snapshot(){return {turn:w.turn,counts:{...w.stats.counts},main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,stages:{...w.stats.infectionStages},transmission:w.trialTransmission||{},births:{...w.tallies.births},causes:{...w.tallies.causes},budgets:S.totals(w)};}
 snapshots.push(snapshot());
 for(let t=0;t<ticks;t++){
  const before=new Map(w.organisms.map(o=>[o.id,o]));
  w=E.step(w,{onTurn:(world,ctx)=>{for(const [id,rec] of ctx.records){const old=before.get(id);if(!old)continue;const r=rows[old.species],c=ctx.costs.get(id);r.aliveTurns++;r.intake+=rec.organic;r.base+=c.base;r.action+=c.action;r.density+=c.density;}for(const d of ctx.deaths)rows[d.species].deaths[d.reason]=(rows[d.species].deaths[d.reason]||0)+1;}});
  const errors=E.invariants(w);if(errors.length)throw Error(variant+" turn"+w.turn+":"+errors.join());
  for(const s of S.D.species){const r=rows[s.id];if(!w.stats.counts[s.id]&&r.firstAbsent===null)r.firstAbsent=w.turn;}
  if([25,50,100,200,300,500,1000].includes(w.turn)||w.turn===ticks)snapshots.push(snapshot());
 }
 for(const r of Object.values(rows)){r.final=w.stats.counts[r.id];r.births=w.tallies.births[r.id]||0;for(const k of ["intake","base","action","density"])r[k]=S.round(r[k]/Math.max(1,r.aliveTurns));}
 return {variant,flags:CASES[variant],config,ticks,wallMs:performance.now()-started,richness:{main:S.D.main.filter(s=>w.stats.counts[s.id]>0).length,food:S.D.species.filter(s=>["plant","fungus","prey"].includes(s.group)&&w.stats.counts[s.id]>0).length,P:["tideparasite","leafparasite"].filter(id=>w.stats.counts[id]>0).length,Q:w.stats.Q>0},rows:Object.values(rows),snapshots,transmission:w.trialTransmission||{},fingerprint:E.fingerprint(w),world:w};
}
if(require.main===module){const variants=(process.argv[2]||"foundation").split(","),ticks=Number(process.argv[3]||300),seed=process.argv[4]||"ECOSYSTEM-2026",out=path.resolve(process.argv[5]||"operations/evidence/ecosystem-foundation-v2/standard");fs.mkdirSync(out,{recursive:true});for(const v of variants){if(!CASES[v])throw Error("Unknown variant");const r=observe(v,{seed,width:80,height:56,initial:320},ticks);fs.writeFileSync(path.join(out,v+".world.json"),JSON.stringify(r.world));delete r.world;fs.writeFileSync(path.join(out,v+".json"),JSON.stringify(r,null,2)+"\n");console.log(JSON.stringify({variant:v,richness:r.richness,transmission:r.transmission,wallMs:r.wallMs,main:r.snapshots.at(-1).main,P:r.snapshots.at(-1).P,Q:r.snapshots.at(-1).Q}));}}
module.exports={observe,CASES};
