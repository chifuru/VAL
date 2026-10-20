'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const variants=['baseline','grass-sense','grass-move','grass-both','grass-swift','fungus-half','fungus-quarter','joint'];
function transform(name,source,variant){
  if(variant==='joint')return transform(name,transform(name,source,'grass-swift'),'fungus-quarter');
  function change(from,to){if(source.split(from).length!==2)throw Error(name+': private anchor changed');source=source.replace(from,to);}
  if(['grass-sense','grass-both','grass-swift'].includes(variant)&&name==='state')change('        : 1,\n      speed: main','        : (s.id === "grassbug" ? 2 : 1),\n      speed: main');
  if(variant==='grass-swift'&&name==='state')change(': s.group === "prey" ? 1 : 0,',': s.group === "prey" ? (s.id === "grassbug" && phase >= 2 ? 2 : 1) : 0,');
  if(['grass-move','grass-both','grass-swift'].includes(variant)&&name==='behavior')change('(s.group === "main" ? 0.65 : 1) *','(s.group === "main" ? 0.65 : s.id === "grassbug" ? .4 : 1) *');
  if(variant.startsWith('fungus-')&&name==='state')change('maintenance:\n        s.maintenance *','maintenance:\n        s.maintenance * (s.id === "fungus" ? '+(variant==='fungus-half'?'.5':'.25')+' : 1) *');
  return source;
}
function model(variant='baseline'){
  if(!variants.includes(variant))throw Error('unknown private variant');
  const original=fs.readFileSync,base=path.join(root,'src/ecology')+path.sep,sources={};
  fs.readFileSync=function(file,...args){const value=original.call(fs,file,...args);if(!String(file).startsWith(base))return value;const name=path.basename(String(file),'.js'),changed=transform(name,String(value),variant);sources[name]={base:sha(value),private:sha(changed)};return Buffer.isBuffer(value)?Buffer.from(changed):changed;};
  try{const E=require(path.join(root,'design/advantage-switches/model.cjs')).model();return {E,sources};}finally{fs.readFileSync=original;}
}
module.exports={model,transform,variants,root,sha};
