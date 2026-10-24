/* Current-state final records. Recalculation starts from config, never from samples. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./current-observations.js'):root.EcoCurrentObservations);if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCurrentArchive=api;})(globalThis,O=>{
 'use strict';
 const VERSION='current-ecosystem-terminal/1',copy=x=>structuredClone(x),integer=n=>Number.isSafeInteger(n)&&n>=0,number=n=>Number.isFinite(n)&&n>=0,
  bodyKeys=['id','species','slot','cell','phase','branch3','branch4','age','bornAt','birthLife','sex','role','generation','parents','B','E','M','HP','dna','birthWeights','cellLife','cellMatter','cellOccupancy','consumerGroup','ryouki','plant','informationState','uptake','qInformation','primaryResistance'],
  pick=(o,keys)=>Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,copy(o[k])])),near=(a,b)=>number(a)&&number(b)&&Math.abs(a-b)<.0001;
 function fail(){throw Error('CURRENT_ARCHIVE_INVALID: 現在状態の記録に欠測・版・収支・集計の不一致があります。');}
 function finite(x){JSON.stringify(x,(_k,v)=>{if(typeof v==='number'&&!Number.isFinite(v)||['function','symbol','bigint'].includes(typeof v))fail();return v;});}
 function same(S,a,b){return S.stable(a)===S.stable(b);}
 function digest(S,r){const {integrity,...data}=r;return S.sha256(S.stable(data));}
 function sample(rows,map=o=>o){const ordered=rows.slice().sort((a,b)=>String(a.id??a.subject?.id).localeCompare(String(b.id??b.subject?.id)));return {total:rows.length,retained:Math.min(4,rows.length),truncated:rows.length>4,items:ordered.slice(0,4).map(o=>copy(map(o)))};}
 function capture(w,reason,observation,{engine,signature,originRecordId=null}){
  const S=engine.S;if(w.config.currentStateModel!=='current-state/1')fail();finite(w);if(engine.invariants(copy(w)).length)fail();
  const h=O.restore(observation),last=h.last;if(h.turns!==w.turn+1||h.snapshot().metadata.signature!==signature||!same(S,observation.metadata.config,w.config)||!same(S,(({relations,...raw})=>raw)(last),w.observation))fail();
  const p=S.PrimaryParasite.entries(w),q=S.HyperParasite.entries(w),examples={organisms:sample(w.organisms,o=>pick(o,bodyKeys)),
   primary:sample(p.map(e=>({id:e.p.id,hostId:e.p.hostId,cell:e.cell,subject:e.p})),o=>({...pick(o,['id','hostId','cell']),subject:{...pick(o.subject,bodyKeys),stage:o.subject.stage,counter:o.subject.counter,primary:copy(o.subject.primary)}})),
   hyper:sample(q.map(e=>({id:e.q.id,hostId:e.q.hostId,cell:e.cell,subject:e.q})),o=>({...pick(o,['id','hostId','cell']),subject:{...pick(o.subject,bodyKeys),hyper:copy(o.subject.hyper)}}))};
  const state={definition:VERSION,turn:w.turn,sampleLimit:4,examples,cell:{profiles:copy(w.cellProfiles),state:copy(w.cellState),soilM:w.tiles.map(t=>t.soilM)},
   infections:{state:copy(w.currentInfections),primary:copy(w.primaryInocula),hyper:copy(w.hyperInocula)},activity:copy(w.currentActivity),
   information:{field:copy(w.informationField),ledger:copy(w.informationLedger),summary:copy(w.persistentInformationSummary)}};
  const record=JSON.parse(JSON.stringify({schema:4,id:'record:'+globalThis.crypto.randomUUID(),signature,config:copy(w.config),turn:w.turn,reason,created:new Date().toISOString(),originRecordId,hasObservations:true,
   finalFingerprint:engine.fingerprint(w),observation:copy(observation),final:{counts:copy(last.counts),main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,stats:copy(w.stats),ledger:copy(w.ledger),tallies:copy(w.tallies),demography:h.generations,state}}));
  record.integrity=digest(S,record);return validate(record,engine);
 }
 function validate(r,engine){
  const S=engine.S,c=r?.config;if(r?.schema!==4||c?.currentStateModel!=='current-state/1'||c.cellModel!=='cell-reorganization/1'||c.generationModel!=='diverse/1'||typeof r.id!=='string'||!r.id.startsWith('record:')||typeof r.signature!=='string'||!r.signature||!integer(r.turn)||typeof r.reason!=='string'||!Number.isFinite(Date.parse(r.created))||!(/^[a-f0-9]{64}$/).test(r.finalFingerprint)||r.hasObservations!==true||!(r.originRecordId===null||typeof r.originRecordId==='string'))fail();
  finite(r);if(r.integrity!==digest(S,r))fail();S.WorldGeneration.validateResolved(c);const normalized=S.validate(c);
  for(const key of ['cellSettings','producerSettings','consumerGroupSettings','fungalColonySettings','largePlantSettings','ryoukiSettings','primaryParasiteSettings','hyperParasiteSettings','informationSettings'])if(!same(S,normalized[key],c[key]))fail();
  const h=O.restore(r.observation),last=h.last,f=r.final,s=f?.state,cell=s?.cell;if(h.turns!==r.turn+1||r.observation.metadata.signature!==r.signature||!same(S,r.observation.metadata.config,c)||!same(S,last.counts,f?.counts)||!same(S,h.generations,f?.demography)||s?.definition!==VERSION||s.turn!==r.turn||s.sampleLimit!==4||!Array.isArray(cell?.soilM)||cell.soilM.length!==c.width*c.height)fail();
  if(!f.stats||!f.ledger||!f.tallies||!same(S,f.stats.counts,f.counts)||['main','food','P','Q'].some(k=>f[k]!==f.stats[k]))fail();
  if(!near(f.stats.totals?.E,last.budgets.E)||!near(f.stats.totals?.M,last.budgets.M)||!near(f.stats.totals.E+f.ledger.sinks,f.ledger.initialE+f.ledger.solar)||!near(f.stats.totals.M+f.ledger.Mloss,f.ledger.initialM+(f.ledger.cellInputM||0)))fail();
  const probe={config:c,turn:r.turn,tiles:cell.soilM.map(soilM=>({soilM,blocked:false})),organisms:[],resources:[],carcasses:[],pending:[],searchQ:[],cellProfiles:cell.profiles,cellState:cell.state,
   currentInfections:s.infections?.state,primaryInocula:s.infections?.primary,hyperInocula:s.infections?.hyper,currentActivity:s.activity};
  if(!Array.isArray(probe.primaryInocula)||!Array.isArray(probe.hyperInocula)||S.CellSpace.validate(probe).length)fail();
  const totals=S.SoilMatter.summary(probe);for(const k of ['freshPools','decomposedPools','waitingCells','E','M','B','waitingM'])if(!near(totals[k],last.soil?.[k]))fail();
  if(!s.information?.ledger||!Array.isArray(s.information.field)||!same(S,s.information.summary,last.information)||['initialAmount','generatedAmount','inactivatedAmount'].some(k=>!near(s.information.ledger[k],last.information?.ledger?.[k])))fail();
  const fields=s.information.field;if(fields.length!==last.information.field.records||!near(fields.reduce((n,a)=>n+a.amount,0),last.information.field.amount)||fields.some(a=>!integer(a.cell)||!probe.tiles[a.cell]||!integer(a.expires)||a.expires<=r.turn||!number(a.amount)||!Array.isArray(a.strength)||a.strength.length!==9||a.strength.some(n=>!Number.isFinite(n))||['E','M','B'].some(k=>Object.hasOwn(a,k))))fail();
  const expected={organisms:f.stats.agents,primary:(f.counts.leafparasite||0)+(f.counts.tideparasite||0),hyper:f.counts.hyperparasite||0},ids=new Set();
  for(const key of ['organisms','primary','hyper']){const a=s.examples?.[key];if(!a||!integer(a.total)||a.total!==expected[key]||a.retained!==Math.min(4,a.total)||a.truncated!==(a.total>4)||!Array.isArray(a.items)||a.items.length!==a.retained)fail();
   for(const item of a.items){const o=key==='organisms'?item:item.subject;if(typeof o?.id!=='string'||ids.has(o.id)||!number(o.B)||!number(o.E)||o.uptake?.version!=='current-uptake/1'||!Array.isArray(o.uptake.dose)||o.uptake.dose.length!==5||o.uptake.dose.some(n=>!number(n))||o.informationState?.version!=='current-information-state/1'||!Array.isArray(o.informationState.change)||o.informationState.change.length!==9||o.informationState.change.some(n=>!Number.isFinite(n)))fail();ids.add(o.id);}
  }
  return r;
 }
 function matchInitial(r,w){if(!w||r.schema!==4||w.turn!==0||JSON.stringify(r.config)!==JSON.stringify(w.config)||JSON.stringify(r.final.state.cell.profiles)!==JSON.stringify(w.cellProfiles))throw Error('CURRENT_ARCHIVE_INITIAL: 初期条件または固定環境が一致しません。');return true;}
 return {VERSION,capture,validate,matchInitial};
});
