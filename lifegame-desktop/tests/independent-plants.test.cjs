"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=Factory.model(flags),S=E.S;
const ids=["forestcrown","starcrown","freshwaterlight"];
const base={seed:"independent-plant-contract",width:16,height:12,initial:20,lineages:"few",ageModel:"life/1",ecologyRevision:"observation/4.1",producerModel:"colony/1",largePlantModel:"independent/1"};

function fixture(terrain="plain"){
 const w=E.create({...base,width:8,height:8,initial:0,largePlantSettings:{autoDensity:{land:0,water:0}},enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});
 w.tiles=w.tiles.map(t=>({...t,env:["shallow","deep"].includes(terrain)?0:3,terrain,light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];
 w.config.enabled={main:false,plant:true,fungus:true,prey:true,P:true,Q:true};
 w.colonyRegions=S.Colony.regional(w);S.Colony.begin(w);S.LargePlant.begin(w);return w;
}
function add(w,id,species="forestcrown",cell=18,options={}){
 const o=S.organism(w,S.D.byId[species],cell,id,options);w.organisms.push(o);return o;
}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function ready(w){const c=reset(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});return c;}
function check(w){assert.deepEqual(E.invariants(w),[]);}

test("independent plants require an explicit compatible model and keep the old catalogue intact",()=>{
 const old=E.create({...base,producerModel:undefined,largePlantModel:undefined}),colony=E.create({...base,largePlantModel:undefined}),current=E.create(base);
 assert.equal(S.D.species.length,31);assert.equal(S.activeSpecies(old).length,31);assert.equal(S.activeSpecies(colony).length,31);assert.equal(S.activeSpecies(current).length,34);
 assert(!old.config.largePlantSettings);assert(!colony.config.largePlantSettings);for(const id of ids){assert(!(id in old.stats.counts));assert(!(id in colony.stats.counts));}
 assert.deepEqual(S.D.independentPlants.map(s=>s.id),ids);
 assert(!old.organisms.some(S.LargePlant.is));assert(!colony.organisms.some(S.LargePlant.is));
 for(const id of ids){const s=S.D.byId[id];assert.equal(s.group,"plant");assert.equal(s.kind,"independent");assert.equal(s.slot,"producer");assert(!S.D.main.includes(s));}
 assert.equal(S.D.byId.kelp.group,"main");
 assert.throws(()=>E.create({...base,producerModel:undefined}),/SETTINGS_INVALID/);
 assert.throws(()=>E.create({...base,largePlantModel:"independent/2"}),/SETTINGS_INVALID/);
 for(const largePlantSettings of [{autoDensity:{land:NaN}},{autoDensity:{water:-.1}},{initial:{phase:5}},{initial:{ageFraction:1}},{initial:{energyFraction:2}},{unknown:1}])assert.throws(()=>E.create({...base,largePlantSettings}),/SETTINGS_INVALID/);
 const saved=current.config.largePlantSettings;assert.equal(saved.version,"independent-plant-parameters/1");assert.deepEqual(saved.autoDensity,{land:.02,water:.02});assert.deepEqual(saved.initial,{phase:1,ageFraction:0,energyFraction:.5});
 check(old);check(colony);check(current);
});

test("initial populations honor direct zero and exact counts without using basal food slots",()=>{
 const zeros=Object.fromEntries(ids.map(id=>[id,0]));
 const empty=E.create({...base,founderCounts:{version:1,species:zeros,parasites:{}}});assert.equal(empty.organisms.filter(S.LargePlant.is).length,0);
 const w=E.create({...base,founderCounts:{version:1,species:{forestcrown:2,starcrown:0,freshwaterlight:1},parasites:{}}});
 for(const [id,count]of Object.entries({forestcrown:2,starcrown:0,freshwaterlight:1}))assert.equal(w.organisms.filter(o=>o.species===id).length,count);
 for(const o of w.organisms.filter(S.LargePlant.is)){
  const p=S.phenotype(w,o);assert.equal(o.plant.version,"independent-plant-state/1");assert.equal(o.plant.baseB,2);assert.equal(o.age,0);assert.equal(o.phase,1);assert.equal(o.G,0);assert.equal(o.M,1);
  assert.equal(S.edibleB(o),11.2);assert.equal(o.E,p.capE*.5);assert(!S.Colony.is(o));assert.equal(o.B,13.2);assert(S.validHabitat(w,S.spec(o),o.cell));
 }
 assert.throws(()=>E.create({...base,founderCounts:{version:1,species:{forestcrown:17920},parasites:{}}}),/PLACEMENT_SHORTAGE/);
 check(empty);check(w);
});

test("automatic independent populations use sparse regional unions and avoid basal advantage overrides",()=>{
 for(const advantage of [flags,{producer:true,waterbug:true,hyperparasite:true}]){
  const e=Factory.model(advantage),w=e.create(base),species=e.S.D.independentPlants;
  for(const region of ["land","water"]){
   const eligible=w.tiles.filter((_,cell)=>e.S.Colony.region(w,cell)===region&&species.some(s=>e.S.validHabitat(w,s,cell))).length;
   const actual=w.organisms.filter(o=>e.S.LargePlant.is(o)&&e.S.Colony.region(w,o.cell)===region).length;
   assert.equal(actual,Math.round(eligible*.02));
  }
  for(const o of w.organisms.filter(e.S.LargePlant.is)){
   const expected={forestcrown:360,starcrown:320,freshwaterlight:240}[o.species];assert.equal(o.birthLife,expected);assert.equal(o.plant.baseB,2);assert.equal(e.S.edibleB(o),11.2);
  }
  assert.deepEqual(e.invariants(w),[]);
 }
});

test("initial age, phase and energy are recorded conditions rather than invented experience",()=>{
 const w=E.create({...base,largePlantSettings:{initial:{phase:4,ageFraction:.25,energyFraction:.75}},founderCounts:{version:1,species:{forestcrown:1,starcrown:1,freshwaterlight:1},parasites:{}}});
 for(const o of w.organisms.filter(S.LargePlant.is)){
  assert.equal(o.phase,4);assert.equal(o.age,Math.floor(S.spec(o).life*.25));assert.equal(o.E,S.phenotype(w,o).capE*.75);assert.equal(o.G,0);
  assert([0,1,2].includes(o.branch3));assert([0,1].includes(o.branch4));
 }
 check(w);
});

test("producer occupancy is independent of basal, prey and main occupancy",()=>{
 const w=fixture(),plant=add(w,"crown"),basal=add(w,"grass","grass"),main=add(w,"main","solar"),prey=add(w,"prey","grassbug");
 reset(w);const maps=S.maps(w);assert.equal(maps.producer.get(18),plant);assert.equal(maps.food.get(18),basal);assert.equal(maps.main.get(18),main);assert.equal(maps.prey.get(18),prey);check(w);
 const ctx=E.context(w);assert.equal(E.B.power(w,plant,"attack",ctx),0);
 add(w,"second","starcrown");reset(w);assert(E.invariants(w).some(s=>s.startsWith("SLOT_DUPLICATE:")));
});

test("individual ages are frozen across phases and remain distinct from basal colony elapsed time",()=>{
 for(const [id,life,maturity,oldAt]of [["forestcrown",360,36,270],["starcrown",320,32,240],["freshwaterlight",240,24,180]]){
  const w=fixture(id==="freshwaterlight"?"shallow":"plain"),o=add(w,id,id);
  assert.equal(o.birthLife,life);
  for(const phase of [1,2,3,4]){o.phase=phase;assert.equal(S.phenotype(w,o).life,life);o.age=maturity-1;assert.equal(S.ageInfo(o).stage,"juvenile");o.age=maturity;assert.equal(S.ageInfo(o).stage,"adult");o.age=oldAt;assert.equal(S.ageInfo(o).stage,"elderly");}
  const basal=add(w,"basal",id==="freshwaterlight"?"algae":"grass",19);assert.equal(S.ageInfo(basal).applicable,false);
 }
});

test("co-located photosynthesis shares one finite cell budget and respects individual limits",()=>{
 const w=fixture(),basal=add(w,"basal","grass",18,{E:0,B:16}),plant=add(w,"adult","forestcrown",18,{E:0,age:36});
 const ctx=ready(w);assert.equal(w.ledger.solar,4);assert.equal(basal.E,2);assert.equal(plant.E,2);assert.equal(ctx.records.get(plant.id).light,2);check(w);
 const separate=fixture(),solo=add(separate,"solo","forestcrown",18,{E:0,age:36});ready(separate);assert.equal(solo.E,2.4);assert.equal(separate.ledger.solar,2.4);check(separate);
 const capped=fixture(),a=add(capped,"basal","grass",18,{E:19.9,B:16}),b=add(capped,"crown","forestcrown",18,{E:0,age:36});ready(capped);
 assert(a.E<=S.phenotype(capped,a).capE);assert(b.E<=2.4);assert.equal(capped.ledger.solar,4);check(capped);
});

test("regeneration pays for each new B and finite soil material once while retaining the living body",()=>{
 const w=fixture(),o=add(w,"recovering","forestcrown",18,{B:2,E:10,M:0,age:36});o.plant.replacementDebtB=4;reset(w);
 const soil=w.tiles[o.cell].soilM;S.LargePlant.regrow(w,o);S.LargePlant.regrow(w,o);
 assert.equal(S.edibleB(o),1.6);assert.equal(o.E,8.08);assert.equal(o.M,.032);assert.equal(w.tiles[o.cell].soilM,S.round(soil-.032));assert.equal(w.ledger.sinks,.32);
 assert.equal(o.plant.last.productionB,1.6);assert.equal(o.plant.last.regrowthB,1.6);assert.equal(o.id,"recovering");assert.equal(o.age,36);assert.equal(o.phase,1);check(w);
 for(const change of [(world,p)=>world.tiles[p.cell].light=0,(world,p)=>world.tiles[p.cell].soilM=0,(world,p)=>p.E=0,(world,p)=>p.plant.activity=0]){
  const limited=fixture(),p=add(limited,"limited","forestcrown",18,{B:2,E:10,M:0});change(limited,p);reset(limited);const before=S.totals(limited);S.LargePlant.regrow(limited,p);assert.equal(p.B,2);assert.deepEqual(S.totals(limited),before);check(limited);
 }
});

test("grazing takes only actual edible stock and cannot convert normal leaf loss into plant death",()=>{
 const w=fixture(),o=add(w,"food","forestcrown",18,{B:6,E:0,M:.4,age:36});add(w,"grazer","grassbug",18,{E:0});const ctx=reset(w);
 E.N.feed(w,ctx,E.P.transfer);assert.equal(o.B,2);assert.equal(o.plant.last.consumedB,4);assert(!ctx.harvestDead.has(o.id));assert(w.organisms.includes(o));check(w);
});

test("independent plants stay non-predatory and their appearance does not open a new P-host route",()=>{
 const w=fixture(),o=add(w,"nonconsumer","forestcrown",18,{E:0,B:2,M:0});w.tiles[18].soilM=0;
 w.resources.push({cell:18,kind:"organic",q:1,E:2,M:0,G:0,created:0,expires:12});const ctx=reset(w);E.N.feed(w,ctx,E.P.transfer);
 assert.equal(o.E,0);assert.equal(w.resources[0].E,2);assert.equal(w.resources[0].q,1);check(w);
 const route=fixture(),host=add(route,"unapproved-host","forestcrown",18,{E:0,B:4,M:.2}),grazer=add(route,"grazer","grassbug",18,{E:0});
 host.infection=S.infection(route,"leafparasite",host.id);host.infection.counter=4;host.infection.E=.1;const p=host.infection,transfer=reset(route);E.N.feed(route,transfer,E.P.transfer);
 assert.equal(host.infection,p);assert.equal(grazer.infection,null);assert.equal(transfer.transfers,0);check(route);
});

test("mature phase I plants reproduce locally with paid stock and new first-phase children",()=>{
 const w=fixture(),parent=add(w,"parent","forestcrown",18,{phase:1,age:36,E:20,M:1,B:2});const ctx=reset(w),before=S.totals(w);
 assert.equal(E.R.eligible(w,parent,ctx),true);const children=E.R.reproduce(w,ctx);assert.equal(children.length,1);
 const child=children[0];assert.equal(child.species,parent.species);assert.equal(child.slot,"producer");assert.equal(child.phase,1);assert.equal(child.age,0);assert.equal(child.G,0);assert.equal(child.B,2);assert.equal(child.E,6);assert.equal(child.M,.2);assert.equal(child.branch3,null);assert.equal(child.branch4,null);
 assert.equal(parent.E,10);assert.equal(parent.M,.8);assert(S.oneStep(w,parent.cell,child.cell));assert.equal(S.totals(w).E,S.round(before.E-2));assert.equal(w.ledger.sinks,2);assert.equal(S.totals(w).M,before.M);check(w);
 const young=fixture(),juvenile=add(young,"young","forestcrown",18,{phase:4,age:0,E:40,M:2,B:2});assert.equal(E.R.eligible(young,juvenile,reset(young)),false);
 const poor=fixture(),insufficient=add(poor,"poor","forestcrown",18,{phase:1,age:36,E:10.5,M:1,B:2});assert.equal(E.R.eligible(poor,insufficient,reset(poor)),false);
});

test("fourth-phase reproductive branches change real parent costs and offspring reserves",()=>{
 const results=[];
 for(const side of [0,1]){
  const w=fixture(),parent=add(w,"parent","forestcrown",18,{phase:4,branch3:1,branch4:side,age:36,E:30,M:1,B:2}),ctx=reset(w),children=E.R.reproduce(w,ctx);
  assert.equal(children.length,1);const child=children[0];assert.equal(child.B,2);assert.equal(child.M,.2);assert.equal(w.ledger.sinks,2);assert.equal(parent.E,side===0?16:22);assert.equal(child.E,side===0?10:4);results.push(parent.birthReady-w.turn);check(w);
 }
 assert(results[0]>results[1]);
});

test("a real child's fourth surviving turn credits its living parent once",()=>{
 let w=fixture();const parent=add(w,"settling-parent","forestcrown",18,{age:36,E:20,B:2,M:1}),ctx=reset(w),children=E.R.reproduce(w,ctx);
 assert.equal(children.length,1);const childId=children[0].id;
 for(let turn=0;turn<3;turn++){w=E.step(w);check(w);}
 const before=w.organisms.find(o=>o.id===parent.id),young=w.organisms.find(o=>o.id===childId);assert(young);assert.equal(young.age,3);assert.equal(before.plant.cumulative.settlements,0);
 w=E.step(w);check(w);const credited=w.organisms.find(o=>o.id===parent.id);assert.equal(w.organisms.find(o=>o.id===childId).age,4);assert.equal(credited.plant.cumulative.settlements,1);
 w=E.step(w);check(w);assert.equal(w.organisms.find(o=>o.id===parent.id).plant.cumulative.settlements,1);
});

test("individual experience uses paid outcomes, stays bounded per turn and cannot be duplicated by repeated finalization",()=>{
 const w=fixture(),o=add(w,"learner","forestcrown",18,{E:10,B:2,M:0});const ctx=ready(w);E.N.settle(w,ctx,E.P.fee);S.LargePlant.regrow(w,o,ctx);S.LargePlant.finalize(w,ctx);
 assert(o.G>=0);assert(o.G<=1);const first=o.G;S.LargePlant.finalize(w,ctx);assert.equal(o.G,first);check(w);
 w.turn++;S.Colony.begin(w);S.LargePlant.begin(w);const next=ready(w);E.N.settle(w,next,E.P.fee);S.LargePlant.regrow(w,o,next);S.LargePlant.finalize(w,next);
 assert(o.G>=1);assert(o.G>first);assert(o.G<=first+1);const twice=o.G;S.LargePlant.finalize(w,next);assert.equal(o.G,twice);check(w);
 const dark=fixture(),unpaid=add(dark,"unpaid","forestcrown",18,{E:0,B:2,M:0});dark.tiles[18].light=0;const none=ready(dark);E.N.settle(dark,none,E.P.fee);S.LargePlant.finalize(dark,none);assert.equal(unpaid.G,0);check(dark);
});

test("growth thresholds pay their transition expense and keep branches within the adopted tree",()=>{
 for(const [phase,threshold,next,fee]of [[1,12,2,2],[2,36,3,4],[3,80,4,6]]){
  const w=fixture(),o=add(w,"growth-"+phase,"forestcrown",18,{phase,branch3:phase===3?0:null,G:threshold,E:20,B:2,M:0});w.tiles[18].light=0;
  const ctx=ready(w);E.N.settle(w,ctx,E.P.fee);S.LargePlant.finalize(w,ctx);
  assert.equal(o.phase,next);assert(w.ledger.sinks>=fee);assert.equal(o.age,1);assert.equal(o.birthLife,360);
  if(next>=3)assert([0,1,2].includes(o.branch3));if(next===4)assert([0,1].includes(o.branch4));check(w);
 }
});

test("paid allocation selects all three third-phase branches and all six fourth-phase outcomes only when reached",()=>{
 const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,actual+" != "+expected);
 for(const branch of [0,1,2]){
  const w=fixture(),o=add(w,"III-"+branch,"forestcrown",18,{phase:2,age:36,G:36,E:30,B:2,M:1}),ctx=reset(w);
  o.E=S.round(o.E-6);S.dissipate(w,6);S.LargePlant.allocation(w,o,branch,6);
  const before=S.phenotype(w,o);assert.equal(o.phase,2);assert.equal(before.biteFactor,1);assert.equal(before.regenerationFactor,1);assert.equal(before.cooldown,12);
  S.LargePlant.finalize(w,ctx);assert.equal(o.phase,3);assert.equal(o.branch3,branch);assert.equal(o.branch4,null);assert(w.ledger.sinks>=10);check(w);
 }
 for(const branch of [0,1,2])for(const side of [0,1]){
  const w=fixture(),o=add(w,"IV-"+branch+"-"+side,"forestcrown",18,{phase:3,branch3:branch,branch4:side,age:36,G:80,E:30,B:2,M:1}),ctx=reset(w);
  // A future branch label cannot activate a fourth-phase effect on phase III.
  const before=S.phenotype(w,o);close(before.lightInput,2.4*1.35);close(before.maintenance,.25*1.35);assert.equal(before.cooldown,12);assert.equal(before.biteFactor,1);assert.equal(before.regenerationFactor,1);
  o.E=S.round(o.E-6);S.dissipate(w,6);S.LargePlant.allocation(w,o,branch,6,side);
  S.LargePlant.finalize(w,ctx);assert.equal(o.phase,4);assert.equal(o.branch3,branch);assert.equal(o.branch4,side);
  const after=S.phenotype(w,o);close(after.lightInput,2.4*1.6*(branch===0&&side===0?1.2:1));close(after.maintenance,.25*1.6*(branch===0?(side===0?1.1:.8):1));
  close(after.cooldown,12*(branch===1?(side===0?1.5:.75):1));assert.equal(after.biteFactor,branch===2&&side===0?.8:1);assert.equal(after.regenerationFactor,branch===2&&side===1?1.2:1);
  assert(w.ledger.sinks>=12);check(w);
 }
});

test("branch preparation is paid, bounded to thirty-two turns and cannot grant future abilities or experience",()=>{
 const w=fixture(),o=add(w,"preparing","forestcrown",18,{phase:2,age:36,E:20,B:22,M:1});reset(w);
 const before={E:o.E,B:o.B,M:o.M,G:o.G,capacity:S.phenotype(w,o).capB};
 for(let turn=0;turn<40;turn++){w.turn=turn;S.Colony.begin(w);S.LargePlant.begin(w);S.LargePlant.finalize(w,E.context(w));}
 const history=o.plant.window32??o.plant.window;assert(Array.isArray(history));assert.equal(history.length,32);assert(history.every(row=>row.turn>=8));
 assert(o.E<before.E);assert.equal(w.ledger.sinks,S.round(before.E-o.E));assert.equal(o.G,before.G);assert.equal(o.B,before.B);assert.equal(o.M,before.M);assert.equal(o.phase,2);assert.equal(S.phenotype(w,o).capB,before.capacity);check(w);
});

test("common maintenance does not bias the efficient branch and a full reserve does not turn bright light into low input",()=>{
 for(const dark of [false,true]){
  const w=fixture(),o=add(w,dark?"dark-reserve":"full-reserve","forestcrown",18,{phase:3,branch3:0,age:36,G:36,E:54,B:2,M:1});
  if(dark)w.tiles[o.cell].light=0;
  const ctx=ready(w),record=ctx.records.get(o.id),maintenance=ctx.costs.get(o.id).base;
  assert.equal(o.plant.last.solarInputE,0);
  if(dark)assert.equal(record.solarOpportunityE,0);else assert(record.solarOpportunityE>2*maintenance);
  E.N.settle(w,ctx,E.P.fee);S.LargePlant.finalize(w,ctx);
  const row=o.plant.window.find(row=>row.turn===w.turn);assert(row);
  assert.equal(o.phase,3);assert.equal(o.plant.last.preparationE,.1);assert.equal(row.allocation[0],S.round(maintenance+.1));
  assert.equal(row.sides[0][0],dark?0:.1);assert.equal(row.sides[0][1],dark?.1:0);
  check(w);
 }
});

test("freshwater movement is local, paid in every phase and never grants movement experience",()=>{
 for(const phase of [1,2,3,4]){
  const w=fixture("shallow"),o=add(w,"floater-"+phase,"freshwaterlight",18,{phase,age:24,E:10,B:2,M:0});w.tiles[18].light=.01;w.tiles[18].soilM=0;
  const ctx=ready(w),beforeG=o.G;E.B.choose(w,ctx,"move");const intent=ctx.intents.get(o.id);assert.equal(intent.type,"move");assert.equal(intent.path.length,1);assert(S.oneStep(w,18,intent.cell));assert.equal(intent.cost,.3);
  const beforeE=o.E;E.B.move(w,ctx);E.N.payActions(w,ctx);assert.equal(o.E,S.round(beforeE-.3));assert.equal(o.G,beforeG);assert.equal(o.cell,intent.cell);check(w);
 }
 const land=fixture();for(const id of ["forestcrown","starcrown"]){const o=add(land,id,id,id==="forestcrown"?18:19,{E:20,age:40});const ctx=ready(land);E.B.choose(land,ctx,"move");assert.equal(ctx.intents.get(o.id).type,"stop");}
});

test("ordinary leaf exhaustion preserves identity, while chronological and starvation deaths conserve the remaining stock",()=>{
 const w=fixture(),o=add(w,"living","forestcrown",18,{age:0,E:6,B:2,M:1}),ctx=ready(w);E.N.settle(w,ctx,E.P.fee);assert(w.organisms.includes(o));assert.equal(o.age,1);assert(!ctx.deaths.some(d=>d.id===o.id));check(w);
 const age=fixture(),old=add(age,"old","forestcrown",18,{age:359,E:10,B:6,M:.4}),oldCtx=ready(age);E.N.settle(age,oldCtx,E.P.fee);assert(!age.organisms.includes(old));assert(oldCtx.deaths.some(d=>d.reason==="age"));check(age);
 const exhausted=fixture(),starving=add(exhausted,"starving","forestcrown",18,{age:36,E:0,B:2,M:0,HP:.1});exhausted.tiles[18].light=0;const starve=ready(exhausted);E.N.settle(exhausted,starve,E.P.fee);assert(!exhausted.organisms.includes(starving));assert(starve.deaths.some(d=>d.reason==="starvation"));check(exhausted);
});

test("land and freshwater worlds preserve finite budgets and deterministic short histories",()=>{
 for(const mapId of ["river","lake"]){
  const config={...base,seed:"independent-"+mapId,terrainSeed:"independent-map",landscape:"templates",mapId,width:40,height:28,initial:40};
  const run=()=>{let w=E.create(config);for(let turn=0;turn<12;turn++){w=E.step(w);check(w);for(const o of w.organisms.filter(S.LargePlant.is)){assert(o.B>=2);assert(o.B<=S.phenotype(w,o).capB+1e-6);}}return E.fingerprint(w);};
  assert.equal(run(),run());
 }
});

test("generated static and dynamic independent-plant worlds agree",()=>{
 const Static=require("../src/ecology/observation-model.js").model(flags);let a=E.create(base),b=Static.create(base);assert.equal(E.fingerprint(a),Static.fingerprint(b));
 for(let turn=0;turn<4;turn++){a=E.step(a);b=Static.step(b);assert.equal(E.fingerprint(a),Static.fingerprint(b));check(a);assert.deepEqual(Static.invariants(b),[]);}
});
