'use strict';
// Baseline: git show 760ab68:lifegame-desktop/src/ecology/observation-modules.js
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),modelFile=path.join(root,'src/ecology/observation-model.js');
const staticFile=process.argv[2]||'/tmp/cell-initial-old-modules.js',oldModule=new Module(staticFile,module);oldModule.filename=staticFile;oldModule._compile(fs.readFileSync(staticFile,'utf8'),staticFile);
const baseline=new Module(modelFile,module);baseline.filename=modelFile;baseline.paths=module.paths;
const normal=baseline.require.bind(baseline);baseline.require=id=>id==='./observation-modules.js'?oldModule.exports:normal(id);baseline._compile(fs.readFileSync(modelFile,'utf8'),modelFile);
const current=require(path.join(root,'src/ecology/observation-model.js')),O=require(path.join(root,'src/ecology/observations.js'));
const archiveFile=path.join(root,'src/ecology/archive.js'),oldArchiveModule=new Module(archiveFile,module);oldArchiveModule.filename=archiveFile;oldArchiveModule.paths=module.paths;
oldArchiveModule._compile(fs.readFileSync(process.argv[3]||'/tmp/cell-initial-old-archive.js','utf8'),archiveFile);
const data=x=>JSON.stringify(x),hash=x=>crypto.createHash('sha256').update(data(x)).digest('hex');
const configs=[require('../cell-foundation-v1/old-boundary.json').config,{seed:'legacy-initial-audit',width:40,height:28,initial:24,lineages:'few',landscape:'templates',mapId:'river',ecologyRevision:'observation/4.1',ageModel:'life/1'}];
const result=[];
for(const config of configs){
 const old=baseline.exports.model(config.advantageSettings),next=current.model(config.advantageSettings),a=old.create(config),b=next.create(config),historyA=O.create(a.config,'parity',{species:old.S.activeSpecies(a)}),historyB=O.create(b.config,'parity',{species:next.S.activeSpecies(b)}),states=[];
 let w=a,v=b;
 for(let t=0;t<=2;t++){
  assert.equal(hash(w),hash(v),'complete legacy state T'+t);assert.deepEqual(next.invariants(v),[]);historyA.append(w);historyB.append(v);states.push({turn:t,hash:hash(v)});
  if(t<2){w=old.step(w);v=next.step(v);}
 }
 assert.equal(hash(historyA.snapshot()),hash(historyB.snapshot()));assert.equal(historyA.csv(),historyB.csv());
 const row={seed:config.seed,states,fullJSON:true,observations:true,CSV:true};
 if(config.seed==='cohort-b'){
  const signature='64732bea91afeb9ea38949be2f6a2a71b8d698650a41ca7cddaf30c5ebf27037',archive=oldArchiveModule.exports.create({getItem:()=>null,setItem(){}},old,signature),snapshot=historyA.snapshot();snapshot.metadata.version=signature;
  const record=archive.capture(w,'manual',snapshot);
  archive.replayRecord(record);const forged=structuredClone(record);forged.config.cellModel='cell-reorganization/1';forged.observation.metadata.config=structuredClone(forged.config);
  let message;try{archive.replayRecord(forged);}catch(e){message=e.message;}
  assert.match(message,/保存されたマス観測/);row.baselineForgedRejection=message;
 }
 result.push(row);
}
console.log(JSON.stringify({baseline:'760ab68',cases:result,success:true},null,2));
