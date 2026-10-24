'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../design/advantage-switches/model.cjs').model({producer:false,waterbug:false,hyperparasite:false}),
 S=E.S,C=S.CellSpace,T=S.SoilMatter,N=E.N.CellResources;
const base={seed:'current-soil',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},producerModel:'colony/1',largePlantModel:'independent/1',
 largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',informationModel:'persistent/1',ageModel:'life/1',ecologyRevision:'observation/4.1'};
function world(){const w=E.create(base);for(const key of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[key]=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));
 w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();w.config.currentStateModel='current-state/1';C.initialize(w);S.PersistentInformation.initialize(w);w.turn=1;return w;}
function add(w,id,species='solar',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{age:18,E:10,M:0,...options});C.assign(w,o);w.organisms.push(o);return o;}
function corpse(w,{id='dead',cell=18,sourceClass='lower-animal',E:energy=10,M=.2,B=5,created=0}={}){
 const a={id,cell,sourceClass,species:sourceClass==='plant'?'grass':'grassbug',slot:'food',tag:T.tagOf(sourceClass),E:energy,M,G:B,q:Math.max(energy,B),created,availableAt:created+1,payloadExpires:null,infection:null};w.carcasses.push(a);return a;
}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function close(a,b,eps=.00002){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);close(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);close(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}
function ready(w){const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.N.payActions(w,c);return c;}
function background(w,c){c.cellLifeDone=true;return N.background(w,c);}
const req=(id,o,kind,source,need=2)=>({id,actor:o.id,kind,need,source:{kind:source.depositedAt===undefined?'organic':'residue',id:source.id}});

test('many deaths coalesce by cell/class/day, retain finite E/M/B, and discard dead identity',()=>{
 const w=world();for(let i=0;i<2000;i++)corpse(w,{id:'dead-'+i,E:1,M:.02,B:.5});ledger(w);T.flush(w);
 assert.equal(w.carcasses.length,0);assert.equal(w.cellState.soil.fresh.length,1);const r=w.cellState.soil.fresh[0];close(r.E,2000);close(r.M,40);close(r.B,1000);
 assert(!JSON.stringify(w.cellState.soil).includes('dead-'));conserved(w);const before=JSON.stringify(w);T.flush(w);assert.equal(JSON.stringify(w),before);
});
test('different diet classes stay separate and waiting minerals are never edible stock',()=>{
 const w=world();for(const sourceClass of ['plant','fungal','lower-animal','main-animal'])corpse(w,{id:sourceClass,sourceClass});ledger(w);T.flush(w);
 assert.equal(w.cellState.soil.fresh.length,4);assert.equal(new Set(w.cellState.soil.fresh.map(r=>r.tag)).size,3);T.wait(w,18,3);w.ledger.initialM+=3;
 assert.equal(T.rows(w).length,4);assert.equal(w.cellState.soil.waiting.length,1);conserved(w);
});
test('new death is unavailable to general feeding until next T; B is not added to E twice',()=>{
 const w=world(),victim=add(w,'victim','solar',{E:12,B:10,M:2}),bodyM=victim.cellMatter.bodyM,remaining=victim.E+victim.B;ledger(w);const c=ready(w),r=N.remains(w,victim,c);w.organisms=[];
 assert.equal(r.E,remaining);T.flush(w);assert.equal(T.index(w).size,0);assert.equal(w.cellState.soil.fresh[0].M,2+bodyM);conserved(w);
 w.turn++;N.begin(w,E.context(w));assert.equal(T.index(w).get(18).length,1);assert.equal(w.cellState.soil.fresh[0].E,remaining);conserved(w);
});
test('fresh stock ages into one decomposed pool at 10T, without rebinding old carriers to a reused fresh slot',()=>{
 const w=world();corpse(w,{created:0});T.flush(w);const old=w.cellState.soil.fresh[0];const carrier={id:'carrier',cell:18,soilRef:{id:old.id,depositedAt:0},E:0,M:0,G:0,q:0};w.carcasses.push(carrier);ledger(w);
 w.turn=9;T.advance(w);assert.equal(w.cellState.soil.fresh.length,1);w.turn=10;T.advance(w);assert.equal(w.cellState.soil.fresh.length,0);assert.equal(w.cellState.organic.length,1);assert.equal(carrier.soilRef.id,w.cellState.organic[0].id);
 corpse(w,{id:'new',created:10});w.ledger.initialE+=10;w.ledger.initialM+=.2;T.flush(w);assert.equal(w.cellState.soil.fresh.length,1);assert.notEqual(carrier.soilRef.id,w.cellState.soil.fresh[0].id);conserved(w);
});
test('shared source requests are independent of death count and share one processing budget per fungus',()=>{
 for(const n of [1,1000]){const w=world(),o=add(w,'fungus','fungus',{B:4,E:0,M:0});for(let i=0;i<n;i++)corpse(w,{id:'body-'+i});T.flush(w);ledger(w);const c=ready(w),d=N.lifeDemands(w,c),asks=d.requests.filter(r=>r.kind==='decompose');assert.equal(asks.length,1);
  const r=T.rows(w)[0],before=r.E;N.acquire(w,c,d.requests,d.canopies);assert(r.E<before);assert(c.cellResources.receipts.some(r=>r.actor===o.id&&r.kind==='decompose'));conserved(w);
 }
});
test('fungi and consumers compete for the same real pool; request order does not change grants',()=>{
 function run(reverse){const w=world(),a=add(w,'eater','whale',{E:0,M:0}),b=add(w,'fungus','fungus',{B:4,E:0,M:0});corpse(w,{E:2,M:.04,B:1});T.flush(w);ledger(w);const c=ready(w),r=T.rows(w)[0],asks=[req('eat',a,'food',r),req('decompose',b,'decompose',r)];N.acquire(w,c,reverse?asks.reverse():asks);conserved(w);return [a.E,b.E,r.E,r.M,r.B,c.cellResources.receipts];}
 assert.deepEqual(run(false),run(true));
});
test('decomposed food applies half assimilation and retains waste in the correct current class',()=>{
 function feed(decomposed){const w=world(),o=add(w,'eater','whale',{E:0,M:0});corpse(w);T.flush(w);if(decomposed)w.turn=10;ledger(w);const c=ready(w),r=T.rows(w)[0],before=o.E;N.acquire(w,c,[req('eat',o,'food',r,1)]);conserved(w);return {E:o.E-before,w};}
 const fresh=feed(false),old=feed(true);close(old.E,fresh.E*.5);assert(old.w.cellState.nextMaterial.some(r=>r.kind==='organic'&&r.sourceClass==='lower-animal'));assert(old.w.cellState.nextMaterial.every(r=>r.availableAt===old.w.turn+1));
});
test('plants cannot eat residues; ryouki cannot acquire main-animal or Q tissue; remote pool is rejected',()=>{
 const w=world(),p=add(w,'plant','grass',{E:0,M:0}),r=add(w,'ryouki','ryouki',{E:0,M:0}),remote=add(w,'remote','whale',{cell:19,E:0,M:0});corpse(w,{sourceClass:'main-animal'});T.flush(w);ledger(w);const c=ready(w),row=T.rows(w)[0];
 assert.throws(()=>N.acquire(w,c,[req('plant',p,'food',row)]),/FOOD_SOURCE_INVALID/);assert.throws(()=>N.acquire(w,c,[req('wrong-diet',r,'food',row)]),/FOOD_DIET_INVALID/);
 assert.throws(()=>N.acquire(w,c,[req('remote',remote,'food',row)]),/FOOD_SOURCE_INVALID/);conserved(w);
});
test('background uses activity times .02, returns M next T, and never reuses new M in the same T',()=>{
 const w=world();corpse(w,{E:100,M:2,B:20});T.flush(w);ledger(w);const c=ready(w),r=T.rows(w)[0],soil=w.tiles[18].soilM;const f=background(w,c);close(f.E,2);close(r.E,98);close(f.M,.04);assert.equal(w.tiles[18].soilM,soil);conserved(w);
 w.turn++;const next=E.context(w);N.begin(w,next);close(w.tiles[18].soilM,soil+.04);conserved(w);assert.throws(()=>N.begin(w,E.context(w)),/ALREADY/);
});
test('positive micro stocks reach heat/mineral waiting; a full soil does not retain individual remains',()=>{
 const w=world();corpse(w,{E:.000001,M:.000001,B:.000001});T.flush(w);w.tiles[18].soilM=w.cellProfiles.profiles[18].mineralCapacity;ledger(w);const c=ready(w);background(w,c);assert.equal(T.rows(w).length,0);assert.equal(w.carcasses.length,0);close(w.ledger.sinks,.000001);conserved(w);
 w.turn++;N.begin(w,E.context(w));assert.equal(w.cellState.soil.waiting.length,1);assert.equal(w.cellState.soil.waiting[0].M,.000001);conserved(w);
 w.tiles[18].soilM-=.000001;w.ledger.initialM-=.000001;w.turn++;N.begin(w,E.context(w));assert.equal(w.cellState.soil.waiting.length,0);conserved(w);
});
test('dry stock persists without decomposition, while mineral-only stock becomes a finite waiting pool',()=>{
 const w=world();corpse(w);corpse(w,{id:'mineral',sourceClass:'fungal',E:0,B:0,M:3});T.flush(w);ledger(w);const c=ready(w);w.cellState.water[18]=0;const before=JSON.stringify(T.rows(w));background(w,c);assert.equal(JSON.stringify(T.rows(w)),before);assert.equal(c.cellBackground.E,0);conserved(w);
});
test('P/Q are held once in zero-nutrition carriers, without dead appearance/DNA or duplicate energy',()=>{
 const w=world(),host=add(w,'host','grass');host.infection=S.infection(w,'leafparasite',host.id,0,'fixture');const p=host.infection;p.counter=S.PrimaryParasite.settings(w).development.first;p.E=1;p.q=S.hyper(w,p.id,0);p.q.E=.2;ledger(w);
 const c=ready(w),row=N.remains(w,host,c);w.organisms=[];T.flush(w);const carrier=w.carcasses[0];assert.strictEqual(carrier.infection,p);assert.equal(carrier.id,row.id);assert.deepEqual([carrier.E,carrier.M,carrier.G,carrier.q],[0,0,0,0]);assert(!carrier.appearance);assert(!carrier.dna);assert.equal(S.PrimaryParasite.entries(w).length,1);assert.equal(S.HyperParasite.entries(w).length,1);conserved(w);
 w.turn=carrier.payloadExpires;T.advance(w);N.payloads(w,E.context(w));T.flush(w);assert.equal(w.carcasses.length,0);conserved(w);
});
test('actual feeding on the pool can transfer a mature P; pending transfer is neither cloned nor nutrition',()=>{
 const w=world(),host=add(w,'host','grass'),target=add(w,'target','grassbug',{E:0,M:0});host.infection=S.infection(w,'leafparasite',host.id,0,'route');const p=host.infection;p.counter=S.PrimaryParasite.settings(w).development.first;p.E=1;ledger(w);
 let c=ready(w);N.remains(w,host,c);w.organisms=w.organisms.filter(o=>o!==host);T.flush(w);w.turn++;c=ready(w);const row=T.rows(w)[0],random=S.r;S.r=()=>0;
 try{N.acquire(w,c,[req('eat',target,'food',row,1)]);}finally{S.r=random;}
 assert(w.pending.some(a=>a.infection===p&&a.hostId===target.id));assert.equal(w.carcasses.filter(a=>a.infection===p).length,0);assert.equal(S.PrimaryParasite.entries(w).filter(a=>a.p===p).length,1);conserved(w);
});
test('new remains after the background phase are also integrated before committing the turn',()=>{
 const w=world(),o=add(w,'late','solar');ledger(w);const c=ready(w);background(w,c);N.remains(w,o,c);w.organisms=[];E.finish(w,c);assert.equal(w.carcasses.length,0);assert.equal(w.cellState.soil.fresh.length,1);assert.equal(w.soilMatterSummary.freshPools,1);conserved(w);
});
test('same-turn captures remain restricted to real participants; the remainder becomes next-T soil',()=>{
 const w=world(),p=add(w,'attacker','whale',{E:30}),bystander=add(w,'observer','abyss',{E:30}),victim=add(w,'victim','crystal',{HP:1,E:20});ledger(w);
 const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);
 c.intents.set(p.id,{type:'attack',target:victim.id,path:[],cell:18,cost:999});E.B.combat(w,c);E.N.payActions(w,c);N.resolveDeaths(w,c);N.predation(w,c);
 const d=N.lifeDemands(w,c);N.acquire(w,c,d.requests,d.canopies);const captureMeals=c.cellResources.receipts.filter(r=>c.cellCaptures?.has(r.source));
 assert(captureMeals.some(r=>r.actor===p.id&&r.E>0));assert(!captureMeals.some(r=>r.actor===bystander.id));assert.equal(T.rows(w).length,0);
 T.flush(w);assert.equal(w.cellState.soil.fresh.length,1);assert.equal(T.index(w).size,0);conserved(w);
});
test('ordinary new remains cannot be forged into a capture or read as an available soil pool',()=>{
 const w=world(),p=add(w,'eater','whale',{E:0}),victim=add(w,'victim','solar');ledger(w);const c=ready(w),r=N.remains(w,victim,c);w.organisms=w.organisms.filter(o=>o!==victim);c.current=S.maps(w);
 assert.throws(()=>N.acquire(w,c,[{id:'forged',actor:p.id,kind:'food',need:1,source:{kind:'capture',id:r.id}}]),/FOOD_SOURCE_INVALID/);
 T.flush(w);const pooled=T.rows(w)[0];assert.throws(()=>N.acquire(w,c,[req('early',p,'food',pooled)]),/FOOD_SOURCE_INVALID/);conserved(w);
});
test('source/generated agree through 4T; the generated run crosses the fresh-stock age boundary at 12T',()=>{
 const F=require('./cell-archive-fixture.cjs'),G=require('../src/ecology/observation-model.js').model(F.config.advantageSettings);let a=E.create({...F.config,currentStateModel:'current-state/1'}),b=G.create({...F.config,currentStateModel:'current-state/1'});
 for(let t=0;t<4;t++){const before=JSON.stringify(a),job=E.beginTurn(a);job.advance();job.advance();job.cancel();assert.equal(JSON.stringify(a),before);a=E.step(a);b=G.step(b);assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);assert(a.carcasses.every(c=>c.soilRef&&c.E===0));}
 for(let t=4;t<12;t++){b=G.step(b);assert.deepEqual(G.invariants(b),[]);}assert.equal(b.turn,12);assert(b.cellState.soil.fresh.every(r=>b.turn-r.depositedAt<10));
 assert(a.cellState.organic.length>0);assert(a.cellState.soil.fresh.length>0);
});
