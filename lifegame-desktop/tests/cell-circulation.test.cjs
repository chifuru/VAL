'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Factory=require('../design/advantage-switches/model.cjs'),E=Factory.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CellSpace,N=E.N.CellResources;
const base={seed:'cell-circulation',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0,fungus:0},parasites:{}},producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},ryoukiModel:'ryouki/1',ecologyRevision:'observation/4.1'};
function fixture(settings={}){const w=structuredClone(E.create(base));w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings(settings);C.initialize(w);w.turn=1;return w;}
function add(w,id,species='fungus',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{birthReady:100,...options});C.assign(w,o);w.organisms.push(o);return o;}
function organic(w,E=4,M=.08,B=4,cell=18,id='organic'){const row={id,cell,E,M,B};w.cellState.organic.push(row);return row;}
function corpse(w,id='dead',{cell=18,E=4,M=.08,G=4,created=0,expires=12,...extra}={}){const row={id,species:'grassbug',slot:'food',cell,tag:'animal',q:Math.max(E,G,M/.02,.000001),E,M,G,created,expires,...extra};w.carcasses.push(row);return row;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function prepare(w){const ctx=E.context(w);E.prepare(w,ctx);for(const o of w.organisms)ctx.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,ctx);E.N.payActions(w,ctx);return ctx;}
function step(w){const ctx=prepare(w);E.cellLife(w,ctx);return ctx;}
function finishBudget(w,ctx,requests=[],maintenance){N.acquire(w,ctx,requests);N.settleBudgets(w,ctx,maintenance??new Map(w.organisms.map(o=>[o.id,S.CellLife.upkeep(o)])));return ctx;}
const req=(o,row,kind='organic',need=10)=>({id:o.id+'/'+row.id,actor:o.id,kind:'decompose',need,source:{kind,id:row.id}});
function near(a,b,eps=.00002){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}

test('fungus has independent six-colony capacity, protected base, proportional costs and no colony lifetime',()=>{
 const w=fixture();for(let i=0;i<6;i++)add(w,'f'+i);assert.throws(()=>add(w,'extra'),/FULL/);assert.equal(w.organisms.length,6);
 const o=w.organisms[0];assert.equal(o.cellLife.kind,'fungus');near(o.B,4);near(S.edibleB(o),3);near(o.E,2);near(o.M,.1);near(S.CellLife.upkeep(o).E,.1);assert.equal(o.birthLife,undefined);
 o.age=10000;ledger(w);step(w);assert(w.organisms.includes(o));conserved(w);
});

test('base-only fungus obtains actual organic nutrients and regrows paid tissue without photosynthesis',()=>{
 const w=fixture(),o=add(w,'base','fungus',{B:1,E:.5,M:.04});organic(w);ledger(w);const ctx=step(w);
 assert(o.B>1);assert(o.B<=1.25);assert.equal(o.cellLife.baseB,1);assert.equal(w.ledger.solar,0);assert(ctx.cellResources.receipts.some(r=>r.kind==='decompose'));conserved(w);
});

test('decomposition shares finite sources and a single processing/water cap across all requests',()=>{
 const w=fixture(),o=add(w,'fungus','fungus',{E:0,M:0});const a=organic(w,3,.06,3,18,'a'),b=corpse(w,'b',{E:3,M:.06,G:3});ledger(w);const ctx=prepare(w),water=w.cellState.water[18];
 N.acquire(w,ctx,[req(o,a),req(o,b,'carcass')]);const receipts=ctx.cellResources.receipts;near(receipts.reduce((n,r)=>n+r.quantity,0),1);near(o.E,.5);near(w.ledger.sinks,.5);near(w.cellState.water[18],water-.05);near(o.M,.02);conserved(w);
});

test('full M storage still permits energy processing and mineralizes only the unretained M next T',()=>{
 const w=fixture(),o=add(w,'fullM','fungus',{E:0,M:.1}),row=organic(w,4,.08,4);ledger(w);const ctx=prepare(w);N.acquire(w,ctx,[req(o,row)]);
 near(o.E,.5);near(o.M,.1);near(w.cellState.nextMaterial.filter(r=>r.kind==='mineral').reduce((n,r)=>n+r.M,0),.02);near(w.tiles[18].soilM,5);conserved(w);
});

test('full E storage still permits mineral processing; excess E becomes heat',()=>{
 const w=fixture(),o=add(w,'fullE','fungus',{E:2,M:0}),row=organic(w,4,.08,4);ledger(w);const ctx=prepare(w);N.acquire(w,ctx,[req(o,row)]);
 near(o.E,2);near(o.M,.02);near(w.ledger.sinks,1);assert(!w.cellState.nextMaterial.some(r=>r.E>0));conserved(w);
});

test('near-full reserves constrain aggregate demand across multiple sources',()=>{
 const w=fixture(),o=add(w,'smallNeed','fungus',{E:1.99,M:.1});const rows=[0,1,2].map(i=>organic(w,4,.08,4,18,'a'+i));ledger(w);const ctx=prepare(w);N.acquire(w,ctx,rows.map(r=>req(o,r)));
 assert(ctx.cellResources.receipts.reduce((n,r)=>n+r.quantity,0)<=.020001);assert(o.E<=2);conserved(w);
});

test('pure-M and reserve-only organic matter have bounded nonzero processing cost',()=>{
 const w=fixture(),o=add(w,'mineral','fungus',{E:2,M:0}),row=organic(w,0,.2,0);ledger(w);const ctx=prepare(w),water=w.cellState.water[18];N.acquire(w,ctx,[req(o,row)]);
 near(o.M,.02);near(row.M,.18);near(w.cellState.water[18],water-.05);conserved(w);
 const v=fixture(),f=add(v,'energy','fungus',{E:0,M:.1}),stock=organic(v,4,0,0);ledger(v);const c=prepare(v);N.acquire(v,c,[req(f,stock)]);near(f.E,.5);near(stock.E,3);conserved(v);
});

test('fungivory protects base1 and the remaining base can process food next T',()=>{
 const w=fixture(),f=add(w,'fungus'),consumer=add(w,'consumer','ryouki',{E:0,M:0});organic(w);ledger(w);const ctx=prepare(w);ctx.cellFoodLimits=new Map([[consumer.id,10]]);
 N.acquire(w,ctx,[{id:'bite',actor:consumer.id,kind:'food',need:10,source:{kind:'organism',id:f.id}}]);near(f.B,1);near(S.edibleB(f),0);conserved(w);
 w.turn++;f.E=.5;ledger(w);const next=prepare(w);assert(N.lifeDemands(w,next).requests.some(r=>r.actor===f.id&&r.kind==='decompose'));
});

test('fungal birth pays exact cost, requires B2, respects cooldown and preserves I/0 child',()=>{
 const w=fixture(),o=add(w,'parent','fungus',{B:4,E:2,M:.1,birthReady:1});ledger(w);const ctx=step(w),child=w.organisms.find(a=>a!==o);
 assert(child);near(child.B,1);near(child.cellLife.baseB,1);near(child.E,.25);near(child.M,.01);assert.equal(child.phase,1);assert.equal(child.age,0);assert.equal(child.birthReady,11);assert.equal(o.birthReady,11);near(o.E,.45);near(o.M,.065);assert.equal(ctx.births.length,1);conserved(w);
 w.turn++;ledger(w);const next=step(w);assert.equal(next.births.length,0);conserved(w);
 const v=fixture(),small=add(v,'small','fungus',{B:1.8,E:2,M:.1,birthReady:1});ledger(v);assert.equal(step(v).births.length,0);assert(small.B>=2);conserved(v);
});

test('shortage uses one E/M deficit, removes edible before base at .4B/T, and may disappear',()=>{
 const w=fixture(),o=add(w,'starving','fungus',{B:1.2,E:0,M:0});const unfed=()=>{const c=prepare(w);finishBudget(w,c);E.R.CellLife.advance(w,c,N,E.B.moveCost);N.background(w,c);};ledger(w);unfed();near(o.B,1);near(o.cellLife.baseB,1);conserved(w);
 for(let t=0;t<3;t++){w.turn++;ledger(w);unfed();conserved(w);}assert(!w.organisms.includes(o));
});

test('physical corpses preserve exact remaining material, coexist and are unavailable on the death T',()=>{
 const w=fixture(),a=add(w,'a','grassbug',{B:2,E:1,M:.1}),b=add(w,'b','grassbug',{B:2,E:1,M:.1});ledger(w);const ctx=prepare(w);
 const ca=N.remains(w,a,ctx),cb=N.remains(w,b,ctx);assert.notEqual(ca.id,cb.id);assert.equal(w.carcasses.length,2);near(ca.E,3);near(ca.M,.14);near(ca.G,2);assert.equal(ca.availableAt,2);assert.equal(ca.expires,null);assert.equal(N.remains(w,a,ctx),ca);
 w.organisms=w.organisms.filter(o=>o!==a&&o!==b);
 const f=add(w,'f'); // Added after context: it cannot acquire in this T.
 assert.throws(()=>N.acquire(w,ctx,[req(f,ca,'carcass')]),/REQUEST_INVALID/);w.organisms=w.organisms.filter(o=>o!==f);conserved(w);
});

test('payload expiry changes infection only, never physical corpse energy or minerals',()=>{
 const w=fixture(),row=corpse(w,'expired',{E:2,M:.04,G:2,expires:0,payloadExpires:1,infection:{id:'p',species:'leafparasite',E:1,q:{E:.5}}});ledger(w);const ctx=E.context(w);N.payloads(w,ctx);near(row.E,2);near(row.M,.04);assert.equal(row.infection,null);near(w.ledger.sinks,1.5);N.payloads(w,ctx);near(w.ledger.sinks,1.5);conserved(w);
});

test('background acts once on post-feeding available stock and returns M next T only',()=>{
 const w=fixture(),row=organic(w,100,2,100);ledger(w);const ctx=prepare(w);finishBudget(w,ctx);E.R.CellLife.advance(w,ctx,N,E.B.moveCost);const mineral=w.tiles[18].soilM;
 const flow=N.background(w,ctx);near(flow.E,.1);near(flow.M,.002);near(row.E,99.9);near(w.tiles[18].soilM,mineral);assert.throws(()=>N.background(w,ctx),/ALREADY_APPLIED/);conserved(w);
 w.turn++;const next=E.context(w);E.prepare(w,next);near(w.tiles[18].soilM,mineral+.002);conserved(w);
});

test('background excludes fresh/deferred matter and reserves capacity against existing mineral returns',()=>{
 const w=fixture();w.tiles[18].soilM=20;const row=organic(w,100,2,100);corpse(w,'fresh',{E:100,M:2,G:100,created:1});S.CellSpace.deferMaterial(w,18,{E:3,M:.06,B:3});ledger(w);
 const ctx=prepare(w);finishBudget(w,ctx);E.R.CellLife.advance(w,ctx,N,E.B.moveCost);N.background(w,ctx);near(row.M,2);near(w.carcasses[0].E,100);near(w.cellState.nextMaterial.find(r=>r.kind==='organic').E,3);conserved(w);
 const v=fixture();v.tiles[18].soilM=19.999;organic(v,100,2,100);ledger(v);const c=prepare(v);v.tiles[18].soilM-=.001;S.CellSpace.deferMaterial(v,18,{M:.001,kind:'mineral'});finishBudget(v,c);E.R.CellLife.advance(v,c,N,E.B.moveCost);const f=N.background(v,c);assert(f.M<=.001001);conserved(v);
});

test('decay load has bounded effects, no direct fungus penalty and recovers with reduced material',()=>{
 const w=fixture(),plant=add(w,'plant','grass',{B:2,E:4,M:.2}),fungus=add(w,'fungus','fungus',{B:1,E:2,M:.1}),g=add(w,'animal','grassbug',{B:2,E:2,M:.05});w.cellState.decayLoad[18]=1;ledger(w);
 const ctx=prepare(w),d=N.lifeDemands(w,ctx);near(d.maintenance.get(g.id).E,.0525);near(d.maintenance.get(fungus.id).E,.025);finishBudget(w,ctx,[],d.maintenance);E.R.CellLife.advance(w,ctx,N,E.B.moveCost);assert(plant.cellLife.last.production<=1.9);N.background(w,ctx);near(w.cellState.decayLoad[18],0);conserved(w);
});

test('generated/source lifecycle and Worker state agree through a short organic-fungus-plant cycle',()=>{
 const G=require('../src/ecology/observation-model.js').model({producer:false,waterbug:false,hyperparasite:false}),T=require('../src/ecology/transport.js');
 const w=fixture();add(w,'fungus','fungus',{B:2,E:1,M:.04});add(w,'plant','grass',{B:3,E:4,M:0});organic(w,20,1,20);w.tiles[18].soilM=0;ledger(w);
 const other=structuredClone(w),prior=structuredClone(w),encode=T.encoder(w);
 const run=(e,v)=>{const ctx=e.context(v);e.prepare(v,ctx);e.B.move(v,ctx);e.cellLife(v,ctx);};
 for(let t=0;t<12;t++){if(t){w.turn++;other.turn++;}run(E,w);run(G,other);conserved(w);assert.deepEqual(other,w);}
 assert(w.ledger.solar>0);assert(w.organisms.find(o=>o.id==='plant').B>3);assert.deepEqual(T.apply(prior,JSON.parse(JSON.stringify(encode(w,true)))),w);assert.throws(()=>G.beginTurn(w),/CELL_MODEL_INCOMPLETE/);
});

test('six fungi and a scavenger share one carcass without overdraw and request-order bias',()=>{
 const w=fixture(),fungi=Array.from({length:6},(_,i)=>add(w,'f'+i,'fungus',{E:0,M:0})),scavenger=add(w,'scavenger','ryouki',{E:0,M:0});const row=corpse(w,'shared');ledger(w);const other=structuredClone(w);
 const run=(v,reverse)=>{const c=prepare(v),asks=[...v.organisms.filter(o=>o.cellLife?.kind==='fungus').map(o=>req(o,v.carcasses[0],'carcass')),{id:'scavenge',actor:scavenger.id,kind:'food',need:3,source:{kind:'carcass',id:row.id}}];N.acquire(v,c,reverse?asks.reverse():asks);return c;};
 const c=run(w,false);run(other,true);assert.deepEqual(other,w);assert(c.cellResources.receipts.reduce((n,r)=>n+r.quantity,0)<=4.000001);assert(w.carcasses[0].E>=0);assert(w.carcasses[0].M>=0);conserved(w);
});

test('background return is independent of stock order and high concentration alone yields bounded load',()=>{
 const w=fixture();w.tiles[18].soilM=19.999;organic(w,100,2,100,18,'a');organic(w,300,6,300,18,'b');ledger(w);const other=structuredClone(w);other.cellState.organic.reverse();
 const run=v=>{const c=prepare(v);finishBudget(v,c);E.R.CellLife.advance(v,c,N,E.B.moveCost);N.background(v,c);};run(w);run(other);
 const stocks=v=>v.cellState.organic.slice().sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(stocks(other),stocks(w));near(w.cellState.decayLoad[18],1);conserved(w);conserved(other);
});

test('actual source nutrient ratios bound demand for reserve-rich remains and shared mineral uptake',()=>{
 const w=fixture(),o=add(w,'rich','fungus',{E:1.99,M:.1}),row=organic(w,100,0,1);ledger(w);const c=prepare(w),water=w.cellState.water[18];N.acquire(w,c,[req(o,row)]);near(o.E,2);near(row.E,99.98);near(w.cellState.water[18],water-.00001);conserved(w);
 const v=fixture(),f=add(v,'sharedM','fungus',{E:2,M:.09}),stock=organic(v,4,.08,4);ledger(v);const ctx=prepare(v);N.acquire(v,ctx,[req(f,stock),{id:'soil',actor:f.id,kind:'mineral',need:.01}]);
 near(f.M,.1);const drawn=ctx.cellResources.receipts.reduce((n,r)=>n+r.M,0);near(drawn,.01);assert(!v.cellState.nextMaterial.some(r=>r.kind==='mineral'&&r.M>.000001));conserved(v);
});

test('independent E and M needs do not suppress each other across soil and heterogeneous organic sources',()=>{
 const w=fixture(),o=add(w,'independent','fungus',{E:1.99,M:0});organic(w,4,0,4);ledger(w);const c=prepare(w),demands=N.lifeDemands(w,c);
 N.acquire(w,c,demands.requests,demands.canopies);near(o.E,2);near(o.M,.1);N.settleBudgets(w,c,demands.maintenance);near(c.cellResources.budgets.get(o.id).deficit,0);conserved(w);
 const v=fixture(),f=add(v,'mixed','fungus',{E:1.99,M:.09}),a=organic(v,4,0,4,18,'energy'),b=organic(v,0,.08,0,18,'mineral');ledger(v);const other=structuredClone(v);
 const run=world=>{const ctx=prepare(world),actor=world.organisms[0];N.acquire(world,ctx,world.cellState.organic.map(row=>req(actor,row)));};
 run(v);other.cellState.organic.reverse();run(other);near(f.E,2);near(f.M,.1);near(a.E,3.98);near(b.M,.07);conserved(v);
 assert.deepEqual(other.organisms,v.organisms);assert.deepEqual(other.cellState.organic.slice().reverse(),v.cellState.organic);conserved(other);
});

test('existing parasite hooks retain a finite payload deadline and clean carrier state without expiring the corpse',()=>{
 const w=fixture(),host=add(w,'host','grassbug',{B:2,E:1,M:.1});host.infection={id:'p',species:'leafparasite',E:1,hostId:host.id};ledger(w);let cleared=0;
 const ctx=prepare(w);ctx.primaryHooks={hostDeath(world,c,o,a){a.infection=o.infection;o.infection=null;a.infection.hostId=a.id;a.payloadExpires=Math.min(a.expires,world.turn+4);},expireCarrier(world,c,a){cleared++;S.loseInfection(world,a.infection);a.infection=null;return true;}};
 const row=N.remains(w,host,ctx);w.organisms=[];assert.equal(row.expires,null);assert.equal(row.payloadExpires,5);const energy=row.E;
 w.turn=5;const next=E.context(w);next.primaryHooks=ctx.primaryHooks;N.payloads(w,next);assert.equal(cleared,1);near(row.E,energy);near(row.M,.14);assert.equal(row.infection,null);
 // This fixture advances only the carrier clock, not resource stages.
 w.turn=1;conserved(w);
});
