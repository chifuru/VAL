'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),M=require(path.resolve('src/ecology/observation-model.js')),O=require(path.resolve('src/ecology/observations.js'));
require(path.resolve('src/ecology/replay-version.js'));
const out=path.resolve('operations/evidence/i08-generation-archive-v1/model'),reports=[];
for(const [id,width,height,initial,mode,profile]of [['small-standard',40,28,80,'auto','standard'],['medium-manual',80,56,320,'manual','auto'],['large-water',160,112,1280,'auto','water-focused']]){
 const E=M.model(),config={seed:'i08/initial/'+id,terrainSeed:'i08/map/'+id,width,height,initial,lineages:'few',landscape:'templates',mapId:'auto',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',blockTurns:500,
  producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',
  generationModel:'diverse/1',generationSettings:{mode,profile},producerSupport:{enabled:false}};
 const start=performance.now(),w=E.create(config),creationMs=performance.now()-start;assert.deepEqual(E.invariants(w),[]);assert.equal(w.turn,0);assert.equal(w.informationField.length,0);
 const again=E.create(structuredClone(w.config));assert.deepEqual(again,w);assert.equal(E.fingerprint(again),E.fingerprint(w));const g=w.config.generationResolved;
 const h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);let stepped=w;
 if(width===40)for(let t=0;t<8;t++){stepped=E.step(stepped);assert.deepEqual(E.invariants(stepped),[]);h.append(stepped);}
 const report={id,config:w.config,creationMs,initialFingerprint:E.fingerprint(w),turnsSimulated:stepped.turn,allInvariantsPassed:true,replayInitialExact:true,profile:g.profile,candidates:g.candidates.length,
  actual:g.actual.bySpecies,staticChecks:g.candidates[g.selectedAttempt].checks,finalFingerprint:E.fingerprint(stepped),finalCounts:stepped.stats.counts};reports.push(report);
 fs.writeFileSync(out+'/'+id+'-observations.csv',h.csv());console.log(JSON.stringify({id,creationMs,profile:g.profile,candidates:g.candidates.length,turns:stepped.turn,passed:true}));
}
fs.writeFileSync(out+'/initial-matrix.json',JSON.stringify({version:'4.2.40',biologicalSignature:globalThis.EcoReplayVersion,environment:{node:process.version,platform:process.platform,arch:process.arch},scope:'Three predeclared initial-generation conditions; medium/large T0 only, small8T coupling; no500T, survival, preparation deadline or device-performance certification',reports},null,2)+'\n');
