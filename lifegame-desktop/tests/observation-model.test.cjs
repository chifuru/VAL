'use strict';
const{test}=require('node:test'),assert=require('node:assert/strict'),M=require('../src/ecology/observation-model.js'),privateModel=require('../design/advantage-switches/model.cjs');
const config=require('../operations/evidence/free-support-v2.8/river-off.json').config;
test('production static profiles exactly match all eight comparison models and isolate catalogues',()=>{
 const models=[];
 for(let bits=0;bits<8;bits++){
  const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},E=M.model(flags),P=privateModel.model(flags);let w=E.create(config),p=P.create(config);
  for(let turn=0;turn<4;turn++){assert.deepEqual(w,p);assert.deepEqual(E.invariants(w),[]);if(turn<3){w=E.step(w);p=P.step(p);}}
  models.push({E,w});
 }
 // Reverse execution catches accidental catalogue/context sharing between profiles.
 for(const {E,w}of models.reverse()){const expected=w.config.advantageSettings.waterbug?600:40;assert.equal(E.S.D.byId.waterbug.life,expected);assert.deepEqual(E.invariants(E.step(w)),[]);}
});
test('profile selection rejects corrupt/versioned settings and cannot silently change replay flags',()=>{
 for(const value of [null,[],{producer:1},{unexpected:true},{version:'unknown'}])assert.throws(()=>M.settings(value));
 assert.throws(()=>M.model({producer:false}).create({...config,advantageSettings:M.settings()}));
 const root={};M.install(root);const {EcoEngine:E,EcoState:S,EcoData:D}=root;
 const w=E.create({...config,advantageSettings:M.settings({waterbug:false})});assert.equal(D.byId.waterbug.life,40);assert.equal(S.D.byId.waterbug.life,40);
 assert.throws(()=>E.create({...config,width:-1}));assert.equal(D.byId.waterbug.life,40);assert.deepEqual(E.invariants(E.step(w)),[]);
});
