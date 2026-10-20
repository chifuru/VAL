'use strict';
// Fixed diagnostic conditions, not a selected set of successful final-balance trials.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{gzipSync}=require('node:zlib');
const M=require(path.resolve('src/ecology/observation-model.js')),O=require(path.resolve('src/ecology/observations.js'));require(path.resolve('src/ecology/replay-version.js'));
const reports=[];
for(const [id,mapId,selected,initial,limit,placement] of [['river-low','river',['ryouki'],48,180,'natural'],['river-mixed','river',['ryouki','solar','recursive'],72,180,'natural'],['lake-mixed','lake',['ryouki','solar','whale'],72,180,'natural'],['river-dense','river',['ryouki'],768,24,'cluster']]){
 const E=M.model(),config={seed:'i04/circulation/'+id,terrainSeed:'i04/terrain/'+mapId,width:40,height:28,initial,placement,lineages:'manual',selected,landscape:'templates',mapId,producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',producerSupport:{enabled:false},ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
 let w=E.create(config),h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);
 const history=[],events={},deaths={},ryoukiIds=new Set();let maxPhase=1,maxGeneration=0,maxMutated=0,maxOccupancy=0,steps=0;
 function sample(){
  for(const o of w.organisms.filter(E.S.Ryouki.is)){ryoukiIds.add(o.id);maxPhase=Math.max(maxPhase,o.phase);maxGeneration=Math.max(maxGeneration,o.generation);}
  maxMutated=Math.max(maxMutated,w.ryoukiSummary.mutated);maxOccupancy=Math.max(maxOccupancy,w.ryoukiSummary.maxOccupancy);
  for(const event of w.events||[])if(event.species==='ryouki'||ryoukiIds.has(event.id)){events[event.type]=(events[event.type]||0)+1;if(event.type==='move')steps+=event.path?.length??1;}
  history.push({turn:w.turn,counts:{...w.stats.counts},ryouki:structuredClone(w.ryoukiSummary),phases:[1,2,3,4].map(phase=>w.organisms.filter(o=>E.S.Ryouki.is(o)&&o.phase===phase).length),ledger:{...w.ledger}});
 }
 sample();
 for(let turn=1;turn<=limit;turn++){w=E.step(w);assert.deepEqual(E.invariants(w),[],id+'/'+turn);h.append(w);for(const d of w.last.deathCauses)deaths[d.reason]=(deaths[d.reason]||0)+1;sample();}
 assert.equal(w.ledger.producerE||0,0);assert.equal(w.ledger.producerM||0,0);
 const report={id,config:w.config,turns:limit,states:history.length,allInvariantsPassed:true,maxPhase,maxGeneration,maxMutated,maxOccupancy,steps,events,births:w.tallies.births,deaths,finalCounts:w.stats.counts,finalFingerprint:E.fingerprint(w),finalLedger:w.ledger,trajectory:history};reports.push(report);
 console.log(JSON.stringify({id,passed:true,maxPhase,maxGeneration,maxMutated,maxOccupancy,steps,ryouki:w.stats.counts.ryouki}));
 fs.writeFileSync(path.resolve('operations/evidence/i04-ryouki-v1/model/'+id+'-all-turns.csv.gz'),gzipSync(h.csv()));
}
fs.writeFileSync(path.resolve('operations/evidence/i04-ryouki-v1/model/circulation.json'),JSON.stringify({version:'4.2.36',biologicalSignature:globalThis.EcoReplayVersion,environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'Three unfiltered fixed180T diagnostic trials and one24T dense trial; no final survival-rate or R1-R6 certification',reports},null,2)+'\n');
