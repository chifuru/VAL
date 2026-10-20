'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{Worker}=require('node:worker_threads');
const M=require('../src/ecology/observation-model.js'),T=require('../src/ecology/transport.js');
const config={seed:'i08/worker',terrainSeed:'i08/map',width:40,height:28,initial:48,lineages:'manual',selected:['ryouki','solar','whale'],landscape:'templates',mapId:'river',
 ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',blockTurns:500,
 producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',
 generationModel:'diverse/1',generationSettings:{mode:'auto',profile:'high-production',locks:['initial']},founderCounts:{version:1,species:{forestcrown:2,starcrown:2,freshwaterlight:2},parasites:{hyperparasite:0}}};
test('resolved initial conditions survive Worker phases, cancellation and restart without another generation draw',{timeout:30000},async()=>{
 const E=M.model({producer:false,waterbug:false,hyperparasite:false}),worker=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];
 worker.on('message',m=>waiters.length?waiters.shift()(m):messages.push(m));
 const next=()=>messages.length?Promise.resolve(messages.shift()):new Promise(resolve=>waiters.push(resolve));
 try{
  let world=E.create(config);const resolved=structuredClone(world.config.generationResolved);
  const cancelled=E.beginTurn(world);cancelled.advance();cancelled.cancel();assert.deepEqual(world.config.generationResolved,resolved);assert.equal(world.turn,0);
  worker.postMessage({type:'init',epoch:1,world,stream:true});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:1,count:3,limit:500});
  for(let turn=1;turn<=3;turn++){
   let view=world;for(let phase=0;phase<3;phase++){const packet=await next();assert.equal(packet.type,'phase',packet.message);assert.equal(packet.phase,phase);view=T.apply(view,packet.patch);}
   const done=await next();assert.equal(done.type,'turn');assert.equal(done.turn,turn);assert.deepEqual(view,E.step(world));assert.deepEqual(E.invariants(view),[]);assert.deepEqual(view.config.generationResolved,resolved);world=view;
  }
  assert.equal((await next()).type,'idle');worker.postMessage({type:'init',epoch:2,world,stream:false});assert.equal((await next()).type,'ready');worker.postMessage({type:'compute',epoch:2,count:1,limit:500});
  const done=await next();assert.equal(done.type,'turn');let view=world;for(const patch of done.patches)view=T.apply(view,patch);assert.deepEqual(view,E.step(world));assert.deepEqual(view.config.generationResolved,resolved);assert.equal((await next()).type,'idle');
 }finally{await worker.terminate();}
});
