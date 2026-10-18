/* Presentation-only exact turn records. Never part of the world or its hash. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoObservations=api;})(globalThis,()=>{
  'use strict';
  function create(config,version,{maxBytes=256*1024*1024}={}){
    const rows=[],levels=[],metadata={schema:'ecology-observation/1',version,config:structuredClone(config)};
    let exportedThrough=-1,estimatedBytes=0;
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
        for(const key of ['births','deaths','transfers','richness','activeEdges','continuous','activeTurns','interactions','contacts','contactTurns','bondTurns','Qsearch'])emit(r,key,'all',r[key],'management_unit',key==='continuous'||key==='activeEdges'?r.window:'');
      }
      return '\ufeff'+out.join('\r\n')+'\r\n';
    }
    return {rows,metadata,append,bins,csv,markExported(){exportedThrough=rows.at(-1)?.turn??-1;},get unexported(){return exportedThrough<(rows.at(-1)?.turn??-1);}};
  }
  return {create};
});
