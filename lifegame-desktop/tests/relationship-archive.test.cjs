'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/ecology/engine.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js');
require('../src/ecology/replay-version.js');
const config={seed:'i09-archive',width:40,height:28,initial:32,lineages:'manual',selected:['solar','jelly'],landscape:'templates',mapId:'river',ecologyRevision:'observation/4.1',ageModel:'life/1',randomModel:'table/1',producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',generationModel:'diverse/1',generationSettings:{version:'diverse-generation-parameters/1',mode:'manual',profile:'standard',locks:[]}};
function archive(signature=globalThis.EcoReplayVersion){let raw=null;return A.create({getItem:()=>raw,setItem:(_,v)=>{raw=v;}},E,signature);}
let cache;
function fixture(){
  if(!cache){let w=E.create({...config,relationshipModel:'network/1'});const h=O.create(w.config,globalThis.EcoReplayVersion,{species:E.S.activeSpecies(w)});h.append(w);for(let i=0;i<3;i++){w=E.step(w);h.append(w);}cache={w,observation:h.snapshot()};}
  return structuredClone(cache);
}
test('relationship observations and interval boundary values survive a full schema3 save and exact replay',()=>{
  const {w,observation}=fixture(),a=archive(),r=a.capture(w,'user',observation);a.save(r);
  const body=a.get(r.id),replay=a.replayRecord(body),restored=O.restore(body.observation);
  assert.equal(body.config.relationshipModel,'network/1');assert.equal(body.final.state.models.relationshipModel,'network/1');
  assert.equal(body.observation.definitions.relationship,'relationship-network-observed/1');
  assert.deepEqual(restored.snapshot(),observation);assert.equal(observation.rows.length,4);assert.equal(observation.relationshipIntervals.intervals[0].last,3);
  let again=E.create(replay.config);for(let i=0;i<replay.turn;i++)again=E.step(again);assert.equal(E.fingerprint(again),body.finalFingerprint);
});
test('missing per-turn facts, foreign definitions and inconsistent saved intervals cannot pass body validation',()=>{
  const {w,observation}=fixture(),a=archive(),record=a.capture(w,'user',observation);
  for(const change of [r=>delete r.observation.definitions.relationship,r=>delete r.observation.rows[1].relationship,r=>{r.observation.rows[1].relationship.definition='future';},r=>delete r.observation.relationshipIntervals,r=>{r.observation.relationshipIntervals.intervals[0].observed++;}]){
    const bad=structuredClone(record);change(bad);assert.throws(()=>a.validateFullRecord(bad));
  }
  assert.throws(()=>a.capture(w,'user'),/全期間/);
});
test('prior generation records keep their original signature and missing relationship data',()=>{
  const prior='2789e4711fd87f4824e11ff10762fde9a26880fa322db3a1bfbeb808b094d85d';
  const w=E.create(config),h=O.create(w.config,prior,{species:E.S.activeSpecies(w)});h.append(w);
  const old=archive(prior).capture(w,'old',h.snapshot()),a=archive();
  const r=a.replayRecord(old);assert.equal(r.signature,prior);assert.equal(r.config.relationshipModel,undefined);
  assert.equal(r.observation.definitions.relationship,undefined);assert.equal(r.observation.relationshipIntervals,undefined);
  assert.equal(E.fingerprint(E.create(r.config)),old.finalFingerprint);
});
