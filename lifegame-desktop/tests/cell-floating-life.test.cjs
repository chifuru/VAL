'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace,N=E.N.CellResources;
const base={seed:'cell-floating',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0,freshwaterlight:0,waterbug:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',ageModel:'life/1',ecologyRevision:'observation/4.1'};
function fixture(){const w=structuredClone(E.create(base));for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ'])w[k]=[];
 w.tiles=w.tiles.map((t,i)=>({...t,terrain:[18,19,20].includes(i)?'shallow':'plain',env:[18,19,20].includes(i)?5:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings({aquaticProfile:'freshwater-comparison/1'});C.initialize(w);w.turn=1;return w;}
function add(w,id,species='freshwaterlight',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{birthReady:1000,age:40,E:0,M:0,...options});C.assign(w,o);w.organisms.push(o);return o;}
function group(w,id,options={}){const o=add(w,id,'waterbug',{age:10,B:2,E:0,M:0,...options});o.consumerGroup.cohorts=[{age:10,phase:1,n:1,B:o.B}];o.HP=S.spec(o).capacity[3];return o;}
function island(w,sites=[18,19]){w.tiles.forEach((t,i)=>{t.blocked=!sites.includes(i);});}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w,e=E,intents={}){const c=e.context(w);e.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,intents[o.id]||{type:'stop',cell:o.cell,path:[],cost:0});e.B.move(w,c);e.N.payActions(w,c);return c;}
function step(w,e=E,intents={}){const c=ready(w,e,intents);e.cellLife(w,c);return c;}
function near(a,b,eps=.00007){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}

test('all phases/ages retain mobile producer physiology and one real initial body M',()=>{
 for(const phase of [1,2,3,4])for(const age of [0,40,200]){const w=fixture(),o=add(w,'plant','freshwaterlight',{phase,age,branch3:2,branch4:1});const p=S.phenotype(w,o),matter=structuredClone(o.cellMatter);S.CellLife.attach(w,o);
  assert.equal(C.layer(o),4);assert.equal(S.spec(o).group,'plant');assert.equal(o.slot,'producer');assert.equal(o.cellLife,undefined);assert.equal(p.speed,1);assert.equal(o.birthLife,240);assert.equal(p.capE,S.round(36*[0,1,1.15,1.35,1.6][phase]));assert.deepEqual(o.cellMatter,matter);near(matter.bodyM,.02*o.B);assert(o.plant.capacityB>0);ledger(w);conserved(w);
 }
});

test('movement and photosynthesis use the actual arrival cell and pay the path once',()=>{
 const w=fixture(),o=add(w,'plant','freshwaterlight',{E:10,M:1,B:18});island(w);w.cellProfiles.profiles[18].lightBudget=0;ledger(w);const c=step(w,E,{plant:{type:'move',cell:19,path:[19],cost:999}}),light=c.records.get(o.id).light;
 assert.equal(o.cell,19);near(light,2.2);near(o.E,10-.3+light-c.cellResources.budgets.get(o.id).paid.E);assert.equal(c.events.get(o.id).filter(e=>e.type==='move').length,1);assert.equal(c.events.get(o.id).filter(e=>e.type==='light').length,1);assert(c.cellResources.receipts.filter(r=>r.actor===o.id).every(r=>r.cell===19));assert.equal(o.G,0);conserved(w);
});

test('bare membranes produce no light, while stored E/M can fund a bounded recovery',()=>{
 for(const energy of [0,8]){const w=fixture(),o=add(w,'bare','freshwaterlight',{B:2,E:energy,M:.5});ledger(w);const c=step(w);near(w.ledger.solar,0);assert.equal(c.records.get(o.id).light,0);if(energy){assert(o.B>2);assert(o.cellMatter.newEdibleB>0);assert(o.E>=2);}else{near(o.B,2);assert(o.HP<28);assert(o.plant.activity<1);}conserved(w);}
});

test('old membranes may shade but actual water limits synthesis and full reserves add no free energy',()=>{
 const w=fixture(),o=add(w,'plant','freshwaterlight',{B:18}),c=ready(w);w.cellState.water[18]=.1;ledger(w);const d=N.lifeDemands(w,c);N.acquire(w,c,d.requests,d.canopies);near(o.E,.26);near(w.cellState.water[18],0);near(w.ledger.solar,.26);assert(c.cellResources.light[0].captured>.26);conserved(w);
 const v=fixture(),p=add(v,'full','freshwaterlight',{B:18,M:4,E:36});ledger(v);const cv=ready(v),dv=N.lifeDemands(v,cv);N.acquire(v,cv,dv.requests,dv.canopies);near(p.E,36);near(v.ledger.solar,0);conserved(v);
});

test('newly formed membrane cannot be eaten until the next turn',()=>{
 const w=fixture(),o=add(w,'plant','freshwaterlight',{B:2,E:8,M:1}),g=group(w,'consumer');ledger(w);const c=step(w);assert(o.B>2);assert(!c.cellResources.receipts.some(r=>r.actor===g.id&&r.kind==='food'));
 assert(!N.lifeDemands(w,c).requests.some(r=>r.actor===g.id&&r.kind==='food'));conserved(w);w.turn++;const next=ready(w),d=N.lifeDemands(w,next);assert(d.requests.some(r=>r.actor===g.id&&r.kind==='food'&&r.source.id===o.id));N.acquire(w,next,d.requests.filter(r=>r.actor===g.id),d.canopies);assert(g.E>0);conserved(w);
});

test('mature phase-I birth occupies a nearby fourth-layer slot and charges matter once',()=>{
 const w=fixture(),mother=add(w,'mother','freshwaterlight',{age:40,B:18,E:20,M:1,birthReady:0});island(w);ledger(w);const c=step(w),born=c.children.find(o=>o.species==='freshwaterlight');assert(born);assert.equal(born.cell,19);assert.equal(C.layer(born),4);assert.equal(born.phase,1);assert.equal(born.age,0);assert.equal(born.G,0);assert.equal(born.sex,null);assert.deepEqual(born.parents,[mother.id]);near(born.B,2);near(born.E,6);near(born.M,.2);near(born.cellMatter.bodyM,.04);assert(!c.old.has(born.id));assert(!c.cellResources.receipts.some(r=>r.actor===born.id));assert.equal(c.births.length,1);near(w.ledger.sinks,c.cellResources.budgets.get(mother.id).paid.E+2);assert(mother.birthReady>1);conserved(w);
});

test('full shared settlement slots and failed M reservation cause no failed-birth charge',()=>{
 for(const full of [false,true]){const w=fixture(),mother=add(w,'mother','freshwaterlight',{B:18,E:20,M:full?1:.21,birthReady:0});island(w);if(full){for(let i=0;i<3;i++)add(w,'resident'+i,'crystal',{cell:19,E:50,M:30});}else w.tiles[18].soilM=0;
  ledger(w);const c=step(w);assert(!c.children.some(o=>o.species==='freshwaterlight'));near(mother.E,20+c.records.get(mother.id).light-c.cellResources.budgets.get(mother.id).paid.E);assert(!mother.plant.window.some(r=>r.allocation[1]>0));conserved(w);
 }
});

test('juvenile phase-IV does not reproduce; birth retains DNA origin without cloning P/Q',()=>{
 const young=fixture(),j=add(young,'young','freshwaterlight',{phase:4,age:0,B:34,E:40,M:1,birthReady:0,branch3:1,branch4:1});island(young);ledger(young);const y=step(young);assert(!y.children.length);assert.equal(j.age,1);conserved(young);
 const w=fixture(),p=add(w,'mother','freshwaterlight',{B:18,E:30,M:1,birthReady:0});island(w);p.infection=S.infection(w,'tideparasite',p.id,0,p.id);p.infection.q=S.hyper(w,p.infection.id,0);const infection=p.infection,q=infection.q;ledger(w);const c=step(w),born=c.children.find(o=>o.species==='freshwaterlight');assert(born);assert.equal(p.infection, infection);assert.equal(p.infection.q,q);assert(!born.infection);assert.equal(w.organisms.filter(o=>o.infection?.id===infection.id).length,1);assert.equal(born.plant.origin.parentId,p.id);for(const axis of S.DNA)assert(Math.abs(born.dna[axis]-p.dna[axis])<=.050001);conserved(w);
});

test('existing experience gates and all six branches spend real costs without refills or rejuvenation',()=>{
 for(const next of [2,3,4])for(const branch3 of next===4?[0,1,2]:[0])for(const side of next===4?[0,1]:[0]){const w=fixture(),phase=next-1,o=add(w,'plant','freshwaterlight',{phase,branch3:phase===3?branch3:null,branch4:null,B:2+[0,16,20,24][phase],E:20,M:1,G:[0,0,11,35,79][next]});island(w,[18]);o.plant.maintainedRemainder=1;
  const allocation=next===3?[0,100,0]:[0,0,0],sides=[[0,0],[0,0],[0,0]];if(next===4)sides[branch3][side]=100;o.plant.window=[{turn:0,allocation,sides}];const body=o.B,life=o.birthLife;ledger(w);const c=step(w),b=c.cellResources.budgets.get(o.id);
  assert.equal(o.phase,next);assert.equal(c.traits.get(o.id).phase,phase);assert.equal(o.age,41);assert.equal(o.birthLife,life);near(o.B,body);if(next===3)assert.equal(o.branch3,1);if(next===4)assert.equal(o.branch4,side);assert.equal(b.tickets.get('phase/'+o.id).state,'paid');assert(o.E<20+c.records.get(o.id).light-b.paid.E);conserved(w);
 }
});

test('age and starvation each create one finite next-T corpse including bound M',()=>{
 for(const reason of ['age','starvation']){const w=fixture(),o=add(w,'plant','freshwaterlight',{B:2,E:reason==='age'?10:0,M:0,age:reason==='age'?239:40});if(reason==='starvation')o.HP=.01;const mass=S.totals(w);ledger(w);const c=step(w);assert(!w.organisms.includes(o));assert(c.deaths.some(r=>r.id===o.id&&r.reason===reason));assert.equal(w.carcasses.length,1);assert.equal(w.carcasses[0].availableAt,2);near(w.carcasses[0].M,mass.M-w.tiles.reduce((n,t)=>n+t.soilM,0)-w.cellState.nextMaterial.reduce((n,r)=>n+r.M,0));conserved(w);}
});

test('plant food includes all fourth-layer plants, excludes ordinary main bodies and preserves protection',()=>{
 const w=fixture(),a=add(w,'a','freshwaterlight',{B:3,phase:4,branch3:2,branch4:0}),b=add(w,'b','freshwaterlight',{B:3}),main=add(w,'main','crystal',{E:50,M:30}),g=group(w,'consumer');ledger(w);const c=ready(w);c.cellFoodLimits=new Map([[g.id,10]]);const d=N.lifeDemands(w,c),food=d.requests.filter(r=>r.actor===g.id&&r.kind==='food');assert.deepEqual(new Set(food.map(r=>r.source.id)),new Set([a.id,b.id]));assert(!food.some(r=>r.source.id===main.id));N.acquire(w,c,food,d.canopies);near(a.B,2.2);near(b.B,2);conserved(w);
});

test('three-T source/generated and Worker/JSON preserve floating birth/growth, and public guards remain',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),T=require('../src/ecology/transport.js'),A=require('../src/ecology/archive.js'),w=fixture();add(w,'mother','freshwaterlight',{B:16,E:24,M:1,birthReady:0,G:11});island(w);ledger(w);const v=structuredClone(w),before=structuredClone(w),encode=T.encoder(w);
 for(let turn=1;turn<=3;turn++){for(const [world,e]of [[w,E],[v,G]]){world.turn=turn;step(world,e);conserved(world);}assert.deepEqual(v,w);}assert(w.organisms.length>1);assert.deepEqual(T.apply(before,JSON.parse(JSON.stringify(encode(w,true)))),w);
 assert.throws(()=>E.beginTurn(w),/CELL_MODEL_INCOMPLETE/);assert.throws(()=>A.create({getItem:()=>null,setItem(){}},E,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});

test('floating life requires a settled budget and cannot spend twice',()=>{
 const w=fixture();add(w,'plant','freshwaterlight',{B:18,E:20,M:1});ledger(w);const early=ready(w);assert.throws(()=>E.R.CellFloating.advance(w,early,N),/BEFORE_BUDGET/);E.cellLife(w,early);const after=structuredClone(w);assert.throws(()=>E.R.CellFloating.advance(w,early,N),/ALREADY_APPLIED/);assert.deepEqual(w,after);conserved(w);
});

test('reversing the actor array preserves competing births, physical slots and phase results',()=>{
 const w=fixture();for(const id of ['a','b'])add(w,id,'freshwaterlight',{phase:2,B:22,E:30,M:1,G:35,birthReady:0});island(w,[18,19,20]);ledger(w);const v=structuredClone(w);v.organisms.reverse();step(w);step(v);
 const normalized=world=>({...world,organisms:world.organisms.slice().sort((a,b)=>S.compare(a.id,b.id))});assert.deepEqual(normalized(v),normalized(w));assert(w.organisms.length>2);conserved(w);conserved(v);
});

test('a full energy store still observes captured light when selecting the production branch',()=>{
 const w=fixture(),o=add(w,'plant','freshwaterlight',{phase:3,branch3:0,branch4:null,B:26,E:48.6,M:4,G:79});island(w,[18]);o.plant.maintainedRemainder=1;ledger(w);const c=step(w);near(w.ledger.solar,0);assert(c.records.get(o.id).solarOpportunityE>2*c.traits.get(o.id).maintenance);assert.equal(o.phase,4);assert.equal(o.branch4,0);conserved(w);
});
