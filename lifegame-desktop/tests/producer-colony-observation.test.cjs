'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),F=require('./ecology-fixtures.cjs'),O=require('../src/ecology/observations.js');
const definition='producer-colony-observed/1';
function region(values={}){return {count:0,B:0,baseB:0,edibleB:0,reserveE:0,reserveM:0,activitySum:0,occupiedCells:0,eligibleCells:0,solarInputE:0,productionB:0,regrowthB:0,consumedB:0,...values};}
function summary(turn){return {definition:'colony-observed/1',turn,land:region({count:2,B:18,baseB:4,edibleB:14,reserveE:8,reserveM:2,activitySum:1.4,occupiedCells:2,eligibleCells:10,solarInputE:3,productionB:2,regrowthB:1,consumedB:4}),water:region()};}
function fixture(){
 const w=F.world();w.turn=0;w.config.producerModel='colony/1';w.colonySummary=summary(0);
 w.stats.counts.grass=2;const h=O.create(w.config,'colony-test',{species:F.S.D.species});return {w,h};
}

test('all-turn colony metrics keep count, biomass, light input and edible production in distinct units',()=>{
 const {w,h}=fixture();w.observation={funnel:{'grass|0':{initial:2,born:0,matured:0,reproduced:0,juvenileDeaths:0}},birthReasons:{grass:{occupied:1}}};h.append(w);w.turn=1;w.colonySummary=summary(1);w.colonySummary.land.consumedB=7;h.append(w);
 assert.equal(h.rows[0].producerColony.land.consumedB,4);assert.equal(h.rows[1].producerColony.land.consumedB,7);
 assert.equal(h.rows[0].producerColony.definition,definition);assert.equal(h.rows[0].producerColony.land.occupancy,.2);
 assert.equal(h.rows[0].producerColony.water.occupancy,null);assert.equal(h.rows[0].producerColony.water.count,0);
 const csv=h.csv();assert(csv.includes('"producer_colony_productionB","land","2","model_B"'));
 assert(csv.includes('"producer_colony_solarInputE","land","3","model_E"'));
 assert(csv.includes('"producer_colony_consumedB","land","7","model_B"'));
 assert(csv.includes('"producer_colony_occupancy","land","0.2","fraction","10"'));
 assert(!csv.includes('"producer_colony_occupancy","water"'));assert(csv.includes('"population","grass","2","producer_colony"'));
 assert(csv.includes('producer-colony-observed/1'));
 assert(csv.includes('"cohort_initial","grass|0","2","producer_colony"'));assert(csv.includes('"birth_blocker_occupied","grass","1","producer_colony"'));
 const snapshot=h.snapshot();assert.equal(snapshot.definitions.producerColony,definition);
 const restored=O.restore(snapshot);assert.deepEqual(restored.rows,h.rows);assert.deepEqual(restored.snapshot(),snapshot);assert.equal(restored.csv(),csv);
 snapshot.rows[0].producerColony.land.B=999;assert.equal(h.rows[0].producerColony.land.B,18);
});

test('missing colony telemetry is rejected while measured zeros remain zeros',()=>{
 const {w,h}=fixture();delete w.colonySummary;assert.throws(()=>h.append(w),/群落観測/);assert.equal(h.rows.length,0);
 w.colonySummary={definition:'colony-observed/1',turn:0,land:region({eligibleCells:10}),water:region()};h.append(w);
 const restored=O.restore(h.snapshot());assert.equal(restored.rows[0].producerColony.land.count,0);assert.equal(restored.rows[0].producerColony.land.occupancy,0);
 const csv=restored.csv();assert(csv.includes('"0","producer_colony_count","land","0"'));
});

test('legacy observations keep their prior definition, units and rows even if a colony-shaped summary is present',()=>{
 const w=F.world();w.turn=0;w.stats.counts.grass=2;
 const old=O.create(w.config,'legacy',{species:F.S.D.species});old.append(w);
 w.colonySummary=summary(0);const current=O.create(w.config,'legacy',{species:F.S.D.species});current.append(w);
 assert.deepEqual(current.snapshot(),old.snapshot());assert.equal(current.csv(),old.csv());assert(!current.csv().includes('producer_colony'));
 assert(current.csv().includes('"population","grass","2","individual"'));assert.equal(current.snapshot().definitions.producerColony,undefined);
 assert.deepEqual(O.restore(old.snapshot()).rows,old.rows);
});

test('malformed runtime colony data refuses the new row without discarding committed observations',()=>{
 for(const change of [s=>delete s.land.regrowthB,s=>s.land.count=.5,s=>s.land.edibleB=-1,s=>s.land.activitySum=3,s=>s.land.occupiedCells=11,s=>s.land.productionB=NaN,s=>s.land.regrowthB=3,s=>s.turn=2,s=>s.definition='future']){
  const {w,h}=fixture();h.append(w);const before=structuredClone(h.rows);w.turn=1;w.colonySummary=summary(1);change(w.colonySummary);
  assert.throws(()=>h.append(w),/群落観測/);assert.deepEqual(h.rows,before);
  w.colonySummary=summary(1);assert.equal(h.append(w),true);assert.equal(h.rows.length,2);
 }
});

test('restore rejects unknown definitions, inconsistent units, missing fields and nonfinite colony values',()=>{
 const {w,h}=fixture();h.append(w);const original=h.snapshot();
 for(const change of [s=>s.definitions.producerColony='future',s=>delete s.definitions.producerColony,s=>s.metadata.producerColonyDefinition='future',s=>delete s.metadata.config.producerModel,s=>delete s.rows[0].producerColony,s=>s.rows[0].producerColony.definition='future',s=>s.rows[0].producerColony.turn=1,s=>delete s.rows[0].producerColony.water.reserveM,s=>s.rows[0].producerColony.land.occupancy=.9,s=>s.rows[0].producerColony.water.occupancy=0,s=>s.rows[0].producerColony.land.B=Infinity,s=>s.rows[0].producerColony.land.consumedB=-1]){
  const snapshot=structuredClone(original);change(snapshot);assert.throws(()=>O.restore(snapshot),/観測/);
 }
 assert.deepEqual(h.snapshot(),original);
});
