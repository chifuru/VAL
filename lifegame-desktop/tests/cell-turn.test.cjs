'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),util=require('node:util'),{Worker}=require('node:worker_threads'),path=require('node:path');
const F=require('./cell-archive-fixture.cjs'),M=require('../src/ecology/observation-model.js'),T=require('../src/ecology/transport.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js');
const E=require('../design/advantage-switches/model.cjs').model({producer:false,waterbug:false,hyperparasite:false}),G=M.model(F.config.advantageSettings),data=x=>JSON.parse(JSON.stringify(x)),equal=(a,b,label)=>assert(util.isDeepStrictEqual(data(a),data(b)),label);
require('../src/ecology/replay-version.js');const signature=globalThis.EcoReplayVersion;
function kernel(previous){const w=structuredClone(previous),S=E.S;w.turn++;S.Ryouki.begin(w);S.Colony.begin(w);S.FungalColony.begin(w);S.ConsumerGroup.begin(w);S.LargePlant.begin(w);const c=E.context(w);for(const o of w.organisms)if(S.Ryouki.is(o)&&o.ryouki.last.transition)S.record(c,o,'phase-variation',{state:o.ryouki.mutated?'mutated':'normal',transition:o.ryouki.last.transition});E.prepare(w,c);E.B.choose(w,c,'move');E.B.move(w,c);E.B.choose(w,c,'effect');E.B.combat(w,c);E.B.care(w,c);E.P.clear(w,c);E.cellLife(w,c);E.finish(w,c);return w;}
let cached;
function states(){if(!cached){const rows=[G.create(F.config)];for(let t=0;t<3;t++)rows.push(G.step(rows.at(-1)));cached=rows;}return structuredClone(cached);}
function thread(){const w=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];w.on('message',m=>waiters.length?waiters.shift()(m):messages.push(m));return {post:m=>w.postMessage(m),next:()=>messages.length?Promise.resolve(messages.shift()):new Promise(r=>waiters.push(r)),close:()=>w.terminate()};}

test('favorable waterbug founders assign their capped body to cohorts exactly once',()=>{
 const flags={version:'advantage-switches/1',producer:false,waterbug:true,hyperparasite:true},e=M.model(flags),w=e.create({...F.config,advantageSettings:flags,consumerGroupSettings:{version:'consumer-group-parameters/4'}});
 const groups=w.organisms.filter(o=>o.cellLife?.kind==='group');assert(groups.some(o=>o.species==='waterbug'));for(const o of groups){assert.equal(e.S.round(o.consumerGroup.cohorts.reduce((n,c)=>n+c.B,0)),o.B);assert(o.B<=2*e.S.ConsumerGroup.count(o));assert.equal(o.cellMatter.bodyM,e.S.round(.02*o.B));}assert.deepEqual(e.invariants(w),[]);assert.deepEqual(e.invariants(e.step(w)),[]);
});

test('three stages preserve kernel order, original state and source/generated/atomic outcomes with actual decisions',()=>{
 let w=E.create(F.config),generated=G.create(F.config);
 for(let turn=1;turn<=3;turn++){
  const original=JSON.stringify(w),job=E.beginTurn(w);
  for(let phase=1;phase<=3;phase++){
   const result=job.advance();assert.equal(result.phase,phase);assert.equal(result.done,phase===3);assert.equal(JSON.stringify(w),original);
   const preview=job.preview();preview.cellState.water[0]=123;preview.cellProfiles.profiles[0].soilQuality=123;assert.equal(JSON.stringify(w),original);
   if(phase<3)assert.equal(result.world,null);
   else{equal(result.world,kernel(w),'accepted cell kernel');equal(result.world,E.step(w),'atomic turn');generated=G.step(generated);equal(result.world,generated,'generated execution');assert.deepEqual(E.invariants(result.world),[]);assert.equal(job.advance().world,result.world);assert.strictEqual(result.world.cellProfiles,w.cellProfiles);w=result.world;}
  }
 }
 assert.equal(w.turn,3);assert(w.events.some(e=>['move','feed','attack','care'].includes(e.type)));
});
test('cancelling either partial phase discards material and mutation changes and permits an exact restart',()=>{
 const w=states()[1],before=JSON.stringify(w);assert(w.cellState.nextMaterial.length>0);
 for(const phases of [1,2]){const job=G.beginTurn(w);for(let i=0;i<phases;i++)job.advance();job.cancel();assert.throws(()=>job.advance(),/TURN_DISCARDED/);assert.throws(()=>job.preview(),/TURN_DISCARDED/);assert.equal(JSON.stringify(w),before);}
 equal(G.step(w),states()[2],'restart after discard');
});
test('unresolved water and invalid cell stocks fail privately without guessed values or a mutated committed world',()=>{
 const w=G.create({...F.config,cellSettings:{}}),before=JSON.stringify(w),job=G.beginTurn(w);job.advance();assert.throws(()=>job.advance(),/CELL_AQUATIC_PROFILE_UNRESOLVED/);assert.throws(()=>job.advance(),/TURN_DISCARDED/);assert.equal(JSON.stringify(w),before);
 const bad=states()[0];bad.cellState.water[0]=-1;const snapshot=JSON.stringify(bad);assert.throws(()=>G.beginTurn(bad),/CELL_STATE_INVALID/);assert.equal(JSON.stringify(bad),snapshot);
 for(const change of [w=>delete w.organisms[0].cellMatter,w=>delete w.organisms.find(o=>o.cellLife).cellLife,w=>w.config.cellModel='future']){const bad=states()[0];change(bad);const before=JSON.stringify(bad);assert.throws(()=>G.beginTurn(bad),/CELL_MODEL_(?:INVALID|INCOMPLETE)/);assert.equal(JSON.stringify(bad),before);}
});
test('Worker batch, streamed phases and final-only frames reconstruct the same three committed turns',{timeout:25000},async()=>{
 const expected=states();
 for(const mode of ['batch','stream','final']){
  const worker=thread();try{
   let w=structuredClone(expected[0]);worker.post({type:'init',epoch:21,world:w,stream:mode==='stream',finalOnly:mode==='final'});assert.equal((await worker.next()).type,'ready');worker.post({type:'compute',epoch:21,count:3,limit:3});
   for(let turn=1;turn<=3;turn++){
    const patches=[];if(mode==='stream')for(let phase=0;phase<3;phase++){const d=await worker.next();assert.equal(d.type,'phase');assert.equal(d.phase,phase);patches.push(d.patch);}
    const d=await worker.next();assert.equal(d.type,'turn');assert.equal(d.turn,turn);if(mode!=='stream'){assert.equal(d.patches.length,mode==='final'?1:3);patches.push(...d.patches);}for(const p of patches){assert.equal(p.meta.cellProfiles,undefined);w=T.apply(w,data(p));}equal(w,expected[turn],mode+' T'+turn);assert.deepEqual(G.invariants(w),[]);
   }
   assert.equal((await worker.next()).type,'idle');worker.post({type:'compute',epoch:21,count:1,limit:3});assert.equal((await worker.next()).type,'idle');
  }finally{await worker.close();}
 }
});
test('normal decision turns preserve full observations through archive and replay from resolved conditions',()=>{
 const all=states(),w=all.at(-1),h=O.create(w.config,signature,{species:G.S.activeSpecies(w)});for(const current of all)h.append(current);
 let bytes=null;const archive=A.create({getItem:()=>bytes,setItem:(_,x)=>{bytes=x;}},G,signature),parent=archive.capture(w,'user',h.snapshot());archive.save(parent);const entry=archive.replay(parent.id);let again=G.create(entry.config);for(let t=0;t<entry.turn;t++)again=G.step(again);
 assert.equal(G.fingerprint(again),parent.finalFingerprint);equal(again.cellState,parent.final.state.cell.state,'replayed cell matter');assert.equal(archive.list().length,1);equal(O.restore(data(parent.observation)).snapshot(),h.snapshot(),'all original rows');
});
test('the checkpoint boundary stops at 500 and continues by one turn without simulating 500 turns',()=>{
 let w=G.create({...F.config,blockTurns:500});w.turn=499;w=G.step(w);assert.equal(w.turn,500);assert.equal(w.stopReason,'checkpoint');assert.deepEqual(G.invariants(w),[]);w=G.step(w);assert.equal(w.turn,501);assert.equal(w.blockEnd,1000);assert.equal(w.stopReason,null);assert.deepEqual(G.invariants(w),[]);
});
