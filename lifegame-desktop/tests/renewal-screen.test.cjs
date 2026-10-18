'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{model}=require('../design/renewal-screen-v1/model.cjs');
const F=require('./ecology-fixtures.cjs');
function setup(E,w){const total=E.S.totals(w);w.ledger={initialE:total.E,initialM:total.M,solar:0,sinks:0,Mloss:0};const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});return c;}
test('empty trial matches production and rejects unknown mechanism flags',()=>{
 const E=model(),input={seed:'renewal/unit',width:8,height:8,initial:16,lineages:'manual',selected:['abyss','myth','jelly','swarm']};let a=F.E.create(input),b=E.create(input);
 for(let i=0;i<6;i++){assert.equal(E.fingerprint(b),F.E.fingerprint(a));a=F.E.step(a);b=E.step(b);}
 assert.throws(()=>model({lifespan:true}),/Unknown/);
});
test('sparse paid birth needs a real mature parent and preserves finite budgets',()=>{
 for(const sparse of [false,true]){
  const E=model({sparse}),w=F.world();w.config.ecologyRevision='observation/4.1';
  const parent=F.add(w,'grass','parent',3,3,{phase:2,E:16,B:8,M:1,age:30});const c=setup(E,w),before=parent.E,children=E.R.reproduce(w,c);
  assert.equal(children.length,sparse?1:0);if(sparse){assert.equal(parent.E,E.S.round(before-8));assert.equal(parent.M,.8);assert.equal(children[0].phase,1);assert.equal(children[0].age,0);assert.deepEqual(E.invariants(w),[]);}
 }
});
test('uptake changes finite soil transfer but never creates mineral',()=>{
 const amounts=[];
 for(const uptake of [false,true]){
  const E=model({uptake}),w=F.world(),plant=F.add(w,'grass','plant',3,3,{phase:2,E:20,M:0,B:8}),c=setup(E,w);
  E.N.feed(w,c,()=>{});amounts.push(plant.M);assert.deepEqual(E.invariants(w),[]);
 }
 assert(amounts[1]>amounts[0]);
});
test('expanded neighborhood cannot create offspring from an empty or depleted world',()=>{
 const E=model({sparse:true}),w=F.world();w.config.ecologyRevision='observation/4.1';
 assert.equal(E.R.reproduce(w,setup(E,w)).length,0);
 F.add(w,'grass','depleted',3,3,{phase:2,E:0,B:8,M:0,age:30});
 assert.equal(E.R.reproduce(w,setup(E,w)).length,0);assert.deepEqual(E.invariants(w),[]);
});
test('producer reserve leaves mineral with grazed producer without breaking the ledger',()=>{
 const remaining=[];
 for(const reserve of [false,true]){
  const E=model({reserve}),w=F.world(),plant=F.add(w,'grass','plant',3,3,{phase:2,E:20,B:8,M:.25}),prey=F.add(w,'grassbug','grazer',3,4,{phase:2,E:0,M:0});
  // Keep the producer from replacing harvested M from the soil in this fixture.
  w.config.ecologyRevision='observation/4.1';w.tiles[plant.cell].soilM=0;const c=setup(E,w);E.N.feed(w,c,()=>{});remaining.push(plant.M);
  assert(plant.B<8);assert(prey.E>0);assert.deepEqual(E.invariants(w),[]);
 }
 assert.equal(remaining[1],.25);assert(remaining[0]<remaining[1]);
});
