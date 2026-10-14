'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const E=require('../src/composite/creature-engine.js');
const D=require('../src/composite/lineage-definitions.js');

const json=value=>JSON.parse(JSON.stringify(value));
function consume(seed,environment,changeDNA){
 let state=E.initial(seed);
 if(changeDNA)state.dna=Object.freeze({...state.dna,...changeDNA});
 const states=[];
 for(const [i,line] of E.linesFor(seed).entries()){
  state=E.step(state,line,typeof environment==='function'?environment(state,i):environment||'signal');
  states.push(state);
 }
 return {state,states};
}

test('1000-row energy calibration uses exact integer phase boundaries and finishes every row',()=>{
 const {state,states}=consume(1000,'signal');
 for(const [row,quarters,stage,matured] of [[279,501,0,false],[280,505,1,false],[620,1113,1,false],[621,1117,2,false],[999,1797,2,false],[1000,1801,2,true]]){
  const actual=states[row-1];
  assert.equal(actual.energyQuarters,quarters,'energy at row '+row);
  assert.equal(actual.stage,stage,'phase at row '+row);
  assert.equal(actual.matured,matured,'maturity at row '+row);
 }
 assert.equal(state.current,1000);
 assert.equal(state.points,100);
 assert.equal(state.energy,450.25);
 assert.deepEqual(state.history.map(entry=>entry.step),[280,621]);
 assert.deepEqual(state.foods,{number:533,fizz:267,buzz:134,fizzbuzz:66});
 assert.deepEqual(state.regulation,{promote:267,inhibit:266});
});

test('small N finishes at its actual partial development; N does not rescale maturity',()=>{
 for(const [seed,stage] of [[1,0],[15,0],[100,0],[279,0],[280,1],[500,1],[620,1],[621,2],[999,2]]){
  const state=E.runAll(seed,'heat');
  assert.equal(state.current,seed);
  assert.equal(state.stage,stage,'N='+seed);
  assert.equal(state.matured,false);
  assert.ok(state.points<100);
 }
 const a=consume(500,'tide').states[278],b=consume(1000,'tide').states[278];
 assert.equal(a.energyQuarters,b.energyQuarters,'common FizzBuzz prefix has the same energy');
 assert.equal(a.points,b.points);
});

test('FizzBuzz output is unchanged and invalid seeds, foods and environments are rejected',()=>{
 for(const seed of [1,15,1000]){
  const rows=E.linesFor(seed);
  assert.equal(rows.length,seed);
  rows.forEach((line,index)=>{
   const n=index+1;assert.equal(line,n%15===0?'FizzBuzz':n%3===0?'Fizz':n%5===0?'Buzz':String(n));
  });
 }
 for(const seed of [0,-1,1001,1.5,NaN,Infinity]){
  assert.throws(()=>E.initial(seed));assert.throws(()=>E.linesFor(seed));assert.throws(()=>E.dnaFor(seed));
 }
 for(const value of ['',null,'0','-2','1.5','FizzBuz','9007199254740993'])assert.throws(()=>E.step(E.initial(1000),value,'tide'));
 assert.throws(()=>E.step(E.initial(1000),'1','rain'));
});

test('latest numeric modifier applies once to the next nutrient; lastMeal describes that exact ingestion',()=>{
 let state=E.initial(1000);
 const birth=state,original=json(state);
 state=E.step(state,'1','tide');
 assert.deepEqual(state.lastMeal,{kind:'number',modifier:1,quarters:0,sequence:1});
 assert.equal(state.energyQuarters,0);
 state=E.step(state,'2','tide');
 assert.equal(state.modifier,-1);
 state=E.step(state,'Fizz','tide');
 assert.deepEqual(state.lastMeal,{kind:'fizz',modifier:-1,quarters:3,sequence:3});
 assert.equal(state.modifier,0);
 state=E.step(state,'Buzz','tide');
 assert.deepEqual(state.lastMeal,{kind:'buzz',modifier:0,quarters:4,sequence:4});
 assert.equal(state.energyQuarters,7);
 assert.deepEqual(json(birth),original,'stepping does not mutate an earlier state');
});

test('14 species and all 75 anatomical groups retain qualified IDs, anchors and repetition counts',()=>{
 assert.equal(D.LINEAGES.length,14);assert.equal(D.PART_GROUP_COUNT,75);
 assert.equal(new Set(D.LINEAGES.map(lineage=>lineage.id)).size,14);
 const keys=new Set(),anchors=new Set(['head','eye','mouth','dorsal','shoulder','flank','chest','forelimb','hindlimb','tailBase','tailTip','outerOrbit']);
 for(const lineage of D.LINEAGES){
  const state={...E.initial(480),lineage:lineage.id};
  const parts=E.phenotype(state);
  assert.equal(parts.length,D.PART_DEFINITIONS[lineage.id].length);
  for(const [index,part] of parts.entries()){
   const definition=D.PART_DEFINITIONS[lineage.id][index],key=part.lineage+':'+part.id;
   assert.ok(!keys.has(key));keys.add(key);
   assert.equal(part.label,definition[1]);assert.equal(part.anchor,definition[2]);assert.equal(part.count,definition[5]);
   assert.ok(anchors.has(part.anchor));assert.ok(Number.isInteger(part.count)&&part.count>=1);
  }
 }
 assert.equal(keys.size,75);
 assert.ok(keys.has('memory:signalTail')&&keys.has('valis:signalTail'));
 assert.ok(Object.isFrozen(D.PART_DEFINITIONS.valis[0]));
 assert.throws(()=>{D.PART_DEFINITIONS.valis[0][5]=99;});
});

test('all fourteen branches remain reachable by actual environment histories at both phase entries',()=>{
 for(const lineage of E.LINEAGES){
  const {state}=consume(1000,current=>E.plannedEnvironment(current,lineage.id));
  assert.deepEqual(state.history.map(entry=>entry.lineage),[lineage.id,lineage.id]);
  assert.equal(state.matured,true);
 }
});

test('cross-evolution preserves every acquired organ including the final meal before transformation',()=>{
 const {state,states}=consume(1000,current=>E.plannedEnvironment(current,current.stage===0?'valis':'antimeme'));
 assert.deepEqual(state.history.map(entry=>entry.lineage),['valis','antimeme']);
 const before=states[619],transition=states[620],inherited=transition.heritage[0];
 assert.equal(inherited.parts.length,6,'there is no three-organ display cap in saved growth data');
 assert.equal(inherited.lineage,'valis');
 for(const part of inherited.parts){
  const key='valis:'+part.id;
  assert.equal(part.xp,transition.partXp[key],'the crossing meal is included');
  assert.ok(part.xp>=before.partXp[key]);
 }
 assert.ok(E.appearanceFor(state).inheritedOrgans.some(part=>part.id==='lightKernel'));
 assert.ok(E.appearanceFor(state).inheritedOrgans.some(part=>part.id==='detachedNode'));
 assert.ok(E.appearanceFor(state).inheritedOrgans.some(part=>part.id==='signalTail'));
});

test('organ XP remains independent, matures over hundreds of rows and keeps growing within a level',()=>{
 const {state,states}=consume(1000,current=>E.plannedEnvironment(current,'valis'));
 assert.deepEqual(E.THRESHOLDS,[1,180,600]);
 assert.deepEqual([0,1,179,180,599,600].map(E.levelFor),[0,1,1,2,2,3]);
 assert.ok(E.phenotype(states[329]).every(part=>part.level<3),'no fully grown organ within fifty rows of first branching');
 const parts=E.phenotype(state);
 assert.ok(new Set(parts.map(part=>part.xp)).size>1);
 assert.ok(new Set(parts.map(part=>part.level)).size>1,'not every organ becomes the same level at maturation');
 const id=E.PART_DEFINITIONS.valis[0][0];
 const a={...state,matured:false,partXp:{['valis:'+id]:200}},b={...a,partXp:{['valis:'+id]:400}};
 assert.equal(E.phenotype(a)[0].level,2);assert.equal(E.phenotype(b)[0].level,2);
 assert.ok(E.phenotype(b)[0].growth>E.phenotype(a)[0].growth);
});

test('all seven basic body regions continuously develop and react to actual consumed energy',()=>{
 const {states}=consume(1000,'heat');
 const birth=E.appearanceFor(E.initial(1000)),earlier=E.appearanceFor(states[99]),later=E.appearanceFor(states[249]),final=E.appearanceFor(states[999]);
 for(const key of E.BODY_PARTS){
  assert.ok(earlier.anatomy[key].growth>birth.anatomy[key].growth,key+' first development');
  assert.ok(later.anatomy[key].growth>earlier.anatomy[key].growth,key+' ongoing development');
  assert.ok(final.anatomy[key].growth>later.anatomy[key].growth,key+' final development');
  assert.ok(final.anatomy[key].scaleX>birth.anatomy[key].scaleX,key+' visible width');
  assert.ok(final.anatomy[key].scaleY>birth.anatomy[key].scaleY,key+' visible height');
 }
 let last=Object.fromEntries(E.BODY_PARTS.map(key=>[key,0]));
 for(const state of states){
  const appearance=E.appearanceFor(state);
  for(const key of E.BODY_PARTS){assert.ok(appearance.anatomy[key].growth>=last[key],key+' does not lose acquired growth');last[key]=appearance.anatomy[key].growth;}
 }
 assert.ok(final.volume>birth.volume);
});

test('each species expresses a distinct whole-body profile while retaining the same birth DNA',()=>{
 const source=E.runAll(850,'heat');
 const profiles=E.LINEAGES.map(lineage=>{
  const state={...source,lineage:lineage.id},appearance=E.appearanceFor(state);
  assert.deepEqual(appearance.dna,source.dna);
  return JSON.stringify(appearance.anatomy);
 });
 assert.equal(new Set(profiles).size,14,'species differences include the underlying body rather than only overlay organs');
});

test('all six DNA axes cause real anatomy, pigment or organ differences without changing energy timing',()=>{
 assert.deepEqual(E.dnaFor(480),E.dnaFor(480));
 assert.notDeepEqual(E.dnaFor(480),E.dnaFor(481));
 for(const axis of ['body','appendage','senses','skin','aptitude','sensitivity']){
  const a=consume(850,'heat',{[axis]:.05}).state,b=consume(850,'heat',{[axis]:.95}).state;
  assert.equal(a.energyQuarters,b.energyQuarters,axis+' does not invalidate the 1000-row calibration');
  const ap=E.appearanceFor(a),bp=E.appearanceFor(b);
  if(axis==='skin')assert.notDeepEqual(ap.color,bp.color,'skin pigment');
  else if(axis==='aptitude'||axis==='sensitivity'){
   assert.notDeepEqual(a.partXp,b.partXp,axis+' organ expression');
   assert.notDeepEqual(ap.anatomy,bp.anatomy,axis+' whole-body expression');
  }else assert.notDeepEqual(ap.anatomy,bp.anatomy,axis+' anatomy');
  assert.ok(Object.isFrozen(a.dna));
 }
});

test('nutrition proportions affect color; numbers remain regulators rather than a fourth pigment',()=>{
 const state=E.initial(480);
 const blue={...state,foods:{number:0,fizz:30,buzz:0,fizzbuzz:0}};
 const gold={...state,foods:{number:0,fizz:0,buzz:30,fizzbuzz:0}};
 const purple={...state,foods:{number:0,fizz:0,buzz:0,fizzbuzz:30}};
 assert.notDeepEqual(E.appearanceFor(blue).color,E.appearanceFor(gold).color);
 assert.notDeepEqual(E.appearanceFor(blue).color,E.appearanceFor(purple).color);
 assert.deepEqual(E.appearanceFor(blue).color,E.appearanceFor({...blue,foods:{...blue.foods,number:200}}).color);
 assert.notDeepEqual(E.appearanceFor(state).color,E.appearanceFor(blue).color);
});

test('maturation snapshots include the last meal and stay immutable while later meals and counters continue',()=>{
 const state=E.runAll(1000,'signal'),snapshot=E.appearanceFor(state),xp=json(state.partXp),body=json(state.tissueEnergy);
 assert.equal(state.lastMeal.sequence,1000);assert.equal(state.lastMeal.kind,'buzz');
 assert.equal(state.lastMeal.quarters,4);
 assert.deepEqual(snapshot.organs,E.phenotype(state));
 assert.ok(Object.isFrozen(snapshot));assert.ok(Object.isFrozen(snapshot.anatomy.torso));
 assert.throws(()=>{snapshot.anatomy.torso.scaleX=0;});
 let continued=E.step(state,'1','heat');continued=E.step(continued,'FizzBuzz','void');
 assert.equal(continued.current,1002);assert.equal(continued.foods.number,state.foods.number+1);
 assert.equal(continued.foods.fizzbuzz,state.foods.fizzbuzz+1);
 assert.equal(continued.lastMeal.modifier,1);assert.equal(continued.lastMeal.quarters,5);
 assert.equal(continued.points,100);
 assert.deepEqual(continued.partXp,xp);assert.deepEqual(continued.tissueEnergy,body);
 assert.strictEqual(E.appearanceFor(continued),snapshot);
 assert.deepEqual(E.appearanceFor(json(continued)),json(snapshot),'saved records retain the mature appearance');
});

test('JSON resume and chunked playback preserve exact outcomes through changed environments and skipping',()=>{
 const env=state=>state.current<350?'tide':state.current<720?'heat':'void';
 const normal=consume(1000,env).state;
 let chunked=E.initial(1000);
 for(const [i,line] of E.linesFor(1000).entries()){
  if([15,278,280,500,620,621,800].includes(i))chunked=json(chunked);
  chunked=E.step(chunked,line,env(chunked));
 }
 assert.deepEqual(json(chunked),json(normal));
 assert.deepEqual(E.appearanceFor(chunked),E.appearanceFor(normal));
});

test('browser and Node UMD load the same definitions and deterministic growth engine',()=>{
 const sandbox={};sandbox.globalThis=sandbox;
 for(const file of ['lineage-definitions.js','creature-engine.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/composite',file),'utf8'),sandbox,{timeout:1000});
 assert.equal(sandbox.LineageDefinitions.PART_GROUP_COUNT,75);
 assert.deepEqual(json(sandbox.CreatureEngine.runAll(1000,'tide')),json(E.runAll(1000,'tide')));
 assert.deepEqual(json(sandbox.CreatureEngine.appearanceFor(sandbox.CreatureEngine.runAll(850,'heat'))),json(E.appearanceFor(E.runAll(850,'heat'))));
});
