'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),F=require('./ecology-fixtures.cjs'),O=require('../src/ecology/observations.js');
const definition='ryouki-observed/1',fields=['count','normal','mutated','mutatedEarly','mutatedIV','occupiedCells','cohabitingIndividuals','maxOccupancy'];
function summary(turn,values={}){return {definition,turn,count:3,normal:0,mutated:3,mutatedEarly:2,mutatedIV:1,occupiedCells:1,cohabitingIndividuals:3,maxOccupancy:3,...values};}
function fixture(){
 const w=F.world();w.turn=0;w.config.ryoukiModel='ryouki/1';w.stats.counts.ryouki=3;w.stats.main=3;w.organisms=[1,2,4].map((phase,i)=>({id:'ryouki-'+i,species:'ryouki',cell:9,B:8,phase}));w.ryoukiSummary=summary(0);
 w.observation={composition:{ryouki:{phases:[1,1,0,1],ages:{juvenile:1,adult:1,elderly:1},sex:{female:2,male:1},roles:{}}}};
 return {w,h:O.create(w.config,'ryouki-observation-test',{species:F.S.activeSpecies(w)})};
}
test('three cohabitants stay three individuals in main population phase age sex and biomass',()=>{
 const {w,h}=fixture();h.append(w);const row=h.rows[0];assert.equal(row.current.total,3);assert.equal(row.current.groups.find(g=>g.id==='main').count,3);assert.equal(row.current.biomass.total,24);assert.equal(row.main,3);
 for(const axis of ['population','phases','ages','sex'])assert.equal(h.series('ryouki',axis)[0].total,3);
 assert.deepEqual(row.ryouki,summary(0));const csv=h.csv();assert(csv.includes('"population","ryouki","3","individual"'));assert(csv.includes('"ryouki_cohabitingIndividuals","ryouki","3","individual"'));assert(csv.includes('"ryouki_occupiedCells","ryouki","1","cell"'));assert(csv.includes('"ryouki_maxOccupancy","ryouki","3","individual_per_cell"'));
});
test('all-turn normal and mutated observations survive snapshot restore and exact CSV',()=>{
 const {w,h}=fixture();h.append(w);w.turn=1;w.ryoukiSummary=summary(1,{normal:1,mutated:2,mutatedEarly:1,occupiedCells:2,cohabitingIndividuals:2,maxOccupancy:2});h.append(w);
 const saved=h.snapshot();assert.equal(saved.definitions.ryouki,definition);assert.equal(saved.metadata.ryoukiDefinition,definition);assert.equal(saved.rows[0].ryouki.mutated,3);assert.equal(saved.rows[1].ryouki.mutated,2);assert.equal(saved.rows[1].births,0);assert.equal(saved.rows[1].deaths,0);
 const restored=O.restore(saved,{species:F.S.D.species});assert.deepEqual(restored.snapshot(),saved);assert.equal(restored.csv(),h.csv());saved.rows[0].ryouki.mutated=99;assert.equal(h.rows[0].ryouki.mutated,3);
});
test('measured zero is retained while missing or impossible runtime telemetry refuses only the new row',()=>{
 for(const change of [w=>delete w.ryoukiSummary,w=>w.ryoukiSummary.definition='future',w=>w.ryoukiSummary.turn=3,...fields.map(k=>w=>delete w.ryoukiSummary[k]),w=>w.ryoukiSummary.count=.5,w=>w.ryoukiSummary.normal=1,w=>w.ryoukiSummary.mutatedEarly=0,w=>w.ryoukiSummary.maxOccupancy=4,w=>w.ryoukiSummary.occupiedCells=2,w=>w.ryoukiSummary.cohabitingIndividuals=1,w=>w.stats.counts.ryouki=4]){
  const {w,h}=fixture();h.append(w);const saved=structuredClone(h.rows);w.turn=1;w.ryoukiSummary=summary(1);change(w);assert.throws(()=>h.append(w),/量機観測/);assert.deepEqual(h.rows,saved);
 }
 const {w,h}=fixture();w.organisms=[];w.stats.counts.ryouki=0;w.stats.main=0;w.ryoukiSummary=summary(0,Object.fromEntries(fields.map(k=>[k,0])));h.append(w);assert.equal(O.restore(h.snapshot()).rows[0].ryouki.count,0);assert(h.csv().includes('"ryouki_count","ryouki","0","individual"'));
});
test('restore rejects missing rows unknown versions wrong classification and inconsistent counters',()=>{
 const {w,h}=fixture();h.append(w);const original=h.snapshot();
 for(const change of [s=>delete s.definitions.ryouki,s=>s.definitions.ryouki='future',s=>delete s.metadata.ryoukiDefinition,s=>s.metadata.ryoukiDefinition='future',s=>s.metadata.config.ryoukiModel='future',s=>delete s.metadata.config.ryoukiModel,s=>s.metadata.species.find(s=>s.id==='ryouki').group='plant',s=>delete s.rows[0].ryouki,s=>s.rows[0].ryouki.turn=1,s=>s.rows[0].ryouki.count=4,s=>s.rows[0].ryouki.mutatedEarly=-1,s=>s.rows[0].ryouki.maxOccupancy=Infinity]){
  const saved=structuredClone(original);change(saved);assert.throws(()=>O.restore(saved),/観測/);
 }
});
test('old I03 snapshot and CSV bytes remain exactly the pre-I04 baseline',()=>{
 const w=F.world();w.turn=0;w.config.producerModel='colony/1';w.config.largePlantModel='independent/1';for(const s of F.S.D.independentPlants)w.stats.counts[s.id]=0;
 const region=()=>({count:0,B:0,baseB:0,edibleB:0,reserveE:0,reserveM:0,activitySum:0,occupiedCells:0,eligibleCells:10,solarInputE:0,productionB:0,regrowthB:0,consumedB:0}),h=O.create(w.config,'i04-preservation',{species:F.S.activeSpecies(w)});
 for(let turn=0;turn<3;turn++){w.turn=turn;w.colonySummary={definition:'colony-observed/1',turn,land:region(),water:region()};w.largePlantSummary={definition:'independent-plant-observed/1',turn,land:{...region(),capacityB:0},water:{...region(),capacityB:0}};w.ryoukiSummary=summary(turn);h.append(w);}
 const hash=s=>crypto.createHash('sha256').update(s).digest('hex');assert.equal(hash(JSON.stringify(h.snapshot())),'ce1b8f35fd876fec50aa7c8124c0d60cb6aa6c4963d33234f63034dc62bbde1b');assert.equal(hash(h.csv()),'13b5d0a323b5601ee7f83d39fa9e3e0ee4b5a0eaf6b6009cf9e37007e43b8b9d');assert(!h.csv().includes('ryouki'));assert(h.metadata.species.every(s=>s.id!=='ryouki'));assert.equal(h.snapshot().definitions.ryouki,undefined);
});
