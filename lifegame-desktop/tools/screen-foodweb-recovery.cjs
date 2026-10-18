'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {model}=require('../design/renewal-screen-v2/model.cjs');
const root=path.resolve(__dirname,'..'),referenceDir='operations/evidence/foodweb-diagnosis-v4.1.2/after';
const VARIANTS={baseline:{},allocation:{allocation:true},reserve:{reserve:true},allocationReserve:{allocation:true,reserve:true},allocationLocal:{allocation:true,sparse:true,birthReserve:true}};
function hashes(){const files=['tools/screen-foodweb-recovery.cjs','design/renewal-screen-v2/model.cjs','design/renewal-screen-v2/allocation.txt',...fs.readdirSync(path.join(root,'src/ecology')).filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f)];return Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));}
function groups(E,w){const result={plant:0,fungus:0,prey:0};for(const o of w.organisms){const g=E.S.spec(o).group;if(g in result)result[g]++;}return result;}
function run(variant,id,{out,turns=500}={}){
 assert(Object.hasOwn(VARIANTS,variant),'unknown variant');assert(Number.isSafeInteger(turns)&&turns>=0&&turns<=500);
 const ref=require(path.join(root,referenceDir,id+'-full.json'));assert.equal(ref.productionVersion,'4.1.2');
 const before=hashes();for(const [f,h] of Object.entries(require(path.join(root,referenceDir,'source-hashes.json'))))if(f.startsWith('src/'))assert.equal(before[f],h,'production reference source changed: '+f);
 const E=model(VARIANTS[variant]),control=model(),initial=control.create(ref.config);let w=E.create(ref.config);
 assert.deepEqual(groups(E,w),groups(control,initial),'group targets must not increase');assert.equal(w.stats.main,initial.stats.main);assert.deepEqual(w.tiles,initial.tiles,'terrain and soil unchanged');
 const saved=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,referenceDir,id+'-full.json.gz'))));
 if(!VARIANTS[variant].allocation)assert.equal(E.fingerprint(w),saved[0].fingerprint,'non-placement trial keeps initial world');
 const selected=E.S.D.main.filter(s=>w.stats.counts[s.id]>0).map(s=>s.id),stages={},windows=new Set(),attachedQ=new Set(),rows=[],start=performance.now();
 for(let t=0;t<=turns;t++){
  const errors=E.invariants(w);
  if(errors.length&&out){fs.mkdirSync(out,{recursive:true});const name=variant+'-'+id;fs.writeFileSync(path.join(out,name+'.partial.json.gz'),zlib.gzipSync(JSON.stringify(rows)));fs.writeFileSync(path.join(out,name+'.failure.json'),JSON.stringify({variant,id,status:'rejected',failedTurn:t,verifiedStates:rows.length,errors,config:initial.config,flags:E.renewalFlags,sourceHashes:before,fingerprint:E.fingerprint(w),failedStats:w.stats,ledger:w.ledger},null,2));}
  assert.deepEqual(errors,[],variant+'/'+id+'/'+t);
  const fingerprint=E.fingerprint(w);if(variant==='baseline')assert.equal(fingerprint,saved[t].fingerprint,'unmodified all-turn fingerprint');
  const diagnostics={};for(const o of w.organisms){const d=diagnostics[o.species]??={count:0,lowM:0,lowB:0,maxGeneration:0};d.count++;d.lowM+=o.M<.2;d.lowB+=o.B<3;d.maxGeneration=Math.max(d.maxGeneration,o.generation);if(o.infection){const p=o.infection;(stages[p.species+'|'+p.stage]??=new Set()).add(p.id);if(E.P.windowOpen(w,p))windows.add(p.id);if(p.q)attachedQ.add(p.q.id);}}
  rows.push({turn:t,fingerprint,stats:w.stats,foodByGroup:groups(E,w),diagnostics,demography:w.demography,ledger:w.ledger,tallies:w.tallies});
  if(t<turns)w=E.step(w);
 }
 assert.deepEqual(hashes(),before,'sources changed during run');
 const summary={variant,id,productionVersion:'4.1.2',flags:E.renewalFlags,turns,states:rows.length,matchedStates:variant==='baseline'?rows.length:null,elapsedMs:Math.round(performance.now()-start),config:initial.config,sourceHashes:before,initial:rows[0].stats,final:w.stats,
 food:Object.fromEntries(E.S.D.species.filter(s=>['plant','fungus','prey'].includes(s.group)).map(s=>[s.id,{initial:rows[0].stats.counts[s.id],final:w.stats.counts[s.id],births:w.tallies.births[s.id]||0,lastAlive:Math.max(-1,...rows.filter(r=>r.stats.counts[s.id]>0).map(r=>r.turn)),maxGeneration:Math.max(0,...rows.map(r=>r.diagnostics[s.id]?.maxGeneration||0)),descendantReproduced:Object.values(w.demography||{}).filter(c=>c.species===s.id&&c.generation>0).reduce((n,c)=>n+c.reproduced,0)}])),
 survival:Object.fromEntries(selected.map(s=>[s,{continuous150to250:turns>=250?rows.slice(150,251).every(r=>r.stats.counts[s]>0):null,final:w.stats.counts[s],descendantReproduced:Object.values(w.demography||{}).filter(c=>c.species===s&&c.generation>0).reduce((n,c)=>n+c.reproduced,0)}])),
 parasiteStages:Object.fromEntries(Object.entries(stages).map(([s,ids])=>[s,ids.size])),matureWindows:windows.size,attachedQ:attachedQ.size,meanLast50:rows.slice(-50).reduce((a,r)=>({main:a.main+r.stats.main,food:a.food+r.stats.food}),{main:0,food:0})};
 const n=Math.min(50,rows.length);summary.meanLast50.main/=n;summary.meanLast50.food/=n;
 if(out){fs.mkdirSync(out,{recursive:true});const name=variant+'-'+id;fs.writeFileSync(path.join(out,name+'.json.gz'),zlib.gzipSync(JSON.stringify(rows)));fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(summary,null,2));}
 return summary;
}
module.exports={run,VARIANTS};
if(require.main===module){const id=process.argv[2]||'lake',out=path.resolve(process.argv[3]||'artifacts/foodweb-recovery-screen-v4.1.2'),variants=(process.argv[4]||'baseline,allocation,reserve,allocationReserve').split(',');for(const variant of variants){console.log('Run '+id+'/'+variant);const r=run(variant,id,{out});console.log(JSON.stringify({variant,id,main:r.final.main,food:r.final.food,waterbug:r.food.waterbug,grassbug:r.food.grassbug,P:r.final.P,Q:r.final.Q,stages:r.parasiteStages,windows:r.matureWindows,attachedQ:r.attachedQ,elapsedMs:r.elapsedMs}));}}
