"use strict";
const fs=require('node:fs'),path=require('node:path');
module.exports=function(name,s,flags={}){
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
  replace('for (const p of v.visibleCells) {\n      const a = v.m.main.get(p);', 'for (const p of v.mateCells || v.visibleCells) {\n      const a = v.m.main.get(p);');
  replace('        v = view(w, o, ctx, m);', '        v = view(w, o, ctx, m);\n      v.mateCells = S.spec(o).group === "main" ? S.nearby(w,o.cell,4,true).filter(p=>m.main.get(p)?.species===o.species && S.sight(w,o.cell,p)) : [];');
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
 if(flags.colony && name==='state'){
  replace('sex = j % 4 < 2 ? "male" : "female",', 'sex = s.id === "swarm" ? (j%4===0?"male":"female") : j % 4 < 2 ? "male" : "female",');
  replace(': j % 4 === 3\n                    ? "worker"', ': j % 4 !== 0\n                    ? "worker"');
 }
 if(flags.colony && name==='behavior'){
  replace('o.E >= 40 &&', 'o.E >= 25 &&');
  replace('main.phase <= 2 &&', '(main.phase <= 2 || (main.role === "queen" && main.E < 65)) &&');
  replace('if (!a || a.id === o.id || a.species !== o.species) continue;', 'if (!a || a.id === o.id || a.species !== o.species) continue;\n      if(s.id === "swarm" && o.role === "worker" && a.colony === o.colony && (a.role === "queen" || a.phase <= 2) && (S.distance(w,to,p)<=1 || S.distance(w,to,p)<S.distance(w,here,p))) shelterBonus=Math.max(shelterBonus,.6);');
  replace('  "use strict";', '  "use strict";\n  const CareNutrition=require("./nutrition.js");');
  replace('ctx.traits.get(target.id).capE - target.E < 1.8 - 1e-8 ||', '(ctx.traits.get(target.id).capE - target.E < 1.8 - 1e-8 && target.M>=8 && target.G>=90) ||');
  replace('      target.E = S.round(target.E + 1.8);\n      S.dissipate(w, 0.2);', '      const material=Math.min(.2,Math.max(0,o.M-2),Math.max(0,8-target.M));o.M=S.round(o.M-material);\n      const careGain=CareNutrition.absorb(w,target,{E:2,M:material,G:0},"animal",ctx);');
  replace('        amount: 1.8,', '        amount: careGain.e, material: careGain.m,');
 }
 if(flags.colony && name==='reproduction'){
  replace('ctx.old.get(mother.id).E >= 90 &&', 'ctx.old.get(mother.id).E >= 60 &&');
  replace('S.r(w, "birth/role", w.turn, mother.id, c.cell) < 0.1', 'S.r(w, "birth/role", w.turn, mother.id, c.cell) < 0.25');
  replace('    const list = candidates(w, ctx),', `    const matingMap=S.maps(w),usedMales=new Set();
    for(const queen of w.organisms){
      if(queen.species!=="swarm"||queen.role!=="queen"||queen.sperm?.uses>0||ctx.traits.get(queen.id)?.phase<3||queen.HP<70||queen.E<47)continue;
      const male=S.nearby(w,queen.cell).map(p=>matingMap.main.get(p)).filter(a=>a?.species==="swarm"&&a.role==="male"&&ctx.traits.get(a.id)?.phase>=3&&a.HP>=70&&a.E>=2&&!usedMales.has(a.id)&&S.oneStep(w,queen.cell,a.cell)).sort((a,b)=>S.hash(w,"colony/mate",w.turn,queen.id,a.id)-S.hash(w,"colony/mate",w.turn,queen.id,b.id))[0];
      if(!male)continue;queen.E=S.round(queen.E-2);male.E=S.round(male.E-2);S.dissipate(w,4);usedMales.add(male.id);
      queen.sperm={uses:12,father:{id:male.id,dna:{...male.dna},birthWeights:male.birthWeights.slice(),generation:male.generation}};
      w.colonyMating??={matings:0,storedBirths:0};w.colonyMating.matings++;
    }
    const list = candidates(w, ctx),`);
  replace('        if ([2, 3].includes(mains.length))', `        if([2,3].includes(mains.length))for(const mother of mains)
          if(mother.species==="swarm"&&mother.role==="queen"&&mother.sperm?.uses>0&&eligible(w,mother,ctx)&&mother.E>=40&&S.oneStep(w,mother.cell,cell))
            local.push({cell,slot:"main",kind:3,parents:[mother],fatherReference:mother.sperm.father,costs:[40],species:mother.species});
        if ([2, 3].includes(mains.length))`);
  replace('mother.sex === "female" &&\n              eligible(w, mother, ctx)', 'mother.sex === "female" && !(mother.species === "swarm" && mother.sperm?.uses>0) &&\n              eligible(w, mother, ctx)');
  replace('father = c.parents[1] || mother,', 'father = c.parents[1] || c.fatherReference || mother,');
  replace('Math.max(...c.parents.map((o) => o.generation)) + 1', 'Math.max(...c.parents.map((o) => o.generation),father.generation) + 1');
  replace('parents: c.parents.map((o) => o.id),', 'parents: c.fatherReference ? [mother.id,father.id] : c.parents.map((o) => o.id),');
  replace('(c.kind === 1 ? 4 : 2)', '([1,3].includes(c.kind) ? 4 : 2)');
  replace('    return o;', '    if(c.kind===3){mother.sperm.uses--;w.colonyMating.storedBirths++;}\n    return o;');
 }
 return s;
};
