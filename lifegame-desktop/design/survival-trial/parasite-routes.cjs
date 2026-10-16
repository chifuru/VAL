"use strict";
module.exports=(S,base)=>{
  function hostStage(p,target,ingestion=false){
    const group=S.spec(target).group;
    if(target.species===(p.species==="tideparasite"?"algae":"grass"))return "first";
    if(target.species===(p.species==="tideparasite"?"waterbug":"grassbug"))return "middle";
    if(ingestion&&group==="fungus")return "middle";
    if(group==="main"&&(ingestion||["extra","terminal"].includes(p.stage)))
      return base.terminal(p,target)&&target.phase>=3&&p.counter>=base.required[p.stage]&&p.stage!=="first"?"terminal":"extra";
    return null;
  }
  function count(w,key){w.trialTransmission??={contact:0,carcass:0,legacy:0,terminalContact:0,preterminalContact:0,promotions:0};w.trialTransmission[key]++;}
  function transfer(w,ctx,source,target,type){
    if(type!=="carcass"){const before=ctx.transfers;base.transfer(w,ctx,source,target,type);if(ctx.transfers>before)count(w,"legacy");return;}
    const p=source.infection;if(!p||target.infection||source.payloadExpires<=w.turn)return;
    const stage=hostStage(p,target,true);if(!stage)return;
    source.infection=null;target.infection=p;p.hostId=target.id;p.stage=stage;p.counter=0;p.unit="colony";ctx.movedInfections.add(p.id);ctx.transfers++;count(w,"carcass");S.record(ctx,target,"infection",{parasite:p.id,stage,route:"carcass"});
  }
  function contacts(w,ctx){
    if(w.trialContactTurn===w.turn)return;w.trialContactTurn=w.turn;
    const map=S.maps(w),proposals=[];
    for(const target of w.organisms){
      const old=(target.trialExposure||[]).filter(a=>w.turn-a.time<8),next=[];
      if(target.infection){target.trialExposure=[];continue;}
      for(const cell of S.nearby(w,target.cell,2,true))for(const source of [map.main.get(cell),map.food.get(cell)]){
        const p=source?.infection,entry=p&&ctx.byParasite.get(p.id);if(!p||!entry||ctx.movedInfections.has(p.id)||entry.counter<base.required[entry.stage])continue;
        const terminal=entry.stage==="terminal",distance=S.distance(w,target.cell,cell);
        if(distance>(terminal?2:1)||!S.sight(w,source.cell,target.cell))continue;
        const stage=hostStage(p,target);if(!stage||(!terminal&&stage!==p.stage))continue;
        const previous=old.find(a=>a.source===p.id),hits=(previous?.hits||0)+1;
        next.push({source:p.id,time:w.turn,hits:Math.min(3,hits)});
        if(hits>=3&&(p.trialReady||0)<=w.turn&&p.E>=.12)proposals.push({source,p,target,stage,terminal,h:S.hash(w,"trial/contact-vote",w.turn,p.id,target.id)});
      }
      target.trialExposure=next.sort((a,b)=>b.hits-a.hits||S.compare(a.source,b.source)).slice(0,4);
    }
    proposals.sort((a,b)=>a.h-b.h||S.compare(a.target.id,b.target.id));const used=new Map(),taken=new Set();
    for(const c of proposals){
      const n=used.get(c.p.id)||0;if(taken.has(c.target.id)||n>=(c.terminal?3:1)||c.p.E<.12)continue;
      const child=S.infection(w,c.p.species,c.target.id,w.turn,S.sha256(c.p.id+":"+c.target.id+":contact").slice(0,16));
      child.stage=c.stage;child.E=.04;child.unit="colony";c.p.E=S.round(c.p.E-.12);S.dissipate(w,.08);
      if(c.p.q&&ctx.byParasite.get(c.p.id).qPhase===3&&c.p.q.E>=.06){c.p.q.E=S.round(c.p.q.E-.06);child.q=S.hyper(w,child.id,w.turn);child.q.E=.02;S.dissipate(w,.04);ctx.births.push("hyperparasite");}
      c.target.infection=child;ctx.births.push(child.species);ctx.transfers++;taken.add(c.target.id);used.set(c.p.id,n+1);count(w,"contact");count(w,c.terminal?"terminalContact":"preterminalContact");S.record(ctx,c.target,"infection",{parasite:child.id,stage:c.stage,route:"contact"});
    }
    for(const c of proposals)if(used.has(c.p.id))c.p.trialReady=w.turn+(c.terminal?3:6);
  }
  function mature(w,ctx){
    base.mature(w,ctx);
    for(const host of w.organisms){const p=host.infection;if(p?.stage==="extra"&&ctx.byParasite.has(p.id)&&!ctx.movedInfections.has(p.id)&&p.counter>=6&&host.phase>=3&&base.terminal(p,host)){p.stage="terminal";p.counter=0;count(w,"promotions");}}
  }
  return {...base,hostStage,transfer,contacts,mature};
};
