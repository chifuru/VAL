'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{Worker}=require('node:worker_threads'),path=require('node:path'),
 F=require('./cell-archive-fixture.cjs'),G=require('../src/ecology/observation-model.js').model(F.config.advantageSettings),S=G.S,
 T=require('../src/ecology/transport.js'),O=require('../src/ecology/current-observations.js'),A=require('../src/ecology/archive.js'),C=require('../src/ecology/current-archive.js');
require('../src/ecology/replay-version.js');const signature=globalThis.EcoReplayVersion,data=x=>JSON.parse(JSON.stringify(x)),config={...F.config,currentStateModel:'current-state/1'};
let cached;function states(){if(!cached){cached=[G.create(config)];for(let t=0;t<3;t++)cached.push(G.step(cached.at(-1)));}return structuredClone(cached);}
function history(all){const h=O.create(all[0].config,{species:S.activeSpecies(all[0]),signature});for(const w of all)h.append(w);return h;}
function storage(){let bytes=null,writes=0;return {getItem:()=>bytes,setItem:(_,v)=>{bytes=v;writes++;},get bytes(){return bytes;},get writes(){return writes;}};}
function record(){const all=states(),h=history(all),store=storage(),archive=A.create(store,G,signature);return {all,h,store,archive,r:archive.capture(all.at(-1),'user',h.snapshot())};}
function resign(r){delete r.integrity;r.integrity=S.sha256(S.stable(r));return r;}
function firstDiff(a,b,p='world'){if(Object.is(a,b))return null;if(!a||!b||typeof a!=='object'||typeof b!=='object')return {path:p,actual:a,expected:b};for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const d=firstDiff(a[k],b[k],p+'.'+k);if(d)return d;}return null;}
function thread(){const w=new Worker(path.join(__dirname,'compute-harness.cjs')),messages=[],waiters=[];w.on('message',m=>waiters.length?waiters.shift()(m):messages.push(m));return {post:m=>w.postMessage(m),next:()=>messages.length?Promise.resolve(messages.shift()):new Promise(r=>waiters.push(r)),close:()=>w.terminate()};}

test('same-cell current information uses distinct semantic keys and survives updates, deletion and reorder',()=>{
 const w=states()[0],base={cell:18,scope:'all',roles:[],sourceSpecies:'solar',peerSpecies:null,evidence:'normal',sign:'positive',expires:10,amount:1,strength:Array(9).fill(1),meaning:'feeding'};
 w.informationField=[base,{...base,meaning:'damage',sign:'negative'}];const original=data(w),encode=T.encoder(w),next=structuredClone(w);next.turn++;next.informationField.reverse();next.informationField[0].amount=2;
 let viewed=T.apply(w,data(encode(next,true)));assert.deepEqual(data(viewed),data(next));assert.equal(viewed.informationField.length,2);assert.deepEqual(data(w),original);
 const after=structuredClone(next);after.turn++;after.informationField.shift();viewed=T.apply(viewed,data(encode(after,true)));assert.deepEqual(data(viewed),data(after));
});
test('large current vectors cross only changed indices and immutable map/config are not sent again',()=>{
 const w=states()[0],next=structuredClone(w),encode=T.encoder(w);next.turn++;next.cellState.water[18]-=.1;next.cellState.decayLoad[19]=.2;
 const patch=data(encode(next,true));assert.deepEqual(patch.current.cellState.vectors.water.changes,[[18,next.cellState.water[18]]]);assert.deepEqual(patch.current.cellState.vectors.decayLoad.changes,[[19,.2]]);
 assert.equal(patch.meta.cellState,undefined);assert.equal(patch.meta.currentActivity,undefined);assert.equal(patch.meta.currentInfections,undefined);assert.equal(patch.meta.cellProfiles,undefined);assert.equal(patch.meta.config,undefined);assert.equal(patch.meta.tiles,undefined);
 const result=T.apply(w,patch);assert.deepEqual(data(result),data(next));assert.strictEqual(result.config,w.config);assert.strictEqual(result.cellProfiles,w.cellProfiles);
});
test('current nested state changes and removed keys reconstruct without changing the base or earlier packets',()=>{
 const w=states()[0],encode=T.encoder(w),a=structuredClone(w);a.turn++;a.currentInfections.nextId++;a.currentActivity.marker='a';a.cellState.soil.waiting.push({cell:18,M:.1});const first=data(encode(a,true)),saved=JSON.stringify(first);
 const b=structuredClone(a);b.turn++;delete b.currentActivity.marker;b.cellState.soil.waiting[0].M=.2;const second=data(encode(b,true));let result=T.apply(w,first);result=T.apply(result,second);assert.deepEqual(data(result),data(b));assert.equal(JSON.stringify(first),saved);assert.equal(w.cellState.soil.waiting.length,0);
});
test('foreign current object names, duplicate vector indices and wrong vector lengths are rejected',()=>{
 const w=states()[0],encode=T.encoder(w),a=structuredClone(w);a.turn++;a.cellState.water[18]-=.1;const p=data(encode(a,true)),bad=data(p);bad.current.foreign={values:{},vectors:{},removed:[]};assert.throws(()=>T.apply(w,bad),/WIRE_CURRENT_OBJECT/);
 const dup=data(p);dup.current.cellState.vectors.water.changes.push(dup.current.cellState.vectors.water.changes[0]);assert.throws(()=>T.apply(w,dup),/WIRE_CURRENT_INDEX/);
 const wrong=data(p);wrong.current.cellState.vectors.water.length++;assert.throws(()=>T.apply(w,wrong),/WIRE_CURRENT_VECTOR/);
});
test('actual Worker batch, streamed phases and final-only current frames reconstruct two committed turns',{timeout:30000},async()=>{
 const expected=states();for(const mode of ['batch','stream','final']){const worker=thread();try{let w=structuredClone(expected[0]);worker.post({type:'init',epoch:14,world:w,stream:mode==='stream',finalOnly:mode==='final'});assert.equal((await worker.next()).type,'ready');worker.post({type:'compute',epoch:14,count:2,limit:2});
  for(let turn=1;turn<=2;turn++){const patches=[];if(mode==='stream')for(let phase=0;phase<3;phase++){const d=await worker.next();assert.equal(d.type,'phase');assert.equal(d.phase,phase);patches.push(d.patch);}const d=await worker.next();assert.equal(d.type,'turn');assert.equal(d.turn,turn);if(mode!=='stream')patches.push(...d.patches);for(const p of patches)w=T.apply(w,data(p));assert.equal(JSON.stringify(firstDiff(data(w),data(expected[turn]))),"null",mode+' T'+turn);assert.deepEqual(G.invariants(w),[]);}
  assert.equal((await worker.next()).type,'idle');
 }finally{await worker.close();}}
});
test('discarding partial computation keeps current clocks and allows exact resume from the committed world',()=>{
 const w=states()[1],before=JSON.stringify(w);for(const count of [1,2]){const job=G.beginTurn(w);for(let n=0;n<count;n++)job.advance();job.cancel();assert.equal(JSON.stringify(w),before);assert.throws(()=>job.advance(),/TURN_DISCARDED/);}assert.deepEqual(data(G.step(w)),data(states()[2]));const partial=G.beginTurn(w);partial.advance();const archive=A.create(storage(),G,signature);assert.throws(()=>archive.capture(partial.display(),'partial',history(states().slice(0,2)).snapshot()));partial.cancel();assert.equal(JSON.stringify(w),before);
});
test('schema4 saves native full-turn facts and final current state, without historical world snapshots',()=>{
 const {all,h,r,archive,store}=record(),w=all.at(-1),before=JSON.stringify(w);assert.equal(r.schema,4);assert.equal(r.final.state.definition,C.VERSION);assert.equal(r.observation.rows.length,4);assert.equal(r.final.state.examples.organisms.retained,4);assert.equal(r.final.state.examples.organisms.total,w.stats.agents);
 assert(!Object.hasOwn(r,'worlds'));assert(!Object.hasOwn(r.final,'contactPairs'));assert(!Object.hasOwn(r.final.state,'demography'));assert.deepEqual(r.final.demography,h.generations);assert.equal(archive.save(r),true);assert.equal(archive.save(r),false);assert.deepEqual(archive.get(r.id),data(r));assert.equal(JSON.stringify(w),before);assert.equal(store.writes,1);
});
test('reading and replay request never write, and resolved initial conditions replay the saved fingerprint',()=>{
 const {r,archive,store}=record();archive.save(r);const bytes=store.bytes;const found=archive.get(r.id),entry=archive.replay(r.id);let again=G.create(entry.config);assert(C.matchInitial(entry,again));for(let t=0;t<entry.turn;t++)again=G.step(again);
 assert.equal(G.fingerprint(again),found.finalFingerprint);assert.equal(store.bytes,bytes);assert.equal(store.writes,1);assert.equal(archive.list().length,1);const restored=O.restore(found.observation);assert.deepEqual(restored.snapshot(),found.observation);assert.throws(()=>restored.append(again),/READ_ONLY/);
});
test('saving a replay creates a separate record only with explicit replay-new intent',()=>{
 const {all,h,r,archive,store}=record();archive.save(r);const child=archive.capture(all.at(-1),'user',h.snapshot(),r.id);assert.notEqual(child.id,r.id);assert.equal(archive.save(child),false);assert.equal(store.writes,1);assert.equal(archive.save(child,'replay-new'),true);assert.equal(archive.list().length,2);assert.equal(archive.get(child.id).originRecordId,r.id);
});
test('native records remain readable with a foreign signature while recalculation is refused',()=>{
 const {r}=record();r.signature='unavailable-current-engine';r.observation.metadata.signature=r.signature;resign(r);const store=storage(),archive=A.create(store,G,signature);assert(archive.save(r));assert.equal(archive.get(r.id).signature,r.signature);const bytes=store.bytes;assert.throws(()=>archive.replay(r.id),/計算版が異なる/);assert.equal(store.bytes,bytes);
});
test('record integrity, missing turns, invalid current clocks and genotype references are rejected',()=>{
 const {r,archive}=record();const changes=[x=>x.final.counts.solar++,x=>x.observation.rows.pop(),x=>x.final.state.cell.state.water[18]=-1,x=>x.final.state.activity.at=x.turn+1,x=>x.final.state.infections.primary.push({id:'bad',cell:18,E:.1,amount:1,genotype:'missing',kind:'contact',expires:20}),x=>x.final.state.examples.organisms.items[0].uptake.dose=[1],x=>x.final.state.information.ledger.generatedAmount++];
 for(const change of changes){const bad=data(r);change(bad);assert.throws(()=>archive.validateFullRecord(bad));resign(bad);assert.throws(()=>archive.validateFullRecord(bad));}
});
test('new native records do not pass old cell-archive guards and old snapshots are not silently converted',()=>{
 const {all,r,archive}=record();assert.throws(()=>require('../src/ecology/cell-archive.js').validate(r,G,null),/CURRENT_STATE_ARCHIVE_UNCONNECTED/);assert.throws(()=>archive.capture(all.at(-1),'user',{schema:'observation-snapshot/1'}),/CURRENT_OBSERVATION_SNAPSHOT/);const bad=data(r);delete bad.config.currentStateModel;resign(bad);assert.throws(()=>archive.validateFullRecord(bad));
});
