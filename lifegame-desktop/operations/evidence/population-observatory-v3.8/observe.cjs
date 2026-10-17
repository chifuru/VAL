const fs=require('fs'),path=require('path');const E=require(path.join(process.env.LIFEGAME_MODEL_ROOT||path.resolve(__dirname,'../../../src'),'ecology/engine.js')),S=E.S;
const results=[];
for(const lineages of ['all','few']){
 let w=E.create({seed:'ECOSYSTEM-2026',terrainSeed:'ECOSYSTEM-2026',mapId:'river',landscape:'templates',ageModel:'life/1',width:40,height:28,initial:80,lineages,guarantee:false});
 const snapshots=[],mainCauses={combat:0,starvation:0,age:0},t0=performance.now();
 for(let t=0;t<=1000;t++){
 if([0,100,250,500,750,1000].includes(t)){
 const organisms=w.organisms.filter(o=>S.spec(o).group==='main');const row={turn:t,main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,phases:[1,2,3,4].map(n=>organisms.filter(o=>o.phase===n).length),growing:organisms.filter(o=>o.generation>0).length,energetic:organisms.filter(o=>o.E>=S.spec(o).birthEnergy).length,healthy:organisms.filter(o=>o.HP>=70).length,material:organisms.filter(o=>o.M>=4).length,births:Object.fromEntries(S.D.main.map(s=>[s.id,w.tallies.births[s.id]])),counts:w.stats.counts};snapshots.push(row);console.log(lineages,t,row.main,row.phases,'descendants',row.growing,'E',row.energetic,'HP',row.healthy,'M',row.material);}
 if(t===1000)break;w=E.step(w);const errors=E.invariants(w);if(errors.length)throw Error(errors);for(const d of w.last.deathCauses)if(S.spec({species:d.species}).group==='main')mainCauses[d.reason]++;
 }
 results.push({lineages,snapshots,mainCauses,ms:performance.now()-t0,fingerprint:E.fingerprint(w),config:w.config});fs.writeFileSync(process.env.LIFEGAME_POP_OUT||path.join(require('os').tmpdir(),'lifegame-population.json'),JSON.stringify({results},null,2));
}
