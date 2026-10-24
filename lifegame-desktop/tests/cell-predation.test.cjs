'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace,N=E.N.CellResources;
const base={seed:'cell-predation',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',
 primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',parasiteDispersalModel:'fanout/1',primaryEggModel:'egg/1',informationModel:'persistent/1',ageModel:'life/1',ecologyRevision:'observation/4.1'};
function fixture(){const w=structuredClone(E.create(base));for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();C.initialize(w);w.turn=1;return w;}
function add(w,id,species='whale',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{birthReady:1000,age:40,E:0,M:0,...options});C.assign(w,o);w.organisms.push(o);return o;}
function herd(w,id,n=2,options={}){const o=add(w,id,'grassbug',{age:10,B:2*n,E:2*n,M:.05*n,...options});o.consumerGroup.cohorts=[{age:o.age,phase:1,n,B:o.B}];o.consumerGroup.wounds=0;o.HP=S.spec(o).capacity[3]*n;return o;}
function adult(w,id='adult-Q',options={}){const q=S.HyperParasite.create(w,null,0,id);Object.assign(q,{id,phase:4,age:20,bornAt:-20,B:.03,E:0,cell:18,...options});q.hyper.state='adult';q.hyper.settledAt=-1;q.hyper.detachedAt=0;q.hyper.cohort.members=1;w.searchQ.push(q);return q;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w,e=E,intents={}){const c=e.context(w);e.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,intents[o.id]||{type:'stop',cell:o.cell,path:[],cost:0});e.B.move(w,c);return c;}
function step(w,intents={},e=E){const c=ready(w,e,intents);e.cellLife(w,c);return c;}
function near(a,b,eps=.00005){assert(Math.abs(a-b)<=eps,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}
const attack=target=>({type:'attack',target:target.id,path:[],cell:target.cell,cost:999});
const meals=c=>c.cellResources.receipts.filter(r=>r.kind==='food'&&c.cellCaptures?.has(r.source));

test('one actual herd member supplies a finite same-cell meal and survivors use their own remaining capacity',()=>{
 const w=fixture(),p=add(w,'predator'),g=herd(w,'herd',3);ledger(w);const c=step(w);
 assert.equal(S.ConsumerGroup.count(g),2);near(g.B,4);assert.equal(c.traits.get(g.id).capE,4);near(c.cellResources.budgets.get(g.id).maintenance.E,.1);assert.equal(c.deaths.filter(d=>d.reason==='harvest').reduce((n,d)=>n+d.count,0),1);assert(meals(c).some(r=>r.actor===p.id&&r.E>0));conserved(w);
});

test('the full same-cell prey index is used instead of the single representative',()=>{
 const w=fixture(),p=add(w,'predator'),rich=herd(w,'rich-first',1),other=herd(w,'poor-last',1,{B:.5,E:0,M:0});ledger(w);const c=ready(w),offered=E.B.candidates(w,p,c,S.maps(w)).filter(a=>a.type==='harvest').map(a=>a.target);assert(offered.includes(rich.id)&&offered.includes(other.id));E.cellLife(w,c);
 assert(!w.organisms.includes(rich));assert(w.organisms.includes(other));assert(c.cellCaptureByActor.get(p.id).some(id=>c.cellCaptures.get(id).sourceId===rich.id));conserved(w);
});

test('competing predators cannot extract the same member twice; arbitration is array-order independent',()=>{
 const initial=fixture();add(initial,'a');add(initial,'b');herd(initial,'only-prey',1);const a=structuredClone(initial),b=structuredClone(initial);b.organisms.reverse();ledger(a);ledger(b);const ca=step(a),cb=step(b);
 const snapshot=(w,c)=>({animals:w.organisms.filter(o=>S.spec(o).group==='main').map(o=>[o.id,o.E,o.M]).sort(),captured:[...c.cellCaptureByActor.keys()].sort(),deaths:c.deaths.filter(d=>d.reason==='harvest').reduce((n,d)=>n+d.count,0)});
 assert.deepEqual(snapshot(a,ca),snapshot(b,cb));assert.equal(snapshot(a,ca).deaths,1);assert.equal(ca.cellCaptures.size,1);assert.equal(meals(ca).length,1);conserved(a);conserved(b);
});

test('actual co-located strikers share one killed body and its finite remainder waits for next T',()=>{
 const w=fixture(),a=add(w,'a','whale',{E:30}),b=add(w,'b','abyss',{E:30}),victim=add(w,'victim','crystal',{E:50,M:6,HP:1});ledger(w);const c=step(w,{a:attack(victim),b:attack(victim)}),food=meals(c),row=w.carcasses.find(r=>r.species===victim.species);
 assert(!w.organisms.includes(victim));assert.equal(c.cellCombatSources.get(victim.id).length,2);assert.equal(food.length,2);assert(food.every(r=>r.E>0));assert(row.E>0&&row.G>0);assert.equal(row.availableAt,2);assert.equal(c.deaths.filter(d=>d.id===victim.id).length,1);assert(!c.cellResources.receipts.some(r=>r.kind==='decompose'&&r.source===row.id));assert(c.events.get(a.id).some(e=>e.sourceType==='predation'));conserved(w);
});

test('partial combat death preserves the surviving injury and refreshes actual reserve limits',()=>{
 const w=fixture(),p=add(w,'predator','ryouki',{E:30,M:1}),g=herd(w,'injured-herd',3),unit=S.spec(g).capacity[3];g.consumerGroup.wounds=unit-.25;g.HP=2*unit+.25;ledger(w);const c=ready(w,E,{predator:attack(g)}),before=g.HP;
 E.B.combat(w,c);const hit=c.records.get(g.id).damage;assert(hit>.25&&hit<unit);E.N.payActions(w,c);N.resolveDeaths(w,c);
 assert.equal(S.ConsumerGroup.count(g),2);near(g.HP,before-hit);near(g.consumerGroup.wounds,2*unit-g.HP);near(c.traits.get(g.id).capE,4);near(c.traits.get(g.id).capM,.1);const hp=g.HP;E.cellLife(w,c);near(g.HP,hp);assert.equal(c.deaths.filter(d=>d.reason==='combat').reduce((n,d)=>n+(d.count??1),0),1);conserved(w);
});

test('new-model juvenile cohorts take only the actual injury, without a legacy HP-cap drop',()=>{
 const w=fixture(),g=herd(w,'young',2,{age:0}),before=g.HP;ledger(w);S.ConsumerGroup.damage(w,g,1);near(g.HP,before-1);near(g.consumerGroup.wounds,1);conserved(w);
});

test('starvation removing a member retains the remaining wound instead of healing it for free',()=>{
 const w=fixture(),g=herd(w,'starving',2,{E:0,M:0}),unit=S.spec(g).capacity[3];g.consumerGroup.wounds=unit-.01;g.HP=unit+.01;ledger(w);const c=step(w);assert.equal(S.ConsumerGroup.count(g),1);near(g.consumerGroup.wounds,.19);near(g.HP,unit-.19);assert.equal(c.deaths.filter(d=>d.reason==='starvation').reduce((n,d)=>n+(d.count??1),0),1);conserved(w);
});

test('an adjacent ranged kill grants no remote food; an actual arrival can eat the older remainder next T',()=>{
 const w=fixture(),p=add(w,'predator','whale',{cell:17,E:30}),victim=add(w,'victim','crystal',{E:40,M:3,HP:1});ledger(w);let c=step(w,{predator:attack(victim)});assert(!w.organisms.includes(victim));assert.equal(meals(c).length,0);assert(!c.cellCaptureByActor?.has(p.id));const row=w.carcasses[0],remaining=row.E;conserved(w);
 w.turn++;c=step(w,{predator:{type:'move',cell:18,path:[18],cost:0,direction:2}});assert.equal(p.cell,18);assert(c.cellResources.receipts.some(r=>r.source===row.id&&r.E>0));assert(row.E<remaining);conserved(w);
});

test('mutually killed attackers never eat, act again or receive kill rations',()=>{
 const w=fixture(),a=add(w,'a','whale',{HP:1,E:30}),b=add(w,'b','abyss',{HP:1,E:30});ledger(w);const c=step(w,{a:attack(b),b:attack(a)});assert.equal(w.organisms.length,0);assert.equal(c.cellResources.receipts.length,0);assert.equal(w.carcasses.length,2);assert(!c.cellCaptures?.size);conserved(w);
});

test('same-species attack and animation events cannot create a biological capture',()=>{
 const w=fixture(),a=add(w,'a','whale',{E:30}),b=add(w,'b','whale',{HP:1,E:30});ledger(w);const c=ready(w,E,{a:attack(b)});S.record(c,a,'attack',{target:b.id,actualDamage:999});E.cellLife(w,c);
 assert(w.organisms.includes(b));assert(!c.cellCombatSources?.has(b.id));assert.equal(c.records.get(a.id).dealt,0);assert.equal(meals(c).length,0);assert.equal(w.carcasses.length,0);conserved(w);
});

test('full reserves do not kill prey to obtain unused food, and capture cannot run after acquisition',()=>{
 const w=fixture(),p=add(w,'full','whale',{E:100,M:30}),g=herd(w,'prey',2);p.E=S.phenotype(w,p).capE;p.M=S.phenotype(w,p).capM;ledger(w);const c=step(w);assert.equal(S.ConsumerGroup.count(g),2);assert.equal(meals(c).length,0);assert.throws(()=>N.predation(w,c),/AFTER_ACQUISITION/);conserved(w);
});

test('M shortage alone never kills Q, which cannot supply minerals',()=>{
 const w=fixture(),p=add(w,'full-energy','whale',{M:0}),q=adult(w);p.E=S.phenotype(w,p).capE;ledger(w);const c=step(w);assert(w.searchQ.includes(q));assert.equal(meals(c).length,0);assert.equal(c.hyperFlow.bySpecies.hyperparasite.preyed,0);conserved(w);
});

test('new ordinary carcasses are not authorized captures, even with a forged source request',()=>{
 const w=fixture(),p=add(w,'predator'),g=herd(w,'prey',1);ledger(w);const c=ready(w);E.N.payActions(w,c);const row=N.remains(w,g,c);w.organisms=w.organisms.filter(o=>o!==g);N.resolveDeaths(w,c);N.predation(w,c);
 assert.throws(()=>N.acquire(w,c,[{id:'forged',actor:p.id,kind:'food',need:1,source:{kind:'capture',id:row.id}}]),/FOOD_SOURCE_INVALID/);assert.equal(c.cellResources.acquired,false);near(row.E,4);conserved(w);
});

test('the actual feeding route moves one P/Q tree; it is never a second corpse-route attempt',()=>{
 const w=fixture(),g=herd(w,'infected',1),p=S.infection(w,'leafparasite',g.id,0,g.id);p.stage='middle';p.counter=6;p.E=1;p.ready=1000;p.primary.settledAt=-1;p.primary.pauseUntil=-1;p.q=S.hyper(w,p.id,0);p.q.E=.1;g.infection=p;
 let id='receiver';for(let i=0;i<128;i++)if(S.r(w,'primary/migration',1,p.id,'receiver'+i)<.1){id='receiver'+i;break;}
 const receiver=add(w,id,'ryouki'),q=p.q;ledger(w);const c=step(w,{[id]:{type:'harvest',target:g.id,cell:18,path:[],cost:0}}),holders=[...w.organisms,...w.carcasses,...w.pending].filter(h=>h.infection===p);
 assert.equal(holders.length,1);assert.equal(p.hostId,holders[0].id);assert.equal(p.q,q);assert.equal(q.hostId,p.id);assert.equal(c.primaryFlow.bySpecies.leafparasite.feeding.invasionAttempts,1);assert.equal(c.primaryFlow.bySpecies.leafparasite.feeding.invaded,1);assert.equal(c.primaryFlow.bySpecies.leafparasite.carcass.invasionAttempts,0);assert(meals(c).some(r=>r.actor===receiver.id));conserved(w);
});

test('old autonomous Q is finite prey; its body and reserves are transferred once',()=>{
 const w=fixture(),p=add(w,'predator'),q=adult(w);ledger(w);const c=step(w);assert(!w.searchQ.includes(q));assert.equal(q.E+q.B,0);assert.equal(c.hyperFlow.bySpecies.hyperparasite.preyed,1);assert.equal(c.deaths.filter(d=>d.species==='hyperparasite'&&d.reason==='predation').length,1);assert(meals(c).some(r=>r.actor===p.id&&r.E>0));assert(!c.cellQActors?.has(q.id));conserved(w);
});

test('one paid Q escape protects against multiple co-resident hunters without a second fee',()=>{
 const w=fixture(),a=add(w,'a'),b=add(w,'b'),q=adult(w,'evader',{E:.1});const first=[a,b].sort((a,b)=>S.hash(w,'cell/capture',1,a.id)-S.hash(w,'cell/capture',1,b.id))[0];
 for(let i=0;i<128;i++)if(S.r(w,'hyper/cohort-evade',1,'evader'+i,first.id)<.8){q.id='evader'+i;break;}
 ledger(w);const c=ready(w);E.N.payActions(w,c);N.resolveDeaths(w,c);N.predation(w,c);near(q.E,.096);assert(w.searchQ.includes(q));assert.equal(c.events.get(q.id).filter(e=>e.type==='evade').length,1);assert(!c.cellCaptures?.size);conserved(w);
});

test('newly emerged Q and Q still attached to a living host are not free prey',()=>{
 const w=fixture();add(w,'predator');const q=adult(w,'new-Q',{E:.1,bornAt:1});q.hyper.detachedAt=1;const host=add(w,'host','crystal',{E:30});host.infection=S.infection(w,'leafparasite',host.id,0,host.id);host.infection.q=S.hyper(w,host.infection.id,0);ledger(w);const c=step(w);
 assert(w.searchQ.includes(q));near(q.E,.1);assert(host.infection?.q);assert.equal(meals(c).length,0);assert.equal(c.hyperFlow.bySpecies.hyperparasite.preyed,0);conserved(w);
});

test('source/generated and Worker/JSON preserve captured remainder and actual cohort loss; public guards remain',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),T=require('../src/ecology/transport.js'),A=require('../src/ecology/archive.js');
 const w=fixture(),a=add(w,'a','whale',{E:30}),victim=add(w,'victim','crystal',{E:40,M:3,HP:1});herd(w,'herd',3,{cell:19});ledger(w);const v=structuredClone(w),before=structuredClone(w),encode=T.encoder(w);
 step(w,{a:attack(victim)});step(v,{a:attack(v.organisms.find(o=>o.id===victim.id))},G);assert.deepEqual(v,w);conserved(w);assert.deepEqual(T.apply(before,JSON.parse(JSON.stringify(encode(w,true)))),w);
 require('./cell-turn-assertion.cjs')(G,w);assert.throws(()=>A.create({getItem:()=>null,setItem(){}},G,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});
