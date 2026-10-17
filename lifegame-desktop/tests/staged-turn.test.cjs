'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../src/ecology/engine.js');
const config={landscape:'templates',ageModel:'life/1',mapId:'river',width:40,height:28,initial:80,lineages:'few'};
test('three private stages preserve atomic outcomes, input state and preview independence',()=>{
 for(const seed of ['stages/one','stages/two']){
  let w=E.create({...config,seed});
  for(let t=0;t<12;t++){
   const before=E.fingerprint(w),job=E.beginTurn(w,{observeId:w.organisms[0].id});
   for(let i=1;i<=3;i++){
    const result=job.advance();assert.equal(result.phase,i);assert.equal(result.done,i===3);
    const preview=job.preview();preview.organisms[0].E=0;preview.resources=[];
    assert.equal(E.fingerprint(w),before,'partial processing never changes the committed input');
    if(i===3){const atomic=E.step(w,{observeId:w.organisms[0].id});assert.deepEqual(result.world,atomic);assert.deepEqual(E.invariants(result.world),[]);w=result.world;}
    else assert.equal(result.world,null,'uncommitted work is not published as a world');
   }
   assert.equal(job.advance().world,w,'completion is idempotent');
  }
 }
});
test('discarding either partial stage prevents all later publication and permits exact restart',()=>{
 const w=E.create({...config,seed:'stages/cancel'}),before=E.fingerprint(w);
 for(const stopAt of [1,2]){
  const job=E.beginTurn(w);for(let n=0;n<stopAt;n++)job.advance();job.cancel();
  assert.throws(()=>job.advance(),/TURN_DISCARDED/);assert.throws(()=>job.preview(),/TURN_DISCARDED/);
  assert.equal(E.fingerprint(w),before);
 }
 assert.deepEqual(E.step(w),E.step(structuredClone(w)));
});
test('observation modes state every initial adjustment and reproduce their resolved conditions',()=>{
 for(const id of ['river-settlement','lake-foodweb']){
  const w=E.create({...config,seed:'mode/'+id,observationMode:id}),p=E.S.observationPreset(id,40,28);
  assert.equal(w.stats.main,160);assert.equal(Object.values(w.stats.counts).every(Number.isInteger),true);
  assert.equal(E.S.D.main.filter(s=>w.stats.counts[s.id]).length,p.selected.length);
  assert.deepEqual(w.config.selected,p.selected);assert.equal(w.config.guarantee,false);
  assert.equal(w.config.modeResolved.initialFoodScale,id==='river-settlement'?1.25:1.5);
  assert.deepEqual(E.invariants(w),[]);assert.equal(E.fingerprint(E.create(w.config)),E.fingerprint(w));
  const basic=E.create({...config,seed:'mode/'+id,observationMode:'custom',mapId:p.mapId,lineages:'manual',selected:p.selected,initial:160});
  assert(w.stats.food>basic.stats.food,'declared initial producer and prey abundance is real');
  const forged=structuredClone(w.config);forged.modeResolved.version=99;
  assert.throws(()=>E.create(forged),/MODE_VERSION_MISMATCH/);
  const altered=structuredClone(w.config);altered.initial-=4;
  assert.throws(()=>E.create(altered),/MODE_INPUT_MISMATCH/);
 }
 assert.throws(()=>E.create({...config,observationMode:'unknown'}),/観察モード/);
 assert.throws(()=>E.create({...config,initialFoodScale:1.5}),/観察モード/);
});

test("unconfigured worlds retain the pre-refactor biological results",()=>{
  for(const row of [{"seed": "staged/golden-1", "fingerprint": "fff1a6a4d6832d67ab6866f082f4b108a200145d05cba8726827665b69158873"}, {"seed": "staged/golden-2", "fingerprint": "9b99933ff2efbb2341b66d99a4ec3e8b321083b6a79f2110877ec1bb02e759fb"}]){let w=E.create({...config,seed:row.seed});for(let n=0;n<20;n++)w=E.step(w);assert.equal(E.fingerprint(w),row.fingerprint);}
});

test('declared production conditions double paid solar input while darkness and capacity remain bounded',()=>{
 const F=require('./ecology-fixtures.cjs');
 function input(scale,light){const w=F.world();w.config.solarScale=scale;w.tiles[F.S.index(w,3,3)].light=light;const o=F.add(w,'grass','producer',3,3,{E:0,B:12}),c=F.ready(w);assert.deepEqual(E.invariants(w),[]);return {record:c.records.get(o.id).light,solar:w.ledger.solar,E:o.E};}
 const a=input(1,.7),b=input(2,.7);assert.equal(b.record,2*a.record);assert.equal(b.solar,2*a.solar);assert.equal(b.E,2*a.E);assert.equal(input(2,0).record,0);
 assert.throws(()=>E.create({...config,solarScale:2}),/観察モード/);
});
