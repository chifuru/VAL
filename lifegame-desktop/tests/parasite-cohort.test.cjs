"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const E=require("../design/advantage-switches/model.cjs").model({producer:false,waterbug:false,hyperparasite:false}),S=E.S;
const config={seed:"parasite-cohort-contract",width:16,height:12,initial:12,lineages:"manual",selected:["solar","jelly","ryouki"],
  ecologyRevision:"observation/4.1",producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",
  primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1",parasiteCohortModel:"cohort/1"};

test("parasite groups have finite members and host-passage infection decays within a generation",()=>{
 const w=E.create(config),p=S.PrimaryParasite.entries(w)[0]?.p;
 assert(p);assert.equal(p.primary.cohort.members,3);assert.equal(p.primary.cohort.passages,0);
 assert.equal(S.ParasiteCohort.chance(p),.8);
 p.primary.cohort.passages=2;assert(Math.abs(S.ParasiteCohort.chance(p)-.512)<1e-10);
 const first=S.PrimaryParasite.inoculum(w,p,{kind:"edible",cell:0,transfer:true,passages:3});
 const moved=S.PrimaryParasite.infection(w,p.species,"new-host",w.turn,"migrant",first);
 assert.equal(moved.primary.cohort.members,1);assert.equal(moved.primary.cohort.passages,3);
 const born=S.PrimaryParasite.infection(w,p.species,"new-host",w.turn,"offspring",S.PrimaryParasite.inoculum(w,p,{kind:"contact",cell:0,transfer:false,passages:0}));
 assert.equal(born.primary.cohort.members,2);assert.equal(born.primary.cohort.passages,0);
 const q=S.HyperParasite.create(w,p.id,w.turn,"q");assert.equal(q.hyper.cohort.members,2);
 assert.equal(S.PrimaryParasite.summary(w).members>=S.PrimaryParasite.summary(w).count,true);
});

test("first-host release spends one migrant rather than reporting a birth; terminal release retains the reproducing group",()=>{
 const w=E.create({...config,hyperParasiteModel:undefined}),h=w.organisms.find(o=>o.species==="grass");assert(h);
 w.organisms=[h];w.primaryInocula=[];w.pending=[];h.E=10;h.infection=null;
 const p=S.infection(w,"leafparasite",h.id,0,h.id);h.infection=p;
 Object.assign(p,{stage:"first",counter:4,E:1,ready:0});p.primary.settledAt=-1;p.primary.pauseUntil=-1;
 w.turn=2;const t=S.totals(w);w.ledger={initialE:t.E,initialM:t.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);
 let ctx=E.context(w),i=E.P.produce(w,ctx,h);
 assert(i?.transfer);assert.equal(i.passages,1);assert.equal(p.primary.cohort.members,2);assert.deepEqual(ctx.births,[]);
 p.ready=0;p.stage="terminal";p.counter=8;p.E=1;p.primary.settledAt=-1;
 ctx=E.context(w);i=E.P.produce(w,ctx,h);
 assert(i&&!i.transfer);assert.equal(i.passages,0);assert.equal(p.primary.cohort.members,2);
});

test("fanout spends two complete terminal propagules and reaches a first host two cells away",()=>{
 const build=fanout=>{
  const w=E.create({...config,...(fanout?{parasiteDispersalModel:"fanout/1"}:{})}),host=w.organisms.find(o=>o.slot==="main"),target=w.organisms.find(o=>o.species==="grass");
  assert(host&&target);
  const cell=S.nearby(w,host.cell,2,true).find(cell=>S.distance(w,host.cell,cell)===2&&!w.tiles[cell].blocked&&S.sight(w,host.cell,cell));
  assert.notEqual(cell,undefined);target.cell=cell;w.organisms=[host,target];host.infection=S.PrimaryParasite.infection(w,"leafparasite",host.id,0,"terminal-test");
  const p=host.infection;Object.assign(p,{stage:"terminal",counter:8,E:1,ready:0});p.primary.settledAt=-1;p.primary.pauseUntil=-1;
  w.turn=2;const first=E.P.produce(w,E.context(w),host),emissions=w.primaryInocula.length;
  assert(first&&!first.transfer);assert.equal(new Set(w.primaryInocula.map(i=>i.id)).size,emissions);
  w.turn=3;const ctx=E.context(w);E.P.contacts(w,ctx);
  return {emissions,exposures:ctx.primaryFlow.bySpecies.leafparasite.contact.exposures,energy:p.E};
 };
 const old=build(false),favored=build(true);
 assert.equal(old.emissions,1);assert.equal(old.exposures,0);
 assert.equal(favored.emissions,2);assert(favored.exposures>=1);
 assert(favored.energy<old.energy);
});

test("free Q cohort separates into two finite foragers without a birth",()=>{
 const w=E.create({...config,parasiteDispersalModel:"fanout/1"}),q=S.HyperParasite.create(w,null,0,"split-test");
 q.hostId=null;q.phase=4;q.hyper.state="adult";q.hyper.detachedAt=-1;q.cell=w.organisms.find(o=>o.slot==="main").cell;
 q.age=20;q.bornAt=-18;q.E=.2;q.B=.06;w.searchQ=[q];w.turn=2;
 const ctx=E.context(w);E.P.hyperSearch(w,ctx);
 assert.equal(w.searchQ.length,2);assert.equal(new Set(w.searchQ.map(a=>a.id)).size,2);
 assert.equal(w.searchQ.reduce((n,a)=>n+a.hyper.cohort.members,0),2);
 assert(Math.abs(w.searchQ.reduce((n,a)=>n+a.B,0)-.06)<1e-8);
 assert.deepEqual(ctx.births,[]);
});

test("fatal Q emergence assimilates a bounded amount of its P host",()=>{
 const w=E.create({...config,parasiteDispersalModel:"fanout/1"}),host=w.organisms.find(o=>o.slot==="main");assert(host);
 const p=S.PrimaryParasite.infection(w,"leafparasite",host.id,0,"hatch-host");host.infection=p;
 Object.assign(p,{stage:"terminal",counter:8,matureAt:0,E:.5,B:.04});p.primary.settledAt=-1;p.primary.pauseUntil=-1;
 const q=S.HyperParasite.create(w,p.id,0,"hatch-q");p.q=q;
 Object.assign(q,{phase:3,age:12,bornAt:-11,B:.02,E:.4});Object.assign(q.hyper,{state:"preparation",experience:12,development:12,settledAt:-1,pauseUntil:-1});
 w.config.hyperParasiteSettings.emergenceRate=1;w.config.hyperParasiteSettings.exclusionRate=0;w.turn=1;
 const total=S.totals(w).E;w.ledger={initialE:total,initialM:S.totals(w).M,solar:0,sinks:0,Mloss:0};
 const ctx=E.context(w);E.P.hyperBegin(w,ctx);E.P.hyperMature(w,ctx);
 assert.equal(q.phase,4);assert.equal(host.infection,null);assert(ctx.hyperFlow.bySpecies.hyperparasite.fedE>0);
 assert(q.E<=w.config.hyperParasiteSettings.capE);
 assert.deepEqual(E.invariants(w),[]);
});

test("Q can seed a half-developed terminal P before maturation only in a cohort world",()=>{
 const attempt=cohort=>{
  const w=E.create({...config,parasiteCohortModel:cohort?"cohort/1":undefined}),host=w.organisms.find(o=>o.slot==="main");assert(host);
  host.infection=S.PrimaryParasite.infection(w,"leafparasite",host.id,0,"window:"+cohort);
  Object.assign(host.infection,{stage:"terminal",counter:4,E:1});
  const q=S.HyperParasite.create(w,null,0,"adult:"+cohort);
  Object.assign(q,{cell:host.cell,phase:4,age:20,bornAt:-20,E:.5,B:.03});q.hyper.state="adult";
  w.turn=1;const ctx=E.context(w),result=E.P.hyperExpose(w,ctx,q,host);
  return {result,attempts:ctx.hyperFlow?.bySpecies?.hyperparasite?.invasionAttempts??0};
 };
 assert.equal(attempt(false).result.reason,"window");
 const newWorld=attempt(true);assert.notEqual(newWorld.result.reason,"window");assert.equal(newWorld.attempts,1);
});

test("cohort worlds remain deterministic and conserve stocks through early turns",()=>{
 const run=fanout=>{let w=E.create({...config,...(fanout?{parasiteDispersalModel:"fanout/1"}:{})});for(let i=0;i<20;i++){w=E.step(w);assert.deepEqual(E.invariants(w),[],`turn ${w.turn}`);}return E.fingerprint(w);};
 assert.equal(run(false),run(false));assert.equal(run(true),run(true));
 const old=E.create({...config,parasiteCohortModel:undefined});assert(!S.PrimaryParasite.entries(old).some(e=>e.p.primary.cohort));
});

test("all-turn cohort observations survive archive validation and replay",()=>{
 require("../src/ecology/replay-version.js");
 const version=globalThis.EcoReplayVersion,O=require("../src/ecology/observations.js"),A=require("../src/ecology/archive.js");
 let w=E.create(config);const h=O.create(w.config,version,{species:S.activeSpecies(w)});h.append(w);
 for(let i=0;i<6;i++){w=E.step(w);h.append(w);}
 assert.equal(h.rows.length,7);assert(h.rows.every(row=>Number.isSafeInteger(row.primaryParasite.members)&&Number.isSafeInteger(row.hyperParasite.members)));
 let raw=null;const a=A.create({getItem:()=>raw,setItem:(_,value)=>{raw=value;}},E,version),record=a.capture(w,"user",h.snapshot());
 assert.equal(a.save(record),true);assert.equal(a.replay(record.id).config.parasiteCohortModel,"cohort/1");
 const bad=structuredClone(h.snapshot());delete bad.rows[0].primaryParasite.members;
 assert.throws(()=>O.restore(bad,{validateOnly:true}),/寄生/);
});
