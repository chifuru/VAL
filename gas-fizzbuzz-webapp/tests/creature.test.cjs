'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../src/Index.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const sandbox={window:{},module:{exports:{}},console};
vm.runInNewContext(scripts[0],sandbox,{timeout:5000});
vm.runInNewContext(scripts[1],sandbox,{timeout:5000});
const e=sandbox.module.exports,C=sandbox.window.ASSET_CONFIG;
const valis=i=>i%25<18?'signal':i%25<22?'heat':'void';
const anti=i=>i%4===0?'signal':'void';
test('embedded game has three script blocks and interactive creature UI',()=>{
  assert.equal(scripts.length,3);
  for(const id of ['creatureCanvas','fizzbuzzLog','runButton','evolutionHistory','partList','references'])
    assert.ok(html.includes('id="'+id+'"'),id);
});
test('asset archive includes nine refs, 35 body/part PNGs and 24 lineage images',()=>{
  assert.equal(C.references.length,9);
  assert.equal(Object.keys(C.core).length,2);
  assert.equal(Object.keys(C.partImages).length,11);
  assert.equal(Object.keys(C.lineageImages).length,12);
  assert.equal(Object.values(C.lineageImages).flat().length,24);
  assert.ok(Object.values(C.sources).length>=68);
  assert.ok(Object.values(C.sources).every(v=>v.startsWith('data:image/')));
});
test('original FizzBuzz strings 1..N and priority remain unchanged',()=>{
  for(const n of [1,15,100,1000]){
    const rows=Array.from(e.linesFor(n));
    assert.equal(rows.length,n);
    rows.forEach((v,i)=>{const j=i+1;assert.equal(v,j%15===0?'FizzBuzz':j%3===0?'Fizz':j%5===0?'Buzz':String(j));});
  }
});
test('invalid seeds, inputs and malformed food are rejected',()=>{
  for(const n of [0,-1,1001,1.5,NaN,Infinity])assert.throws(()=>e.linesFor(n));
  for(const text of ['FizzBuz','-7','0','1.5',''])assert.throws(()=>e.step(e.initial(50),text,'tide'));
});
test('all fourteen lineages remain independently reachable at their niches',()=>{
  assert.equal(e.LINEAGES.length,14);
  assert.equal(new Set(e.LINEAGES.map(l=>l.id)).size,14);
  assert.equal(new Set(e.LINEAGES.map(l=>l.mark)).size,14);
  const keys=['tide','heat','signal','void'];
  for(const l of e.LINEAGES){
    const exposure=Object.fromEntries(keys.map((k,i)=>[k,Math.round(l.niche[i]*100)]));
    const steps=Object.values(exposure).reduce((a,b)=>a+b,0);
    const envs=keys.flatMap((k,i)=>Array(Math.round(l.niche[i]*12)).fill(k));
    assert.equal(e.chooseLineage({exposure,steps,envs,foods:Array(12).fill('number')}),l.id,l.id);
  }
});
test('DNA has six immutable axes and birth is uncommitted',()=>{
  const a=e.initial(70),b=e.initial(70);
  assert.equal(a.lineage,null);assert.equal(JSON.stringify(a.dna),JSON.stringify(b.dna));
  assert.ok(Object.isFrozen(a.dna));
  for(const k of ['body','appendage','senses','skin','aptitude','sensitivity'])
    assert.ok(a.dna[k]>=0&&a.dna[k]<1,k);
});
test('revelation lineage selects six LV organ images',()=>{
  const c=e.runAll(400,valis);
  assert.equal(c.history[0].lineage,'valis');assert.equal(c.history[1].lineage,'valis');
  assert.equal(e.phenotype(c).length,6);
  assert.ok(e.phenotype(c).some(p=>p.level===3));
});
test('anti-memory lineage selects five LV organ images',()=>{
  const c=e.runAll(400,anti);
  assert.equal(c.history[0].lineage,'antimeme');assert.equal(c.history[1].lineage,'antimeme');
  assert.equal(e.phenotype(c).length,5);
});
test('phase changes allow crossing without discarding acquired organs',()=>{
  let c=e.initial(600);
  for(const [i,line] of e.linesFor(600).entries())c=e.step(c,line,c.stage===0?valis(i):anti(i));
  assert.equal(c.history[0].lineage,'valis');assert.equal(c.history[1].lineage,'antimeme');
  assert.ok(c.heritage.some(x=>x.lineage==='valis'&&x.parts.some(p=>p.level>0)));
});
test('phase thresholds remain 10 and 35, maturation 100; phase IV is not unlocked',()=>{
  assert.equal(e.stageFor(9.99),0);assert.equal(e.stageFor(10),1);assert.equal(e.stageFor(35),2);
  const c=e.runAll(1000,'signal');
  assert.equal(c.stage,2);assert.equal(c.history.length,2);
  assert.ok(e.LINEAGES.every(l=>l.finalName&&!l.names.includes(l.finalName)));
});
test('maturation freezes the external part structure while N-row replay finishes',()=>{
  let c=e.initial(800),freeze=null;
  for(const line of e.linesFor(800)){c=e.step(c,line,'signal');if(c.matured&&!freeze)freeze=JSON.stringify(c.partXp);}
  assert.equal(c.points,100);assert.equal(c.current,800);assert.equal(JSON.stringify(c.partXp),freeze);
});
test('independent organs support LV0->LV1->LV2->LV3 at XP 0/1/6/16',()=>{
  assert.deepEqual([0,1,5,6,15,16,17].map(e.levelFor),[0,1,1,2,2,3,3]);
  assert.equal(e.PART_DEFINITIONS.valis.length,6);assert.equal(e.PART_DEFINITIONS.antimeme.length,5);
});

test('guided environment preset reaches all fourteen branches by ordinary niche scoring',()=>{
  for(const family of e.LINEAGES){
    let state=e.initial(500);
    for(const line of e.linesFor(500))state=e.step(state,line,e.plannedEnvironment(state,family.id));
    assert.equal(state.history[0].lineage,family.id);
    assert.equal(state.history[1].lineage,family.id);
  }
});
