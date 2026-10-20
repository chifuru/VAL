'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Static=require(path.resolve('src/ecology/observation-model.js')),Dynamic=require(path.resolve('design/advantage-switches/model.cjs')),O=require(path.resolve('src/ecology/observations.js'));
const reports=[];
for(let bits=0;bits<8;bits++){
 const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},E=Static.model(flags),D=Dynamic.model(flags);
 const config={seed:'i02/profiles/'+bits,width:40,height:28,initial:40,lineages:'few',landscape:'templates',mapId:'river',terrainSeed:'i02/profile-map',producerModel:'colony/1',producerSupport:{enabled:true,land:{regrowth:.25},water:{regrowth:0}},initialConditions:{version:1,density:{plant:0,fungus:.03,prey:.06},resources:{mineral:1,droplet:1,info:1},distribution:'cluster'},ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
 let w=E.create(config),d=D.create(config),h=O.create(w.config,'i02-profile-paths',{species:E.S.D.species}),old=O.create(d.config,'i02-profile-paths',{species:D.S.D.species});
 for(let t=0;t<=5;t++){
  assert.deepEqual(w,d,'profile '+bits+'/'+t);assert.deepEqual(E.invariants(w),[]);assert.deepEqual(D.invariants(d),[]);h.append(w);old.append(d);
  if(t<5){w=E.step(w);d=D.step(d);}
 }
 assert.equal(h.csv(),old.csv());assert.equal(E.fingerprint(w),D.fingerprint(d));reports.push({flags,states:6,worldAndCSVEqual:true,invariants:true,fingerprint:E.fingerprint(w)});
 console.log(JSON.stringify({bits,states:6,passed:true}));
}
fs.writeFileSync(path.resolve('operations/evidence/i02-producer-colonies-v1/model/profile-paths.json'),JSON.stringify({states:48,cases:8,scope:'new colony worlds; dynamic generation equals shipped static model',reports},null,2)+'\n');
