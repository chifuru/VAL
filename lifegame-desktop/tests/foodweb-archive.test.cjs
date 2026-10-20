'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const sourceMode=process.env.LIFEGAME_ARCHIVE_SOURCE_MODEL==='1';
const E=sourceMode?require('../design/advantage-switches/model.cjs').model():require('../src/ecology/observation-model.js').model(),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js');
require('../src/ecology/replay-version.js');
const previous='95b7405d3e4513acabf2194ed0ed1b9eb79c9ffd566bcc9e0b5f1edc3ca1b889',relationship='a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d',foodwebSignature='ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97',current=foodwebSignature;
const config={seed:'i11b/archive',terrainSeed:'i11b/archive/map',width:40,height:28,initial:32,lineages:'manual',selected:['solar','ryouki','jelly'],mapId:'river',landscape:'templates',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',populationRegulation:{version:1},producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard'}};
const sha=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),cache=new Map();
function storage(){let bytes=null;return {getItem:()=>bytes,setItem:(_key,value)=>{bytes=value;}};}
function archive(signature=current,store=storage()){return A.create(store,E,signature);}
function fixture(balanceModel='survival/2',signature=current){
 const key=String(balanceModel)+'|'+signature;if(!cache.has(key)){let w=E.create({...config,...(balanceModel==='unversioned'?{}:{balanceModel})});const h=O.create(w.config,signature,{species:E.S.activeSpecies(w)});h.append(w);for(let t=0;t<3;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}cache.set(key,{w,observations:h.snapshot()});}return structuredClone(cache.get(key));
}
function replayWorld(record){let w=E.create(record.config);const h=O.create(w.config,record.signature,{species:E.S.activeSpecies(w)});h.append(w);for(let t=0;t<record.turn;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}return {w,observations:h.snapshot()};}
test('foodweb records have their own completed model signature and keep all resolved rules and turn observations',()=>{
 assert.match(current,/^[0-9a-f]{64}$/);assert.equal(fs.readFileSync(require.resolve('../src/ecology/archive.js'),'utf8').match(/const foodwebBuildSignature=['"]([^'"]+)['"]/)[1],foodwebSignature);assert.notEqual(current,previous);
 const {w,observations}=fixture(),a=archive(),record=a.capture(w,'user',observations);assert.equal(record.schema,3);assert.equal(record.signature,current);assert.equal(record.config.balanceModel,'survival/2');assert.equal(record.final.state.models.balanceModel,'survival/2');assert.deepEqual(record.config,w.config);assert.deepEqual(record.observation.rows.map(r=>r.turn),[0,1,2,3]);assert.deepEqual(record.observation,observations);
 assert(a.save(record));assert.deepEqual(a.get(record.id),record);const replay=a.replay(record.id),again=replayWorld(replay);assert.equal(E.fingerprint(again.w),record.finalFingerprint);assert.deepEqual(again.observations,observations);
});
test('explicitly saving a foodweb replay creates a new ID and preserves its original record and all-turn data',()=>{
 const {w,observations}=fixture(),a=archive(),parent=a.capture(w,'user',observations);assert(a.save(parent));const replay=a.replay(parent.id),again=replayWorld(replay),child=a.capture(again.w,'explicit-replay',again.observations,parent.id);child.replayMatch=true;
 assert.notEqual(child.id,parent.id);assert.equal(child.originRecordId,parent.id);assert.equal(child.finalFingerprint,parent.finalFingerprint);assert.equal(a.save(child),false);assert.equal(a.save(child,'replay-new'),true);assert.equal(a.save(child,'replay-new'),false);assert.deepEqual(a.get(parent.id),parent);assert.deepEqual(a.get(child.id).observation,parent.observation);assert.equal(a.list().length,2);
});
test('survival/1 and unversioned old records retain baseline1b248aa fingerprints and exact original turn observations',()=>{
 // Goldens measured from the unmodified1b248aa generated product model, three turns.
 for(const item of [
  {model:'survival/1',signature:previous,world:'fd42c41288a9b31fe012c815ee9439fe4060a930ac565971b10ae77b6a01d300',observations:'4783089718403b058709d9db8a87595421cdec7839b5d62f8dae61ecc7caa51c'},
  {model:'unversioned',signature:relationship,world:'b5a255b9d0195dd579c8afb40196492ad5a562217daee37cf82c0ace9eeea326',observations:'2754158350043a9a730cfee8833d996960fc41eaddbbae1ab8a24e29bc0e2028'}
 ]){const {w,observations}=fixture(item.model,item.signature);assert.equal(E.fingerprint(w),item.world);assert.equal(sha(observations),item.observations);const old=archive(item.signature).capture(w,'legacy',observations),newArchive=archive(),replay=newArchive.replayRecord(old);assert.equal(replay.signature,item.signature);assert.equal(replay.config.balanceModel,item.model==='unversioned'?undefined:'survival/1');const again=replayWorld(replay);assert.equal(E.fingerprint(again.w),item.world);assert.deepEqual(again.observations,observations);}
});
test('canonical compatibility allows new-build old rules but never treats foodweb rules as the former signature',()=>{
 for(const model of ['survival/1','unversioned']){const {w,observations}=fixture(model,current),record=archive().capture(w,'old-rules-new-build',observations);assert.equal(archive(previous).replayRecord(record).id,record.id);}
 const {w,observations}=fixture(),record=archive().capture(w,'user',observations);for(const signature of [previous,relationship])assert.throws(()=>archive(signature).replayRecord(record),/計算|署名|異な|再生/);
});
test('changing a known model version or removing one of its saved copies rejects replay and cannot overwrite good records',()=>{
 const {w,observations}=fixture(),store=storage(),a=archive(current,store),record=a.capture(w,'user',observations);a.save(record);const original=store.getItem();
 for(const change of [r=>r.config.balanceModel='survival/1',r=>delete r.config.balanceModel,r=>r.observation.metadata.config.balanceModel='survival/1',r=>r.final.state.models.balanceModel='survival/1',r=>delete r.final.state.models.balanceModel,r=>r.observation.rows.splice(1,1),r=>r.observation.metadata.version=previous]){const bad=structuredClone(record);change(bad);for(const run of [()=>a.validateFullRecord(bad),()=>a.replayRecord(bad),()=>a.save(bad)])assert.throws(run);assert.equal(store.getItem(),original);}
});
test('unknown foodweb versions fail creation capture every full-record entrance and stored read without rewriting bytes',()=>{
 assert.throws(()=>E.create({...config,balanceModel:'survival/999'}),/生存調整/);const {w,observations}=fixture(),store=storage(),a=archive(current,store),record=a.capture(w,'user',observations);a.save(record);const original=store.getItem();
 const badWorld=structuredClone(w);badWorld.config.balanceModel='survival/999';assert.throws(()=>a.capture(badWorld,'invalid',observations),/生存調整/);
 const bad=structuredClone(record);bad.config.balanceModel='survival/999';for(const run of [()=>a.validateFullRecord(bad),()=>a.replayRecord(bad),()=>a.save(bad)])assert.throws(run,/生存調整/);assert.equal(store.getItem(),original);
 store.setItem('',JSON.stringify([bad]));const corruptBytes=store.getItem();assert.throws(()=>a.get(bad.id),/生存調整/);assert.throws(()=>a.replay(bad.id),/生存調整/);assert.equal(store.getItem(),corruptBytes);
});
