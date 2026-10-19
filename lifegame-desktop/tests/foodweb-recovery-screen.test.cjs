'use strict';
// These experiments intentionally require the archived 4.1.3 source set.
const historicalOptions={skip:require('../package.json').version!=='4.1.3'?'4.1.3固定証跡の実験。現行製品はobservation-model検査で照合。':false};
const {test}=require('node:test'),assert=require('node:assert/strict'),api=require('../tools/screen-foodweb-recovery.cjs'),{VARIANTS}=api;
const referenceRoot='operations/evidence/energy-precision-v4.1.3/baseline';
const run=(variant,id,options)=>api.run(variant,id,{...options,referenceRoot});
test('corrected recovery screen rejects unsupported experiments and preserves exact baseline states',historicalOptions,()=>{
 assert.throws(()=>run('freeRefill','lake',{turns:0}),/unknown variant/);assert.throws(()=>run('baseline','lake',{turns:501}));
 const r=run('baseline','lake',{turns:8});assert.equal(r.states,9);assert.equal(r.matchedStates,9);assert(Object.values(r.flags).every(v=>!v));assert.equal(r.productionVersion,'4.1.3');
});
test('shared-habitat and retained-material trials keep distinct mechanisms and group budgets',historicalOptions,()=>{
 const a=run('allocation','custom',{turns:3}),b=run('reserve','custom',{turns:3}),c=run('allocationReserve','custom',{turns:3});
 assert(a.initial.counts.waterbug>0);assert.equal(b.initial.counts.waterbug,0);assert.equal(a.initial.food,b.initial.food);assert.equal(a.initial.main,b.initial.main);
 assert.equal(a.flags.allocation,true);assert.equal(a.flags.reserve,false);assert.equal(b.flags.reserve,true);assert.equal(b.flags.allocation,false);assert.equal(c.flags.allocation,true);assert.equal(c.flags.reserve,true);
 for(const r of [a,b,c]){assert.equal(r.matchedStates,null);assert.equal(r.flags.preyGate,false);assert.equal(r.flags.sparse,false);assert.equal(r.flags.uptake,false);assert.equal(r.flags.birthReserve,false);assert.equal(r.survival.whale.continuous150to250,null);}
 assert.equal(Object.keys(VARIANTS).length,5);
});

test('local renewal compares consistent birth sites and energy reservation without mineral or energy subsidies',historicalOptions,()=>{
 const r=run('allocationLocal','lake',{turns:3});assert.equal(r.flags.allocation,true);assert.equal(r.flags.sparse,true);assert.equal(r.flags.birthReserve,true);assert.equal(r.flags.reserve,false);assert.equal(r.flags.preyGate,false);assert.equal(r.flags.uptake,false);assert(r.initial.counts.waterbug>0);assert.equal(r.states,4);
});

test('historical 4.1.2 reference refuses changed production sources instead of relabeling results',()=>{
 assert.throws(()=>api.run('baseline','lake',{turns:0}),/production reference source changed/);
});
