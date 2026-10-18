'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{model}=require('../design/renewal-screen-v2/model.cjs'),{measuredStep,residual}=require('../tools/audit-ecology-budget.cjs');
test('stage budget audit preserves full world states and reconciles its residual increments',()=>{
 const E=model({allocation:true,sparse:true,birthReserve:true}),input=require('../operations/evidence/foodweb-recovery-screen-v4.1.2/allocationLocal-historical-input.failure.json').config;
 let a=E.create(input),b=structuredClone(a);for(let t=0;t<6;t++){const before=residual(E,a),r=measuredStep(E,a);a=r.world;b=E.step(b);assert.deepEqual(a,b);assert.equal(E.S.round(Object.values(r.deltas).reduce((s,v)=>s+v,0)),E.S.round(residual(E,a)-before));}
});
test('stage audit restores all hooks if engine calculation fails',()=>{
 const E=model(),w=require('./ecology-fixtures.cjs').world(),step=E.step,feed=E.N.feed,age=E.S.settleAge;E.step=()=>{throw Error('audit failure')};try{assert.throws(()=>measuredStep(E,w),/audit failure/);}finally{E.step=step;}assert.equal(E.N.feed,feed);assert.equal(E.S.settleAge,age);
});
test('fractional costs debit exactly the same quantum that enters dissipation',()=>{
 const F=require('./ecology-fixtures.cjs');
 for(const cost of [.1465605,.1234565,.0000005,0,2]){
  const w=F.world(),o=F.add(w,'solar','payer',2,2,{E:1,HP:50});F.ready(w);const before=F.S.totals(w),sink=w.ledger.sinks,hp=o.HP;
  F.E.N.spend(w,o,cost);const after=F.S.totals(w);assert(Math.abs(F.S.round(after.E+w.ledger.sinks-sink-before.E))<1e-9);assert(o.HP<=hp,'quantization must not heal a fully paying organism');
  assert.equal(F.S.round(1-o.E),F.S.round(w.ledger.sinks-sink));
 }
});
test('fractional photosynthesis uses one light quantum for stock and input ledger',()=>{
 const F=require('./ecology-fixtures.cjs'),w=F.world();for(let i=0;i<16;i++){const o=F.add(w,'grass','producer'+i,i%8,Math.floor(i/8),{B:8,E:1,phase:2,age:20});w.tiles[o.cell].light=.10000015625;}const c=F.ready(w);assert.equal(residual(F.E,w),0);assert([...c.records.values()].every(r=>r.light===.320001));
});
