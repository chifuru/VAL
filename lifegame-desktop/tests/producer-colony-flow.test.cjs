'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{Worker}=require('node:worker_threads');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),T=require('../src/ecology/transport.js');
require('../src/ecology/replay-version.js');
const config={seed:'i02/flow',width:40,height:28,initial:40,lineages:'few',landscape:'templates',mapId:'river',terrainSeed:'i02/terrain',producerModel:'colony/1',producerSupport:{enabled:false},ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
function storage(){let raw=null;return {getItem:()=>raw,setItem:(_,s)=>{raw=s;}};}
test('colony initial conditions and all-turn observations replay without adding records',()=>{
 const E=M.model(),s=storage(),a=A.create(s,E,globalThis.EcoReplayVersion);let w=E.create(config),h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.D.species});h.append(w);
 for(let t=0;t<8;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}
 const snapshot=h.snapshot(),record=a.capture(w,'user-ended',snapshot);assert(a.save(record));
 const missing=structuredClone(snapshot);delete missing.rows[2].producerColony;assert.throws(()=>a.capture(w,'user-ended',missing),/群落/);
 const unknown=structuredClone(snapshot);unknown.definitions.producerColony='producer-colony-observed/unknown';assert.throws(()=>a.capture(w,'user-ended',unknown),/群落/);
 assert.equal(record.config.producerModel,'colony/1');assert.equal(snapshot.rows.length,9);assert.equal(record.config.producerSettings.land.occupancy,.2);
 const replay=a.replay(record.id);let next=E.create(replay.config),again=O.create(next.config,globalThis.EcoReplayVersion,{species:E.S.D.species});again.append(next);
 for(let t=0;t<replay.turn;t++){next=E.step(next);again.append(next);}
 assert.equal(E.fingerprint(next),record.finalFingerprint);assert.equal(again.csv(),h.csv());assert.deepEqual(O.restore(snapshot).rows,snapshot.rows);assert.equal(a.list().length,1);
});
test('a legacy biological signature cannot claim the new colony model',()=>{
 const E=M.model(),s=storage(),a=A.create(s,E,globalThis.EcoReplayVersion),w=E.create(config),record=a.capture(w,'user-ended');a.save(record);
 for(const signature of ['e98dd757d22ff53efe5e48637fc2761b692e668e7d70f31421662913e0010712','8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745']){
  s.setItem('',JSON.stringify([{...record,signature}]));assert.throws(()=>a.replay(record.id),/計算版/);
 }
});
test('4.2.32 and I01 records replay their original individual plants without colony conversion',()=>{
 const E=M.model();let w=E.create({...config,producerModel:undefined});
 for(let t=0;t<3;t++)w=E.step(w);
 for(const signature of ['e98dd757d22ff53efe5e48637fc2761b692e668e7d70f31421662913e0010712','8d7f6fbd94128cebf77ab6032098e09a432bc13d8cb2552222b0546971e84745']){
  const s=storage(),old=A.create(s,E,signature),record=old.capture(w,'user-ended');old.save(record);
  const a=A.create(s,E,globalThis.EcoReplayVersion),r=a.replay(record.id);assert.equal(r.config.producerModel,undefined);
  let replay=E.create(r.config);for(let t=0;t<r.turn;t++)replay=E.step(replay);
  assert.equal(E.fingerprint(replay),record.id);assert(!replay.organisms.some(E.S.Colony.is));assert.equal(a.list().length,1);
 }
});
test('real Worker transports every colony phase and resumes from the committed world',{timeout:30000},async()=>{
 const E=M.model({producer:false,waterbug:false,hyperparasite:false}),worker=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];
 worker.on('message',m=>{if(waiters.length)waiters.shift()(m);else messages.push(m);});
 const next=()=>messages.length?Promise.resolve(messages.shift()):new Promise(resolve=>waiters.push(resolve));
 try{
  let world=E.create(config);worker.postMessage({type:'init',epoch:1,world,stream:true});assert.equal((await next()).type,'ready');
  worker.postMessage({type:'compute',epoch:1,count:3,limit:500});
  for(let turn=1;turn<=3;turn++){
   let view=world;
   for(let phase=0;phase<3;phase++){const d=await next();assert.equal(d.type,'phase',d.message);assert.equal(d.phase,phase);view=T.apply(view,d.patch);}
   const packet=await next();assert.equal(packet.type,'turn');assert.equal(packet.turn,turn);const atomic=E.step(world);assert.deepEqual(view,atomic);assert.deepEqual(E.invariants(view),[]);world=view;
  }
  assert.equal((await next()).type,'idle');
  // Restart from the last committed state, not a cached future phase.
  worker.postMessage({type:'init',epoch:2,world,stream:false});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:2,count:1,limit:500});
  const packet=await next();assert.equal(packet.type,'turn');let view=world;for(const patch of packet.patches)view=T.apply(view,patch);assert.deepEqual(view,E.step(world));assert.equal((await next()).type,'idle');
 }finally{await worker.terminate();}
});
