// Historical I11 baseline recorder, originally run against af9ae14 generated profiles.
// Output was captured before the survival/1 implementation; rerunning after a rebuild uses the current generated profiles.
const fs=require('node:fs'),path=require('node:path'),M=require('../../../../src/ecology/observation-model.js');
const output=process.argv[2]||path.join(__dirname,'baseline-rerun.json');
const base={seed:'i11/parasite-diagnosis',terrainSeed:'i11/river',width:40,height:28,initial:80,lineages:'manual',selected:['ryouki','solar','whale','jelly','recursive'],weights:{},placement:'natural',distribution:'balanced',guarantee:false,enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true},landscape:'templates',mapId:'river',ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',blockTurns:500,producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',producerSupport:{enabled:false}};
const results=[];
for(const [name,patch]of [['baseline',{}],['higherQReserve',{hyperParasiteSettings:{initialEnergy:.35}}]]){
 const E=M.model();let w=E.create({...base,...patch});const initial={P:w.config.primaryParasiteInitial,Q:w.config.hyperParasiteInitial,PSettings:w.config.primaryParasiteSettings,QSettings:w.config.hyperParasiteSettings},rows=[],deaths={},flows={P:{},Q:{}};const at=performance.now();
 for(let t=0;t<=32;t++){
  const q=E.S.HyperParasite.entries(w).map(({q,p,host,kind})=>({id:q.id,E:q.E,age:q.age,phase:q.phase,kind,cell:q.cell??host?.cell,p:p?.id,stage:p?.stage,last:q.hyper.last}));
  rows.push({t,P:w.primaryParasiteSummary,Q:w.hyperParasiteSummary,Qs:q});
  if(t===32)break;w=E.step(w);
  const errors=E.invariants(w);if(errors.length)throw Error(errors.join('\n'));
  for(const d of w.last.deathCauses||[])if(['leafparasite','tideparasite','hyperparasite'].includes(d.species)){const k=d.species+'/'+d.reason;deaths[k]=(deaths[k]||0)+1;}
  for(const [tag,rows]of [['P',Object.values(w.observation.primaryParasite.bySpecies).flatMap(Object.values)],['Q',Object.values(w.observation.hyperParasite.bySpecies)]])for(const s of rows)for(const [k,v]of Object.entries(s))if(typeof v==='number')flows[tag][k]=(flows[tag][k]||0)+v;
 }
 results.push({name,initial,rows,deaths,flows,ms:performance.now()-at});fs.writeFileSync(output,JSON.stringify({config:base,results},null,2));console.log(name,JSON.stringify({initialP:initial.P.actual,initialQ:initial.Q,QFinal:w.hyperParasiteSummary,dead:deaths,flows,ms:performance.now()-at}));
}
