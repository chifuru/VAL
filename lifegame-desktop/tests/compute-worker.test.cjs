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

test('streaming sends each phase once and reconstructs the same table-world final state',async()=>{
 const worker=thread();try{
  const world=E.create({...config,randomModel:'table/1'});worker.post({type:'init',epoch:30,world,stream:true});assert.equal((await worker.next()).type,'ready');worker.post({type:'compute',epoch:30,count:1,limit:500});let view=world;
  for(let phase=0;phase<3;phase++){const d=await worker.next();assert.equal(d.type,'phase');assert.equal(d.phase,phase);view=T.apply(view,d.patch);}
  const result=await worker.next();assert.equal(result.type,'turn');assert.equal(result.patches,null);assert.deepEqual(view,E.step(world));assert.equal((await worker.next()).type,'idle');
 }finally{await worker.close();}
});

test('Worker caps an oversized batch at six continuous turns in legacy and stream modes',{timeout:30000},async()=>{
 for(const stream of [false,true]){
  const worker=thread();try{
   let world=E.create({...config,randomModel:'table/1'});worker.post({type:'init',epoch:40,world,stream});assert.equal((await worker.next()).type,'ready');
   worker.post({type:'compute',epoch:40,count:99,limit:500});
   for(let turn=1;turn<=6;turn++){
    const patches=[];
    if(stream)for(let phase=0;phase<3;phase++){
     const d=await worker.next();assert.equal(d.type,'phase');assert.equal(d.turn,turn);assert.equal(d.phase,phase);assert.equal(d.patch.meta.turn,turn);patches.push(d.patch);
    }
    const packet=await worker.next();assert.equal(packet.type,'turn');assert.equal(packet.turn,turn);assert.equal(packet.epoch,40);
    if(stream)assert.equal(packet.patches,null);else {assert.equal(packet.patches.length,3);patches.push(...packet.patches);}
    let view=world;for(const patch of patches){assert.equal(patch.meta.turn,turn);view=T.apply(view,patch);}
    assert.deepEqual(view,E.step(world));world=view;
   }
   assert.equal((await worker.next()).type,'idle');
  }finally{await worker.close();}
 }
});

test('invalid batch counts do not advance the Worker world',{timeout:30000},async()=>{
 const worker=thread();try{
  const world=E.create(config);worker.post({type:'init',epoch:50,world});assert.equal((await worker.next()).type,'ready');
  for(const count of [0,-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,'2']){
   worker.post({type:'compute',epoch:50,count,limit:500});const error=await worker.next();assert.equal(error.type,'error');assert.equal(error.epoch,50);assert.match(error.message,/件数/);
  }
  worker.post({type:'compute',epoch:50,count:1,limit:500});const packet=await worker.next();assert.equal(packet.type,'turn');assert.equal(packet.turn,1);
  let view=world;for(const patch of packet.patches)view=T.apply(view,patch);assert.deepEqual(view,E.step(world));assert.equal((await worker.next()).type,'idle');
 }finally{await worker.close();}
});

test('a checkpoint ends the batch and a later request continues a longer replay',{timeout:30000},async()=>{
 const worker=thread();try{
  let world=E.create(config);world.turn=499;worker.post({type:'init',epoch:60,world});assert.equal((await worker.next()).type,'ready');
  worker.post({type:'compute',epoch:60,count:3,limit:502});const checkpoint=await worker.next();assert.equal(checkpoint.type,'turn');assert.equal(checkpoint.turn,500);
  for(const patch of checkpoint.patches)world=T.apply(world,patch);assert.equal(world.stopReason,'checkpoint');assert.equal((await worker.next()).type,'idle');
  worker.post({type:'compute',epoch:60,count:3,limit:502});
  for(let turn=501;turn<=502;turn++){
   const packet=await worker.next();assert.equal(packet.type,'turn');assert.equal(packet.turn,turn);let view=world;
   for(const patch of packet.patches)view=T.apply(view,patch);assert.deepEqual(view,E.step(world));world=view;
  }
  assert.equal((await worker.next()).type,'idle');assert.equal(world.blockEnd,1000);
 }finally{await worker.close();}
});

test('reinit after a partial preview starts from the supplied committed world and ignores old requests',{timeout:30000},async()=>{
 const worker=thread();try{
  const committed=E.create({...config,randomModel:'table/1'}),fingerprint=E.fingerprint(committed);
  worker.post({type:'init',epoch:70,world:committed,stream:true});assert.equal((await worker.next()).type,'ready');worker.post({type:'compute',epoch:70,count:3,limit:500});
  const preview=await worker.next();assert.equal(preview.type,'phase');assert.equal(preview.turn,1);assert.equal(preview.phase,0);
  worker.post({type:'init',epoch:71,world:committed,stream:true});
  let ready;
  for(let count=0;count<14;count++){
   const d=await worker.next();if(d.type==='ready'&&d.epoch===71){ready=d;break;}assert.equal(d.epoch,70);
  }
  assert(ready);assert.equal(ready.cache.reused,true);
  worker.post({type:'compute',epoch:70,count:6,limit:500});worker.post({type:'compute',epoch:71,count:1,limit:500});
  let view=committed;for(let phase=0;phase<3;phase++){
   const d=await worker.next();assert.equal(d.epoch,71);assert.equal(d.type,'phase');assert.equal(d.turn,1);assert.equal(d.phase,phase);view=T.apply(view,d.patch);
  }
  const packet=await worker.next();assert.equal(packet.type,'turn');assert.equal(packet.epoch,71);assert.equal(packet.turn,1);assert.deepEqual(view,E.step(committed));
  assert.equal((await worker.next()).type,'idle');assert.equal(E.fingerprint(committed),fingerprint);
 }finally{await worker.close();}
});
