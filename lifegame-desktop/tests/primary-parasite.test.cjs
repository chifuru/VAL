"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=Factory.model(flags),S=E.S;
const base={seed:"primary-parasite-contract",width:16,height:12,initial:4,lineages:"manual",selected:["ryouki"],ageModel:"life/1",ecologyRevision:"observation/4.1",producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1"};
const dna=()=>Object.fromEntries(S.DNA.map(k=>[k,.5]));
function fixture(terrain="plain"){
 const w=E.create({...base,width:8,height:8,initial:0,enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true}});
 w.tiles=w.tiles.map(t=>({...t,env:terrain==="shallow"?0:3,terrain,light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
 w.organisms=[];w.resources=[];w.carcasses=[];w.pending=[];w.messages=[];w.primaryInocula=[];w.turn=0;
 w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};return w;
}
function add(w,id,species="grass",x=2,y=2,options={}){
 const o=S.organism(w,S.D.byId[species],S.index(w,x,y),id,{dna:dna(),age:50,...options});w.organisms.push(o);return o;
}
function infect(w,host,species="leafparasite",options={}){
 const p=S.infection(w,species,host.id,w.turn,options.origin||host.id);Object.assign(p,options);host.infection=p;return p;
}
function reset(w){const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
function check(w){assert.deepEqual(E.invariants(w),[]);}
function close(a,b){assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
function adaptationValues(a){return [a.hosts,a.routes,a.stages].flatMap(x=>Object.values(x));}
function inoculum(w,p,options={}){const i=S.PrimaryParasite.inoculum(w,p,{kind:"contact",cell:w.organisms.find(o=>o.id===p.hostId)?.cell??18,E:.06,createdAt:w.turn-1,expires:w.turn+4,...options});w.primaryInocula.push(i);return i;}
function matureSource(w,species="leafparasite",hostSpecies="solar"){
 const host=add(w,"source",hostSpecies,2,2),p=infect(w,host,species,{stage:"terminal",counter:8,E:1,matureAt:0});p.primary.settledAt=-1;p.primary.pauseUntil=-1;return {host,p};
}
function exposureTrial(reserve,n=0,options={}){
 const w=fixture(),{host:source,p}=matureSource(w),target=add(w,"recipient",options.targetSpecies||"grass",3,2,{E:0,...options.target}),
  i=inoculum(w,p,{id:`finite-exposure:${n}`,E:reserve,...options.inoculum});
 if(options.before)options.before(w,p,target,i);
 const c=reset(w),result=E.P.expose(w,c,i,target,options.route||"contact",options.fraction??1);return {w,c,source,p,target,i,result};
}

test("primary parasites are explicitly versioned without altering legacy catalogue or world shape",()=>{
 const old=E.create({...base,primaryParasiteModel:undefined}),w=E.create(base);
 assert(!old.config.primaryParasiteSettings);assert(!Object.hasOwn(old,"primaryInocula"));assert.equal(w.config.primaryParasiteSettings.version,"primary-parameters/1");
 assert.equal(S.activeSpecies(w).length,S.activeSpecies(old).length);assert.equal(S.D.species.filter(s=>s.group==="P").length,2);
 for(const patch of [{primaryParasiteModel:"primary/2"},{primaryParasiteSettings:{version:"primary-parameters/2"}},{primaryParasiteSettings:{unknown:1}}])assert.throws(()=>E.create({...base,...patch}),/SETTINGS_INVALID/);
 const host=add(w,"fresh-host"),p=infect(w,host);assert(S.PrimaryParasite.is(p));assert.equal(p.primary.version,"primary-state/1");assert.equal(p.phase,1);assert.equal(p.age,0);assert.equal(p.bornAt,w.turn);assert.equal(p.birthLife,120);assert.equal(p.B,.02);assert.equal(p.q,null);
});

test("the explicit host table distinguishes first, middle, terminal, carrier and non-host routes",()=>{
 const w=fixture(),rule=(p,species,route,stage,options={})=>S.PrimaryParasite.hostRule(p,add(w,`${p}:${species}:${route}:${stage}:${w.organisms.length}`,species,1,1,options),route,stage);
 for(const species of ["grass","moss","forestcrown","starcrown"]){const r=rule("leafparasite",species,"contact","terminal");assert(r.allowed);assert.equal(r.stage,"first");assert(r.develops);assert(!rule("tideparasite",species,"water","terminal").allowed);}
 for(const species of ["algae","freshwaterlight"]){for(const route of ["contact","water"]){const r=rule("tideparasite",species,route,"terminal");assert(r.allowed);assert.equal(r.stage,"first");}assert(!rule("leafparasite",species,"contact","terminal").allowed);}
 for(const [p,species]of [["leafparasite","grassbug"],["tideparasite","waterbug"]]){const r=rule(p,species,"feeding","first");assert(r.allowed);assert.equal(r.stage,"middle");assert(!rule(p,species,"contact","first").allowed);}
 for(const [p,species]of [["leafparasite","solar"],["leafparasite","ryouki"],["tideparasite","abyss"],["leafparasite","whale"],["tideparasite","whale"]]){
  const adult=rule(p,species,"feeding","middle"),juvenile=rule(p,species,"feeding","middle",{age:0});assert(adult.allowed);assert.equal(adult.stage,"terminal");assert(adult.develops);assert(juvenile.allowed);assert.equal(juvenile.stage,"extra");assert.equal(juvenile.develops,false);
 }
 for(const [p,species]of [["leafparasite","abyss"],["tideparasite","ryouki"],["leafparasite","algae"],["tideparasite","grass"],["leafparasite","fungus"]])assert(!rule(p,species,"feeding","middle").allowed);
});

test("adaptation is bounded, specialized and inherited only through balanced small mutations",()=>{
 const w=fixture(),p=infect(w,add(w,"adapted-parent")),a=p.primary.adaptation,original=structuredClone(a),values=adaptationValues(a),sum=values.reduce((n,v)=>n+v,0);
 const preference=structuredClone(p.primary.hostPreference),repeated=S.PrimaryParasite.infection(w,p.species,p.hostId,w.turn,p.hostId),snapshot=S.PrimaryParasite.inoculum(w,p,{cell:18}),descendant=S.PrimaryParasite.infection(w,p.species,"preference-child",w.turn,"preference-child",snapshot);
 assert.deepEqual(Object.keys(preference).sort(),Object.keys(a.hosts).sort());assert(Object.values(preference).every(v=>v>=.25&&v<=.75));assert.notDeepEqual(preference,a.hosts);assert.deepEqual(repeated.primary.hostPreference,preference);
 assert.deepEqual(snapshot.hostPreference,preference);assert.deepEqual(descendant.primary.hostPreference,preference);assert.notEqual(snapshot.hostPreference,p.primary.hostPreference);assert.notEqual(descendant.primary.hostPreference,snapshot.hostPreference);
 p.primary.hostPreference.grass=0;assert.deepEqual(snapshot.hostPreference,preference);assert.deepEqual(descendant.primary.hostPreference,preference);p.primary.hostPreference=structuredClone(preference);
 assert(values.length>7);assert(values.every(v=>v===.5));assert.equal(S.PrimaryParasite.adaptation(p,"grass","contact","first"),.5);
 a.hosts.grass=1;a.routes.contact=1;a.stages.first=1;assert.equal(S.PrimaryParasite.adaptation(p,"grass","contact","first"),1);p.primary.adaptation=original;
 let changed=0,unchanged=0;
 for(let n=0;n<128;n++){
  const child=S.PrimaryParasite.childAdaptation(w,p,`balanced-child:${n}`),v=adaptationValues(child.adaptation),delta=v.map((x,i)=>S.round(x-values[i]));
  assert(v.every(x=>x>=0&&x<=1));close(v.reduce((x,y)=>x+y,0),sum);assert(delta.every(x=>x===0||Math.abs(x)===.05));
  const count=delta.filter(Boolean).length;assert(count===0||count===2);if(count)changed++;else unchanged++;
 }
 assert(changed>0);assert(unchanged>0);assert.deepEqual(p.primary.adaptation,original);
});

test("resistance is route-specific, decays over forty turns and is effective only in proportion to its finite upkeep",()=>{
 const w=fixture(),host=add(w,"resistant-host","solar",2,2,{E:10});
 assert.equal(S.PrimaryParasite.resistance(w,host,"leafparasite","contact"),0);
 for(let n=0;n<3;n++)S.PrimaryParasite.acquireResistance(w,host,"leafparasite","contact");assert.equal(host.primaryResistance.version,"primary-resistance/1");assert.equal(host.primaryResistance.entries[0].value,.8);
 reset(w);const energy=host.E;S.PrimaryParasite.beginResistance(w,host);assert.equal(host.E,S.round(energy-.004));assert.equal(S.PrimaryParasite.resistance(w,host,"leafparasite","contact"),.8);assert.equal(S.PrimaryParasite.resistance(w,host,"leafparasite","water"),.4);assert.equal(S.PrimaryParasite.resistance(w,host,"leafparasite","feeding"),0);assert.equal(S.PrimaryParasite.resistance(w,host,"tideparasite","contact"),0);
 S.PrimaryParasite.beginResistance(w,host);assert.equal(host.E,S.round(energy-.004));check(w);
 w.turn=40;reset(w);S.PrimaryParasite.beginResistance(w,host);close(host.primaryResistance.entries[0].value,.4);close(S.PrimaryParasite.resistance(w,host,"leafparasite","contact"),.4);check(w);
 w.turn=41;host.E=0;reset(w);S.PrimaryParasite.beginResistance(w,host);assert.equal(S.PrimaryParasite.resistance(w,host,"leafparasite","contact"),0);assert(host.primaryResistance.entries[0].value>0);check(w);
});

test("zero exposure, non-hosts, incompatible routes and occupied individuals never become extra living colonies",()=>{
 for(const options of [{fraction:0},{targetSpecies:"fungus"},{route:"water"},{before:(w,p,target)=>infect(w,target,"leafparasite")}]){
  const a=exposureTrial(.06,0,options),before=a.target.infection,flow=a.c.primaryFlow?.bySpecies.leafparasite?.[options.route||"contact"];
  assert.equal(a.result.invaded,false);assert.equal(a.target.infection,before);assert.equal(a.w.primaryInocula.filter(i=>i.kind==="invading").length,0);assert(!a.target.primaryResistance);assert.equal(flow?.invasionAttempts||0,0);check(a.w);
 }
 const empty=exposureTrial(0);assert.equal(empty.result.exposed,0);assert.equal(empty.result.invaded,false);check(empty.w);
 assert(!S.PrimaryParasite.hostRule("leafparasite","phytoplankton","contact","terminal").allowed);
});

test("production spends a real parent's reserve, has one shared six-turn cooldown and cannot chain on its creation turn",()=>{
 const w=fixture(),{host,p}=matureSource(w);w.turn=1;let c=reset(w);const i=E.P.produce(w,c,host,"contact");assert(i);assert.equal(p.E,.88);assert.equal(i.E,.06);assert.equal(w.ledger.sinks,.06);assert.equal(p.ready,7);check(w);
 assert.equal(E.P.produce(w,c,host,"carcass"),null);const target=add(w,"contact-first","grass",3,2),oldEnergy=i.E;E.P.contacts(w,c);assert.equal(i.E,oldEnergy);assert.equal(target.infection,null);assert(!w.primaryInocula.some(a=>a.kind==="invading"));
 w.turn=6;c=reset(w);assert.equal(E.P.produce(w,c,host,"contact"),null);w.turn=7;c=reset(w);assert(E.P.produce(w,c,host,"contact"));check(w);
 const poor=fixture(),source=matureSource(poor);source.p.E=.119;poor.turn=1;c=reset(poor);assert.equal(E.P.produce(poor,c,source.host,"contact"),null);assert.equal(source.p.E,.119);assert.equal(poor.primaryInocula.length,0);check(poor);
});

test("entry and establishment occupy separate turns and preserve finite half and full doses with their original excess expiry",()=>{
 for(const reserve of [.03,.06,.09]){
  let found=false;
  for(let n=0;n<128&&!found;n++){
   const a=exposureTrial(reserve,n);if(!a.result.invaded){check(a.w);continue;}
   assert.equal(a.target.infection,null);assert.equal(S.PrimaryParasite.summary(a.w).count,1);const pending=a.w.primaryInocula.find(i=>i.kind==="invading");assert.equal(pending.establishAt,a.w.turn+1);assert.equal(pending.E,Math.min(.06,reserve));assert.equal(a.i.E,S.round(Math.max(0,reserve-.06)));assert.equal(a.i.expires,4);
   E.P.begin(a.w,a.c);assert.equal(a.target.infection,null);check(a.w);
   a.w.turn++;const c=E.context(a.w);E.P.begin(a.w,c);const child=a.target.infection;if(!child){check(a.w);continue;}
   assert.notEqual(child.id,a.p.id);assert.equal(child.q,null);assert.equal(child.phase,1);assert.equal(child.age,0);assert.equal(child.B,.02);assert.equal(child.primary.settledAt,a.w.turn);assert.equal(child.counter,0);assert.equal(child.primary.last.developed,false);
   close(child.E+child.primary.last.maintenanceE,Math.min(.06,reserve)-.02);assert.equal(S.PrimaryParasite.summary(a.w).count,2);assert.equal(a.i.E,S.round(Math.max(0,reserve-.06)));assert.equal(a.i.expires,4);check(a.w);found=true;
  }
  assert(found,`finite reserve ${reserve} must have a deterministic successful fixture`);
 }
});

test("subminimum and failed establishment doses dissipate once without creating a parasite or acquired resistance",()=>{
 const small=exposureTrial(.029);assert.equal(small.result.reason,"accumulating");assert.equal(small.result.invaded,false);assert.equal(small.c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,0);assert.equal(S.PrimaryParasite.summary(small.w).exposed.reserveE,.029);assert.equal(S.PrimaryParasite.summary(small.w).invading.records,0);
 small.w.turn=1;E.P.begin(small.w,E.context(small.w));assert.equal(small.target.infection,null);assert.equal(S.PrimaryParasite.summary(small.w).exposed.reserveE,.029);check(small.w);
 small.w.turn=4;E.P.begin(small.w,E.context(small.w));assert.equal(S.PrimaryParasite.summary(small.w).exposed.records,0);assert.equal(small.target.infection,null);assert(!small.target.primaryResistance);check(small.w);
 let failed=false;
 for(let n=0;n<128&&!failed;n++){
  const reserve=.06,a=exposureTrial(reserve,n);if(!a.result.invaded)continue;a.w.turn=1;const c=E.context(a.w);E.P.begin(a.w,c);
  if(a.target.infection)continue;
  const event=c.events.get(a.target.id)?.find(e=>e.type==="primary-establishment-failed");assert(event);assert.equal(event.amount,reserve);assert(!a.target.primaryResistance);assert.equal(a.w.primaryInocula.filter(i=>i.kind==="invading").length,0);const sink=a.w.ledger.sinks;E.P.begin(a.w,c);assert.equal(a.w.ledger.sinks,sink);check(a.w);
  failed=true;
 }
 assert(failed);
});

test("only same-origin finite microdoses accumulate before an invasion draw and their original deadline never restarts",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const a=exposureTrial(.06,n,{fraction:.25});assert.equal(a.result.reason,"accumulating");assert.equal(a.c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,0);const held=a.w.primaryInocula.find(i=>i.status==="exposed");assert.equal(held.E,.015);assert.equal(held.expires,4);
  const second=E.P.expose(a.w,a.c,a.i,a.target,"contact",1/3);assert.equal(a.i.E,.03);assert.equal(a.c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,1);assert.equal(a.target.infection,null);if(!second.invaded){check(a.w);continue;}
  assert.equal(held.status,"invaded");assert.equal(held.E,.03);assert.equal(held.expires,4);assert.equal(held.establishAt,1);assert.equal(S.PrimaryParasite.summary(a.w).exposed.records,0);assert.equal(S.PrimaryParasite.summary(a.w).invading.reserveE,.03);check(a.w);found=true;
 }
 assert(found);
 const a=exposureTrial(.015),other=inoculum(a.w,a.p,{id:"other-expiry",E:.015,expires:5}),r=E.P.expose(a.w,a.c,other,a.target,"contact");assert.equal(r.invaded,false);assert.equal(a.c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,0);assert.equal(S.PrimaryParasite.summary(a.w).exposed.reserveE,.015);assert.equal(a.w.primaryInocula.find(i=>i.status==="exposed").expires,4);
 // The second fixture reserve was appended after the initial ledger snapshot.
 a.w.ledger.initialE=S.round(a.w.ledger.initialE+.015);check(a.w);
});

test("an invasion on the last valid external turn gets exactly one next-turn establishment without refreshing expiry",()=>{
 let found=false;
 for(let n=0;n<128&&!found;n++){
  const a=exposureTrial(.06,n,{inoculum:{expires:1}});if(!a.result.invaded)continue;const held=a.w.primaryInocula.find(i=>i.status==="invaded");assert.equal(held.expires,1);assert.equal(held.invadedAt,0);assert.equal(held.establishAt,1);
  a.w.turn=1;const c=E.context(a.w);E.P.begin(a.w,c);if(!a.target.infection){check(a.w);continue;}assert.equal(a.target.infection.primary.settledAt,1);assert.equal(a.w.primaryInocula.length,0);check(a.w);found=true;
 }
 assert(found);
 const expired=exposureTrial(.06,0,{inoculum:{expires:0}});assert.equal(expired.result.invaded,false);assert.equal(expired.result.exposed,0);assert.equal(expired.target.infection,null);check(expired.w);
});

test("only a real exclusion acquires resistance, while a lost parasite and its Q cannot be recreated for free",()=>{
 const w=fixture(),host=add(w,"cleared-host","solar"),p=infect(w,host,"leafparasite",{E:.2});p.q=S.hyper(w,p.id);const c=reset(w),before=S.totals(w).E;
 assert(E.P.exclude(w,c,host,"immunity"));assert.equal(host.infection,null);assert.equal(host.primaryResistance.entries[0].value,.4);assert.equal(host.primaryResistance.entries[0].species,"leafparasite");close(before-S.totals(w).E,w.ledger.sinks);assert.equal(w.primaryInocula.length,0);const sunk=w.ledger.sinks;assert.equal(E.P.exclude(w,c,host,"immunity"),false);assert.equal(w.ledger.sinks,sunk);assert.equal(host.primaryResistance.entries[0].value,.4);check(w);
 const natural=fixture(),h=add(natural,"natural-host","solar");infect(natural,h,"leafparasite",{E:.2});const n=reset(natural);E.P.exclude(natural,n,h,"age");assert(!h.primaryResistance);check(natural);
});

test("water diffusion uses a synchronous twenty-percent budget and retains origin and the exact original expiry",()=>{
 const w=fixture("shallow"),{p}=matureSource(w,"tideparasite","abyss"),origin=inoculum(w,p,{id:"water-origin",kind:"water",route:"water",cell:S.index(w,3,3),E:.06,createdAt:0,expires:4});w.turn=1;const c=reset(w);E.P.diffuse(w,c);
 assert.equal(origin.E,.048);const moved=w.primaryInocula.filter(i=>i.cell!==origin.cell);close(moved.reduce((n,i)=>n+i.E,0),.012);assert(moved.length>0);assert(moved.every(i=>S.distance(w,origin.cell,i.cell)===1&&i.expires===4&&i.createdAt===0&&i.sourceId===p.id));close(w.primaryInocula.reduce((n,i)=>n+i.E,0),.06);check(w);
 const land=fixture(),source=matureSource(land,"tideparasite","abyss"),stock=inoculum(land,source.p,{kind:"water",route:"water",createdAt:0,expires:4});land.turn=1;const lc=reset(land);E.P.diffuse(land,lc);assert.equal(stock.E,.06);assert.equal(land.primaryInocula.length,1);check(land);
 w.turn=4;const before=w.ledger.sinks;E.P.begin(w,E.context(w));assert(!w.primaryInocula.length);assert(w.ledger.sinks>=before+.06);check(w);
});

test("lethal feeding transfers the same P and Q IDs, reserves and clocks, then pauses development for the following turn",()=>{
 let found=false,failed=false;
 for(let n=0;n<64&&(!found||!failed);n++){
  const w=fixture(),source=add(w,"prey-host","grassbug",2,2),target=add(w,"next-host","ryouki",3,2,{age:18}),p=infect(w,source,"leafparasite",{origin:`moving-p:${n}`,stage:"middle",counter:6,phase:2,B:.03,E:.8,age:30,bornAt:-30});
  p.primary.successT=11;p.q=S.hyper(w,p.id);p.q.E=.2;const q=p.q;w.turn=1;const c=reset(w);E.P.begin(w,c);
  const fixed={id:p.id,E:p.E,B:p.B,age:p.age,bornAt:p.bornAt,birthLife:p.birthLife,successT:p.primary.successT,q:structuredClone(q),adaptation:structuredClone(p.primary.adaptation),hostPreference:structuredClone(p.primary.hostPreference)};
  source.HP=0;c.harvestDead.add(source.id);E.P.transfer(w,c,source,target,"plant",{fraction:1});const pending=w.pending.find(a=>a.kind==="primary-migration");if(!pending){check(w);continue;}
  assert.equal(target.infection,null);assert.equal(source.infection,null);assert.equal(pending.infection,p);assert.equal(p.q,q);assert.equal(p.hostId,pending.id);assert.equal(pending.hostId,target.id);assert.equal(pending.establishAt,2);assert.equal(p.stage,"middle");assert.equal(p.counter,6);assert.equal(p.primary.pauseUntil,2);assert.equal(S.PrimaryParasite.summary(w).migrating,1);
  assert.deepEqual({id:p.id,E:p.E,B:p.B,age:p.age,bornAt:p.bornAt,birthLife:p.birthLife,successT:p.primary.successT,q:p.q,adaptation:p.primary.adaptation,hostPreference:p.primary.hostPreference},fixed);
  E.P.mature(w,c);assert.equal(p.counter,6);assert.equal(p.primary.successT,11);check(w);
  w.turn=2;let next=E.context(w);E.P.begin(w,next);E.P.mature(w,next);
  if(!target.infection){assert.equal(w.pending.filter(a=>a.kind==="primary-migration").length,0);assert.equal(S.PrimaryParasite.summary(w).count,0);check(w);failed=true;continue;}
  assert.equal(target.infection,p);assert.equal(p.q,q);assert.equal(p.counter,0);assert.equal(p.id,fixed.id);assert.equal(p.q.id,fixed.q.id);assert.equal(p.q.counter,fixed.q.counter);assert.equal(p.primary.successT,11);check(w);
  w.turn=3;next=E.context(w);E.P.begin(w,next);E.P.mature(w,next);assert.equal(p.counter,1);assert.equal(p.bornAt,-30);assert.deepEqual(p.primary.hostPreference,fixed.hostPreference);check(w);found=true;
 }
 assert(found,"a legal fixed-origin migration fixture must establish");assert(failed,"the separate migration establishment may fail without duplicating P/Q");
});

test("a daughter from a finite inoculum gets a new ID without copying its parent's resident Q or acquired state",()=>{
 let found=false;
 for(let n=0;n<128&&!found;n++){
  const a=exposureTrial(.06,n,{before:(w,p)=>{p.q=S.hyper(w,p.id);p.q.E=.2;p.primary.successT=12;p.primaryResistance={version:"primary-resistance/1",entries:[{species:"hyperparasite",route:"contact",value:.4,updatedAt:0,effective:0}],paidAt:-1};}});
  if(!a.result.invaded)continue;const q=a.p.q;a.w.turn=1;const c=E.context(a.w);E.P.begin(a.w,c);const child=a.target.infection;if(!child)continue;
  assert.notEqual(child.id,a.p.id);assert.equal(child.q,null);assert.equal(a.p.q,q);assert.equal(q.hostId,a.p.id);assert.equal(child.primary.successT,0);assert(!child.primaryResistance);assert.equal(E.P.produce(a.w,c,a.target,"contact"),null);assert.equal(c.births.filter(x=>x==="leafparasite").length,1);check(a.w);found=true;
 }
 assert(found);
});

test("three co-located hosts reserve invasion and establishment by actual host ID without copying finite infection mass",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const w=fixture(),{p}=matureSource(w),hosts=[0,1,2].map(k=>{const h=add(w,`roommate-${k}`,"ryouki",3,3,{age:18,E:0});h.ryouki.mutated=true;return h;}),target=hosts[1],i=inoculum(w,p,{id:`roommate-inoculum:${n}`,kind:"edible",route:"feeding",stage:"middle",E:.06});
  const c=reset(w),r=E.P.expose(w,c,i,target,"feeding");if(!r.invaded){check(w);continue;}
  assert.equal(w.primaryInocula.filter(a=>a.kind==="invading").length,1);assert.equal(w.primaryInocula.find(a=>a.kind==="invading").hostId,target.id);assert(hosts.every(h=>h.infection===null));
  w.turn=1;E.P.begin(w,E.context(w));if(!target.infection)continue;assert.equal(target.infection.hostId,target.id);assert.equal(hosts[0].infection,null);assert.equal(hosts[2].infection,null);assert.equal(S.mainAt(S.maps(w),target.cell).length,3);check(w);found=true;
 }
 assert(found);
});

test("partial leaf feeding apportions only the finite edible stock and never splits the resident P or its Q",()=>{
 const w=fixture(),source=add(w,"leaf-colony","grass",2,2,{B:12}),p=infect(w,source,"leafparasite",{stage:"first",counter:4,E:.5});p.q=S.hyper(w,p.id);p.q.E=.2;
 const first=add(w,"first-grazer","grassbug",3,2),second=add(w,"second-grazer","grassbug",3,3),i=inoculum(w,p,{id:"shared-edible",kind:"edible",route:"feeding",stage:"first",hostId:source.id,E:.06}),c=reset(w);
 E.P.transfer(w,c,source,first,"plant",{consumedB:0,beforeEdibleB:10});assert.equal(i.E,.06);
 E.P.transfer(w,c,source,first,"plant",{consumedB:2,beforeEdibleB:10});assert.equal(i.E,.048);
 E.P.transfer(w,c,source,second,"plant",{consumedB:3,beforeEdibleB:8});assert.equal(i.E,.03);
 const exposure=(c.events.get(first.id)||[]).concat(c.events.get(second.id)||[]).filter(e=>["primary-invasion","primary-exposure"].includes(e.type));close(exposure.reduce((n,e)=>n+e.amount,0),.03);assert.equal(source.infection,p);assert.equal(p.q.hostId,p.id);assert.equal(first.infection,null);assert.equal(second.infection,null);check(w);
 w.turn=1;E.P.begin(w,E.context(w));assert.equal(first.infection,null);assert.equal(second.infection,null);assert.equal(source.infection,p);check(w);
});

test("immature terminal hosts carry without development or release until maturity or the fixed twelve-turn deadline",()=>{
 for(const matures of [false,true]){
  const w=fixture(),host=add(w,"juvenile-carrier","ryouki",2,2,{age:0,E:20}),p=infect(w,host,"leafparasite",{stage:"extra",counter:0,E:.5});p.primary.carrier=true;p.primary.carrierUntil=12;
  w.turn=11;let c=reset(w);E.P.begin(w,c);E.P.mature(w,c);assert.equal(p.counter,0);assert.equal(p.matureAt,undefined);assert.equal(E.P.produce(w,c,host,"contact"),null);check(w);
  if(matures)host.age=18;w.turn=12;c=E.context(w);E.P.begin(w,c);E.P.mature(w,c);
  if(matures){assert.equal(host.infection,p);assert.equal(p.stage,"terminal");assert.equal(p.primary.carrier,false);assert(p.counter<=1);assert.equal(p.matureAt,undefined);}
  else{assert.equal(host.infection,null);assert(!host.primaryResistance);assert.equal(w.primaryInocula.length,0);}
  assert.equal(p.bornAt,0);check(w);
 }
});

test("host-stage progress, the parasite's three phases and age use independent finite clocks and paid biomass growth",()=>{
 for(const [stage,hostSpecies,required]of [["first","grass",4],["middle","grassbug",6],["terminal","solar",8]]){
  const w=fixture(),host=add(w,`development-${stage}`,hostSpecies,2,2,{E:10}),p=infect(w,host,"leafparasite",{stage,E:1}),originalGenes=structuredClone(p.primary.adaptation),preference=structuredClone(p.primary.hostPreference),form=p.primary.form;
  assert(["A","B","C"].includes(form));assert.equal(p.primary.formVersion,"primary-form/1");
  reset(w);
  for(let turn=1;turn<=20;turn++){
   w.turn=turn;const c=E.context(w);E.P.begin(w,c);const before={host:host.E,p:p.E,sink:w.ledger.sinks};E.P.fee(w,c,host);assert.deepEqual({host:host.E,p:p.E,sink:w.ledger.sinks},before);E.P.mature(w,c);
   assert.equal(p.counter,Math.min(turn,required));assert.equal(p.primary.successT,turn);assert.equal(p.phase,turn>=20?3:turn>=8?2:1);assert.equal(p.B,turn>=20?.04:turn>=8?.03:.02);assert.equal(p.age,turn);assert.equal(p.bornAt,0);assert.equal(p.primary.form,form);check(w);
  }
  assert.deepEqual(p.primary.adaptation,originalGenes);assert.deepEqual(p.primary.hostPreference,preference);assert.equal(p.matureAt,stage==="terminal"?8:undefined);assert.equal(p.birthLife,120);
 }
});

test("the initial terminal maturity stamp opens exactly T+1 through T+3 and never restarts on phase growth",()=>{
 const w=fixture(),host=add(w,"terminal-host","solar",2,2,{E:10}),p=infect(w,host,"leafparasite",{stage:"terminal",counter:7,E:1});w.turn=1;let c=reset(w);E.P.begin(w,c);E.P.mature(w,c);assert.equal(p.matureAt,1);assert.equal(E.P.windowOpen(w,p),false);
 for(const [turn,open]of [[2,true],[4,true],[5,false],[8,false],[20,false]]){w.turn=turn;c=E.context(w);E.P.begin(w,c);E.P.mature(w,c);assert.equal(p.matureAt,1);assert.equal(E.P.windowOpen(w,p),open);check(w);}
});

test("eight consecutive unpaid maintenance turns or the fixed lifetime end remove P and its un-emerged Q once",()=>{
 const w=fixture(),host=add(w,"starved-host","solar",2,2,{E:0}),p=infect(w,host,"leafparasite",{E:0});p.q=S.hyper(w,p.id);p.q.E=.1;reset(w);
 for(let turn=1;turn<=8;turn++){w.turn=turn;const c=E.context(w);E.P.begin(w,c);E.P.mature(w,c);if(turn<8){assert.equal(host.infection,p);assert.equal(p.primary.starvationRun,turn);assert.equal(p.counter,0);assert.equal(p.phase,1);}else{assert.equal(host.infection,null);assert.equal(S.PrimaryParasite.summary(w).count,0);assert.equal(w.primaryInocula.length,0);assert(!host.primaryResistance);}check(w);}
 const old=fixture(),h=add(old,"old-host","solar"),aged=infect(old,h,"leafparasite",{E:.5,bornAt:0});aged.q=S.hyper(old,aged.id);aged.q.E=.1;old.turn=120;const c=reset(old);E.P.begin(old,c);assert.equal(h.infection,null);assert.equal(w.primaryInocula.length,0);check(old);
});

test("induction is funded only after full maintenance and development and scales to the actually paid phase budget",()=>{
 for(const [phase,maintenance,meta,cap]of [[1,.03,.005,.1],[2,.04,.01,.2],[3,.06,.02,.3]])for(const ratio of [0,.5,1]){
  const w=fixture(),host=add(w,"induced-host","solar",2,2,{E:0}),p=infect(w,host,"leafparasite",{stage:"terminal",phase,B:[0,.02,.03,.04][phase],E:S.round(maintenance+.01+meta*ratio)}),genes=structuredClone(p.primary.adaptation),weights=host.weights.slice();w.turn=1;const c=reset(w);E.P.begin(w,c);
  assert(p.primary.last.maintained);assert(p.primary.last.developed);assert.equal(p.primary.last.metaE,S.round(meta*ratio));assert.equal(p.primary.last.induction,S.round(cap*ratio));assert.equal(p.E,0);assert.deepEqual(p.primary.adaptation,genes);assert.deepEqual(host.weights,weights);close(w.ledger.sinks,maintenance+.01+meta*ratio);check(w);
 }
 const w=fixture(),host=add(w,"unpaid-development","solar",2,2,{E:0}),p=infect(w,host,"leafparasite",{stage:"terminal",E:.039});w.turn=1;const c=reset(w);E.P.begin(w,c);E.P.mature(w,c);assert(p.primary.last.maintained);assert.equal(p.primary.last.developed,false);assert.equal(p.counter,0);assert.equal(p.primary.last.induction,0);check(w);
});

test("host and route adaptation keeps real maintenance and development costs within the selected finite tradeoff bounds",()=>{
 for(const value of [0,.5,1]){
  const w=fixture(),host=add(w,"cost-host","grass",2,2,{E:0}),p=infect(w,host,"leafparasite",{E:.5});
  p.primary.adaptation.hosts.grass=value;p.primary.adaptation.routes.contact=value;p.primary.adaptation.stages.first=value;
  const genes=structuredClone(p.primary.adaptation),factor=1-.5*(value-.5);w.turn=1;const c=reset(w);E.P.begin(w,c);
  assert.equal(p.primary.last.maintenanceE,S.round(.03*factor));assert.equal(p.primary.last.developmentE,S.round(.01*factor));assert(p.primary.last.maintenanceE>=.0225&&p.primary.last.maintenanceE<=.0375);assert(p.primary.last.maintenanceE>0);assert.deepEqual(p.primary.adaptation,genes);check(w);
 }
});

test("genetic success affects establishment once, while full adaptation cannot open a non-host route",()=>{
 let advantage=false,notSquared=false;
 for(let n=0;n<128&&(!advantage||!notSquared);n++){
  const setup=high=>({target:{dna:{...dna(),skin:0}},before:(w,p,target,i)=>{w.config.primaryParasiteSettings.entryRates.contact=1;for(const key of ["hosts","routes","stages"])for(const trait of Object.keys(i.adaptation[key]))i.adaptation[key][trait]=high?1:.5;}}),high=exposureTrial(.06,n,setup(true)),pending=high.w.primaryInocula.find(i=>i.kind==="invading");assert(pending);
  const draw=S.r(high.w,"primary/establishment",1,pending.id,high.target.id);if(draw<.7||draw>=.875&&notSquared)continue;
  high.w.turn=1;E.P.begin(high.w,E.context(high.w));
  if(draw<.875){
   assert(high.target.infection);const ordinary=exposureTrial(.06,n,setup(false));ordinary.w.turn=1;E.P.begin(ordinary.w,E.context(ordinary.w));assert.equal(ordinary.target.infection,null);check(ordinary.w);advantage=true;
  }else{assert.equal(high.target.infection,null);notSquared=true;}
  check(high.w);
 }
 assert(advantage);assert(notSquared);
 const blocked=exposureTrial(.06,0,{targetSpecies:"fungus",before:(w,p,target,i)=>{for(const group of Object.values(i.adaptation))for(const key of Object.keys(group))group[key]=1;}});assert.equal(blocked.result.compatible,false);assert.equal(blocked.result.invaded,false);assert.equal(blocked.c.primaryFlow.bySpecies.leafparasite.contact.invasionAttempts,0);check(blocked.w);
});

test("exclusion attempts pay real action energy on both outcomes and acquire resistance only on actual removal",()=>{
 for(const success of [false,true]){
  const w=fixture(),host=add(w,"immunity-host","solar",2,2,{E:20}),p=infect(w,host,"leafparasite",{E:.5});w.config.primaryParasiteSettings.exclusionRate=success?1:0;w.turn=1;const c=reset(w);E.P.begin(w,c);E.prepare(w,c);const energy=host.E;E.P.clear(w,c);assert.equal(c.costs.get(host.id).action,.04);E.N.payActions(w,c);assert.equal(host.E,S.round(energy-.04));
  if(success){assert.equal(host.infection,null);assert.equal(host.primaryResistance.entries[0].value,.4);}else{assert.equal(host.infection,p);assert(!host.primaryResistance);}check(w);
 }
 const w=fixture(),host=add(w,"unfunded-immunity","solar",2,2,{E:0}),p=infect(w,host,"leafparasite",{E:.5}),c=reset(w);E.prepare(w,c);w.config.primaryParasiteSettings.exclusionRate=1;E.P.clear(w,c);assert.equal(host.infection,p);assert.equal(c.costs.get(host.id).action,0);assert(!host.primaryResistance);check(w);
});

test("death retains a mature same-ID P/Q only in its finite carcass carrier and expiry cannot rescue either colony",()=>{
 for(const mature of [false,true]){
  const w=fixture(),host=add(w,"dead-first-host","grass",2,2,{E:4,M:1,HP:0}),p=infect(w,host,"leafparasite",{E:.5,counter:mature?4:3});p.q=S.hyper(w,p.id);p.q.E=.2;const q=p.q;w.turn=1;const c=reset(w);E.prepare(w,c);c.intents.set(host.id,{type:"stop",cell:host.cell,cost:0,path:[]});E.N.settle(w,c,E.P.fee);assert.equal(w.organisms.length,0);assert.equal(w.carcasses.length,1);const carcass=w.carcasses[0];assert.equal(host.infection,null);
  if(mature){assert.equal(carcass.infection,p);assert.equal(p.q,q);assert.equal(p.hostId,carcass.id);assert.equal(carcass.payloadExpires,13);assert.equal(S.PrimaryParasite.summary(w).external,1);w.turn=13;E.N.expireAndCA(w,E.context(w));assert.equal(w.carcasses.length,0);assert.equal(S.PrimaryParasite.summary(w).count,0);}
  else{assert.equal(carcass.infection,null);assert.equal(S.PrimaryParasite.summary(w).count,0);}
  assert.equal(w.primaryInocula.length,0);check(w);
 }
});

test("automatic founders use existing first hosts while direct zero, exact first-host counts and shortage never add rescue hosts",()=>{
 const w=E.create(base),report=w.config.primaryParasiteInitial;
 for(const species of ["leafparasite","tideparasite"]){const first=w.organisms.filter(o=>S.PrimaryParasite.hostTable[species].first.includes(o.species)).length;assert.equal(report.bySpecies[species].firstHosts,first);assert.equal(report.bySpecies[species].planned,Math.floor(first*.2));}
 const zero=E.create({...base,founderCounts:{version:1,species:{},parasites:{leafparasite:0,tideparasite:0,hyperparasite:0}}});assert.equal(S.PrimaryParasite.summary(zero).count,0);assert.equal(zero.config.primaryParasiteInitial.actual,0);check(zero);
 const manual={...base,producerSettings:{land:{occupancy:0},water:{occupancy:0}},largePlantSettings:{autoDensity:{land:0,water:0}},founderCounts:{version:1,species:{grass:3},parasites:{leafparasite:3,tideparasite:0,hyperparasite:0}}},direct=E.create(manual),hosts=direct.organisms.filter(o=>o.infection?.species==="leafparasite");
 assert.equal(hosts.length,3);assert(hosts.every(o=>o.species==="grass"));assert.equal(direct.organisms.filter(o=>o.species==="grass").length,3);assert.equal(direct.config.primaryParasiteInitial.shortage,0);check(direct);
 assert.throws(()=>E.create({...manual,founderCounts:{...manual.founderCounts,parasites:{...manual.founderCounts.parasites,leafparasite:4}}}),/PLACEMENT_SHORTAGE/);
 assert.throws(()=>E.create({...manual,enabled:{P:false}}),/SETTINGS_INVALID/);
 const disabled=E.create({...manual,enabled:{P:false},founderCounts:{...manual.founderCounts,parasites:{leafparasite:0,tideparasite:0,hyperparasite:0}}});assert.equal(S.PrimaryParasite.summary(disabled).count,0);assert.equal(disabled.organisms.filter(o=>o.species==="grass").length,3);check(disabled);
});

test("automatic terminal founders require already mature hosts and retain shortages without promoting juveniles or reallocating quotas",()=>{
 const standard=E.create({...base,initial:20}),main=standard.organisms.filter(o=>o.slot==="main"),item=standard.config.primaryParasiteInitial.bySpecies.leafparasite;
 assert.equal(main.length,20);assert(main.every(o=>o.age===0));assert(item.stages.terminal.planned>0);assert.equal(item.stages.terminal.actual,0);assert.equal(item.stages.terminal.shortage,item.stages.terminal.planned);assert.equal(item.shortage,item.stages.terminal.planned);assert.equal(item.actual,item.planned-item.shortage);assert(item.reasons.some(r=>r.includes("terminal")&&r.includes("成熟済み")));assert(!standard.organisms.some(o=>o.infection?.stage==="extra"));assert(main.every(o=>!o.infection));check(standard);
 const mature=structuredClone(standard),ids=mature.organisms.map(o=>o.id);for(const o of mature.organisms){o.infection=null;if(o.slot==="main")o.age=18;}mature.searchQ=[];
 const report=S.PrimaryParasite.initial(mature).bySpecies.leafparasite;assert.equal(report.planned,item.planned);assert.equal(report.stages.terminal.actual,item.stages.terminal.planned);assert.equal(report.stages.terminal.shortage,0);assert.equal(report.shortage,0);assert.equal(mature.organisms.filter(o=>o.infection?.species==="leafparasite"&&o.infection.stage==="terminal").length,item.stages.terminal.planned);assert.deepEqual(mature.organisms.map(o=>o.id),ids);reset(mature);check(mature);
 for(const o of mature.organisms)o.infection=null;mature.config.founderCounts={version:1,species:{},parasites:{leafparasite:3,tideparasite:0,hyperparasite:0}};
 const manual=S.PrimaryParasite.initial(mature).bySpecies.leafparasite,placed=mature.organisms.filter(o=>o.infection);assert.equal(manual.requested,3);assert.equal(manual.actual,3);assert.equal(manual.shortage,0);assert(placed.every(o=>S.PrimaryParasite.hostTable.leafparasite.first.includes(o.species)&&o.infection.stage==="first"));assert.deepEqual(mature.organisms.map(o=>o.id),ids);reset(mature);check(mature);
});

test("short primary worlds repeat their committed state and conserve finite parasite, inoculum and host budgets",()=>{
 const run=()=>{let w=E.create({...base,initial:12});for(let turn=0;turn<12;turn++){w=E.step(w);check(w);}return E.fingerprint(w);};assert.equal(run(),run());
});

test("paid edible production reaches a real grazing consumer through regrowing colony stock before its fixed deadline",()=>{
 let found=false;
 for(let n=0;n<64&&!found;n++){
  const w=fixture(),source=add(w,"foodweb-colony","grass",2,2,{B:22,E:20,M:1}),consumer=add(w,"foodweb-grazer","grassbug",2,2,{age:3,E:0}),p=infect(w,source,"leafparasite",{origin:`foodweb-parent:${n}`,stage:"first",counter:4,E:1});
  reset(w);let reserve;
  for(let turn=1;turn<=4;turn++){
   w.turn=turn;const c=E.context(w);E.P.begin(w,c);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});S.Colony.begin(w);S.Colony.regrow(w,source);
   if(turn===1){reserve=E.P.produce(w,c,source,"edible");assert(reserve);assert.equal(reserve.E,.06);assert.equal(reserve.expires,5);}
   const edible=S.edibleB(source);E.N.feed(w,c,E.P.transfer);assert.equal(c.records.get(consumer.id).bites,2);assert.equal(S.edibleB(source),S.round(edible-4));assert.equal(consumer.infection,null);assert.equal(source.infection,p);E.P.mature(w,c);check(w);
  }
  const entering=w.primaryInocula.find(i=>i.status==="invaded"&&i.hostId===consumer.id);if(!entering)continue;
  assert(entering.E>=.03&&entering.E<=.06);assert.equal(entering.invadedAt,4);assert.equal(entering.establishAt,5);assert.equal(entering.expires,5);w.turn=5;E.P.begin(w,E.context(w));if(!consumer.infection){check(w);continue;}
  assert.equal(consumer.infection.stage,"middle");assert.notEqual(consumer.infection.id,p.id);assert.equal(source.infection,p);assert.equal(consumer.infection.B,.02);assert.equal(S.PrimaryParasite.summary(w).count,2);check(w);found=true;
 }
 assert(found,"the fixed twenty-B colony and actual grazing path must have a finite successful fixture");
});

test("paid induction changes only a visible legal candidate's bounded score and cannot invent a distant host cue",()=>{
 const w=fixture(),host=add(w,"induced-actor","ryouki",2,2,{phase:3,branch3:2,E:80,age:18}),target=add(w,"visible-plant","grass",5,2),p=infect(w,host,"leafparasite",{stage:"terminal",counter:8,phase:3,B:.04,E:.5}),genes=structuredClone(host.dna);
 host.weights=Array(9).fill(0);host.weights[6]=100;const weights=host.weights.slice();w.turn=1;const c=reset(w);E.P.begin(w,c);E.prepare(w,c);const paid=p.primary.last.induction;assert.equal(paid,.3);
 function score(strength){
  p.primary.last.induction=strength;const m=S.maps(w),candidate=E.B.candidates(w,host,c,m).find(a=>a.type==="move"&&a.cell===S.index(w,3,2));assert(candidate);
  const v={m,visibleCells:new Set(S.nearby(w,host.cell,c.traits.get(host.id).sense,true).filter(cell=>E.B.visible(w,host,cell,c))),traits:c.traits,enemies:[],nearest:null,qualityCache:new Map(),dangerCache:new Map(),neighborhoodCache:new Map()};
  Object.assign(candidate,E.B.evaluate(w,host,candidate,c,v));return candidate;
 }
 const plain=score(0),induced=score(paid);assert(plain.noRandom>0);assert.equal(induced.primaryInduction.target,target.id);close(induced.noRandom-plain.noRandom,Math.abs(plain.noRandom)*paid*.5);assert.equal(induced.cost,plain.cost);assert.deepEqual(host.dna,genes);assert.deepEqual(host.weights,weights);
 target.cell=S.index(w,6,2);const hiddenPlain=score(0),hiddenInduced=score(paid);assert.equal(hiddenInduced.primaryInduction,undefined);assert.equal(hiddenInduced.noRandom,hiddenPlain.noRandom);p.primary.last.induction=paid;check(w);
});
