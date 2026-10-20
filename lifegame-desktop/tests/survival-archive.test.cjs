'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/ecology/observation-model.js').model(),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js');
require('../src/ecology/replay-version.js');
const current=globalThis.EcoReplayVersion,previous='a7cac02a9d7382b478919b40c44823ce0d6bb0325b3e551adb1236908c92774d';
const config={seed:'i11/archive',terrainSeed:'i11/archive/map',width:40,height:28,initial:32,lineages:'manual',selected:['solar','ryouki','jelly'],mapId:'river',landscape:'templates',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',populationRegulation:{version:1},producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard'}};
function archive(signature=current){let bytes=null;return A.create({getItem:()=>bytes,setItem:(_,v)=>{bytes=v;}},E,signature);}
let cached;
function fixture(){
 if(!cached){let w=E.create({...config,balanceModel:'survival/1'});const h=O.create(w.config,current,{species:E.S.activeSpecies(w)});h.append(w);for(let t=0;t<3;t++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);h.append(w);}cached={w,observations:h.snapshot()};}
 return structuredClone(cached);
}
test('new survival rules and all committed observations remain exact through archive and replay',()=>{
 const {w,observations}=fixture(),a=archive(),r=a.capture(w,'user',observations);a.save(r);const replay=a.replay(r.id);
 assert.equal(replay.config.balanceModel,'survival/1');assert.equal(r.final.state.models.balanceModel,'survival/1');assert.deepEqual(a.get(r.id).observation,observations);
 let again=E.create(replay.config);const h=O.create(again.config,current,{species:E.S.activeSpecies(again)});h.append(again);for(let t=0;t<r.turn;t++){again=E.step(again);h.append(again);}assert.equal(E.fingerprint(again),r.finalFingerprint);assert.deepEqual(h.snapshot(),observations);
});
test('previous relationship records replay without silently enabling new survival rules',()=>{
 const w=E.create(config),h=O.create(w.config,previous,{species:E.S.activeSpecies(w)});h.append(w);const old=archive(previous).capture(w,'legacy',h.snapshot()),replay=archive().replayRecord(old);
 assert.equal(replay.signature,previous);assert.equal(replay.config.balanceModel,undefined);assert.equal(E.fingerprint(E.create(replay.config)),old.finalFingerprint);
});
test('new survival records cannot use the former biological signature as an equivalent model',()=>{
 const {w,observations}=fixture(),r=archive().capture(w,'user',observations);
 assert.throws(()=>archive(previous).replayRecord(r),/計算|署名|異な|再生/);
});
test('unknown survival model versions fail world creation capture and every archive entrance',()=>{
 assert.throws(()=>E.create({...config,balanceModel:'survival/999'}),/生存調整/);
 const {w,observations}=fixture(),a=archive(),r=a.capture(w,'user',observations);w.config.balanceModel='survival/999';assert.throws(()=>a.capture(w,'invalid',observations),/生存調整/);
 r.config.balanceModel='survival/999';for(const run of [()=>a.validateFullRecord(r),()=>a.replayRecord(r),()=>a.save(r)])assert.throws(run,/生存調整/);
});
