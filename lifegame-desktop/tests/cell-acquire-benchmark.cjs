'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),worldFile=process.argv[2],outputFile=process.argv[3],oldModules=process.argv[4];
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
let acquireMs=0,calls=0,requests=0,decomposeRequests=0,distinctDecomposers=0,lightRows=0;
const acquire=E.N.CellResources.acquire;
E.N.CellResources.acquire=function(world,ctx,...args){
 const start=performance.now(),result=acquire(world,ctx,...args);acquireMs+=performance.now()-start;calls++;
 const decomposition=args[0].filter(r=>r.kind==='decompose');requests+=args[0].length;decomposeRequests+=decomposition.length;distinctDecomposers+=new Set(decomposition.map(r=>r.actor)).size;lightRows+=ctx.cellResources.light.length;
 return result;
};
const start=performance.now(),next=E.step(w),stepMs=performance.now()-start;
assert.deepEqual(E.invariants(next),[]);assert.equal(next.turn,501);assert.equal(hash(JSON.stringify(w)),initialHash);
const result={model:oldModules?'baseline':'candidate',startingTurn:w.turn,turn:next.turn,stepMs,acquireMs,calls,requests,decomposeRequests,distinctDecomposers,lightRows,
 startingWorldHash:initialHash,worldHash:hash(JSON.stringify(next)),observationHash:hash(JSON.stringify(next.observation)),fingerprint:E.fingerprint(next),invariants:[],
 organisms:next.organisms.length,corpses:next.carcasses.length};
fs.writeFileSync(outputFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
