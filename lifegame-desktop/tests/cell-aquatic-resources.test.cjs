'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace,N=E.N.CellResources,profile='freshwater-comparison/1';
const base={seed:'cell-aquatic',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0,waterbug:0,fungus:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',ageModel:'life/1',ecologyRevision:'observation/4.1'};
function fixture(settings={aquaticProfile:profile}){const w=structuredClone(E.create(base));for(const k of ['organisms','resources','carcasses','pending'])w[k]=[];
 w.tiles=w.tiles.map((t,i)=>({...t,terrain:[18,19].includes(i)?'shallow':i===20?'deep':'plain',env:[18,19,20].includes(i)?5:3,light:i===20?.6:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings(settings);C.initialize(w);w.turn=1;return w;}
function add(w,id,species='algae',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{birthReady:1000,E:0,M:0,...options});C.assign(w,o);w.organisms.push(o);return o;}
function group(w,id,n=2,options={}){const o=add(w,id,'waterbug',{age:10,B:2*n,E:0,M:0,...options});o.consumerGroup.cohorts=[{age:10,phase:1,n,B:o.B}];o.HP=S.spec(o).capacity[3]*n;return o;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w,e=E,intents={}){const c=e.context(w);e.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,intents[o.id]||{type:'stop',cell:o.cell,path:[],cost:0});e.B.move(w,c);e.N.payActions(w,c);return c;}
function near(a,b,eps=.00005){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}
function acquire(w,c,actors=null){const d=N.lifeDemands(w,c);N.acquire(w,c,actors?d.requests.filter(r=>actors.includes(r.actor)):d.requests,d.canopies);return d;}
function step(w,e=E){const c=ready(w,e);e.cellLife(w,c);return c;}

test('explicit freshwater profile resolves finite water and bottom M without copying the land profile',()=>{
 const w=fixture(),p=w.cellProfiles.profiles[18],land=w.cellProfiles.profiles[17];assert.equal(p.aquaticProfile,profile);near(p.waterCapacity,40);near(w.cellState.water[18],32);near(p.waterInput,8);near(p.rain,0);near(p.pH,7);near(p.mineralInitial,8);near(p.mineralCapacity,32);near(w.tiles[18].soilM,8);
 near(land.waterCapacity,30);near(w.cellState.water[17],15);near(land.rain,6.5);near(w.tiles[17].soilM,5);assert.equal(land.waterInput,undefined);near(w.cellProfiles.profiles[20].lightBudget,15.6*.6);assert.deepEqual(C.validate(w),[]);
});

test('poor/standard/rich bottom stores and soil quality are separate from water volume',()=>{
 for(const [mineralLevel,initial,cap]of [['poor',4,16],['standard',8,32],['rich',16,64]]){const w=fixture({aquaticProfile:profile,mineralLevel,soilQuality:1.25}),p=w.cellProfiles.profiles[18];near(w.tiles[18].soilM,initial);near(p.mineralCapacity,cap*1.25);near(p.waterCapacity,40);near(w.cellState.water[18],32);assert.deepEqual(C.validate(w),[]);}
});

test('omitted and unknown profiles cannot silently acquire finite aquatic rules',()=>{
 const w=fixture({});assert.equal(w.config.cellSettings.aquaticProfile,undefined);assert.equal(w.cellProfiles.profiles[18].waterCapacity,null);assert.equal(w.cellState.water[18],null);assert.equal(w.cellProfiles.profiles[18].mineralCapacity,null);assert.deepEqual(C.validate(w),[]);
 assert.throws(()=>C.settings({aquaticProfile:'future'}),/SETTINGS_INVALID/);assert.throws(()=>C.settings({aquaticProfile:null}),/SETTINGS_INVALID/);
 const a=fixture();delete a.cellProfiles.profiles[18].waterInput;assert(C.validate(a).includes('CELL_STOCK:18'));
 const b=fixture({});Object.assign(b.cellProfiles.profiles[18],{waterCapacity:40,rain:0,evaporation:.5,waterInput:8,aquaticProfile:profile});b.cellState.water[18]=32;assert(C.validate(b).includes('CELL_STOCK:18'));
});

test('boundary inflow, rain, drainage and evaporation are booked exactly once and conserve water',()=>{
 const w=fixture(),before=w.cellState.water.reduce((n,x)=>n+x,0);w.cellState.water[18]=40;const input=w.cellProfiles.profiles.reduce((n,p)=>n+(p.waterInput??p.rain),0),c=ready(w),f=c.cellResources.flow;
 near(f.waterInput,input);near(w.cellState.water.reduce((n,x)=>n+x,0),before+8+f.waterInput-f.waterDrain-f.waterEvaporation);near(w.cellState.water[18],39.5);assert(f.waterDrain>0);const after=structuredClone(w);assert.throws(()=>N.begin(w,E.context(w)),/ALREADY_APPLIED/);assert.deepEqual(w,after);
});

test('zero input and empty water do not evaporate or synthesize nonexistent water',()=>{
 const w=fixture({aquaticProfile:profile,rainScale:0});w.cellState.water.fill(0);add(w,'algae','algae',{B:22});ledger(w);const c=ready(w);acquire(w,c);near(c.cellResources.flow.waterInput,0);near(c.cellResources.flow.waterEvaporation,0);near(w.ledger.solar,0);assert(w.cellState.water.every(x=>x===0));conserved(w);
});

test('six aquatic colonies share one light/water budget and plants remain non-predatory',()=>{
 const w=fixture();for(let i=0;i<6;i++)add(w,'algae'+i,i%2?'phytoplankton':'algae',{B:22});ledger(w);const c=ready(w),before=w.cellState.water[18],d=acquire(w,c);
 assert(d.requests.every(r=>r.kind==='photo'||r.kind==='mineral'));near(c.cellResources.light.reduce((n,r)=>n+r.captured,0),15.6);near(w.ledger.solar,15.6);near(before-w.cellState.water[18],6);assert(!c.cellResources.receipts.some(r=>r.kind==='food'));conserved(w);
});

test('bottom M is shared locally and dark photosynthesis supplies no energy',()=>{
 const w=fixture(),a=add(w,'a','algae',{B:22}),b=add(w,'b','phytoplankton',{B:22});w.tiles[18].soilM=.1;w.cellProfiles.profiles[18].lightBudget=0;ledger(w);const c=ready(w);acquire(w,c);assert(a.M>0&&b.M>0);near(a.M+b.M,.1);near(w.tiles[18].soilM,0);near(w.ledger.solar,0);conserved(w);
});

test('waterbug feeds only after actual arrival and never takes adjacent cell tissue',()=>{
 const w=fixture(),g=group(w,'group',2,{E:2,M:.1}),p=add(w,'plant','algae',{cell:19,B:22});ledger(w);const c=ready(w),d=N.lifeDemands(w,c);assert(!d.requests.some(r=>r.actor===g.id&&r.kind==='food'));N.acquire(w,c,d.requests.filter(r=>r.actor===g.id),d.canopies);near(p.B,22);conserved(w);
 w.turn++;const before=p.B,next=ready(w,E,{group:{type:'move',cell:19,path:[19],cost:999}});assert.equal(g.cell,19);acquire(w,next,[g.id]);assert(p.B<before);assert(p.B>=p.cellLife.baseB);assert(next.cellResources.receipts.some(r=>r.actor===g.id&&r.kind==='food'&&r.cell===19));conserved(w);
});

test('water decomposition leaves mineral returns for next T and capacity overflow remains owned',()=>{
 const w=fixture(),f=add(w,'fungus','fungus',{B:4,E:0,M:.1});w.tiles[18].soilM=32;w.carcasses.push({id:'dead',cell:18,species:'waterbug',tag:'animal',q:4,E:4,M:.08,G:4,created:0});ledger(w);const c=ready(w);acquire(w,c,[f.id]);assert(f.E>0);near(w.tiles[18].soilM,32);const returned=w.cellState.nextMaterial.filter(r=>r.kind==='mineral').reduce((n,r)=>n+r.M,0);assert(returned>0);conserved(w);
 w.turn++;N.begin(w,E.context(w));near(w.tiles[18].soilM,32);near(w.cellState.organic.filter(r=>r.cell===18).reduce((n,r)=>n+r.M,0),returned);conserved(w);
});

test('explicit mineral inputs are accounted for without hidden biological replenishment',()=>{
 const w=fixture({aquaticProfile:profile,mineralInput:.1});for(let i=0;i<w.tiles.length;i++)w.tiles[i].soilM=w.cellProfiles.profiles[i].mineralCapacity;ledger(w);const c=ready(w);near(c.cellResources.flow.mineralInput,6.4);near(w.ledger.cellInputM,6.4);near(w.cellState.organic.reduce((n,r)=>n+r.M,0),6.4);assert.equal(w.organisms.length,0);conserved(w);
});

test('three-T aquatic food-web boundaries preserve bodies, stocks and source/generated/Worker state',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),T=require('../src/ecology/transport.js'),w=fixture();add(w,'producer','algae',{B:22,E:2,M:.1});group(w,'consumer',2,{E:2,M:.1});add(w,'decomposer','fungus',{B:4,E:.5,M:.05});w.carcasses.push({id:'old-dead',cell:18,species:'waterbug',tag:'animal',q:3,E:3,M:.06,G:3,created:0});ledger(w);const v=structuredClone(w),before=structuredClone(w),encode=T.encoder(w);
 for(let turn=1;turn<=3;turn++){const contexts=[];for(const [world,e]of [[w,E],[v,G]]){world.turn=turn;contexts.push(step(world,e));conserved(world);}assert.deepEqual(v,w);const c=contexts[0];assert(c.cellResources.receipts.some(r=>r.kind==='photo'));assert(c.cellResources.receipts.some(r=>r.kind==='food'));assert(c.cellResources.receipts.some(r=>r.kind==='decompose'));}
 assert.deepEqual(T.apply(before,JSON.parse(JSON.stringify(encode(w,true)))),w);assert(w.organisms.some(o=>o.species==='waterbug'));
});

test('freshwater organism retains producer identity while public/new-result gates stay closed',()=>{
 const w=fixture(),o=add(w,'floating','freshwaterlight');assert.equal(C.layer(o),4);assert.equal(S.spec(o).group,'plant');assert.equal(o.cellLife,undefined);ledger(w);const c=ready(w);E.cellLife(w,c);assert(c.cellResources.budgets.has(o.id));assert(c.cellResources.receipts.some(r=>r.actor===o.id&&r.kind==='photo'));conserved(w);
 const A=require('../src/ecology/archive.js');assert.throws(()=>E.beginTurn(w),/CELL_MODEL_INCOMPLETE/);assert.throws(()=>A.create({getItem:()=>null,setItem(){}},E,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});
