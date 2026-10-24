(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoNutrition = api;
})(globalThis, function (S) {
  "use strict";
  // CR03: finite same-cell transactions. Life-cycle request generation is CR04/05.
  const CellResources=(()=>{
    const VERSION="cell-resources/1",EPS=1e-9,finite=n=>Number.isFinite(n)&&n>=0;
    const Q=S.round,down=n=>Math.floor((Math.max(0,n)+1e-10)*1e6)/1e6;
    function requireWorld(w){if(!S.CellSpace.enabled(w))throw Error("CELL_RESOURCES_VERSION");}
    const foodAllowed=(o,tag)=>o.species!=="kelp"||tag==="animal"||tag==="mineral";
    function allocate(stocks,requests,demands={}){
      if(!stocks||Object.values(stocks).some(n=>!finite(n))||Object.values(demands).some(n=>!finite(n)))throw Error("CELL_POOL_INVALID");
      const ids=new Set(),rows=requests.map(r=>{
        if(!r||typeof r.id!=="string"||ids.has(r.id)||![r.need,r.ability??1,r.reach??1].every(finite)||!r.rates)throw Error("CELL_REQUEST_INVALID");
        const rateEntries=Object.entries(r.rates),fulfillEntries=Object.entries(r.fulfills||{});
        if(!rateEntries.some(([,n])=>n>0)||rateEntries.some(([k,n])=>!Object.hasOwn(stocks,k)||!finite(n))||
          fulfillEntries.some(([k,n])=>!Object.hasOwn(demands,k)||!finite(n)))throw Error("CELL_REQUEST_INVALID");
        const weight=r.need*(r.ability??1)*(r.reach??1);if(!finite(weight))throw Error("CELL_REQUEST_INVALID");
        ids.add(r.id);return {id:r.id,need:r.need,amount:0,weight,rateEntries,fulfillEntries,hasFulfills:!!r.fulfills};
      }).sort((a,b)=>S.compare(a.id,b.id));
      const left={...stocks},unmet={...demands};let active=rows.filter(r=>r.need>0&&r.weight>0);
      while(active.length){
        active=active.filter(r=>r.need-r.amount>EPS&&r.rateEntries.every(([k,n])=>!n||left[k]>EPS)&&
          (!r.hasFulfills||r.fulfillEntries.some(([k,n])=>n>0&&unmet[k]>EPS)));
        if(!active.length)break;
        const rates={},benefits={};for(const r of active){
          for(const [k,n]of r.rateEntries)rates[k]=(rates[k]||0)+n*r.weight;
          for(const [k,n]of r.fulfillEntries)benefits[k]=(benefits[k]||0)+n*r.weight;
        }
        const rateEntries=Object.entries(rates),benefitEntries=Object.entries(benefits);
        let step=Infinity;for(const r of active)step=Math.min(step,(r.need-r.amount)/r.weight);
        for(const [k,n]of rateEntries)if(n>0)step=Math.min(step,left[k]/n);
        // Nutrient needs are independent stopping conditions. A mixed source
        // may continue for unmet M after E is full (or vice versa); surplus
        // byproducts are accounted for at transfer, never used as new capacity.
        for(const [k,n]of benefitEntries)if(n>0&&unmet[k]>EPS)step=Math.min(step,unmet[k]/n);
        if(!(step>0)||!Number.isFinite(step))break;
        for(const r of active)r.amount=Math.min(r.need,r.amount+step*r.weight);
        for(const [k,n]of rateEntries)left[k]=Math.max(0,left[k]-step*n);
        for(const [k,n]of benefitEntries)unmet[k]=Math.max(0,unmet[k]-step*n);
      }
      const grants=new Map(rows.map(r=>[r.id,down(r.amount)])),remaining={...stocks};
      for(const r of rows)for(const [k,n]of r.rateEntries)remaining[k]-=n*grants.get(r.id);
      for(const k of Object.keys(remaining))remaining[k]=Q(Math.max(0,remaining[k]));
      return {grants,remaining};
    }
    function activity(w,cell){
      const p=w.cellProfiles.profiles[cell];
      if(!Number.isFinite(p.fungalTemperature)||!Number.isFinite(p.fungalPH))throw Error("CELL_DECOMPOSITION_PROFILE_INVALID");
      if(p.waterCapacity===null||p.mineralCapacity===null||w.cellState.water[cell]===null)throw Error("CELL_AQUATIC_PROFILE_UNRESOLVED");
      return Math.max(0,p.fungalTemperature*p.fungalPH*Math.min(1,w.cellState.water[cell]/Math.max(EPS,p.waterCapacity*.5))*p.soilQuality);
    }
    function maintenanceCost(w,o){
      const cost=S.CellLife.upkeep(o);
      if(o.cellLife.kind==="group")cost.E=Q(cost.E*(1+.05*S.clamp(w.cellState.decayLoad[o.cell]||0,0,1)));
      return cost;
    }
    function equivalent(s){
      return s.body>0?s.body:Math.max(s.E*s.units,s.M*s.units/.02);
    }
    function payloads(w,ctx){
      requireWorld(w);if(ctx.cellPayloadsAt===w.turn)return;ctx.cellPayloadsAt=w.turn;
      for(const a of w.carcasses)if(a.infection&&a.payloadExpires!==null&&Number.isFinite(a.payloadExpires)&&a.payloadExpires<=w.turn){
        if(!ctx.primaryHooks?.expireCarrier?.(w,ctx,a))S.loseInfection(w,a.infection);a.infection=null;
      }
    }
    function remains(w,o,ctx){
      requireWorld(w);
      const id="c:"+o.id+":"+w.turn,existing=w.carcasses.find(a=>a.id===id);if(existing)return existing;
      if(!o.groupRemains)ctx.informationHooks?.informationDeath(w,ctx,o,{cell:o.cell});
      const E=Q(o.E+o.B),M=Q(o.M+(o.cellMatter?.bodyM||0)),body=o.B;
      const a={id,species:o.species,slot:o.slot,cell:o.cell,tag:S.spec(o).tag,q:Math.max(.000001,body,E,M/.02),
        ...(S.SoilMatter.enabled(w)?{sourceClass:S.SoilMatter.typeOf(o),trophic:S.CurrentEcology.portion(w,o,E)}:{}),
        E,M,G:body,created:w.turn,availableAt:w.turn+1,expires:null,infection:null,payloadExpires:null,appearance:deathAppearance(w,o)};
      if(ctx.primaryHooks){
        a.expires=Number.MAX_SAFE_INTEGER;
        try{ctx.primaryHooks.hostDeath(w,ctx,o,a);}finally{a.expires=null;}
      }
      else if(o.infection){
        // Preserve the existing unconnected carrier instead of inventing a new
        // viable infection window. CR06 resolves these finite holders.
        const carrier={id:"cell-host-remains/"+o.id+"/"+w.turn,kind:"cell-host-remains",cell:o.cell,created:w.turn,availableAt:w.turn+1,infection:o.infection};
        carrier.infection.hostId=carrier.id;w.pending.push(carrier);
      }
      o.infection=null;o.E=0;o.M=0;o.B=0;o.HP=0;
      if(o.cellMatter){o.cellMatter.bodyM=0;o.cellMatter.newB=0;o.cellMatter.newEdibleB=0;}
      w.carcasses.push(a);return a;
    }
    function recordCapture(w,ctx,source,row,actors){
      if(row.created!==w.turn||row.cell!==source.cell)throw Error("CELL_CAPTURE_INVALID");
      const m=ctx.current||S.maps(w),eligible=[];
      for(const id of actors){
        const o=m.byId.get(id);if(!o||o.HP<=0||!ctx.old.has(id)||o.cell!==source.cell||S.spec(o).group!=="main"||o.species===source.species)continue;
        if(isRyouki(w,o)&&S.spec(source).group!=="prey"||S.spec(o).id==="kelp"&&S.spec(source).group==="main")continue;
        eligible.push(o.id);
      }
      if(!eligible.length)return;
      const captures=ctx.cellCaptures??=new Map();let entry=captures.get(row.id);
      if(!entry){entry={row,sourceId:source.id,actors:new Set()};captures.set(row.id,entry);}
      for(const id of eligible){entry.actors.add(id);const byActor=ctx.cellCaptureByActor??=new Map();if(!byActor.has(id))byActor.set(id,[]);if(!byActor.get(id).includes(row.id))byActor.get(id).push(row.id);}
    }
    function combatCapture(w,ctx,source,row){
      recordCapture(w,ctx,source,row,(ctx.cellCombatSources?.get(source.id)||[]).filter(h=>h.damage>0).map(h=>h.id));
    }
    function resolveDeaths(w,ctx){
      ready(w,ctx);if(ctx.cellDeathsResolved)return;ctx.cellDeathsResolved=true;
      groupDamage(w,ctx,"combat");
      for(const o of w.organisms)if(o.HP<=0&&(o.E>0||o.B>0||o.M>0||o.infection)){
        const row=remains(w,o,ctx);combatCapture(w,ctx,o,row);ctx.deaths.push({id:o.id,species:o.species,reason:"combat"});
      }
      w.organisms=w.organisms.filter(o=>o.HP>0);ctx.current=S.maps(w);
    }
    function predation(w,ctx){
      ready(w,ctx);if(!ctx.cellMotion?.completed||!ctx.cellDeathsResolved)throw Error("CELL_PREDATION_BEFORE_DEATHS");
      if(ctx.cellResources.acquired||ctx.cellResources.budgetSettled||ctx.cellLifeDone)throw Error("CELL_PREDATION_AFTER_ACQUISITION");
      if(ctx.cellPredationDone)throw Error("CELL_PREDATION_ALREADY_APPLIED");ctx.cellPredationDone=true;
      const m=ctx.current||S.maps(w),qCells=new Map();
      for(const q of w.searchQ||[])if(S.HyperParasite?.is(q)&&q.phase===4&&q.hyper.state==="adult"&&q.bornAt<w.turn&&q.hyper.detachedAt<w.turn){
        if(!qCells.has(q.cell))qCells.set(q.cell,[]);qCells.get(q.cell).push(q);
      }
      const order=w.organisms.filter(o=>{
        if(o.HP<=0||!ctx.old.has(o.id)||S.spec(o).group!=="main"||(S.D.diets[S.spec(o).diet]?.hunt??-1)<0||ctx.cellCaptureByActor?.get(o.id)?.length)return false;
        const p=ctx.traits.get(o.id);return (o.E<p.capE-EPS||o.M<p.capM-EPS)&&
          ((m.cellSpace.get(o.cell)?.[3]||[]).some(a=>a.HP>0&&ctx.old.has(a.id))||o.E<p.capE-EPS&&!isRyouki(w,o)&&(qCells.get(o.cell)||[]).some(q=>q.E+q.B>0));
      }).map(o=>({o,h:S.hash(w,"cell/capture",w.turn,o.id)})).sort((a,b)=>a.h-b.h||S.compare(a.o.id,b.o.id));
      let changed=false;
      for(const {o}of order){
        const choices=[],rows=m.cellSpace.get(o.cell);
        // Compare real local food with live prey using the existing food
        // preference. This local view never reads a remote tile's stock.
        for(const a of [...(rows?.[1]||[]),...(rows?.[2]||[]),...(rows?.[5]||[]),...(rows?.[4]||[]).filter(a=>S.spec(a).group==="plant")]){
          const group=S.spec(a).group;if(a.HP<=0||!ctx.old.has(a.id)||!(S.edibleB(a)>0)||S.spec(o).id==="kelp"||isRyouki(w,o)&&group!=="plant")continue;
          const hidden=a.cellMatter?.tissueAt===w.turn?a.cellMatter.newEdibleB??a.cellMatter.newB??0:0;
          if(S.edibleB(a)>hidden)choices.push({type:"plant",id:a.id,obj:a,cell:a.cell,tag:S.spec(a).tag,healing:1,amount:(S.edibleB(a)-hidden)/Math.max(EPS,ctx.traits.get(a.id).capB-(a.cellLife?.baseB||0))});
        }
        for(const a of m.carcasses.get(o.cell)||[])if(a.created<w.turn&&!(a.availableAt>w.turn)&&a.q>0&&(a.E>0||a.M>0)&&a.species!==o.species&&foodAllowed(o,a.tag)&&(!isRyouki(w,o)||S.D.byId[a.species]?.group==="prey"))
          choices.push({type:"carcass",id:a.id,obj:a,cell:a.cell,tag:a.tag,healing:1,amount:a.q/4});
        if(S.SoilMatter.enabled(w))for(const a of m.soil.get(o.cell)||[])if(S.SoilMatter.edible(o,a))
          choices.push({type:"carcass",id:a.id,obj:a,cell:a.cell,tag:a.tag,healing:1,amount:Math.min(1,a.E/4)*(a.depositedAt===undefined?.5:1)});
        for(const a of m.resources.get(o.cell)||[]){
          const f=S.FOOD[a.kind];if(!["plant","fungal","animal","mineral"].includes(f?.tag)||!foodAllowed(o,f.tag)||a.q<=0||!(a.E>0||a.M>0)||a.created>=w.turn||a.availableAt>w.turn||a.expires!==null&&a.expires!==undefined&&a.expires<=w.turn||isRyouki(w,o)&&f.tag!=="mineral")continue;
          choices.push({type:"resource",id:"r:"+a.cell+":"+a.kind,obj:a,cell:a.cell,tag:f.tag,healing:f.healing||1,amount:a.q/f.cap});
        }
        for(const a of rows?.[3]||[])if(a.HP>0&&ctx.old.has(a.id)&&S.ConsumerGroup.count(a)>0&&a.B>0)
          choices.push({type:"live",id:a.id,obj:a,cell:a.cell,tag:"animal",healing:1,amount:a.B/Math.max(EPS,ctx.traits.get(a.id).capB)});
        if(!isRyouki(w,o)&&o.E<ctx.traits.get(o.id).capE-EPS)for(const q of qCells.get(o.cell)||[])if(q.E+q.B>0)
          choices.push({type:"hyper",id:q.id,obj:q,cell:q.cell,tag:"animal",healing:1,amount:Math.min(1,q.E+q.B)});
        const intent=ctx.intents.get(o.id),chosen=(intent?.type==="harvest"?choices.find(a=>a.id===intent.target):null)||chooseSource(w,o,choices,ctx);
        if(chosen?.type==="live"){
          const target=chosen.obj;if(target.HP<=0||!S.ConsumerGroup.count(target))continue;
          const row=groupLoss(w,target,1,"harvest",ctx);if(!row)continue;changed=true;recordCapture(w,ctx,target,row,[o.id]);
          if(target.HP>0)ctx.traits.set(target.id,S.phenotype(w,target,ctx.traits.get(target.id).phase));
        }else if(chosen?.type==="hyper"){
          const q=chosen.obj;if(ctx.hyperHooks.hyperEvade(w,ctx,q,o))continue;
          ctx.informationHooks?.informationDeath(w,ctx,q,{cell:q.cell});
          const body={...q,slot:"free",M:0,HP:0,sex:null,role:null,branch3:null,branch4:null,facing:0,dna:{},infection:null,cellMatter:{bodyM:0},groupRemains:true},row=remains(w,body,ctx);
          q.E=0;q.B=0;ctx.hyperHooks.hyperAdultDeath(w,ctx,q,"predation");changed=true;recordCapture(w,ctx,q,row,[o.id]);
        }
      }
      if(changed){w.organisms=w.organisms.filter(o=>o.HP>0);ctx.current=S.maps(w);}
    }
    function background(w,ctx){
      const state=ready(w,ctx);if(S.SoilMatter.enabled(w))return S.SoilMatter.background(w,ctx,activity);if(!ctx.cellLifeDone)throw Error("CELL_BACKGROUND_BEFORE_LIFE");
      if(w.cellState.backgroundTurn>=w.turn||ctx.cellBackground)throw Error("CELL_BACKGROUND_ALREADY_APPLIED");
      const rows=[...w.cellState.organic.map(row=>({row,bodyKey:"B"})),...w.carcasses.filter(row=>row.created<w.turn&&!(row.availableAt>w.turn)).map(row=>({row,bodyKey:"G"}))];
      const factors=new Map(),room=new Map(),pending=new Map();
      for(const r of w.cellState.nextMaterial)if(r.kind==="mineral")pending.set(r.cell,(pending.get(r.cell)||0)+r.M);
      // Preflight unresolved profiles before any decomposition transfer.
      for(const {row}of rows)if((row.E>0||row.M>0)&&!factors.has(row.cell)){
        factors.set(row.cell,activity(w,row.cell));
        const reserved=pending.get(row.cell)||0;
        room.set(row.cell,Math.max(0,w.cellProfiles.profiles[row.cell].mineralCapacity-w.tiles[row.cell].soilM-reserved));
      }
      const mineralGrants=new Map(),localRows=new Map();
      for(const entry of rows)if(factors.has(entry.row.cell)){
        if(!localRows.has(entry.row.cell))localRows.set(entry.row.cell,[]);localRows.get(entry.row.cell).push(entry);
      }
      for(const [cell,entries]of localRows){
        const result=allocate({capacity:room.get(cell)},entries.map(({row,bodyKey})=>({id:bodyKey+"/"+row.id,need:down(row.M*Math.min(1,.001*factors.get(cell))),rates:{capacity:1}})));
        for(const [id,grant]of result.grants)mineralGrants.set(id,grant);
      }
      const flow={E:0,M:0,B:0},loads=new Map();
      for(const {row,bodyKey}of rows){
        if(!factors.has(row.cell))continue;
        const fraction=Math.min(1,.001*factors.get(row.cell)),E=down(row.E*fraction),B=down((row[bodyKey]||0)*fraction),M=mineralGrants.get(bodyKey+"/"+row.id)||0;
        row.E=Q(row.E-E);row.M=Q(row.M-M);row[bodyKey]=Q(Math.max(0,(row[bodyKey]||0)-B));room.set(row.cell,Q(room.get(row.cell)-M));
        if(bodyKey==="G"&&row.q>0)row.q=Math.max(.000001,Q(row.q*(1-fraction)));
        S.dissipate(w,E);S.CellSpace.deferMaterial(w,row.cell,{M,kind:"mineral"});
        flow.E=Q(flow.E+E);flow.M=Q(flow.M+M);flow.B=Q(flow.B+B);
        loads.set(row.cell,(loads.get(row.cell)||0)+row.E*factors.get(row.cell));
      }
      w.cellState.decayLoad=w.cellState.decayLoad.map((_,cell)=>Q(S.clamp(((loads.get(cell)||0)-40)/160,0,1)));
      w.cellState.organic=w.cellState.organic.filter(r=>r.E>0||r.M>0||r.B>0);
      w.carcasses=w.carcasses.filter(r=>r.E>0||r.M>0||r.G>0||r.infection);
      w.cellState.backgroundTurn=w.turn;ctx.cellBackground=flow;state.background=flow;return flow;
    }
    function organic(w,cell,E,M,B=0,sourceClass="detritus",trophic=null){
      if(S.SoilMatter.enabled(w))return S.SoilMatter.organic(w,cell,E,M,B,sourceClass,trophic);
      const rows=w.cellState.organic,id="cell-organic/"+cell;let row=rows.find(a=>a.id===id);
      if(!row){row={id,cell,E:0,M:0,B:0};rows.push(row);}
      row.E=Q(row.E+E);row.M=Q(row.M+M);row.B=Q(row.B+B);
    }
    function begin(w,ctx){
      requireWorld(w);const a=w.cellState;
      payloads(w,ctx);
      if(S.SoilMatter.enabled(w))S.SoilMatter.advance(w);
      if(a.resourceTurn>=w.turn||ctx.cellResources)throw Error("CELL_RESOURCES_ALREADY_APPLIED");
      if(a.nextMaterial.some(r=>r.availableAt<w.turn))throw Error("CELL_MATERIAL_OVERDUE");
      const flow={waterInput:0,waterDrain:0,waterEvaporation:0,mineralInput:0,returnedM:0,solar:0};
      for(const row of a.nextMaterial)if(row.availableAt===w.turn){
        if(row.kind==="mineral"){
          const cap=w.cellProfiles.profiles[row.cell].mineralCapacity,t=w.tiles[row.cell],add=cap===null?0:Math.min(row.M,Math.max(0,cap-t.soilM));
          t.soilM=Q(t.soilM+add);flow.returnedM=Q(flow.returnedM+add);
          if(row.M>add){if(S.SoilMatter.enabled(w))S.SoilMatter.wait(w,row.cell,Q(row.M-add));else organic(w,row.cell,0,Q(row.M-add));}
        }else organic(w,row.cell,row.E,row.M,row.B||0,row.sourceClass,row.trophic);
      }
      a.nextMaterial=a.nextMaterial.filter(r=>r.availableAt>w.turn);
      if(S.SoilMatter.enabled(w))flow.returnedM=Q(flow.returnedM+S.SoilMatter.release(w));
      for(let cell=0;cell<w.tiles.length;cell++){
        const p=w.cellProfiles.profiles[cell];if(p.waterCapacity===null)continue;
        const waterInput=p.waterInput??p.rain,total=Q(a.water[cell]+waterInput),drain=Q(Math.max(0,total-p.waterCapacity)),held=Q(total-drain),evaporated=Q(Math.min(held,p.evaporation));
        a.water[cell]=Q(held-evaporated);flow.waterInput=Q(flow.waterInput+waterInput);flow.waterDrain=Q(flow.waterDrain+drain);flow.waterEvaporation=Q(flow.waterEvaporation+evaporated);
        const input=p.mineralInput,add=Q(Math.min(input,Math.max(0,p.mineralCapacity-w.tiles[cell].soilM)));
        w.tiles[cell].soilM=Q(w.tiles[cell].soilM+add);if(input>add){if(S.SoilMatter.enabled(w))S.SoilMatter.wait(w,cell,Q(input-add));else organic(w,cell,0,Q(input-add));}flow.mineralInput=Q(flow.mineralInput+input);
      }
      w.ledger.cellInputM=Q((w.ledger.cellInputM||0)+flow.mineralInput);a.resourceTurn=w.turn;
      ctx.cellResources={version:VERSION,turn:w.turn,flow,acquired:false,receipts:[],light:[],budgets:new Map()};
      return ctx.cellResources;
    }
    function prepare(w,ctx){
      const state=begin(w,ctx);
      for(const o of w.organisms)if(o.cellMatter&&o.cellMatter.tissueAt<w.turn){o.cellMatter.newB=0;o.cellMatter.newEdibleB=0;}
      ctx.cellFloatingPresent=false;
      for(const o of w.organisms){if(o.species==="freshwaterlight"&&S.LargePlant.is(o)){S.LargePlant.reset(w,o);ctx.cellFloatingPresent=true;}
        const p=ctx.traits.get(o.id),base=S.CellLife.is(o)?maintenanceCost(w,o).E:p.maintenance*(S.spec(o).group==="main"?1+.05*S.clamp(w.cellState.decayLoad[o.cell]||0,0,1):1)*S.adjustment(w,o,"maintenance",w.tiles[o.cell].env,p.phase)/(1+S.trait(o,"maintenance",p.phase));
        ctx.costs.set(o.id,{action:0,base,density:0,neighborCount:0,budget:Q(Math.max(0,o.E-base))});}
      return state;
    }
    function ready(w,ctx){
      requireWorld(w);if(ctx.cellResources?.turn!==w.turn||w.cellState.resourceTurn!==w.turn)throw Error("CELL_RESOURCES_NOT_PREPARED");return ctx.cellResources;
    }
    function captureLight(w,ctx,canopies,m){
      const grouped=new Map(),seen=new Set(),result=new Map();
      for(const r of canopies){
        const o=m.byId.get(r.actor);
        if(!o||o.HP<=0||!ctx.old.has(o.id)||seen.has(o.id)||![r.height,r.area,r.capture].every(finite)||
          !(S.spec(o).group==="plant"||o.species==="kelp"))throw Error("CELL_CANOPY_INVALID");
        seen.add(o.id);if(!grouped.has(o.cell))grouped.set(o.cell,[]);grouped.get(o.cell).push({...r,id:o.id});
      }
      for(const [cell,rows]of grouped){
        let left=w.cellProfiles.profiles[cell].lightBudget;
        const heights=[...new Set(rows.map(r=>r.height))].sort((a,b)=>b-a);
        for(const h of heights){
          const band=rows.filter(r=>r.height===h),shares=allocate({light:left},band.map(r=>({id:r.id,need:r.area>0?r.capture:0,ability:r.capture>0?r.area/r.capture:0,rates:{light:1}})));
          for(const r of band)result.set(r.id,shares.grants.get(r.id));left=shares.remaining.light;
        }
      }
      return result;
    }
    const resourceId=(row,i)=>row.id??("resource/"+i+"/"+row.cell+"/"+row.kind);
    function indexSources(w,m,ctx){
      m.cellSources={carcass:new Map(w.carcasses.map(a=>[a.id,a])),organic:new Map(w.cellState.organic.map(a=>[a.id,a])),capture:ctx.cellCaptures||new Map(),resource:new Map(),resourcesByCell:new Map()};
      if(S.SoilMatter.enabled(w)){m.cellSources.residue=new Map(w.cellState.soil.fresh.map(r=>[r.id,r]));m.cellSources.soilByCell=S.SoilMatter.index(w);}
      for(const [i,row]of w.resources.entries()){
        const id=resourceId(row,i);m.cellSources.resource.set(id,row);
        if(!m.cellSources.resourcesByCell.has(row.cell))m.cellSources.resourcesByCell.set(row.cell,[]);m.cellSources.resourcesByCell.get(row.cell).push({kind:"resource",id});
      }
    }
    function source(w,m,request){
      const key=request.source?.kind,id=request.source?.id;
      let row=key==="organism"?m.byId.get(id):key==="carcass"?(m.cellSources?.carcass?.get(id)??w.carcasses.find(a=>a.id===id)):key==="organic"?(m.cellSources?.organic?.get(id)??w.cellState.organic.find(a=>a.id===id)):key==="resource"?m.cellSources?.resource?.get(id):key==="residue"?m.cellSources?.residue?.get(id):null;
      if(key==="capture"){
        const entry=m.cellSources?.capture.get(id);if(!entry?.actors.has(request.actor)||entry.row.created!==w.turn)return null;row=entry.row;
      }
      if(!row)return null;
      if(key==="organism"){
        const group=S.spec(row).group;if(row.HP<=0||!["plant","fungus"].includes(group))return null;
        const hidden=row.cellMatter?.tissueAt===w.turn?(row.cellMatter.newEdibleB??row.cellMatter.newB)||0:0;
        return {row,key,id,cell:row.cell,units:Math.max(0,S.edibleB(row)-hidden)*(S.CellLife.is(row)||S.LargePlant.is(row)?S.phenotype(w,row).biteFactor:1),E:1,M:(row.cellMatter?.bodyM||0)/Math.max(EPS,row.B),tag:group==="plant"?"plant":"fungal",...(S.CurrentEcology.enabled(w)?{trophic:S.CurrentEcology.parts(w,row)}:{})};
      }
      if(key!=="capture"&&(row.availableAt>w.turn||row.created>=w.turn||row.depositedAt>=w.turn))return null;
      if(key==="resource"){
        const tag=S.FOOD[row.kind]?.tag;if(!["plant","fungal","animal","mineral"].includes(tag)||row.expires!==null&&row.expires!==undefined&&row.expires<=w.turn||!(row.q>0))return null;
        return {row,key,id,cell:row.cell,units:row.q,body:0,E:row.E/row.q,M:row.M/row.q,tag,...(S.CurrentEcology.enabled(w)?{trophic:row.trophic?.slice()??S.CurrentEcology.parts(w,row)}:{})};
      }
      const units=["carcass","capture"].includes(key)?(row.q||0):row.E||row.M;
      if(units<=0)return null;
      return {row,key,id,cell:row.cell,units,body:row.G??row.B??0,E:(row.E||0)/units,M:(row.M||0)/units,tag:row.tag||S.D.byId[row.species]?.tag||"animal",...(S.CurrentEcology.enabled(w)?{trophic:row.trophic?.slice()??S.CurrentEcology.parts(w,row)}:{}),...(S.SoilMatter.enabled(w)&&["residue","organic"].includes(key)?{assimilation:key==="organic"?.5:1}:{} )};
    }
    function acquire(w,ctx,requests,canopies=[]){
      const state=ready(w,ctx);if(state.acquired||state.budgetSettled)throw Error("CELL_RESOURCES_ALREADY_ACQUIRED");
      if(!ctx.cellMotion?.completed)throw Error("CELL_RESOURCES_BEFORE_MOVEMENT");
      if([...ctx.costs.values()].some(c=>c.action>0))throw Error("CELL_ACTIONS_UNPAID");
      const m=ctx.current||S.maps(w);indexSources(w,m,ctx);
      const captured=captureLight(w,ctx,canopies,m),stocks={},demands={},compiled=[],seen=new Set(),actors=new Map(),sources=new Map();
      const pool=(key,amount)=>{if(!Object.hasOwn(stocks,key))stocks[key]=amount;return key;};
      const demand=(key,amount)=>{if(!Object.hasOwn(demands,key))demands[key]=amount;return key;};
      // Compilation does not transfer stock. Reuse these snapshots only in
      // this acquisition; captures retain their actor-specific authorization.
      const compiledSource=request=>{
        const kind=request.source?.kind,id=request.source?.id;
        if(kind==="capture")return source(w,m,request);
        let rows=sources.get(kind);if(!rows){rows=new Map();sources.set(kind,rows);}
        if(rows.has(id))return rows.get(id);
        const value=source(w,m,request);
        if(value){value.poolKey="source/"+value.key+"/"+value.id;rows.set(id,value);}
        return value;
      };
      for(const r of requests){
        const o=m.byId.get(r.actor)||ctx.cellQActors?.get(r.actor),p=o&&ctx.traits.get(o.id),profile=o&&w.cellProfiles.profiles[o.cell],adult=ctx.cellQActors?.has(r.actor);
        if(!o||o.HP<=0||!ctx.old.has(o.id)||typeof r.id!=="string"||seen.has(r.id)||!finite(r.need)||
          ![r.ability??1,r.reach??1,r.limit??r.need].every(finite)||!["photo","mineral","food","decompose"].includes(r.kind))throw Error("CELL_REQUEST_INVALID");
        seen.add(r.id);let need=Math.min(r.need,r.limit??r.need),rates={},fulfills,s=null,eta=1,etaM=1;
        let actor=actors.get(o.id);
        if(!actor){
          actor={eCap:pool("capE/"+o.id,Q(Math.max(0,p.capE-o.E))),mCap:pool("capM/"+o.id,Q(Math.max(0,p.capM-(o.M||0)))),
            eDemand:"E/"+o.id,mDemand:"M/"+o.id,processKey:"process/"+o.id,biteKey:"bite/"+o.id};
          actors.set(o.id,actor);
        }
        const {eCap,mCap}=actor;
        if(r.kind==="mineral"){
          if(profile.mineralCapacity===null)throw Error("CELL_AQUATIC_PROFILE_UNRESOLVED");
          const plant=S.spec(o).group==="plant",factor=plant?Math.min(profile.plantTemperature,profile.plantPH):S.CellLife.is(o)&&o.cellLife.kind==="fungus"?activity(w,o.cell)/profile.soilQuality:1;
          need=Math.min(r.need,(r.limit??r.need)*profile.soilQuality*factor);
          rates[pool("mineral/"+o.cell,w.tiles[o.cell].soilM)]=1;rates[mCap]=1;
          if(S.CellLife.is(o)&&o.cellLife.kind==="fungus")fulfills={[demand(actor.mDemand,Math.max(0,p.capM-o.M))]:1};
        }else if(r.kind==="photo"){
          if(!captured.has(o.id))throw Error("CELL_CANOPY_MISSING");
          if(profile.waterCapacity===null)throw Error("CELL_AQUATIC_PROFILE_UNRESOLVED");
          need=Math.min(need,captured.get(o.id)*Math.min(profile.plantTemperature,profile.plantPH));
          rates[pool("light/"+o.id,captured.get(o.id))]=1;rates[pool("water/"+o.cell,w.cellState.water[o.cell])]=1/2.6;rates[eCap]=1;
          fulfills={[demand(actor.eDemand,Math.max(0,p.capE-o.E))]:1};
        }else if(r.kind==="decompose"){
          s=compiledSource(r);
          if(!S.CellLife.is(o)||o.cellLife.kind!=="fungus"||!s||s.key==="organism"||s.cell!==o.cell)throw Error("CELL_DECOMPOSITION_SOURCE_INVALID");
          const body=equivalent(s),rate=body/Math.max(EPS,s.units);
          let process=actor.process;
          if(process===undefined){
            const eligible=Math.max(0,o.B-(o.cellMatter?.tissueAt===w.turn?o.cellMatter.newB||0:0));
            process=eligible/4*activity(w,o.cell);actor.process=process;
          }
          if(!(rate>0))throw Error("CELL_DECOMPOSITION_UNITS");
          rates[pool(s.poolKey??("source/"+s.key+"/"+s.id),s.units)]=1;
          rates[pool(actor.processKey,process)]=rate;
          fulfills={[demand(actor.eDemand,Math.max(0,p.capE-o.E))]:s.E*.5,[demand(actor.mDemand,Math.max(0,p.capM-o.M))]:s.M};
          rates[pool("water/"+o.cell,w.cellState.water[o.cell])]=rate*.05;eta=.5;etaM=1;
        }else{
          s=compiledSource(r);
          if(!s||s.cell!==o.cell||s.row.id===o.id||S.spec(o).group==="plant"||(S.spec(o).group==="fungus"&&s.key==="organism"))throw Error("CELL_FOOD_SOURCE_INVALID");
          eta=adult?S.HyperParasite.settings(w).adultAssimilation:efficiency(o,s.tag,p.phase);etaM=adult?0:S.CellLife.is(o)&&o.cellLife.kind==="group"?.65:efficiency(o,"mineral",p.phase);if(S.SoilMatter.enabled(w)&&["residue","organic"].includes(s.key)){if(!S.SoilMatter.edible(o,s.row))throw Error("CELL_FOOD_DIET_INVALID");eta*=s.assimilation;etaM*=s.assimilation;}if(!(eta>0)||!foodAllowed(o,s.tag)||adult&&!["plant","fungal","animal"].includes(s.tag))throw Error("CELL_FOOD_DIET_INVALID");
          rates[pool(s.poolKey??("source/"+s.key+"/"+s.id),s.units)]=1;
          fulfills={[demand(actor.eDemand,Math.max(0,p.capE-o.E))]:s.E*eta,[demand(actor.mDemand,Math.max(0,p.capM-(o.M||0)))]:s.M*etaM};
          const bite=ctx.cellFoodLimits?.get(o.id)??(S.spec(o).group==="prey"?.25*S.ConsumerGroup.count(o):isRyouki(w,o)?(o.ryouki.mutated?w.config.ryoukiSettings.mutatedBiteB:w.config.ryoukiSettings.biteB):2);
          rates[pool(actor.biteKey,adult?S.HyperParasite.settings(w).adultFoodCap:bite)]=adult?s.E:["organism","resource"].includes(s.key)?1:equivalent(s)/Math.max(EPS,s.units);
        }
        compiled.push({...r,o,p,s,eta,etaM,need,rates,fulfills});
      }
      const allocations={grants:new Map()},byCell=new Map();
      for(const r of compiled){if(!byCell.has(r.o.cell))byCell.set(r.o.cell,[]);byCell.get(r.o.cell).push(r);}
      for(const rows of byCell.values()){
        const local={},localDemands={};for(const r of rows){
          for(const k of Object.keys(r.rates))local[k]=stocks[k];
          for(const k of Object.keys(r.fulfills||{}))localDemands[k]=demands[k];
        }
        for(const [id,grant]of allocate(local,rows,localDemands).grants)allocations.grants.set(id,grant);
      }
      const lightByActor=new Map();
      state.acquired=true;state.light=[...captured].map(([actor,captured])=>{
        if(m.byId.get(actor)?.species==="freshwaterlight")ctx.records.get(actor).solarOpportunityE=captured;
        const row={actor,captured,used:0};lightByActor.set(actor,row);return row;
      });
      const waterUse=new Map();for(const r of compiled)if(r.kind==="photo"||r.kind==="decompose")waterUse.set(r.o.cell,(waterUse.get(r.o.cell)||0)+allocations.grants.get(r.id)*(r.kind==="photo"?1/2.6:equivalent(r.s)/r.s.units*.05));
      state.flow.waterUse=0;for(const [cell,amount]of waterUse){
        const debit=Math.min(w.cellState.water[cell],Math.ceil(Math.max(0,amount-1e-12)*1e6)/1e6);
        w.cellState.water[cell]=Q(w.cellState.water[cell]-debit);state.flow.waterUse=Q(state.flow.waterUse+debit);
      }
      // Commit the allocated pure-E input first. Mixed food may still be
      // required for M and shed surplus E; it must not displace paid-for light.
      for(const r of compiled.slice().sort((a,b)=>(b.kind==="photo")-(a.kind==="photo")||S.compare(a.id,b.id))){
        const quantity=allocations.grants.get(r.id);if(!quantity)continue;const {o,p,s}=r;let rawE=0,rawM=0,harvest=null;
        if(r.kind==="mineral"){
          rawM=quantity;w.tiles[o.cell].soilM=Q(w.tiles[o.cell].soilM-rawM);
        }else if(r.kind==="photo"){
          rawE=quantity;
          state.flow.solar=Q(state.flow.solar+quantity);w.ledger.solar=Q(w.ledger.solar+quantity);
          lightByActor.get(o.id).used=quantity;
        }else{
          if(r.kind==="food"){
            const before=s.key==="organism"?Math.max(0,S.edibleB(s.row)-(s.row.cellMatter?.tissueAt===w.turn?s.row.cellMatter.newEdibleB??s.row.cellMatter.newB??0:0)):["carcass","capture","resource"].includes(s.key)?s.row.q:s.row.E||s.row.M;
            harvest={fraction:Math.min(1,quantity/Math.max(EPS,before)),beforeEdibleB:before,consumedB:s.key==="organism"?quantity:s.body*quantity/s.units,beforeQ:before};
          }
          rawE=down(quantity*s.E);rawM=down(Math.min(s.key==="organism"?(s.row.cellMatter?.bodyM||0):s.row.M||0,quantity*s.M));
          if(s.key==="organism"){
            s.row.B=Q(s.row.B-quantity);if(s.row.cellMatter)s.row.cellMatter.bodyM=Q(s.row.cellMatter.bodyM-rawM);
            if(S.CellLife.is(s.row))s.row.cellLife.leafDebt=Q((s.row.cellLife.leafDebt||0)+quantity);
            if(!S.CellLife.is(s.row)&&S.Colony.is(s.row))S.Colony.consumed(w,s.row,quantity);
            if(!S.CellLife.is(s.row)&&S.LargePlant.is(s.row))S.LargePlant.consumed(w,s.row,quantity);
            if(S.FungalColony.is(s.row))S.FungalColony.increment(s.row,"consumedB",quantity);
          }else{
            const fraction=quantity/s.units;s.row.E=Q(s.row.E-rawE);s.row.M=Q(s.row.M-rawM);
            if(["carcass","capture"].includes(s.key)){s.row.q=Q(s.row.q-quantity);s.row.G=Q(Math.max(0,(s.row.G||0)-s.body*fraction));}
            else if(s.key==="resource"){s.row.q=Q(s.row.q-quantity);s.row.G=Q(Math.max(0,(s.row.G||0)*(1-fraction)));}
            // B is the tissue component already included in E. Separate
            // rounded shares must not leave a body label after E is consumed.
            else s.row.B=Math.min(s.row.E,Q(Math.max(0,(s.row.B||0)-s.body*fraction)));
            if(S.SoilMatter.enabled(w)&&["residue","organic"].includes(s.key))S.SoilMatter.reweight(s.row);
            if(["carcass","capture","resource"].includes(s.key)&&s.row.q<=0&&(s.row.E>0||s.row.M>0)){
              S.CellSpace.deferMaterial(w,s.cell,{E:s.row.E,M:s.row.M,B:Math.min(s.row.E,s.row.G||0),...(S.CurrentEcology.enabled(w)?{sourceClass:s.row.sourceClass??"detritus",trophic:s.trophic}:{})});s.row.E=0;s.row.M=0;s.row.G=0;
            }
          }
        }
        const E=Q(Math.min(Math.max(0,p.capE-o.E),rawE*r.eta)),M=Q(Math.min(Math.max(0,p.capM-(o.M||0)),rawM*r.etaM));
        o.E=Q(o.E+E);if(!ctx.cellQActors?.has(o.id))o.M=Q(o.M+M);
        if(S.CurrentEcology.enabled(w))S.CurrentEcology.receive(w,o,E,s?.trophic,{light:r.kind==="photo"});
        if(r.kind==="decompose"){S.dissipate(w,Q(rawE-E));S.CellSpace.deferMaterial(w,o.cell,{M:Q(rawM-M),kind:"mineral"});}
        else if(rawE>E||rawM>M)S.CellSpace.deferMaterial(w,o.cell,{E:Q(rawE-E),M:Q(rawM-M),...(S.SoilMatter.enabled(w)?{sourceClass:s?.row.sourceClass??"detritus",trophic:s?.trophic}:{} )});
        state.receipts.push({id:r.id,actor:o.id,cell:o.cell,kind:r.kind,quantity,E,M,source:s?.id??null});
        const record=ctx.records.get(o.id);if(r.kind==="photo"){record.light=Q(record.light+E);if(o.species==="freshwaterlight"&&S.LargePlant.is(o)){o.plant.last.solarInputE=Q(o.plant.last.solarInputE+E);S.LargePlant.flow(w,o,"solarInputE",E);}if(E>0)S.record(ctx,o,"light",{amount:E});}if(r.kind==="food"||r.kind==="decompose")record.organic=Q(record.organic+E);
        if(ctx.cellQActors?.has(o.id)){o.hyper.last.feedingE=Q((o.hyper.last.feedingE||0)+E);ctx.hyperFlow.bySpecies.hyperparasite.fedE=Q(ctx.hyperFlow.bySpecies.hyperparasite.fedE+E);}
        else if(r.kind==="food"&&S.spec(o).group==="main"&&["plant","fungal","animal"].includes(s.tag)){
          const gain=isRyouki(w,o)?0:Math.min(300-o.G,E*(s.tag==="animal"?1+S.trait(o,"animalG",p.phase):1));o.G=Q(o.G+gain);record.G=Q(record.G+gain);record.reserve=Q(record.reserve+E);
        }
        if(r.kind==="food"||r.kind==="decompose"){
          S.record(ctx,o,"feed",{source:s.id,sourceType:s.key==="capture"?"predation":s.key,sourceSpecies:s.row.species??null,tag:r.kind==="decompose"?"animal":s.tag,amount:rawE,material:rawM,assimilated:E,assimilatedM:M,to:o.cell,consumedB:s.key==="organism"?quantity:s.body*quantity/s.units,
            ...(S.SoilMatter.enabled(w)?{sourceClass:s.row.sourceClass??(s.key==="organism"?S.SoilMatter.typeOf(s.row):"detritus"),sourceTrophic:S.SoilMatter.dose(rawE,s.trophic,s.row.sourceClass),sourceAggregated:["residue","organic"].includes(s.key)}:{})});
          if(harvest&&S.SoilMatter.enabled(w)&&["residue","organic"].includes(s.key)&&!ctx.cellQActors?.has(o.id))S.SoilMatter.harvest(w,ctx,s.row,o,harvest);
          if(harvest&&["organism","carcass","capture"].includes(s.key)&&!ctx.cellQActors?.has(o.id))ctx.primaryHooks?.transfer(w,ctx,s.row,o,s.key==="carcass"?"carcass":s.key==="capture"?"capture":"plant",harvest);
        }
      }
      w.resources=w.resources.filter(row=>row.q>0);
      return state.receipts;
    }
    function lifeDemands(w,ctx){
      ready(w,ctx);if(!ctx.cellMotion?.completed)throw Error("CELL_RESOURCES_BEFORE_MOVEMENT");
      const requests=[],canopies=[],maintenance=new Map(),m=ctx.current||S.maps(w),cells=m.cellSpace||S.CellSpace.index(w),materials=new Map();
      indexSources(w,m,ctx);
      for(const [kind,rows]of [["organic",w.cellState.organic],["carcass",w.carcasses],...(S.SoilMatter.enabled(w)?[["residue",w.cellState.soil.fresh]]:[])])for(const row of rows){
        if(row.created>=w.turn||row.availableAt>w.turn||row.depositedAt>=w.turn||kind==="carcass"&&row.soilRef)continue;
        if(!materials.has(row.cell))materials.set(row.cell,[]);materials.get(row.cell).push({row,kind});
      }
      function food(o,refs){
        const p=ctx.traits.get(o.id),adult=ctx.cellQActors?.has(o.id),e=Math.max(0,p.capE-o.E),mineral=Math.max(0,p.capM-(o.M||0));
        for(const ref of refs){
          const s=source(w,m,{actor:o.id,source:ref});if(!s||s.units<=0||!foodAllowed(o,s.tag))continue;
          const factor=S.SoilMatter.enabled(w)&&["residue","organic"].includes(s.key)?s.assimilation:1;
          if(S.SoilMatter.enabled(w)&&["residue","organic"].includes(s.key)&&!S.SoilMatter.edible(o,s.row))continue;
          const eta=(adult?S.HyperParasite.settings(w).adultAssimilation:efficiency(o,s.tag,p.phase))*factor,etaM=(adult?0:S.CellLife.is(o)&&o.cellLife.kind==="group"?.65:efficiency(o,"mineral",p.phase))*factor;
          if(!(eta>0)||adult&&!["plant","fungal","animal"].includes(s.tag))continue;
          const need=Math.min(s.units,Math.max(s.E*eta>0?e/(s.E*eta):0,s.M*etaM>0?mineral/(s.M*etaM):0));
          if(need>0)requests.push({id:"food/"+o.id+"/"+s.key+"/"+s.id,actor:o.id,kind:"food",need,source:ref});
        }
      }
      const plants=cell=>{const rows=cells.get(cell);return [...(rows?.[1]||[]),...(rows?.[2]||[]),...(rows?.[4]||[]).filter(a=>S.spec(a).group==="plant")];};
      for(const o of w.organisms)if(o.HP>0&&ctx.old.has(o.id)){
        if(!S.CellLife.is(o)){
          if(o.species==="freshwaterlight"&&S.LargePlant.is(o)){
            const p=ctx.traits.get(o.id),leaves=Math.max(0,S.edibleB(o)),fraction=Math.min(1,leaves/o.plant.capacityB);
            maintenance.set(o.id,{E:ctx.costs.get(o.id).base,M:0});
            canopies.push({actor:o.id,height:0,area:p.surface*fraction,capture:Q(p.lightInput*p.ageFactors.light*fraction*w.tiles[o.cell].light)});
            requests.push({id:"photo/"+o.id,actor:o.id,kind:"photo",need:Math.max(0,p.capE-o.E)},
              {id:"mineral/"+o.id,actor:o.id,kind:"mineral",need:Math.max(0,p.capM-o.M)});continue;
          }
          if(S.spec(o).group!=="main")continue;
          maintenance.set(o.id,{E:ctx.costs.get(o.id).base,M:0});
          if(o.species==="kelp"){
            const p=ctx.traits.get(o.id),capture=Q(1.5*[0,1,1.1,1.2,1.3][p.phase]*p.ageFactors.light*w.tiles[o.cell].light);
            // Preserve the existing unit surface; no unselected height bonus.
            canopies.push({actor:o.id,height:0,area:o.B>0?1:0,capture});
            requests.push({id:"photo/"+o.id,actor:o.id,kind:"photo",need:Math.max(0,p.capE-o.E)});
          }
          const rows=cells.get(o.cell),refs=[...plants(o.cell),...(rows?.[5]||[])].map(a=>({kind:"organism",id:a.id}));
          for(const {row,kind}of materials.get(o.cell)||[])refs.push({kind,id:row.id});
          for(const id of ctx.cellCaptureByActor?.get(o.id)||[])refs.push({kind:"capture",id});
          refs.push(...(m.cellSources.resourcesByCell.get(o.cell)||[]));
          food(o,refs);continue;
        }
        const a=o.cellLife,p=ctx.traits.get(o.id),b=S.CellLife.bounds(o),u=maintenanceCost(w,o);
        maintenance.set(o.id,u);
        if(a.kind!=="group"&&a.kind!=="fungus"){
          const leaves=S.edibleB(o),area=leaves/b.edible,age=S.CellLife.age(o),capture=Q(4*area*(a.kind==="plant"?o.phase:1)*age.production*(a.kind==="plant"?p.lightInput/S.spec(o).lightInput:1));
          canopies.push({actor:o.id,height:a.kind==="plant"?o.cellLife.baseB:0,area:Math.max(0,leaves),capture});
          requests.push({id:"photo/"+o.id,actor:o.id,kind:"photo",need:Math.max(0,p.capE-o.E)});
          // A single establishment factor, never also applied to root reach.
          const established=a.kind==="colony"&&a.maintained>=3?1.1:1,
            variation=.9+.2*S.r(w,"cell/root-reach",w.turn,o.id,o.cell),
            demand=Math.max(0,p.capM-o.M);
          requests.push({id:"mineral/"+o.id,actor:o.id,kind:"mineral",need:demand,ability:established,reach:variation});
        }else if(a.kind==="fungus"){
          const demandE=Math.max(0,p.capE-o.E),demandM=Math.max(0,p.capM-o.M),
            processed=Math.max(0,o.B-(o.cellMatter?.tissueAt===w.turn?o.cellMatter.newB||0:0))/4*activity(w,o.cell);
          requests.push({id:"mineral/"+o.id,actor:o.id,kind:"mineral",need:demandM});
          const stocks=materials.get(o.cell)||[];
          for(const {row,kind}of stocks){
            const units=kind==="carcass"?row.q:row.E||row.M,body=(row.G??row.B)||Math.max(row.E||0,(row.M||0)/.02);
            if(!(units>0&&body>0)||!((demandE>0&&row.E>0)||(demandM>0&&row.M>0)))continue;
            const need=Math.min(units,processed*units/body);if(need>0)requests.push({id:"decompose/"+o.id+"/"+row.id,actor:o.id,kind:"decompose",need,source:{kind,id:row.id}});
          }
        }else{
          food(o,[...plants(o.cell).map(a=>({kind:"organism",id:a.id})),...(S.SoilMatter.enabled(w)?(materials.get(o.cell)||[]).map(({row,kind})=>({kind,id:row.id})):[])]);
        }
      }
      for(const o of ctx.cellQActors?.values()||[]){
        const refs=plants(o.cell).map(a=>({kind:"organism",id:a.id}));
        for(const {row,kind}of materials.get(o.cell)||[])refs.push({kind,id:row.id});
        refs.push(...(m.cellSources.resourcesByCell.get(o.cell)||[]));
        food(o,refs);
      }
      return {requests,canopies,maintenance};
    }
    function settleBudgets(w,ctx,maintenance){
      const state=ready(w,ctx);if(!state.acquired)throw Error("CELL_RESOURCES_NOT_ACQUIRED");if(state.budgetSettled)throw Error("CELL_BUDGET_ALREADY_SETTLED");
      for(const o of w.organisms)if(o.HP>0){const c=maintenance.get(o.id);if(!c||![c.E,c.M].every(finite))throw Error("CELL_MAINTENANCE_MISSING");}
      payActions(w,ctx);state.budgetSettled=true;
      for(const o of w.organisms)if(o.HP>0){
        const raw=maintenance.get(o.id),c={E:Q(raw.E),M:Q(raw.M)},paidE=Q(Math.min(o.E,c.E)),paidM=Q(Math.min(o.M,c.M));
        o.E=Q(o.E-paidE);o.M=Q(o.M-paidM);S.dissipate(w,paidE);S.CellSpace.deferMaterial(w,o.cell,{M:paidM,kind:S.CellLife.is(o)&&o.cellLife.kind==="fungus"?"organic":"mineral"});
        state.budgets.set(o.id,{maintenance:{...c},paid:{E:paidE,M:paidM},deficit:Math.max(c.E?1-paidE/c.E:0,c.M?1-paidM/c.M:0),tickets:new Map()});
        if(ctx.informationHooks)ctx.records.get(o.id).informationMaintained=paidE+EPS>=c.E&&paidM+EPS>=c.M&&o.HP>0;
      }
      return state.budgets;
    }
    function budget(w,ctx,o){const b=ready(w,ctx).budgets.get(o.id);if(!b)throw Error("CELL_BUDGET_NOT_SETTLED");return b;}
    function reserve(w,ctx,o,id,cost){
      const b=budget(w,ctx,o);if(typeof id!=="string"||b.tickets.has(id)||![cost.E,cost.M].every(finite))throw Error("CELL_RESERVATION_INVALID");
      const pending=[...b.tickets.values()].filter(t=>t.state==="reserved"),E=pending.reduce((n,t)=>n+t.E,0),M=pending.reduce((n,t)=>n+t.M,0);
      if(b.deficit>EPS||cost.E>o.E-3*b.maintenance.E-E+EPS||cost.M>o.M-3*b.maintenance.M-M+EPS)return null;
      const ticket={id,E:Q(cost.E),M:Q(cost.M),state:"reserved"};b.tickets.set(id,ticket);return {...ticket};
    }
    function cancel(w,ctx,o,id){const t=budget(w,ctx,o).tickets.get(id);if(!t||t.state!=="reserved")return false;t.state="cancelled";return true;}
    function commit(w,ctx,o,id,{bodyB=0,recipient=o,reserveE=0,reserveM=0,newMember=false}={}){
      const b=budget(w,ctx,o),t=b.tickets.get(id);
      if(!t||t.state!=="reserved")return false;
      const extraMember=newMember&&recipient===o&&S.CellLife.is(o)&&o.cellLife.kind==="group"&&S.ConsumerGroup.count(o)<8;
      if(newMember&&!extraMember)throw Error("CELL_BIRTH_MEMBER");
      const p=recipient===o?ctx.traits.get(o.id):S.phenotype(w,recipient),capB=p.capB+(extraMember?2:0);
      if(![bodyB,reserveE,reserveM].every(finite)||bodyB*1.2+reserveE>t.E+EPS||bodyB*.02+reserveM>t.M+EPS||
        recipient!==o&&(w.organisms.some(a=>a.id===recipient.id)||recipient.B!==0||recipient.E!==0||recipient.M!==0))throw Error("CELL_FORMATION_COST");
      const others=[...b.tickets.values()].filter(a=>a!==t&&a.state==="reserved");
      const needE=t.E+3*b.maintenance.E+others.reduce((n,a)=>n+a.E,0),needM=t.M+3*b.maintenance.M+others.reduce((n,a)=>n+a.M,0);
      if(o.HP<=0||recipient.HP<=0||o.E+EPS<needE||o.M+EPS<needM||recipient.B+bodyB>capB+EPS||
        recipient!==o&&(reserveE>p.capE+EPS||reserveM>p.capM+EPS)){t.state="cancelled";return false;}
      o.E=Q(o.E-t.E);o.M=Q(o.M-t.M);recipient.B=Q(recipient.B+bodyB);recipient.E=Q(recipient.E+reserveE);recipient.M=Q(recipient.M+reserveM);
      const bodyM=Q(.02*bodyB);recipient.cellMatter??={version:"cell-matter/1",bodyM:0,newB:0,tissueAt:w.turn};
      recipient.cellMatter.bodyM=Q(recipient.cellMatter.bodyM+bodyM);
      recipient.cellMatter.newB=Q((recipient.cellMatter.tissueAt===w.turn?recipient.cellMatter.newB||0:0)+bodyB);recipient.cellMatter.tissueAt=w.turn;
      S.dissipate(w,Q(t.E-bodyB-reserveE));S.CellSpace.deferMaterial(w,o.cell,{M:Q(t.M-bodyM-reserveM),kind:"mineral"});t.state="paid";return true;
    }
    // A sexual birth has several payers but one new body. Preflight every
    // reservation before debiting anyone; partial parent payments cannot birth
    // a second copy or leave a failed candidate charged.
    function formChild(w,ctx,child,parents,costsE,costsM){
      const B=child.B,E=child.E,M=child.M,p=S.phenotype(w,child),id="child/"+child.id;
      const byId=(ctx.current||S.maps(w)).byId;
      if(parents.length!==new Set(parents.map(o=>o.id)).size||parents.length!==costsE.length||parents.length!==costsM.length||
        ![B,E,M,...costsE,...costsM].every(finite)||!(costsE.reduce((n,v)=>n+v,0)>0)||byId.has(child.id))throw Error("CELL_FORMATION_COST");
      if(B>p.capB+EPS||E>p.capE+EPS||M>p.capM+EPS)return false;
      if(parents.some(o=>o.HP<=0||!ctx.old.has(o.id)||byId.get(o.id)!==o))return false;
      const up=n=>Math.ceil(Math.max(0,n-1e-12)*1e6)/1e6,sumE=Q(costsE.reduce((n,v)=>n+v,0)),sumM=Q(costsM.reduce((n,v)=>n+v,0)),
        extraE=Math.max(0,up(1.2*B+E)-sumE),extraM=Math.max(0,up(.02*B+M)-sumM),tickets=[];
      for(let i=0;i<parents.length;i++){
        const share=costsE[i]/sumE,t=reserve(w,ctx,parents[i],id,{E:up(costsE[i]+extraE*share),M:up(costsM[i]+extraM*share)});
        if(!t){for(const a of tickets)cancel(w,ctx,a.o,id);return false;}tickets.push({o:parents[i],t});
      }
      // All checks are complete and no consumer action runs between these
      // debits. Keep the canonical child reserves, funding bound M separately.
      const totalM=Q(tickets.reduce((n,a)=>n+a.t.M,0)),waste=Q(totalM-M-.02*B);let wasteLeft=waste;
      for(const [i,{o,t}]of tickets.entries()){
        o.E=Q(o.E-t.E);o.M=Q(o.M-t.M);budget(w,ctx,o).tickets.get(id).state="paid";
        const returned=i===tickets.length-1?wasteLeft:down(waste*t.M/Math.max(EPS,totalM));wasteLeft=Q(wasteLeft-returned);
        S.CellSpace.deferMaterial(w,o.cell,{M:returned,kind:"mineral"});
      }
      S.dissipate(w,Q(tickets.reduce((n,a)=>n+a.t.E,0)-E-B));
      child.cellMatter={version:"cell-matter/1",bodyM:Q(.02*B),newB:B,newEdibleB:0,tissueAt:w.turn};return true;
    }
    return {VERSION,allocate,begin,prepare,captureLight,acquire,settleBudgets,reserve,cancel,commit,formChild,lifeDemands,activity,background,remains,payloads,resolveDeaths,predation,combatCapture};
  })();
  const isRyouki=(w,o)=>S.Ryouki?.enabled(w)===true&&S.Ryouki.is(o);
  function efficiency(o, tag, phase = o.phase) {
    const s = S.spec(o);
    if (s.group === "prey") return tag === "plant" ? 0.65 : 0;
    if (s.group === "fungus") return tag === "mineral" ? 0.5 : 0.7;
    if (s.group === "plant") return tag === "mineral" ? 0.5 : 0;
    const d = S.D.diets[s.diet].factors,
      factor = d[["plant", "fungal", "animal", "mineral"].indexOf(tag)] || 1;
    return tag === "mineral"
      ? Math.min(
          1,
          0.5 *
            factor *
            (0.9 + 0.2 * o.dna.skin) *
            (1 + S.trait(o, "mineral", phase)),
        )
      : Math.min(
          0.95,
          0.5 *
            factor *
            (0.9 + 0.2 * o.dna.aptitude) *
            (tag === "plant" ? 1 + S.trait(o, "plant", phase) : 1) *
            (!S.Ryouki?.is(o) && o.branch3 === 0 && o.branch4 === 0 ? 1.1 : 1) *
            (s.id === "precocial" && o.phase === 3 && o.branch3 === 0
              ? 1.05
              : 1),
        );
  }
  function absorb(w, o, amount, tag, ctx, options = {}) {
    if(tag==="info"&&S.PersistentInformation?.enabled(w))return {e:0,m:0,organic:false,healed:0};
    const beforeE = o.E,
      beforeHP = o.HP,
      p = ctx.traits.get(o.id) || S.phenotype(w, o),
      phase = p.phase;
    let eta = efficiency(o, tag, phase);
    if (options.algae)
      eta = Math.min(0.95, eta * (1 + S.trait(o, "algae", phase)));
    if (tag === "factor")
      eta = Math.min(
        0.95,
        0.5 * (0.9 + 0.2 * o.dna.aptitude) * (1 + S.trait(o, "factor", phase)),
      );
    const e = S.round(amount.E * (tag === "info" ? 1 : eta)),
      m = S.round(amount.M * efficiency(o, "mineral", phase));
    S.dissipate(w, amount.E - e);
    const addM = Math.min(p.capM - o.M, m);
    o.M = S.round(o.M + addM);
    S.addSoil(w, options.cell ?? o.cell, amount.M - m);
    S.addSoil(w, o.cell, m - addM);
    const organic = ["plant", "fungal", "animal"].includes(tag),
      main = S.spec(o).group === "main";
    let remaining = e,
      healed = 0;
    if (organic && main) {
      const reserve = Math.min(remaining, Math.max(0, 35 - o.E));
      o.E = S.round(o.E + reserve);
      remaining = S.round(remaining - reserve);
      let rate = Math.min(
        0.75,
        0.5 *
          (options.healing || 1) *
          p.ageFactors.healing *
          (1 + S.trait(o, "healing", phase)) *
          (!isRyouki(w,o) && o.branch3 === 0 && o.branch4 === 1 ? 1.2 : 1),
      );
      healed = Math.min(p.maxHP - o.HP, remaining * rate);
      const used = S.round(healed / rate);
      o.HP = S.round(o.HP + healed);
      remaining = S.round(Math.max(0, remaining - used));
      S.dissipate(w, used);
    }
    const addE = Math.min(Math.max(0, p.capE - o.E), remaining);
    o.E = S.round(o.E + addE);
    remaining = S.round(remaining - addE);
    if (organic && !main && S.spec(o).group !== "plant" && remaining > 0) {
      healed = Math.min(
        p.maxHP - o.HP,
        remaining *
          Math.min(0.75, 0.5 * (options.healing || 1) * p.ageFactors.healing),
      );
      const used = S.round(
        healed /
          Math.min(0.75, 0.5 * (options.healing || 1) * p.ageFactors.healing),
      );
      o.HP = S.round(o.HP + healed);
      remaining = S.round(Math.max(0, remaining - used));
      S.dissipate(w, used);
    }
    S.dissipate(w, remaining);
    const rec = ctx.records.get(o.id);
    if (organic && main) {
      let g = options.carcass
        ? amount.G * eta
        : e * (tag === "animal" ? 1 + S.trait(o, "animalG", phase) : 1);
      if (!isRyouki(w,o) && o.factor && o.factor.expires > w.turn && e > 0) {
        g += o.factor.level;
        o.factor = null;
      }
      const addG = isRyouki(w,o)?0:Math.min(300 - o.G, g);
      o.G = S.round(o.G + addG);
      if (rec) {
        rec.relieved = rec.relieved || (beforeE < 35 && o.E >= 35);
        rec.organic += e;
        rec.reserve += Math.max(0, o.E - beforeE);
        rec.heal += Math.max(0, o.HP - beforeHP);
        rec.G += addG;
      }
    }
    if (tag === "factor" && amount.E > 0) {
      const level = options.level || 1;
      if (!o.factor || o.factor.expires <= w.turn || level > o.factor.level)
        o.factor = { level, expires: w.turn + 3 };
    }
    if(S.ConsumerGroup.is(o)){S.ConsumerGroup.heal(o,healed);if(organic&&ctx.consumerGroupFlows)ctx.consumerGroupFlows[o.species].assimilatedE=S.round(ctx.consumerGroupFlows[o.species].assimilatedE+e);}
    return { e, m, organic, healed };
  }
  function removeResource(w, a) {
    S.addSoil(w, a.cell, a.M || 0);
    S.dissipate(w, a.E || 0);
  }
  function expireAndCA(w, ctx) {
    if(S.CellSpace.enabled(w))return CellResources.payloads(w,ctx);
    const t = w.turn;
    w.resources = w.resources.filter((a) => {
      if (a.expires !== null && a.expires <= t) {
        removeResource(w, a);
        return false;
      }
      return true;
    });
    w.carcasses = w.carcasses.filter((a) => {
      if (a.payloadExpires && a.payloadExpires <= t) {
        if(ctx.primaryHooks)ctx.primaryHooks.expireCarrier(w,ctx,a);
        else S.loseInfection(w, a.infection);
        a.infection = null;
      }
      if (a.expires <= t) {
        removeResource(w, a);
        if(ctx.primaryHooks)ctx.primaryHooks.expireCarrier(w,ctx,a);
        else S.loseInfection(w, a.infection);
        return false;
      }
      return true;
    });
    w.pending = w.pending.filter((a) => {
      if (a.expires <= t) {
        S.loseInfection(w, a.infection);
        return false;
      }
      return true;
    });
    w.messages = w.messages.filter((a) => a.expires > t);
    const m = S.maps(w),
      byKind = new Map();
    for (const a of w.resources) {
      ctx.startResource.add(a.cell + ":" + a.kind);
      if (!byKind.has(a.kind)) byKind.set(a.kind, new Set());
      byKind.get(a.kind).add(a.cell);
    }
    const keep = new Set(w.resources);
    for (const kind of ["mineral", "droplet", "info"]) {
      if(kind==="info"&&S.PersistentInformation?.enabled(w))continue;
      const f = S.FOOD[kind];
      if (t % f.period) continue;
      const cells = new Set(byKind.get(kind) || []);
      // Experience traces are a latent field, not free physical food or energy.
      if(kind === "info") for(const event of w.messages){
        const source=m.byId.get(event.sourceId);
        if(event.expires>w.turn && w.turn-event.time<8 && event.values?.length &&
          source && S.distance(w,event.cell,source.cell)<=1 && !w.tiles[event.cell].blocked)
          cells.add(event.cell);
      }
      const counts=new Uint8Array(w.tiles.length),candidates=new Set(cells);
      for(const source of cells)for(const cell of S.nearby(w,source)){counts[cell]++;candidates.add(cell);}
      for (const cell of [...candidates].sort((a,b)=>a-b)) {
        if (w.tiles[cell].blocked) continue;
        const n=counts[cell];
        const old = (m.resources.get(cell) || []).find((a) => a.kind === kind);
        if (old) {
          if (n !== 2 && n !== 3) {
            keep.delete(old);
            removeResource(w, old);
          } else if (old.q < f.cap)
            ctx.ca.push({ cell, kind, q: 1, growth: old });
        } else if (n === 3) ctx.ca.push({ cell, kind, q: 2, growth: null });
      }
    }
    w.resources = w.resources.filter((a) => keep.has(a));
  }
  function sourceList(w, o, ctx, m) {
    const spec = S.spec(o),
      main = spec.group === "main",
      fungus = spec.group === "fungus",
      plant = spec.group === "plant",
      intent = ctx.intents.get(o.id);
    const list = [];
    if(plant && S.ProducerSupport.factor(w,o,S)===0)return list;
    function organicAllowed(tag) {
      if (plant) return false;
      if (isRyouki(w,o)) return ["plant","animal"].includes(tag);
      if (spec.id === "kelp") return tag === "animal";
      return main || fungus || (spec.group === "prey" && tag === "plant");
    }
    const cells = fungus
      ? S.nearby(w, o.cell, 1, true).filter(
          (p) => p === o.cell || S.oneStep(w, o.cell, p),
        )
      : [o.cell];
    for (const p of cells) {
      for (const a of m.resources.get(p) || []) {
        if(a.kind==="info"&&S.PersistentInformation?.enabled(w))continue;
        const f = S.FOOD[a.kind];
        if(isRyouki(w,o)&&f.tag!=="mineral")continue;
        if (a.q <= 0 || (a.E <= 0 && a.M <= 0 && a.kind !== "factor")) continue;
        if (plant && f.tag !== "mineral") continue;
        if (["plant", "fungal", "animal"].includes(f.tag) && !organicAllowed(f.tag)) continue;
        if (
          f.tag === "mineral" &&
          (spec.group === "prey" || (fungus && p !== o.cell))
        )
          continue;
        if (!main && !plant && f.tag !== "mineral" && !organicAllowed(f.tag))
          continue;
        if (!main && ["factor", "info"].includes(a.kind)) continue;
        if (
          f.tag === "mineral" &&
          o.M >=
            (main
              ? Math.max(
                  4,
                  ctx.traits.get(o.id).phase === 2
                    ? ctx.traits.get(o.id).M3
                    : ctx.traits.get(o.id).phase === 3 &&
                        spec.id !== "precocial"
                      ? ctx.traits.get(o.id).M4
                      : 4,
                )
              : 2)
        )
          continue;
        if (
          a.kind === "factor" &&
          o.factor?.level >= a.level &&
          o.factor.expires > w.turn
        )
          continue;
        if (
          a.kind === "info" &&
          (o.infoReady > w.turn ||
            (a.event && o.seen.some((x) => x.id === a.event.id)))
        )
          continue;
        list.push({
          type: "resource",
          id: "r:" + p + ":" + a.kind,
          obj: a,
          cell: p,
          tag: f.tag,
          healing: f.healing || 1,
          level: a.level || 0,
          amount: a.q / S.FOOD[a.kind].cap,
        });
      }
      for (const a of m.carcasses.get(p) || []) {
        if(isRyouki(w,o)&&(S.D.byId[a.species]?.group!=="prey"||!(a.G>0)))continue;
        if (
          !organicAllowed(a.tag) ||
          (a.species === o.species && !fungus) ||
          a.q <= 0 ||
          (a.E <= 0 && a.M <= 0)
        )
          continue;
        list.push({
          type: "carcass",
          id: a.id,
          obj: a,
          cell: p,
          tag: a.tag,
          healing: 1,
          amount: a.q / 4,
        });
      }
    }
    if (plant && o.M < ctx.traits.get(o.id).capM && w.tiles[o.cell].soilM > 0) {
      list.push({
        type: "soil",
        id: "soil:" + o.cell,
        obj: w.tiles[o.cell],
        cell: o.cell,
        tag: "mineral",
        healing: 1,
        amount: w.tiles[o.cell].soilM / 20,
      });
    }
    if (main) {
      const food = m.food.get(o.cell);
      if (
        food &&
        organicAllowed(S.spec(food).tag) &&
        ["plant", "fungus"].includes(S.spec(food).group) &&
        S.edibleB(food) > 0 &&
        food.HP > 0
      )
        list.push({
          type: "plant",
          id: food.id,
          obj: food,
          cell: food.cell,
          tag: S.spec(food).tag,
          amount:
            S.edibleB(food) /
            (S.phenotype(w, food).capB -
              (S.spec(food).group === "plant" ? S.PLANT_BASE : 0)),
          healing: ["moss", "fungus"].includes(food.species) ? 1.2 : 1,
        });
    }
    if (w.config.ecologyRevision === "observation/4.1" && !plant && !fungus) {
      for (const cell of S.nearby(w,o.cell,1,true)) {
        const target = m.food.get(cell);
        if (!target || target.id === o.id || !organicAllowed(S.spec(target).tag) ||
            !["plant","fungus"].includes(S.spec(target).group) || S.edibleB(target) <= 0 ||
            !S.oneStep(w,o.cell,cell) || list.some(a => a.id === target.id)) continue;
        list.push({type:"plant",id:target.id,obj:target,cell,tag:S.spec(target).tag,
          amount:S.edibleB(target)/Math.max(1,S.phenotype(w,target).capB-S.PLANT_BASE),healing:1});
      }
    }
    if (intent?.type === "harvest" && !plant && !fungus) {
      const target = m.byId.get(intent.target);
      if (
        target &&
        (!isRyouki(w,o)||["plant","prey"].includes(S.spec(target).group)) &&
        organicAllowed(S.spec(target).tag) &&
        target.HP > 0 &&
        S.edibleB(target) > 0 &&
        S.distance(w, o.cell, target.cell) <= 1 &&
        S.oneStep(w, o.cell, target.cell)
      )
        list.push({
          type: "plant",
          id: target.id,
          obj: target,
          cell: target.cell,
          tag: S.spec(target).tag,
          amount:
            S.edibleB(target) /
            (S.phenotype(w, target).capB -
              (S.spec(target).group === "plant" ? S.PLANT_BASE : 0)),
          healing: ["moss", "fungus"].includes(target.species) ? 1.2 : 1,
        });
    }
    if(S.LargePlant.enabled(w)&&!plant&&!fungus){
      const cells=w.config.ecologyRevision==="observation/4.1"?S.nearby(w,o.cell,1,true):[o.cell];
      for(const cell of cells){const target=m.producer?.get(cell);
        if(!target||target.HP<=0||S.edibleB(target)<=0||!organicAllowed("plant")||!S.oneStep(w,o.cell,cell)||list.some(a=>a.id===target.id))continue;
        list.push({type:"plant",id:target.id,obj:target,cell,tag:"plant",amount:S.edibleB(target)/Math.max(1,S.phenotype(w,target).capB-S.PLANT_BASE),healing:1});
      }
    }
    if(isRyouki(w,o))for(const cell of S.nearby(w,o.cell,1,true)){
      const target=(m.prey||m.food).get(cell);
      if(!target||target.HP<=0||S.spec(target).group!=="prey"||S.edibleB(target)<=0||
          !S.oneStep(w,o.cell,cell)||list.some(a=>a.id===target.id))continue;
      list.push({type:"plant",id:target.id,obj:target,cell,tag:"animal",amount:S.edibleB(target)/Math.max(1,S.phenotype(w,target).capB),healing:1});
    }
    // Free IV Q are finite living prey, distinct from hosted Q and inocula.
    // Reuse the normal ration arbitration rather than grant a second free meal.
    if(S.HyperParasite?.enabled(w)&&main&&!isRyouki(w,o)&&(S.D.diets[spec.diet]?.hunt||0)>=0){
      for(const cell of S.nearby(w,o.cell,1,true)){
        if(!S.oneStep(w,o.cell,cell))continue;
        for(const q of ctx.hyperAdultsByCell?.get(cell)||[]){
          if(!S.HyperParasite.is(q)||q.phase!==4||q.E+q.B<=0)continue;
          list.push({type:"hyper",id:q.id,obj:q,cell,tag:"animal",amount:Math.min(1,q.E+q.B),healing:1});
        }
      }
    }
    return list;
  }
  function chooseSource(w, o, list, ctx) {
    const p = ctx.traits.get(o.id),
      s = S.spec(o);
    function score(a) {
      const organic = ["plant", "fungal", "animal"].includes(a.tag);
      let priority = 10;
      if (s.group === "plant") priority = a.type === "soil" ? 1 : 0;
      else if (s.group !== "main")
        priority = organic
          ? o.E < p.capE - 1e-8 || o.HP < p.maxHP - 1e-8
            ? 0
            : 10
          : 1;
      else if (o.E < 35 && organic) priority = 0;
      else if (o.HP < 50 && organic) priority = 1;
      else if (o.G < (o.phase === 1 ? 30 : o.phase === 2 ? 90 : 210) && organic)
        priority = 2;
      else if (
        a.tag === "mineral" &&
        o.M < (o.phase === 2 ? p.M3 : o.phase === 3 ? p.M4 : 4)
      )
        priority = 3;
      else if (a.tag === "factor") priority = 4;
      else if (a.tag === "info") priority = 5;
      else if (organic && (o.E < p.capE || o.HP < p.maxHP)) priority = 6;
      else if (a.tag === "mineral") priority = 7;
      const visible = a.amount <= 1 / 3 ? 1 / 3 : a.amount <= 2 / 3 ? 2 / 3 : 1;
      if(S.PersistentInformation?.enabled(w)&&ctx.informationHooks)
        a.informationPlace=ctx.informationHooks.informationPlace(w,ctx,o,a.cell);
      return {
        a,
        priority,
        value: (a.informationPlace?.value||0)*.1+
          visible *
          efficiency(o, a.tag, p.phase) *
          (a.type === "carcass" ? S.D.diets[s.diet]?.carcass || 1 : 1) *
          (o.HP < 50 ? a.healing : 1) *
          (isRyouki(w,o)?a.tag==="plant"?.65:a.tag==="animal"?.35:1:1),
        h: S.hash(w, "feeding/choice", w.turn, o.id, a.id),
      };
    }
    return list
      .map(score)
      .filter((x) => x.priority < 10)
      .sort(
        (a, b) => a.priority - b.priority || b.value - a.value || a.h - b.h,
      )[0]?.a;
  }
  function feed(w, ctx, transfer) {
    let m = S.maps(w);
    if(S.HyperParasite?.enabled(w)){
      ctx.hyperAdultsByCell=new Map();
      for(const q of w.searchQ||[]){const rows=ctx.hyperAdultsByCell.get(q.cell)||[];rows.push(q);ctx.hyperAdultsByCell.set(q.cell,rows);}
    }
    for (let round = 0; round < 2; round++) {
      const requests = [];
      for (const o of w.organisms)
        if (o.HP > 0 && !ctx.harvestDead.has(o.id)) {
          const source = chooseSource(w, o, sourceList(w, o, ctx, m), ctx);
          if (source)
            requests.push({
              o,
              source,
              h: S.hash(
                w,
                "feeding/arbitration",
                w.turn,
                o.id,
                source.id,
                round,
              ),
            });
        }
      requests.sort((a, b) => a.h - b.h || S.compare(a.o.id, b.o.id));
      for (const request of requests) {
        const o=request.o;let a=request.source;
        if (ctx.harvestDead.has(o.id)||o.HP<=0) continue;
        if(a.type==='plant'&&S.ConsumerGroup.is(a.obj)){
          const prey=a.obj;if(!S.ConsumerGroup.count(prey)||prey.HP<=0)continue;
          const remains=groupLoss(w,prey,1,'harvest',ctx);
          if(!remains)continue;
          a={...a,type:'carcass',obj:remains,id:remains.id};
        }
        const obj = a.obj;
        if (
          (obj.q !== undefined && obj.q <= 0) ||
          (a.type === "hyper" && obj.E + obj.B <= 0) ||
          (a.type === "plant" && (S.edibleB(obj) <= 0 || obj.HP <= 0))
        )
          continue;
        let amount, harvest = null;
        if (a.type === "soil") {
          amount = {
            E: 0,
            M: S.round(
              Math.min(
                0.1,
                obj.soilM,
                (ctx.traits.get(o.id).capM - o.M) / efficiency(o, "mineral"),
              ),
            ),
            G: 0,
          };
          obj.soilM = S.round(obj.soilM - amount.M);
        } else if (a.type === "hyper") {
          if(S.ParasiteCohort.enabled(w)&&
            (ctx.hyperEscaped?.has(obj.id)||obj.E>=.004&&
              S.r(w,"hyper/cohort-evade",w.turn,obj.id,o.id)<
                (w.config.parasiteDispersalModel==="fanout/1"?.80+.05*(S.ParasiteCohort.members(obj)-1):.45+.15*(S.ParasiteCohort.members(obj)-1)))){
            if(!ctx.hyperEscaped?.has(obj.id)){
              obj.E=S.round(obj.E-.004);S.dissipate(w,.004);
              (ctx.hyperEscaped??=new Set()).add(obj.id);
              S.record(ctx,obj,"evade",{predator:o.id,cell:obj.cell,species:"hyperparasite"});
            }
            continue;
          }
          amount={E:S.round(obj.E+obj.B),M:0,G:obj.B};
          obj.E=0;obj.B=0;
          ctx.primaryHooks.hyperAdultDeath(w,ctx,obj,"predation");
        } else if (a.type === "plant") {
          const p = ctx.traits.get(o.id),
            need =
              p.capE -
              o.E +
              (2 * (p.maxHP - o.HP)) / (a.healing * p.ageFactors.healing);
          const B = Math.min(
              S.ConsumerGroup.is(o)?2*S.ConsumerGroup.count(o):isRyouki(w,o)?(o.ryouki.mutated?w.config.ryoukiSettings.mutatedBiteB:w.config.ryoukiSettings.biteB)*(S.LargePlant.is(obj)?S.phenotype(w,obj).biteFactor:1):S.LargePlant.is(obj)?2*S.phenotype(w,obj).biteFactor:2,
              S.edibleB(obj),
              S.spec(o).group === "prey"
                ? Math.max(0, S.round(need / efficiency(o, a.tag, p.phase)))
                : Infinity,
            ),
            M = obj.B > 0 ? S.round((obj.M * B) / obj.B) : 0;
          if (B <= 0) continue;
          harvest = {consumedB:B,beforeEdibleB:S.edibleB(obj)};
          if(ctx.primaryHooks)harvest.fraction=B/harvest.beforeEdibleB;
          obj.B = S.round(obj.B - B);
          obj.M = S.round(obj.M - M);
          amount = { E: B, M, G: 0 };
          if(S.Colony.is(obj))S.Colony.consumed(w,obj,B);
          if(S.FungalColony.is(obj))S.FungalColony.increment(obj,"consumedB",B);
          if(S.LargePlant.is(obj))S.LargePlant.consumed(w,obj,B);
          if (obj.B <= 0) ctx.harvestDead.add(obj.id);
        } else {
          if(ctx.primaryHooks&&a.type==="carcass")harvest={beforeQ:obj.q,beforeE:obj.E,beforeG:obj.G};
          amount = {
            E: S.round((obj.E || 0) / obj.q),
            M: S.round((obj.M || 0) / obj.q),
            G: S.round((obj.G || 0) / obj.q),
          };
          // Existing carcass G is the finite transferred body B. Reserve E and M
          // follow the same partial ration; neither a roommate nor a second bite copies it.
          const fraction=isRyouki(w,o)&&a.type==="carcass"?
            Math.min(1,(o.ryouki.mutated?w.config.ryoukiSettings.mutatedBiteB:w.config.ryoukiSettings.biteB)/amount.G):1;
          if(fraction<1)for(const k of ["E","M","G"])amount[k]=S.round(amount[k]*fraction);
          obj.E = S.round(Math.max(0, (obj.E || 0) - amount.E));
          obj.M = S.round(Math.max(0, (obj.M || 0) - amount.M));
          obj.G = S.round(Math.max(0, (obj.G || 0) - amount.G));
          if(fraction<1)obj.q=S.round(obj.q-fraction);else obj.q--;
          if(harvest&&ctx.primaryHooks&&a.type==="carcass")Object.assign(harvest,{fraction:fraction/harvest.beforeQ,consumedE:amount.E,consumedB:amount.G});
          if (!obj.q) ctx.exhausted.add(obj.cell + ":" + obj.kind);
        }
        let assimilated=0;
        if((amount.E>0||amount.M>0)&&a.informationPlace)
          ctx.informationHooks.informationUsed(w,ctx,o,a.cell,a.informationPlace);
        if (a.tag === "info") {
          (ctx.infoReceipts??=[]).push({recipient:o.id,species:o.species,event:obj.event?{id:obj.event.id,sourceId:obj.event.sourceId,time:obj.event.time,mediated:!!obj.event.mediator,noise:!!obj.event.noise}:null});
          const add = Math.min(ctx.traits.get(o.id).capE - o.E, amount.E);
          o.E = S.round(o.E + add);
          S.dissipate(w, amount.E - add);
          assimilated=add;
          if (obj.event) {
            ctx.records.get(o.id).information.push(obj.event);
            o.seen.push({ id: obj.event.id, expires: obj.event.time + 20 });
            o.seen = o.seen.filter((x) => x.expires > w.turn).slice(-4);
            o.infoReady = w.turn + 6;
          }
        } else {
          const result = absorb(w, o, amount, a.tag, ctx, {
            cell: a.cell,
            healing: a.healing,
            level: a.level,
            algae: a.type === "plant" && obj.species === "algae",
            carcass: a.type === "carcass",
          });
          assimilated=result.e;
          if(S.FungalColony.is(o)&&result.organic)S.FungalColony.increment(o,"assimilatedE",result.e);
          if (result.organic && amount.E > 0) transfer(w, ctx, obj, o, a.type, harvest);
        }
        S.record(ctx, o, "feed", {
          source: a.id,
          sourceType: a.type,
          assimilated,
          sourceSpecies: obj.species || null,
          to: a.cell,
          amount: amount.E,
          material: amount.M,
          tag: a.tag,
          ...(isRyouki(w,o)?{consumedB:a.type==="plant"?harvest.consumedB:a.type==="carcass"?amount.G:0}:{}),
        });
        ctx.records.get(o.id).bites++;
      }
      w.resources = w.resources.filter((a) => a.q > 0);
      w.carcasses = w.carcasses.filter((a) => {
        if (a.q > 0) return true;
        removeResource(w, a);
        if(ctx.primaryHooks)ctx.primaryHooks.expireCarrier(w,ctx,a);
        else S.loseInfection(w, a.infection);
        a.infection = null;
        return false;
      });
      m = S.maps(w);
    }
  }
  function spend(w, o, cost) {
    // Quantize the transaction once; both balances must use the same amount.
    cost = S.round(cost);
    const paid = Math.min(o.E, cost);
    o.E = S.round(o.E - paid);
    if(S.ConsumerGroup.is(o))S.ConsumerGroup.damage(w,o,2*(cost-paid));
    else o.HP = S.round(Math.max(0, o.HP - 2 * (cost - paid)));
    S.dissipate(w, paid);
    return paid;
  }
  function deathAppearance(w, o) {
    return {
      species:o.species,phase:o.phase,branch3:o.branch3,branch4:o.branch4,
      sex:o.sex,role:o.role,age:o.age,birthLife:o.birthLife,facing:o.facing,
      dna:{...o.dna},
      ...(isRyouki(w,o)?{ryouki:{version:o.ryouki.version,mutated:o.ryouki.mutated}}:{})
    };
  }
  function carcass(w, o, ctx) {
    if(S.CellSpace.enabled(w))return CellResources.remains(w,o,ctx);
    if(S.Colony.is(o)&&o.colony.edibleExposure){S.dissipate(w,o.colony.edibleExposure.E);o.colony.edibleExposure=null;}
    const same = w.carcasses.find(
      (a) => !o.groupRemains && a.cell === o.cell && a.slot === o.slot &&
        (!(S.Ryouki?.enabled(w)&&o.slot==="main")||a.id==="c:"+o.id+":"+w.turn),
    );
    if (same) {
      removeResource(w, same);
      S.loseInfection(w, same.infection);
      w.carcasses = w.carcasses.filter((a) => a !== same);
    }
    const phase = ctx.traits.get(o.id).phase,
      ratio =
        o.slot === "main"
          ? [0, 1, 1.15, 1.35, 1.6][phase]
          : phase === 1
            ? 1
            : 1.1;
    const a = {
      id: "c:" + o.id + ":" + w.turn,
      species: o.species,
      slot: o.slot,
      cell: o.cell,
      tag: S.spec(o).tag,
      q: Math.min(4, Math.ceil(2 * ratio * (0.75 + 0.5 * o.dna.body))),
      E: S.round(0.5 * (o.E + o.B)),
      M: S.round(0.5 * o.M),
      G: S.round(0.5 * o.B),
      created: w.turn,
      expires: w.turn + 12,
      infection: null,
      payloadExpires: null,
    };
    if(isRyouki(w,o))a.appearance=deathAppearance(w,o);
    S.dissipate(w, o.E + o.B - a.E);
    S.addSoil(w, o.cell, o.M - a.M);
    const p = o.infection;
    if(ctx.primaryHooks)ctx.primaryHooks.hostDeath(w,ctx,o,a);
    else if (p && (w.config.ecologyRevision === "observation/4.1" ? p.counter >= ({first:4,middle:6,extra:6,terminal:8}[p.stage]) : ["middle", "extra"].includes(p.stage) && p.counter >= 6)) {
      a.infection = p;
      p.hostId = a.id;
      a.payloadExpires = w.turn + 4;
    } else S.loseInfection(w, p);
    o.infection = null;
    w.carcasses.push(a);
    return a;
  }
  function groupLoss(w,o,n,reason,ctx,ageOnly=null){
    const piece=S.ConsumerGroup.extract(w,o,n,reason,ctx,ageOnly);if(!piece)return null;
    S.ConsumerGroup.recordLoss(w,o,piece,reason,ctx);
    const remains=carcass(w,piece.part,ctx);
    if(S.CellSpace.enabled(w)&&reason==="combat")CellResources.combatCapture(w,ctx,o,remains);
    if(!S.ConsumerGroup.count(o)&&ctx.informationHooks)ctx.informationHooks.informationDeath(w,ctx,o,{reason,cell:o.cell});
    if(!S.CellLife.is(o))S.ConsumerGroup.refresh(w,o,ctx);return remains;
  }
  function groupDamage(w,ctx,reason){
    for(const o of w.organisms)if(S.ConsumerGroup.is(o)&&S.ConsumerGroup.count(o)){
      const g=o.consumerGroup,unit=S.spec(o).capacity[3],n=S.ConsumerGroup.count(o),
        lost=o.HP<=0?n:Math.min(n,Math.floor((g.wounds+1e-8)/unit));
      if(lost){
        const residual=S.round(Math.max(0,g.wounds-lost*unit));
        if(!S.CellLife.is(o))g.wounds=residual;
        groupLoss(w,o,lost,reason,ctx);
        if(S.CellLife.is(o)){
          // Full HP units belong to the dead members. Keep the surviving
          // injury once, rather than scaling it and then subtracting it again.
          g.wounds=residual;o.HP=S.round(Math.max(0,unit*S.ConsumerGroup.count(o)-residual));
          if(o.HP>0)ctx.traits.set(o.id,S.phenotype(w,o,ctx.traits.get(o.id).phase));
        }
      }
    }
  }
  function payActions(w,ctx) {
    for(const o of w.organisms){const c=ctx.costs.get(o.id);if(!c)continue;spend(w,o,c.action);c.action=0;}
  }
  function settle(w, ctx, parasiteFee) {
    for (const o of w.organisms) {
      const c = ctx.costs.get(o.id),
        p = ctx.traits.get(o.id),
        s = S.spec(o),
        intent = ctx.intents.get(o.id);
      if(S.ConsumerGroup.is(o)&&S.ConsumerGroup.count(o)===0)continue;
      spend(w, o, c.action);
      let base = c.base;
      if(S.ConsumerGroup.is(o))base*=S.ConsumerGroup.count(o)/(ctx.old.get(o.id)?.members||S.ConsumerGroup.count(o));
      if (["stop", "defend"].includes(intent.type))
        base *= 1 + S.trait(o, "rest", p.phase);
      const paidBase=spend(w, o, base);
      if(S.PersistentInformation?.enabled(w))ctx.records.get(o.id).informationMaintained=paidBase+1e-8>=S.round(base)&&o.HP>0;
      if(isRyouki(w,o))ctx.records.get(o.id).ryoukiMaintained=paidBase>=S.round(base)&&o.HP>0;
      if(S.Colony.is(o)){
        const maintained=paidBase>=S.round(base)&&o.HP>0;
        o.colony.activity=S.round(S.clamp(o.colony.activity+(maintained?.02:-.05),0,1));
        if(maintained)S.Colony.increment(o,"maintainedTurns",1);
      }
      if(S.FungalColony.is(o))S.FungalColony.maintained(w,o,paidBase,base);
      if(S.LargePlant.is(o))S.LargePlant.maintained(w,o,paidBase,base);
      const paidDensity = spend(w, o, c.density);
      ctx.records.get(o.id).crowding = c.neighborCount >= 5 && paidDensity > 0;
      const beforeFeeHP=o.HP;parasiteFee(w, ctx, o);
      if(S.ConsumerGroup.is(o)){S.ConsumerGroup.damage(w,o,Math.max(0,beforeFeeHP-o.HP));S.ConsumerGroup.bindInfection(w,o);}
      o.age++;
    }
    groupDamage(w,ctx,'starvation');
    const survivors = [];
    for (const o of w.organisms) {
      if(S.ConsumerGroup.is(o)){
        const g=o.consumerGroup;
        for(const cohort of g.cohorts)cohort.age++;
        if(g.infectedAge!==null)g.infectedAge++;
        const expired=new Map();for(const c of g.cohorts)if(c.age>=S.spec(o).life)expired.set(c.age,(expired.get(c.age)||0)+c.n);
        for(const [age,n]of expired)groupLoss(w,o,n,'age',ctx,age);
        if(S.ConsumerGroup.count(o)>0){S.ConsumerGroup.refresh(w,o,ctx);survivors.push(o);}
        continue;
      }
      const p = ctx.traits.get(o.id);
      let reason = null;
      if (o.HP <= 0)
        reason = ctx.records.get(o.id).damage > 0 ? "combat" : "starvation";
      if (ctx.harvestDead.has(o.id)) reason = "harvest";
      if(!reason&&S.Colony.is(o)&&o.colony.activity<=0)reason="starvation";
      if(!reason&&S.LargePlant.is(o)&&o.plant.activity<=0)reason="starvation";
      if(!reason&&S.FungalColony.is(o)&&o.colony.activity<=0)reason="starvation";
      if (!reason && !S.Colony.is(o) && !S.FungalColony.is(o) && o.age >= p.life) reason = "age";
      if (reason) {
        if(ctx.informationHooks)ctx.informationHooks.informationDeath(w,ctx,o,{reason,cell:o.cell});
        S.record(ctx, o, "death", { reason, appearance: deathAppearance(w,o) });
        ctx.deaths.push({ species: o.species, reason, ...(o.producerReserve===0?{environmentCause:"basal-nutrition-exhausted"}:{}), ...(w.config.ecologyRevision === "observation/4.1" ? {id:o.id,generation:o.generation,ageStage:ctx.traits.get(o.id).ageStage} : {}) });
        carcass(w, o, ctx);
      } else survivors.push(o);
    }
    w.organisms = survivors;
  }
  function investAndDrops(w, ctx) {
    const m = S.maps(w),
      candidates = [];
    for (const o of w.organisms) {
      if (!ctx.traits.has(o.id)) continue;
      const s = S.spec(o);
      if(S.ConsumerGroup.is(o))continue;
      if(S.LargePlant.is(o))S.LargePlant.regrow(w,o,ctx);
      else if(S.Colony.is(o))S.Colony.regrow(w,o);
      else if (["plant", "fungus"].includes(s.group)) {
        const hasBirth = S.nearby(w, o.cell).some(
            (p) =>
              !m.food.has(p) &&
              S.oneStep(w, o.cell, p) &&
              S.validHabitat(w, s, p) &&
              (w.config.ecologyRevision === "observation/4.1" ? s.group === "fungus" ? [1,2,3] : [2,3] : [3]).includes(S.nearby(w, p).filter((q) => m.food.get(q)?.species === s.id).length),
          ),
          keep =
            s.group === "plant" && o.B < 4
              ? 2
              : o.phase === 2 && hasBirth
                ? 8
                : 5,
          amount = Math.max(
            0,
            Math.min(
              s.group === "plant" ? 2 : 1,
              (s.group === "plant" && S.ProducerSupport.factor(w,o,S)===0) ? 0 : o.E - keep,
              S.phenotype(w, o).capB - o.B,
            ),
          );
        if(S.FungalColony.is(o))S.FungalColony.regrow(w,o,hasBirth);
        else {o.E = S.round(o.E - amount);o.B = S.round(o.B + amount);}
      }
      if (
        o.phase < 2 ||
        ctx.parents.has(o.id) ||
        !["grass", "fungus", "waterbug", "algae", "moss"].includes(s.id) ||
        w.turn % 8 !== S.hash(w, "drop/phase", 0, o.id) % 8
      )
        continue;
      let kind =
        s.id === "grass"
          ? "seed"
          : s.id === "fungus"
            ? "spore"
            : s.id === "waterbug"
              ? "egg"
              : "organic";
      if (
        ["grass", "fungus"].includes(s.id) &&
        S.r(w, "drop/factor", w.turn, o.id) < 0.1
      )
        kind = "factor";
      const B = kind === "factor" ? 0.2 : 2,
        M = kind === "factor" ? 0 : 0.1;
      if (S.edibleB(o) < B || o.M < M) continue;
      if(["survival/2","survival/3","survival/4"].includes(w.config.balanceModel)&&s.id==="fungus"&&(S.round(S.edibleB(o)-B)<3||S.round(o.M-M)<.2))continue;
      const places = S.nearby(w, o.cell, 1, true)
        .filter((p) => !w.tiles[p].blocked)
        .map((cell) => ({
          cell,
          h: S.hash(w, "drop/place", w.turn, o.id, cell),
        }))
        .sort((a, b) => a.h - b.h);
      const place = places.find(({ cell }) => {
        const list = m.resources.get(cell) || [],
          old = list.find((a) => a.kind === kind);
        return old ? old.q < S.FOOD[kind].cap : list.length < 3;
      });
      if (place)
        candidates.push({
          cell: place.cell,
          kind,
          q: 1,
          E: kind === "factor" ? 0.1 : 2,
          M,
          G: 0,
          expires: w.turn + 12,
          source: o,
          costB: B,
          costM: M,
          costE: 0,
          fit: 1,
          level:
            kind === "factor"
              ? 1 + Math.floor(S.r(w, "factor/level", w.turn, o.id) * 3)
              : null,
        });
    }
    return candidates;
  }
  function mineralCandidates(w, ctx) {
    return ctx.ca
      .filter(
        (c) =>
          c.kind !== "info" &&
          !ctx.exhausted.has(c.cell + ":" + c.kind) &&
          (c.growth
            ? w.resources.includes(c.growth)
            : !ctx.startResource.has(c.cell + ":" + c.kind)),
      )
      .map((c) => ({
        ...c,
        E: 0,
        M: c.q * (c.kind === "mineral" ? 2 : 1),
        G: 0,
        expires: null,
        source: w.tiles[c.cell],
        sourceId: "soil:" + c.cell,
        costSoil: c.q * (c.kind === "mineral" ? 2 : 1),
        fit:
          c.kind === "mineral"
            ? w.tiles[c.cell].terrain === "rock"
              ? 2
              : 1
            : ["shallow", "mud"].includes(w.tiles[c.cell].terrain)
              ? 2
              : 1,
      }));
  }
  function candidateOrder(a, b) {
    return (
      b.fit - a.fit ||
      b.capacity - a.capacity ||
      a.h - b.h ||
      S.compare(a.kind, b.kind)
    );
  }
  function supply(w, ctx, candidates) {
    const groups = new Map();
    for (const c of candidates) {
      c.sourceId = c.sourceId || c.source.id;
      c.h = S.hash(w, "supply/arbitration", w.turn, c.sourceId, [
        c.cell,
        c.kind,
      ]);
      c.capacity = Math.min(
        c.costE ? (c.source.E - 5) / c.costE : Infinity,
        c.costB ? c.source.B / c.costB : Infinity,
        c.costM ? c.source.M / c.costM : Infinity,
        c.costSoil ? c.source.soilM / c.costSoil : Infinity,
      );
      if (!groups.has(c.sourceId)) groups.set(c.sourceId, []);
      groups.get(c.sourceId).push(c);
    }
    const funded = [];
    for (const list of groups.values()) {
      list.sort(candidateOrder);
      const source = list[0].source,
        budget = { E: source.E, B: source.B, M: source.M, soilM: source.soilM };
      for (const c of list) {
        if (
          (c.costE && budget.E - c.costE < 5 - 1e-8) ||
          (c.costB && budget.B < c.costB) ||
          (c.costM && budget.M < c.costM) ||
          (c.costSoil && budget.soilM < c.costSoil)
        )
          continue;
        for (const [k, cost] of [
          ["E", c.costE],
          ["B", c.costB],
          ["M", c.costM],
          ["soilM", c.costSoil],
        ])
          if (cost) budget[k] = S.round(budget[k] - cost);
        funded.push(c);
      }
    }
    const cells = new Map();
    for (const c of funded) {
      if (!cells.has(c.cell)) cells.set(c.cell, []);
      cells.get(c.cell).push(c);
    }
    const m = S.maps(w);
    for (const [cell, list] of cells) {
      list.sort(candidateOrder);
      const existing = m.resources.get(cell) || [],
        reserved = new Set(existing.map((a) => a.kind)),
        used = new Set();
      for (const c of list) {
        const old = existing.find((a) => a.kind === c.kind);
        if (
          used.has(c.kind) ||
          (old && old.q >= S.FOOD[c.kind].cap) ||
          (!old && reserved.size >= 3)
        )
          continue;
        if (
          old &&
          c.kind === "info" &&
          old.event && (old.event.id !== c.event?.id ||
            S.stable(old.event) !== S.stable(c.event))
        )
          continue;
        used.add(c.kind);
        reserved.add(c.kind);
        for (const [k, cost] of [
          ["E", c.costE],
          ["B", c.costB],
          ["M", c.costM],
          ["soilM", c.costSoil],
        ])
          if (cost) c.source[k] = S.round(c.source[k] - cost);
        if (c.costE) S.dissipate(w, c.costE - c.E);
        if (c.kind === "factor") S.dissipate(w, c.costB - c.E);
        if (old) {
          if(c.kind === "info" && !old.event) old.event=structuredClone(c.event);
          old.q += c.q;
          old.E = S.round(old.E + c.E);
          old.M = S.round(old.M + c.M);
          if (c.expires !== null)
            old.expires = Math.min(old.expires, c.expires);
        } else
          w.resources.push({
            cell,
            kind: c.kind,
            q: c.q,
            E: c.E,
            M: c.M,
            G: 0,
            created: w.turn,
            expires: c.expires,
            event: c.event || null,
            level: c.level || null,
          });
        if (c.opQ) {
          ctx.mediated = (ctx.mediated || 0) + 1;
          const q = c.opQ;
          q.E = S.round(q.E - 0.02);
          S.dissipate(w, 0.02);
          q.ready = w.turn + 5;
          q.seen.push({ id: c.event.id, expires: c.event.time + 20 });
          q.seen = q.seen.filter((x) => x.expires > w.turn).slice(-5);
        }
        if (c.kind === "info") {
          ctx.records.get(c.source.id).emitted = true;
          (ctx.infoEmissions??=[]).push({id:c.event.id,sourceId:c.event.sourceId,species:c.source.species,time:c.event.time,mediated:!!c.opQ});
        }
      }
    }
  }
  return { CellResources, groupLoss, groupDamage,
    efficiency,
    absorb,
    expireAndCA,
    sourceList,
    feed,
    spend,
    carcass,
    settle,
    payActions,
    investAndDrops,
    mineralCandidates,
    candidateOrder,
    supply,
  };
});
