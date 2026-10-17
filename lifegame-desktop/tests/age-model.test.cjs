"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const F=require('./ecology-fixtures.cjs'),{E,S}=F;
function world(){const w=F.world();w.config.ageModel='life/1';return w;}
function main(w,id,age,phase=3,more={}){return F.add(w,'solar',id,2,2,{age,phase,E:90,M:10,...more});}
test('age is independent of all four phases and frozen to birth DNA lifetime',()=>{
 const w=world(),o=main(w,'age',0),basis=o.birthLife;
 for(const phase of [1,2,3,4]){
  o.phase=phase;
  for(const [age,stage] of [[0,'juvenile'],[Math.ceil(basis*.1),'adult'],[Math.floor(basis*.75),'elderly']]){
   o.age=age;assert.equal(S.ageInfo(o).stage,stage);assert.equal(o.birthLife,basis);
  }
 }
 const early=F.add(w,'precocial','early',2,3,{age:0});
 assert.equal(S.ageInfo(early).matureAt,Math.ceil(early.birthLife*.03));
 assert.equal(S.phenotype(w,early).maxHP,90);
 assert.equal(S.phenotype(w,early).ageFactors.attack,.9);
});
test('age changes effective combat, movement and maintenance without changing range or free resources',()=>{
 const w=world(),o=main(w,'values',30),adult=S.phenotype(w,o),c=F.ready(w),base=E.B.power(w,o,'attack',c);
 const baseMove=E.B.moveCost(w,o,S.index(w,3,2));
 o.age=0;const young=S.phenotype(w,o),cy=E.context(w);
 assert.equal(young.maxHP,70);assert.equal(young.maintenance/adult.maintenance,.8);
 assert(Math.abs(E.B.power(w,o,'attack',cy)/base-.65)<1e-10);
 assert(Math.abs(E.B.moveCost(w,o,S.index(w,3,2))/baseMove-1.1)<1e-10);
 assert.equal(young.range,adult.range);assert.equal(young.sense,adult.sense);assert.equal(young.speed,adult.speed);
 const f=F.add(w,'grass','plant',5,5,{age:0}),cf=E.context(w);
 assert.equal(E.B.power(w,f,'attack',cf),0);assert.equal(E.B.power(w,f,'defense',cf),0);
 const before=S.totals(w);S.settleAge(w,cy);assert.deepEqual(S.totals(w),before);
});
test('crossing age boundaries does not heal, pay resources, or create combat damage',()=>{
 const w=world(),o=main(w,'maturing',0,1,{HP:30});o.age=S.ageInfo(o).matureAt-1;F.ready(w);
 const next=E.step(w),grown=next.organisms.find(a=>a.id===o.id);
 assert.equal(S.ageInfo(grown).stage,'adult');assert.equal(grown.HP,30);assert.equal(S.phenotype(next,grown).maxHP,100);assert.deepEqual(E.invariants(next),[]);
 const v=world(),old=main(v,'elder',30,1);old.HP=100;old.age=S.ageInfo(old).elderlyAt-1;F.ready(v);
 const end=E.step(v),elder=end.organisms.find(a=>a.id===old.id);
 assert.equal(S.ageInfo(elder).stage,'elderly');assert.equal(elder.HP,90);
 assert.equal(end.last.ageCapacityLoss,10);assert.equal(end.tallies.causes.combat,0);assert.deepEqual(E.invariants(end),[]);
});
test('maturity is checked at turn start and newborns are first-phase juveniles with inherited birth basis',()=>{
 const w=world(),[a,b]=F.parents(w,'solar');
 for(const o of [a,b]){S.initializeAge(w,o);o.age=S.ageInfo(o).matureAt-1;}
 const c=F.ready(w);for(const o of [a,b])o.age++;
 assert.equal(E.R.eligible(w,a,c),false);
 const next=F.ready(w),children=E.R.reproduce(w,next);
 assert.equal(children.length,1);const child=children[0];assert.equal(child.phase,1);assert.equal(child.age,0);assert.equal(child.G,0);
 assert.equal(S.ageInfo(child).stage,'juvenile');assert.equal(child.birthLife,Math.floor(S.spec(child).life*(.95+.1*child.dna.skin)));
 assert(child.HP<=S.phenotype(w,child).maxHP);
});
test('elderly reproduction remains possible and its cooldown is applied once at actual birth',()=>{
 const w=world(),[a,b]=F.parents(w,'solar');
 for(const o of [a,b]){S.initializeAge(w,o);o.age=S.ageInfo(o).elderlyAt;o.HP=90;}
 const c=F.ready(w),cooldown=c.traits.get(a.id).cooldown;
 assert.equal(E.R.eligible(w,a,c),true);assert.equal(E.R.reproduce(w,c).length,1);
 const deadline=a.birthReady;assert.equal(deadline,w.turn+Math.ceil(cooldown)+1);
 a.age++;a.phase=4;S.settleAge(w,c);assert.equal(a.birthReady,deadline);
});
test('age affects real solar input and paid healing while finite budgets and colony life remain intact',()=>{
 const inputs=[];
 for(const age of [0,10,95]){
  const w=world(),o=F.add(w,'algae','light',2,2,{age,E:0,B:12});const c=F.ready(w);
  inputs.push(c.records.get(o.id).light);assert.deepEqual(E.invariants(w),[]);
 }
 assert(Math.abs(inputs[0]/inputs[1]-.65)<1e-10);assert(Math.abs(inputs[2]/inputs[1]-.85)<1e-10);
 for(const age of [0,30,200]){
  const w=world(),o=main(w,'feed',age,3,{E:35,HP:20}),c=F.ready(w);
  // Paid resource is added to the source ledger, then fully consumed by absorb.
  w.ledger.initialE+=10;const beforeHP=o.HP;
  E.N.absorb(w,o,{E:10,M:0,G:0},'plant',c);
  assert(o.HP>beforeHP);assert(o.HP<=c.traits.get(o.id).maxHP);assert.deepEqual(E.invariants(w),[]);
 }
});
test('age-enabled natural worlds remain deterministic and conserve budgets across repeated runs',()=>{
 for(const seed of ['age-river','age-lake','age-basin']){
  const config={seed,ageModel:'life/1',landscape:'templates',width:40,height:28,initial:80,lineages:'few'};
  const run=()=>{let w=E.create(config);for(let turn=0;turn<100;turn++){
   w=E.step(w);assert.deepEqual(E.invariants(w),[],seed+' turn '+w.turn);
   for(const o of w.organisms)assert(o.HP<=S.phenotype(w,o).maxHP+1e-8);
  }return JSON.stringify(w);};
  assert.equal(run(),run(),seed+' repeat');
 }
});
