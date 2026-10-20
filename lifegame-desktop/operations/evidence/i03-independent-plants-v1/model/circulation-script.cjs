'use strict';
// Run from the project root; use the same compiled model as the app and Worker.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{gzipSync}=require('node:zlib');
const M=require(path.resolve('src/ecology/observation-model.js')),O=require(path.resolve('src/ecology/observations.js'));
const ids=['forestcrown','starcrown','freshwaterlight'],reports=[];
for(const [id,mapId,supply] of [['river-free','river',false],['lake-free','lake',false],['river-supply','river',true]]){
 const E=M.model(),config={seed:'i03/circulation/'+id,terrainSeed:'i03/terrain/'+mapId,width:40,height:28,initial:40,lineages:'few',landscape:'templates',mapId,producerModel:'colony/1',largePlantModel:'independent/1',producerSupport:{enabled:supply},ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
 let w=E.create(config),h=O.create(w.config,'i03-circulation',{species:E.S.activeSpecies(w)});h.append(w);
 const history=[],bySpecies=Object.fromEntries(ids.map(id=>[id,{productionB:0,regrowthB:0,consumedB:0,settlements:0,maxPhase:1,maxGeneration:0}])),deaths={};
 function sample(){
  for(const o of w.organisms.filter(E.S.LargePlant.is)){const s=bySpecies[o.species];s.maxPhase=Math.max(s.maxPhase,o.phase);s.maxGeneration=Math.max(s.maxGeneration,o.generation);if(w.turn){for(const k of ['productionB','regrowthB','consumedB'])s[k]+=o.plant.last[k];}s.settlements=Math.max(s.settlements,o.plant.cumulative.settlements);}
  history.push({turn:w.turn,counts:{...w.stats.counts},plants:structuredClone(w.largePlantSummary),phases:Object.fromEntries(ids.map(id=>[id,[1,2,3,4].map(phase=>w.organisms.filter(o=>o.species===id&&o.phase===phase).length)])),ledger:{...w.ledger}});
 }
 sample();
 for(let turn=1;turn<=180;turn++){w=E.step(w);assert.deepEqual(E.invariants(w),[],id+'/'+turn);h.append(w);for(const d of w.last.deathCauses)deaths[d.reason]=(deaths[d.reason]||0)+1;sample();}
 if(!supply){assert.equal(w.ledger.producerE||0,0);assert.equal(w.ledger.producerM||0,0);}
 assert(Object.values(bySpecies).every(s=>s.productionB>0),'each plant actually produces');
 assert(Object.values(bySpecies).some(s=>s.maxGeneration>0),'paid offspring exist');
 assert(Object.values(bySpecies).some(s=>s.maxPhase>=2),'outcome experience advances a phase');
 const report={id,config:w.config,turns:180,states:history.length,allInvariantsPassed:true,bySpecies,births:w.tallies.births,deaths,finalCounts:w.stats.counts,finalFingerprint:E.fingerprint(w),finalLedger:w.ledger,trajectory:history};reports.push(report);
 console.log(JSON.stringify({id,passed:true,bySpecies,finalCounts:Object.fromEntries(ids.map(id=>[id,w.stats.counts[id]]))}));
 fs.writeFileSync(path.resolve('operations/evidence/i03-independent-plants-v1/model/'+id+'-all-turns.csv.gz'),gzipSync(h.csv()));
}
fs.writeFileSync(path.resolve('operations/evidence/i03-independent-plants-v1/model/circulation.json'),JSON.stringify({version:'4.2.35',environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'Three fixed 180T circulation checks, not final R1-R6, survival rates or IV branch coverage',reports},null,2)+'\n');
