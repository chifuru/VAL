/* Presentation-only exact turn records. Never part of the world or its hash. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoObservations=api;})(globalThis,()=>{
  'use strict';
  const colonyDefinition='producer-colony-observed/1',colonyFields=['count','B','baseB','edibleB','reserveE','reserveM','activitySum','occupiedCells','eligibleCells','solarInputE','productionB','regrowthB','consumedB'];
  const independentDefinition='independent-plant-observed/1',independentFields=[...colonyFields,'capacityB'];
  function validColony(row,turn){
    if(!row||row.definition!==colonyDefinition||row.turn!==turn)return false;
    return ['land','water'].every(region=>{
      const r=row[region];if(!r||colonyFields.some(k=>!Number.isFinite(r[k])||r[k]<0))return false;
      if(['count','occupiedCells','eligibleCells'].some(k=>!Number.isSafeInteger(r[k]))||r.occupiedCells>r.eligibleCells||r.occupiedCells>r.count||r.edibleB>r.B||r.baseB>r.B||r.activitySum>r.count||r.regrowthB>r.productionB)return false;
      return r.eligibleCells===0?r.occupancy===null:Number.isFinite(r.occupancy)&&Math.abs(r.occupancy-r.occupiedCells/r.eligibleCells)<1e-12;
    });
  }
  function validIndependent(row,turn){
    return row?.definition===independentDefinition&&validColony({...row,definition:colonyDefinition},turn)&&['land','water'].every(r=>Number.isFinite(row[r].capacityB)&&row[r].capacityB>=row[r].edibleB);
  }
  function create(config,version,{maxBytes=256*1024*1024,species=[]}={}){
    const rows=[],levels=[],metadata={schema:'ecology-observation/1',version,config:structuredClone(config),...(config.producerModel==='colony/1'?{producerColonyDefinition:colonyDefinition}:{}),...(config.largePlantModel==='independent/1'?{independentPlantDefinition:independentDefinition}:{}),species:species.map(({id,name,group,kind,slot})=>({id,name,group,...(config.largePlantModel==='independent/1'?{...(kind!==undefined?{kind}:{}),...(slot!==undefined?{slot}:{})}:{})}))};
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
    function trophic(w,frames){
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
      for(const o of w.organisms||[]){needed.add(o.id);const group=byId[o.species]?.group,B=Math.max(0,o.B||0);let parts=[0,0,0,0,0];
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

    function current(w,row,window){
      const counts={...row.counts},seen=new Set(),bonds={},mass={},addBond=(from,to)=>{const k=from+'|'+to+'|bond';bonds[k]=(bonds[k]||0)+1;};
      if(Array.isArray(w.organisms)){
        for(const id of new Set(['tideparasite','leafparasite','hyperparasite',...species.filter(s=>['P','Q'].includes(s.group)).map(s=>s.id)]))counts[id]=0;
        const parasite=(p,host)=>{if(!p||seen.has(p.id))return;seen.add(p.id);counts[p.species]=(counts[p.species]||0)+1;if(host)addBond(p.species,host);if(p.q)parasite(p.q,p.species);};
        for(const o of w.organisms){mass[o.species]=(mass[o.species]||0)+Math.max(0,o.B||0);if(o.infection)parasite(o.infection,o.species);}
        for(const a of w.carcasses||[])if(a.payloadExpires>w.turn)parasite(a.infection,a.species);
        for(const q of w.searchQ||[])if(q.expires>w.turn&&!seen.has(q.id))parasite(q,null);
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
      let producerColony;
      if(config.producerModel==='colony/1'){
        const summary=w.colonySummary;
        if(summary?.definition!=='colony-observed/1'||summary.turn!==w.turn)throw Error('群落観測の定義またはターンが不正です。');
        producerColony={definition:colonyDefinition,turn:w.turn,...Object.fromEntries(['land','water'].map(region=>{
          const r=summary[region]||{};return [region,{...Object.fromEntries(colonyFields.map(k=>[k,r[k]])),occupancy:r.eligibleCells>0?r.occupiedCells/r.eligibleCells:null}];
        }))};
        if(!validColony(producerColony,w.turn))throw Error('群落観測に欠測・破損があります。');
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
      const nextOrigins=new Map([...informationOrigins].filter(([,a])=>a.expires>w.turn)),info=o.flowTelemetry?.information;
      let information;
      if(info?.definition==="information-observed/1"){
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
      const row={...(producerColony?{producerColony}:{}),...(independentPlants?{independentPlants}:{}),...(information?{information}:{}),...(o.flowTelemetry?.combat?.definition==="combat-observed/1"?{combatKills:{...o.flowTelemetry.combat.kills}}:{}),environmentEstablished:{...o.environmentEstablished},externalInput:{...o.externalInput},contacts,contactTurns,contactEpisodes:{...o.contactEpisodes},contactPairs:{...o.contactTurns},turn:w.turn,counts:{...w.stats.counts},composition:structuredClone(o.composition||{}),birthReasons:structuredClone(o.birthReasons||{}),funnel:structuredClone(o.funnel||{}),relations,links,
        births:o.births||0,deaths:o.deaths||0,transfers:o.transfers||0,interactions,bondTurns,
        main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,Qsearch:w.stats.Qsearch||0,
        richness:Object.values(w.stats.counts).filter(n=>n>0).length,activeEdges:0,continuous:0,activeTurns:0,window:Math.min(50,w.turn)};
      const window=[...rows.slice(-49),row],edgeTurns=new Map(),buckets=new Map();
      row.current=current(w,row,window);
      row.counts={...row.current.counts};row.P=(row.counts.tideparasite||0)+(row.counts.leafparasite||0);row.Q=row.counts.hyperparasite||0;
      row.richness=Object.values(row.counts).filter(n=>n>0).length;
      row.bondTurns=Object.entries(row.relations).filter(([k])=>k.endsWith('|bond')).reduce((n,[,v])=>n+v,0);
      for(const [key,entries]of stagedRolling.ordered){const blocks=new Set();for(const [turn]of entries){const block=Math.floor((turn-1)/10);if(block>=0)blocks.add(block);}edgeTurns.set(key,entries.length);buckets.set(key,blocks);}
      row.rates={};for(const id of Object.keys(row.counts)){const unitTurns=stagedRolling.units[id]||0,events=stagedRolling.events[id]||0;row.rates[id]={events,unitTurns,per100:unitTurns>0?events/unitTurns*100:null};}
      row.activeEdges=edgeTurns.size;row.activeTurns=[...edgeTurns.values()].reduce((n,a)=>n+a,0);
      const complete=Math.floor(w.turn/10)-1;for(const blocks of buckets.values())if([...blocks].some(b=>b<complete&&blocks.has(b+1)&&b*10+1>=w.turn-49))row.continuous++;
      const frame={...(w.observation?.flowTelemetry||{})};delete frame.information;
      const nextFrames=[...dietFrames,frame].slice(-50),pyramid=trophic(w,nextFrames);
      row.current.pyramid=pyramid.data;row.current.biomass.production=pyramid.data.production;

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
      const populationUnit=id=>['hyperparasite','tideparasite','leafparasite'].includes(id)?'colony':metadata.config.producerModel==='colony/1'&&byId[id]?.group==='plant'&&!(byId[id]?.kind==='independent'&&byId[id].slot==='producer')?'producer_colony':'individual';
      let rowIndex=0;for(const r of rows){
        if(r.producerColony)for(const region of ['land','water']){
          const c=r.producerColony[region],units={count:'producer_colony',B:'model_B',baseB:'model_B',edibleB:'model_B',reserveE:'model_E',reserveM:'model_M',activitySum:'activity_sum',occupiedCells:'cell',eligibleCells:'cell',solarInputE:'model_E',productionB:'model_B',regrowthB:'model_B',consumedB:'model_B'};
          for(const key of colonyFields)emit(r,'producer_colony_'+key,region,c[key],units[key]);
          if(c.occupancy!==null)emit(r,'producer_colony_occupancy',region,c.occupancy,'fraction',c.eligibleCells);
        }
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
    return {rows,metadata,append,bins,csv,csvChunks,series,snapshot({copy=true}={}){return {schema:"observation-snapshot/1",definitions:{current:"ecosystem-current/1",trophic:"trophic-observed/1",nutrition:"nutrition-observed/1",...(metadata.config.producerModel==='colony/1'?{producerColony:colonyDefinition}:{}),...(metadata.config.largePlantModel==='independent/1'?{independentPlants:independentDefinition}:{}),...(rows.some(r=>r.combatKills!==undefined)?{combat:"combat-observed/1"}:{}),...(rows.some(r=>r.information!==undefined)?{information:"information-observed/1"}:{})},metadata:structuredClone(metadata),rows:copy?structuredClone(rows):rows};},markExported(turn=rows.at(-1)?.turn??-1){exportedThrough=Math.max(exportedThrough,Math.min(turn,rows.at(-1)?.turn??-1));},get unexported(){return exportedThrough<(rows.at(-1)?.turn??-1);}};
  }
  function restore(snapshot,{species=[]}={}){
    if(!snapshot||snapshot.schema!=="observation-snapshot/1"||snapshot.metadata?.schema!=="ecology-observation/1"||snapshot.definitions?.current!=="ecosystem-current/1"||snapshot.definitions?.trophic!=="trophic-observed/1"||snapshot.definitions?.nutrition!=="nutrition-observed/1"||(snapshot.definitions.information!==undefined&&snapshot.definitions.information!=="information-observed/1")||(snapshot.definitions.combat!==undefined&&snapshot.definitions.combat!=="combat-observed/1")||!Array.isArray(snapshot.rows)||!snapshot.rows.length)throw Error("保存された観測の形式・指標版を読み取れません。");
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
    for(let i=0;i<snapshot.rows.length;i++){const r=snapshot.rows[i];if((r.information!==undefined&&(snapshot.definitions.information!=="information-observed/1"||r.information?.definition!=="information-observed/1"||Object.entries(r.information).some(([k,n])=>k!=="definition"&&(!Number.isFinite(n)||n<0))))||(r.combatKills!==undefined&&(snapshot.definitions.combat!=="combat-observed/1"||!r.combatKills||Array.isArray(r.combatKills)||Object.values(r.combatKills).some(n=>!Number.isSafeInteger(n)||n<0)))||r.turn!==i||!r.counts||!r.composition||!r.current?.pyramid||!r.current?.relations||!r.current?.bonds||!r.current?.summary||r.current.pyramid.definition!=="trophic-observed/1"||r.current.pyramid.layers?.length!==4||r.current.pyramid.layers.some(n=>!Number.isFinite(n)||n<0)||Object.values(r.counts).some(n=>!Number.isFinite(n)||n<0))throw Error("保存された全ターン観測に欠測・破損があります。");}
    const catalogue=snapshot.metadata.species?.length?snapshot.metadata.species:species,h=create(snapshot.metadata.config,snapshot.metadata.version,{species:catalogue});h.rows.push(...structuredClone(snapshot.rows));Object.assign(h.metadata,structuredClone(snapshot.metadata));
    h.append=()=>{throw Error("保存した観測は読取専用です。");};const definitions=structuredClone(snapshot.definitions);h.snapshot=()=>({schema:'observation-snapshot/1',definitions:structuredClone(definitions),metadata:structuredClone(h.metadata),rows:structuredClone(h.rows)});
    h.bins=(limit=700)=>{const size=2**Math.max(0,Math.floor(Math.log2(Math.max(1,h.rows.length/limit)))),out=[];for(let i=0;i<h.rows.length;i+=size){const chunk=h.rows.slice(i,i+size),last=chunk.at(-1),min={},max={};for(const id of Object.keys(last.counts)){min[id]=Math.min(...chunk.map(r=>r.counts[id]||0));max[id]=Math.max(...chunk.map(r=>r.counts[id]||0));}out.push({first:chunk[0].turn,last:last.turn,counts:{...last.counts},min,max});}return out;};return h;
  }
  return {create,restore};
});
