"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=Factory.model(flags),S=E.S;
const base={seed:"ryouki-contract",width:16,height:12,initial:4,lineages:"manual",selected:["ryouki"],ageModel:"life/1",ecologyRevision:"observation/4.1",ryoukiModel:"ryouki/1"};
const dna=()=>Object.fromEntries(S.DNA.map(k=>[k,.5]));
function fixture(width=8,height=8){
 const w=E.create({...base,width,height,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});
 w.tiles=w.tiles.map(t=>({...t,env:3,terrain:"plain",light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];w.turn=0;
 w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};return w;
}
function cell(w,x,y){return S.index(w,x,y);}
function add(w,id,x=2,y=2,options={},species="ryouki"){
 const o=S.organism(w,S.D.byId[species],cell(w,x,y),id,{dna:dna(),age:18,...options});w.organisms.push(o);return o;
}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function ready(w){const c=reset(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});return c;}
function check(w){assert.deepEqual(E.invariants(w),[]);}
function mutate(o){o.ryouki.mutated=true;return o;}
function intention(w,o,path){
 const [x,y]=S.xy(w,o.cell),[nx,ny]=S.xy(w,path[0]);
 const direction=S.DIRS.findIndex(([dx,dy])=>dx===Math.sign(nx-x)&&dy===Math.sign(ny-y));
 return {type:"move",cell:path.at(-1),path,direction,cost:path.reduce((n,p)=>n+E.B.moveCost(w,o,p),0)};
}
function move(w,o,path,c=ready(w)){c.intents.set(o.id,intention(w,o,path));E.B.move(w,c);return c;}
function meal(w,o,c){w.ledger.initialE+=4;E.N.absorb(w,o,{E:4,M:0,G:0},"plant",c);}
function scoreCandidate(w,o,select){
 const c=ready(w),m=S.maps(w),candidate=E.B.candidates(w,o,c,m).find(select);assert(candidate,"expected a legal candidate");
 const visibleCells=new Set(S.nearby(w,o.cell,c.traits.get(o.id).sense,true).filter(p=>E.B.visible(w,o,p,c))),
  enemies=w.organisms.filter(a=>a.id!==o.id&&a.species!==o.species&&visibleCells.has(a.cell)&&["main","prey"].includes(S.spec(a).group)),
  nearest=enemies.slice().sort((a,b)=>S.distance(w,o.cell,a.cell)-S.distance(w,o.cell,b.cell)||S.compare(a.id,b.id))[0]||null;
 const v={m,visibleCells,enemies,nearest,traits:c.traits,qualityCache:new Map(),dangerCache:new Map(),neighborhoodCache:new Map()};
 Object.assign(candidate,E.B.evaluate(w,o,candidate,c,v));return candidate;
}

test("ryouki registration is explicit and preserves legacy and I03 catalogue counts",()=>{
 const old=E.create({...base,ryoukiModel:undefined,selected:["solar"]}),current=E.create(base);
 const plant=E.create({...base,ryoukiModel:undefined,selected:["solar"],producerModel:"colony/1",largePlantModel:"independent/1"});
 const all=E.create({...base,producerModel:"colony/1",largePlantModel:"independent/1"});
 assert.equal(S.D.species.length,31);assert.equal(S.activeSpecies(old).length,31);assert.equal(S.activeSpecies(plant).length,34);assert.equal(S.activeSpecies(current).length,32);assert.equal(S.activeSpecies(all).length,35);
 assert(!("ryouki"in old.stats.counts));assert(!("ryouki"in plant.stats.counts));assert.equal(current.stats.counts.ryouki,4);
 assert(!old.config.ryoukiSettings);assert.equal(current.config.ryoukiSettings.version,"ryouki-parameters/1");
 assert.throws(()=>E.create({...base,ryoukiModel:undefined}),/SETTINGS_INVALID/);
 assert.throws(()=>E.create({...base,ryoukiModel:"ryouki/2"}),/SETTINGS_INVALID/);
 for(const ryoukiSettings of [{version:"ryouki-parameters/2"},{densityHigh:2,densityLow:2},{highTurns:0},{densityLow:NaN},{biteB:0},{mutatedBiteB:1},{unknown:1}])assert.throws(()=>E.create({...base,ryoukiSettings}),/SETTINGS_INVALID/);
 for(const w of [old,current,plant,all])check(w);
});

test("initial selection controls quantity without adding a permanent species lock",()=>{
 const excluded=E.create({...base,selected:["solar"]});assert.equal(excluded.stats.counts.ryouki,0);
 const mixed=E.create({...base,initial:8,selected:["solar","ryouki"]});assert.equal(mixed.stats.counts.ryouki,4);assert.equal(mixed.stats.counts.solar,4);
 for(const o of mixed.organisms.filter(S.Ryouki.is)){assert.equal(o.E,40);assert.equal(o.B,8);assert.equal(o.M,1);assert.equal(o.G,0);assert.equal(o.phase,1);assert.equal(o.ryouki.mutated,false);}
 const disabled=E.create({...base,initial:0,enabled:{main:false}});assert.equal(disabled.stats.counts.ryouki,0);check(excluded);check(mixed);check(disabled);
});

test("age maturity and effective maintenance are independent of evolution and reversible density state",()=>{
 const w=fixture(),o=add(w,"age");assert.equal(o.birthLife,180);
 for(const phase of [1,2,3,4])for(const mutated of [false,true]){
  o.phase=phase;o.ryouki.mutated=mutated;o.age=17;assert.equal(S.ageInfo(o).stage,"juvenile");o.age=18;assert.equal(S.ageInfo(o).stage,"adult");o.age=135;assert.equal(S.ageInfo(o).stage,"elderly");assert.equal(o.birthLife,180);
 }
 o.phase=1;o.age=18;o.ryouki.mutated=false;const c=ready(w);assert.equal(S.phenotype(w,o).maintenance,.48);assert.equal(c.costs.get(o.id).base,.48);check(w);
});

test("six local peers must persist for three turns and density transitions do not alter identity or experience",()=>{
 const w=fixture(),o=add(w,"focus",3,3,{phase:3,G:77,branch3:1});
 for(const [i,[x,y]]of [[2,2],[3,2],[4,2],[2,3],[4,3],[2,4]].entries())add(w,"neighbor-"+i,x,y);
 reset(w);const fixed={id:o.id,age:o.age,phase:o.phase,G:o.G,birthLife:o.birthLife,branch3:o.branch3};
 for(let t=1;t<=3;t++){w.turn=t;S.Ryouki.begin(w);assert.equal(o.ryouki.highRun,t);assert.equal(o.ryouki.last.density,6);assert.equal(o.ryouki.mutated,t===3);}
 assert.deepEqual({id:o.id,age:o.age,phase:o.phase,G:o.G,birthLife:o.birthLife,branch3:o.branch3},fixed);assert.equal(o.ryouki.last.transition,"entered");check(w);
 const remote=fixture(),alone=add(remote,"alone",0,0);for(let i=0;i<6;i++)add(remote,"far-"+i,5+i%2,5+Math.floor(i/2));
 for(let t=1;t<=3;t++){remote.turn=t;S.Ryouki.begin(remote);}assert.equal(alone.ryouki.last.density,0);assert.equal(alone.ryouki.mutated,false);
});

test("low density requires six continuous turns and a sole normal slot, preserving waiting roommates",()=>{
 const w=fixture(),a=mutate(add(w,"waiting-a",3,3,{phase:4,branch3:0,branch4:0,G:160})),b=mutate(add(w,"waiting-b",3,3));reset(w);
 for(let t=1;t<=6;t++){w.turn=t;S.Ryouki.begin(w);assert.equal(a.ryouki.lowRun,t);assert.equal(a.ryouki.mutated,true);assert.equal(w.organisms.length,2);check(w);}
 assert.equal(a.phase,4);assert.equal(a.G,160);assert.equal(a.age,18);assert.equal(S.phenotype(w,a).speed,3);
 b.cell=cell(w,7,7);w.turn++;S.Ryouki.begin(w);assert.equal(a.ryouki.mutated,false);assert.equal(b.ryouki.mutated,false);assert.equal(S.phenotype(w,a).speed,4);assert.equal(a.G,160);assert.equal(w.organisms.length,2);check(w);
});

test("intermediate local density resets continuous low and high counters without toggling mutation",()=>{
 const w=fixture(),o=mutate(add(w,"middle",3,3));o.ryouki.lowRun=5;o.ryouki.highRun=2;
 for(const [i,[x,y]]of [[2,3],[3,2],[4,3]].entries())add(w,"peer-"+i,x,y);
 w.turn=1;S.Ryouki.begin(w);assert.equal(o.ryouki.last.density,3);assert.equal(o.ryouki.lowRun,0);assert.equal(o.ryouki.highRun,0);assert.equal(o.ryouki.mutated,true);
});

test("normal phase speeds are one through four while every mutated phase is three, with paid legal steps",()=>{
 for(const phase of [1,2,3,4])for(const mutated of [false,true]){
  const w=fixture(),o=add(w,"walker",1,3,{phase,E:80,G:0,branch3:phase>=3?0:null,branch4:phase===4?0:null});o.ryouki.mutated=mutated;
  const p=S.phenotype(w,o),c=ready(w),count=mutated?3:phase,candidates=E.B.candidates(w,o,c,S.maps(w));
  assert.equal(p.speed,count);assert.equal(p.sense,phase);assert(candidates.some(a=>a.type==="move"&&a.path.length===count));assert(candidates.every(a=>a.type!=="move"||a.path.length<=count));
  const path=Array.from({length:count},(_,i)=>cell(w,i+2,3)),before=o.E;move(w,o,path,c);assert.equal(o.cell,path.at(-1));assert.deepEqual(c.records.get(o.id).ryoukiSteps,path);
  const cost=c.costs.get(o.id).action;assert(Math.abs(cost-count*.39)<1e-8);E.N.payActions(w,c);assert.equal(o.E,S.round(before-cost));assert.equal(o.G,0);check(w);
 }
});

test("movement cannot jump occupied or blocked intermediate cells and commits only an affordable prefix",()=>{
 const w=fixture(),o=add(w,"prefix",1,3,{phase:4,E:80,branch3:0,branch4:0}),enemy=add(w,"blocker",7,7,{E:80},"solar"),c=ready(w);
 const path=[2,3,4,5].map(x=>cell(w,x,3));c.intents.set(o.id,intention(w,o,path));enemy.cell=path[1];E.B.move(w,c);
 assert.equal(o.cell,path[0]);assert.deepEqual(c.records.get(o.id).ryoukiSteps,[path[0]]);assert(Math.abs(c.costs.get(o.id).action-.39)<1e-8);E.N.payActions(w,c);check(w);
 const blocked=fixture(),p=add(blocked,"no-jump",1,3,{phase:4,branch3:0,branch4:0});blocked.tiles[cell(blocked,3,3)].blocked=true;
 const cb=ready(blocked);assert(!E.B.candidates(blocked,p,cb,S.maps(blocked)).some(a=>a.type==="move"&&a.path.includes(cell(blocked,4,3))));
 const budget=fixture(),q=add(budget,"budget",1,3,{phase:4,E:5,branch3:0,branch4:0}),cq=ready(budget);
 cq.costs.get(q.id).budget=.8;move(budget,q,[2,3,4,5].map(x=>cell(budget,x,3)),cq);assert.equal(cq.records.get(q.id).ryoukiSteps.length,2);assert.equal(q.cell,cell(budget,3,3));E.N.payActions(budget,cq);check(budget);
});

test("mutated occupancy reserves at most three real individuals and rejects normal or foreign roommates",()=>{
 const w=fixture(),resident=mutate(add(w,"resident",3,3)),incoming=[[2,3],[3,2],[4,3],[3,4]].map(([x,y],i)=>mutate(add(w,"incoming-"+i,x,y))),c=ready(w),target=resident.cell;
 for(const o of incoming)c.intents.set(o.id,intention(w,o,[target]));E.B.move(w,c);
 assert.equal(S.mainAt(S.maps(w),target).length,3);assert.equal(incoming.filter(o=>o.cell===target).length,2);assert.equal(w.organisms.length,5);E.N.payActions(w,c);S.Ryouki.finalize(w,c);for(const o of incoming)assert.equal(o.G,o.cell===target?.1:0);check(w);
 const normal=add(w,"normal",0,0),foreign=add(w,"foreign",0,1,{},"solar"),m=S.maps(w);assert.equal(S.mainRoom(w,normal,target,m),false);assert.equal(S.mainRoom(w,foreign,target,m),false);assert.equal(S.mainRoom(w,incoming.find(o=>o.cell!==target),target,m),false);
 const single=fixture(),host=mutate(add(single,"host",3,3)),stranger=add(single,"stranger",3,2,{},"solar");reset(single);assert.equal(S.mainRoom(single,stranger,host.cell,S.maps(single)),false);
});

test("adopted combat and HP ratios apply once at equal phase, age and DNA without generic branch bonuses",()=>{
 for(const phase of [1,2,3,4])for(const age of [0,18,135])for(const side of [0,1]){
  const w=fixture(),o=add(w,"power",2,2,{phase,age,branch3:phase>=3?2:null,branch4:phase>=3?side:null});
  const c=ready(w),p=S.phenotype(w,o),f=S.ageInfo(o).factors,mult=[0,1,1.15,1.35,1.6][phase];
  assert(Math.abs(E.B.power(w,o,"attack",c)-9*mult*f.attack*.45)<1e-8);assert(Math.abs(E.B.power(w,o,"defense",c)-6*mult*f.defense*.60)<1e-8);assert.equal(p.maxHP,S.round(100*f.hp*.8));
 }
});

test("normal and mutated diets consume finite two and two-point-four B bites without duplicating roommates' food",()=>{
 for(const mutated of [false,true]){
  const w=fixture(),o=add(w,"eater",2,2,{E:0,HP:80}),plant=add(w,"grass",2,2,{E:0,B:22,M:.5},"grass");o.ryouki.mutated=mutated;
  const c=ready(w),before=plant.B;E.N.feed(w,c,E.P.transfer);const bites=(c.events.get(o.id)||[]).filter(e=>e.type==="feed"&&e.source===plant.id);
  assert.equal(bites.length,2);for(const bite of bites)assert.equal(bite.amount,mutated?2.4:2);assert.equal(plant.B,S.round(before-2*(mutated?2.4:2)));check(w);
 }
 const w=fixture(),a=mutate(add(w,"meal-a",2,2,{E:0})),b=mutate(add(w,"meal-b",2,2,{E:0})),plant=add(w,"shared",2,2,{E:0,B:6,M:.4},"grass"),c=ready(w);E.N.feed(w,c,E.P.transfer);
 const consumed=[a,b].flatMap(o=>c.events.get(o.id)||[]).filter(e=>e.type==="feed"&&e.source===plant.id).reduce((n,e)=>n+e.amount,0);
 assert.equal(consumed,4);assert.equal(plant.B,2);check(w);
});

test("raw absorption does not duplicate ryouki experience or apply generic efficiency branch boosts",()=>{
 for(const branch4 of [0,1])for(const amount of [4,10]){
  const w=fixture(),o=add(w,"absorb",2,2,{phase:4,branch3:0,branch4,E:0,G:0,HP:80}),c=ready(w);
  w.ledger.initialE+=amount;const result=E.N.absorb(w,o,{E:amount,M:0,G:0},"plant",c);assert.equal(result.e,amount*.5);assert.equal(o.G,0);
  const expected=Math.min(2,.5+amount*.25+.4);
  c.records.get(o.id).ryoukiMaintained=true;c.records.get(o.id).ryoukiSteps=[cell(w,3,2),cell(w,4,2),cell(w,5,2),cell(w,6,2)];S.Ryouki.finalize(w,c);assert.equal(o.G,expected);S.Ryouki.finalize(w,c);assert.equal(o.G,expected);check(w);
 }
});

test("small-prey carcasses share finite partial portions under the same per-bite biomass cap",()=>{
 for(const mutated of [false,true]){
  const w=fixture(),o=add(w,"corpse-eater",2,2,{E:0,HP:80});o.ryouki.mutated=mutated;
  // A concentrated finite portion exercises the cap independently of q rounding.
  const corpse={id:"c:small-prey:0",species:"grassbug",slot:"prey",cell:o.cell,tag:"animal",q:1,E:10,M:.4,G:8,created:0,expires:12,infection:null,payloadExpires:null};
  w.carcasses.push(corpse);const c=ready(w);E.N.feed(w,c,E.P.transfer);
  const bites=(c.events.get(o.id)||[]).filter(e=>e.type==="feed"&&e.source===corpse.id),cap=mutated?2.4:2;
  assert.equal(bites.length,2);for(const bite of bites)assert.equal(bite.consumedB,cap);
  assert.equal(corpse.G,S.round(8-2*cap));assert.equal(corpse.q,S.round(1-2*cap/8));assert.equal(corpse.E,S.round(10*(1-2*cap/8)));assert.equal(corpse.M,S.round(.4*(1-2*cap/8)));check(w);
 }
});

test("mature first-phase parents pay asymmetric E and M costs for a normal first-phase newborn",()=>{
 const w=fixture(),mother=mutate(add(w,"mother",2,2,{sex:"female",phase:1,E:40,M:1})),father=mutate(add(w,"father",2,2,{sex:"male",phase:1,E:20,M:.5})),c=ready(w);
 const before=S.totals(w),me=mother.E,fe=father.E,mm=mother.M,fm=father.M;
 assert(E.R.eligible(w,mother,c));assert(E.R.eligible(w,father,c));const candidates=E.R.candidates(w,c).filter(a=>a.species==="ryouki");assert(candidates.length>0);assert(candidates.every(a=>!S.mainAt(S.maps(w),a.cell).length));
 const children=E.R.reproduce(w,c).filter(S.Ryouki.is);assert.equal(children.length,1);const child=children[0];
 assert.equal(mother.E,S.round(me-18));assert.equal(father.E,S.round(fe-6));assert.equal(mother.M,S.round(mm-.75));assert.equal(father.M,S.round(fm-.25));
 assert.equal(child.E,16);assert.equal(child.B,6);assert.equal(child.M,1);assert.equal(child.G,0);assert.equal(child.phase,1);assert.equal(child.age,0);assert.equal(child.ryouki.mutated,false);assert.equal(S.mainAt(S.maps(w),child.cell).length,1);
 assert.equal(w.ledger.sinks,2);assert.equal(S.totals(w).E,S.round(before.E-2));assert.equal(S.totals(w).M,before.M);check(w);
});

test("juvenile parents, sex-specific shortages and occupied normal birth slots remain blocked",()=>{
 for(const change of [(w,m,f)=>m.age=17,(w,m,f)=>f.age=17,(w,m,f)=>m.E=29.9,(w,m,f)=>f.E=11.9,(w,m,f)=>m.M=.74,(w,m,f)=>f.M=.24]){
  const w=fixture(),m=add(w,"mother",2,2,{sex:"female",E:40,M:1}),f=add(w,"father",3,2,{sex:"male",E:20,M:.5});change(w,m,f);const c=ready(w);
  assert.equal(E.R.candidates(w,c).filter(a=>a.species==="ryouki").length,0);
 }
});

test("pair approach uses each parent's own HP limit and sex-specific reserves, with mutation weighting only legal preparation",()=>{
 for(const sex of ["female","male"]){
  const w=fixture(),o=add(w,"approaching-parent",2,3,{sex,phase:4,branch3:2,branch4:0,E:sex==="male"?12:30,M:sex==="male"?.25:.75,HP:60}),
   mate=add(w,"waiting-parent",5,3,{sex:sex==="male"?"female":"male",phase:4,branch3:2,branch4:0,E:sex==="male"?30:12,M:sex==="male"?.75:.25,HP:60}),
   select=a=>a.type==="move"&&a.cell===cell(w,3,3);
  o.weights=Array(9).fill(0);const before={E:o.E,M:o.M,HP:o.HP,birthReady:o.birthReady},legal=scoreCandidate(w,o,select);
  mate.birthReady=1;const waiting=scoreCandidate(w,o,select);mate.birthReady=0;
  assert(Math.abs(legal.noRandom-waiting.noRandom-.325)<1e-8);
  mutate(o);const prepared=scoreCandidate(w,o,select);assert.equal(prepared.ryoukiGoal,"繁殖準備");
  mate.birthReady=1;const mutatedWaiting=scoreCandidate(w,o,select);mate.birthReady=0;
  assert(Math.abs(prepared.noRandom-mutatedWaiting.noRandom-.325*1.5)<1e-8);assert.notEqual(mutatedWaiting.ryoukiGoal,"繁殖準備");
  assert.equal(prepared.cost,legal.cost);assert.deepEqual({E:o.E,M:o.M,HP:o.HP,birthReady:o.birthReady},before);
  for(const [who,key,value]of [[o,"HP",56],[mate,"HP",56]]){const saved=who[key];who[key]=value;assert.equal(scoreCandidate(w,o,select).ryoukiGoal,"繁殖準備");who[key]=saved;}
  for(const [who,key,value]of [[o,"HP",55.9],[mate,"HP",55.9],[o,"E",o.E-.01],[mate,"E",mate.E-.01],[o,"M",o.M-.01],[mate,"M",mate.M-.01],[o,"age",17],[mate,"age",17],[o,"birthReady",1],[mate,"birthReady",1]]){
   const saved=who[key];who[key]=value;assert.notEqual(scoreCandidate(w,o,select).ryoukiGoal,"繁殖準備",`${sex}: ${who.id}.${key} must remain a gate`);who[key]=saved;
  }
  check(w);
 }
});

test("third and fourth branches multiply positive candidate gains by the selected comparison factors",()=>{
 function sample({phase=3,branch3=2,branch4=null,facing=4,foodDistance=0,known=false}){
  const w=fixture(),o=add(w,"branch-candidate",2,3,{phase,branch3,branch4,E:80,HP:80,facing}),distance=foodDistance||1,to=cell(w,2+distance,3);
  o.weights=Array(9).fill(0);o.weights[foodDistance?2:6]=100;
  if(foodDistance)add(w,"candidate-food",2+distance,3,{B:14,E:0},"grass");
  if(known)o.ryouki.recentCells=[{turn:0,cell:to}];
  const candidate=scoreCandidate(w,o,a=>a.type==="move"&&a.cell===to);check(w);return candidate;
 }
 for(const [neutral,selected,factor]of [
  [{},{branch3:0},1.2],
  [{foodDistance:1,known:true},{foodDistance:1,known:true,branch3:1},1.2],
  [{phase:4,branch3:0,branch4:1},{phase:4,branch3:0,branch4:0},1.3],
  [{phase:4,branch3:0,branch4:0,facing:3},{phase:4,branch3:0,branch4:1,facing:3},1.2],
  [{phase:4,branch3:1,branch4:1,foodDistance:1,known:true},{phase:4,branch3:1,branch4:0,foodDistance:1,known:true},1.25],
  [{phase:4,branch3:1,branch4:0,foodDistance:2,known:true},{phase:4,branch3:1,branch4:1,foodDistance:2,known:true},1.25],
 ]){
  const a=sample(neutral),b=sample(selected);assert(a.noRandom>0);assert(Math.abs(b.noRandom-a.noRandom*factor)<1e-8);assert(Math.abs(b.ryoukiBranchMultiplier-a.ryoukiBranchMultiplier*factor)<1e-8);assert.equal(a.cost,b.cost);
 }
 const unknownFood=sample({foodDistance:1,known:false,branch3:1});assert.equal(unknownFood.ryoukiBranchMultiplier,1);
});

test("branch preferences preserve unfavorable danger and real movement cost instead of creating a positive candidate",()=>{
 function sample(branch3,branch4){
  const w=fixture(),o=add(w,"unsafe-candidate",2,3,{phase:4,branch3,branch4,E:80,HP:80,facing:4});
  add(w,"visible-enemy",4,3,{phase:4,E:80,HP:100},"solar");o.weights=Array(9).fill(0);o.weights[1]=100;
  const candidate=scoreCandidate(w,o,a=>a.type==="move"&&a.cell===cell(w,3,3));check(w);return candidate;
 }
 const neutral=sample(2,0),preferred=sample(0,0);assert(neutral.noRandom<0);assert.equal(preferred.ryoukiBranchMultiplier,1.56);assert.equal(preferred.noRandom,neutral.noRandom);assert.equal(preferred.cost,neutral.cost);assert(preferred.cost>0);
});

test("successful movement histories are bounded to thirty-two turns and sixteen turns with at most sixty-four cells",()=>{
 const w=fixture(),o=add(w,"history",1,1,{phase:4,branch3:0,branch4:0,E:100,G:0});
 const routes=[[cell(w,2,1),cell(w,3,1),cell(w,4,1),cell(w,5,1)],[cell(w,5,2),cell(w,5,3),cell(w,5,4),cell(w,5,5)],[cell(w,4,5),cell(w,3,5),cell(w,2,5),cell(w,1,5)],[cell(w,1,4),cell(w,1,3),cell(w,1,2),cell(w,1,1)]];
 for(let t=1;t<=40;t++){w.turn=t;S.Ryouki.begin(w);const c=move(w,o,routes[(t-1)%4]);E.N.payActions(w,c);S.Ryouki.finalize(w,c);assert(o.ryouki.window.length<=32);assert(o.ryouki.recentCells.length<=64);assert(o.ryouki.recentCells.every(r=>r.turn>w.turn-16));check(w);}
 assert.equal(o.ryouki.window.length,32);assert.equal(o.ryouki.recentCells.length,64);assert(o.G<=16.000001);
});

test("direction continuation uses physical forty-five-degree turns rather than DIRS array adjacency",()=>{
 const w=fixture(),o=add(w,"angle",1,1,{phase:3,branch3:0,E:80,G:60});
 w.turn=1;let c=move(w,o,[cell(w,2,1)]);E.N.payActions(w,c);S.Ryouki.finalize(w,c);
 w.turn=2;c=move(w,o,[cell(w,3,2)]);E.N.payActions(w,c);S.Ryouki.finalize(w,c);
 const row=o.ryouki.window.at(-1);assert.equal(row.compared,1);assert.equal(row.straight,1);check(w);
});

test("fourth-phase gates require actual movement, feeding or terrain evidence despite sufficient experience",()=>{
 for(const branch3 of [0,1,2]){
  const w=fixture(),o=add(w,"gate-"+branch3,2,2,{phase:3,branch3,E:80,M:8,G:140}),c=ready(w);S.Ryouki.finalize(w,c);assert.equal(o.phase,3);assert.equal(o.G,140);check(w);
 }
});

test("third-phase branches select real fresh-cell, nearby-feeding and difficult-step outcomes",()=>{
 const explore=fixture(),e=add(explore,"explore",1,2,{phase:2,G:60,M:8,E:80});explore.turn=1;let c=move(explore,e,[cell(explore,2,2)]);E.N.payActions(explore,c);S.Ryouki.finalize(explore,c);assert.equal(e.phase,3);assert.equal(e.branch3,0);check(explore);
 const nearby=fixture(),n=add(nearby,"nearby",2,2,{phase:2,G:60,M:8,E:40});nearby.turn=1;c=ready(nearby);meal(nearby,n,c);S.Ryouki.finalize(nearby,c);assert.equal(n.phase,3);assert.equal(n.branch3,1);check(nearby);
 const difficult=fixture(),d=add(difficult,"difficult",1,2,{phase:2,G:50,M:8,E:80});for(const x of [2,3,4])difficult.tiles[cell(difficult,x,2)].terrain="rock";
 difficult.turn=1;c=move(difficult,d,[cell(difficult,2,2),cell(difficult,3,2)]);E.N.payActions(difficult,c);S.Ryouki.finalize(difficult,c);assert.equal(d.phase,2);
 d.G=60;difficult.turn=2;c=move(difficult,d,[cell(difficult,4,2)]);E.N.payActions(difficult,c);S.Ryouki.finalize(difficult,c);assert.equal(d.phase,3);assert.equal(d.branch3,2);check(difficult);
 const insufficient=fixture(),i=add(insufficient,"not-three",1,2,{phase:2,G:60,M:8,E:80});for(const x of [2,3])insufficient.tiles[cell(insufficient,x,2)].terrain="rock";
 insufficient.turn=1;c=move(insufficient,i,[cell(insufficient,2,2),cell(insufficient,3,2)]);E.N.payActions(insufficient,c);S.Ryouki.finalize(insufficient,c);assert.equal(i.phase,3);assert.notEqual(i.branch3,2);check(insufficient);
});

test("all six fourth-phase branches require and follow their actual eight-turn or eight-step evidence",()=>{
 for(const random of [false,true]){
  const w=fixture(16,12),o=add(w,"direction-"+random,1,2,{phase:3,branch3:0,G:140,M:8,E:80});
  for(let t=1;t<=8;t++){w.turn=t;const [x,y]=S.xy(w,o.cell),next=cell(w,random?(t%2?2:1):x+1,y),c=move(w,o,[next]);E.N.payActions(w,c);S.Ryouki.finalize(w,c);if(t<8)assert.equal(o.phase,3);check(w);}
  assert.equal(o.phase,4);assert.equal(o.branch4,random?1:0);
 }
 for(const far of [false,true]){
  const w=fixture(),o=add(w,"feeding-"+far,2,2,{phase:3,branch3:1,G:140,M:8,E:60});
  for(let t=1;t<=8;t++){w.turn=t;const c=t===2&&far?move(w,o,[cell(w,3,2),cell(w,4,2),cell(w,5,2)]):ready(w);E.N.payActions(w,c);meal(w,o,c);S.Ryouki.finalize(w,c);if(t<8)assert.equal(o.phase,3);check(w);}
  assert.equal(o.phase,4);assert.equal(o.branch4,far?1:0);
 }
 for(const hot of [false,true]){
  const w=fixture(16,12),o=add(w,"terrain-"+hot,1,2,{phase:3,branch3:2,G:140,M:8,E:80});
  for(let t=1;t<=8;t++){const next=cell(w,t+1,2);w.tiles[next].terrain=hot?"plain":"shallow";w.tiles[next].env=hot?1:0;w.turn=t;const c=move(w,o,[next]);E.N.payActions(w,c);S.Ryouki.finalize(w,c);if(t<8)assert.equal(o.phase,3);check(w);}
  assert.equal(o.phase,4);assert.equal(o.branch4,hot?1:0);
 }
});

test("mutation changes neither birth eligibility nor reproductive cooldown at a fixed phase and age",()=>{
 const w=fixture(),o=add(w,"same-fertility",2,2,{phase:4,branch3:0,branch4:0,sex:"female",E:40,M:1});const normal=S.phenotype(w,o),c=ready(w);assert(E.R.eligible(w,o,c));
 o.ryouki.mutated=true;const mutated=S.phenotype(w,o),cm=ready(w);assert(E.R.eligible(w,o,cm));assert.equal(mutated.cooldown,normal.cooldown);assert.equal(mutated.maintenance,normal.maintenance);assert.equal(mutated.maxHP,normal.maxHP);
});

test("an attack and parasite contact address the chosen roommate ID rather than the entire cell",()=>{
 const w=fixture(),attacker=add(w,"attacker",2,2,{phase:3,E:80},"abyss"),a=mutate(add(w,"target-a",3,2,{HP:80})),b=mutate(add(w,"target-b",3,2,{HP:80})),c=ready(w);
 c.intents.set(attacker.id,{type:"attack",target:a.id,cell:attacker.cell,path:[],cost:3});const hp=b.HP;E.B.combat(w,c);assert(a.HP<80);assert.equal(b.HP,hp);E.N.payActions(w,c);check(w);
 const infected=fixture(),donor=add(infected,"donor",2,2,{phase:3,E:40},"solar"),first=mutate(add(infected,"first",3,2)),second=mutate(add(infected,"second",3,2));
 donor.infection=S.infection(infected,"leafparasite",donor.id);donor.infection.stage="terminal";donor.infection.counter=8;donor.infection.E=.5;first.contactExposure=[{source:donor.infection.id,time:infected.turn-1,hits:2}];const ci=ready(infected);E.P.contacts(infected,ci);
 assert(first.infection);assert.equal(first.infection.hostId,first.id);assert.equal(second.infection,null);check(infected);
});

test("co-located deaths retain separate carcass IDs, parasite payloads and finite materials",()=>{
 const w=fixture(),a=mutate(add(w,"dead-a",3,3,{E:10,M:1,HP:0})),b=mutate(add(w,"dead-b",3,3,{E:12,M:2,HP:0}));
 a.infection=S.infection(w,"leafparasite",a.id);a.infection.stage="terminal";a.infection.counter=8;a.infection.E=.2;
 const c=ready(w);E.N.settle(w,c,E.P.fee);assert.equal(w.organisms.length,0);assert.equal(w.carcasses.length,2);assert.equal(new Set(w.carcasses.map(r=>r.id)).size,2);assert.equal(w.carcasses.filter(r=>r.infection).length,1);check(w);
 for(const o of [a,b]){
  const carcass=w.carcasses.find(r=>r.id===`c:${o.id}:${w.turn}`),death=c.events.get(o.id).find(e=>e.type==="death"),expected={version:"ryouki-state/1",mutated:true};
  assert(carcass);assert(death);assert.notEqual(carcass.appearance,death.appearance);
  for(const appearance of [carcass.appearance,death.appearance]){
   assert.deepEqual(appearance.ryouki,expected);assert.deepEqual(Object.keys(appearance.ryouki).sort(),["mutated","version"]);
   assert.notEqual(appearance.ryouki,o.ryouki);assert.notEqual(appearance.dna,o.dna);
  }
  assert.notEqual(carcass.appearance.ryouki,death.appearance.ryouki);assert.notEqual(carcass.appearance.dna,death.appearance.dna);
  const body=o.dna.body;o.ryouki.mutated=false;o.ryouki.window.push({turn:w.turn});o.ryouki.recentCells.push({turn:w.turn,cell:o.cell});o.dna.body=0;
  for(const appearance of [carcass.appearance,death.appearance]){assert.deepEqual(appearance.ryouki,expected);assert.equal(appearance.dna.body,body);}
 }
 const legacy=E.create({...base,ryoukiModel:undefined,selected:["solar"],initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});legacy.config.enabled.main=true;
 const old=add(legacy,"legacy-dead",2,2,{E:10,M:1,HP:0},"solar"),lc=ready(legacy);
 E.N.settle(legacy,lc,E.P.fee);const oldCarcass=legacy.carcasses.find(r=>r.id===`c:${old.id}:${legacy.turn}`),oldDeath=lc.events.get(old.id).find(e=>e.type==="death");
 assert(!Object.hasOwn(oldCarcass,"appearance"));assert(!Object.hasOwn(oldDeath.appearance,"ryouki"));
 assert.deepEqual(Object.keys(oldDeath.appearance).sort(),["age","birthLife","branch3","branch4","dna","facing","phase","role","sex","species"]);check(legacy);
});

test("short ryouki worlds repeat exactly and conserve finite budgets",()=>{
 const run=()=>{let w=E.create({...base,initial:12});for(let t=0;t<12;t++){w=E.step(w);check(w);}return E.fingerprint(w);};assert.equal(run(),run());
});

test("generated static and dynamic ryouki models agree",()=>{
 const Static=require("../src/ecology/observation-model.js").model(flags);let a=E.create({...base,initial:8}),b=Static.create({...base,initial:8});assert.equal(E.fingerprint(a),Static.fingerprint(b));
 for(let t=0;t<4;t++){a=E.step(a);b=Static.step(b);assert.equal(E.fingerprint(a),Static.fingerprint(b));check(a);assert.deepEqual(Static.invariants(b),[]);}
});
