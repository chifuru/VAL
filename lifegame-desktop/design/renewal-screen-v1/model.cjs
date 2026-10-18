'use strict';
// Private source compilation only. Production files and require cache stay intact.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const KEYS=['reserve','uptake','sparse'];
function model(flags={}){
 for(const k of Object.keys(flags))if(!KEYS.includes(k)||typeof flags[k]!=='boolean')throw Error('Unknown trial flag: '+k);
 const cache=new Map(),root=path.resolve(__dirname,'../../src/ecology');
 function replace(source,from,to){if(source.split(from).length!==2)throw Error('Renewal source contract moved: '+from);return source.replace(from,to);}
 function load(name){
  if(cache.has(name))return cache.get(name).exports;
  const file=path.join(root,name+'.js'),m=new Module(file,module);cache.set(name,m);m.filename=file;m.paths=module.paths;
  let source=fs.readFileSync(file,'utf8');
  if(name==='nutrition'&&flags.reserve)source=replace(source,'M = obj.B > 0 ? S.round((obj.M * B) / obj.B) : 0;',
   'M = obj.B > 0 ? S.round(Math.min(Math.max(0, obj.M - 0.25), (obj.M * B) / obj.B)) : 0;');
  if(name==='nutrition'&&flags.uptake)source=replace(source,'                0.1,\n                obj.soilM,','                0.4,\n                obj.soilM,');
  if(name==='reproduction'&&flags.sparse){
   source=replace(source,'? ![2, 3].includes(same.length)','? ![1, 2, 3].includes(same.length)');
   source=replace(source,': w.config.ecologyRevision === "observation/4.1" ? !(s.group === "fungus" ? [1,2,3] : [2,3]).includes(same.length) : same.length !== 3',
    ': w.config.ecologyRevision === "observation/4.1" ? ![1,2,3,4,5].includes(same.length) : same.length !== 3');
  }
  const normal=m.require.bind(m);m.require=id=>/^\.\/[^/]+\.js$/.test(id)?load(id.slice(2,-3)):normal(id);
  m._compile(source,file);return m.exports;
 }
 const E=load('engine');E.renewalFlags=Object.fromEntries(KEYS.map(k=>[k,!!flags[k]]));return E;
}
module.exports={model};
