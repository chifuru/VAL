'use strict';
// Run from the project root, using the exact same static model as the app/Worker.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{gzipSync}=require('node:zlib');
const M=require(path.resolve('src/ecology/observation-model.js')),O=require(path.resolve('src/ecology/observations.js'));
const cases=[['river-off','river',false],['lake-off','lake',false],['river-on','river',true]],reports=[];
for(const [id,mapId,supply] of cases){
 const E=M.model(),config={seed:'i02/circulation/'+id,terrainSeed:'i02/terrain/'+mapId,width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId,producerModel:'colony/1',producerSupport:{enabled:supply},ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
 let w=E.create(config),h=O.create(w.config,'i02-circulation',{species:E.S.D.species});h.append(w);
 const states=[{turn:0,counts:{...w.stats.counts},colonies:structuredClone(w.colonySummary),ledger:{...w.ledger}}];
 const sums={land:{productionB:0,regrowthB:0,consumedB:0},water:{productionB:0,regrowthB:0,consumedB:0}},deaths={},born={};
 for(let t=1;t<=120;t++){
  w=E.step(w);assert.deepEqual(E.invariants(w),[],id+'/'+t);h.append(w);
  for(const region of ['land','water'])for(const key of Object.keys(sums[region]))sums[region][key]+=w.colonySummary[region][key];
  for(const d of w.last.deathCauses)deaths[d.reason]=(deaths[d.reason]||0)+1;
  for(const [s,n] of Object.entries(w.tallies.births))born[s]=n;
  states.push({turn:t,counts:{...w.stats.counts},colonies:structuredClone(w.colonySummary),ledger:{...w.ledger}});
 }
 if(!supply){assert.equal(w.ledger.producerE||0,0);assert.equal(w.ledger.producerM||0,0);}
 for(const region of ['land','water']){
  assert(sums[region].productionB>0,id+'/'+region+' actual production');
  assert(sums[region].consumedB>0,id+'/'+region+' actual grazing');
  assert(sums[region].regrowthB>0,id+'/'+region+' actual replacement');
 }
 const result={id,config:w.config,turns:120,states:states.length,allInvariantsPassed:true,sums,deaths,born,finalFingerprint:E.fingerprint(w),finalCounts:w.stats.counts,finalLedger:w.ledger,trajectory:states};
 reports.push(result);console.log(JSON.stringify({id,turns:120,passed:true,main:w.stats.main,waterbug:w.stats.counts.waterbug,sums}));
 fs.writeFileSync(path.resolve('operations/evidence/i02-producer-colonies-v1/model/'+id+'-all-turns.csv.gz'),gzipSync(h.csv()));
}
fs.writeFileSync(path.resolve('operations/evidence/i02-producer-colonies-v1/model/circulation.json'),JSON.stringify({version:'4.2.34',environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'Three fixed 120T circulation checks, not final R1-R6 or survival rates',reports},null,2)+'\n');
