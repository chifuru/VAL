'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('./ecology-fixtures.cjs'),{model}=require('../design/layered-primary/model.cjs');
const E=model({allocation:true}),S=E.S;
function add(w,s,id,x,y,opt={}){const o=F.add(w,s,id,x,y,opt);o.slot=S.spec(o).slot;return o;}
function ready(w){w.config.ecologyRevision="observation/4.1";const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});return c;}
test('independent basal and prey maps allow overlap and reject duplicates within one layer',()=>{
 const w=F.world(),plant=add(w,'grass','g',2,2),bug=add(w,'grassbug','p',2,2);ready(w);const m=S.maps(w);
 assert.equal(m.food.get(plant.cell),plant);assert.equal(m.prey.get(bug.cell),bug);assert.deepEqual(E.invariants(w),[]);
 add(w,'grassbug','duplicate',2,2);assert(E.invariants(w).some(x=>x.startsWith('SLOT_DUPLICATE:')));
});
test('prey moves onto live producers and same-cell feeding transfers finite stock',()=>{
 const w=F.world(),plant=add(w,'grass','g',2,2,{B:8}),bug=add(w,'grassbug','p',2,1,{E:4});const c=ready(w);
 assert(E.B.candidates(w,bug,c,S.maps(w)).some(x=>x.type==='move'&&x.cell===plant.cell));
 bug.cell=plant.cell;const b=plant.B,e=bug.E;E.N.feed(w,c,()=>{});assert(plant.B<b);assert(bug.E>e);assert.deepEqual(E.invariants(w),[]);
});
test('prey can be born on a producer cell without deleting it or bypassing birth payment',()=>{
 const w=F.world(),plant=add(w,'grass','g',2,2,{B:8});
 add(w,'grassbug','p1',2,1,{phase:2,age:8,E:20});add(w,'grassbug','p2',1,2,{phase:2,age:8,E:20});const c=ready(w);
 const candidate=E.R.candidates(w,c).find(x=>x.cell===plant.cell&&x.species==='grassbug');assert(candidate);assert.equal(candidate.slot,'prey');
 const parent=candidate.parents[0],energy=parent.E,child=E.R.child(w,candidate,c);w.organisms.push(child);
 assert.equal(parent.E,energy-8);assert.equal(child.slot,'prey');assert(w.organisms.includes(plant));assert.deepEqual(E.invariants(w),[]);
});
test('main predators retain attack access to prey overlapping producers',()=>{
 const w=F.world(),main=add(w,'abyss','m',2,1,{E:60}),bug=add(w,'grassbug','p',2,2);add(w,'grass','g',2,2);const c=ready(w);
 assert(E.B.candidates(w,main,c,S.maps(w)).some(x=>x.type==='attack'&&x.target===bug.id));
});
test('parasite contact still reaches the primary consumer layer',()=>{
 const w=F.world();w.config.ecologyRevision='observation/4.1';const plant=add(w,'grass','g',2,2),bug=add(w,'grassbug','p',2,2);
 plant.infection=S.infection(w,'leafparasite',plant.id,w.turn);plant.infection.counter=4;plant.infection.E=1;
 bug.contactExposure=[{source:plant.infection.id,time:w.turn-1,hits:2}];const c=ready(w);E.P.contacts(w,c);assert.equal(bug.infection?.species,'leafparasite');assert.equal(bug.infection.stage,'middle');assert.deepEqual(E.invariants(w),[]);
});
test('layer split preserves initial terrain, species, positions and finite budgets',()=>{
 const config=require('../operations/evidence/energy-precision-v4.1.3/baseline/lake-full.json').config,control=model({allocation:true,layered:false}),a=E.create(config),b=control.create(config);
 assert.deepEqual(a.tiles,b.tiles);assert.deepEqual(a.stats,b.stats);assert.deepEqual(a.ledger,b.ledger);
 const normalized=structuredClone(a);for(const o of normalized.organisms)if(o.slot==='prey')o.slot='food';assert.deepEqual(normalized,b);
});
test('overlapping producer and prey corpses retain separate origins and conserve finite stocks',()=>{
 const w=F.world(),plant=add(w,'grass','g',2,2,{B:8}),bug=add(w,'grassbug','p',2,2,{E:8}),c=ready(w);
 E.N.carcass(w,plant,c);E.N.carcass(w,bug,c);w.organisms=[];
 assert.equal(w.carcasses.length,2);assert.deepEqual(new Set(w.carcasses.map(a=>a.slot)),new Set(['food','prey']));assert.equal(S.maps(w).carcasses.get(plant.cell).length,2);assert.deepEqual(E.invariants(w),[]);
});
