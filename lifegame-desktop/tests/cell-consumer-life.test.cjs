'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace,N=E.N.CellResources;
const base={seed:'cell-consumer-life',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',
 primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',parasiteDispersalModel:'fanout/1',primaryEggModel:'egg/1',informationModel:'persistent/1',ageModel:'life/1',ecologyRevision:'observation/4.1'};
function fixture(){const w=structuredClone(E.create(base));for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();C.initialize(w);w.turn=1;return w;}
const species=S.D.main[0].id;
function add(w,id,kind=species,options={}){const o=S.organism(w,S.D.byId[kind],options.cell??18,id,{birthReady:1000,age:40,...options});if(options.mutated)o.ryouki.mutated=true;C.assign(w,o);w.organisms.push(o);return o;}
function group(w,id,options={}){const o=add(w,id,'grassbug',{age:10,B:2,E:0,M:.05,...options});o.consumerGroup.cohorts=[{age:10,phase:1,n:1,B:o.B}];o.HP=S.spec(o).capacity[3];return o;}
function adult(w,options={}){const q=S.HyperParasite.create(w,null,0,'adult');Object.assign(q,{phase:4,age:20,bornAt:-20,B:.03,E:.5,cell:18,...options});q.hyper.state='adult';q.hyper.settledAt=-1;q.hyper.detachedAt=0;q.hyper.cohort.members=1;w.searchQ.push(q);return q;}
function onlyCell(w,cell=18){w.tiles.forEach((t,i)=>{t.blocked=i!==cell;});}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w,e=E){const c=e.context(w);e.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});e.B.move(w,c);e.N.payActions(w,c);return c;}
function step(w,e=E){const c=ready(w,e);e.cellLife(w,c);return c;}
function near(a,b,eps=.00004){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}

test('full M permits useful energy feeding; full E permits M with finite next-T byproducts',()=>{
 for(const full of ['M','E']){const w=fixture(),o=group(w,'consumer',full==='M'?{E:0,M:.05}:{E:2,M:0});add(w,'food','grass',{B:4,E:0,M:0});ledger(w);const c=ready(w),d=N.lifeDemands(w,c);N.acquire(w,c,d.requests.filter(r=>r.actor===o.id));
  const r=c.cellResources.receipts.find(r=>r.actor===o.id);assert(r&&r.quantity>0);if(full==='M'){assert(o.E>0);near(o.M,.05);assert(w.cellState.nextMaterial.some(r=>r.M>0));}else{near(o.E,2);assert(o.M>0);assert(w.cellState.nextMaterial.some(r=>r.E>0));}conserved(w);
 }
});

test('all co-resident main consumers share the same leaves, while adjacent food and new tissue stay unavailable',()=>{
 const w=fixture(),a=add(w,'a',species,{E:0,M:30}),b=add(w,'b',species,{E:0,M:30}),p=add(w,'food','grass',{B:3,E:0,M:0});add(w,'adjacent','grass',{cell:19,B:22,E:0,M:0});p.cellMatter.newB=p.cellMatter.newEdibleB=.5;p.cellMatter.tissueAt=1;
 ledger(w);const c=ready(w),d=N.lifeDemands(w,c);N.acquire(w,c,d.requests.filter(r=>[a.id,b.id].includes(r.actor)));
 const rs=c.cellResources.receipts.filter(r=>r.kind==='food');assert.equal(rs.length,2);near(rs.reduce((n,r)=>n+r.quantity,0),.5);near(p.B,2.5);near(w.organisms.find(o=>o.id==='adjacent').B,22);assert(a.E>0&&b.E>0);near(a.E,b.E);conserved(w);
});

test('id-less physical resources have distinct finite stocks and information supplies no food',()=>{
 const w=fixture(),o=add(w,'consumer',species,{E:0,M:0});w.resources.push(...[0,1].map(()=>({cell:18,kind:'mineral',q:1,E:0,M:.1,G:0,created:0,expires:null})),{cell:18,kind:'info',q:1,E:10,M:0,created:0,expires:20,event:null});ledger(w);const c=ready(w),d=N.lifeDemands(w,c);
 N.acquire(w,c,d.requests.filter(r=>r.actor===o.id));const rs=c.cellResources.receipts;assert.equal(rs.length,2);assert.equal(new Set(rs.map(r=>r.source)).size,2);assert(o.M>0);near(o.E,0);near(w.resources.find(a=>a.kind==='info').E,10);conserved(w);
});

test('main body minerals are initial matter once; starvation and age preserve one next-T carcass',()=>{
 for(const reason of ['starvation','age']){const w=fixture(),o=add(w,'dying',species,{E:0,M:2,B:8});near(o.cellMatter.bodyM,.16);const matter=structuredClone(o.cellMatter);S.CellLife.attach(w,o);assert.deepEqual(o.cellMatter,matter);
  if(reason==='age')o.age=S.phenotype(w,o).life-1;else o.HP=.01;ledger(w);const c=step(w);assert(!w.organisms.includes(o));assert(c.deaths.some(d=>d.id===o.id&&d.reason===reason));assert.equal(w.carcasses.length,1);near(w.carcasses[0].M,2.16);assert.equal(w.carcasses[0].availableAt,2);assert(!c.cellResources.receipts.some(r=>r.source===w.carcasses[0].id));conserved(w);
 }
});

test('main repair spends actual E and leaves three maintenance turns reserved; phase does not refill reserves or age',()=>{
 const w=fixture(),o=add(w,'adult',species,{E:50,M:10,G:31});o.HP=S.phenotype(w,o).maxHP-5;ledger(w);const age=o.age,c=step(w),b=c.cellResources.budgets.get(o.id),healed=c.records.get(o.id).heal;
 assert(healed>0);near(50-o.E,b.paid.E+healed/.5);assert(o.E>=3*b.maintenance.E);assert.equal(o.phase,2);assert.equal(c.traits.get(o.id).phase,1);assert.equal(o.age,age+1);near(o.M,10);conserved(w);
});

test('mature phase-I parents may birth into a third same-cell slot with exact formation matter',()=>{
 const w=fixture();onlyCell(w);w.config.enabled.main=true;const a=add(w,'mother',species,{sex:'female',age:50,E:100,M:10,birthReady:0}),b=add(w,'father',species,{sex:'male',age:50,E:100,M:10,birthReady:0});ledger(w);const c=step(w),born=c.children.find(o=>o.slot==='main');
 assert(born);assert.equal(w.organisms.length,3);assert.equal(born.cell,18);assert.equal(born.phase,1);assert.equal(born.age,0);near(born.E,32);near(born.B,8);near(born.M,1);near(born.cellMatter.bodyM,.16);assert.equal(c.old.has(born.id),false);assert.equal(c.births.length,1);assert(c.parents.has(a.id)&&c.parents.has(b.id));assert.equal(new Set(w.organisms.map(o=>o.cellOccupancy.slot)).size,3);conserved(w);
});

test('full settlement slots reject birth without failed-candidate charges or density penalties',()=>{
 const w=fixture();onlyCell(w);w.config.enabled.main=true;const parents=[add(w,'mother',species,{sex:'female',E:100,M:10,birthReady:0}),add(w,'father',species,{sex:'male',E:100,M:10,birthReady:0})];add(w,'third',species,{E:100,M:10});w.config.populationRegulation=true;ledger(w);const c=step(w);
 assert.equal(c.births.length,0);for(const o of parents){near(o.E,100-c.cellResources.budgets.get(o.id).paid.E);near(o.M,10);assert(E.R.birthPressure(w,o,c).allowed);}conserved(w);
});

test('a failed second-parent reservation spends nothing on either parent',()=>{
 const w=fixture(),a=add(w,'mother',species,{E:100,M:10}),b=add(w,'father',species,{E:100,M:0});ledger(w);const c=ready(w),d=N.lifeDemands(w,c);N.acquire(w,c,[]);N.settleBudgets(w,c,d.maintenance);
 const before=parents=>parents.map(o=>[o.E,o.M]),paid=before([a,b]),born=S.organism(w,S.D.byId[species],19,'uncommitted',{E:32,B:8,M:1,age:0});
 assert.equal(N.formChild(w,c,born,[a,b],[20,20],[2,2]),false);assert.deepEqual(before([a,b]),paid);assert(!w.organisms.includes(born));conserved(w);
});

test('compressed ryouki parents produce an ordinary I/0 child in its own slot',()=>{
 const w=fixture();onlyCell(w);w.config.enabled.main=true;add(w,'mother','ryouki',{sex:'female',phase:4,branch3:0,branch4:0,mutated:true,age:40,E:80,M:10,birthReady:0});add(w,'father','ryouki',{sex:'male',phase:4,branch3:0,branch4:0,mutated:true,age:40,E:80,M:10,birthReady:0});ledger(w);const c=step(w),born=c.children.find(o=>o.species==='ryouki');
 assert(born);assert(!born.ryouki.mutated);assert.equal(born.phase,1);assert.equal(born.age,0);near(born.E,16);near(born.B,6);near(born.M,1);near(born.cellMatter.bodyM,.12);assert.equal(w.organisms.filter(o=>o.cellOccupancy.slot===born.cellOccupancy.slot).length,1);conserved(w);
});

test('existing jelly parthenogenesis and swarm stored father retain canonical inheritance with new budgets',()=>{
 for(const kind of ['jelly','swarm']){const w=fixture();onlyCell(w);w.config.enabled.main=true;const a=add(w,'mother',kind,{sex:'female',role:kind==='swarm'?'queen':null,age:60,E:100,M:10,birthReady:0});a.maleAbsent=8;
  if(kind==='swarm'){a.sperm={uses:2,father:{id:'stored-father',dna:{...a.dna},birthWeights:a.birthWeights.slice(),generation:2}};w.colonyMating={matings:0,storedBirths:0};}
  ledger(w);const c=step(w),born=c.children.find(o=>o.slot==='main');assert(born,kind);assert.equal(born.phase,1);assert.equal(born.age,0);if(kind==='jelly')assert.equal(born.sex,'female');else{assert.deepEqual(born.parents,['mother','stored-father']);assert.equal(a.sperm.uses,1);assert.equal(w.colonyMating.storedBirths,1);}conserved(w);
 }
});

test('live swarm mating finds a co-resident male and pays once before stored-father birth',()=>{
 const w=fixture();onlyCell(w);w.config.enabled.main=true;const queen=add(w,'queen','swarm',{sex:'female',role:'queen',age:60,E:100,M:10,birthReady:0}),male=add(w,'male','swarm',{sex:'male',role:'male',age:60,E:100,M:10,birthReady:0});ledger(w);const c=step(w),born=c.children.find(o=>o.slot==='main');
 assert(born);assert.deepEqual(born.parents,[queen.id,male.id]);assert.deepEqual(w.colonyMating,{matings:1,storedBirths:1});assert.equal(queen.sperm.uses,11);assert.equal(c.cellResources.budgets.get(queen.id).tickets.get('mating/'+queen.id).state,'paid');near(male.E,100-c.cellResources.budgets.get(male.id).paid.E-2);conserved(w);
});

test('autonomous Q and a main organism share the same old leaves and Q never stores M',()=>{
 const w=fixture();onlyCell(w);const p=add(w,'food','grass',{B:3,E:0,M:0}),a=add(w,'main',species,{E:0,M:30}),q=adult(w,{E:.01});ledger(w);const c=ready(w);E.P.search(w,c);const afterSearch=q.E,d=N.lifeDemands(w,c);N.acquire(w,c,d.requests.filter(r=>[a.id,q.id].includes(r.actor)));
 const rs=c.cellResources.receipts.filter(r=>r.kind==='food');assert(rs.some(r=>r.actor===a.id));assert(rs.some(r=>r.actor===q.id));near(rs.reduce((n,r)=>n+r.quantity,0),1);near(p.B,2);assert(q.E>afterSearch);assert.equal(Object.hasOwn(q,'M'),false);near(q.hyper.last.feedingE,q.E-afterSearch);assert(q.E<=S.HyperParasite.settings(w).capE);assert(rs.filter(r=>r.actor===q.id).reduce((n,r)=>n+r.quantity,0)<=S.HyperParasite.settings(w).adultFoodCap);assert(w.cellState.nextMaterial.some(r=>r.M>0));conserved(w);
});

test('autonomous Q cannot eat current-T corpses or tissue and newly emerged Q waits until next T',()=>{
 const w=fixture();onlyCell(w);const plant=add(w,'new-leaves','grass',{B:4,E:0,M:0});plant.cellMatter.newB=plant.cellMatter.newEdibleB=2;plant.cellMatter.tissueAt=1;const old=adult(w,{E:.01}),fresh=adult(w,{id:'fresh-Q',E:.02,bornAt:1});fresh.hyper.detachedAt=1;
 w.carcasses.push({id:'new-dead',cell:18,q:4,E:4,M:.08,G:4,tag:'animal',created:1,availableAt:2,expires:null});ledger(w);const c=ready(w);E.P.search(w,c);assert(!c.cellQActors.has(fresh.id));const d=N.lifeDemands(w,c);assert(!d.requests.some(r=>r.actor===old.id||r.actor===fresh.id));near(w.carcasses[0].E,4);near(fresh.E,.02);conserved(w);
});

test('source/generated, Worker/JSON and repeated internal turns agree; public turn/capture remain gated',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),T=require('../src/ecology/transport.js'),A=require('../src/ecology/archive.js');
 const w=fixture();onlyCell(w);add(w,'main',species,{E:20,M:10});add(w,'food','grass',{B:22,E:4,M:.2});adult(w);ledger(w);const v=structuredClone(w),before=structuredClone(w),encode=T.encoder(w);
 for(let t=0;t<3;t++){if(t){w.turn++;v.turn++;}step(w);step(v,G);assert.deepEqual(v,w);conserved(w);}
 assert.deepEqual(T.apply(before,JSON.parse(JSON.stringify(encode(w,true)))),w);assert.throws(()=>G.beginTurn(w),/CELL_MODEL_INCOMPLETE/);assert.throws(()=>A.create({getItem:()=>null,setItem(){}},G,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});
