"use strict";
// Small deterministic diagnostic, not a 500T survival qualification.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"../../../.."),Factory=require(path.join(root,"design/advantage-switches/model.cjs"));
const output=process.argv[2]||path.join(__dirname,"source-comparison.json"),turns=Number(process.argv[3]||32);
const source=()=>Object.fromEntries(["state","parasites","reproduction","nutrition","behavior","engine"].map(name=>[name,crypto.createHash("sha256").update(fs.readFileSync(path.join(root,"src/ecology",name+".js"))).digest("hex")]));
const sourceStart=source(),base={seed:"i11/parasite-diagnosis",terrainSeed:"i11/river",width:40,height:28,initial:80,lineages:"manual",selected:["ryouki","solar","whale","jelly","recursive"],weights:{},placement:"natural",distribution:"balanced",guarantee:false,enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true},landscape:"templates",mapId:"river",ageModel:"life/1",ecologyRevision:"observation/4.1",randomModel:"table/1",blockTurns:500,producerModel:"colony/1",largePlantModel:"independent/1",ryoukiModel:"ryouki/1",primaryParasiteModel:"primary/1",hyperParasiteModel:"hyper/1",informationModel:"persistent/1",relationshipModel:"network/1",producerSupport:{enabled:false}};
const cases=[{name:"unversioned",patch:{}},{name:"survival",patch:{balanceModel:"survival/1"}}].map(row=>({...row,E:Factory.model({producer:false,waterbug:false,hyperparasite:false})}));
if(process.argv[4])base.hyperParasiteSettings={initialEnergy:Number(process.argv[4])};
function add(target,rows){for(const row of Object.values(rows||{}))for(const [key,value]of Object.entries(row))if(typeof value==="number")target[key]=(target[key]||0)+value;}
const results=[];
for(const {name,patch,E}of cases){
  let w=E.create({...base,...patch});const initial=structuredClone({config:w.config,primary:w.config.primaryParasiteInitial,hyper:w.config.hyperParasiteInitial}),rows=[],deaths={},flow={primary:{},hyper:{}},at=performance.now();
  for(let t=0;t<=turns;t++){
    const Q=E.S.HyperParasite.entries(w).map(({q,p,host,kind})=>({id:q.id,E:q.E,age:q.age,phase:q.phase,kind,cell:q.cell??host?.cell,parentP:p?.id,stage:p?.stage,last:structuredClone(q.hyper.last)}));
    rows.push({turn:w.turn,counts:structuredClone(w.stats.counts),primary:structuredClone(w.primaryParasiteSummary),hyper:structuredClone(w.hyperParasiteSummary),Q});
    if(t===turns)break;w=E.step(w);const errors=E.invariants(w);if(errors.length)throw Error(errors.join("\n"));
    for(const d of w.last.deathCauses||[])if(["leafparasite","tideparasite","hyperparasite"].includes(d.species)){const key=d.species+"/"+d.reason;deaths[key]=(deaths[key]||0)+1;}
    for(const routes of Object.values(w.observation.primaryParasite.bySpecies))add(flow.primary,routes);
    add(flow.hyper,w.observation.hyperParasite.bySpecies);
  }
  results.push({name,initial,rows,deaths,flow,ms:performance.now()-at});
  console.log(name,JSON.stringify({P:w.primaryParasiteSummary.count,Q:w.hyperParasiteSummary.count,deaths,flow,ms:performance.now()-at}));
}
const sourceEnd=source();fs.writeFileSync(output,JSON.stringify({definition:"i11-source-parasite-diagnostic/1",turns,advantage:{producer:false,waterbug:false,hyperparasite:false},sourceStart,sourceEnd,sourceStable:JSON.stringify(sourceStart)===JSON.stringify(sourceEnd),results},null,2)+"\n");
