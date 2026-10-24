'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const flags={producer:false,waterbug:false,hyperparasite:false},E=require('../design/advantage-switches/model.cjs').model(flags),S=E.S,C=S.CellSpace,N=E.N.CellResources;
const base={seed:'cell-interactions',width:8,height:8,initial:0,enabled:{main:false,plant:true,prey:false,fungus:false,P:false,Q:false},
 founderCounts:{version:1,species:{grass:0,moss:0,algae:0,phytoplankton:0},parasites:{}},
 producerModel:'colony/1',largePlantModel:'independent/1',largePlantSettings:{autoDensity:{land:0,water:0}},consumerModel:'group/1',ryoukiModel:'ryouki/1',
 primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',parasiteDispersalModel:'fanout/1',primaryEggModel:'egg/1',informationModel:'persistent/1',ecologyRevision:'observation/4.1'};
function fixture(){const w=structuredClone(E.create(base));for(const k of ['organisms','resources','carcasses','pending','primaryInocula','hyperInocula','searchQ','informationField'])w[k]=[];
 w.tiles=w.tiles.map(t=>({...t,terrain:'plain',env:3,light:1,soilM:5,blocked:false,cover:'none',walls:[]}));w.config.cellModel=C.VERSION;w.config.cellSettings=C.settings();C.initialize(w);w.turn=1;return w;}
function add(w,id,species='grass',options={}){const o=S.organism(w,S.D.byId[species],options.cell??18,id,{birthReady:100,...options});if(options.mutated)o.ryouki.mutated=true;C.assign(w,o);w.organisms.push(o);return o;}
function group(w,id,n=2,options={}){const o=add(w,id,'grassbug',{age:10,B:2*n,E:2*n,M:.05*n,...options});o.consumerGroup.cohorts=[{age:o.age,phase:1,n,B:o.B}];o.HP=S.spec(o).capacity[3]*n;return o;}
function infect(w,o,stage='middle',counter=0,q=false){const p=S.infection(w,'leafparasite',o.id,0,o.id);p.stage=stage;p.counter=counter;p.E=1;p.primary.settledAt=-1;p.primary.pauseUntil=-1;o.infection=p;if(q){p.q=S.hyper(w,p.id,0);p.q.E=.1;}return p;}
function ledger(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};}
function near(a,b){assert(Math.abs(a-b)<.00003,`${a} != ${b}`);}
function conserved(w){const t=S.totals(w);near(t.E+w.ledger.sinks,w.ledger.initialE+w.ledger.solar);near(t.M+w.ledger.Mloss,w.ledger.initialM+(w.ledger.cellInputM||0));assert.deepEqual(C.validate(w),[]);}
function ready(w,prepare=true){const c=E.context(w);if(prepare)E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.N.payActions(w,c);return c;}
function step(w){const c=ready(w);E.cellLife(w,c);return c;}
function dose(w,p,extra={}){const i=S.PrimaryParasite.inoculum(w,p,{id:'dose/'+w.primaryInocula.length,kind:'contact',cell:18,E:.06,createdAt:0,expires:20,sourceStage:'terminal',stage:'terminal',...extra});w.primaryInocula.push(i);return i;}
function bundle(w,cell=18){const origin='prior-info',content={originId:origin,contentId:'feeding',meaning:'feeding',kind:'fast',experienceAt:0,halfLife:25,originalValues:[{axis:2,value:2}],values:[{axis:2,value:2}],evidence:'normal',context:{cell,env:3},scope:'all',roles:['producer'],peerSpecies:'grass',count:3,distinctTurns:2};
 const row={id:origin+':cell:'+cell,originId:origin,sourceId:'dead-source',sourceSpecies:'grass',sourceRoles:['producer'],generatedAt:0,expires:160,amount:1,cell,contents:[content],score:.6,lowEvidence:false,qEffects:{promotion:0,vectors:Array(9).fill(0),traces:[]}};w.informationField.push(row);w.informationLedger.initialAmount=1;return row;}

test('prepare settles finite parasite tax before reception and uses actual cell maintenance for each co-resident',()=>{
 const w=fixture(),a=add(w,'plant'),b=add(w,'fungus','fungus'),p=infect(w,a,'first',0);bundle(w);ledger(w);const before=a.E,c=ready(w);
 assert(p.primary.last.taxE>0);assert(a.E<before-p.primary.last.taxE);assert.equal(a.informationState.last.received,1);assert.equal(b.informationState.last.received,1);
 near(a.informationState.last.costE,c.costs.get(a.id).base*.01);near(b.informationState.last.costE,c.costs.get(b.id).base*.01);assert(c.costs.get(a.id).budget<=a.E);conserved(w);
});

test('information reception cannot borrow nutrition from later feeding',()=>{
 const w=fixture(),o=group(w,'hungry',1,{E:0});add(w,'future-food','grass');bundle(w);ledger(w);const c=ready(w);assert.equal(o.informationState.last.received,0);assert(c.persistentInformationFlow.all.rejectedBudget>0);near(o.E,0);conserved(w);
});

test('contact exposure visits all plant layers and every compressed main host ID',()=>{
 for(const main of [false,true]){const w=fixture(),donor=add(w,'donor','grass',{cell:0}),p=infect(w,donor,'first',0),targets=[];
  for(let n=0;n<9;n++)targets.push(add(w,'target'+n,main?'ryouki':n<6?'grass':'forestcrown',{mutated:main,age:40}));
  dose(w,p,{E:.54,sourceStage:main?'middle':'terminal',stage:main?'middle':'terminal'});ledger(w);const c=ready(w,false);E.P.contacts(w,c);
  assert.equal(c.primaryFlow.bySpecies.leafparasite.contact.exposures,9);const seen=new Set([...c.events].filter(([id,events])=>targets.some(t=>t.id===id)&&events.some(e=>['primary-invasion','primary-exposure'].includes(e.type))).map(([id])=>id));assert.equal(seen.size,9);
  const after=structuredClone(w);E.P.contacts(w,c);assert.deepEqual(w,after);conserved(w);
 }
});

test('eggs find a vacant co-resident plant hidden by an occupied representative',()=>{
 const w=fixture(),free=add(w,'free'),occupied=[];for(let n=0;n<5;n++){const host=add(w,'occupied'+n);occupied.push(infect(w,host,'first',0));}
 const i=dose(w,occupied[0],{egg:{version:'primary-egg/1',state:'free',attachedAt:null,hatchAt:null}});ledger(w);const c=ready(w,false);E.P.contacts(w,c);assert.equal(i.egg.state,'attached');assert.equal(i.hostId,free.id);assert.equal(i.egg.hatchAt,w.turn+w.config.primaryEggSettings.hatchTurns);conserved(w);
});

test('recorded intermediate contact permits one paid attempt even after the participants separate',()=>{
 const w=fixture(),host=group(w,'moving-source',1,{cell:0}),p=infect(w,host,'middle',6);add(w,'target','ryouki',{cell:63,age:40});ledger(w);const c=ready(w,false);
 c.cellMotion.contacts=[{cell:18,step:1,ids:[host.id,'target']}];E.P.contacts(w,c);assert.equal(c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,1);assert(p.E<1);const after=structuredClone(w);E.P.contacts(w,c);assert.deepEqual(w,after);conserved(w);
});

test('fresh dead hosts and new split holders cannot donate or receive contact migration this T',()=>{
 const w=fixture(),host=group(w,'dead',1),p=infect(w,host,'middle',6);add(w,'target','ryouki',{age:40});ledger(w);const c=ready(w,false),row=N.remains(w,host,c);w.organisms=w.organisms.filter(o=>o!==host);
 E.P.contacts(w,c);assert.equal(c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,0);assert.equal(row.infection,p);conserved(w);
 const v=fixture(),a=group(v,'donor',1),q=infect(v,a,'middle',6);ledger(v);const ctx=ready(v,false),newHost=add(v,'new-target','ryouki',{age:40});ledger(v);E.P.contacts(v,ctx);assert.equal(ctx.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,0);assert.equal(a.infection,q);assert(!newHost.infection);conserved(v);
});

test('simultaneous food grants expose only the actual remaining inoculum fraction',()=>{
 const w=fixture(),plant=add(w,'food','grass',{B:4,E:0,M:0}),p=infect(w,plant,'first',0),a=group(w,'a',4,{E:0,M:0}),b=group(w,'b',4,{E:0,M:0});
 const i=dose(w,p,{kind:'edible',hostId:plant.id,sourceStage:'first',stage:'first',route:'feeding',E:.06});ledger(w);const c=ready(w);N.acquire(w,c,[a,b].map(o=>({id:o.id,actor:o.id,kind:'food',need:1,source:{kind:'organism',id:plant.id}})));
 near(c.primaryFlow.bySpecies.leafparasite.feeding.exposureE,.06);near(i.E,0);near(plant.B,2);assert.equal(plant.infection,p);assert(c.events.get(a.id).some(e=>e.type==='feed'&&e.assimilated>0));conserved(w);
});

test('new carcass transfer is rejected while the same physical source becomes eligible on its next T',()=>{
 const w=fixture(),donor=group(w,'donor',1),p=infect(w,donor,'middle',6),target=add(w,'target','ryouki',{age:40});ledger(w);const c=ready(w,false),row=N.remains(w,donor,c);w.organisms=w.organisms.filter(o=>o!==donor);
 E.P.transfer(w,c,row,target,'carcass',{fraction:1});assert.equal(c.primaryFlow.bySpecies.leafparasite.carcass.invasionAttempts,0);
 w.turn++;const next=E.context(w);E.P.transfer(w,next,row,target,'carcass',{fraction:1});assert.equal(next.primaryFlow.bySpecies.leafparasite.carcass.invasionAttempts,1);assert(row.infection===p||w.pending.some(a=>a.infection===p));conserved(w);
});

test('partial age death moves a mature P/Q tree into one finite carcass without killing the surviving group information',()=>{
 const w=fixture(),o=group(w,'mixed',2),p=infect(w,o,'middle',6,true),q=p.q;o.consumerGroup.cohorts=[{age:S.spec(o).life-1,phase:1,n:1,B:2},{age:10,phase:1,n:1,B:2}];o.consumerGroup.infectedAge=S.spec(o).life-1;o.consumerGroup.infectedId=p.id;
 ledger(w);const c=step(w),row=w.carcasses.find(a=>a.infection?.id===p.id);assert(row);assert.equal(row.infection,p);assert.equal(row.infection.q,q);assert.equal(p.hostId,row.id);assert.equal(q.hostId,p.id);assert(Number.isFinite(row.payloadExpires));assert.equal(row.expires,null);assert.equal(S.ConsumerGroup.count(o),1);assert(!o.informationState.deathDecision);assert(!w.pending.some(a=>a.kind==='cell-host-remains'));assert(!c.informationDeaths?.has(o.id));conserved(w);
});

test('immature parasite on a dead individual is excluded instead of surviving in an unbounded pending holder',()=>{
 const w=fixture(),o=group(w,'aged',1),p=infect(w,o,'middle',0,true);o.consumerGroup.cohorts[0].age=S.spec(o).life-1;o.consumerGroup.infectedAge=S.spec(o).life-1;o.consumerGroup.infectedId=p.id;ledger(w);const c=step(w);
 assert(!w.organisms.includes(o));assert(w.carcasses.length===1);assert(!w.carcasses[0].infection);assert(!w.pending.some(a=>a.infection?.id===p.id));assert(p.informationState.deathDecision);assert(o.informationState.deathDecision);E.P.informationFinalize(w,c);assert.equal(c.persistentInformationFlow.all.deathDecisions,3);conserved(w);
});

test('split preserves the actual parasite objects and current information owner; dispersal never earns offspring credit',()=>{
 const w=fixture(),o=group(w,'split',8),p=infect(w,o,'middle',0,true),q=p.q;add(w,'food','grass',{cell:19,B:22,E:0,M:0});
 o.consumerGroup.cohorts=[{age:20,phase:1,n:3,B:6},{age:10,phase:1,n:5,B:10}];o.consumerGroup.infectedAge=20;o.consumerGroup.infectedId=p.id;
 ledger(w);const c=step(w),split=w.organisms.find(a=>a.consumerGroup?.origin===o.id);assert(split);assert.equal(split.infection,p);assert.equal(split.infection.q,q);assert(!o.infection);assert.equal(p.hostId,split.id);assert.equal(c.informationSubjects.get(p.id).host,split);assert.equal(c.informationSubjects.get(q.id).host,split);assert.equal(p.informationState.progress.maintained,1);conserved(w);
 split.age=5;w.turn++;const next=E.context(w);E.P.informationFinalize(w,next);assert.equal(o.informationState.progress.offspringSuccess,0);assert(!o.informationState.experience.some(x=>x.meaning==='reproduction'));
});

test('actual feeding, decomposition and plant formation feed different role experience without invented production',()=>{
 const w=fixture(),plant=add(w,'plant','grass',{B:4,E:2,M:.1}),animal=group(w,'consumer',1,{E:0,M:0}),fungus=add(w,'fungus','fungus',{B:1,E:.5,M:.04});w.cellState.organic.push({id:'organic',cell:18,E:4,M:.08,B:4});ledger(w);step(w);
 assert(plant.informationState.progress.roleAmounts.producer>0);assert(animal.informationState.progress.roleAmounts['primary-consumer']>0);assert(fungus.informationState.progress.roleAmounts.decomposer>0);assert(!animal.informationState.progress.roleAmounts.producer);assert(!fungus.informationState.progress.roleAmounts.producer);assert.equal(plant.informationState.progress.maintained,1);conserved(w);
});

test('death-created information has one decision and does not enter the frozen reception index this T',()=>{
 const w=fixture(),o=add(w,'tree','forestcrown'),reader=add(w,'reader');o.age=o.birthLife-1;
 S.PersistentInformation.addExperience(w,o,{meaning:'damage',contentId:'damage',peerId:'attacker',peerSpecies:'ryouki',result:'hit',amount:1,cell:o.cell,kind:'relation',scope:'all',values:[{axis:1,value:2}],confirmedHarm:true});ledger(w);const c=step(w);
 assert(o.informationState.deathDecision);assert.equal(o.informationState.deathDecision.turn,w.turn);assert.equal(reader.informationState.last.received,0);assert(!c.informationIndex.cells.get(18)?.some(e=>e.record.generatedAt===w.turn));assert.equal(w.carcasses.find(a=>a.species==='forestcrown').availableAt,w.turn+1);const after=structuredClone(w);E.P.informationFinalize(w,c);assert.deepEqual(w,after);conserved(w);
});

test('source/generated and Worker/JSON preserve committed interaction state; public turn and capture stay guarded',()=>{
 const G=require('../src/ecology/observation-model.js').model(flags),T=require('../src/ecology/transport.js'),A=require('../src/ecology/archive.js');
 const w=fixture(),plant=add(w,'plant'),host=group(w,'host',1);infect(w,plant,'first',0);infect(w,host,'middle',0,true);bundle(w);ledger(w);const other=structuredClone(w),before=structuredClone(w),encode=T.encoder(w);
 const run=(e,v)=>{const c=e.context(v);e.prepare(v,c);e.B.move(v,c);e.cellLife(v,c);};for(let t=0;t<3;t++){if(t){w.turn++;other.turn++;}run(E,w);run(G,other);assert.deepEqual(other,w);conserved(w);}
 assert.deepEqual(T.apply(before,JSON.parse(JSON.stringify(encode(w,true)))),w);require('./cell-turn-assertion.cjs')(G,w);assert.throws(()=>A.create({getItem:()=>null,setItem(){}},G,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});
