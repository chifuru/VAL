'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../src/ecology/engine.js'),O=require('../src/ecology/observations.js'),fixture=require('./cell-observation-units-fixture.cjs');
const near=(a,b)=>assert(Math.abs(a-b)<.00001,`${a} != ${b}`),history=w=>O.create(w.config,'cell-units-test',{species:E.S.activeSpecies(w)});
test('population, management units and settlement slots remain separate across every spatial layer',()=>{
 const w=fixture(E),h=history(w),before=JSON.stringify(w);h.append(w);const r=h.rows[0],c=r.cell;
 assert.equal(c.agents,32);assert.equal(r.counts.ryouki,11);assert.equal(r.counts.grassbug,18);assert.equal(c.bySpecies.grassbug.units,5);assert.equal(c.bySpecies.grass.units,6);assert.equal(c.bySpecies.fungus.units,6);
 assert.deepEqual(Object.values(c.layers).map(a=>a.units),[6,3,5,12,6]);assert.equal(c.settledIndividuals,10);assert.equal(c.settledSlots,4);assert.equal(c.movingIndividuals,2);
 assert.equal(c.ryouki.sharedIndividuals,9);assert.equal(c.ryouki.normal,2);assert.equal(c.ryouki.maxPerCell,11);assert.equal(c.ryouki.maxPerSlot,3);
 assert.equal(r.current.total,47);assert.equal(r.P,1);assert.equal(r.Q,1);assert.equal(r.main,11);assert.equal(JSON.stringify(w),before);
});
test('phase/age/sex series use real cohort members and colony age is nonapplicable',()=>{
 const w=fixture(E),h=history(w);h.append(w);const c=h.rows[0].composition;
 assert.deepEqual(c.grassbug.phases,[12,6,0,0]);assert.equal(c.grassbug.sex.none,18);assert.equal(c.grassbug.ages.juvenile,1);
 assert.equal(c.grass.ages.nonapplicable,6);assert.equal(c.grass.sex.nonapplicable,6);assert.equal(c.fungus.ages.nonapplicable,6);assert.equal(c.forestcrown.ages.adult,2);
 for(const axis of ['population','phases','ages','sex']){assert.equal(h.series('all',axis)[0].total,47);assert.equal(h.series('prey',axis)[0].total,18);assert.equal(h.series('main',axis)[0].total,11);}
});
test('biomass reads bodies once; canopy bases and carcass B do not use legacy capacities or q',()=>{
 const w=fixture(E),h=history(w);h.append(w);const r=h.rows[0],c=r.cell;
 near(c.bySpecies.forestcrown.baseB,6);near(c.bySpecies.fungus.baseB,6);near(c.bySpecies.fungus.edibleB,6);near(c.stocks.carcassB,2);near(r.current.pyramid.side.remains,2);
 near(r.current.biomass.bySpecies.grassbug,36);near(r.current.pyramid.roleLayers[0],w.organisms.filter(o=>E.S.spec(o).group==='plant').reduce((n,o)=>n+o.B,0));
 near(r.current.pyramid.biomassTotal,w.organisms.reduce((n,o)=>n+o.B,0)+w.organisms[0].infection.B+w.organisms[0].infection.q.B);
 near(c.stocks.organicE,3);near(c.stocks.pendingE,2);near(c.stocks.pendingM,.2);assert.equal(c.stocks.waterUnresolvedCells,2);
});
test('new observation definition and units survive all-turn JSON, read-only restore and exact CSV',()=>{
 const w=fixture(E),h=history(w);h.append(w);for(let t=1;t<=2;t++){w.turn=t;w.cellState.nextMaterial[0].availableAt=t+1;E.finish(w,E.context(w));h.append(w);}
 const s=JSON.parse(JSON.stringify(h.snapshot())),restored=O.restore(s);assert.equal(s.definitions.cell,'cell-occupancy-observed/1');assert.equal(s.definitions.ryouki,undefined);assert.equal(s.metadata.populationUnits.grass,'producer_colony');assert.equal(s.metadata.populationUnits.fungus,'fungal_colony');assert.equal(s.metadata.populationUnits.grassbug,'individual');
 assert.deepEqual(restored.snapshot(),s);assert.equal(restored.csv(),h.csv());assert.equal(restored.series('all','ages').length,3);assert.equal(restored.series('all')[2].total,47);assert.throws(()=>restored.append(w),/読取専用/);
 const csv=h.csv();assert(csv.includes('"cell_species_units","grassbug","5","management_unit"'));assert(csv.includes('"population","grassbug","18","individual"'));assert(csv.includes('"cell_settledSlots","all","4","settlement_slot"'));assert(csv.includes('"cell_ryouki_maxPerCell","ryouki","11","individual_per_cell"'));assert(csv.includes('"cell_stock_carcassB","all","2","model_B"'));
});
test('missing/contradictory runtime observations reject only the next append',()=>{
 for(const change of [w=>w.stats.counts.grassbug=5,w=>w.organisms[0].cellOccupancy.slot=4,w=>w.organisms[0].cellMatter.bodyM=NaN,w=>delete w.cellState.water,w=>w.cellState.nextMaterial[0].availableAt=3]){
  const w=fixture(E),h=history(w);h.append(w);const rows=structuredClone(h.rows);w.turn=1;w.cellState.nextMaterial[0].availableAt=2;E.finish(w,E.context(w));change(w);assert.throws(()=>h.append(w));assert.deepEqual(h.rows,rows);
 }
});
test('restore rejects missing definitions, guessed units and mismatched counts, slots, composition or biomass',()=>{
 const w=fixture(E),h=history(w);h.append(w);const original=h.snapshot();
 for(const change of [s=>delete s.definitions.cell,s=>s.metadata.cellDefinition='future',s=>s.metadata.config.cellModel='future',s=>delete s.metadata.config.cellModel,s=>s.metadata.populationUnits.grassbug='consumer_group',s=>delete s.rows[0].cell,s=>s.rows[0].cell.bySpecies.grassbug.population=5,s=>s.rows[0].cell.settledSlots=2,s=>s.rows[0].composition.grass.ages.nonapplicable=0,s=>s.rows[0].current.biomass.bySpecies.grassbug=5,s=>s.rows[0].current.pyramid.side.remains=99]){
  const saved=structuredClone(original);change(saved);assert.throws(()=>O.restore(saved),/観測/);
 }
});
test('two real internal life turns append exact series without changing public/archive guards',()=>{
 const w=fixture(E,true),h=history(w);h.append(w);
 for(let turn=1;turn<=2;turn++){
  w.turn=turn;const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.cellLife(w,c);E.finish(w,c);
  const before=JSON.stringify(w);h.append(w);assert.equal(JSON.stringify(w),before);const row=h.rows.at(-1);assert.equal(row.current.total,Object.values(row.counts).reduce((n,v)=>n+v,0));
 }
 assert.equal(h.rows.length,3);assert.equal(h.series('all','phases').length,3);assert.deepEqual(O.restore(JSON.parse(JSON.stringify(h.snapshot()))).snapshot(),JSON.parse(JSON.stringify(h.snapshot())));
 require('./cell-turn-assertion.cjs')(E,w);assert.throws(()=>require('../src/ecology/archive.js').create({getItem:()=>null,setItem(){}},E,'internal').capture(w,'manual'),/CELL_MODEL_INCOMPLETE/);
});
