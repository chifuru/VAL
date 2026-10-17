"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const E=require("../src/ecology/engine.js"),M=require("../src/ecology/map-templates.js"),
  Data=require("../src/ecology/map-data.js"),H=require("../src/ecology/hash.js");
const config=(extra={})=>({landscape:"templates",mapId:"river",terrainSeed:"terrain-only",seed:"biology-a",
  width:40,height:28,initial:16,lineages:"manual",selected:["jelly","solar"],...extra});
test("six authored maps support declared sizes and preserve traversable land/water routes",()=>{
  assert.equal(M.list().length,6);
  for(const map of Data.maps)for(const def of Object.values(map.sizes)){
    const c=config({mapId:map.id,width:def.width,height:def.height});
    const w={config:c,tiles:M.resolve(c,E.S.D,H).tiles};
    for(const route of def.routes)for(let i=1;i<route.cells.length;i++){
      assert(E.S.oneStep(w,route.cells[i-1],route.cells[i]));
      assert(!w.tiles[route.cells[i]].blocked);
      if(route.kind==='water')assert(['shallow','deep'].includes(w.tiles[route.cells[i]].terrain));
      else assert.notEqual(w.tiles[route.cells[i]].terrain,'deep');
    }
    assert.equal(w.tiles.length,def.width*def.height);
    const populated=E.create({...c,lineages:'all',initial:{40:80,80:320,160:1280}[def.width]});
    assert.equal(populated.stats.main,populated.config.initial);
    assert.deepEqual(E.invariants(populated),[]);
  }
});
test("ecology seed never changes terrain; terrain variation is limited to authored candidate cells",()=>{
  const a=E.create(config()),b=E.create(config({seed:"biology-b"}));
  const terrain=tiles=>tiles.map(({soilM,...fixed})=>fixed);
  assert.deepEqual(terrain(a.tiles),terrain(b.tiles));assert.deepEqual(a.config.mapResolved,b.config.mapResolved);
  assert.notDeepEqual(a.organisms,b.organisms);
  const def=Data.maps.find(m=>m.id==='river').sizes['40x28'];
  const candidates=new Set(def.candidates.flatMap(g=>g.cells));let differences=0;
  const c=M.resolve(config({terrainSeed:"other-terrain"}),E.S.D,H);
  const fixedA=terrain(a.tiles),fixedC=terrain(c.tiles);
  for(let i=0;i<a.tiles.length;i++)if(H.stable(fixedA[i])!==H.stable(fixedC[i])){
    assert(candidates.has(i));assert.equal(a.tiles[i].env,c.tiles[i].env);
    assert.equal(a.tiles[i].terrain,c.tiles[i].terrain);differences++;
  }
  assert(differences>0);
});
test("map identity survives deterministic replay and refuses altered/missing versions or dimensions",()=>{
  let w=E.create(config({mapId:'auto'}));const saved=structuredClone(w.config);
  for(let i=0;i<15;i++){w=E.step(w);assert.deepEqual(E.invariants(w),[]);}
  let replay=E.create(saved);for(let i=0;i<15;i++)replay=E.step(replay);
  assert.equal(E.fingerprint(w),E.fingerprint(replay));
  for(const field of ['setVersion','id','version','dataHash','terrainHash','pattern']){
    const bad=structuredClone(saved);bad.mapResolved[field]=field==='pattern'?[99]:'wrong';
    assert.throws(()=>E.create(bad),/MAP_INVALID/);
  }
  assert.throws(()=>E.create(config({width:41})),/対応しない/);
  assert.throws(()=>E.create(config({mapId:'missing'})),/SETTINGS_INVALID/);
});
test("an invalid candidate combination uses declared safe base, while an invalid base stops",()=>{
  const data=structuredClone(Data),def=data.maps[0].sizes['40x28'];
  const p=def.routes.find(r=>r.kind==='land').cells[3];
  def.candidates=[{cells:[p],patterns:[['boulder']]}];
  const r=M.resolve(config(),E.S.D,H,data);assert.equal(r.metadata.fallback,true);
  assert.equal(r.tiles[p].blocked,false);assert.deepEqual(r.metadata.pattern,[]);
  // Replace all base cells with boulders: there is no legal fallback.
  def.runs=def.runs.map(([n,e,t])=>[n,e,t,'boulder']);
  assert.throws(()=>M.resolve(config(),E.S.D,H,data),/既定配置/);
});
