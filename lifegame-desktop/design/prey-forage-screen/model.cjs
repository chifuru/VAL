'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
function model(forage=false){
 const cache=new Map(),root=path.resolve(__dirname,'../../src/ecology');
 function load(name){
  if(cache.has(name))return cache.get(name).exports;
  const file=path.join(root,name+'.js'),m=new Module(file,module);cache.set(name,m);m.filename=file;m.paths=module.paths;
  let source=fs.readFileSync(file,'utf8');
  if(name==='behavior'&&forage){
   const from=': quality(w, o, to, v);';
   if(source.split(from).length!==2)throw Error('Forage source contract moved');
   source=source.replace(from,`: s.group === "prey" && ["move", "stop"].includes(c.type)
            ? Math.max(quality(w, o, to, v), ...S.nearby(w, to)
                .filter(cell => v.visibleCells.has(cell) && S.oneStep(w, to, cell)
                  && v.m.food.has(cell) && S.spec(v.m.food.get(cell)).group === "plant")
                .map(cell => quality(w, o, cell, v)))
            : quality(w, o, to, v);`);
  }
  const normal=m.require.bind(m);m.require=id=>/^\.\/[^/]+\.js$/.test(id)?load(id.slice(2,-3)):normal(id);m._compile(source,file);return m.exports;
 }
 return load('engine');
}
module.exports={model};
