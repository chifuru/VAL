/* Current update targets; no speculative time advancement on reads. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCurrentActivity=api;})(globalThis,()=>{
 'use strict';
 const VERSION='current-activity/1';
 function bind(S){
  const enabled=w=>w?.config?.currentStateModel==='current-state/1',Q=S.round,indices=new WeakMap();
  function waterStep(p,value){const input=p.waterInput??p.rain,total=Q(value+input),drain=Q(Math.max(0,total-p.waterCapacity)),held=Q(total-drain),evaporation=Q(Math.min(held,p.evaporation));return {value:Q(held-evaporation),input,drain,evaporation};}
  function stationary(p){const input=p.waterInput??p.rain;return waterStep(p,input>p.evaporation?Math.max(0,p.waterCapacity-p.evaporation):0);}
  function initialize(w){
   const a={version:VERSION,at:w.cellState.resourceTurn,waterDue:[],mineralCells:[],mineralDirty:[],decayCells:[],idleDrain:0,idleEvaporation:0,waterInput:0,mineralInput:0};
   for(let cell=0;cell<w.tiles.length;cell++){const p=w.cellProfiles.profiles[cell];if(p.waterCapacity===null)continue;const v=w.cellState.water[cell],next=waterStep(p,v);
    a.waterInput=Q(a.waterInput+next.input);if(next.value!==v)a.waterDue.push(cell);else{a.idleDrain=Q(a.idleDrain+next.drain);a.idleEvaporation=Q(a.idleEvaporation+next.evaporation);}
    if(p.mineralInput>0){a.mineralCells.push(cell);a.mineralInput=Q(a.mineralInput+p.mineralInput);}
   }
   a.decayCells=w.cellState.decayLoad.flatMap((n,cell)=>n>0?[cell]:[]);w.currentActivity=a;
   for(const r of w.cellState.soil.waiting)if(w.cellProfiles.profiles[r.cell].mineralCapacity>w.tiles[r.cell].soilM)mineralChanged(w,r.cell);
   return a;
  }
  function state(w){const a=w.currentActivity;if(a?.version!==VERSION)throw Error('CURRENT_ACTIVITY_STATE');return a;}
  function list(w,key){const a=state(w);let c=indices.get(w);if(c?.state!==a){c={state:a};indices.set(w,c);}if(c[key]?.array!==a[key]||c[key].set.size!==a[key].length)c[key]={array:a[key],set:new Set(a[key])};return c[key].set;}
  function stats(w){const a=state(w);if(a.last?.turn!==w.turn)a.last={turn:w.turn,waterVisited:0,mineralVisited:0,waitingTried:0,soilCells:0,soilSkipped:0,soilRows:0,decayVisited:0};return a.last;}
  function waterChanged(w,cell){if(!enabled(w))return;const a=state(w),due=list(w,'waterDue'),p=w.cellProfiles.profiles[cell];if(p.waterCapacity===null||due.has(cell))return;
   const f=stationary(p);a.idleDrain=Q(a.idleDrain-f.drain);a.idleEvaporation=Q(a.idleEvaporation-f.evaporation);due.add(cell);a.waterDue.push(cell);
  }
  function mineralChanged(w,cell){if(!enabled(w))return;const a=state(w),due=list(w,'mineralDirty');if(!due.has(cell)){due.add(cell);a.mineralDirty.push(cell);}}
  function mineralReady(w){const a=state(w),cells=a.mineralDirty.slice().sort((x,y)=>x-y);a.mineralDirty=[];return cells;}
  function environment(w,flow){
   const a=state(w);if(a.at>=w.turn)throw Error('CURRENT_ACTIVITY_ALREADY_APPLIED');const s=stats(w),keep=[];
   let drain=a.idleDrain,evaporation=a.idleEvaporation;flow.waterInput=a.waterInput;flow.mineralInput=a.mineralInput;
   for(const cell of a.waterDue){const p=w.cellProfiles.profiles[cell],value=w.cellState.water[cell],f=waterStep(p,value);s.waterVisited++;w.cellState.water[cell]=f.value;drain=Q(drain+f.drain);evaporation=Q(evaporation+f.evaporation);
    if(waterStep(p,f.value).value===f.value){const idle=stationary(p);a.idleDrain=Q(a.idleDrain+idle.drain);a.idleEvaporation=Q(a.idleEvaporation+idle.evaporation);}else keep.push(cell);
   }
   a.waterDue=keep;flow.waterDrain=drain;flow.waterEvaporation=evaporation;
   for(const cell of a.mineralCells){const p=w.cellProfiles.profiles[cell],input=p.mineralInput,add=Q(Math.min(input,Math.max(0,p.mineralCapacity-w.tiles[cell].soilM)));s.mineralVisited++;
    w.tiles[cell].soilM=Q(w.tiles[cell].soilM+add);if(input>add)S.SoilMatter.wait(w,cell,Q(input-add));}
   a.at=w.turn;
  }
  function background(w,stocks,activity,run){
   const groups=new Map(),s=stats(w);for(const r of stocks){if(!groups.has(r.cell))groups.set(r.cell,[]);groups.get(r.cell).push(r);}
   for(const [cell,rows]of groups){s.soilCells++;const factor=activity(w,cell);if(!(factor>0)){s.soilSkipped++;continue;}s.soilRows+=rows.length;run(cell,rows,factor);}
  }
  function decay(w,loads){const a=state(w),cells=new Set([...a.decayCells,...loads.keys()]),next=[];for(const cell of cells){const value=Q(S.clamp(((loads.get(cell)||0)-40)/160,0,1));w.cellState.decayLoad[cell]=value;if(value>0)next.push(cell);}stats(w).decayVisited+=cells.size;a.decayCells=next.sort((x,y)=>x-y);}
  function summary(w){const a=state(w);return {definition:VERSION,turn:w.turn,waterDue:a.waterDue.length,mineralInputCells:a.mineralCells.length,mineralDirty:a.mineralDirty.length,decayCells:a.decayCells.length,last:a.last?{...a.last}:null};}
  function validate(w){
   const a=w.currentActivity;if(a?.version!==VERSION||!Number.isSafeInteger(a.at)||a.at<0||a.at>w.turn)return ['CURRENT_ACTIVITY_STATE'];const errors=[];
   for(const key of ['waterDue','mineralCells','mineralDirty','decayCells'])if(!Array.isArray(a[key])||new Set(a[key]).size!==a[key].length||a[key].some(cell=>!Number.isSafeInteger(cell)||!w.tiles[cell]))errors.push('CURRENT_ACTIVITY_TARGET:'+key);
   for(const key of ['idleDrain','idleEvaporation','waterInput','mineralInput'])if(!Number.isFinite(a[key])||a[key]<0)errors.push('CURRENT_ACTIVITY_FLOW:'+key);return errors;
  }
  return {VERSION,enabled,initialize,state,waterStep,waterChanged,mineralChanged,mineralReady,environment,stats,background,decay,summary,validate};
 }
 return {VERSION,bind};
});
