"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=Factory.model(flags),S=E.S;
const base={seed:"colony-contract",width:16,height:12,initial:20,lineages:"few",ageModel:"life/1",ecologyRevision:"observation/4.1",producerModel:"colony/1"};
function fixture(terrain="plain"){
 const w=E.create({...base,width:8,height:8,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});
 w.tiles=w.tiles.map(t=>({...t,env:terrain==="shallow"?0:3,terrain,light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];
 w.config.enabled={main:false,plant:true,fungus:true,prey:true,P:true,Q:true};
 w.colonyRegions=S.Colony.regional(w);S.Colony.begin(w);return w;
}
function add(w,id,species="grass",cell=18,options={}){
 const o=S.organism(w,S.D.byId[species],cell,id,options);w.organisms.push(o);return o;
}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function ready(w){const c=reset(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});return c;}
function check(w){assert.deepEqual(E.invariants(w),[]);}

test("colony settings are explicit, versioned and finite; old worlds retain their rules",()=>{
 const old=E.create({...base,producerModel:undefined});assert(!old.config.producerSettings);assert(!old.organisms.some(S.Colony.is));
 const w=E.create(base);assert.equal(w.config.producerSettings.version,"colony-parameters/1");assert.equal(w.config.producerSettings.standardBiteB,2);
 for(const config of [{producerModel:"colony/2"},{producerSettings:{standardBiteB:3}},{producerSettings:{land:{occupancy:NaN}}},{producerSettings:{water:{capacityB:0}}},{producerSettings:{land:{regrowthB:2.1}}},{producerSettings:{unknown:1}}])assert.throws(()=>E.create({...base,...config}),/SETTINGS_INVALID/);
});

test("regional placement counts union habitats once and fixes actual edible stock after advantage transforms",()=>{
 for(const advantage of [flags,{producer:true,waterbug:true,hyperparasite:true}]){
  const e=Factory.model(advantage),w=e.create(base);
  for(const name of ["land","water"]){
   const species=e.S.D.species.filter(s=>s.group==="plant"),eligible=w.tiles.filter((t,i)=>e.S.Colony.region(w,i)===name&&species.some(s=>e.S.validHabitat(w,s,i))).length;
   const colonies=w.organisms.filter(o=>e.S.Colony.is(o)&&e.S.Colony.region(w,o.cell)===name);
   assert.equal(colonies.length,Math.round(eligible*(name==="land"?.2:.15)));
   assert.equal(w.colonySummary[name].eligibleCells,eligible);
   for(const o of colonies){assert.equal(o.B,16);assert.equal(e.S.edibleB(o),14);assert.equal(e.S.phenotype(w,o).capB,22);assert.equal(o.age,0);assert(!("birthLife"in o));}
  }
  assert(w.organisms.some(o=>o.species==="phytoplankton"));assert.deepEqual(e.invariants(w),[]);
 }
});

test("explicit zero controls initial placement, while later legal support and direct counts retain their contracts",()=>{
 const plantIds=S.D.species.filter(s=>s.group==="plant").map(s=>s.id),zeros=Object.fromEntries(plantIds.map(id=>[id,0]));
 let w=E.create({...base,founderCounts:{version:1,species:zeros,parasites:{}},producerSupport:{enabled:true,establishment:1,land:{capacity:1},water:{capacity:1}}});
 assert.equal(w.organisms.filter(S.Colony.is).length,0);
 w=E.step(w);assert(w.organisms.filter(S.Colony.is).length>0);assert(w.organisms.filter(S.Colony.is).every(o=>o.colony.origin.kind==="environment"));
 for(const name of ["land","water"])assert(w.colonySummary[name].count<=w.colonyRegions[name].target);assert(w.ledger.producerE>0);check(w);
 let disabled=E.create({...base,enabled:{plant:false},founderCounts:{version:1,species:zeros,parasites:{}},producerSupport:{enabled:true,establishment:1,land:{capacity:1},water:{capacity:1}}});
 disabled=E.step(disabled);assert.equal(disabled.organisms.filter(S.Colony.is).length,0);check(disabled);
 const direct=E.create({...base,producerSettings:{land:{occupancy:0},water:{occupancy:0}},founderCounts:{version:1,species:{...zeros,grass:7},parasites:{}}});
 assert.equal(direct.organisms.filter(S.Colony.is).length,7);assert.equal(direct.config.founderReport.species.grass.actual,7);check(direct);
});

test("initial food guarantees cannot bypass a zero colony occupancy limit",()=>{
 assert.throws(()=>E.create({...base,guarantee:true,enabled:{fungus:false,prey:false},producerSettings:{land:{occupancy:0},water:{occupancy:0}}}),/GUARANTEE_FAILED/);
});

test("regrowth spends finite E and soil M exactly once, honors its per-turn ceiling, and preserves identity",()=>{
 const w=fixture(),p=add(w,"root","grass",18,{B:2,E:10,M:0,age:500,phase:2});
 p.resistance={leafparasite:.4};p.colony.replacementDebtB=5;reset(w);
 const soil=w.tiles[p.cell].soilM;S.Colony.regrow(w,p);S.Colony.regrow(w,p);
 assert.equal(p.B,4);assert.equal(p.E,7.6);assert.equal(p.M,.04);assert.equal(w.tiles[p.cell].soilM,S.round(soil-.04));assert.equal(w.ledger.sinks,.4);
 assert.equal(p.colony.last.productionB,2);assert.equal(p.colony.last.regrowthB,2);assert.equal(p.colony.cumulative.productionB,2);
 assert.equal(p.id,"root");assert.equal(p.age,500);assert.deepEqual(p.resistance,{leafparasite:.4});check(w);
});

test("darkness, absent mineral, exhausted E and absent base activity cannot create new leaves",()=>{
 for(const change of [(w,p)=>w.tiles[p.cell].light=0,(w,p)=>w.tiles[p.cell].soilM=0,(w,p)=>p.E=0,(w,p)=>p.colony.activity=0]){
  const w=fixture(),p=add(w,"limited","grass",18,{B:2,E:10,M:0});change(w,p);reset(w);const before=S.totals(w);S.Colony.regrow(w,p);assert.equal(p.B,2);assert.deepEqual(S.totals(w),before);check(w);
 }
});

test("support regrowth multiplier honors zero and low values and cannot exceed ten percent of capacity",()=>{
 for(const [multiplier,expected]of [[0,0],[.25,.5],[4,2]]){
  const w=fixture(),p=add(w,"scaled","grass",18,{B:2,E:10,M:0});
  w.config.producerSupport=S.ProducerSupport.settings({enabled:true,land:{regrowth:multiplier}});reset(w);
  S.Colony.regrow(w,p);S.Colony.regrow(w,p);assert.equal(S.edibleB(p),expected);assert.equal(p.colony.last.productionB,expected);check(w);
 }
 const w=fixture(),p=add(w,"off","grass",18,{B:2,E:10,M:0});
 w.config.producerSupport=S.ProducerSupport.settings({enabled:false,land:{regrowth:0}});reset(w);S.Colony.regrow(w,p);assert.equal(S.edibleB(p),2);check(w);
});

test("habitat and cluster initial placement retain equal finite regional targets but choose distinct repeatable cells",()=>{
 const run=distribution=>E.create({...base,initialConditions:{version:1,density:{plant:0,fungus:.03,prey:.1},resources:{mineral:1,droplet:1,info:1},distribution}});
 const habitat=run("habitat"),cluster=run("cluster"),again=run("cluster");
 const cells=w=>w.organisms.filter(S.Colony.is).map(o=>o.species+":"+o.cell).sort();
 assert.notDeepEqual(cells(habitat),cells(cluster));assert.deepEqual(cells(cluster),cells(again));
 assert.equal(E.fingerprint(cluster),E.fingerprint(again));
 for(const name of ["land","water"]){assert.equal(cluster.colonySummary[name].count,cluster.colonyRegions[name].target);assert.equal(habitat.colonySummary[name].count,habitat.colonyRegions[name].target);}
 // Cluster selection uses the same species-center ranking as other initial organisms.
 const rank=w=>w.organisms.filter(S.Colony.is).reduce((n,o)=>n+S.initialRank(w,S.spec(o),o.cell),0);
 const rankedHabitat=structuredClone(habitat);rankedHabitat.config.initialConditions.distribution="cluster";
 assert(rank(cluster)<rank(rankedHabitat));check(habitat);check(cluster);
});

test("finite competing grazers consume one shared stock and never count leaf loss as a colony death",()=>{
 const w=fixture(),p=add(w,"shared","grass",18,{B:6,E:4,M:.4});
 add(w,"small","grassbug",18,{E:0});add(w,"large","solar",18,{E:0,HP:50});const ctx=reset(w);
 E.N.feed(w,ctx,E.P.transfer);assert.equal(p.B,2);assert.equal(p.colony.last.consumedB,4);assert(!ctx.harvestDead.has(p.id));assert(w.organisms.includes(p));check(w);
 S.Colony.summary(w);assert.equal(w.colonySummary.land.consumedB,4);
});

test("partial edible exposure is paid, proportional and leaves resident P/Q unchanged",()=>{
 const w=fixture(),p=add(w,"host","grass",18,{B:6,E:0,M:.4}),grazer=add(w,"receiver","grassbug",18,{E:0});
 p.infection=S.infection(w,"leafparasite",p.id);p.infection.counter=4;p.infection.E=.5;
 p.infection.q=S.hyper(w,p.infection.id);p.infection.q.E=.1;
 const oldP=p.infection,oldQ=oldP.q,ctx=reset(w);E.N.feed(w,ctx,E.P.transfer);
 assert.equal(p.infection,oldP);assert.equal(oldP.q,oldQ);assert.equal(oldP.hostId,p.id);assert.equal(oldP.E,.38);
 assert(grazer.infection);assert.notEqual(grazer.infection.id,oldP.id);assert.equal(grazer.infection.E,.03);assert.equal(grazer.infection.stage,"middle");assert.equal(grazer.infection.q,null);
 assert.equal(p.colony.edibleExposure,null);assert.equal(ctx.transfers,1);check(w);
});

test("zero edible stock produces zero exposure and expired or dead-host exposure dissipates once",()=>{
 const w=fixture(),p=add(w,"empty","grass",18,{B:2,E:0,M:0}),grazer=add(w,"receiver","grassbug",18,{E:0});
 p.infection=S.infection(w,"leafparasite",p.id);p.infection.counter=4;p.infection.E=.5;
 let ctx=reset(w);E.N.feed(w,ctx,E.P.transfer);assert.equal(p.infection.E,.5);assert.equal(grazer.infection,null);assert.equal(p.colony.edibleExposure,null);check(w);
 p.colony.edibleExposure={id:"finite",species:"leafparasite",sourceParasiteId:p.infection.id,E:.04,amount:2/3,created:0,expires:1};reset(w);w.turn=1;S.Colony.begin(w);assert.equal(w.ledger.sinks,.04);S.Colony.begin(w);assert.equal(w.ledger.sinks,.04);check(w);
 p.colony.edibleExposure={id:"death",species:"leafparasite",sourceParasiteId:p.infection.id,E:.03,amount:.5,created:1,expires:5};p.HP=0;ctx=ready(w);E.N.settle(w,ctx,E.P.fee);assert(!w.organisms.includes(p));assert.equal(p.colony.edibleExposure,null);check(w);
});

test("colony elapsed time is not a lifetime; extinction and supported reestablishment use distinct IDs",()=>{
 const w=fixture(),p=add(w,"old-colony","grass",18,{age:10000,E:10,B:2,phase:1});
 const c=ready(w);E.N.settle(w,c,E.P.fee);assert(w.organisms.includes(p));assert.equal(p.age,10001);assert.equal(S.ageInfo(p).applicable,false);assert(!c.deaths.length);check(w);
 p.HP=0;const dead=ready(w);E.N.settle(w,dead,E.P.fee);assert(!w.organisms.includes(p));check(w);
 w.turn++;S.Colony.begin(w);
 w.config.producerSupport=S.ProducerSupport.settings({enabled:true,establishment:1,land:{capacity:1},water:{capacity:1}});
 S.ProducerSupport.begin(w,S);const replacements=w.organisms.filter(S.Colony.is);assert(replacements.length>0);assert(replacements.every(o=>o.id!==p.id&&o.colony.origin.kind==="environment"&&o.age===0));check(w);
});

test("local paid establishment respects one parent budget and regional occupancy",()=>{
 const w=fixture(),p=add(w,"parent","grass",18,{E:20,B:8,M:1,phase:2});
 w.turn=1;w.config.founderCounts={version:1,species:{grass:0},parasites:{}};
 const ctx=ready(w),before=S.totals(w),children=E.R.reproduce(w,ctx);
 assert.equal(children.length,1);const child=children[0];assert.equal(child.B,2);assert.equal(child.E,6);assert.equal(child.M,.2);assert.equal(child.age,0);assert.equal(child.phase,1);assert.equal(child.colony.origin.kind,"parent");assert(S.oneStep(w,p.cell,child.cell));assert.deepEqual(S.totals(w),before);check(w);
 w.colonyRegions.land.target=w.organisms.filter(S.Colony.is).length;p.birthReady=0;p.E=20;
 const next=reset(w);assert.equal(E.R.candidates(w,next).filter(c=>S.Colony.is(c.parents[0])).length,0);
});

test("supported growth has only explicit E/M inputs and cannot bypass regional capacity",()=>{
 const w=fixture(),p=add(w,"supported","grass",18,{B:2,E:0,M:0});reset(w);
 w.config.producerSupport=S.ProducerSupport.settings({enabled:true,establishment:1,land:{capacity:1,regrowth:4}});
 S.ProducerSupport.begin(w,S);assert.equal(p.B,2);assert.equal(w.producerSupport.last.regrownB,0);assert(w.ledger.producerE>0);assert(w.ledger.producerM>0);
 assert(w.organisms.filter(S.Colony.is).length<=w.colonyRegions.land.target);check(w);
});

test("land and freshwater short runs conserve finite budgets and repeat exactly",()=>{
 for(const mapId of ["river","lake"]){
  const cfg={...base,landscape:"templates",mapId,terrainSeed:"colony-map",seed:"colony-"+mapId,width:40,height:28,initial:40};
  const run=()=>{let w=E.create(cfg);for(let t=0;t<30;t++){w=E.step(w);check(w);for(const name of ["land","water"])assert(w.colonySummary[name].occupiedCells<=Math.max(w.colonyRegions[name].target,w.colonyRegions[name].initial));}return E.fingerprint(w);};
  assert.equal(run(),run());
 }
});

test("generated static model and dynamic model agree on new colony worlds",()=>{
 const Static=require("../src/ecology/observation-model.js").model(flags);
 for(const config of [base,{...base,initialConditions:{version:1,density:{plant:0,fungus:.03,prey:.1},resources:{mineral:1,droplet:1,info:1},distribution:"cluster"},producerSupport:{enabled:true,land:{regrowth:.25},water:{regrowth:0}}}]){
  let a=E.create(config),b=Static.create(config);
  assert.equal(E.fingerprint(a),Static.fingerprint(b));for(let t=0;t<5;t++){a=E.step(a);b=Static.step(b);assert.equal(E.fingerprint(a),Static.fingerprint(b));check(a);assert.deepEqual(Static.invariants(b),[]);}
 }
});
