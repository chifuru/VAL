'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('./cell-archive-fixture.cjs'),
 E=require('../design/advantage-switches/model.cjs').model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,C=S.CurrentEcology,N=E.N.CellResources,
 O=require('../src/ecology/current-observations.js'),initial=E.create({...F.config,currentStateModel:'current-state/1'});
function world(){const w=structuredClone(initial);for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));delete w.cellState;delete w.cellProfiles;S.CellSpace.initialize(w);S.PersistentInformation.initialize(w);return w;}
function add(w,id,species='solar',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{age:18,E:0,M:0,...options});S.CellSpace.assign(w,o);w.organisms.push(o);return o;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function ready(w){const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.N.payActions(w,c);return c;}
function observation(w,ctx=E.context(w)){w.observation=C.observation(w,ctx);return w.observation;}
const near=(a,b,e=.00001)=>assert(Math.abs(a-b)<e,`${a} != ${b}`),sum=a=>a.reduce((n,x)=>n+x,0);

test('five current components use real assimilated E, a 20T half-life and readonly lookup',()=>{
 const w=world(),o=add(w,'learner');const energy=o.E;C.receive(w,o,4,null,{light:true});assert.deepEqual(o.uptake.dose,[4,0,0,0,0]);assert.equal(o.E,energy);
 w.turn=20;near(C.current(w,o)[0],2);const before=JSON.stringify(o);for(let i=0;i<5;i++)C.parts(w,o);assert.equal(JSON.stringify(o),before);
 C.receive(w,o,2,[1,0,0,0,0]);assert.deepEqual(o.uptake.dose,[2,2,0,0,0]);C.receive(w,o,1,[0,0,0,1,0]);assert.equal(o.uptake.dose[3],1);
 const saved=JSON.stringify(o);assert.throws(()=>C.receive(w,o,1,[NaN,0,0,0,0]),/CURRENT_UPTAKE_SOURCE/);assert.equal(JSON.stringify(o),saved);
});
test('unobserved and vanishing intake remains unknown; an empty source cannot invent a trophic level',()=>{
 const w=world(),o=add(w,'unknown');assert.deepEqual(C.parts(w,o),[0,0,0,0,1]);C.receive(w,o,1,[0,0,0,0,0]);assert.deepEqual(o.uptake.dose,[0,0,0,0,1]);
 w.turn=500;assert.deepEqual(C.current(w,o),[0,0,0,0,0]);assert.deepEqual(C.parts(w,o),[0,0,0,0,1]);
});
test('simultaneous acquisition freezes source evidence before photo commit and pays only actual intake',()=>{
 function run(reverse){const w=world();w.turn=1;const p=add(w,'plant','grass',{E:0,M:0,B:6}),o=add(w,'eater','whale',{E:0,M:0});ledger(w);const c=ready(w),asks=[{id:'light',actor:p.id,kind:'photo',need:1},{id:'food',actor:o.id,kind:'food',need:1,source:{kind:'organism',id:p.id}}];
  N.acquire(w,c,reverse?asks.reverse():asks,[{actor:p.id,height:0,area:1,capture:1}]);const received=c.cellResources.receipts.find(r=>r.actor===o.id);assert(received.E>0);near(sum(o.uptake.dose),received.E);assert.deepEqual(C.parts(w,o),[0,0,0,0,1]);assert.deepEqual(C.parts(w,p),[1,0,0,0,0]);return [p.uptake,o.uptake,S.totals(w)];}
 assert.deepEqual(run(false),run(true));
});
test('death/soil retains the source current composition and the next consumer shifts it once',()=>{
 const w=world();w.turn=1;const source=add(w,'source','solar',{E:8}),target=add(w,'consumer','whale');C.receive(w,source,2,[1,0,0,0,0]);ledger(w);
 let c=ready(w);N.remains(w,source,c);w.organisms=w.organisms.filter(o=>o!==source);S.SoilMatter.flush(w);const pool=S.SoilMatter.rows(w)[0];near(pool.trophic[1],pool.E);
 w.turn++;c=ready(w);N.acquire(w,c,[{id:'soil-food',actor:target.id,kind:'food',need:1,source:{kind:'residue',id:pool.id}}]);assert.deepEqual(C.parts(w,target),[0,0,1,0,0]);assert(!JSON.stringify(target.uptake).includes(source.id));
});
test('group extraction partitions current evidence rather than sharing or copying a whole intake record',()=>{
 const w=world(),group=add(w,'herd','grassbug',{age:10,B:8});C.receive(w,group,8,[1,0,0,0,0]);const before=S.ConsumerGroup.count(group),piece=S.ConsumerGroup.extract(w,group,1,'harvest',E.context(w));
 near(sum(piece.part.uptake.dose),8/before);near(sum(group.uptake.dose)+sum(piece.part.uptake.dose),8);assert.notStrictEqual(group.uptake,piece.part.uptake);assert.deepEqual(C.parts(w,piece.part),[0,1,0,0,0]);
});
test('host to P to Q taxes update the same five components without supplying extra E',()=>{
 const w=world();w.turn=1;const host=add(w,'host','grass',{E:2}),p=S.infection(w,'leafparasite',host.id,0,'test');host.infection=p;p.E=0;p.q=S.hyper(w,p.id,0);p.q.E=0;p.q.hyper.settledAt=0;C.receive(w,host,2,null,{light:true});ledger(w);const initialE=S.totals(w).E;
 ready(w);assert(p.primary.last.taxE>0);assert(p.q.hyper.last.taxE>0);assert(C.current(w,p)[1]>0);assert(C.current(w,p.q)[2]>0);near(S.totals(w).E+w.ledger.sinks,initialE);
});
test('an actual parasitic effect remains observable even when its actor dies in the same turn',()=>{
 const w=world();w.turn=1;const host=add(w,'host','grass',{E:2}),p=S.infection(w,'leafparasite',host.id,0,'late-death');host.infection=p;p.E=0;ledger(w);const c=ready(w);assert(p.primary.last.taxE>0);
 S.loseInfection(w,p);host.infection=null;const r=C.observation(w,c);assert.equal(r.counts.leafparasite,0);assert(r.actions.some(a=>a.from==='leafparasite'&&a.type==='parasitism'&&a.amount>0));
});
test('contacts include every co-located layer, deduplicate endpoints and have no past pair registry',()=>{
 const w=world();w.turn=1;add(w,'a','grass');add(w,'b','moss');add(w,'c','fungus',{B:4});add(w,'d','grassbug');add(w,'e','solar');add(w,'f','whale',{cell:19});
 const first=C.contacts(w);assert.equal(sum(Object.values(first)),15);w.organisms.reverse();assert.deepEqual(C.contacts(w),first);w.turn++;assert.deepEqual(C.contacts(w),first);assert(!Object.hasOwn(w,'contactPairs'));
 const q=S.hyper(w,null,0);q.phase=4;q.cell=18;w.searchQ.push(q);assert.equal(sum(Object.values(C.contacts(w))),21);
});
test('contact or animation alone never creates confirmed effects; real damage/defense/care do',()=>{
 const w=world();w.turn=1;const a=add(w,'a','solar'),b=add(w,'b','whale'),c=E.context(w);S.record(c,a,'attack',{target:b.id});S.record(c,a,'defend');
 let r=C.observation(w,c);assert(sum(Object.values(r.contacts))>0);assert.equal(r.actions.length,0);
 S.record(c,a,'attack',{target:b.id,actualDamage:2,mitigated:1});S.record(c,a,'care',{target:b.id,amount:.5});r=C.observation(w,c);assert.deepEqual(r.actions.map(a=>a.type).sort(),['care','combat','defense']);
});
test('anonymous soil and information stay classified unknown rather than inventing a source organism',()=>{
 const w=world();w.turn=1;const o=add(w,'recipient'),c=E.context(w);S.record(c,o,'feed',{source:'not-an-organism',sourceType:'residue',sourceAggregated:true,sourceClass:'lower-animal',assimilated:1,amount:2});
 c.infoEffects=[{recipient:o.id,species:o.species,event:{id:'field-bucket',sourceSpecies:null},deltaAbs:.2}];const r=C.observation(w,c);
 const food=r.actions.find(a=>a.type==='feeding'),info=r.actions.find(a=>a.type==='information');assert.equal(food.to,'@soil/lower-animal');assert.equal(food.toKnown,false);assert.equal(info.from,'@information');assert.equal(info.fromKnown,false);assert(!JSON.stringify(r).includes('not-an-organism'));
});
test('current generation facts remain on individuals while only this-turn deltas go to observers',()=>{
 const w=world(),mother=add(w,'mother','solar',{age:100,generation:3});ledger(w);observation(w);const h=O.create(w.config);h.append(w);assert.equal(h.generations[0].initial,1);
 w.turn=1;const child=add(w,'child','solar',{age:0,generation:4,parents:[mother.id]}),c=E.context(w);c.children.push(child);c.parents.add(mother.id);mother.firstBirthAt=1;c.traits.get(mother.id).ageStage='juvenile';observation(w,c);h.append(w);
 assert(h.generations.some(r=>r.generation===4&&r.born===1));assert(h.generations.some(r=>r.generation===3&&r.matured===1&&r.reproduced===1));assert.equal(child.parents[0],mother.id);
 w.turn=2;observation(w);h.append(w);assert.equal(h.generations.find(r=>r.generation===4).born,1);assert(!Object.hasOwn(w,'demography'));assert(!Object.hasOwn(w,'contactPairs'));assert.deepEqual(w.observation.demographyDelta,[]);
});
test('a death event lacking age/generation obtains facts from the actual dead subject',()=>{
 const w=world();w.turn=1;const o=add(w,'juvenile','solar',{age:0,generation:7}),c=E.context(w);N.remains(w,o,c);w.organisms=[];c.deaths.push({id:o.id,species:o.species,reason:'starvation'});const r=C.observation(w,c);
 assert.equal(r.demographyDelta.find(a=>a.generation===7).juvenileDeaths,1);
});
test('full-turn observations/CSV use 50T effects and completed 10T intervals while contacts stay separate',()=>{
 const w=world(),eater=add(w,'eater','solar'),plant=add(w,'plant','grass');ledger(w);const h=O.create(w.config,{species:S.activeSpecies(w),signature:'test-current'});
 for(let t=0;t<=61;t++){w.turn=t;const c=E.context(w);if([1,11].includes(t))S.record(c,eater,'feed',{source:plant.id,sourceSpecies:plant.species,sourceType:'organism',tag:'plant',assimilated:1,amount:2});observation(w,c);const bytes=JSON.stringify(w);h.append(w);assert.equal(JSON.stringify(w),bytes);
  if(t===19)assert.equal(h.last.relations.continuityPending,true);if(t===20)assert.equal(h.last.relations.continuousEdges,1);if(t===30)assert.equal(h.last.relations.continuousEdges,0);}
 assert.equal(h.turns,62);assert.equal(h.last.relations.confirmedEdges,0);assert.equal(h.last.relations.actionTypes,0);assert(h.last.contacts);assert(Object.values(h.contacts).every(r=>r.turns===61));
 const csv=h.csv();assert(csv.includes('"61","population"'));assert(csv.includes('"0","generation_initial"'));assert(csv.includes('"11","action_amount"'));assert(!Object.hasOwn(w,'demography'));
});
test('observation snapshots are independent, read-only after restore and reject corruption/gaps/foreign worlds',()=>{
 const w=world();add(w,'a');ledger(w);observation(w);const h=O.create(w.config);const before=JSON.stringify(w);h.append(w);const snap=h.snapshot(),restored=O.restore(snap);assert.equal(restored.csv(),h.csv());assert.deepEqual(restored.snapshot(),snap);
 assert.throws(()=>restored.append(w),/READ_ONLY/);assert.throws(()=>h.append(w),/TURN_GAP/);const foreign=structuredClone(w);foreign.turn=1;foreign.config.seed='another-world';assert.throws(()=>h.append(foreign),/TURN_GAP/);
 const broken=structuredClone(snap);broken.rows[0].counts.solar++;assert.throws(()=>O.restore(broken),/INVALID|SNAPSHOT/);snap.rows[0].counts.solar=999;assert.notEqual(h.last.counts.solar,999);h.csv();assert.equal(JSON.stringify(w),before);
});
test('initial unknown biomass and later observed composition retain all B without converting role to trophic level',()=>{
 const w=world(),a=add(w,'producer','grass'),b=add(w,'consumer','solar'),fungus=add(w,'decomposer','fungus',{B:4});let r=C.observation(w,E.context(w));near(r.pyramid.side.unknown,a.B+b.B);near(r.pyramid.side.decomposer,fungus.B);
 C.receive(w,a,1,null,{light:true});C.receive(w,b,1,[1,0,0,0,0]);r=C.observation(w,E.context(w));near(r.pyramid.layers[0],a.B);near(r.pyramid.layers[1],b.B);near(r.pyramid.biomassTotal,a.B+b.B+fungus.B);
});
test('source/generated, cancellation and observer reconstruction agree for one short natural condition',()=>{
 const G=require('../src/ecology/observation-model.js').model(F.config.advantageSettings);let a=E.create({...F.config,currentStateModel:'current-state/1'}),b=G.create({...F.config,currentStateModel:'current-state/1'});const ha=O.create(a.config),hb=O.create(b.config);ha.append(a);hb.append(b);
 for(let t=0;t<4;t++){const bytes=JSON.stringify(a),job=E.beginTurn(a);job.advance();job.advance();job.cancel();assert.equal(JSON.stringify(a),bytes);a=E.step(a);b=G.step(b);assert.deepEqual(a,b);assert.deepEqual(E.invariants(a),[]);ha.append(a);hb.append(b);}
 assert.deepEqual(ha.snapshot(),hb.snapshot());assert.equal(ha.csv(),hb.csv());assert.equal(O.restore(ha.snapshot()).turns,5);assert(!Object.hasOwn(a,'demography'));assert(!Object.hasOwn(a,'contactPairs'));
});
