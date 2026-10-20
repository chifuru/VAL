"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto"),F=require("../design/advantage-switches/model.cjs");
const flags={producer:false,waterbug:false,hyperparasite:false},E=F.model(flags),S=E.S,
  golden=require("../operations/evidence/i11c-local-survival-v1/parasites/legacy-digests.json"),
  base={seed:"i11c/local-q-boundaries",width:8,height:8,initial:0,lineages:"few",enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:true},ageModel:"life/1",ecologyRevision:"observation/4.1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1"};
function fixture(model="survival/3",energy=1){
  const w=E.create({...base,balanceModel:model});
  w.tiles=w.tiles.map(t=>({...t,terrain:"plain",env:3,light:1,soilM:5,cover:"none",blocked:false,walls:[]}));
  for(const k of ["organisms","resources","carcasses","pending","messages","primaryInocula","hyperInocula","searchQ"])w[k]=[];
  const q=S.HyperParasite.create(w,null,0,"adult");Object.assign(q,{phase:4,age:20,bornAt:-19,B:.03,E:energy,cell:S.index(w,3,3)});Object.assign(q.hyper,{state:"adult",settledAt:-1});w.searchQ=[q];w.turn=1;
  w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:true,Q:true};return {w,q};
}
function host(w,species,cell,id=species){const h=S.organism(w,S.D.byId[species],cell,id,{age:50,E:20,HP:100,dna:Object.fromEntries(S.DNA.map(k=>[k,.5]))});w.organisms.push(h);return h;}
function infect(w,h,species,matureAt=0){const p=S.infection(w,species,h.id,0,"p:"+h.id);Object.assign(p,{stage:"terminal",counter:8,phase:3,age:20,bornAt:-19,B:.04,E:.2,matureAt});Object.assign(p.primary,{settledAt:-1,pauseUntil:-1,successT:20});h.infection=p;return p;}
function food(w,cell=w.searchQ[0].cell){const a={id:"finite-food",cell,kind:"seed",E:2,M:0,G:0,q:1,expires:100};w.resources.push(a);return a;}
function context(w){const n=S.totals(w);w.ledger={initialE:n.E,initialM:n.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);return E.context(w);}
const valid=w=>assert.deepEqual(E.invariants(w),[]);

test("survival3 explores locally with no cue using finite paid movement while survival2 retains stop",()=>{
  for(const model of ["survival/2","survival/3"]){const {w,q}=fixture(model),start=q.cell;E.P.hyperSearch(w,context(w));valid(w);
    assert.equal(q.hyper.last.feedingE,0);assert.equal(q.hyper.last.movementE,model==="survival/3"?.002:0);assert.equal(q.E,model==="survival/3"?.978:.98);
    assert.equal(S.distance(w,start,q.cell),model==="survival/3"?1:0);
  }
});
test("survival3 leaves an unproductive same-cell host instead of treating contact as a permanent goal",()=>{
  for(const model of ["survival/2","survival/3"]){const {w,q}=fixture(model),h=host(w,"jelly",q.cell);E.P.hyperSearch(w,context(w));valid(w);assert.equal(S.distance(w,q.cell,h.cell),model==="survival/3"?1:0);assert.equal(w.hyperInocula.length,0);}
});
test("a visible external infestation outranks an uninfested body without granting exact compatibility knowledge",()=>{
  for(const model of ["survival/2","survival/3"]){const {w,q}=fixture(model);host(w,"jelly",S.index(w,1,3),"uninfested");const h=host(w,"ryouki",S.index(w,5,3),"visible-external");infect(w,h,"leafparasite");q.hyper.preference.leafparasite=.1;
    E.P.hyperSearch(w,context(w));valid(w);assert.equal(S.xy(w,q.cell)[0],model==="survival/3"?4:2);assert.equal(w.hyperInocula.length,0);
  }
});
test("internal P and its exact maturation clock cannot steer autonomous Q movement",()=>{
  const results=[];for(const matureAt of [0,18]){const {w,q}=fixture();w.turn=20;const h=host(w,"jelly",S.index(w,5,3));infect(w,h,"tideparasite",matureAt);const ctx=context(w);E.P.hyperSearch(w,ctx);valid(w);results.push({cell:q.cell,E:q.E,flow:ctx.hyperFlow});}assert.deepEqual(results[0],results[1]);
});
test("hungry Q retains real local feeding over exploration and consumes only finite food",()=>{
  const {w,q}=fixture("survival/3",.07),a=food(w),start=q.cell;E.P.hyperSearch(w,context(w));valid(w);assert.equal(q.cell,start);assert.equal(q.hyper.last.movementE,0);assert.equal(q.hyper.last.feedingE,.05);assert.equal(q.E,.1);assert.equal(a.E,1.9);
});
test("depleted or immobilized Q is not forced to move or given food energy",()=>{
  for(const energy of [.03,0]){const {w,q}=fixture("survival/3",energy),start=q.cell;E.P.hyperSearch(w,context(w));valid(w);assert.equal(q.cell,start);assert.equal(q.hyper.last.movementE,0);assert.equal(q.E,energy===0?0:.01);}
  const {w,q}=fixture(),start=q.cell;for(const cell of S.nearby(w,start))w.tiles[cell].blocked=true;E.P.hyperSearch(w,context(w));valid(w);assert.equal(q.cell,start);assert.equal(q.E,.98);
});
test("local exploration is deterministic without new memory or private host knowledge",()=>{
  const {w}=fixture(),a=structuredClone(w),b=structuredClone(w);E.P.hyperSearch(a,context(a));E.P.hyperSearch(b,context(b));valid(a);valid(b);assert.deepEqual(a,b);assert.equal(Object.hasOwn(a.searchQ[0].hyper,"recentHosts"),false);
});
test("survival3 preserves the one-use three-turn infection window and paid finite egg cost",()=>{
  for(const turn of [1,4]){const {w,q}=fixture();const h=host(w,"jelly",q.cell),p=infect(w,h,"tideparasite");w.turn=turn;const c=context(w),before=q.E,r=E.P.hyperExpose(w,c,q,h);valid(w);assert.equal(p.matureAt,0);assert.equal(p.q,null);if(turn===4){assert.equal(r.reason,"window");assert.equal(q.E,before);assert.equal(w.hyperInocula.length,0);}else{assert.equal(q.E,.9);assert.equal(c.hyperFlow.bySpecies.hyperparasite.invasionAttempts,1);if(r.invaded)assert.equal(w.hyperInocula[0].E,.09);}}
});
test("survival2 survival1 and unversioned full worlds keep all baseline48876e7 states and RNG through8T",()=>{
  for(const model of [undefined,"survival/1","survival/2"]){let w=E.create({...golden.config,...(model?{balanceModel:model}:{})});const expected=golden.frames[model||"unversioned"];for(let t=0;t<=8;t++){if(t)w=E.step(w);valid(w);assert.equal(crypto.createHash("sha256").update(JSON.stringify(w)).digest("hex"),expected[t],(model||"unversioned")+" T"+t);}}
});
