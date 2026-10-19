const fs=require('fs'),E=require('/workspace/VAL/lifegame-desktop/src/ecology/observation-model.js').model();
const rows=[];for(const supply of [false,true]){
 let w=E.create({seed:'opt431-cycle-'+supply,width:40,height:28,initial:80,lineages:'few',landscape:'templates',mapId:'river',ageModel:'life/1',ecologyRevision:'observation/4.1',blockTurns:500,randomModel:'table/1',populationRegulation:{version:1},initialConditions:{version:1,density:{plant:.35,fungus:.03,prey:.06},resources:{mineral:1,droplet:1,info:1},distribution:'habitat'},producerSupport:{enabled:supply}});const log=[],at=performance.now();
 for(let i=0;i<=500;i++){const errors=E.invariants(w);if(errors.length)throw Error(errors.join(','));if(i%100===0)log.push({turn:w.turn,main:w.stats.main,counts:w.stats.counts,P:w.stats.P,Q:w.stats.Q});if(i<500)w=E.step(w);}
 rows.push({supply,elapsedMs:performance.now()-at,log,finalFingerprint:E.fingerprint(w),errors:[]});console.log(supply,log.at(-1));fs.writeFileSync('/workspace/work/optimization-431/populations.json',JSON.stringify(rows,null,2));
}
