'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Factory=require('../design/advantage-switches/model.cjs'),E=Factory.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CellSpace,R=E.N.CellResources;
const base={seed:'finite-cell-resources',width:8,height:8,initial:0,
 enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
 producerModel:'colony/1',ryoukiModel:'ryouki/1',largePlantModel:'independent/1',
 largePlantSettings:{autoDensity:{land:0,water:0}},ecologyRevision:'observation/4.1'};
function fixture(settings={}){
 const w=structuredClone(E.create(base));w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];
 w.tiles=w.tiles.map(t=>({...t,env:3,terrain:'plain',light:1,soilM:5,cover:'none',blocked:false,walls:[]}));
 w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings(settings);C.initialize(w);w.turn=1;return w;
}
function add(w,id,{species='ryouki',cell=18,E:energy=10,M=1,B=8,bodyM=0}={}){
 const o=S.organism(w,S.D.byId[species],cell,id,{E:energy,M,B,age:18,phase:1});
 o.cellMatter={version:'cell-matter/1',bodyM,newB:0,tissueAt:0};C.assign(w,o);w.organisms.push(o);return o;
}
function reset(w){const totals=S.totals(w);w.ledger={initialE:totals.E,initialM:totals.M,solar:0,sinks:0,Mloss:0};}
function prepared(w){reset(w);const ctx=E.context(w);for(const p of ctx.traits.values()){p.capE=100;p.capM=100;p.capB=100;}E.prepare(w,ctx);return ctx;}
function ready(w){const ctx=prepared(w);for(const o of w.organisms)ctx.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,ctx);E.N.payActions(w,ctx);return ctx;}
const req=(id,actor,kind,need,extra={})=>({id,actor:actor.id,kind,need,...extra});
function near(a,b,eps=.000005){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conservation(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}

test('bounded demand-weighted allocation is order independent and redistributes capped shares',()=>{
 const asks=[2,1,1].map((need,i)=>({id:'r'+i,need,rates:{M:1}}));
 const a=R.allocate({M:2},asks),b=R.allocate({M:2},asks.slice().reverse());assert.deepEqual(a,b);assert.deepEqual([...a.grants.values()],[1,.5,.5]);
 const c=R.allocate({M:4},[{id:'small',need:.1,ability:100,rates:{M:1}},{id:'large',need:10,rates:{M:1}}]);near(c.grants.get('small'),.1);near(c.grants.get('large'),3.9);near(c.remaining.M,0);
 const rich=R.allocate({M:8},asks);assert.deepEqual([...rich.grants.values()],[2,1,1]);near(rich.remaining.M,4);
});

test('coupled requests do not consume unusable water and leave/reallocate real stock',()=>{
 const out=R.allocate({water:2,M:0},[{id:'both',need:1,rates:{water:1,M:1}},{id:'water',need:1,rates:{water:1}}]);
 assert.equal(out.grants.get('both'),0);assert.equal(out.grants.get('water'),1);assert.deepEqual(out.remaining,{water:1,M:0});
 const tiny=R.allocate({M:.000001},[0,1,2].map(i=>({id:String(i),need:1,rates:{M:1}})));assert.equal([...tiny.grants.values()].reduce((n,x)=>n+x,0),0);near(tiny.remaining.M,.000001);
});

test('fixed soil, mineral levels, plant temperature/pH and shared light are resolved at creation',()=>{
 for(const [mineralLevel,initial,cap]of [['poor',2,8],['standard',5,20],['rich',10,40]]){
  const w=fixture({mineralLevel,soilQuality:1.25}),p=w.cellProfiles.profiles[18];assert.equal(w.tiles[18].soilM,initial);assert.equal(p.mineralCapacity,cap*1.25);assert.equal(p.waterCapacity,37.5);assert.equal(p.lightBudget,15.6);
 }
 const w=fixture({temperature:5,landPH:4.5}),p=w.cellProfiles.profiles[18];assert.equal(p.plantTemperature,.5);assert.equal(p.plantPH,.5);assert(p.evaporation<.5);
 assert.equal(fixture({temperature:45}).cellProfiles.profiles[18].plantTemperature,0);
 assert.throws(()=>C.settings({mineralLevel:'unknown'}),/SETTINGS_INVALID/);
});

test('rain, drainage and actual evaporation conserve water, cannot go negative or run twice',()=>{
 const w=fixture(),ctx=E.context(w),before=w.cellState.water.reduce((n,x)=>n+x,0);w.cellState.water[18]=30;
 const initial=before+15;R.begin(w,ctx);const f=ctx.cellResources.flow;near(w.cellState.water.reduce((n,x)=>n+x,0),initial+f.waterInput-f.waterDrain-f.waterEvaporation);assert.equal(w.cellState.water[18],29.5);assert.throws(()=>R.begin(w,E.context(w)),/ALREADY_APPLIED/);
 const dry=fixture({rainScale:0});dry.cellState.water.fill(0);R.begin(dry,E.context(dry));assert(dry.cellState.water.every(x=>x===0));
});

test('same-cell mineral competition follows demand, ability/reach and capacity without layer priority',()=>{
 const w=fixture(),a=add(w,'a',{species:'grass',M:0}),b=add(w,'b',{species:'forestcrown',M:0}),c=add(w,'c',{species:'moss',M:0});w.tiles[18].soilM=2;
 const ctx=ready(w);R.acquire(w,ctx,[req('a',a,'mineral',2),req('b',b,'mineral',1),req('c',c,'mineral',1)]);near(a.M,1);near(b.M,.5);near(c.M,.5);near(w.tiles[18].soilM,0);conservation(w);
 const other=fixture(),x=add(other,'x',{species:'grass',M:0}),y=add(other,'y',{species:'grass',M:0});other.tiles[18].soilM=1;
 R.acquire(other,ready(other),[req('x',x,'mineral',1,{reach:1}),req('y',y,'mineral',1,{reach:.5})]);assert(x.M>y.M&&y.M>0);conservation(other);
});

test('plant activity zero leaves mineral in place and soil quality raises actual uptake limit once',()=>{
 const bad=fixture({landPH:3.5}),plant=add(bad,'p',{species:'grass',M:0});R.acquire(bad,ready(bad),[req('p',plant,'mineral',1)]);assert.equal(plant.M,0);assert.equal(bad.tiles[18].soilM,5);conservation(bad);
 const good=fixture({soilQuality:1.25}),o=add(good,'p',{species:'grass',M:0});R.acquire(good,ready(good),[req('p',o,'mineral',2,{limit:1})]);assert.equal(o.M,1.25);conservation(good);
});

test('one light budget is captured from above; unused capture still shades lower foliage',()=>{
 const w=fixture(),top=add(w,'top',{species:'forestcrown',E:0}),low=add(w,'low',{species:'grass',E:0}),ctx=ready(w);
 const canopies=[{actor:top.id,height:2,area:1,capture:10},{actor:low.id,height:1,area:1,capture:15.6}];
 R.acquire(w,ctx,[req('top',top,'photo',0),req('low',low,'photo',15.6)],canopies);
 near(top.E,0);near(low.E,5.6);near(ctx.cellResources.light.reduce((n,r)=>n+r.captured,0),15.6);near(w.ledger.solar,5.6);conservation(w);
 const bare=fixture(),a=add(bare,'top',{species:'forestcrown',E:0}),b=add(bare,'low',{species:'grass',E:0}),c=ready(bare);
 R.acquire(bare,c,[req('low',b,'photo',15.6)],[{actor:a.id,height:2,area:0,capture:10},{actor:b.id,height:1,area:1,capture:15.6}]);near(b.E,15.6);conservation(bare);
});

test('water limits actual photosynthesis while unused light is neither stored nor free energy',()=>{
 const w=fixture(),o=add(w,'p',{species:'grass',E:0}),ctx=ready(w);w.cellState.water[18]=.5;
 R.acquire(w,ctx,[req('p',o,'photo',10)],[{actor:o.id,height:1,area:1,capture:10}]);near(o.E,1.3);near(w.cellState.water[18],0);near(w.ledger.solar,1.3);assert.equal(ctx.cellResources.light[0].captured,10);conservation(w);
});

test('remote food, information food and requests from dead/new actors are rejected before transfer',()=>{
 const w=fixture(),o=add(w,'eater',{E:0}),plant=add(w,'grass',{species:'grass',cell:19});const ctx=ready(w),before=JSON.stringify(w);
 assert.throws(()=>R.acquire(w,ctx,[req('remote',o,'food',1,{source:{kind:'organism',id:plant.id}})]),/FOOD_SOURCE_INVALID/);assert.equal(JSON.stringify(w),before);
 assert.throws(()=>R.acquire(w,ctx,[req('info',o,'food',1,{source:{kind:'resource',id:'information'}})]),/FOOD_SOURCE_INVALID/);o.HP=0;
 assert.throws(()=>R.acquire(w,ctx,[req('dead',o,'mineral',1)]),/REQUEST_INVALID/);
 const born=add(w,'newborn',{cell:20});assert.throws(()=>R.acquire(w,ctx,[req('new',born,'mineral',1)]),/REQUEST_INVALID/);
});

test('consumers share finite plant tissue; body mineral, assimilation and waste are each owned once',()=>{
 const w=fixture(),a=add(w,'a',{E:0,M:0}),b=add(w,'b',{E:0,M:0}),plant=add(w,'plant',{species:'grass',E:0,M:0,B:6,bodyM:.12});const ctx=ready(w);
 R.acquire(w,ctx,[req('a',a,'food',2,{source:{kind:'organism',id:plant.id}}),req('b',b,'food',2,{source:{kind:'organism',id:plant.id}})]);
 near(plant.B,2);near(plant.cellMatter.bodyM,.04);assert(a.E>0&&b.E>0);assert(w.cellState.nextMaterial.some(r=>r.kind==='organic'&&r.E>0&&r.availableAt===2));conservation(w);
 assert.throws(()=>R.acquire(w,ctx,[]),/ALREADY_ACQUIRED/);
});

test('carcass sharing removes one finite fraction of body, energy and mineral per recipient',()=>{
 const w=fixture(),a=add(w,'a',{E:0,M:0}),b=add(w,'b',{E:0,M:0});w.carcasses.push({id:'dead',cell:18,species:'grassbug',tag:'animal',q:3,E:6,M:.12,G:3,created:0});const ctx=ready(w);
 R.acquire(w,ctx,[req('a',a,'food',1,{source:{kind:'carcass',id:'dead'}}),req('b',b,'food',1,{source:{kind:'carcass',id:'dead'}})]);const remains=w.carcasses[0];near(remains.q,1);near(remains.E,2);near(remains.M,.04);near(remains.G,1);conservation(w);
});

test('returns become available next turn only; capacity overflow remains organic and is not Mloss',()=>{
 const w=fixture(),o=add(w,'owner',{M:2});w.tiles[18].soilM=19.5;const ctx=ready(w);o.M=0;S.addSoil(w,18,2);near(w.tiles[18].soilM,19.5);assert.equal(w.cellState.nextMaterial[0].availableAt,2);conservation(w);
 w.turn++;const next=E.context(w);R.begin(w,next);near(w.tiles[18].soilM,20);near(w.cellState.organic.find(r=>r.cell===18).M,1.5);assert.equal(w.cellState.nextMaterial.length,0);assert.equal(w.ledger.Mloss,0);conservation(w);assert.throws(()=>R.begin(w,E.context(w)),/ALREADY_APPLIED/);
});

test('explicit mineral input is recorded separately and conserved even at capacity',()=>{
 const w=fixture({mineralInput:.5});for(const t of w.tiles)t.soilM=20;const ctx=ready(w);near(ctx.cellResources.flow.mineralInput,32);near(w.cellState.organic.reduce((n,r)=>n+r.M,0),32);near(w.ledger.cellInputM,32);conservation(w);assert.deepEqual(E.invariants(w),[]);
});

test('actions and maintenance are paid once; reserve is a goal and failed reservations release capacity',()=>{
 const w=fixture(),o=add(w,'budget',{E:20,M:2}),ctx=ready(w);ctx.costs.get(o.id).action=2;
 assert.throws(()=>R.acquire(w,ctx,[]),/ACTIONS_UNPAID/);E.N.payActions(w,ctx);R.acquire(w,ctx,[]);
 R.settleBudgets(w,ctx,new Map([[o.id,{E:1,M:.1}]]));near(o.E,17);near(o.M,1.9);
 assert(R.reserve(w,ctx,o,'growth',{E:6,M:.4}));assert.equal(R.reserve(w,ctx,o,'birth',{E:9,M:.4}),null);near(o.E,17);assert(R.cancel(w,ctx,o,'growth'));assert(!R.cancel(w,ctx,o,'growth'));assert(R.reserve(w,ctx,o,'birth',{E:9,M:.4}));conservation(w);
 assert.throws(()=>R.settleBudgets(w,ctx,new Map([[o.id,{E:1,M:.1}]])),/ALREADY_SETTLED/);
});

test('formation stores body E/M and dissipates only the actual formation overhead',()=>{
 const w=fixture(),o=add(w,'grow',{E:20,M:2}),ctx=ready(w);R.acquire(w,ctx,[]);R.settleBudgets(w,ctx,new Map([[o.id,{E:0,M:0}]]));
 assert(R.reserve(w,ctx,o,'grow',{E:1.2,M:.02}));assert(R.commit(w,ctx,o,'grow',{bodyB:1}));near(o.B,9);near(o.E,18.8);near(o.M,1.98);near(o.cellMatter.bodyM,.02);near(w.ledger.sinks,.2);assert.equal(o.cellMatter.tissueAt,1);assert.equal(o.cellMatter.newB,1);assert(!R.commit(w,ctx,o,'grow',{bodyB:1}));conservation(w);
 const T=require('../src/ecology/transport.js'),prior=structuredClone(w),encode=T.encoder(w);o.cellMatter.newB=.5;const received=T.apply(prior,JSON.parse(JSON.stringify(encode(w,true))));assert.deepEqual(received,w);
});

test('maintenance deficit prevents investments without artificial immediate death or reserve-based starvation',()=>{
 const w=fixture(),o=add(w,'poor',{E:10,M:.02}),ctx=ready(w);R.acquire(w,ctx,[]);const hp=o.HP;
 const b=R.settleBudgets(w,ctx,new Map([[o.id,{E:1,M:.1}]]));assert(b.get(o.id).deficit>0);assert.equal(R.reserve(w,ctx,o,'grow',{E:1.2,M:.02}),null);assert.equal(o.HP,hp);conservation(w);
 const other=fixture(),a=add(other,'small',{E:1.5,M:1}),c=ready(other);R.acquire(other,c,[]);const originalHP=a.HP,paid=R.settleBudgets(other,c,new Map([[a.id,{E:1,M:0}]]));assert.equal(paid.get(a.id).deficit,0);assert.equal(a.HP,originalHP);assert.equal(R.reserve(other,c,a,'x',{E:.1,M:0}),null);conservation(other);
});

test('unselected aquatic supply is explicit; land coefficients are not silently copied',()=>{
 const w=fixture();w.turn=0;delete w.cellState;delete w.cellProfiles;w.tiles[18].terrain='shallow';C.initialize(w);w.turn=1;
 const o=add(w,'alga',{species:'algae',E:0}),ctx=ready(w);assert.equal(w.cellProfiles.profiles[18].mineralCapacity,null);assert.equal(w.cellState.water[18],null);
 assert.throws(()=>R.acquire(w,ctx,[req('a',o,'photo',1)],[{actor:o.id,height:1,area:1,capture:1}]),/AQUATIC_PROFILE_UNRESOLVED/);
});


test('failed formation cancels its reservation without creating tissue or charging a second payment',()=>{
 const w=fixture(),o=add(w,'grow',{E:20,M:2}),ctx=ready(w);R.acquire(w,ctx,[]);R.settleBudgets(w,ctx,new Map([[o.id,{E:0,M:0}]]));
 assert(R.reserve(w,ctx,o,'grow',{E:1.2,M:.02}));ctx.traits.get(o.id).capB=o.B;
 const before=structuredClone(o);assert(!R.commit(w,ctx,o,'grow',{bodyB:1}));assert.deepEqual(o,before);
 assert(R.reserve(w,ctx,o,'repair',{E:20,M:2}));conservation(w);
 const later=fixture(),a=add(later,'reserved',{E:20,M:2}),c=ready(later);R.acquire(later,c,[]);R.settleBudgets(later,c,new Map([[a.id,{E:1,M:0}]]));
 assert(R.reserve(later,c,a,'work',{E:5,M:0}));a.E=6;S.dissipate(later,13);const prior=a.B;
 assert(!R.commit(later,c,a,'work'));assert.equal(a.E,6);assert.equal(a.B,prior);conservation(later);
});

test('generated execution and Worker/JSON preserve finite resources, receipts and all material owners',()=>{
 const G=require('../src/ecology/observation-model.js').model({producer:false,waterbug:false,hyperparasite:false});
 const initial=fixture(),plant=add(initial,'p',{species:'grass',E:0,M:0});reset(initial);
 const a=structuredClone(initial),b=structuredClone(initial),T=require('../src/ecology/transport.js'),encode=T.encoder(initial);
 function run(engine,w){const ctx=engine.context(w);for(const p of ctx.traits.values()){p.capE=100;p.capM=100;p.capB=100;}
  engine.prepare(w,ctx);for(const o of w.organisms)ctx.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});engine.B.move(w,ctx);engine.N.payActions(w,ctx);
  engine.N.CellResources.acquire(w,ctx,[req('M',plant,'mineral',.5),req('E',plant,'photo',2.6)],[{actor:plant.id,height:1,area:1,capture:2.6}]);return ctx;
 }
 const ca=run(E,a),cb=run(G,b);assert.deepEqual(a,b);assert.deepEqual(ca.cellResources.receipts,cb.cellResources.receipts);
 const received=T.apply(initial,JSON.parse(JSON.stringify(encode(a,true))));assert.deepEqual(received,a);conservation(a);
});


test('microscopic food residues and water costs do not produce negative or free stocks',()=>{
 const w=fixture(),a=add(w,'a',{E:0,M:0}),b=add(w,'b',{E:0,M:0}),c=add(w,'c',{E:0,M:0});
 w.carcasses.push({id:'tiny',cell:18,species:'grassbug',tag:'animal',q:3,E:.000002,M:.000002,G:0,created:0});const ctx=ready(w);
 R.acquire(w,ctx,[a,b,c].map(o=>req(o.id,o,'food',1,{source:{kind:'carcass',id:'tiny'}})));
 assert(w.carcasses[0].E>=0&&w.carcasses[0].M>=0);assert.equal(w.cellState.nextMaterial[0].E,.000002);conservation(w);
 const water=fixture(),plant=add(water,'p',{species:'grass',E:0}),d=ready(water);water.cellState.water[18]=.000001;
 R.acquire(water,d,[req('p',plant,'photo',.000001)],[{actor:plant.id,height:1,area:1,capture:.000001}]);assert.equal(water.cellState.water[18],0);assert(plant.E>0);conservation(water);
});

test('shared organic feeding leaves no submicro body without its energy',()=>{
 for(const body of [.000001,.000003,.000005]){
  const w=fixture(),a=add(w,'a',{species:'recursive',E:0,M:0}),b=add(w,'b',{species:'recursive',E:0,M:0});
  const stock={id:'rounding',cell:18,E:.562102,M:.015131,B:body};w.cellState.organic.push(stock);
  const ctx=ready(w);R.acquire(w,ctx,[req('a',a,'food',.562102,{source:{kind:'organic',id:stock.id}}),req('b',b,'food',.562102,{source:{kind:'organic',id:stock.id}})]);
  near(ctx.cellResources.receipts.reduce((n,r)=>n+r.quantity,0),.562102);
  assert.equal(stock.E,0);assert.equal(stock.B,0);conservation(w);
 }
});
