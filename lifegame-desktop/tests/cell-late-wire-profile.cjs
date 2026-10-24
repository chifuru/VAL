'use strict';
// Optional reproduction of the baseline-only transfer measurement. No optimization.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{performance}=require('node:perf_hooks'),M=require('../src/ecology/observation-model.js'),T=require('../src/ecology/transport.js');
const [worldFile,out]=process.argv.slice(2);if(!worldFile||!out)throw Error('Pass retained world and output.');
const initial=JSON.parse(fs.readFileSync(worldFile)),E=M.model(initial.config.advantageSettings),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),original=hash(initial),setup=performance.now(),encode=T.encoder(initial),encoderSetupMs=performance.now()-setup;let base=initial;
const job=E.beginTurn(initial),phases=[];let result;
do{
 result=job.advance();const t=performance.now(),patch=encode(job.display(),result.done),encodeMs=performance.now()-t,c=performance.now(),snapshot=structuredClone(patch),cloneMs=performance.now()-c,a=performance.now();base=T.apply(base,snapshot);const applyMs=performance.now()-a;
 phases.push({phase:result.phase,final:result.done,encodeMs,cloneMs,applyMs,serializedBytes:Buffer.byteLength(JSON.stringify(patch))});
}while(!result.done);
assert.equal(hash(initial),original);assert.equal(hash(base),hash(result.world));assert.deepEqual(E.invariants(result.world),[]);
fs.writeFileSync(out,JSON.stringify({scope:'One retained T500->501, baseline-only three real phases. Separate encoding/structuredClone/apply; no browser dispatch or UI. Setup and kernel are outside reported phase timings.',initialHash:original,finalHash:hash(result.world),encoderSetupMs,phases,completeWorldEqual:true,originalUnchanged:true},null,2)+'\n');
