/* Full-turn observation owner for the internal current-state path. Never advances biology. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCurrentObservations=api;})(globalThis,()=>{
 'use strict';
 const VERSION='current-observations/1',TURN='current-ecology-turn/1',SCHEMA='current-observation-snapshot/1',copy=x=>structuredClone(x),
  finite=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0,demographicKeys=['initial','born','matured','reproduced','juvenileDeaths','environmentEstablished'];
 function validate(row,turn){
  if(row?.definition!==TURN||row.turn!==turn||!row.counts||Object.values(row.counts).some(n=>!Number.isSafeInteger(n)||n<0)||!row.contacts||Object.values(row.contacts).some(n=>!Number.isSafeInteger(n)||n<0)||
   !Array.isArray(row.actions)||row.actions.some(a=>typeof a.from!=='string'||typeof a.to!=='string'||typeof a.type!=='string'||!finite(a.amount)||!Number.isSafeInteger(a.count)||a.count<1)||
   !Array.isArray(row.demographyDelta)||row.demographyDelta.some(r=>typeof r.species!=='string'||!Number.isSafeInteger(r.generation)||r.generation<0||demographicKeys.some(k=>!Number.isSafeInteger(r[k])||r[k]<0))||
   row.pyramid?.definition!=='current-trophic-observed/1'||!Array.isArray(row.pyramid.layers)||row.pyramid.layers.length!==4||row.pyramid.layers.some(n=>!finite(n)))throw Error('CURRENT_OBSERVATION_INVALID');
  if(!row.composition||Object.entries(row.composition).some(([id,c])=>!Array.isArray(c.phases)||c.phases.length!==4||c.phases.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(c.phaseUnknown)||c.phaseUnknown<0||c.phases.reduce((n,x)=>n+x,0)+c.phaseUnknown!==row.counts[id]||
    ['ages','sex','roles'].some(k=>!c[k]||Object.values(c[k]).some(n=>!Number.isSafeInteger(n)||n<0)))||!Array.isArray(row.nutrition)||row.nutrition.some(r=>!finite(r.energy)||!finite(r.withdrawn))||!row.budgets||Object.values(row.budgets).some(n=>!finite(n)))throw Error('CURRENT_OBSERVATION_INVALID');
 }
 function create(config,{species=[],signature='internal-current-state'}={}){
  if(config?.currentStateModel!=='current-state/1'||typeof signature!=='string'||!signature)throw Error('CURRENT_OBSERVATION_VERSION');
  const configBytes=JSON.stringify(config),metadata={definition:VERSION,signature,config:copy(config),species:species.map(({id,name,group})=>({id,name,group})),contactMeaning:'within-turn pair occurrences; no lifetime first-encounter registry',
   generationMeaning:'model units with an explicit generation; mixed consumer cohorts use member flows'},rows=[],generations=new Map(),contactTotals=new Map();
  function relationSummary(next){
   const turn=next.turn,recent=[...rows.slice(-49),next],edges=new Set(),types=new Set(),known=new Set();
   for(const r of recent)for(const a of r.actions)if(a.amount>0){edges.add(JSON.stringify([a.from,a.to,a.type]));types.add(a.type);if(a.fromKnown)known.add(a.from);if(a.toKnown)known.add(a.to);}
   const complete=Math.floor(turn/10),start=(complete-2)*10+1,middle=(complete-1)*10,end=complete*10,first=new Set(),second=new Set();
   if(complete>=2)for(const r of [...rows.slice(-29),next])if(r.turn>=start&&r.turn<=end)for(const a of r.actions)if(a.amount>0)(r.turn<=middle?first:second).add(JSON.stringify([a.from,a.to,a.type]));
   return {startTurn:Math.max(1,turn-49),endTurn:turn,confirmedEdges:edges.size,actionTypes:types.size,participatingSpecies:known.size,continuityPending:complete<2,
    continuousEdges:complete<2?null:[...first].filter(k=>second.has(k)).length,completedInterval:complete};
  }
  function appendRow(input){
   validate(input,rows.length);const row=copy(input);row.relations=relationSummary(row);
   for(const r of row.demographyDelta){const key=JSON.stringify([r.species,r.generation]),total=generations.get(key)??{species:r.species,generation:r.generation,...Object.fromEntries(demographicKeys.map(k=>[k,0]))};for(const k of demographicKeys)total[k]+=r[k];generations.set(key,total);}
   for(const [key,n]of Object.entries(row.contacts))if(n>0){const r=contactTotals.get(key)??{pairs:0,turns:0};r.pairs+=n;r.turns++;contactTotals.set(key,r);}
   rows.push(row);return copy(row);
  }
  function append(world){if(JSON.stringify(world?.config)!==configBytes||world.turn!==rows.length)throw Error('CURRENT_OBSERVATION_TURN_GAP');return appendRow(world.observation);}
  function snapshot(){return {schema:SCHEMA,metadata:copy(metadata),rows:copy(rows),generations:copy([...generations.values()]),contacts:copy(Object.fromEntries(contactTotals))};}
  function csv(){
   const quote=v=>'"'+String(v).replaceAll('"','""')+'"',out=['turn,metric,species_id,value,unit,context'],emit=(t,m,id,n,unit,context='')=>out.push([t,m,id,n,unit,context].map(quote).join(','));
   for(const r of rows){
    for(const [id,n]of Object.entries(r.counts))emit(r.turn,'population',id,n,'model_count');
    for(const [id,c]of Object.entries(r.composition)){c.phases.forEach((n,i)=>emit(r.turn,'phase_'+(i+1),id,n,'model_count'));emit(r.turn,'phase_unknown',id,c.phaseUnknown,'model_count');for(const group of ['ages','sex','roles'])for(const [key,n]of Object.entries(c[group]))emit(r.turn,group+'_'+key,id,n,'model_count');}
    for(const [key,n]of Object.entries(r.contacts))emit(r.turn,'contact_pairs',key,n,'pair_turn');
    for(const a of r.actions){emit(r.turn,'action_count',a.from,a.count,'event',JSON.stringify([a.to,a.type]));emit(r.turn,'action_amount',a.from,a.amount,a.unit,JSON.stringify([a.to,a.type]));}
    for(const n of r.nutrition)emit(r.turn,'assimilated_E',n.species,n.energy,'E',JSON.stringify([n.type,n.source]));
    for(const d of r.demographyDelta)for(const k of demographicKeys)emit(r.turn,'generation_'+k,d.species,d[k],'model_count',d.generation);
    for(const [id,reasons]of Object.entries(r.birthReasons??{}))for(const [reason,n]of Object.entries(reasons))emit(r.turn,'birth_blocker',id,n,'model_count',reason);
    for(const [id,flows]of Object.entries(r.consumerGroupFlows??{}))for(const [kind,n]of Object.entries(flows))emit(r.turn,'consumer_'+kind,id,n,'model_flow');
    for(const [key,n]of Object.entries(r.budgets))emit(r.turn,'budget_'+key,'all',n,key==='E'||['solar','sinks'].includes(key)?'E':'M');
    for(let i=0;i<4;i++)emit(r.turn,'trophic_B_'+(i+1),'all',r.pyramid.layers[i],'B');
    for(const [key,n]of Object.entries(r.pyramid.side))emit(r.turn,'side_B_'+key,'all',n,'B');
    emit(r.turn,'relation_edges','all',r.relations.confirmedEdges,'edge');emit(r.turn,'action_types','all',r.relations.actionTypes,'type');
    if(r.relations.continuousEdges!==null)emit(r.turn,'continuous_edges','all',r.relations.continuousEdges,'edge');
   }return '\ufeff'+out.join('\r\n')+'\r\n';
  }
  return {append,csv,snapshot,get rows(){return copy(rows);},get last(){return rows.length?copy(rows.at(-1)):null;},get turns(){return rows.length;},get generations(){return copy([...generations.values()]);},get contacts(){return copy(Object.fromEntries(contactTotals));}};
 }
 function restore(snapshot){
  if(snapshot?.schema!==SCHEMA||snapshot.metadata?.definition!==VERSION||!Array.isArray(snapshot.rows)||!snapshot.rows.length)throw Error('CURRENT_OBSERVATION_SNAPSHOT');
  const h=create(snapshot.metadata.config,{species:snapshot.metadata.species,signature:snapshot.metadata.signature});
  for(let turn=0;turn<snapshot.rows.length;turn++){const row=snapshot.rows[turn];validate(row,turn);h.append({turn,config:snapshot.metadata.config,observation:row});}
  const rebuilt=h.snapshot();if(JSON.stringify(rebuilt.generations)!==JSON.stringify(snapshot.generations)||JSON.stringify(rebuilt.contacts)!==JSON.stringify(snapshot.contacts)||JSON.stringify(rebuilt.rows)!==JSON.stringify(snapshot.rows))throw Error('CURRENT_OBSERVATION_SNAPSHOT');
  h.append=()=>{throw Error('CURRENT_OBSERVATION_READ_ONLY');};return h;
 }
 return {VERSION,SCHEMA,create,restore};
});
