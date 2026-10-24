'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'..'),worldFile=process.argv[2],outputFile=process.argv[3],mode=process.argv[4],oldModules=process.argv[5];
if(!worldFile||!outputFile||!['initial','terminal'].includes(mode))throw Error('Pass retained world, result, initial|terminal, and optional baseline modules. Never regenerates 500 turns.');
let M=require('../src/ecology/observation-model.js');
if(oldModules){const file=path.join(root,'src/ecology/observation-model.js'),compiled=new Module(oldModules,module);compiled.filename=oldModules;compiled._compile(fs.readFileSync(oldModules,'utf8'),oldModules);const baseline=new Module(file,module);baseline.filename=file;baseline.paths=module.paths;const normal=baseline.require.bind(baseline);baseline.require=id=>id==='./observation-modules.js'?compiled.exports:normal(id);baseline._compile(fs.readFileSync(file,'utf8'),file);M=baseline.exports;}
const retained=JSON.parse(fs.readFileSync(worldFile)),E=M.model(retained.config.advantageSettings),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const previous=require('../operations/evidence/cell-long-observation-v1/report.json');assert.equal(retained.turn,500);assert.equal(E.fingerprint(retained),previous.fingerprint);
const config=JSON.parse(fs.readFileSync(path.resolve(root,'operations/evidence/cell-long-observation-v1',previous.configFile))),w=mode==='initial'?E.create(config):retained;
const input=JSON.stringify(w);assert.deepEqual(E.invariants(w),[]);
function shape(w){const c=w.carcasses;return {turn:w.turn,organisms:w.organisms.length,corpses:c.length,organic:w.cellState.organic.length,pendingMaterial:w.cellState.nextMaterial.length,learnedOrigins:w.organisms.reduce((n,o)=>n+(o.informationState?.learned?.length||0),0),corpseState:{energyPositive:c.filter(r=>r.E>0).length,mineralOnly:c.filter(r=>r.E===0&&r.G===0&&r.M>0).length,withInfection:c.filter(r=>r.infection).length,empty:c.filter(r=>!r.E&&!r.M&&!r.G&&!r.infection).length,microEnergy:c.filter(r=>r.E>0&&r.E<.001).length,totals:c.reduce((n,r)=>({E:n.E+r.E,M:n.M+r.M,B:n.B+r.G}),{E:0,M:0,B:0})}};}
const before=shape(w),timings={},restore=[];
function wrap(owner,key,label){const f=owner[key];assert.equal(typeof f,'function',label);owner[key]=function(...args){const t=performance.now();try{return f.apply(this,args);}finally{const row=timings[label]??={ms:0,calls:0};row.ms+=performance.now()-t;row.calls++;}};restore.push(()=>{owner[key]=f;});}
for(const key of ['prepare','lifeDemands','acquire','background','resolveDeaths','predation','settleBudgets'])wrap(E.N.CellResources,key,key);
for(const key of ['informationBegin','informationFinalize','begin'])wrap(E.P,key,'parasites/'+key);
wrap(E.S.CellSpace,'deferMaterial','deferMaterial');wrap(E.R.CellLife,'advance','lowerLife');
const native=globalThis.structuredClone;globalThis.structuredClone=function(value,...args){if(value?.config&&value?.organisms&&Object.hasOwn(value,'tiles')&&value.tiles===undefined){const t=performance.now();try{return native(value,...args);}finally{timings.worldClone={ms:performance.now()-t,calls:1};}}return native(value,...args);};
let next,beginMs,stepMs;const phases=[];
try{const t=performance.now(),b=performance.now(),job=E.beginTurn(w);beginMs=performance.now()-b;let result;do{const p=performance.now();result=job.advance();phases.push({phase:result.phase,ms:performance.now()-p});}while(!result.done);next=result.world;stepMs=performance.now()-t;}finally{globalThis.structuredClone=native;for(const f of restore.reverse())f();}
assert.equal(JSON.stringify(w),input);assert.equal(next.turn,w.turn+1);assert.deepEqual(E.invariants(next),[]);
const report={model:oldModules?'baseline':'current',mode,before,after:shape(next),stepMs,beginMs,phases,timings,startingWorldHash:hash(input),worldHash:hash(JSON.stringify(next)),observationHash:hash(JSON.stringify(next.observation)),fingerprint:E.fingerprint(next),originalUnchanged:true,invariants:[],timingScope:'Instrumented kernel only; nested method timings overlap and must not be summed. No renderer or history append is included.'};
fs.writeFileSync(outputFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({mode,stepMs,beginMs,timings}));
