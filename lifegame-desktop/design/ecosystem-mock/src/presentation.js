(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../vendor/creature-engine'));else root.MockPresentation=factory(root.CreatureEngine);})(globalThis,function(E){
'use strict';
// These are fixed rendering templates, not simulated organ experience.
function project(c){
 const s=E.initial(c.seed),points=[8,35,74,100][c.stage];
 s.dna={...c.dna};s.lineage=c.lineage;s.stage=Math.min(2,c.stage);s.points=s.rawPoints=points;s.current=c.meals;s.matured=c.stage===3;
 s.foods={number:0,fizz:0,buzz:0,fizzbuzz:0};s.heritage=[];
 const xp=[0,24,120,300][c.stage];for(const p of E.PART_DEFINITIONS[c.lineage]||[])s.partXp[c.lineage+':'+p[0]]=xp;
 for(const p of E.BODY_PARTS)s.tissueEnergy[p]=E.ENERGY_QUARTERS_AT_MATURITY*points/100;
 s.environmentPlan={...s.environmentPlan,weights:[[.25,.25,.25,.25],[.25,.25,.25,.25]]};
 return s;
}
return {project};
});
