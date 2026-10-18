'use strict';
// Analysis only. No rendering, rescue, rule changes, or writes to production records.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const E=require('../src/ecology/engine.js'),{model}=require('../design/ecosystem-foundation/model.cjs');
const FLAGS=Object.freeze({food:false,budget:false,routes:false,foundation:false});
const CASES=Object.freeze([
 {id:'custom',seed:'baseline41/custom',observationMode:'custom',mapId:'river',initial:80,lineages:'few'},
 {id:'river',seed:'baseline41/river',observationMode:'river-settlement'},
 {id:'lake',seed:'baseline41/lake',observationMode:'lake-foodweb'},
]);
function sourceHashes(){
 const root=path.resolve(__dirname,'..'),files=fs.readdirSync(path.join(root,'src/ecology')).filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f);
 files.push('design/ecosystem-foundation/model.cjs','design/ecosystem-foundation/transform.cjs','tools/compare-ecology-baseline.cjs');
 return Object.fromEntries(files.sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
}
function diagnose(w){
 const bySpecies={};
 for(const o of w.organisms){
  const row=bySpecies[o.species]??={count:0,Ebelow8:0,Ebelow12:0,Mbelow02:0,Mbelow2:0,mature:0,generation1plus:0,maxGeneration:0};
  row.count++;row.Ebelow8+=o.E<8;row.Ebelow12+=o.E<12;row.Mbelow02+=o.M<.2;row.Mbelow2+=o.M<2;
  row.mature+=E.S.ageInfo(o).stage!=='juvenile';row.generation1plus+=o.generation>0;row.maxGeneration=Math.max(row.maxGeneration,o.generation);
 }
 return bySpecies;
}
function runCase(input,{turns=500,candidate=model(FLAGS),onRow=()=>{}}={}){
 assert(Number.isSafeInteger(turns)&&turns>=0&&turns<=500,'baseline interval must be 0..500');
 const {id,...settings}=input;
 const config={width:40,height:28,landscape:'templates',ageModel:'life/1',ecologyRevision:'observation/4.1',blockTurns:500,...settings};
 let a=E.create(config),b=candidate.create(config);const rows=[];
 const started=performance.now(),selected=E.S.D.main.filter(s=>a.stats.counts[s.id]>0).map(s=>s.id);
 function capture(){
  const label=`${id||'case'} turn ${a.turn}`;
  assert.deepEqual(candidate.invariants(b),[],label+' candidate invariants');
  assert.deepEqual(E.invariants(a),[],label+' production invariants');
  const fingerprint=E.fingerprint(a);
  assert.equal(candidate.fingerprint(b),fingerprint,label+' fingerprint');
  // Display data is intentionally outside the biological fingerprint.
  assert.deepEqual(b.stats,a.stats,label+' statistics');
  assert.deepEqual(b.observation,a.observation,label+' observation');
  assert.deepEqual(b.ledger,a.ledger,label+' finite budget');
  const row={turn:a.turn,fingerprint,stats:structuredClone(a.stats),observation:structuredClone(a.observation),tallies:structuredClone(a.tallies),ledger:structuredClone(a.ledger),diagnostics:diagnose(a)};
  rows.push(row);onRow(row);
 }
 assert.deepEqual(b.config,a.config,'resolved configuration');capture();
 for(let t=0;t<turns;t++){a=E.step(a);b=candidate.step(b);capture();}
 const survival=Object.fromEntries(selected.map(s=>[s,{
  continuous150to250:turns<250?null:rows.slice(150,251).every(r=>r.stats.counts[s]>0),
  finalCount:a.stats.counts[s],births:a.tallies.births[s],
  descendantReproduced:Object.values(a.demography||{}).filter(c=>c.species===s&&c.generation>0).reduce((n,c)=>n+c.reproduced,0),
 }]));
 return {id,turns,matchedStates:rows.length,config:a.config,flags:{...FLAGS},elapsedMs:Math.round(performance.now()-started),survival,final:{fingerprint:E.fingerprint(a),stats:a.stats,tallies:a.tallies,demography:a.demography},rows};
}
if(require.main===module){
 const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
 const turns=Number(option('--turns','500')),out=path.resolve(option('--out','artifacts/headless-baseline-v4.1')),which=option('--case','all');
 fs.mkdirSync(out,{recursive:true});const hashes=sourceHashes(),cases=CASES.filter(c=>which==='all'||c.id===which);assert(cases.length,'unknown case');
 const report={scope:'headless baseline equivalence; no balance certification',sourceHashes:hashes,flags:{...FLAGS},cases:[]};
 for(const c of cases){
  console.log('Comparing '+c.id+' through turn '+turns);
  const file=path.join(out,c.id+'.jsonl'),fd=fs.openSync(file,'w');let result;
  try{result=runCase(c,{turns,onRow:row=>fs.writeSync(fd,JSON.stringify(row)+'\n')});}finally{fs.closeSync(fd);}
  const {rows,...summary}=result;report.cases.push({...summary,allTurns:path.basename(file)});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({id:c.id,matchedStates:result.matchedStates,elapsedMs:result.elapsedMs,final:result.final.stats}));
 }
 assert.deepEqual(sourceHashes(),hashes,'source files changed during comparison');
}
module.exports={FLAGS,CASES,sourceHashes,runCase};
