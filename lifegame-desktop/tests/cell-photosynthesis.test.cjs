'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace,N=E.N.CellResources;
const base={seed:'cell-photosynthesis',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',
 primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',parasiteDispersalModel:'fanout/1',primaryEggModel:'egg/1',informationModel:'persistent/1',ageModel:'life/1',ecologyRevision:'observation/4.1'};
function fixture(settings={},water=false){const w=structuredClone(E.create(base));for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.tiles=w.tiles.map((t,i)=>({...t,terrain:water&&i===18?'shallow':'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings(settings);C.initialize(w);w.turn=1;return w;}
function add(w,id,species='kelp',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{birthReady:1000,age:40,E:0,M:0,...options});C.assign(w,o);w.organisms.push(o);return o;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w,e=E,intents={}){const c=e.context(w);e.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,intents[o.id]||{type:'stop',cell:o.cell,path:[],cost:0});e.B.move(w,c);e.N.payActions(w,c);return c;}
function acquire(w,c,e=E){const n=e.N.CellResources,d=n.lifeDemands(w,c);n.acquire(w,c,d.requests,d.canopies);return d;}
function near(a,b,eps=.00004){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}
const photo=c=>c.cellResources.receipts.filter(r=>r.kind==='photo');

test('kelp joins the one local light budget after movement, not as free prepare energy or soil M',()=>{
 const w=fixture({lightScale:.2}),k=add(w,'kelp'),p=add(w,'grass','grass',{B:22});ledger(w);const c=ready(w);near(k.E,0);near(w.ledger.solar,0);
 const d=acquire(w,c);assert.equal(d.canopies.length,2);assert(!d.requests.some(r=>r.actor===k.id&&r.kind==='mineral'));assert(!k.cellLife);assert.equal(S.spec(k).group,'main');
 near(c.cellResources.light.reduce((n,r)=>n+r.captured,0),3.12);near(photo(c).reduce((n,r)=>n+r.E,0),3.12);assert(k.E>0&&p.E>0);near(k.M,0);conserved(w);
});

test('phase and age alter only the existing photosynthetic input once',()=>{
 for(const phase of [1,2,3,4])for(const stage of ['juvenile','adult','elderly']){
  const w=fixture(),k=add(w,'kelp','kelp',{phase,branch3:0,branch4:0});const life=S.phenotype(w,k).life;k.age=stage==='juvenile'?0:stage==='elderly'?Math.ceil(life*.85):Math.ceil(life*.3);
  ledger(w);const c=ready(w),a=c.traits.get(k.id).ageFactors.light;acquire(w,c);near(k.E,1.5*[0,1,1.1,1.2,1.3][phase]*a);near(k.M,0);conserved(w);
 }
});

test('retained high foliage shades kelp even without utilizing its captured light',()=>{
 const w=fixture(),k=add(w,'kelp'),p=add(w,'canopy','forestcrown',{phase:4,B:44,E:80});ledger(w);const c=ready(w);c.traits.get(p.id).capE=p.E;
 N.acquire(w,c,[{id:'kelp',actor:k.id,kind:'photo',need:100}],[{actor:p.id,height:8,area:1,capture:15.6},{actor:k.id,height:0,area:1,capture:1.5}]);
 near(k.E,0);near(w.ledger.solar,0);assert.equal(c.cellResources.light.find(r=>r.actor===p.id).captured,15.6);conserved(w);
});

test('water is charged for actual light use once, and dry cells confer no free light',()=>{
 for(const water of [0,.25]){const w=fixture({rainScale:0}),k=add(w,'kelp');ledger(w);const c=ready(w);w.cellState.water[18]=water;acquire(w,c);near(k.E,water*2.6);near(w.cellState.water[18],0);near(c.cellResources.flow.waterUse,water);conserved(w);}
});

test('temperature and pH constrain actual photosynthesis without suppressing animal assimilation',()=>{
 for(const settings of [{temperature:5},{landPH:4.5},{temperature:45}]){const w=fixture(settings),k=add(w,'kelp');ledger(w);const c=ready(w);acquire(w,c);near(k.E,settings.temperature===45?0:.75);conserved(w);}
 const w=fixture({temperature:45}),k=add(w,'kelp');w.carcasses.push({id:'food',cell:18,species:'grassbug',tag:'animal',q:1,E:4,M:.1,G:1,created:0});ledger(w);const c=ready(w);acquire(w,c);assert(k.E>0);near(c.records.get(k.id).light,0);conserved(w);
 // The shared plant path uses the same effective bound, not storage deficit.
 const p=fixture({landPH:4.5}),g=add(p,'grass','grass',{B:22});ledger(p);const pc=ready(p);acquire(p,pc);near(g.E,2);conserved(p);
});

test('only the final occupied cell supplies light and water, with no second movement charge',()=>{
 const w=fixture(),k=add(w,'kelp','kelp',{E:20});ledger(w);const c=ready(w,E,{kelp:{type:'move',cell:19,path:[19],cost:999}}),paid=c.costs.get(k.id).action;
 assert.equal(k.cell,19);const energy=k.E,start=w.cellState.water[18],end=w.cellState.water[19];acquire(w,c);near(k.E-energy,1.5);near(w.cellState.water[18],start);near(end-w.cellState.water[19],1.5/2.6);near(paid,0);assert(c.records.get(k.id).moved);conserved(w);
});

test('automatic and direct kelp requests reject plant and fungal food across physical source types',()=>{
 const w=fixture(),k=add(w,'kelp');add(w,'grass','grass',{B:22});add(w,'fungus','fungus',{B:4});
 w.carcasses.push({id:'plant-dead',cell:18,species:'grass',tag:'plant',q:1,E:1,M:.02,G:1,created:0});
 for(const tag of ['plant','fungal']){const kind=Object.keys(S.FOOD).find(key=>S.FOOD[key].tag===tag);assert(kind);w.resources.push({id:tag,cell:18,kind,q:1,E:1,M:.02,created:0,expires:null});}
 ledger(w);const c=ready(w),d=N.lifeDemands(w,c);assert(!d.requests.some(r=>r.actor===k.id&&r.kind==='food'));
 const refs=[{kind:'organism',id:'grass'},{kind:'organism',id:'fungus'},{kind:'carcass',id:'plant-dead'},{kind:'resource',id:'plant'},{kind:'resource',id:'fungal'}],before=structuredClone(w);
 for(const [i,source]of refs.entries()){assert.throws(()=>N.acquire(w,c,[{id:'bad'+i,actor:k.id,kind:'food',need:1,source}]),/FOOD_DIET_INVALID/);assert.deepEqual(w,before);}
 conserved(w);
});

test('light and food share the E target while M-driven feeding keeps allocated light usable',()=>{
 for(const mineral of [0,30]){const w=fixture(),k=add(w,'kelp','kelp',{M:mineral});k.E=S.phenotype(w,k).capE-.2;
  w.carcasses.push({id:'animal',cell:18,species:'grassbug',tag:'animal',q:1,E:4,M:2,G:1,created:0});ledger(w);const c=ready(w);acquire(w,c);
  const r=photo(c)[0];assert(r&&r.E>0);near(r.E,r.quantity);near(c.cellResources.flow.solar,r.E);near(c.cellResources.flow.waterUse,r.E/2.6);near(k.E,c.traits.get(k.id).capE);
  assert(k.E<=c.traits.get(k.id).capE);assert(c.cellResources.receipts.some(r=>r.kind==='food'&&r.actor===k.id));if(!mineral){assert(k.M>0);assert(w.cellState.nextMaterial.some(r=>r.E>0));}conserved(w);
 }
});

test('kelp hunts small local animals even when plant resources are plentiful',()=>{
 const w=fixture(),k=add(w,'kelp'),g=add(w,'herd','grassbug',{age:10,B:4,E:4,M:.1});g.consumerGroup.cohorts=[{age:10,phase:1,n:2,B:4}];g.HP=S.spec(g).capacity[3]*2;
 const kind=Object.keys(S.FOOD).find(key=>S.FOOD[key].tag==='plant');w.resources.push({id:'abundant-plants',cell:18,kind,q:1000,E:1000,M:20,created:0,expires:null});ledger(w);const c=ready(w);E.cellLife(w,c);
 assert.equal(S.ConsumerGroup.count(g),1);assert(c.cellResources.receipts.some(r=>r.actor===k.id&&r.kind==='food'&&c.cellCaptures.has(r.source)));assert(!c.cellResources.receipts.some(r=>r.actor===k.id&&r.source==='abundant-plants'));near(w.resources.find(r=>r.id==='abundant-plants').E,1000);conserved(w);
});

test('light events, E-to-G growth and phase snapshot are connected once without capacity refills',()=>{
 const w=fixture(),k=add(w,'kelp','kelp',{E:70,M:2,G:31});ledger(w);const c=ready(w);E.cellLife(w,c);const light=c.records.get(k.id).light,b=c.cellResources.budgets.get(k.id),events=c.events.get(k.id).filter(e=>e.type==='light');
 near(light,1.5);assert.equal(events.length,1);near(events[0].amount,light);assert.equal(k.phase,2);assert.equal(c.traits.get(k.id).phase,1);assert.equal(k.age,41);near(k.E,70+light-b.paid.E-1);near(k.M,2);assert.equal(k.G,32);conserved(w);
});

test('new bodies do not photosynthesize in their birth turn and repeated acquisition spends nothing',()=>{
 const w=fixture(),old=add(w,'old');ledger(w);const c=ready(w),born=add(w,'born','kelp',{cell:19});const d=N.lifeDemands(w,c);assert(!d.canopies.some(r=>r.actor===born.id));assert(!d.requests.some(r=>r.actor===born.id));
 // The child was introduced after the initial ledger only to check eligibility.
 const t=S.totals(w);w.ledger.initialE=t.E;w.ledger.initialM=t.M;N.acquire(w,c,d.requests,d.canopies);near(born.E,0);assert(old.E>0);const after=structuredClone(w);assert.throws(()=>N.acquire(w,c,d.requests,d.canopies),/ALREADY_ACQUIRED/);assert.deepEqual(w,after);conserved(w);
});

test('order changes preserve allocation, while aquatic coefficients remain unresolved',()=>{
 const w=fixture({lightScale:.1});add(w,'a');add(w,'b');add(w,'grass','grass',{B:22});const v=structuredClone(w);v.organisms.reverse();ledger(w);ledger(v);const a=ready(w),b=ready(v);acquire(w,a);acquire(v,b);
 assert.deepEqual(a.cellResources.receipts,b.cellResources.receipts);assert.deepEqual(a.cellResources.light.slice().sort((a,b)=>S.compare(a.actor,b.actor)),b.cellResources.light.slice().sort((a,b)=>S.compare(a.actor,b.actor)));conserved(w);conserved(v);
 const wet=fixture({},true);add(wet,'wet-kelp');ledger(wet);const c=ready(wet),d=N.lifeDemands(wet,c),before=structuredClone(wet);assert.throws(()=>N.acquire(wet,c,d.requests,d.canopies),/CELL_AQUATIC_PROFILE_UNRESOLVED/);assert.deepEqual(wet,before);
});

test('source/generated and Worker/JSON preserve coupled photo-food accounting; public guards remain',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),T=require('../src/ecology/transport.js'),A=require('../src/ecology/archive.js'),w=fixture();add(w,'kelp','kelp',{E:70,M:2});add(w,'grass','grass',{B:22});w.carcasses.push({id:'food',cell:18,species:'grassbug',tag:'animal',q:4,E:8,M:.16,G:4,created:0});ledger(w);const v=structuredClone(w),before=structuredClone(w),encode=T.encoder(w);
 for(let turn=1;turn<=2;turn++){for(const [world,engine]of [[w,E],[v,G]]){world.turn=turn;const c=ready(world,engine);engine.cellLife(world,c);assert(photo(c).length);assert(c.cellResources.receipts.some(r=>r.kind==='food'&&r.actor==='kelp'));}assert.deepEqual(v,w);conserved(w);}assert.deepEqual(T.apply(before,JSON.parse(JSON.stringify(encode(w,true)))),w);
 assert.throws(()=>G.beginTurn(w),/CELL_MODEL_INCOMPLETE/);assert.throws(()=>A.create({getItem:()=>null,setItem(){}},G,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});
