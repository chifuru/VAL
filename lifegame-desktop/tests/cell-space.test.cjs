'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/ecology/observation-model.js'),T=require('../src/ecology/transport.js'),A=require('../src/ecology/archive.js'),O=require('../src/ecology/observations.js');
const old=require('../operations/evidence/cell-foundation-v1/old-boundary.json');
require('../src/ecology/replay-version.js');
const E=M.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CellSpace;
const base={seed:'cell-space-boundaries',width:8,height:8,initial:0,
  enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
  founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
  producerModel:'colony/1',ryoukiModel:'ryouki/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}}};
function fixture(){
  const w=E.create(base);w.organisms=[];
  w.tiles=w.tiles.map(t=>({...t,terrain:'plain',blocked:false,light:1,soilM:5}));
  w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();C.initialize(w);return w;
}
function add(w,species,id,{cell=18,mutated=false,state='settled',slot}={}){
  const o=S.organism(w,S.D.byId[species],cell,id);
  if(species==='ryouki')o.ryouki.mutated=mutated;
  C.assign(w,o,{state,slot});w.organisms.push(o);return o;
}

test('version is explicit; resolved fixed profiles and stock ownership survive serialization',()=>{
  const legacy=E.create(base);assert.equal(legacy.cellState,undefined);assert.equal(legacy.config.cellModel,undefined);
  const w=E.create({...base,cellModel:C.VERSION,cellSettings:{soilQuality:.75}});
  assert.equal(w.cellState.version,C.VERSION);assert.deepEqual(C.validate(w),[]);
  const land=w.cellProfiles.profiles.findIndex(p=>p.region==='land');
  assert(land>=0);assert.equal(w.cellProfiles.profiles[land].waterCapacity,22.5);
  assert.equal(C.stock(w,land).water,15);assert.equal(w.cellProfiles.profiles[land].pH,6.5);
  const aquatic=w.cellProfiles.profiles.findIndex(p=>p.region==='water');
  if(aquatic>=0){assert.equal(w.cellState.water[aquatic],null);assert.equal(w.cellProfiles.profiles[aquatic].rain,null);}
  assert.deepEqual(C.validate(JSON.parse(JSON.stringify(w))),[]);
  const mineral=w.tiles[land].soilM,view=C.stock(w,land);view.mineral=999;assert.equal(w.tiles[land].soilM,mineral);
  assert.throws(()=>C.initialize(w),/CELL_STATE_EXISTS/);
  assert.throws(()=>E.create({...base,cellModel:'unknown'}),/マスモデル/);
  assert.throws(()=>E.create({...base,cellSettings:{}}),/マスモデル/);
  assert.throws(()=>E.create({...base,cellModel:C.VERSION,cellSettings:{soilQuality:0}}),/マス環境/);
});

test('independent layers coexist at full capacity; size and diet do not create extra slots',()=>{
  const w=fixture();
  for(const [species,n]of [['grass',6],['forestcrown',3],['grassbug',5],['fungus',6]]){
    for(let i=0;i<n;i++)add(w,species,species+':'+i);
    const candidate=S.organism(w,S.D.byId[species],18,species+':overflow');
    assert.equal(C.room(w,candidate,18),false);assert.throws(()=>C.assign(w,candidate),/CELL_SPACE_FULL/);
  }
  add(w,'freshwaterlight','mobile-producer');
  assert.equal(C.layer(w.organisms.at(-1)),4);assert.deepEqual(C.validate(w),[]);
  const summary=C.summary(w);assert.deepEqual(summary.layers,{1:6,2:3,3:5,4:1,5:6});
  w.organisms.find(o=>o.species==='grass').B=2;assert.equal(C.summary(w).layers[1],6);
});

test('mutated ryouki alone pack nine settlers plus two independent movers',()=>{
  const w=fixture();for(let i=0;i<9;i++)add(w,'ryouki','packed:'+i,{mutated:true});
  for(let i=0;i<2;i++)add(w,'ryouki','moving:'+i,{mutated:true,state:'moving'});
  assert.deepEqual(C.validate(w),[]);const summary=C.summary(w);
  assert.equal(summary.settledSlots,3);assert.equal(summary.settledIndividuals,9);assert.equal(summary.movingIndividuals,2);
  const candidate=S.organism(w,S.D.byId.ryouki,18,'overflow');candidate.ryouki.mutated=true;
  assert.equal(C.room(w,candidate,18),false);assert.equal(C.room(w,candidate,18,{state:'moving'}),false);
  const back=w.organisms.find(o=>o.id==='packed:0'),before=structuredClone(back.cellOccupancy);back.ryouki.mutated=false;
  assert.equal(C.room(w,back,18),false,'normal release must wait for an unshared slot');back.ryouki.mutated=true;
  assert.deepEqual(back.cellOccupancy,before);assert.equal(new Set(w.organisms.map(o=>o.id)).size,11);
});

test('ordinary settlers cannot pack; vacant settlement space can be used by movers',()=>{
  const w=fixture();for(let i=0;i<3;i++)add(w,'ryouki','normal:'+i);
  assert.equal(C.summary(w).settledSlots,3);
  const extra=S.organism(w,S.D.byId.ryouki,18,'extra');assert.equal(C.room(w,extra,18),false);
  for(let i=0;i<2;i++)add(w,'ryouki','pass:'+i,{state:'moving'});
  assert.equal(C.room(w,extra,18,{state:'moving'}),false);
  const mixed=fixture();for(let i=0;i<3;i++)add(mixed,'ryouki','pack:'+i,{mutated:true});
  add(mixed,'ryouki','single:0');add(mixed,'freshwaterlight','single:1');
  assert.equal(C.summary(mixed).settledIndividuals,5);assert.equal(C.summary(mixed).settledSlots,3);
  assert.deepEqual(C.validate(mixed),[]);
  const moving=fixture();for(let i=0;i<5;i++)add(moving,'ryouki','m:'+i,{state:'moving'});
  assert.equal(C.room(moving,extra,18,{state:'moving'}),false);assert.deepEqual(C.validate(moving),[]);
});

test('dynamic water, soil and next-turn material round-trip without resending fixed profiles',()=>{
  const w=fixture(),before=S.totals(w),encode=T.encoder(w),next=structuredClone(w);
  next.cellState.water[18]-=2;next.tiles[18].soilM-=.25;next.cellState.decayLoad[18]=.1;
  next.cellState.nextMaterial.push({id:'return:18',cell:18,kind:'mineral',availableAt:1,E:0,M:.25});
  assert.deepEqual(S.totals(next),before,'pending mineral is owned once, not lost or duplicated');
  const patch=JSON.parse(JSON.stringify(encode(next,true)));
  assert.equal(Object.hasOwn(patch.meta,'cellProfiles'),false);assert.deepEqual(patch.soil,[[18,4.75]]);
  const received=T.apply(w,patch);assert.deepEqual(received,next);assert.deepEqual(C.validate(received),[]);
  assert.equal(w.cellState.water[18],15);assert.equal(w.tiles[18].soilM,5);
});

test('malformed occupancy, internal counts and waiting materials are rejected',()=>{
  const w=fixture(),o=add(w,'ryouki','bad');o.cellOccupancy.slot=3;
  assert(C.validate(w).some(e=>e.startsWith('CELL_OCCUPANCY:')));
  const group=add(w,'grassbug','bad-group');group.consumerGroup={cohorts:[{n:9}]};
  assert(C.validate(w).some(e=>e.startsWith('CELL_MEMBERS:')));
  w.cellState.water[18]=-1;w.cellState.nextMaterial.push({id:'bad',cell:18,kind:'mineral',availableAt:0,E:0,M:1});
  assert(C.validate(w).some(e=>e.startsWith('CELL_STOCK:')));assert(C.validate(w).includes('CELL_MATERIAL'));
});

test('unfinished biology cannot enter normal stepping or result capture',()=>{
  const w=fixture(),before=E.fingerprint(w);
  require('./cell-turn-assertion.cjs')(E,w);assert.equal(E.fingerprint(w),before);
  const archive=A.create({getItem:()=>null,setItem(){}},E,globalThis.EcoReplayVersion);
  assert.throws(()=>archive.capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});

test('legacy 4T result and replay remain exact; old signature cannot claim the new cell model',()=>{
  const legacy=M.model(old.config.advantageSettings);let w=legacy.create(old.config);
  const history=O.create(w.config,old.signature,{species:legacy.S.activeSpecies(w)});history.append(w);
  for(let t=0;t<old.turn;t++){w=legacy.step(w);history.append(w);}
  assert.equal(legacy.fingerprint(w),old.fingerprint);assert.deepEqual(w.stats,old.stats);assert.deepEqual(legacy.invariants(w),[]);
  const oldArchive=A.create({getItem:()=>null,setItem(){}},legacy,old.signature),record=oldArchive.capture(w,'manual',history.snapshot());
  const archive=A.create({getItem:()=>null,setItem(){}},legacy,globalThis.EcoReplayVersion);
  assert.deepEqual(archive.replayRecord(record),record);
  const forged=structuredClone(record);forged.config.cellModel=C.VERSION;forged.observation.metadata.config=structuredClone(forged.config);
  assert.throws(()=>archive.replayRecord(forged),/計算版が異なる/);
});
