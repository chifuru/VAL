(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoParasites = api;
})(globalThis, function (S) {
  "use strict";
  const required = { first: 4, middle: 6, extra: 6, terminal: 8 };
  const primaryEnabled=w=>S.PrimaryParasite?.enabled(w)===true;
  const hyperEnabled=w=>S.HyperParasite?.enabled(w)===true;
  const cohorts=w=>S.ParasiteCohort.enabled(w);
  const fanout=w=>cohorts(w)&&w.config.parasiteDispersalModel==="fanout/1";
  const eggsEnabled=w=>S.PrimaryParasite.eggsEnabled(w);
  const cellMode=w=>S.CellSpace.enabled(w);
  const cellLivingHost=(w,ctx,host)=>!cellMode(w)||host?.HP>0&&ctx.old.has(host.id);
  const cellCarrierReady=(w,host)=>host.created<w.turn&&!(host.availableAt>w.turn);
  function primaryOccupants(w,m,cell){
    return cellMode(w)?(m.cellSpace.get(cell)||[]).flat():[...S.mainAt(m,cell),m.food.get(cell),m.prey?.get(cell),m.producer?.get(cell)];
  }
  function cellContactDonor(w,ctx,host,m){
    if(!cellMode(w))return true;
    if(m.byId.get(host.id)===host)return cellLivingHost(w,ctx,host);
    return w.carcasses.includes(host)&&cellCarrierReady(w,host)&&host.payloadExpires>w.turn;
  }
  function cellMotionContacts(w,ctx,m){
    const contacts=new Map();if(!cellMode(w)||!ctx.cellMotion?.completed)return contacts;
    for(const contact of ctx.cellMotion.contacts){
      const [a,b]=contact.ids,first=m.byId.get(a),second=m.byId.get(b);
      if(!first||!second||a===b||!cellLivingHost(w,ctx,first)||!cellLivingHost(w,ctx,second))continue;
      for(const [source,target]of [[a,b],[b,a]]){if(!contacts.has(source))contacts.set(source,new Set());contacts.get(source).add(target);}
    }
    return contacts;
  }
  function primaryRule(w,species,host,route,sourceStage){
    const rule=S.PrimaryParasite.hostRule(species,host,route,sourceStage);
    if(rule.allowed||!cohorts(w)||route!=="contact")return rule;
    const next=S.PrimaryParasite.hostRule(species,host);
    return (sourceStage==="first"&&["middle","terminal"].includes(next.stage))||
      (sourceStage==="middle"&&next.stage==="terminal")?next:rule;
  }
  const informationEnabled=w=>S.PersistentInformation?.enabled(w)===true;
  const survivalEnabled=w=>["survival/1","survival/2","survival/3","survival/4"].includes(w?.config?.balanceModel);
  const informationKeys=["ownExperiences","holdingQualified","deathDecisions","candidateDeaths","normalGenerated","lowGenerated","noGeneration","generatedAmount","expiredAmount","capacityLostAmount","microLostAmount","movedAmount","originsRead","contentsRead","rejectedScope","rejectedContext","rejectedBudget","deduplicated","learned","learningDeltaAbs","placeApplications","placeMagnitude","receptionCostE","qPromoted","qDistorted","environmentRead","ordinaryRead","caregiverRead"];
  function emptyInformationFlow(w){return {definition:S.CurrentInformation.enabled(w)?"current-information-flow/1":"persistent-information-flow/1",turn:w.turn,all:Object.fromEntries(informationKeys.map(key=>[key,0]))};}
  function informationFlow(w,ctx,key,n=1){ctx.persistentInformationFlow??=emptyInformationFlow(w);const a=ctx.persistentInformationFlow.all;a[key]=S.round(a[key]+n);}
  function informationHostFactor(w,subject,species){
    if(!informationEnabled(w)||S.PersistentInformation.settings(w).influence===0)return 1;
    if(S.CurrentInformation.enabled(w))return 1+S.CurrentInformation.hostPreference(subject,species)/200;
    return 1+S.clamp(subject.informationState?.hostPreferences?.[species]||0,-20,20)/200;
  }
  function informationAllocation(w,subject,axis){
    if(!informationEnabled(w)||S.PersistentInformation.settings(w).influence===0)return 1;
    return S.clamp(1+S.PersistentInformation.preference(w,subject,axis)/200,.9,1);
  }
  function informationCell(entry){return entry.subject.cell??entry.carrier?.cell??entry.host?.cell??entry.cell;}
  function informationTrack(w,ctx){
    if(!informationEnabled(w))return;
    const subjects=ctx.informationSubjects??=new Map();
    for(const entry of S.PersistentInformation.entries(w)){
      S.PersistentInformation.attach(w,entry.subject);
      if(!subjects.has(entry.subject.id)||cellMode(w)&&!ctx.informationDeaths?.has(entry.subject.id))subjects.set(entry.subject.id,entry);
    }
  }
  function informationDeath(w,ctx,subject,details={}){
    if(!informationEnabled(w)||!subject)return;
    if(!ctx.informationSubjects?.has(subject.id))informationTrack(w,ctx);ctx.informationDeaths??=new Map();
    if(!ctx.informationDeaths.has(subject.id))ctx.informationDeaths.set(subject.id,{subject,cell:details.cell??subject.cell,...details});
  }
  const informationComponentKey=c=>c.originId+"|"+c.contentId;
  function informationContent(w,item,evidence="normal"){
    return {originId:item.originId,contentId:item.contentId,meaning:item.meaning,kind:item.kind,experienceAt:item.lastExperienceAt??item.experienceAt,
      halfLife:item.halfLife,originalValues:structuredClone(item.values),values:structuredClone(item.values),evidence,
      context:structuredClone(item.context),scope:item.scope,roles:item.roles.slice(),peerSpecies:item.peerSpecies,
      count:item.count,distinctTurns:item.distinctTurns,amount:item.amount,confirmedHarm:item.confirmedHarm===true};
  }
  function informationPriority(w,record){return record.amount*Math.max(0,...record.contents.map(c=>S.PersistentInformation.freshness(c,w.turn)*(c.evidence==="low"?.5:1)));}
  function informationInactivate(w,ctx,amount,key){
    if(amount<=0)return;
    w.informationLedger.inactivatedAmount=S.round(w.informationLedger.inactivatedAmount+amount);informationFlow(w,ctx,key,amount);
  }
  function informationCapacity(w,ctx,records){
    const z=S.PersistentInformation.settings(w),byCell=new Map();
    for(const a of records){
      if(a.amount<z.minimumAmount){informationInactivate(w,ctx,a.amount,"microLostAmount");continue;}
      if(!byCell.has(a.cell))byCell.set(a.cell,[]);byCell.get(a.cell).push(a);
    }
    const out=[];
    for(const records of byCell.values()){
      records.sort((a,b)=>informationPriority(w,b)-informationPriority(w,a)||S.compare(a.originId,b.originId));
      for(let n=0;n<records.length;n++)if(n<z.cellOrigins)out.push(records[n]);else informationInactivate(w,ctx,records[n].amount,"capacityLostAmount");
    }
    return out.sort((a,b)=>a.cell-b.cell||S.compare(a.originId,b.originId));
  }
  function informationDiffuse(w,ctx){
    const z=S.PersistentInformation.settings(w),merged=new Map(),add=(a,cell,amount)=>{
      if(amount<=0)return;const key=cell+"|"+a.originId,old=merged.get(key);
      if(old)old.amount=S.round(old.amount+amount);else merged.set(key,{...a,id:a.originId+":cell:"+cell,cell,amount});
    };
    for(const a of w.informationField||[]){
      if(a.expires<=w.turn){informationInactivate(w,ctx,a.amount,"expiredAmount");continue;}
      if(a.generatedAt>=w.turn){add(a,a.cell,a.amount);continue;}
      const cells=S.nearby(w,a.cell).filter(cell=>S.oneStep(w,a.cell,cell)).sort((a,b)=>a-b),budget=S.round(a.amount*z.diffusionFraction);
      if(!cells.length||budget<=0){add(a,a.cell,a.amount);continue;}
      let moved=0;
      for(let n=0;n<cells.length;n++){
        const amount=S.round(n===cells.length-1?budget-moved:budget/cells.length);if(amount<=0)continue;
        moved=S.round(moved+amount);add(a,cells[n],amount);
      }
      add(a,a.cell,S.round(a.amount-moved));informationFlow(w,ctx,"movedAmount",moved);
    }
    w.informationField=informationCapacity(w,ctx,[...merged.values()]);
  }
  function informationAxes(subject){
    const group=S.spec(subject)?.group;
    if(group==="main")return [0,1,2,3,4,5,6,7,8];
    if(group==="prey"||group==="Q"&&subject.phase===4||subject.species==="freshwaterlight")return [1,2,3,4,5,6,7,8];
    return [1,2,3,4,5];
  }
  function informationApplicable(w,subject,content,receiver=null){
    const roles=receiver?.roles??S.PersistentInformation.roles(w,subject);
    if(content.scope!=="all"&&!(content.roles||[]).some(role=>roles.includes(role)))return "scope";
    if(!content.values.some(v=>(receiver?.axes??informationAxes(subject)).includes(v.axis)))return "context";
    return null;
  }
  function informationBundleIndex(w,ctx){
    const cells=new Map(),active=new Map(),add=(cell,item)=>{if(!cells.has(cell))cells.set(cell,[]);cells.get(cell).push(item);};
    for(const a of w.informationField){
      add(a.cell,{record:a,source:"environment",cell:a.cell,subject:null});
      for(const c of a.contents){const key=informationComponentKey(c);active.set(key,Math.max(active.get(key)||0,a.expires));}
    }
    for(const entry of S.PersistentInformation.entries(w)){
      const o=entry.subject,a=o.informationState,contents=(a?.experience||[]).filter(item=>S.PersistentInformation.qualified(w,item)).map(item=>informationContent(w,item));
      if(!contents.length)continue;
      const expires=w.turn+S.PersistentInformation.settings(w).minimumLifetime+S.PersistentInformation.settings(w).scoreLifetime,
        record={id:"held:"+o.id,originId:"held:"+o.id,sourceId:o.id,sourceSpecies:o.species,sourceRoles:entry.roles,generatedAt:w.turn,expires,amount:1,contents};
      add(informationCell(entry),{record,source:"ordinary",cell:informationCell(entry),subject:o});
      for(const c of contents){const key=informationComponentKey(c);active.set(key,Math.max(active.get(key)||0,expires));}
    }
    ctx.informationIndex={cells,active,placeCache:new Map()};return ctx.informationIndex;
  }
  function informationCaregiver(w,receiver,sender){
    const age=S.HyperParasite?.is(receiver)?S.HyperParasite.ageInfo(receiver):S.PrimaryParasite?.is(receiver)?S.PrimaryParasite.ageInfo(receiver):S.ageInfo(receiver);
    if(age.stage!=="juvenile")return false;
    return S.PersistentInformation.parents(receiver).includes(sender.id)||(receiver.informationState?.caregivers||[]).some(a=>a.id===sender.id&&a.expires>w.turn);
  }
  function informationReceive(w,ctx,entry,cache){
    const z=S.PersistentInformation.settings(w),o=entry.subject,a=S.PersistentInformation.state(o),index=ctx.informationIndex,
      cell=informationCell(entry),groups=new Map(),receiver={roles:entry.roles,axes:informationAxes(o)},
      groupKind=S.spec(o).group,environment=w.tiles[cell]?.env;
    // Extend duplicate protection while an origin is actually still available;
    // this never refreshes experience, traces, learned weights or reception.
    for(const known of a.learned){
      const ids=known.contentIds??(known.contentId?[known.contentId]:[]);
      let expiries=cache.expiries.get(known.originId);
      if(!expiries){expiries=new Map();cache.expiries.set(known.originId,expiries);}
      for(const id of ids){
        if(!expiries.has(id))expiries.set(id,index.active.get(known.originId+"|"+id));
        const expiry=expiries.get(id);if(expiry)known.expires=Math.max(known.expires,expiry);
      }
    }
    a.learned=a.learned.filter(known=>known.expires>w.turn);
    let nearby=cache.cells.get(cell);
    if(!nearby){nearby=S.nearby(w,cell,1,true).filter(at=>S.oneStep(w,cell,at)&&S.sight(w,cell,at));cache.cells.set(cell,nearby);}
    for(const at of nearby){
      for(const source of index.cells.get(at)||[]){
        if(source.subject?.id===o.id)continue;
        const caregiver=source.subject&&informationCaregiver(w,o,source.subject),transmission=source.source==="environment"?z.transmission.environment:caregiver?z.transmission.caregiver:z.transmission.ordinary;
        for(const content of source.record.contents){
          const invalid=informationApplicable(w,o,content,receiver);
          if(invalid){informationFlow(w,ctx,invalid==="scope"?"rejectedScope":"rejectedContext");continue;}
          let metadata=cache.contents.get(content);
          if(!metadata){metadata={key:informationComponentKey(content),fresh:S.PersistentInformation.freshness(content,w.turn)};cache.contents.set(content,metadata);}
          const {key,fresh}=metadata,context=content.context?.env===environment?1:.5,
            evidence=content.evidence==="low"?z.lowWeight:1,strength=Math.min(1,source.record.amount)*fresh*context*evidence*transmission;
          if(strength<=0)continue;
          if(!groups.has(content.originId))groups.set(content.originId,new Map());
          const byContent=groups.get(content.originId),old=byContent.get(content.contentId),candidate={...source,content,key,transmission,strength,caregiver};
          if(!old||strength>old.strength||strength===old.strength&&S.compare(source.record.originId,old.record.originId)<0)byContent.set(content.contentId,candidate);
        }
      }
    }
    const candidates=[...groups].map(([originId,contents])=>({originId,contents:[...contents.values()].sort((x,y)=>y.strength-x.strength||S.compare(x.key,y.key))}));
    candidates.sort((x,y)=>y.contents[0].strength-x.contents[0].strength||S.compare(x.originId,y.originId));
    const knownOrigins=new Map();if(candidates.length)for(const known of a.learned)if(!knownOrigins.has(known.originId))knownOrigins.set(known.originId,known);
    let read=0;a.last={turn:w.turn,received:0,applied:0,costE:0,deltaAbs:0,origins:[]};
    for(const group of candidates){
      let known=knownOrigins.get(group.originId);const knownIds=known?.contentIds??(known?.contentId?[known.contentId]:[]),contents=group.contents.filter(c=>!knownIds.includes(c.content.contentId));
      if(!contents.length){informationFlow(w,ctx,"deduplicated");continue;}
      if(read>=z.receiveLimit||!known&&a.learned.length>=z.learnedCapacity)break;
      const budget=ctx.costs?.get(o.id),maintenance=cellMode(w)&&budget?budget.base:S.PersistentInformation.maintenance(w,o),
        fee=known?0:Number.isFinite(maintenance)?S.round(maintenance*z.receiveCostFraction):null;
      if(fee===null||o.E+1e-8<fee||budget&&budget.budget+1e-8<fee){informationFlow(w,ctx,"rejectedBudget");continue;}
      o.E=S.round(o.E-fee);S.dissipate(w,fee);if(budget)budget.budget=S.round(Math.max(0,budget.budget-fee));
      const sensitivity=.8+.4*(o.dna?.sensitivity??.5);let deltaAbs=0;
      for(const c of contents)for(const v of c.content.values){
        if(!receiver.axes.includes(v.axis))continue;
        const d=S.clamp(v.value*sensitivity*c.strength,-3,3)*z.influence,
          values=groupKind==="main"?o.weights:a.learnedPreferences,before=values[v.axis];
        values[v.axis]=S.round(S.clamp(before+d,groupKind==="main"?0:-100,100));deltaAbs=S.round(deltaAbs+Math.abs(values[v.axis]-before));
        if(["P","Q"].includes(groupKind)&&v.axis===2&&c.content.peerSpecies){
          const allowed=groupKind==="Q"?["leafparasite","tideparasite"]:Object.values(S.PrimaryParasite.hostTable[o.species]||{}).flat();
          if(allowed.includes(c.content.peerSpecies)){a.hostPreferences??={};a.hostPreferences[c.content.peerSpecies]=S.round(S.clamp((a.hostPreferences[c.content.peerSpecies]||0)+d,-20,20));}
        }
      }
      const c=contents[0];
      if(!known){known={originId:group.originId,contentIds:[],sourceId:c.record.sourceId,sourceSpecies:c.record.sourceSpecies,
        receivedAt:w.turn,expires:c.record.expires,source:c.source,caregiver:!!c.caregiver};a.learned.push(known);knownOrigins.set(group.originId,known);}
      known.contentIds=[...new Set([...knownIds,...contents.map(c=>c.content.contentId)])];known.expires=Math.max(known.expires,...contents.map(c=>c.record.expires));
      read++;a.last.received++;a.last.costE=S.round(a.last.costE+fee);a.last.deltaAbs=S.round(a.last.deltaAbs+deltaAbs);a.last.origins.push(group.originId);
      informationFlow(w,ctx,"originsRead");informationFlow(w,ctx,"contentsRead",contents.length);informationFlow(w,ctx,"receptionCostE",fee);
      informationFlow(w,ctx,c.source==="environment"?"environmentRead":c.caregiver?"caregiverRead":"ordinaryRead");
      const event={id:group.originId,sourceId:c.record.sourceId,sourceSpecies:c.record.sourceSpecies,time:c.content.experienceAt,mediated:!!c.record.qEffects?.traces?.length,noise:c.content.evidence==="low"};
      (ctx.infoReceipts??=[]).push({recipient:o.id,species:o.species,event});
      if(deltaAbs>0){a.last.applied++;informationFlow(w,ctx,"learned");informationFlow(w,ctx,"learningDeltaAbs",deltaAbs);
        (ctx.infoEffects??=[]).push({recipient:o.id,species:o.species,event,deltaAbs});
        S.record(ctx,{id:o.id,cell},"information-effect",{source:c.record.sourceId,sourceSpecies:c.record.sourceSpecies,event:event.id,deltaAbs,kind:"learning"});}
    }
  }
  function informationBegin(w,ctx){
    if(S.CurrentInformation.enabled(w)){informationTrack(w,ctx);return S.CurrentInformation.begin(w,ctx);}
    if(!informationEnabled(w)||ctx.informationBegun)return;ctx.informationBegun=true;
    ctx.persistentInformationFlow??=emptyInformationFlow(w);informationTrack(w,ctx);informationDiffuse(w,ctx);informationBundleIndex(w,ctx);
    // Valid only during this fixed-position receive pass, never the next turn.
    const cache={cells:new Map(),contents:new WeakMap(),expiries:new Map()};
    for(const entry of S.PersistentInformation.entries(w))informationReceive(w,ctx,entry,cache);
  }
  function informationPlace(w,ctx,subject,cell){
    if(S.CurrentInformation.enabled(w))return S.CurrentInformation.place(w,ctx,subject,cell);
    const none={attraction:0,warning:0,value:0,origins:[]};
    if(!informationEnabled(w)||!ctx.informationIndex||!w.tiles[cell])return none;
    const z=S.PersistentInformation.settings(w);if(z.influence===0)return none;
    const cacheKey=cell+"|"+S.PersistentInformation.roles(w,subject).join(",")+"|"+informationAxes(subject).join(","),cache=ctx.informationIndex.placeCache;
    if(cache.has(cacheKey))return cache.get(cacheKey);
    const byMeaning=new Map();
    for(const at of S.nearby(w,cell,z.concentrationRadius,true)){
      const distance=S.distance(w,cell,at);if(!S.sight(w,cell,at))continue;
      for(const item of ctx.informationIndex.cells.get(at)||[]){
        if(item.source!=="environment")continue;
        for(const c of item.record.contents){
          if(informationApplicable(w,subject,c)||!Number.isInteger(c.context?.cell)||S.distance(w,cell,c.context.cell)>z.concentrationRadius)continue;
          const fresh=S.PersistentInformation.freshness(c,w.turn),weight=item.record.amount*fresh*z.distanceWeights[distance]*(c.evidence==="low"?z.lowWeight:1),
            key=c.meaning+"|"+S.stable([c.context,c.scope,c.roles,c.peerSpecies]),origin=informationComponentKey(c);
          if(!byMeaning.has(key))byMeaning.set(key,new Map());const origins=byMeaning.get(key),old=origins.get(origin);
          if(old)old.weight+=weight;else origins.set(origin,{weight,c,source:item.record.sourceId,sourceSpecies:item.record.sourceSpecies});
        }
      }
    }
    let attraction=0,warning=0;const origins=[];
    for(const group of byMeaning.values()){
      const rows=[...group.values()],mass=rows.reduce((sum,a)=>sum+a.weight,0);if(mass<=0)continue;
      const amplified=1+mass/(1+mass);
      for(const row of rows){
        const v=row.c.values.reduce((n,v)=>n+v.value,0)/Math.max(1,row.c.values.length),value=S.clamp(v/3,-1,1)*row.weight/mass*amplified*Math.min(1,mass)*z.influence;
        if(["damage","competition","parasitism"].includes(row.c.meaning))warning+=Math.max(0,value);else if(value>0)attraction+=value;else warning-=value;
        origins.push({originId:row.c.originId,contentId:row.c.contentId,sourceId:row.source,sourceSpecies:row.sourceSpecies,meaning:row.c.meaning,magnitude:S.round(Math.abs(value))});
      }
    }
    attraction=S.round(Math.min(2*z.influence,attraction));warning=S.round(Math.min(2*z.influence,warning));
    const result={attraction,warning,value:S.round(attraction-warning),origins};cache.set(cacheKey,result);return result;
  }
  function informationUsed(w,ctx,subject,cell,place){
    if(!informationEnabled(w)||!place||place.value===0||(place.attraction===0&&place.warning===0))return;
    const key=subject.id+"|"+cell;ctx.informationUsed??=new Set();if(ctx.informationUsed.has(key))return;ctx.informationUsed.add(key);
    informationFlow(w,ctx,"placeApplications");informationFlow(w,ctx,"placeMagnitude",Math.abs(place.attraction)+Math.abs(place.warning));
    const a=S.PersistentInformation.state(subject);a.last??={turn:w.turn,received:0,applied:0,costE:0,deltaAbs:0,origins:[]};
    a.last.place={turn:w.turn,attraction:place.attraction,warning:place.warning,value:place.value,
      origins:place.origins.slice(0,4).map(({originId,contentId,sourceId,magnitude})=>({originId,contentId,sourceId,magnitude})),originCount:place.origins.length};
    for(const origin of place.origins){if(origin.magnitude<=0)continue;const event={id:origin.originId+":"+origin.contentId,sourceId:origin.sourceId,sourceSpecies:origin.sourceSpecies,time:w.turn,mediated:false,noise:false};
      (ctx.infoEffects??=[]).push({recipient:subject.id,species:subject.species,event,deltaAbs:origin.magnitude,place:true});}
    S.record(ctx,{id:subject.id,cell},"information-effect",{kind:"place",attraction:place.attraction,warning:place.warning});
  }
  function informationExperience(w,ctx,entry,event){
    const o=entry.subject,item=S.PersistentInformation.addExperience(w,o,event);if(item)informationFlow(w,ctx,"ownExperiences");return item;
  }
  function informationTraceEffects(w,subject){
    if(S.CurrentInformation.enabled(w))return S.CurrentInformation.traceEffects(w,subject);
    const z=S.PersistentInformation.settings(w);if(z.qEffects===false)return {promotion:0,traces:[],vectors:Array(9).fill(0)};
    const traces=(subject.hyperTraces||[]).filter(t=>t.detachedAt===null||w.turn-t.detachedAt<z.traceLifetime),sum=traces.reduce((n,t)=>n+Math.max(0,t.strength),0),vectors=Array(9).fill(0);let promotion=0;
    for(const t of traces){const decay=t.detachedAt===null?1:Math.pow(.5,Math.max(0,w.turn-t.detachedAt)/z.traceHalfLife),weight=sum>0?t.strength/sum:0;
      promotion+=t.promotion*decay*weight;for(let axis=0;axis<9;axis++){const direction=t.direction?.vector9?.[axis]??(t.direction?.axis===axis?t.direction.sign:0);vectors[axis]+=t.distortion*decay*weight*direction;}}
    return {promotion:S.round(Math.min(.10,promotion)),vectors:vectors.map(n=>S.round(S.clamp(n,-.20,.20))),traces:traces.map(t=>({qId:t.qId,pId:t.pId,sourceId:t.sourceId,updatedAt:t.updatedAt,detachedAt:t.detachedAt,paidE:t.paidE}))};
  }
  function informationGenerate(w,ctx,entry,details={}){
    if(S.CurrentInformation.enabled(w))return S.CurrentInformation.generate(w,ctx,entry,details);
    const o=entry.subject,a=S.PersistentInformation.state(o),z=S.PersistentInformation.settings(w);if(a.deathDecision)return a.deathDecision;
    const evaluation=S.PersistentInformation.evaluate(w,o),all=a.experience||[],normal=all.filter(c=>c.confirmedHarm||c.count>=z.normalCount&&c.distinctTurns>=z.normalTurns),low=all.filter(c=>!normal.includes(c)&&c.count>0),
      harm=normal.some(c=>c.confirmedHarm),effects=informationTraceEffects(w,o),base=normal.length?(evaluation.resolved?evaluation.pBase:0):0,
      pN=normal.length?S.clamp(Math.max(base,harm?z.harmMinimum:0)+effects.promotion,0,1):0,pL=low.length?Math.min(z.lowProbability,1-pN):0,
      u=S.r(w,"information/death",w.turn,o.id),kind=u<pN?"normal":u<pN+pL?"low":null;
    a.deathDecision={turn:w.turn,cell:details.cell??informationCell(entry),u,pN:S.round(pN),pL:S.round(pL),kind,generated:false,evaluation:structuredClone(evaluation)};
    informationFlow(w,ctx,"deathDecisions");if(normal.length||low.length)informationFlow(w,ctx,"candidateDeaths");
    if(!kind){informationFlow(w,ctx,"noGeneration");return a.deathDecision;}
    const chosen=(kind==="normal"?normal:low).slice().sort((x,y)=>(y.confirmedHarm?1:0)-(x.confirmedHarm?1:0)||y.amount-x.amount||S.compare(x.originId,y.originId)).slice(0,z.originContents),
      contents=chosen.map(c=>informationContent(w,c,kind==="low"?"low":c.confirmedHarm?"confirmed-harm":"normal"));
    let distorted=false;
    if(kind==="normal")for(const c of contents)for(const v of c.values){const before=v.value;v.value=S.round(S.clamp(v.value+6*effects.vectors[v.axis],-3,3));distorted ||= before!==v.value;}
    const originId="death-information:"+o.id+":"+w.turn,record={id:originId+":cell:"+a.deathDecision.cell,originId,sourceId:o.id,sourceSpecies:o.species,sourceRoles:entry.roles.slice(),
      generatedAt:w.turn,expires:w.turn+(evaluation.resolved?evaluation.lifetime:z.minimumLifetime),amount:z.initialAmount,cell:a.deathDecision.cell,contents,
      score:evaluation.S,lowEvidence:kind==="low",generation:{evaluation:structuredClone(evaluation),pN:a.deathDecision.pN,pL:a.deathDecision.pL,u,kind},
      qEffects:kind==="normal"?effects:{promotion:0,vectors:Array(9).fill(0),traces:[]}};
    a.deathDecision.generated=true;w.informationLedger.generatedAmount=S.round(w.informationLedger.generatedAmount+record.amount);
    w.informationField.push(record);informationFlow(w,ctx,kind==="normal"?"normalGenerated":"lowGenerated");informationFlow(w,ctx,"generatedAmount",record.amount);
    if(kind==="normal"&&effects.promotion>0)informationFlow(w,ctx,"qPromoted");if(distorted)informationFlow(w,ctx,"qDistorted");
    (ctx.infoEmissions??=[]).push({id:originId,sourceId:o.id,species:o.species,time:w.turn,mediated:kind==="normal"&&effects.traces.length>0});
    return a.deathDecision;
  }
  function informationFinalize(w,ctx){
    if(!informationEnabled(w)||ctx.informationFinalized)return;ctx.informationFinalized=true;informationTrack(w,ctx);
    const alive=new Map(S.PersistentInformation.entries(w).map(e=>[e.subject.id,e])),subjects=ctx.informationSubjects||new Map(),
      peerSpecies=id=>subjects.get(id)?.subject.species??null;
    for(const [id,entry]of subjects){
      const o=entry.subject,rec=ctx.records.get(id),cell=alive.has(id)?informationCell(alive.get(id)):informationCell(entry),role=entry.roles,
        events=ctx.events.get(id)||[],context={env:w.tiles[cell]?.env??null,cell};
      let maintained=rec?.informationMaintained===true,roleAmounts={},relation=false;
      const note=(meaning,amount,values,options={})=>{if(amount<=0)return;const item=informationExperience(w,ctx,entry,{meaning,contentId:meaning,amount,values,turn:w.turn,cell,context,
          result:meaning,peerId:options.peerId??null,peerSpecies:options.peerSpecies??null,scope:["damage","competition"].includes(meaning)?"all":"layer",
          kind:meaning==="production"?"place":["feeding","competition"].includes(meaning)?"fast":"relation",confirmedHarm:meaning==="damage",...options});return item;};
      for(const e of events)if(e.type==="feed"&&e.assimilated>0&&["plant","fungal","animal"].includes(e.tag)){
        note("feeding",e.assimilated,[{axis:2,value:2}],{peerId:e.source,peerSpecies:e.sourceSpecies,cell:e.to??cell,context:{env:w.tiles[e.to??cell]?.env??null,cell:e.to??cell}});relation=true;
        const r=role.includes("decomposer")?"decomposer":e.tag==="plant"?"primary-consumer":role.includes("secondary-consumer")?"secondary-consumer":role[0];
        if(r)roleAmounts[r]=S.round((roleAmounts[r]||0)+e.assimilated);
      }
      if(rec?.damage>0){note("damage",rec.damage,[{axis:1,value:2}],{peerId:rec.hitBy,peerSpecies:peerSpecies(rec.hitBy)});relation=true;}
      if(rec?.crowding)note("competition",1,[{axis:4,value:2}]);
      for(const e of events)if(e.type==="care"&&e.amount>0){note("support",e.amount,[{axis:3,value:2}],{peerId:e.target,peerSpecies:peerSpecies(e.target)});relation=true;
        const target=alive.get(e.target)?.subject;if(target){const a=S.PersistentInformation.state(target);a.caregivers=[...(a.caregivers||[]).filter(a=>a.id!==id&&a.expires>w.turn),{id,expires:w.turn+10}].slice(-2);}}
      const production=cellMode(w)&&S.CellLife.is(o)?(["colony","plant"].includes(o.cellLife.kind)&&o.cellLife.last.turn===w.turn?o.cellLife.last.production:0):
        o.colony?.last?.productionB??o.plant?.last?.productionB??rec?.informationProducedB??0;
      if(production>0){note("production",production,[{axis:2,value:1},{axis:5,value:1}],{kind:"place"});roleAmounts.producer=production;}
      if(entry.kind==="P"){
        const current=o.primary?.last?.turn===w.turn;maintained=current&&o.primary.last.maintained===true;const progress=current?o.primary.last.appliedProgress||0:0;
        if(progress>0){note("parasitism",progress,[{axis:2,value:1}],{peerId:entry.host?.id,peerSpecies:entry.host?.species});roleAmounts.P=progress;relation=true;}
      }
      if(entry.kind==="Q"){
        const current=o.hyper?.last?.turn===w.turn;maintained=current&&o.hyper.last.maintained===true;const progress=current?o.hyper.last.appliedProgress||0:0;
        if(progress>0){note("parasitism",progress,[{axis:2,value:1}],{peerId:o.hostId,peerSpecies:peerSpecies(o.hostId)});roleAmounts.Q=progress;relation=true;}
      }
      S.PersistentInformation.recordProgress(w,o,{maintained,roleAmounts,relation});
      const a=S.PersistentInformation.state(o),count=(S.CurrentInformation.enabled(w)?S.CurrentInformation.components(o).filter(S.CurrentInformation.qualified):a.experience.filter(c=>S.PersistentInformation.qualified(w,c))).length;
      if(count>(a.holdingCount||0)){informationFlow(w,ctx,"holdingQualified",count-(a.holdingCount||0));}a.holdingCount=count;
    }
    for(const entry of alive.values()){
      const child=entry.subject,a=S.PersistentInformation.state(child);
      if(cellMode(w)&&S.CellLife.is(child)&&child.cellLife.kind==="group"&&child.consumerGroup.origin)continue;
      if(a.offspringCredited||!S.PersistentInformation.parents(child).length)continue;
      const age=entry.kind==="Q"?S.HyperParasite.ageInfo(child):entry.kind==="P"?null:S.ageInfo(child),established=entry.kind==="Q"?child.phase===4:age?.stage!=="juvenile"&&(child.age??0)>=4;
      if(!established)continue;
      a.offspringCredits??=[];
      for(const parentId of S.PersistentInformation.parents(child)){
        const parent=alive.get(parentId),childCell=informationCell(entry);if(!parent||a.offspringCredits.includes(parentId)||
          !S.oneStep(w,informationCell(parent),childCell)||!S.sight(w,informationCell(parent),childCell))continue;
        a.offspringCredits.push(parentId);
        S.PersistentInformation.recordProgress(w,parent.subject,{offspringSuccess:1});
        informationExperience(w,ctx,parent,{meaning:"reproduction",contentId:"reproduction",peerId:child.id,peerSpecies:child.species,result:"offspring-established",amount:1,cell:childCell,turn:w.turn,
          context:{env:w.tiles[childCell]?.env??null,cell:childCell},kind:"place",values:[{axis:3,value:2}],scope:"layer"});
      }
      a.offspringCredited=S.PersistentInformation.parents(child).every(id=>a.offspringCredits.includes(id));
    }
    const explicit=ctx.informationDeaths||new Map();
    for(const [id,entry]of subjects)if(!alive.has(id)||explicit.has(id))informationGenerate(w,ctx,entry,explicit.get(id));
    w.informationField=S.CurrentInformation.enabled(w)?S.CurrentInformation.compact(w,ctx,w.informationField):informationCapacity(w,ctx,w.informationField);w.persistentInformationSummary=S.PersistentInformation.summary(w);
  }
  const hyperFlowKeys=["exposures","invasionAttempts","invaded","established","cleared","emergenceAttempts","emergenceFailed","emerged","eggsLaid","offspringEstablished","fedE","moved","preyed","maintenanceE","developmentE","metaE","informationE","emergenceE","movementE","laidE"];
  function emptyHyperFlow(w) {
    return {definition:"hyper-parasite-flow/1",turn:w.turn,bySpecies:{hyperparasite:Object.fromEntries(hyperFlowKeys.map(k=>[k,0]))}};
  }
  function hyperFlow(w,ctx,key,value=1) {
    ctx.hyperFlow??=emptyHyperFlow(w);
    const row=ctx.hyperFlow.bySpecies.hyperparasite;row[key]=S.round(row[key]+value);
  }
  function hyperEvent(ctx,subject,type,extra={}) {
    S.record(ctx,subject,"hyper-"+type,{species:"hyperparasite",...extra});
  }
  function hyperLast(w,q) {
    if(q.hyper.last?.turn!==w.turn)q.hyper.last={turn:w.turn,outcome:null,outcomeAt:null,reason:null,blockers:[],taxE:0,maintenanceE:0,developmentE:0,metaE:0,informationE:0,emergenceE:0,feedingE:0,movementE:0,laidE:0,maintained:false,developed:false,progress:0,...(informationEnabled(w)?{appliedProgress:0}:{}),modulation:0};
    return q.hyper.last;
  }
  function hyperOutcome(w,q,outcome,reason=null) {
    Object.assign(hyperLast(w,q),{outcome,outcomeAt:w.turn,reason});
  }
  function hyperCost(q,p) {
    return S.clamp(1-.5*(S.HyperParasite.adaptation(q,p.species,"contact","terminal")-.5),.75,1.25);
  }
  function hyperSpend(w,q,cost) {
    const paid=S.round(Math.min(q.E,Math.max(0,cost)));q.E=S.round(q.E-paid);S.dissipate(w,paid);return paid;
  }
  function hyperDetachTraces(w,host,p,q,hostOnly=false) {
    if(S.CurrentInformation.enabled(w))return S.CurrentInformation.detach(w,host,p,q,hostOnly);
    if(!hyperEnabled(w)||!S.HyperParasite.is(q))return;
    for(const holder of hostOnly?[host]:[host,p])for(const trace of holder?.hyperTraces||[])
      if(trace.qId===q.id&&trace.detachedAt===null)trace.detachedAt=w.turn;
  }
  function hyperTrace(w,host,p,q,paid) {
    if(S.CurrentInformation.enabled(w))return S.CurrentInformation.trace(w,host,p,q,paid);
    if(paid<=0)return;
    const z=S.HyperParasite.settings(w),phase=q.phase,ratio=S.clamp(paid/z.informationCosts[phase],0,1),
      investment=q.hyper.genes.investment, promotion=z.promotionCaps[phase]*ratio*investment.promotion,
      distortion=z.distortionCaps[phase]*ratio*investment.distortion;
    for(const holder of [host,p]){
      if(!holder)continue;
      holder.hyperTraces??=[];
      const old=holder.hyperTraces.find(a=>a.qId===q.id),oldFactor=old?.detachedAt===null?1:old?Math.pow(.5,Math.max(0,w.turn-old.detachedAt)/50):0,
        heldPromotion=Math.min(z.promotionCaps[phase]*investment.promotion,(old?.promotion||0)*oldFactor+promotion),
        heldDistortion=Math.min(z.distortionCaps[phase]*investment.distortion,(old?.distortion||0)*oldFactor+distortion),
        trace={version:"hyper-trace/1",qId:q.id,pId:p.id,sourceId:host.id,
        firstAt:old?.firstAt??w.turn,updatedAt:w.turn,detachedAt:null,phase,paidE:S.round((old?.paidE||0)+paid),
        promotion:S.round(heldPromotion),distortion:S.round(heldDistortion),direction:structuredClone(q.hyper.bias||{axis:0,sign:1}),
        strength:S.round(heldPromotion+heldDistortion)};
      const candidates=[...holder.hyperTraces.filter(a=>a.qId!==q.id),trace].filter(a=>a.detachedAt===null||w.turn-a.detachedAt<100);
      candidates.sort((a,b)=>{
        const value=t=>t.strength*(t.detachedAt===null?1:Math.pow(.5,(w.turn-t.detachedAt)/50));
        return value(b)-value(a)||S.compare(a.qId,b.qId);
      });
      holder.hyperTraces=candidates.slice(0,2);
    }
  }
  function hyperExclude(w,ctx,host,reason="immunity") {
    if(!hyperEnabled(w))return false;
    const p=host.infection,q=p?.q;if(!S.HyperParasite.is(q))return false;
    hyperDetachTraces(w,host,p,q);
    if(["immunity","groom"].includes(reason)){S.HyperParasite.acquireResistance(w,p);hyperFlow(w,ctx,"cleared");}
    hyperOutcome(w,q,"cleared",reason);p.q=null;S.dissipate(w,q.E+q.B);
    ctx.deaths.push({species:"hyperparasite",reason});hyperEvent(ctx,host,"cleared",{parasite:q.id,target:p.id,hostSpecies:p.species,reason});return true;
  }
  function hyperAdultDeath(w,ctx,q,reason="predation") {
    if(!hyperEnabled(w)||!S.HyperParasite.is(q)||(w.searchQ||[]).every(a=>a.id!==q.id))return false;
    S.dissipate(w,q.E+q.B);q.E=0;q.B=0;w.searchQ=w.searchQ.filter(a=>a.id!==q.id);
    ctx.deaths.push({species:"hyperparasite",reason});if(reason==="predation")hyperFlow(w,ctx,"preyed");
    hyperOutcome(w,q,"dead",reason);hyperEvent(ctx,q,"death",{parasite:q.id,reason});return true;
  }
  function hyperEvade(w,ctx,q,predator){
    // Same finite escape rule as the existing free-Q ration path. A successful
    // escape protects this individual for the T, without repeated charges.
    if(!cohorts(w))return false;
    if(ctx.hyperEscaped?.has(q.id))return true;
    const chance=fanout(w)?.80+.05*(S.ParasiteCohort.members(q)-1):.45+.15*(S.ParasiteCohort.members(q)-1);
    if(q.E<.004||S.r(w,"hyper/cohort-evade",w.turn,q.id,predator.id)>=chance)return false;
    q.E=S.round(q.E-.004);S.dissipate(w,.004);(ctx.hyperEscaped??=new Set()).add(q.id);
    S.record(ctx,q,"evade",{predator:predator.id,cell:q.cell,species:"hyperparasite"});return true;
  }
  function hyperExpose(w,ctx,parent,host) {
    if(!hyperEnabled(w)||!S.HyperParasite.is(parent)||parent.phase!==4||parent.hyper.state!=="adult")return {invaded:false,reason:"parent"};
    const z=S.HyperParasite.settings(w),p=host?.infection,last=hyperLast(w,parent);
    if(!host||host.HP<=0||!(cohorts(w)?S.distance(w,parent.cell,host.cell)<=3:S.oneStep(w,parent.cell,host.cell))||
      !S.sight(w,parent.cell,host.cell))return {invaded:false,reason:"contact"};
    if(parent.bornAt>=w.turn||parent.hyper.detachedAt>=w.turn||parent.ready>w.turn||parent.age<(parent.maturity??z.maturity))return {invaded:false,reason:"parent"};
    // Selection does not reveal the exact internal clock. Actual contact must
    // still pass this strict, one-use biological compatibility window.
    if(!S.PrimaryParasite.is(p)||!["leafparasite","tideparasite"].includes(p.species)||!windowOpen(w,p))return {invaded:false,reason:"window"};
    if(p.q||(w.hyperInocula||[]).some(i=>i.hostId===p.id&&i.E>0))return {invaded:false,reason:"occupied"};
    if(ctx.movedInfections.has(p.id)||w.turn<=p.primary.pauseUntil)return {invaded:false,reason:"migration"};
    const factor=hyperCost(parent,p),cost=S.round(z.eggReserve+(z.eggCost-z.eggReserve)*factor);
    if(parent.E+1e-8<cost)return {invaded:false,reason:"nutrition"};
    parent.E=S.round(parent.E-cost);last.laidE=S.round(last.laidE+cost);hyperFlow(w,ctx,"laidE",cost);parent.ready=w.turn+z.eggCooldown;
    hyperFlow(w,ctx,"exposures");hyperFlow(w,ctx,"invasionAttempts");
    const resistance=S.HyperParasite.resistance(w,p),chance=S.clamp(z.entryRate*(1-z.entryDefense)*(1-.5*resistance),0,1);
    if(S.r(w,"hyper/invasion",w.turn,parent.id,p.id)>=chance){S.dissipate(w,cost);hyperOutcome(w,parent,"invasion-failed","invasion");hyperEvent(ctx,host,"invasion-failed",{parasite:parent.id,target:p.id,cost});return {invaded:false,reason:"invasion"};}
    const id="hyper-inoculum:"+parent.id+":"+w.turn,traits=S.HyperParasite.childTraits(w,parent,id,w.turn);
    const i={id,kind:"invading",parentId:parent.id,sourceId:parent.id,hostId:p.id,carrierId:host.id,cell:host.cell,
      E:z.eggReserve,createdAt:w.turn,invadedAt:w.turn,establishAt:w.turn+1,expires:w.turn+z.eggLifetime,
      matureAt:p.matureAt,...(cohorts(w)?{preMature:!Number.isInteger(p.matureAt)}:{}),route:"contact",...traits};
    w.hyperInocula??=[];w.hyperInocula.push(i);S.dissipate(w,cost-z.eggReserve);
    hyperFlow(w,ctx,"invaded");hyperFlow(w,ctx,"eggsLaid");hyperOutcome(w,parent,"laid");
    hyperEvent(ctx,host,"invaded",{parasite:parent.id,target:p.id,inoculum:id,establishAt:i.establishAt,cost});
    return {invaded:true,reason:null,id};
  }
  function hyperEstablish(w,ctx) {
    if(!hyperEnabled(w))return;
    const z=S.HyperParasite.settings(w),holders=new Map(primaryHolders(w).map(host=>[host.infection.id,host]));
    const due=(w.hyperInocula||[]).slice().sort((a,b)=>S.compare(a.id,b.id)),keep=[];
    for(const i of due){
      if(i.establishAt>w.turn&&i.expires>w.turn){keep.push(i);continue;}
      const host=holders.get(i.hostId),p=host?.infection;
      const early=cohorts(w)&&i.preMature===true&&p?.stage==="terminal"&&p.counter>=Math.ceil(S.PrimaryParasite.settings(w).development.terminal/2);
      const proof=(early||Number.isSafeInteger(i.matureAt)&&i.invadedAt>i.matureAt&&i.invadedAt<=i.matureAt+(fanout(w)?10:cohorts(w)?6:3))&&i.establishAt===i.invadedAt+1;
      const timely=proof&&i.establishAt===w.turn&&i.invadedAt<i.expires;
      const valid=timely&&host&&w.organisms.includes(host)&&host.HP>0&&S.PrimaryParasite.is(p)&&(early||p.matureAt===i.matureAt)&&!p.q&&!ctx.movedInfections.has(p.id)&&w.turn>p.primary.pauseUntil;
      const a=valid?S.HyperParasite.adaptation({hyper:{genes:i.genes}},p.species,"contact","terminal"):.5,
        chance=S.clamp(z.establishmentRate*(1-(valid?S.HyperParasite.resistance(w,p):0))*(1+.5*(a-.5)),0,1);
      if(valid&&i.E>=z.biomass[1]&&S.r(w,"hyper/establishment",w.turn,i.id,p.id)<chance){
        const q=S.HyperParasite.create(w,p.id,w.turn,i.id,i);q.B=z.biomass[1];q.E=S.round(i.E-q.B);p.q=q;
        q.hyper.state="egg";q.hyper.settledAt=w.turn;q.hyper.pauseUntil=w.turn;
        ctx.births.push("hyperparasite");hyperFlow(w,ctx,"established");if(i.parentId)hyperFlow(w,ctx,"offspringEstablished");
        hyperOutcome(w,q,"established");hyperEvent(ctx,host,"established",{parasite:q.id,target:p.id,hostSpecies:p.species,parent:i.parentId,amount:i.E});
      }else{
        S.dissipate(w,i.E);hyperEvent(ctx,host||{id:i.hostId,cell:i.cell},"establishment-failed",{parasite:i.id,target:i.hostId,reason:valid?"establishment":"host-or-window",amount:i.E});
      }
    }
    w.hyperInocula=keep;
  }
  function hyperBegin(w,ctx) {
    if(!hyperEnabled(w)||ctx.hyperBegun)return;ctx.hyperBegun=true;ctx.hyperFlow??=emptyHyperFlow(w);
    const z=S.HyperParasite.settings(w);
    for(const host of primaryHolders(w))S.HyperParasite.beginResistance(w,host.infection);
    hyperEstablish(w,ctx);
    for(const host of primaryHolders(w)){
      const p=host.infection,q=p.q;if(!S.HyperParasite.is(q))continue;
      q.age=Math.max(q.age||0,w.turn-q.bornAt);const last=hyperLast(w,q);
      if(q.age>=q.birthLife){hyperExclude(w,ctx,host,"age");continue;}
      if(q.hyper.settledAt>=w.turn)continue;
      if(p.E>=z.exclusionCost){
        p.E=S.round(p.E-z.exclusionCost);S.dissipate(w,z.exclusionCost);
        if(S.r(w,"hyper/exclusion",w.turn,p.id,q.id)<z.exclusionRate){hyperExclude(w,ctx,host,"immunity");continue;}
      }
      const phase=Math.min(3,q.phase),factor=hyperCost(q,p)*(cohorts(w)?S.ParasiteCohort.burden(q):1),tax=S.round(Math.min(p.E,z.hostTax[phase]*(cohorts(w)?S.ParasiteCohort.burden(q):1),z.capE-q.E));
      p.E=S.round(p.E-tax);q.E=S.round(q.E+tax);last.taxE=tax;
      const cost=S.round(z.maintenance[phase]*factor),paid=hyperSpend(w,q,cost);
      last.maintenanceE=paid;last.maintained=paid+1e-8>=cost;hyperFlow(w,ctx,"maintenanceE",paid);
      q.hyper.starvationRun=last.maintained?0:q.hyper.starvationRun+1;
      if(!last.maintained)last.blockers.push("maintenance");
      if(q.hyper.starvationRun>=z.starvationTurns){hyperExclude(w,ctx,host,"maintenance");continue;}
      const developing=w.organisms.includes(host)&&host.HP>0&&!ctx.movedInfections.has(p.id)&&w.turn>Math.max(p.primary.pauseUntil,q.hyper.pauseUntil)&&q.hyper.development<z.development;
      if(last.maintained&&developing){
        const cost=S.round(z.developmentCost[phase]*factor),paid=hyperSpend(w,q,cost);last.developmentE=paid;
        last.developed=paid+1e-8>=cost;hyperFlow(w,ctx,"developmentE",paid);
        if(last.developed)last.progress=S.round(1-.5*S.HyperParasite.resistance(w,p));else last.blockers.push("development");
      }
      if(last.maintained&&(!developing||last.developed)&&w.organisms.includes(host)&&host.HP>0){
        const meta=S.round(z.metaCosts[phase]*factor),info=S.round(z.informationCosts[phase]*factor),
          requestedMeta=S.round(meta*informationAllocation(w,q,2)),requestedInfo=S.round(info*informationAllocation(w,q,3));
        // Optional manipulation never spends the same finite reserve needed for
        // survival, further development, and a paid emergence attempt.
        const reserve=survivalEnabled(w)?S.round(z.maintenance[phase]*factor+
          (q.hyper.development<z.development?z.developmentCost[phase]*factor:0)+
          (phase===3?z.maintenance[phase]*factor*z.emergenceMultiplier+Math.max(0,z.biomass[4]-q.B):Math.max(0,z.biomass[phase+1]-q.B))):0,
          share=survivalEnabled(w)?Math.min(1,Math.max(0,q.E-reserve)/Math.max(1e-9,requestedMeta+requestedInfo)):1;
        const paid=hyperSpend(w,q,S.round(requestedMeta*share));last.metaE=paid;hyperFlow(w,ctx,"metaE",paid);
        const sign=q.hyper.bias?.sign??(q.modulation||1);last.modulation=meta>0?S.round(sign*z.metaCaps[phase]*Math.min(1,paid/meta)):0;
        const invest=hyperSpend(w,q,S.round(requestedInfo*share));last.informationE=invest;hyperFlow(w,ctx,"informationE",invest);hyperTrace(w,host,p,q,invest);
        if(p.primary.last)p.primary.last.induction=S.round(S.clamp(p.primary.last.induction*(1+last.modulation),0,1));
      }
    }
  }
  function hyperMature(w,ctx) {
    if(!hyperEnabled(w)||ctx.hyperMatured)return;ctx.hyperMatured=true;
    const z=S.HyperParasite.settings(w);
    for(const host of w.organisms){
      const p=host.infection,q=p?.q;if(!S.HyperParasite.is(q)||q.hyper.settledAt>=w.turn)continue;
      const last=hyperLast(w,q),active=host.HP>0&&!ctx.movedInfections.has(p.id)&&w.turn>Math.max(p.primary.pauseUntil,q.hyper.pauseUntil);
      if(!active){last.blockers.push("migration");continue;}
      if(last.maintained){q.hyper.experience=S.round(q.hyper.experience+.25+(last.developed ? .75 : 0));if(last.progress>0){const before=q.hyper.development;q.hyper.development=S.round(Math.min(z.development,q.hyper.development+last.progress));if(informationEnabled(w))last.appliedProgress=S.round(q.hyper.development-before);}}
      const phase=q.hyper.experience>=z.phaseThresholds[3]?3:q.hyper.experience>=z.phaseThresholds[2]?2:1;
      if(phase>q.phase){const extra=S.round(z.biomass[phase]-q.B);if(q.E>=extra){q.E=S.round(q.E-extra);q.B=S.round(q.B+extra);q.phase=phase;}}
      q.hyper.state=q.hyper.development>=z.development?"preparation":q.hyper.development>=1?"larva":"egg";
      if(q.phase<3)last.blockers.push("phase");if(q.age<(q.maturity??z.maturity))last.blockers.push("maturity");
      if(q.hyper.development<z.development)last.blockers.push("development");if(w.turn<q.hyper.prepareUntil)last.blockers.push("repreparation");
      if(cohorts(w)&&!Number.isInteger(p.matureAt))last.blockers.push("host-maturation");
      if(!last.maintained||q.phase<3||q.age<(q.maturity??z.maturity)||q.hyper.development<z.development||w.turn<q.hyper.prepareUntil||
        cohorts(w)&&!Number.isInteger(p.matureAt))continue;
      const cost=S.round(z.maintenance[q.phase]*hyperCost(q,p)*z.emergenceMultiplier),extra=S.round(z.biomass[4]-q.B);
      if(q.E+1e-8<cost+extra){last.blockers.push("emergence-nutrition");continue;}
      last.emergenceE=hyperSpend(w,q,cost);hyperFlow(w,ctx,"emergenceE",last.emergenceE);hyperFlow(w,ctx,"emergenceAttempts");q.hyper.prepareUntil=w.turn+z.prepareTurns;
      const chance=S.clamp(z.emergenceRate*(1-S.HyperParasite.resistance(w,p)),0,1);
      if(S.r(w,"hyper/emergence",w.turn,q.id,p.id)>=chance){if(cohorts(w)&&q.hyper.cohort.members>1)q.hyper.cohort.members--;hyperFlow(w,ctx,"emergenceFailed");hyperOutcome(w,q,"emergence-failed","resistance-or-chance");hyperEvent(ctx,host,"emergence-failed",{parasite:q.id,target:p.id,cost});continue;}
      q.E=S.round(q.E-extra);q.B=S.round(q.B+extra);hyperDetachTraces(w,host,p,q);p.q=null;
      if(fanout(w)){
        // The fatal emergence consumes a finite part of the P host rather
        // than discarding all of its remaining body and reserve.
        const taken=S.round(Math.min(p.E+p.B,(z.capE-q.E)/.8));
        if(taken>0){
          const reserve=S.round(Math.min(p.E,taken)),body=S.round(taken-reserve),gain=S.round(taken*.8);
          p.E=S.round(p.E-reserve);p.B=S.round(p.B-body);q.E=S.round(q.E+gain);
          S.dissipate(w,S.round(taken-gain));hyperFlow(w,ctx,"fedE",gain);
          S.record(ctx,q,"feed",{source:p.id,sourceType:"parasite",sourceSpecies:p.species,tag:"animal",amount:taken,assimilated:gain,to:host.cell,species:"hyperparasite"});
        }
      }
      host.infection=null;S.loseInfection(w,p);q.phase=4;q.hostId=null;q.cell=host.cell;q.hyper.state="adult";q.hyper.detachedAt=w.turn;
      q.hyper.emergedFromPid=p.id;q.hyper.emergedFromHid=host.id;
      w.searchQ??=[];w.searchQ.push(q);hyperFlow(w,ctx,"emerged");hyperOutcome(w,q,"emerged");
      hyperEvent(ctx,q,"emerged",{parasite:q.id,source:p.id,host:host.id,hostSpecies:p.species,cost});
    }
  }
  function hyperSearch(w,ctx) {
    if(!hyperEnabled(w)||ctx.hyperSearched)return;ctx.hyperSearched=true;
    const z=S.HyperParasite.settings(w),m=S.maps(w),resourceMap=m.resources,carcassMap=m.carcasses,organicMap=new Map();
    if(cellMode(w))for(const row of S.SoilMatter.enabled(w)?S.SoilMatter.rows(w):w.cellState.organic){if(!organicMap.has(row.cell))organicMap.set(row.cell,[]);organicMap.get(row.cell).push(row);}
    if(fanout(w)){
      const separate=[];
      for(const q of w.searchQ||[]){
        if(!S.HyperParasite.is(q)||S.ParasiteCohort.members(q)<2){separate.push(q);continue;}
        const other=structuredClone(q),halfE=S.round(q.E/2),halfB=S.round(q.B/2);
        other.id=q.id+":split:"+w.turn;other.E=halfE;other.B=halfB;other.hyper.cohort.members=1;
        other.hyper.splitTurn=w.turn;
        q.E=S.round(q.E-halfE);q.B=S.round(q.B-halfB);q.hyper.cohort.members=1;
        separate.push(q,other);
      }
      w.searchQ=separate;
    }
    for(const q of (w.searchQ||[]).slice().sort((a,b)=>S.compare(a.id,b.id))){
      if(!S.HyperParasite.is(q))continue;
      q.age=Math.max(q.age||0,w.turn-q.bornAt);const last=hyperLast(w,q);
      if(q.age>=q.birthLife){hyperAdultDeath(w,ctx,q,"age");continue;}
      if(q.hyper.detachedAt>=w.turn||q.bornAt>=w.turn)continue;
      const need=z.maintenance[4]*(fanout(w)&&S.ParasiteCohort.members(q)===1?.5:cohorts(w)?S.ParasiteCohort.burden(q):1),paid=hyperSpend(w,q,need);last.maintenanceE=paid;last.maintained=paid+1e-8>=need;hyperFlow(w,ctx,"maintenanceE",paid);
      q.hyper.starvationRun=last.maintained?0:q.hyper.starvationRun+1;
      if(q.hyper.starvationRun>=z.starvationTurns){hyperAdultDeath(w,ctx,q,"maintenance");continue;}
      if(!cellMode(w)){
      const food=[...(resourceMap.get(q.cell)||[]).filter(a=>["plant","fungal","animal"].includes(S.FOOD[a.kind]?.tag)),...(carcassMap.get(q.cell)||[])].filter(a=>a.E>0).sort((a,b)=>S.compare(a.id,b.id));
      let appetite=z.adultFoodCap;
      for(const a of food){
        const n=S.round(Math.min(appetite,a.E,(z.capE-q.E)/z.adultAssimilation));if(n<=0)continue;
        const beforeE=a.E;a.E=S.round(a.E-n);
        if(!a.kind&&Number.isFinite(a.G))a.G=S.round(a.G*a.E/beforeE);
        const assimilated=S.round(n*z.adultAssimilation);q.E=S.round(q.E+assimilated);S.dissipate(w,n-assimilated);appetite=S.round(appetite-n);
        last.feedingE=S.round(last.feedingE+assimilated);hyperFlow(w,ctx,"fedE",assimilated);
        S.record(ctx,q,"feed",{source:a.id||"r:"+a.cell+":"+a.kind,sourceType:a.kind?"resource":"carcass",sourceSpecies:a.species||null,
          tag:S.FOOD[a.kind]?.tag||"animal",amount:n,assimilated,to:a.cell,species:"hyperparasite"});
      }
      // Free Q is an ordinary consumer after emergence. Live producer tissue
      // is its reliable basal ration; the protected base and finite mineral
      // stock remain with the world rather than being copied into Q.
      if(cohorts(w)&&appetite>0){
        const plant=m.producer?.get(q.cell)||m.food.get(q.cell);
        if(plant&&S.spec(plant).group==="plant"&&plant.HP>0){
          const bite=S.round(Math.min(appetite,S.edibleB(plant),(z.capE-q.E)/z.adultAssimilation));
          if(bite>0){
            const mineral=S.round(plant.M*bite/plant.B),assimilated=S.round(bite*z.adultAssimilation);
            plant.B=S.round(plant.B-bite);plant.M=S.round(plant.M-mineral);S.addSoil(w,plant.cell,mineral);
            if(S.Colony.is(plant))S.Colony.consumed(w,plant,bite);
            if(S.LargePlant.is(plant))S.LargePlant.consumed(w,plant,bite);
            q.E=S.round(q.E+assimilated);S.dissipate(w,bite-assimilated);
            last.feedingE=S.round(last.feedingE+assimilated);hyperFlow(w,ctx,"fedE",assimilated);
            S.record(ctx,q,"feed",{source:plant.id,sourceType:"plant",sourceSpecies:plant.species,tag:"plant",amount:bite,assimilated,to:q.cell,species:"hyperparasite"});
          }
        }
      }
      }
      const cells=S.nearby(w,q.cell,3,true),candidates=[];
      for(const cell of cells)for(const host of (cellMode(w)?primaryOccupants(w,m,cell):[...S.mainAt(m,cell),...(cohorts(w)?[m.prey?.get(cell),m.food.get(cell)]:[])]))if(host?.HP>0&&cellLivingHost(w,ctx,host)&&S.sight(w,q.cell,host.cell))candidates.push(host);
      // A cohort adult can follow a weak parasite-bearing chemical cue, but
      // still cannot sense the hidden maturation clock or infection window.
      const preference=host=>host.infection&&(cohorts(w)||host.infection.location==="external")?
        (cohorts(w)?1:["survival/3","survival/4"].includes(w.config.balanceModel)?1:0)+
        (q.hyper.preference?.[host.infection.species]??.5)*informationHostFactor(w,q,host.infection.species):.5;
      const local=candidates.filter(host=>cohorts(w)?S.distance(w,q.cell,host.cell)<=3:S.oneStep(w,q.cell,host.cell))
        .sort((a,b)=>preference(b)-preference(a)||S.hash(w,"hyper/contact-choice",w.turn,q.id,a.id)-S.hash(w,"hyper/contact-choice",w.turn,q.id,b.id));
      if(q.ready<=w.turn&&q.age>=(q.maturity??z.maturity)&&local.length){
        for(const host of local.slice(0,fanout(w)?2:1)){
          const result=hyperExpose(w,ctx,q,host);
          if(result.invaded||result.reason==="invasion")break;
        }
      }
      const predator=host=>S.spec(host).group==="main"&&host.species!=="ryouki"&&
        (survivalEnabled(w)?(S.D.diets[S.spec(host).diet]?.hunt||0)>=0:!["plant"].includes(S.spec(host).diet));
      const threat=cell=>candidates.reduce((n,host)=>n+(predator(host)&&S.distance(w,cell,host.cell)<=1?1:0),0);
      const cue=candidates.slice().sort((a,b)=>preference(b)-preference(a)||S.distance(w,q.cell,a.cell)-S.distance(w,q.cell,b.cell)||S.compare(a.id,b.id))[0];
      const moves=[q.cell,...S.nearby(w,q.cell).filter(cell=>S.oneStep(w,q.cell,cell))];
      const places=informationEnabled(w)?new Map(moves.map(cell=>[cell,informationPlace(w,ctx,q,cell)])):null,
        learned=informationEnabled(w)&&S.PersistentInformation.settings(w).influence!==0?S.PersistentInformation.preference(w,q,1)/200:0;
      if(survivalEnabled(w)){
        // Search only the already-sensed local area. Exact P maturity/genes are
        // still unavailable; the real contact window remains in hyperExpose.
        const forage=[];
        for(const cell of cells){
          if(!S.sight(w,q.cell,cell))continue;
          let amount=0;
          for(const a of resourceMap.get(cell)||[])if(["plant","fungal","animal"].includes(S.FOOD[a.kind]?.tag)&&(!cellMode(w)||cellCarrierReady(w,a)&&!(a.expires!==null&&a.expires<=w.turn)))amount+=Math.max(0,a.E);
          for(const a of carcassMap.get(cell)||[])if(!cellMode(w)||cellCarrierReady(w,a))amount+=Math.max(0,a.E);
          if(cohorts(w)){
            const plants=cellMode(w)?primaryOccupants(w,m,cell):[m.producer?.get(cell)||m.food.get(cell)];
            for(const plant of plants)if(plant&&S.spec(plant).group==="plant"&&(!cellMode(w)||cellLivingHost(w,ctx,plant)))amount+=Math.max(0,S.edibleB(plant)-(cellMode(w)&&plant.cellMatter?.tissueAt===w.turn?plant.cellMatter.newEdibleB??plant.cellMatter.newB??0:0));
            if(cellMode(w))for(const a of organicMap.get(cell)||[])if(!S.SoilMatter.enabled(w)||S.SoilMatter.available(w,a)&&S.SoilMatter.edible(q,a))amount+=Math.max(0,a.E)*(a.depositedAt===undefined?.5:1);
          }
          if(amount>0)forage.push({cell,amount});
        }
        const hunger=S.clamp(1-q.E/Math.max(z.eggCost+4*z.maintenance[4],1e-6),0,1),
          v2=["survival/2","survival/3","survival/4"].includes(w.config.balanceModel),
          // A finite food stock is not another reward after the adult has
          // reserved one laying attempt and the existing four-turn upkeep.
          needed=Math.max(0,Math.min(z.capE,z.eggCost+4*z.maintenance[4])-q.E),
          readyToLay=q.E>=z.eggCost&&q.ready<=w.turn?1:.15,
          // With no visible cue, or after an unproductive body contact, keep
          // a small paid exploration option. Food and danger still compete;
          // depleted adults retain stop and never borrow future upkeep.
          exploring=["survival/3","survival/4"].includes(w.config.balanceModel)&&(!cue||(cue.infection?.location!=="external"&&S.distance(w,q.cell,cue.cell)===0))&&q.hyper.starvationRun===0&&q.E>=2*z.maintenance[4]+z.adultMoveCost,
          score=cell=>{
            const nutrition=forage.reduce((n,a)=>Math.max(n,(v2?
                Math.min(needed,Math.min(z.adultFoodCap,a.amount)*z.adultAssimilation)/Math.max(z.adultFoodCap*z.adultAssimilation,1e-6):
                Math.min(1,a.amount/Math.max(z.adultFoodCap,1e-6)))/(1+S.distance(w,cell,a.cell))),0),
              approach=cue&&!exploring?(3-S.distance(w,cell,cue.cell))/3:0,
              movement=cell===q.cell?0:z.adultMoveCost/Math.max(q.E,z.maintenance[4],1e-6);
            return nutrition*(v2?2:.5+1.5*hunger)+approach*.45*readyToLay-
              threat(cell)*(.65+learned)+(places?.get(cell).value||0)*.1-movement*.1+(exploring&&cell!==q.cell?.02:0);
          },scores=new Map(moves.map(cell=>[cell,score(cell)]));
        moves.sort((a,b)=>scores.get(b)-scores.get(a)||S.hash(w,"hyper/adult-move",w.turn,q.id,a)-S.hash(w,"hyper/adult-move",w.turn,q.id,b));
      }else moves.sort((a,b)=>{
          const information=(places?.get(b).value||0)-(places?.get(a).value||0),danger=threat(a)-threat(b);
          return danger*(1+learned)+information*.1||(cue?S.distance(w,a,cue.cell)-S.distance(w,b,cue.cell):0)||S.hash(w,"hyper/adult-move",w.turn,q.id,a)-S.hash(w,"hyper/adult-move",w.turn,q.id,b);
        });
      const destination=q.hyper.splitTurn===w.turn&&moves.length>1?moves[1]:moves[0];
      if(destination!==q.cell&&q.E>=z.adultMoveCost){const from=q.cell;q.cell=destination;last.movementE=hyperSpend(w,q,z.adultMoveCost);hyperFlow(w,ctx,"moved");hyperFlow(w,ctx,"movementE",last.movementE);S.record(ctx,q,"move",{from,to:q.cell,species:"hyperparasite"});if(places)informationUsed(w,ctx,q,q.cell,places.get(q.cell));}
      if(cellMode(w)){
        // The shared cell allocation runs after this paid search/move, before
        // lower life creates any new tissue. This is not a second organism or
        // an extra occupant of a plant/main settlement slot.
        (ctx.cellQActors??=new Map()).set(q.id,q);
        ctx.old.set(q.id,{phase:4,species:q.species,E:q.E,cell:q.cell});
        ctx.traits.set(q.id,{phase:4,capE:z.capE,capM:0});
        ctx.records.set(q.id,{organic:0,reserve:0,heal:0,G:0,bites:0,dealt:0,mitigated:0,damage:0,moved:last.movementE>0,newPlace:false,light:0,information:[],emitted:false,contacted:false,cared:false,relieved:false,category:null,delta:null});
      }
    }
  }
  const primaryStage=stage=>stage==="extra"?"terminal":stage;
  function emptyPrimaryFlow(w) {
    return {definition:"primary-parasite-flow/1",turn:w.turn,...(eggsEnabled(w)?{eggs:{definition:'primary-egg-flow/1',laid:0,moved:0,attached:0,hatched:0,expired:0,lostHost:0,failed:0}}:{}),bySpecies:Object.fromEntries(["leafparasite","tideparasite"].map(species=>[species,
      Object.fromEntries(["contact","feeding","carcass","water"].map(route=>[route,{exposureE:0,exposures:0,invasionAttempts:0,invaded:0,established:0,cleared:0,transferred:0,releasedE:0}]))]))};
  }
  function primaryHolders(w) {
    const seen=new Set();
    return [...w.organisms,...w.carcasses,...w.pending].filter(holder=>{
      const p=holder.infection;
      if(!S.PrimaryParasite.is(p)||seen.has(p.id))return false;
      seen.add(p.id);return true;
    });
  }
  function primaryContext(w,ctx) {
    if(!ctx.primaryState)ctx.primaryState={begun:false,donors:new Map(primaryHolders(w).map(host=>{
      const p=host.infection;return [p.id,{p,stage:p.stage,counter:p.counter,hostId:host.id}];
    }))};
    if(!ctx.primaryFlow)ctx.primaryFlow=emptyPrimaryFlow(w);
    return ctx.primaryState;
  }
  function primaryFlow(w,ctx,species,route,key,value=1) {
    primaryContext(w,ctx);
    const bySpecies=ctx.primaryFlow.bySpecies,byRoute=bySpecies[species]??={};
    const row=byRoute[route]??={exposureE:0,exposures:0,invasionAttempts:0,invaded:0,established:0,cleared:0,transferred:0,releasedE:0};
    row[key]=S.round(row[key]+value);
  }
  function primaryEvent(ctx,host,type,extra={}) {
    if(host)S.record(ctx,host,"primary-"+type,extra);
  }
  function primaryResult(w,p,route,outcome,reason=null) {
    Object.assign(p.primary.last,{route,outcome,outcomeAt:w.turn,reason});
  }
  function primaryEntry(ctx,host,p) {
    let entry=ctx.byParasite.get(p.id);
    if(!entry){entry={p,q:p.q,stage:p.stage,counter:p.counter,qPhase:p.q?.phase||0,qCounts:p.q?.counts?.slice()||[0,0,0],full:false,qFull:false};ctx.byParasite.set(p.id,entry);}
    ctx.startInfections.set(host.id,entry);return entry;
  }
  function primaryCost(w,p,host,route=p.primary.route||"contact",stage=p.stage) {
    const a=S.PrimaryParasite.adaptation(p,host.species,route,primaryStage(stage));
    return S.clamp(1-.5*(a-.5),.75,1.25);
  }
  function primarySpend(w,p,cost) {
    cost=S.round(cost);const paid=Math.min(p.E,cost);
    p.E=S.round(p.E-paid);S.dissipate(w,paid);return paid;
  }
  function exclude(w,ctx,host,reason="immunity") {
    if(!primaryEnabled(w))return false;
    const p=host.infection;if(!S.PrimaryParasite.is(p))return false;
    const route=p.primary.route||"contact";
    if(["immunity","groom"].includes(reason)){
      S.PrimaryParasite.acquireResistance(w,host,p.species,route);
      primaryFlow(w,ctx,p.species,route,"cleared");
    }
    if(hyperEnabled(w))hyperDetachTraces(w,host,p,p.q);
    host.infection=null;S.loseInfection(w,p);primaryResult(w,p,route,"clear",reason);
    primaryEvent(ctx,host,"clear",{parasite:p.id,species:p.species,route,reason});return true;
  }
  function primaryBridgeQ(w,q,cell,parent=null) {
    if(parent){
      const cap=[0,.02,.03,.04][Math.min(3,q.phase)]||.04,n=Math.min(cap,parent.E,1-q.E);
      parent.E=S.round(parent.E-n);q.E=S.round(q.E+n);
    }else{
      // I05 bridge only: real local organic reserve, never information energy.
      const food=w.resources.find(a=>a.cell===cell&&a.E>0&&["plant","fungal","animal"].includes(S.FOOD[a.kind]?.tag))||
        w.carcasses.find(a=>a.cell===cell&&a.E>0);
      if(food){const n=Math.min(.03,food.E,2*(1-q.E));food.E=S.round(food.E-n);q.E=S.round(q.E+.5*n);S.dissipate(w,.5*n);}
    }
    const paid=Math.min(q.E,w.config.advantageSettings?.hyperparasite ? .0001 : .001);
    q.E=S.round(q.E-paid);S.dissipate(w,paid);
  }
  function diffuse(w,ctx) {
    if(!primaryEnabled(w))return;
    const state=primaryContext(w,ctx);if(state.diffusedAt===w.turn)return;state.diffusedAt=w.turn;
    const additions=[],standard=S.PrimaryParasite.settings(w).standardReserve;
    for(const i of (w.primaryInocula||[]).slice().sort((a,b)=>S.compare(a.id,b.id))){
      if(i.egg||i.kind!=="water"||i.createdAt>=w.turn||i.expires<=w.turn||i.E<=0||!["shallow","deep"].includes(w.tiles[i.cell].terrain))continue;
      const cells=S.nearby(w,i.cell).filter(cell=>["shallow","deep"].includes(w.tiles[cell].terrain)&&S.oneStep(w,i.cell,cell)).sort((a,b)=>a-b);
      if(!cells.length)continue;
      const budget=S.round(i.E*.2);let moved=0;
      for(let n=0;n<cells.length;n++){
        const amount=Math.min(S.round(budget-moved),n===cells.length-1?S.round(budget-moved):S.round(budget/cells.length));
        if(amount<=0)continue;moved=S.round(moved+amount);
        additions.push({...i,id:i.id+":water:"+w.turn+":"+cells[n],cell:cells[n],E:amount,amount:S.round(amount/standard)});
      }
      S.PrimaryParasite.takeInoculum(w,i,moved);
    }
    // Merge only identical origins, traits and clocks; expiry is never refreshed.
    const merged=new Map();
    for(const i of [...(w.primaryInocula||[]),...additions]){
      if(i.E<=0)continue;
      const key=i.kind==="water"&&!i.egg?JSON.stringify([i.cell,i.species,i.sourceId,i.parentId,i.createdAt,i.expires,i.stage,i.sourceStage,i.adaptation,i.hostPreference,i.passages,i.transfer]):i.id;
      const old=merged.get(key);
      if(old){old.E=S.round(old.E+i.E);old.amount=S.round(old.E/standard);}else merged.set(key,i);
    }
    w.primaryInocula=[...merged.values()];
  }
  function expose(w,ctx,i,target,route=i.route,fraction=1) {
    if(!primaryEnabled(w)||!i||i.egg&&i.egg.state!=="hatched"||i.E<=0||fraction<=0||i.createdAt>=w.turn||i.expires<=w.turn)return {exposed:0,compatible:false,invaded:false,reason:"zero"};
    // A released migrant represents one member, never two infections created
    // by splitting a partially consumed dose across different hosts.
    if(cohorts(w)&&i.transfer&&i.claimedTarget&&i.claimedTarget!==target.id)return {exposed:0,compatible:false,invaded:false,reason:"claimed"};
    if(cohorts(w)&&i.transfer)i.claimedTarget=target.id;
    const settings=S.PrimaryParasite.settings(w),sourceStage=i.sourceStage||i.stage,
      origin=JSON.stringify([i.species,i.parentId,i.sourceId,i.createdAt,i.expires,i.adaptation,i.hostPreference,route,sourceStage]),
      previous=(w.primaryInocula||[]).find(a=>a.kind==="invading"&&a.hostId===target.id&&a.origin===origin&&a.E>0),
      amount=S.PrimaryParasite.takeInoculum(w,i,Math.min(settings.standardReserve-(previous?.E||0),i.E*S.clamp(fraction,0,1))),
      rule=primaryRule(w,i.species,target,route,sourceStage);
    if(amount<=0)return {exposed:0,compatible:false,invaded:false,reason:"zero"};
    primaryFlow(w,ctx,i.species,route,"exposureE",amount);primaryFlow(w,ctx,i.species,route,"exposures");
    const occupied=target.infection||(w.primaryInocula||[]).some(a=>a!==previous&&a.kind==="invading"&&a.hostId===target.id&&a.E>0)||
      w.pending.some(a=>a.kind==="primary-migration"&&a.hostId===target.id&&a.infection);
    const fail=reason=>{S.dissipate(w,amount);primaryEvent(ctx,target,"exposure",{species:i.species,route,amount,reason});return {exposed:amount,compatible:rule.allowed,invaded:false,reason};};
    if(!rule.allowed)return fail(rule.reason||"incompatible");
    if(target.HP<=0||occupied)return fail(occupied?"occupied":"dead");
    const entering=previous||{...i,adaptation:structuredClone(i.adaptation),hostPreference:structuredClone(i.hostPreference),id:i.id+":invading:"+target.id+":"+w.turn,kind:"invading",sourceKind:i.kind,origin,cell:target.cell,hostId:target.id,
      sourceStage,stage:rule.stage,route,E:0,amount:0,status:"exposed",receivedAt:w.turn,establishAt:null};
    entering.E=S.round(entering.E+amount);entering.amount=S.round(entering.E/settings.standardReserve);
    if(entering.egg)delete entering.egg;
    if(!previous)w.primaryInocula.push(entering);
    if(entering.status==="invaded")return {exposed:amount,compatible:true,invaded:true,reason:null,id:entering.id};
    if(entering.E<settings.minimumReserve){primaryEvent(ctx,target,"exposure",{species:i.species,route,amount,reason:"accumulating"});return {exposed:amount,compatible:true,invaded:false,reason:"accumulating",id:entering.id};}
    primaryFlow(w,ctx,i.species,route,"invasionAttempts");
    const resistance=S.PrimaryParasite.resistance(w,target,i.species,route),defense=.4*(target.dna?.skin??.5),
      chance=S.clamp(settings.entryRates[route]*Math.min(1,entering.E/settings.standardReserve)*(1-defense)*(1-.5*resistance)*(cohorts(w)?Math.pow(.8,entering.passages??0):1),0,1);
    if(S.r(w,"primary/invasion",w.turn,i.id,target.id)>=chance){
      S.dissipate(w,entering.E);entering.E=0;entering.amount=0;w.primaryInocula=w.primaryInocula.filter(a=>a.E>0);
      primaryEvent(ctx,target,"exposure",{species:i.species,route,amount,reason:"invasion"});return {exposed:amount,compatible:true,invaded:false,reason:"invasion"};
    }
    entering.status="invaded";entering.invadedAt=w.turn;entering.establishAt=w.turn+1;
    primaryFlow(w,ctx,i.species,route,"invaded");
    primaryEvent(ctx,target,"invasion",{species:i.species,route,amount:entering.E,inoculum:entering.id,establishAt:entering.establishAt});
    return {exposed:amount,compatible:true,invaded:true,reason:null,id:entering.id};
  }
  function primaryEstablish(w,ctx) {
    const settings=S.PrimaryParasite.settings(w),byId=S.maps(w).byId;
    const due=[...(w.primaryInocula||[]).filter(i=>i.kind==="invading"&&i.status!=="exposed"&&Number.isSafeInteger(i.establishAt)&&i.establishAt<=w.turn),
      ...w.pending.filter(i=>i.kind==="primary-migration"&&i.establishAt<=w.turn)].sort((a,b)=>
      S.hash(w,"primary/establishment-vote",w.turn,a.id,a.hostId)-S.hash(w,"primary/establishment-vote",w.turn,b.id,b.hostId)||S.compare(a.id,b.id));
    for(const i of due){
      const migrating=i.kind==="primary-migration",previous=migrating?i.infection:null,species=previous?.species||i.species,
        host=byId.get(i.hostId),rule=host&&primaryRule(w,species,host,i.route,i.sourceStage),
        resistance=host?S.PrimaryParasite.resistance(w,host,species,i.route):0,
        a=host?S.PrimaryParasite.adaptation(previous||i,host.species,i.route,primaryStage(rule?.stage)):0.5,
        chance=S.clamp(settings.establishmentRate*(1-resistance)*(1+.5*(a-.5)),0,1);
      const timely=migrating||i.invadedAt===undefined||(i.invadedAt<i.expires&&i.establishAt===i.invadedAt+1&&w.turn===i.establishAt);
      if(timely&&host&&host.HP>0&&!host.infection&&rule.allowed&&(migrating||i.E>=settings.minimumReserve)&&
          S.r(w,"primary/establishment",w.turn,i.id,host.id)<chance){
        const p=previous||S.PrimaryParasite.infection(w,species,host.id,w.turn,i.id,i),reserve=migrating?0:Math.min(i.E,settings.standardReserve);
        if(p.stage!==rule.stage||!migrating){p.stage=rule.stage;p.counter=0;}
        if(!migrating){p.B=settings.biomass[1];p.E=S.round(reserve-p.B);
          if(cohorts(w)&&i.transfer){p.primary.adaptation=structuredClone(i.adaptation);p.primary.hostPreference=structuredClone(i.hostPreference);p.primary.generation=i.generation;p.primary.parents=structuredClone(i.parents??[]);p.primary.form=i.form;p.primary.mutation={occurred:false,changes:[]};p.primary.origin="host-transfer";}
          else ctx.births.push(p.species);
        }
        if(cohorts(w))p.primary.cohort.passages=i.passages??(S.ParasiteCohort.passage(p)+1);
        p.hostId=host.id;
        p.primary.route=i.route;p.primary.carrier=rule.stage==="extra";p.primary.carrierUntil=p.primary.carrier?w.turn+settings.carrierTurns:null;
        host.infection=p;primaryEntry(ctx,host,p);ctx.transfers++;
        if(migrating){ctx.movedInfections.add(p.id);primaryFlow(w,ctx,p.species,i.route,"transferred");}
        else primaryFlow(w,ctx,p.species,i.route,"established");
        const outcome=migrating?"transferred":"established";
        primaryResult(w,p,i.route,outcome);primaryEvent(ctx,host,outcome,{parasite:p.id,species:p.species,route:i.route,stage:p.stage,amount:reserve,source:i.sourceId});
        if(!migrating&&i.E>reserve)S.dissipate(w,i.E-reserve);
      }else{
        if(migrating){
          const source=cohorts(w)&&i.route==="contact"?byId.get(i.sourceId):null;
          if(source&&source.HP>0&&!source.infection){source.infection=previous;previous.hostId=source.id;previous.primary.pauseUntil=w.turn;}
          else S.loseInfection(w,previous);
        }else S.dissipate(w,i.E);
        ctx.infectionFailures++;primaryEvent(ctx,host,"establishment-failed",{parasite:previous?.id,species,route:i.route,amount:migrating?0:i.E,reason:!host?"missing-host":host.infection?"occupied":!migrating&&i.E<settings.minimumReserve?"small-dose":"establishment"});
      }
      if(migrating)i.infection=null;else{i.E=0;i.amount=0;}
    }
    w.primaryInocula=w.primaryInocula.filter(i=>i.E>0);
    w.pending=w.pending.filter(i=>i.kind!=="primary-migration"||i.infection);
  }
  function eggFlow(w,ctx,key){
    primaryContext(w,ctx);ctx.primaryFlow.eggs[key]++;
  }
  function eggBegin(w,ctx){
    if(!eggsEnabled(w))return;
    const z=w.config.primaryEggSettings,byId=S.maps(w).byId;
    for(const i of w.primaryInocula.slice().sort((a,b)=>S.compare(a.id,b.id))){
      if(!i.egg||i.E<=0||i.createdAt>=w.turn)continue;
      if(i.egg.state==='attached'){
        const host=byId.get(i.hostId);
        if(!host||host.HP<=0){S.dissipate(w,i.E);i.E=0;i.amount=0;eggFlow(w,ctx,'lostHost');continue;}
        i.cell=host.cell;
        if(w.turn<i.egg.hatchAt)continue;
        i.egg.state='hatched';eggFlow(w,ctx,'hatched');
        const outcome=expose(w,ctx,i,host,i.route);
        if(!outcome.invaded)eggFlow(w,ctx,'failed');
        primaryEvent(ctx,host,'egg-hatched',{species:i.species,egg:i.id,invaded:outcome.invaded});
      }else if(i.species==='tideparasite'&&['shallow','deep'].includes(w.tiles[i.cell].terrain)&&S.r(w,'primary/egg-move',w.turn,i.id)<z.waterMoveChance){
        const cells=S.nearby(w,i.cell).filter(cell=>['shallow','deep'].includes(w.tiles[cell].terrain)&&S.oneStep(w,i.cell,cell));
        if(z.waterStepRange===2){
          const visited=new Set([i.cell,...cells]),first=cells.slice();
          for(const from of first)for(const cell of S.nearby(w,from)){
            if(visited.has(cell)||!['shallow','deep'].includes(w.tiles[cell].terrain)||!S.oneStep(w,from,cell))continue;
            visited.add(cell);cells.push(cell);
          }
        }
        if(cells.length){i.cell=cells[Math.floor(S.r(w,'primary/egg-cell',w.turn,i.id)*cells.length)];eggFlow(w,ctx,'moved');}
      }
    }
    w.primaryInocula=w.primaryInocula.filter(i=>i.E>0);
  }
  function eggContacts(w,ctx,m){
    if(!eggsEnabled(w))return;
    const occupied=new Set(w.primaryInocula.filter(i=>i.E>0&&(i.egg?.state==='attached'||i.kind==='invading')).map(i=>i.hostId));
    for(const i of w.primaryInocula.slice().sort((a,b)=>S.compare(a.id,b.id))){
      if(i.egg?.state!=='free'||i.E<=0||i.createdAt>=w.turn||i.expires<=w.turn)continue;
      const targets=new Map();
      for(const cell of S.nearby(w,i.cell,1,true)){
        if(!S.sight(w,i.cell,cell))continue;
        for(const host of (cellMode(w)?primaryOccupants(w,m,cell):[m.food.get(cell),m.producer?.get(cell)]))if(host&&host.HP>0&&cellLivingHost(w,ctx,host)&&!host.infection&&!occupied.has(host.id)&&S.PrimaryParasite.hostRule(i.species,host,i.route,'terminal').role==='first')targets.set(host.id,host);
      }
      const host=[...targets.values()].sort((a,b)=>S.hash(w,'primary/egg-attachment',w.turn,i.id,a.id)-S.hash(w,'primary/egg-attachment',w.turn,i.id,b.id)||S.compare(a.id,b.id))[0];
      if(!host)continue;
      i.hostId=host.id;i.cell=host.cell;i.egg.state='attached';i.egg.attachedAt=w.turn;i.egg.hatchAt=w.turn+w.config.primaryEggSettings.hatchTurns;
      occupied.add(host.id);eggFlow(w,ctx,'attached');primaryEvent(ctx,host,'egg-attached',{species:i.species,egg:i.id,hatchAt:i.egg.hatchAt});
    }
  }
  function begin(w,ctx) {
    if(!primaryEnabled(w))return;
    const state=primaryContext(w,ctx);if(state.begun)return;state.begun=true;
    const settings=S.PrimaryParasite.settings(w);
    for(const host of w.organisms)S.PrimaryParasite.beginResistance(w,host);
    // An invasion completed before external expiry gets its one next-turn
    // establishment check; an exposed dose keeps the original external clock.
    primaryEstablish(w,ctx);
    w.primaryInocula=(w.primaryInocula||[]).filter(i=>{if(i.expires>w.turn&&i.E>0)return true;if(i.egg&&i.E>0)eggFlow(w,ctx,'expired');S.dissipate(w,i.E);return false;});
    eggBegin(w,ctx);
    diffuse(w,ctx);
    for(const host of primaryHolders(w)){
      const p=host.infection,entry=primaryEntry(ctx,host,p),alive=w.organisms.includes(host);
      p.age=Math.max(p.age||0,w.turn-p.bornAt);
      p.primary.last={...p.primary.last,turn:w.turn,maintained:false,developed:false,progress:0,...(informationEnabled(w)?{appliedProgress:0}:{}),induction:0,taxE:0,maintenanceE:0,developmentE:0,metaE:0,blockers:[]};
      if(p.age>=p.birthLife){exclude(w,ctx,host,"age");continue;}
      if(alive&&p.stage==="extra"){
        if(S.ageInfo(host).stage!=="juvenile"){p.stage="terminal";p.counter=0;p.primary.carrier=false;}
        else if(w.turn>=p.primary.carrierUntil){exclude(w,ctx,host,"carrier-expired");continue;}
      }
      const phase=Math.min(3,p.phase),factor=primaryCost(w,p,host)*(cohorts(w)?S.ParasiteCohort.burden(p):1),last=p.primary.last;
      if(alive){const paid=Math.min(host.E/S.ConsumerGroup.count(host),settings.hostTax[phase]*(cohorts(w)?S.ParasiteCohort.burden(p):1),settings.capE-p.E);host.E=S.round(host.E-paid);p.E=S.round(p.E+paid);last.taxE=paid;}
      const maintenance=S.round(settings.maintenance[phase]*factor),paid=primarySpend(w,p,maintenance);
      last.maintenanceE=paid;last.maintained=paid+1e-8>=maintenance;entry.full=last.maintained;
      if(!last.maintained)last.blockers.push("maintenance");
      p.primary.starvationRun=last.maintained?0:p.primary.starvationRun+1;
      if(p.primary.starvationRun>=settings.starvationTurns){exclude(w,ctx,host,"maintenance");continue;}
      const canDevelop=alive&&p.stage!=="extra"&&w.turn>p.primary.pauseUntil&&p.counter<settings.development[p.stage];
      if(canDevelop&&last.maintained){
        const cost=S.round(settings.developmentCost*factor),paid=primarySpend(w,p,cost);last.developmentE=paid;
        last.developed=paid+1e-8>=cost;
        if(!last.developed)last.blockers.push("development");
        if(last.developed)last.progress=S.round(1-.5*S.PrimaryParasite.resistance(w,host,p.species,p.primary.route||"contact"));
      }
      if(p.q&&!hyperEnabled(w)){primaryBridgeQ(w,p.q,host.cell,p);entry.qFull=p.q.E>=.01;}
      if(alive&&p.stage!=="extra"&&last.maintained&&(!canDevelop||last.developed)&&w.turn>p.primary.pauseUntil){
        const cost=settings.metaCosts[phase],factor=primaryCost(w,p,host),
          releaseRoute=p.stage==="first"?"feeding":p.species==="tideparasite"&&["shallow","deep"].includes(w.tiles[host.cell].terrain)?"water":"contact",
          releaseAllocation=survivalEnabled(w)?informationAllocation(w,p,3):1,
          releaseCost=survivalEnabled(w)?Math.max(settings.emissionReserve*releaseAllocation,settings.emissionCost*primaryCost(w,p,host,releaseRoute)*releaseAllocation):0,
          reserve=survivalEnabled(w)?S.round(settings.maintenance[phase]*factor+(canDevelop?settings.developmentCost*factor:0)+
            (["first","terminal"].includes(p.stage)&&p.counter>=settings.development[p.stage]?releaseCost:0)+
            (hyperEnabled(w)&&S.HyperParasite.is(p.q)?S.HyperParasite.settings(w).hostTax[p.q.phase]+S.HyperParasite.settings(w).exclusionCost:0)):0,
          wanted=S.round(cost*informationAllocation(w,p,2)),paid=primarySpend(w,p,survivalEnabled(w)?Math.min(wanted,Math.max(0,p.E-reserve)):wanted);
        last.metaE=paid;last.induction=cost>0?S.round(settings.metaCaps[phase]*Math.min(1,paid/cost)):0;
      }
    }
    if(hyperEnabled(w))hyperBegin(w,ctx);
  }
  function produce(w,ctx,host,kind=null) {
    if(!primaryEnabled(w))return null;
    const state=primaryContext(w,ctx),p=host.infection,settings=S.PrimaryParasite.settings(w);
    const donor=p&&state.donors.get(p.id);
    if(!S.PrimaryParasite.is(p)||!donor||donor.counter<(settings.development[donor.stage]??Infinity)||p.primary.settledAt>=w.turn||w.turn<=p.primary.pauseUntil||p.ready>w.turn||
        p.stage==="extra"||p.counter<settings.development[p.stage]||!["first","terminal"].includes(p.stage))return null;
    const water=p.species==="tideparasite"&&["shallow","deep"].includes(w.tiles[host.cell].terrain);
    kind??=p.stage==="first"?"edible":water?"water":"contact";
    if(kind==="water"&&!water)return null;
    if(kind==="edible"&&p.stage!=="first")return null;
    const route=kind==="edible"?"feeding":kind==="carcass"?"carcass":kind,allocation=informationAllocation(w,p,3),reserve=S.round(settings.emissionReserve*allocation),
      cost=S.round(Math.max(reserve,settings.emissionCost*primaryCost(w,p,host,route)*allocation));
    if(p.E+1e-8<cost||(cohorts(w)&&p.stage==="first"&&p.primary.cohort.members<=1))return null;
    p.E=S.round(p.E-cost);S.dissipate(w,cost-reserve);p.ready=w.turn+settings.emissionCooldown;
    const egg=eggsEnabled(w)&&p.stage==='terminal'&&['contact','water'].includes(kind);
    const create=(index,energy)=>{
      const item=S.PrimaryParasite.inoculum(w,p,{id:"inoculum:"+p.id+":"+w.turn+(fanout(w)?":"+index:""),kind,cell:host.cell,hostId:kind==="edible"?host.id:null,E:energy,createdAt:w.turn,expires:w.turn+(egg?(p.species==='tideparasite'?w.config.primaryEggSettings.waterLifetime:w.config.primaryEggSettings.landLifetime):settings.inoculumLifetime[kind]),route,stage:p.stage,
        ...(egg?{egg:{version:'primary-egg/1',state:'free',attachedAt:null,hatchAt:null}}:{}),
        ...(cohorts(w)?{transfer:p.stage==="first",passages:p.stage==="first"?S.ParasiteCohort.passage(p)+1:0}:{})});
      w.primaryInocula.push(item);primaryFlow(w,ctx,p.species,route,"releasedE",item.E);if(egg)eggFlow(w,ctx,'laid');
      primaryResult(w,p,route,"release");
      primaryEvent(ctx,host,"release",{parasite:p.id,species:p.species,route,amount:item.E,inoculum:item.id});return item;
    };
    if(cohorts(w)&&p.stage==="first")p.primary.cohort.members--;
    const first=create(0,reserve);
    if(fanout(w)&&p.stage==="terminal"&&p.E+1e-8>=cost){
      p.E=S.round(p.E-cost);S.dissipate(w,cost-reserve);create(1,reserve);
    }
    return first;
  }
  function primaryContacts(w,ctx) {
    if(cellMode(w)){if(ctx.cellPrimaryContactsAt===w.turn)return;ctx.cellPrimaryContactsAt=w.turn;}
    const m=S.maps(w);
    eggContacts(w,ctx,m);
    for(const i of (w.primaryInocula||[]).slice().sort((a,b)=>S.compare(a.id,b.id))){
      if(i.egg||!["contact","water"].includes(i.kind)||i.createdAt>=w.turn||i.expires<=w.turn||i.E<=0)continue;
      const cells=i.kind==="water"?(fanout(w)?S.nearby(w,i.cell,1,true).filter(cell=>["shallow","deep"].includes(w.tiles[cell].terrain)): [i.cell]):
        S.nearby(w,i.cell,fanout(w)&&i.stage==="terminal"?2:1,true),seen=new Set(),targets=[];
      for(const cell of cells)for(const target of primaryOccupants(w,m,cell)){
        if(!target||seen.has(target.id)||target.HP<=0||!cellLivingHost(w,ctx,target)||target.infection||!S.sight(w,i.cell,target.cell))continue;seen.add(target.id);
        if(primaryRule(w,i.species,target,i.kind,i.sourceStage||i.stage).allowed)targets.push(target);
      }
      targets.sort((a,b)=>S.hash(w,"primary/exposure-vote",w.turn,i.id,a.id)-S.hash(w,"primary/exposure-vote",w.turn,i.id,b.id)||S.compare(a.id,b.id));
      for(const target of targets){if(i.E<=0)break;expose(w,ctx,i,target,i.kind);}
    }
    w.primaryInocula=w.primaryInocula.filter(i=>i.E>0);
    // Sparse paid contact migration allows a completed preterminal parasite
    // to reach the next living host without waiting for a predator to eat it.
    if(cohorts(w)){
      const settings=S.PrimaryParasite.settings(w),m=S.maps(w),motionContacts=cellMotionContacts(w,ctx,m);
      for(const host of primaryHolders(w).slice().sort((a,b)=>S.compare(a.id,b.id))){
        const p=host.infection,entry=ctx.byParasite.get(p?.id);
        if(!cellContactDonor(w,ctx,host,m)||!S.PrimaryParasite.is(p)||!entry||!["first","middle"].includes(p.stage)||entry.counter<settings.development[entry.stage]||
          p.counter<settings.development[p.stage]||p.ready>w.turn||w.turn<=p.primary.pauseUntil||ctx.movedInfections.has(p.id)||p.E<(fanout(w)?.015:.04))continue;
        const targets=[],seen=new Set(),addTarget=target=>{
          if(!target||target.id===host.id||target.HP<=0||!cellLivingHost(w,ctx,target)||target.infection||cellMode(w)&&seen.has(target.id)||
            w.pending.some(a=>a.kind==="primary-migration"&&a.hostId===target.id&&a.infection)||
            !primaryRule(w,p.species,target,"contact",p.stage).allowed)return;
          seen.add(target.id);targets.push(target);
        };
        for(const cell of S.nearby(w,host.cell,5,true)){
          if(cell!==host.cell&&(!S.sight(w,host.cell,cell)||(S.distance(w,host.cell,cell)<=1&&!S.oneStep(w,host.cell,cell))))continue;
          for(const target of primaryOccupants(w,m,cell))addTarget(target);
        }
        // Movement already established co-location and sight at this step.
        // Only the recorded pair supplements the ordinary five-cell search.
        for(const id of motionContacts.get(host.id)||[])addTarget(m.byId.get(id));
        if(!targets.length)continue;
        // Preserve the middle host when it is locally available; the costly
        // terminal shortcut prevents a sparse prey layer from ending P alone.
        const middle=p.stage==="first"?targets.filter(target=>primaryRule(w,p.species,target,"contact",p.stage).stage==="middle"):[];
        const choices=middle.length?middle:targets;
        choices.sort((a,b)=>(fanout(w)?Math.min(2,S.distance(w,host.cell,a.cell))-Math.min(2,S.distance(w,host.cell,b.cell)):0)||
          S.hash(w,"primary/cohort-contact-choice",w.turn,p.id,a.id)-S.hash(w,"primary/cohort-contact-choice",w.turn,p.id,b.id)||S.compare(a.id,b.id));
        const limit=fanout(w)&&p.stage==="first"&&S.ParasiteCohort.members(p)>1?2:1,moveCost=fanout(w)?.015:.04;
        let sent=false;
        for(const target of choices.slice(0,limit)){
          if(p.E<moveCost||sent&&S.ParasiteCohort.members(p)<=1)break;
          const rule=primaryRule(w,p.species,target,"contact",p.stage),resistance=S.PrimaryParasite.resistance(w,target,p.species,"contact"),
            shortcut=p.stage==="first"&&rule.stage==="terminal",passages=S.ParasiteCohort.passage(p)+(shortcut?2:1),
            chance=S.clamp((fanout(w)?.95:.72)*S.ParasiteCohort.chance(p)*(shortcut?(fanout(w)?.8:.55):1)*(1-.4*(target.dna?.skin??.5))*(1-.5*resistance),0,1);
          p.E=S.round(p.E-moveCost);S.dissipate(w,moveCost);p.ready=w.turn+(fanout(w)?4:6);primaryFlow(w,ctx,p.species,"contact","invasionAttempts");
          if(S.r(w,"primary/cohort-contact",w.turn,p.id,target.id)>=chance){primaryEvent(ctx,target,"migration-failed",{parasite:p.id,species:p.species,route:"contact"});continue;}
          if(p.stage==="first"&&S.ParasiteCohort.members(p)>1&&p.E>=settings.standardReserve){
            // One member per target; the last member remains with the parent.
            p.E=S.round(p.E-settings.standardReserve);p.primary.cohort.members--;sent=true;
            const i=S.PrimaryParasite.inoculum(w,p,{id:"inoculum:cohort-contact:"+p.id+":"+w.turn+(fanout(w)?":"+target.id:""),kind:"invading",cell:target.cell,hostId:target.id,E:settings.standardReserve,
              createdAt:w.turn,expires:w.turn+2,route:"contact",sourceStage:p.stage,stage:rule.stage,transfer:true,
              passages,status:"invaded",invadedAt:w.turn,establishAt:w.turn+1});
            w.primaryInocula.push(i);primaryFlow(w,ctx,p.species,"contact","invaded");
            primaryEvent(ctx,target,"invasion",{parasite:p.id,species:p.species,route:"contact",stage:rule.stage,inoculum:i.id,establishAt:i.establishAt});
            continue;
          }
          const pending={id:"primary-migration:"+p.id+":"+w.turn,kind:"primary-migration",infection:p,cell:target.cell,hostId:target.id,
            passages,sourceId:host.id,sourceStage:p.stage,stage:rule.stage,route:"contact",createdAt:w.turn,establishAt:w.turn+1,expires:w.turn+2};
          if(hyperEnabled(w))hyperDetachTraces(w,host,p,p.q,true);
          host.infection=null;p.hostId=pending.id;p.primary.pauseUntil=w.turn+1;p.primary.last.induction=0;
          w.pending.push(pending);ctx.movedInfections.add(p.id);primaryFlow(w,ctx,p.species,"contact","invaded");
          primaryEvent(ctx,target,"transferring",{parasite:p.id,species:p.species,route:"contact",stage:rule.stage,source:host.id,establishAt:pending.establishAt});
          break;
        }
      }
    }
  }
  function primaryTransfer(w,ctx,source,target,type,harvest) {
    if(cellMode(w)&&(type==="carcass"&&!cellCarrierReady(w,source)||!cellLivingHost(w,ctx,target)))return;
    const route=type==="carcass"?"carcass":"feeding",fraction=S.clamp(harvest?.fraction??((harvest?.consumedB||0)/(harvest?.beforeEdibleB||Infinity)),0,1);
    if(fraction<=0)return;
    for(const i of (w.primaryInocula||[]).slice().sort((a,b)=>S.compare(a.id,b.id)))if(i.hostId===source.id&&["edible","carcass"].includes(i.kind)&&i.createdAt<w.turn&&i.expires>w.turn&&i.E>0)expose(w,ctx,i,target,route,fraction);
    const p=source.infection,settings=S.PrimaryParasite.settings(w);
    if(!S.PrimaryParasite.is(p)||target.infection||ctx.movedInfections.has(p.id)||
       w.pending.some(a=>a.kind==="primary-migration"&&a.hostId===target.id&&a.infection)||
       w.primaryInocula.some(a=>a.kind==="invading"&&a.hostId===target.id&&a.E>0)||
       (p.stage!=="extra"&&p.counter<settings.development[p.stage])||
       (type!=="carcass"&&((S.Colony.is(source)||S.LargePlant.is(source))||(!ctx.harvestDead.has(source.id)&&source.HP>0))))return;
    const rule=S.PrimaryParasite.hostRule(p.species,target,route,p.stage);
    if(!rule.allowed)return;
    primaryFlow(w,ctx,p.species,route,"invasionAttempts");
    const resistance=S.PrimaryParasite.resistance(w,target,p.species,route),chance=S.clamp(settings.entryRates[route]*(1-.4*(target.dna?.skin??.5))*(1-.5*resistance)*(cohorts(w)?S.ParasiteCohort.chance(p):1),0,1);
    if(S.r(w,"primary/migration",w.turn,p.id,target.id)>=chance*(S.SoilMatter.enabled(w)&&source.soilRef?fraction:1)){primaryEvent(ctx,target,"migration-failed",{parasite:p.id,species:p.species,route});return;}
    const pending={id:"primary-migration:"+p.id+":"+w.turn,kind:"primary-migration",infection:p,cell:target.cell,hostId:target.id,
      ...(cohorts(w)?{passages:S.ParasiteCohort.passage(p)+1}:{}),
      sourceId:source.id,sourceStage:p.stage,stage:rule.stage,route,createdAt:w.turn,establishAt:w.turn+1,expires:w.turn+2};
    if(hyperEnabled(w))hyperDetachTraces(w,source,p,p.q,true);
    source.infection=null;p.hostId=pending.id;p.primary.pauseUntil=w.turn+1;p.primary.last.induction=0;
    w.pending.push(pending);ctx.movedInfections.add(p.id);
    primaryResult(w,p,route,"transferring");primaryFlow(w,ctx,p.species,route,"invaded");
    primaryEvent(ctx,target,"transferring",{parasite:p.id,species:p.species,route,stage:rule.stage,source:source.id,establishAt:pending.establishAt});
  }
  function primaryClear(w,ctx) {
    const m=S.maps(w),settings=S.PrimaryParasite.settings(w);
    for(const host of w.organisms){
      if(host.HP<=0)continue;
      const intent=ctx.intents.get(host.id),cost=ctx.costs.get(host.id);
      if(intent?.type==="groom"){
        const target=m.byId.get(intent.target),p=target?.infection;
        if(S.PrimaryParasite.is(p)&&p.location==="external"&&target.HP>0&&target.species===host.species&&S.oneStep(w,host.cell,target.cell)&&cost.budget-cost.action>=.3&&
          (!cohorts(w)||!ctx.groomedPrimary?.has(p.id))){
          cost.action+=.3;
          if(cohorts(w))(ctx.groomedPrimary??=new Set()).add(p.id);
          p.load=S.round(Math.max(0,p.load-(cohorts(w)?.22/(4*S.ParasiteCohort.members(p)):.22)));
          if(p.load<=0)exclude(w,ctx,target,"groom");
        }
      }
      if(S.PrimaryParasite.is(host.infection)&&cost.budget-cost.action>=settings.exclusionCost){
        cost.action+=settings.exclusionCost;
        if(S.r(w,"primary/immunity",w.turn,host.id,host.infection.id)<settings.exclusionRate)exclude(w,ctx,host,"immunity");
      }
    }
  }
  function primaryMature(w,ctx) {
    const settings=S.PrimaryParasite.settings(w);
    for(const host of w.organisms){
      const p=host.infection;if(!S.PrimaryParasite.is(p))continue;
      const entry=ctx.byParasite.get(p.id),last=p.primary.last;if(!entry||!last)continue;
      if(!ctx.movedInfections.has(p.id)&&w.turn>p.primary.pauseUntil){
        if(last.progress>0){const before=p.counter;p.counter=S.round(Math.min(settings.development[p.stage],p.counter+last.progress));if(informationEnabled(w))last.appliedProgress=S.round(p.counter-before);}
        if(last.maintained)p.primary.successT++;
        const phase=p.primary.successT>=settings.phaseThresholds[3]?3:p.primary.successT>=settings.phaseThresholds[2]?2:1;
        if(phase>p.phase){const extra=S.round(settings.biomass[phase]-p.B);if(p.E>=extra){p.E=S.round(p.E-extra);p.B=S.round(p.B+extra);p.phase=phase;}}
        if(p.stage==="terminal"&&p.counter>=settings.development.terminal&&p.matureAt===undefined){p.matureAt=w.turn;primaryResult(w,p,p.primary.route||"contact","mature");}
      }
      // Existing Q bridge only; I06 owns its new lifecycle and biomass.
      const q=p.q;if(q&&!hyperEnabled(w)&&entry.qFull&&!ctx.movedInfections.has(p.id)&&w.turn>p.primary.pauseUntil){
        const favored=w.config.advantageSettings?.hyperparasite===true;q.counter++;
        if(entry.qPhase===1&&q.counter>=(favored?1:4)){q.phase=2;q.counter=0;}
        else if(entry.qPhase===2&&q.counter>=(favored?2:8)&&q.E>=(favored ? .02 : .2)){
          const cost=favored ? .02 : .2;q.E=S.round(q.E-cost);S.dissipate(w,cost);q.phase=3;q.counter=0;
          const values=entry.qCounts.map((value,i)=>({value,i,h:S.hash(w,"hyper/special",w.turn,q.id,null,i)})).sort((a,b)=>b.value-a.value||a.h-b.h);
          q.special=["rectify","retain","modulate"][values[0].i];q.modulation=Math.floor(S.r(w,"hyper/modulation",w.turn,q.id)*3)-1;
        }
      }
    }
    if(hyperEnabled(w))hyperMature(w,ctx);
  }
  function hostDeath(w,ctx,host,carcass) {
    if(!primaryEnabled(w))return false;
    const settings=S.PrimaryParasite.settings(w);
    if(S.CurrentInformation.enabled(w)&&host.infection?.q)S.CurrentInformation.detach(w,host,host.infection,host.infection.q,true);
    if(hyperEnabled(w)&&host.hyperTraces?.length){
      // Death freezes the old source's paid trace; a surviving P in a carcass
      // is a different holder, not continued remote investment into dead H.
      for(const trace of host.hyperTraces)if(trace.detachedAt===null)trace.detachedAt=w.turn;
      carcass.hyperSourceTraces=structuredClone(host.hyperTraces);
    }
    for(const i of w.primaryInocula||[])if(i.hostId===host.id&&i.kind==="edible"){
      i.hostId=carcass.id;i.cell=carcass.cell;i.kind="carcass";i.route="carcass";
      i.expires=Math.min(i.expires,w.turn+settings.inoculumLifetime.carcass);
    }
    const p=host.infection;if(!S.PrimaryParasite.is(p))return true;
    if(p.stage!=="extra"&&p.counter>=settings.development[p.stage]){
      if(p.species==="tideparasite"&&["shallow","deep"].includes(w.tiles[host.cell].terrain))produce(w,ctx,host,"water");
      carcass.infection=p;p.hostId=carcass.id;carcass.payloadExpires=Math.min(carcass.expires,w.turn+settings.inoculumLifetime.carcass);p.primary.last.induction=0;
    }else {if(hyperEnabled(w))hyperDetachTraces(w,host,p,p.q);S.loseInfection(w,p);}
    host.infection=null;return true;
  }
  function expireCarrier(w,ctx,carrier) {
    if(!primaryEnabled(w))return false;
    if(S.PrimaryParasite.is(carrier.infection))exclude(w,ctx,carrier,"carrier-expired");
    for(const i of w.primaryInocula||[])if(i.hostId===carrier.id&&i.kind!=="invading"){S.dissipate(w,i.E);i.E=0;i.amount=0;}
    w.primaryInocula=(w.primaryInocula||[]).filter(i=>i.E>0);return true;
  }
  function terminal(p, o) {
    if (S.spec(o).group !== "main") return false;
    return p.species === "tideparasite"
      ? ["abyss", "abyssshell", "jelly", "whale", "cephalopod"].includes(
          o.species,
        )
      : ["plant", "general"].includes(S.spec(o).diet);
  }
  // I02 bridge: finite edible inoculum, not a split or transfer of the resident P/Q.
  // Route adaptation, multistep establishment and parasite biomass belong to I05.
  function colonyExposure(w,ctx,source,target,harvest) {
    if(!harvest||harvest.consumedB<=0||harvest.beforeEdibleB<=0)return;
    const colony=source.colony,p=source.infection;
    if(!colony.edibleExposure&&p&&p.stage==="first"&&p.counter>=4&&p.E>=.12&&
       (p.edibleReady||0)<=w.turn&&ctx.byParasite.has(p.id)&&!ctx.movedInfections.has(p.id)){
      p.E=S.round(p.E-.12);S.dissipate(w,.06);p.edibleReady=w.turn+6;
      colony.edibleExposure={id:"edible:"+p.id+":"+w.turn,sourceParasiteId:p.id,species:p.species,
        E:.06,amount:1,created:w.turn,expires:w.turn+6};
    }
    const exposure=colony.edibleExposure;
    if(!exposure||exposure.created>w.turn||exposure.expires<=w.turn)return;
    const budget=S.round(exposure.E*Math.min(1,harvest.consumedB/harvest.beforeEdibleB));
    exposure.E=S.round(exposure.E-budget);exposure.amount=S.round(exposure.E/.06);
    const compatible=(exposure.species==="tideparasite"&&target.species==="waterbug")||
      (exposure.species==="leafparasite"&&target.species==="grassbug");
    if(compatible&&!target.infection&&budget>=.03){
      const child=S.infection(w,exposure.species,target.id,w.turn,S.sha256(exposure.id+":"+target.id).slice(0,16));
      child.stage="middle";child.E=budget;target.infection=child;
      ctx.movedInfections.add(child.id);ctx.transfers++;ctx.births.push(child.species);
      S.record(ctx,target,"infection",{parasite:child.id,stage:"middle",sourceParasite:exposure.sourceParasiteId,exposure:budget});
    }else S.dissipate(w,budget);
    if(exposure.E<=0)colony.edibleExposure=null;
  }
  function transfer(w, ctx, source, target, type, harvest = null) {
    if(primaryEnabled(w))return primaryTransfer(w,ctx,source,target,type,harvest);
    if(S.LargePlant.definition(S.D.byId[source.species])||S.LargePlant.is(target))return;
    if(type==="plant"&&S.Colony.is(source)){colonyExposure(w,ctx,source,target,harvest);return;}
    const p = source.infection;
    if (!p) return;
    let stage = null;
    if (type === "plant") {
      if (p.stage !== "first" || p.counter < 4 || target.infection) return;
      if (
        (p.species === "tideparasite" && target.species === "waterbug") ||
        (p.species === "leafparasite" && target.species === "grassbug")
      )
        stage = "middle";
      else return;
    } else if (type === "carcass") {
      if(w.config.ecologyRevision === "observation/4.1" && source.payloadExpires>w.turn && !target.infection && p.counter>=required[p.stage]){
        const first=p.species === "tideparasite" ? "algae" : "grass",prey=p.species === "tideparasite" ? "waterbug" : "grassbug";
        if(p.stage === "first" && target.species === prey)stage="middle";
        else if(["middle","extra","terminal"].includes(p.stage) && terminal(p,target))stage=S.ageInfo(target).stage !== "juvenile" ? "terminal" : "extra";
        else if(p.stage === "terminal" && target.species===first)stage="first";
      }
      if (!source.payloadExpires || source.payloadExpires <= w.turn) return;
      if (
        !target.infection &&
        source.species !== target.species &&
        terminal(p, target)
      ) {
        if (p.stage === "middle")
          stage = (w.config.ecologyRevision === "observation/4.1" ? S.ageInfo(target).stage !== "juvenile" : target.phase >= 3) ? "terminal" : "extra";
        else if (p.stage === "extra" && (w.config.ecologyRevision === "observation/4.1" ? S.ageInfo(target).stage !== "juvenile" : target.phase >= 3)) stage = "terminal";
      }
      if (!stage) {
        S.loseInfection(w, p);
        source.infection = null;
        ctx.infectionFailures++;
        return;
      }
    }
    if (stage) {
      source.infection = null;
      target.infection = p;
      p.hostId = target.id;
      p.stage = stage;
      p.counter = 0;
      ctx.movedInfections.add(p.id);
      ctx.transfers++;
      S.record(ctx, target, "infection", { parasite: p.id, stage });
    }
  }
  // Paid colony dispersal; all donors are frozen at the beginning of the turn.
  function contactStage(p, target, matureTerminal, ageBased = false) {
    const first = p.species === "tideparasite" ? "algae" : "grass";
    const middle = p.species === "tideparasite" ? "waterbug" : "grassbug";
    if (target.species === first && (p.stage === "first" || matureTerminal)) return "first";
    if (target.species === middle && (["first", "middle"].includes(p.stage) || matureTerminal)) return "middle";
    if (matureTerminal && terminal(p, target)) return (ageBased ? S.ageInfo(target).stage !== "juvenile" : target.phase >= 3) ? "terminal" : "extra";
    if (p.stage === "extra" && terminal(p, target) && (ageBased ? S.ageInfo(target).stage === "juvenile" : target.phase < 3)) return "extra";
    return null;
  }
  function contacts(w, ctx) {
    if(primaryEnabled(w))return primaryContacts(w,ctx);
    if (w.contactTurn === w.turn) return;
    w.contactTurn = w.turn;
    const m = S.maps(w), touches = new Map(), proposals = [];
    for (const source of w.organisms) {
      const p = source.infection, entry = p && ctx.byParasite.get(p.id);
      if (!entry || source.HP <= 0 || ctx.movedInfections.has(p.id) || entry.counter < required[entry.stage] || (p.contactReady || 0) > w.turn) continue;
      const matureTerminal = entry.stage === "terminal", radius = matureTerminal ? 2 : 1;
      for (const cell of S.nearby(w, source.cell, radius, true)) {
        for (const target of (S.Ryouki?.enabled(w)?[...S.mainAt(m,cell),m.food.get(cell),m.prey?.get(cell)]:[m.main.get(cell), m.food.get(cell)])) {
          if (!target || target.HP <= 0 || target.infection || !S.sight(w, source.cell, target.cell)) continue;
          const stage = contactStage(p, target, matureTerminal, w.config.ecologyRevision === "observation/4.1");
          if (!stage) continue;
          const previous = (target.contactExposure || []).find(e => e.source === p.id && w.turn-e.time < 8);
          const hits = Math.min(3, (previous?.hits || 0) + 1);
          if (!touches.has(target.id)) touches.set(target.id, []);
          touches.get(target.id).push({source:p.id,time:w.turn,hits});
          if (hits >= 3 && p.E >= .12) proposals.push({source,p,target,stage,matureTerminal,h:S.hash(w,"parasite/contact",w.turn,p.id,target.id)});
        }
      }
    }
    for (const target of w.organisms) {
      if (target.infection) { if (target.contactExposure) target.contactExposure=[]; continue; }
      const recent = (touches.get(target.id) || []).sort((a,b)=>b.hits-a.hits||S.compare(a.source,b.source)).slice(0,4);
      if (recent.length || target.contactExposure) target.contactExposure=recent;
    }
    proposals.sort((a,b)=>a.h-b.h||S.compare(a.target.id,b.target.id));
    const used = new Map(), taken = new Set();
    for (const c of proposals) {
      const n=used.get(c.p.id)||0;
      if(taken.has(c.target.id)||c.target.infection||n >= (c.matureTerminal?3:1)||c.p.E < .12)continue;
      const child=S.infection(w,c.p.species,c.target.id,w.turn,S.sha256(c.p.id+":"+c.target.id+":contact").slice(0,16));
      child.stage=c.stage;child.E=.04;
      c.p.E=S.round(c.p.E-.12);S.dissipate(w,.08);
      if(w.config.ecologyRevision !== "observation/4.1" && c.p.q && ctx.byParasite.get(c.p.id).qPhase>=2 && c.p.q.E>=.06){
        c.p.q.E=S.round(c.p.q.E-.06);child.q=S.hyper(w,child.id,w.turn);child.q.E=.02;S.dissipate(w,.04);ctx.births.push("hyperparasite");
      }
      c.target.infection=child;c.target.contactExposure=[];ctx.births.push(child.species);ctx.transfers++;
      taken.add(c.target.id);used.set(c.p.id,n+1);ctx.movedInfections.add(child.id);
      S.record(ctx,c.target,"infection",{parasite:child.id,stage:c.stage,route:"contact"});
    }
    for(const c of proposals)if(used.has(c.p.id))c.p.contactReady=w.turn+(c.matureTerminal?3:18);
  }
  function fee(w, ctx, host) {
    if(primaryEnabled(w))return; // begin() already settled the actual host tax and P costs.
    const entry = ctx.startInfections.get(host.id);
    if (!entry) return;
    if(w.config.ecologyRevision === "observation/4.1") return upkeep(w,ctx,host,entry);
    const { p, q } = entry,
      paid = Math.min(host.E, 0.2);
    host.E = S.round(host.E - paid);
    host.HP = S.round(Math.max(0, host.HP - 2 * (0.2 - paid)));
    const share = q ? Math.min(0.05, paid) : 0,
      part = paid - share,
      addP = Math.min(2 - p.E, part),
      addQ = q ? Math.min(1 - q.E, share) : 0;
    p.E = S.round(p.E + addP);
    if (q) q.E = S.round(q.E + addQ);
    S.dissipate(w, paid - addP - addQ);
    entry.full = paid >= 0.2 - 1e-8;
    entry.qFull = share >= 0.05 - 1e-8;
  }
  function mature(w, ctx) {
    if(primaryEnabled(w))return primaryMature(w,ctx);
    for (const host of w.organisms) {
      const p = host.infection;
      if (!p || ctx.movedInfections.has(p.id)) continue;
      const entry = ctx.byParasite.get(p.id);
      if (!entry) continue;
      const suppressed = w.config.ecologyRevision !== "observation/4.1" && entry.qPhase >= 2,
        parity = (w.turn + S.hash(w, "parasite/phase", 0, p.id)) % 2 === 0;
      if (entry.full && (!suppressed || parity))
        p.counter = Math.min(required[p.stage], p.counter + 1);
      if (w.config.ecologyRevision === "observation/4.1" && p.stage === "terminal" && p.counter >= required.terminal && p.matureAt === undefined) p.matureAt=w.turn;
      if (p.q && entry.qFull) {
        const q = p.q;
        q.counter++;
        if (entry.qPhase === 1 && q.counter >= 4) {
          q.phase = 2;
          q.counter = 0;
        } else if (entry.qPhase === 2 && q.counter >= 8 && q.E >= 0.2) {
          q.E = S.round(q.E - 0.2);
          S.dissipate(w, 0.2);
          q.phase = 3;
          q.counter = 0;
          const values = entry.qCounts
            .map((value, i) => ({
              value,
              i,
              h: S.hash(w, "hyper/special", w.turn, q.id, null, i),
            }))
            .sort((a, b) => b.value - a.value || a.h - b.h);
          q.special = ["rectify", "retain", "modulate"][values[0].i];
          q.modulation =
            Math.floor(S.r(w, "hyper/modulation", w.turn, q.id) * 3) - 1;
        }
      }
    }
  }
  function prepareMessages(w, ctx) {
    if(informationEnabled(w))return;
    const byCell = new Map(w.messages.map((a) => [a.cell, a]));
    for (const o of w.organisms) {
      const rec = ctx.records.get(o.id);
      if (!rec?.delta?.some(Boolean)) continue;
      const raw = rec.delta
          .map((value, axis) => ({
            value,
            axis,
            h: S.hash(w, "information/component", w.turn, o.id, null, axis),
          }))
          .filter((c) => c.value)
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.h - b.h)
          .slice(0, 2),
        noise = S.r(w, "information/noise", w.turn, o.id) < 0.1;
      const values = raw.map((c) => ({
        axis: c.axis,
        value: S.round(
          S.clamp(
            (noise ? -Math.sign(c.value) * 3 : c.value) *
              (0.8 + 0.4 * o.dna.sensitivity),
            noise ? -3 : -2,
            noise ? 3 : 2,
          ),
        ),
      }));
      const event = {
        id: w.turn + ":" + o.id + ":experience:0",
        sourceId: o.id,
        cell: o.cell,
        env: w.tiles[o.cell].env,
        time: w.turn,
        expires: w.turn + 8,
        values,
        noise,
        retention: 1,
        mediator: null,
      };
      byCell.set(o.cell, event);
    }
    w.messages = [...byCell.values()].filter((a) => a.expires > w.turn);
  }
  function infoCandidates(w, ctx) {
    if(informationEnabled(w))return [];
    prepareMessages(w, ctx);
    const m = S.maps(w),
      messageMap = new Map(w.messages.map((a) => [a.cell, a])),
      out = [];
    for (const c of ctx.ca.filter(
      (c) => c.kind === "info" && !ctx.exhausted.has(c.cell + ":info"),
    )) {
      let event, source;
      if (c.growth && !w.resources.includes(c.growth)) continue;
      if (c.growth?.event) {
        event = c.growth.event;
        source = m.byId.get(event.sourceId);
        if (
          !source ||
          w.turn - event.time >= 8 ||
          S.distance(w, c.cell, source.cell) > 1
        )
          continue;
      } else {
        const messages = S.nearby(w, c.cell, 1, true)
          .map((p) => messageMap.get(p))
          .filter(
            (a) =>
              a &&
              a.expires > w.turn &&
              m.byId.has(a.sourceId) &&
              S.distance(w, c.cell, m.byId.get(a.sourceId).cell) <= 1,
          );
        messages.sort(
          (a, b) =>
            b.time - a.time ||
            b.values.reduce((s, v) => s + Math.abs(v.value), 0) -
              a.values.reduce((s, v) => s + Math.abs(v.value), 0) ||
            S.hash(w, "information/source", w.turn, a.sourceId, c.cell) -
              S.hash(w, "information/source", w.turn, b.sourceId, c.cell),
        );
        event = messages[0];
        if (!event) continue;
        source = m.byId.get(event.sourceId);
      }
      out.push({
        ...c,
        source,
        costE: 0.1 * c.q,
        costB: 0,
        costM: 0,
        E: 0.05 * c.q,
        M: 0,
        G: 0,
        expires: event.time + 20,
        event: structuredClone(event),
        fit: event.env === w.tiles[c.cell].env ? 2 : 1,
      });
    }
    if(hyperEnabled(w))return out; // I07 will consume paid traces; no legacy live-resource rewriting.
    const byQ = new Map();
    for (const c of out) {
      if (c.growth) continue;
      const p = c.source.infection,
        q = p?.q,
        entry = p && ctx.byParasite.get(p.id);
      if (
        !q ||
        !entry ||
        entry.qPhase !== 3 ||
        ctx.movedInfections.has(p.id) ||
        q.ready > w.turn ||
        q.E < 0.02 ||
        q.seen.some((a) => a.id === c.event.id && a.expires > w.turn)
      )
        continue;
      const key = q.id,
        h = S.hash(w, "supply/arbitration", w.turn, c.source.id, [
          c.cell,
          c.kind,
        ]),
        capacity = (c.source.E - 5) / c.costE;
      c._opRank = [-c.fit, -capacity, h];
      const old = byQ.get(key);
      if (
        !old ||
        c._opRank.some(
          (v, i) =>
            v !== old._opRank[i] &&
            c._opRank.slice(0, i).every((x, j) => x === old._opRank[j]) &&
            v < old._opRank[i],
        )
      )
        byQ.set(key, c);
    }
    for (const c of byQ.values()) {
      const q = c.source.infection.q;
      c.opQ = q;
      c.event.mediator = { id: q.id, special: q.special };
      if (q.special === "retain") c.event.retention = 1.25;
      else {
        const candidates = c.event.values
          .map((v) => ({
            v,
            h: S.hash(w, "hyper/component", w.turn, q.id, c.event.id, v.axis),
          }))
          .sort(
            (a, b) => Math.abs(b.v.value) - Math.abs(a.v.value) || a.h - b.h,
          );
        if (candidates.length) {
          const v = candidates[0].v;
          v.value =
            q.special === "rectify"
              ? v.value * 0.5
              : S.clamp(v.value + q.modulation, -3, 3);
        }
      }
    }
    return out;
  }
  function reproduce(w, ctx) {
    if(primaryEnabled(w)){
      for(const host of w.organisms)if(host.HP>0&&cellLivingHost(w,ctx,host))produce(w,ctx,host);
      for(const host of w.organisms){
        const p=host.infection,q=p?.q,rec=ctx.records.get(host.id);
        if(!q||hyperEnabled(w)||!rec||ctx.movedInfections.has(p.id))continue;
        const signals=[rec.emitted,rec.contacted,rec.information.length>0];
        q.counts=q.counts.map((v,i)=>Math.min(8,v+(signals[i]?1:0)));q.seen=q.seen.filter(a=>a.expires>w.turn);
      }
      return;
    }
    // Select from one frozen host snapshot. A losing parent never retries another host.
    const vacant = w.organisms.filter((o) => !o.infection),
      proposals = [];
    for (const host of w.organisms) {
      const p = host.infection,
        entry = p && ctx.byParasite.get(p.id);
      if (
        !p ||
        !entry ||
        ctx.movedInfections.has(p.id) ||
        entry.stage !== "terminal" ||
        entry.counter < 8 ||
        p.ready > w.turn ||
        p.E < 0.1 ||
        w.pending.some((a) => a.parentId === p.id)
      )
        continue;
      const first = p.species === "tideparasite" ? "algae" : "grass",
        target = vacant
          .filter(
            (o) => o.species === first && S.distance(w, host.cell, o.cell) <= 1,
          )
          .sort(
            (a, b) =>
              S.hash(w, "parasite/offspring-host", w.turn, p.id, a.id) -
              S.hash(w, "parasite/offspring-host", w.turn, p.id, b.id),
          )[0];
      proposals.push({
        host,
        p,
        entry,
        target,
        h: S.hash(w, "parasite/host-vote", w.turn, p.id, target?.id || null),
      });
    }
    const votes = new Map();
    for (const c of proposals)
      if (c.target) {
        const old = votes.get(c.target.id);
        if (
          !old ||
          c.h < old.h ||
          (c.h === old.h && S.compare(c.p.id, old.p.id) < 0)
        )
          votes.set(c.target.id, c);
      }
    for (const { host, p, entry, target, h } of proposals) {
      if (target && votes.get(target.id)?.p !== p) continue;
      const child = S.infection(w, p.species, null, w.turn, p.id);
      ctx.births.push(child.species);
      p.E = S.round(p.E - 0.1);
      S.dissipate(w, 0.1);
      if (w.config.ecologyRevision !== "observation/4.1" && p.q && entry.qPhase === 3 && p.q.E >= 0.1) {
        p.q.E = S.round(p.q.E - 0.1);
        S.dissipate(w, 0.1);
        child.q = S.hyper(w, child.id, w.turn);
        ctx.births.push("hyperparasite");
      }
      if (target) {
        child.hostId = target.id;
        target.infection = child;
        S.record(ctx, target, "infection", {
          parasite: child.id,
          stage: "first",
        });
      } else
        w.pending.push({
          id: "candidate:" + child.id,
          parentId: p.id,
          cell: host.cell,
          expires: w.turn + 8,
          infection: child,
        });
      p.ready = w.turn + (w.config.ecologyRevision !== "observation/4.1" && entry.qPhase >= 2 ? 8 : 4) + 1;
    }
    const pendingVotes = new Map(),
      pendingChoices = [];
    for (const pending of w.pending) {
      const first =
          pending.infection.species === "tideparasite" ? "algae" : "grass",
        child = (ctx.children || [])
          .filter(
            (o) =>
              o.species === first &&
              !o.infection &&
              S.distance(w, pending.cell, o.cell) <= 1,
          )
          .sort(
            (a, b) =>
              S.hash(w, "parasite/pending", w.turn, pending.id, a.id) -
              S.hash(w, "parasite/pending", w.turn, pending.id, b.id),
          )[0];
      if (child) {
        const c = {
          pending,
          child,
          h: S.hash(w, "parasite/pending-vote", w.turn, pending.id, child.id),
        };
        pendingChoices.push(c);
        const old = pendingVotes.get(child.id);
        if (!old || c.h < old.h) pendingVotes.set(child.id, c);
      }
    }
    for (const c of pendingChoices)
      if (pendingVotes.get(c.child.id) === c) {
        c.child.infection = c.pending.infection;
        c.child.infection.hostId = c.child.id;
        w.pending = w.pending.filter((a) => a !== c.pending);
        S.record(ctx, c.child, "infection", {
          parasite: c.child.infection.id,
          stage: "first",
        });
      }
    for (const host of w.organisms) {
      const p = host.infection,
        q = p?.q,
        entry = p && ctx.byParasite.get(p.id),
        rec = ctx.records.get(host.id);
      if (!q || !entry || ctx.movedInfections.has(p.id) || !rec) continue;
      const signals = [rec.emitted, rec.contacted, rec.information.length > 0];
      q.counts = q.counts.map((v, i) => Math.min(8, v + (signals[i] ? 1 : 0)));
      q.seen = q.seen.filter((a) => a.expires > w.turn);
    }
  }
  function upkeep(w,ctx,host,entry) {
    const p=entry.p;
    // The beginning-of-turn host pays, even after trophic transfer; a cleared colony pays nothing.
    if(!w.organisms.some(o=>o.infection===p) && !w.carcasses.some(c=>c.infection===p))return;
    p.load ??= .5;
    const fee=.12*p.load,paid=Math.min(host.E,fee),add=Math.min(2-p.E,paid);
    host.E=S.round(host.E-paid);p.E=S.round(p.E+add);S.dissipate(w,paid-add);
    const cost=.04,maintenance=Math.min(p.E,cost);p.E=S.round(p.E-maintenance);S.dissipate(w,maintenance);
    p.stress=maintenance+1e-8<cost?(p.stress||0)+1:Math.max(0,(p.stress||0)-1);
    p.load=S.round(S.clamp(p.load+(maintenance>=cost?.01:-.08),0,1));
    entry.full=paid+1e-8>=fee && maintenance+1e-8>=cost;
    if(p.q){feedQ(w,p.q,host.cell);entry.qFull=p.q?.E>=.01;}
    if(p.load<=0||p.stress>=8){S.loseInfection(w,p);const carrier=w.organisms.find(o=>o.infection===p);if(carrier)carrier.infection=null;S.record(ctx,host,"clear",{target:host.id,parasite:p.id,reason:"maintenance"});}
  }
  function feedQ(w,q,cell) {
    if(primaryEnabled(w))return primaryBridgeQ(w,q,cell);
    // External information resource, never an extra direct tax on host or primary parasite.
    const a=w.resources.find(a=>a.cell===cell&&a.kind==="info"&&a.E>0);
    if(a){const n=Math.min(.03,a.E,1-q.E);q.E=S.round(q.E+n);a.E=S.round(a.E-n);}
    const cost=Math.min(q.E,.001);q.E=S.round(q.E-cost);S.dissipate(w,cost);
  }
  function clear(w,ctx) {
    if(primaryEnabled(w))return primaryClear(w,ctx);
    const m=S.maps(w);
    for(const o of w.organisms){
      const intent=ctx.intents.get(o.id),cost=ctx.costs.get(o.id);
      if(o.HP<=0)continue;
      if(intent?.type==="groom"){
        const target=m.byId.get(intent.target),p=target?.infection;
        if(p && p.location === "external" && target.HP>0 && target.species===o.species && S.oneStep(w,o.cell,target.cell) && cost.budget-cost.action>=.3){
          cost.action+=.3;p.load=S.round(Math.max(0,(p.load??.5)-.22));
          S.record(ctx,o,"clear",{target:target.id,parasite:p.id,species:p.species,reason:"groom"});
          if(p.load<=0){S.loseInfection(w,p);target.infection=null;}
        }
      }
      const p=o.infection;
      if(p && cost.budget-cost.action>=.04){
        // Bounded, paid immunity; no guaranteed clearance or physical damage to the host.
        cost.action+=.04;
        if(S.r(w,"parasite/immunity",w.turn,o.id)<.006){p.load=S.round(Math.max(0,(p.load??.5)-.3));if(p.load<=0){S.loseInfection(w,p);o.infection=null;S.record(ctx,o,"clear",{target:o.id,parasite:p.id,species:p.species,reason:"immunity"});}}
      }
    }
  }
  function windowOpen(w,p){return p.stage==="terminal" &&
    (cohorts(w)&&p.counter>=Math.ceil(S.PrimaryParasite.settings(w).development.terminal/2)&&!Number.isInteger(p.matureAt)||
      Number.isInteger(p.matureAt)&&w.turn>p.matureAt&&w.turn<=p.matureAt+(fanout(w)?10:cohorts(w)?6:3));}
  function search(w,ctx){
    if(hyperEnabled(w))return hyperSearch(w,ctx);
    const current=w.searchQ || [],next=[],born=[];
    const infected=w.organisms.filter(o=>o.infection && !o.infection.q && windowOpen(w,o.infection) && !ctx.movedInfections.has(o.infection.id));
    const occupied=new Set(), searchMap=S.maps(w);
    for(const q of current.slice().sort((a,b)=>S.compare(a.id,b.id))){
      feedQ(w,q,q.cell);
      if(q.E<=0 || q.expires<=w.turn){S.dissipate(w,q.E);ctx.deaths.push({species:"hyperparasite",reason:"age"});continue;}
      const target=infected.filter(o=>!occupied.has(o.id)&&S.distance(w,q.cell,o.cell)<=1&&S.sight(w,q.cell,o.cell)).sort((a,b)=>S.compare(a.id,b.id))[0];
      if(target && q.E>=.02){q.E=S.round(q.E-.02);S.dissipate(w,.02);q.hostId=target.infection.id;delete q.cell;delete q.expires;target.infection.q=q;occupied.add(target.id);S.record(ctx,target,"infection",{parasite:q.id,species:"hyperparasite",stage:"window",target:target.infection.id});continue;}
      const map=searchMap,cue=(S.Ryouki?.enabled(w)?S.nearby(w,q.cell,3,true).flatMap(c=>S.mainAt(map,c)):S.nearby(w,q.cell,3,true).map(c=>map.main.get(c))).filter(o=>o?.infection?.stage==="terminal"&&o.infection.counter>=5&&S.sight(w,q.cell,o.cell)).sort((a,b)=>S.distance(w,q.cell,a.cell)-S.distance(w,q.cell,b.cell)||S.compare(a.id,b.id))[0];
      const moves=S.nearby(w,q.cell).filter(c=>S.oneStep(w,q.cell,c));
      if(moves.length && q.E>.001){const c=moves.sort((a,b)=>(cue?S.distance(w,a,cue.cell)-S.distance(w,b,cue.cell):0)||S.hash(w,"hyper/search",w.turn,q.id,a)-S.hash(w,"hyper/search",w.turn,q.id,b))[0];q.cell=c;q.E=S.round(q.E-.001);S.dissipate(w,.001);}
      next.push(q);
    }
    for(const host of w.organisms){const p=host.infection,q=p?.q;if(!q)continue;
      if(q.E<=0){S.dissipate(w,q.E);p.q=null;ctx.deaths.push({species:"hyperparasite",reason:"starvation"});continue;}
      if(q.phase>=3&&q.ready<=w.turn&&q.E>=.12 && next.length+born.length<256){const child=S.hyper(w,q.id,w.turn);child.cell=host.cell;child.E=.08;child.expires=w.turn+40;q.E=S.round(q.E-.1);q.ready=w.turn+12;S.dissipate(w,.02);born.push(child);ctx.births.push("hyperparasite");}
    }
    w.searchQ=[...next,...born];
  }
  return {
    emptyInformationFlow,informationTrack,informationDeath,informationBegin,informationPlace,informationUsed,informationFinalize,informationHostFactor,
    hyperBegin,hyperMature,hyperSearch,hyperExclude,hyperExpose,hyperEstablish,hyperAdultDeath,hyperEvade,emptyHyperFlow,
    begin,hostDeath,expireCarrier,produce,expose,diffuse,exclude,emptyPrimaryFlow,
    clear,search,windowOpen,
    required,
    contacts,
    contactStage,
    terminal,
    transfer,
    fee,
    mature,
    prepareMessages,
    infoCandidates,
    reproduce,
  };
});
