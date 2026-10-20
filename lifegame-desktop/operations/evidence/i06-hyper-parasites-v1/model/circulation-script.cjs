'use strict';
// Predeclared diagnostics, not a selected set of successful survival trials.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{gzipSync}=require('node:zlib');
const M=require(path.resolve('src/ecology/observation-model.js')),O=require(path.resolve('src/ecology/observations.js'));require(path.resolve('src/ecology/replay-version.js'));
const out=path.resolve('operations/evidence/i06-hyper-parasites-v1/model'),reports=[];
for(const [id,mapId,support] of [['river-free','river',false],['lake-free','lake',false],['river-supported','river',true]]){
 const E=M.model(),config={seed:'i06/circulation/'+id,terrainSeed:'i06/terrain/'+mapId,width:40,height:28,initial:80,lineages:'manual',selected:['ryouki','solar','whale','jelly','recursive'],landscape:'templates',mapId,producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',producerSupport:{enabled:support},ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
 let w=E.create(config),h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);
 const trajectory=[],flow={},max={Q:w.stats.Q,P:w.stats.P,phase:1,generation:0,exposed:0,invading:0,migrating:0},initialIds=new Set(E.S.HyperParasite.entries(w).map(e=>e.q.id)),childIds=new Set();
 function sample(){
  const s=w.hyperParasiteSummary;max.Q=Math.max(max.Q,w.stats.Q);max.P=Math.max(max.P,w.stats.P);
  for(const {q}of E.S.HyperParasite.entries(w)){max.phase=Math.max(max.phase,q.phase);if(!initialIds.has(q.id))childIds.add(q.id);}
  for(const [key,n]of Object.entries(w.observation.hyperParasite.bySpecies.hyperparasite)){if(typeof n==='number'&&key!=='turn')flow[key]=E.S.round((flow[key]||0)+n);}
  trajectory.push({turn:w.turn,counts:{...w.stats.counts},stock:structuredClone(s),flow:structuredClone(w.observation.hyperParasite),ledger:{...w.ledger}});
 }
 sample();
 for(let t=1;t<=180;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[],id+'/'+t);h.append(w);sample();}
 if(!support){assert.equal(w.ledger.producerE||0,0);assert.equal(w.ledger.producerM||0,0);}
 const report={id,config:w.config,states:trajectory.length,turns:180,allInvariantsPassed:true,finalCounts:w.stats.counts,initialQ:initialIds.size,observedNewQ:childIds.size,max,flow,finalLedger:w.ledger,finalFingerprint:E.fingerprint(w),trajectory};reports.push(report);
 fs.writeFileSync(out+'/'+id+'-all-turns.csv.gz',gzipSync(h.csv()));console.log(JSON.stringify({id,passed:true,finalP:w.stats.P,finalQ:w.stats.Q,newQ:childIds.size,max,flow}));
}
fs.writeFileSync(out+'/circulation.json',JSON.stringify({version:'4.2.38',biologicalSignature:globalThis.EcoReplayVersion,environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'Three fixed180T diagnostic conditions, includes failures; no final500T/R1-R6 or long-term lifecycle certification',reports},null,2)+'\n');
