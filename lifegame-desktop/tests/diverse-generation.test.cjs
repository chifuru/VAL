"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const Factory=require("../design/advantage-switches/model.cjs");
const E=Factory.model({producer:false,waterbug:false,hyperparasite:false}),S=E.S,G=S.WorldGeneration;
const base={seed:"diverse-generation-contract",terrainSeed:"diverse-terrain-contract",width:40,height:28,initial:80,
  lineages:"manual",selected:["solar","myth","whale","crystal","swarm"],landscape:"templates",mapId:"auto",ageModel:"life/1",ecologyRevision:"observation/4.1",
  producerModel:"colony/1",largePlantModel:"independent/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1",informationModel:"persistent/1",generationModel:"diverse/1"};
const create=(profile="standard",extra={})=>E.create({...base,...extra,generationSettings:{profile,...extra.generationSettings}});
const clone=o=>structuredClone(o),canonical=o=>S.stable(o);
const get=(o,p)=>p.split('.').reduce((a,k)=>a[k],o);

test("six correlated profiles apply only their declared comparison multipliers",()=>{
  assert.deepEqual(G.profiles.map(p=>p.id),["standard","high-production","resource-localized","water-focused","land-focused","information-strong"]);
  for(const profile of G.profiles){
    const w=create(profile.id),r=w.config.generationResolved,c=w.config;
    assert.equal(r.profile,profile.id);assert.equal(r.coefficientsVersion,"implementation-start/2.6");
    assert.equal(c.initial,profile.id==="high-production"?96:80);
    assert.equal(c.producerSettings.land.capacityB,["high-production","resource-localized"].includes(profile.id)?30:profile.id==="land-focused"?25:20);
    assert.equal(c.producerSettings.water.capacityB,["high-production","resource-localized"].includes(profile.id)?30:profile.id==="water-focused"?25:20);
    assert.equal(c.producerSettings.land.regrowthB,profile.id==="high-production"?2.5:2);
    assert.equal(c.producerSettings.land.occupancy,profile.id==="resource-localized"?.12:.20);
    assert.equal(c.initialConditions.distribution,profile.id==="resource-localized"?"cluster":"habitat");
    assert.equal(c.informationSettings.influence,profile.id==="information-strong"?1.25:1);
    if(profile.id==="water-focused")assert(r.actual.terrain.waterFraction>=.35);
    if(profile.id==="land-focused")assert(r.actual.terrain.landFraction>=.70);
    assert(r.candidates.length>=1&&r.candidates.length<=8);
    assert.equal(r.candidates.at(-1).checks.futureTurns,0);assert.equal(r.actual.placements.length,Object.values(r.actual.bySpecies).reduce((a,b)=>a+b,0));
    assert.equal(G.validateResolved(c),r);
  }
});

test("individual locks preserve the input base while unrelated automatic values change",()=>{
  const w=create("high-production",{producerSettings:{land:{capacityB:30},water:{capacityB:20,regrowthB:1}},generationSettings:{locks:["initial","producerSettings.land.capacityB","producerSettings.water.regrowthB"]}}),r=w.config.generationResolved;
  assert.equal(w.config.initial,80);assert.equal(w.config.producerSettings.land.capacityB,30);assert.equal(w.config.producerSettings.land.regrowthB,2.5);
  assert.equal(w.config.producerSettings.water.capacityB,30);assert.equal(w.config.producerSettings.water.regrowthB,1);
  for(const p of r.locks)if(Object.hasOwn(r.base,p))assert.deepEqual(r.effective[p],r.base[p]);
  assert.equal(r.base["producerSettings.water.capacityB"],20);assert.equal(r.effective["producerSettings.water.capacityB"],30);
});

test("manual mode leaves all numerical conditions unchanged and still resolves map auto",()=>{
  const w=create("high-production",{generationSettings:{mode:"manual"}}),r=w.config.generationResolved;
  assert.equal(r.profile,"standard");assert.equal(w.config.initial,80);assert.equal(w.config.producerSettings.land.capacityB,20);
  assert(!r.locks.includes("mapId"));assert(r.actual.terrain.map.id);assert.equal(E.fingerprint(w),E.fingerprint(E.create(w.config)));
});

test("explicit zero, disabled groups, no artificial supply and founder counts are always fixed",()=>{
  const w=create("information-strong",{informationSettings:{influence:0},producerSupport:{enabled:false},enabled:{main:true,plant:true,fungus:false,prey:false,P:false,Q:false},
    founderCounts:{version:1,species:{grass:0,moss:2},parasites:{leafparasite:0,tideparasite:0,hyperparasite:0}},
    producerSettings:{land:{occupancy:0},water:{occupancy:0}}}),r=w.config.generationResolved;
  assert.equal(w.config.informationSettings.influence,0);assert(r.locks.includes("informationSettings.influence"));
  assert.equal(w.config.producerSettings.land.occupancy,0);assert(r.locks.includes("producerSettings.land.occupancy"));
  assert.equal(w.config.producerSupport.enabled,false);assert.equal(w.config.enabled.prey,false);assert.equal(w.config.enabled.P,false);assert.equal(w.config.enabled.Q,false);
  assert.equal(w.organisms.filter(o=>o.species==="grass").length,0);assert.equal(w.organisms.filter(o=>o.species==="moss").length,2);assert.equal(r.actual.bySpecies.leafparasite??0,0);
  assert(!w.resources.some(a=>a.kind==="info"));assert.equal(w.informationField.length,0);
});

test("preset promises stay fixed and conflicting disabled groups are reported rather than enabled",()=>{
  const w=create("high-production",{observationMode:"river-settlement"}),r=w.config.generationResolved,p=S.observationPreset("river-settlement",40,28);
  for(const k of ["initial","mapId","selected","lineages","placement","distribution","enabled","solarScale","initialFoodScale"])assert.deepEqual(w.config[k],p[k]);
  assert(r.locks.includes("initial"));assert(r.locks.includes("mapId"));assert.equal(w.config.producerSettings.land.capacityB,30);
  assert.throws(()=>create("standard",{observationMode:"river-settlement",enabled:{prey:false}}),/固定観察モード/);
});

test("a preset rejects explicitly locked contradictory initial counts without overwriting the request",()=>{
  for(const settings of [{locks:["initial"]},{mode:"manual"}]){
    const input={...base,observationMode:"river-settlement",initial:200,generationSettings:{profile:"standard",...settings}},before=canonical(input);
    assert.throws(()=>E.create(input),/GENERATION_INVALID:.*固定項目.*initial/);assert.equal(canonical(input),before);
  }
  const unlocked=create("standard",{observationMode:"river-settlement",initial:200});assert.equal(unlocked.config.initial,160);
  const unspecified={...base,observationMode:"river-settlement",generationSettings:{mode:"manual"}};delete unspecified.initial;
  const w=E.create(unspecified);assert.equal(w.config.initial,160);
});

test("a preset rejects an explicitly fixed contradictory map while unspecified map choices resolve normally",()=>{
  for(const settings of [{locks:["mapId"]},{mode:"manual"}]){
    const input={...base,observationMode:"river-settlement",initial:160,mapId:"lake",generationSettings:{profile:"standard",...settings}},before=canonical(input);
    assert.throws(()=>E.create(input),/GENERATION_INVALID:.*固定項目.*mapId/);assert.equal(canonical(input),before);
  }
  const unspecified={...base,observationMode:"river-settlement",initial:160,generationSettings:{mode:"manual"}};delete unspecified.mapId;
  const w=E.create(unspecified);assert.equal(w.config.mapId,"river");
});

test("a fixed terrain is not replaced and incompatible terrain profiles fail explicitly",()=>{
  const w=create("land-focused",{mapId:"ridge"});assert.equal(w.config.mapId,"ridge");assert(w.config.generationResolved.locks.includes("mapId"));
  assert.throws(()=>create("water-focused",{mapId:"ridge"}),/固定地形/);
  const water=create("water-focused",{mapId:"wetland"});assert.equal(water.config.mapId,"wetland");
  assert.throws(()=>create("standard",{generationSettings:{locks:["mapId"]}}),/地形おまかせは固定できません/);
});

test("identical requests reproduce profile, finite candidates and all initial placements",()=>{
  const first=create("auto"),second=create("auto");assert.equal(canonical(first.config),canonical(second.config));assert.equal(E.fingerprint(first),E.fingerprint(second));
  const r=first.config.generationResolved;assert.equal(r.actual.hash,second.config.generationResolved.actual.hash);
  assert.equal(first.turn,0);assert.equal(r.candidates.filter(c=>c.accepted).length,1);assert.equal(r.selectedAttempt,r.candidates.length-1);
});

test("resolved replay uses saved effective values once instead of multiplying a second time",()=>{
  const w=create("high-production"),replay=E.create(JSON.parse(JSON.stringify(w.config)));
  assert.equal(replay.config.producerSettings.land.capacityB,30);assert.equal(replay.config.initial,96);
  assert.equal(canonical(w.config),canonical(replay.config));assert.equal(E.fingerprint(w),E.fingerprint(replay));
});

test("resolved data rejects missing versions, changed effective conditions and altered placement provenance",()=>{
  const w=create("high-production");
  for(const edit of [c=>delete c.generationResolved.version,c=>c.generationResolved.coefficientsVersion="future",c=>c.initial+=4,c=>c.generationSettings.profile="standard",
    c=>c.generationResolved.actual.placements[0].cell++,c=>c.generationResolved.candidates[0].accepted=false,c=>c.generationResolved.base.initial=NaN]){
    const c=clone(w.config);edit(c);assert.throws(()=>G.validateResolved(c),/GENERATION_INVALID/);assert.throws(()=>E.create(c),/GENERATION_INVALID/);
  }
});

test("an unsatisfied explicit species count is not substituted and terminates at eight static candidates",()=>{
  const request={...base,founderCounts:{version:1,species:{grass:17920},parasites:{}},generationSettings:{profile:"standard"}},before=canonical(request);
  let error;try{E.create(request);}catch(e){error=e;}
  assert(error);assert.match(error.message,/GENERATION_FAILED/);assert.equal(error.generationCandidates.length,8);
  assert(error.generationCandidates.every(a=>!a.accepted&&a.reasons.some(s=>s.startsWith("PLACEMENT_SHORTAGE:"))));
  assert.equal(canonical(request),before);
});

test("P/Q automatic shortages remain real shortages and no host or mature window is manufactured",()=>{
  const w=create("standard",{enabled:{main:true,plant:false,fungus:true,prey:false,P:true,Q:true},selected:["myth"],initial:8}),r=w.config.generationResolved;
  assert.equal(r.actual.bySpecies.leafparasite??0,0);assert.equal(r.actual.bySpecies.tideparasite??0,0);assert.equal(r.actual.bySpecies.hyperparasite??0,0);
  assert.equal(w.organisms.length,w.organisms.filter(o=>o.species==="myth"||o.species==="fungus").length);
  assert.equal(r.candidates.at(-1).checks.hosts.leafparasite.first,0);assert.equal(r.candidates.at(-1).checks.hosts.tideparasite.currentQWindows,0);
  assert.throws(()=>create("standard",{mapId:"ridge",enabled:{main:true,plant:false,fungus:true,prey:false,P:true,Q:true},selected:["myth"],initial:8,founderCounts:{version:1,species:{},parasites:{leafparasite:1}}}),/PLACEMENT_SHORTAGE/);
});

test("natural main founders are connected four-body cohorts without duplicate occupancy",()=>{
  const w=create("standard"),bySpecies=new Map();for(const o of w.organisms.filter(o=>o.slot==="main")){if(!bySpecies.has(o.species))bySpecies.set(o.species,[]);bySpecies.get(o.species).push(o);}
  const taken=new Set();for(const list of bySpecies.values())for(let i=0;i<list.length;i+=4){const group=list.slice(i,i+4),visited=new Set([group[0].cell]);
    assert.equal(group.length,4);for(let pass=0;pass<4;pass++)for(const a of group)if(!visited.has(a.cell)&&[...visited].some(p=>S.oneStep(w,p,a.cell)))visited.add(a.cell);
    assert.equal(visited.size,4);for(const o of group){assert(!taken.has(o.cell));taken.add(o.cell);}
  }
});

test("invalid generator inputs are rejected and ungated worlds acquire no new settings",()=>{
  for(const c of [{generationModel:"future"},{generationSettings:{}},{generationResolved:{}},{generationModel:"diverse/1",generationSettings:{version:"future"}},
    {generationModel:"diverse/1",generationSettings:{profile:"future"}},{generationModel:"diverse/1",generationSettings:{locks:["producerSupport.enabled"]}}])assert.throws(()=>E.create({...base,...c,generationModel:Object.hasOwn(c,"generationModel")?c.generationModel:undefined}),/GENERATION_INVALID/);
  const input={...base};delete input.generationModel;const w=E.create(input);assert.equal(w.config.generationModel,undefined);assert.equal(w.config.generationSettings,undefined);assert.equal(w.config.generationResolved,undefined);
  assert.equal(G.normalize().version,"diverse-generation-parameters/1");assert(G.paths.includes("informationSettings.influence"));
});
