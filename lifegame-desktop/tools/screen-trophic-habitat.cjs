// Separate runner snapshot preserves the first experiment sources.
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {model}=require('../design/trophic-foundation/habitat-model.cjs'),{observe,stocks,lowerOnly}=require('../design/trophic-foundation/observe.cjs');
const root=path.resolve(__dirname,'..'),refDir=path.join(root,'operations/evidence/energy-precision-v4.1.3/baseline');
const files=['tools/screen-trophic-habitat.cjs','design/trophic-foundation/habitat-model.cjs','design/trophic-foundation/observe.cjs','design/renewal-screen-v2/model.cjs','design/renewal-screen-v2/allocation.txt',...fs.readdirSync(path.join(root,'src/ecology')).filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f)];
const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
function run(id,{out,turns=500}={}){
 assert(['custom','lake'].includes(id));assert(Number.isSafeInteger(turns)&&turns>=0&&turns<=500);
 const before=hashes(),ref=require(path.join(refDir,id+'-full.json')),saved=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(refDir,id+'-full.json.gz'))));
 assert.equal(ref.productionVersion,require('../package.json').version);
 for(const [f,h]of Object.entries(require(path.join(refDir,'source-hashes.json'))))if(f.startsWith('src/'))assert.equal(before[f],h,'production reference mismatch');
 const baseline=model();let b=baseline.create(ref.config);
 for(let t=0;t<=6;t++){assert.equal(baseline.fingerprint(b),saved[t].fingerprint);if(t<6)b=baseline.step(b);}
 const E=model({allocation:true}),initial=E.create(ref.config),productionInitial=baseline.create(ref.config);
 assert.deepEqual(initial.tiles,productionInitial.tiles);
 for(const group of ['main','plant','fungus','prey'])assert.equal(initial.organisms.filter(o=>E.S.spec(o).group===group).length,productionInitial.organisms.filter(o=>E.S.spec(o).group===group).length);
 const results=[];
 for(const treatment of ['mixed','lower-only']){
  let w=treatment==='mixed'?structuredClone(initial):lowerOnly(E,initial),plain=structuredClone(w);E.S.prepareGeometry(w);
  const rows=[],totals={},deaths={},start=performance.now();
  for(let t=0;t<=turns;t++){
   assert.deepEqual(E.invariants(w),[],id+'/'+treatment+'/'+t);const fingerprint=E.fingerprint(w);
   if(t<=6)assert.equal(fingerprint,E.fingerprint(plain),'observer/cache changed world');
   for(const d of w.last.deathCauses||[]){const k=d.species+'|'+d.reason;deaths[k]=(deaths[k]||0)+1;}
   rows.push({turn:t,fingerprint,stats:w.stats,stocks:stocks(E,w),ledger:w.ledger,demography:w.demography});
   if(t<turns){const r=observe(E,w);w=r.world;for(const [bucket,species]of Object.entries(r.row))for(const [s,values]of Object.entries(species))for(const [key,v]of Object.entries(values)){const a=(totals[bucket]??={})[s]??=((totals[bucket][s])={});a[key]=E.S.round((a[key]||0)+v);}if(t<6)plain=E.step(plain);rows.at(-1).transactions=r.row;}
  }
  const result={id,treatment,productionVersion:ref.productionVersion,productAdopted:false,variant:'habitat-movement',derivedControl:treatment==='lower-only',config:w.config,states:rows.length,productionReferenceMatched:7,observerCacheMatched:Math.min(6,turns)+1,initial:rows[0].stats,final:w.stats,initialStocks:rows[0].stocks,finalStocks:rows.at(-1).stocks,totals,deaths,demography:w.demography,
   prey:Object.fromEntries(E.S.D.species.filter(s=>s.group==='prey').map(s=>[s.id,{initial:rows[0].stats.counts[s.id],final:w.stats.counts[s.id],births:w.tallies.births[s.id]||0,lastAlive:Math.max(-1,...rows.filter(r=>r.stats.counts[s.id]>0).map(r=>r.turn)),descendantReproduced:Object.values(w.demography||{}).filter(c=>c.species===s.id&&c.generation>0).reduce((n,c)=>n+c.reproduced,0)}])),sourceHashes:before,elapsedMs:Math.round(performance.now()-start)};
  assert.deepEqual(hashes(),before,'executed sources changed');results.push(result);
  if(out){fs.mkdirSync(out,{recursive:true});const name=id+'-'+treatment;fs.writeFileSync(path.join(out,name+'.json.gz'),zlib.gzipSync(JSON.stringify(rows)));fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify(result,null,2));}
  console.log(JSON.stringify({id,treatment,food:w.stats.food,prey:result.prey,habitats:result.finalStocks.habitats,elapsedMs:result.elapsedMs}));
 }
 return results;
}
module.exports={run};
if(require.main===module)run(process.argv[2]||'lake',{out:path.resolve(process.argv[3]||'artifacts/trophic-habitat-v4.1.3')});
