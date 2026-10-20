"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const E=require("../src/ecology/engine.js"),S=E.S;
const base={seed:"i11/parasite-survival-boundaries",width:8,height:8,initial:0,lineages:"few",enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true},
  ageModel:"life/1",ecologyRevision:"observation/4.1",producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1"};
function world(balance=true){
  const w=E.create(base);if(balance)w.config.balanceModel="survival/1";
  w.tiles=w.tiles.map(t=>({...t,env:3,terrain:"plain",light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
  for(const key of ["organisms","resources","carcasses","pending","messages","primaryInocula","hyperInocula","searchQ"])w[key]=[];
  w.turn=1;w.config.hyperParasiteSettings.exclusionRate=0;w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};return w;
}
function adult(w,cell=S.index(w,3,3),energy=.07){const q=S.HyperParasite.create(w,null,0,"adult");Object.assign(q,{phase:4,age:20,bornAt:-19,B:.03,E:energy,cell});Object.assign(q.hyper,{state:"adult",settledAt:-1});w.searchQ.push(q);return q;}
function host(w,species="solar",cell=S.index(w,3,3)){
  const o=S.organism(w,S.D.byId[species],cell,"host",{age:30,E:20,HP:100,dna:Object.fromEntries(S.DNA.map(k=>[k,.5]))});w.organisms.push(o);return o;
}
function primary(w,h,energy=.12){const p=S.infection(w,"leafparasite",h.id,0,"primary");Object.assign(p,{stage:"terminal",counter:8,phase:3,age:20,bornAt:-19,B:.04,E:energy,matureAt:0});Object.assign(p.primary,{settledAt:-1,pauseUntil:-1,successT:20});h.infection=p;return p;}
function context(w){const n=S.totals(w);w.ledger={initialE:n.E,initialM:n.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
const valid=w=>assert.deepEqual(E.invariants(w),[]);
function resource(w,cell,kind="seed",energy=1){const a={id:"resource:"+cell+":"+kind,cell,kind,E:energy,M:0,G:0,q:1,expires:100};w.resources.push(a);return a;}

test("hungry autonomous Q approaches sensed finite food, consumes it next turn, and stays while it remains useful",()=>{
  const w=world(),q=adult(w),cell=S.index(w,4,3),food=resource(w,cell);let ctx=context(w);
  E.P.hyperSearch(w,ctx);assert.equal(q.cell,cell);assert.equal(q.hyper.last.feedingE,0);assert.equal(q.hyper.last.movementE,.002);valid(w);
  w.turn++;ctx=context(w);const before=food.E;E.P.hyperSearch(w,ctx);
  assert.equal(q.cell,cell);assert.equal(q.hyper.last.movementE,0);assert.equal(q.hyper.last.feedingE,.05);assert.equal(food.E,S.round(before-.1));valid(w);
});

test("Q avoids true predators without treating mineral-only non-hunters as predators",()=>{
  const choices={};
  for(const species of ["crystal","whale"]){
    const w=world(),q=adult(w),h=host(w,species,S.index(w,5,3));resource(w,h.cell);const ctx=context(w);E.P.hyperSearch(w,ctx);valid(w);
    choices[species]={cell:q.cell,distance:S.distance(w,q.cell,h.cell)};
  }
  assert.equal(S.D.diets[S.D.byId.crystal.diet].hunt<0,true);
  assert.equal(choices.crystal.distance,1);assert(choices.whale.distance>=2);
});

test("nutrition search excludes information and unseen distant stocks, and does not waste movement with no local opportunity",()=>{
  const w=world(),q=adult(w),start=q.cell;resource(w,S.index(w,4,3),"info",100);resource(w,S.index(w,7,3));
  const ctx=context(w);E.P.hyperSearch(w,ctx);assert.equal(q.cell,start);assert.equal(q.hyper.last.feedingE,0);assert.equal(q.hyper.last.movementE,0);assert.equal(q.E,.05);valid(w);
});

test("P optional induction preserves finite next-turn maintenance and release budget",()=>{
  const results={};
  for(const enabled of [false,true]){const w=world(enabled),h=host(w),p=primary(w,h),ctx=context(w);E.P.begin(w,ctx);valid(w);results[enabled]={E:p.E,meta:p.primary.last.metaE,induction:p.primary.last.induction};}
  assert.equal(results.false.meta,.02);assert.equal(results.true.meta,0);assert.equal(results.true.induction,0);assert.equal(S.round(results.true.E-results.false.E),.02);
});

test("Q optional manipulation and information investment cannot consume the paid emergence reserve",()=>{
  const results={};
  for(const enabled of [false,true]){
    const w=world(enabled),h=host(w),p=primary(w,h,1),q=S.HyperParasite.create(w,p.id,0,"prepared");
    Object.assign(q,{phase:3,age:12,bornAt:-11,B:.02,E:.10});Object.assign(q.hyper,{experience:12,development:11,state:"larva",settledAt:-1,pauseUntil:-1});p.q=q;
    const ctx=context(w);E.P.hyperBegin(w,ctx);valid(w);results[enabled]={E:q.E,meta:q.hyper.last.metaE,info:q.hyper.last.informationE,development:q.hyper.last.developmentE};
  }
  assert.equal(results.false.meta,.004);assert.equal(results.false.info,.008);assert.equal(results.true.meta,0);assert.equal(results.true.info,0);assert(results.true.E>=.1);assert.equal(results.true.development,.015);
});

test("unversioned worlds preserve the exact prior parasite execution and random outcomes",()=>{
  const original={...E.P},legacyModule={exports:{}},before=fs.readFileSync(path.join(__dirname,"../operations/evidence/i11-survival-performance-v1/parasites/before-parasites.js"),"utf8");
  new Function("require","module",before)(name=>{assert.equal(name,"./state.js");return S;},legacyModule);
  const config={...base,width:16,height:12,initial:24,lineages:"manual",selected:["solar","recursive","whale"],enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
  const run=api=>{Object.assign(E.P,api);let w=E.create(config);const frames=[JSON.stringify(w)];for(let t=0;t<8;t++){w=E.step(w);valid(w);frames.push(JSON.stringify(w));}return frames;};
  try{assert.deepEqual(run(legacyModule.exports),run(original));}finally{Object.assign(E.P,original);}
});
