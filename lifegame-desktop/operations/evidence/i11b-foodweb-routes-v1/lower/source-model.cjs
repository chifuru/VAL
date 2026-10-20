"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),root=path.resolve(__dirname,"../../../..");
function model({escape=true,reserve=true,sharedDirectory=null,behaviorFile=null}={}){
  const original=fs.readFileSync,replacements=new Map(),sourceSHA={};
  if(sharedDirectory)for(const name of fs.readdirSync(sharedDirectory).filter(n=>n.endsWith(".js")))replacements.set(path.join(root,"src/ecology",name),path.join(sharedDirectory,name));
  if(!escape)replacements.set(path.join(root,"src/ecology/behavior.js"),path.join(__dirname,"before-behavior.js"));
  if(behaviorFile)replacements.set(path.join(root,"src/ecology/behavior.js"),behaviorFile);
  if(!reserve)replacements.set(path.join(root,"src/ecology/nutrition.js"),path.join(__dirname,"before-nutrition.js"));
  fs.readFileSync=function(file,...args){const value=original.call(fs,replacements.get(String(file))||file,...args);if(String(file).startsWith(path.join(root,"src/ecology")+path.sep))sourceSHA[path.basename(String(file),".js")]=crypto.createHash("sha256").update(value).digest("hex");return value;};
  try{const E=require(path.join(root,"design/advantage-switches/model.cjs")).model();Object.defineProperty(E,"diagnosticSourceSHA",{value:sourceSHA});return E;}finally{fs.readFileSync=original;}
}
module.exports={model};
