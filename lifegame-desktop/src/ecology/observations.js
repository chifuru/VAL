/* Presentation-only exact turn records. Never part of the world or its hash. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoObservations=api;})(globalThis,()=>{
  'use strict';
  function create(config,version,{maxBytes=256*1024*1024,species=[]}={}){
    const rows=[],levels=[],metadata={schema:'ecology-observation/1',version,config:structuredClone(config)};
    const byId=Object.fromEntries(species.map(s=>[s.id,s])),groupOrder=['plant','prey','main','fungus','P','Q'],groupNames={plant:'生産者',prey:'一次消費者',main:'主生物',fungus:'分解者',P:'P',Q:'Q'};
    let exportedThrough=-1,estimatedBytes=0;
    function current(w,row,window){
      const counts={...row.counts},seen=new Set(),bonds={},mass={},addBond=(from,to)=>{const k=from+'|'+to+'|bond';bonds[k]=(bonds[k]||0)+1;};
      if(Array.isArray(w.organisms)){
        for(const id of new Set(['tideparasite','leafparasite','hyperparasite',...species.filter(s=>['P','Q'].includes(s.group)).map(s=>s.id)]))counts[id]=0;
        const parasite=(p,host)=>{if(!p||seen.has(p.id))return;seen.add(p.id);counts[p.species]=(counts[p.species]||0)+1;if(host)addBond(p.species,host);if(p.q)parasite(p.q,p.species);};
        for(const o of w.organisms){mass[o.species]=(mass[o.species]||0)+Math.max(0,o.B||0);if(o.infection)parasite(o.infection,o.species);}
        for(const a of w.carcasses||[])if(a.payloadExpires>w.turn)parasite(a.infection,a.species);
        for(const q of w.searchQ||[])if(q.expires>w.turn&&!seen.has(q.id))parasite(q,null);
      }
      const groups=groupOrder.map(id=>({id,name:groupNames[id],count:species.filter(s=>s.group===id).reduce((n,s)=>n+(counts[s.id]||0),0)})),total=Object.values(counts).reduce((a,n)=>a+n,0),edges=new Map(),kinds=new Set(),partners=new Set(),blocks=new Map();
      for(const r of window)if(r.turn>0)for(const [key,n]of Object.entries(r.relations)){
        const [from,to,type]=key.split('|');if(!(n>0)||type==='contact')continue;
        edges.set(key,(edges.get(key)||0)+n);partners.add(from);partners.add(to);kinds.add(type==='bond'||type==='infection'?'parasitism':type);
        const b=Math.floor((r.turn-1)/10),start=b*10+1,end=(b+1)*10;
        if(start>=Math.max(1,w.turn-49)&&end<=w.turn){if(!blocks.has(key))blocks.set(key,new Set());blocks.get(key).add(b);}
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
      let interactions=0,bondTurns=0;
      for(const [key,n] of Object.entries(relations))if(key.endsWith('|bond'))bondTurns+=n;else if(!key.endsWith('|contact'))interactions+=n;
      const contacts=Object.values(o.contactEpisodes||{}).reduce((a,n)=>a+n,0), contactTurns=Object.values(o.contactTurns||{}).reduce((a,n)=>a+n,0);
      const row={contacts,contactTurns,contactEpisodes:{...o.contactEpisodes},contactPairs:{...o.contactTurns},turn:w.turn,counts:{...w.stats.counts},composition:structuredClone(o.composition||{}),birthReasons:structuredClone(o.birthReasons||{}),funnel:structuredClone(o.funnel||{}),relations,links,
        births:o.births||0,deaths:o.deaths||0,transfers:o.transfers||0,interactions,bondTurns,
        main:w.stats.main,food:w.stats.food,P:w.stats.P,Q:w.stats.Q,Qsearch:w.stats.Qsearch||0,
        richness:Object.values(w.stats.counts).filter(n=>n>0).length,activeEdges:0,continuous:0,activeTurns:0,window:Math.min(50,w.turn)};
      const window=[...rows.slice(-49),row],edgeTurns=new Map(),buckets=new Map();
      for(const r of window)for(const [key,n] of Object.entries(r.relations))if(n>0){
        if(!edgeTurns.has(key))edgeTurns.set(key,new Set());edgeTurns.get(key).add(r.turn);
        const block=Math.floor((r.turn-1)/10);
        if(block<0)continue;
        if(!buckets.has(key))buckets.set(key,new Set());buckets.get(key).add(block);
      }
      row.rates={};
      for(const id of Object.keys(row.counts))row.rates[id]={events:0,unitTurns:0,per100:null};
      for(const r of window)if(r.turn>0){
        for(const [id,n] of Object.entries(r.counts))row.rates[id].unitTurns+=n;
        const events={...r.contactEpisodes};for(const [key,n] of Object.entries(r.relations))if(!key.endsWith('|contact')&&!key.endsWith('|bond'))events[key]=(events[key]||0)+n;
        for(const [key,n] of Object.entries(events)){const [from,to]=key.split('|');if(row.rates[from])row.rates[from].events+=n;if(row.rates[to])row.rates[to].events+=n;}
      }
      for(const rate of Object.values(row.rates))if(rate.unitTurns>0)rate.per100=rate.events/rate.unitTurns*100;
      row.activeEdges=edgeTurns.size;row.activeTurns=[...edgeTurns.values()].reduce((n,a)=>n+a.size,0);
      const complete=Math.floor(w.turn/10)-1;
      for(const blocks of buckets.values())if([...blocks].some(b=>b<complete&&blocks.has(b+1)&&b*10+1>=w.turn-49))row.continuous++;
      row.current=current(w,row,window);
      const bytes=JSON.stringify(row).length*4;
      if(estimatedBytes+bytes>maxBytes)throw Error("観測記録の容量上限に達しました。既存の全ターンCSVを書き出してください。");
      estimatedBytes+=bytes;rows.push(row);
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
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    function csv(){
      const out=['turn,metric,species_id,value,unit,denominator,status'];
      out.push([-1,'metadata','reproduction_config',JSON.stringify(metadata),'json','','observed'].map(quote).join(','));
      const emit=(r,metric,id,n,unit,den='')=>out.push([r.turn,metric,id,n,unit,den,'observed'].map(quote).join(','));
      for(const r of rows){
        for(const [id,n] of Object.entries(r.counts))emit(r,'population',id,n,['hyperparasite','tideparasite','leafparasite'].includes(id)?'colony':'individual');
        for(const [id,c] of Object.entries(r.composition)){
          c.phases.forEach((n,i)=>emit(r,'phase_'+(i+1),id,n,'individual'));
          for(const axis of ['ages','sex','roles'])for(const [key,n] of Object.entries(c[axis]))emit(r,axis+'_'+key,id,n,'individual');
        }
        for(const [id,rate] of Object.entries(r.rates)){if(rate.per100!==null)emit(r,'involvement_per100',id,rate.per100,'per_100_management_unit_turns',rate.unitTurns);}
        for(const [id,c] of Object.entries(r.funnel))for(const key of ['initial','born','matured','reproduced','juvenileDeaths'])emit(r,'cohort_'+key,id,c[key],'individual');
        for(const [id,reasons] of Object.entries(r.birthReasons))for(const [reason,n] of Object.entries(reasons))emit(r,'birth_blocker_'+reason,id,n,'individual');
        for(const [key,n] of Object.entries(r.contactEpisodes))emit(r,'contact_episode',key,n,'encounter');
        for(const [key,n] of Object.entries(r.contactPairs))emit(r,'contact_duration',key,n,'pair_turn');
        for(const [key,n] of Object.entries(r.relations))emit(r,key.endsWith('|bond')?'bond_active':'interaction',key,n,key.endsWith('|bond')?'colony_pair':'event');
        for(const g of r.current.groups)emit(r,'current_group',g.id,g.count,'management_unit',r.current.total);
        emit(r,'actual_relation_species','all',r.current.relations.species,'species',r.window);
        emit(r,'actual_continuous_relations','all',r.current.relations.continuous,'relation',r.window);
        for(const key of ['births','deaths','transfers','richness','activeEdges','continuous','activeTurns','interactions','contacts','contactTurns','bondTurns','Qsearch'])emit(r,key,'all',r[key],'management_unit',key==='continuous'||key==='activeEdges'?r.window:'');
      }
      return '\ufeff'+out.join('\r\n')+'\r\n';
    }
    return {rows,metadata,append,bins,csv,markExported(){exportedThrough=rows.at(-1)?.turn??-1;},get unexported(){return exportedThrough<(rows.at(-1)?.turn??-1);}};
  }
  return {create};
});
