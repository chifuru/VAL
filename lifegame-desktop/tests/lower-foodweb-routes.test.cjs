"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),factory=require("../operations/evidence/i11b-foodweb-routes-v1/lower/source-model.cjs"),E=factory.model(),S=E.S;
function world(version="survival/2"){const w=E.create({seed:"i11b/lower/fixture",width:8,height:8,initial:0,ageModel:"life/1",ecologyRevision:"observation/4.1",balanceModel:version==="unversioned"?undefined:version,enabled:{main:false,plant:false,fungus:true,prey:true,P:false,Q:false}});w.tiles=w.tiles.map(t=>({...t,env:3,terrain:"plain",cover:"none",light:0,soilM:5,blocked:false,walls:[]}));for(const k of ["organisms","resources","carcasses","pending","messages","primaryInocula","hyperInocula","searchQ"])w[k]=[];w.config.enabled={main:true,plant:true,fungus:true,prey:true,P:false,Q:false};w.turn=1;return structuredClone(w);}
function add(w,species,id,x,y,extra={}){const o=S.organism(w,S.D.byId[species],S.index(w,x,y),id,{age:10,phase:2,dna:Object.fromEntries(S.DNA.map(k=>[k,.5])),...extra});w.organisms.push(o);return o;}
function ready(w){const n=S.totals(w);w.ledger={initialE:n.E,initialM:n.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});return c;}
function drop(w,o){while(w.turn%8!==S.hash(w,"drop/phase",0,o.id)%8)w.turn++;const c=ready(w),before=S.totals(w),list=E.N.investAndDrops(w,c);E.N.supply(w,c,list);assert.deepEqual(S.totals(w),before);assert.deepEqual(E.invariants(w),[]);return list;}
function encounter(version="survival/2",options={}){const w=world(version),o=add(w,"grassbug","g",3,3,{E:18,B:2,M:0,...options.grass}),h=add(w,"myth","hunter",4,3,{age:40,phase:2,E:50,HP:100,...options.hunter});if(options.food)add(w,"grass","plant",3,3,{phase:2,E:8,B:10,M:1});if(options.walls){w.tiles[o.cell].walls=[h.cell];w.tiles[h.cell].walls=[o.cell];}return {w,o,h};}
test("fungal optional release preserves paid-birth material and body reserves without creating nutrients",()=>{
  for(const extra of [{B:6,M:.2},{B:4.5,M:1}]){const w=world(),o=add(w,"fungus","f",3,3,{E:7.9,...extra});assert.equal(drop(w,o).length,0);assert.equal(o.M,extra.M);assert.equal(o.B,extra.B);}
});
test("surplus fungus still releases finite spores and pays the original costs",()=>{
  const w=world(),o=add(w,"fungus","f",3,3,{E:7.9,B:10,M:1}),list=drop(w,o);assert.equal(list.length,1);assert.equal(list[0].kind,"spore");assert.equal(o.B,8);assert.equal(o.M,.9);assert.equal(w.resources[0].E,2);assert.equal(w.resources[0].M,.1);assert.equal(o.E,7.9);
});
test("exact fungal reserve boundaries remain legal after the shared nutrient quantization",()=>{
  const w=world(),o=add(w,"fungus","f",3,3,{E:7.9,B:5,M:.3}),list=drop(w,o);assert.equal(list.length,1);assert.equal(o.B,3);assert.equal(o.M,.2);
});
test("reserve retention alone neither grants soil nutrition nor bypasses a real parent and maturity",()=>{
  const w=world(),o=add(w,"fungus","f",3,3,{phase:1,age:0,E:7.9,B:2,M:.2}),c=ready(w);assert.equal(E.N.sourceList(w,o,c,S.maps(w)).length,0);assert.equal(E.R.reproduce(w,c).length,0);assert.equal(o.M,.2);assert.equal(w.tiles[o.cell].soilM,5);
});
test("a visible funded attacker adds danger to existing choices and a legal escape still pays movement",()=>{
  for(const food of [false,true]){const {w,o,h}=encounter("survival/2",{food}),c=ready(w);E.B.choose(w,c,"move");const chosen=c.intents.get(o.id);assert.equal(chosen.type,"move");assert(S.distance(w,chosen.cell,h.cell)>c.traits.get(h.id).range);assert(S.oneStep(w,o.cell,chosen.cell));c.intents.set(h.id,{type:"stop",cell:h.cell,cost:0,path:[]});const before=o.E;E.B.move(w,c);E.N.payActions(w,c);assert.equal(o.E,S.round(before-chosen.cost));assert.equal(chosen.cost,1);assert.deepEqual(E.invariants(w),[]);}
});
test("invisible, cooldown or unfunded attackers do not trigger the added immediate danger",()=>{
  for(const options of [{hunter:{E:0}},{hunter:{attackReady:20}},{walls:true}]){const {w,o}=encounter("survival/2",options),c=ready(w);E.B.choose(w,c,"move");assert.equal(c.intents.get(o.id).type,"stop");}
});
test("danger never creates an unaffordable escape or an illegal path",()=>{
  const {w,o}=encounter("survival/2",{grass:{E:.2}}),c=ready(w);E.B.choose(w,c,"move");assert.equal(c.intents.get(o.id).type,"stop");assert(E.B.candidates(w,o,c,S.maps(w)).every(a=>a.type!=="move"));
});
test("range-two danger vacates the moving animal's origin but retains a different organism sharing it",()=>{
  function score(version,roommate){const w=world(version),o=add(w,"grassbug","g",3,3,{E:18,B:2,M:0}),h=add(w,"abyss","hunter",4,3,{phase:4,age:40,E:50,HP:100});if(roommate)add(w,"solar","staying-main",3,3,{phase:2,age:40,E:0,HP:100});const c=ready(w),m=S.maps(w),v={m,visibleCells:new Set(S.nearby(w,o.cell,1,true)),enemies:[h],nearest:h,traits:c.traits,costs:c.costs,qualityCache:new Map(),dangerCache:new Map(),neighborhoodCache:new Map()};assert.equal(c.traits.get(h.id).range,2);const candidate={type:"move",cell:S.index(w,2,3),cost:1,path:[S.index(w,2,3)],direction:6};return E.B.evaluate(w,o,candidate,c,v).score;}
  assert(score("survival/2",false)<score("survival/1",false)-.5,"the animal cannot shelter behind its own vacated cell");
  assert.equal(score("survival/2",true),score("survival/1",true),"a different organism still blocks the same ray");
});
test("survival/1 and unversioned worlds retain their former optional release and movement choices",()=>{
  for(const version of ["unversioned","survival/1"]){const w=world(version),o=add(w,"fungus","f",3,3,{E:7.9,B:6,M:.2});assert.equal(drop(w,o).length,1);assert.equal(o.M,.1);const encounter1=encounter(version),c=ready(encounter1.w);E.B.choose(encounter1.w,c,"move");assert.equal(c.intents.get(encounter1.o.id).type,"stop");}
});
