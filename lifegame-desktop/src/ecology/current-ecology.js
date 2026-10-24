/* Current uptake and current-turn facts. No historical pair or generation registry. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCurrentEcology=api;})(globalThis,()=>{
 'use strict';
 const VERSION='current-ecology/1',UPTAKE='current-uptake/1',zero=()=>[0,0,0,0,0],unknown=()=>[0,0,0,0,1],minimum=.000001;
 function bind(S){
  const enabled=w=>w?.config?.currentStateModel==='current-state/1';
  function attach(w,o){if(!enabled(w))return o;if(o.uptake&&o.uptake.version!==UPTAKE)throw Error('CURRENT_UPTAKE_VERSION');o.uptake??={version:UPTAKE,at:w.turn,dose:zero()};return o;}
  function current(w,o){const a=o.uptake;if(!a)return zero();const factor=2**(-Math.max(0,w.turn-a.at)/20),v=a.dose.map(n=>n*factor);return v.reduce((n,x)=>n+x,0)<=minimum?zero():v;}
  function parts(w,o){const a=current(w,o),sum=a.reduce((n,x)=>n+x,0);return sum>0?a.map(n=>n/sum):unknown();}
  function portion(w,o,E){return parts(w,o).map(n=>n*E);}
  function begin(w,ctx){if(ctx.currentEcologyBegun)return;ctx.currentEcologyBegun=true;for(const {subject:o}of S.PersistentInformation.entries(w)){attach(w,o);o.uptake={version:UPTAKE,at:w.turn,dose:current(w,o)};}}
  function receive(w,o,E,source=null,{light=false}={}){
   if(!Number.isFinite(E)||E<0)throw Error('CURRENT_UPTAKE_INPUT');if(!E)return;
   attach(w,o);const before=current(w,o),v=source??unknown();
   if(!Array.isArray(v)||v.length!==5||v.some(n=>!Number.isFinite(n)||n<0))throw Error('CURRENT_UPTAKE_SOURCE');
   const total=v.reduce((n,x)=>n+x,0),input=zero();
   if(light)input[0]=E;
   else if(total>0){for(let i=0;i<4;i++)input[Math.min(3,i+1)]+=E*v[i]/total;input[4]+=E*v[4]/total;}
   else input[4]=E;
   o.uptake={version:UPTAKE,at:w.turn,dose:before.map((n,i)=>n+input[i])};
  }
  function partition(w,o,part,fraction){const v=current(w,o),f=S.clamp(fraction,0,1);part.uptake={version:UPTAKE,at:w.turn,dose:v.map(n=>n*f)};o.uptake={version:UPTAKE,at:w.turn,dose:v.map(n=>n*(1-f))};}
  function validate(w){
   const errors=[];for(const {subject:o}of S.PersistentInformation.entries(w)){const a=o.uptake;
    if(a?.version!==UPTAKE||!Number.isSafeInteger(a.at)||a.at<0||a.at>w.turn||!Array.isArray(a.dose)||a.dose.length!==5||a.dose.some(n=>!Number.isFinite(n)||n<0))errors.push('CURRENT_UPTAKE:'+o.id);}
   if(Object.hasOwn(w,'contactPairs')||Object.hasOwn(w,'demography'))errors.push('CURRENT_PAST_STATE');return errors;
  }
  function contacts(w){
   const actors=[...w.organisms.filter(o=>o.HP>0),...(w.searchQ??[]).filter(q=>q.phase===4)],ids=new Set(),cells=new Map(),out={},keys=new Map();
   for(const o of actors){
    // Valid worlds have unique real IDs. Preserve the prior result even for a repeated diagnostic row.
    if(ids.has(o.id))return individualContacts(w,actors);ids.add(o.id);
    let species=cells.get(o.cell);if(!species)cells.set(o.cell,species=new Map());species.set(o.species,(species.get(o.species)??0)+1);
   }
   const add=(a,b,n)=>{if(!n)return;let row=keys.get(a);if(!row)keys.set(a,row=new Map());let key=row.get(b);if(!key){key=S.stable([a,b].sort(S.compare));row.set(b,key);}out[key]=(out[key]??0)+n;};
   for(const [cell,species]of cells){
    if(S.oneStep(w,cell,cell)){const entries=[...species];for(let i=0;i<entries.length;i++){const [a,n]=entries[i];add(a,a,n*(n-1)/2);for(let j=i+1;j<entries.length;j++)add(a,entries[j][0],n*entries[j][1]);}}
    for(const other of S.nearby(w,cell,1,true)){
     if(other<=cell||!cells.has(other)||!S.oneStep(w,cell,other)&&!S.oneStep(w,other,cell))continue;
     for(const [a,n]of species)for(const [b,m]of cells.get(other))add(a,b,n*m);
    }
   }
   return Object.fromEntries(Object.entries(out).sort(([a],[b])=>S.compare(a,b)));
  }
  function individualContacts(w,actors){
   const cells=new Map(),seen=new Set(),out={};
   for(const o of actors){if(!cells.has(o.cell))cells.set(o.cell,[]);cells.get(o.cell).push(o);}
   for(const a of actors)for(const cell of S.nearby(w,a.cell,1,true)){
    if(!S.oneStep(w,a.cell,cell))continue;
    for(const b of cells.get(cell)??[]){if(a.id===b.id)continue;const ids=[a.id,b.id].sort(S.compare),pair=S.stable(ids);if(seen.has(pair))continue;seen.add(pair);
     const species=[a.species,b.species].sort(S.compare),key=S.stable(species);out[key]=(out[key]??0)+1;}
   }return Object.fromEntries(Object.entries(out).sort(([a],[b])=>S.compare(a,b)));
  }
  function composition(w,entries){
   const out={};for(const {subject:o,kind}of entries){const r=out[o.species]??={phases:[0,0,0,0],phaseUnknown:0,ages:{juvenile:0,adult:0,elderly:0,nonapplicable:0},sex:{female:0,male:0,none:0,nonapplicable:0},roles:{}};
    if(S.ConsumerGroup.is(o)){for(const c of o.consumerGroup.cohorts)r.phases[c.phase-1]+=c.n;for(const [key,n]of Object.entries(S.ConsumerGroup.ages(o)))r.ages[key]+=n;r.sex.none+=S.ConsumerGroup.count(o);}
    else {if(Number.isInteger(o.phase)&&o.phase>=1&&o.phase<=4)r.phases[o.phase-1]++;else r.phaseUnknown++;if(S.Colony.is(o)||S.FungalColony.is(o)){r.ages.nonapplicable++;r.sex.nonapplicable++;}
     else {const age=kind==='P'?(S.PrimaryParasite.is(o)?S.PrimaryParasite.ageInfo(o):{stage:'nonapplicable'}):kind==='Q'?(S.HyperParasite.is(o)?S.HyperParasite.ageInfo(o):{stage:'nonapplicable'}):S.ageInfo(o);r.ages[age.stage]++;r.sex[['female','male'].includes(o.sex)?o.sex:'none']++;}}
    if(o.role)r.roles[o.role]=(r.roles[o.role]??0)+1;
   }return out;
  }
  function demography(w,ctx){
   const rows=new Map(),eligible=o=>!S.ConsumerGroup.is(o)&&Number.isSafeInteger(o.generation)&&o.generation>=0,
    row=o=>{const key=S.stable([o.species,o.generation]);if(!rows.has(key))rows.set(key,{species:o.species,generation:o.generation,initial:0,born:0,matured:0,reproduced:0,juvenileDeaths:0,environmentEstablished:0});return rows.get(key);};
   const childById=new Map((ctx.children??[]).map(o=>[o.id,o]));for(const o of childById.values())if(eligible(o))row(o).born++;
   for(const o of w.organisms)if(eligible(o)){
    const r=row(o);if(w.turn===0)r.initial++;
    if(!S.Colony.is(o)&&!S.FungalColony.is(o)&&ctx.traits.get(o.id)?.ageStage==='juvenile'&&S.ageInfo(o).stage!=='juvenile')r.matured++;
    if(o.firstBirthAt===w.turn&&ctx.parents.has(o.id))r.reproduced++;
   }
   for(const d of ctx.deaths){
    if(d.partial)continue;const subject=ctx.informationDeaths?.get(d.id)?.subject??ctx.informationSubjects?.get(d.id)?.subject??childById.get(d.id),old=ctx.old.get(d.id),
      age=d.ageStage??(subject&&!S.Colony.is(subject)&&!S.FungalColony.is(subject)&&!S.ConsumerGroup.is(subject)?S.ageInfo(subject).stage:old?.ageStage),generation=d.generation??subject?.generation??old?.generation;
    if(age==='juvenile'&&Number.isSafeInteger(generation)&&generation>=0)row({species:d.species??subject?.species??old?.species,generation}).juvenileDeaths+=d.count??1;
   }
   for(const o of w.producerSupport?.last.births??[]){const r=row({...o,generation:0});r.environmentEstablished++;}
   return [...rows.values()].filter(r=>Object.entries(r).some(([k,n])=>!['species','generation'].includes(k)&&n>0)).sort((a,b)=>S.compare(a.species,b.species)||a.generation-b.generation);
  }
  function pyramid(w,entries){
   const layers=[0,0,0,0],side={unknown:0,decomposer:0,P:0,Q:0,remains:S.SoilMatter.rows(w).reduce((n,r)=>n+r.B,0)},bySpecies={};
   for(const {subject:o,kind}of entries){const group=S.spec(o)?.group,B=Math.max(0,o.B??0),v=parts(w,o);if(kind==='P'||kind==='Q'){side[kind]+=B;continue;}if(group==='fungus'){side.decomposer+=B;continue;}
    const row=bySpecies[o.species]??=zero();for(let i=0;i<4;i++){layers[i]+=B*v[i];row[i]+=B*v[i];}side.unknown+=B*v[4];row[4]+=B*v[4];}
   return {definition:'current-trophic-observed/1',layers,side,bySpecies,biomassTotal:layers.reduce((n,x)=>n+x,0)+side.unknown+side.decomposer+side.P+side.Q};
  }
  function observation(w,ctx){
   const entries=S.PersistentInformation.entries(w),known=new Set(S.activeSpecies(w).map(s=>s.id)),refs=new Map();
   for(const e of entries)refs.set(e.subject.id,e.subject.species);for(const [id,o]of ctx.old)refs.set(id,o.species);
   for(const [id,e]of ctx.informationSubjects??[])refs.set(id,e.subject.species);
   const actions=new Map(),nutrition=new Map(),bonds={},counts=Object.fromEntries([...known].map(id=>[id,0])),birthsBySpecies={},deathsBySpecies={},birthReasons={};
   const action=(from,to,type,amount,unit,count=1)=>{
    if(!(amount>0)||!from||!to||!(count>0))return;const key=S.stable([from,to,type]),r=actions.get(key)??{from,to,type,amount:0,count:0,unit,fromKnown:known.has(from),toKnown:known.has(to)};
    r.amount+=amount;r.count+=count;actions.set(key,r);
   };
   const uptake=(species,type,source,E,raw=E)=>{if(!(E>0))return;const key=S.stable([species,type,source]),r=nutrition.get(key)??{species,type,source,energy:0,withdrawn:0};r.energy+=E;r.withdrawn+=raw;nutrition.set(key,r);};
   for(const {subject:o,kind,host,carrier}of entries){counts[o.species]=(counts[o.species]??0)+S.ConsumerGroup.count(o);
    if(o.birthBlockers)for(const reason of o.birthBlockers){birthReasons[o.species]??={};birthReasons[o.species][reason]=(birthReasons[o.species][reason]??0)+1;}
    if(kind==='P'||kind==='Q'){const target=kind==='P'?(carrier?.soilRef?'@remains/'+(carrier.tag??'unknown'):host?.species):refs.get(o.hostId);if(target){const key=S.stable([o.species,target]);bonds[key]=(bonds[key]??0)+1;}}
   }
   if(w.turn>0)for(const [id,list]of ctx.events){const from=refs.get(id);if(!from)continue;for(const e of list){
    const to=refs.get(e.target);
    if(e.type==='attack'){action(from,to,'combat',e.actualDamage,'HP');action(to,from,'defense',e.mitigated,'HP');}
    if(e.type==='care')action(from,to,'care',e.amount,'E');
    if(['primary-established','primary-transferred'].includes(e.type))action(e.species,from,'infection',1,'event');
    if(e.type==='hyper-established')action('hyperparasite',e.hostSpecies??to,'infection',1,'event');
    if(e.type==='primary-clear')action(from,e.species,'clear',1,'event');
    if(e.type==='hyper-cleared')action(e.hostSpecies??to,'hyperparasite','clear',1,'event');
    if(e.type==='establishment')action(from,'@environment','establishment',1,'event');
    if(e.type==='light')uptake(from,'light','@light',e.amount);
    if(e.type==='feed'){const source=e.sourceSpecies??refs.get(e.source)??(e.sourceAggregated?'@soil/'+(e.sourceClass??'unknown'):e.sourceType==='resource'?'@resource/'+(e.tag??'unknown'):'@unknown');action(from,source,'feeding',e.assimilated,'E');uptake(from,e.sourceType,source,e.assimilated,e.amount);}
    if(e.type==='uptake'&&e.kind==='parasitism'){const source=e.sourceSpecies??refs.get(e.source)??'@host';action(from,source,'parasitism',e.energy,'E');uptake(from,'parasitism',source,e.energy);}
   }}
   const informationSeen=new Set();if(w.turn>0)for(const e of ctx.infoEffects??[]){const key=S.stable([e.recipient,e.event?.id,e.place??false]);if(informationSeen.has(key)||!(e.deltaAbs>0))continue;informationSeen.add(key);action(e.event?.sourceSpecies??'@information',e.species,'information',e.deltaAbs,'parameter_delta');}
   for(const species of ctx.births)birthsBySpecies[species]=(birthsBySpecies[species]??0)+1;for(const d of ctx.deaths)deathsBySpecies[d.species]=(deathsBySpecies[d.species]??0)+(d.count??1);
   return {definition:'current-ecology-turn/1',turn:w.turn,counts,composition:composition(w,entries),contacts:w.turn?contacts(w):{},actions:[...actions.values()].sort((a,b)=>S.compare(S.stable([a.from,a.to,a.type]),S.stable([b.from,b.to,b.type]))),bonds,
    nutrition:[...nutrition.values()].sort((a,b)=>S.compare(S.stable([a.species,a.type,a.source]),S.stable([b.species,b.type,b.source]))),demographyDelta:demography(w,ctx),birthsBySpecies,deathsBySpecies,birthReasons,
    consumerGroupFlows:structuredClone(ctx.consumerGroupFlows??{}),pyramid:pyramid(w,entries),soil:structuredClone(w.soilMatterSummary),
    information:structuredClone(w.persistentInformationSummary),informationFlow:structuredClone(ctx.persistentInformationFlow??null),
    primary:structuredClone(ctx.primaryFlow??null),hyper:structuredClone(ctx.hyperFlow??null),budgets:{...S.totals(w),solar:w.ledger.solar,sinks:w.ledger.sinks,Mloss:w.ledger.Mloss,cellInputM:w.ledger.cellInputM??0}};
  }
  return {VERSION,UPTAKE,enabled,attach,current,parts,portion,begin,receive,partition,validate,contacts,observation};
 }
 return {VERSION,bind};
});
