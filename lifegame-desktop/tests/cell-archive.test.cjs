'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),util=require('node:util');
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),C=require('../src/ecology/cell-archive.js'),F=require('./cell-archive-fixture.cjs');
require('../src/ecology/replay-version.js');const signature=globalThis.EcoReplayVersion,E=M.model(F.config.advantageSettings),data=x=>JSON.parse(JSON.stringify(x)),equal=(a,b,label)=>assert(util.isDeepStrictEqual(data(a),data(b)),label);
let cached;
function fixture(){
 if(!cached){const w=E.create(F.config),h=O.create(w.config,signature,{species:E.S.activeSpecies(w)});h.append(w);for(let t=0;t<2;t++){F.step(w,E);h.append(w);}cached={w,h:h.snapshot()};}
 const {w,h}=structuredClone(cached);let raw=null;const storage={getItem:()=>raw,setItem:(_,v)=>{raw=v;}};return {w,h,storage,archive:A.create(storage,E,signature)};
}
test('cell record stores one terminal environment, actual bodies/cohorts and bounded examples, with no per-turn world history',()=>{
 const {w,h,storage,archive}=fixture(),before=JSON.stringify(w),observed=JSON.stringify(h),r=archive.capture(w,'user',h),s=r.final.state;
 assert.equal(r.schema,3);assert.equal(s.definition,C.definition);assert.equal(s.cell.definition,C.stockDefinition);equal(s.cell.profiles,w.cellProfiles);equal(s.cell.state,w.cellState);equal(s.cell.soilM,w.tiles.map(t=>t.soilM));
 assert.equal(r.observation.rows.length,3);assert.equal(s.examples.organisms.total,w.organisms.length);assert.equal(s.examples.consumerGroups.total,h.rows[2].cell.layers[3].units);
 for(const a of Object.values(s.examples)){assert.equal(a.retained,Math.min(4,a.total));assert.equal(a.items.length,a.retained);}
 for(const o of s.examples.colonies.items){assert.equal(o.state.version,'cell-life/1');assert.equal(o.state.baseB,o.cellLife.baseB);assert(o.cellMatter.bodyM>=0);}
 assert(s.examples.ryouki.items.every(o=>o.ryouki&&o.cellOccupancy));assert(s.examples.consumerGroups.items.every(o=>o.consumerGroup.cohorts.every(c=>Number.isFinite(c.B))));
 assert(!('organisms' in r)&&!('tiles' in r)&&!('history' in s));assert(!h.rows.some(row=>'cellProfiles' in row||'organisms' in row));
 assert(archive.save(r));equal(archive.get(r.id),data(r),'JSON persistence');assert.equal(archive.validateFullRecord(data(r)).id,r.id);assert.equal(archive.list().length,1);
 assert.equal(JSON.stringify(w),before);assert.equal(JSON.stringify(h),observed);assert(storage.getItem().includes('cell-ecosystem-terminal/1'));
});
test('resolved initial replay reproduces terminal fingerprint and all cell material, and explicit child save alone creates a new record',()=>{
 const {w,h,archive}=fixture(),parent=archive.capture(w,'user',h);archive.save(parent);const bytes=JSON.stringify(archive.get(parent.id)),entry=archive.replay(parent.id),again=E.create(entry.config);
 assert(C.matchInitial(entry,again));const history=O.create(again.config,signature,{species:E.S.activeSpecies(again)});history.append(again);
 for(let t=0;t<entry.turn;t++){F.step(again,E);history.append(again);}assert.equal(E.fingerprint(again),parent.finalFingerprint);equal(again.cellState,parent.final.state.cell.state);equal(history.snapshot(),h,'all turn observations');assert.equal(archive.list().length,1);
 const child=archive.capture(again,'explicit-replay',history.snapshot(),parent.id);child.replayMatch=true;assert.notEqual(child.id,parent.id);assert.equal(archive.save(child),false);assert(archive.save(child,'replay-new'));assert.equal(archive.save(child,'replay-new'),false);assert.equal(archive.list().length,2);assert.equal(JSON.stringify(archive.get(parent.id)),bytes);
 require('./cell-turn-assertion.cjs')(E,again);assert.deepEqual(E.invariants(again),[]);
});
test('all full-record entrances reject missing or contradictory physical data without changing previous records',()=>{
 const {w,h,storage,archive}=fixture(),r=archive.capture(w,'user',h);archive.save(r);const bytes=storage.getItem();
 const changes=[
  x=>delete x.config.cellSettings,x=>x.config.cellModel='future',x=>x.schema=2,x=>delete x.config.generationResolved,
  x=>x.final.state.definition='ecosystem-terminal-state/1',x=>delete x.final.state.models.cellModel,x=>delete x.final.state.cell,
  x=>x.final.state.cell.profiles.version='future',x=>delete x.final.state.cell.profiles.profiles[0].lightBudget,x=>x.final.state.cell.state.water.pop(),
  x=>x.final.state.cell.soilM[0]++,x=>x.final.state.cell.state.nextMaterial[0].availableAt++,
  x=>delete x.final.state.examples.organisms.items[0].cellMatter,x=>x.final.state.examples.colonies.items[0].cellLife.baseB=-1,
  x=>x.final.state.examples.colonies.items[0].state.baseB++,x=>x.final.state.examples.consumerGroups.items[0].consumerGroup.cohorts[0].n=9,
  x=>x.final.state.examples.ryouki.items[0].cellOccupancy.slot=3,x=>x.final.state.examples.ryouki.items[0].ryouki.version='future',
  x=>delete x.final.state.examples.primaryParasites.items[0].state.adaptation,x=>delete x.final.state.examples.hyperParasites.items[0].state.genes,
  x=>x.observation.metadata.populationUnits.grass='individual',x=>x.observation.rows[2].cell.stocks.pendingM++,x=>x.observation.rows.pop(),
  x=>x.final.state.cell.state.resourceTurn=Infinity,x=>x.final.stats.totals.M++,x=>x.final.state.examples.organisms.items[0].E=null
 ];
 for(let i=0;i<changes.length;i++){const bad=data(r);changes[i](bad);for(const [name,fn]of [['validate',()=>archive.validateFullRecord(bad)],['save',()=>archive.save(bad)],['replay',()=>archive.replayRecord(bad)]])assert.throws(fn,undefined,`${i} ${name}`);assert.equal(storage.getItem(),bytes);}
});
test('unknown initial profiles and old signatures cannot be replayed as current cell records',()=>{
 const {w,h,archive}=fixture(),r=archive.capture(w,'user',h),initial=E.create(r.config),before=JSON.stringify(initial),bad=data(r);bad.final.state.cell.profiles.profiles[0].temperature++;
 assert.throws(()=>C.matchInitial(bad,initial),/初期条件/);assert.equal(JSON.stringify(initial),before);
 const old=data(r);old.signature='64732bea91afeb9ea38949be2f6a2a71b8d698650a41ca7cddaf30c5ebf27037';old.observation.metadata.version=old.signature;
 assert.throws(()=>archive.replayRecord(old),/計算版が異なる/);const forged=data(r);delete forged.config.cellModel;forged.observation.metadata.config=data(forged.config);assert.throws(()=>archive.replayRecord(forged));
});
test('failed persistence retains pending ID and record bytes for retry; broken JSON body stays untouched',()=>{
 const {w,h,archive,storage}=fixture(),r=archive.capture(w,'user',h);archive.save(r);const bytes=storage.getItem(),pending=archive.capture(w,'explicit-replay',h,r.id),id=pending.id;
 const failed=A.create({getItem:()=>bytes,setItem:()=>{throw Error('test quota');}},E,signature);assert.throws(()=>failed.save(pending,'replay-new'),/quota/);assert.equal(pending.id,id);assert.equal(storage.getItem(),bytes);assert(archive.save(pending,'replay-new'));
 const bad=data(r);bad.final.state.cell.state.organic.push({id:'unknown',cell:0,E:null,M:0,B:0});storage.setItem('',JSON.stringify([bad]));const broken=storage.getItem();assert.throws(()=>archive.get(r.id));assert.equal(storage.getItem(),broken);
});
test('unresolved water remains explicit null in a zero-founder record, and incomplete foundation fixtures are not silently converted',()=>{
 const c={...F.config,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},largePlantSettings:{autoDensity:{land:0,water:0}},producerSettings:{land:{occupancy:0},water:{occupancy:0}},founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0,forestcrown:0,starcrown:0,freshwaterlight:0},parasites:{}},cellSettings:{}};
 const w=E.create(c),h=O.create(w.config,signature,{species:E.S.activeSpecies(w)});h.append(w);const a=A.create({getItem:()=>null,setItem(){}},E,signature),r=a.capture(w,'user',h.snapshot());assert(r.final.state.cell.state.water.some(v=>v===null));assert(C.matchInitial(data(r),E.create(r.config)));
 const incomplete=structuredClone(w);delete incomplete.config.generationModel;delete incomplete.config.generationSettings;delete incomplete.config.generationResolved;assert.throws(()=>a.capture(incomplete,'user',h.snapshot()),/CELL_MODEL_INCOMPLETE/);
});
