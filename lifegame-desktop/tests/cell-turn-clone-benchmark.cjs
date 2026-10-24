'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),worldFile=process.argv[2],outputFile=process.argv[3],mode=process.argv[4]||'baseline';
const candidate=mode==='--candidate',oldModules=candidate||mode==='baseline'?null:mode;
if(!worldFile||!outputFile)throw Error('Pass the retained terminal world and result path; this check never regenerates 500 turns.');
let M=require('../src/ecology/observation-model.js');
if(oldModules){
 const file=path.join(root,'src/ecology/observation-model.js'),compiled=new Module(oldModules,module);
 compiled.filename=oldModules;compiled._compile(fs.readFileSync(oldModules,'utf8'),oldModules);
 const baseline=new Module(file,module);baseline.filename=file;baseline.paths=module.paths;
 const normal=baseline.require.bind(baseline);baseline.require=id=>id==='./observation-modules.js'?compiled.exports:normal(id);
 baseline._compile(fs.readFileSync(file,'utf8'),file);M=baseline.exports;
}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),bytes=fs.readFileSync(worldFile),initialHash=hash(bytes),w=JSON.parse(bytes),E=M.model(w.config.advantageSettings);
const report=require('../operations/evidence/cell-long-observation-v1/report.json');
assert.equal(w.turn,500);assert.equal(E.fingerprint(w),report.fingerprint);assert.deepEqual(E.invariants(w),[]);
const nativeClone=globalThis.structuredClone,cloneCandidate=candidate?require('./cell-turn-clone-candidate.cjs'):null;
let substitutions=0,job,prepareMs;
if(candidate)globalThis.structuredClone=source=>{
 if(substitutions===0&&source?.organisms&&source?.config?.cellModel&&Object.hasOwn(source,'tiles')&&source.tiles===undefined){
  substitutions++;return cloneCandidate(source,nativeClone);
 }
 return nativeClone(source);
};
const start=performance.now();
try{job=E.beginTurn(w);prepareMs=performance.now()-start;}finally{globalThis.structuredClone=nativeClone;}
if(candidate)assert.equal(substitutions,1,'The explicit candidate must replace only the turn-root clone.');
let turnResult;do{turnResult=job.advance();}while(!turnResult.done);
const next=turnResult.world,stepMs=performance.now()-start;
assert.deepEqual(E.invariants(next),[]);assert.equal(next.turn,501);assert.equal(hash(JSON.stringify(w)),initialHash);
const result={model:candidate?'candidate':'baseline',startingTurn:w.turn,turn:next.turn,stepMs,prepareMs,
 startingWorldHash:initialHash,worldHash:hash(JSON.stringify(next)),observationHash:hash(JSON.stringify(next.observation)),fingerprint:E.fingerprint(next),invariants:[],
 organisms:next.organisms.length,corpses:next.carcasses.length};
fs.writeFileSync(outputFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
