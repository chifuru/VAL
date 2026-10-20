'use strict';
// Rejected private comparisons only. No production sources are written.
const historical=require('./fungus-measured-source-delta.json');
module.exports=function transform(name,source,variant){
  if(variant==='fungus')for(const edit of historical.sources[name]?.replacements||[]){if(source.split(edit.from).length!==2)throw Error('Historical loaded source contract moved: '+name);source=source.replace(edit.from,edit.to);}
  function change(from,to){if(source.split(from).length!==2)throw Error('Frozen source contract moved: '+variant+'/'+name);source=source.replace(from,to);}
  if(variant==='rarity'&&name==='reproduction')change('      density=group==="prey"?Math.min(localDensity,counts.prey.size/area*2):localDensity,',`      rarity=group==="prey"?(()=>{
        const cache=ctx.diagnosticPreyRarity??=new Map();
        if(!cache.has(o.species)){
          const habitat=new Set(w.tiles.flatMap((_,cell)=>S.validHabitat(w,S.spec(o),cell)?[cell]:[])),
            population=w.organisms.filter(a=>a.species===o.species&&habitat.has(a.cell)).length;
          cache.set(o.species,{population,area:Math.max(1,habitat.size)});
        }
        return cache.get(o.species);
      })():null,
      density=group==="prey"?Math.min(localDensity,rarity.population/rarity.area*2):localDensity,`);
  if(variant==='risk'&&name==='behavior')change('    const result = Math.min(1, t);','    const result = w.config.balanceModel==="survival/2"&&o.species==="grassbug"?t/(1+t):Math.min(1,t);');
  if(variant==='fungus'&&name==='nutrition')change('          keep =\n            s.group === "plant" && o.B < 4','          keep =\n            s.id === "fungus" && o.phase===2 && hasBirth && (o.B < 3 || o.M < .2) ? 2 :\n            s.group === "plant" && o.B < 4');
  return source;
};
