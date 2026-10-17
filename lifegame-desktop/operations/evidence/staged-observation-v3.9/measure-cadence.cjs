const fs=require('fs'),E=require('../../../src/ecology/engine.js'),rows=[];
for(const mode of ['river-settlement','lake-foodweb']){
 let w=E.create({seed:'cadence39',observationMode:mode,width:80,height:56,ageModel:'life/1',landscape:'templates'});const costs=[];
 for(let n=0;n<3;n++){
  const t=performance.now(),job=E.beginTurn(w),row={cloneMs:performance.now()-t,phases:[]};let r;
  for(let stage=0;stage<3;stage++){const t=performance.now();r=job.advance();job.preview();row.phases.push(performance.now()-t);}w=r.world;
  if(E.invariants(w).length)throw Error(E.invariants(w));costs.push(row);
 }
 rows.push({mode,width:80,height:56,initial:w.config.initial,costs,main:w.stats.main,food:w.stats.food});
}
fs.writeFileSync((process.env.LIFEGAME_CADENCE_OUT||require('path').join(require('os').tmpdir(),'lifegame-cadence.json')),JSON.stringify({targetTurnMs:2000,targetPhaseMs:2000/3,scope:'Node headless, preview clone included; render and waits excluded; shared CPU',rows},null,2));console.log(rows.map(r=>({mode:r.mode,initial:r.initial,maxPhaseMs:Math.max(...r.costs.flatMap(c=>c.phases))})));
