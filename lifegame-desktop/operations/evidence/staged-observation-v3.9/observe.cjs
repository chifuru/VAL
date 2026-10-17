const fs=require('fs'),E=require('../../../src/ecology/engine.js'),S=E.S,results=[];
for(const mode of ['river-settlement','lake-foodweb'])for(let sample=0;sample<2;sample++)for(const variant of ['baseline','mode']){
 const preset=S.observationPreset(mode,40,28),seed='observe39/'+sample;
 const input={seed,terrainSeed:seed,landscape:'templates',ageModel:'life/1',width:40,height:28,initial:80,observationMode:variant==='mode'?mode:'custom',lineages:'manual',selected:preset.selected,mapId:preset.mapId,guarantee:false};
 let w=E.create(input);const snapshots=[],deaths={combat:0,starvation:0,age:0},phaseMs=[0,0,0];
 const end=sample===0?1000:500;
 for(let n=0;n<=end;n++){
  if([0,100,300,500,1000].includes(n)){snapshots.push({turn:n,main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,counts:w.stats.counts,births:w.tallies.births});console.log(mode,sample,variant,n,w.stats.main,w.stats.food,w.stats.P,w.stats.Q);}
  if(n===end)break;
  const job=E.beginTurn(w);let result;
  for(let i=0;i<3;i++){const t=performance.now();result=job.advance();phaseMs[i]+=performance.now()-t;}w=result.world;
  const errors=E.invariants(w);if(errors.length)throw Error(errors);
  for(const d of w.last.deathCauses)if(S.spec({species:d.species}).group==='main')deaths[d.reason]++;
 }
 results.push({mode,sample,variant,config:w.config,snapshots,deaths,phaseMeanMs:phaseMs.map(v=>v/end),fingerprint:E.fingerprint(w)});
 fs.writeFileSync((process.env.LIFEGAME_MODE_OUT||require('path').join(require('os').tmpdir(),'lifegame-modes.json')),JSON.stringify({results},null,2));
}
