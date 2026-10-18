'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('./ecology-fixtures.cjs'),{model}=require('../design/prey-forage-screen/model.cjs');
function score(E,w,o,c){w=structuredClone(w);o=w.organisms.find(a=>a.id===o.id);const ctx=F.ready(w),m=E.S.maps(w),v={m,traits:ctx.traits,enemies:[],visibleCells:new Set(w.tiles.map((_,i)=>i)),qualityCache:new Map(),dangerCache:new Map(),neighborhoodCache:new Map()};return E.B.evaluate(w,o,c,ctx,v);}
test('private prey movement values reachable adjacent leaves without occupying or consuming them',()=>{
 const w=F.world(),o=F.add(w,'grassbug','p',2,2,{E:5});F.add(w,'grass','g',3,2,{B:8});
 const c={type:'stop',cell:o.cell,cost:0,path:[],direction:o.facing},before=structuredClone(w),base=score(model(),w,o,c),trial=score(model(true),w,o,c);
 assert(trial.score>base.score);assert.equal(trial.xi,base.xi);assert.deepEqual(w.organisms,before.organisms);
});
test('private forage evaluation excludes distant, blocked and fungal food',()=>{
 for(const [species,x,blocked]of [['grass',5,false],['grass',3,true],['fungus',3,false]]){
  const w=F.world(),o=F.add(w,'grassbug','p',2,2);const plant=F.add(w,species,'g',x,2,{B:8});if(blocked)w.tiles[plant.cell].blocked=true;
  const c={type:'stop',cell:o.cell,cost:0,path:[],direction:o.facing};assert.deepEqual(score(model(true),w,o,c),score(model(),w,o,c));
 }
});
test('private source compilation leaves production behavior and initial world untouched',()=>{
 const E=require('../src/ecology/engine.js'),config=require('../operations/evidence/energy-precision-v4.1.3/baseline/lake-full.json').config;
 assert.equal(E.fingerprint(E.create(config)),model(true).fingerprint(model(true).create(config)));
 assert.equal(require('../src/ecology/engine.js'),E);
});
test('focused runner matches archived production states before comparing the isolated candidate',()=>{
 const {run}=require('../tools/screen-prey-forage.cjs'),results=run('lake',{turns:3});
 assert.equal(results.length,2);assert.equal(results[0].baselineMatched,4);assert.equal(results[1].baselineMatched,null);
 assert.deepEqual(results[0].initial,results[1].initial);assert.equal(results[1].productAdopted,false);
 assert.throws(()=>run('unknown',{turns:0}));assert.throws(()=>run('lake',{turns:501}));
});
