/* Finite current soil stocks. Owned by C7.1/C7.2; explicit CS03 comparison only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EcoSoilMatter=api;})(globalThis,()=>{
  'use strict';
  const VERSION='soil-matter/1',TYPES=['plant','fungal','lower-animal','main-animal','other-animal','detritus'];
  function bind(S){
    const enabled=w=>w?.config?.currentStateModel==='current-state/1',Q=S.round,indices=new WeakMap(),zero=()=>[0,0,0,0,0];
    function initialize(w){w.cellState.soil={version:VERSION,fresh:[],waiting:[],advancedAt:0};w.soilMatterSummary=summary(w);}
    const typeOf=o=>S.spec(o)?.group==='plant'?'plant':S.spec(o)?.group==='fungus'?'fungal':S.spec(o)?.group==='prey'?'lower-animal':S.spec(o)?.group==='main'?'main-animal':'other-animal';
    const tagOf=type=>type==='plant'?'plant':type==='fungal'?'fungal':type==='detritus'?'detritus':'animal';
    function dose(E,input,type='detritus'){
      const sum=Array.isArray(input)&&input.length===5&&input.every(n=>Number.isFinite(n)&&n>=0)?input.reduce((n,x)=>n+x,0):0;
      if(sum>0)return input.map(n=>n/sum*E);const out=zero();out[type==='plant'?0:4]=E;return out;
    }
    function rowIndex(rows){let map=indices.get(rows);if(!map||map.size!==rows.length){map=new Map(rows.map(r=>[r.id??r.cell,r]));indices.set(rows,map);}return map;}
    function add(rows,record){
      const map=rowIndex(rows),key=record.id??record.cell,old=map.get(key);
      if(!old){rows.push(record);map.set(key,record);return record;}
      if(old.depositedAt!==record.depositedAt)throw Error('SOIL_BUCKET_NOT_ADVANCED');
      old.E=Q((old.E||0)+(record.E||0));old.M=Q(old.M+record.M);old.B=Q((old.B||0)+(record.B||0));
      if(old.trophic)old.trophic=dose(old.E,old.trophic.map((n,i)=>n+(record.trophic?.[i]||0)),old.sourceClass);
      return old;
    }
    function organic(w,cell,E,M,B=0,sourceClass='detritus',trophic=null){
      const id='soil-organic/'+cell+'/'+sourceClass;
      return add(w.cellState.organic,{id,cell,sourceClass,tag:tagOf(sourceClass),E,M,B,trophic:dose(E,trophic,sourceClass)});
    }
    function wait(w,cell,M){if(M<=0)return;const rows=w.cellState.soil.waiting,map=rowIndex(rows);let r=map.get(cell);if(!r){r={cell,M:0};rows.push(r);map.set(cell,r);}r.M=Q(r.M+M);}
    function release(w){let returned=0;
      for(const r of w.cellState.soil.waiting){const cap=w.cellProfiles.profiles[r.cell].mineralCapacity,amount=cap===null?0:Q(Math.min(r.M,Math.max(0,cap-w.tiles[r.cell].soilM)));
        w.tiles[r.cell].soilM=Q(w.tiles[r.cell].soilM+amount);r.M=Q(r.M-amount);returned=Q(returned+amount);}
      w.cellState.soil.waiting=w.cellState.soil.waiting.filter(r=>r.M>0);return returned;
    }
    function defer(w,cell,{E=0,M=0,B=0,kind='organic',sourceClass='detritus',trophic=null}){
      if(!w.tiles[cell]||![E,M,B].every(n=>Number.isFinite(n)&&n>=0)||B>E||!TYPES.includes(sourceClass)||!['organic','mineral'].includes(kind)||kind==='mineral'&&(E!==0||B!==0))throw Error('SOIL_MATERIAL_INVALID');
      if(!(E||M||B))return null;
      const id='soil-return/'+cell+'/'+kind+'/'+(kind==='mineral'?'mineral':sourceClass),record={id,cell,kind,sourceClass,availableAt:w.turn+1,E:Q(E),M:Q(M),B:Q(B),trophic:dose(Q(E),trophic,sourceClass)},rows=w.cellState.nextMaterial;
      const old=rowIndex(rows).get(id);if(old&&old.availableAt!==record.availableAt)throw Error('SOIL_MATERIAL_OVERDUE');return add(rows,record);
    }
    function advance(w){
      const soil=w.cellState.soil;if(!soil||soil.version!==VERSION)throw Error('SOIL_STATE_MISSING');
      if(soil.advancedAt>=w.turn)throw Error('SOIL_ALREADY_ADVANCED');
      const live=[],carriers=new Map();for(const c of w.carcasses)if(c.soilRef){if(!carriers.has(c.soilRef.id))carriers.set(c.soilRef.id,[]);carriers.get(c.soilRef.id).push(c);}
      for(const r of soil.fresh){
        if(w.turn-r.depositedAt>=10){const to=organic(w,r.cell,r.E,r.M,r.B,r.sourceClass,r.trophic);
          for(const c of carriers.get(r.id)||[])if(c.soilRef.depositedAt===r.depositedAt)c.soilRef={id:to.id,depositedAt:null};}
        else live.push(r);
      }
      soil.fresh=live;soil.advancedAt=w.turn;cleanup(w);
    }
    function rows(w){return [...w.cellState.soil.fresh,...w.cellState.organic];}
    function available(w,r){return r.depositedAt===undefined||r.depositedAt<w.turn;}
    function edible(o,r){return ['plant','fungal','animal'].includes(r.tag)&&S.spec(o)?.group!=='plant'&&
      (o.species!=='ryouki'||r.tag==='plant'||r.sourceClass==='lower-animal')&&(o.species!=='kelp'||r.tag==='animal');}
    function reweight(row){if(row.trophic)row.trophic=dose(row.E,row.trophic,row.sourceClass);}
    function cleanup(w){
      const clean=list=>list.filter(r=>{if(r.E<=0&&r.B<=0){wait(w,r.cell,r.M);r.M=0;}return r.E>0||r.M>0||r.B>0;});
      w.cellState.soil.fresh=clean(w.cellState.soil.fresh);w.cellState.organic=clean(w.cellState.organic);
    }
    function flush(w){
      const carriers=[],exposureHosts=new Set((w.primaryInocula||[]).filter(i=>i.kind==='carcass'&&i.expires>w.turn&&i.E>0).map(i=>i.hostId));
      for(const a of w.carcasses){
        const exposure=exposureHosts.has(a.id);
        if(!a.soilRef){
          const sourceClass=a.sourceClass??(S.D.byId[a.species]?typeOf({species:a.species}):'other-animal'),trophic=dose(a.E,a.trophic,sourceClass),depositedAt=a.created;
          if(depositedAt>w.turn)throw Error('SOIL_FUTURE_REMAINS');
          const row=depositedAt+10<=w.turn?organic(w,a.cell,a.E,a.M,a.G||0,sourceClass,trophic):add(w.cellState.soil.fresh,
            {id:'soil-fresh/'+a.cell+'/'+sourceClass+'/'+(depositedAt%10),cell:a.cell,sourceClass,tag:tagOf(sourceClass),depositedAt,E:a.E,M:a.M,B:a.G||0,trophic});
          a.soilRef={id:row.id,depositedAt:row.depositedAt??null};a.E=0;a.M=0;a.G=0;a.q=0;
        }
        if(a.infection||exposure){
          // A live parasite/current exposure is the identity holder. Nutrition
          // belongs exclusively to the referenced soil pool, never this copy.
          const {id,species,slot,cell,tag,created,availableAt,payloadExpires,infection,soilRef}=a;
          carriers.push({id,species,slot,cell,tag,created,availableAt,payloadExpires,infection,soilRef,E:0,M:0,G:0,q:0,expires:null});
        }
      }
      w.carcasses=carriers;cleanup(w);
    }
    function background(w,ctx,activity){
      if(!ctx.cellLifeDone)throw Error('CELL_BACKGROUND_BEFORE_LIFE');
      if(w.cellState.backgroundTurn>=w.turn||ctx.cellBackground)throw Error('CELL_BACKGROUND_ALREADY_APPLIED');
      const stocks=rows(w).filter(r=>available(w,r)),factors=new Map();
      for(const r of stocks)if((r.E>0||r.M>0)&&!factors.has(r.cell))factors.set(r.cell,activity(w,r.cell));
      const take=(n,f)=>n<=0?0:Math.min(n,Math.max(.000001,Math.floor(n*f*1e6)/1e6)),flow={E:0,M:0,B:0},loads=new Map();
      for(const r of stocks){
        const factor=factors.get(r.cell)??0,f=Math.min(1,.02*factor);
        if(f>0){const E=take(r.E,f),B=Math.min(r.B,E,take(r.B,f)),M=take(r.M,f);r.E=Q(r.E-E);r.M=Q(r.M-M);r.B=Math.min(r.E,Q(r.B-B));
          reweight(r);S.dissipate(w,E);defer(w,r.cell,{M,kind:'mineral'});flow.E=Q(flow.E+E);flow.M=Q(flow.M+M);flow.B=Q(flow.B+B);}
        loads.set(r.cell,(loads.get(r.cell)||0)+r.E*factor);
      }
      w.cellState.decayLoad=w.cellState.decayLoad.map((_,cell)=>Q(S.clamp(((loads.get(cell)||0)-40)/160,0,1)));
      cleanup(w);flush(w);w.cellState.backgroundTurn=w.turn;ctx.cellBackground=flow;ctx.cellResources.background=flow;return flow;
    }
    function index(w){const map=new Map();for(const r of rows(w))if(available(w,r)){if(!map.has(r.cell))map.set(r.cell,[]);map.get(r.cell).push(r);}return map;}
    function harvest(w,ctx,row,target,amount){
      const fraction=S.clamp(amount.fraction||0,0,1);if(!(fraction>0)||target.cell!==row.cell)return;
      if(!ctx.soilCarriers){ctx.soilCarriers=new Map();for(const c of w.carcasses)if(c.soilRef){if(!ctx.soilCarriers.has(c.soilRef.id))ctx.soilCarriers.set(c.soilRef.id,[]);ctx.soilCarriers.get(c.soilRef.id).push(c);}}
      for(const carrier of ctx.soilCarriers.get(row.id)||[])if(carrier.cell===row.cell&&
        (row.depositedAt===undefined||carrier.soilRef.depositedAt===row.depositedAt))ctx.primaryHooks?.transfer(w,ctx,carrier,target,'carcass',amount);
    }
    function summary(w){
      const soil=w.cellState.soil,stocks=[...soil.fresh,...w.cellState.organic],sum=k=>Q(stocks.reduce((n,r)=>n+r[k],0));
      return {definition:VERSION,turn:w.turn,freshPools:soil.fresh.length,decomposedPools:w.cellState.organic.length,waitingCells:soil.waiting.length,
        E:sum('E'),M:sum('M'),B:sum('B'),waitingM:Q(soil.waiting.reduce((n,r)=>n+r.M,0)),infectionCarriers:w.carcasses.filter(c=>c.soilRef).length};
    }
    function validate(w){
      const soil=w.cellState?.soil,errors=[],finite=n=>Number.isFinite(n)&&n>=0;
      if(soil?.version!==VERSION||!Array.isArray(soil.fresh)||!Array.isArray(soil.waiting)||!Number.isSafeInteger(soil.advancedAt)||soil.advancedAt>w.turn)return ['SOIL_STATE'];
      const ids=new Set();for(const r of rows(w)){
        if(ids.has(r.id)||!w.tiles[r.cell]||!TYPES.includes(r.sourceClass)||r.tag!==tagOf(r.sourceClass)||![r.E,r.M,r.B].every(finite)||r.B>r.E||
          !Array.isArray(r.trophic)||r.trophic.length!==5||!r.trophic.every(finite)||Math.abs(r.trophic.reduce((n,x)=>n+x,0)-r.E)>.00001)errors.push('SOIL_POOL');ids.add(r.id);
        if(r.depositedAt!==undefined&&(!Number.isSafeInteger(r.depositedAt)||r.depositedAt>w.turn||w.turn-r.depositedAt>=10))errors.push('SOIL_FRESH');
      }
      const cells=new Set();for(const r of soil.waiting){if(cells.has(r.cell)||!w.tiles[r.cell]||!finite(r.M)||r.M<=0)errors.push('SOIL_WAITING');cells.add(r.cell);}
      for(const c of w.carcasses)if(c.soilRef&&[c.E,c.M,c.G,c.q].some(n=>n!==0))errors.push('SOIL_DUPLICATE_CARRIER_STOCK');
      return errors;
    }
    return {VERSION,enabled,initialize,typeOf,tagOf,dose,organic,wait,release,defer,advance,rows,index,available,edible,reweight,flush,background,harvest,summary,validate};
  }
  return {VERSION,bind};
});
