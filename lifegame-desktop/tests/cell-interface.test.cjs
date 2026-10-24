'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),UI=require('../src/ecology/cell-interface.js'),E=require('../src/ecology/engine.js'),fixture=require('./cell-observation-units-fixture.cjs');
const base=()=>({observationMode:'river-settlement',generationSettings:{version:'diverse-generation-parameters/1',mode:'auto',profile:'high-production',locks:['initial']},producerSupport:{enabled:true},advantageSettings:{version:1,producer:true,waterbug:true,hyperparasite:true},producerSettings:{version:'colony-parameters/1',land:{occupancy:.2,capacityB:60,regrowthB:6,initialFraction:0},water:{occupancy:0,capacityB:30,regrowthB:3,initialFraction:.7}}});
test('legacy configuration and guides retain their original path and values',()=>{
 const b=base(),before=structuredClone(b);assert.equal(UI.connect(b,null),b);assert.deepEqual(b,before);assert.equal(UI.settings(b),null);assert.equal(UI.guide('system',{config:b}),null);
});
test('new candidate settings preserve explicit zeroes and water profile without changing their inputs',()=>{
 const b=base(),reference={cellModel:UI.model,cellSettings:{aquaticProfile:'freshwater-comparison/1',temperature:0,landPH:0,waterPH:14,rainScale:0,lightScale:0,mineralInput:0}},before=structuredClone({b,reference}),c=UI.connect(b,reference);
 assert.equal(c.cellModel,UI.model);assert.equal(c.cellSettings.temperature,0);assert.equal(c.cellSettings.landPH,0);assert.equal(c.cellSettings.waterPH,14);assert.equal(c.cellSettings.rainScale,0);assert.equal(c.cellSettings.lightScale,0);assert.equal(c.cellSettings.mineralInput,0);assert.equal(c.cellSettings.aquaticProfile,'freshwater-comparison/1');assert.deepEqual({b,reference},before);
});
test('unsupported legacy adjustments become fixed finite-model candidates while initial density remains independent',()=>{
 const c=UI.connect(base(),{cellModel:UI.model,cellSettings:{}});assert.equal(c.observationMode,'custom');assert.equal(c.generationSettings.mode,'manual');assert.equal(c.generationSettings.profile,'auto');assert.deepEqual(c.generationSettings.locks,[]);assert.deepEqual(c.producerSupport,{enabled:false});assert.equal(c.advantageSettings.producer,false);assert.equal(c.advantageSettings.waterbug,true);
 const actual=E.S.CellLife.bounds({phase:1,cellLife:{kind:'colony'}});
 for(const region of ['land','water']){assert.equal(c.producerSettings[region].capacityB,actual.edible);assert.equal(c.producerSettings[region].regrowthB,actual.growth);}assert.equal(c.producerSettings.water.occupancy,0);assert.equal(c.producerSettings.land.initialFraction,0);
});
test('defaults reset candidate environment but keep the explicitly selected water-profile version',()=>{
 const a=UI.defaults({cellModel:UI.model,cellSettings:{soilQuality:1.25,temperature:5,mineralLevel:'rich',aquaticProfile:'freshwater-comparison/1'}});assert.equal(a.temperature,20);assert.equal(a.soilQuality,1);assert.equal(a.mineralLevel,'standard');assert.equal(a.aquaticProfile,'freshwater-comparison/1');assert.equal(UI.defaults({cellModel:UI.model,cellSettings:{}}).aquaticProfile,undefined);
});
test('unknown versions and impossible environment values are rejected instead of guessed',()=>{
 assert.throws(()=>UI.settings({cellModel:'future'}),/モデル/);
 for(const values of [{aquaticProfile:'future'},{landPH:15},{soilQuality:1.1},{rainScale:-1},{lightScale:101},{temperature:NaN}])assert.throws(()=>UI.connect(base(),{cellModel:UI.model,cellSettings:values}));
 assert.throws(()=>UI.connect({}, {cellModel:UI.model,cellSettings:{}}),/初期設定/);
});
test('new sheets separate finite stocks, layers and real members without altering a world',()=>{
 const w=fixture(E,true),before=JSON.stringify(w),texts=['system','food','action','birth'].map(name=>UI.guide(name,w));
 assert(texts[0].includes('番号は捕食順位ではなく'));assert(texts[0].includes('CO₂'));assert(texts[0].includes('次ターン'));assert(texts[1].includes('5小集団・各8体'));assert(texts[2].includes('定住期限'));assert(texts[3].includes('年齢と相は独立'));assert(!texts.join('').includes('B2/3'));assert(UI.treeNote('ryouki').includes('3枠で最大9個体'));assert(UI.treeNote('forestcrown').includes('10/20/30/40'));assert(UI.treeNote('freshwaterlight').includes('4次'));assert.equal(JSON.stringify(w),before);
});
