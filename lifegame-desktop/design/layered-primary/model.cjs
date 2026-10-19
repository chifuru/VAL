'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),control=require('../trophic-foundation/habitat-model.cjs');
function model(options={}){
 if(!options.allocation || options.layered===false)return control.model({allocation:!!options.allocation});
 const cache=new Map(),root=path.resolve(__dirname,'../../src/ecology');
 function change(source,from,to){if(source.split(from).length!==2)throw Error('Layer source contract moved: '+from);return source.replace(from,to);}
 function load(name){
  if(cache.has(name))return cache.get(name).exports;
  const file=path.join(root,name+'.js'),m=new Module(file,module);cache.set(name,m);m.filename=file;m.paths=module.paths;
  let source=fs.readFileSync(file,'utf8');
  if(name==='catalogue')source=source.replaceAll('group: "prey",\n        slot: "food",','group: "prey",\n        slot: "prey",');
  if(name==='state'){
   const start=source.indexOf('    // Allocate within each group only;'),end=source.indexOf('    let mains =',start);if(start<0||end<0)throw Error('Allocation source contract moved');
   source=source.slice(0,start)+fs.readFileSync(path.join(__dirname,'../renewal-screen-v2/allocation.txt'),'utf8')+source.slice(end);
   source=change(source,'food = new Map(),','food = new Map(), prey = new Map(),');
   source=change(source,'if(o.slot === "food"){o.age=','if(o.slot !== "main"){o.age=');
   source=change(source,'(o.slot === "main" ? main : food).set(o.cell, o);','(o.slot === "main" ? main : o.slot === "prey" ? prey : food).set(o.cell, o);');
   source=change(source,'return { main, food, byId, resources, carcasses };','return { main, food, prey, byId, resources, carcasses };');
  }
  if(name==='behavior'){
   source=change(source,'occupied.has(cell) ||','occupied.has(cell) || !S.validHabitat(w, s, cell) ||');
   source=change(source,'o.slot === "main" ? m.main : m.food','o.slot === "main" ? m.main : m.prey');
   source=change(source,'for (const target of [main, food])','for (const target of [main, m.prey.get(cell)])');
   source=change(source,'[m.main.get(p), m.food.get(p)]','[m.main.get(p), m.prey.get(p)]');
   source=change(source,'o.slot === "main" ? v.m.main : v.m.food','o.slot === "main" ? v.m.main : v.m.prey');
   source=change(source,'const prey = v.m.food.get(cell);','const prey = v.m.prey.get(cell);');
  }
  if(name==='reproduction'){
   source=change(source,'near.map((p) => m.food.get(p)).filter(Boolean)','near.flatMap((p) => [m.food.get(p), m.prey.get(p)]).filter(Boolean)');
   source=change(source,'      if (!m.food.has(cell))\n        for (const s of enabledSpecies)','      for (const s of enabledSpecies)');
   source=change(source,'          if (!S.validHabitat(w, s, cell)) continue;','          if ((s.slot === "prey" ? m.prey : m.food).has(cell) || !S.validHabitat(w, s, cell)) continue;');
   source=change(source,'slot: "food",\n                kind: 2,','slot: s.slot,\n                kind: 2,');
   source=change(source,'for (const slot of ["main", "food"])','for (const slot of ["main", "food", "prey"])');
  }
  if(name==='parasites')source=change(source,'[m.main.get(cell), m.food.get(cell)]','[m.main.get(cell), m.food.get(cell), m.prey.get(cell)]');
  if(name==='engine'){
   source=change(source,'food = new Set(),','food = new Set(), prey = new Set(),');
   source=change(source,'[map.main.get(cell),map.food.get(cell)]','[map.main.get(cell),map.food.get(cell),map.prey.get(cell)]');
   source=change(source,'const occupied = o.slot === "main" ? main : food;','const occupied = o.slot === "main" ? main : o.slot === "prey" ? prey : food;');
  }
  const normal=m.require.bind(m);m.require=id=>/^\.\/[^/]+\.js$/.test(id)?load(id.slice(2,-3)):normal(id);m._compile(source,file);return m.exports;
 }
 const E=load('engine');if(E.S.D.species.filter(s=>s.group==='prey').some(s=>s.slot!=='prey'))throw Error('Prey slot contract moved');return E;
}
module.exports={model};
