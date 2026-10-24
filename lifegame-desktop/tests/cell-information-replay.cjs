'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const oldModules=process.argv[2];if(!oldModules)throw Error('Pass the 6713775 generated modules.');
const file=path.resolve(__dirname,'../src/ecology/observation-model.js'),compiled=new Module(oldModules,module);compiled.filename=oldModules;compiled._compile(fs.readFileSync(oldModules,'utf8'),oldModules);
const baseline=new Module(file,module);baseline.filename=file;baseline.paths=module.paths;const normal=baseline.require.bind(baseline);baseline.require=id=>id==='./observation-modules.js'?compiled.exports:normal(id);baseline._compile(fs.readFileSync(file,'utf8'),file);
const M=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),A=require('../src/ecology/archive.js'),F=require('./cell-archive-fixture.cjs');
require('../src/ecology/replay-version.js');const current=globalThis.EcoReplayVersion,oldSignature='b76f5c4fd56870ed550f35eb16992be542f747f2adb27f5f49ba35680bf7a19d',hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const old=baseline.exports.model(F.config.advantageSettings),next=M.model(F.config.advantageSettings);let w=old.create(F.config),v=next.create(F.config);
const history=O.create(w.config,oldSignature,{species:old.S.activeSpecies(w)}),updated=O.create(v.config,current,{species:next.S.activeSpecies(v)});const states=[];
for(let t=0;t<=3;t++){
 assert.equal(hash(w),hash(v),'complete source world T'+t);assert.deepEqual(next.invariants(v),[]);history.append(w);updated.append(v);states.push({turn:t,hash:hash(v)});
 if(t<3){w=old.step(w);v=next.step(v);}
}
assert.equal(hash(history.snapshot().rows),hash(updated.snapshot().rows));
let raw=null;const storage={getItem:()=>raw,setItem:(_,s)=>{raw=s;}},oldArchive=A.create(storage,old,oldSignature),record=oldArchive.capture(w,'user',history.snapshot());oldArchive.save(record);
const bytes=raw,archive=A.create(storage,next,current),entry=archive.replay(record.id);let again=next.create(entry.config);for(let t=0;t<entry.turn;t++)again=next.step(again);
assert.equal(next.fingerprint(again),record.finalFingerprint);assert.equal(hash(again),hash(w));assert.equal(raw,bytes);assert.equal(archive.list().length,1);
const incompatible=structuredClone(record);incompatible.signature='c7b6198bf4f96dabd400a3b131a50859210ca21b8618183228712407d16a6721';incompatible.observation.metadata.version=incompatible.signature;assert.throws(()=>archive.replayRecord(incompatible),/計算版/);
const fresh=archive.capture(v,'user',updated.snapshot());assert.equal(fresh.signature,current);assert.equal(fresh.observation.metadata.version,current);assert.equal(archive.validateFullRecord(fresh).id,fresh.id);
console.log(JSON.stringify({baseline:'6713775',success:true,oldSignature,currentSignature:current,states,rowsEqual:true,oldReplayIdentical:true,oldRecordBytesUnchanged:true,noAutoSave:true,newRecordKeepsRawSignature:true,incompatibleBiologicalVersionRejected:true},null,2));
