"use strict";
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),assert=require("node:assert/strict"),entry=path.join(__dirname,"diagnose.cjs"),original=fs.readFileSync(entry,"utf8");
for(const variant of ["before","after"]){const options={escape:true,reserve:true,...(variant==="before"?{behaviorFile:path.join(__dirname,"comparison-source/behavior.js")}:{})};
  const source=original.replace('E=require(path.join(root,"src/ecology/observation-model.js")).model()',`E=require(${JSON.stringify(path.join(__dirname,"source-model.cjs"))}).model(${JSON.stringify(options)})`)
    .replace('"baseline-diagnosis.json"',JSON.stringify("ray-"+variant+"-50.json")).replaceAll('balanceModel:"survival/1"','balanceModel:"survival/2"')
    .replace('config:r.request','config:{...r.request,balanceModel:"survival/2"}').replace('for(const task of cases){','for(const task of cases.filter(c=>c.id==="river-0")){')
    .replace('model:"survival/1",turns:50','model:"survival/2",variant:'+JSON.stringify("ray-"+variant)+',turns:50').replace('function fixture(){','Object.assign(sourceSHA,E.diagnosticSourceSHA);\nfunction fixture(){');
  const m=new Module(entry,module);m.filename=entry;m.paths=module.paths;m._compile(source,entry);
}
const before=JSON.parse(fs.readFileSync(path.join(__dirname,"ray-before-50.json"))),after=JSON.parse(fs.readFileSync(path.join(__dirname,"ray-after-50.json")));
for(const name of Object.keys(before.sourceSHA))if(!["behavior","observation-modules","replay-version"].includes(name))assert.equal(before.sourceSHA[name],after.sourceSHA[name],"Shared source changed: "+name);
fs.writeFileSync(path.join(__dirname,"ray-fix-comparison-50.json"),JSON.stringify({definition:"i11b-ray-fix-paired/1",commonSourcesMatched:true,beforeSource:before.sourceSHA,afterSource:after.sourceSHA,results:[before,after].map(r=>({variant:r.variant,id:r.results[0].id,final:r.results[0].turns.at(-1),deaths:r.results[0].deaths,metrics:r.results[0].metrics,elapsedMs:r.results[0].elapsedMs}))},null,2));
