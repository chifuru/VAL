const fs=require('fs'),assert=require('assert/strict'),Old=require('./baseline-src/ecology/observation-model.js'),New=require('/workspace/VAL/lifegame-desktop/src/ecology/observation-model.js');
const out=[];
for(const [width,height,initial,turns]of [[40,28,80,20],[80,56,320,8],[160,112,1280,3]]){
 const config={seed:'opt431-equal',width,height,initial,lineages:'few',landscape:'templates',mapId:'river',ageModel:'life/1',blockTurns:500,ecologyRevision:'observation/4.1',populationRegulation:{version:1}};
 const a=Old.model(),b=New.model();let x=a.create(config),y=b.create(config),t=performance.now();for(let n=0;n<turns;n++)x=a.step(x);const before=performance.now()-t;t=performance.now();for(let n=0;n<turns;n++)y=b.step(y);const after=performance.now()-t;assert.deepEqual(y,x);assert.deepEqual(b.invariants(y),[]);out.push({width,height,turns,before,after,equal:true});
}
fs.writeFileSync('/workspace/work/optimization-431/equality.json',JSON.stringify(out,null,2));console.log(out);
