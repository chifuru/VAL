'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const generated=require('../../../../src/ecology/observation-model.js'),source=require('../../../../design/advantage-switches/model.cjs');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const config={seed:'i11e-source-parity',width:16,height:12,initial:8,lineages:'manual',selected:['solar','ryouki'],ryoukiModel:'ryouki/1',ageModel:'life/1',balanceModel:'survival/4',consumerModel:'group/1',ecologyRevision:'observation/4.1',producerModel:'colony/1',enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
const report={definition:'i11e-source-parity/1',config,checks:[],passed:false};
try{for(let bits=0;bits<8;bits++){
 const flags={producer:!!(bits&1),waterbug:!!(bits&2),hyperparasite:!!(bits&4)},a=source.model(flags),b=generated.model(flags);let x=a.create(config),y=b.create(config);
 for(let turn=0;turn<=1;turn++){assert.deepEqual(y,x);assert.deepEqual(b.invariants(y),[]);report.checks.push({bits,turn,sha256:hash(y)});if(!turn){x=a.step(x);y=b.step(y);}}
}report.passed=true;}catch(e){report.error=String(e.stack);process.exitCode=1;}finally{fs.writeFileSync(path.join(__dirname,'source-parity.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,states:report.checks.length,error:report.error}));}
