'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {model}=require('../design/prey-forage-screen/model.cjs');
const root=path.resolve(__dirname,'..'),reference=path.join(root,'operations/evidence/energy-precision-v4.1.3/baseline');
const files=['tools/screen-prey-forage.cjs','design/prey-forage-screen/model.cjs',...fs.readdirSync(path.join(root,'src/ecology')).filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f)];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
function run(id,{out,turns=500}={}){
 assert(['historical-input','custom','lake'].includes(id));assert(Number.isSafeInteger(turns)&&turns>=0&&turns<=500);
 const before=hashes(),ref=require(path.join(reference,id+'-full.json'));
 for(const [f,h]of Object.entries(require(path.join(reference,'source-hashes.json'))))if(f.startsWith('src/'))assert.equal(before[f],h,'reference source mismatch');
 assert.equal(ref.productionVersion,require('../package.json').version);
 const saved=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(reference,id+'-full.json.gz')))),results=[];
 for(const forage of [false,true]){
  const E=model(forage);let w=E.create(ref.config),plain=E.create(ref.config);E.S.prepareGeometry(w);
  const rows=[],deaths={},start=performance.now();
  for(let t=0;t<=turns;t++){
   assert.deepEqual(E.invariants(w),[],id+'/'+forage+'/'+t);
   const fingerprint=E.fingerprint(w);
   if(!forage)assert.equal(fingerprint,saved[t].fingerprint,'baseline all-turn equality');
   if(t<=6)assert.equal(fingerprint,E.fingerprint(plain),'static cache equality');
   for(const d of w.last?.deathCauses||[]){const k=d.species+'|'+d.reason;deaths[k]=(deaths[k]||0)+1;}
   rows.push({turn:t,fingerprint,stats:w.stats,demography:w.demography,ledger:w.ledger});
   if(t<turns){w=E.step(w);if(t<6)plain=E.step(plain);}
  }
  const result={id,forage,productionVersion:ref.productionVersion,productAdopted:false,config:ref.config,states:rows.length,baselineMatched:forage?null:rows.length,cacheMatched:Math.min(6,turns)+1,elapsedMs:Math.round(performance.now()-start),initial:rows[0].stats,final:w.stats,deaths,
   prey:Object.fromEntries(E.S.D.species.filter(s=>s.group==='prey').map(s=>[s.id,{initial:rows[0].stats.counts[s.id],final:w.stats.counts[s.id],births:w.tallies.births[s.id]||0,lastAlive:Math.max(-1,...rows.filter(r=>r.stats.counts[s.id]>0).map(r=>r.turn)),descendantReproduced:Object.values(w.demography||{}).filter(c=>c.species===s.id&&c.generation>0).reduce((n,c)=>n+c.reproduced,0)}])),sourceHashes:before};
  assert.deepEqual(hashes(),before,'executed source changed');results.push(result);
  if(out){fs.mkdirSync(out,{recursive:true});const name=id+'-'+(forage?'forage':'baseline');fs.writeFileSync(path.join(out,name+'.json.gz'),zlib.gzipSync(JSON.stringify(rows)));fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(result,null,2));}
  console.log(JSON.stringify({id,forage,main:w.stats.main,food:w.stats.food,prey:result.prey,elapsedMs:result.elapsedMs}));
 }
 return results;
}
module.exports={run};
if(require.main===module)run(process.argv[2]||'lake',{out:path.resolve(process.argv[3]||'artifacts/prey-forage-screen-v4.1.3')});
