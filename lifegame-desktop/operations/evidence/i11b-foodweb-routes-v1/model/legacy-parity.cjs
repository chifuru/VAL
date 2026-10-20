'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..'),baseline=process.env.I11B_BASELINE||'/tmp/i11b-baseline/lifegame-desktop',B=require(path.join(baseline,'src/ecology/observation-model.js')),F=require(root+'/design/advantage-switches/model.cjs'),O=require(root+'/src/ecology/observations.js');
const config={seed:'i11b/legacy',width:16,height:12,initial:24,lineages:'manual',selected:['solar','ryouki','swarm'],placement:'natural',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',populationRegulation:{version:1},producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard'},enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
const runs=[];
for(let bits=0;bits<8;bits++)for(const balanceModel of ['survival/1',...(bits===0||bits===7?[undefined]:[])]){
 const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},old=B.model(flags),now=F.model(flags),c={...config,...(balanceModel?{balanceModel}:{})};let a=old.create(c),b=now.create(c);const ha=O.create(a.config,'compat',{species:old.S.activeSpecies(a)}),hb=O.create(b.config,'compat',{species:now.S.activeSpecies(b)}),fingerprints=[];
 for(let t=0;t<=4;t++){assert.deepEqual(b,a);assert.deepEqual(now.invariants(b),[]);ha.append(a);hb.append(b);fingerprints.push(now.fingerprint(b));if(t<4){a=old.step(a);b=now.step(b);}}
 assert.deepEqual(hb.snapshot(),ha.snapshot());runs.push({flags,balanceModel:balanceModel??null,states:5,fingerprints});
}
const result={baseline:'1b248aa',currentModel:'source factory',biologicalSignature:require('node:vm').runInNewContext(fs.readFileSync(root+'/src/ecology/replay-version.js','utf8')+'EcoReplayVersion'),matchedWorlds:runs.reduce((n,r)=>n+r.states,0),matchedAllObservations:true,runs};
fs.mkdirSync(root+'/operations/evidence/i11b-foodweb-routes-v1/model',{recursive:true});fs.writeFileSync(root+'/operations/evidence/i11b-foodweb-routes-v1/model/legacy-parity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({worlds:result.matchedWorlds,observations:true}));
