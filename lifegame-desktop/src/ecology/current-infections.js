/* Finite current infection pools. Hosted life states are never pooled. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCurrentInfections=api;})(globalThis,()=>{
 'use strict';
 const VERSION='current-infections/1',POOL='current-infection-pool/1',keys={P:['adaptation','hostPreference'],Q:['genes','preference','bias']};
 function bind(S){
  const enabled=w=>w?.config?.currentStateModel==='current-state/1',indexes=new WeakMap();
  function state(w){return w.currentInfections??={version:VERSION,nextId:1,nextType:1,types:[]};}
  function id(w,kind){const a=state(w);if(!Number.isSafeInteger(a.nextId)||a.nextId<1)throw Error('CURRENT_INFECTION_COUNTER');return 'c'+kind+':'+a.nextId++;}
  function index(w){const a=state(w);let c=indexes.get(w);if(!c||c.types!==a.types){c={types:a.types,byId:new Map(a.types.map(t=>[t.id,t])),byKey:new Map(a.types.map(t=>[S.stable([t.kind,t.data]),t]))};indexes.set(w,c);}return c;}
  function view(w,row,kind='P'){
   if(!row.genotype)return row;const t=index(w).byId.get(row.genotype);if(!t||t.kind!==kind)throw Error('CURRENT_INFECTION_TYPE:'+row.genotype);
   return {...t.data,...row};
  }
  function materialize(w,row,kind='P'){const v=view(w,row,kind);for(const key of keys[kind])if(row[key]===undefined&&v[key]!==undefined)row[key]=structuredClone(v[key]);return row;}
  function hydrate(w){if(!enabled(w))return;for(const [kind,list]of [['P',w.primaryInocula??[]],['Q',w.hyperInocula??[]]])for(const row of list)materialize(w,row,kind);}
  function typeOf(w,row,kind='P'){
   const a=state(w),c=index(w),v=view(w,row,kind),data=Object.fromEntries(keys[kind].map(key=>[key,v[key]]));if(Object.values(data).some(v=>v===undefined))throw Error('CURRENT_INFECTION_TRAITS');
   const key=S.stable([kind,data]);let t=c.byKey.get(key);if(!t){t={id:'cg:'+a.nextType++,kind,data:structuredClone(data)};a.types.push(t);c.byKey.set(key,t);c.byId.set(t.id,t);}return t;
  }
  function compact(w){
   if(!enabled(w))return;const a=state(w),used=new Set();
   const intern=(row,kind)=>{const t=typeOf(w,row,kind);row.genotype=t.id;used.add(t.id);for(const k of keys[kind])delete row[k];};
   const merged=new Map(),out=[];
   for(const row of (w.primaryInocula??[]).slice().sort((x,y)=>S.compare(x.id,y.id))){
    if(!(row.E>0))continue;intern(row,'P');
    const mergeable=!row.transfer&&row.kind!=='invading'&&(!row.egg||row.egg.state==='free');
    if(!mergeable){delete row.pool;out.push(row);continue;}
    row.pool=POOL;if(row.egg)row.doseE??=row.E;
    const shape={...row};delete shape.id;delete shape.E;delete shape.amount;
    const key=S.stable(shape),old=merged.get(key);
    if(old){old.E=S.round(old.E+row.E);old.amount=S.round(old.E/S.PrimaryParasite.settings(w).standardReserve);}else{merged.set(key,row);out.push(row);}
   }
   w.primaryInocula=out;
   w.hyperInocula=(w.hyperInocula??[]).filter(row=>row.E>0);for(const row of w.hyperInocula)intern(row,'Q');
   a.types=a.types.filter(t=>used.has(t.id));
   w.currentInfectionSummary={definition:VERSION,turn:w.turn,primaryRecords:out.length,pools:out.filter(i=>i.pool).length,hyperRecords:w.hyperInocula.length,genotypes:a.types.length,
    reserveE:S.round([...out,...w.hyperInocula].reduce((n,i)=>n+i.E,0))};
  }
  function attachEgg(w,row,host){
   // One real dose leaves the environmental stock; no full-pool copy per host.
   const E=S.PrimaryParasite.takeInoculum(w,row,Math.min(row.E,row.doseE??row.E,S.PrimaryParasite.settings(w).standardReserve));if(!(E>0))return null;
   const attached={...view(w,row),id:id(w,'e'),cell:host.cell,hostId:host.id,E,amount:S.round(E/S.PrimaryParasite.settings(w).standardReserve),
    egg:{...row.egg,state:'attached',attachedAt:w.turn,hatchAt:w.turn+w.config.primaryEggSettings.hatchTurns}};
   delete attached.pool;delete attached.doseE;w.primaryInocula.push(attached);return attached;
  }
  function moveEgg(w,row,cells){
   if(!cells.length)return 0;const budget=S.round(row.E*w.config.primaryEggSettings.waterMoveChance),total=S.PrimaryParasite.takeInoculum(w,row,budget);let remaining=total;
   for(let n=0;n<cells.length;n++){const E=n===cells.length-1?remaining:Math.min(remaining,S.round(total/cells.length));remaining=S.round(remaining-E);if(!(E>0))continue;
    w.primaryInocula.push({...row,id:id(w,'e'),egg:{...row.egg},cell:cells[n],E,amount:S.round(E/S.PrimaryParasite.settings(w).standardReserve)});
   }return total;
  }
  function validate(w){
   if(!enabled(w))return [];const a=w.currentInfections,errors=[];
   if(a?.version!==VERSION||!Number.isSafeInteger(a.nextId)||a.nextId<1||!Number.isSafeInteger(a.nextType)||a.nextType<1||!Array.isArray(a.types))return ['CURRENT_INFECTION_STATE'];
   const types=new Set();for(const t of a.types){if(types.has(t.id)||!keys[t.kind]||!t.data||keys[t.kind].some(k=>t.data[k]===undefined))errors.push('CURRENT_INFECTION_TYPE:'+t.id);types.add(t.id);}
   const used=new Set();for(const [kind,list]of [['P',w.primaryInocula??[]],['Q',w.hyperInocula??[]]])for(const row of list){
    if(!a.types.some(t=>t.id===row.genotype&&t.kind===kind))errors.push('CURRENT_INFECTION_REFERENCE:'+row.id);used.add(row.genotype);
    if(keys[kind].some(k=>Object.hasOwn(row,k)))errors.push('CURRENT_INFECTION_DUPLICATED_TRAITS:'+row.id);
    if(row.pool&&(row.pool!==POOL||row.transfer||row.kind==='invading'||row.egg&&row.egg.state!=='free'))errors.push('CURRENT_INFECTION_POOL:'+row.id);
    if(row.egg?.state==='free'&&(!(row.doseE>0)||!Number.isFinite(row.doseE)))errors.push('CURRENT_INFECTION_DOSE:'+row.id);
   }
   if(a.types.some(t=>!used.has(t.id)))errors.push('CURRENT_INFECTION_UNUSED_TYPE');return errors;
  }
  return {VERSION,enabled,id,state,view,materialize,typeOf,hydrate,compact,attachEgg,moveEgg,validate};
 }
 return {VERSION,bind};
});
