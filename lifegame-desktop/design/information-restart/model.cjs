/* Private experiment. Production code and replay signatures are unchanged. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const file=path.resolve(__dirname,'../../src/ecology/observation-model.js'),localRequire=createRequire(file),baselineModule={exports:{}};
vm.runInThisContext('(function(module){'+require('node:zlib').gunzipSync(fs.readFileSync(path.join(__dirname,'before-modules.cjs.gz'))).toString()+'\n})')(baselineModule);
const originalModules=baselineModule.exports;
function replace(source,before,after){if(!source.includes(before))throw Error('Private transform no longer matches current source');return source.replace(before,after);}
function model(variant='current',flags){
 if(!['current','imprint','footprint'].includes(variant))throw Error('Unknown private variant');
 const modules={...originalModules,functions:originalModules.functions.map(fn=>{
  let s=fn.toString();
  if(variant!=='current' && s.includes('function infoCandidates(w, ctx)')){
   s=replace(s,'if (c.growth) {\n        if (!w.resources.includes(c.growth) || !c.growth.event) continue;', 'if (c.growth && !w.resources.includes(c.growth)) continue;\n      if (c.growth?.event) {');
  }
  if(variant!=='current' && s.includes('function expireAndCA(w, ctx)')){
   s=replace(s,'(!old.event ||\n            old.event.id !== c.event?.id ||\n            S.stable(old.event) !== S.stable(c.event))','old.event && (old.event.id !== c.event?.id ||\n            S.stable(old.event) !== S.stable(c.event))');
   s=replace(s,'if (old) {\n          old.q += c.q;', 'if (old) {\n          if(c.kind === "info" && !old.event) old.event=structuredClone(c.event);\n          old.q += c.q;');
   if(variant==='footprint')s=replace(s,'const cells = byKind.get(kind) || new Set();',`const cells = new Set(byKind.get(kind) || []);
      // Experience traces are a latent field, not free physical food or energy.
      if(kind === "info") for(const event of w.messages){
        const source=m.byId.get(event.sourceId);
        if(event.expires>w.turn && w.turn-event.time<8 && event.values?.length &&
          source && S.distance(w,event.cell,source.cell)<=1 && !w.tiles[event.cell].blocked)
          cells.add(event.cell);
      }`);
  }
  return s===fn.toString()?fn:vm.runInThisContext('('+s+')',{filename:'private-information-'+variant+'.cjs'});
 })};
 const mod={exports:{}};vm.runInThisContext('(function(require,module){'+fs.readFileSync(file,'utf8')+'\n})',{filename:'private-observation-model.cjs'})(id=>id==='./observation-modules.js'?modules:localRequire(id),mod);return mod.exports.model(flags);
}
module.exports={model};
