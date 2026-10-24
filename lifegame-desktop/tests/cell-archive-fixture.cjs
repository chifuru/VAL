'use strict';
const config={seed:'cell-initial-audit',width:40,height:28,initial:84,lineages:'few',landscape:'templates',mapId:'river',
 producerModel:'colony/1',largePlantModel:'independent/1',consumerModel:'group/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',parasiteCohortModel:'cohort/1',
 ageModel:'life/1',balanceModel:'survival/4',informationModel:'persistent/1',ecologyRevision:'observation/4.1',cellModel:'cell-reorganization/1',cellSettings:{aquaticProfile:'freshwater-comparison/1'},
 generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'auto',locks:[]},advantageSettings:{version:'advantage-switches/1',producer:false,waterbug:false,hyperparasite:false}};
function step(w,E){w.turn++;const c=E.context(w);E.prepare(w,c);for(const o of w.organisms)c.intents.set(o.id,{type:'stop',cell:o.cell,path:[],cost:0});E.B.move(w,c);E.cellLife(w,c);E.finish(w,c);return w;}
module.exports={config,step};
