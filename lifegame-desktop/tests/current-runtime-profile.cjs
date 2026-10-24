'use strict';
// One natural trajectory. Keeps observations outside biology; checkpoints are measurements, not synthetic ages.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),crypto=require('node:crypto'),
 Model=require('../src/ecology/observation-model.js'),O=require('../src/ecology/observations.js'),T=require('../src/ecology/transport.js');
require('../src/ecology/replay-version.js');
const out=path.resolve(process.argv[2]||'operations/evidence/current-state-runtime-v1'),limit=Number(process.argv[3]||500),budgetMs=Number(process.argv[4]||240000),temp=path.resolve(process.argv[5]||'/tmp/current-runtime');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(temp,{recursive:true});
const config={...require('../operations/evidence/cell-turn-v1/initial-config.json'),currentStateModel:'current-state/1'};
// A new model requires a fresh effective-condition receipt, never the old saved receipt.
delete config.generationResolved;
const E=Model.model(config.advantageSettings),S=E.S,bytes=x=>Buffer.byteLength(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),rows=[],checkpoints=[],wires=[],timings={},undo=[];
function wrap(owner,key,name){const f=owner[key];assert.equal(typeof f,'function',name);owner[key]=function(...args){const t=performance.now();try{return f.apply(this,args);}finally{const v=timings[name]??={ms:0,calls:0};v.ms+=performance.now()-t;v.calls++;}};undo.push(()=>{owner[key]=f;});}
for(const k of ['prepare','lifeDemands','acquire','background','resolveDeaths','predation','settleBudgets'])wrap(E.N.CellResources,k,k);
for(const k of ['informationBegin','informationFinalize'])wrap(E.P,k,k);wrap(E.R.CellLife,'advance','lowerLife');
function shape(w,h){
 const subjects=S.PersistentInformation.entries(w).map(e=>e.subject),info=subjects.map(o=>o.informationState),names=['organisms','carcasses','informationField','primaryInocula','hyperInocula','currentInfections','cellState','currentActivity','observation'];
 return {turn:w.turn,main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,organisms:w.organisms.length,subjects:subjects.length,worldBytes:bytes(w),bytesByKey:Object.fromEntries(names.map(k=>[k,bytes(w[k])])),informationBytes:bytes(info),
  information:{outgoing:info.filter(a=>Object.keys(a.outgoing.components).length).length,components:info.reduce((n,a)=>n+Object.keys(a.outgoing.components).length,0),maxComponents:Math.max(0,...info.map(a=>Object.keys(a.outgoing.components).length)),incoming:info.filter(a=>a.incoming.lastAt!==null).length,legacyArrays:info.reduce((n,a)=>n+(a.experience?.length||0)+(a.learned?.length||0),0),maxChangeWidth:Math.max(0,...info.map(a=>a.change.length))},
  carcasses:w.carcasses.length,soil:{fresh:w.cellState.soil.fresh.length,organic:w.cellState.organic.length,waiting:w.cellState.soil.waiting.length,next:w.cellState.nextMaterial.length},environmentRecords:w.informationField.length,
  infectionTypes:w.currentInfections.types.length,primaryInocula:w.primaryInocula.length,hyperInocula:w.hyperInocula.length,activity:S.CurrentActivity.summary(w),historyRows:h.rows.length,historyBytes:bytes(h.snapshot({copy:false})),heapUsed:process.memoryUsage().heapUsed,
  Eerror:S.round(w.stats.totals.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar),Merror:S.round(w.stats.totals.M+w.ledger.Mloss-w.ledger.initialM-(w.ledger.cellInputM||0)),invariants:E.invariants(w)};
}
let w=E.create(config),h=O.create(w.config,globalThis.EcoReplayVersion,{species:S.activeSpecies(w)}),error=null,stopped='limit',maxE=0,maxM=0;h.append(w);checkpoints.push(shape(w,h));fs.writeFileSync(path.join(temp,'initial.json'),JSON.stringify(w));const start=performance.now();
try{
 for(let turn=1;turn<=limit;turn++){
  for(const k of Object.keys(timings))delete timings[k];
  const sampled=[1,100,250,500].includes(turn),before=sampled?hash(w):null;let encode,base=w,setupMs=0;if(sampled){const t=performance.now();encode=T.encoder(w);setupMs=performance.now()-t;}
  const t=performance.now(),job=E.beginTurn(w),beginMs=performance.now()-t,phases=[],transfer=[];let result,kernelMs=beginMs;
  do{const p=performance.now();result=job.advance();const ms=performance.now()-p;kernelMs+=ms;phases.push(ms);
   if(sampled){let at=performance.now();const packet=encode(job.display(),result.done),encodeMs=performance.now()-at;at=performance.now();const copy=structuredClone(packet),cloneMs=performance.now()-at;at=performance.now();base=T.apply(base,copy);transfer.push({phase:result.phase,encodeMs,cloneMs,applyMs:performance.now()-at,bytes:bytes(packet)});}
  }while(!result.done);
  if(sampled){assert.equal(hash(w),before);assert.deepEqual(base,result.world);wires.push({from:w.turn,to:turn,setupMs,phases:transfer,equal:true,originalUnchanged:true});}
  w=result.world;const at=performance.now();h.append(w);const appendMs=performance.now()-at;
  const Eerror=S.round(w.stats.totals.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar),Merror=S.round(w.stats.totals.M+w.ledger.Mloss-w.ledger.initialM-(w.ledger.cellInputM||0));maxE=Math.max(maxE,Math.abs(Eerror));maxM=Math.max(maxM,Math.abs(Merror));
  rows.push({turn,kernelMs,beginMs,phases,appendMs,organisms:w.organisms.length,main:w.stats.main,P:w.stats.P,Q:w.stats.Q,methods:structuredClone(timings),Eerror,Merror});
  if([1,25,100,250,500].includes(turn)){const s=shape(w,h);assert.deepEqual(s.invariants,[]);assert.equal(s.historyRows,turn+1);checkpoints.push(s);console.log(JSON.stringify({turn,kernelMs,appendMs,organisms:s.organisms,worldMB:s.worldBytes/1e6,historyMB:s.historyBytes/1e6,elapsedMs:performance.now()-start}));}
  if(w.stats.main===0){stopped='main-extinct';break;}if(performance.now()-start>budgetMs){stopped='budget';break;}
 }
}catch(e){error={turn:w.turn,message:e.message,stack:e.stack};console.error(JSON.stringify(error));}finally{for(const fn of undo.reverse())fn();}
if(checkpoints.at(-1).turn!==w.turn)checkpoints.push(shape(w,h));
fs.writeFileSync(path.join(temp,'terminal.json'),JSON.stringify(w));fs.writeFileSync(path.join(temp,'observations.json'),JSON.stringify(h.snapshot({copy:false})));
const report={definition:'current-runtime-profile/1',signature:globalThis.EcoReplayVersion,config:w.config,target:limit,turn:w.turn,completed:!error&&w.turn===limit,stopped,error,maxE,maxM,elapsedMs:performance.now()-start,checkpoints,wires,finalFingerprint:E.fingerprint(w),files:{world:path.join(temp,'terminal.json'),observation:path.join(temp,'observations.json')},scope:'One natural condition, instrumented Node kernel and display append. Nested times overlap. JSON bytes are not heap. Transfer excludes browser dispatch. No old-world equivalence claim.'};
fs.writeFileSync(path.join(out,'kernel.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'turns.json'),JSON.stringify(rows)+'\n');console.log(JSON.stringify({turn:w.turn,stopped,error,elapsedMs:report.elapsedMs,output:path.join(out,'kernel.json')}));if(error)process.exitCode=1;
