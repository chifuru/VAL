'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),M=require('../../../src/ecology/observation-model.js'),fixed=require('../i11d-lower-renewal-v1/check-cases.json');
const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];},limit=Number(get('--turns',50)),id=get('--case','river-0'),resume=get('--resume',null),out=path.resolve(get('--out','/tmp/consumer-comparison'));
fs.mkdirSync(out,{recursive:true});const E=M.model(),S=E.S,G=S.ConsumerGroup,task=fixed.cases.find(c=>c.id===id);assert(task);const config={...structuredClone(task.config),balanceModel:'survival/4',consumerModel:'group/1'};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),sourceHash=hash(fs.readFileSync(path.join(root,'src/ecology/observation-modules.js')));
let w,data;if(resume){const r=JSON.parse(fs.readFileSync(resume));assert.equal(r.data.sourceHash,sourceHash);w=r.w;data=r.data;}else{
 w=E.create(config);const baseline=E.create({...task.config,balanceModel:'survival/4'});assert.deepEqual(w.stats.counts,baseline.stats.counts);assert.deepEqual(S.totals(w),S.totals(baseline));
 data={definition:'consumer-group-comparison/1',case:id,sourceHash,config:w.config,initial:w.stats.counts,series:[],baselineCommit:'23b2e18',checks:0,elapsedMs:0};
}
const start=performance.now();function inspect(){assert.deepEqual(E.invariants(w),[],id+' T'+w.turn);data.checks++;
 const row={turn:w.turn,main:w.stats.main,producer:w.colonySummary?.land.count+w.colonySummary?.water.count,fungus:w.stats.counts.fungus,groups:structuredClone(w.consumerGroupSummary.species),counts:{...w.stats.counts},agents:w.organisms.length,totalIndividuals:w.stats.population,births:{...w.tallies.births},deaths:{...w.tallies.deaths}};
 const prev=data.series.at(-1);if(prev)for(const species of G.species){const a=row.groups[species];assert.equal(a.individuals,prev.groups[species].individuals+a.born-a.combat-a.harvest-a.starvation-a.age,'population ledger '+species+' T'+w.turn);}
 data.series.push(row);if(w.turn%25===0||w.turn===limit)console.log(JSON.stringify({case:id,turn:w.turn,grassbug:row.groups.grassbug.individuals,waterbug:row.groups.waterbug.individuals,groups:[row.groups.grassbug.groups,row.groups.waterbug.groups],main:row.main}));
}
if(!resume)inspect();while(w.turn<limit){w=E.step(w);inspect();}
data.elapsedMs+=performance.now()-start;data.final=w.stats.counts;data.fingerprint=E.fingerprint(w);data.turns=w.turn;
fs.writeFileSync(path.join(out,id+'-T'+limit+'.json'),JSON.stringify(data)+'\n');fs.writeFileSync(path.join(out,id+'-resume.json'),JSON.stringify({data,w}));
