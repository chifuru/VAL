'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads'),path=require('node:path');
const E=require('../src/ecology/engine.js'),T=require('../src/ecology/transport.js');
const config={seed:'worker40/equality',landscape:'templates',mapId:'river',ageModel:'life/1',width:40,height:28,initial:80,lineages:'few',blockTurns:500,ecologyRevision:'observation/4.1'};
function thread(){
 const w=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];
 w.on('message',m=>{if(waiters.length)waiters.shift()(m);else messages.push(m);});
 return {post:m=>w.postMessage(m),next:()=>messages.length?Promise.resolve(messages.shift()):new Promise(r=>waiters.push(r)),close:()=>w.terminate()};
}
test('real Worker differential frames reconstruct exactly the atomic result across turns and a fresh observer',async()=>{
 const worker=thread();try{
  let world=E.create(config);const original=E.fingerprint(world),id=world.organisms[0].id;
  worker.post({type:'init',epoch:7,world,observeId:id});const ready=await worker.next();assert.equal(ready.type,'ready');assert.equal(ready.epoch,7);
  worker.post({type:'compute',epoch:7,count:4,limit:500});
  for(let n=0;n<4;n++){
   const packet=await worker.next();assert.equal(packet.type,'turn');let view=world;
   for(let i=0;i<3;i++){
    const patch=packet.patches[i];assert.equal(patch.meta.config,undefined);assert.equal(patch.meta.tiles,undefined);
    view=T.apply(view,patch);
   }
   const atomic=E.step(world,{observeId:id});assert.deepEqual(view,atomic);assert.deepEqual(E.invariants(view),[]);world=view;
  }
  assert.equal((await worker.next()).type,'idle');assert.equal(E.fingerprint(E.create(config)),original);
  const other=world.organisms.at(-1).id;
  worker.post({type:'init',epoch:8,world,observeId:other});const reused=await worker.next();assert.equal(reused.type,'ready');assert.equal(reused.cache.reused,true,'same finalized terrain reuses cached calculations');
  worker.post({type:'compute',epoch:8,count:1,limit:500});const packet=await worker.next();let view=world;
  for(const patch of packet.patches)view=T.apply(view,patch);
  assert.deepEqual(view,E.step(world,{observeId:other}));assert.equal((await worker.next()).type,'idle');
 }finally{await worker.close();}
});
test('fixed geometry caching preserves results, ignores soil amounts, keys obstacles and does not leak mutable neighbors',()=>{
 const raw=E.create(config),cached=structuredClone(raw),first=E.S.prepareGeometry(cached);
 assert.equal(E.fingerprint(raw),E.fingerprint(cached));
 const neighbors=E.S.nearby(cached,100);neighbors.length=0;assert(E.S.nearby(cached,100).length);
 let a=raw,b=cached;
 for(let n=0;n<12;n++){a=E.step(a);b=E.step(b);assert.deepEqual(b,a);}
 const soil=structuredClone(raw);soil.tiles[0].soilM+=1;assert.equal(E.S.prepareGeometry(soil).key,first.key);
 const changed=structuredClone(raw);changed.tiles[10].blocked=!changed.tiles[10].blocked;
 assert.notEqual(E.S.prepareGeometry(changed).key,first.key);
 assert.equal(E.S.prepareGeometry(cached).reused,true);
});
test('500-turn blocks checkpoint at their own boundaries and resume with unchanged biology',()=>{
 let w=E.create(config);assert.equal(w.blockEnd,500);
 w.turn=499;w=E.step(w);assert.equal(w.turn,500);assert.equal(w.stopReason,'checkpoint');assert.equal(w.checkpoints.at(-1).turn,500);
 w=E.step(w);assert.equal(w.turn,501);assert.equal(w.blockEnd,1000);assert.equal(w.stopReason,null);
 assert.throws(()=>E.create({...config,blockTurns:1}),/観測区間/);
 assert.equal(E.create({...config,blockTurns:undefined}).blockEnd,1000,'legacy comparison remains explicit');
});
test('Worker does not calculate beyond its requested terminal turn',async()=>{
 const worker=thread();try{
  const world=E.create(config);world.turn=499;
  worker.post({type:'init',epoch:1,world});assert.equal((await worker.next()).type,'ready');
  worker.post({type:'compute',epoch:1,count:6,limit:500});const packet=await worker.next();assert.equal(packet.turn,500);assert.equal((await worker.next()).type,'idle');
  worker.post({type:'compute',epoch:1,count:6,limit:500});assert.equal((await worker.next()).type,'idle');
 }finally{await worker.close();}
});
