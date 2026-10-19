'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../src/ecology/observation-model');
const config={seed:'population-regulation',width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river',ageModel:'life/1',ecologyRevision:'observation/4.1',populationRegulation:{version:1}};
test('regulation settings are explicit and reject corrupt settings',()=>{
 const E=M.model();for(const value of [null,[],{}, {version:2},{version:1,extra:true}])assert.throws(()=>E.create({...config,populationRegulation:value}),/出生調整/);
 assert.deepEqual(E.create(config).config.populationRegulation,{version:1});
 const w=E.create({...config,populationRegulation:undefined}),o=w.organisms[0];assert.equal(E.R.birthPressure(w,o,{}).chance,1);
});
test('local crowding and poor intake reduce birth chance without deleting organisms',()=>{
 const E=M.model(),original=E.create(config),mains=original.organisms.filter(o=>o.slot==='main').slice(0,20),center=10*40+20;
 const run=(count,intake)=>{const w=structuredClone(original);w.organisms=mains.slice(0,count).map((o,i)=>({...o,cell:center+(i%5)-2+40*(Math.floor(i/5)-2)}));for(const t of w.tiles){t.blocked=false;t.terrain='flat';t.env=3;}
 const ctx=E.context(w);for(const o of w.organisms){ctx.traits.set(o.id,E.S.phenotype(w,o));ctx.records.get(o.id).organic=intake;if(!intake)o.E=0;}
 const o=w.organisms[Math.min(12,count-1)],before=w.organisms.length,pressure=E.R.birthPressure(w,o,ctx);assert.equal(w.organisms.length,before);assert(Number.isFinite(pressure.chance)&&pressure.chance>0&&pressure.chance<=1);return pressure;};
 const sparse=run(1,100),crowded=run(20,100),hungry=run(20,0);assert(crowded.chance<sparse.chance);assert(hungry.chance<crowded.chance);
});
test('short regulated progression conserves finite budgets and replays deterministically',()=>{
 const E=M.model();let a=E.create(config),b=E.create(config);for(let t=0;t<15;t++){a=E.step(a);b=E.step(b);assert.deepEqual(E.invariants(a),[]);assert.equal(E.fingerprint(a),E.fingerprint(b));}
 assert(a.organisms.some(o=>o.slot==='main'));assert(a.organisms.some(o=>E.S.spec(o).group==='prey'));
});
