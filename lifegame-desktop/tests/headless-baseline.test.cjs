'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {FLAGS,runCase}=require('../tools/compare-ecology-baseline.cjs'),E=require('../src/ecology/engine.js');
const config={id:'unit',seed:'headless-baseline/unit',width:40,height:28,mapId:'river',initial:16,lineages:'manual',selected:['abyss','recursive','jelly','swarm']};
test('isolated baseline has no trial adjustments and matches exact all-turn records',()=>{
 assert(Object.values(FLAGS).every(v=>v===false));
 const r=runCase(config,{turns:6});assert.equal(r.matchedStates,7);assert.deepEqual(r.rows.map(r=>r.turn),[0,1,2,3,4,5,6]);
 assert.equal(r.config.ecologyRevision,'observation/4.1');assert.equal(r.survival.abyss.continuous150to250,null);
});
test('comparison rejects differences in observation data excluded from biological hashes',()=>{
 const candidate={...E,step(w){const next=E.step(w);next.observation.births+=1;return next;}};
 assert.throws(()=>runCase(config,{turns:1,candidate}),/observation/);
});
