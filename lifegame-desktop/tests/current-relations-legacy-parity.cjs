/* Explicit short boundary comparison. Pass generated modules from CS04's parent. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const input=process.argv[2];if(!input)throw Error('Pass the 884e2a0 generated modules.');
const generated=new Module(input,module);generated.filename=input;generated._compile(fs.readFileSync(input,'utf8'),input);
const file=path.resolve(__dirname,'../src/ecology/observation-model.js'),loader=new Module(file,module);loader.filename=file;loader.paths=module.paths;
const normal=loader.require.bind(loader);loader.require=id=>id==='./observation-modules.js'?generated.exports:normal(id);loader._compile(fs.readFileSync(file,'utf8'),file);
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),F=require('./cell-archive-fixture.cjs');
require('../src/ecology/replay-version.js');const current=globalThis.EcoReplayVersion,previous='f56d08f2c07ba4174f5b902d69c7781d47ad8dbf9f1d514598d36fb443a142fd',hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const configs=[F.config,require('../operations/evidence/cell-foundation-v1/old-boundary.json').config,
 {seed:'legacy-cell-turn',width:40,height:28,initial:24,lineages:'few',landscape:'templates',mapId:'river',ecologyRevision:'observation/4.1',ageModel:'life/1'}],cases=[];
for(const config of configs){
 const old=loader.exports.model(config.advantageSettings),next=M.model(config.advantageSettings);let a=old.create(config),b=next.create(config);
 const ha=O.create(a.config,previous,{species:old.S.activeSpecies(a)}),hb=O.create(b.config,current,{species:next.S.activeSpecies(b)}),states=[];
 for(let t=0;t<=2;t++){
  assert.equal(hash(a),hash(b),'unchanged path T'+t);ha.append(a);hb.append(b);assert.deepEqual(next.invariants(b),[]);states.push({turn:t,hash:hash(b)});
  if(t<2){a=old.step(a);b=next.step(b);}
 }
 assert.deepEqual(ha.snapshot().rows,hb.snapshot().rows);assert.equal(ha.csv().replaceAll(previous,current),hb.csv());
 let raw=null;const store={getItem:()=>raw,setItem:(_,s)=>{raw=s;}},oldArchive=A.create(store,old,previous),record=oldArchive.capture(a,'user',ha.snapshot());oldArchive.save(record);
 const bytes=raw,archive=A.create(store,next,current),entry=archive.replay(record.id);let again=next.create(entry.config);for(let t=0;t<entry.turn;t++)again=next.step(again);
 assert.equal(hash(again),hash(a));assert.equal(raw,bytes);assert.equal(archive.list().length,1);
 cases.push({seed:config.seed,cell:config.cellModel??null,states,worldsAndRowsEqual:true,csvEqualExceptRawSignature:true,oldReplayEqual:true,originalBytesUnchanged:true});
}
console.log(JSON.stringify({baseline:'884e2a038ed7c4f0a385de3ba19c6a7c3284feaa',currentSignature:current,success:true,cases},null,2));
