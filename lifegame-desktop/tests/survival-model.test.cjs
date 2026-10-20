'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../src/ecology/observation-model.js'),factory=require('../design/advantage-switches/model.cjs');
const config={seed:'i11/versioned-profiles',width:16,height:12,initial:16,lineages:'manual',selected:['solar','ryouki'],ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',populationRegulation:{version:1},balanceModel:'survival/1',producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
test('all eight generated product profiles preserve the versioned source model including full states and finite accounting',()=>{
 for(const balanceModel of ['survival/1','survival/2','survival/3','survival/4'])for(let bits=0;bits<8;bits++){
  const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},E=M.model(flags),F=factory.model(flags);let actual=E.create({...config,balanceModel}),expected=F.create({...config,balanceModel});
  for(let turn=0;turn<=2;turn++){assert.deepEqual(actual,expected,balanceModel+' profile '+bits+' turn '+turn);assert.deepEqual(E.invariants(actual),[]);if(turn<2){actual=E.step(actual);expected=F.step(expected);}}
 }
});
