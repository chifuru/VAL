'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{Worker}=require('node:worker_threads');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),T=require('../src/ecology/transport.js');
require('../src/ecology/replay-version.js');
const previous='29d8a966b7f9dcf86b26c5f40bd11967633dc9d8c52971720e584e8f0f7e23d5',config={seed:'i03/flow',width:40,height:28,initial:40,lineages:'few',landscape:'templates',mapId:'river',terrainSeed:'i03/terrain',producerModel:'colony/1',largePlantModel:'independent/1',ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500,founderCounts:{version:1,species:{forestcrown:2,starcrown:2,freshwaterlight:2},parasites:{hyperparasite:0}}};
function storage(){let raw=null;return {getItem:()=>raw,setItem:(_,s)=>{raw=s;}};}
test('independent plant conditions, individual units and every turn survive archive replay',()=>{
 const E=M.model(),s=storage(),a=A.create(s,E,globalThis.EcoReplayVersion);let w=E.create(config),h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);
 for(let t=0;t<8;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}
 const snapshot=h.snapshot(),record=a.capture(w,'user-ended',snapshot);assert(a.save(record));assert.equal(snapshot.rows.length,9);assert.equal(record.config.largePlantModel,'independent/1');assert.equal(record.final.independentPlants.definition,'independent-plant-observed/1');
 assert(h.csv().includes('"population","forestcrown","2","individual"'));
 for(const edit of [s=>delete s.rows[2].independentPlants,s=>s.definitions.independentPlants='future']){const missing=structuredClone(snapshot);edit(missing);assert.throws(()=>a.capture(w,'user-ended',missing),/独立植物/);}
 const r=a.replay(record.id);let replay=E.create(r.config),again=O.create(replay.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(replay)});again.append(replay);
 for(let t=0;t<r.turn;t++){replay=E.step(replay);again.append(replay);}
 assert.equal(E.fingerprint(replay),record.finalFingerprint);assert.equal(again.csv(),h.csv());assert.deepEqual(O.restore(snapshot).rows,snapshot.rows);assert.equal(a.list().length,1);
});
test('pre-I03 signatures cannot claim independent plants',()=>{
 const E=M.model(),s=storage(),a=A.create(s,E,globalThis.EcoReplayVersion),record=a.capture(E.create(config),'user-ended');
 for(const signature of [previous,'e98dd757d22ff53efe5e48637fc2761b692e668e7d70f31421662913e0010712']){
  s.setItem('',JSON.stringify([{...record,signature}]));assert.throws(()=>a.replay(record.id),/計算版/);
 }
});
test('I02 colony records replay with their original31 species and without independent plants',()=>{
 const E=M.model(),s=storage(),legacyConfig={...config};delete legacyConfig.largePlantModel;delete legacyConfig.founderCounts;
 let w=E.create(legacyConfig);for(let t=0;t<3;t++)w=E.step(w);
 const old=A.create(s,E,previous),record=old.capture(w,'user-ended');old.save(record);const a=A.create(s,E,globalThis.EcoReplayVersion),r=a.replay(record.id);
 let replay=E.create(r.config);for(let t=0;t<r.turn;t++)replay=E.step(replay);
 assert.equal(E.fingerprint(replay),record.id);assert.equal(replay.config.largePlantModel,undefined);assert.equal(E.S.activeSpecies(replay).length,31);assert(!replay.organisms.some(E.S.LargePlant.is));
});
test('real Worker phases preserve producer occupancy, shared inputs and committed restart',{timeout:30000},async()=>{
 const E=M.model({producer:false,waterbug:false,hyperparasite:false}),worker=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];
 worker.on('message',m=>{if(waiters.length)waiters.shift()(m);else messages.push(m);});const next=()=>messages.length?Promise.resolve(messages.shift()):new Promise(r=>waiters.push(r));
 try{
  let world=E.create(config);worker.postMessage({type:'init',epoch:1,world,stream:true});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:1,count:3,limit:500});
  for(let turn=1;turn<=3;turn++){let view=world;for(let phase=0;phase<3;phase++){const d=await next();assert.equal(d.type,'phase',d.message);assert.equal(d.phase,phase);view=T.apply(view,d.patch);}const packet=await next();assert.equal(packet.type,'turn');assert.equal(packet.turn,turn);assert.deepEqual(view,E.step(world));assert.deepEqual(E.invariants(view),[]);world=view;}
  assert.equal((await next()).type,'idle');worker.postMessage({type:'init',epoch:2,world,stream:false});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:2,count:1,limit:500});const packet=await next();assert.equal(packet.type,'turn');let view=world;for(const patch of packet.patches)view=T.apply(view,patch);assert.deepEqual(view,E.step(world));assert.equal((await next()).type,'idle');
 }finally{await worker.terminate();}
});
