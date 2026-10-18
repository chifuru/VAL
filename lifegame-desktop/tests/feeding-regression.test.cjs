'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {E,S,world,add,ready}=require('./ecology-fixtures.cjs');
function sources(w,o,c){return E.N.sourceList(w,o,c,S.maps(w));}
test('ordinary producers never consume neighboring living plants and still absorb soil minerals',()=>{
 for(const species of ['grass','moss','algae']){
  const w=world();w.config.ecologyRevision='observation/4.1';
  const a=add(w,species,'a',2,2,{E:20,M:1,B:8}),b=add(w,'grass','b',3,2,{E:20,M:1,B:8});
  const c=ready(w),before=[a.B,b.B],mineral=a.M;
  assert(!sources(w,a,c).some(x=>x.type==='plant'));
  c.intents.set(a.id,{type:'harvest',target:b.id,cost:0});
  assert(!sources(w,a,c).some(x=>x.type==='plant'),'forced harvest must not bypass diet');
  E.N.feed(w,c,()=>{});
  assert.deepEqual([a.B,b.B],before,species);assert(a.M>mineral,species+' soil uptake');
 }
});
test('moving prey accepts plants but not neighboring fungi',()=>{
 const w=world();w.config.ecologyRevision='observation/4.1';
 const o=add(w,'grassbug','prey',2,2,{E:0});add(w,'grass','plant',3,2);add(w,'fungus','fungus',2,3);
 const c=ready(w),list=sources(w,o,c);
 assert(list.some(x=>x.type==='plant'&&x.obj.id==='plant'));
 assert(!list.some(x=>x.obj.id==='fungus'));
});
test('carnivorous plant symbiont photosynthesizes, hunts prey and rejects plant harvest or main attacks',()=>{
 const w=world();w.config.ecologyRevision='observation/4.1';
 const o=add(w,'kelp','k',2,2,{phase:4,E:60}),prey=add(w,'grassbug','p',3,2,{E:30}),main=add(w,'myth','m',2,3);
 add(w,'grass','g',2,2);const c=ready(w);
 assert(w.ledger.solar>0);
 const list=E.B.candidates(w,o,c,S.maps(w));
 assert(list.some(x=>x.type==='attack'&&x.target===prey.id));
 assert(!list.some(x=>x.type==='attack'&&x.target===main.id));
 assert(!list.some(x=>x.type==='harvest'));
 c.intents.set(o.id,{type:'harvest',target:'g',cost:0});
 assert(!sources(w,o,c).some(x=>x.type==='plant'));
 c.intents.set(o.id,{type:'attack',target:main.id,cost:3});E.B.combat(w,c);
 assert.equal(c.records.get(main.id).damage,0);
 c.intents.set(o.id,{type:'attack',target:prey.id,cost:3});E.B.combat(w,c);
 assert(c.records.get(prey.id).damage>0);
});
test('kelp accepts animal-derived finite stores, while ordinary plants reject organic stores and corpses',()=>{
 for(const species of ['kelp','grass']){
  const w=world();w.config.ecologyRevision='observation/4.1';
  const o=add(w,species,'o',2,2,{E:0,M:0,HP:40});
  w.resources=[{id:'egg',cell:o.cell,kind:'egg',q:4,E:8,M:2},{id:'seed',cell:o.cell,kind:'seed',q:4,E:8,M:2},{id:'spore',cell:o.cell,kind:'spore',q:4,E:8,M:2}];
  w.carcasses=[{id:'body',cell:o.cell,species:'grassbug',tag:'animal',q:4,E:8,M:2}];
  const c=ready(w),list=sources(w,o,c);
  assert.equal(list.some(x=>x.obj.id==='egg'),species==='kelp');
  assert.equal(list.some(x=>x.id==='body'),species==='kelp');
  assert(!list.some(x=>['seed','spore'].includes(x.obj.id)));
  E.N.feed(w,c,()=>{});
  const totals=S.totals(w);
  assert(Math.abs(totals.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar)<1e-5);
  assert(Math.abs(totals.M+w.ledger.Mloss-w.ledger.initialM)<1e-5);
 }
});

test('fungal decomposers never graze living producers, even through forced harvest',()=>{
 const w=world();w.config.ecologyRevision='observation/4.1';
 const o=add(w,'fungus','decomposer',2,2,{E:0,M:0}),plant=add(w,'grass','living',3,2,{B:8,M:1});
 w.resources=[{id:'organic',cell:plant.cell,kind:'organic',q:4,E:8,M:2}];
 w.carcasses=[{id:'dead',cell:plant.cell,species:'grass',tag:'plant',q:4,E:8,M:2}];
 const c=ready(w);c.intents.set(o.id,{type:'harvest',target:plant.id,cost:0});
 const list=sources(w,o,c);assert(!list.some(x=>x.type==='plant'));assert(list.some(x=>x.obj.id==='organic'));assert(list.some(x=>x.obj.id==='dead'));
 const before=plant.B;E.N.feed(w,c,()=>{});assert.equal(plant.B,before);assert(o.E>0,'finite detritus remains edible');
 const totals=S.totals(w);assert(Math.abs(totals.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar)<1e-5);assert(Math.abs(totals.M+w.ledger.Mloss-w.ledger.initialM)<1e-5);
});
