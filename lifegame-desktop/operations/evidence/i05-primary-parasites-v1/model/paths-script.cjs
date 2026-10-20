'use strict';
// Execute from lifegame-desktop. The baseline is a Git extraction, never the live source.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const Current=require(path.resolve('src/ecology/observation-model.js')),Old=require('/tmp/valis-i05-baseline-3167a2d/ecology/observation-model.js'),Dynamic=require(path.resolve('design/advantage-switches/model.cjs')),O=require(path.resolve('src/ecology/observations.js')),OldO=require('/tmp/valis-i05-baseline-3167a2d/ecology/observations.js');
const out=path.resolve('operations/evidence/i05-primary-parasites-v1/model'),results={legacy:[],primary:[]};
for(let bits=0;bits<8;bits++){
 const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)};
 for(const mode of [0,1,2,3]){
  const E=Current.model(flags),B=Old.model(flags),config={seed:'i05/legacy/'+bits+'/'+mode,width:40,height:28,initial:40,lineages:'few',landscape:'templates',mapId:'river',terrainSeed:'i05/map',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',blockTurns:500,...(mode>0?{producerModel:'colony/1'}:{}),...(mode>1?{largePlantModel:'independent/1'}:{}),...(mode>2?{ryoukiModel:'ryouki/1'}:{})};
  let w=E.create(config),b=B.create(config),h=O.create(w.config,'i05-legacy',{species:E.S.activeSpecies(w)}),old=OldO.create(b.config,'i05-legacy',{species:B.S.activeSpecies(b)});
  for(let t=0;t<=6;t++){assert.deepEqual(w,b,'legacy '+bits+'/'+mode+'/'+t);assert.deepEqual(E.invariants(w),[]);h.append(w);old.append(b);if(t<6){w=E.step(w);b=B.step(b);}}
  assert.equal(h.csv(),old.csv());assert.equal(E.fingerprint(w),B.fingerprint(b));results.legacy.push({bits,mode,states:7,worldAndCSVEqual:true,fingerprint:E.fingerprint(w)});
 }
 const E=Current.model(flags),D=Dynamic.model(flags),config={seed:'i05/new/'+bits,primaryParasiteModel:'primary/1',width:40,height:28,initial:48,lineages:'manual',selected:['ryouki','solar','whale'],landscape:'templates',mapId:'river',terrainSeed:'i05/map',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',blockTurns:500,producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',founderCounts:{version:1,species:{forestcrown:2,starcrown:2,freshwaterlight:2},parasites:{hyperparasite:0}}};
 let w=E.create(config),d=D.create(config),h=O.create(w.config,'i05-static',{species:E.S.activeSpecies(w)}),other=O.create(d.config,'i05-static',{species:D.S.activeSpecies(d)});
 for(let t=0;t<=4;t++){assert.deepEqual(w,d,'independent '+bits+'/'+t);assert.deepEqual(E.invariants(w),[]);assert.deepEqual(D.invariants(d),[]);h.append(w);other.append(d);if(t<4){w=E.step(w);d=D.step(d);}}
 assert.equal(h.csv(),other.csv());assert.equal(E.fingerprint(w),D.fingerprint(d));results.primary.push({bits,states:5,worldAndCSVEqual:true,fingerprint:E.fingerprint(w)});
 console.log(JSON.stringify({bits,legacyStates:28,primaryStates:5,passed:true}));
}
fs.writeFileSync(out+'/paths.json',JSON.stringify({baseline:'3167a2d / 4.2.36',legacyStates:224,primaryStates:40,scope:'legacy/I02/I03/I04 exact world/CSV parity; all8 primary-parasite static/dynamic profiles',...results},null,2)+'\n');
