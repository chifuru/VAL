'use strict';
// Exact old/new checkpoint comparisons; no natural trajectory replay.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),crypto=require('node:crypto');
const [baselineFile,temp,out]=process.argv.slice(2);if(!baselineFile||!temp||!out)throw Error('Pass baseline modules, retained directory, output.');
const generated=new Module(baselineFile,module);generated.filename=baselineFile;generated._compile(fs.readFileSync(baselineFile,'utf8'),baselineFile);
const file=path.resolve(__dirname,'../src/ecology/observation-model.js'),loader=new Module(file,module);loader.filename=file;loader.paths=module.paths;const normal=loader.require.bind(loader);loader.require=id=>id==='./observation-modules.js'?generated.exports:normal(id);loader._compile(fs.readFileSync(file,'utf8'),file);
const M=require('../src/ecology/observation-model.js'),A=require('../src/ecology/archive.js'),O=require('../src/ecology/observations.js'),prior='57332f90ee2f288108c8088893ad5eee1fed3fde790edeb8de693f45341cf20e',hash=x=>crypto.createHash('sha256').update(x).digest('hex'),results=[];
require('../src/ecology/replay-version.js');let first;
function measured(E,w){const timing={},calls={nearby:0,parents:0},reception=E.P.informationBegin,near=E.S.nearby,parents=E.S.PersistentInformation.parents;
 E.P.informationBegin=function(...args){const t=performance.now();try{return reception.apply(this,args);}finally{timing.informationBeginMs=performance.now()-t;}};
 E.S.nearby=function(...args){calls.nearby++;return near(...args);};E.S.PersistentInformation.parents=function(...args){calls.parents++;return parents(...args);};
 try{const t=performance.now(),next=E.step(w);return {world:next,kernelMs:performance.now()-t,...timing,calls};}finally{E.P.informationBegin=reception;E.S.nearby=near;E.S.PersistentInformation.parents=parents;}
}
for(const name of ['initial','terminal']){
 const bytes=fs.readFileSync(path.join(temp,name+'.json')),w=JSON.parse(bytes),before=JSON.stringify(w),old=loader.exports.model(w.config.advantageSettings),next=M.model(w.config.advantageSettings),a=measured(old,w),b=measured(next,w);
 assert.deepEqual(b.world,a.world);assert.equal(JSON.stringify(w),before);assert.deepEqual(next.invariants(b.world),[]);
 results.push({turn:w.turn,nextTurn:b.world.turn,fixtureSha256:hash(bytes),organisms:w.organisms.length,before:{kernelMs:a.kernelMs,informationBeginMs:a.informationBeginMs,calls:a.calls},after:{kernelMs:b.kernelMs,informationBeginMs:b.informationBeginMs,calls:b.calls},worldAndObservationEqual:true,inputUnchanged:true,fingerprint:next.fingerprint(b.world)});
 if(!first)first={w,old,next,end:a.world};
}
const h=O.create(first.w.config,prior,{species:first.old.S.activeSpecies(first.w)});h.append(first.w);h.append(first.end);const empty={getItem:()=>null,setItem:()=>{throw Error('Unexpected write');}},a=A.create(empty,first.old,prior),record=a.capture(first.end,'bounded',h.snapshot()),original=JSON.stringify(record),archive=A.create(empty,first.next,globalThis.EcoReplayVersion),replay=archive.replayRecord(record),again=first.next.step(first.next.create(replay.config));assert.equal(first.next.fingerprint(again),record.finalFingerprint);assert.equal(JSON.stringify(record),original);
const c=require('./cell-archive-fixture.cjs').config,old=loader.exports.model(c.advantageSettings),next=M.model(c.advantageSettings);assert.deepEqual(old.step(old.create(c)),next.step(next.create(c)));
fs.writeFileSync(out,JSON.stringify({baseline:'fb859a012c9e13c801f6a4e1f7b8e8610222c947',baselineModulesSha256:hash(fs.readFileSync(baselineFile)),signature:globalThis.EcoReplayVersion,results,priorNativeReplayEqual:true,priorRecordUnchanged:true,legacyCellBoundaryEqual:true,scope:'Two retained actual boundaries, one old/new turn each with method/call instrumentation. Single timing samples are not a stable throughput claim. No natural long-run replay.'},null,2)+'\n');console.log(JSON.stringify({success:true,results}));
