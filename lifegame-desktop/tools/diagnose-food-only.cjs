'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {model}=require('../design/renewal-screen-v2/model.cjs');
const base=require('../operations/evidence/headless-baseline-v4.1/report.json').cases.find(c=>c.id==='custom');
const out=path.resolve(process.argv[2]||'artifacts/prey-route-screen-v4.1');fs.mkdirSync(out,{recursive:true});
const configs={allocation:{allocation:true},allocationReserveSparse:{allocation:true,reserve:true,sparse:true},allocationGateReserveSparse:{allocation:true,preyGate:true,reserve:true,sparse:true},alignedReserve:{allocation:true,reserve:true,sparse:true,birthReserve:true},alignedReserveGate:{allocation:true,preyGate:true,reserve:true,sparse:true,birthReserve:true}};
const root=path.resolve(__dirname,'..');const files=['design/renewal-screen-v2/model.cjs','design/renewal-screen-v2/allocation.txt','tools/diagnose-food-only.cjs',...fs.readdirSync(path.join(root,'src/ecology')).filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f)];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));const sourceHashes=hashes();
for(const [variant,flags] of Object.entries(configs).filter(([name])=>!process.argv[3]||process.argv[3].split(',').includes(name))){
 const E=model(flags),config={...base.config,initial:0,enabled:{...base.config.enabled,main:false,P:false,Q:false}};
 let w=E.create(config);assert.equal(w.config.solarScale,base.config.solarScale);assert.equal(w.config.initialFoodScale,base.config.initialFoodScale);
 const rows=[];console.log('Control '+variant);
 for(let t=0;t<=500;t++){
  assert.deepEqual(E.invariants(w),[]);rows.push({turn:t,fingerprint:E.fingerprint(w),stats:structuredClone(w.stats),observation:structuredClone(w.observation),tallies:structuredClone(w.tallies),ledger:structuredClone(w.ledger)});
  if(t<500)w=E.step(w);
 }
 const name=variant+'-food-only',summary={variant,case:'custom-food-only',config:w.config,flags,states:rows.length,sourceHashes,final:{stats:w.stats,tallies:w.tallies},
  movingPrey:Object.fromEntries(['waterbug','grassbug'].map(s=>[s,{initial:rows[0].stats.counts[s],births:w.tallies.births[s],lastAlive:Math.max(-1,...rows.filter(r=>r.stats.counts[s]>0).map(r=>r.turn))}])),allTurns:name+'.jsonl.gz'};
 fs.writeFileSync(path.join(out,name+'.jsonl.gz'),zlib.gzipSync(rows.map(r=>JSON.stringify(r)).join('\n')+'\n'));fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({variant,food:w.stats.food,movingPrey:summary.movingPrey}));
}
assert.deepEqual(hashes(),sourceHashes,'sources changed during controls');
