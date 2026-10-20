'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../../../..'),variant=process.env.I11_VARIANT||'legacy-parity';
if(!['baseline','candidate','legacy-parity'].includes(variant))throw Error('Invalid I11_VARIANT');
const M=require(path.join(root,variant==='baseline'?'src/ecology/observation-model.js':'design/advantage-switches/model.cjs'));
const sourceFiles=[...fs.readdirSync(root+'/src/ecology').filter(f=>f.endsWith('.js')).map(f=>'src/ecology/'+f),'design/advantage-switches/model.cjs','design/advantage-switches/transform.cjs','design/aquatic-producer/transform.cjs','design/layered-primary/model.cjs','design/renewal-screen-v2/allocation.txt'],sourceSHA=Object.fromEntries(sourceFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),startedAt=new Date().toISOString();
const E=M.model(),S=E.S, balance=variant==='candidate';
const common={width:40,height:28,initial:160,lineages:'manual',landscape:'templates',placement:'natural',distribution:'balanced',guarantee:false,
 ageModel:'life/1',ecologyRevision:'observation/4.1',randomModel:'table/1',blockTurns:500,populationRegulation:{version:1},
 producerModel:'colony/1',largePlantModel:'independent/1',ryoukiModel:'ryouki/1',primaryParasiteModel:'primary/1',hyperParasiteModel:'hyper/1',informationModel:'persistent/1',relationshipModel:'network/1',generationModel:'diverse/1',generationSettings:{mode:'manual',profile:'standard'},
 observationMode:'custom',producerSupport:{enabled:true},initialConditions:{version:1,density:{plant:0,fungus:.03,prey:.06},resources:{mineral:1,droplet:1,info:0},distribution:'habitat'},enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
const cases=[{id:'river-0',mapId:'river',selected:['ryouki','solar','myth','crystal','swarm','kelp','whale']},{id:'lake-1',mapId:'lake',selected:['abyss','abyssshell','jelly','kelp','whale']},{id:'woodland-2',mapId:'woodland',selected:['recursive','gravity','memory','serpent','antimeme','cephalopod','precocial']}];
fs.mkdirSync(process.env.I11_OUT||__dirname,{recursive:true});
const results=[],turns=Number(process.env.I11_TURNS||100),out=path.join(process.env.I11_OUT||__dirname,variant+'-'+turns+'.json');
const add=(o,k,v=1)=>o[k]=(o[k]||0)+v;
const snap=w=>({turn:w.turn,population:w.stats.population,main:w.stats.main,counts:w.stats.counts,phases:w.stats.phases,resources:w.resources.length,births:w.tallies.births,deaths:w.tallies.deaths,causes:w.tallies.causes,demography:w.demography,edible:w.organisms.filter(o=>S.Colony.is(o)).reduce((n,o)=>n+S.edibleB(o),0),mainMean:Object.fromEntries(['E','B','M','HP'].map(k=>[k,w.organisms.filter(o=>o.slot==='main').reduce((n,o)=>n+o[k],0)/Math.max(1,w.stats.main)]))});
for(const c of cases){const cfg={...common,...c,...(balance?{balanceModel:'survival/1'}:{}),seed:'i11/baseline/'+c.id,terrainSeed:'i11/baseline/map/'+c.id};delete cfg.id;const start=performance.now();let w;try{w=E.create(cfg);}catch(error){results.push({id:c.id,error:String(error)});fs.writeFileSync(out,JSON.stringify({turns,results},null,2));continue;}
 const createMs=performance.now()-start,r={id:c.id,request:cfg,resolved:w.config,initial:snap(w),snapshots:[],perSpeciesDeaths:{},birthReasons:{},stepMs:[],invariantMs:0,events:{},observedRelations:{},windows:{}};
 for(let t=1;t<=turns;t++){const at=performance.now();w=E.step(w);r.stepMs.push(performance.now()-at);const checkAt=performance.now(),errors=E.invariants(w);r.invariantMs+=performance.now()-checkAt;if(errors.length)throw Error(JSON.stringify(errors));
 for(const d of w.last.deathCauses){r.perSpeciesDeaths[d.species]??={};add(r.perSpeciesDeaths[d.species],d.reason);}
 for(const [id,vals]of Object.entries(w.observation?.birthReasons||{})){r.birthReasons[id]??={};for(const [reason,n]of Object.entries(vals))add(r.birthReasons[id],reason,n);}
 for(const e of w.events)add(r.events,e.type);
 for(const [k,v]of Object.entries(w.observation?.relations||{}))add(r.observedRelations,k,v);
 if(t===100)r.fingerprint100=E.fingerprint(w);if(t%25===0){r.snapshots.push(snap(w));console.log(c.id,t,w.stats.main,w.stats.population,Math.round(performance.now()-start)+'ms');}
 }
 r.final=snap(w);r.totalMs=performance.now()-start;r.fingerprint=E.fingerprint(w);results.push(r);fs.writeFileSync(out,JSON.stringify({baseline:'af9ae14',product:'4.2.42',candidate:balance,balanceModel:balance?'survival/1':'legacy',startedAt,sourceSHA,turns,results},null,2));
 console.log(c.id,'DONE',JSON.stringify({main:w.stats.main,counts:w.stats.counts,ms:r.totalMs}));
}
