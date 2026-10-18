'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('./ecology-fixtures.cjs'),{observe,stocks,lowerOnly}=require('../design/trophic-foundation/observe.cjs');
test('producer energy comes from light; mineral uptake cannot photosynthesize for primary consumers',()=>{
 const E=F.E,w=F.world();w.config.ecologyRevision='observation/4.1';
 F.add(w,'algae','producer',2,2,{E:6,M:.1,B:8});F.add(w,'waterbug','consumer',3,2,{E:8,B:2});F.ready(w);
 const a=observe(E,w);assert(a.row.light.algae.E>0);assert.equal(a.row.light.waterbug.E,0);
 const dark=structuredClone(w);for(const t of dark.tiles)t.light=0;const b=observe(E,dark);
 assert.equal(b.row.light.algae.E,0);assert.equal(b.world.ledger.solar,dark.ledger.solar);
 assert(a.world.ledger.solar>w.ledger.solar);
 assert.equal(E.N.efficiency(w.organisms[1],'mineral'),0);
 assert.equal(E.N.efficiency(w.organisms[1],'plant'),.65);
});
test('trophic observer preserves exact biological state and restores every hooked method',()=>{
 const E=F.E,w=F.world();F.add(w,'grass','g',2,2,{B:8});F.add(w,'grassbug','p',3,2,{E:8});F.ready(w);
 const originals=[E.N.feed,E.N.settle,E.N.investAndDrops],plain=E.step(w),r=observe(E,w);
 assert.deepEqual(r.world,plain);assert.deepEqual([E.N.feed,E.N.settle,E.N.investAndDrops],originals);
 const step=E.step;E.step=()=>{throw Error('observer failure');};try{assert.throws(()=>observe(E,w),/observer failure/);}finally{E.step=step;}
 assert.deepEqual([E.N.feed,E.N.settle,E.N.investAndDrops],originals);
});
test('lower-layer control preserves terrain and food stocks, removes upper consumers, and resets finite ledger',()=>{
 const {model}=require('../design/renewal-screen-v2/model.cjs'),E=model({allocation:true});
 const config=require('../operations/evidence/energy-precision-v4.1.3/baseline/lake-full.json').config,w=E.create(config),before=E.fingerprint(w),lower=lowerOnly(E,w);
 assert.equal(E.fingerprint(w),before);assert.deepEqual(lower.tiles,w.tiles);assert.equal(lower.stats.main,0);assert.equal(lower.stats.P,0);assert.equal(lower.stats.Q,0);
 assert.deepEqual(lower.organisms.map(o=>[o.id,o.E,o.B,o.M]),w.organisms.filter(o=>E.S.spec(o).group!=='main').map(o=>[o.id,o.E,o.B,o.M]));
 assert.deepEqual(E.invariants(lower),[]);assert(lower.stats.counts.waterbug>0);assert.equal(stocks(E,lower).species.waterbug.n,lower.stats.counts.waterbug);
});
test('trophic runner rejects unknown or excessive trials and checks paired controls',()=>{
 const {run}=require('../tools/screen-trophic-foundation.cjs');assert.throws(()=>run('unknown',{turns:0}));assert.throws(()=>run('lake',{turns:501}));
 const r=run('lake',{turns:2});assert.equal(r.length,2);assert.equal(r[0].productionReferenceMatched,7);assert.equal(r[0].states,3);assert.equal(r[1].final.main,0);assert(r[0].initial.counts.waterbug>0);assert.equal(r[0].initial.counts.waterbug,r[1].initial.counts.waterbug);
});
test('habitat trial keeps aquatic primary consumers in valid water without changing main movement',()=>{
 const {model}=require('../design/trophic-foundation/habitat-model.cjs'),trial=model({allocation:true}),base=F.E,w=F.world();w.turn=2;
 const bug=F.add(w,'waterbug','water',2,2,{E:20});for(const p of [bug.cell,F.S.index(w,2,3)])Object.assign(w.tiles[p],{env:0,terrain:'shallow'});
 const ctx=F.ready(w),before=base.B.candidates(w,bug,ctx,base.S.maps(w)),after=trial.B.candidates(w,bug,ctx,trial.S.maps(w));
 assert(before.some(c=>c.type==='move'&&!base.S.validHabitat(w,base.S.spec(bug),c.cell)));
 assert(after.some(c=>c.type==='move'));for(const c of after.filter(c=>c.type==='move'))assert(trial.S.validHabitat(w,trial.S.spec(bug),c.cell));
 const main=F.add(w,'myth','main',5,5,{E:60}),ctx2=F.ready(w);
 assert.deepEqual(trial.B.candidates(w,main,ctx2,trial.S.maps(w)),base.B.candidates(w,main,ctx2,base.S.maps(w)));
});
