/* Versioned cell records. Reads and validation never advance a world. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCellArchive=api;})(globalThis,()=>{
 'use strict';
 const model='cell-reorganization/1',definition='cell-ecosystem-terminal/1',stockDefinition='cell-terminal-stock/1',
  collections=['organisms','colonies','independentPlants','consumerGroups','fungalColonies','ryouki','primaryParasites','hyperParasites','informationField','informationSubjects'],
  bodies=['organisms','colonies','independentPlants','consumerGroups','fungalColonies','ryouki'],
  models=['consumerModel','balanceModel','relationshipModel','generationModel','producerModel','largePlantModel','ryoukiModel','primaryParasiteModel','hyperParasiteModel','parasiteCohortModel','parasiteDispersalModel','primaryEggModel','informationModel','socialRenewalModel','cellModel'],
  summaries=['cell','primaryParasite','primaryParasiteFlow','hyperParasite','hyperParasiteFlow','persistentInformation','persistentInformationFlow'],
  basicKeys=['id','species','slot','cell','phase','branch3','branch4','age','bornAt','birthLife','sex','role','generation','parents','B','E','M','G','HP','dna','cellLife','cellMatter','cellOccupancy','consumerGroup','ryouki','plant'];
 const copy=x=>structuredClone(x),pick=(x,keys)=>Object.fromEntries(keys.filter(k=>x?.[k]!==undefined).map(k=>[k,copy(x[k])])),
  number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0,integer=x=>Number.isSafeInteger(x)&&x>=0,
  same=(a,b)=>{if(Object.is(a,b))return true;if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const keys=Object.keys(a);return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));},
  fail=()=>{throw Error('マス方式の保存記録に欠測・版・状態・集計の不一致があります。');},near=(a,b)=>number(a)&&number(b)&&Math.abs(a-b)<.0001;
 function finite(value,seen=new Set(),depth=0){
  if(typeof value==='number'){if(!Number.isFinite(value))fail();return;}
  if(['function','symbol','bigint'].includes(typeof value))fail();
  if(!value||typeof value!=='object')return;
  if(depth>128||seen.has(value))fail();seen.add(value);
  if(Array.isArray(value))for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i)||value[i]===undefined)fail();
  for(const v of Object.values(value))finite(v,seen,depth+1);seen.delete(value);
 }
 function validate(record,engine,O){
  const c=record?.config,S=engine.S;
  if(record?.schema!==3||c?.cellModel!==model||c.generationModel!=='diverse/1'||typeof record.id!=='string'||!record.id.startsWith('record:')||
   typeof record.signature!=='string'||!record.signature||!integer(record.turn)||typeof record.reason!=='string'||typeof record.created!=='string'||!Number.isFinite(Date.parse(record.created))||
   !/^[a-f0-9]{64}$/.test(record.finalFingerprint)||record.hasObservations!==true||!(record.originRecordId===null||typeof record.originRecordId==='string'))fail();
  finite(record);S.WorldGeneration.validateResolved(c);const normalized=S.validate(c);
  for(const key of ['cellSettings','producerSettings','consumerGroupSettings','fungalColonySettings','largePlantSettings','ryoukiSettings','primaryParasiteSettings','hyperParasiteSettings','informationSettings'])if(!same(normalized[key],c[key]))fail();
  const observation=record.observation;
  if(observation?.definitions?.cell!=='cell-occupancy-observed/1'||observation.metadata?.version!==record.signature||!same(observation.metadata.config,c)||!Array.isArray(observation.rows)||observation.rows.length!==record.turn+1)fail();
  O.restore(observation,{validateOnly:true});const last=observation.rows.at(-1),f=record.final,s=f?.state,stock=s?.cell;
  if(!f||!same(f.counts,last.counts)||!same(f.current,last.current)||['main','food','P','Q'].some(k=>f[k]!==last[k])||!f.stats||!f.ledger||!f.tallies||!f.demography||
   s?.definition!==definition||s.turn!==record.turn||s.sampleLimit!==4||!same(s.models,pick(c,models))||
   !same(s.counts,last.counts)||!same(s.groups,last.current.groups)||!same(s.summaries,pick(last,summaries))||!near(s.totals?.E,f.stats.totals?.E)||!near(s.totals?.M,f.stats.totals?.M)||!near(s.totals?.biomassB,last.current.biomass.total)||
   stock?.definition!==stockDefinition||!Array.isArray(stock.soilM)||stock.soilM.length!==c.width*c.height)fail();
  for(const key of summaries.filter(k=>k!=='cell'))if(!same(f[key],last[key]))fail();
  const ledger=f.ledger;
  if(!['initialE','initialM','solar','sinks','Mloss'].every(k=>number(ledger[k]))||!near(f.stats.totals.E+ledger.sinks,ledger.initialE+ledger.solar)||!near(f.stats.totals.M+ledger.Mloss,ledger.initialM+(ledger.cellInputM||0)))fail();
  const probe={config:c,turn:record.turn,tiles:stock.soilM.map(soilM=>({soilM,blocked:false})),organisms:[],cellProfiles:stock.profiles,cellState:stock.state},byId=new Map(),species=new Set(observation.metadata.species.map(s=>s.id)),size=c.width*c.height;
  for(const key of collections){
   const a=s.examples?.[key];if(!a||!integer(a.total)||!integer(a.retained)||a.retained!==Math.min(4,a.total)||a.truncated!==(a.total>4)||!Array.isArray(a.items)||a.items.length!==a.retained||new Set(a.items.map(o=>o.id)).size!==a.retained)fail();
   for(const o of a.items){
    if(typeof o.id!=='string'||!o.id||!integer(o.cell)||o.cell>=size||key!=='informationField'&&!species.has(o.species))fail();
    if(bodies.includes(key)){
     if(!integer(o.age)||![1,2,3,4].includes(o.phase)||!['E','B','M','HP','G'].every(k=>number(o[k]))||!o.cellMatter)fail();
     if(key!=='organisms'&&!same(o.state,key==='consumerGroups'?o.consumerGroup:key==='ryouki'?o.ryouki:o.cellLife||o.plant))fail();
     const physical=pick(o,basicKeys),existing=byId.get(o.id);if(existing&&!same(existing,physical))fail();byId.set(o.id,physical);
     const layer=S.CellSpace.layer(o);if([1,2,3,5].includes(layer)&&!S.CellLife.is(o))fail();
     if(o.species==='ryouki'&&(!S.Ryouki.is(o)||typeof o.ryouki.mutated!=='boolean'))fail();
    }
   }
  }
  probe.organisms=[...byId.values()].map(copy);
  if(S.CellSpace.validate(probe).length||!integer(stock.state.backgroundTurn)||stock.state.backgroundTurn>record.turn)fail();
  const observed=last.cell.stocks,add=(rows,key)=>rows.reduce((n,r)=>n+(r[key]??0),0),expected={waterKnown:stock.state.water.reduce((n,v)=>n+(v??0),0),waterUnresolvedCells:stock.state.water.filter(v=>v===null).length,mineralM:add(probe.tiles,'soilM')};
  for(const [prefix,rows]of [['organic',stock.state.organic],['pending',stock.state.nextMaterial]])for(const key of ['E','M','B'])expected[prefix+key]=add(rows,key);
  if(Object.entries(expected).some(([k,v])=>!near(v,observed[k])))fail();
  const entries=last.cell.bySpecies,sum=layer=>last.cell.layers[layer].units,totals={organisms:last.cell.agents,colonies:sum(1),independentPlants:sum(2)+(entries.freshwaterlight?.units||0),consumerGroups:sum(3),fungalColonies:sum(5),ryouki:entries.ryouki?.units||0,primaryParasites:last.primaryParasite?.count||0,hyperParasites:last.hyperParasite?.count||0,informationField:last.persistentInformation?.field.records||0,informationSubjects:last.persistentInformation?.subjects||0};
  if(Object.entries(totals).some(([k,v])=>s.examples[k].total!==v))fail();
  const carcasses=s.nutrition?.carcasses;if(!carcasses||!near(carcasses.E,observed.carcassE)||!near(carcasses.M,observed.carcassM)||!near(carcasses.G,observed.carcassB))fail();
  if(!s.nutrition.resources||!s.nutrition.byResource)fail();
  for(const a of [carcasses,s.nutrition.resources,...Object.values(s.nutrition.byResource)])if(!integer(a.records)||['q','E','M','G'].some(k=>a[k]!==null&&!number(a[k])))fail();
  for(const [key,version]of [['primaryParasites','primary-state/1'],['hyperParasites','hyper-state/1'],['informationSubjects','persistent-information-state/1']])for(const o of s.examples[key].items)if(o.state?.version!==version)fail();
  for(const key of ['primaryParasites','hyperParasites'])for(const o of s.examples[key].items){if(!integer(o.age)||!number(o.B)||!number(o.E)||!number(o.birthLife)||!Array.isArray(o.state.parents)||!o.state.last||!integer(o.phase)||o.phase<1||o.phase>(key==='primaryParasites'?3:4))fail();
   if(c.parasiteCohortModel==='cohort/1'&&(o.state.cohort?.version!=='parasite-cohort/1'||!integer(o.state.cohort.members)||o.state.cohort.members<1||o.state.cohort.members>3))fail();}
  for(const o of s.examples.primaryParasites.items)if(!o.state.adaptation?.hosts||!o.state.adaptation.routes||!o.state.adaptation.stages||!o.state.hostPreference||o.state.formVersion!=='primary-form/1'||!['A','B','C'].includes(o.state.form))fail();
  for(const o of s.examples.hyperParasites.items)if(!o.state.genes?.hosts||!o.state.genes.routes||!o.state.genes.stages||!o.state.genes.investment||!o.state.preference||!number(o.state.development)||!number(o.state.experience)||!['egg','larva','preparation','adult'].includes(o.state.state))fail();
  for(const o of s.examples.informationSubjects.items)if(!Array.isArray(o.roles)||!Array.isArray(o.state.experience)||o.state.experience.length>16||!Array.isArray(o.state.learned)||o.state.learned.length>64||!Array.isArray(o.state.learnedPreferences)||o.state.learnedPreferences.length!==9||!o.state.progress)fail();
  const vector=a=>Array.isArray(a)&&a.length<=9&&a.every(v=>integer(v.axis)&&v.axis<9&&typeof v.value==='number'&&Number.isFinite(v.value));
  for(const o of s.examples.informationField.items)if(typeof o.originId!=='string'||typeof o.sourceId!=='string'||!number(o.amount)||!integer(o.generatedAt)||o.generatedAt>record.turn||!integer(o.expires)||o.expires<=record.turn||!Array.isArray(o.sourceRoles)||!Array.isArray(o.contents)||o.contents.length<1||o.contents.length>2||['E','B','M'].some(k=>Object.hasOwn(o,k))||!o.generation?.evaluation||!['normal','low'].includes(o.generation.kind)||['pN','pL','u'].some(k=>!number(o.generation[k])||o.generation[k]>1)||o.contents.some(a=>!vector(a.values)||!vector(a.originalValues)||!integer(a.experienceAt)||a.experienceAt>o.generatedAt||!number(a.halfLife)||!['normal','low','confirmed-harm'].includes(a.evidence)||!['all','layer'].includes(a.scope)||!Array.isArray(a.roles)))fail();
  return record;
 }
 function capture(world,reason,observation,{engine,signature,originRecordId=null,terminalState,O}){
  if(world.config.cellModel!==model||world.config.generationModel!=='diverse/1'||!world.config.generationResolved)throw Error('CELL_MODEL_INCOMPLETE: 保存に必要なマス方式の初期生成記録が揃っていません。');
  finite(world);if(engine.invariants(copy(world)).length)fail();
  const last=observation?.rows?.at(-1);if(!last||last.turn!==world.turn)fail();
  const state=terminalState(world,last,engine.S);state.definition=definition;state.summaries=pick(last,summaries);
  state.cell={definition:stockDefinition,profiles:copy(world.cellProfiles),state:copy(world.cellState),soilM:world.tiles.map(t=>t.soilM)};
  const current=last.current,record={schema:3,id:'record:'+globalThis.crypto.randomUUID(),signature,config:copy(world.config),turn:world.turn,reason,created:new Date().toISOString(),finalFingerprint:engine.fingerprint(world),originRecordId,hasObservations:true,observation:copy(observation),
   final:{counts:copy(last.counts),main:last.main,food:last.food,P:last.P,Q:last.Q,stats:copy(world.stats),ledger:copy(world.ledger),tallies:copy(world.tallies),demography:copy(world.demography),current:copy(current),...pick(last,summaries.filter(k=>k!=='cell')),state}};
  return validate(record,engine,O);
 }
 function matchInitial(record,world){
  if(record.config?.cellModel!==model||world.config?.cellModel!==model||world.turn!==0||!same(record.config,world.config)||!same(record.final?.state?.cell?.profiles,world.cellProfiles))throw Error('保存された初期条件と再生成したマス環境が一致しません。');
  return true;
 }
 return {model,definition,stockDefinition,basicKeys,capture,validate,matchInitial};
});
