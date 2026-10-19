'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
function model(){
 const file=path.resolve(__dirname,'../layered-primary/model.cjs'),from="let source=fs.readFileSync(file,'utf8');";
 let source=fs.readFileSync(file,'utf8');if(source.split(from).length!==2)throw Error('Layer loader contract moved');
 source=source.replace(from,from+' source=require('+JSON.stringify(path.join(__dirname,'transform.cjs'))+')(name,source);');
 const m=new Module(file,module);m.filename=file;m.paths=module.paths;m._compile(source,file);return m.exports.model({allocation:true});
}
module.exports={model};
