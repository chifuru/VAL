'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=require('node:path').resolve(__dirname,'../../..'),E=require(root+'/src/ecology/engine.js');
const out=root+'/operations/evidence/feeding-regression-v4.1.1';
const original=require(root+'/operations/evidence/colony-survival-v3.4/mixed-after.json').trials[0];
const cases=[{id:'historical-input',config:{...original.config,ecologyRevision:'observation/4.1'}},...require(root+'/operations/evidence/headless-baseline-v4.1/report.json').cases.map(c=>({id:c.id,config:c.config}))];
const results=[];
for(const c of cases){let w=E.create(c.config);const rows=[];const start=Date.now();
 for(let t=0;t<=500;t++){const errors=E.invariants(w);if(errors.length)throw Error(c.id+' '+t+' '+JSON.stringify(errors));rows.push({turn:t,fingerprint:E.fingerprint(w),stats:w.stats});if(t<500)w=E.step(w);}
 fs.writeFileSync(out+'/'+c.id+'.json.gz',zlib.gzipSync(JSON.stringify(rows)));
 const r={id:c.id,config:c.config,checkedStates:501,invariantErrors:0,elapsedMs:Date.now()-start,snapshots:rows.filter(r=>[0,100,300,500].includes(r.turn)).map(r=>({turn:r.turn,main:r.stats.main,food:r.stats.food,grassbug:r.stats.counts.grassbug,P:r.stats.P,Q:r.stats.Q})),fingerprint:E.fingerprint(w)};
 results.push(r);fs.writeFileSync(out+'/report.json',JSON.stringify({scope:'feeding regression; not R1-R6 balance certification',results},null,2));console.log(JSON.stringify(r));
}
const hashes={};for(const f of ['nutrition','behavior','catalogue','replay-version'])hashes['src/ecology/'+f+'.js']=crypto.createHash('sha256').update(fs.readFileSync(root+'/src/ecology/'+f+'.js')).digest('hex');fs.writeFileSync(out+'/source-hashes.json',JSON.stringify(hashes,null,2));
