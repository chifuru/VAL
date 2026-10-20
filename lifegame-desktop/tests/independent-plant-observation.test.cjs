'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),F=require('./ecology-fixtures.cjs'),O=require('../src/ecology/observations.js');
const ids=['forestcrown','starcrown','freshwaterlight'],definition='independent-plant-observed/1';
const catalog=()=>[...F.S.D.species,...ids.map(id=>({id,name:id,group:'plant',kind:'independent',slot:'producer'}))];
function region(values={}){return {count:0,B:0,baseB:0,edibleB:0,reserveE:0,reserveM:0,activitySum:0,occupiedCells:0,eligibleCells:10,solarInputE:0,productionB:0,regrowthB:0,consumedB:0,...values};}
function colonies(turn){return {definition:'colony-observed/1',turn,land:region({count:1,B:4,baseB:2,edibleB:2,activitySum:1,occupiedCells:1}),water:region()};}
function plants(turn){return {definition,turn,land:region({count:2,B:18,baseB:4,edibleB:14,capacityB:32,reserveE:10,reserveM:2,activitySum:1.7,occupiedCells:2,solarInputE:3,productionB:2,regrowthB:1,consumedB:4}),water:region({count:1,B:8,baseB:2,edibleB:6,capacityB:16,reserveE:5,reserveM:1,activitySum:1,occupiedCells:1})};}
function fixture(){
 const w=F.world();w.turn=0;w.config.producerModel='colony/1';w.config.largePlantModel='independent/1';w.colonySummary=colonies(0);w.largePlantSummary=plants(0);
 w.organisms=[{id:'basal',species:'grass',B:4},...ids.map((species,i)=>({id:'plant-'+i,species,B:i===2?8:9}))];w.stats.counts={grass:1,...Object.fromEntries(ids.map(id=>[id,1]))};
 const c=(phase,age,sex)=>({phases:phase,ages:{[age]:1},sex:{[sex]:1},roles:{}});
 w.observation={composition:{grass:c([1,0],'nonapplicable','nonapplicable'),forestcrown:c([1,0,0,0],'juvenile','none'),starcrown:c([0,1,0,0],'adult','none'),freshwaterlight:c([0,0,0,1],'elderly','none')},funnel:{'grass|0':{initial:1,born:0,matured:0,reproduced:0,juvenileDeaths:0},'forestcrown|0':{initial:1,born:0,matured:0,reproduced:0,juvenileDeaths:0}}};
 const h=O.create(w.config,'independent-observation-test',{species:catalog()});return {w,h};
}

test('basal colonies and independent plant bodies are counted once with their own units',()=>{
 const {w,h}=fixture();h.append(w);const row=h.rows[0];
 assert.equal(row.current.groups.find(g=>g.id==='plant').count,4);assert.equal(row.current.total,4);assert.equal(row.current.pyramid.layers[0],30);
 assert.equal(row.producerColony.land.count,1);assert.equal(row.independentPlants.land.count+row.independentPlants.water.count,3);
 assert.equal(row.independentPlants.land.occupancy,.2);assert.equal(row.independentPlants.land.solarInputE,3);assert.equal(row.independentPlants.land.productionB,2);
 const csv=h.csv();assert(csv.includes('"population","grass","1","producer_colony"'));
 for(const id of ids)assert(csv.includes('"population","'+id+'","1","individual"'));
 assert(csv.includes('"cohort_initial","forestcrown|0","1","individual"'));assert(csv.includes('"cohort_initial","grass|0","1","producer_colony"'));
 assert(csv.includes('"independent_plant_solarInputE","land","3","model_E"'));assert(csv.includes('"independent_plant_productionB","land","2","model_B"'));
 const ages=h.series('plant','ages')[0];assert.equal(ages.total,4);assert.equal(ages.values.nonapplicable,1);assert.equal(ages.values.elderly,1);
 assert.equal(h.series('forestcrown','phases')[0].total,1);assert.equal(h.series('plant','sex')[0].values.none,3);
});

test('new metadata keeps kinds and slots through all-turn snapshot and read-only analysis',()=>{
 const {w,h}=fixture();h.append(w);w.turn=1;w.colonySummary=colonies(1);w.largePlantSummary=plants(1);w.largePlantSummary.land.consumedB=7;h.append(w);
 const snapshot=h.snapshot();assert.equal(snapshot.definitions.independentPlants,definition);
 assert.equal(snapshot.metadata.species.find(s=>s.id==='forestcrown').kind,'independent');assert.equal(snapshot.metadata.species.find(s=>s.id==='forestcrown').slot,'producer');
 const restored=O.restore(snapshot,{species:F.S.D.species});assert.deepEqual(restored.snapshot(),snapshot);assert.equal(restored.csv(),h.csv());assert.equal(restored.rows[0].independentPlants.land.consumedB,4);
 snapshot.rows[1].independentPlants.land.consumedB=99;assert.equal(h.rows[1].independentPlants.land.consumedB,7);
});

test('a missing or malformed new summary cannot silently become zero or erase earlier records',()=>{
 for(const change of [w=>delete w.largePlantSummary,w=>w.largePlantSummary.turn=2,w=>w.largePlantSummary.definition='future',w=>delete w.largePlantSummary.water.capacityB,w=>w.largePlantSummary.land.count=.5,w=>w.largePlantSummary.land.capacityB=1,w=>w.largePlantSummary.land.solarInputE=NaN]){
  const {w,h}=fixture();h.append(w);const before=structuredClone(h.rows);w.turn=1;w.colonySummary=colonies(1);w.largePlantSummary=plants(1);change(w);
  assert.throws(()=>h.append(w),/独立植物観測/);assert.deepEqual(h.rows,before);
 }
});

test('restore rejects missing definitions, classification, rows and inconsistent new values',()=>{
 const {w,h}=fixture();h.append(w);const original=h.snapshot();
 for(const change of [s=>delete s.definitions.independentPlants,s=>s.definitions.independentPlants='future',s=>delete s.metadata.independentPlantDefinition,s=>s.metadata.species.find(s=>s.id==='forestcrown').kind='colony',s=>delete s.metadata.species.find(s=>s.id==='starcrown').slot,s=>delete s.rows[0].independentPlants,s=>s.rows[0].independentPlants.turn=1,s=>s.rows[0].independentPlants.water.occupancy=.9,s=>s.rows[0].independentPlants.land.consumedB=-1,s=>delete s.metadata.config.largePlantModel]){
  const snapshot=structuredClone(original);change(snapshot);assert.throws(()=>O.restore(snapshot),/独立植物/);
 }
});

test('legacy and I02 snapshot and CSV bytes remain exactly the pre-I03 baseline',()=>{
 const hash=value=>crypto.createHash('sha256').update(value).digest('hex'),expected={legacy:['6dd041fa5b826412980ceebe77321ccd1dc466de55939e3ec9b85a5380d5bd35','ffe6df6044e4e6d2a5c00d50a9a278bab1affe911c854d4ca7a48d8fc93a88f3'],colony:['e1f434ed543eea73198c1dd6af2354949f94f02efd15200d2ce1b11de3c5f2cb','aa0648927cdf740f7b32d2ab5d9a17daaff754eeed02307759094d0000dbb79b']};
 for(const mode of ['legacy','colony']){
  const w=F.world();w.turn=0;if(mode==='colony')w.config.producerModel='colony/1';const h=O.create(w.config,'i03-legacy-preservation',{species:F.S.D.species});
  for(let turn=0;turn<3;turn++){w.turn=turn;if(mode==='colony')w.colonySummary={definition:'colony-observed/1',turn,land:region(),water:region()};h.append(w);}
  assert.equal(hash(JSON.stringify(h.snapshot())),expected[mode][0]);assert.equal(hash(h.csv()),expected[mode][1]);assert.equal(h.snapshot().definitions.independentPlants,undefined);
  assert(h.metadata.species.every(s=>!Object.hasOwn(s,'kind')&&!Object.hasOwn(s,'slot')));
 }
});
