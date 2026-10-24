'use strict';
// One resolved condition, real public turns; observation wrappers delegate unchanged.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const config = require('../operations/evidence/cell-turn-v1/initial-config.json');
const E = require('../src/ecology/observation-model.js').model(config.advantageSettings);
require('../src/ecology/replay-version.js');
const out = path.resolve(process.argv[2] || 'operations/evidence/cell-long-observation-v1');
fs.mkdirSync(out, {recursive:true});
const N=E.N.CellResources, S=E.S, rows=[], traces=new Map();
let frame={}, stage='initial', current, error=null, fingerprint12=null, maxE=0, maxM=0;
const totals={receipts:{},background:{E:0,M:0,B:0},returnedM:0,remains:0,productionB:0};
function note(cell,kind,detail){
 const expected=['production','feeding','remains','decomposition','returned','regrowth'];
 const trace=traces.get(cell)||[];
 if(kind===expected[trace.length]){trace.push({turn:frame.turn,kind,...detail});traces.set(cell,trace);}
}
function observe(name,after,before){const original=N[name];N[name]=function(w,ctx,...args){
 if(before)before(w,ctx,...args);const result=original(w,ctx,...args);after(w,ctx,result,...args);return result;
};}
observe('prepare',(w,ctx)=>{frame.returnedM=ctx.cellResources.flow.returnedM;totals.returnedM+=frame.returnedM;
 for(const row of frame.due||[])if(w.tiles[row.cell].soilM>frame.soil[row.cell])note(row.cell,'returned',{M:row.M});
},w=>{frame.turn=w.turn;frame.due=w.cellState.nextMaterial.filter(r=>r.kind==='mineral'&&r.availableAt<=w.turn);frame.soil=w.tiles.map(t=>t.soilM);});
observe('acquire',(w,ctx)=>{
 const byId=new Map(w.organisms.map(o=>[o.id,o]));frame.receipts={};
 for(const r of ctx.cellResources.receipts){const t=frame.receipts[r.kind]||={count:0,E:0,M:0,quantity:0};for(const key of ['E','M','quantity'])t[key]+=r[key];t.count++;
  if(r.kind==='food'&&r.quantity>0)note(r.cell,'feeding',{actor:byId.get(r.actor)?.species,source:r.source,E:r.E});
  if(r.kind==='decompose'&&r.quantity>0)note(r.cell,'decomposition',{actor:byId.get(r.actor)?.species,source:r.source,E:r.E,M:r.M});
 }
 for(const [kind,t]of Object.entries(frame.receipts)){const a=totals.receipts[kind]||={count:0,E:0,M:0,quantity:0};for(const k of Object.keys(t))a[k]+=t[k];}
});
observe('background',(w,ctx,r)=>{frame.background=r;for(const k of ['E','M','B'])totals.background[k]+=r[k];});
const remains=N.remains;
N.remains=function(w,o,ctx){const existed=w.carcasses.length,r=remains(w,o,ctx);if(w.carcasses.length>existed){totals.remains++;note(o.cell,'remains',{species:o.species,id:r.id,E:r.E,M:r.M});}return r;};
function snapshot(w){
 const t=S.totals(w),Eerror=S.round(t.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar-(w.ledger.producerE||0));
 const Merror=S.round(t.M+w.ledger.Mloss-w.ledger.initialM-(w.ledger.producerM||0)-(w.ledger.cellInputM||0));
 maxE=Math.max(maxE,Math.abs(Eerror));maxM=Math.max(maxM,Math.abs(Merror));
 return {turn:w.turn,main:w.stats.main,counts:w.stats.counts,occupancy:S.CellSpace.summary(w),
  P:w.stats.P,Q:w.stats.Q,searchQ:w.stats.Qsearch,stopReason:w.stopReason,
  E:t.E,M:t.M,Eerror,Merror,solar:w.ledger.solar,sinks:w.ledger.sinks,mineralInput:w.ledger.cellInputM||0,
  soilM:S.round(w.tiles.reduce((n,t)=>n+t.soilM,0)),carcasses:w.carcasses.length,organic:w.cellState.organic.length,
  births:w.last?.births||0,deaths:w.last?.deaths||0,deathCauses:w.last?.deathCauses||[],
  receipts:frame.receipts||{},background:frame.background||{E:0,M:0,B:0},returnedM:frame.returnedM||0};
}
const started=Date.now();
try {
 current=E.create(config);assert.deepEqual(E.invariants(current),[]);rows.push(snapshot(current));
 for(let turn=1;turn<=500;turn++){
  stage='turn '+turn;frame={};current=E.step(current);
  for(const o of current.organisms)if(o.cellLife?.last.turn===current.turn&&o.cellLife.last.production>0){
   const production=o.cellLife.last.production;totals.productionB+=production;
   note(o.cell,'production',{species:o.species,B:production});note(o.cell,'regrowth',{species:o.species,B:production});
  }
  const row=snapshot(current);rows.push(row);const problems=E.invariants(current);
  if(problems.length)throw Error(problems.join(','));
  if(turn===12){fingerprint12=E.fingerprint(current);assert.equal(fingerprint12,require('../operations/evidence/cell-turn-v1/report.json').runs[0].fingerprint,'instrumentation preserves previous uninstrumented T12 result');}
  if([25,50,100,200,300,400,500].includes(turn))console.log(JSON.stringify({turn,main:row.main,P:row.P,Q:row.Q,organisms:current.organisms.length,Eerror:row.Eerror,Merror:row.Merror,elapsedMs:Date.now()-started}));
  if(current.stopReason==='main-extinct')break;
 }
} catch(e){error={stage,message:e.message,stack:e.stack};console.error(JSON.stringify(error));}
const report={baseline:'3ffdee9',biologicalSignature:globalThis.EcoReplayVersion,configFile:'../cell-turn-v1/initial-config.json',
 turn:current.turn,completed500:current.turn===500,mainSurvives:current.stats.main>0,error,maxAbsError:{E:maxE,M:maxM},fingerprint12,
 fingerprint:E.fingerprint(current),totals,tallies:current.tallies,final:rows.at(-1),
 cycleExamples:[...traces].filter(([,t])=>t.length===6).slice(0,4).map(([cell,events])=>({cell,events})),
 longestPartialExamples:[...traces].sort((a,b)=>b[1].length-a[1].length).slice(0,4).map(([cell,events])=>({cell,events})),
 elapsedMs:Date.now()-started};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(out,'turns.json'),JSON.stringify(rows)+'\n');
fs.writeFileSync('/tmp/cell-long-observation-world.json',JSON.stringify(current));
console.log(JSON.stringify({report:path.join(out,'report.json'),turn:report.turn,main:current.stats.main,error,cycles:report.cycleExamples.length,elapsedMs:report.elapsedMs}));
if(error)process.exitCode=1;
