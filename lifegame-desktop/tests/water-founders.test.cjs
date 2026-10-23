'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/ecology/observation-model.js').model(),S=E.S,A=require('../src/ecology/archive.js'),O=require('../src/ecology/observations.js');
require('../src/ecology/replay-version.js');
const old=require('../operations/evidence/water-founders-v1/old-boundary.json'),base=old.config;
const settings={...base.primaryParasiteSettings,version:'primary-parameters/2',automaticCounts:{tideparasite:8}};
function observation(w,signature){const h=O.create(w.config,signature,{species:S.activeSpecies(w)});h.append(w);return h.snapshot();}
const config=mapId=>{const c={...base,mapId,primaryParasiteSettings:settings};delete c.mapResolved;return c;};
const tides=w=>S.PrimaryParasite.entries(w).filter(({p})=>p.species==='tideparasite');
test('previous water egg worlds retain their exact 4T result',()=>{
 let w=E.create(base);for(let n=0;n<4;n++)w=E.step(w);assert.equal(E.fingerprint(w),old.fingerprint);assert.deepEqual(w.stats,old.stats);assert.deepEqual(E.invariants(w),[]);
});
test('automatic water founders are saved and distributed 3/3/2 on three maps; explicit counts and disable win',()=>{
 for(const map of ['river','lake','wetland']){const w=E.create(config(map)),r=w.config.primaryParasiteInitial.bySpecies.tideparasite;assert.equal(r.planned,8);assert.equal(r.actual,8);assert.deepEqual(Object.fromEntries(Object.entries(r.stages).map(([k,v])=>[k,v.actual])),{first:3,middle:3,terminal:2});assert.equal(tides(w).length,8);assert.deepEqual(E.invariants(w),[]);}
 for(const n of [0,4]){const w=E.create({...config('river'),founderCounts:{version:1,species:{},parasites:{tideparasite:n}}});assert.equal(tides(w).length,n);assert(tides(w).every(({p})=>p.stage==='first'));}
 const off=E.create({...config('river'),enabled:{...base.enabled,P:false,Q:false}});assert.equal(S.PrimaryParasite.summary(off).count,0);
 for(const automaticCounts of [{tideparasite:-1},{tideparasite:1.5},{unknown:8}])assert.throws(()=>E.create({...config('river'),primaryParasiteSettings:{...settings,automaticCounts}}),/一次寄生/);
 assert.throws(()=>E.create({...config('river'),primaryParasiteSettings:{...settings,version:'primary-parameters/1'}}),/一次寄生/);
});
test('automatic founders respect legal host capacity and do not appear without the first host layer',()=>{
 const sparse=E.create({...config('river'),initial:0,enabled:{main:false,plant:true,fungus:false,prey:false,P:true,Q:false}}),r=sparse.config.primaryParasiteInitial.bySpecies.tideparasite;
 assert.equal(r.planned,8);assert.equal(r.actual,3);assert.equal(r.shortage,5);assert.equal(tides(sparse).length,3);assert(tides(sparse).every(({p})=>p.stage==='first'));assert.deepEqual(E.invariants(sparse),[]);
 const none=E.create({...config('river'),initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:false}});assert.equal(tides(none).length,0);assert.deepEqual(E.invariants(none),[]);
});
test('replay keeps prior founder rules and prevents the prior signature from claiming new allocation',()=>{
 const prior='37ea035eae30eeb8b191c11b5498b721b5e37bf7aca8e9f8607402d8afc5cdb1';
 for(const widened of [false,true]){const w=E.create(widened?config('river'):base);let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v};
  const oldArchive=A.create(storage,E,prior),record=oldArchive.capture(w,'user',observation(w,prior));oldArchive.save(record);const current=A.create(storage,E,globalThis.EcoReplayVersion);
  if(widened)assert.throws(()=>current.replay(record.id),/計算版/);else assert.equal(current.replay(record.id).config.primaryParasiteSettings.version,'primary-parameters/1');
 }
 const w=E.create(config('river'));let raw;const storage={getItem:()=>raw,setItem:(_,v)=>raw=v},a=A.create(storage,E,globalThis.EcoReplayVersion),r=a.capture(w,'user',observation(w,globalThis.EcoReplayVersion));a.save(r);assert.equal(E.fingerprint(E.create(a.replay(r.id).config)),r.finalFingerprint);
});
