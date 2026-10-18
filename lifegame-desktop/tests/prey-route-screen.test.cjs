'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {model}=require('../design/renewal-screen-v2/model.cjs'),old=require('../design/renewal-screen-v1/model.cjs'),F=require('./ecology-fixtures.cjs');
const cases=require('../operations/evidence/headless-baseline-v4.1/report.json').cases;
function groups(E,w){const counts={plant:0,fungus:0,prey:0};for(const o of w.organisms)if(E.S.spec(o).group in counts)counts[E.S.spec(o).group]++;return counts;}
test('new private loader preserves old candidate results when new flags are off',()=>{
 const A=old.model({reserve:true,sparse:true}),B=model({reserve:true,sparse:true});
 const input={seed:'prey-routes/equivalence',width:8,height:8,initial:16,lineages:'manual',selected:['abyss','myth','jelly','swarm']};let a=A.create(input),b=B.create(input);
 for(let t=0;t<=8;t++){assert.equal(A.fingerprint(a),B.fingerprint(b));assert.deepEqual(a.observation,b.observation);if(t<8){a=A.step(a);b=B.step(b);}}
});
test('shared initial placement preserves group targets and terrain while keeping aquatic producers and prey',()=>{
 for(const c of cases){const E=model({allocation:true}),w=E.create(c.config),before=F.E.create(c.config);
  assert.deepEqual(groups(E,w),groups(F.E,before));assert.equal(w.stats.main,before.stats.main);assert.equal(w.config.mapResolved.terrainHash,before.config.mapResolved.terrainHash);
  assert(w.stats.counts.waterbug>0);assert(w.stats.counts.algae>0);assert.deepEqual(E.invariants(w),[]);
  assert(w.organisms.every(o=>E.S.validHabitat(w,E.S.spec(o),o.cell)||o.slot==='main'));
 }
});
test('initial placement is reproducible and never creates a disabled food group',()=>{
 const E=model({allocation:true}),input={...cases[0].config,enabled:{...cases[0].config.enabled,prey:false}};
 const w=E.create(input);assert.equal(w.stats.counts.waterbug,0);assert.equal(w.stats.counts.grassbug,0);assert.equal(E.fingerprint(w),E.fingerprint(E.create(input)));assert.deepEqual(E.invariants(w),[]);
});
function brood(flags,energy=10,phase=2){const E=model(flags),w=F.world();w.config.ecologyRevision='observation/4.1';
 const parents=[F.add(w,'grassbug','a',3,3,{phase,E:energy,age:8}),F.add(w,'grassbug','b',4,3,{phase,E:energy,age:8})];
 const totals=E.S.totals(w);w.ledger={initialE:totals.E,initialM:totals.M,solar:0,sinks:0,Mloss:0};const ctx=E.context(w);E.prepare(w,ctx);for(const o of parents)ctx.intents.set(o.id,{type:'stop',cell:o.cell,cost:0,path:[]});
 const before=parents.reduce((n,o)=>n+o.E,0),children=E.R.reproduce(w,ctx);return {E,w,parents,before,children};}
test('lower prey energy gate still pays eight units and gives finite child reserves',()=>{
 assert.equal(brood({}).children.length,0);const {E,w,parents,before,children}=brood({preyGate:true});assert(children.length>0);
 assert.equal(E.S.round(before-parents.reduce((n,o)=>n+o.E,0)),8*children.length);for(const child of children){assert.equal(child.E,6);assert.equal(child.B,2);assert.equal(child.phase,1);assert.equal(child.age,0);}assert.deepEqual(E.invariants(w),[]);
});
test('lower gate cannot reproduce below cost or bypass the juvenile phase',()=>{
 assert.equal(brood({preyGate:true},7).children.length,0);assert.equal(brood({preyGate:true},10,1).children.length,0);
});
test('producer retains birth energy for the same sparse neighborhood accepted by reproduction',()=>{
 const retained=[];
 for(const birthReserve of [false,true]){
  const E=model({sparse:true,birthReserve}),w=F.world();w.config.ecologyRevision='observation/4.1';
  const plant=F.add(w,'grass','producer',3,3,{phase:2,E:9,B:8,M:1,age:30});
  let total=E.S.totals(w);w.ledger={initialE:total.E,initialM:total.M,solar:0,sinks:0,Mloss:0};const ctx=E.context(w);E.prepare(w,ctx);
  plant.E=9;total=E.S.totals(w);w.ledger={initialE:total.E,initialM:total.M,solar:0,sinks:0,Mloss:0};
  E.N.investAndDrops(w,ctx);retained.push(plant.E);assert.deepEqual(E.invariants(w),[]);
 }
 assert(retained[0]<8);assert.equal(retained[1],8);
});
