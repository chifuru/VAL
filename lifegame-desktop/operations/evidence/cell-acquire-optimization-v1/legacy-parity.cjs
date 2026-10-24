'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),file=path.join(root,'src/ecology/observation-model.js'),staticFile=process.argv[2]||'/tmp/cell-turn-old-modules.js',compiled=new Module(staticFile,module);compiled.filename=staticFile;compiled._compile(fs.readFileSync(staticFile,'utf8'),staticFile);
const baseline=new Module(file,module);baseline.filename=file;baseline.paths=module.paths;const normal=baseline.require.bind(baseline);baseline.require=id=>id==='./observation-modules.js'?compiled.exports:normal(id);baseline._compile(fs.readFileSync(file,'utf8'),file);
const M=require(path.join(root,'src/ecology/observation-model.js')),O=require(path.join(root,'src/ecology/observations.js')),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const configs=[require('../cell-foundation-v1/old-boundary.json').config,{seed:'legacy-cell-turn',width:40,height:28,initial:24,lineages:'few',landscape:'templates',mapId:'river',ecologyRevision:'observation/4.1',ageModel:'life/1'}],cases=[];
for(const config of configs){
 const old=baseline.exports.model(config.advantageSettings),next=M.model(config.advantageSettings);let a=old.create(config),b=next.create(config);const ha=O.create(a.config,'parity',{species:old.S.activeSpecies(a)}),hb=O.create(b.config,'parity',{species:next.S.activeSpecies(b)}),states=[];
 for(let turn=0;turn<=2;turn++){assert.equal(hash(a),hash(b),'complete legacy T'+turn);ha.append(a);hb.append(b);states.push({turn,hash:hash(b)});if(turn<2){a=old.step(a);b=next.step(b);}}
 assert.equal(hash(ha.snapshot()),hash(hb.snapshot()));assert.equal(ha.csv(),hb.csv());cases.push({seed:config.seed,states,allJSONAndObservationsAndCSV:true});
}
console.log(JSON.stringify({baseline:'2ae71d0',success:true,cases},null,2));
