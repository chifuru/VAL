const fs=require('fs'),path=require('path');const models={before:require(path.join(process.env.LIFEGAME_BASE_ROOT,'ecology/engine.js')),after:require(path.resolve(__dirname,'../../../src/ecology/engine.js'))};
const results=[];
for(const [model,E] of Object.entries(models)){const S=E.S,lineages='all';
 let w=E.create({seed:'ECOSYSTEM-2026',terrainSeed:'ECOSYSTEM-2026',mapId:'auto',landscape:'templates',ageModel:'life/1',width:80,height:56,initial:320,lineages,guarantee:false});
 const snapshots=[],mainCauses={combat:0,starvation:0,age:0},t0=performance.now();
 for(let t=0;t<=500;t++){
 if([0,100,250,500,750,1000].includes(t)){
 const organisms=w.organisms.filter(o=>S.spec(o).group==='main');const row={turn:t,main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,phases:[1,2,3,4].map(n=>organisms.filter(o=>o.phase===n).length),growing:organisms.filter(o=>o.generation>0).length,energetic:organisms.filter(o=>o.E>=S.spec(o).birthEnergy).length,healthy:organisms.filter(o=>o.HP>=70).length,material:organisms.filter(o=>o.M>=4).length,births:Object.fromEntries(S.D.main.map(s=>[s.id,w.tallies.births[s.id]])),counts:w.stats.counts};snapshots.push(row);console.log(model,t,row.main,row.phases,'descendants',row.growing,'E',row.energetic,'HP',row.healthy,'M',row.material);}
 if(t===500)break;w=E.step(w);const errors=E.invariants(w);if(errors.length)throw Error(errors);for(const d of w.last.deathCauses)if(S.spec({species:d.species}).group==='main')mainCauses[d.reason]++;
 }
 results.push({model,lineages,snapshots,mainCauses,ms:performance.now()-t0,fingerprint:E.fingerprint(w),config:w.config});fs.writeFileSync(process.env.LIFEGAME_POP_OUT||path.join(require('os').tmpdir(),'lifegame-standard.json'),JSON.stringify({results},null,2));
}
