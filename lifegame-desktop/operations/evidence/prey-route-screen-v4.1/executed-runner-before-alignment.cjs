'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const {model}=require('../design/renewal-screen-v2/model.cjs');
const ROOT=path.resolve(__dirname,'..'),BASE=path.join(ROOT,'operations/evidence/headless-baseline-v4.1');
const VARIANTS={allocation:{allocation:true},allocationGate:{allocation:true,preyGate:true},allocationReserveSparse:{allocation:true,reserve:true,sparse:true},allocationGateReserveSparse:{allocation:true,preyGate:true,reserve:true,sparse:true}};
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
function run(variant,baseline,{out,turns=500}={}){
 assert(Object.hasOwn(VARIANTS,variant));assert(Number.isSafeInteger(turns)&&turns>=0&&turns<=500);
 const E=model(VARIANTS[variant]),reference=JSON.parse(fs.readFileSync(path.join(BASE,'report.json'),'utf8'));
 for(const [f,h] of Object.entries(reference.sourceHashes))if(f.startsWith('src/'))assert.equal(hash(f),h,'baseline source mismatch: '+f);
 const c=reference.cases.find(c=>c.id===baseline);assert(c,'Unknown baseline case');
 const before={...reference.sourceHashes,'design/renewal-screen-v2/model.cjs':hash('design/renewal-screen-v2/model.cjs'),'design/renewal-screen-v2/allocation.txt':hash('design/renewal-screen-v2/allocation.txt'),'tools/screen-prey-routes.cjs':hash('tools/screen-prey-routes.cjs')};
 const baseRows=zlib.gunzipSync(fs.readFileSync(path.join(BASE,c.allTurns))).toString().trim().split('\n').map(JSON.parse);
 let w=E.create(c.config);
 const groupCounts=world=>Object.fromEntries(['plant','fungus','prey'].map(group=>[group,world.organisms.filter(o=>E.S.spec(o).group===group).length]));
 const original=require('../src/ecology/engine.js').create(c.config);
 assert.deepEqual(groupCounts(w),groupCounts(original),'initial group targets must not increase');
 assert.equal(w.stats.main,original.stats.main);assert.equal(w.config.mapResolved.terrainHash,original.config.mapResolved.terrainHash);
 const initial={candidateFingerprint:E.fingerprint(w),baselineFingerprint:baseRows[0].fingerprint,groupCounts:groupCounts(w),counts:{...w.stats.counts},terrainHash:w.config.mapResolved.terrainHash};
 const selected=Object.keys(c.survival),rows=[],start=performance.now();
 for(let t=0;t<=turns;t++){
  assert.deepEqual(E.invariants(w),[],`${variant}/${baseline}/${t} invariant`);
  const fingerprint=E.fingerprint(w);
  if(variant==='baseline'){
   assert.equal(fingerprint,baseRows[t].fingerprint,'unmodified all-turn fingerprint');
   assert.deepEqual(w.observation,baseRows[t].observation,'unmodified all-turn observation');
   assert.deepEqual(w.stats,baseRows[t].stats,'unmodified all-turn stats');
  }
  const foodByGroup={plant:0,fungus:0,prey:0},diagnostics={};
  for(const o of w.organisms){const s=E.S.spec(o);if(s.group in foodByGroup)foodByGroup[s.group]++;
   const d=diagnostics[o.species]??={count:0,Mbelow02:0,Ebelow12:0,generation1plus:0,maxGeneration:0};d.count++;d.Mbelow02+=o.M<.2;d.Ebelow12+=o.E<12;d.generation1plus+=o.generation>0;d.maxGeneration=Math.max(d.maxGeneration,o.generation);
  }
  rows.push({turn:t,fingerprint,stats:structuredClone(w.stats),observation:structuredClone(w.observation),ledger:structuredClone(w.ledger),tallies:structuredClone(w.tallies),foodByGroup,diagnostics});
  if(t<turns)w=E.step(w);
 }
 for(const [f,h] of Object.entries(before))assert.equal(hash(f),h,'source changed during run: '+f);
 const summary={variant,case:baseline,flags:E.renewalFlags,turns,states:rows.length,elapsedMs:Math.round(performance.now()-start),config:w.config,initial,initialFingerprint:rows[0].fingerprint,
  final:{stats:w.stats,foodByGroup:rows.at(-1).foodByGroup,tallies:w.tallies,demography:w.demography},
  survival:Object.fromEntries(selected.map(s=>[s,{continuous150to250:turns<250?null:rows.slice(150,251).every(r=>r.stats.counts[s]>0),finalCount:w.stats.counts[s],births:w.tallies.births[s],descendantReproduced:Object.values(w.demography||{}).filter(c=>c.species===s&&c.generation>0).reduce((n,c)=>n+c.reproduced,0)}])),
  foodMeanLast50:rows.slice(-Math.min(50,rows.length)).reduce((n,r)=>n+r.stats.food,0)/Math.min(50,rows.length),sourceHashes:before};
 if(out){fs.mkdirSync(out,{recursive:true});const name=variant+'-'+baseline;fs.writeFileSync(path.join(out,name+'.jsonl.gz'),zlib.gzipSync(rows.map(r=>JSON.stringify(r)).join('\n')+'\n'));summary.allTurns=name+'.jsonl.gz';fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(summary,null,2)+'\n');}
 return summary;
}
if(require.main===module){
 const args=process.argv.slice(2),opt=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1];},out=path.resolve(opt('--out','artifacts/prey-route-screen-v4.1'));
 const variants=opt('--variants','allocation,allocationGate,allocationReserveSparse,allocationGateReserveSparse').split(','),cases=opt('--cases','custom,river,lake').split(','),turns=Number(opt('--turns','500'));
 for(const v of variants)for(const c of cases){console.log('Run '+v+'/'+c);const s=run(v,c,{out,turns});console.log(JSON.stringify({variant:v,case:c,main:s.final.stats.main,food:s.final.stats.food,P:s.final.stats.P,Q:s.final.stats.Q,births:Object.values(s.survival).reduce((n,a)=>n+a.births,0),descendantReproduced:Object.values(s.survival).reduce((n,a)=>n+a.descendantReproduced,0),elapsedMs:s.elapsedMs}));}
}
module.exports={VARIANTS,run};
