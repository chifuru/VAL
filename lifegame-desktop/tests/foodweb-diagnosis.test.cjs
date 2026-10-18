'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../src/ecology/engine.js'),{observedStep,foodOnly}=require('../tools/diagnose-foodweb.cjs');
const fixed=require('../operations/evidence/feeding-regression-v4.1.1/report.json').results;
test('foodweb measurement preserves exact biological states and existing observables',()=>{
 for(const id of ['historical-input','lake']){let a=E.create(fixed.find(c=>c.id===id).config),b=structuredClone(a);for(let t=0;t<8;t++){const measured=observedStep(a);a=measured.world;b=E.step(b);assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);assert.equal(measured.row.turn,a.turn);}}
});
test('diagnostic hooks are restored after a failed turn and never alter the input',()=>{
 const w=E.create(fixed[0].config),before=E.fingerprint(w),step=E.step,feed=E.N.feed,settle=E.N.settle;
 E.step=()=>{throw Error('diagnostic fixture failure')};try{assert.throws(()=>observedStep(w),/fixture failure/);}finally{E.step=step;}
 assert.equal(E.N.feed,feed);assert.equal(E.N.settle,settle);assert.equal(E.fingerprint(w),before);
});
test('food-only control keeps initial food positions and terrain without inventing energy or organisms',()=>{
 const w=E.create(fixed.find(c=>c.id==='lake').config),before=E.fingerprint(w),c=foodOnly(w);
 assert.equal(E.fingerprint(w),before);assert.deepEqual(c.tiles,w.tiles);assert.deepEqual(c.organisms.map(o=>[o.id,o.cell,o.E,o.M]),w.organisms.filter(o=>E.S.spec(o).group!=='main').map(o=>[o.id,o.cell,o.E,o.M]));assert(c.organisms.every(o=>!o.infection));assert.equal(c.searchQ.length,0);assert.equal(c.stats.main,0);assert.deepEqual(E.invariants(c),[]);
});
