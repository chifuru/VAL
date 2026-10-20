'use strict';
// Actual product model. No private coefficient transforms or periodic respawn.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),U=require('../../../tools/i11-ecology-evaluate.cjs'),M=require('../../../src/ecology/observation-model.js');
const turns=Number(process.env.I11D_TURNS||50),ids=(process.env.I11D_CASES||'river-0,lake-1').split(','),out=path.resolve(process.env.I11D_OUT||path.join(__dirname,'colonies'));
const fixed=JSON.parse(fs.readFileSync(process.env.I11D_FIXED||path.join(__dirname,'check-cases.json'))),cases=fixed.cases.filter(c=>ids.includes(c.id));
assert.equal(cases.length,ids.length);assert(Number.isSafeInteger(turns)&&turns>0&&turns<=500);fs.mkdirSync(out,{recursive:true});
const identity=U.modelIdentity(path.join(root,'src/ecology')),add=(x,k,n=1)=>x[k]=(x[k]||0)+n;
for(const task of cases){
 const E=M.model(),S=E.S,config={...structuredClone(task.config),balanceModel:'survival/4'},file=path.join(out,task.id+'-T'+turns+'.json');
 if(fs.existsSync(file))throw Error('Refusing to overwrite evidence: '+file);
 let w=E.create(config);const initial={...w.stats.counts},initialIDs=new Set(w.organisms.filter(S.FungalColony.is).map(o=>o.id)),seen=new Set(initialIDs),born=[],series=[],deaths={},feedBySource={},start=performance.now();
 const feed=E.N.feed;let active=false;
 E.N.feed=(world,ctx,...args)=>{const result=feed(world,ctx,...args);if(active)for(const o of world.organisms.filter(S.FungalColony.is))for(const e of ctx.events.get(o.id)||[])if(e.type==='feed'){const key=e.sourceType+':'+e.tag;add(feedBySource,key,e.assimilated||0);}return result;};
 function inspect(){assert.deepEqual(E.invariants(w),[]);const fungi=w.organisms.filter(S.FungalColony.is);for(const o of fungi)if(!seen.has(o.id)){seen.add(o.id);born.push({id:o.id,generation:o.generation||0,parents:o.parents||[]});}
  const f=w.fungalColonySummary,plants=w.organisms.filter(o=>S.spec(o).group==='plant');
  series.push({turn:w.turn,main:w.stats.main,grassbug:w.stats.counts.grassbug,waterbug:w.stats.counts.waterbug,fungus:w.stats.counts.fungus,initialFungalBases:fungi.filter(o=>initialIDs.has(o.id)).length,...Object.fromEntries(['B','baseB','edibleB','reserveE','reserveM','consumedB','regrowthB','regrowthCostE','assimilatedE','dormantCount'].map(k=>[k,f[k]])),producerCount:plants.length,producerEdibleB:S.round(plants.reduce((s,o)=>s+S.edibleB(o),0)),carcassE:S.round(w.carcasses.reduce((s,o)=>s+o.E,0))});
 }
 inspect();active=true;for(let t=1;t<=turns;t++){w=E.step(w);inspect();for(const d of w.last.deathCauses||[])if(['fungus','grassbug','waterbug'].includes(d.species))add(deaths,d.species+':'+d.reason);}
 const finalFungi=w.organisms.filter(S.FungalColony.is),flows=Object.fromEntries(['consumedB','regrowthB','regrowthCostE','assimilatedE'].map(k=>[k,S.round(series.reduce((n,r)=>n+r[k],0))]));
 assert.equal(born.length,w.tallies.births.fungus||0);assert.equal(U.modelIdentity(path.join(root,'src/ecology')).sourceHash,identity.sourceHash);
 const result={definition:'i11d-fungal-colonies/1',baseline:'803f677',case:task.id,turns,requestedConfig:config,effectiveConfig:w.config,initial,final:w.stats.counts,births:w.tallies.births,deaths,born,finalFungalGenerations:finalFungi.reduce((a,o)=>(add(a,o.generation||0),a),{}),initialBasesRemaining:finalFungi.filter(o=>initialIDs.has(o.id)).length,measuredFlows:flows,feedAssimilationBySource:feedBySource,series,invariantStates:turns+1,fingerprint:E.fingerprint(w),sourceHash:identity.sourceHash,sourceFiles:identity.sources,runnerHash:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),wallMs:performance.now()-start,scope:'Same preregistered main80/40x28 cases as old lower check; no private grass changes, extra initial E/B/M or external fungal supply. Count is groups, not individual survival. Not all-lineage R1-R6 certification.'};
 fs.writeFileSync(file,JSON.stringify(result)+'\n');console.log(JSON.stringify({case:task.id,turns,final:{grassbug:w.stats.counts.grassbug,waterbug:w.stats.counts.waterbug,fungus:w.stats.counts.fungus},flows,initialBasesRemaining:result.initialBasesRemaining,deaths,wallMs:result.wallMs}));
}
