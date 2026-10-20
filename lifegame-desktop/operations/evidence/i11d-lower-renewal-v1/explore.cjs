'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),P=require('./private-model.cjs'),U=require('../../../tools/i11-ecology-evaluate.cjs');
const variants=process.argv.includes('--variant')?[process.argv[process.argv.indexOf('--variant')+1]]:P.variants;
const turns=Number(process.env.I11D_TURNS||50),ids=(process.env.I11D_CASES||'river-0,lake-1').split(','),out=path.resolve(process.env.I11D_OUT||path.join(__dirname,'screen'));
const fixed=JSON.parse(fs.readFileSync(process.env.I11D_FIXED||path.join(P.root,'operations/evidence/i11c-local-survival-v1/fixed-cases.json'))),cases=fixed.cases.filter(c=>ids.includes(c.id));fs.mkdirSync(out,{recursive:true});
const add=(x,k,n=1)=>x[k]=(x[k]||0)+n,lower=o=>['grassbug','waterbug','fungus'].includes(o.species);
const sourceHash=U.modelIdentity(path.join(P.root,'src/ecology')).sourceHash;
for(const variant of variants){const {E,sources}=P.model(variant),S=E.S;let active=null;
 const feed=E.N.feed,reproduce=E.R.reproduce,settle=E.N.settle;
 E.N.feed=(w,c,...args)=>{const before=active?new Map(w.organisms.filter(lower).map(o=>[o.id,{o,E:o.E,M:o.M,B:o.B}])):null;const r=feed(w,c,...args);if(active)for(const {o,E:energy,M,B} of before.values()){
  const x=active.metrics[o.species],events=(c.events.get(o.id)||[]).filter(e=>e.type==='feed');add(x,'individualTurns');if(events.length)add(x,'fedTurns');
  for(const e of events){add(x,'assimilatedE',e.assimilated||0);add(x,'source:'+e.sourceType+':'+e.tag);}
  add(x,'reserveGain',o.E-energy);add(x,'materialGain',o.M-M);if(o.B<B){add(x,'harvestedB',B-o.B);if(o.B===0)add(x,'harvestedToZero');}
 }return r;};
 E.N.settle=(w,c,...args)=>{if(active)for(const o of w.organisms.filter(lower))add(active.metrics[o.species],'plannedMaintenance',c.costs.get(o.id).base);return settle(w,c,...args);};
 E.R.reproduce=(w,c)=>{if(active)for(const o of w.organisms.filter(lower)){const x=active.metrics[o.species];if(o.E<(o.species==='grassbug'?10:8))add(x,'birthEnergyLow');if(o.species==='fungus'){if(o.M<.2)add(x,'birthMaterialLow');if(o.B<3)add(x,'birthBodyLow');}}
  return reproduce(w,c);};
 for(const task of cases){const config={...structuredClone(task.config),balanceModel:'survival/3'},file=path.join(out,variant+'-'+task.id+'-T'+turns+'.json');
  if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file));assert.equal(old.sourceHash,sourceHash);assert.deepEqual(old.sources,sources);console.log(JSON.stringify({skip:true,variant,case:task.id}));continue;}
  let w=E.create(config);const start=performance.now(),initial=w.stats.counts,series=[],seen=new Set(w.organisms.map(o=>o.id)),born={},nextGenerationParents=new Set();
  active={metrics:Object.fromEntries(['grassbug','waterbug','fungus'].map(id=>[id,{}])),deaths:{}};
  const inspect=()=>{assert.deepEqual(E.invariants(w),[]);for(const o of w.organisms)if(lower(o)&&!seen.has(o.id)){seen.add(o.id);born[o.species]??=[];born[o.species].push({id:o.id,generation:o.generation||0,parents:o.parents||[]});for(const id of o.parents||[])if(!id.startsWith('i:'))nextGenerationParents.add(id);}
   let edible=0,base=0,low=0;for(const o of w.organisms)if(S.spec(o).group==='plant'||S.LargePlant.is(o)){edible+=S.edibleB(o);base++;if(S.edibleB(o)<.1)low++;}
   series.push({turn:w.turn,main:w.stats.main,grassbug:w.stats.counts.grassbug,waterbug:w.stats.counts.waterbug,fungus:w.stats.counts.fungus,producerCount:base,edibleB:S.round(edible),depletedProducers:low,carcassE:S.round(w.carcasses.reduce((s,a)=>s+a.E,0))});};
  inspect();for(let t=1;t<=turns;t++){w=E.step(w);inspect();for(const d of w.last.deathCauses||[])if(lower(d))add(active.deaths,d.species+':'+d.reason);}
  const tail=series.slice(-Math.min(10,turns)),result={baseline:'803f677',privateVariant:variant,case:task.id,turns,sourceHash,sources,requestedConfig:config,effectiveConfigHash:U.hash(w.config),initial,final:w.stats.counts,births:w.tallies.births,metrics:active.metrics,deaths:active.deaths,tailMean:Object.fromEntries(['grassbug','waterbug','fungus'].map(k=>[k,tail.reduce((s,r)=>s+r[k],0)/tail.length])),born,offspringParentsReproduced:nextGenerationParents.size,finalGenerations:Object.fromEntries(['grassbug','waterbug','fungus'].map(k=>[k,w.organisms.filter(o=>o.species===k).reduce((a,o)=>(add(a,o.generation||0),a),{})])),series,fingerprint:E.fingerprint(w),invariantStates:turns+1,wallMs:performance.now()-start};
  assert.equal(U.modelIdentity(path.join(P.root,'src/ecology')).sourceHash,sourceHash);fs.writeFileSync(file,JSON.stringify(result)+'\n');console.log(JSON.stringify({variant,case:task.id,turns,final:Object.fromEntries(['grassbug','waterbug','fungus'].map(k=>[k,result.final[k]])),tail:result.tailMean,births:Object.fromEntries(['grassbug','waterbug','fungus'].map(k=>[k,result.births[k]||0])),wallMs:result.wallMs}));active=null;
 }
}
