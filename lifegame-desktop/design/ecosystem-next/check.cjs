"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{model}=require('./model.cjs');
const E=model(),selected=['solar','kelp','jelly','abyss','crystal'],checks=[];
for(let k=0;k<10;k++){
 const config={seed:'watershed-check-'+k,width:40,height:28,initial:80,lineages:'manual',selected};
 let a=E.create(config),b=E.create(config);
 assert.equal(E.fingerprint(a),E.fingerprint(b));assert.equal(a.stats.main,80);
 const terrain=a.tiles.reduce((m,t)=>(m[t.terrain]=(m[t.terrain]||0)+1,m),{});
 assert(a.tiles.every(t=>t.env>=0&&t.env<8));
 for(let turn=0;turn<20;turn++){a=E.step(a);b=E.step(b);assert.deepEqual(E.invariants(a),[]);assert.equal(E.fingerprint(a),E.fingerprint(b));}
 checks.push({seed:config.seed,turn:a.turn,main:a.stats.main,terrain});
}
const out=path.join(__dirname,'../../operations/evidence/ecosystem-next/generation-check.json');
fs.writeFileSync(out,JSON.stringify({scope:'10 maps; deterministic 20-turn smoke only; not survival acceptance',checks},null,2)+'\n');
console.log('10 deterministic map/20-turn checks passed; 300–500 survival not evaluated.');
