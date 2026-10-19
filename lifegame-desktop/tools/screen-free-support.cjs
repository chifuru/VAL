'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {model}=require('../design/producer-support/model.cjs'),Support=require('../design/producer-support/support.cjs'),{stocks}=require('../design/trophic-foundation/observe.cjs');
const cases=[{id:'river',seed:'baseline41/custom',terrainSeed:'baseline41/custom',mapId:'river'},{id:'lake',seed:'free28/lake/02',terrainSeed:'free28/lake/02',mapId:'lake'},{id:'woodland',seed:'free28/woodland/03',terrainSeed:'free28/woodland/03',mapId:'woodland'}];
function hashes(){const files=['tools/screen-free-support.cjs',...['src/ecology','design/producer-support','design/layered-primary','design/trophic-foundation','design/renewal-screen-v2'].flatMap(dir=>fs.readdirSync(dir).filter(f=>/\.(js|cjs|txt)$/.test(f)).map(f=>dir+'/'+f))];return Object.fromEntries(files.sort().map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));}
function run(id,out){
 const c=cases.find(c=>c.id===id);assert(c);fs.mkdirSync(out,{recursive:true});const before=hashes(),E=model();
 const config={...c,width:40,height:28,initial:80,lineages:'few',selected:[],weights:{},placement:'natural',distribution:'balanced',guarantee:false,enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true},landscape:'templates',ageModel:'life/1',ecologyRevision:'observation/4.1',blockTurns:500,observationMode:'custom'};delete config.id;
 const initial=E.create(config),results=[];
 for(const enabled of [false,true]){
  let w=structuredClone(initial);Support.attach(w,{enabled});const initialState=structuredClone(w),rows=[],deaths={},actions={},start=performance.now();let maxE=0,maxM=0;
  const old=id==='river'&&!enabled?JSON.parse(zlib.gunzipSync(fs.readFileSync('operations/evidence/layered-primary-v4.1.3/custom-mixed.json.gz'))):null;
  for(let t=0;t<=500;t++){
   assert.deepEqual(E.invariants(w),[],id+'/'+enabled+'/'+t);
   if(old&&t<=6)assert.equal(E.fingerprint(w),old[t].fingerprint,'old disabled baseline');
   if(t<=6&&enabled){let direct=structuredClone(initialState);for(let i=0;i<t;i++)direct=E.step(direct);assert.equal(E.fingerprint(w),E.fingerprint(direct),'observation/cache independence');}
   const totals=E.S.totals(w),er=E.S.round(totals.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar-(w.ledger.producerE||0)),mr=E.S.round(totals.M+w.ledger.Mloss-w.ledger.initialM-(w.ledger.producerM||0));maxE=Math.max(maxE,Math.abs(er));maxM=Math.max(maxM,Math.abs(mr));assert.equal(Math.abs(er),0);assert.equal(Math.abs(mr),0);
   if(t){for(const d of w.last.deathCauses||[]){const k=d.species+'|'+d.reason;deaths[k]=(deaths[k]||0)+1;}for(const e of w.events||[]){const k=(e.species||'unspecified')+'|'+e.type;actions[k]=(actions[k]||0)+1;}}
   rows.push({turn:t,stats:structuredClone(w.stats),stocks:stocks(E,w),ledger:{...w.ledger},demography:structuredClone(w.demography),last:structuredClone(w.last),support:structuredClone(w.producerSupport?.last||null)});
   if(t%100===0)console.log(JSON.stringify({id,enabled,turn:t,main:w.stats.main,waterbug:w.stats.counts.waterbug,grassbug:w.stats.counts.grassbug,ms:Math.round(performance.now()-start)}));
   if(t<500)w=E.step(w);
  }
  assert.deepEqual(hashes(),before);const result={id,enabled,scope:'private producer-support model; not product adopted',config:w.config,states:rows.length,initial:rows[0].stats,final:w.stats,initialStocks:rows[0].stocks,finalStocks:rows.at(-1).stocks,deaths,actions,maxE,maxM,demography:w.demography,births:w.tallies.births,descendants:Object.fromEntries(E.S.D.species.map(s=>[s.id,Object.values(w.demography).filter(c=>c.species===s.id&&c.generation>0).reduce((n,c)=>n+c.reproduced,0)])),lastAlive:Object.fromEntries(E.S.D.species.map(s=>[s.id,Math.max(-1,...rows.filter(r=>r.stats.counts[s.id]>0).map(r=>r.turn))])),externalInputs:{E:w.ledger.producerE||0,M:w.ledger.producerM||0},elapsedMs:Math.round(performance.now()-start),finalFingerprint:E.fingerprint(w),sourceHashes:before};
  const name=id+'-'+(enabled?'on':'off');fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(out,name+'.json.gz'),zlib.gzipSync(JSON.stringify(rows)));results.push(result);
 }
 assert.deepEqual(hashes(),before);return results;
}
if(require.main===module)run(process.argv[2],path.resolve(process.argv[3]||'artifacts/free-support-v2.8'));module.exports={cases,run};
