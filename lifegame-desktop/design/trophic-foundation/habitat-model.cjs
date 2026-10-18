'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),original=require('../renewal-screen-v2/model.cjs');
function model(flags={}){
 if(!flags.allocation)return original.model(flags);
 const cache=new Map(),root=path.resolve(__dirname,'../../src/ecology');
 function load(name){
  if(cache.has(name))return cache.get(name).exports;
  const file=path.join(root,name+'.js'),m=new Module(file,module);cache.set(name,m);m.filename=file;m.paths=module.paths;
  let source=fs.readFileSync(file,'utf8');
  if(name==='state'){
   const start=source.indexOf('    // Allocate within each group only;'),end=source.indexOf('    let mains =',start);
   if(start<0||end<0)throw Error('Allocation source contract moved');
   source=source.slice(0,start)+fs.readFileSync(path.join(__dirname,'../renewal-screen-v2/allocation.txt'),'utf8')+source.slice(end);
  }
  if(name==='behavior'){
   const from='occupied.has(cell) ||';if(source.split(from).length!==2)throw Error('Movement source contract moved');
   source=source.replace(from,'occupied.has(cell) || !S.validHabitat(w, s, cell) ||');
  }
  const normal=m.require.bind(m);m.require=id=>/^\.\/[^/]+\.js$/.test(id)?load(id.slice(2,-3)):normal(id);m._compile(source,file);return m.exports;
 }
 return load('engine');
}
module.exports={model};
