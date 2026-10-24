/* Current-state information kernel. Explicit internal comparison path, not a UI mode. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoCurrentInformation=api;
})(globalThis,function(){
  'use strict';
  const VERSION='current-state/1',STATE='current-information-state/1',MEANINGS=['feeding','damage','competition','support','production','parasitism','reproduction'],
    SCOPES=['all','species','layer','kin','parasite'],zero=()=>Array(9).fill(0),decay=(dt,h)=>Math.pow(2,-Math.max(0,dt)/h);
  function bind(S){
    const I=S.PersistentInformation,enabled=w=>w?.config?.currentStateModel===VERSION,
      vector=v=>Array.isArray(v)&&v.length===9&&v.every(Number.isFinite),temporary=new WeakMap(),catalogues=new WeakSet(),knownSpecies=new Set([...S.D.species.map(s=>s.id),'ryouki']);
    function register(w){if(catalogues.has(w.config))return;for(const species of S.activeSpecies(w))knownSpecies.add(species.id);catalogues.add(w.config);}
    function attach(w,o){
      if(!enabled(w))return o;
      if(o.informationState&&o.informationState.version!==STATE)throw Error('CURRENT_INFORMATION_OLD_STATE');
      if(!o.informationState)o.informationState={version:STATE,change:zero(),...(S.spec(o)?.group==='main'?{}:{base:zero()}),
        outgoing:{cell:o.cell??null,lastAt:null,components:{}},incoming:{lastAt:null,updatedAt:w.turn,positive:zero(),negative:zero(),habituationPositive:zero(),habituationNegative:zero()},
        progress:{maintained:0,roleAmount:0,roleAmounts:{},relationTurns:0,offspringSuccess:0},progressTurn:{turn:-1,maintained:false,relation:false},last:null};
      if(S.spec(o)?.group==='main'&&Array.isArray(o.weights)){
        o.birthWeights??=o.weights.slice();o.informationState.change=o.weights.map((v,i)=>S.round(S.clamp(v,0,100)-o.birthWeights[i]));delete o.weights;
      }
      if(S.spec(o)?.group!=='main')delete o.weights;
      return o;
    }
    const base=o=>o.birthWeights??o.informationState?.base??zero();
    function value(o,axis){const b=base(o),a=o.informationState?.change??zero(),lo=S.spec(o)?.group==='main'?0:-100;return S.round(S.clamp((b[axis]??0)+(a[axis]??0),lo,100));}
    function weights(o){return base(o).map((_,axis)=>value(o,axis));}
    function hostPreference(o,species){return S.clamp((o.informationState?.hostLearning?.base??0)+(o.informationState?.hostLearning?.change[species]??0),-20,20);}
    function adjust(o,deltas){
      const a=o.informationState,b=base(o),before=weights(o),lo=S.spec(o)?.group==='main'?0:-100;
      for(let i=0;i<9;i++)a.change[i]=S.round(S.clamp(before[i]+(deltas[i]||0),lo,100)-b[i]);
      return weights(o).reduce((n,v,i)=>n+Math.abs(v-before[i]),0);
    }
    function components(o){return Object.values(o.informationState?.outgoing?.components??{});}
    function expire(w,o){
      attach(w,o);const a=o.informationState,out=a.outgoing,inc=a.incoming;
      for(const [k,c]of Object.entries(out.components))if(w.turn-c.lastExperienceAt>=30)delete out.components[k];
      if(out.lastAt!==null&&w.turn-out.lastAt>=30){out.components={};out.lastAt=null;}
      if(inc.lastAt!==null&&w.turn-inc.lastAt>=10){a.incoming={lastAt:null,updatedAt:w.turn,positive:zero(),negative:zero(),habituationPositive:zero(),habituationNegative:zero()};}
      advanceTrace(o,w.turn);
      if(a.caregivers)a.caregivers=a.caregivers.filter(c=>c.expires>w.turn);
    }
    function experience(w,o,event){
      register(w);
      if(!event||event.received||event.actual===false||!MEANINGS.includes(event.meaning)||!SCOPES.includes(event.scope??'layer')||
        !Number.isFinite(event.amount)||event.amount<=0||typeof event.result!=='string'||event.turn!==undefined&&event.turn!==w.turn)return null;
      const values=event.values??[];if(!values.some(v=>v.value!==0)||values.some(v=>!Number.isInteger(v.axis)||v.axis<0||v.axis>8||!Number.isFinite(v.value)))return null;
      attach(w,o);expire(w,o);let t=temporary.get(o);if(!t||t.turn!==w.turn){t={turn:w.turn,keys:new Set()};temporary.set(o,t);}
      const cell=event.cell??o.cell,scope=event.scope??'layer',peer=knownSpecies.has(event.peerSpecies)?event.peerSpecies:null,
        dedupe=S.stable([event.meaning,event.result,event.peerId??null,cell]);
      if(t.keys.has(dedupe))return null;t.keys.add(dedupe);
      const out=o.informationState.outgoing;
      // A place summary describes the current place, not the previous habitat.
      if(out.cell!==cell){out.components={};out.cell=cell;}
      out.lastAt=w.turn;
      const key=S.stable([event.meaning,scope,peer]),old=out.components[key];
      const item=old??{meaning:event.meaning,scope,peerSpecies:peer,roles:I.roles(w,o),count:0,distinctTurns:0,amount:0,lastExperienceAt:-1,
        context:{cell,env:w.tiles[cell]?.env??null},positive:zero(),negative:zero(),confirmedHarm:false};
      item.count++;if(item.lastExperienceAt!==w.turn)item.distinctTurns++;item.amount=S.round(item.amount+event.amount);item.lastExperienceAt=w.turn;
      for(const v of values){const signed=S.clamp(v.value/3,-1,1)*event.amount;item[signed>=0?'positive':'negative'][v.axis]+=Math.abs(signed);}
      item.confirmedHarm ||= event.confirmedHarm===true;out.components[key]=item;return item;
    }
    const qualified=c=>c.count>=6&&c.distinctTurns>=3;
    function cellOf(entry){return entry.subject.cell??entry.carrier?.cell??entry.host?.cell??entry.cell;}
    function initialize(w){
      register(w);
      w.config.informationBenchmarks=I.benchmarks(w);w.informationField=[];w.informationLedger={initialAmount:0,generatedAmount:0,inactivatedAmount:0};
      for(const {subject}of I.entries(w))attach(w,subject);w.persistentInformationSummary=summary(w);
    }
    const fieldKey=a=>S.stable([a.cell,a.scope,a.roles,a.sourceSpecies,a.peerSpecies,a.meaning,a.evidence,a.sign,a.expires]);
    function combine(records){
      const out=new Map();for(const a of records){const key=fieldKey(a),old=out.get(key);if(!old)out.set(key,{...a,strength:a.strength.slice()});
        else {old.amount+=a.amount;old.evidenceDose+=a.evidenceDose;for(let i=0;i<9;i++)old.strength[i]+=a.strength[i];}}
      return [...out.values()].sort((a,b)=>S.compare(fieldKey(a),fieldKey(b)));
    }
    function lose(w,ctx,amount,key){if(amount<=0)return;w.informationLedger.inactivatedAmount+=amount;flow(w,ctx,key,amount);}
    function compact(w,ctx,records){
      const synchronized=records.map(a=>({...a,strength:a.strength.map(n=>n*decay(w.turn-a.updatedAt,15)),updatedAt:w.turn}));
      const out=[];for(const a of combine(synchronized)){
        if(a.expires<=w.turn){lose(w,ctx,a.amount,'expiredAmount');continue;}
        if(a.amount<.01){lose(w,ctx,a.amount,'microLostAmount');continue;}out.push(a);
      }return out;
    }
    function flow(w,ctx,key,n=1){const a=ctx.persistentInformationFlow??={definition:'current-information-flow/1',turn:w.turn,all:{}};a.all[key]=S.round((a.all[key]??0)+n);}
    function diffuse(w,ctx){
      const next=[];for(const a of w.informationField){
        if(a.expires<=w.turn){lose(w,ctx,a.amount,'expiredAmount');continue;}
        const dt=w.turn-a.updatedAt,live={...a,strength:a.strength.map(n=>n*decay(dt,15)),updatedAt:w.turn};
        const cells=dt>0?S.nearby(w,a.cell).filter(cell=>S.oneStep(w,a.cell,cell)).sort((a,b)=>a-b):[];
        const fraction=cells.length?.2:0,put=(cell,f)=>next.push({...live,cell,amount:live.amount*f,evidenceDose:live.evidenceDose*f,strength:live.strength.map(n=>n*f)});
        put(a.cell,1-fraction);for(const cell of cells)put(cell,fraction/cells.length);flow(w,ctx,'movedAmount',a.amount*fraction);
      }w.informationField=compact(w,ctx,next);
    }
    function applicable(w,o,c){
      if(c.scope==='kin')return false; // Kin is checked only against an actual current sender.
      if(c.scope==='species')return c.sourceSpecies===o.species;
      if(c.scope==='all')return true;
      return (c.roles??[]).some(r=>I.roles(w,o).includes(r));
    }
    function axes(o){const group=S.spec(o)?.group;return group==='main'?[0,1,2,3,4,5,6,7,8]:group==='prey'||group==='Q'&&o.phase===4||o.species==='freshwaterlight'?[1,2,3,4,5,6,7,8]:[1,2,3,4,5];}
    function caregiver(w,o,sender){
      const age=S.HyperParasite.is(o)?S.HyperParasite.ageInfo(o):S.PrimaryParasite.is(o)?S.PrimaryParasite.ageInfo(o):S.ageInfo(o);
      return age.stage==='juvenile'&&(I.parents(o).includes(sender.id)||(o.informationState.caregivers??[]).some(c=>c.id===sender.id&&c.expires>w.turn));
    }
    function buildIndex(w,ctx){
      const cells=new Map(),add=(cell,c)=>{if(!cells.has(cell))cells.set(cell,[]);cells.get(cell).push(c);};
      for(const a of w.informationField)add(a.cell,{key:fieldKey(a),field:a});
      for(const entry of I.entries(w)){
        const o=entry.subject,cell=cellOf(entry);expire(w,o);
        for(const c of components(o))if(qualified(c)&&c.context.cell===cell)add(cell,{key:o.id+'|'+S.stable([c.meaning,c.scope,c.peerSpecies]),sender:o,component:structuredClone(c)});
      }
      ctx.currentInformationIndex={cells,placeCache:new Map()};return cells;
    }
    function receive(w,ctx,entry){
      const o=entry.subject,a=o.informationState,inc=a.incoming,z=I.settings(w),positive=zero(),negative=zero(),at=cellOf(entry),allowed=axes(o),sources=new Map();
      if(z.influence===0)return;
      for(const cell of S.nearby(w,at,1,true)){
        if(!S.oneStep(w,at,cell)||!S.sight(w,at,cell))continue;
        for(const source of ctx.currentInformationIndex.cells.get(cell)??[]){
          if(source.sender?.id===o.id)continue;
          const c=source.field??source.component,kin=source.sender&&caregiver(w,o,source.sender);
          if(c.scope==='kin'?!kin:!applicable(w,o,{...c,sourceSpecies:source.sender?.species??c.sourceSpecies}))continue;
          const path=source.field?1:kin?1:.25,context=(source.field?w.tiles[cell]?.env:c.context.env)===w.tiles[at]?.env?1:.5,
            scale=path*context*(c.evidence==='low'?.5:1),previous=sources.get(source.key);
          if(!previous||scale>previous.scale)sources.set(source.key,{...source,scale,kin});
        }
      }
      const hostSignals=new Map(),group=S.spec(o)?.group,hostTypes=group==='Q'?['leafparasite','tideparasite']:group==='P'?Object.values(S.PrimaryParasite.hostTable[o.species]??{}).flat():[];
      for(const source of sources.values()){
        const c=source.field??source.component;
        for(const axis of allowed){
          if(source.field){const value=c.strength[axis]*source.scale;if(value>=0)positive[axis]+=value;else negative[axis]-=value;}
          else {const denom=Math.max(c.amount,1e-12),fresh=decay(w.turn-c.lastExperienceAt,15);positive[axis]+=c.positive[axis]/denom*source.scale*fresh;negative[axis]+=c.negative[axis]/denom*source.scale*fresh;}
        }
        if(hostTypes.includes(c.peerSpecies)){
          const signal=hostSignals.get(c.peerSpecies)??{positive:0,negative:0};
          if(source.field){const v=c.strength[2]*source.scale;if(v>0)signal.positive+=v;else signal.negative-=v;}
          else {const scale=source.scale*decay(w.turn-c.lastExperienceAt,15)/Math.max(c.amount,1e-12);signal.positive+=c.positive[2]*scale;signal.negative+=c.negative[2]*scale;}
          hostSignals.set(c.peerSpecies,signal);
        }
      }
      const dt=w.turn-inc.updatedAt,hp=inc.habituationPositive.map((n,i)=>n*decay(dt-(positive[i]>0?1:0),10)),hn=inc.habituationNegative.map((n,i)=>n*decay(dt-(negative[i]>0?1:0),10));
      if(!positive.some(n=>n>0)&&!negative.some(n=>n>0)){inc.habituationPositive=hp;inc.habituationNegative=hn;inc.updatedAt=w.turn;return;}
      const budget=ctx.costs?.get(o.id),maintenance=budget?.base??I.maintenance(w,o),fee=Number.isFinite(maintenance)?S.round(.01*maintenance):null;
      if(fee===null||o.E+1e-8<fee||budget&&budget.budget+1e-8<fee){flow(w,ctx,'rejectedBudget');return;}
      const deltas=zero(),sensitivity=.8+.4*(o.dna?.sensitivity??.5),oldHP=hp.slice(),oldHN=hn.slice();
      for(const axis of allowed){const p=positive[axis],n=negative[axis],s=(p-n)/(1+p+n),h=s>=0?hp[axis]:hn[axis];
        deltas[axis]=sensitivity*z.influence*s*(1-h);
        if(p>0)hp[axis]+=.25*(1-hp[axis]);if(n>0)hn[axis]+=.25*(1-hn[axis]);}
      const deltaAbs=adjust(o,deltas);o.E=S.round(o.E-fee);S.dissipate(w,fee);if(budget)budget.budget=S.round(Math.max(0,budget.budget-fee));
      for(const [species,signal]of hostSignals){
        const {positive:p,negative:n}=signal,s=(p-n)/(1+p+n),h=s>=0?oldHP[2]:oldHN[2];
        a.hostLearning??={base:0,change:{}};a.hostLearning.change[species]=S.round(S.clamp(hostPreference(o,species)+sensitivity*z.influence*s*(1-h),-20,20));
      }
      a.incoming={lastAt:w.turn,updatedAt:w.turn,positive,negative,habituationPositive:hp,habituationNegative:hn};
      a.last={turn:w.turn,received:sources.size,applied:deltaAbs>0?1:0,costE:fee,deltaAbs:S.round(deltaAbs)};
      flow(w,ctx,'originsRead',sources.size);flow(w,ctx,'contentsRead',sources.size);flow(w,ctx,'receptionCostE',fee);
      if(deltaAbs>0){flow(w,ctx,'learned');flow(w,ctx,'learningDeltaAbs',deltaAbs);S.record(ctx,{id:o.id,cell:at},'information-effect',{kind:'learning',deltaAbs:S.round(deltaAbs),aggregate:true});}
      for(const source of sources.values()){
        flow(w,ctx,source.field?'environmentRead':source.kin?'caregiverRead':'ordinaryRead');
        const event={id:source.key,sourceId:source.sender?.id??null,sourceSpecies:source.sender?.species??source.field.sourceSpecies,time:w.turn,aggregate:!!source.field,mediated:false,noise:source.field?.evidence==='low'};
        (ctx.infoReceipts??=[]).push({recipient:o.id,species:o.species,event});
        if(deltaAbs>0)(ctx.infoEffects??=[]).push({recipient:o.id,species:o.species,event,deltaAbs:deltaAbs/sources.size});
      }
    }
    function begin(w,ctx){
      if(ctx.informationBegun)return;ctx.informationBegun=true;diffuse(w,ctx);buildIndex(w,ctx);
      // Every receiver sees the same start-of-turn publication snapshot.
      for(const entry of I.entries(w))receive(w,ctx,entry);
    }
    function place(w,ctx,o,cell){
      const none={attraction:0,warning:0,value:0,origins:[]},z=I.settings(w);if(!z.influence||!ctx.currentInformationIndex||!w.tiles[cell])return none;
      const cache=ctx.currentInformationIndex.placeCache,key=S.stable([cell,o.species,I.roles(w,o),axes(o)]);if(cache.has(key))return cache.get(key);
      const groups=new Map();for(const at of S.nearby(w,cell,2,true)){
        if(!S.sight(w,cell,at))continue;const distance=S.distance(w,cell,at),weight=[1,.5,.25][distance]??0;
        for(const source of ctx.currentInformationIndex.cells.get(at)??[]){const c=source.field;if(!c||!applicable(w,o,c))continue;
          const amount=c.strength.reduce((n,v,i)=>n+(axes(o).includes(i)?Math.abs(v):0),0)*weight*(c.evidence==='low'?.5:1),k=c.meaning+'|'+c.sign;
          if(!groups.has(k))groups.set(k,{meaning:c.meaning,sign:c.sign,mass:0});groups.get(k).mass+=amount;}
      }
      let attraction=0,warning=0;for(const g of groups.values()){
        const value=Math.min(1,g.mass)*(1+g.mass/(1+g.mass))*z.influence;
        if(['damage','competition','parasitism'].includes(g.meaning)||g.sign<0)warning+=value;else attraction+=value;
      }
      attraction=S.round(Math.min(2*z.influence,attraction));warning=S.round(Math.min(2*z.influence,warning));
      const result={attraction,warning,value:S.round(attraction-warning),origins:[]};cache.set(key,result);return result;
    }
    function traceEffects(w,o){
      if(I.settings(w).qEffects===false)return {promotion:0,vectors:zero(),traces:[]};
      const t=o.qInformation,parts=[];if(t?.active)parts.push(t.active);
      for(const r of t?.residual??[])if(r.expires>w.turn){const f=decay(w.turn-r.updatedAt,10);parts.push({...r,promotion:r.promotion*f,vectors:r.vectors.map(n=>n*f)});}
      const weight=parts.reduce((n,p)=>n+p.weight,0),vectors=zero();let promotion=0;
      for(const p of parts){const f=weight>0?p.weight/weight:0;promotion+=p.promotion*f;for(let i=0;i<9;i++)vectors[i]+=p.vectors[i]*f;}
      return {promotion:S.round(Math.min(.1,promotion)),vectors:vectors.map(n=>S.round(S.clamp(n,-.2,.2))),traces:t?.active?[{qId:t.active.qId,pId:t.active.pId,sourceId:t.active.sourceId}]:[],residual:!!t?.residual?.length};
    }
    function advanceTrace(o,turn){
      const t=o.qInformation;if(!t)return;
      t.residual=t.residual.filter(r=>r.expires>turn).map(r=>{const f=decay(turn-r.updatedAt,10);return {...r,promotion:r.promotion*f,vectors:r.vectors.map(n=>n*f),updatedAt:turn};})
        .filter(r=>r.promotion+r.vectors.reduce((n,v)=>n+Math.abs(v),0)>=1e-6);
      if(!t.active&&!t.residual.length)delete o.qInformation;
    }
    function trace(w,host,p,q,paid){
      if(paid<=0)return;const z=S.HyperParasite.settings(w),phase=q.phase,ratio=S.clamp(paid/z.informationCosts[phase],0,1),inv=q.hyper.genes.investment,
        promotion=z.promotionCaps[phase]*ratio*inv.promotion,distortion=z.distortionCaps[phase]*ratio*inv.distortion,bias=q.hyper.bias??{axis:0,sign:1};
      for(const holder of [host,p])if(holder){advanceTrace(holder,w.turn);holder.qInformation??={active:null,residual:[]};
        const old=holder.qInformation.active;if(old&&old.qId!==q.id)throw Error('CURRENT_INFORMATION_Q_LINK');
        const pm=Math.min(z.promotionCaps[phase]*inv.promotion,(old?.promotion??0)+promotion),vectors=zero();
        for(let i=0;i<9;i++)vectors[i]=S.clamp((old?.vectors[i]??0)+distortion*(bias.vector9?.[i]??(bias.axis===i?bias.sign:0)),-z.distortionCaps[phase]*inv.distortion,z.distortionCaps[phase]*inv.distortion);
        holder.qInformation.active={qId:q.id,pId:p.id,sourceId:host.id,promotion:pm,vectors,weight:1};
      }
    }
    function detach(w,host,p,q,hostOnly=false){
      for(const holder of hostOnly?[host]:[host,p]){
        const t=holder?.qInformation,a=t?.active;if(!a||a.qId!==q.id)continue;advanceTrace(holder,w.turn);
        const expires=w.turn+30,old=t.residual.find(r=>r.expires===expires);
        if(old){const weight=old.weight+a.weight;old.promotion=(old.promotion*old.weight+a.promotion*a.weight)/weight;old.vectors=old.vectors.map((n,i)=>(n*old.weight+a.vectors[i]*a.weight)/weight);old.weight=weight;}
        else t.residual.push({expires,updatedAt:w.turn,promotion:a.promotion,vectors:a.vectors.slice(),weight:a.weight});
        t.active=null;
      }
    }
    function generate(w,ctx,entry,details={}){
      const o=entry.subject,a=o.informationState;if(a.deathDecision)return a.deathDecision;expire(w,o);
      const cell=details.cell??cellOf(entry),z=I.settings(w),evaluation=I.evaluate(w,o),all=components(o).filter(c=>c.scope!=='kin'&&c.context.cell===cell),normal=all.filter(c=>c.confirmedHarm||c.count>=3&&c.distinctTurns>=2),low=all.filter(c=>!normal.includes(c)),effects=traceEffects(w,o),
        harm=normal.some(c=>c.confirmedHarm),base=normal.length&&evaluation.resolved?evaluation.pBase:0,
        pN=normal.length?S.clamp(Math.max(base,harm?z.harmMinimum:0)+effects.promotion,0,1):0,pL=low.length?Math.min(z.lowProbability,1-pN):0,
        u=S.r(w,'information/death',w.turn,o.id),kind=u<pN?'normal':u<pN+pL?'low':null;
      a.deathDecision={turn:w.turn,cell,u,pN,pL,kind,generated:!!kind};flow(w,ctx,'deathDecisions');if(all.length)flow(w,ctx,'candidateDeaths');
      if(!kind){flow(w,ctx,'noGeneration');return a.deathDecision;}
      const chosen=(kind==='normal'?normal:low).slice().sort((a,b)=>Number(b.confirmedHarm)-Number(a.confirmedHarm)||b.amount-a.amount||S.compare(S.stable([a.meaning,a.scope,a.peerSpecies]),S.stable([b.meaning,b.scope,b.peerSpecies]))).slice(0,2),parts=[];
      for(const c of chosen)for(const originalSign of [1,-1]){
        const numerator=originalSign>0?c.positive:c.negative;if(!numerator.some(n=>n>0))continue;
        const raw=numerator.map((n,i)=>S.clamp(originalSign*n/Math.max(c.amount,1e-12)+(kind==='normal'?2*effects.vectors[i]:0),-1,1)*decay(w.turn-c.lastExperienceAt,15));
        for(const sign of [1,-1]){
          const strength=raw.map(n=>sign*n>0?n:0);if(!strength.some(n=>n!==0))continue;
          parts.push({cell,scope:c.scope,roles:c.roles.slice(),sourceSpecies:o.species,peerSpecies:c.peerSpecies,meaning:c.meaning,evidence:kind==='low'?'low':c.confirmedHarm?'confirmed-harm':'normal',sign,
            expires:10*Math.floor((w.turn+30+Math.round(30*(evaluation.S??0)))/10),updatedAt:w.turn,amount:0,evidenceDose:0,strength});
        }
      }
      if(!parts.length){a.deathDecision.generated=false;flow(w,ctx,'noGeneration');return a.deathDecision;}
      for(const part of parts){part.amount=1/parts.length;part.evidenceDose=part.amount;part.strength=part.strength.map(n=>n*part.amount);}
      w.informationField=compact(w,ctx,[...w.informationField,...parts]);w.informationLedger.generatedAmount+=1;
      flow(w,ctx,kind==='normal'?'normalGenerated':'lowGenerated');flow(w,ctx,'generatedAmount');if(kind==='normal'&&effects.promotion>0)flow(w,ctx,'qPromoted');
      if(kind==='normal'&&effects.vectors.some(n=>n!==0))flow(w,ctx,'qDistorted');
      (ctx.infoEmissions??=[]).push({id:'death-information:'+o.id+':'+w.turn,sourceId:o.id,species:o.species,time:w.turn,mediated:kind==='normal'&&(effects.traces.length>0||effects.residual)});
      return a.deathDecision;
    }
    function summary(w){
      const entries=I.entries(w),out={definition:'current-information-observed/1',turn:w.turn,subjects:entries.length,experiencedSubjects:0,holdingSubjects:0,ownSummaries:0,incomingSummaries:0,
        field:{records:w.informationField.length,cells:new Set(w.informationField.map(a=>a.cell)).size,amount:S.round(w.informationField.reduce((n,a)=>n+a.amount,0))},ledger:{...w.informationLedger}};
      for(const {subject}of entries){const c=components(subject);if(c.length){out.experiencedSubjects++;out.ownSummaries++;}if(c.some(qualified))out.holdingSubjects++;if(subject.informationState?.incoming.lastAt!==null)out.incomingSummaries++;}
      out.ledger.remainingAmount=out.field.amount;return out;
    }
    function validate(w){
      const errors=[];for(const {subject:o}of I.entries(w)){
        const a=o.informationState,b=base(o),inc=a?.incoming;
        if(a?.version!==STATE||!vector(b)||!vector(a?.change)||Object.hasOwn(o,'weights')||['experience','learned','learnedPreferences','eventDedupe'].some(k=>Object.hasOwn(a??{},k))||
          ![inc?.positive,inc?.negative,inc?.habituationPositive,inc?.habituationNegative].every(vector)||weights(o).some((v,i)=>Math.abs(v-b[i]-a.change[i])>1e-5))errors.push('CURRENT_INFORMATION_STATE:'+o.id);
        if(![inc?.positive,inc?.negative,inc?.habituationPositive,inc?.habituationNegative].every(vector)||[...inc.positive,...inc.negative].some(n=>n<0)||
          [...inc.habituationPositive,...inc.habituationNegative].some(n=>n<0||n>1)||!Number.isSafeInteger(inc.updatedAt)||inc.updatedAt<0||inc.updatedAt>w.turn||inc.lastAt!==null&&(!Number.isSafeInteger(inc.lastAt)||inc.lastAt<0||inc.lastAt>w.turn))errors.push('CURRENT_INFORMATION_RECEIPT:'+o.id);
        for(const c of components(o))if(!MEANINGS.includes(c.meaning)||!SCOPES.includes(c.scope)||!Number.isSafeInteger(c.count)||c.count<1||!Number.isSafeInteger(c.distinctTurns)||c.distinctTurns<1||c.distinctTurns>c.count||
          c.lastExperienceAt>w.turn||!vector(c.positive)||!vector(c.negative)||[...c.positive,...c.negative].some(n=>n<0)||!Number.isFinite(c.amount)||c.amount<=0)errors.push('CURRENT_INFORMATION_PUBLICATION:'+o.id);
        for(const [species,change]of Object.entries(a?.hostLearning?.change??{}))if(!knownSpecies.has(species)||!Number.isFinite(change)||Math.abs(change)>20)errors.push('CURRENT_INFORMATION_HOST:'+o.id);
      }
      const keys=new Set();let amount=0;for(const f of w.informationField){const key=fieldKey(f);
        if(keys.has(key)||!w.tiles[f.cell]||!vector(f.strength)||!Number.isFinite(f.amount)||f.amount<.01-1e-9||!Number.isFinite(f.evidenceDose)||f.evidenceDose<0||
          !SCOPES.includes(f.scope)||f.scope==='kin'||!MEANINGS.includes(f.meaning)||!['normal','low','confirmed-harm'].includes(f.evidence)||![-1,1].includes(f.sign)||
          !Number.isSafeInteger(f.expires)||f.expires<=w.turn||f.expires>w.turn+60||f.expires%10!==0||Object.hasOwn(f,'sourceId')||Object.hasOwn(f,'originId'))errors.push('CURRENT_INFORMATION_FIELD');keys.add(key);amount+=f.amount;}
      const l=w.informationLedger;if(!l||Math.abs(l.initialAmount+l.generatedAmount-l.inactivatedAmount-amount)>1e-5)errors.push('CURRENT_INFORMATION_BALANCE');
      if((w.resources??[]).some(r=>r.kind==='info'))errors.push('CURRENT_INFORMATION_NUTRITION');return errors;
    }
    return {VERSION,STATE,enabled,attach,base,value,weights,hostPreference,adjust,components,qualified,experience,expire,initialize,summary,validate,begin,place,generate,compact,traceEffects,trace,detach};
  }
  return {VERSION,bind};
});
