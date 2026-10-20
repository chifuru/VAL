'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{Worker}=require('node:worker_threads');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),T=require('../src/ecology/transport.js');
require('../src/ecology/replay-version.js');
const previous='952b362eb16d6822343c6e739f37e6057fed6eef9067cb7c684bc3e224169efb',config={seed:'i05/flow',primaryParasiteModel:'primary/1',width:40,height:28,initial:48,lineages:'manual',selected:['ryouki','solar','whale'],landscape:'templates',mapId:'river',terrainSeed:'i05/map',producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',blockTurns:500};
function storage(){let raw=null;return {getItem:()=>raw,setItem:(_,s)=>{raw=s;}};}
test('Primary parasite effective conditions, biological counts and flow survive all-turn archive replay',()=>{
 const E=M.model(),s=storage(),a=A.create(s,E,globalThis.EcoReplayVersion);let w=E.create(config),h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);
 for(let t=0;t<8;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}
 const snapshot=h.snapshot(),record=a.capture(w,'user-ended',snapshot);assert(a.save(record));assert.equal(snapshot.rows.length,9);assert.equal(record.config.primaryParasiteModel,'primary/1');assert.equal(record.final.primaryParasite.definition,'primary-parasite-observed/1');assert.equal(record.final.primaryParasiteFlow.definition,'primary-parasite-flow/1');assert(record.config.primaryParasiteSettings);
 for(const row of h.rows){assert.equal(row.primaryParasite.turn,row.turn);assert.equal(row.primaryParasite.count,row.counts.leafparasite+row.counts.tideparasite);assert.equal(row.primaryParasiteFlow.turn,row.turn);}
 for(const edit of [s=>delete s.rows[2].primaryParasite,s=>delete s.rows[2].primaryParasiteFlow,s=>s.definitions.primaryParasite='future',s=>s.definitions.primaryParasiteFlow='future']){const missing=structuredClone(snapshot);edit(missing);assert.throws(()=>a.capture(w,'user-ended',missing),/一次寄生/);}
 const r=a.replay(record.id);let again=E.create(r.config),o=O.create(again.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(again)});o.append(again);
 for(let t=0;t<r.turn;t++){again=E.step(again);o.append(again);}
 assert.equal(E.fingerprint(again),record.finalFingerprint);assert.equal(o.csv(),h.csv());assert.deepEqual(O.restore(snapshot).rows,snapshot.rows);assert.equal(a.list().length,1);
});
test('only established, transferred and actually cleared P enter the ecosystem relation counts',()=>{
 const E=M.model(),w=E.create(config),host=w.organisms.find(o=>o.infection?.species==='leafparasite');assert(host);const ctx=E.context(w);w.turn=1;
 for(const type of ['primary-exposure','primary-invasion','primary-transferring','primary-establishment-failed'])E.S.record(ctx,host,type,{species:'leafparasite'});
 E.finish(w,ctx);const key='leafparasite|'+host.species+'|infection';assert.equal(w.observation.relations[key],undefined);
 const c=E.context(w);E.S.record(c,host,'primary-established',{species:'leafparasite'});E.S.record(c,host,'primary-transferred',{species:'leafparasite'});E.S.record(c,host,'primary-clear',{species:'leafparasite'});E.finish(w,c);
 assert.equal(w.observation.relations[key],2);assert.equal(w.observation.relations[host.species+'|leafparasite|clear'],1);
});
test('pre-primary biological signatures cannot claim the new P infection model',()=>{
 const E=M.model(),s=storage(),a=A.create(s,E,globalThis.EcoReplayVersion),record=a.capture(E.create(config),'user-ended');
 for(const signature of [previous,'8b9c50044add0f60ae755bad650ae037500ede82cec32503b850a6d7ae8d798c']){s.setItem('',JSON.stringify([{...record,signature}]));assert.throws(()=>a.replay(record.id),/計算版/);}
});
test('I04 worlds retain the exact35-species replay without the new primary fields',()=>{
 const E=M.model(),s=storage(),oldConfig={...config};delete oldConfig.primaryParasiteModel;
 let w=E.create(oldConfig);for(let t=0;t<3;t++)w=E.step(w);
 const old=A.create(s,E,previous),record=old.capture(w,'user-ended');old.save(record);const a=A.create(s,E,globalThis.EcoReplayVersion),r=a.replay(record.id);let replay=E.create(r.config);for(let t=0;t<r.turn;t++)replay=E.step(replay);
 assert.equal(E.fingerprint(replay),record.id);assert.equal(E.S.activeSpecies(replay).length,35);assert.equal(replay.primaryInocula,undefined);
});
test('Worker transports primary body, inocula and committed phases before restart',{timeout:30000},async()=>{
 const E=M.model({producer:false,waterbug:false,hyperparasite:false}),worker=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];
 worker.on('message',m=>{if(waiters.length)waiters.shift()(m);else messages.push(m);});const next=()=>messages.length?Promise.resolve(messages.shift()):new Promise(r=>waiters.push(r));
 try{
  let world=E.create(config);const donor=world.organisms.find(o=>o.infection&&E.S.PrimaryParasite.is(o.infection));assert(donor);
  const inoculum=E.S.PrimaryParasite.inoculum(world,donor.infection,{kind:'contact',cell:donor.cell,expires:10});world.primaryInocula.push(inoculum);world.ledger.initialE=E.S.round(world.ledger.initialE+inoculum.E);E.S.PrimaryParasite.summary(world);world.stats=E.summarize(world);assert.deepEqual(E.invariants(world),[]);
  worker.postMessage({type:'init',epoch:1,world,stream:true});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:1,count:3,limit:500});
  for(let turn=1;turn<=3;turn++){let view=world;for(let phase=0;phase<3;phase++){const d=await next();assert.equal(d.type,'phase',d.message);assert.equal(d.phase,phase);assert(d.patch.lists.primaryInocula);view=T.apply(view,d.patch);}const packet=await next();assert.equal(packet.type,'turn');assert.equal(packet.turn,turn);assert.deepEqual(view,E.step(world));assert.deepEqual(E.invariants(view),[]);world=view;}
  assert.equal((await next()).type,'idle');worker.postMessage({type:'init',epoch:2,world,stream:false});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:2,count:1,limit:500});const packet=await next();assert.equal(packet.type,'turn');let view=world;for(const patch of packet.patches)view=T.apply(view,patch);assert.deepEqual(view,E.step(world));assert.equal((await next()).type,'idle');
 }finally{await worker.terminate();}
});
