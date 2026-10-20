"use strict";
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),crypto=require("node:crypto");
const entry=path.join(__dirname,"diagnose.cjs"),original=fs.readFileSync(entry,"utf8"),variants={baseline:{escape:false,reserve:false},combined:{escape:true,reserve:true}},sharedDirectory=path.join(__dirname,"comparison-source"),root=path.resolve(__dirname,"../../../..");
if(!fs.existsSync(sharedDirectory)){fs.mkdirSync(sharedDirectory);const sources={};for(const name of fs.readdirSync(path.join(root,"src/ecology")).filter(n=>n.endsWith(".js")&&!["observation-modules.js","observation-model.js","replay-version.js"].includes(n))){const data=fs.readFileSync(path.join(root,"src/ecology",name));fs.writeFileSync(path.join(sharedDirectory,name),data);sources[name]=crypto.createHash("sha256").update(data).digest("hex");}fs.writeFileSync(path.join(sharedDirectory,"source-sha256.json"),JSON.stringify({createdAt:new Date().toISOString(),files:sources},null,2));}
const frozen=JSON.parse(fs.readFileSync(path.join(sharedDirectory,"source-sha256.json")));for(const [name,sha]of Object.entries(frozen.files))if(crypto.createHash("sha256").update(fs.readFileSync(path.join(sharedDirectory,name))).digest("hex")!==sha)throw Error("Frozen source changed: "+name);
for(const [variant,options]of Object.entries(variants)){
  let source=original.replace('E=require(path.join(root,"src/ecology/observation-model.js")).model()',`E=require(${JSON.stringify(path.join(__dirname,"source-model.cjs"))}).model(${JSON.stringify({...options,sharedDirectory})})`)
    .replace('"baseline-diagnosis.json"',JSON.stringify(variant+"-50.json"))
    .replaceAll('balanceModel:"survival/1"','balanceModel:"survival/2"')
    .replace('config:r.request','config:{...r.request,balanceModel:"survival/2"}')
    .replace('model:"survival/1",turns:50','model:"survival/2",variant:'+JSON.stringify(variant)+',options:'+JSON.stringify(options)+',turns:50');
  const inject='\nObject.assign(sourceSHA,E.diagnosticSourceSHA);\n';
  source=source.replace('function fixture(){',inject+'function fixture(){');
  const m=new Module(entry,module);m.filename=entry;m.paths=module.paths;m._compile(source,entry);
}
const rows=Object.keys(variants).map(name=>JSON.parse(fs.readFileSync(path.join(__dirname,name+"-50.json")))),comparison={definition:"i11b-lower-factorial/1",turns:50,variants:variants,results:rows[0].results.map((base,i)=>({id:base.id,variants:Object.fromEntries(rows.map(r=>{const x=r.results[i];return [r.variant,{main:x.final.main,counts:{grassbug:x.final.counts.grassbug,fungus:x.final.counts.fungus,waterbug:x.final.counts.waterbug},births:x.turns.at(-1).births,deaths:x.deaths,grassMove:x.metrics.grassbug.move,fungalDrops:x.metrics.fungus.drops,elapsedMs:x.elapsedMs}]}))}))};
fs.writeFileSync(path.join(__dirname,"comparison-50.json"),JSON.stringify(comparison,null,2));console.log(JSON.stringify(comparison,null,2));
