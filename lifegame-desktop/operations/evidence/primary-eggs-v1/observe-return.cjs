'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=process.env.LIFEGAME_ROOT||path.resolve(__dirname,'../../..');
const previous=JSON.parse(fs.readFileSync(path.join(root,'operations/evidence/primary-eggs-v1/return-path.json'),'utf8'));
const E=require(path.join(root,'src/ecology/observation-model.js')).model(previous.condition.advantageSettings),S=E.S;
const species=['leafparasite','tideparasite'];
const trace=Object.fromEntries(species.map(s=>[s,{released:0,establishedFromEggParent:0,directChildrenReachedTerminal:0,directChildrenReproduced:0,releaseTurns:[],establishmentTurns:[],reproductionTurns:[]}]));
const emitted=new Set(),children=new Set(),terminal=new Set(),breeders=new Set();
const reproduce=E.P.reproduce,begin=E.P.begin;
E.P.reproduce=(w,c)=>{const ids=new Set(w.primaryInocula.map(i=>i.id));const r=reproduce(w,c);
 for(const i of w.primaryInocula)if(!ids.has(i.id)&&i.egg){const t=trace[i.species];t.released++;t.releaseTurns.push(w.turn);emitted.add(i.parentId);
 if(children.has(i.parentId)&&!breeders.has(i.parentId)){breeders.add(i.parentId);t.directChildrenReproduced++;t.reproductionTurns.push(w.turn);}}
 return r;};
E.P.begin=(w,c)=>{const r=begin(w,c);for(const {p}of S.PrimaryParasite.entries(w)){
 if(p.primary.origin==='descendant'&&p.primary.parents.some(id=>emitted.has(id))&&!children.has(p.id)){children.add(p.id);trace[p.species].establishedFromEggParent++;trace[p.species].establishmentTurns.push(w.turn);}
 if(children.has(p.id)&&p.stage==='terminal'&&!terminal.has(p.id)){terminal.add(p.id);trace[p.species].directChildrenReachedTerminal++;}}
 return r;};
let w=E.create(previous.condition);const checkpoints=[],turns=[],totals={},started=Date.now();
for(let n=1;n<=250;n++){
 w=E.step(w);const issues=E.invariants(w);if(issues.length)throw Error('T'+n+': '+issues.join(','));
 const bySpecies=Object.fromEntries(species.map(s=>[s,{count:0,stages:{first:0,middle:0,terminal:0,extra:0}}]));
 for(const {p}of S.PrimaryParasite.entries(w)){bySpecies[p.species].count++;bySpecies[p.species].stages[p.stage]++;}
 const eggs=w.observation.primaryParasite.eggs;for(const [k,v]of Object.entries(eggs))if(typeof v==='number')totals[k]=(totals[k]||0)+v;
 const point={turn:n,P:S.PrimaryParasite.summary(w).count,Q:S.HyperParasite.summary(w).count,bySpecies,eggStock:w.primaryParasiteSummary.eggs,eggFlow:eggs};turns.push(point);
 if(n%25===0){checkpoints.push(point);console.log(JSON.stringify(point));}
}
const result={source:'6ebfa13',engine:'src/ecology/observation-model.js (generated product)',condition:w.config,turns:250,checkpoints,trace,eggFlowTotals:totals,invariantFailures:0,elapsedMs:Date.now()-started,perTurn:turns,limits:'One representative condition. Direct founding-record tracking excludes split descendants; not a survival-rate or 500T certification.'};
fs.writeFileSync(process.argv[2]||'/tmp/valis-eggs-extended.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({trace,eggFlowTotals:totals,elapsedMs:result.elapsedMs}));
