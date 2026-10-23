'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const Factory=require('../design/advantage-switches/model.cjs'),E=Factory.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CellSpace,N=E.N.CellResources,L=E.R.CellLife;
const base={seed:'cell-life',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:true,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0,grassbug:0,waterbug:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ecologyRevision:'observation/4.1'};
function fixture(){const w=structuredClone(E.create(base));w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));
 w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();C.initialize(w);w.turn=1;return w;}
function add(w,id,species='grass',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,options);C.assign(w,o);w.organisms.push(o);return o;}
function group(w,id,n=4,options={}){const o=add(w,id,'grassbug',{age:10,B:2*n,E:2*n,M:.05*n,...options});
 o.consumerGroup.cohorts=[{age:o.age,phase:1,n,B:o.B}];o.HP=S.spec(o).capacity[3]*n;return o;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w,auto=false){const ctx=E.context(w);E.prepare(w,ctx);for(const o of w.organisms)ctx.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});
 E.B.move(w,ctx);E.N.payActions(w,ctx);const d=N.lifeDemands(w,ctx);N.acquire(w,ctx,auto?d.requests:[],auto?d.canopies:[]);N.settleBudgets(w,ctx,d.maintenance);return ctx;}
function life(w,auto=false){const ctx=ready(w,auto);L.advance(w,ctx,N,E.B.moveCost);return ctx;}
function near(a,b,eps=.00001){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}

test('new life initial caps, protected base and body minerals enter the initial ledger without multiplying founders',()=>{
 const w=fixture(),low=add(w,'low'),high=add(w,'high','forestcrown'),g=group(w,'herd');
 near(low.E,4);near(S.edibleB(low),14);near(low.cellMatter.bodyM,.32);near(high.B,12);near(S.edibleB(high),10);near(high.E,7.5);
 assert.equal(S.ConsumerGroup.count(g),4);near(S.phenotype(w,g).capE,8);near(S.phenotype(w,g).capM,.2);near(E.B.moveCost(w,g,19),.1);
 const signature=JSON.stringify([low.cellLife,low.cellMatter]);S.CellLife.attach(w,low);assert.equal(JSON.stringify([low.cellLife,low.cellMatter]),signature);
 ledger(w);assert.equal(w.organisms.length,3);assert.deepEqual(E.invariants(w),[]);conserved(w);
});

test('automatic demand uses all same-cell colonies and protected high leaves, with one combined bite cap',()=>{
 const w=fixture(),low=add(w,'grass'),high=add(w,'tree','forestcrown',{phase:4,branch3:0,branch4:0,B:48,E:0,M:0}),g=group(w,'herd',8,{E:0,M:0});
 ledger(w);const ctx=ready(w,true);const food=ctx.cellResources.receipts.filter(r=>r.actor===g.id&&r.kind==='food');
 assert.equal(food.length,2);near(food.reduce((v,r)=>v+r.quantity,0),2);assert(high.B>=8);assert.equal(high.cellLife.baseB,8);assert(ctx.cellResources.light.reduce((n,r)=>n+r.captured,0)<=15.6);conserved(w);
});

test('zero leaves do not generate light; all demand and formation use actual finite inputs',()=>{
 const w=fixture(),o=add(w,'bare','grass',{B:2,E:0,M:0});ledger(w);life(w,true);assert(o.B<2);assert.equal(w.ledger.solar,0);assert(o.cellLife.baseB<2);conserved(w);
});

test('establishment counts cumulative maintained turns and starts the advantage on the next T',()=>{
 const w=fixture(),o=add(w,'colony','grass',{B:22,E:4,M:.2});o.birthReady=100;
 ledger(w);life(w);assert.equal(o.cellLife.maintained,1);conserved(w);w.turn++;
 o.E=0;o.M=0;ledger(w);life(w);assert.equal(o.cellLife.maintained,1);conserved(w);w.turn++;
 o.E=4;o.M=.2;ledger(w);life(w);assert.equal(o.cellLife.maintained,2);conserved(w);w.turn++;
 o.E=4;o.M=.2;ledger(w);const ctx=E.context(w);E.prepare(w,ctx);E.B.move(w,ctx);
 const d=N.lifeDemands(w,ctx);assert.equal(d.requests.find(r=>r.kind==='mineral').ability,1);
 E.N.payActions(w,ctx);N.acquire(w,ctx,[]);N.settleBudgets(w,ctx,d.maintenance);L.advance(w,ctx,N,E.B.moveCost);assert.equal(o.cellLife.maintained,3);conserved(w);w.turn++;
 const next=E.context(w);E.prepare(w,next);E.B.move(w,next);assert.equal(N.lifeDemands(w,next).requests.find(r=>r.kind==='mineral').ability,1.1);
});

test('shortage removes leaves before base, preserves matter for next T, and may recover using paid growth',()=>{
 const w=fixture(),o=add(w,'poor','grass',{B:2.5,E:0,M:0});ledger(w);life(w);near(o.B,2);near(o.cellLife.baseB,2);conserved(w);w.turn++;
 ledger(w);life(w);near(o.B,1.9);near(o.cellLife.baseB,1.9);conserved(w);w.turn++;
 o.E=4;o.M=.2;o.birthReady=100;ledger(w);life(w);assert(o.B>1.9);near(o.cellLife.baseB,2);assert(o.cellMatter.newB>0);assert(o.cellMatter.tissueAt===w.turn);conserved(w);
});

test('colony birth pays exact body and reserves, starts I/0, occupies a real slot and cannot act again this T',()=>{
 const w=fixture(),o=add(w,'parent','grass',{B:22,E:4,M:.2});o.cellLife.maintained=3;ledger(w);const ctx=life(w),child=w.organisms.find(a=>a.id!==o.id);
 assert(child);assert.equal(child.phase,1);assert.equal(child.age,0);near(child.B,2);near(child.cellLife.baseB,1);near(child.E,.5);near(child.M,.025);near(child.cellMatter.bodyM,.04);
 near(o.E,.9);near(o.M,.125);assert.deepEqual(child.parents,[o.id]);assert.equal(ctx.old.has(child.id),false);assert.equal(ctx.births.length,1);assert.throws(()=>L.advance(w,ctx,N,E.B.moveCost),/ALREADY_APPLIED/);conserved(w);
});

test('full slots block plant births with no failed-birth charge',()=>{
 const w=fixture();for(const cell of S.nearby(w,18,1,true))for(let i=0;i<6;i++){const o=add(w,cell+':'+i,'grass',{cell,B:22,E:4,M:.2});o.cellLife.maintained=3;if(cell!==18||i!==0)o.birthReady=100;}
 const count=w.organisms.length;ledger(w);const ctx=life(w);assert.equal(ctx.births.length,0);assert.equal(w.organisms.length,count);for(const o of w.organisms)near(o.E,3.8);conserved(w);
});

test('high plant can reproduce at mature age in phase I; phase and age stay independent',()=>{
 const w=fixture(),o=add(w,'tree','forestcrown',{age:40,phase:1,B:12,E:7.5,M:.375});ledger(w);life(w);const child=w.organisms.find(a=>a!==o);
 assert(child);assert.equal(child.age,0);assert.equal(child.phase,1);near(child.B,4);near(child.cellLife.baseB,2);near(child.E,1);near(child.M,.05);near(o.E,1.45);near(o.M,.2325);assert.equal(child.birthLife>=540&&child.birthLife<=660,true);conserved(w);
});

test('phase raises limits only; old traits apply through the turn, with no refill or rejuvenation',()=>{
 const w=fixture(),o=add(w,'evolver','forestcrown',{age:10,G:12,phase:1,B:12,E:7.5,M:.375});const lifespan=o.birthLife;ledger(w);const ctx=life(w);
 assert.equal(o.phase,2);assert.equal(ctx.traits.get(o.id).phase,1);near(o.B,12);assert(o.E<7.5);assert.equal(o.birthLife,lifespan);assert.equal(o.age,11);near(S.phenotype(w,o).capB,24);conserved(w);
 const old=S.CellLife.age({...o,age:Math.floor(o.birthLife*.9)});assert(old.production<1);assert(old.maintenance>1);
});

test('internal birth uses maturity 8T, pays child body/reserves and enforces 4T cooldown and 8 members',()=>{
 const w=fixture(),o=group(w,'herd',7,{age:8});ledger(w);let ctx=life(w);assert.equal(S.ConsumerGroup.count(o),8);const c=o.consumerGroup.cohorts.find(c=>c.age===0);assert(c);near(c.B,.5);assert.equal(c.phase,1);near(o.B,14.5);assert.equal(o.birthReady,5);assert.equal(ctx.births.length,1);conserved(w);
 w.turn++;ledger(w);ctx=life(w);assert.equal(S.ConsumerGroup.count(o),8);assert.equal(ctx.births.length,0);conserved(w);
 const other=fixture(),immature=group(other,'young',2,{age:7});ledger(other);life(other);assert.equal(S.ConsumerGroup.count(immature),2);assert.equal(immature.consumerGroup.cohorts[0].age,8);conserved(other);
});

test('partial age death uses exact cohort body and transfers its reserves once',()=>{
 const w=fixture(),o=group(w,'mixed',2,{age:10,E:2,M:.08,B:2.5});o.consumerGroup.cohorts=[{age:S.spec(o).life-1,phase:1,n:1,B:.5},{age:10,phase:1,n:1,B:2}];o.birthReady=100;
 ledger(w);const ctx=life(w);assert.equal(S.ConsumerGroup.count(o),1);near(o.B,2);assert.equal(o.consumerGroup.cohorts[0].age,11);assert.equal(ctx.deaths[0].count,1);
 const remains=w.carcasses;near(remains.reduce((n,r)=>n+r.G,0),.5);conserved(w);
});

test('split moves exactly three real members into a legal new group; no merge, duplicated material or same-T chain',()=>{
 const w=fixture(),o=group(w,'split',8,{age:10,B:14});o.birthReady=100;add(w,'food','grass',{cell:19,B:22,E:0,M:0});
 // Prevent the food colony from shrinking or birthing while this fixture checks splitting.
 ledger(w);const ctx=ready(w);L.advance(w,ctx,N,E.B.moveCost);const groups=w.organisms.filter(S.ConsumerGroup.is);assert.equal(groups.length,2);
 const child=groups.find(a=>a!==o);assert.equal(child.cell,19);assert.equal(S.ConsumerGroup.count(o),5);assert.equal(S.ConsumerGroup.count(child),3);
 near(o.B+child.B,16);assert.equal(child.consumerGroup.cohorts[0].age,11);assert.equal(child.cellLife.processedAt,1);assert.equal(ctx.births.length,0);conserved(w);
});

test('ordinary same-species groups coexist without automatic merging; lifespan does not kill an entire colony',()=>{
 const w=fixture(),a=group(w,'a',2,{age:10}),b=group(w,'b',2,{age:10}),p=add(w,'old','grass',{age:10000,B:22,E:0,M:0});a.birthReady=b.birthReady=100;
 ledger(w);life(w);assert.equal(w.organisms.filter(S.ConsumerGroup.is).length,2);assert.equal(S.ConsumerGroup.count(a)+S.ConsumerGroup.count(b),4);assert(w.organisms.includes(p));conserved(w);
});

test('generated engine, source engine and Worker delta agree on the life boundary; normal entry remains guarded',()=>{
 const T=require('../src/ecology/transport.js'),G=require('../src/ecology/observation-model.js').model({producer:false,waterbug:false,hyperparasite:false});
 const w=fixture();add(w,'p','grass',{B:22,E:4,M:.2});group(w,'g',4);ledger(w);const initial=structuredClone(w),other=structuredClone(w),encode=T.encoder(w);
 const run=(e,v)=>{const ctx=e.context(v);e.prepare(v,ctx);e.B.move(v,ctx);e.cellLife(v,ctx);};run(E,w);run(G,other);assert.deepEqual(other,w);
 assert.deepEqual(T.apply(initial,JSON.parse(JSON.stringify(encode(w,true)))),w);assert.deepEqual(JSON.parse(JSON.stringify(w)),w);conserved(w);
 assert.throws(()=>G.beginTurn(w),/CELL_MODEL_INCOMPLETE/);
});

test('water supply stays unresolved and moving freshwater producer retains layer 4 and its own phenotype',()=>{
 const w=fixture();w.turn=0;delete w.cellState;delete w.cellProfiles;w.tiles[18].terrain='shallow';C.initialize(w);w.turn=1;add(w,'alga','algae');ledger(w);
 assert.throws(()=>life(w,true),/CELL_AQUATIC_PROFILE_UNRESOLVED/);
 const v=fixture(),o=add(v,'mobile','freshwaterlight');assert.equal(C.layer(o),4);assert.equal(S.CellLife.is(o),false);assert.equal(S.phenotype(v,o).speed,1);
});

test('short combined life run conserves stocks across births, deficits and changing cohort ages',()=>{
 const w=fixture();for(let i=0;i<3;i++)add(w,'plant'+i,'grass',{B:22,E:4,M:.2});group(w,'herd',4,{age:7});ledger(w);
 for(let t=0;t<12;t++){if(t)w.turn++;life(w,true);conserved(w);for(const o of w.organisms)if(S.ConsumerGroup.is(o))assert(S.ConsumerGroup.count(o)<=8);}
 assert(w.organisms.some(o=>o.cellLife.kind==='colony'));assert(w.organisms.some(o=>o.parents.length));
});

test('phase growth that adds protected base does not hide pre-existing edible leaves',()=>{
 const w=fixture(),o=add(w,'grown','forestcrown',{phase:2,B:24,E:0,M:0}),g=group(w,'hungry',8,{E:0,M:0});
 o.cellLife.baseB=4;o.cellMatter.tissueAt=1;o.cellMatter.newB=2;o.cellMatter.newEdibleB=0;
 ledger(w);const ctx=ready(w,true);near(ctx.cellResources.receipts.filter(r=>r.actor===g.id&&r.kind==='food').reduce((n,r)=>n+r.quantity,0),2);conserved(w);
});

test('high plant lifespan ends in a finite local return, and infection ownership survives partial transfers',()=>{
 const w=fixture(),o=add(w,'tree','forestcrown',{B:12,E:1,M:.1});o.age=o.birthLife-1;ledger(w);life(w);assert(!w.organisms.includes(o));assert(w.carcasses.some(r=>r.G===12&&r.availableAt===w.turn+1));conserved(w);
 const v=fixture(),g=group(v,'host',8);g.birthReady=100;g.infection={id:'P',species:'leafparasite',hostId:g.id,E:2,q:{id:'Q',species:'hyperparasite',hostId:'P',E:1,counts:[0,0,0]}};
 add(v,'plant','grass',{cell:19,B:22,E:0,M:0});ledger(v);life(v);
 const carriers=v.organisms.filter(o=>o.infection);assert.equal(carriers.length,1);assert.equal(carriers[0].infection.id,'P');assert.equal(carriers[0].infection.q.id,'Q');assert.equal(carriers[0].infection.hostId,carriers[0].id);conserved(v);
});
