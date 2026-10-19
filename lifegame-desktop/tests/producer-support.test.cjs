'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('./ecology-fixtures.cjs'),{model}=require('../design/producer-support/model.cjs'),Support=require('../design/producer-support/support.cjs');
function fixture(){const E=model(),w=F.world();w.turn=0;w.config.ecologyRevision='observation/4.1';w.config.ageModel='life/1';return {E,w};}
function add(E,w,s,id,x,y,opts={}){const o=E.S.organism(w,E.S.D.byId[s],E.S.index(w,x,y),id,opts);w.organisms.push(o);return o;}
function reset(E,w){const t=E.S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return w;}
function advance(E,w,n){for(let i=0;i<n;i++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);}return w;}
test('support settings validate finite bounds and nonoverlapping stress intervals',()=>{
 assert.throws(()=>Support.settings({land:{nutrition:NaN}}));assert.throws(()=>Support.settings({water:{capacity:2}}));assert.throws(()=>Support.settings({schedule:[{from:2,to:4,land:0},{from:4,to:8,land:1}]}));assert.throws(()=>Support.settings({secretRescue:true}));
});
test('disabled support exactly preserves the layered reference without adding state',()=>{
 const E=model(),B=require('../design/layered-primary/model.cjs').model({allocation:true}),c=require('../operations/evidence/energy-precision-v4.1.3/baseline/lake-full.json').config;
 let a=E.create(c),b=B.create(c);Support.attach(a,{enabled:false});assert.deepEqual(a,b);
 for(let i=0;i<8;i++){a=E.step(a);b=B.step(b);assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);}assert(!a.producerSupport);assert(!('producerE'in a.ledger));
});
test('strong grazing consumes finite leaves while supported basal organisms persist',()=>{
 const {E,w}=fixture(),plant=add(E,w,'grass','root',2,2,{B:2,E:4}),prey=add(E,w,'grassbug','grazer',2,2,{E:0});reset(E,w);Support.attach(w,{land:{capacity:1,regrowth:1},establishment:0});
 for(let t=1;t<=30;t++){w.turn=t;Support.begin(w,E.S);assert(w.producerSupport.last.regrownB<=1);E.N.spend(w,prey,prey.E);const c=E.context(w);E.prepare(w,c);E.N.feed(w,c,()=>{});assert(plant.B>=E.S.PLANT_BASE);assert(w.organisms.includes(plant));assert.deepEqual(E.invariants(w),[]);}
 assert(w.ledger.producerE>0);assert(w.ledger.producerM>0);
});
test('supply stop has zero external input, exhausts reserve and causes producer loss',()=>{
 const {E,w}=fixture();add(E,w,'grass','old',2,2,{E:8,B:8,M:.5});reset(E,w);Support.attach(w,{land:{capacity:1},schedule:[{from:1,to:40,land:0,water:0}]});let last=w;const deaths=[];for(let i=0;i<40;i++){last=advance(E,last,1);deaths.push(...last.last.deathCauses);}
 assert(deaths.some(d=>d.id==='old'&&d.environmentCause==='basal-nutrition-exhausted'));assert.equal(last.stats.counts.grass,0);assert.equal(last.ledger.producerE,0);assert.equal(last.ledger.producerM,0);assert.deepEqual(last.producerSupport.established,{});
});
test('restored support establishes new IDs with explicit origin and separate observation counts',()=>{
 const {E,w}=fixture();add(E,w,'grass','old',2,2,{E:8,B:8,M:.5});reset(E,w);Support.attach(w,{land:{capacity:1},establishment:1,schedule:[{from:1,to:40,land:0,water:0}]});let last=advance(E,w,40);assert.equal(last.stats.food,0);last=advance(E,last,1);
 assert(last.stats.counts.grass>0);assert(!last.organisms.some(o=>o.id==='old'));for(const o of last.organisms){assert.equal(o.origin.kind,'environment');assert.deepEqual(o.parents,[]);assert.equal(o.age,1);}
 assert(last.ledger.producerE>0);assert(last.ledger.producerM>0);assert.equal(last.observation.environmentEstablished.grass,last.producerSupport.last.established.grass);assert.equal(last.last.births,0);
});
test('external ledger cannot hide missing or double-counted input and leaves original baselines intact',()=>{
 const {E,w}=fixture();add(E,w,'grass','p',2,2,{B:2,E:1,M:0});reset(E,w);const initial={E:w.ledger.initialE,M:w.ledger.initialM};Support.attach(w,{land:{capacity:1},establishment:0});const last=advance(E,w,1);
 assert.equal(last.ledger.initialE,initial.E);assert.equal(last.ledger.initialM,initial.M);const bad=structuredClone(last);bad.ledger.producerE=0;assert(E.invariants(bad).some(x=>x.startsWith('ENERGY:')));const badM=structuredClone(last);badM.ledger.producerM*=2;assert(E.invariants(badM).some(x=>x.startsWith('MATERIAL:')));
});
test('producer support never creates animal or parasite populations',()=>{
 const {E,w}=fixture();reset(E,w);Support.attach(w,{land:{capacity:1},establishment:1});const last=advance(E,w,4);assert(last.organisms.length>0);assert(last.organisms.every(o=>E.S.spec(o).group==='plant'));assert.equal(last.stats.P,0);assert.equal(last.stats.Q,0);
});

test('non-finite external ledger values and mid-run reconfiguration are rejected',()=>{
 const {E,w}=fixture();reset(E,w);Support.attach(w,{establishment:1});const last=advance(E,w,1);last.ledger.producerE=NaN;assert(E.invariants(last).includes('PRODUCER_LEDGER'));assert.throws(()=>Support.attach(last),/initial state/);
});
