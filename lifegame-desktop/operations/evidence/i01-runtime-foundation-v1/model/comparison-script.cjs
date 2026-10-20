'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const current=path.resolve('src/ecology'),baseline='/tmp/valis-i01-baseline-e8488a4/ecology';
const M=require(current+'/observation-model.js'),Old=require(baseline+'/observation-model.js'),O=require(current+'/observations.js'),OldO=require(baseline+'/observations.js');
const definitions=[];
for(let bits=0;bits<8;bits++)definitions.push({id:'flags-'+bits,flags:{producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},width:40,height:28,initial:80,turns:20});
for(const [width,height,initial,turns]of [[80,56,320,6],[160,112,1280,4]])definitions.push({id:'scale-'+width,flags:{producer:true,waterbug:true,hyperparasite:true},width,height,initial,turns});
function metrics(E){const seen=new WeakSet(),data={requests:0,distinctMaps:0},original=E.S.maps;E.S.maps=(...args)=>{data.requests++;const result=original(...args);if(!seen.has(result)){seen.add(result);data.distinctMaps++;}return result;};return data;}
function stats(samples){const sorted=samples.slice().sort((a,b)=>a-b);return {count:samples.length,medianMs:sorted[Math.floor(sorted.length/2)],meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,maxMs:Math.max(...samples)};}
const cases=[];let states=0;
for(const d of definitions){
 const E=M.model(d.flags),B=Old.model(d.flags),config={seed:'i01/'+d.id,width:d.width,height:d.height,initial:d.initial,lineages:'few',landscape:'templates',mapId:'river',ageModel:'life/1',ecologyRevision:'observation/4.1',blockTurns:500,randomModel:'table/1'};
 let w=E.create(config),b=B.create(config);E.S.prepareGeometry(w);B.S.prepareGeometry(b);
 const h=O.create(w.config,'i01-parity',{species:E.S.D.species}),oldH=OldO.create(b.config,'i01-parity',{species:B.S.D.species}),m=metrics(E),oldM=metrics(B),times=[],oldTimes=[];
 for(let t=0;t<=d.turns;t++){
  assert.deepEqual(w,b,d.id+'/'+t);assert.deepEqual(E.invariants(w),[],d.id+'/'+t);h.append(w);oldH.append(b);states++;
  if(t===d.turns)break;
  const next=()=>{const start=performance.now();w=E.step(w);times.push(performance.now()-start);};
  const oldNext=()=>{const start=performance.now();b=B.step(b);oldTimes.push(performance.now()-start);};
  if(t%2){next();oldNext();}else{oldNext();next();}
 }
 assert.equal(h.csv(),oldH.csv(),d.id+'/csv');assert.equal(E.fingerprint(w),B.fingerprint(b),d.id+'/fingerprint');
 cases.push({id:d.id,config:w.config,turns:d.turns,states:d.turns+1,finalPopulation:w.organisms.length,finalFingerprint:E.fingerprint(w),worldAndCSVEqual:true,invariants:true,index:{current:m,baseline:oldM},timing:{current:stats(times),baseline:stats(oldTimes),note:'Short alternating Node calculation samples, not browser FPS or a performance guarantee.'}});
 console.log(JSON.stringify({id:d.id,states:d.turns+1,maps:m.distinctMaps,baselineMaps:oldM.distinctMaps,passed:true}));
}
const report={baseline:'e8488a4 source / product 4.2.32',current:'I01 working source',environment:{node:process.version,platform:process.platform,arch:process.arch},cases:cases.length,states,worldAndCSVEqual:true,measurements:cases,scope:'8 advantage profiles and three sizes; not a 500T survival, visual, or Windows verification.'};
const out=path.resolve('operations/evidence/i01-runtime-foundation-v1/model');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/comparison.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:cases.length,states,passed:true}));
