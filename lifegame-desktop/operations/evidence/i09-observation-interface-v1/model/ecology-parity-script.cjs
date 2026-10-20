'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require(path.resolve('src/ecology/observation-model.js'));
// Remove only the introduced display flag, its derived digests and the new
// uncapped observation facts. Keep all prior observables and biological state.
function originalFields(world){
 const copy=structuredClone(world);delete copy.config.relationshipModel;
 if(copy.config.generationResolved){delete copy.config.generationResolved.configHash;delete copy.config.generationResolved.resolutionHash;}
 if(copy.observation?.flowTelemetry)delete copy.observation.flowTelemetry.relationship;
 return copy;
}
const reports=[];
for(let bits=0;bits<8;bits++){
 const E=M.model({producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)});
 const config={seed:'i09/observation-parity/'+bits,terrainSeed:'i09/parity-map',width:40,height:28,initial:48,lineages:'manual',selected:['solar','ryouki','jelly'],landscape:'templates',mapId:'river',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard',locks:[]}};
 let plain=E.create(config),network=E.create({...config,relationshipModel:'network/1'});
 for(let turn=0;turn<=5;turn++){
  assert.deepEqual(originalFields(network),originalFields(plain),'new observation changes prior state '+bits+'/'+turn);
  assert.deepEqual(E.invariants(network),[]);assert.deepEqual(E.invariants(plain),[]);
  if(turn<5){plain=E.step(plain);network=E.step(network);}
 }
 reports.push({bits,states:6,allOriginalFieldsExact:true});
}
fs.writeFileSync(path.resolve('operations/evidence/i09-observation-interface-v1/model/ecology-parity.json'),JSON.stringify({cases:8,states:48,scope:'Same engine with the relationship observation flag enabled/absent; all prior biological state, RNG, budget, events and original observation fields exactly equal after excluding only the added flag, derived resolution digests and new display telemetry',reports},null,2)+'\n');
console.log(JSON.stringify({cases:8,states:48,passed:true}));
