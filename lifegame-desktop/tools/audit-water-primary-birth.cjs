'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {model}=require('../design/trophic-foundation/habitat-model.cjs'),{lowerOnly}=require('../design/trophic-foundation/observe.cjs');
const root=path.resolve(__dirname,'..');
function run(id,out){
 assert(['custom','lake'].includes(id));const E=model({allocation:true}),S=E.S,config=require('../operations/evidence/energy-precision-v4.1.3/baseline/'+id+'-full.json').config;
 const files=['tools/audit-water-primary-birth.cjs','design/trophic-foundation/habitat-model.cjs','design/trophic-foundation/observe.cjs','design/renewal-screen-v2/model.cjs','design/renewal-screen-v2/allocation.txt',...fs.readdirSync(path.join(root,'src/ecology')).filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f)];
 const hashes=()=>Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),before=hashes();
 let w=lowerOnly(E,E.create(config)),plain=structuredClone(w);S.prepareGeometry(w);const rows=[],totals={};
 for(let t=1;t<=200;t++){
  const old=E.R.reproduce,row={turn:t,alive:0,eligible:0,withHabitatSite:0,withEmptySite:0,withCARule:0,eligibleWithEmpty:0,eligibleWithCARule:0,candidates:0};
  E.R.reproduce=(world,ctx)=>{
   const m=S.maps(world),bugs=world.organisms.filter(o=>o.species==='waterbug');
   for(const o of bugs){row.alive++;const eligible=E.R.eligible(world,o,ctx);row.eligible+=eligible;
    const habitat=S.nearby(world,o.cell).filter(cell=>S.validHabitat(world,S.spec(o),cell)&&S.oneStep(world,o.cell,cell));
    const empty=habitat.filter(cell=>!m.food.has(cell)),rule=empty.filter(cell=>[2,3].includes(S.nearby(world,cell).filter(p=>m.food.get(p)?.species==='waterbug').length));
    row.withHabitatSite+=habitat.length>0;row.withEmptySite+=empty.length>0;row.withCARule+=rule.length>0;row.eligibleWithEmpty+=eligible&&empty.length>0;row.eligibleWithCARule+=eligible&&rule.length>0;
   }
   row.candidates=E.R.candidates(world,ctx).filter(c=>c.species==='waterbug').length;return old(world,ctx);
  };
  try{w=E.step(w);}finally{E.R.reproduce=old;}
  assert.deepEqual(E.invariants(w),[]);if(t<=6){plain=E.step(plain);assert.equal(E.fingerprint(w),E.fingerprint(plain),'birth observation changed world');}
  for(const [k,v]of Object.entries(row))if(k!=='turn')totals[k]=(totals[k]||0)+v;row.count=w.stats.counts.waterbug;row.fingerprint=E.fingerprint(w);rows.push(row);
 }
 const reference=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(root,'operations/evidence/trophic-foundation-v4.1.3/habitat',id+'-lower-only.json.gz'))));for(const row of rows)assert.equal(row.fingerprint,reference[row.turn].fingerprint,'all-turn habitat reference');
 assert.deepEqual(hashes(),before);const result={id,scope:'derived lower-only habitat trial; no production changes',states:201,matchedTurns:200,totals,finalWaterbug:w.stats.counts.waterbug,sourceHashes:before};
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,id+'-birth.json.gz'),zlib.gzipSync(JSON.stringify(rows)));fs.writeFileSync(path.join(out,id+'-birth.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return result;
}
module.exports={run};if(require.main===module)run(process.argv[2],path.resolve(process.argv[3]));
