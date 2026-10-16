"use strict";
const fs=require('node:fs'),path=require('node:path');
module.exports=function(name,s){
 function replace(a,b){if(!s.includes(a))throw Error('Foundation source contract: '+name+' '+a.slice(0,60));s=s.replace(a,b);}
 if(name==='state'){
  const start=s.indexOf('    const n = config.width * config.height,'),end=s.indexOf('    for (let p = 0; p < n; p++) {\n      const [x, y] = xy(w, p);\n      for (const q',start);
  if(start<0||end<0)throw Error('World generation contract changed');
  s=s.slice(0,start)+fs.readFileSync(path.join(__dirname,'world-body.txt'),'utf8')+s.slice(end);
  replace('if (s.id === "grass" || s.id === "grassbug") return t.terrain !== "deep";', 'if (s.id === "grass" || s.id === "grassbug") return t.terrain !== "deep" && !([0,5].includes(t.env) && t.terrain === "shallow");');
 }
 if(name==='catalogue')replace('  data.byId =',`  for(const s of data.species){if(s.group==='main'){s.life*=1.5;if(s.id!=='kelp')s.maintenance*=.65;s.birthEnergy=45;}if(s.group==='fungus')s.maintenance=.07;if(['waterbug','grassbug'].includes(s.id)){s.life*=1.5;s.birthCooldown*=1.5;}}
  data.byId =`);
 if(name==='behavior'){
  replace('            occupied.has(cell) ||','            occupied.has(cell) || (s.group === "prey" && !S.validHabitat(w,s,cell)) ||');
  replace('o.phase >= 3 &&\n        a.phase >= 3 &&','o.phase >= 1 &&\n        a.phase >= 1 &&');
  replace('mateBonus = 0.8;', 'mateBonus = o.phase>=3 && a.phase>=3 ? .8 : .5;');
  replace('      0.8 * terrain *','      0.48 * terrain *');
  replace('for (const p of v.visibleCells) {\n      const a = v.m.main.get(p);', 'for (const p of S.nearby(w,o.cell,4,true)) {\n      if(!S.sight(w,o.cell,p))continue; const a = v.m.main.get(p);');
  replace('features[3] += mateBonus + shelterBonus;', 'features[3] += mateBonus + shelterBonus;');
  replace('    const noRandom = score;', '    if(attack && target && S.spec(target).group === "prey") score += (s.diet === "animal" ? .6 : .2) * (1+hunger);\n    const noRandom = score;');
  replace('      hunger * features[2] +', '      mateBonus * (.5 + o.weights[3]/100) + hunger * features[2] +');
 }
 if(name==='nutrition'){
  replace('if (plant && o.M <', 'if ((plant || fungus) && o.M <');
  replace('s.group === "plant" && o.B < 4\n              ? 2\n              : o.phase === 2 && hasBirth\n                ? 8\n                : 5', 'o.phase === 2 && hasBirth ? 8 : s.group === "plant" && o.B < 4 ? 2 : 5');
  replace('S.nearby(w, p).filter((q) => m.food.get(q)?.species === s.id)\n                .length === 3', '(["algae","moss","fungus"].includes(s.id) ? [1,2,3] : [3]).includes(S.nearby(w,p).filter(q=>m.food.get(q)?.species===s.id).length)');
 }
 if(name==='parasites'){
  replace('      paid = Math.min(host.E, 0.2);', '      cost = S.spec(host).group === "main" ? .15 : .04, paid = Math.min(host.E, cost);');
  replace('2 * (0.2 - paid)', '2 * (cost - paid)');
  replace('Math.min(0.05, paid)', 'Math.min(0.05, paid*.25)');
  replace('paid >= 0.2 - 1e-8', 'paid >= cost - 1e-8');
  replace('share >= 0.05 - 1e-8', 'share >= Math.min(.05,cost*.25) - 1e-8');
 }
 if(name==='reproduction'){
  replace(': same.length !== 3',': ["algae","moss"].includes(s.id) ? ![1,2,3].includes(same.length) : same.length !== 3');
  // Keep the source expression expected by the preceding food ablation transform.
  replace('s.group === "prey"\n              ? ![2, 3].includes(same.length)','s.group === "prey"\n              ? ![1, 2, 3].includes(same.length)');
 }
 return s;
};
