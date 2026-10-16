"use strict";
// Compile the existing isolated experiment under a separate filename/cache.
// Production and the archived v2 generator remain unchanged.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const file=path.join(__dirname,'isolated-model.cjs'),m=new Module(file,module);
m.filename=file;m.paths=module.paths;
const source=fs.readFileSync(path.join(__dirname,'../ecosystem-foundation/model.cjs'),'utf8')
 .replace('require("./parasite-routes.cjs")','require("../ecosystem-foundation/parasite-routes.cjs")');
m._compile(source,file);module.exports=m.exports;
