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
  const primaryStage=stage=>stage==="extra"?"terminal":stage;
  function emptyPrimaryFlow(w) {
    return {definition:"primary-parasite-flow/1",turn:w.turn,bySpecies:Object.fromEntries(["leafparasite","tideparasite"].map(species=>[species,
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
      if(i.kind!=="water"||i.createdAt>=w.turn||i.expires<=w.turn||i.E<=0||!["shallow","deep"].includes(w.tiles[i.cell].terrain))continue;
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
      const key=i.kind==="water"?JSON.stringify([i.cell,i.species,i.sourceId,i.parentId,i.createdAt,i.expires,i.stage,i.sourceStage,i.adaptation,i.hostPreference]):i.id;
      const old=merged.get(key);
      if(old){old.E=S.round(old.E+i.E);old.amount=S.round(old.E/standard);}else merged.set(key,i);
    }
    w.primaryInocula=[...merged.values()];
  }
  function expose(w,ctx,i,target,route=i.route,fraction=1) {
    if(!primaryEnabled(w)||!i||i.E<=0||fraction<=0||i.createdAt>=w.turn||i.expires<=w.turn)return {exposed:0,compatible:false,invaded:false,reason:"zero"};
    const settings=S.PrimaryParasite.settings(w),sourceStage=i.sourceStage||i.stage,
      origin=JSON.stringify([i.species,i.parentId,i.sourceId,i.createdAt,i.expires,i.adaptation,i.hostPreference,route,sourceStage]),
      previous=(w.primaryInocula||[]).find(a=>a.kind==="invading"&&a.hostId===target.id&&a.origin===origin&&a.E>0),
      amount=S.PrimaryParasite.takeInoculum(w,i,Math.min(settings.standardReserve-(previous?.E||0),i.E*S.clamp(fraction,0,1))),
      rule=S.PrimaryParasite.hostRule(i.species,target,route,sourceStage);
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
    if(!previous)w.primaryInocula.push(entering);
    if(entering.status==="invaded")return {exposed:amount,compatible:true,invaded:true,reason:null,id:entering.id};
    if(entering.E<settings.minimumReserve){primaryEvent(ctx,target,"exposure",{species:i.species,route,amount,reason:"accumulating"});return {exposed:amount,compatible:true,invaded:false,reason:"accumulating",id:entering.id};}
    primaryFlow(w,ctx,i.species,route,"invasionAttempts");
    const resistance=S.PrimaryParasite.resistance(w,target,i.species,route),defense=.4*(target.dna?.skin??.5),
      chance=S.clamp(settings.entryRates[route]*Math.min(1,entering.E/settings.standardReserve)*(1-defense)*(1-.5*resistance),0,1);
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
        host=byId.get(i.hostId),rule=host&&S.PrimaryParasite.hostRule(species,host,i.route,i.sourceStage),
        resistance=host?S.PrimaryParasite.resistance(w,host,species,i.route):0,
        a=host?S.PrimaryParasite.adaptation(previous||i,host.species,i.route,primaryStage(rule?.stage)):0.5,
        chance=S.clamp(settings.establishmentRate*(1-resistance)*(1+.5*(a-.5)),0,1);
      const timely=migrating||i.invadedAt===undefined||(i.invadedAt<i.expires&&i.establishAt===i.invadedAt+1&&w.turn===i.establishAt);
      if(timely&&host&&host.HP>0&&!host.infection&&rule.allowed&&(migrating||i.E>=settings.minimumReserve)&&
          S.r(w,"primary/establishment",w.turn,i.id,host.id)<chance){
        const p=previous||S.PrimaryParasite.infection(w,species,host.id,w.turn,i.id,i),reserve=migrating?0:Math.min(i.E,settings.standardReserve);
        if(p.stage!==rule.stage||!migrating){p.stage=rule.stage;p.counter=0;}
        if(!migrating){p.B=settings.biomass[1];p.E=S.round(reserve-p.B);ctx.births.push(p.species);}
        p.hostId=host.id;
        p.primary.route=i.route;p.primary.carrier=rule.stage==="extra";p.primary.carrierUntil=p.primary.carrier?w.turn+settings.carrierTurns:null;
        host.infection=p;primaryEntry(ctx,host,p);ctx.transfers++;
        if(migrating){ctx.movedInfections.add(p.id);primaryFlow(w,ctx,p.species,i.route,"transferred");}
        else primaryFlow(w,ctx,p.species,i.route,"established");
        const outcome=migrating?"transferred":"established";
        primaryResult(w,p,i.route,outcome);primaryEvent(ctx,host,outcome,{parasite:p.id,species:p.species,route:i.route,stage:p.stage,amount:reserve,source:i.sourceId});
        if(!migrating&&i.E>reserve)S.dissipate(w,i.E-reserve);
      }else{
        if(migrating)S.loseInfection(w,previous);else S.dissipate(w,i.E);
        ctx.infectionFailures++;primaryEvent(ctx,host,"establishment-failed",{parasite:previous?.id,species,route:i.route,amount:migrating?0:i.E,reason:!host?"missing-host":host.infection?"occupied":!migrating&&i.E<settings.minimumReserve?"small-dose":"establishment"});
      }
      if(migrating)i.infection=null;else{i.E=0;i.amount=0;}
    }
    w.primaryInocula=w.primaryInocula.filter(i=>i.E>0);
    w.pending=w.pending.filter(i=>i.kind!=="primary-migration"||i.infection);
  }
  function begin(w,ctx) {
    if(!primaryEnabled(w))return;
    const state=primaryContext(w,ctx);if(state.begun)return;state.begun=true;
    const settings=S.PrimaryParasite.settings(w);
    for(const host of w.organisms)S.PrimaryParasite.beginResistance(w,host);
    // An invasion completed before external expiry gets its one next-turn
    // establishment check; an exposed dose keeps the original external clock.
    primaryEstablish(w,ctx);
    w.primaryInocula=(w.primaryInocula||[]).filter(i=>{if(i.expires>w.turn&&i.E>0)return true;S.dissipate(w,i.E);return false;});
    diffuse(w,ctx);
    for(const host of primaryHolders(w)){
      const p=host.infection,entry=primaryEntry(ctx,host,p),alive=w.organisms.includes(host);
      p.age=Math.max(p.age||0,w.turn-p.bornAt);
      p.primary.last={...p.primary.last,turn:w.turn,maintained:false,developed:false,progress:0,induction:0,taxE:0,maintenanceE:0,developmentE:0,metaE:0,blockers:[]};
      if(p.age>=p.birthLife){exclude(w,ctx,host,"age");continue;}
      if(alive&&p.stage==="extra"){
        if(S.ageInfo(host).stage!=="juvenile"){p.stage="terminal";p.counter=0;p.primary.carrier=false;}
        else if(w.turn>=p.primary.carrierUntil){exclude(w,ctx,host,"carrier-expired");continue;}
      }
      const phase=Math.min(3,p.phase),factor=primaryCost(w,p,host),last=p.primary.last;
      if(alive){const paid=Math.min(host.E,settings.hostTax[phase],settings.capE-p.E);host.E=S.round(host.E-paid);p.E=S.round(p.E+paid);last.taxE=paid;}
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
      if(p.q){primaryBridgeQ(w,p.q,host.cell,p);entry.qFull=p.q.E>=.01;}
      if(alive&&p.stage!=="extra"&&last.maintained&&(!canDevelop||last.developed)&&w.turn>p.primary.pauseUntil){const cost=settings.metaCosts[phase],paid=primarySpend(w,p,cost);last.metaE=paid;last.induction=cost>0?S.round(settings.metaCaps[phase]*Math.min(1,paid/cost)):0;}
    }
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
    const route=kind==="edible"?"feeding":kind==="carcass"?"carcass":kind,
      cost=S.round(Math.max(settings.emissionReserve,settings.emissionCost*primaryCost(w,p,host,route)));
    if(p.E+1e-8<cost)return null;
    p.E=S.round(p.E-cost);S.dissipate(w,cost-settings.emissionReserve);p.ready=w.turn+settings.emissionCooldown;
    const i=S.PrimaryParasite.inoculum(w,p,{id:"inoculum:"+p.id+":"+w.turn,kind,cell:host.cell,hostId:kind==="edible"?host.id:null,E:settings.emissionReserve,createdAt:w.turn,expires:w.turn+settings.inoculumLifetime[kind],route,stage:p.stage});
    w.primaryInocula.push(i);primaryFlow(w,ctx,p.species,route,"releasedE",i.E);
    primaryResult(w,p,route,"release");
    primaryEvent(ctx,host,"release",{parasite:p.id,species:p.species,route,amount:i.E,inoculum:i.id});return i;
  }
  function primaryContacts(w,ctx) {
    const m=S.maps(w);
    for(const i of (w.primaryInocula||[]).slice().sort((a,b)=>S.compare(a.id,b.id))){
      if(!["contact","water"].includes(i.kind)||i.createdAt>=w.turn||i.expires<=w.turn||i.E<=0)continue;
      const cells=i.kind==="water"?[i.cell]:S.nearby(w,i.cell,1,true),seen=new Set(),targets=[];
      for(const cell of cells)for(const target of [...S.mainAt(m,cell),m.food.get(cell),m.prey?.get(cell),m.producer?.get(cell)]){
        if(!target||seen.has(target.id)||target.HP<=0||target.infection||!S.sight(w,i.cell,target.cell))continue;seen.add(target.id);
        if(S.PrimaryParasite.hostRule(i.species,target,i.kind,i.sourceStage||i.stage).allowed)targets.push(target);
      }
      targets.sort((a,b)=>S.hash(w,"primary/exposure-vote",w.turn,i.id,a.id)-S.hash(w,"primary/exposure-vote",w.turn,i.id,b.id)||S.compare(a.id,b.id));
      for(const target of targets){if(i.E<=0)break;expose(w,ctx,i,target,i.kind);}
    }
    w.primaryInocula=w.primaryInocula.filter(i=>i.E>0);
  }
  function primaryTransfer(w,ctx,source,target,type,harvest) {
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
    const resistance=S.PrimaryParasite.resistance(w,target,p.species,route),chance=S.clamp(settings.entryRates[route]*(1-.4*(target.dna?.skin??.5))*(1-.5*resistance),0,1);
    if(S.r(w,"primary/migration",w.turn,p.id,target.id)>=chance){primaryEvent(ctx,target,"migration-failed",{parasite:p.id,species:p.species,route});return;}
    const pending={id:"primary-migration:"+p.id+":"+w.turn,kind:"primary-migration",infection:p,cell:target.cell,hostId:target.id,
      sourceId:source.id,sourceStage:p.stage,stage:rule.stage,route,createdAt:w.turn,establishAt:w.turn+1,expires:w.turn+2};
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
        if(S.PrimaryParasite.is(p)&&p.location==="external"&&target.HP>0&&target.species===host.species&&S.oneStep(w,host.cell,target.cell)&&cost.budget-cost.action>=.3){
          cost.action+=.3;p.load=S.round(Math.max(0,p.load-.22));
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
        if(last.progress>0)p.counter=S.round(Math.min(settings.development[p.stage],p.counter+last.progress));
        if(last.maintained)p.primary.successT++;
        const phase=p.primary.successT>=settings.phaseThresholds[3]?3:p.primary.successT>=settings.phaseThresholds[2]?2:1;
        if(phase>p.phase){const extra=S.round(settings.biomass[phase]-p.B);if(p.E>=extra){p.E=S.round(p.E-extra);p.B=S.round(p.B+extra);p.phase=phase;}}
        if(p.stage==="terminal"&&p.counter>=settings.development.terminal&&p.matureAt===undefined){p.matureAt=w.turn;primaryResult(w,p,p.primary.route||"contact","mature");}
      }
      // Existing Q bridge only; I06 owns its new lifecycle and biomass.
      const q=p.q;if(q&&entry.qFull&&!ctx.movedInfections.has(p.id)&&w.turn>p.primary.pauseUntil){
        const favored=w.config.advantageSettings?.hyperparasite===true;q.counter++;
        if(entry.qPhase===1&&q.counter>=(favored?1:4)){q.phase=2;q.counter=0;}
        else if(entry.qPhase===2&&q.counter>=(favored?2:8)&&q.E>=(favored ? .02 : .2)){
          const cost=favored ? .02 : .2;q.E=S.round(q.E-cost);S.dissipate(w,cost);q.phase=3;q.counter=0;
          const values=entry.qCounts.map((value,i)=>({value,i,h:S.hash(w,"hyper/special",w.turn,q.id,null,i)})).sort((a,b)=>b.value-a.value||a.h-b.h);
          q.special=["rectify","retain","modulate"][values[0].i];q.modulation=Math.floor(S.r(w,"hyper/modulation",w.turn,q.id)*3)-1;
        }
      }
    }
  }
  function hostDeath(w,ctx,host,carcass) {
    if(!primaryEnabled(w))return false;
    const settings=S.PrimaryParasite.settings(w);
    for(const i of w.primaryInocula||[])if(i.hostId===host.id&&i.kind==="edible"){
      i.hostId=carcass.id;i.cell=carcass.cell;i.kind="carcass";i.route="carcass";
      i.expires=Math.min(i.expires,w.turn+settings.inoculumLifetime.carcass);
    }
    const p=host.infection;if(!S.PrimaryParasite.is(p))return true;
    if(p.stage!=="extra"&&p.counter>=settings.development[p.stage]){
      if(p.species==="tideparasite"&&["shallow","deep"].includes(w.tiles[host.cell].terrain))produce(w,ctx,host,"water");
      carcass.infection=p;p.hostId=carcass.id;carcass.payloadExpires=Math.min(carcass.expires,w.turn+settings.inoculumLifetime.carcass);p.primary.last.induction=0;
    }else S.loseInfection(w,p);
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
      for(const host of w.organisms)if(host.HP>0)produce(w,ctx,host);
      for(const host of w.organisms){
        const p=host.infection,q=p?.q,rec=ctx.records.get(host.id);
        if(!q||!rec||ctx.movedInfections.has(p.id))continue;
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
  function windowOpen(w,p){return p.stage==="terminal" && Number.isInteger(p.matureAt) && w.turn>p.matureAt && w.turn<=p.matureAt+3;}
  function search(w,ctx){
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
