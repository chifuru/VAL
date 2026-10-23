'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('./ecology-fixtures.cjs'),O=require('../src/ecology/observations.js');
const pairs=()=>Object.fromEntries(Array.from({length:4000},(_,i)=>['a'+i+'|b'+i,1]));
test('expired detail is budgeted before admission, retaining every turn and the current detail',()=>{
 const w=F.world(),h=O.create(w.config,'budget',{maxBytes:340000}),reference=O.create(w.config,'budget');
 w.observation={contactTurns:pairs()};
 for(let t=0;t<8;t++){w.turn=t;assert(h.append(w));reference.append(w);}
 assert.equal(h.rows.length,8);assert.equal(Object.keys(h.rows.at(-1).contactPairs).length,4000);assert.deepEqual(h.rows[0].contactPairs,{});
 assert.deepEqual(h.snapshot(),reference.snapshot());assert.equal(h.csv(),reference.csv());
});
test('a real refusal is atomic and expansion retries the same turn without changing the 50T series',()=>{
 const w=F.world(),h=O.create(w.config,'budget',{maxBytes:9000}),reference=O.create(w.config,'budget');let refusals=0;
 for(let t=0;t<65;t++){
  w.turn=t;w.observation={relations:{'abyss|myth|combat':t%3+1},contactEpisodes:{'abyss|myth':1},contactTurns:{'a|b':2}};
  const before=JSON.stringify(h.snapshot()),bins=JSON.stringify(h.bins()),series=JSON.stringify(h.series('all'));
  try{h.append(w);}catch(e){refusals++;assert.equal(e.code,'OBSERVATION_CAPACITY');assert.equal(JSON.stringify(h.snapshot()),before);assert.equal(JSON.stringify(h.bins()),bins);assert.equal(JSON.stringify(h.series('all')),series);assert(h.expandCapacity(e.requiredBytes));assert(h.append(w));}
  reference.append(w);
 }
 assert(refusals>0);assert.deepEqual(h.snapshot(),reference.snapshot());assert.deepEqual(h.series('all'),reference.series('all'));assert.equal(h.csv(),reference.csv());assert.deepEqual(h.rows.map(r=>r.turn),Array.from({length:65},(_,i)=>i));
});
function fixture(){const w=F.world(),h=O.create(w.config,'read');for(let t=0;t<3;t++){w.turn=t;h.append(w);}return h.snapshot();}
test('row-wise restore counts the exact serialized UTF16 size at its boundary',()=>{
 const snapshot=fixture(),bytes=JSON.stringify(snapshot).length*2;
 assert.deepEqual(O.restore(snapshot,{maxBytes:bytes}).rows,snapshot.rows);
 assert.throws(()=>O.restore(snapshot,{maxBytes:bytes-1}),/読込上限/);
 assert.equal(O.restore(snapshot,{maxBytes:bytes,validateOnly:true}),true);
});
test('restore never stringifies the entire row array or snapshot as a single value',()=>{
 const snapshot=fixture(),original=JSON.stringify,parts=[];
 try{JSON.stringify=function(value,...args){parts.push(value);assert.notEqual(value,snapshot);assert.notEqual(value?.rows,snapshot.rows);return original.call(JSON,value,...args);};assert.equal(O.restore(snapshot,{validateOnly:true}),true);}
 finally{JSON.stringify=original;}
 assert(snapshot.rows.every(row=>parts.includes(row)));
});
test('both header and row nonfinite values remain rejected without mutating the source',()=>{
 for(const change of [s=>s.metadata.version=Infinity,s=>s.rows[1].counts.abyss=NaN]){const s=fixture();change(s);assert.throws(()=>O.restore(s),/非有限値/);}
 const snapshot=fixture(),original=structuredClone(snapshot);assert.throws(()=>O.restore(snapshot,{maxBytes:1}),/読込上限/);assert.deepEqual(snapshot,original);
});
test('the finite recording ceiling still blocks unbounded retry requests',()=>{
 const w=F.world(),h=O.create(w.config,'ceiling',{maxBytes:1});
 assert(h.canExpandCapacity(1024*1024*1024));assert(!h.canExpandCapacity(1024*1024*1024+1));assert(!h.expandCapacity(1024*1024*1024+1));
 assert(h.expandCapacity(1024*1024*1024));assert(!h.canExpandCapacity(1024*1024*1024+1));
});
