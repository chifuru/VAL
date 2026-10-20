/* Presentation-only exact turn records. Never part of the world or its hash. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(()=>node?require('./state.js').PrimaryParasite:root.EcoState?.PrimaryParasite,()=>node?require('./state.js').HyperParasite:root.EcoState?.HyperParasite,()=>node?require('./relationship-network.js'):root.EcoRelationshipNetwork);if(node)module.exports=api;else root.EcoObservations=api;})(globalThis,(primaryAPI,hyperAPI,relationshipAPI)=>{
  'use strict';
  const colonyDefinition='producer-colony-observed/1',colonyFields=['count','B','baseB','edibleB','reserveE','reserveM','activitySum','occupiedCells','eligibleCells','solarInputE','productionB','regrowthB','consumedB'];
  const consumerDefinition='consumer-group-observed/1',consumerFields=['groups','individuals','B','E','M','infectedIndividuals','born','combat','harvest','starvation','age','dispersed','joined','assimilatedE'];
  const fungalDefinition='fungal-colony-observed/1',fungalFields=['count','B','baseB','edibleB','capacityB','reserveE','reserveM','consumedB','regrowthB','regrowthCostE','assimilatedE','dormantCount'];
  const independentDefinition='independent-plant-observed/1',independentFields=[...colonyFields,'capacityB'];
  const ryoukiDefinition='ryouki-observed/1',ryoukiFields=['count','normal','mutated','mutatedEarly','mutatedIV','occupiedCells','cohabitingIndividuals','maxOccupancy'];
  const primaryDefinition='primary-parasite-observed/1',primaryFlowDefinition='primary-parasite-flow/1',primarySpecies=['leafparasite','tideparasite'],primaryRoutes=['contact','feeding','carcass','water'],primaryFlowFields=['exposureE','exposures','invasionAttempts','invaded','established','cleared','transferred','releasedE'];
  const primaryStockFields=[...['count','hosted','external','migrating','mature'].map(k=>[k,'colony',true]),...primarySpecies.map(k=>['bySpecies.'+k,'colony',true]),...[0,1,2].map(k=>['phases.'+k,'colony',true]),...['first','middle','extra','terminal'].map(k=>['stages.'+k,'colony',true]),['biomassB','model_B'],['reserveE','model_E'],...['inocula','exposed','invading'].flatMap(k=>[[k+'.records','infection_record',true],[k+'.amount','infection_amount'],[k+'.reserveE','model_E']]),...['contact','water','edible','carcass'].map(k=>['inocula.byKind.'+k,'infection_amount']),['resistance.hosts','individual',true],['resistance.entries','resistance_record',true],['resistance.stored','resistance_sum'],['resistance.effective','resistance_sum'],['resistance.paidE','model_E']];
  const hyperDefinition='hyper-parasite-observed/1',hyperFlowDefinition='hyper-parasite-flow/1',hyperStates=['egg','larva','preparation','adult'],hyperFlowFields=['exposures','invasionAttempts','invaded','established','cleared','emergenceAttempts','emergenceFailed','emerged','eggsLaid','offspringEstablished','fedE','moved','preyed','maintenanceE','developmentE','metaE','informationE','emergenceE','movementE','laidE'];
  const hyperStockFields=[...['count','attached','free','migrating','mature'].map(k=>[k,'colony',true]),...[0,1,2,3].map(k=>['phases.'+k,'colony',true]),...hyperStates.map(k=>['states.'+k,'colony',true]),['biomassB','model_B'],['reserveE','model_E'],['invading.records','infection_record',true],['invading.amount','infection_amount'],['invading.reserveE','model_E'],['resistance.hosts','colony',true],['resistance.stored','resistance_sum'],['resistance.effective','resistance_sum'],['resistance.paidE','model_E']];
  const persistentDefinition='persistent-information-observed/1',persistentFlowDefinition='persistent-information-flow/1';
  const persistentStockFields=[...['subjects','experiencedSubjects','holdingSubjects'].map(k=>[k,'management_unit',true]),['ownSummaries','experience_summary',true],['learnedOrigins','learned_origin',true],['field.records','information_record',true],['field.cells','cell',true],['field.origins','information_origin',true],['field.contents','information_content',true],...['field.amount','ledger.initialAmount','ledger.generatedAmount','ledger.inactivatedAmount','ledger.remainingAmount'].map(k=>[k,'information_amount'])];
  const persistentFlowFields=['ownExperiences','holdingQualified','deathDecisions','candidateDeaths','normalGenerated','lowGenerated','noGeneration','generatedAmount','expiredAmount','capacityLostAmount','microLostAmount','movedAmount','originsRead','contentsRead','rejectedScope','rejectedContext','rejectedBudget','deduplicated','learned','learningDeltaAbs','placeApplications','placeMagnitude','receptionCostE','qPromoted','qDistorted','environmentRead','ordinaryRead','caregiverRead'];
  const persistentFlowUnit=k=>k.endsWith('Amount')?'information_amount':k.endsWith('E')?'model_E':k==='learningDeltaAbs'?'weight_delta_absolute':k==='placeMagnitude'?'place_influence_absolute':'event';
  const pathValue=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
  function validPersistent(row,turn){
    if(row?.definition!==persistentDefinition||row.turn!==turn||persistentStockFields.some(([key,,integer])=>{const n=pathValue(row,key);return !Number.isFinite(n)||n<0||(integer&&!Number.isSafeInteger(n));}))return false;
    return row.holdingSubjects<=row.experiencedSubjects&&row.experiencedSubjects<=row.subjects&&row.field.cells<=row.field.records&&row.field.origins<=row.field.records&&row.field.contents>=row.field.records&&Math.abs(row.field.amount-row.ledger.remainingAmount)<1e-6&&Math.abs(row.ledger.initialAmount+row.ledger.generatedAmount-row.ledger.inactivatedAmount-row.ledger.remainingAmount)<1e-4;
  }
  function validPersistentFlow(row,turn){
    const a=row?.all;return row?.definition===persistentFlowDefinition&&row.turn===turn&&a&&persistentFlowFields.every(k=>Number.isFinite(a[k])&&a[k]>=0&&(persistentFlowUnit(k)!=='event'||Number.isSafeInteger(a[k])))&&a.candidateDeaths<=a.deathDecisions&&a.normalGenerated+a.lowGenerated+a.noGeneration===a.deathDecisions&&a.learned<=a.originsRead&&a.qDistorted<=a.normalGenerated&&a.environmentRead+a.ordinaryRead+a.caregiverRead===a.originsRead;
  }
  function validPrimary(row,turn,counts){
    if(row?.definition!==primaryDefinition||row.turn!==turn||primaryStockFields.some(([key,,integer])=>{const n=pathValue(row,key);return !Number.isFinite(n)||n<0||(integer&&!Number.isSafeInteger(n));})||!Array.isArray(row.phases)||row.phases.length!==3)return false;
    return row.count===row.hosted+row.external&&row.count===primarySpecies.reduce((n,id)=>n+row.bySpecies[id],0)&&row.count===row.phases.reduce((a,n)=>a+n,0)&&row.count===Object.values(row.stages).reduce((a,n)=>a+n,0)&&row.migrating<=row.external&&row.mature<=row.count&&row.resistance.hosts<=row.resistance.entries&&row.resistance.effective<=row.resistance.stored+1e-6&&Math.abs(row.inocula.amount-Object.values(row.inocula.byKind).reduce((a,n)=>a+n,0))<1e-6&&(!counts||primarySpecies.every(id=>row.bySpecies[id]===counts[id]));
  }
  function validPrimaryFlow(row,turn){
    return row?.definition===primaryFlowDefinition&&row.turn===turn&&primarySpecies.every(id=>primaryRoutes.every(route=>{const r=row.bySpecies?.[id]?.[route];return r&&primaryFlowFields.every(k=>Number.isFinite(r[k])&&r[k]>=0&&(k.endsWith('E')||Number.isSafeInteger(r[k])))&&r.invaded<=r.invasionAttempts;}));
  }
  function validHyper(row,turn,count){
    if(row?.definition!==hyperDefinition||row.turn!==turn||hyperStockFields.some(([key,,integer])=>{const n=pathValue(row,key);return !Number.isFinite(n)||n<0||(integer&&!Number.isSafeInteger(n));})||!Array.isArray(row.phases)||row.phases.length!==4)return false;
    return row.count===count&&row.count===row.attached+row.free&&row.count===row.phases.reduce((a,n)=>a+n,0)&&row.count===hyperStates.reduce((a,k)=>a+row.states[k],0)&&row.free===row.phases[3]&&row.free===row.states.adult&&row.migrating<=row.attached&&row.free<=row.mature&&row.mature<=row.count&&row.resistance.effective<=row.resistance.stored+1e-6;
  }
  function validHyperFlow(row,turn){
    const r=row?.bySpecies?.hyperparasite;return row?.definition===hyperFlowDefinition&&row.turn===turn&&r&&hyperFlowFields.every(k=>Number.isFinite(r[k])&&r[k]>=0&&(k.endsWith('E')||Number.isSafeInteger(r[k])))&&r.invaded<=r.invasionAttempts&&r.eggsLaid<=r.invaded&&r.offspringEstablished<=r.established&&r.emergenceFailed+r.emerged<=r.emergenceAttempts;
  }
  function validColony(row,turn){
    if(!row||row.definition!==colonyDefinition||row.turn!==turn)return false;
    return ['land','water'].every(region=>{
      const r=row[region];if(!r||colonyFields.some(k=>!Number.isFinite(r[k])||r[k]<0))return false;
      if(['count','occupiedCells','eligibleCells'].some(k=>!Number.isSafeInteger(r[k]))||r.occupiedCells>r.eligibleCells||r.occupiedCells>r.count||r.edibleB>r.B||r.baseB>r.B||r.activitySum>r.count||r.regrowthB>r.productionB)return false;
      return r.eligibleCells===0?r.occupancy===null:Number.isFinite(r.occupancy)&&Math.abs(r.occupancy-r.occupiedCells/r.eligibleCells)<1e-12;
    });
  }
  function validConsumers(row,turn,counts,composition,capacity){
    if(row?.definition!==consumerDefinition||row.turn!==turn||!row.species)return false;
    return ['grassbug','waterbug'].every(id=>{const a=row.species[id],c=composition?.[id],n=counts?.[id]||0;
      return a&&consumerFields.every(k=>Number.isFinite(a[k])&&a[k]>=0)&&a.individuals===n&&a.groups<=n&&n<=a.groups*capacity&&a.infectedIndividuals<=a.groups&&
        consumerFields.filter(k=>!['B','E','M','assimilatedE'].includes(k)).every(k=>Number.isSafeInteger(a[k]))&&
        (!n&&!c||c&&c.phases.reduce((n,v)=>n+v,0)===n&&Object.values(c.ages).reduce((n,v)=>n+v,0)===n&&c.sex.none===n);
    });
  }
  function validFungal(row,turn,count){
    return row?.definition===fungalDefinition&&row.turn===turn&&row.count===count&&Number.isSafeInteger(row.count)&&Number.isSafeInteger(row.dormantCount)&&row.dormantCount<=row.count&&fungalFields.every(k=>Number.isFinite(row[k])&&row[k]>=0)&&Math.abs(row.B-row.baseB-row.edibleB)<.00001&&row.edibleB<=row.capacityB+.00001;
  }
  function validIndependent(row,turn){
    return row?.definition===independentDefinition&&validColony({...row,definition:colonyDefinition},turn)&&['land','water'].every(r=>Number.isFinite(row[r].capacityB)&&row[r].capacityB>=row[r].edibleB);
  }
  function validRyouki(row,turn,count){
    if(row?.definition!==ryoukiDefinition||row.turn!==turn||ryoukiFields.some(k=>!Number.isSafeInteger(row[k])||row[k]<0)||row.count!==count)return false;
    if(row.normal+row.mutated!==row.count||row.mutatedEarly+row.mutatedIV!==row.mutated||row.occupiedCells>row.count||row.cohabitingIndividuals>row.mutated||row.maxOccupancy>3)return false;
    if(!row.count)return row.occupiedCells===0&&row.cohabitingIndividuals===0&&row.maxOccupancy===0;
    const sharedCells=row.occupiedCells-(row.count-row.cohabitingIndividuals);
    return row.occupiedCells>0&&row.maxOccupancy>0&&row.count<=row.occupiedCells*row.maxOccupancy&&(row.maxOccupancy===1?row.cohabitingIndividuals===0&&sharedCells===0:sharedCells>0&&row.cohabitingIndividuals>=2*sharedCells&&row.cohabitingIndividuals<=3*sharedCells&&(row.maxOccupancy===2?row.cohabitingIndividuals===2*sharedCells:row.cohabitingIndividuals>2*sharedCells));
  }
  function create(config,version,{maxBytes=256*1024*1024,species=[]}={}){
    if(config.relationshipModel!==undefined&&config.relationshipModel!=='network/1')throw Error('未知の関係図観測モデルです。');
    const rows=[],levels=[],metadata={schema:'ecology-observation/1',version,config:structuredClone(config),...(config.consumerModel==='group/1'?{consumerGroupDefinition:consumerDefinition}:{}),...(config.balanceModel==='survival/4'?{fungalColonyDefinition:fungalDefinition}:{}),...(config.producerModel==='colony/1'?{producerColonyDefinition:colonyDefinition}:{}),...(config.largePlantModel==='independent/1'?{independentPlantDefinition:independentDefinition}:{}),...(config.ryoukiModel==='ryouki/1'?{ryoukiDefinition}:{}),...(config.primaryParasiteModel==='primary/1'?{primaryParasiteDefinition:primaryDefinition,primaryParasiteFlowDefinition:primaryFlowDefinition}:{}),...(config.hyperParasiteModel==='hyper/1'?{hyperParasiteDefinition:hyperDefinition,hyperParasiteFlowDefinition:hyperFlowDefinition}:{}),...(config.informationModel==='persistent/1'?{persistentInformationDefinition:persistentDefinition,persistentInformationFlowDefinition:persistentFlowDefinition}:{}),species:species.map(({id,name,group,kind,slot})=>({id,name,group,...(config.largePlantModel==='independent/1'?{...(kind!==undefined?{kind}:{}),...(slot!==undefined?{slot}:{})}:{})}))};
    if(config.relationshipModel==='network/1')metadata.relationshipDefinition=relationshipAPI().definition;
    const byId=Object.fromEntries(species.map(s=>[s.id,s])),groupOrder=['plant','prey','main','fungus','P','Q'],groupNames={plant:'生産者',prey:'一次消費者',main:'主生物',fungus:'分解者',P:'P',Q:'Q'};
    let exportedThrough=-1,estimatedBytes=0,dietFrames=[],dietFrameBytes=[],allocations=new Map(),informationOrigins=new Map(),rolling={queue:[],edges:new Map(),units:{},events:{}};
    let stagedRolling=null,stagedNutritionNeeded=null,nutritionNeeded=new Map();
    const nutritionSummaries=new WeakMap();
    function roll(row){
      const next={queue:[...rolling.queue,row],edges:new Map(rolling.edges),units:{...rolling.units},events:{...rolling.events}},expired=next.queue.length>50?next.queue.shift():null;
      if(expired)for(const [key,n]of Object.entries(expired.relations))if(n>0){const list=next.edges.get(key);if(list?.length===1)next.edges.delete(key);else if(list)next.edges.set(key,list.slice(1));}
      let order=0;for(const [key,n]of Object.entries(row.relations)){if(n>0)next.edges.set(key,[...(next.edges.get(key)||[]),[row.turn,n,order]]);order++;}
      const count=(r,sign)=>{if(!r||r.turn===0)return;for(const [id,n]of Object.entries(r.counts))next.units[id]=(next.units[id]||0)+sign*n;
        const events={...r.contactEpisodes};for(const [key,n]of Object.entries(r.relations))if(!key.endsWith('|contact')&&!key.endsWith('|bond'))events[key]=(events[key]||0)+n;
        for(const [key,n]of Object.entries(events)){const [from,to]=key.split('|');next.events[from]=(next.events[from]||0)+sign*n;next.events[to]=(next.events[to]||0)+sign*n;}};
      count(expired,-1);count(row,1);
      next.ordered=[...next.edges].sort((a,b)=>a[1][0][0]-b[1][0][0]||a[1][0][2]-b[1][0][2]);return next;
    }
    function nutritionSummary(frame){
      if(nutritionSummaries.has(frame))return nutritionSummaries.get(frame);
      const summary={needed:new Set(),inputs:new Map(),predators:{},scavengers:{},edges:{},uptake:0},push=(map,key,value)=>{(map[key]??=[]).push(value);};
      for(const e of frame.inputs||[]){summary.needed.add(e.id);if(e.source)summary.needed.add(e.type==='carcass'?e.source.slice(2,e.source.lastIndexOf(':')):e.source);
        if(!['plant','fungus'].includes(byId[e.species]?.group)&&(e.type==='light'||['plant','fungal','animal'].includes(e.tag))){if(!summary.inputs.has(e.id))summary.inputs.set(e.id,[]);if(e.energy>0)summary.inputs.get(e.id).push(e);}
        if(e.type==='carcass'&&e.tag==='animal'&&e.energy>0)push(summary.scavengers,e.species,e.energy);
        if(e.type==='plant'&&e.tag==='animal'&&e.energy>0)push(summary.predators,e.species,e.energy);
        if(['plant','fungal','animal'].includes(e.tag))summary.uptake+=e.energy;
        const from=e.type==='carcass'?'detritus':e.type==='light'||e.type==='resource'||e.type==='soil'?'resource':byId[e.sourceSpecies]?.group,to=byId[e.species]?.group;
        if(from&&to&&e.energy>0&&(e.type==='light'||['plant','fungal','animal'].includes(e.tag)))push(summary.edges,from+'|'+to,e.energy);
      }
      nutritionSummaries.set(frame,summary);return summary;
    }
    function trophic(w,frames,primary=[],hyper=[]){
      const inputById=new Map(),production={},predators={},combatKills={},scavengers={},edges={},next=new Map(),side={decomposer:0,remains:0,unknown:0},layers=[0,0,0,0],fresh=w.observation?.flowTelemetry;
      stagedNutritionNeeded=new Map(nutritionNeeded);
      if(dietFrames.length===50)for(const id of nutritionSummary(dietFrames[0]).needed){const n=stagedNutritionNeeded.get(id)-1;if(n)stagedNutritionNeeded.set(id,n);else stagedNutritionNeeded.delete(id);}
      for(const id of nutritionSummary(frames.at(-1)).needed)stagedNutritionNeeded.set(id,(stagedNutritionNeeded.get(id)||0)+1);
      const needed=new Set(stagedNutritionNeeded.keys());
      // Preserve the chronological floating-point addition order for every key.
      const add=(target,source)=>{for(const [key,values]of Object.entries(source))for(const value of values)target[key]=(target[key]||0)+value;};
      for(const frame of frames){const summary=nutritionSummary(frame);
        for(const [id,n]of Object.entries(frame.combat?.kills||{}))combatKills[id]=(combatKills[id]||0)+n;
        for(const [id,e]of Object.entries(frame.production||{}))production[id]=(production[id]||0)+e;
        for(const [id,values]of summary.inputs){if(!inputById.has(id))inputById.set(id,[]);for(const value of values)inputById.get(id).push(value);}
        add(predators,summary.predators);add(scavengers,summary.scavengers);add(edges,summary.edges);
      }
      for(const o of [...w.organisms||[],...primary.map(e=>e.p),...hyper.map(e=>e.q)]){needed.add(o.id);const group=byId[o.species]?.group,B=Math.max(0,o.B||0);let parts=[0,0,0,0,0];
        if(group==='plant')parts[0]=1;
        else if(group==='fungus'){side.decomposer+=B;continue;}
        else {let total=0;for(const e of inputById.get(o.id)||[]){total+=e.energy;
          if(e.type==='light'){parts[0]+=e.energy;continue;}
          const id=e.type==='carcass'?e.source.slice(2,e.source.lastIndexOf(':')):e.source,
            source=allocations.get(id)||(byId[e.sourceSpecies]?.group==='plant'?[1,0,0,0,0]:null);
          if(!source){parts[4]+=e.energy;continue;}
          for(let i=0;i<4;i++)parts[Math.min(3,i+1)]+=source[i]*e.energy;parts[4]+=source[4]*e.energy;
        }
        if(total>0)parts=parts.map(n=>n/total);else parts[4]=1;}
        next.set(o.id,parts);for(let i=0;i<4;i++)layers[i]+=parts[i]*B;side.unknown+=parts[4]*B;
      }
      for(const [id,v]of allocations)if(needed.has(id)&&!next.has(id))next.set(id,v);
      side.remains=(w.carcasses||[]).reduce((n,a)=>n+Math.max(0,a.q||0),0);
      const ranking=values=>Object.entries(values).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([id,value])=>({id,name:byId[id]?.name||id,value}));
      return {allocation:next,data:{definition:'trophic-observed/1',layers,side,biomassTotal:layers.reduce((a,n)=>a+n,0)+side.unknown+side.decomposer,
        production:fresh&&w.turn>0?Object.values(production).reduce((a,n)=>a+n,0):null,
        uptake:fresh&&w.turn>0?frames.reduce((n,f)=>n+nutritionSummary(f).uptake,0):null,
        edges,leaders:{production:ranking(production),predation:ranking(predators),scavenging:ranking(scavengers),...(w.turn>0&&frames.every(f=>f.combat?.definition==="combat-observed/1")?{combat:ranking(combatKills)}:{})},window:Math.min(50,w.turn),source:'直近50Tの同化と光合成。供給元は前ターンの配分、第4段以上は集約。'}};
    }

    function current(w,row,window,primary=[],hyper=[]){
      const counts={...row.counts},seen=new Set(),bonds={},mass={},addBond=(from,to)=>{const k=from+'|'+to+'|bond';bonds[k]=(bonds[k]||0)+1;};
      if(Array.isArray(w.organisms)){
        for(const id of new Set(['tideparasite','leafparasite','hyperparasite',...species.filter(s=>['P','Q'].includes(s.group)).map(s=>s.id)]))counts[id]=0;
        const parasite=(p,host)=>{if(!p||seen.has(p.id))return;seen.add(p.id);counts[p.species]=(counts[p.species]||0)+1;if(host)addBond(p.species,host);if(p.q&&config.hyperParasiteModel!=='hyper/1')parasite(p.q,p.species);};
        for(const o of w.organisms){mass[o.species]=(mass[o.species]||0)+Math.max(0,o.B||0);if(config.primaryParasiteModel!=='primary/1'&&o.infection)parasite(o.infection,o.species);}
        if(config.primaryParasiteModel==='primary/1')for(const e of primary){mass[e.p.species]=(mass[e.p.species]||0)+e.p.B;parasite(e.p,e.host?.species);}
        else for(const a of w.carcasses||[])if(a.payloadExpires>w.turn)parasite(a.infection,a.species);
        if(config.hyperParasiteModel==='hyper/1')for(const e of hyper){mass[e.q.species]=(mass[e.q.species]||0)+e.q.B;parasite(e.q,e.p?.species);}
        else for(const q of w.searchQ||[])if(q.expires>w.turn&&!seen.has(q.id))parasite(q,null);
      }
      if(w.turn>0&&Array.isArray(w.organisms)){for(const key of Object.keys(row.relations))if(key.endsWith('|bond'))delete row.relations[key];Object.assign(row.relations,bonds);}
      const groups=groupOrder.map(id=>({id,name:groupNames[id],count:species.filter(s=>s.group===id).reduce((n,s)=>n+(counts[s.id]||0),0)})),total=Object.values(counts).reduce((a,n)=>a+n,0),edges=new Map(),kinds=new Set(),partners=new Set(),blocks=new Map();
      row.counts={...counts};stagedRolling=roll(row);
      for(const [key,entries]of stagedRolling.ordered){const [from,to,type]=key.split('|');if(type==='contact')continue;
        let total=0;for(const [turn,n]of entries){if(turn===0)continue;total+=n;const b=Math.floor((turn-1)/10),start=b*10+1,end=(b+1)*10;if(start>=Math.max(1,w.turn-49)&&end<=w.turn){if(!blocks.has(key))blocks.set(key,new Set());blocks.get(key).add(b);}}
        if(!(total>0))continue;edges.set(key,total);partners.add(from);partners.add(to);kinds.add(type==='bond'||type==='infection'?'parasitism':type);
      }
      let continuous=0;for(const set of blocks.values())if([...set].some(b=>set.has(b+1)))continuous++;
      const main=species.filter(s=>s.group==='main').map(s=>({id:s.id,name:s.name,count:counts[s.id]||0})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),leader=main[0],mainTotal=main.reduce((n,s)=>n+s.count,0),tied=leader&&main[1]?.count===leader.count;
      const labels={feeding:'採食',combat:'戦闘',care:'育児・支援',clear:'清掃',information:'情報作用',parasitism:'寄生'},types=[...kinds].filter(k=>labels[k]),names=types.map(k=>labels[k]),period=w.turn?Math.max(1,w.turn-49)+'–'+w.turn+'T':'0T';
      const majority=leader&&!tied&&leader.count>mainTotal/2;
      return {definition:'ecosystem-current/1',counts,groups,total,biomass:{bySpecies:mass,total:Object.values(mass).reduce((a,n)=>a+n,0),trophicAllocation:null,production:null},bonds,
        relations:{edges:Object.fromEntries(edges),species:partners.size,types,continuous,participatingIndividuals:null,period},
        summary:{overall:!total?'現在、生きた生物は確認されません':w.turn===0?'初期配置から、生態系の特徴を観測中':!types.length?'構成は確認できていますが、実際の関係はまだ観測中':(leader&&!tied?leader.name+'を中心とする構成。':'複数の生物が存在する構成。')+names.slice(0,3).join('・')+'の成立を確認',
          breadth:{text:partners.size<2?'系統間の成立関係はまだ確認できません':majority?leader.name+'が主生物の過半数を占め、系統間の関係も成立':'複数の系統にまたがって実際の関係が成立',detail:'関与 '+partners.size+'系統 / 成立 '+edges.size+'関係 · '+period+'（個体率は未観測）'},
          diversity:{text:names.length?names.join('・')+'が実際に成立':'実際の作用はまだ確認できません',detail:'作用 '+types.length+'種類 · '+period+'（接触のみは除外）'},
          persistence:{text:w.turn<20?'継続性を判定するための観測を蓄積中':continuous?'区間をまたいで成立した関係があります':'継続条件を満たす関係はまだ確認できません',detail:w.turn<20?'判定待ち · 完了10T区間が2つ必要':'継続 '+continuous+'関係 · '+period+' / 隣接する完了10T区間で確認'}}};
    }

    function append(w){
      if(rows.at(-1)?.turn===w.turn)return false;
      if(w.turn!==rows.length)throw Error('観測記録の欠測: '+rows.length+' → '+w.turn);
      const o=w.observation || {},relations={...o.relations},links={...o.links};
      let primary=[],hyper=[],primaryParasite,primaryParasiteFlow,hyperParasite,hyperParasiteFlow,composition=structuredClone(o.composition||{});
      if(config.primaryParasiteModel==='primary/1'){
        const api=primaryAPI();if(!api?.entries||!api.ageInfo)throw Error('一次寄生の状態APIを読み取れません。');
        primary=api.entries(w);primaryParasite=structuredClone(w.primaryParasiteSummary);primaryParasiteFlow=structuredClone(o.primaryParasite);
        if(!validPrimary(primaryParasite,w.turn,w.stats.counts)||!validPrimaryFlow(primaryParasiteFlow,w.turn))throw Error('一次寄生観測に欠測・破損または未知の定義版があります。');
        for(const id of primarySpecies)composition[id]={phases:[0,0,0,0],ages:{nonapplicable:0,elderly:0},sex:{none:0},roles:{}};
        for(const {p}of primary){const c=composition[p.species];c.phases[p.phase-1]++;c.ages[api.ageInfo(p).stage]++;c.sex.none++;}
      }
      if(config.hyperParasiteModel==='hyper/1'){
        const api=hyperAPI();if(!api?.entries||!api.ageInfo)throw Error('高次寄生の状態APIを読み取れません。');
        hyper=api.entries(w);hyperParasite=structuredClone(w.hyperParasiteSummary);hyperParasiteFlow=structuredClone(o.hyperParasite);
        if(!validHyper(hyperParasite,w.turn,w.stats.counts.hyperparasite)||!validHyperFlow(hyperParasiteFlow,w.turn)||hyper.length!==hyperParasite.count)throw Error('高次寄生観測に欠測・破損または未知の定義版があります。');
        const c=composition.hyperparasite={phases:[0,0,0,0],ages:{juvenile:0,adult:0,elderly:0},sex:{none:0},roles:{}};
        for(const {q}of hyper){c.phases[q.phase-1]++;c.ages[api.ageInfo(q).stage]++;c.sex.none++;}
      }
      let producerColony;
      if(config.producerModel==='colony/1'){
        const summary=w.colonySummary;
        if(summary?.definition!=='colony-observed/1'||summary.turn!==w.turn)throw Error('群落観測の定義またはターンが不正です。');
        producerColony={definition:colonyDefinition,turn:w.turn,...Object.fromEntries(['land','water'].map(region=>{
          const r=summary[region]||{};return [region,{...Object.fromEntries(colonyFields.map(k=>[k,r[k]])),occupancy:r.eligibleCells>0?r.occupiedCells/r.eligibleCells:null}];
        }))};
        if(!validColony(producerColony,w.turn))throw Error('群落観測に欠測・破損があります。');
      }
      let consumerGroups;
      if(config.consumerModel==='group/1'){consumerGroups=structuredClone(w.consumerGroupSummary);if(!validConsumers(consumerGroups,w.turn,w.stats.counts,composition,config.consumerGroupSettings.capacity))throw Error('一次消費者集団観測に欠測・破損があります。');}
      let fungalColony;
      if(config.balanceModel==='survival/4'){
        fungalColony=structuredClone(w.fungalColonySummary);
        if(!validFungal(fungalColony,w.turn,w.stats.counts.fungus))throw Error('菌膜群落観測に欠測・破損があります。');
      }
      let independentPlants;
      if(config.largePlantModel==='independent/1'){
        const summary=w.largePlantSummary;
        if(summary?.definition!==independentDefinition||summary.turn!==w.turn)throw Error('独立植物観測の定義またはターンが不正です。');
        independentPlants={definition:independentDefinition,turn:w.turn,...Object.fromEntries(['land','water'].map(region=>{
          const r=summary[region]||{};return [region,{...Object.fromEntries(independentFields.map(k=>[k,r[k]])),occupancy:r.eligibleCells>0?r.occupiedCells/r.eligibleCells:null}];
        }))};
        if(!validIndependent(independentPlants,w.turn))throw Error('独立植物観測に欠測・破損があります。');
      }
      let ryouki;
      if(config.ryoukiModel==='ryouki/1'){
        ryouki={definition:w.ryoukiSummary?.definition,turn:w.ryoukiSummary?.turn,...Object.fromEntries(ryoukiFields.map(k=>[k,w.ryoukiSummary?.[k]]))};
        if(!validRyouki(ryouki,w.turn,w.stats.counts.ryouki))throw Error('量機観測に欠測・破損または未知の定義版があります。');
      }
      const nextOrigins=new Map([...informationOrigins].filter(([,a])=>a.expires>w.turn)),info=o.flowTelemetry?.information;
      let information;
      let persistentInformation,persistentInformationFlow;
      if(config.informationModel==='persistent/1'){
        persistentInformation=structuredClone(w.persistentInformationSummary);persistentInformationFlow=structuredClone(o.persistentInformation);
        if(!validPersistent(persistentInformation,w.turn)||!validPersistentFlow(persistentInformationFlow,w.turn))throw Error('持続情報観測に欠測・破損または未知の定義版があります。');
        for(const key of Object.keys(relations))if(key.endsWith('|information'))delete relations[key];
        const seen=new Set();for(const a of info?.effects||[]){const id=a.event?.sourceSpecies,key=a.recipient+'|'+a.event?.id;if(!(a.deltaAbs>0)||!byId[id]||!byId[a.species]||seen.has(key))continue;seen.add(key);const relation=id+'|'+a.species+'|information';relations[relation]=(relations[relation]||0)+1;}
      }else if(info?.definition==="information-observed/1"){
        for(const a of [...info.origins,...info.emissions])if(byId[a.species]&&Number.isInteger(a.time)&&a.time+20>w.turn)nextOrigins.set(a.id,{species:a.species,expires:a.time+20});
        information={definition:"information-observed/1",generated:info.emissions.length,received:info.receipts.length,applied:0,unchanged:0,unattributed:0,mediatedGenerated:info.emissions.filter(a=>a.mediated).length,mediatedReceived:info.receipts.filter(a=>a.event?.mediated).length,mediatedApplied:0,noiseReceived:info.receipts.filter(a=>a.event?.noise).length,deltaAbs:0};
        for(const key of Object.keys(relations))if(key.endsWith('|information'))delete relations[key];
        for(const a of info.receipts)if(!a.event||!nextOrigins.has(a.event.id))information.unattributed++;
        for(const a of info.effects){
          const changed=a.deltaAbs>0;
          information[changed?'applied':'unchanged']++;information.deltaAbs+=a.deltaAbs;
          if(changed&&a.event.mediated)information.mediatedApplied++;
          const origin=nextOrigins.get(a.event.id);
          if(changed&&origin){const key=origin.species+'|'+a.species+'|information';relations[key]=(relations[key]||0)+1;}
        }
      }
      let interactions=0,bondTurns=0;
      for(const [key,n] of Object.entries(relations))if(key.endsWith('|bond'))bondTurns+=n;else if(!key.endsWith('|contact'))interactions+=n;
      const contacts=Object.values(o.contactEpisodes||{}).reduce((a,n)=>a+n,0), contactTurns=Object.values(o.contactTurns||{}).reduce((a,n)=>a+n,0);
      const row={...(consumerGroups?{consumerGroups}:{}),...(fungalColony?{fungalColony}:{}),...(producerColony?{producerColony}:{}),...(independentPlants?{independentPlants}:{}),...(ryouki?{ryouki}:{}),...(primaryParasite?{primaryParasite,primaryParasiteFlow}:{}),...(hyperParasite?{hyperParasite,hyperParasiteFlow}:{}),...(information?{information}:{}),...(persistentInformation?{persistentInformation,persistentInformationFlow}:{}),...(o.flowTelemetry?.combat?.definition==="combat-observed/1"?{combatKills:{...o.flowTelemetry.combat.kills}}:{}),environmentEstablished:{...o.environmentEstablished},externalInput:{...o.externalInput},contacts,contactTurns,contactEpisodes:{...o.contactEpisodes},contactPairs:{...o.contactTurns},turn:w.turn,counts:{...w.stats.counts},composition,birthReasons:structuredClone(o.birthReasons||{}),funnel:structuredClone(o.funnel||{}),relations,links,
        births:o.births||0,deaths:o.deaths||0,transfers:o.transfers||0,interactions,bondTurns,
        main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,Qsearch:w.stats.Qsearch||0,
        richness:Object.values(w.stats.counts).filter(n=>n>0).length,activeEdges:0,continuous:0,activeTurns:0,window:Math.min(50,w.turn)};
      const window=[...rows.slice(-49),row],edgeTurns=new Map(),buckets=new Map();
      row.current=current(w,row,window,primary,hyper);
      row.counts={...row.current.counts};row.P=(row.counts.tideparasite||0)+(row.counts.leafparasite||0);row.Q=row.counts.hyperparasite||0;
      row.richness=Object.values(row.counts).filter(n=>n>0).length;
      row.bondTurns=Object.entries(row.relations).filter(([k])=>k.endsWith('|bond')).reduce((n,[,v])=>n+v,0);
      for(const [key,entries]of stagedRolling.ordered){const blocks=new Set();for(const [turn]of entries){const block=Math.floor((turn-1)/10);if(block>=0)blocks.add(block);}edgeTurns.set(key,entries.length);buckets.set(key,blocks);}
      row.rates={};for(const id of Object.keys(row.counts)){const unitTurns=stagedRolling.units[id]||0,events=stagedRolling.events[id]||0;row.rates[id]={events,unitTurns,per100:unitTurns>0?events/unitTurns*100:null};}
      row.activeEdges=edgeTurns.size;row.activeTurns=[...edgeTurns.values()].reduce((n,a)=>n+a,0);
      const complete=Math.floor(w.turn/10)-1;for(const blocks of buckets.values())if([...blocks].some(b=>b<complete&&blocks.has(b+1)&&b*10+1>=w.turn-49))row.continuous++;
      const frame={...(w.observation?.flowTelemetry||{})};delete frame.information;
      const nextFrames=[...dietFrames,frame].slice(-50),pyramid=trophic(w,nextFrames,primary,hyper);
      row.current.pyramid=pyramid.data;row.current.biomass.production=pyramid.data.production;
      if(config.relationshipModel==='network/1')row.relationship=relationshipAPI().createRow(w,row.current,row.relations,{species});

      const bytes=JSON.stringify(row).length*4,nextFrameBytes=[...dietFrameBytes,JSON.stringify(frame).length*4].slice(-50),retainedBytes=nextFrameBytes.reduce((a,n)=>a+n,0)+Math.max(0,nextFrameBytes.length-1)*4+8;
      if(estimatedBytes+bytes+retainedBytes>maxBytes)throw Error("観測記録の容量上限に達しました。既存の全ターンCSVを書き出してください。");
      estimatedBytes+=bytes;dietFrames=nextFrames;dietFrameBytes=nextFrameBytes;allocations=pyramid.allocation;informationOrigins=nextOrigins;rolling=stagedRolling;nutritionNeeded=stagedNutritionNeeded;rows.push(row);
      // Dyadic summaries are built once per append, never by rescanning full history on each frame.
      const base={first:row.turn,last:row.turn,counts:row.counts,min:{...row.counts},max:{...row.counts}};
      (levels[0]??=[]).push(base);
      for(let l=1;levels[l-1].length%2===0;l++){
        const source=levels[l-1],a=source.at(-2),b=source.at(-1),min={},max={};
        for(const id of Object.keys(row.counts)){min[id]=Math.min(a.min[id],b.min[id]);max[id]=Math.max(a.max[id],b.max[id]);}
        (levels[l]??=[]).push({first:a.first,last:b.last,counts:b.counts,min,max});
      }
      return true;
    }
    function bins(limit=700){
      const l=Math.max(0,Math.floor(Math.log2(Math.max(1,rows.length/limit))));
      const out=[];let at=0;
      while(at<rows.length){let size=l;while(size>0 && at+2**size>rows.length)size--;const item=levels[size]?.[Math.floor(at/2**size)];if(!item)break;out.push(item);at+=2**size;}
      return out;
    }
    const seriesCache=new Map();
    function series(target='main',axis='population'){
      const accepts=id=>target==='all'||id===target||byId[id]?.group===target;
      const cacheKey=target+'|'+axis;let result=seriesCache.get(cacheKey);
      if(!result||result.length>rows.length){result=[];if(seriesCache.size>=8)seriesCache.delete(seriesCache.keys().next().value);seriesCache.set(cacheKey,result);}
      for(let at=result.length;at<rows.length;at++){const r=rows[at],values={};
        for(const [id,count]of Object.entries(r.counts))if(accepts(id)){
          if(axis==='population'){values[id]=count;continue;}
          const c=r.composition[id],data=c?.[axis];let sum=0;
          for(const [key,n]of Object.entries(data||{})){values[key]=(values[key]||0)+n;sum+=n;}
          if(count>sum)values.nonapplicable=(values.nonapplicable||0)+count-sum;
        }
        result.push({turn:r.turn,values,total:Object.values(values).reduce((a,n)=>a+n,0)});
      }
      return result;
    }
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    function* csvChunks(batch=16,{header=true}={}){
      let first=header;let out=['turn,metric,species_id,value,unit,denominator,status'];
      out.push([-1,'metadata','reproduction_config',JSON.stringify(metadata),'json','','observed'].map(quote).join(','));
      if(!header)out=[];
      const emit=(r,metric,id,n,unit,den='')=>out.push([r.turn,metric,id,n,unit,den,'observed'].map(quote).join(','));
      const populationUnit=id=>metadata.config.balanceModel==='survival/4'&&id==='fungus'?'fungal_colony':['hyperparasite','tideparasite','leafparasite'].includes(id)?'colony':metadata.config.producerModel==='colony/1'&&byId[id]?.group==='plant'&&!(byId[id]?.kind==='independent'&&byId[id].slot==='producer')?'producer_colony':'individual';
      let rowIndex=0;for(const r of rows){
        if(r.relationship){
          const network=r.relationship,emitNetwork=(metric,id,value,unit,status='observed')=>out.push([r.turn,metric,id,value,unit,'',status].map(quote).join(','));
          for(const [id,value]of Object.entries(network.biomass))emitNetwork('network_biomass',id,value===null?'':value,'model_B',value===null?'unrecorded':'observed');
          for(const [kind,status]of Object.entries(network.availability))emitNetwork('network_measurement',kind,status,'measurement_state',status);
          for(const edge of network.edges){const unit=['production','feeding','scavenging','decomposition','resource'].includes(edge.type)?'model_E':edge.type==='combat'?'HP':edge.type==='parasitism'?'colony_turn':'event';emitNetwork('network_'+edge.type,edge.from+'|'+edge.to,edge.value,unit);}
          for(const [id,value]of Object.entries(network.production))emitNetwork('network_production_by_species',id,value,'model_E');
          for(const [pair,value]of Object.entries(network.kills))emitNetwork('network_combat_kills',pair,value,'individual');
        }
        if(r.persistentInformation){
          for(const [key,unit]of persistentStockFields)emit(r,'persistent_information_'+key,'all',pathValue(r.persistentInformation,key),unit);
          for(const key of persistentFlowFields)emit(r,'persistent_information_flow_'+key,'all',r.persistentInformationFlow.all[key],persistentFlowUnit(key));
        }
        if(r.hyperParasite){
          for(const [key,unit]of hyperStockFields)emit(r,'hyper_parasite_'+key,'hyperparasite',pathValue(r.hyperParasite,key),unit);
          for(const key of hyperFlowFields)emit(r,'hyper_parasite_flow_'+key,'hyperparasite',r.hyperParasiteFlow.bySpecies.hyperparasite[key],key.endsWith('E')?'model_E':'event');
        }
        if(r.primaryParasite){
          for(const [key,unit]of primaryStockFields)emit(r,'primary_parasite_'+key,'P',pathValue(r.primaryParasite,key),unit);
          for(const id of primarySpecies)for(const route of primaryRoutes)for(const key of primaryFlowFields)emit(r,'primary_parasite_flow_'+key,id+'|'+route,r.primaryParasiteFlow.bySpecies[id][route][key],key.endsWith('E')?'model_E':'event');
        }

        if(r.ryouki)for(const key of ryoukiFields)emit(r,'ryouki_'+key,'ryouki',r.ryouki[key],key==='occupiedCells'?'cell':key==='maxOccupancy'?'individual_per_cell':'individual');
        if(r.producerColony)for(const region of ['land','water']){
          const c=r.producerColony[region],units={count:'producer_colony',B:'model_B',baseB:'model_B',edibleB:'model_B',reserveE:'model_E',reserveM:'model_M',activitySum:'activity_sum',occupiedCells:'cell',eligibleCells:'cell',solarInputE:'model_E',productionB:'model_B',regrowthB:'model_B',consumedB:'model_B'};
          for(const key of colonyFields)emit(r,'producer_colony_'+key,region,c[key],units[key]);
          if(c.occupancy!==null)emit(r,'producer_colony_occupancy',region,c.occupancy,'fraction',c.eligibleCells);
        }
        if(r.consumerGroups)for(const [id,a]of Object.entries(r.consumerGroups.species))for(const k of consumerFields)emit(r,'consumer_group_'+k,id,a[k],k==='groups'?'consumer_group':['B','E','M'].includes(k)?'model_'+k:k==='assimilatedE'?'model_E':'individual');
        if(r.fungalColony)for(const k of fungalFields)emit(r,'fungal_colony_'+k,'fungus',r.fungalColony[k],['count','dormantCount'].includes(k)?'fungal_colony':k.includes('E')?'model_E':k.includes('M')?'model_M':'model_B');
        if(r.independentPlants)for(const region of ['land','water']){
          const p=r.independentPlants[region],units={count:'individual',B:'model_B',baseB:'model_B',edibleB:'model_B',capacityB:'model_B',reserveE:'model_E',reserveM:'model_M',activitySum:'activity_sum',occupiedCells:'cell',eligibleCells:'cell',solarInputE:'model_E',productionB:'model_B',regrowthB:'model_B',consumedB:'model_B'};
          for(const key of independentFields)emit(r,'independent_plant_'+key,region,p[key],units[key]);
          if(p.occupancy!==null)emit(r,'independent_plant_occupancy',region,p.occupancy,'fraction',p.eligibleCells);
        }
        for(const [id,n]of Object.entries(r.environmentEstablished||{}))emit(r,'environment_established',id,n,populationUnit(id));
        for(const [k,n]of Object.entries(r.externalInput||{}))emit(r,'external_input_'+k,'producers',n,k==='M'?'model_M':k==='B'?'regrown_model_B':'model_E');
        for(let i=0;i<4;i++)emit(r,'trophic_B_'+(i+1),'all',r.current.pyramid.layers[i],'model_B');
        emit(r,'trophic_B_unknown','all',r.current.pyramid.side.unknown,'model_B');
        for(const [id,n] of Object.entries(r.counts))emit(r,'population',id,n,populationUnit(id));
        for(const [id,c] of Object.entries(r.composition)){
          c.phases.forEach((n,i)=>emit(r,'phase_'+(i+1),id,n,populationUnit(id)));
          for(const axis of ['ages','sex','roles'])for(const [key,n] of Object.entries(c[axis]))emit(r,axis+'_'+key,id,n,populationUnit(id));
        }
        for(const [id,rate] of Object.entries(r.rates)){if(rate.per100!==null)emit(r,'involvement_per100',id,rate.per100,'per_100_management_unit_turns',rate.unitTurns);}
        for(const [id,c] of Object.entries(r.funnel))for(const key of ['initial','born','matured','reproduced','juvenileDeaths'])emit(r,'cohort_'+key,id,c[key],populationUnit(id.split('|')[0]));
        for(const [id,reasons] of Object.entries(r.birthReasons))for(const [reason,n] of Object.entries(reasons))emit(r,'birth_blocker_'+reason,id,n,populationUnit(id.split('|')[0]));
        for(const [key,n] of Object.entries(r.contactEpisodes))emit(r,'contact_episode',key,n,'encounter');
        for(const [key,n] of Object.entries(r.contactPairs))emit(r,'contact_duration',key,n,'pair_turn');
        for(const [key,n] of Object.entries(r.relations))emit(r,key.endsWith('|bond')?'bond_active':'interaction',key,n,key.endsWith('|bond')?'colony_pair':'event');
        if(r.information)for(const [key,n]of Object.entries(r.information))if(key!=='definition')emit(r,'information_'+key,'all',n,key==='deltaAbs'?'weight_delta_absolute':'transaction');
        for(const [id,n]of Object.entries(r.combatKills||{}))emit(r,'combat_kills',id,n,'individual');
        for(const v of r.current.pyramid.leaders.scavenging||[])emit(r,'animal_carcass_assimilation_50T',v.id,v.value,'model_E',r.window);
        for(const v of r.current.pyramid.leaders.combat||[])emit(r,'combat_kills_50T',v.id,v.value,'individual',r.window);
        for(const g of r.current.groups)emit(r,'current_group',g.id,g.count,'management_unit',r.current.total);
        emit(r,'actual_relation_species','all',r.current.relations.species,'species',r.window);
        emit(r,'actual_continuous_relations','all',r.current.relations.continuous,'relation',r.window);
        for(const key of ['births','deaths','transfers','richness','activeEdges','continuous','activeTurns','interactions','contacts','contactTurns','bondTurns','Qsearch'])emit(r,key,'all',r[key],'management_unit',key==='continuous'||key==='activeEdges'?r.window:'');
        if(++rowIndex%batch===0){yield (first?'\ufeff':'')+out.join('\r\n')+'\r\n';first=false;out=[];}
      }
      if(out.length)yield (first?'\ufeff':'')+out.join('\r\n')+'\r\n';
    }
    function csv(){return [...csvChunks()].join('');}
    return {rows,metadata,append,bins,csv,csvChunks,series,snapshot({copy=true}={}){return {schema:"observation-snapshot/1",...(config.relationshipModel==='network/1'?{relationshipIntervals:relationshipAPI().intervals(rows)}:{}),definitions:{...(config.consumerModel==='group/1'?{consumerGroups:consumerDefinition}:{}),...(config.balanceModel==='survival/4'?{fungalColony:fungalDefinition}:{}),current:"ecosystem-current/1",trophic:"trophic-observed/1",nutrition:"nutrition-observed/1",...(config.relationshipModel==='network/1'?{relationship:relationshipAPI().definition}:{}),...(metadata.config.producerModel==='colony/1'?{producerColony:colonyDefinition}:{}),...(metadata.config.largePlantModel==='independent/1'?{independentPlants:independentDefinition}:{}),...(metadata.config.ryoukiModel==='ryouki/1'?{ryouki:ryoukiDefinition}:{}),...(metadata.config.primaryParasiteModel==='primary/1'?{primaryParasite:primaryDefinition,primaryParasiteFlow:primaryFlowDefinition}:{}),...(metadata.config.hyperParasiteModel==='hyper/1'?{hyperParasite:hyperDefinition,hyperParasiteFlow:hyperFlowDefinition}:{}),...(metadata.config.informationModel==='persistent/1'?{persistentInformation:persistentDefinition,persistentInformationFlow:persistentFlowDefinition}:{}),...(rows.some(r=>r.combatKills!==undefined)?{combat:"combat-observed/1"}:{}),...(rows.some(r=>r.information!==undefined)?{information:"information-observed/1"}:{})},metadata:structuredClone(metadata),rows:copy?structuredClone(rows):rows};},markExported(turn=rows.at(-1)?.turn??-1){exportedThrough=Math.max(exportedThrough,Math.min(turn,rows.at(-1)?.turn??-1));},get unexported(){return exportedThrough<(rows.at(-1)?.turn??-1);}};
  }
  function restore(snapshot,{species=[],validateOnly=false}={}){
    if(!snapshot||snapshot.schema!=="observation-snapshot/1"||snapshot.metadata?.schema!=="ecology-observation/1"||snapshot.definitions?.current!=="ecosystem-current/1"||snapshot.definitions?.trophic!=="trophic-observed/1"||snapshot.definitions?.nutrition!=="nutrition-observed/1"||(snapshot.definitions.information!==undefined&&snapshot.definitions.information!=="information-observed/1")||(snapshot.definitions.combat!==undefined&&snapshot.definitions.combat!=="combat-observed/1")||!Array.isArray(snapshot.rows)||!snapshot.rows.length)throw Error("保存された観測の形式・指標版を読み取れません。");
    const consumers=snapshot.metadata.config?.consumerModel==='group/1';
    if(consumers?(snapshot.definitions.consumerGroups!==consumerDefinition||snapshot.metadata.consumerGroupDefinition!==consumerDefinition||!Number.isSafeInteger(snapshot.metadata.config.consumerGroupSettings?.capacity)||snapshot.rows.some(r=>!validConsumers(r.consumerGroups,r.turn,r.counts,r.composition,snapshot.metadata.config.consumerGroupSettings.capacity))):(snapshot.definitions.consumerGroups!==undefined||snapshot.metadata.consumerGroupDefinition!==undefined||snapshot.rows.some(r=>r.consumerGroups!==undefined)))throw Error('保存された一次消費者集団観測に欠測・破損があります。');
    const fungi=snapshot.metadata.config?.balanceModel==='survival/4';
    if(fungi?(snapshot.definitions.fungalColony!==fungalDefinition||snapshot.metadata.fungalColonyDefinition!==fungalDefinition||snapshot.rows.some(r=>!validFungal(r.fungalColony,r.turn,r.counts?.fungus))):(snapshot.definitions.fungalColony!==undefined||snapshot.metadata.fungalColonyDefinition!==undefined||snapshot.rows.some(r=>r.fungalColony!==undefined)))throw Error('保存された菌膜群落観測に欠測・破損があります。');
    const colonies=snapshot.metadata.config?.producerModel==='colony/1';
    if((snapshot.definitions.producerColony!==undefined&&(snapshot.definitions.producerColony!==colonyDefinition||!colonies))||(colonies&&snapshot.definitions.producerColony!==colonyDefinition)||(snapshot.metadata.producerColonyDefinition!==undefined&&snapshot.metadata.producerColonyDefinition!==colonyDefinition))throw Error('保存された群落観測の指標版を読み取れません。');
    const text=JSON.stringify(snapshot,(_key,value)=>{if(typeof value==="number"&&!Number.isFinite(value))throw Error("保存された観測に非有限値があります。");return value;});if(text.length*2>256*1024*1024)throw Error("観測の読込上限を超えています。");
    for(const row of snapshot.rows)if((colonies&&!validColony(row.producerColony,row.turn))||(!colonies&&row.producerColony!==undefined))throw Error('保存された群落観測に欠測・破損があります。');
    const plants=snapshot.metadata.config?.largePlantModel==='independent/1';
    if((plants&&(!colonies||snapshot.definitions.independentPlants!==independentDefinition||snapshot.metadata.independentPlantDefinition!==independentDefinition))||(!plants&&(snapshot.definitions.independentPlants!==undefined||snapshot.metadata.independentPlantDefinition!==undefined)))throw Error('保存された独立植物観測の指標版を読み取れません。');
    if(plants)for(const id of ['forestcrown','starcrown','freshwaterlight']){
      const s=snapshot.metadata.species?.find(s=>s.id===id);
      if(s?.group!=='plant'||s.kind!=='independent'||s.slot!=='producer')throw Error('保存された独立植物の記録単位を読み取れません。');
    }
    for(const row of snapshot.rows)if((plants&&!validIndependent(row.independentPlants,row.turn))||(!plants&&row.independentPlants!==undefined))throw Error('保存された独立植物観測に欠測・破損があります。');
    const ryouki=snapshot.metadata.config?.ryoukiModel==='ryouki/1';
    if((snapshot.metadata.config?.ryoukiModel!==undefined&&!ryouki)||(ryouki&&(snapshot.definitions.ryouki!==ryoukiDefinition||snapshot.metadata.ryoukiDefinition!==ryoukiDefinition||snapshot.metadata.species?.find(s=>s.id==='ryouki')?.group!=='main'))||(!ryouki&&(snapshot.definitions.ryouki!==undefined||snapshot.metadata.ryoukiDefinition!==undefined)))throw Error('保存された量機観測の指標版を読み取れません。');
    for(const row of snapshot.rows)if((ryouki&&!validRyouki(row.ryouki,row.turn,row.counts?.ryouki))||(!ryouki&&row.ryouki!==undefined))throw Error('保存された量機観測に欠測・破損があります。');
    const primary=snapshot.metadata.config?.primaryParasiteModel==='primary/1';
    if((snapshot.metadata.config?.primaryParasiteModel!==undefined&&!primary)||(primary&&(snapshot.definitions.primaryParasite!==primaryDefinition||snapshot.definitions.primaryParasiteFlow!==primaryFlowDefinition||snapshot.metadata.primaryParasiteDefinition!==primaryDefinition||snapshot.metadata.primaryParasiteFlowDefinition!==primaryFlowDefinition))||(!primary&&(snapshot.definitions.primaryParasite!==undefined||snapshot.definitions.primaryParasiteFlow!==undefined||snapshot.metadata.primaryParasiteDefinition!==undefined||snapshot.metadata.primaryParasiteFlowDefinition!==undefined)))throw Error('保存された一次寄生観測の指標版を読み取れません。');
    for(const row of snapshot.rows)if((primary&&(!validPrimary(row.primaryParasite,row.turn,row.counts)||!validPrimaryFlow(row.primaryParasiteFlow,row.turn)))||(!primary&&(row.primaryParasite!==undefined||row.primaryParasiteFlow!==undefined)))throw Error('保存された一次寄生観測に欠測・破損があります。');
    const hyper=snapshot.metadata.config?.hyperParasiteModel==='hyper/1';
    if((snapshot.metadata.config?.hyperParasiteModel!==undefined&&!hyper)||(hyper&&(!primary||snapshot.definitions.hyperParasite!==hyperDefinition||snapshot.definitions.hyperParasiteFlow!==hyperFlowDefinition||snapshot.metadata.hyperParasiteDefinition!==hyperDefinition||snapshot.metadata.hyperParasiteFlowDefinition!==hyperFlowDefinition))||(!hyper&&(snapshot.definitions.hyperParasite!==undefined||snapshot.definitions.hyperParasiteFlow!==undefined||snapshot.metadata.hyperParasiteDefinition!==undefined||snapshot.metadata.hyperParasiteFlowDefinition!==undefined)))throw Error('保存された高次寄生観測の指標版を読み取れません。');
    for(const row of snapshot.rows)if((hyper&&(!validHyper(row.hyperParasite,row.turn,row.counts?.hyperparasite)||!validHyperFlow(row.hyperParasiteFlow,row.turn)))||(!hyper&&(row.hyperParasite!==undefined||row.hyperParasiteFlow!==undefined)))throw Error('保存された高次寄生観測に欠測・破損があります。');
    const persistent=snapshot.metadata.config?.informationModel==='persistent/1';
    if((snapshot.metadata.config?.informationModel!==undefined&&!persistent)||(persistent&&(snapshot.metadata.config.informationSettings?.version!=='persistent-information-parameters/1'||snapshot.metadata.config.informationSettings?.roleDefinition!=='persistent-information-roles/1'||!Number.isFinite(snapshot.metadata.config.informationSettings.influence)||snapshot.metadata.config.informationSettings.influence<0||snapshot.metadata.config.informationSettings.influence>4||snapshot.definitions.persistentInformation!==persistentDefinition||snapshot.definitions.persistentInformationFlow!==persistentFlowDefinition||snapshot.metadata.persistentInformationDefinition!==persistentDefinition||snapshot.metadata.persistentInformationFlowDefinition!==persistentFlowDefinition))||(!persistent&&(snapshot.definitions.persistentInformation!==undefined||snapshot.definitions.persistentInformationFlow!==undefined||snapshot.metadata.persistentInformationDefinition!==undefined||snapshot.metadata.persistentInformationFlowDefinition!==undefined)))throw Error('保存された持続情報観測の指標版を読み取れません。');
    for(const row of snapshot.rows)if((persistent&&(!validPersistent(row.persistentInformation,row.turn)||!validPersistentFlow(row.persistentInformationFlow,row.turn)||row.information!==undefined))||(!persistent&&(row.persistentInformation!==undefined||row.persistentInformationFlow!==undefined)))throw Error('保存された持続情報観測に欠測・破損があります。');
    for(let i=0;i<snapshot.rows.length;i++){const r=snapshot.rows[i];if((r.information!==undefined&&(snapshot.definitions.information!=="information-observed/1"||r.information?.definition!=="information-observed/1"||Object.entries(r.information).some(([k,n])=>k!=="definition"&&(!Number.isFinite(n)||n<0))))||(r.combatKills!==undefined&&(snapshot.definitions.combat!=="combat-observed/1"||!r.combatKills||Array.isArray(r.combatKills)||Object.values(r.combatKills).some(n=>!Number.isSafeInteger(n)||n<0)))||r.turn!==i||!r.counts||!r.composition||!r.current?.pyramid||!r.current?.relations||!r.current?.bonds||!r.current?.summary||r.current.pyramid.definition!=="trophic-observed/1"||r.current.pyramid.layers?.length!==4||r.current.pyramid.layers.some(n=>!Number.isFinite(n)||n<0)||Object.values(r.counts).some(n=>!Number.isFinite(n)||n<0))throw Error("保存された全ターン観測に欠測・破損があります。");}
    if(snapshot.metadata.config?.relationshipModel!==undefined||snapshot.definitions.relationship!==undefined||snapshot.relationshipIntervals!==undefined||snapshot.rows.some(r=>r.relationship!==undefined))relationshipAPI().validateSnapshot(snapshot);
    if(validateOnly)return true;
    const catalogue=snapshot.metadata.species?.length?snapshot.metadata.species:species,h=create(snapshot.metadata.config,snapshot.metadata.version,{species:catalogue});h.rows.push(...structuredClone(snapshot.rows));Object.assign(h.metadata,structuredClone(snapshot.metadata));
    h.append=()=>{throw Error("保存した観測は読取専用です。");};const definitions=structuredClone(snapshot.definitions);h.snapshot=()=>({schema:'observation-snapshot/1',...(snapshot.relationshipIntervals?{relationshipIntervals:structuredClone(snapshot.relationshipIntervals)}:{}),definitions:structuredClone(definitions),metadata:structuredClone(h.metadata),rows:structuredClone(h.rows)});
    h.bins=(limit=700)=>{const size=2**Math.max(0,Math.floor(Math.log2(Math.max(1,h.rows.length/limit)))),out=[];for(let i=0;i<h.rows.length;i+=size){const chunk=h.rows.slice(i,i+size),last=chunk.at(-1),min={},max={};for(const id of Object.keys(last.counts)){min[id]=Math.min(...chunk.map(r=>r.counts[id]||0));max[id]=Math.max(...chunk.map(r=>r.counts[id]||0));}out.push({first:chunk[0].turn,last:last.turn,counts:{...last.counts},min,max});}return out;};return h;
  }
  return {create,restore};
});
