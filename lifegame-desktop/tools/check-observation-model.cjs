'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib'),crypto=require('node:crypto');
const E=require('../src/ecology/observation-model.js').model(),ref=require('../operations/evidence/favored-free-v2.8/river-favored-v3.json');
let w=E.create(ref.config);const rows=[],start=performance.now();
for(let turn=0;turn<=500;turn++){
 assert.deepEqual(E.invariants(w),[],String(turn));const t=E.S.totals(w);assert.equal(Math.abs(E.S.round(t.E+w.ledger.sinks-w.ledger.initialE-w.ledger.solar)),0);assert.equal(Math.abs(E.S.round(t.M+w.ledger.Mloss-w.ledger.initialM)),0);
 rows.push({turn,stats:w.stats,counts:w.stats.counts,Qsearch:w.searchQ.length,ledger:w.ledger});
 if(turn%100===0)console.log(JSON.stringify({turn,main:w.stats.main,waterbug:w.stats.counts.waterbug,Q:w.stats.Q,elapsedMs:Math.round(performance.now()-start)}));
 if(turn<500)w=E.step(w);
}
assert.deepEqual(w.stats,ref.final);assert(w.stats.main>0&&w.stats.counts.waterbug>0&&w.stats.Q>0);
const out='operations/evidence/observation-model-v4.2/';fs.writeFileSync(out+'river-500.json',JSON.stringify({states:501,config:w.config,final:w.stats,Qsearch:w.searchQ.length,elapsedMs:Math.round(performance.now()-start),matchesReference:'favored-free/3 river final statistics',fingerprint:E.fingerprint(w),moduleHash:crypto.createHash('sha256').update(fs.readFileSync('src/ecology/observation-modules.js')).digest('hex')},null,2));fs.writeFileSync(out+'river-500.json.gz',zlib.gzipSync(JSON.stringify(rows)));
