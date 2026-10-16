"use strict";
// Fixed, disclosed five-lineage pilot. It does not certify the other lineages.
const fs=require('node:fs'),path=require('node:path'),{model}=require('./model.cjs');
const E=model(),selected=['solar','kelp','jelly','abyss','crystal'],out=path.join(__dirname,'../../operations/evidence/ecosystem-next');
const count=Number(process.argv[2]||10),ticks=Number(process.argv[3]||500),results=[];
for(let k=0;k<count;k++){
 const started=performance.now(),config={seed:'competition-pilot-'+k,width:40,height:28,initial:80,lineages:'manual',selected};
 let w=E.create(config);const initial={...w.stats.counts},minimum=Object.fromEntries(selected.map(id=>[id,Infinity]));
 let windowBirths={};
 for(let t=1;t<=ticks;t++){
  w=E.step(w);const errors=E.invariants(w);if(errors.length)throw Error(config.seed+' turn '+t+': '+errors);
  if(t===299)windowBirths={...w.tallies.births};
  if(t>=300&&t<=500)for(const id of selected)minimum[id]=Math.min(minimum[id],w.stats.counts[id]);
 }
 const rows=selected.map(id=>({id,initial:initial[id],minimum300to500:Number.isFinite(minimum[id])?minimum[id]:null,continuous300to500:ticks>=500&&minimum[id]>0,final:w.stats.counts[id],births300to500:ticks===500?(w.tallies.births[id]||0)-(windowBirths[id]||0):null,descendants:w.organisms.filter(o=>o.species===id&&o.generation>0).length}));
 const result={config,ticks,rows,P:w.stats.P,Q:w.stats.Q,causes:w.tallies.causes,fingerprint:E.fingerprint(w),wallMs:Math.round(performance.now()-started)};
 results.push(result);fs.writeFileSync(path.join(out,'pilot-'+k+'.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}
fs.writeFileSync(path.join(out,'pilot-summary.json'),JSON.stringify({scope:'fixed five-lineage pilot; other 15 lineages and 1000-turn endings not certified',count,ticks,rows:selected.map(id=>({id,eligible:results.filter(r=>r.rows.find(x=>x.id===id).initial>0).length,continuous:results.filter(r=>r.rows.find(x=>x.id===id).continuous300to500).length})),results},null,2)+'\n');
