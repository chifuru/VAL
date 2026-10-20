"use strict";
const {test}=require("node:test"), assert=require("node:assert/strict");
const E=require("../design/advantage-switches/model.cjs").model(), S=E.S;
const dna=()=>Object.fromEntries(S.DNA.map(k=>[k,.5]));
function world(balance=true){
  const w=E.create({seed:"i11/paid-sparse-births",width:8,height:8,initial:0,ageModel:"life/1",ecologyRevision:"observation/4.1",balanceModel:balance?"survival/1":undefined,
    enabled:{main:false,plant:false,fungus:false,prey:false,P:true,Q:false}});
  w.tiles=w.tiles.map(t=>({...t,env:3,terrain:"plain",light:0,soilM:5,cover:"none",blocked:false,walls:[]}));
  for(const key of ["organisms","resources","carcasses","pending","messages"])w[key]=[];
  w.config.enabled={main:true,plant:false,fungus:false,prey:true,P:false,Q:false};w.turn=1;w.colonyMating={matings:1,storedBirths:0};return w;
}
function add(w,species,id,x,y,extra={}){const o=S.organism(w,S.D.byId[species],S.index(w,x,y),id,{dna:dna(),phase:3,age:40,E:90,M:12,HP:100,...extra});w.organisms.push(o);return o;}
function ready(w){const n=S.totals(w);w.ledger={initialE:n.E,initialM:n.M,solar:0,sinks:0,Mloss:0};w.stats=E.summarize(w);const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:"stop",cell:o.cell,cost:0,path:[]});return c;}
function cluster(w,count=4){const a=add(w,"crystal","mother",2,2,{sex:"female"}), b=add(w,"crystal","father",3,2,{sex:"male"});for(let n=2;n<count;n++){const [x,y]=[[4,2],[4,3],[4,4]][n-2];add(w,"myth","peer"+n,x,y,{sex:"male"});}return [a,b];}
const at=(w,c,kind=0)=>E.R.candidates(w,c).filter(a=>a.cell===S.index(w,3,3)&&a.kind===kind);
test("sparse main births admit four or five neighbors while retaining two real adjacent parents",()=>{
  for(const count of [4,5])for(const enabled of [false,true]){const w=world(enabled);cluster(w,count);const c=ready(w),found=at(w,c);assert.equal(found.length,enabled?1:0);if(enabled)assert.deepEqual(found[0].parents.map(p=>p.id),["mother","father"]);}
  const w=world();add(w,"crystal","alone",2,2,{sex:"female"});assert.equal(E.R.reproduce(w,ready(w)).length,0);
});
test("the sparse-neighbor relaxation stops at twenty percent density and six local neighbors",()=>{
  const dense=world();cluster(dense,4);for(let y=0;y<8&&dense.organisms.length<14;y++)for(let x=0;x<8&&dense.organisms.length<14;x++)if(S.distance(dense,S.index(dense,x,y),S.index(dense,3,3))>2)add(dense,"myth","outside"+x+":"+y,x,y,{sex:"male"});assert.equal(at(dense,ready(dense)).length,0);
  const local=world();cluster(local,5);add(local,"myth","sixth",2,4,{sex:"male"});assert.equal(at(local,ready(local)).length,0);
});
test("main births retain real energy and mineral payment, juvenile exclusion, and impassable contact",()=>{
  const w=world(),[mother,father]=cluster(w,4),c=ready(w),before=S.totals(w),candidate=at(w,c)[0],child=E.R.child(w,candidate,c);w.organisms.push(child);
  assert.equal(mother.E,70);assert.equal(father.E,70);assert.equal(mother.M,10);assert.equal(father.M,10);assert.equal(child.phase,1);assert.equal(child.age,0);assert.deepEqual(S.totals(w),before);assert.deepEqual(E.invariants(w),[]);
  for(const change of [o=>o.E=0,o=>o.M=0,o=>{o.age=0;S.initializeAge(w,o);},o=>o.birthReady=100]){const v=world(),[a]=cluster(v,4);change(a);assert.equal(at(v,ready(v)).length,0);}
  const blocked=world(),[a,b]=cluster(blocked,4);blocked.tiles[a.cell].walls.push(b.cell);blocked.tiles[b.cell].walls.push(a.cell);assert.equal(at(blocked,ready(blocked)).length,0);
});
test("a sparse isolated queen uses previously paid stored paternity and cannot conjure sperm or resources",()=>{
  for(const enabled of [false,true]){const w=world(enabled),q=add(w,"swarm","queen",2,2,{sex:"female",role:"queen"});q.sperm={uses:2,father:{id:"absent-father",dna:dna(),birthWeights:q.birthWeights.slice(),generation:0}};const c=ready(w),found=at(w,c,3);assert.equal(found.length,enabled?1:0);if(enabled){const before=S.totals(w),child=E.R.child(w,found[0],c);w.organisms.push(child);assert.equal(q.sperm.uses,1);assert.deepEqual(child.parents,["queen","absent-father"]);assert.equal(q.E,50);assert.equal(q.M,8);assert.deepEqual(S.totals(w),before);assert.deepEqual(E.invariants(w),[]);}}
  for(const extra of [{},{E:39},{M:3}]){const w=world(),q=add(w,"swarm","queen",2,2,{sex:"female",role:"queen",...extra});if(Object.keys(extra).length)q.sperm={uses:2,father:{id:"absent-father",dna:dna(),birthWeights:q.birthWeights.slice(),generation:0}};assert.equal(at(w,ready(w),3).length,0);}
});
test("one mature terrestrial primary consumer can pay eight energy from ten without free replenishment",()=>{
  for(const enabled of [false,true]){const w=world(enabled),o=add(w,"grassbug","parent",2,2,{phase:2,age:6,E:10,M:0,HP:6}),c=ready(w),before=S.totals(w),children=E.R.reproduce(w,c);assert.equal(children.length,enabled?1:0);if(enabled){assert.equal(o.E,2);assert.deepEqual(children[0].parents,["parent"]);assert.equal(children[0].E,6);assert.equal(children[0].B,2);assert.equal(children[0].phase,1);assert.deepEqual(S.totals(w),before);assert.deepEqual(E.invariants(w),[]);}}
  for(const extra of [{E:9.999},{age:0,phase:1},{birthReady:20}]){const w=world();add(w,"grassbug","parent",2,2,{phase:2,age:6,E:10,M:0,HP:6,...extra});assert.equal(E.R.reproduce(w,ready(w)).length,0);}
  const empty=world();assert.equal(E.R.reproduce(empty,ready(empty)).length,0);
});
test("birth pressure stays finite, resource dependent and suppresses dense growth",()=>{
  const w=world();w.config.populationRegulation={version:1};const [o]=cluster(w,2);let c=ready(w),sparse=E.R.birthPressure(w,o,c);assert.equal(sparse.chance,1);
  for(const cell of S.nearby(w,o.cell,2,true)){if(!S.maps(w).main.has(cell)){const [x,y]=[cell%8,Math.floor(cell/8)];add(w,"myth","crowd"+cell,x,y,{sex:"male"});}}
  c=ready(w);const dense=E.R.birthPressure(w,o,c);assert(dense.chance>0&&dense.chance<sparse.chance);o.E=0;c=ready(w);const hungry=E.R.birthPressure(w,o,c);assert(hungry.chance<dense.chance);assert(hungry.chance>0);
});
test("unversioned worlds preserve the prior reproduction execution, complete states and random outcomes",()=>{
  const fs=require("node:fs"),path=require("node:path"),B=require("../src/ecology/engine.js"),original={...B.R},legacy={exports:{}};
  new Function("require","module",fs.readFileSync(path.join(__dirname,"../operations/evidence/i11-survival-performance-v1/breeding/before-reproduction.js"),"utf8"))(name=>{assert.equal(name,"./state.js");return B.S;},legacy);
  const groups=[["river",["solar","myth","crystal","swarm"]],["lake",["abyss","jelly","kelp","whale"]],["woodland",["recursive","serpent","antimeme","precocial"]]];
  function run(api,mapId,selected){Object.assign(B.R,api);let w=B.create({seed:"i11/legacy/breeding/"+mapId,terrainSeed:"i11/legacy/map/"+mapId,width:40,height:28,initial:64,landscape:"templates",mapId,lineages:"manual",selected,
    ageModel:"life/1",ecologyRevision:"observation/4.1",randomModel:"table/1",populationRegulation:{version:1},producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1",informationModel:"persistent/1",relationshipModel:"network/1",enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}});
    const frames=[JSON.stringify(w)];for(let t=0;t<8;t++){w=B.step(w);assert.deepEqual(B.invariants(w),[]);frames.push(JSON.stringify(w));}return frames;}
  try{for(const [mapId,selected]of groups)assert.deepEqual(run(legacy.exports,mapId,selected),run(original,mapId,selected));}finally{Object.assign(B.R,original);}
});
