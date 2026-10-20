'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),M=require('../../../src/ecology/observation-model.js'),fixed=require('../i11d-lower-renewal-v1/check-cases.json');
const id=process.argv[2]||'river-0',limit=Number(process.argv[3]||50),task=fixed.cases.find(c=>c.id===id);
assert(task);const E=M.model(),config={...structuredClone(task.config),balanceModel:'survival/4',consumerModel:'group/1',consumerGroupSettings:{version:'consumer-group-parameters/3'}};
let w=E.create(config);const initial=w.stats.counts,rows=[];
for(let turn=0;turn<=limit;turn++){
 assert.deepEqual(E.invariants(w),[],id+' T'+w.turn);
 const grass=w.consumerGroupSummary.species.grassbug,water=w.consumerGroupSummary.species.waterbug;
 rows.push({turn:w.turn,grassbug:grass.individuals,waterbug:water.individuals,grassGroups:grass.groups,waterGroups:water.groups,grassBirths:grass.born,grassLosses:grass.combat+grass.harvest+grass.starvation+grass.age,main:w.stats.main,agents:w.organisms.length});
 if(turn<limit)w=E.step(w);
}
const report={definition:'grassbug-balance-check/1',source:'4.2.49',case:id,settings:config.consumerGroupSettings,initial,final:w.stats.counts,turns:limit,rows,fingerprint:E.fingerprint(w)};
fs.writeFileSync(path.join(__dirname,id+'-T'+limit+'.json'),JSON.stringify(report)+'\n');
console.log(JSON.stringify({case:id,turn:limit,grassbug:report.final.grassbug,waterbug:report.final.waterbug,grassMin:Math.min(...rows.map(r=>r.grassbug)),grassMax:Math.max(...rows.map(r=>r.grassbug)),main:rows.at(-1).main,agents:rows.at(-1).agents}));
