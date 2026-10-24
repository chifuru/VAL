(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./hash.js")
      : root.EcoHash,
    typeof module === "object" && module.exports
      ? require("./catalogue.js")
      : root.EcoData,
    typeof module === "object" && module.exports ? require("./landscape.js") : root.EcoLandscape,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoState = api;
})(globalThis, function (H, D, Landscape) {
  "use strict";
  // CR01: shared state/space contract. Biological progression is connected later.
  const CellSpace=(()=>{
    const VERSION="cell-reorganization/1",limits=Object.freeze({1:6,2:3,3:5,4:5,5:6});
    const enabled=w=>w?.config?.cellModel===VERSION;
    function settings(input={}){
      const defaults={soilQuality:1,temperature:20,landPH:6.5,waterPH:7,mineralLevel:"standard",mineralInput:0,rainScale:1,lightScale:1};
      if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw Error("SETTINGS_INVALID: マス環境設定");
      const s={...defaults,...input};
      if(!["poor","standard","rich"].includes(s.mineralLevel)||![s.mineralInput,s.rainScale,s.lightScale].every(n=>Number.isFinite(n)&&n>=0&&n<=100)||
        ![.75,1,1.25].includes(s.soilQuality)||!Number.isFinite(s.temperature)||
        ![s.landPH,s.waterPH].every(n=>Number.isFinite(n)&&n>=0&&n<=14))throw Error("SETTINGS_INVALID: マス環境設定");
      return s;
    }
    function layer(o){
      const s=spec(o);if(!s)return null;
      if(s.group==="main"||s.id==="freshwaterlight")return 4;
      if(s.group==="plant")return LargePlant.definition(s)?2:1;
      return s.group==="prey"?3:s.group==="fungus"?5:null;
    }
    const packed=o=>o.species==="ryouki"&&Ryouki.is(o)&&o.ryouki.mutated;
    const living=o=>o.HP>0;
    function index(w){
      for(const o of w.organisms)CellLife.attach(w,o);
      const cells=new Map();
      for(const o of w.organisms){const n=layer(o);if(n===null||!living(o))continue;
        if(!cells.has(o.cell))cells.set(o.cell,Array.from({length:6},()=>[]));cells.get(o.cell)[n].push(o);}
      return cells;
    }
    function slotFor(o,list,state,requested){
      const residents=new Map();let moving=0;
      for(const other of list){if(other.id===o.id)continue;
        const a=other.cellOccupancy;
        if(a?.state==="moving"){moving++;continue;}
        if(!a||a.state!=="settled"||!Number.isInteger(a.slot)||a.slot<0||a.slot>2)return null;
        if(!residents.has(a.slot))residents.set(a.slot,[]);residents.get(a.slot).push(other);
      }
      if(state==="moving")return residents.size+moving<5?-1:null;
      if(state!=="settled")return null;
      const candidates=requested===undefined?[0,1,2]:[requested];
      for(const n of candidates){
        if(!Number.isInteger(n)||n<0||n>2)continue;
        const group=residents.get(n)||[];
        if(!group.length){if(residents.size+moving<5)return n;}
        else if(packed(o)&&group.length<3&&group.every(packed))return n;
      }
      return null;
    }
    function room(w,o,cell,{state="settled",slot}={},cells=index(w)){
      if(!enabled(w)||!Number.isSafeInteger(cell)||!w.tiles[cell]||w.tiles[cell].blocked)return false;
      const n=layer(o);if(n===null||!living(o))return false;
      const list=cells.get(cell)?.[n]||[];
      return n===4?slotFor(o,list,state,slot)!==null:list.filter(a=>a.id!==o.id).length<limits[n];
    }
    function assign(w,o,{state="settled",slot}={},cells=index(w)){
      if(!room(w,o,o.cell,{state,slot},cells))throw Error("CELL_SPACE_FULL: "+o.id);
      if(layer(o)===4){const n=slotFor(o,cells.get(o.cell)?.[4]||[],state,slot);
        o.cellOccupancy={version:VERSION,state,...(n>=0?{slot:n}:{})};}
      return o;
    }
    function release(w,o,cells=index(w)){
      if(!enabled(w)||!packed(o))return false;
      const probe={...o,ryouki:{...o.ryouki,mutated:false}},state=o.cellOccupancy?.state;
      const slot=slotFor(probe,cells.get(o.cell)?.[4]||[],state);
      if(slot===null)return false;
      o.ryouki.mutated=false;
      o.cellOccupancy={version:VERSION,state,...(slot>=0?{slot}:{}),
        ...(state==="moving"&&o.cellOccupancy.movedAt!==undefined?{movedAt:o.cellOccupancy.movedAt}:{})};
      return true;
    }
    function curve(value,points){
      if(value<=points[0][0])return points[0][1];
      for(let i=1;i<points.length;i++)if(value<=points[i][0]){
        const [x,y]=points[i-1],[u,v]=points[i];return H.round(y+(v-y)*(value-x)/(u-x));}
      return points.at(-1)[1];
    }
    function deferMaterial(w,cell,{E=0,M=0,B=0,kind="organic"}){
      if(!enabled(w)||!w.tiles[cell]||![E,M,B].every(n=>Number.isFinite(n)&&n>=0)||B>E||
        !["organic","mineral"].includes(kind)||(kind==="mineral"&&(E!==0||B!==0)))throw Error("CELL_MATERIAL_INVALID");
      if(!(E||M||B))return null;
      const id="cell-return/"+w.turn+"/"+cell+"/"+kind,rows=w.cellState.nextMaterial;
      let row=rows.find(a=>a.id===id);
      if(!row){row={id,cell,kind,availableAt:w.turn+1,E:0,M:0,B:0};rows.push(row);}
      row.E=H.round(row.E+E);row.M=H.round(row.M+M);row.B=H.round((row.B||0)+B);return row;
    }
    function initialize(w){
      if(!enabled(w))return w;
      if(w.turn!==0||w.cellState!==undefined||w.cellProfiles!==undefined)throw Error("CELL_STATE_EXISTS: マス状態は初期化済みか初期時点ではありません");
      const s=w.config.cellSettings,profiles=w.tiles.map(t=>{
        const water=["shallow","deep"].includes(t.terrain),levels={poor:[2,8],standard:[5,20],rich:[10,40]},pH=water?s.waterPH:s.landPH;
        return {region:water?"water":"land",temperature:s.temperature,pH,
          plantTemperature:curve(s.temperature,[[-5,0],[5,.5],[15,1],[25,1],[35,.5],[45,0]]),
          plantPH:curve(pH,[[3.5,0],[4.5,.5],[5.5,1],[7.5,1],[8.5,.5],[9.5,0]]),
          fungalTemperature:curve(s.temperature,[[-10,0],[5,.2],[20,1],[30,1],[45,0]]),
          fungalPH:curve(pH,[[2,0],[4,.6],[6.5,1],[8,.7],[11,0]]),
          soilQuality:s.soilQuality,lightBudget:H.round(15.6*t.light*s.lightScale),
          mineralInitial:water?null:levels[s.mineralLevel][0],mineralCapacity:water?null:H.round(levels[s.mineralLevel][1]*s.soilQuality),
          mineralInput:water?null:s.mineralInput,
          // Aquatic supply coefficients are deliberately not copied from land.
          waterCapacity:water?null:H.round(30*s.soilQuality),rain:water?null:H.round(6.5*s.rainScale),evaporation:water?null:H.round(.5*2**H.clamp((s.temperature-20)/10,-4,4))};
      });
      w.cellProfiles={version:VERSION,profiles};
      w.cellState={version:VERSION,stage:"foundation",water:profiles.map(p=>p.region==="water"?null:15),
        decayLoad:profiles.map(()=>0),nextMaterial:[],organic:[],resourceTurn:0,backgroundTurn:0};
      for(let cell=0;cell<w.tiles.length;cell++)if(profiles[cell].region==="land")w.tiles[cell].soilM=profiles[cell].mineralInitial;
      for(const o of w.organisms)CellLife.attach(w,o);
      const cells=new Map();
      for(const o of w.organisms){const n=layer(o);if(n===null||!living(o))continue;
        assign(w,o,{},cells);if(!cells.has(o.cell))cells.set(o.cell,Array.from({length:6},()=>[]));cells.get(o.cell)[n].push(o);}
      return w;
    }
    function stock(w,cell){
      if(!enabled(w)||w.cellState?.version!==VERSION||!w.tiles[cell])throw Error("CELL_STATE_MISSING");
      // soilM remains the only mineral owner; this is a read-only value view.
      return {water:w.cellState.water[cell],mineral:w.tiles[cell].soilM};
    }
    function summary(w){
      if(!enabled(w))return null;
      const out={version:VERSION,layers:{1:0,2:0,3:0,4:0,5:0},settledIndividuals:0,settledSlots:0,movingIndividuals:0,consumerMembers:0};
      for(const rows of index(w).values()){
        for(let n=1;n<=5;n++)out.layers[n]+=rows[n].length;
        out.settledSlots+=new Set(rows[4].filter(o=>o.cellOccupancy?.state==="settled").map(o=>o.cellOccupancy.slot)).size;
        out.settledIndividuals+=rows[4].filter(o=>o.cellOccupancy?.state==="settled").length;
        out.movingIndividuals+=rows[4].filter(o=>o.cellOccupancy?.state==="moving").length;
        out.consumerMembers+=rows[3].reduce((n,o)=>n+(o.consumerGroup?.cohorts?.reduce((m,c)=>m+c.n,0)??1),0);
      }
      return out;
    }
    function validate(w){
      if(!enabled(w))return [];
      const errors=[],a=w.cellState,p=w.cellProfiles,n=w.tiles.length,finite=x=>Number.isFinite(x)&&x>=0;
      if(a?.version!==VERSION||a.stage!=="foundation"||p?.version!==VERSION||!Array.isArray(p.profiles)||p.profiles.length!==n||
        !Array.isArray(a.water)||a.water.length!==n||!Array.isArray(a.decayLoad)||a.decayLoad.length!==n||!Array.isArray(a.nextMaterial)||!Array.isArray(a.organic)||!Number.isSafeInteger(a.resourceTurn)||a.resourceTurn<0||a.resourceTurn>w.turn)return ["CELL_STATE"];
      for(let cell=0;cell<n;cell++){
        const f=p.profiles[cell];
        if(!f||!Number.isFinite(f.temperature)||!finite(f.pH)||f.pH>14||![.75,1,1.25].includes(f.soilQuality)||
          !finite(f.lightBudget)||!(f.region==="water"?f.mineralCapacity===null:finite(f.mineralCapacity))||!["land","water"].includes(f.region)||
          (f.region==="water"?(a.water[cell]!==null||f.waterCapacity!==null||f.rain!==null||f.evaporation!==null):
            (!finite(f.waterCapacity)||!finite(f.rain)||!finite(f.evaporation)||!finite(a.water[cell])||a.water[cell]>f.waterCapacity))||
          !finite(a.decayLoad[cell])||!finite(w.tiles[cell].soilM))errors.push("CELL_STOCK:"+cell);
      }
      const seen=new Set();
      for(const o of w.organisms){
        if(typeof o.id!=="string"||!o.id||seen.has(o.id))errors.push("CELL_ID:"+o.id);seen.add(o.id);
        if(!Number.isSafeInteger(o.cell)||!w.tiles[o.cell])errors.push("CELL_LOCATION:"+o.id);
        if(layer(o)===4&&living(o)){const c=o.cellOccupancy;
          if(c?.version!==VERSION||!["moving","settled"].includes(c.state)||
            (c.movedAt!==undefined&&(!Number.isSafeInteger(c.movedAt)||c.movedAt<0||c.movedAt>w.turn))||
            (c.state==="settled"?(!Number.isInteger(c.slot)||c.slot<0||c.slot>2):Object.hasOwn(c,"slot")))errors.push("CELL_OCCUPANCY:"+o.id);}
        if(!CellLife.validate(o))errors.push("CELL_LIFE:"+o.id);
        if(o.cellMatter&&(o.cellMatter.version!=="cell-matter/1"||!finite(o.cellMatter.bodyM)||
          !finite(o.cellMatter.newB??0)||!finite(o.cellMatter.newEdibleB??0)||(o.cellMatter.newEdibleB??0)>(o.cellMatter.newB??0)||(o.cellMatter.newB??0)>o.B||!Number.isSafeInteger(o.cellMatter.tissueAt)||o.cellMatter.tissueAt>w.turn))errors.push("CELL_BODY_M:"+o.id);
        if(layer(o)===3&&o.consumerGroup){const count=o.consumerGroup.cohorts?.reduce((n,c)=>n+c.n,0);
          if(!Number.isSafeInteger(count)||count<1||count>8)errors.push("CELL_MEMBERS:"+o.id);}
      }
      for(const [cell,rows]of index(w)){
        for(const layer of [1,2,3,5])if(rows[layer].length>limits[layer])errors.push("CELL_LIMIT:"+cell+":"+layer);
        const groups=new Map();let moving=0;
        for(const o of rows[4]){const c=o.cellOccupancy;if(c?.state==="moving"){moving++;continue;}
          if(!groups.has(c?.slot))groups.set(c?.slot,[]);groups.get(c?.slot).push(o);}
        if(groups.size>3||groups.size+moving>5)errors.push("CELL_MAIN_LIMIT:"+cell);
        for(const list of groups.values())if(list.length>3||(list.length>1&&!list.every(packed)))errors.push("CELL_PACK:"+cell);
      }
      const ids=new Set();for(const r of a.nextMaterial){
        if(!r||typeof r.id!=="string"||!r.id||ids.has(r.id)||!Number.isSafeInteger(r.cell)||!w.tiles[r.cell]||
          r.availableAt!==w.turn+1||!["organic","mineral"].includes(r.kind)||![r.E,r.M,r.B??0].every(finite)||(r.B??0)>r.E||(r.kind==="mineral"&&(r.E!==0||(r.B??0)!==0)))errors.push("CELL_MATERIAL");
        ids.add(r?.id);
      }
      const organicIds=new Set();for(const r of a.organic){
        if(!r||typeof r.id!=="string"||organicIds.has(r.id)||!Number.isSafeInteger(r.cell)||!w.tiles[r.cell]||![r.E,r.M,r.B].every(finite)||r.B>r.E)errors.push("CELL_ORGANIC");
        organicIds.add(r?.id);}
      return errors;
    }
    return {VERSION,limits,enabled,settings,layer,index,room,assign,release,initialize,stock,summary,validate,deferMaterial};
  })();
  const ProducerSupport=(()=>{

const DEFAULTS={enabled:true,land:{nutrition:1,capacity:.35,regrowth:1},water:{nutrition:1,capacity:.35,regrowth:1},grace:20,establishment:.1,targetE:8,targetM:.5,schedule:[]};
function settings(input={}){
 const unknown=(o,keys)=>{for(const k of Object.keys(o))if(!keys.includes(k))throw Error('Unknown producer support option: '+k);};
 const number=(v,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid producer support number');return v;};
 unknown(input,Object.keys(DEFAULTS));const c=structuredClone(DEFAULTS);if(input.enabled!==undefined){if(typeof input.enabled!=='boolean')throw Error('Invalid enabled flag');c.enabled=input.enabled;}
 for(const region of ['land','water']){if(input[region]!==undefined){unknown(input[region],['nutrition','capacity','regrowth']);Object.assign(c[region],input[region]);}number(c[region].nutrition,0,4);number(c[region].capacity,0,1);number(c[region].regrowth,0,4);}
 for(const key of ['grace','establishment','targetE','targetM'])if(input[key]!==undefined)c[key]=input[key];
 number(c.grace,1,1000);number(c.establishment,0,1);number(c.targetE,0,20);number(c.targetM,0,2);
 if(input.schedule!==undefined)c.schedule=structuredClone(input.schedule);
 if(!Array.isArray(c.schedule)||c.schedule.length>32)throw Error('Invalid producer schedule');
 for(const s of c.schedule){unknown(s,['from','to','land','water']);if(!Number.isSafeInteger(s.from)||!Number.isSafeInteger(s.to)||s.from<1||s.to<s.from)throw Error('Invalid producer interval');for(const r of ['land','water'])if(s[r]!==undefined)number(s[r],0,4);}
 for(let i=0;i<c.schedule.length;i++)for(let j=i+1;j<c.schedule.length;j++)if(c.schedule[i].from<=c.schedule[j].to&&c.schedule[j].from<=c.schedule[i].to)throw Error('Overlapping producer intervals');
 return c;
}
function attach(w,input={}){if(w.turn!==0)throw Error('Producer support settings require initial state');const c=settings(input);if(c.enabled)w.config.producerSupport=c;return w;}
const region=(w,cell)=>['shallow','deep'].includes(w.tiles[cell].terrain)?'water':'land';
function level(w,cell){const c=w.config.producerSupport;if(!c?.enabled)return 1;const r=region(w,cell),s=c.schedule.find(s=>s.from<=w.turn&&w.turn<=s.to);return s?.[r]??c[r].nutrition;}
function factor(w,o,S){return S.spec(o).group==='plant'&&w.config.producerSupport?.enabled?level(w,o.cell):1;}
function begin(w,S){
 const c=w.config.producerSupport;if(!c?.enabled||!w.config.enabled.plant)return;
 const plants=S.D.species.filter(s=>s.group==='plant'&&(!S.Colony.enabled(w)||S.Colony.allowed(w,s)));
 if(!w.producerSupport){
  const sites=[];
  for(let cell=0;cell<w.tiles.length;cell++){
   const r=region(w,cell);if(w.tiles[cell].blocked||S.r(w,'producer/support-site',0,null,cell)>=c[r].capacity)continue;
   const preferred=r==='water'?['algae','phytoplankton','moss','grass']:['grass','moss','algae'];
   const species=preferred.map(id=>plants.find(s=>s.id===id)).find(s=>s&&S.validHabitat(w,s,cell));if(species)sites.push({cell,species:species.id});
  }
  w.producerSupport={version:1,sites,established:{},last:null};w.ledger.producerE=0;w.ledger.producerM=0;
 }
 const state=w.producerSupport,last=state.last={inputE:0,inputM:0,regrownB:0,established:{},births:[],stressed:0};
 function input(o,key,amount){amount=S.round(Math.max(0,amount));o[key]=S.round(o[key]+amount);const ledger=key==='M'?'producerM':'producerE',meter=key==='M'?'inputM':'inputE';w.ledger[ledger]=S.round(w.ledger[ledger]+amount);last[meter]=S.round(last[meter]+amount);}
 const m=S.maps(w),colonyCounts=S.Colony.enabled(w)?S.Colony.occupancy(w):null;
 for(const site of state.sites){
  const n=level(w,site.cell),light=w.tiles[site.cell].light;if(n<=0||light<=0)continue;
  let o=m.food.get(site.cell);
  if(!o&&(!colonyCounts||S.Colony.room(w,site.cell,colonyCounts))&&S.r(w,'producer/establish',w.turn,site.species,site.cell)<Math.min(1,c.establishment*n)){
   o=S.organism(w,S.D.byId[site.species],site.cell,'env:producer:'+site.species+':'+w.turn+':'+site.cell,{E:0,B:0,M:0,phase:1,age:0,colonyOrigin:{kind:'environment',turn:w.turn,cell:site.cell}});
   o.origin={kind:'environment',turn:w.turn,cell:site.cell};o.producerReserve=1;
   if(colonyCounts){input(o,'E',8);o.E=S.round(o.E-S.PLANT_BASE);o.B=S.PLANT_BASE;colonyCounts[S.Colony.region(w,site.cell)]++;}
   else{input(o,'E',6);input(o,'B',S.PLANT_BASE);}
   input(o,'M',.2);w.organisms.push(o);m.food.set(site.cell,o);
   state.established[o.species]=(state.established[o.species]||0)+1;last.established[o.species]=(last.established[o.species]||0)+1;last.births.push({id:o.id,species:o.species,cell:o.cell});
  }
  if(!o||S.spec(o).group!=='plant')continue;
  const p=S.phenotype(w,o),fraction=Math.min(1,n),energy=Math.min(1,Math.max(0,light));
  input(o,'E',Math.max(0,Math.min(c.targetE,p.capE)-o.E)*fraction*energy);
  input(o,'M',Math.max(0,Math.min(c.targetM,p.capM)-o.M)*fraction);
  if(!colonyCounts){const b=S.round(Math.max(0,Math.min(c[region(w,o.cell)].regrowth*n*energy,p.capB-o.B)));input(o,'B',b);last.regrownB=S.round(last.regrownB+b);}
 }
 for(const o of w.organisms)if(S.spec(o).group==='plant'&&!S.LargePlant?.is(o)){
  const n=level(w,o.cell)*(w.tiles[o.cell].light>0?1:0);o.producerReserve=S.round(S.clamp((o.producerReserve??1)+(Math.min(1,n)-.5)*2/c.grace,0,1));
  if(o.producerReserve===0){o.HP=S.round(Math.max(0,o.HP-1));last.stressed++;}
 }
}
function finish(w,ctx,S){
 if(!w.producerSupport)return;w.demography??={};
 for(const o of w.producerSupport.last.births){const k=o.species+'|0',a=w.demography[k]??={species:o.species,generation:0,initial:0,born:0,matured:0,reproduced:0,juvenileDeaths:0};a.environmentEstablished=(a.environmentEstablished||0)+1;S.record(ctx,o,'establishment',{origin:'environment'});}
}
return {settings,attach,region,level,factor,begin,finish};

})();
  function initialRank(w,s,p){
    if(w.config.initialConditions?.distribution!=="cluster")return hash(w,"init/position",0,s.id,p);
    const center=Math.floor(r(w,"init/lower-center",0,s.id)*w.tiles.length);
    return distance(w,p,center)*1e7+hash(w,"init/position",0,s.id,p)/1000;
  }
  const DIRS = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  const DNA = [
    "body",
    "appendage",
    "senses",
    "skin",
    "aptitude",
    "sensitivity",
  ];
  const FOOD = {
    seed: { name: "種実", tag: "plant", cap: 4 },
    spore: { name: "失活胞子", tag: "fungal", cap: 4, healing: 1.2 },
    egg: { name: "栄養卵", tag: "animal", cap: 4 },
    organic: { name: "有機粒", tag: "plant", cap: 4 },
    mineral: { name: "鉱物片", tag: "mineral", cap: 12, period: 4 },
    droplet: { name: "鉱液滴", tag: "mineral", cap: 12, period: 3 },
    factor: { name: "代謝因子", tag: "factor", cap: 1 },
    info: { name: "情報", tag: "info", cap: 12, period: 1 },
  };
  const hash = (w, p, t = null, id = null, key = null, axis = null) =>
    (w.config.randomModel==='table/1'?H.tableHash:H.hash)(w.config.seed,p,t,id,key,axis);
  const r = (w, p, t = null, id = null, key = null, axis = null) => hash(w,p,t,id,key,axis)/4294967296;
  // The favored grassbug keeps its own habitat and diet; only its survival
  // envelope follows the effective waterbug profile of this observation mode.
  const grassGroupSpec = {...D.byId.grassbug,...Object.fromEntries(
    ['life','maturity','maintenance','birthCooldown','initial','capacity'].map(k=>[k,D.byId.waterbug[k]]) )};
  const grassBalancedSpec={...grassGroupSpec,life:240,maintenance:.06,birthCooldown:2,
    initial:[...grassGroupSpec.initial.slice(0,3),30],capacity:[...grassGroupSpec.capacity.slice(0,3),30]};
  const grassModerateSpec={...grassGroupSpec,life:80,maintenance:.12,birthCooldown:3,
    initial:[...grassGroupSpec.initial.slice(0,3),14],capacity:[...grassGroupSpec.capacity.slice(0,3),14]};
  const spec = (o) => o.species==='grassbug'&&o.consumerGroup?.grassAdvantage==='moderate/1'
    ? grassModerateSpec : o.species==='grassbug'&&o.consumerGroup?.grassAdvantage==='balanced/1'
    ? grassBalancedSpec : o.species==='grassbug'&&o.consumerGroup?.grassAdvantage==='waterbug/1'
      ? grassGroupSpec : D.byId[o.species];
  // CR04: bounded bodies and cohorts. Free reserves remain on the organism;
  // body M is counted once by totals(), while cohort B partitions that body.
  const CellLife=(()=>{
    const VERSION="cell-life/1",Q=H.round,EPS=1e-8;
    const is=o=>o?.cellLife?.version===VERSION;
    const kind=o=>spec(o).group==="fungus"?"fungus":spec(o).group==="prey"?"group":CellSpace.layer(o)===1?"colony":CellSpace.layer(o)===2?"plant":null;
    function attach(w,o,options={}){
      const k=kind(o);if(!CellSpace.enabled(w))return o;
      if(!k){
        if(spec(o).group==="main")o.cellMatter??={version:"cell-matter/1",bodyM:Q(.02*o.B),newB:0,newEdibleB:0,tissueAt:w.turn};
        return o;
      }
      if(is(o))return o;
      o.cellLife={version:VERSION,kind:k,baseB:k==="fungus"?Math.min(1,o.B):k==="colony"?Math.min(2,o.B):k==="plant"?Math.min(2*o.phase,o.B):0,
        maintained:0,leafDebt:0,bornAt:w.turn,processedAt:-1,last:{turn:w.turn,production:0,loss:0,born:0,split:0}};
      if(k==="group"){
        if(!ConsumerGroup.is(o))o.consumerGroup={version:"consumer-group-state/1",establishedAt:w.turn,origin:null,
          cohorts:[{age:o.age,phase:o.phase,n:1}],wounds:0,infectedAge:null,serial:0,last:ConsumerGroup.empty(w.turn)};
        let left=o.B;const n=ConsumerGroup.count(o);
        o.consumerGroup.cohorts.forEach((c,i,a)=>{c.B=i===a.length-1?left:Q(o.B*c.n/n);left=Q(left-c.B);});
        delete o.birthLife;
      }else if(k==="plant")o.birthLife=Math.round(600*(.9+.2*r(w,"cell/plant-life",0,o.id)));
      else delete o.birthLife;
      if(k==="fungus"&&!Object.hasOwn(options,"birthReady"))o.birthReady=w.turn+10;
      const p=phenotype(w,o);
      // Explicit fixture/birth stocks are caller-owned; initial default stocks
      // use the new caps before the world's initial ledger is established.
      for(const [key,cap]of [["E",p.capE],["M",p.capM],["B",p.capB]])if(!Object.hasOwn(options,key))o[key]=Q(Math.min(o[key],cap));
      o.cellMatter={version:"cell-matter/1",bodyM:Q(.02*o.B),newB:0,tissueAt:w.turn};
      return o;
    }
    function bounds(o,phase=o.phase){
      const k=o.cellLife.kind,n=k==="group"?ConsumerGroup.count(o):1;
      return k==="fungus"?{base:1,edible:3,growth:.25,capE:2,capM:.1,E:.1,M:.005,cooldown:10}:k==="group"?{base:0,edible:2*n,growth:.25*n,capE:2*n,capM:.05*n,E:.05*n,M:.001*n,cooldown:4}:
        k==="colony"?{base:2,edible:20,growth:2,capE:4,capM:.2,E:.2,M:.01,cooldown:1}:
        {base:2*phase,edible:10*phase,growth:phase,capE:6+1.5*phase,capM:.3+.075*phase,E:.2+.05*phase,M:.01+.0025*phase,cooldown:[0,40,32,24,20][phase]};
    }
    function age(o){
      if(o.cellLife.kind!=="plant")return {stage:"adult",production:1,maintenance:1,mature:true};
      const elderlyAt=.8*o.birthLife,u=H.clamp((o.age-elderlyAt)/(o.birthLife-elderlyAt),0,1);
      return {stage:o.age<40?"juvenile":o.age<elderlyAt?"adult":"elderly",production:1-.2*u,maintenance:1+.2*u,mature:o.age>=40};
    }
    function upkeep(o){
      const p=bounds(o),k=o.cellLife.kind,a=age(o),base=o.cellLife.baseB;
      const ratio=k==="group"?1:k==="fungus"?Math.min(1,o.B/4):.25*Math.min(1,base/p.base)+.75*Math.min(1,Math.max(0,o.B-base)/p.edible);
      const branch=o.phase===4&&o.branch3===0?(o.branch4===0?1.1:.8):1;
      return {E:Q(p.E*ratio*a.maintenance*(k==="plant"?branch:1)),M:Q(p.M*ratio*a.maintenance)};
    }
    function phenotype(w,o,phase=o.phase,branch=o.branch4){
      const p=bounds(o,phase),k=o.cellLife.kind,n=k==="group"?ConsumerGroup.count(o):1,s=spec(o),a=age(o),maintenance=upkeep(o);
      return {phase,u:phase/4,branch,capE:Q(p.capE),capB:p.base+p.edible,capM:Q(p.capM),maxHP:s.capacity[3]*n,
        baseMaxHP:s.capacity[3]*n,maintenance:maintenance.E,baseMaintenance:maintenance.E,maintenanceM:maintenance.M,
        life:k==="plant"?o.birthLife:s.life,sense:1,speed:k==="group"?1:0,range:1,cooldown:p.cooldown*(k==="plant"&&phase===4&&o.branch3===1?(branch===0?1.5:.75):1),baseCooldown:p.cooldown,M3:0,M4:0,
        members:n,ageEnabled:k==="plant",ageStage:a.stage,ageFactors:{...ageFactors.adult,light:a.production,maintenance:a.maintenance},
        lightInput:["group","fungus"].includes(k)?0:(s.lightInput??4)*(k==="plant"&&phase===4&&o.branch3===0&&branch===0?1.2:1),surface:Math.max(0,o.B-o.cellLife.baseB),
        regenerationFactor:a.production*(k==="plant"&&phase===4&&o.branch3===2&&branch===1?1.2:1),biteFactor:k==="plant"&&phase===4&&o.branch3===2&&branch===0?.8:1};
    }
    // Extract exact selected cohort body, proportional free stores and bound M.
    // This piece has one infection owner; a split never clones its P/Q tree.
    function extract(w,o,amount,reason,ctx,ageOnly=null){
      const g=o.consumerGroup,before=ConsumerGroup.count(o),n=Math.min(before,amount),cohorts=[];
      if(!Number.isInteger(n)||n<=0)return null;
      ConsumerGroup.bindInfection(w,o);let left=n,B=0,infected=false;
      const ordered=g.cohorts.filter(c=>ageOnly===null||c.age===ageOnly).slice().sort((a,b)=>b.age-a.age||a.phase-b.phase);
      if(ordered.reduce((v,c)=>v+c.n,0)<n)throw Error("CONSUMER_MEMBERS: insufficient cohort");
      for(const c of ordered){const take=Math.min(left,c.n);if(!take)continue;
        const body=take===c.n?c.B:Q(c.B*take/c.n),sameAge=g.cohorts.filter(a=>a.age===c.age).reduce((v,a)=>v+a.n,0);
        if(!infected&&o.infection&&g.infectedAge===c.age&&r(w,"consumer/infected-part",w.turn,o.id,[g.serial,c.age,c.phase,reason])<take/sameAge)infected=true;
        cohorts.push({...c,n:take,B:body});c.B=Q(c.B-body);c.n-=take;B=Q(B+body);left-=take;if(!left)break;
      }
      const part={...o,id:"part:"+o.id+":"+w.turn+":"+g.serial++,parents:[o.id],infection:infected?o.infection:null,groupRemains:true,B};
      delete part.consumerGroup;delete part.cellLife;delete part.knowledge;delete part.information;delete part.informationState;delete part.hyperTraces;
      for(const k of ["E","M"]){part[k]=n===before?o[k]:Q(o[k]*n/before);o[k]=Q(o[k]-part[k]);}
      part.cellMatter={...o.cellMatter,bodyM:n===before?o.cellMatter.bodyM:Q(o.cellMatter.bodyM*(o.B?B/o.B:n/before)),newB:Math.min(B,Q((o.cellMatter.newB||0)*(o.B?B/o.B:n/before))),newEdibleB:0};
      o.cellMatter.bodyM=Q(o.cellMatter.bodyM-part.cellMatter.bodyM);o.B=Q(o.B-B);
      o.cellMatter.newB=Math.min(o.B,Q((o.cellMatter.newB||0)-part.cellMatter.newB));o.cellMatter.newEdibleB=0;
      part.HP=Q(o.HP*n/before);part.age=cohorts[0].age;part.phase=cohorts[0].phase;
      const infectedAge=infected?g.infectedAge:null;if(infected){o.infection=null;g.infectedAge=null;part.infection.hostId=part.id;}
      g.cohorts=g.cohorts.filter(c=>c.n>0);o.HP=Q(o.HP-part.HP);g.wounds=Q(g.wounds*(before-n)/before);
      if(!g.cohorts.length)o.HP=0;
      if(ctx)ctx.traits.set(part.id,{...ctx.traits.get(o.id),phase:part.phase});
      return {part,cohorts,n,before,infected,infectedAge};
    }
    function validate(o){
      const a=o.cellLife,finite=n=>Number.isFinite(n)&&n>=0;if(!is(o))return true;
      if(!["colony","plant","group","fungus"].includes(a.kind)||![a.baseB,a.maintained].every(finite)||a.baseB>o.B+EPS||!o.cellMatter)return false;
      if(a.kind==="group")return ConsumerGroup.count(o)<=8&&o.consumerGroup.cohorts.every(c=>Number.isInteger(c.age)&&c.age>=0&&[1,2].includes(c.phase)&&Number.isInteger(c.n)&&c.n>0&&finite(c.B)&&c.B<=2*c.n+EPS)&&Math.abs(o.B-o.consumerGroup.cohorts.reduce((n,c)=>n+c.B,0))<1e-5;
      return a.baseB<=bounds(o).base+EPS&&o.B-a.baseB<=bounds(o).edible+EPS;
    }
    return {VERSION,is,attach,bounds,age,upkeep,phenotype,extract,validate};
  })();
  const PLANT_BASE = 2;
  const edibleB = (o) =>
    Math.max(0, o.B - (CellLife.is(o) ? o.cellLife.baseB : FungalColony.is(o) ? o.colony.baseB : spec(o).group === "plant" ? PLANT_BASE : 0));
  const leafFactor = (o) =>
    0.5 + 0.5 * H.clamp((o.B - PLANT_BASE) / 10, 0, 1);
  const FungalColony = (() => {
    const VERSION="fungal-colony-state/1",enabled=w=>w.config.balanceModel==="survival/4",
      is=o=>o?.species==="fungus"&&o.colony?.version===VERSION;
    function settings(input={}){
      const defaults={version:"fungal-colony-parameters/1",baseB:1,capacityB:12,maintenance:.0375,dormantMaintenance:.01,regrowthB:1,regrowthCost:1.2,reserveE:2,starvationTurns:12};
      if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw Error("SETTINGS_INVALID: 菌膜群落の設定");
      const z={...defaults,...input};
      if(z.version!==defaults.version||z.baseB!==1||!Number.isInteger(z.starvationTurns))throw Error("SETTINGS_INVALID: 菌膜群落の定義版/基部");
      for(const [k,lo,hi]of [["capacityB",5,200],["maintenance",0,1],["dormantMaintenance",0,z.maintenance],["regrowthB",0,z.capacityB],["regrowthCost",1,10],["reserveE",0,30],["starvationTurns",1,100]])
        if(typeof z[k]!=="number"||!Number.isFinite(z[k])||z[k]<lo||z[k]>hi)throw Error("SETTINGS_INVALID: 菌膜群落 "+k);
      return z;
    }
    function attach(w,o,origin={kind:"initial"}){
      if(!enabled(w)||o.species!=="fungus"||is(o))return;
      const z=w.config.fungalColonySettings;
      o.colony={version:VERSION,origin:structuredClone(origin),establishedAt:w.turn,baseB:z.baseB,capacityB:z.capacityB,activity:1,starvationRun:0,
        last:{turn:w.turn,consumedB:0,regrowthB:0,regrowthCostE:0,assimilatedE:0},
        cumulative:{consumedB:0,regrowthB:0,regrowthCostE:0,assimilatedE:0,maintainedTurns:0}};
      delete o.birthLife;
    }
    const increment=(o,k,n)=>{o.colony.last[k]=H.round(o.colony.last[k]+n);o.colony.cumulative[k]=H.round(Math.min(1e12,o.colony.cumulative[k]+n));};
    function begin(w){if(enabled(w))for(const o of w.organisms)if(is(o))o.colony.last={turn:w.turn,consumedB:0,regrowthB:0,regrowthCostE:0,assimilatedE:0};}
    function maintained(w,o,paid,cost){const z=w.config.fungalColonySettings,c=o.colony;
      c.starvationRun=paid+1e-8>=H.round(cost)?0:c.starvationRun+1;
      if(c.starvationRun===0)c.cumulative.maintainedTurns=Math.min(1e12,c.cumulative.maintainedTurns+1);
      c.activity=H.round(Math.max(0,1-c.starvationRun/z.starvationTurns));
    }
    function regrow(w,o,hasBirth){const z=w.config.fungalColonySettings,c=o.colony;
      const reserve=hasBirth&&o.phase>=2&&o.B>=3&&o.M>=.2?Math.max(8,z.reserveE):z.reserveE,
        amount=H.round(Math.max(0,Math.min(z.regrowthB*c.activity-c.last.regrowthB,c.capacityB-edibleB(o),Math.max(0,o.E-reserve)/z.regrowthCost)));
      if(!amount)return;
      const cost=H.round(amount*z.regrowthCost);o.E=H.round(o.E-cost);o.B=H.round(o.B+amount);dissipate(w,H.round(cost-amount));
      increment(o,"regrowthB",amount);increment(o,"regrowthCostE",cost);
    }
    function summary(w){if(!enabled(w))return;
      const out={definition:"fungal-colony-observed/1",turn:w.turn,count:0,B:0,baseB:0,edibleB:0,capacityB:0,reserveE:0,reserveM:0,consumedB:0,regrowthB:0,regrowthCostE:0,assimilatedE:0,dormantCount:0};
      for(const o of w.organisms)if(is(o)){out.count++;out.B+=o.B;out.baseB+=o.colony.baseB;out.edibleB+=edibleB(o);out.capacityB+=o.colony.capacityB;out.reserveE+=o.E;out.reserveM+=o.M;if(edibleB(o)<=1e-8)out.dormantCount++;for(const k of ["consumedB","regrowthB","regrowthCostE","assimilatedE"])out[k]+=o.colony.last[k];}
      for(const k of Object.keys(out))if(typeof out[k]==="number")out[k]=H.round(out[k]);w.fungalColonySummary=out;
    }
    return {enabled,is,settings,attach,begin,maintained,regrow,summary,increment};
  })();
  // Bounded local populations. Cohorts contain counts, never individual agents.
  const ConsumerGroup = (() => {
    const VERSION='consumer-group-state/1', species=['grassbug','waterbug'];
    const enabled=w=>w.config.consumerModel==='group/1',is=o=>o?.consumerGroup?.version===VERSION;
    const count=o=>is(o)?o.consumerGroup.cohorts.reduce((n,c)=>n+c.n,0):1;
    function settings(input={}){
      const d={version:'consumer-group-parameters/1',capacity:8,initialSize:4,maxBirths:2,dispersalAt:4};
      if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(d,k)))throw Error('SETTINGS_INVALID: 一次消費者集団');
      const z={...d,...input};
      if(!['consumer-group-parameters/1','consumer-group-parameters/2','consumer-group-parameters/3','consumer-group-parameters/4'].includes(z.version)||!Number.isSafeInteger(z.capacity)||z.capacity<2||z.capacity>32||
        !['initialSize','maxBirths','dispersalAt'].every(k=>Number.isSafeInteger(z[k])&&z[k]>=1&&z[k]<=z.capacity))throw Error('SETTINGS_INVALID: 一次消費者集団の値');
      return z;
    }
    const empty=turn=>({turn,born:0,combat:0,harvest:0,starvation:0,age:0,dispersed:0,joined:0,assimilatedE:0});
    function attach(w,o){
      if(!enabled(w)||!species.includes(o.species)||is(o))return;
      o.consumerGroup={version:VERSION,establishedAt:w.turn,origin:null,cohorts:[{age:o.age,phase:o.phase,n:1}],wounds:0,infectedAge:null,serial:0,last:empty(w.turn)};
      if(o.species==='grassbug'&&w.config.consumerGroupSettings.version==='consumer-group-parameters/2')o.consumerGroup.grassAdvantage='waterbug/1';
      if(o.species==='grassbug'&&w.config.consumerGroupSettings.version==='consumer-group-parameters/3')o.consumerGroup.grassAdvantage='balanced/1';
      if(o.species==='grassbug'&&w.config.consumerGroupSettings.version==='consumer-group-parameters/4')o.consumerGroup.grassAdvantage='moderate/1';
      delete o.birthLife;
    }
    function compact(o){const by=new Map();for(const c of o.consumerGroup.cohorts)if(c.n>0){const key=c.age+':'+c.phase,old=by.get(key);if(old)old.n+=c.n;else by.set(key,{...c});}
      o.consumerGroup.cohorts=[...by.values()].sort((a,b)=>a.age-b.age||a.phase-b.phase);
      o.phase=o.consumerGroup.cohorts.some(c=>c.phase===2)?2:1;
    }
    function ages(o){const s=spec(o),out={juvenile:0,adult:0,elderly:0};
      for(const c of o.consumerGroup.cohorts)out[c.age<(CellLife.is(o)?8:s.maturity)?'juvenile':c.age<Math.floor(s.life*.75)?'adult':'elderly']+=c.n;return out;
    }
    function factors(o){const a=ages(o),n=Math.max(1,count(o)),out={};
      for(const k of Object.keys(ageFactors.adult))out[k]=Object.entries(a).reduce((v,[stage,num])=>v+ageFactors[stage][k]*num/n,0);return out;
    }
    function maxHP(o){return H.round(spec(o).capacity[3]*count(o)*factors(o).hp);}
    function refresh(w,o,ctx){compact(o);o.HP=H.round(Math.max(0,maxHP(o)-o.consumerGroup.wounds));if(ctx?.traits.has(o.id))ctx.traits.set(o.id,phenotype(w,o));}
    function initialize(w){if(!enabled(w)||CellSpace.enabled(w))return;
      const removed=new Set(),at=new Map();
      for(const o of w.organisms)if(species.includes(o.species)){
        attach(w,o);o.consumerGroup.cohorts=[{age:o.age,phase:o.phase,n:1}];o.consumerGroup.wounds=H.round(Math.max(0,maxHP(o)-o.HP));
        if(o.consumerGroup.grassAdvantage==='waterbug/1'){
          const source=D.byId.grassbug.initial,target=spec(o).initial;
          o.E=H.round(o.E+target[0]-source[0]);o.B=H.round(o.B+target[1]-source[1]);
          o.HP=H.round(o.HP*target[3]/source[3]);
          o.consumerGroup.wounds=H.round(Math.max(0,maxHP(o)-o.HP));
        }
        at.set(o.cell,o);
      }
      for(const o of w.organisms)if(is(o)&&!removed.has(o.id)){
        for(const cell of nearby(w,o.cell)){
          const other=at.get(cell);if(!other||removed.has(other.id)||other.species!==o.species||(o.infection&&other.infection)||!oneStep(w,o.cell,cell)||count(o)+count(other)>w.config.consumerGroupSettings.initialSize)continue;
          for(const k of ['E','B','M','HP'])o[k]=H.round(o[k]+other[k]);
          o.consumerGroup.wounds=H.round(o.consumerGroup.wounds+other.consumerGroup.wounds);
          o.consumerGroup.cohorts.push(...other.consumerGroup.cohorts);if(other.infection){o.infection=other.infection;o.infection.hostId=o.id;o.consumerGroup.infectedId=o.infection.id;o.consumerGroup.infectedAge=other.age;}removed.add(other.id);compact(o);
        }
        // age here is time since this local group was established, not a lifespan.
        o.age=0;refresh(w,o);bindInfection(w,o);
      }
      w.organisms=w.organisms.filter(o=>!removed.has(o.id));
    }
    function begin(w){if(!enabled(w))return;for(const o of w.organisms)if(is(o))o.consumerGroup.last=empty(w.turn);}
    function bindInfection(w,o){if(!is(o))return;const g=o.consumerGroup;
      if(!o.infection){g.infectedAge=null;return;}
      if(g.infectedId===o.infection.id&&g.cohorts.some(c=>c.age===g.infectedAge))return;
      let pick=Math.floor(r(w,'consumer/infected-member',w.turn,o.id,o.infection.id)*count(o));
      for(const c of g.cohorts){if(pick<c.n){g.infectedAge=c.age;break;}pick-=c.n;}
      g.infectedId=o.infection.id;
    }
    // Extract finite members. The caller decides death vs movement; neither is a birth.
    function extract(w,o,amount,reason,ctx,ageOnly=null){
      if(CellLife.is(o))return CellLife.extract(w,o,amount,reason,ctx,ageOnly);
      bindInfection(w,o);const g=o.consumerGroup,before=count(o),cohorts=[],n=Math.min(before,amount);
      if(!n)return null;let left=n,infected=false;
      const ordered=g.cohorts.filter(c=>ageOnly===null||c.age===ageOnly).slice().sort((a,b)=>b.age-a.age||a.phase-b.phase);
      for(const c of ordered){const take=Math.min(left,c.n);if(!take)continue;
        const sameAge=g.cohorts.filter(a=>a.age===c.age).reduce((x,a)=>x+a.n,0);
        if(!infected&&o.infection&&g.infectedAge===c.age&&r(w,'consumer/infected-part',w.turn,o.id,[g.serial,c.age,c.phase,reason])<take/sameAge)infected=true;
        cohorts.push({age:c.age,phase:c.phase,n:take});c.n-=take;left-=take;if(!left)break;
      }
      if(left)throw Error('CONSUMER_MEMBERS: insufficient cohort');
      const infectedAge=infected?g.infectedAge:null;
      const part={...o,id:'part:'+o.id+':'+w.turn+':'+g.serial++,parents:[o.id],infection:infected?o.infection:null,groupRemains:true};
      delete part.consumerGroup;delete part.knowledge;delete part.information;delete part.informationState;delete part.hyperTraces;
      for(const k of ['E','B','M']){part[k]=n===before?o[k]:H.round(o[k]*n/before);o[k]=H.round(o[k]-part[k]);}
      part.HP=H.round(o.HP*n/before);part.age=cohorts[0].age;
      if(infected){o.infection=null;g.infectedAge=null;part.infection.hostId=part.id;}
      compact(o);if(ctx)ctx.traits.set(part.id,{...phenotype(w,o),phase:part.phase});
      return {part,cohorts,n,before,infected,infectedAge};
    }
    function damage(w,o,value){if(!is(o))return;const g=o.consumerGroup,maximum=CellLife.is(o)?CellLife.phenotype(w,o).maxHP:maxHP(o);if(CellLife.is(o))g.wounds=Math.max(g.wounds,maximum-o.HP);g.wounds=H.round(g.wounds+value);o.HP=H.round(Math.max(0,maximum-g.wounds));}
    function heal(o,amount){if(is(o))o.consumerGroup.wounds=H.round(Math.max(0,o.consumerGroup.wounds-amount));}
    function recordLoss(w,o,piece,reason,ctx){
      o.consumerGroup.last[reason]+=piece.n;
      if(ctx.consumerGroupFlows)ctx.consumerGroupFlows[o.species][reason]+=piece.n;
      ctx.deaths.push({id:o.id,species:o.species,reason,count:piece.n,partial:true,generation:o.generation,ageStage:'mixed'});
      record(ctx,o,'group-loss',{reason,count:piece.n});
    }
    function grow(w,o){const g=o.consumerGroup,s=spec(o);if(o.E>=6*count(o))for(const c of g.cohorts)if(c.phase===1&&c.age>=s.maturity)c.phase=2;compact(o);}
    function reproduce(w,ctx,pressure){if(!enabled(w))return;
      const z=w.config.consumerGroupSettings;
      for(const o of w.organisms)if(is(o)&&o.HP>0){
        const n=count(o),s=spec(o),adults=grown(o),g=o.consumerGroup;
        if(!adults||n>=z.capacity||o.birthReady>w.turn||ctx.records.get(o.id)?.damage>0||!pressure(w,o,ctx).allowed)continue;
        const born=Math.min(z.maxBirths,Math.max(1,Math.floor(adults/2)),z.capacity-n,Math.floor(Math.max(0,o.E-2*n)/8));
        if(!born)continue;
        o.E=H.round(o.E-2*born);o.B=H.round(o.B+2*born);g.cohorts.push({age:0,phase:1,n:born});g.last.born+=born;if(ctx.consumerGroupFlows)ctx.consumerGroupFlows[o.species].born+=born;
        o.birthReady=w.turn+s.birthCooldown+1;o.firstBirthAt??=w.turn;ctx.parents.add(o.id);
        for(let i=0;i<born;i++)ctx.births.push(o.species);
        refresh(w,o,ctx);record(ctx,o,'birth',{count:born,internal:true,parents:[o.id]});
      }
    }
    const grown=o=>o.consumerGroup.cohorts.filter(c=>c.age>=spec(o).maturity).reduce((n,c)=>n+c.n,0);
    function disperse(w,ctx,moveCost){if(!enabled(w))return;
      const z=w.config.consumerGroupSettings,at=new Map(w.organisms.filter(o=>o.slot===D.byId.grassbug.slot).map(o=>[o.cell,o])),
        original=w.organisms.filter(is).slice(),arrived=new Set(),newGroups=[];
      for(const o of original){const n=count(o),g=o.consumerGroup;
        // A group that already moved, received members or gave birth waits until next T.
        if(arrived.has(o.id)||n<2||ctx.records.get(o.id)?.moved||g.last.born||o.HP<=0)continue;
        const hunger=o.E<spec(o).maintenance*n*4,threat=(ctx.records.get(o.id)?.damage||0)>0;
        if(n<z.dispersalAt&&!hunger&&!threat)continue;
        const choices=nearby(w,o.cell).filter(cell=>oneStep(w,o.cell,cell)&&validHabitat(w,spec(o),cell)&&sight(w,o.cell,cell))
          .map(cell=>({cell,target:at.get(cell),cost:moveCost(w,o,cell)/n}))
          .filter(a=>!a.target||(is(a.target)&&a.target.species===o.species&&!a.target.infection&&!o.infection&&!arrived.has(a.target.id)&&!ctx.records.get(a.target.id)?.moved&&!a.target.consumerGroup.last.born&&count(a.target)<z.capacity))
          .sort((a,b)=>hash(w,'consumer/disperse',w.turn,o.id,a.cell)-hash(w,'consumer/disperse',w.turn,o.id,b.cell));
        const choice=choices.find(a=>o.E>=a.cost*Math.min(Math.floor(n/2),a.target?z.capacity-count(a.target):z.capacity));if(!choice)continue;
        const moving=Math.min(Math.floor(n/2),choice.target?z.capacity-count(choice.target):z.capacity),cost=H.round(choice.cost*moving);
        if(!moving)continue;o.E=H.round(o.E-cost);dissipate(w,cost);
        const piece=extract(w,o,moving,'dispersal',ctx),target=choice.target;
        g.last.dispersed+=moving;if(ctx.consumerGroupFlows){ctx.consumerGroupFlows[o.species].dispersed+=moving;ctx.consumerGroupFlows[o.species].joined+=moving;}
        if(target){for(const k of ['E','B','M'])target[k]=H.round(target[k]+piece.part[k]);target.consumerGroup.cohorts.push(...piece.cohorts);
          target.consumerGroup.wounds=H.round(target.consumerGroup.wounds+g.wounds*moving/n);target.consumerGroup.last.joined+=moving;refresh(w,target,ctx);arrived.add(target.id);
        }else{
          const child=structuredClone(piece.part);delete child.groupRemains;child.id='g:'+w.turn+':'+choice.cell+':'+o.species;child.cell=choice.cell;child.age=0;child.history=[choice.cell];child.seen=[];child.birthReady=o.birthReady;
          child.consumerGroup={version:VERSION,establishedAt:w.turn,origin:o.id,cohorts:piece.cohorts,wounds:H.round(g.wounds*moving/n),infectedAge:piece.infectedAge,serial:0,last:{...empty(w.turn),joined:moving}};
          if(g.grassAdvantage)child.consumerGroup.grassAdvantage=g.grassAdvantage;
          if(child.infection){child.infection.hostId=child.id;child.consumerGroup.infectedId=child.infection.id;}
          // New local group has no fabricated personal learning/history.
          PersistentInformation.attach(w,child);refresh(w,child);newGroups.push(child);at.set(choice.cell,child);arrived.add(child.id);
        }
        g.wounds=H.round(g.wounds*(n-moving)/n);refresh(w,o,ctx);
        record(ctx,o,'move',{from:o.cell,to:choice.cell,path:[choice.cell],count:moving,partial:true});
      }
      w.organisms.push(...newGroups);
    }
    function summary(w,ctx){if(!enabled(w))return;
      const rows=Object.fromEntries(species.map(id=>[id,{groups:0,individuals:0,B:0,E:0,M:0,infectedIndividuals:0,born:0,combat:0,harvest:0,starvation:0,age:0,dispersed:0,joined:0,assimilatedE:0}]));
      for(const o of w.organisms)if(is(o)){const a=rows[o.species];a.groups++;a.individuals+=count(o);a.B+=o.B;a.E+=o.E;a.M+=o.M;if(o.infection)a.infectedIndividuals++;
        for(const k of ['born','combat','harvest','starvation','age','dispersed','joined','assimilatedE'])a[k]+=o.consumerGroup.last[k];}
      for(const a of Object.values(rows))for(const k of Object.keys(a))a[k]=H.round(a[k]);
      if(ctx?.consumerGroupFlows)for(const id of species)Object.assign(rows[id],ctx.consumerGroupFlows[id]);
      w.consumerGroupSummary={definition:'consumer-group-observed/1',turn:w.turn,species:rows};
    }
    function validate(w,o){if(CellLife.is(o))return CellLife.validate(o);
      const g=o.consumerGroup,n=count(o),z=w.config.consumerGroupSettings;
      return enabled(w)&&species.includes(o.species)&&n>0&&n<=z.capacity&&g.cohorts.length<=z.capacity&&g.cohorts.every(c=>Number.isSafeInteger(c.age)&&c.age>=0&&c.age<spec(o).life&&[1,2].includes(c.phase)&&Number.isSafeInteger(c.n)&&c.n>0)&&
        Number.isFinite(g.wounds)&&g.wounds>=0&&['E','B','M','HP'].every(k=>Number.isFinite(o[k])&&o[k]>=0)&&o.HP<=maxHP(o)+1e-5;
    }
    return {VERSION,species,empty,enabled,is,count,settings,attach,initialize,begin,ages,factors,maxHP,refresh,bindInfection,extract,damage,heal,recordLoss,grow,reproduce,disperse,summary,validate};
  })();
  // Opt-in basal colonies keep their actual E/B/M in the ordinary organism ledger.
  const Colony = (() => {
    const VERSION = "colony-state/1", LIMIT = 1e12;
    const enabled = (w) => w.config.producerModel === "colony/1";
    const is = (o) => o.colony?.version === VERSION;
    const region = (w, cell) => ["shallow", "deep"].includes(w.tiles[cell].terrain) ? "water" : "land";
    function settings(input = {}) {
      const check = (o, keys) => {
        if (!o || typeof o !== "object" || Array.isArray(o) || Object.keys(o).some(k => !keys.includes(k)))
          throw Error("SETTINGS_INVALID: 群落の比較値");
      };
      check(input, ["version", "standardBiteB", "land", "water"]);
      if ((input.version !== undefined && input.version !== "colony-parameters/1") ||
          (input.standardBiteB !== undefined && input.standardBiteB !== 2)) throw Error("SETTINGS_INVALID: 群落の定義版/標準量");
      const result = {version:"colony-parameters/1", standardBiteB:2};
      for (const name of ["land", "water"]) {
        const value = input[name] ?? {};
        check(value, ["occupancy", "capacityB", "initialFraction", "regrowthB"]);
        const out = result[name] = {occupancy:name === "land" ? .20 : .15, capacityB:20, initialFraction:.70, regrowthB:2, ...value};
        for (const [key, low, high] of [["occupancy",0,1],["capacityB",.02,200],["initialFraction",0,1],["regrowthB",0,out.capacityB*.1]])
          if (typeof out[key] !== "number" || !Number.isFinite(out[key]) || out[key] < low || out[key] > high + 1e-9)
            throw Error("SETTINGS_INVALID: 群落 " + name + "/" + key);
      }
      return result;
    }
    const parameters = (w, cell) => w.config.producerSettings[region(w, cell)];
    function attach(w, o, origin = {kind:"initial"}) {
      if (!enabled(w) || spec(o).group !== "plant" || spec(o).kind === "independent" || is(o)) return o;
      o.colony = {version:VERSION, origin:structuredClone(origin), establishedAt:w.turn,
        baseB:PLANT_BASE, capacityB:parameters(w,o.cell).capacityB, activity:1,
        replacementDebtB:0, edibleExposure:null,
        last:{turn:w.turn,productionB:0,regrowthB:0,consumedB:0,solarInputE:0},
        cumulative:{productionB:0,regrowthB:0,consumedB:0,maintainedTurns:0,settlements:0}};
      delete o.birthLife;
      return o;
    }
    function increment(o, key, value) {
      o.colony.cumulative[key] = H.round(Math.min(LIMIT, o.colony.cumulative[key] + value));
    }
    function begin(w) {
      if (!enabled(w)) return;
      w.colonyFlows = {turn:w.turn,land:{productionB:0,regrowthB:0,consumedB:0},water:{productionB:0,regrowthB:0,consumedB:0}};
      for (const o of w.organisms) if (is(o)) {
        o.colony.last = {turn:w.turn,productionB:0,regrowthB:0,consumedB:0,solarInputE:0};
        const exposure = o.colony.edibleExposure;
        if (exposure && exposure.expires <= w.turn) {
          dissipate(w, exposure.E);
          o.colony.edibleExposure = null;
        }
      }
    }
    function regional(w) {
      const species = D.species.filter(s => s.group === "plant"), out = {};
      for (const name of ["land", "water"]) {
        const cells = w.tiles.map((_,i) => i).filter(cell => region(w,cell) === name && species.some(s => validHabitat(w,s,cell)));
        out[name] = {eligibleCells:cells.length, target:Math.round(cells.length*w.config.producerSettings[name].occupancy)};
      }
      return out;
    }
    function occupancy(w) {
      const counts = {land:0,water:0};
      for (const o of w.organisms) if (is(o) && o.HP > 0) counts[region(w,o.cell)]++;
      return counts;
    }
    function room(w, cell, counts = occupancy(w)) {
      const name = region(w,cell);
      return counts[name] < (w.colonyRegions ??= regional(w))[name].target;
    }
    function allowed(w, s) { return !!w.config.enabled.plant && (w.turn > 0 || w.config.founderCounts?.species[s.id] !== 0); }
    function initialize(w) {
      if (!enabled(w)) return;
      w.colonyRegions = regional(w);
      if (!w.config.enabled.plant) return;
      const species = D.species.filter(s => s.group === "plant"), occupied = new Set(w.organisms.filter(o => o.slot === "food").map(o => o.cell));
      const counts = {land:0,water:0};
      function place(s, cell) {
        const o = organism(w,s,cell,"i:colony:"+cell+":"+s.id);
        o.B = H.round(PLANT_BASE + parameters(w,cell).capacityB*parameters(w,cell).initialFraction);
        w.organisms.push(o); occupied.add(cell); counts[region(w,cell)]++;
      }
      const candidates = s => w.tiles.map((_,i) => i).filter(cell => !occupied.has(cell) && validHabitat(w,s,cell))
        .sort((a,b) => initialRank(w,s,a)-initialRank(w,s,b) || a-b);
      for (const s of species) {
        const direct = w.config.founderCounts?.species[s.id];
        if (direct === undefined) continue;
        const cells = candidates(s);
        if (cells.length < direct) throw Error("PLACEMENT_SHORTAGE: " + s.name + " 群落の指定数に対する適地/空き枠が不足しています");
        for (const cell of cells.slice(0,direct)) place(s,cell);
      }
      for (const name of ["land","water"]) {
        const clustered=w.config.initialConditions?.distribution==="cluster";
        const sites = w.tiles.map((_,i) => i).filter(cell => region(w,cell) === name && !occupied.has(cell))
          .map(cell => ({cell,species:species.filter(s => w.config.founderCounts?.species[s.id] === undefined && validHabitat(w,s,cell))}))
          .map(site => ({...site,rank:clustered&&site.species.length?Math.min(...site.species.map(s=>initialRank(w,s,site.cell))):0}))
          .filter(a => a.species.length).sort((a,b) => {
            const rank = x => hash(w,"colony/initial-block",0,null,[Math.floor((x.cell%w.config.width)/3),Math.floor(Math.floor(x.cell/w.config.width)/3)]);
            return a.rank-b.rank || rank(a)-rank(b) || hash(w,"colony/initial-cell",0,null,a.cell)-hash(w,"colony/initial-cell",0,null,b.cell);
          });
        for (const site of sites) {
          if (counts[name] >= w.colonyRegions[name].target) break;
          site.species.sort((a,b) => (clustered?initialRank(w,a,site.cell)-initialRank(w,b,site.cell):0) || hash(w,"colony/initial-species",0,a.id,site.cell)-hash(w,"colony/initial-species",0,b.id,site.cell));
          place(site.species[0],site.cell);
        }
      }
      for (const name of ["land","water"]) w.colonyRegions[name].initial = counts[name];
    }
    function flow(w,o,key,amount) {
      if(!w.colonyFlows || w.colonyFlows.turn !== w.turn)
        w.colonyFlows={turn:w.turn,land:{productionB:0,regrowthB:0,consumedB:0},water:{productionB:0,regrowthB:0,consumedB:0}};
      const row=w.colonyFlows[region(w,o.cell)];row[key]=H.round((row[key]||0)+amount);
    }
    function solar(w,o,amount){o.colony.last.solarInputE=H.round(o.colony.last.solarInputE+amount);flow(w,o,"solarInputE",amount);}
    function consumed(w, o, amount) {
      o.colony.last.consumedB = H.round(o.colony.last.consumedB + amount);
      increment(o,"consumedB",amount);
      flow(w,o,"consumedB",amount);
      o.colony.replacementDebtB = H.round(Math.min(o.colony.capacityB,o.colony.replacementDebtB+amount));
    }
    function regrow(w, o) {
      if (!is(o) || o.HP <= 0 || w.tiles[o.cell].light <= 0 || ProducerSupport.factor(w,o,{spec}) <= 0) return;
      const c = o.colony, p = phenotype(w,o), tile = w.tiles[o.cell], options = parameters(w,o.cell);
      const multiplier=w.config.producerSupport?.enabled?w.config.producerSupport[region(w,o.cell)].regrowth:1;
      const ceiling=Math.min(c.capacityB*.1,options.regrowthB*multiplier);
      const amount = H.round(Math.max(0,Math.min(Math.max(0,ceiling*c.activity*Math.min(1,tile.light)-c.last.productionB),
        c.capacityB-edibleB(o),Math.max(0,o.E-2)/1.2,tile.soilM/.02,Math.max(0,p.capM-o.M)/.02)));
      if (!amount) return;
      const expense = H.round(1.2*amount), material = H.round(.02*amount), replacement = Math.min(amount,c.replacementDebtB);
      o.E = H.round(o.E-expense); o.B = H.round(o.B+amount);
      tile.soilM = H.round(tile.soilM-material); o.M = H.round(o.M+material);
      dissipate(w,H.round(expense-amount));
      c.last.productionB = H.round(c.last.productionB+amount); c.last.regrowthB = H.round(c.last.regrowthB+replacement);
      c.replacementDebtB = H.round(c.replacementDebtB-replacement);
      increment(o,"productionB",amount); increment(o,"regrowthB",replacement);
      flow(w,o,"productionB",amount);flow(w,o,"regrowthB",replacement);
    }
    function summary(w) {
      if (!enabled(w)) return;
      const out = {definition:"colony-observed/1",turn:w.turn};
      for (const name of ["land","water"]) out[name] = {count:0,B:0,edibleB:0,occupiedCells:0,
        eligibleCells:(w.colonyRegions ??= regional(w))[name].eligibleCells,productionB:0,regrowthB:0,consumedB:0,solarInputE:0,reserveE:0,reserveM:0,baseB:0,activitySum:0};
      for (const o of w.organisms) if (is(o)) {
        const row = out[region(w,o.cell)];row.count++;row.occupiedCells++;row.B+=o.B;row.edibleB+=edibleB(o);
        row.reserveE+=o.E;row.reserveM+=o.M;row.baseB+=o.colony.baseB;row.activitySum+=o.colony.activity;
      }
      if(w.colonyFlows?.turn===w.turn)for(const name of ["land","water"]){const flow=w.colonyFlows[name];out[name].productionB=flow.productionB;out[name].regrowthB=flow.regrowthB;out[name].consumedB=flow.consumedB;out[name].solarInputE=flow.solarInputE||0;}
      for (const name of ["land","water"]) for (const key of Object.keys(out[name])) out[name][key]=H.round(out[name][key]);
      w.colonySummary=out;
    }
    return {enabled,is,region,settings,parameters,attach,increment,begin,regional,occupancy,room,allowed,initialize,consumed,regrow,solar,summary};
  })();
  const activeSpecies = (w) => w?.config?.ryoukiModel === "ryouki/1" ? [...D.species,...(w?.config?.largePlantModel === "independent/1"?D.independentPlants:[]),D.ryouki] : w?.config?.largePlantModel === "independent/1" ? [...D.species,...D.independentPlants] : D.species;
  const activeMain = (w) => w?.config?.ryoukiModel === "ryouki/1" ? [...D.main,D.ryouki] : D.main;
  const Ryouki = (() => {
    const VERSION="ryouki-state/1",LIMIT=1e12;
    const enabled=w=>w?.config?.ryoukiModel==="ryouki/1";
    const is=o=>o?.species==="ryouki"&&o.ryouki?.version===VERSION;
    function settings(input={}){
      const defaults={version:"ryouki-parameters/1",densityHigh:6,highTurns:3,densityLow:2,lowTurns:6,biteB:2,mutatedBiteB:2.4,preparationWeight:1.5};
      if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw Error("SETTINGS_INVALID: 量機の比較値");
      const out={...defaults,...input};
      if(out.version!==defaults.version)throw Error("SETTINGS_INVALID: 量機の定義版");
      for(const key of ["densityHigh","densityLow","highTurns","lowTurns"])if(!Number.isSafeInteger(out[key])||out[key]<(key.endsWith("Turns")?1:0)||out[key]>1000)throw Error("SETTINGS_INVALID: 量機の密度/継続T");
      if(out.densityLow>=out.densityHigh)throw Error("SETTINGS_INVALID: 量機の密度境界");
      for(const key of ["biteB","mutatedBiteB","preparationWeight"])if(typeof out[key]!=="number"||!Number.isFinite(out[key])||out[key]<=0||out[key]>20)throw Error("SETTINGS_INVALID: 量機の採食/評価値");
      if(out.mutatedBiteB<out.biteB)throw Error("SETTINGS_INVALID: 量機の相変異採食量");
      return out;
    }
    function attach(w,o,options={}){
      if(o.species!=="ryouki")return o;
      if(!enabled(w))throw Error("SETTINGS_INVALID: 量機モデルの指定が必要です");
      if(is(o))return o;
      o.ryouki={version:VERSION,mutated:false,highRun:0,lowRun:0,window:[],recentCells:[{turn:w.turn,cell:o.cell}],finalizedAt:-1,
        last:{turn:w.turn,density:0,experience:0,steps:0,transition:null}};
      const initial=D.ryouki.initial;
      for(const [i,key]of ["E","B","M","HP"].entries())if(!Object.hasOwn(options,key))o[key]=initial[i];
      return o;
    }
    function begin(w){
      if(!enabled(w))return;
      const m=maps(w),p=w.config.ryoukiSettings,newCells=m.cellSpace||null;
      const organisms=newCells?w.organisms.filter(is).map(o=>({o,h:hash(w,"cell/release",w.turn,o.id)}))
        .sort((a,b)=>a.h-b.h||compare(a.o.id,b.o.id)).map(a=>a.o):w.organisms;
      for(const o of organisms)if(is(o)){
        const a=o.ryouki,density=nearby(w,o.cell,1,true).reduce((n,cell)=>n+mainAt(m,cell).filter(t=>t.id!==o.id&&t.species==="ryouki"&&t.HP>0).length,0);
        a.last={turn:w.turn,density,experience:0,steps:0,transition:null};
        a.highRun=density>=p.densityHigh?Math.min(p.highTurns,a.highRun+1):0;
        a.lowRun=density<=p.densityLow?Math.min(p.lowTurns,a.lowRun+1):0;
        if(!a.mutated&&a.highRun>=p.highTurns){a.mutated=true;a.lowRun=0;a.last.transition="entered";}
        else if(a.mutated&&a.lowRun>=p.lowTurns){
          if(newCells){
            a.releaseWaiting=!CellSpace.release(w,o,newCells);
            if(!a.releaseWaiting){a.highRun=0;a.last.transition="released";}
          }else if(mainAt(m,o.cell).filter(t=>t.HP>0).every(t=>t.id===o.id)){a.mutated=false;a.highRun=0;a.last.transition="released";}
        }
        if(newCells&&(!a.mutated||a.lowRun<p.lowTurns))a.releaseWaiting=false;
      }
    }
    function phenotype(w,o,phase=o.phase,branch=o.branch4){
      const s=D.ryouki,a=ageInfo(o),f=a.factors,skin=o.dna.skin,body=o.dna.body;
      const life=Math.floor(s.life*(.95+.1*skin)*[0,1,1.1,1.25,1.4][phase]),maintenance=s.maintenance*(.95+.1*body)*[0,1,.98,.95,.9][phase];
      const cooldown=Math.max(4,Math.ceil(s.birthCooldown*(.95+.1*body)*(phase===4?.85:1)));
      return {phase,u:phase/4,capE:100,capB:32,capM:30,maxHP:H.round(80*f.hp),baseMaxHP:80,life,
        maintenance:maintenance*f.maintenance,baseMaintenance:maintenance,cooldown:cooldown*f.birth,baseCooldown:cooldown,
        sense:phase,speed:o.ryouki.mutated?3:phase,range:1,M3:s.M3*(.95+.1*skin),M4:s.M4*(.95+.1*skin),branch,
        ageEnabled:a.enabled,ageStage:a.stage,ageFactors:f};
    }
    function difficult(w,cell){const t=w.tiles[cell];return ["shallow","deep","rock","mud"].includes(t.terrain)||t.env===1;}
    function choose(w,o,scores,purpose){
      const largest=Math.max(...scores),dna=[o.dna.aptitude,o.dna.sensitivity,o.dna.appendage];
      return scores.map((n,i)=>({n,i})).filter(a=>Math.abs(a.n-largest)<1e-8)
        .sort((a,b)=>(purpose==="III"?dna[b.i]-dna[a.i]:0)||hash(w,"ryouki/branch",0,o.id,[purpose,a.i])-hash(w,"ryouki/branch",0,o.id,[purpose,b.i]))[0].i;
    }
    function finalize(w,ctx){
      if(!enabled(w))return;
      for(const o of w.organisms)if(is(o)&&ctx.traits.has(o.id)&&o.ryouki.finalizedAt!==w.turn){
        const a=o.ryouki,rec=ctx.records.get(o.id),before=ctx.old.get(o.id);a.finalizedAt=w.turn;
        a.window=a.window.filter(r=>r.turn>w.turn-32);a.recentCells=a.recentCells.filter(r=>r.turn>w.turn-16);
        const steps=rec.ryoukiSteps||[],known=new Set(a.recentCells.map(r=>r.cell));let fresh=0;
        for(const cell of steps){if(!known.has(cell)){fresh++;known.add(cell);}a.recentCells.push({turn:w.turn,cell});}
        a.recentCells=a.recentCells.slice(-64);
        const previous=a.window.filter(r=>r.steps>0).at(-1),dir=o.facing,previousVector=previous?DIRS[previous.direction]:null,vector=DIRS[dir];
        const aligned=previousVector&&(previousVector[0]*vector[0]+previousVector[1]*vector[1])/Math.hypot(...previousVector)/Math.hypot(...vector)>=Math.SQRT1_2-1e-8;
        const row={turn:w.turn,cell:o.cell,fromCell:before.cell,steps:steps.length,fresh,difficult:steps.filter(c=>difficult(w,c)).length,
          water:steps.filter(c=>["shallow","deep"].includes(w.tiles[c].terrain)).length,hot:steps.filter(c=>w.tiles[c].env===1).length,
          adapted:steps.filter(c=>["shallow","deep"].includes(w.tiles[c].terrain)||w.tiles[c].env===1).length,
          fed:rec.organic>0?1:0,direction:dir,straight:steps.length&&aligned?1:0,compared:steps.length&&previous?1:0};
        a.window.push(row);
        const healthy=rec.ryoukiMaintained===true&&o.HP>=.7*phenotype(w,o).maxHP;
        const gained=H.round(Math.min(2,(healthy?.5:0)+Math.max(0,rec.organic)/2+Math.min(.4,steps.length*.1)));
        o.G=H.round(Math.min(LIMIT,o.G+gained));a.last.experience=gained;a.last.steps=steps.length;
        a.last.goal=rec.ryoukiGoal??ctx.intents.get(o.id)?.ryoukiGoal??"探索";a.last.moveCost=rec.ryoukiMoveCost||0;a.last.moveBudgetLimited=!!rec.ryoukiMoveBudgetLimited;
        const old=o.phase,origin=a.window[0]?.fromCell??a.window[0]?.cell??before.cell,sum=k=>a.window.reduce((n,r)=>n+r[k],0);
        if(old===1&&o.G>=D.ryouki.experience.II)o.phase=2;
        else if(old===2&&o.G>=D.ryouki.experience.III&&o.M>=phenotype(w,o).M3){
          const hard=sum("difficult"),scores=[Math.min(1,sum("fresh")/16),Math.min(1,a.window.filter(r=>r.fed&&distance(w,origin,r.cell)<=2).length/8),hard>=3?Math.min(1,hard/8):-1];
          o.branch3=choose(w,o,scores,"III");o.phase=3;
        }else if(old===3&&o.G>=D.ryouki.experience.IV&&o.M>=phenotype(w,o).M4){
          if(o.branch3===0&&a.window.filter(r=>r.steps>0).length>=8){o.branch4=sum("straight")/Math.max(1,sum("compared"))>=.65?0:1;o.phase=4;}
          if(o.branch3===1&&sum("fed")>=8){o.branch4=a.window.filter(r=>r.fed).reduce((n,r)=>n+distance(w,origin,r.cell),0)/sum("fed")<=1.5?0:1;o.phase=4;}
          if(o.branch3===2&&a.window.reduce((n,r)=>n+(r.adapted??r.water+r.hot),0)>=8){o.branch4=choose(w,o,[sum("water"),sum("hot")],"IV/terrain");o.phase=4;}
        }
        if(o.phase!==old)record(ctx,o,"growth",{fromPhase:old,phase:o.phase});
      }
    }
    function summary(w){
      if(!enabled(w))return;
      const groups=new Map(),out={definition:"ryouki-observed/1",turn:w.turn,count:0,normal:0,mutated:0,mutatedEarly:0,mutatedIV:0,occupiedCells:0,cohabitingIndividuals:0,maxOccupancy:0};
      for(const o of w.organisms)if(is(o)){
        out.count++;if(o.ryouki.mutated){out.mutated++;out[o.phase===4?"mutatedIV":"mutatedEarly"]++;}else out.normal++;
        groups.set(o.cell,(groups.get(o.cell)||0)+1);
      }
      out.occupiedCells=groups.size;
      for(const size of groups.values()){out.maxOccupancy=Math.max(out.maxOccupancy,size);if(size>1)out.cohabitingIndividuals+=size;}
      w.ryoukiSummary=out;return out;
    }
    return {enabled,is,settings,attach,begin,phenotype,finalize,difficult,summary};
  })();
  const LargePlant = (() => {
    const VERSION="independent-plant-state/1", factors=[0,1,1.15,1.35,1.6], edible=[0,16,20,24,32], LIMIT=1e12;
    const enabled=w=>w.config.largePlantModel==="independent/1";
    const is=o=>o?.plant?.version===VERSION;
    const definition=s=>s?.kind==="independent";
    const region=(w,cell)=>["shallow","deep"].includes(w.tiles[cell].terrain)?"water":"land";
    function settings(input={}){
      const object=(o,keys)=>{if(!o||typeof o!=="object"||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))throw Error("SETTINGS_INVALID: 独立植物の比較値");};
      object(input,["version","autoDensity","initial"]);
      if(input.version!==undefined&&input.version!=="independent-plant-parameters/1")throw Error("SETTINGS_INVALID: 独立植物の定義版");
      const density=input.autoDensity??{},initial=input.initial??{};object(density,["land","water"]);object(initial,["phase","ageFraction","energyFraction"]);
      const out={version:"independent-plant-parameters/1",autoDensity:{land:.02,water:.02,...density},initial:{phase:1,ageFraction:0,energyFraction:.5,...initial}};
      for(const value of Object.values(out.autoDensity))if(typeof value!=="number"||!Number.isFinite(value)||value<0||value>1)throw Error("SETTINGS_INVALID: 独立植物の初期密度");
      for(const [key,maximum]of [["ageFraction",.99],["energyFraction",1]])if(typeof out.initial[key]!=="number"||!Number.isFinite(out.initial[key])||out.initial[key]<0||out.initial[key]>maximum)throw Error("SETTINGS_INVALID: 独立植物の初期在庫/齢");
      if(!Number.isInteger(out.initial.phase)||out.initial.phase<1||out.initial.phase>4)throw Error("SETTINGS_INVALID: 独立植物の初期相");
      return out;
    }
    function last(turn){return {turn,productionB:0,regrowthB:0,consumedB:0,solarInputE:0,maintenanceE:0,preparationE:0,experience:0};}
    function attach(w,o,options={}){
      if(!enabled(w)||!definition(spec(o))||is(o))return o;
      const initial=w.config.largePlantSettings.initial;
      if(!Object.hasOwn(options,"phase"))o.phase=initial.phase;
      if(!Object.hasOwn(options,"age"))o.age=Math.floor(spec(o).life*initial.ageFraction);
      o.birthLife=spec(o).life;
      o.plant={version:VERSION,origin:structuredClone(options.plantOrigin??{kind:"initial"}),establishedAt:w.turn,
        baseB:2,capacityB:edible[o.phase],activity:1,replacementDebtB:0,last:last(w.turn),
        cumulative:{productionB:0,regrowthB:0,consumedB:0,maintainedTurns:0,settlements:0,preparationE:0},
        window:[],settlementRecorded:false,finalizedAt:-1,maintainedRemainder:0};
      if(!Object.hasOwn(options,"B"))o.B=H.round(2+edible[o.phase]*.7);
      if(!Object.hasOwn(options,"E"))o.E=H.round(spec(o).capacity[0]*factors[o.phase]*initial.energyFraction);
      if(!Object.hasOwn(options,"M"))o.M=1;
      if(o.phase>=3&&o.branch3===null)o.branch3=choose(w,o,[o.dna.aptitude,o.dna.body,o.dna.skin],"initial/III");
      if(o.phase>=4&&o.branch4===null)o.branch4=choose(w,o,[o.dna.body,o.dna.skin],"initial/IV");
      return o;
    }
    function phenotype(w,o,phase=o.phase,branch=o.branch4){
      const s=spec(o),f=factors[phase],age=ageInfo(o),a=age.factors;
      const high=phase===4&&o.branch3===0&&branch===0,efficient=phase===4&&o.branch3===0&&branch===1;
      const maintenance=s.maintenance*f*(high?1.1:efficient?.8:1),cooldown=s.birthCooldown*(phase===4&&o.branch3===1?(branch===0?1.5:.75):1);
      return {phase,u:phase/4,capE:H.round(s.capacity[0]*f),capB:2+edible[phase],capM:4,maxHP:H.round(s.capacity[3]*a.hp),
        life:o.birthLife,maintenance:H.round(maintenance*a.maintenance),baseMaintenance:maintenance,baseMaxHP:s.capacity[3],
        cooldown:cooldown*a.birth,baseCooldown:cooldown,sense:1,speed:s.id==="freshwaterlight"?1:0,range:1,M3:0,M4:0,branch,
        ageEnabled:true,ageStage:age.stage,ageFactors:a,lightInput:s.lightInput*f*(high?1.2:1),surface:f,
        regenerationFactor:phase===4&&o.branch3===2&&branch===1?1.2:1,
        biteFactor:phase===4&&o.branch3===2&&branch===0?.8:1};
    }
    function increment(o,key,value){o.plant.cumulative[key]=H.round(Math.min(LIMIT,o.plant.cumulative[key]+value));}
    function row(w,o){
      const p=o.plant;let r=p.window.find(r=>r.turn===w.turn);
      if(!r){r={turn:w.turn,allocation:[0,0,0],sides:[[0,0],[0,0],[0,0]]};p.window.push(r);}
      p.window=p.window.filter(r=>r.turn>w.turn-32);return r;
    }
    function allocation(w,o,category,amount,side=null){if(amount<=0)return;const r=row(w,o);r.allocation[category]=H.round(r.allocation[category]+amount);if(side!==null)r.sides[category][side]=H.round(r.sides[category][side]+amount);}
    function flows(w){return w.largePlantFlows??={turn:w.turn,land:{productionB:0,regrowthB:0,consumedB:0,solarInputE:0},water:{productionB:0,regrowthB:0,consumedB:0,solarInputE:0}};}
    function flow(w,o,key,amount){if(flows(w).turn!==w.turn)w.largePlantFlows={turn:w.turn,land:{productionB:0,regrowthB:0,consumedB:0,solarInputE:0},water:{productionB:0,regrowthB:0,consumedB:0,solarInputE:0}};const r=flows(w)[region(w,o.cell)];r[key]=H.round(r[key]+amount);}
    function begin(w){if(!enabled(w))return;w.largePlantFlows={turn:w.turn,land:{productionB:0,regrowthB:0,consumedB:0,solarInputE:0},water:{productionB:0,regrowthB:0,consumedB:0,solarInputE:0}};for(const o of w.organisms)if(is(o)){o.plant.last=last(w.turn);o.plant.window=o.plant.window.filter(r=>r.turn>w.turn-32);}}
    function initialize(w){
      if(!enabled(w)||!w.config.enabled.plant)return;
      const species=D.independentPlants,occupied=new Set(),counts={land:0,water:0};
      function place(s,cell){const o=organism(w,s,cell,"i:producer:"+cell+":"+s.id);w.organisms.push(o);occupied.add(cell);counts[region(w,cell)]++;}
      const candidates=s=>w.tiles.map((_,i)=>i).filter(cell=>!occupied.has(cell)&&validHabitat(w,s,cell)).sort((a,b)=>initialRank(w,s,a)-initialRank(w,s,b)||a-b);
      for(const s of species){const count=w.config.founderCounts?.species[s.id];if(count===undefined)continue;const cells=candidates(s);if(count>cells.length)throw Error("PLACEMENT_SHORTAGE: "+s.name+" 指定"+count+"体の適地/空き枠が不足しています");for(const cell of cells.slice(0,count))place(s,cell);}
      w.largePlantRegions={};
      for(const name of ["land","water"]){
        const eligible=w.tiles.map((_,i)=>i).filter(cell=>region(w,cell)===name&&species.some(s=>validHabitat(w,s,cell)));
        const target=Math.round(eligible.length*w.config.largePlantSettings.autoDensity[name]);
        const sites=eligible.filter(cell=>!occupied.has(cell)).map(cell=>({cell,species:species.filter(s=>w.config.founderCounts?.species[s.id]===undefined&&validHabitat(w,s,cell))})).filter(a=>a.species.length)
          .sort((a,b)=>Math.min(...a.species.map(s=>initialRank(w,s,a.cell)))-Math.min(...b.species.map(s=>initialRank(w,s,b.cell)))||a.cell-b.cell);
        for(const site of sites){if(counts[name]>=target)break;site.species.sort((a,b)=>hash(w,"independent/initial-species",0,a.id,site.cell)-hash(w,"independent/initial-species",0,b.id,site.cell));place(site.species[0],site.cell);}
        w.largePlantRegions[name]={eligibleCells:eligible.length,target,initial:counts[name]};
      }
    }
    function prepareLight(w,ctx){
      if(!enabled(w))return;
      const groups=new Map();
      for(const o of w.organisms){
        const s=spec(o),p=ctx.traits.get(o.id);if(o.HP<=0||(s.group!=="plant"&&s.id!=="kelp"))continue;
        let input=is(o)?p.lightInput:s.group==="plant"?(s.id==="phytoplankton"?(w.config.advantageSettings?.producer?16:8):(w.config.advantageSettings?.producer?8:4))*leafFactor(o):1.5*[0,1,1.1,1.2,1.3][p.phase];
        input=H.round(input*w.tiles[o.cell].light*p.ageFactors.light*(w.config.solarScale||1)*ProducerSupport.factor(w,o,{spec}));
        if(!groups.has(o.cell))groups.set(o.cell,[]);
        groups.get(o.cell).push({o,p,input,room:Math.max(0,Math.min(input,p.capE-o.E)),area:is(o)?p.surface:1,add:0,h:hash(w,"independent/light-share",w.turn,o.id)});
      }
      for(const list of groups.values()){
        const budget=H.round(Math.max(...list.map(a=>a.input)));let remaining=budget,live=list.filter(a=>a.room>0).sort((a,b)=>a.h-b.h||H.compare(a.o.id,b.o.id));
        while(remaining>0&&live.length){const area=live.reduce((n,a)=>n+a.area,0),capped=live.filter(a=>a.room<=remaining*a.area/area);
          if(capped.length){for(const a of capped){const add=H.round(Math.min(remaining,a.room));a.add=H.round(a.add+add);remaining=H.round(remaining-add);a.room=0;}live=live.filter(a=>a.room>0);}
          else{const available=remaining;for(let i=0;i<live.length;i++){const a=live[i],add=H.round(Math.min(a.room,remaining,i===live.length-1?remaining:available*a.area/area));a.add=H.round(a.add+add);remaining=H.round(remaining-add);}break;}}
        w.ledger.solar=H.round(w.ledger.solar+budget);dissipate(w,remaining);
        for(const a of list){a.o.E=H.round(a.o.E+a.add);ctx.records.get(a.o.id).light=a.add;if(Colony.is(a.o))Colony.solar(w,a.o,a.add);if(is(a.o)){ctx.records.get(a.o.id).solarOpportunityE=H.round(Math.min(a.input,budget*a.area/list.reduce((n,p)=>n+p.area,0)));a.o.plant.last.solarInputE=a.add;flow(w,a.o,"solarInputE",a.add);}if(a.o.species==="phytoplankton")a.o.photoGrowth=H.round((a.o.photoGrowth||0)+a.add);if(a.add)record(ctx,a.o,"light",{amount:a.add});}
      }
    }
    function consumed(w,o,amount){const p=o.plant;p.last.consumedB=H.round(p.last.consumedB+amount);p.replacementDebtB=H.round(Math.min(edible[o.phase],p.replacementDebtB+amount));increment(o,"consumedB",amount);flow(w,o,"consumedB",amount);}
    function maintained(w,o,paid,required){const p=o.plant;p.last.maintenanceE=H.round(p.last.maintenanceE+paid);const healthy=paid>=H.round(required)&&o.HP>0;p.activity=H.round(H.clamp(p.activity+(healthy?.02:-.05),0,1));if(healthy){increment(o,"maintainedTurns",1);p.maintainedRemainder++;}allocation(w,o,0,paid);}
    function regrow(w,o,ctx){
      if(!is(o)||o.HP<=0||w.tiles[o.cell].light<=0||ProducerSupport.factor(w,o,{spec})<=0)return;
      const p=o.plant,phen=phenotype(w,o),tile=w.tiles[o.cell],multiplier=w.config.producerSupport?.enabled?w.config.producerSupport[region(w,o.cell)].regrowth:1;
      const maximum=p.capacityB*.1*phen.regenerationFactor*Math.min(1,multiplier)*p.activity*Math.min(1,tile.light);
      const amount=H.round(Math.max(0,Math.min(maximum-p.last.productionB,p.capacityB-edibleB(o),Math.max(0,o.E-2)/1.2,tile.soilM/.02,Math.max(0,phen.capM-o.M)/.02)));
      if(!amount)return;
      const expense=H.round(amount*1.2),material=H.round(amount*.02),replacement=H.round(Math.min(p.replacementDebtB,amount));
      o.E=H.round(o.E-expense);o.B=H.round(o.B+amount);tile.soilM=H.round(tile.soilM-material);o.M=H.round(o.M+material);dissipate(w,H.round(expense-amount));
      p.last.productionB=H.round(p.last.productionB+amount);p.last.regrowthB=H.round(p.last.regrowthB+replacement);p.replacementDebtB=H.round(p.replacementDebtB-replacement);
      increment(o,"productionB",amount);increment(o,"regrowthB",replacement);flow(w,o,"productionB",amount);flow(w,o,"regrowthB",replacement);
      allocation(w,o,0,H.round((amount-replacement)*1.2),0);allocation(w,o,2,H.round(replacement*1.2),1);
    }
    function choose(w,o,scores,purpose){const largest=Math.max(...scores),tied=scores.map((n,i)=>({n,i})).filter(a=>Math.abs(a.n-largest)<1e-6),dna=purpose.includes("III")?[o.dna.aptitude,o.dna.body,o.dna.skin]:[o.dna.body,o.dna.skin];tied.sort((a,b)=>(dna[b.i]??0)-(dna[a.i]??0)||hash(w,"independent/branch",0,o.id,[purpose,a.i])-hash(w,"independent/branch",0,o.id,[purpose,b.i]));return tied[0].i;}
    function prepare(w,o,ctx,indexed){
      if(o.phase<2||o.phase>=4)return;
      const phen=phenotype(w,o);if(o.E<.1+4*phen.maintenance)return;
      const local=nearby(w,o.cell).some(cell=>validHabitat(w,spec(o),cell)&&!indexed.producer?.has(cell));
      const category=o.phase===3?o.branch3:o.plant.replacementDebtB>0?2:ageInfo(o).stage!=="juvenile"&&local&&o.E>=10+4*phen.maintenance?1:0;
      const opportunity=ctx.records.get(o.id)?.solarOpportunityE??o.plant.last.solarInputE;
      const side=category===0?(opportunity>=2*phen.maintenance?0:1):category===1?(o.E>=14+4*phen.maintenance?0:1):(o.plant.replacementDebtB>0?1:0);
      o.E=H.round(o.E-.1);dissipate(w,.1);o.plant.last.preparationE=.1;increment(o,"preparationE",.1);allocation(w,o,category,.1,side);
    }
    function finalize(w,ctx){
      if(!enabled(w))return;
      const indexed=maps(w);
      for(const child of w.organisms)if(is(child)&&!child.plant.settlementRecorded&&child.parents.length&&child.age>=4){child.plant.settlementRecorded=true;const parent=indexed.byId.get(child.parents[0]);if(is(parent)){increment(parent,"settlements",1);parent.plant.last.settlementCredit=(parent.plant.last.settlementCredit||0)+1;}}
      for(const o of w.organisms)if(is(o)&&ctx.traits.has(o.id)&&o.plant.finalizedAt!==w.turn){
        const p=o.plant;p.finalizedAt=w.turn;
        const maintainedPoints=Math.floor(p.maintainedRemainder/2);p.maintainedRemainder%=2;
        const points=Math.min(1,maintainedPoints+(p.last.productionB-p.last.regrowthB)/4+p.last.regrowthB/4+(p.last.settlementCredit||0));o.G=H.round(Math.min(LIMIT,o.G+points));p.last.experience=points;
        prepare(w,o,ctx,indexed);
        const next=o.phase+1,threshold=[0,0,12,36,80][next],cost=[0,0,2,4,6][next];
        if(next<=4&&o.G>=threshold&&o.E>=cost){let branch=null;
          if(next===3){const scores=[0,0,0];for(const r of p.window)for(let i=0;i<3;i++)scores[i]+=r.allocation[i];branch=choose(w,o,scores,"III");o.branch3=branch;}
          if(next===4){const scores=[0,0];for(const r of p.window)for(let i=0;i<2;i++)scores[i]+=r.sides[o.branch3][i];branch=choose(w,o,scores,"IV/"+o.branch3);o.branch4=branch;}
          o.E=H.round(o.E-cost);dissipate(w,cost);const previous=o.phase;o.phase=next;p.capacityB=edible[next];record(ctx,o,"growth",{fromPhase:previous,phase:next});
        }
      }
    }
    function summary(w){
      if(!enabled(w))return;const out={definition:"independent-plant-observed/1",turn:w.turn};
      for(const name of ["land","water"])out[name]={count:0,B:0,baseB:0,edibleB:0,capacityB:0,occupiedCells:0,eligibleCells:w.largePlantRegions?.[name]?.eligibleCells??w.tiles.filter((_,i)=>region(w,i)===name&&D.independentPlants.some(s=>validHabitat(w,s,i))).length,productionB:0,regrowthB:0,consumedB:0,solarInputE:0,reserveE:0,reserveM:0,activitySum:0};
      for(const o of w.organisms)if(is(o)){const r=out[region(w,o.cell)];r.count++;r.occupiedCells++;r.B+=o.B;r.baseB+=2;r.edibleB+=edibleB(o);r.capacityB+=o.plant.capacityB;r.reserveE+=o.E;r.reserveM+=o.M;r.activitySum+=o.plant.activity;}
      if(w.largePlantFlows?.turn===w.turn)for(const name of ["land","water"])for(const key of ["productionB","regrowthB","consumedB","solarInputE"])out[name][key]=w.largePlantFlows[name][key];
      for(const name of ["land","water"])for(const key of Object.keys(out[name]))out[name][key]=H.round(out[name][key]);w.largePlantSummary=out;
    }
    return {enabled,is,definition,region,settings,attach,phenotype,increment,allocation,begin,initialize,prepareLight,consumed,maintained,regrow,finalize,summary};
  })();
  // A cohort is one simulated parasite holder, with a bounded number of
  // members. Older recorded worlds keep the single-holder rules.
  const ParasiteCohort = {
    enabled:w=>w?.config?.parasiteCohortModel==="cohort/1",
    members:o=>o?.primary?.cohort?.members??o?.hyper?.cohort?.members??1,
    burden:o=>1+.15*(ParasiteCohort.members(o)-1),
    passage:o=>o?.primary?.cohort?.passages??0,
    chance:o=>Math.pow(.8,ParasiteCohort.passage(o)+1),
  };
  const PrimaryParasite = (() => {
    const VERSION="primary-state/1",ROUTES=["contact","feeding","carcass","water"],STAGES=["first","middle","terminal"];
    const hostTable={
      leafparasite:{first:["grass","moss","forestcrown","starcrown"],middle:["grassbug"],terminal:["recursive","sail","parallel","solar","valis","whale","precocial","ryouki"]},
      tideparasite:{first:["algae","freshwaterlight"],middle:["waterbug"],terminal:["abyss","abyssshell","jelly","whale","cephalopod"]},
    };
    const enabled=w=>w?.config?.primaryParasiteModel==="primary/1";
    const is=p=>!!hostTable[p?.species]&&p?.primary?.version===VERSION;
    function parameters(input={}){
      const defaults={version:input?.version==="primary-parameters/2"?"primary-parameters/2":"primary-parameters/1",...(input?.version==="primary-parameters/2"?{automaticCounts:{}}:{}),life:120,capE:2,maintenance:[0,.03,.04,.06],hostTax:[0,.06,.08,.10],biomass:[0,.02,.03,.04],
        developmentCost:.01,development:{first:4,middle:6,terminal:8},phaseThresholds:[0,0,8,20],starvationTurns:8,carrierTurns:12,
        entryRates:{contact:.60,feeding:.80,carcass:.60,water:.40},establishmentRate:.70,standardReserve:.06,minimumReserve:.03,
        emissionCost:.12,emissionReserve:.06,emissionCooldown:6,inoculumLifetime:{contact:4,water:4,edible:4,carcass:12},
        mutationRate:.10,mutationStep:.05,resistanceGain:.4,resistanceCap:.8,resistanceHalfLife:40,resistanceMaintenance:.005,
        exclusionCost:.04,exclusionRate:.006,metaCaps:[0,.10,.20,.30],metaCosts:[0,.005,.010,.020],
        initialFraction:.20,initialDistribution:[.4,.4,.2],initialEnergy:.20};
      const object=(value,keys)=>{if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw Error("SETTINGS_INVALID: 一次寄生の比較値");};
      object(input,Object.keys(defaults));const out=structuredClone(defaults);
      for(const [key,value]of Object.entries(input)){
        if(key==="automaticCounts"){object(value,Object.keys(hostTable));if(Object.values(value).some(n=>!Number.isSafeInteger(n)||n<0||n>10000))throw Error("SETTINGS_INVALID: 一次寄生の自動初期数");out[key]=structuredClone(value);}
        else if(["development","entryRates","inoculumLifetime"].includes(key)){object(value,Object.keys(defaults[key]));Object.assign(out[key],value);}
        else out[key]=structuredClone(value);
      }
      if(out.version!==defaults.version)throw Error("SETTINGS_INVALID: 一次寄生の定義版");
      const number=(n,low,high)=>typeof n==="number"&&Number.isFinite(n)&&n>=low&&n<=high;
      for(const [key,value]of Object.entries(out)){
        if(key==="version")continue;
        if(Array.isArray(value)){
          if(value.length!==defaults[key].length||value.some(n=>!number(n,0,10000)))throw Error("SETTINGS_INVALID: 一次寄生 "+key);
        }else if(value&&typeof value==="object"){
          if(Object.values(value).some(n=>!number(n,0,10000)))throw Error("SETTINGS_INVALID: 一次寄生 "+key);
        }else if(!number(value,0,10000))throw Error("SETTINGS_INVALID: 一次寄生 "+key);
      }
      for(const key of ["life","starvationTurns","carrierTurns","emissionCooldown"])if(!Number.isSafeInteger(out[key])||out[key]<1)throw Error("SETTINGS_INVALID: 一次寄生のT");
      if(Object.values(out.inoculumLifetime).some(n=>!Number.isSafeInteger(n)||n<1)||Object.values(out.development).some(n=>n<=0)||out.phaseThresholds.some(n=>!Number.isSafeInteger(n)))throw Error("SETTINGS_INVALID: 一次寄生の発育/期限");
      for(const key of ["establishmentRate","mutationRate","mutationStep","resistanceGain","resistanceCap","exclusionRate","initialFraction"])if(out[key]>1)throw Error("SETTINGS_INVALID: 一次寄生の率");
      if(Object.values(out.entryRates).some(n=>n>1)||out.standardReserve<=0||out.minimumReserve<out.biomass[1]||out.minimumReserve>out.standardReserve||
        out.emissionReserve>out.emissionCost*.75||out.emissionReserve!==out.standardReserve||out.capE<out.initialEnergy||out.resistanceHalfLife<=0||out.resistanceCap>.8||
        out.maintenance.slice(1).some(n=>n<=0)||out.metaCosts.slice(1).some(n=>n<=0)||
        [out.developmentCost,out.resistanceMaintenance,out.exclusionCost,out.emissionCost].some(n=>n<=0)||
        out.initialDistribution.length!==3||Math.abs(out.initialDistribution.reduce((a,b)=>a+b,0)-1)>1e-8||
        out.biomass[0]!==0||out.biomass.slice(1).some((n,i)=>n<=0||(i>0&&n<out.biomass[i]))||
        out.phaseThresholds[0]!==0||out.phaseThresholds[1]!==0||out.phaseThresholds[2]<1||out.phaseThresholds[3]<=out.phaseThresholds[2])throw Error("SETTINGS_INVALID: 一次寄生の収支/配分");
      return out;
    }
    const settings=w=>w.config.primaryParasiteSettings;
    const eggsEnabled=w=>enabled(w)&&w.config.primaryEggModel==='egg/1';
    function eggParameters(input={}){
      const out={version:'primary-egg-parameters/1',landLifetime:20,waterLifetime:30,hatchTurns:2,waterMoveChance:.25,...(input?.version==='primary-egg-parameters/2'?{waterStepRange:2}:{}),...input};
      if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(out,k))||
        Object.keys(out).some(k=>!['version','landLifetime','waterLifetime','hatchTurns','waterMoveChance',...(out.version==='primary-egg-parameters/2'?['waterStepRange']:[])].includes(k))||!['primary-egg-parameters/1','primary-egg-parameters/2'].includes(out.version)||
        (out.version==='primary-egg-parameters/2'&&(!Number.isSafeInteger(out.waterStepRange)||out.waterStepRange<1||out.waterStepRange>2))||
        ['landLifetime','waterLifetime','hatchTurns'].some(k=>!Number.isSafeInteger(out[k])||out[k]<1||out[k]>10000)||
        out.hatchTurns>=Math.min(out.landLifetime,out.waterLifetime)||!Number.isFinite(out.waterMoveChance)||out.waterMoveChance<0||out.waterMoveChance>1)throw Error('SETTINGS_INVALID: 一次寄生卵の設定');
      return out;
    }
    function hostRule(species,host,route=null,sourceStage=null){
      const table=hostTable[species],id=typeof host==="string"?host:host?.species;
      const role=table&&STAGES.find(stage=>table[stage].includes(id));
      if(!role)return {allowed:false,stage:null,develops:false,reason:"非宿主"};
      if(route){
        const allowed=role==="first"?["contact",...(species==="tideparasite"?["water"]:[])].includes(route):
          ["feeding","carcass"].includes(route)&&(sourceStage===null||(role==="middle"?sourceStage==="first":["middle","extra"].includes(sourceStage)));
        if(!allowed)return {allowed:false,stage:null,develops:false,reason:"経路・前宿主段階不適合"};
      }
      const carrier=role==="terminal"&&typeof host!=="string"&&ageInfo(host).stage==="juvenile";
      return {allowed:true,stage:carrier?"extra":role,develops:!carrier,reason:carrier?"未成熟終宿主の運搬":"適合",role};
    }
    function defaultAdaptation(species){return {hosts:Object.fromEntries(STAGES.flatMap(stage=>hostTable[species][stage]).map(id=>[id,.5])),routes:Object.fromEntries(ROUTES.map(id=>[id,.5])),stages:Object.fromEntries(STAGES.map(id=>[id,.5]))};}
    function hostPreference(w,species,origin,parent=null){
      const inherited=parent?.primary?.hostPreference??parent?.hostPreference;
      return inherited?structuredClone(inherited):Object.fromEntries(STAGES.flatMap(stage=>hostTable[species][stage])
        .map(id=>[id,H.round(.25+.5*r(w,"primary/host-preference",0,species,[origin,id]))]));
    }
    const genes=p=>p?.primary?.adaptation??p?.adaptation;
    function adaptation(p,hostSpecies,route,stage){const a=genes(p),key=stage==="extra"?"terminal":stage;return ((a?.hosts[hostSpecies]??.5)+(a?.routes[route]??.5)+(a?.stages[key]??.5))/3;}
    function childAdaptation(w,parent,origin){
      const a=structuredClone(genes(parent)??defaultAdaptation(parent.species)),p=settings(w),mutation={occurred:false,changes:[]};
      if(r(w,"primary/mutation",w.turn,origin)<p.mutationRate){
        const keys=Object.keys(a).flatMap(group=>Object.keys(a[group]).map(key=>[group,key])),first=keys[Math.floor(r(w,"primary/mutation-key",w.turn,origin)*keys.length)],direction=r(w,"primary/mutation-sign",w.turn,origin)<.5?-1:1;
        const candidates=keys.filter(key=>key!==first&&(direction>0?a[key[0]][key[1]]>0:a[key[0]][key[1]]<1))
          .sort((x,y)=>hash(w,"primary/mutation-tradeoff",w.turn,origin,x)-hash(w,"primary/mutation-tradeoff",w.turn,origin,y));
        const second=candidates[0];
        if(second){const value=a[first[0]][first[1]],other=a[second[0]][second[1]],amount=Math.min(p.mutationStep,direction>0?1-value:value,direction>0?other:1-other);
          if(amount>0){a[first[0]][first[1]]=H.round(value+direction*amount);a[second[0]][second[1]]=H.round(other-direction*amount);mutation.occurred=true;mutation.changes=[{key:first.join("/"),delta:direction*amount},{key:second.join("/"),delta:-direction*amount}];}}
      }
      return {adaptation:a,mutation};
    }
    function form(w,a,origin){
      // primary-form/1: A/B/C compare route/host/stage birth-DNA means only.
      const mean=group=>Object.values(group).reduce((n,v)=>n+v,0)/Object.keys(group).length,
        scores=[mean(a.routes),mean(a.hosts),mean(a.stages)],largest=Math.max(...scores);
      return scores.map((value,index)=>({value,index})).filter(a=>Math.abs(a.value-largest)<1e-8)
        .sort((a,b)=>hash(w,"primary/birth-form",0,origin,a.index)-hash(w,"primary/birth-form",0,origin,b.index))[0].index;
    }
    function infection(w,species,hostId,turn=w.turn,origin=hostId,parent=null){
      if(!enabled(w)||!hostTable[species])throw Error("SETTINGS_INVALID: 一次寄生モデル/系統");
      const inherited=parent?childAdaptation(w,parent,origin):{adaptation:defaultAdaptation(species),mutation:{occurred:false,changes:[]}},p=settings(w);
      const o={id:"p:"+origin+":"+turn,species,hostId,location:species==="leafparasite"?"external":"internal",load:ParasiteCohort.enabled(w)?.75:.5,
        stage:"first",counter:0,phase:1,age:0,bornAt:turn,birthLife:p.life,B:p.biomass[1],E:0,ready:0,q:null,
        primary:{version:VERSION,form:["A","B","C"][form(w,inherited.adaptation,origin)],formVersion:"primary-form/1",carrier:false,successT:0,pauseUntil:turn,carrierUntil:null,starvationRun:0,settledAt:turn,
          adaptation:inherited.adaptation,hostPreference:hostPreference(w,species,origin,parent),parents:parent?[parent.parentId??parent.id]:[],generation:parent?(parent.primary?.generation??parent.generation??0)+1:0,
          mutation:inherited.mutation,origin:parent?"descendant":"initial",...(ParasiteCohort.enabled(w)?{cohort:{version:"parasite-cohort/1",members:parent?.transfer?1:parent?2:3,passages:parent?.transfer?parent.passages??0:0}}:{}),last:{turn,maintenanceE:0,developmentE:0,progress:0,metaE:0,metaRatio:0}}};
      return PersistentInformation.attach(w,o);
    }
    function inoculum(w,parent,options={}){
      const p=settings(w),createdAt=options.createdAt??w.turn,kind=options.kind??"contact",E=H.round(options.E??p.standardReserve);
      return {id:options.id??"inoculum:"+parent.id+":"+w.turn+":"+kind+":"+options.cell,species:parent.species,kind,cell:options.cell,
        sourceId:parent.id,parentId:parent.id,generation:parent.primary?.generation??0,adaptation:structuredClone(genes(parent)??defaultAdaptation(parent.species)),hostPreference:hostPreference(w,parent.species,parent.id,parent),
        ...(ParasiteCohort.enabled(w)?{form:parent.primary?.form,parents:structuredClone(parent.primary?.parents??[])}:{}),
        createdAt,expires:options.expires??createdAt+(p.inoculumLifetime[kind]??4),route:options.route??(kind==="water"?"water":"contact"),stage:parent.stage,
        ...options,E,amount:H.round(E/p.standardReserve),...(ParasiteCohort.enabled(w)?{passages:options.passages??(parent.primary?.cohort?.passages??0),transfer:options.transfer??false}:{} )};
    }
    function takeInoculum(w,i,requested){const E=H.round(Math.max(0,Math.min(i.E,requested)));i.E=H.round(i.E-E);i.amount=H.round(i.E/settings(w).standardReserve);return E;}
    function acquireResistance(w,host,species,route){
      if(!enabled(w)||!hostTable[species]||!ROUTES.includes(route))return;
      const p=settings(w),state=host.primaryResistance??={version:"primary-resistance/1",entries:[],paidAt:-1,lastPaidE:0};
      let entry=state.entries.find(a=>a.species===species&&a.route===route);
      if(!entry){entry={species,route,value:0,effective:0,updatedAt:w.turn};state.entries.push(entry);}
      entry.value=H.round(Math.min(p.resistanceCap,entry.value*Math.pow(.5,Math.max(0,w.turn-entry.updatedAt)/p.resistanceHalfLife)+p.resistanceGain));entry.updatedAt=w.turn;
      return entry;
    }
    function beginResistance(w,host){
      const a=host.primaryResistance;if(!enabled(w)||!a||a.paidAt===w.turn)return {paid:0,required:0};
      const p=settings(w);a.paidAt=w.turn;a.lastPaidE=0;let required=0;
      for(const entry of a.entries){
        entry.value=H.round(entry.value*Math.pow(.5,Math.max(0,w.turn-entry.updatedAt)/p.resistanceHalfLife));entry.updatedAt=w.turn;
        const expense=H.round(p.resistanceMaintenance*entry.value),paid=H.round(Math.min(host.E,expense));
        host.E=H.round(host.E-paid);dissipate(w,paid);entry.effective=expense>0?H.round(entry.value*paid/expense):entry.value;
        a.lastPaidE=H.round(a.lastPaidE+paid);required=H.round(required+expense);
      }
      a.entries=a.entries.filter(entry=>entry.value>0);return {paid:a.lastPaidE,required};
    }
    function resistance(w,host,species,route){
      const a=host.primaryResistance;if(!a||a.paidAt!==w.turn)return 0;
      const near={contact:"water",water:"contact",feeding:"carcass",carcass:"feeding"};
      return H.round(Math.max(0,...a.entries.filter(e=>e.species===species).map(e=>e.route===route?e.effective:e.route===near[route]?e.effective*.5:0)));
    }
    function entries(w){
      if(!enabled(w))return [];
      const out=[],seen=new Set(),add=(carrier,kind)=>{
        const p=carrier.infection;if(!is(p)||seen.has(p.id))return;
        if(kind!=="host"&&(carrier.payloadExpires??p.primary.bodyExpires??carrier.expires??0)<=w.turn)return;
        seen.add(p.id);out.push({p,host:kind==="host"?carrier:null,carrier,kind,cell:carrier.cell});
      };
      for(const host of w.organisms)add(host,"host");for(const carcass of w.carcasses)add(carcass,"carcass");for(const pending of w.pending)add(pending,"pending");return out;
    }
    function locate(w,id){return entries(w).find(e=>e.p.id===id||e.host?.id===id||e.p.q?.id===id)??null;}
    function parasiteAge(p){return {enabled:is(p),applicable:is(p),age:p.age,birthLife:p.birthLife,life:p.birthLife,matureAt:null,elderlyAt:Math.floor(p.birthLife*.75),stage:p.age>=p.birthLife*.75?"elderly":"nonapplicable"};}
    function initial(w){
      if(!enabled(w))return;
      w.primaryInocula=[];
      const p=settings(w),report={version:"primary-initial/1",definition:"primary/1",bySpecies:{},planned:0,actual:0,shortage:0};
      const available=new Set();
      for(const species of Object.keys(hostTable)){
        const direct=w.config.founderCounts?.parasites?.[species],first=w.organisms.filter(o=>hostTable[species].first.includes(o.species));
        const requested=w.config.enabled.P?(direct??(first.length&&p.automaticCounts?.[species]!==undefined?p.automaticCounts[species]:Math.floor(first.length*p.initialFraction))):0;
        const raw=(direct===undefined?p.initialDistribution:[1,0,0]).map(n=>n*requested),counts=raw.map(Math.floor);
        for(const i of raw.map((n,i)=>({n:n-counts[i],i})).sort((a,b)=>b.n-a.n||a.i-b.i).slice(0,requested-counts.reduce((a,b)=>a+b,0)))counts[i.i]++;
        const item=report.bySpecies[species]={requested:direct??null,firstHosts:first.length,planned:requested,actual:0,shortage:0,stages:{},reasons:[]};
        for(const [index,role]of STAGES.entries()){
          const hosts=w.organisms.filter(o=>!o.infection&&!available.has(o.id)&&hostTable[species][role].includes(o.species)&&(role!=="terminal"||hostRule(species,o).stage==="terminal"||(ParasiteCohort.enabled(w)&&hostRule(species,o).stage==="extra")))
            .sort((a,b)=>(ParasiteCohort.enabled(w)&&role==="terminal"?(hostRule(species,a).stage==="extra")-(hostRule(species,b).stage==="extra"):0)||
              hash(w,"primary/initial-host",0,species,[role,a.id])-hash(w,"primary/initial-host",0,species,[role,b.id])||H.compare(a.id,b.id));
          const count=Math.min(counts[index],hosts.length),stageReport=item.stages[role]={planned:counts[index],actual:count,shortage:counts[index]-count};
          for(const host of hosts.slice(0,count)){
            const id="initial:"+species+":"+host.id,created=infection(w,species,host.id,0,id);
            Object.assign(created,{E:p.initialEnergy,stage:hostRule(species,host).stage,counter:0});
            created.primary.origin="initial";created.primary.carrier=created.stage==="extra";
            if(created.stage==="extra")created.primary.carrierUntil=p.carrierTurns;
            else {created.counter=Math.floor(r(w,"primary/initial-progress",0,id)*(p.development[role]+1));
              if(role==="terminal"&&created.counter>=p.development.terminal)created.matureAt=-Math.floor(r(w,"primary/initial-mature",0,id)*4);}
            const age=Math.min(p.life-1,Math.max(created.counter+Math.max(0,-(created.matureAt??0)),Math.floor(r(w,"primary/initial-age",0,id)*32))),successT=Math.min(p.phaseThresholds[3],age),phase=successT>=p.phaseThresholds[3]?3:successT>=p.phaseThresholds[2]?2:1;
            created.counter=Math.min(created.counter,age);if(created.counter<p.development.terminal&&created.matureAt!==undefined)delete created.matureAt;
            Object.assign(created,{age,bornAt:-age,phase,B:p.biomass[phase]});created.primary.successT=successT;created.primary.initialSuccessT=successT;
            host.infection=created;available.add(host.id);item.actual++;
          }
          if(stageReport.shortage)item.reasons.push(role+":"+(role==="terminal"?"成熟済み適合終宿主枠不足 ":"適合宿主枠不足 ")+stageReport.shortage);
        }
        item.shortage=item.planned-item.actual;report.planned+=item.planned;report.actual+=item.actual;report.shortage+=item.shortage;
        if(direct!==undefined&&item.shortage)throw Error("PLACEMENT_SHORTAGE: "+D.byId[species].name+" 指定"+direct+" / 配置可能"+item.actual+"（"+item.reasons.join("、")+"）");
      }
      w.config.primaryParasiteInitial=report;
      if(report.shortage)w.warnings.push("一次寄生:予定"+report.planned+" / 実配置"+report.actual+"。適合宿主枠不足"+report.shortage);
      summary(w);return report;
    }
    function summary(w){
      if(!enabled(w))return;
      const out={definition:"primary-parasite-observed/1",turn:w.turn,count:0,hosted:0,external:0,migrating:0,bySpecies:{leafparasite:0,tideparasite:0},phases:[0,0,0],stages:{first:0,middle:0,extra:0,terminal:0},mature:0,biomassB:0,reserveE:0,
        inocula:{records:0,amount:0,reserveE:0,byKind:{contact:0,water:0,edible:0,carcass:0}},exposed:{records:0,amount:0,reserveE:0},invading:{records:0,amount:0,reserveE:0},resistance:{hosts:0,entries:0,stored:0,effective:0,paidE:0}};
      if(ParasiteCohort.enabled(w))out.members=0;
      for(const e of entries(w)){const p=e.p;out.count++;if(ParasiteCohort.enabled(w))out.members+=ParasiteCohort.members(p);out[e.kind==="host"?"hosted":"external"]++;if(e.carrier.kind==="primary-migration")out.migrating++;out.bySpecies[p.species]++;out.phases[p.phase-1]++;out.stages[p.stage]++;if(p.matureAt!==undefined)out.mature++;out.biomassB+=p.B;out.reserveE+=p.E;}
      if(eggsEnabled(w))out.eggs={definition:'primary-egg-observed/1',records:0,free:0,attached:0,amount:0,reserveE:0};
      for(const i of w.primaryInocula||[]){
        if(out.eggs&&i.egg&&i.kind!=='invading'){out.eggs.records++;out.eggs[i.egg.state]++;out.eggs.amount+=i.amount;out.eggs.reserveE+=i.E;}
        const target=i.kind==="invading"?(i.status==="exposed"?out.exposed:out.invading):out.inocula;target.records++;target.amount+=i.amount;target.reserveE+=i.E;if(target.byKind)target.byKind[i.kind]+=i.amount;}
      for(const host of w.organisms)if(host.primaryResistance?.entries.length){const a=host.primaryResistance;out.resistance.hosts++;out.resistance.entries+=a.entries.length;for(const e of a.entries){out.resistance.stored+=e.value;out.resistance.effective+=a.paidAt===w.turn?e.effective:0;}if(a.paidAt===w.turn)out.resistance.paidE+=a.lastPaidE;}
      const round=value=>{for(const key of Object.keys(value))if(typeof value[key]==="number")value[key]=H.round(value[key]);else if(value[key]&&typeof value[key]==="object")round(value[key]);};round(out);w.primaryParasiteSummary=out;return out;
    }
    function validate(w){
      if(!enabled(w))return [];
      const errors=[],ids=new Set();
      const correctKeys=(object,reference)=>object&&typeof object==="object"&&!Array.isArray(object)&&Object.keys(object).sort().join("|")===Object.keys(reference).sort().join("|");
      for(const carrier of [...w.organisms,...w.carcasses,...w.pending])if(is(carrier.infection)){
        if(ids.has(carrier.infection.id))errors.push("PRIMARY_ID:"+carrier.infection.id);ids.add(carrier.infection.id);
      }
      for(const {p,host}of entries(w)){
        const a=p.primary,expected=defaultAdaptation(p.species),values=a.adaptation&&typeof a.adaptation==="object"?Object.values(a.adaptation).flatMap(v=>v&&typeof v==="object"?Object.values(v):[NaN]):[NaN];
        const correctGenes=correctKeys(a.adaptation,expected)&&Object.keys(expected).every(key=>correctKeys(a.adaptation[key],expected[key]));
        if(![p.E,p.B,p.age,p.counter,a.successT,a.starvationRun].every(n=>Number.isFinite(n)&&n>=0)||p.E>settings(w).capE+1e-6||
          (ParasiteCohort.enabled(w)&&(!Number.isSafeInteger(a.cohort?.members)||a.cohort.members<1||a.cohort.members>3||!Number.isSafeInteger(a.cohort.passages)||a.cohort.passages<0))||
          !Number.isInteger(p.phase)||p.phase<1||p.phase>3||!Object.keys(hostTable).includes(p.species)||
          !["first","middle","extra","terminal"].includes(p.stage)||!["A","B","C"].includes(a.form)||a.formVersion!=="primary-form/1"||!correctGenes||values.some(n=>!Number.isFinite(n)||n<0||n>1)||
          !correctKeys(a.hostPreference,expected.hosts)||Object.values(a.hostPreference??{}).some(n=>!Number.isFinite(n)||n<0||n>1)||
          !Number.isFinite(p.bornAt)||!Number.isFinite(p.birthLife)||p.birthLife<=0||
          (host&&p.hostId!==host.id)||(p.q&&p.q.hostId!==p.id))errors.push("PRIMARY_STATE:"+p.id);
      }
      for(const i of w.primaryInocula||[])if(!Number.isFinite(i.E)||i.E<0||!Number.isFinite(i.amount)||i.amount<0||Math.abs(i.amount-i.E/settings(w).standardReserve)>1e-5||
        !["contact","water","edible","carcass","invading"].includes(i.kind)||!Number.isSafeInteger(i.expires)||!hostTable[i.species]||
        (ParasiteCohort.enabled(w)&&(!Number.isSafeInteger(i.passages)||i.passages<0||typeof i.transfer!=="boolean"))||
        !correctKeys(i.hostPreference,hostTable[i.species]?defaultAdaptation(i.species).hosts:{})||Object.values(i.hostPreference??{}).some(n=>!Number.isFinite(n)||n<0||n>1))errors.push("PRIMARY_INOCULUM:"+i.id);
      for(const i of w.primaryInocula||[])if(eggsEnabled(w)&&i.stage==='terminal'&&['contact','water'].includes(i.kind)&&!i.egg)errors.push('PRIMARY_EGG_MISSING:'+i.id);
      for(const i of w.primaryInocula||[])if(i.egg&&(!eggsEnabled(w)||i.egg.version!=='primary-egg/1'||!['free','attached'].includes(i.egg.state)||
        !['contact','water'].includes(i.kind)||i.transfer||i.stage!=='terminal'||!Number.isSafeInteger(i.createdAt)||i.expires-i.createdAt!==(i.species==='tideparasite'?w.config.primaryEggSettings.waterLifetime:w.config.primaryEggSettings.landLifetime)||
        (i.egg.state==='free'?(i.hostId!==null||i.egg.attachedAt!==null||i.egg.hatchAt!==null):
          (typeof i.hostId!=='string'||!Number.isSafeInteger(i.egg.attachedAt)||i.egg.attachedAt<=i.createdAt||i.egg.hatchAt!==i.egg.attachedAt+w.config.primaryEggSettings.hatchTurns))))errors.push('PRIMARY_EGG:'+i.id);
      return errors;
    }
    return {enabled,is,parameters,settings,eggsEnabled,eggParameters,hostTable,hostRule,adaptation,childAdaptation,infection,inoculum,takeInoculum,resistance,acquireResistance,beginResistance,entries,locate,ageInfo:parasiteAge,initial,summary,validate};
  })();
  const HyperParasite = (() => {
    const VERSION="hyper-state/1",P_SPECIES=["leafparasite","tideparasite"];
    const enabled=w=>w?.config?.hyperParasiteModel==="hyper/1";
    const is=q=>q?.species==="hyperparasite"&&q?.hyper?.version===VERSION;
    function parameters(input={}){
      const defaults={version:"hyper-parameters/1",maintenance:[0,.005,.010,.015,.020],hostTax:[0,.020,.030,.040,0],
        developmentCost:[0,.005,.010,.015,0],biomass:[0,.01,.015,.02,.03],phaseThresholds:[0,0,4,12],maturity:12,life:80,development:12,
        starvationTurns:8,entryRate:.6,entryDefense:.2,establishmentRate:.7,exclusionCost:.01,exclusionRate:.006,
        emergenceMultiplier:6,emergenceRate:.6,prepareTurns:4,eggCost:.10,eggReserve:.09,eggCooldown:12,eggLifetime:4,
        adultMoveCost:.002,adultFoodCap:.10,adultAssimilation:.5,capE:1,metaCosts:[0,.001,.002,.004,0],metaCaps:[0,.03,.05,.08,0],
        informationCosts:[0,.002,.004,.008,0],promotionCaps:[0,.02,.05,.10,0],distortionCaps:[0,.05,.10,.20,0],
        mutationRate:.10,mutationStep:.05,resistanceGain:.4,resistanceCap:.8,resistanceHalfLife:40,resistanceMaintenance:.005,
        initialFraction:.2,initialAttachedFraction:.75,initialEnergy:.08};
      if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw Error("SETTINGS_INVALID: 高次寄生の比較値");
      const out={...structuredClone(defaults),...structuredClone(input)};
      if(out.version!==defaults.version)throw Error("SETTINGS_INVALID: 高次寄生の定義版");
      for(const [key,value]of Object.entries(out)){
        if(key==="version")continue;
        const valid=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=10000;
        if(Array.isArray(defaults[key])){if(!Array.isArray(value)||value.length!==defaults[key].length||value.some(n=>!valid(n)))throw Error("SETTINGS_INVALID: 高次寄生 "+key);}
        else if(!valid(value))throw Error("SETTINGS_INVALID: 高次寄生 "+key);
      }
      for(const key of ["maturity","life","starvationTurns","prepareTurns","eggCooldown","eggLifetime"])if(!Number.isSafeInteger(out[key])||out[key]<1)throw Error("SETTINGS_INVALID: 高次寄生のT");
      for(const key of ["entryRate","entryDefense","establishmentRate","exclusionRate","emergenceRate","adultAssimilation","mutationRate","mutationStep","resistanceGain","resistanceCap","initialFraction","initialAttachedFraction"])if(out[key]>1)throw Error("SETTINGS_INVALID: 高次寄生の率");
      if(out.life<=out.maturity||out.capE<out.initialEnergy||out.resistanceCap>.8||out.resistanceHalfLife<=0||out.development<=0||
        out.eggCost<out.eggReserve||out.eggReserve<out.biomass[1]||out.eggReserve-out.biomass[1]>out.capE||
        out.maintenance.slice(1).some(n=>n<=0)||out.developmentCost.slice(1,4).some(n=>n<=0)||out.metaCosts.slice(1,4).some(n=>n<=0)||out.informationCosts.slice(1,4).some(n=>n<=0)||
        [out.exclusionCost,out.emergenceMultiplier,out.eggCost,out.adultMoveCost,out.resistanceMaintenance].some(n=>n<=0)||
        out.biomass[0]!==0||out.biomass.slice(1).some((n,i)=>n<=0||(i>0&&n<out.biomass[i]))||
        out.phaseThresholds[0]!==0||out.phaseThresholds[1]!==0||out.phaseThresholds[2]<=0||out.phaseThresholds[3]<=out.phaseThresholds[2]||
        out.metaCaps.some(n=>n>1)||out.promotionCaps.some(n=>n>1)||out.distortionCaps.some(n=>n>1))throw Error("SETTINGS_INVALID: 高次寄生の収支/成長");
      return out;
    }
    const settings=w=>w.config.hyperParasiteSettings;
    const defaultGenes=()=>({hosts:{leafparasite:.5,tideparasite:.5},routes:{contact:.5},stages:{terminal:.5},investment:{promotion:.5,distortion:.5}});
    const directionVector=bias=>Array.isArray(bias?.vector9)?bias.vector9.slice():Array.from({length:9},(_,axis)=>axis===bias?.axis?bias.sign:0);
    function initialTraits(w,origin){const traits={genes:defaultGenes(),preference:Object.fromEntries(P_SPECIES.map(id=>[id,H.round(.25+.5*r(w,"hyper/host-preference",0,origin,id))])),
      bias:{axis:Math.floor(r(w,"hyper/bias-axis",0,origin)*5),sign:r(w,"hyper/bias-sign",0,origin)<.5?-1:1},parents:[],generation:0,mutation:{occurred:false,changes:[]}};
      if(w.config.informationModel==="persistent/1")traits.bias.vector9=directionVector(traits.bias);return traits;
    }
    function childTraits(w,parent,origin,turn=w.turn){
      const a=parent.hyper??parent.traits??parent,p=settings(w),traits={genes:structuredClone(a.genes??defaultGenes()),preference:structuredClone(a.preference??initialTraits(w,origin).preference),
        bias:structuredClone(a.bias??initialTraits(w,origin).bias),parents:[parent.parentId??parent.id],generation:(a.generation??parent.generation??0)+1,mutation:{occurred:false,changes:[]}};
      if(r(w,"hyper/mutation",turn,origin)<p.mutationRate){
        const g=traits.genes,keys=Object.keys(g).flatMap(group=>Object.keys(g[group]).map(key=>[group,key])),first=keys[Math.floor(r(w,"hyper/mutation-key",turn,origin)*keys.length)],sign=r(w,"hyper/mutation-sign",turn,origin)<.5?-1:1,
          choices=keys.filter(key=>key!==first&&(key[0]==="investment")===(first[0]==="investment")&&(sign>0?g[key[0]][key[1]]>0:g[key[0]][key[1]]<1))
            .sort((a,b)=>hash(w,"hyper/mutation-tradeoff",turn,origin,a)-hash(w,"hyper/mutation-tradeoff",turn,origin,b)),second=choices[0];
        if(second){const value=g[first[0]][first[1]],other=g[second[0]][second[1]],step=Math.min(p.mutationStep,sign>0?1-value:value,sign>0?other:1-other);
          if(step>0){g[first[0]][first[1]]=H.round(value+sign*step);g[second[0]][second[1]]=H.round(other-sign*step);traits.mutation={occurred:true,changes:[{key:first.join("/"),delta:sign*step},{key:second.join("/"),delta:-sign*step}]};}}
      }
      if(w.config.informationModel==="persistent/1"){
        traits.bias.vector9=directionVector(traits.bias);const z=w.config.informationSettings;
        if(r(w,"hyper/direction-mutation",turn,origin)<z.directionMutationRate){
          const v=traits.bias.vector9,donors=v.map((value,axis)=>({value,axis})).filter(a=>a.value!==0),
            donor=donors[Math.floor(r(w,"hyper/direction-donor",turn,origin)*donors.length)];
          if(donor){const targets=Array.from({length:9},(_,axis)=>axis).filter(axis=>axis!==donor.axis),target=targets[Math.floor(r(w,"hyper/direction-target",turn,origin)*targets.length)],
            delta=H.round(Math.sign(donor.value)*Math.min(z.directionMutationStep,Math.abs(donor.value)));
            v[donor.axis]=H.round(v[donor.axis]-delta);v[target]=H.round(v[target]+delta);traits.mutation.occurred=true;
            traits.mutation.changes.push({key:"bias/vector9/"+donor.axis,delta:-delta},{key:"bias/vector9/"+target,delta});
          }
        }
      }
      return traits;
    }
    function create(w,pId,turn=w.turn,origin=pId,traits=null){
      if(!enabled(w))throw Error("SETTINGS_INVALID: 高次寄生モデルの指定が必要です");
      const t=traits?.traits??traits??initialTraits(w,origin),p=settings(w),bias=structuredClone(t.bias??initialTraits(w,origin).bias);
      if(w.config.informationModel==="persistent/1")bias.vector9=directionVector(bias);
      const q={id:"q:"+origin+":"+turn,species:"hyperparasite",hostId:pId,phase:1,age:0,bornAt:turn,birthLife:p.life,maturity:p.maturity,E:0,B:p.biomass[1],
        ready:0,counter:0,special:null,modulation:null,counts:[0,0,0],seen:[],
        hyper:{version:VERSION,state:"egg",development:0,experience:0,settledAt:turn,pauseUntil:turn,starvationRun:0,prepareUntil:0,...(ParasiteCohort.enabled(w)?{cohort:{version:"parasite-cohort/1",members:2}}:{}),
          genes:structuredClone(t.genes??defaultGenes()),preference:structuredClone(t.preference??initialTraits(w,origin).preference),bias,
          parents:structuredClone(t.parents??[]),generation:t.generation??0,mutation:structuredClone(t.mutation??{occurred:false,changes:[]}),
          origin:traits?"descendant":"initial",last:{turn,maintenanceE:0,developmentE:0,metaE:0,informationE:0,maintained:false,developed:false,progress:0,blockers:[]}}};
      return PersistentInformation.attach(w,q);
    }
    function adaptation(q,species,route="contact",stage="terminal"){const g=(q.hyper??q.traits??q).genes;return ((g?.hosts[species]??.5)+(g?.routes[route]??.5)+(g?.stages[stage]??.5))/3;}
    function acquireResistance(w,p){
      if(!enabled(w)||!PrimaryParasite.is(p))return;
      const s=settings(w),a=p.hyperResistance??={version:"hyper-resistance/1",value:0,effective:0,updatedAt:w.turn,paidAt:-1,lastPaidE:0};
      a.value=H.round(Math.min(s.resistanceCap,a.value*Math.pow(.5,Math.max(0,w.turn-a.updatedAt)/s.resistanceHalfLife)+s.resistanceGain));a.updatedAt=w.turn;return a;
    }
    function beginResistance(w,p){
      const a=p.hyperResistance;if(!enabled(w)||!a||a.paidAt===w.turn)return {paid:0,required:0};
      const s=settings(w);a.value=H.round(a.value*Math.pow(.5,Math.max(0,w.turn-a.updatedAt)/s.resistanceHalfLife));a.updatedAt=w.turn;a.paidAt=w.turn;
      const required=H.round(s.resistanceMaintenance*a.value),paid=H.round(Math.min(p.E,required));p.E=H.round(p.E-paid);dissipate(w,paid);a.lastPaidE=paid;a.effective=required>0?H.round(a.value*paid/required):a.value;return {paid,required};
    }
    const resistance=(w,p)=>p.hyperResistance?.paidAt===w.turn?p.hyperResistance.effective:0;
    function entries(w){
      if(!enabled(w))return [];
      const out=[],seen=new Set();
      for(const e of PrimaryParasite.entries(w)){const q=e.p.q;if(is(q)&&!seen.has(q.id)){seen.add(q.id);out.push({q,p:e.p,host:e.host,hostP:e.p,hostH:e.host,carrier:e.carrier,kind:"attached",location:e.kind,cell:e.cell});}}
      for(const q of w.searchQ||[])if(is(q)&&!seen.has(q.id)){seen.add(q.id);out.push({q,p:null,host:null,hostP:null,hostH:null,carrier:q,kind:"free",location:"free",cell:q.cell});}return out;
    }
    function locate(w,id){return entries(w).find(e=>e.q.id===id||e.p?.id===id||e.host?.id===id)??null;}
    function qAge(q){return {enabled:is(q),applicable:is(q),age:q.age,birthLife:q.birthLife,life:q.birthLife,matureAt:q.maturity,elderlyAt:Math.floor(q.birthLife*.75),
      stage:q.age<q.maturity?"juvenile":q.age<q.birthLife*.75?"adult":"elderly"};}
    function initial(w){
      if(!enabled(w))return;
      const s=settings(w),all=PrimaryParasite.entries(w).filter(e=>P_SPECIES.includes(e.p.species)),direct=w.config.founderCounts?.parasites?.hyperparasite,
        planned=w.config.enabled.Q?(direct??Math.floor(all.length*s.initialFraction)):0,freePlanned=Math.floor(planned*(1-s.initialAttachedFraction)),attachedPlanned=planned-freePlanned;
      w.searchQ=[];w.hyperInocula=[];
      const window=ParasiteCohort.enabled(w)?6:3;
      const candidates=all.filter(e=>e.kind==="host"&&!e.p.q&&e.p.stage==="terminal"&&
        (Number.isInteger(e.p.matureAt)&&Math.max(e.p.matureAt+1,-s.life+1)<=Math.min(e.p.matureAt+window,0)||
          ParasiteCohort.enabled(w)&&!Number.isInteger(e.p.matureAt)&&e.p.counter>=Math.ceil(PrimaryParasite.settings(w).development.terminal/2)))
        .sort((a,b)=>hash(w,"hyper/initial-attached",0,a.p.id)-hash(w,"hyper/initial-attached",0,b.p.id)||H.compare(a.p.id,b.p.id));
      const report={version:"hyper-initial/1",compatibleP:all.length,requested:direct??null,planned,actual:0,shortage:0,
        attached:{planned:attachedPlanned,actual:0,shortage:0},free:{planned:freePlanned,actual:0,shortage:0},reasons:[]};
      for(const e of candidates.slice(0,attachedPlanned)){
        const origin="initial:"+e.p.id,early=!Number.isInteger(e.p.matureAt),earliest=early?0:Math.max(e.p.matureAt+1,-s.life+1),latest=early?0:Math.min(e.p.matureAt+window,0),
          bornAt=earliest+Math.floor(r(w,"hyper/initial-infected",0,origin)*(latest-earliest+1)),q=create(w,e.p.id,0,origin),age=Math.max(0,-bornAt),
          experience=Math.min(s.phaseThresholds[3],age),phase=experience>=s.phaseThresholds[3]?3:experience>=s.phaseThresholds[2]?2:1;
        Object.assign(q,{age,bornAt,phase,B:s.biomass[phase],E:s.initialEnergy});Object.assign(q.hyper,{state:phase===1?"egg":phase===2?"larva":"preparation",experience,development:Math.min(s.development,age),origin:"initial",initialExperience:experience});
        e.p.q=q;report.attached.actual++;
      }
      if(ParasiteCohort.enabled(w)){
        report.reassignedToFree=report.attached.planned-report.attached.actual;
        report.attached.planned=report.attached.actual;
        report.free.planned=planned-report.attached.actual;
      }
      const cues=ParasiteCohort.enabled(w)?all.filter(e=>e.kind==="host"&&["middle","extra","terminal"].includes(e.p.stage)).slice(0,64).map(e=>e.cell):[];
      const cells=w.tiles.map((tile,cell)=>({tile,cell})).filter(e=>!e.tile.blocked).map(e=>({cell:e.cell,near:cues.length?Math.min(...cues.map(c=>distance(w,e.cell,c))):0}))
        .sort((a,b)=>a.near-b.near||hash(w,"hyper/initial-free",0,null,a.cell)-hash(w,"hyper/initial-free",0,null,b.cell)||a.cell-b.cell).map(e=>e.cell);
      for(const cell of cells.slice(0,report.free.planned)){
        const origin="initial:free:"+cell,q=create(w,null,0,origin),age=s.maturity+Math.floor(r(w,"hyper/initial-adult-age",0,origin)*Math.min(20,s.life-s.maturity));
        Object.assign(q,{phase:4,cell,age,bornAt:-age,B:s.biomass[4],E:s.initialEnergy});Object.assign(q.hyper,{state:"adult",development:s.development,experience:s.phaseThresholds[3],origin:"initial",initialExperience:s.phaseThresholds[3]});w.searchQ.push(q);report.free.actual++;
      }
      for(const key of ["attached","free"]){report[key].shortage=report[key].planned-report[key].actual;report.actual+=report[key].actual;if(report[key].shortage)report.reasons.push(key+":"+(key==="attached"?"初回成熟窓と整合する終宿主P不足 ":"合法成体セル不足 ")+report[key].shortage);}
      report.shortage=planned-report.actual;w.config.hyperParasiteInitial=report;
      if(direct!==undefined&&report.shortage)throw Error("PLACEMENT_SHORTAGE: 抑環 指定"+direct+" / 配置可能"+report.actual+"（"+report.reasons.join("、")+"）");
      if(report.shortage)w.warnings.push("高次寄生:予定"+planned+" / 実配置"+report.actual+"。"+report.reasons.join("、"));summary(w);return report;
    }
    function summary(w){
      if(!enabled(w))return;
      const out={definition:"hyper-parasite-observed/1",turn:w.turn,count:0,attached:0,free:0,migrating:0,mature:0,phases:[0,0,0,0],states:{egg:0,larva:0,preparation:0,adult:0},biomassB:0,reserveE:0,
        invading:{records:0,amount:0,reserveE:0},resistance:{hosts:0,stored:0,effective:0,paidE:0}};
      if(ParasiteCohort.enabled(w))out.members=0;
      for(const e of entries(w)){const q=e.q;out.count++;if(ParasiteCohort.enabled(w))out.members+=ParasiteCohort.members(q);out[e.kind]++;if(e.carrier.kind==="primary-migration")out.migrating++;if(q.age>=q.maturity)out.mature++;out.phases[q.phase-1]++;out.states[q.hyper.state]++;out.biomassB+=q.B;out.reserveE+=q.E;}
      for(const i of w.hyperInocula||[]){out.invading.records++;out.invading.reserveE+=i.E;out.invading.amount+=i.E/settings(w).eggReserve;}
      for(const {p}of PrimaryParasite.entries(w))if(p.hyperResistance){const a=p.hyperResistance;out.resistance.hosts++;out.resistance.stored+=a.value;if(a.paidAt===w.turn){out.resistance.effective+=a.effective;out.resistance.paidE+=a.lastPaidE;}}
      const round=value=>{for(const key of Object.keys(value))if(typeof value[key]==="number")value[key]=H.round(value[key]);else if(value[key]&&typeof value[key]==="object")round(value[key]);};round(out);w.hyperParasiteSummary=out;return out;
    }
    function validate(w){
      if(!enabled(w))return [];
      const errors=[],seen=new Set(),sameKeys=(a,b)=>a&&typeof a==="object"&&!Array.isArray(a)&&Object.keys(a).sort().join("|")===Object.keys(b).sort().join("|");
      const validTraits=a=>{
        const expected=defaultGenes();return a&&sameKeys(a.genes,expected)&&Object.keys(expected).every(key=>sameKeys(a.genes[key],expected[key]))&&
          Object.values(a.genes).flatMap(g=>Object.values(g)).every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&a.genes.investment.promotion+a.genes.investment.distortion<=1+1e-6&&
          sameKeys(a.preference,expected.hosts)&&Object.values(a.preference).every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&Number.isInteger(a.bias?.axis)&&a.bias.axis>=0&&a.bias.axis<5&&[-1,1].includes(a.bias?.sign)&&
          (w.config.informationModel!=="persistent/1"||(Array.isArray(a.bias.vector9)&&a.bias.vector9.length===9&&a.bias.vector9.every(Number.isFinite)&&a.bias.vector9.reduce((n,v)=>n+Math.abs(v),0)<=1+1e-6));
      };
      for(const holder of [...w.organisms,...w.carcasses,...w.pending])if(holder.infection?.q){const q=holder.infection.q;if(!is(q))errors.push("HYPER_STATE:"+q.id);if(seen.has(q.id))errors.push("HYPER_ID:"+q.id);seen.add(q.id);}
      for(const q of w.searchQ||[]){if(!is(q))errors.push("HYPER_STATE:"+q.id);if(seen.has(q.id))errors.push("HYPER_ID:"+q.id);seen.add(q.id);}
      for(const {q,p,kind}of entries(w))if(![q.E,q.B,q.age,q.hyper.experience,q.hyper.development].every(n=>Number.isFinite(n)&&n>=0)||
        q.E>settings(w).capE+1e-6||(ParasiteCohort.enabled(w)&&(!Number.isSafeInteger(q.hyper.cohort?.members)||q.hyper.cohort.members<1||q.hyper.cohort.members>3))||!Number.isInteger(q.phase)||q.phase<1||q.phase>4||!Number.isFinite(q.bornAt)||q.birthLife<=0||!validTraits(q.hyper)||
        !["egg","larva","preparation","adult"].includes(q.hyper.state)||(kind==="free"&&(q.phase!==4||q.hyper.state!=="adult"||!Number.isInteger(q.cell)||!w.tiles[q.cell]||q.hostId!==null))||
        (p&&(q.hostId!==p.id||q.phase===4||q.hyper.state==="adult")))errors.push("HYPER_STATE:"+q.id);
      for(const i of w.hyperInocula||[])if(!Number.isFinite(i.E)||i.E<0||!Number.isSafeInteger(i.expires)||!validTraits(i.traits??i)||i.kind!=="invading")errors.push("HYPER_INOCULUM:"+i.id);
      return errors;
    }
    return {enabled,is,parameters,settings,create,childTraits,adaptation,entries,locate,ageInfo:qAge,summary,initial,validate,resistance,acquireResistance,beginResistance};
  })();
  const PersistentInformation = (() => {
    const VERSION="persistent-information-state/1",ROLES=["producer","primary-consumer","secondary-consumer","higher-consumer","decomposer","P","Q"],fieldIndices=new WeakMap();
    const enabled=w=>w?.config?.informationModel==="persistent/1";
    function parameters(input={}){
      const defaults={version:"persistent-information-parameters/1",roleDefinition:"persistent-information-roles/1",influence:1,qEffects:true,experienceCapacity:16,learnedCapacity:64,turnDedupeCapacity:64,
        holdingCount:6,holdingTurns:3,normalCount:3,normalTurns:2,receiveLimit:2,receiveCostFraction:.01,
        transmission:{environment:1,ordinary:.25,caregiver:1},evaluationWeights:[.4,.4,.2],baseProbability:.1,scoreProbability:.6,
        harmMinimum:.4,lowProbability:.05,lowWeight:.5,halfLives:{fast:25,relation:50,place:100},minimumLifetime:100,scoreLifetime:100,
        initialAmount:1,minimumAmount:.01,diffusionFraction:.2,cellOrigins:4,originContents:2,concentrationRadius:2,distanceWeights:[1,.5,.25],
        traceCapacity:2,traceHalfLife:50,traceLifetime:100,directionMutationRate:.1,directionMutationStep:.05};
      if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw Error("SETTINGS_INVALID: 持続情報の比較値");
      const out={...structuredClone(defaults),...structuredClone(input)};
      if(typeof out.influence!=="number"||!Number.isFinite(out.influence)||out.influence<0||out.influence>4)throw Error("SETTINGS_INVALID: 情報影響度は0〜4");
      if(typeof out.qEffects!=="boolean")throw Error("SETTINGS_INVALID: Q情報作用");
      for(const key of Object.keys(defaults))if(!["influence","qEffects"].includes(key)&&H.stable(out[key])!==H.stable(defaults[key]))throw Error("SETTINGS_INVALID: 持続情報の定義値 "+key);
      return out;
    }
    const settings=w=>w.config.informationSettings;
    function roles(w,o){
      const s=spec(o);if(!s)return [];
      if(s.group==="P"||s.group==="Q")return [s.group];
      if(s.group==="plant")return ["producer"];
      if(s.group==="fungus")return ["decomposer"];
      if(s.group==="prey")return ["primary-consumer"];
      if(s.group!=="main")return [];
      const out=[];if(s.id==="kelp")out.push("producer");
      if(["plant","fungal","general","mineral"].includes(s.diet))out.push("primary-consumer");
      if(["animal","general","scavenger","mineral"].includes(s.diet))out.push("secondary-consumer","higher-consumer");
      return [...new Set(out)];
    }
    function parents(o){return structuredClone(o.primary?.parents??o.hyper?.parents??o.parents??[]);}
    function state(o){
      if(!o.informationState)o.informationState={version:VERSION,experience:[],learned:[],progress:{maintained:0,roleAmount:0,roleAmounts:{},relationTurns:0,offspringSuccess:0},
        learnedPreferences:Array(9).fill(0),eventDedupe:{turn:-1,keys:[]},progressTurn:{turn:-1,maintained:false,relation:false},last:null};
      return o.informationState;
    }
    function attach(w,o){if(enabled(w))state(o);return o;}
    function entries(w){
      if(!enabled(w))return [];
      const out=[],seen=new Set(),push=(subject,kind,host,carrier,cell)=>{if(subject&&!seen.has(subject.id)){seen.add(subject.id);out.push({subject,kind,host,carrier,cell,roles:roles(w,subject)});}};
      for(const o of w.organisms||[])push(o,"organism",o,o,o.cell);
      if(PrimaryParasite.enabled(w))for(const e of PrimaryParasite.entries(w))push(e.p,"P",e.host,e.carrier,e.cell);
      else for(const carrier of [...w.organisms||[],...w.carcasses||[],...w.pending||[]])if(carrier.infection)push(carrier.infection,"P",carrier,carrier,carrier.cell);
      if(HyperParasite.enabled(w))for(const e of HyperParasite.entries(w))push(e.q,"Q",e.host,e.carrier,e.cell);
      else {
        for(const e of out.slice())if(e.kind==="P"&&e.subject.q)push(e.subject.q,"Q",e.host,e.carrier,e.cell);
        for(const q of w.searchQ||[])push(q,"Q",null,q,q.cell);
      }
      return out;
    }
    const locate=(w,id)=>entries(w).find(e=>e.subject.id===id)??null;
    function fieldAt(w,cell){
      if(!enabled(w))return [];
      const field=w.informationField||[];let cached=fieldIndices.get(w);
      if(!cached||cached.field!==field||cached.turn!==w.turn||cached.length!==field.length){
        const index=new Map();for(const e of field){if(!index.has(e.cell))index.set(e.cell,[]);index.get(e.cell).push(e);}cached={field,turn:w.turn,length:field.length,index};fieldIndices.set(w,cached);
      }
      return (cached.index.get(cell)||[]).filter(e=>e.expires>w.turn&&e.amount>=settings(w).minimumAmount);
    }
    function maintenance(w,o){
      if(PrimaryParasite.is(o))return PrimaryParasite.settings(w).maintenance[o.phase];
      if(HyperParasite.is(o))return HyperParasite.settings(w).maintenance[o.phase];
      if(["P","Q"].includes(spec(o)?.group))return null;
      const p=phenotype(w,o),env=w.tiles[o.cell]?.env;
      return H.round(p.maintenance*(env===undefined?1:adjustment(w,o,"maintenance",env,p.phase))/(1+trait(o,"maintenance",p.phase))*
        (w.config.ecologyRevision==="observation/4.1"&&spec(o).group==="main"&&!Ryouki.is(o)?.65:1));
    }
    function traits(w,o){return {roles:roles(w,o),sensitivity:H.round(.8+.4*(o.dna?.sensitivity??.5)),maintenance:maintenance(w,o),parents:parents(o)};}
    function preference(w,o,axis){return enabled(w)&&Number.isInteger(axis)&&axis>=0&&axis<9?H.clamp(o.informationState?.learnedPreferences?.[axis]??0,-20,20):0;}
    function benchmark(w,s,role=null){
      const colony=Colony.enabled(w)&&s.group==="plant"&&s.kind!=="independent",queen=s.id==="swarm"&&role==="queen";
      const life=colony?null:s.group==="P"?(PrimaryParasite.enabled(w)?PrimaryParasite.settings(w).life:null):s.group==="Q"?(HyperParasite.enabled(w)?HyperParasite.settings(w).life:null):s.life*(queen?3:1);
      let standardMaintenance=s.maintenance??null;
      if(s.group==="P"&&PrimaryParasite.enabled(w))standardMaintenance=PrimaryParasite.settings(w).maintenance[1];
      else if(s.group==="Q"&&HyperParasite.enabled(w))standardMaintenance=HyperParasite.settings(w).maintenance[1];
      else if(s.group==="main")standardMaintenance*=w.config.ecologyRevision==="observation/4.1"&&s.id!=="ryouki"?.65:1;
      const lightLimit=s.group==="plant"?(s.kind==="independent"?s.lightInput:s.id==="phytoplankton"?8:4):s.id==="kelp"?1.5:null;
      const roleAmounts={};for(const id of roles(w,{species:s.id}))roleAmounts[id]=id==="producer"?H.round(10*Math.max(0,lightLimit-standardMaintenance)/1.2):id==="decomposer"?20:["P","Q"].includes(id)?10:standardMaintenance===null?null:H.round(10*standardMaintenance);
      return {species:s.id,role,roles:Object.keys(roleAmounts),life,maintenance:standardMaintenance,lightLimit,maintainedTurns:colony?100:life===null?null:life/2,
        roleAmounts,relationTurns:10,offspringSuccess:1};
    }
    function benchmarks(w){return Object.fromEntries(activeSpecies(w).flatMap(s=>[[s.id,benchmark(w,s)],...(s.id==="swarm"?[[s.id+":queen",benchmark(w,s,"queen")]]:[])]));}
    function basis(w,o){return w.config.informationBenchmarks?.[o.species+(o.species==="swarm"&&o.role==="queen"?":queen":"")]??null;}
    function evaluate(w,o){
      const a=o.informationState,b=basis(w,o),p=a?.progress;
      if(!b||!p)return {resolved:false,A:null,B:null,C:null,S:null,pBase:null,lifetime:null,benchmarks:b};
      const A=b.maintainedTurns>0?H.clamp(p.maintained/b.maintainedTurns,0,1):null,
        amounts=Object.entries(b.roleAmounts).filter(([,n])=>n>0),values=amounts.map(([role,n])=>(p.roleAmounts?.[role]??(amounts.length===1?p.roleAmount:0))/n),
        B=values.length?H.clamp(Math.max(...values),0,1):null,
        C=H.clamp(Math.max(p.relationTurns/b.relationTurns,p.offspringSuccess/b.offspringSuccess),0,1),resolved=[A,B,C].every(Number.isFinite),
        S=resolved?H.round(.4*A+.4*B+.2*C):null;
      return {resolved,A:A===null?null:H.round(A),B:B===null?null:H.round(B),C:H.round(C),S,pBase:resolved?H.round(.1+.6*S):null,lifetime:resolved?Math.round(100+100*S):null,benchmarks:b};
    }
    function freshness(component,turn){const t=component.experienceAt??component.lastExperienceAt,h=component.halfLife;return Number.isFinite(t)&&Number.isFinite(h)&&h>0?Math.pow(2,-Math.max(0,turn-t)/h):0;}
    function recordProgress(w,o,event={}){
      if(!enabled(w))return null;const a=state(o),p=a.progress;
      if(a.progressTurn.turn!==w.turn)a.progressTurn={turn:w.turn,maintained:false,relation:false};
      if(event.maintained&&!a.progressTurn.maintained){p.maintained++;a.progressTurn.maintained=true;}
      if(event.relation&&!a.progressTurn.relation){p.relationTurns++;a.progressTurn.relation=true;}
      for(const key of ["roleAmount","offspringSuccess"])if(Number.isFinite(event[key])&&event[key]>0)p[key]=H.round(p[key]+event[key]);
      for(const [role,amount]of Object.entries(event.roleAmounts??{}))if(ROLES.includes(role)&&Number.isFinite(amount)&&amount>0)p.roleAmounts[role]=H.round((p.roleAmounts[role]??0)+amount);
      return p;
    }
    function addExperience(w,o,event){
      if(!enabled(w)||!event||event.received||event.actual===false)return null;
      const a=state(o),z=settings(w),turn=event.turn??w.turn;
      if(!Number.isSafeInteger(turn)||turn<0||turn>w.turn||!Number.isFinite(event.amount)||event.amount<=0||typeof event.result!=="string")return null;
      if(a.eventDedupe.turn!==turn)a.eventDedupe={turn,keys:[]};
      const contentId=event.contentId??event.meaning,context=structuredClone(event.context??{cell:event.cell??o.cell,env:w.tiles[event.cell??o.cell]?.env??null}),key=H.stable([contentId,context,event.peerSpecies??null,event.result,event.scope??"layer"]),
        dedupe=H.stable([contentId,context,event.peerId??null,event.result]);if(a.eventDedupe.keys.includes(dedupe)||a.eventDedupe.keys.length>=z.turnDedupeCapacity)return null;
      a.eventDedupe.keys.push(dedupe);
      let item=a.experience.find(e=>e.key===key);
      if(!item){
        if(a.experience.length>=z.experienceCapacity){a.experience.sort((x,y)=>freshness(x,w.turn)*x.amount-freshness(y,w.turn)*y.amount||H.compare(x.key,y.key));a.experience.shift();}
        const kind=event.kind??"relation";item={key,originId:"experience:"+o.id+":"+turn+":"+H.sha256(key).slice(0,16),contentId,meaning:event.meaning,kind,
          count:0,distinctTurns:0,amount:0,firstAt:turn,lastExperienceAt:turn-1,experienceAt:turn,cell:event.cell??o.cell,context,
          halfLife:event.halfLife??z.halfLives[kind],values:structuredClone(event.values??[]),scope:event.scope??"layer",roles:roles(w,o),peerSpecies:event.peerSpecies??null,confirmedHarm:false};
        a.experience.push(item);
      }
      item.count++;if(item.lastExperienceAt!==turn)item.distinctTurns++;item.amount=H.round(item.amount+event.amount);item.lastExperienceAt=turn;item.experienceAt=turn;
      item.values=structuredClone(event.values??item.values);item.confirmedHarm ||= event.confirmedHarm===true;return item;
    }
    const qualified=(w,item)=>item.count>=settings(w).holdingCount&&item.distinctTurns>=settings(w).holdingTurns;
    function snapshot(w,entry,extra={}){
      const o=entry.subject??entry,cell=entry.cell??o.cell;
      return {id:o.id,species:o.species,cell,roles:roles(w,o),roleDefinition:settings(w).roleDefinition,parents:parents(o),informationState:structuredClone(o.informationState??null),
        evaluation:structuredClone(evaluate(w,o)),hyperTraces:structuredClone(o.hyperTraces??[]),...structuredClone(extra)};
    }
    function initialize(w){
      if(!enabled(w))return;
      w.config.informationBenchmarks=benchmarks(w);w.informationField=[];w.informationLedger={initialAmount:0,generatedAmount:0,inactivatedAmount:0};
      for(const {subject}of entries(w))attach(w,subject);w.persistentInformationSummary=summary(w);
    }
    function summary(w){
      if(!enabled(w))return;
      const actors=entries(w),out={definition:"persistent-information-observed/1",turn:w.turn,subjects:actors.length,experiencedSubjects:0,holdingSubjects:0,ownSummaries:0,learnedOrigins:0,
        field:{records:0,cells:0,origins:0,contents:0,amount:0},ledger:{...w.informationLedger,remainingAmount:0}};
      for(const {subject}of actors){const a=subject.informationState;if(!a)continue;out.ownSummaries+=a.experience.length;out.learnedOrigins+=a.learned.length;if(a.experience.length)out.experiencedSubjects++;if(a.experience.some(e=>qualified(w,e)))out.holdingSubjects++;}
      const cells=new Set(),origins=new Set();for(const e of w.informationField||[]){out.field.records++;cells.add(e.cell);origins.add(e.originId);out.field.contents+=e.contents?.length||0;out.field.amount+=e.amount;}
      out.field.cells=cells.size;out.field.origins=origins.size;out.field.amount=H.round(out.field.amount);out.ledger.remainingAmount=out.field.amount;return out;
    }
    function validate(w){
      if(!enabled(w))return [];
      const errors=[],z=settings(w),nonnegative=n=>typeof n==="number"&&Number.isFinite(n)&&n>=0,vector=v=>Array.isArray(v)&&v.length<=9&&new Set(v.map(a=>a.axis)).size===v.length&&v.every(a=>Number.isInteger(a.axis)&&a.axis>=0&&a.axis<9&&Number.isFinite(a.value)),cells=new Map(),ids=new Set();
      if(!Array.isArray(w.informationField)||!w.informationLedger)errors.push("INFORMATION_WORLD");
      for(const {subject:o}of entries(w)){
        const a=o.informationState;if(ids.has(o.id))errors.push("INFORMATION_ID:"+o.id);ids.add(o.id);
        if(a?.version!==VERSION||!Array.isArray(a.experience)||a.experience.length>z.experienceCapacity||!Array.isArray(a.learned)||a.learned.length>z.learnedCapacity||
          !Array.isArray(a.learnedPreferences)||a.learnedPreferences.length!==9||!a.learnedPreferences.every(n=>Number.isFinite(n)&&n>=-100&&n<=100)||!["maintained","roleAmount","relationTurns","offspringSuccess"].every(k=>nonnegative(a.progress?.[k]))||!Object.values(a.progress?.roleAmounts??{}).every(nonnegative)||
          !Array.isArray(a.eventDedupe?.keys)||a.eventDedupe.keys.length>z.turnDedupeCapacity){errors.push("INFORMATION_STATE:"+o.id);continue;}
        const origins=new Set();for(const e of a.experience){if(origins.has(e.originId)||!Number.isSafeInteger(e.count)||e.count<1||!Number.isSafeInteger(e.distinctTurns)||e.distinctTurns<1||e.distinctTurns>e.count||!nonnegative(e.amount)||
          !Number.isSafeInteger(e.firstAt)||!Number.isSafeInteger(e.lastExperienceAt)||e.firstAt>e.lastExperienceAt||e.lastExperienceAt>w.turn||!vector(e.values)||!Array.isArray(e.roles)||!e.roles.every(r=>ROLES.includes(r)))errors.push("INFORMATION_EXPERIENCE:"+o.id);origins.add(e.originId);}
        for(const e of a.learned)if(typeof e.originId!=="string"||!Number.isSafeInteger(e.expires))errors.push("INFORMATION_LEARNED:"+o.id);
      }
      let amount=0;
      for(const e of w.informationField||[]){
        const origins=cells.get(e.cell)??new Set();origins.add(e.originId);cells.set(e.cell,origins);
        if(typeof e.originId!=="string"||!Number.isInteger(e.cell)||!w.tiles[e.cell]||!nonnegative(e.amount)||e.amount<z.minimumAmount-1e-9||
          !Number.isSafeInteger(e.generatedAt)||!Number.isSafeInteger(e.expires)||e.generatedAt>e.expires||e.generatedAt>w.turn||e.expires<=w.turn||!Array.isArray(e.contents)||!e.contents.length||e.contents.length>z.originContents||
          ["E","B","M"].some(k=>Object.hasOwn(e,k)))errors.push("INFORMATION_FIELD:"+e.originId);
        for(const c of e.contents||[])if(!vector(c.values)||!vector(c.originalValues)||!Number.isSafeInteger(c.experienceAt)||c.experienceAt>e.generatedAt||!Object.values(z.halfLives).includes(c.halfLife)||!["normal","low","confirmed-harm"].includes(c.evidence))errors.push("INFORMATION_CONTENT:"+e.originId);
        if(nonnegative(e.amount))amount+=e.amount;
      }
      for(const [cell,origins]of cells)if(origins.size>z.cellOrigins)errors.push("INFORMATION_CAPACITY:"+cell);
      const ledger=w.informationLedger;if(ledger&&(![ledger.initialAmount,ledger.generatedAmount,ledger.inactivatedAmount].every(nonnegative)||Math.abs(ledger.initialAmount+ledger.generatedAmount-ledger.inactivatedAmount-amount)>1e-4))errors.push("INFORMATION_BALANCE");
      if((w.resources||[]).some(a=>a.kind==="info"))errors.push("INFORMATION_NUTRITION");return errors;
    }
    return {enabled,parameters,settings,state,attach,entries,locate,fieldAt,roles,parents,maintenance,traits,preference,benchmarks,basis,evaluate,freshness,recordProgress,addExperience,qualified,snapshot,initialize,initial:initialize,summary,validate};
  })();
  const index = (w, x, y) => y * w.config.width + x;
  const xy = (w, p) => [p % w.config.width, Math.floor(p / w.config.width)];
  // Explicitly enabled only for fixed production worlds; never serialized.
  const geometry = new WeakMap(), geometryPool = new Map();
  function prepareGeometry(w) {
    const key = H.sha256(H.stable([w.config.width,w.config.height,w.tiles.map(({soilM,...t})=>t)]));
    let cache = geometryPool.get(key);
    const reused = !!cache;
    if (!cache) {
      cache = {near:new Map(),edges:new Map(),sight:new Map(),habitat:new Map()};
      for (let p=0;p<w.tiles.length;p++) {
        cache.near.set(p+":1:false",rawNearby(w,p));
        for (const q of rawNearby(w,p)) cache.edges.set(p*w.tiles.length+q,rawOneStep(w,p,q));
      }
      geometryPool.set(key,cache);
      if (geometryPool.size>2) geometryPool.delete(geometryPool.keys().next().value);
    }
    geometry.set(w,cache);
    return {key,reused};
  }
  function inheritGeometry(from,to) { const c=geometry.get(from);if(c)geometry.set(to,c); }
  function nearby(w,p,radius=1,includeSelf=false) {
    const c=geometry.get(w);if(!c)return rawNearby(w,p,radius,includeSelf);
    const key=p+":"+radius+":"+includeSelf;
    if(!c.near.has(key)) {
      if(c.near.size>=20000)return rawNearby(w,p,radius,includeSelf);
      c.near.set(key,rawNearby(w,p,radius,includeSelf));
    }
    return c.near.get(key).slice();
  }
  function rawNearby(w, p, radius = 1, includeSelf = false) {
    const [x, y] = xy(w, p),
      out = [];
    for (let dy = -radius; dy <= radius; dy++)
      for (let dx = -radius; dx <= radius; dx++)
        if (
          (includeSelf || dx || dy) &&
          x + dx >= 0 &&
          y + dy >= 0 &&
          x + dx < w.config.width &&
          y + dy < w.config.height
        )
          out.push(index(w, x + dx, y + dy));
    return out;
  }
  function distance(w, a, b) {
    const [x, y] = xy(w, a),
      [u, v] = xy(w, b);
    return Math.max(Math.abs(x - u), Math.abs(y - v));
  }
  function oneStep(w,a,b) {
    const c=geometry.get(w),key=a*w.tiles.length+b;
    return c?.edges.has(key)?c.edges.get(key):rawOneStep(w,a,b);
  }
  function rawOneStep(w, a, b) {
    if (a === b) return !w.tiles[a].blocked;
    if (distance(w, a, b) !== 1 || w.tiles[a].blocked || w.tiles[b].blocked)
      return false;
    const [x, y] = xy(w, a),
      [u, v] = xy(w, b),
      dx = u - x,
      dy = v - y;
    const edge = (p, q) => w.tiles[p].walls.includes(q);
    if (edge(a, b)) return false;
    if (dx && dy) {
      const c = index(w, u, y),
        d = index(w, x, v);
      if (
        w.tiles[c].blocked ||
        w.tiles[d].blocked ||
        edge(a, c) ||
        edge(a, d) ||
        edge(c, b) ||
        edge(d, b)
      )
        return false;
    }
    return true;
  }
  // Supercover traversal: corner touches test both orthogonal cells and all four edges.
  function sight(w,a,b,blockers=null) {
    const c=geometry.get(w);
    // Organism occlusion is dynamic and must always be evaluated.
    if(!c||blockers)return rawSight(w,a,b,blockers);
    const key=a*w.tiles.length+b;
    if(c.sight.has(key))return c.sight.get(key);
    const value=rawSight(w,a,b);
    if(c.sight.size<100000)c.sight.set(key,value);
    return value;
  }
  function rawSight(w, a, b, blockers = null) {
    if (a === b) return true;
    let [x, y] = xy(w, a);
    const [tx, ty] = xy(w, b),
      nx = Math.abs(tx - x),
      ny = Math.abs(ty - y),
      sx = Math.sign(tx - x),
      sy = Math.sign(ty - y);
    let ix = 0,
      iy = 0,
      p = a;
    const clear = (q) =>
      !w.tiles[q].blocked &&
      (!blockers || q === a || q === b || !blockers.has(q));
    while (ix < nx || iy < ny) {
      const z = (1 + 2 * ix) * ny - (1 + 2 * iy) * nx;
      let q;
      if (z === 0) {
        const c = index(w, x + sx, y),
          d = index(w, x, y + sy);
        q = index(w, x + sx, y + sy);
        if (!clear(c) || !clear(d) || !oneStep(w, p, q)) return false;
        x += sx;
        y += sy;
        ix++;
        iy++;
      } else if (z < 0) {
        q = index(w, x + sx, y);
        if (!oneStep(w, p, q)) return false;
        x += sx;
        ix++;
      } else {
        q = index(w, x, y + sy);
        if (!oneStep(w, p, q)) return false;
        y += sy;
        iy++;
      }
      if (!clear(q)) return false;
      p = q;
    }
    return true;
  }
  // Engine-owned synchronous scopes share topology only. Row values remain live.
  // Outside a scope, callers may edit their private Maps (initial/support placement).
  const mapScopes = new WeakMap();
  function withMapScope(w, run, initialMaps = null) {
    if (mapScopes.has(w)) throw Error("MAP_SCOPE_NESTED");
    mapScopes.set(w, { maps: initialMaps });
    try {
      return run();
    } finally {
      mapScopes.delete(w);
    }
  }
  function sharedMaps(w) {
    const scope = mapScopes.get(w);
    if (!scope) return maps(w);
    return scope.maps || (scope.maps = maps(w));
  }
  function maps(w, cellSpace = null) {
    const main = new Map(),
      food = new Map(),
      byId = new Map(),
      resources = new Map(),
      carcasses = new Map();
    const producer=LargePlant.enabled(w)?new Map():null;
    for (const o of w.organisms) {
      byId.set(o.id, o);
      if(producer&&o.slot==="producer"){producer.set(o.cell,o);continue;}
      (o.slot === "main" ? main : food).set(o.cell, o);
    }
    for (const a of w.resources) {
      if (!resources.has(a.cell)) resources.set(a.cell, []);
      resources.get(a.cell).push(a);
    }
    for (const a of w.carcasses) {
      if (!carcasses.has(a.cell)) carcasses.set(a.cell, []);
      carcasses.get(a.cell).push(a);
    }
    const result=(()=>{return { main, food, byId, resources, carcasses };})();
    if(CellSpace.enabled(w)){
      result.cellSpace=cellSpace||CellSpace.index(w);
      result.mainByCell=new Map([...result.cellSpace].filter(([,rows])=>rows[4].length).map(([cell,rows])=>[cell,rows[4]]));
    }else if(Ryouki.enabled(w)){
      result.mainByCell=new Map();
      for(const o of w.organisms)if(o.slot==="main"){
        if(!result.mainByCell.has(o.cell))result.mainByCell.set(o.cell,[]);
        result.mainByCell.get(o.cell).push(o);
      }
    }
    if(producer)result.producer=producer;
    return result;
  }
  function mainAt(m,cell){return m.mainByCell?.get(cell)??(m.main.has(cell)?[m.main.get(cell)]:[]);}
  function mainRoom(w,o,cell,m=sharedMaps(w)){
    const occupants=mainAt(m,cell).filter(a=>a.id!==o.id);
    return occupants.length===0||(Ryouki.enabled(w)&&Ryouki.is(o)&&o.ryouki.mutated&&occupants.length<3&&occupants.every(a=>Ryouki.is(a)&&a.ryouki.mutated));
  }
  function validHabitat(w, s, p) {
    const t = w.tiles[p];
    if (t.blocked) return false;
    if(LargePlant.definition(s))return t.light>0&&(s.id==="freshwaterlight"?["shallow","deep"].includes(t.terrain):["plain","rock","mud"].includes(t.terrain));
    if (s.id === "algae" || s.id === "waterbug")
      return [0, 5].includes(t.env) && t.terrain === "shallow";
    if (s.id === "moss")
      return (
        [3, 4, 5].includes(t.env) && ["rock", "shallow"].includes(t.terrain)
      );
    if (s.id === "grass" || s.id === "grassbug") return t.terrain !== "deep";
    if (s.id === "fungus")
      return [2, 3, 5, 1, 7].includes(t.env) && t.terrain !== "deep";
    return true;
  }
  const OBSERVATION_MODES = Object.freeze([
    Object.freeze({id:"custom",name:"自由設定",description:"初期条件を自由に設定。餌の初期量は従来どおり。途中の生体補充はありません。"}),
    Object.freeze({id:"river-settlement",name:"河畔・定着観察",mapId:"river",foodScale:1.25,
      selected:Object.freeze(["myth","recursive","crystal","solar","whale","swarm","kelp"]),
      description:"河畔の7系統。高生産の河畔で、光合成入力2倍、主の初期集団を多め、植物・菌・動く餌の初期量25%増。"}),
    Object.freeze({id:"lake-foodweb",name:"湖沼・食物網観察",mapId:"lake",foodScale:1.5,
      selected:Object.freeze(["abyss","abyssshell","jelly","kelp","whale"]),
      description:"湖沼の5系統。高生産の湖沼で、光合成入力2倍、主の初期集団を多め、植物・菌・動く餌の初期量50%増。"}),
  ]);
  function observationPreset(id, width = 80, height = 56) {
    const mode = OBSERVATION_MODES.find(a=>a.id===id);
    if (!mode) throw Error("SETTINGS_INVALID: 観察モードが不明です");
    const resolved = {id,version:1,name:mode.name,description:mode.description};
    if (id === "custom") return {...resolved,initialFoodScale:1,solarScale:1};
    return {...resolved,mapId:mode.mapId,lineages:"manual",selected:[...mode.selected],
      initial:Math.round(width*height/1120*160/4)*4,initialFoodScale:mode.foodScale,solarScale:2,
      placement:"natural",distribution:"balanced",guarantee:false,
      enabled:{main:true,plant:true,fungus:true,prey:true,P:true,Q:true}};
  }
  function resolveObservation(input) {
    if (input.observationMode === undefined) {
      if (input.modeResolved !== undefined || (input.initialFoodScale !== undefined && input.initialFoodScale !== 1) || (input.solarScale !== undefined && input.solarScale !== 1))
        throw Error("SETTINGS_INVALID: 初期餌の調整には観察モードの指定が必要です");
      return input;
    }
    const mode = observationPreset(input.observationMode,input.width ?? 80,input.height ?? 56);
    if (input.modeResolved !== undefined && H.stable(input.modeResolved) !== H.stable(mode))
      throw Error("MODE_VERSION_MISMATCH: 保存された観察モードの条件を再現できません");
    if (mode.id === "custom") return {...input,initialFoodScale:1,solarScale:1,modeResolved:mode};
    const {id,version,name,description,...parameters} = mode;
    if (input.modeResolved !== undefined && Object.entries(parameters).some(([key,value])=>H.stable(input[key])!==H.stable(value)))
      throw Error("MODE_INPUT_MISMATCH: 保存された観察条件がモードの条件と一致しません");
    return {...input,...structuredClone(parameters),modeResolved:mode};
  }
  function validate(input = {}) {
    input = resolveObservation(input);
    const c = {
      seed: "ECOSYSTEM-2026",
      width: 80,
      height: 56,
      initial: 320,
      lineages: "all",
      selected: [],
      weights: {},
      placement: "natural",
      distribution: "balanced",
      guarantee: false,
      enabled: {
        main: true,
        plant: true,
        fungus: true,
        prey: true,
        P: true,
        Q: true,
      },
      ...input,
    };
    c.enabled = {
      main: true,
      plant: true,
      fungus: true,
      prey: true,
      P: true,
      Q: true,
      ...input.enabled,
    };
    if(c.cellModel!==undefined&&c.cellModel!==CellSpace.VERSION)throw Error("SETTINGS_INVALID: マスモデル");
    if(CellSpace.enabled({config:c}))c.cellSettings=CellSpace.settings(c.cellSettings);
    else if(c.cellSettings!==undefined)throw Error("SETTINGS_INVALID: マスモデルの指定が必要です");
    if (typeof c.seed !== "string" || !c.seed.isWellFormed())
      throw Error(
        "SETTINGS_INVALID: 初期値は正しいUnicode文字列で指定してください",
      );
    for (const [k, lo, hi] of [
      ["width", 4, 160],
      ["height", 4, 112],
      ["initial", 0, 17920],
    ])
      if (!Number.isSafeInteger(c[k]) || c[k] < lo || c[k] > hi)
        throw Error("SETTINGS_INVALID: " + k);
    if (!Object.values(c.enabled).some(Boolean))
      throw Error("SETTINGS_INVALID: 生物群を一つ以上有効にしてください");
    if (
      !["all", "few", "manual"].includes(c.lineages) ||
      !["natural", "scatter", "cluster"].includes(c.placement) ||
      !["balanced", "weighted"].includes(c.distribution)
    )
      throw Error("SETTINGS_INVALID: 配置形式");
    if (c.enabled.main && (c.initial < 4 || c.initial % 4))
      throw Error("SETTINGS_INVALID: 主生物数は4体単位です");
    if (!c.enabled.main) c.initial = 0;
    if (
      !Array.isArray(c.selected) ||
      c.selected.some((id) => !activeMain({config:c}).some((s) => s.id === id))
    )
      throw Error("SETTINGS_INVALID: 系統");
    c.selected = [...new Set(c.selected)];
    for (const [id,weight] of Object.entries(c.weights))
      if (!Number.isInteger(weight) || weight < (c.ryoukiModel==="ryouki/1"&&id==="ryouki"?0:1) || weight > 4)
        throw Error("SETTINGS_INVALID: 配分重みは1〜4");
    if (c.landscape !== undefined && !["watershed", "templates"].includes(c.landscape))
      throw Error("SETTINGS_INVALID: 地形方式");
    if (c.landscape === "templates") {
      c.terrainSeed = input.terrainSeed ?? c.seed;
      c.mapId = input.mapId ?? "auto";
      if (typeof c.terrainSeed !== "string" || !c.terrainSeed.isWellFormed() ||
          typeof c.mapId !== "string" || !["auto", ...Landscape.templates.list().map(m=>m.id)].includes(c.mapId))
        throw Error("SETTINGS_INVALID: 地形の初期値・選択");
    }
    if (c.ageModel !== undefined && c.ageModel !== "life/1")
      throw Error("SETTINGS_INVALID: 年齢モデル");
    if(c.consumerModel!==undefined&&c.consumerModel!=='group/1')throw Error('SETTINGS_INVALID: 一次消費者モデル');
    if(ConsumerGroup.enabled({config:c}))c.consumerGroupSettings=ConsumerGroup.settings(c.consumerGroupSettings);
    else if(c.consumerGroupSettings!==undefined)throw Error('SETTINGS_INVALID: 一次消費者モデルが必要です');
    if(c.balanceModel!==undefined&&!["survival/1","survival/2","survival/3","survival/4"].includes(c.balanceModel))
      throw Error("SETTINGS_INVALID: 生存調整モデル");
    if(c.socialRenewalModel!==undefined&&c.socialRenewalModel!=="successor/1")throw Error("SETTINGS_INVALID: 群体節足の後継繁殖モデル");
    if(FungalColony.enabled({config:c}))c.fungalColonySettings=FungalColony.settings(c.fungalColonySettings);
    else if(c.fungalColonySettings!==undefined)throw Error("SETTINGS_INVALID: 菌膜群落にはsurvival/4が必要です");
    if(c.ryoukiModel!==undefined&&c.ryoukiModel!=="ryouki/1")throw Error("SETTINGS_INVALID: 量機モデル");
    if(c.ryoukiModel==="ryouki/1"){
      c.ryoukiSettings=Ryouki.settings(c.ryoukiSettings);
      c.ageModel="life/1";
    }else if(c.ryoukiSettings!==undefined)throw Error("SETTINGS_INVALID: 量機モデルの指定が必要です");
    if(c.primaryParasiteModel!==undefined&&c.primaryParasiteModel!=="primary/1")throw Error("SETTINGS_INVALID: 一次寄生モデル");
    if(c.primaryParasiteModel==="primary/1"){
      c.primaryParasiteSettings=PrimaryParasite.parameters(c.primaryParasiteSettings);c.ageModel="life/1";
    }else if(c.primaryParasiteSettings!==undefined)throw Error("SETTINGS_INVALID: 一次寄生モデルの指定が必要です");
    if(c.hyperParasiteModel!==undefined&&c.hyperParasiteModel!=="hyper/1")throw Error("SETTINGS_INVALID: 高次寄生モデル");
    if(c.hyperParasiteModel==="hyper/1"){
      if(c.primaryParasiteModel!=="primary/1")throw Error("SETTINGS_INVALID: 高次寄生には一次寄生モデルが必要です");
      c.hyperParasiteSettings=HyperParasite.parameters(c.hyperParasiteSettings);
    }else if(c.hyperParasiteSettings!==undefined)throw Error("SETTINGS_INVALID: 高次寄生モデルの指定が必要です");
    if(c.parasiteCohortModel!==undefined&&c.parasiteCohortModel!=="cohort/1")throw Error("SETTINGS_INVALID: 寄生群体モデル");
    if(c.parasiteCohortModel&&c.primaryParasiteModel!=="primary/1")throw Error("SETTINGS_INVALID: 寄生群体には一次寄生モデルが必要です");
    if(c.parasiteDispersalModel!==undefined&&c.parasiteDispersalModel!=="fanout/1")throw Error("SETTINGS_INVALID: 寄生分散モデル");
    if(c.parasiteDispersalModel&&c.parasiteCohortModel!=="cohort/1")throw Error("SETTINGS_INVALID: 寄生分散には寄生群体モデルが必要です");
    if(c.primaryEggModel!==undefined&&c.primaryEggModel!=='egg/1')throw Error('SETTINGS_INVALID: 一次寄生卵モデル');
    if(c.primaryEggModel==='egg/1'){
      if(c.primaryParasiteModel!=='primary/1'||c.parasiteDispersalModel!=='fanout/1')throw Error('SETTINGS_INVALID: 一次寄生卵には一次寄生/分散モデルが必要です');
      c.primaryEggSettings=PrimaryParasite.eggParameters(c.primaryEggSettings);
    }else if(c.primaryEggSettings!==undefined)throw Error('SETTINGS_INVALID: 一次寄生卵モデルの指定が必要です');
    if(c.informationModel!==undefined&&c.informationModel!=="persistent/1")throw Error("SETTINGS_INVALID: 持続情報モデル");
    if(c.informationModel==="persistent/1")c.informationSettings=PersistentInformation.parameters(c.informationSettings);
    else if(c.informationSettings!==undefined)throw Error("SETTINGS_INVALID: 持続情報モデルの指定が必要です");
    if(c.producerModel !== undefined && c.producerModel !== "colony/1")throw Error("SETTINGS_INVALID: 群落モデル");
    if(c.producerModel === "colony/1")c.producerSettings=Colony.settings(c.producerSettings);
    else if(c.producerSettings !== undefined)throw Error("SETTINGS_INVALID: 群落モデルの指定が必要です");
    if(c.largePlantModel!==undefined&&c.largePlantModel!=="independent/1")throw Error("SETTINGS_INVALID: 独立植物モデル");
    if(c.largePlantModel==="independent/1"){
      if(c.producerModel!=="colony/1")throw Error("SETTINGS_INVALID: 独立植物には群落モデルが必要です");
      c.largePlantSettings=LargePlant.settings(c.largePlantSettings);
    }else if(c.largePlantSettings!==undefined)throw Error("SETTINGS_INVALID: 独立植物モデルの指定が必要です");
    if(c.blockTurns!==undefined && ![500,1000].includes(c.blockTurns))
      throw Error("SETTINGS_INVALID: 観測区間");
    if(c.randomModel!==undefined && c.randomModel!=='table/1')throw Error("SETTINGS_INVALID: 乱数方式");
    if(c.randomModel==='table/1')H.randomTable(c.seed);
    if(c.populationRegulation!==undefined){
      const a=c.populationRegulation;
      if(!a||typeof a!=="object"||Array.isArray(a)||a.version!==1||Object.keys(a).some(k=>k!=="version"))throw Error("SETTINGS_INVALID: 個体群の出生調整");
      c.populationRegulation={version:1};
    }
    if(c.producerSupport!==undefined){
      if(!c.producerSupport||typeof c.producerSupport!=="object"||Array.isArray(c.producerSupport))throw Error("SETTINGS_INVALID: 生産者供給");
      c.producerSupport=ProducerSupport.settings(c.producerSupport);
    }
    if(c.initialConditions!==undefined){
      const a=c.initialConditions,valid=(v,lo,hi)=>typeof v==="number"&&Number.isFinite(v)&&v>=lo&&v<=hi;
      if(!a||Array.isArray(a)||a.version!==1||Object.keys(a).some(k=>!["version","density","resources","distribution"].includes(k))||!["habitat","cluster"].includes(a.distribution))throw Error("SETTINGS_INVALID: 下層の初期条件");
      for(const [key,names,hi]of [["density",["plant","fungus","prey"],.9],["resources",["mineral","droplet","info"],4]]){
        const obj=a[key];if(!obj||Array.isArray(obj)||Object.keys(obj).length!==names.length||Object.keys(obj).some(k=>!names.includes(k))||names.some(k=>!valid(obj[k],0,hi)))throw Error("SETTINGS_INVALID: 初期量 "+key);
      }
      if(H.round(a.density.plant+a.density.fungus)>.95)throw Error("SETTINGS_INVALID: 生産者と分解者の密度合計は95%以下です");
      c.initialConditions=structuredClone(a);
    }
    if(c.founderCounts!==undefined){
      const a=c.founderCounts;
      if(!a||typeof a!=="object"||Array.isArray(a)||a.version!==1||Object.keys(a).some(k=>!["version","species","parasites"].includes(k)))throw Error("SETTINGS_INVALID: 種別の初期数");
      for(const key of ["species","parasites"]){
        const obj=a[key];if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("SETTINGS_INVALID: 種別の初期数 "+key);
        for(const [id,count]of Object.entries(obj)){
          const species=activeSpecies({config:c}).find(s=>s.id===id),allowed=key==="species"?["plant","fungus","prey"]:["P","Q"];
          if(!species||!allowed.includes(species.group)||!Number.isSafeInteger(count)||count<0||count>(species.group==="Q"?1024:17920))throw Error("SETTINGS_INVALID: 初期数 "+id);
          if(count>0&&!c.enabled[species.group])throw Error("SETTINGS_INVALID: "+species.name+"の生物群を有効にしてください");
        }
      }
      if(Object.keys(a.species).length&&c.guarantee)throw Error("SETTINGS_INVALID: 種別の初期数を指定する場合は初期餌保証をOFFにしてください");
      if(Object.keys(a.parasites).length&&c.ecologyRevision!=="observation/4.1")throw Error("SETTINGS_INVALID: 寄生群体の初期数は観察モデル専用です");
      c.founderCounts=structuredClone(a);
    }
    WorldGeneration.validateConfig(c);
    return c;
  }
  // Initial-condition resolution is opt-in and never executes an ecological turn.
  const WorldGeneration = (() => {
    const version="diverse-generation/1", resolvedVersion="diverse-generation-resolved/1", coefficientsVersion="implementation-start/2.6";
    const profiles=Object.freeze([
      {id:"standard",name:"標準"},{id:"high-production",name:"高生産"},{id:"resource-localized",name:"資源局在"},
      {id:"water-focused",name:"水辺中心"},{id:"land-focused",name:"陸域中心"},{id:"information-strong",name:"情報作用強め"},
    ].map(Object.freeze));
    const paths=Object.freeze(["mapId","initial",...['land','water'].flatMap(r=>['occupancy','capacityB','regrowthB','initialFraction'].map(k=>'producerSettings.'+r+'.'+k)),
      "initialConditions.distribution","initialConditions.density.fungus","initialConditions.density.prey","initialConditions.resources.mineral","initialConditions.resources.droplet",
      "largePlantSettings.autoDensity.land","largePlantSettings.autoDensity.water","largePlantSettings.initial.phase","largePlantSettings.initial.ageFraction","largePlantSettings.initial.energyFraction","informationSettings.influence"]);
    const enabled=c=>(c.config??c).generationModel==="diverse/1";
    const fail=message=>{throw Error("GENERATION_INVALID: "+message);};
    const object=x=>x&&typeof x==="object"&&!Array.isArray(x);
    const get=(o,path)=>path.split('.').reduce((a,k)=>a?.[k],o);
    function set(o,path,value){const parts=path.split('.'),key=parts.pop();let at=o;for(const p of parts)at=at[p]??={};at[key]=structuredClone(value);}
    function normalize(input={}){
      if(!object(input)||Object.keys(input).some(k=>!['version','mode','profile','locks'].includes(k))||(input.version!==undefined&&input.version!=="diverse-generation-parameters/1"))fail("生成設定の版/項目");
      const out={version:"diverse-generation-parameters/1",mode:input.mode??"auto",profile:input.profile??"auto",locks:input.locks??[]};
      if(!['auto','manual'].includes(out.mode)||!['auto',...profiles.map(p=>p.id)].includes(out.profile)||!Array.isArray(out.locks)||out.locks.some(p=>!paths.includes(p)))fail("生成方式/プロファイル/固定項目");
      out.locks=[...new Set(out.locks)].sort();return out;
    }
    function validateConfig(c){
      if(c.generationModel!==undefined&&c.generationModel!=="diverse/1")fail("生成モデルの版");
      if(!enabled(c)){if(c.generationSettings!==undefined||c.generationResolved!==undefined)fail("生成モデルの指定が必要です");return;}
      c.generationSettings=normalize(c.generationSettings);
      if(c.generationSettings.mode==="auto"&&c.mapId==="auto"&&c.generationSettings.locks.includes('mapId'))fail("地形おまかせは固定できません");
    }
    function values(c){return Object.fromEntries(paths.filter(p=>get(c,p)!==undefined).map(p=>[p,structuredClone(get(c,p))]));}
    function configHash(c){const copy=structuredClone(c);delete copy.generationResolved;delete copy.advantageSettings;return H.sha256(H.stable(copy));}
    function digest(value){return H.sha256(H.stable(value));}
    function finite(value){if(typeof value==='number'&&!Number.isFinite(value))fail("非有限値");if(Array.isArray(value))value.forEach(finite);else if(object(value))Object.values(value).forEach(finite);}
    function validateResolved(c){
      if(!enabled(c))fail("解決済み条件には生成モデルが必要です");
      const a=c.generationResolved,s=normalize(c.generationSettings);
      if(!object(a)||a.version!==resolvedVersion||a.coefficientsVersion!==coefficientsVersion||!profiles.some(p=>p.id===a.profile)||H.stable(a.settings)!==H.stable(s))fail("解決済み条件の版/方式");
      finite(a);
      if(!Array.isArray(a.locks)||a.locks.some(p=>!paths.includes(p))||!Array.isArray(a.automatic)||a.automatic.some(p=>!paths.includes(p)||a.locks.includes(p))||!object(a.base)||!object(a.effective)||H.stable(a.effective)!==H.stable(values(c)))fail("解決済み自動/固定/実効値");
      if(Object.keys(a.base).some(p=>!paths.includes(p))||Object.keys(a.effective).some(p=>!Object.hasOwn(a.base,p))||s.locks.some(p=>!a.locks.includes(p)&&!(s.mode==='manual'&&p==='mapId'&&a.base.mapId==='auto'))||
        (s.mode==='manual'&&a.profile!=='standard')||(s.mode==='auto'&&s.profile!=='auto'&&s.profile!==a.profile))fail("解決済み指定条件");
      const reconstructed=structuredClone(c);for(const [path,value]of Object.entries(a.base))set(reconstructed,path,value);
      const expected=profileValues(reconstructed,a.profile,new Set(a.locks));
      for(const [path,value]of Object.entries(a.effective))if(!(path==='mapId'&&a.base.mapId==='auto'&&!a.locks.includes(path))&&H.stable(value)!==H.stable(get(expected,path)))fail("保存倍率/固定値の不一致: "+path);
      if(!Array.isArray(a.candidates)||!a.candidates.length||a.candidates.length>8||!Number.isSafeInteger(a.selectedAttempt)||a.selectedAttempt<0||a.selectedAttempt>=a.candidates.length)fail("有限候補の記録");
      if(a.candidates.some((v,i)=>!object(v)||v.attempt!==i||v.profile!==a.profile||typeof v.accepted!=="boolean"||!Array.isArray(v.reasons)||v.reasons.some(x=>typeof x!=="string"))||a.candidates.filter(v=>v.accepted).length!==1||!a.candidates[a.selectedAttempt].accepted||a.selectedAttempt!==a.candidates.length-1)fail("候補採否の整合");
      if(!object(a.actual)||a.actual.version!=="diverse-initial-placement/1"||typeof a.actual.hash!=="string"||!Array.isArray(a.actual.placements)||!object(a.actual.bySpecies)||a.configHash!==configHash(c))fail("初期実配置/実効条件の整合");
      const copy=structuredClone(a);delete copy.resolutionHash;if(a.resolutionHash!==digest(copy))fail("解決済み条件の指紋");
      return a;
    }
    function terrainStats(tiles){const usable=tiles.filter(t=>!t.blocked),water=usable.filter(t=>['shallow','deep'].includes(t.terrain)).length;return {usable:usable.length,water,land:usable.length-water,waterFraction:usable.length?H.round(water/usable.length):0,landFraction:usable.length?H.round((usable.length-water)/usable.length):0};}
    function compatible(profile,t){return profile!=="water-focused"&&profile!=="land-focused"||profile==="water-focused"&&t.waterFraction>=.35||profile==="land-focused"&&t.landFraction>=.70;}
    function staticChecks(w){
      // One initial spatial pass, no simulated future and no all-pairs history.
      const components=new Int32Array(w.tiles.length).fill(-1),groups=[];
      for(let start=0;start<w.tiles.length;start++)if(!w.tiles[start].blocked&&components[start]<0){
        const id=groups.length,queue=[start],group={cells:0,organisms:0,producers:0,consumers:0,organicStocks:0,mineral:0,droplet:0};components[start]=id;groups.push(group);
        for(let head=0;head<queue.length;head++){const cell=queue[head];group.cells++;const x=cell%w.config.width,y=Math.floor(cell/w.config.width);
          for(const [dx,dy]of DIRS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w.config.width||ny>=w.config.height)continue;const other=ny*w.config.width+nx;if(components[other]<0&&!w.tiles[other].blocked&&oneStep(w,cell,other)){components[other]=id;queue.push(other);}}
        }
      }
      for(const o of w.organisms){const group=groups[components[o.cell]];if(!group)throw Error("PLACEMENT_SHORTAGE: 通行不能セルへの初期配置");group.organisms++;if(spec(o).group==='plant')group.producers++;else group.consumers++;if(o.slot==='food'&&(o.E>0||edibleB(o)>0))group.organicStocks++;}
      for(const a of w.resources){const group=groups[components[a.cell]];if(group&&['mineral','droplet'].includes(a.kind))group[a.kind]++;}
      const habitats={};for(const s of activeSpecies(w).filter(s=>['plant','fungus','prey'].includes(s.group)))habitats[s.id]={eligible:w.tiles.reduce((n,_,p)=>n+Number(validHabitat(w,s,p)),0),requested:w.config.founderCounts?.species[s.id]??null,actual:w.organisms.filter(o=>o.species===s.id).reduce((n,o)=>n+ConsumerGroup.count(o),0)};
      const resourcePaths={};for(const o of w.organisms.filter(o=>o.slot==='main')){
        const g=groups[components[o.cell]],item=resourcePaths[o.species]??={subjects:0,organicReachable:0,mineralReachable:0,missingInitialOrganic:0,missingInitialMineral:0};item.subjects++;
        if(g.organicStocks>0)item.organicReachable++;else item.missingInitialOrganic++;
        if(g.mineral>0)item.mineralReachable++;else item.missingInitialMineral++;
      }
      const hosts={};if(PrimaryParasite.enabled(w))for(const [id,table]of Object.entries(PrimaryParasite.hostTable)){
        const stages=Object.fromEntries(Object.entries(table).map(([stage,ids])=>[stage,w.organisms.filter(o=>ids.includes(o.species)).length])),ps=PrimaryParasite.entries(w).filter(e=>e.p.species===id);
        hosts[id]={...stages,actualP:ps.length,terminalP:ps.filter(e=>e.p.stage==='terminal').length,currentQWindows:ps.filter(e=>e.kind==='host'&&e.p.stage==='terminal'&&Number.isInteger(e.p.matureAt)&&0-e.p.matureAt>=1&&0-e.p.matureAt<=3).length,
          futureWindowCandidates:ps.filter(e=>e.kind==='host'&&e.p.stage==='terminal'&&(e.p.matureAt===undefined||e.p.matureAt+3>=0)).length,
          reasons:[...(!stages.first?['第一宿主は初期不在']:[]),...(!stages.middle?['中間宿主は初期不在']:[]),...(!stages.terminal?['終宿主は初期不在']:[])]};
      }
      return {definition:'diverse-initial-static-checks/1',futureTurns:0,status:'initial-placement-only',resourcePathMeaning:'同じ通行連結成分の初期在庫。将来の採食/到達/成熟/生存の保証ではありません。固定0と自動寄生不足を救済しません。',capacity:{mainRequested:w.config.initial,mainSlots:groups.reduce((n,g)=>n+g.cells,0),foodOccupied:w.organisms.filter(o=>o.slot==='food').length},habitats,components:groups,resourcePaths,hosts,
        parasiteShortage:{P:w.config.primaryParasiteInitial?.shortage??null,Q:w.config.hyperParasiteInitial?.shortage??null}};
    }
    function actual(w){
      const placements=w.organisms.map(o=>({id:o.id,species:o.species,cell:o.cell,slot:o.slot,phase:o.phase,age:o.age,sex:o.sex??null}));
      if(PrimaryParasite.enabled(w))for(const e of PrimaryParasite.entries(w))placements.push({id:e.p.id,species:e.p.species,cell:e.cell,hostId:e.p.hostId,phase:e.p.phase,age:e.p.age,stage:e.p.stage});
      else for(const h of w.organisms)if(h.infection)placements.push({id:h.infection.id,species:h.infection.species,cell:h.cell,hostId:h.id,stage:h.infection.stage});
      if(HyperParasite.enabled(w))for(const e of HyperParasite.entries(w))placements.push({id:e.q.id,species:e.q.species,cell:e.cell,hostId:e.q.hostId,phase:e.q.phase,age:e.q.age,state:e.q.hyper.state});
      else{for(const h of w.organisms)if(h.infection?.q)placements.push({id:h.infection.q.id,species:"hyperparasite",cell:h.cell,hostId:h.infection.id,phase:h.infection.q.phase});for(const q of w.searchQ||[])placements.push({id:q.id,species:"hyperparasite",cell:q.cell,phase:q.phase});}
      for(const placement of placements)for(const key of Object.keys(placement))if(placement[key]===undefined)delete placement[key];
      placements.sort((a,b)=>H.compare(a.id,b.id));
      const bySpecies={};for(const p of placements)bySpecies[p.species]=(bySpecies[p.species]||0)+1;
      return {version:"diverse-initial-placement/1",bySpecies,placements,terrain:{...terrainStats(w.tiles),map:w.config.mapResolved??null},resources:Object.fromEntries(['mineral','droplet','info'].map(k=>[k,w.resources.filter(a=>a.kind===k).length])),
        parasites:{P:w.config.primaryParasiteInitial??null,Q:w.config.hyperParasiteInitial??null},warnings:[...w.warnings],reserves:totals(w),
        hash:digest({tiles:w.tiles,organisms:w.organisms,resources:w.resources,carcasses:w.carcasses,pending:w.pending,primaryInocula:w.primaryInocula??null,hyperInocula:w.hyperInocula??null,searchQ:w.searchQ??null,informationField:w.informationField??null,ledger:w.ledger})};
    }
    function profileValues(base,profile,locks){
      const c=structuredClone(base),change=(p,m)=>{if(!locks.has(p)&&typeof get(c,p)==='number')set(c,p,H.round(get(base,p)*m));};
      if(profile==='high-production'){for(const r of ['land','water']){change('producerSettings.'+r+'.capacityB',1.5);change('producerSettings.'+r+'.regrowthB',1.25);}if(!locks.has('initial')&&c.enabled.main)c.initial=Math.max(4,Math.round(base.initial*1.2/4)*4);}
      if(profile==='resource-localized'){for(const r of ['land','water']){change('producerSettings.'+r+'.occupancy',.6);change('producerSettings.'+r+'.capacityB',1.5);}if(!locks.has('initialConditions.distribution'))c.initialConditions.distribution='cluster';}
      if(profile==='water-focused')change('producerSettings.water.capacityB',1.25);
      if(profile==='land-focused')change('producerSettings.land.capacityB',1.25);
      if(profile==='information-strong')change('informationSettings.influence',1.25);
      return c;
    }
    function create(input){
      if(input.generationResolved!==undefined){
        const saved=validateResolved(input),request=structuredClone(input);delete request.generationResolved;
        const w=createBase(request);if(H.stable(actual(w))!==H.stable(saved.actual)||configHash(w.config)!==saved.configHash)fail("保存した初期実配置を再現できません");
        w.config.generationResolved=structuredClone(saved);return w;
      }
      const original=structuredClone(input),settings=normalize(input.generationSettings);
      // A preset is a fixed contract. Explicit disabled groups cannot be silently enabled.
      if(input.observationMode&&input.observationMode!=='custom'){
        const preset=observationPreset(input.observationMode,input.width??80,input.height??56);
        if(Object.entries(input.enabled??{}).some(([k,v])=>v!==preset.enabled[k]))fail("固定観察モードと生物群の指定が矛盾しています");
        for(const path of ['initial','mapId']){
          const value=get(input,path),explicitLock=settings.locks.includes(path),manualLock=settings.mode==='manual'&&!(path==='mapId'&&value==='auto');
          if(value!==undefined&&(explicitLock||manualLock)&&H.stable(value)!==H.stable(preset[path]))fail("固定観察モードと固定項目が矛盾しています: "+path);
        }
      }
      const base=validate({...input,generationSettings:settings});
      if(!base.initialConditions)base.initialConditions={version:1,density:{plant:.35*(base.initialFoodScale||1),fungus:.03*(base.initialFoodScale||1),prey:.1*(base.initialFoodScale||1)},resources:{mineral:1,droplet:1,info:PersistentInformation.enabled({config:base})?0:1},distribution:'habitat'};
      const locks=new Set(settings.mode==='manual'?paths.filter(p=>get(base,p)!==undefined&&!(p==='mapId'&&base.mapId==='auto')):settings.locks);
      for(const p of paths)if(get(original,p)===0)locks.add(p);
      if(base.observationMode&&base.observationMode!=='custom')for(const p of ['mapId','initial'])locks.add(p);
      // A specific map is always a manual choice, even without a UI checkbox.
      if(base.mapId&&base.mapId!=='auto')locks.add('mapId');
      const fixedMap=base.landscape==='templates'&&(locks.has('mapId')||base.mapResolved),fixedTerrain=fixedMap?Landscape.templates.resolve(base,D,H):null;
      let eligible=profiles.filter(p=>!fixedTerrain||compatible(p.id,terrainStats(fixedTerrain.tiles)));
      const profile=settings.mode==='manual'?'standard':settings.profile==='auto'?eligible[Math.floor(H.random(base.seed,'generation/profile')*eligible.length)].id:settings.profile;
      if(!eligible.some(p=>p.id===profile)&&settings.mode!=='manual')fail("固定地形がプロファイルの陸水条件を満たしません");
      const templateOrder=Landscape.templates.list().map(m=>m.id).sort((a,b)=>H.hash(base.terrainSeed??base.seed,'generation/map',0,a)-H.hash(base.terrainSeed??base.seed,'generation/map',0,b)||H.compare(a,b));
      const candidates=[];
      for(let attempt=0;attempt<8;attempt++){
        const c=profileValues(base,profile,locks),entry={attempt,profile,mapId:c.mapId??null,terrainSeed:c.terrainSeed??null,accepted:false,reasons:[]};c.generationSettings=settings;
        if(c.landscape==='templates'&&!fixedMap){c.mapId=templateOrder[attempt%templateOrder.length];c.terrainSeed=(base.terrainSeed??base.seed)+(attempt>=templateOrder.length?'::generation:'+attempt:'');delete c.mapResolved;entry.mapId=c.mapId;entry.terrainSeed=c.terrainSeed;}
        candidates.push(entry);
        try{
          if(c.landscape==='templates'){
            const map=fixedTerrain??Landscape.templates.resolve(c,D,H);entry.terrain=terrainStats(map.tiles);entry.map=map.metadata;
            if(!compatible(profile,entry.terrain))throw Error("PROFILE_TERRAIN: 必要な陸水比率を満たしません");
          }
          const w=createBase(c),terrain=terrainStats(w.tiles);entry.terrain=terrain;
          if(!compatible(profile,terrain))throw Error("PROFILE_TERRAIN: 必要な陸水比率を満たしません");
          const initial=actual(w);entry.checks=staticChecks(w);entry.accepted=true;entry.warnings=[...w.warnings];
          const effective=values(w.config),resolution={version:resolvedVersion,coefficientsVersion,settings:structuredClone(settings),profile,locks:[...locks].sort(),automatic:paths.filter(p=>get(base,p)!==undefined&&!locks.has(p)),base:values(base),effective,
            protected:['enabled','selected','weights','lineages','placement','distribution','guarantee','producerSupport','advantageSettings','founderCounts','observationMode'].filter(k=>base[k]!==undefined),candidates,selectedAttempt:attempt,actual:initial,configHash:configHash(w.config)};
          resolution.resolutionHash=digest(resolution);w.config.generationResolved=resolution;return w;
        }catch(error){entry.reasons.push(String(error.message));if(!/^(MAP_INVALID|PLACEMENT_SHORTAGE|GUARANTEE_FAILED|PROFILE_TERRAIN):/.test(error.message)||fixedMap||base.landscape!=='templates')break;}
      }
      const error=Error("GENERATION_FAILED: 最大8候補以内で初期条件が成立しません（"+candidates.map(a=>a.reasons.join('、')).join(' / ')+"）");error.generationCandidates=candidates;throw error;
    }
    return {version,profiles,paths,normalize,enabled,validateConfig,validateResolved,create};
  })();
  const ageFactors = Object.freeze({
    juvenile:Object.freeze({attack:.65,defense:.75,hp:.70,move:1.10,maintenance:.80,healing:1.10,birth:1,light:.65}),
    adult:Object.freeze({attack:1,defense:1,hp:1,move:1,maintenance:1,healing:1,birth:1,light:1}),
    elderly:Object.freeze({attack:.85,defense:.90,hp:.90,move:1.15,maintenance:1.05,healing:.80,birth:1.25,light:.85}),
    precocial:Object.freeze({attack:.90,defense:.95,hp:.90,move:1,maintenance:.90,healing:1,birth:1,light:.65}),
  });
  function ageInfo(o) {
    if(CellLife.is(o)&&o.cellLife.kind==="plant"){const a=CellLife.age(o);return {enabled:true,applicable:true,stage:a.stage,matureAt:40,elderlyAt:.8*o.birthLife,birthLife:o.birthLife,factors:{...ageFactors.adult,light:a.production,maintenance:a.maintenance}};}
    if(ConsumerGroup.is(o))return {enabled:false,applicable:true,stage:'adult',factors:ConsumerGroup.factors(o)};
    if (Colony.is(o)||FungalColony.is(o)) return {enabled:false,applicable:false,stage:"adult",factors:ageFactors.adult};
    if (!Number.isFinite(o.birthLife)) return {enabled:false,stage:"adult",factors:ageFactors.adult};
    const s=spec(o),matureAt=s.group==="main"?Math.ceil(o.birthLife*(s.id==="precocial"?.03:s.id==="swarm"&&o.role==="queen"?1/30:.10)):s.maturity,
      elderlyAt=Math.max(matureAt+1,Math.floor(.75*o.birthLife)),
      stage=o.age<matureAt?"juvenile":o.age<elderlyAt?"adult":"elderly";
    return {enabled:true,stage,matureAt,elderlyAt,birthLife:o.birthLife,
      factors:ageFactors[stage==="juvenile"&&s.id==="precocial"?"precocial":stage]};
  }
  function initializeAge(w,o,initialFraction=null) {
    if(Ryouki.is(o)){
      o.birthLife=Math.floor(D.ryouki.life*(.95+.1*o.dna.skin));
      if(initialFraction!==null)o.age=Math.floor(o.birthLife*initialFraction);
      o.HP=H.round(Math.min(o.HP,Ryouki.phenotype(w,o).maxHP));return o;
    }
    if(LargePlant.is(o)){
      o.birthLife=spec(o).life;const a=ageInfo(o);o.HP=H.round(Math.min(o.HP,spec(o).capacity[3]*a.factors.hp));return o;
    }
    if(ConsumerGroup.is(o)||Colony.is(o)||FungalColony.is(o)){delete o.birthLife;return o;}
    if(w.config.ageModel!=="life/1")return o;
    const s=spec(o);
    if(["P","Q"].includes(s.group))return o;
    o.birthLife=s.group==="main"?Math.floor(s.life*(.95+.1*o.dna.skin)*(s.id==="swarm"&&o.role==="queen"?3:1)):s.life;
    if(initialFraction!==null)o.age=Math.floor(o.birthLife*initialFraction);
    const a=ageInfo(o);
    if(!(0<a.matureAt&&a.matureAt<a.elderlyAt&&a.elderlyAt<o.birthLife))throw Error("AGE_INVALID: "+s.id);
    o.HP=H.round(Math.min(o.HP,Math.max(1,(s.group==="main"?100:s.capacity[3])*a.factors.hp)));
    return o;
  }
  function settleAge(w,ctx) {
    if(w.config.ageModel!=="life/1")return;
    ctx.ageCapacityLoss=0;
    for(const o of w.organisms){
      if(o.HP<=0)continue;
      const maximum=phenotype(w,o).maxHP;
      if(o.HP>maximum){ctx.ageCapacityLoss=H.round(ctx.ageCapacityLoss+o.HP-maximum);o.HP=maximum;}
    }
  }
  function organism(w, s, cell, id, options = {}) {
    const main = s.group === "main",
      u = {};
    DNA.forEach(
      (axis, i) =>
        (u[axis] = main || (LargePlant.enabled(w)&&LargePlant.definition(s)) ? 0.25 + 0.5 * r(w, "init/dna", 0, id, null, i) : 0.5),
    );
    const [E, B, M, HP] = main ? [60, 16, 0, 100] : s.initial;
    const birth = main
      ? s.weights.map((v, i) =>
          H.round(
            H.clamp(v + 8 * r(w, "init/weights", 0, id, null, i) - 4, 0, 100),
          ),
        )
      : null;
    const o = {
      id,
      species: s.id,
      slot: s.slot,
      cell,
      age: 0,
      phase: 1,
      E,
      B,
      M,
      HP,
      G: 0,
      dna: u,
      sex: main ? "female" : null,
      role: null,
      colony: null,
      founder: null,
      generation: 0,
      parents: [],
      birthWeights: birth,
      weights: birth && birth.slice(),
      facing: Math.floor(r(w, "init/facing", 0, id) * 8),
      branch3: null,
      branch4: null,
      counters: [0, 0, 0],
      ivCounters: [0, 0],
      history: [cell],
      site: null,
      pendingMove: null,
      survival: null,
      habitatRun: 0,
      habitatEnv: null,
      seen: [],
      birthReady: 0,
      attackReady: 0,
      contactReady: 0,
      infoReady: 0,
      maleAbsent: 0,
      infection: null,
      ...options,
    };
    Ryouki.attach(w,o,options);
    LargePlant.attach(w,o,options);
    Colony.attach(w,o,options.colonyOrigin || {kind:"initial"});
    FungalColony.attach(w,o,options.colonyOrigin || {kind:"initial"});
    if(Colony.is(o)&&!Object.hasOwn(options,"B"))o.B=H.round(PLANT_BASE+o.colony.capacityB*Colony.parameters(w,cell).initialFraction);
    delete o.colonyOrigin;
    delete o.plantOrigin;

    // Only initial main founders receive a mixed age cohort. Births and explicit
    // ages retain their own clocks, and evolution phase is independent of age.
    const initialFraction=w.turn===0&&["survival/2","survival/3","survival/4"].includes(w.config.balanceModel)&&w.config.ageModel==="life/1"&&main&&
      id.startsWith("i:main:")&&!Object.hasOwn(options,"age")?r(w,"init/main-age",0,id)*.5:null;
    initializeAge(w,o,initialFraction);ConsumerGroup.attach(w,o);
    CellLife.attach(w,o,options);
    return PersistentInformation.attach(w,o);
  }
  function phenotype(w, o, phase = o.phase, branch = o.branch4) {
    if(CellLife.is(o))return CellLife.phenotype(w,o,phase,branch);
    if(Ryouki.is(o))return Ryouki.phenotype(w,o,phase,branch);
    if(LargePlant.is(o))return LargePlant.phenotype(w,o,phase,branch);
    const s = spec(o),
      main = s.group === "main",
      u = main ? phase / 4 : 0,
      tr = s.traits || {},
      skin = o.dna.skin,
      body = o.dna.body;
    const base = {
      phase,
      u,
      capE: main ? 100 + (tr.capacity || 0) * u : s.capacity[0],
      capB: Colony.is(o)||FungalColony.is(o) ? o.colony.baseB+o.colony.capacityB : main ? 32 : s.capacity[1],
      capM: main ? 30 : 2,
      maxHP: main ? 100 : s.capacity[3],
      life: main
        ? Math.floor(
            s.life *
              (0.95 + 0.1 * skin) *
              (s.id === "precocial"
                ? [0, 1, 1.15, 1.4][phase]
                : [0, 1, 1.1, 1.25, 1.4][phase]),
          )
        : s.life,
      maintenance:
        (FungalColony.is(o)?(edibleB(o)>0?w.config.fungalColonySettings.maintenance:w.config.fungalColonySettings.dormantMaintenance):s.maintenance) *
        (main
          ? (0.95 + 0.1 * body) *
            (s.id === "precocial"
              ? [0, 1, 0.95, 0.9][phase]
              : [0, 1, 0.98, 0.95, 0.9][phase]) *
            (1 + (tr.maintenance || 0) * u)
          : 1),
      sense: main
        ? s.id === "manyeyes"
          ? phase >= 3
            ? 3
            : 2
          : phase >= s.senseAt
            ? 2
            : 1
        : 1,
      speed: main ? (phase >= s.speedAt ? 2 : 1) : s.group === "prey" ? 1 : 0,
      range: main && phase >= s.rangeAt ? 2 : 1,
      cooldown: main
        ? Math.max(
            4,
            Math.ceil(
              s.birthCooldown * (0.95 + 0.1 * body) * (phase === 4 ? 0.85 : 1),
            ),
          )
        : s.birthCooldown,
      M3: main ? s.M3 * (0.95 + 0.1 * skin) : 0,
      M4: main ? s.M4 * (0.95 + 0.1 * skin) : 0,
      branch,
    };
    if(ConsumerGroup.is(o)){const n=ConsumerGroup.count(o);for(const k of ["capE","capB","capM","maxHP","maintenance"])base[k]*=n;base.members=n;}
    if(s.id==="swarm"&&w.config.socialRenewalModel==="successor/1")base.maintenance*=.45;
    const a=ageInfo(o),f=a.factors;
    return {...base,life:s.id==="swarm"&&o.role==="queen"?(a.enabled?o.birthLife:base.life*3):base.life,ageEnabled:a.enabled,ageStage:a.stage,ageFactors:f,
      baseMaxHP:base.maxHP,baseMaintenance:base.maintenance,baseCooldown:base.cooldown,
      maxHP:H.round(Math.max(1,base.maxHP*f.hp)),maintenance:base.maintenance*f.maintenance,
      cooldown:base.cooldown*f.birth};
  }
  function trait(o, name, phase = o.phase) {
    return ((spec(o).traits?.[name] || 0) * phase) / 4;
  }
  function adjustment(w, o, key, env, phase = o.phase) {
    const s = spec(o),
      t = s.traits || {},
      u = phase / 4;
    let out = 1 + (typeof t[key] === "number" ? t[key] * u : 0);
    const e = t[key + "Env"];
    if (e && e[0] === env) out *= 1 + e[1] * u;
    const es = t[key + "Envs"];
    if (es && es[0].includes(env)) out *= 1 + es[1] * u;
    return out;
  }
  function totals(w) {
    let E = 0,
      M = 0;
    const infection = (p) => {
      if (p) {
        E += p.E+(PrimaryParasite.enabled(w)&&PrimaryParasite.is(p)?p.B:0);
        if (p.q) E += p.q.E+(HyperParasite.enabled(w)&&HyperParasite.is(p.q)?p.q.B:0);
      }
    };
    for (const o of w.organisms) {
      E += o.E + o.B;
      if(Colony.is(o))E += o.colony.edibleExposure?.E || 0;
      M += o.M;
      if(CellSpace.enabled(w))M+=o.cellMatter?.bodyM||0;
      infection(o.infection);
    }
    for (const a of w.resources) {
      E += a.E || 0;
      M += a.M || 0;
    }
    for (const a of w.carcasses) {
      E += a.E;
      M += a.M;
      infection(a.infection);
    }
    for (const a of w.pending) infection(a.infection);
    for (const q of w.searchQ || []) E += q.E+(HyperParasite.enabled(w)&&HyperParasite.is(q)?q.B:0);
    if(PrimaryParasite.enabled(w))for(const i of w.primaryInocula||[])E+=i.E;
    if(HyperParasite.enabled(w))for(const i of w.hyperInocula||[])E+=i.E;
    for (const t of w.tiles) M += t.soilM;
    if(CellSpace.enabled(w))for(const material of [...w.cellState.nextMaterial,...w.cellState.organic]){E+=material.E;M+=material.M;}
    return { E: H.round(E), M: H.round(M) };
  }
  function addSoil(w, cell, m) {
    if(CellSpace.enabled(w))return CellSpace.deferMaterial(w,cell,{M:m,kind:"mineral"});
    const tile = w.tiles[cell],
      added = Math.min(m, 20 - tile.soilM);
    tile.soilM = H.round(tile.soilM + added);
    w.ledger.Mloss = H.round(w.ledger.Mloss + m - added);
  }
  function dissipate(w, e) {
    w.ledger.sinks = H.round(w.ledger.sinks + e);
  }
  function create(input = {}) {
    if(input.generationModel!==undefined||input.generationSettings!==undefined||input.generationResolved!==undefined){
      if(input.generationModel!=="diverse/1")throw Error("GENERATION_INVALID: 生成モデルの版/指定");
      return WorldGeneration.create(input);
    }
    return createBase(input);
  }
  function createBase(input = {}) {
    const config = validate(input),
      w = {
        version: H.VERSION,
        config,
        turn: 0,
        tiles: [],
        organisms: [],
        resources: [],
        carcasses: [],
        pending: [],
        messages: [],
        events: [],
        checkpoints: [],
        stats: null,
        initialMain: config.initial,
        blockEnd: config.blockTurns || 1000,
        extinctNotified: false,
        warnings: [],
        ledger: { initialE: 0, solar: 0, sinks: 0, initialM: 0, Mloss: 0 },
      };
    const n = config.width * config.height;
    if (config.landscape !== "templates") {
    const points = [], rotation = Math.floor(r(w, "world/env") * 8);
    for (let y = 0; y < config.height; y += 8)
      for (let x = 0; x < config.width; x += 8) {
        const id = points.length;
        points.push({
          x:
            x +
            Math.floor(
              r(w, "world/point", 0, String(id), null, 0) *
                Math.min(8, config.width - x),
            ),
          y:
            y +
            Math.floor(
              r(w, "world/point", 0, String(id), null, 1) *
                Math.min(8, config.height - y),
            ),
          env: (id + rotation) % 8,
        });
      }
    for (let p = 0; p < n; p++) {
      const [x, y] = xy(w, p);
      let nearest = points[0],
        best = Infinity;
      for (const point of points) {
        const d = (x - point.x) ** 2 + (y - point.y) ** 2;
        if (d < best) {
          best = d;
          nearest = point;
        }
      }
      const env = nearest.env,
        e = D.environments[env],
        u = r(w, "world/terrain", 0, null, [x, y]),
        v = r(w, "world/cover", 0, null, [x, y]);
      let terrain = e.terrain[0];
      for (let j = 0; j < e.terrain.length; j += 2)
        if (u < e.terrain[j + 1]) {
          terrain = e.terrain[j];
          break;
        }
      const cover =
        v < 0.03 ? "boulder" : v < 0.07 ? "log" : v < 0.13 ? "bush" : "none";
      w.tiles.push({
        env,
        terrain,
        cover,
        blocked: cover === "boulder",
        light:
          cover === "boulder"
            ? 0
            : H.round(
                e.light *
                  (cover === "log" ? 0.8 : cover === "bush" ? 0.7 : 1) *
                  (terrain === "deep" ? 0.6 : 1),
              ),
        walls: [],
        soilM: 5,
      });
    }
    }
    if(config.landscape === "watershed") { w.tiles=[]; Landscape.generate(w,config,D,H,r,xy); }
    if(config.landscape === "templates") {
      const resolved=Landscape.templates.resolve(config,D,H);
      w.tiles=resolved.tiles; config.mapResolved=resolved.metadata;
      if(resolved.metadata.fallback)w.warnings.push("地形候補が主要経路を妨げるため、安全な既定配置を使いました。");
    }
    for (let p = 0; config.landscape !== "templates" && p < n; p++) {
      const [x, y] = xy(w, p);
      for (const q of [
        x + 1 < config.width ? p + 1 : -1,
        y + 1 < config.height ? p + config.width : -1,
      ])
        if (q >= 0 && r(w, "world/edge", 0, null, [p, q]) < 0.02) {
          w.tiles[p].walls.push(q);
          w.tiles[q].walls.push(p);
        }
    }
    const colonyPlants = Colony.enabled(w) && config.enabled.plant;
    if(colonyPlants)config.enabled.plant=false;
    const usable = w.tiles
        .map((t, i) => (!t.blocked ? i : -1))
        .filter((i) => i >= 0),
      occupied = new Set();
    // Allocate within each group only; habitat shortages may use another enabled member.
    for (const [group, rate] of [
      ["plant", 0.35],
      ["fungus", 0.03],
      ["prey", 0.1],
    ])
      if (config.enabled[group]) {
        const species = D.species.filter((s) => s.group === group),
          target = Math.round(usable.length * (config.initialConditions?.density[group] ?? rate * (config.initialFoodScale || 1))),
          base = Math.floor(target / species.length),
          tasks = species.map((s, i) => ({
            s,
            count: config.founderCounts?.species[s.id] ?? (base + (i < target % species.length ? 1 : 0)),
            exact: Object.hasOwn(config.founderCounts?.species||{},s.id),
          }));
        let deficit = 0;
        function place(s, count) {
          const candidates = usable
            .filter((p) => !occupied.has(p) && validHabitat(w, s, p))
            .map((p) => ({ p, h: initialRank(w,s,p) }))
            .sort((a, b) => a.h - b.h || a.p - b.p);
          let placed = 0;
          for (const { p } of candidates.slice(0, count)) {
            w.organisms.push(
              organism(
                w,
                s,
                p,
                "i:food:" +
                  Math.floor(p / config.width) +
                  ":" +
                  (p % config.width) +
                  ":" +
                  s.id,
              ),
            );
            occupied.add(p);
            placed++;
          }
          return count - placed;
        }
        for (const task of tasks) {const left=place(task.s, task.count);if(task.exact&&left)throw Error("PLACEMENT_SHORTAGE: "+task.s.name+" 指定"+task.count+"体の適地/空き枠が不足しています");deficit+=left;}
        for (const task of tasks) if (deficit&&!task.exact) deficit = place(task.s, deficit);
        if (deficit)
          throw Error("PLACEMENT_SHORTAGE: " + group + " " + deficit);
      }
    let mains =
      config.lineages === "manual"
        ? config.selected.map((id) => D.byId[id])
        : Ryouki.enabled(w) ? [...D.main.slice(0,20),D.ryouki] : D.main.slice(0, 20);
    if(colonyPlants)config.enabled.plant=true;
    Colony.initialize(w);
    if (!config.enabled.main) mains = [];
    if(Ryouki.enabled(w)&&config.distribution==="weighted"&&config.weights.ryouki===0)mains=mains.filter(s=>s.id!=="ryouki");
    if (config.lineages === "few")
      mains = mains
        .map((s) => ({ s, h: hash(w, "init/group", 0, s.id) }))
        .sort((a, b) => a.h - b.h)
        .slice(0, 5)
        .map((x) => x.s);
    if (
      config.enabled.main &&
      (!mains.length || config.initial < 4 * mains.length)
    )
      throw Error("SETTINGS_INVALID: 系統ごとに最低4体が必要です");
    if (config.initial > usable.length) throw Error("PLACEMENT_SHORTAGE: 主枠");
    const mainTaken = new Set(),
      foodMap = new Map(w.organisms.map((o) => [o.cell, o])),
      batches = mains.map((s) => ({
        s,
        groups: 1,
        weight:
          config.distribution === "weighted" ? config.weights[s.id] || 1 : 1,
      }));
    let remaining = config.initial / 4 - batches.length,
      totalWeight = batches.reduce((a, x) => a + x.weight, 0);
    if (config.initial) {
      let used = 0;
      const extras = batches
        .map((x) => {
          const raw = (remaining * x.weight) / totalWeight,
            whole = Math.floor(raw);
          x.groups += whole;
          used += whole;
          return {
            x,
            fraction: raw - whole,
            h: hash(w, "init/apportion", 0, x.s.id),
          };
        })
        .sort((a, b) => b.fraction - a.fraction || a.h - b.h);
      for (let j = 0; j < remaining - used; j++) extras[j].x.groups++;
    }
    const nearestDistance = new Float64Array(n).fill(Infinity);
    for (const batch of batches) {
      const s = batch.s,
        center =
          usable[Math.floor(r(w, "init/center", 0, s.id) * usable.length)],
        candidates = usable
          .map((p) => {
            const env = w.tiles[p].env,
              fit = s.good.includes(env) ? 2 : env === s.bad ? 0 : 1,
              food = nearby(w, p, 2, true).filter((q) =>
                ["plant", "fungus"].includes(
                  spec(foodMap.get(q) || { species: "tideparasite" }).group,
                ),
              ).length;
            return {
              p,
              fit,
              score: fit * (1 + Math.min(0.8, 0.1 * food)),
              h: hash(w, "init/main-position", 0, s.id, p),
            };
          })
          .sort((a, b) =>
            config.placement === "cluster"
              ? distance(w, a.p, center) - distance(w, b.p, center) ||
                b.fit - a.fit ||
                a.h - b.h
              : b.score - a.score || a.h - b.h,
          );
      let cursor = 0,
        cohort = [];
      const ranks = new Map(candidates.map((c) => [c.p, c]));
      function naturalCohort(spaced) {
        for (const anchor of candidates) {
          if (mainTaken.has(anchor.p)) continue;
          if (spaced && nearby(w, anchor.p, 2).some((p) => mainTaken.has(p)))
            continue;
          const neighbors = nearby(w, anchor.p)
            .filter((p) => !mainTaken.has(p) && oneStep(w, anchor.p, p))
            .map((p) => ranks.get(p))
            .filter(Boolean)
            .sort((a, b) => b.score - a.score || a.h - b.h);
          if (neighbors.length >= 3)
            return [anchor.p, ...neighbors.slice(0, 3).map((c) => c.p)];
        }
        return null;
      }
      for (let j = 0; j < batch.groups * 4; j++) {
        let p;
        if (config.placement === "natural") {
          if (!cohort.length)
            cohort =
              naturalCohort(true) ||
              naturalCohort(false) ||
              (WorldGeneration.enabled(config)?(()=>{throw Error("PLACEMENT_SHORTAGE: 連結した4体集団の主枠");})():null) ||
              candidates
                .filter((c) => !mainTaken.has(c.p))
                .slice(0, 4)
                .map((c) => c.p);
          p = cohort.shift();
        } else if (config.placement === "scatter") {
          let chosen = null;
          for (const c of candidates)
            if (
              !mainTaken.has(c.p) &&
              (!chosen || nearestDistance[c.p] > nearestDistance[chosen.p])
            )
              chosen = c;
          p = chosen.p;
        } else {
          while (mainTaken.has(candidates[cursor].p)) cursor++;
          p = candidates[cursor++].p;
        }
        mainTaken.add(p);
        if (config.placement === "scatter")
          for (const q of usable)
            nearestDistance[q] = Math.min(
              nearestDistance[q],
              distance(w, p, q),
            );
        const [x, y] = xy(w, p),
          id = "i:main:" + y + ":" + x + ":" + s.id,
          sex = j % 4 < 2 ? "male" : "female",
          group = "founder:" + s.id + ":" + Math.floor(j / 4);
        w.organisms.push(
          organism(w, s, p, id, {
            sex,
            role:
              s.id === "swarm"
                ? j % 4 === 2
                  ? "queen"
                  : j % 4 === 3
                    ? "worker"
                    : "male"
                : null,
            colony: s.id === "swarm" ? group : null,
            founder: s.id === "swarm" ? group : null,
            B: s.id === "ryouki" ? 8 : s.id === "swarm" && j % 4 === 3 ? 8 : 16,
          }),
        );
      }
    }
    LargePlant.initialize(w);
    for (const kind of ["mineral", "droplet", "info"]) {
      if(kind==="info"&&PersistentInformation.enabled(w))continue;
      const target = usable.filter(
        (p) =>
          r(w, "init/resource-count", 0, kind, p) < (config.initialConditions?.resources[kind] ?? 1) *
          (kind === "info"
            ? 0.02
            : kind === "mineral"
              ? w.tiles[p].terrain === "rock"
                ? 0.2
                : 0.03
              : ["shallow", "mud"].includes(w.tiles[p].terrain)
                ? 0.2
                : 0.02),
      ).length;
      let left = target;
      const cost = kind === "mineral" ? 4 : kind === "droplet" ? 2 : 0,
        taken = new Set();
      const blocks = usable
        .filter((p) => {
          const [x, y] = xy(w, p);
          return x + 1 < config.width && y + 1 < config.height;
        })
        .map((p) => ({
          p,
          h: hash(w, "init/resource-block", 0, kind, p),
          fit:
            kind === "mineral"
              ? w.tiles[p].terrain === "rock"
                ? 2
                : 1
              : kind === "droplet"
                ? ["shallow", "mud"].includes(w.tiles[p].terrain)
                  ? 2
                  : 1
                : 1,
        }))
        .sort((a, b) => b.fit - a.fit || a.h - b.h);
      const put = (p) => {
        if (
          taken.has(p) ||
          w.tiles[p].blocked ||
          w.tiles[p].soilM < cost ||
          w.resources.filter((a) => a.cell === p).length >= 3
        )
          return false;
        w.tiles[p].soilM -= cost;
        w.resources.push({
          cell: p,
          kind,
          q: 2,
          E: kind === "info" ? 0.1 : 0,
          M: cost,
          G: 0,
          created: 0,
          expires: kind === "info" ? 20 : null,
          event: null,
        });
        taken.add(p);
        left--;
        return true;
      };
      for (const { p } of blocks) {
        if (left < 4) break;
        const cells = [p, p + 1, p + config.width, p + config.width + 1];
        if (
          cells.every(
            (q) =>
              !taken.has(q) &&
              !w.tiles[q].blocked &&
              w.tiles[q].soilM >= cost &&
              w.resources.filter((a) => a.cell === q).length < 3,
          )
        )
          cells.forEach(put);
      }
      for (const p of usable) if (left && !taken.has(p)) put(p);
      if (left) throw Error("PLACEMENT_SHORTAGE: 初期資源 " + kind);
    }
    if (config.guarantee && config.initial) {
      let m = maps(w);
      for (const s of mains) {
        const members = w.organisms.filter((o) => o.species === s.id);
        for (let j = 0; j < members.length; j += 4) {
          const root = members[j],
            places = nearby(w, root.cell, 2, true).filter((p) =>
              sight(w, root.cell, p),
            );
          const food = places.some((p) => {
            const o = m.food.get(p);
            return o && ["plant", "fungus"].includes(spec(o).group);
          });
          if (!food) {
            let done = false;
            for (const p of places)
              if (!done && !m.food.has(p))
                for (const f of D.species.filter(
                  (f) =>
                    ["plant", "fungus"].includes(f.group) &&
                    config.enabled[f.group],
                ))
                  if (validHabitat(w, f, p) && (!Colony.enabled(w) || f.group !== "plant" ||
                      (Colony.allowed(w,f) && Colony.room(w,p)))) {
                    const o = organism(
                      w,
                      f,
                      p,
                      "i:guarantee:" + p + ":" + f.id,
                    );
                    w.organisms.push(o);
                    m.food.set(p, o);
                    done = true;
                    break;
                  }
            if (!done) throw Error("GUARANTEE_FAILED: 可食餌");
          }
          if (
            !places.some((p) =>
              (m.resources.get(p) || []).some(
                (a) => FOOD[a.kind].tag === "mineral",
              ),
            )
          ) {
            const p = places.find(
              (p) =>
                !w.tiles[p].blocked &&
                (m.resources.get(p) || []).length < 3 &&
                w.tiles[p].soilM >= 4,
            );
            if (p === undefined) throw Error("GUARANTEE_FAILED: 鉱物");
            w.tiles[p].soilM -= 4;
            const a = {
              cell: p,
              kind: "mineral",
              q: 2,
              E: 0,
              M: 4,
              G: 0,
              created: 0,
              expires: null,
              event: null,
            };
            w.resources.push(a);
            m = maps(w);
          }
        }
      }
    }
    if(config.ecologyRevision === "observation/4.1")for(const o of w.organisms)if(o.slot === "food"){o.age=Math.floor(r(w,"init/food-age",0,o.id)*spec(o).life*.5);if(o.age>=spec(o).maturity)o.phase=2;}
    if(Colony.enabled(w))for(const o of w.organisms)if(Colony.is(o)){o.age=0;o.phase=1;}
    if(FungalColony.enabled(w))for(const o of w.organisms)if(FungalColony.is(o)){o.age=0;o.phase=1;}
    if(LargePlant.enabled(w))for(const o of w.organisms)if(LargePlant.is(o)){o.age=Math.floor(o.birthLife*config.largePlantSettings.initial.ageFraction);o.phase=config.largePlantSettings.initial.phase;}
    if (config.enabled.P && !PrimaryParasite.enabled(w))
      for (const o of w.organisms)
        if (
          ["algae", "grass"].includes(o.species) &&
          !Object.hasOwn(config.founderCounts?.parasites||{},o.species === "algae" ? "tideparasite" : "leafparasite") &&
          r(w, "init/infection", 0, o.id) < 0.05
        ) {
          o.infection = infection(
            w,
            o.species === "algae" ? "tideparasite" : "leafparasite",
            o.id,
            0,
          );
          if (config.ecologyRevision !== "observation/4.1" && config.enabled.Q && r(w, "init/hyper", 0, o.id) < 0.01)
            o.infection.q = hyper(w, o.infection.id, 0);
        }
    for(const [id,count]of Object.entries(config.founderCounts?.parasites||{}))if(!PrimaryParasite.enabled(w)&&["tideparasite","leafparasite"].includes(id)){
      const hostSpecies=id==="tideparasite"?"algae":"grass",hosts=w.organisms.filter(o=>o.species===hostSpecies&&!o.infection).sort((a,b)=>hash(w,"init/manual-P",0,id,a.id)-hash(w,"init/manual-P",0,id,b.id)||a.id.localeCompare(b.id));
      if(hosts.length<count)throw Error("PLACEMENT_SHORTAGE: "+D.byId[id].name+" 指定"+count+"群体に対し第一宿主は"+hosts.length+"体です");
      for(const o of hosts.slice(0,count))o.infection=infection(w,id,o.id,0);
    }
    if (
      config.enabled.P && !PrimaryParasite.enabled(w) &&
      !w.organisms.some((o) => ["algae", "grass"].includes(o.species))
    )
      w.warnings.push("第一宿主不在：寄生虫は初期0です");
    if (config.enabled.Q && !config.enabled.P)
      w.warnings.push("一次寄生虫が無効なため高次寄生虫は初期0です");
    if(PrimaryParasite.enabled(w))PrimaryParasite.initial(w);
    if(config.ecologyRevision === "observation/4.1")config.ecologyParameters={version:1,mainMaintenance:.65,mainMovement:.6,sexualThreshold:.65,sexualMineral:2,producerBirth:"B23",fungusBirth:"B123",initialFoodAgeFraction:.5};
    if(HyperParasite.enabled(w))HyperParasite.initial(w);
    else if(config.ecologyRevision === "observation/4.1") {
      w.searchQ=[];
      config.parasiteInitial={policy:"local-search/1",unit:"colony",targetSearchQ:Math.max(4,Math.min(16,Math.ceil(config.width*config.height/400))),createdSearchQ:0};
      const manualQ=config.founderCounts?.parasites.hyperparasite;
      if(manualQ!==undefined)config.parasiteInitial.targetSearchQ=manualQ;
      const candidates=w.organisms.filter(o=>o.slot==="main" && ["plant","general"].includes(D.byId[o.species].diet));
      if(config.enabled.P && config.enabled.Q && w.organisms.some(o=>o.infection) && candidates.length) {
        for(let i=0;i<Math.min(config.parasiteInitial.targetSearchQ,candidates.length);i++) {
          const host=candidates[Math.floor(i*candidates.length/Math.min(config.parasiteInitial.targetSearchQ,candidates.length))];
          const q=hyper(w,"search:"+i,0);q.cell=host.cell;q.expires=160;q.E=Math.min(.5,host.E);host.E=H.round(host.E-q.E);w.searchQ.push(q);
        }
      }
      config.parasiteInitial.createdSearchQ=w.searchQ.length;
      if(manualQ!==undefined&&manualQ!==w.searchQ.length)throw Error("PLACEMENT_SHORTAGE: 高次寄生の探索群体 指定"+manualQ+" / 配置可能"+w.searchQ.length+"。一次寄生と適合探索宿主の条件を確認してください");
      if(config.enabled.Q && manualQ!==0 && !w.searchQ.length)w.warnings.push("高次寄生の探索群体を配置できません。適合宿主/一次寄生虫の初期条件を確認してください。");
    }
    ConsumerGroup.initialize(w);
    ConsumerGroup.summary(w);
    if(config.initialConditions){
      config.initialReport={version:1,usable:usable.length,groups:Object.fromEntries(["plant","fungus","prey"].map(g=>[g,{requested:config.enabled[g]?Math.round(usable.length*config.initialConditions.density[g]):0,actual:w.organisms.filter(o=>D.byId[o.species].group===g).reduce((n,o)=>n+ConsumerGroup.count(o),0)}])),bySpecies:Object.fromEntries(D.species.filter(s=>["plant","fungus","prey"].includes(s.group)).map(s=>[s.id,w.organisms.filter(o=>o.species===s.id).reduce((n,o)=>n+ConsumerGroup.count(o),0)])),resources:Object.fromEntries(["mineral","droplet","info"].map(k=>[k,w.resources.filter(a=>a.kind===k).length]))};
    }
    if(config.founderCounts){
      const requested=config.founderCounts;
      config.founderReport={version:1,species:Object.fromEntries(activeSpecies(w).filter(s=>["plant","fungus","prey"].includes(s.group)).map(s=>[s.id,{requested:requested.species[s.id]??null,actual:w.organisms.filter(o=>o.species===s.id).reduce((n,o)=>n+ConsumerGroup.count(o),0)}])),parasites:Object.fromEntries(["tideparasite","leafparasite","hyperparasite"].map(id=>[id,{requested:requested.parasites[id]??null,actual:id==="hyperparasite"?(w.searchQ?.length||0)+w.organisms.filter(o=>o.infection?.q).length:w.organisms.filter(o=>o.infection?.species===id).length}]))};
      if(config.initialReport)for(const g of ["plant","fungus","prey"]){
        const species=D.species.filter(s=>s.group===g),target=config.enabled[g]?Math.round(usable.length*config.initialConditions.density[g]):0;
        config.initialReport.groups[g].requested=species.reduce((sum,s,i)=>sum+(config.enabled[g]?(requested.species[s.id]??(Math.floor(target/species.length)+(i<target%species.length?1:0))):0),0);
      }
    }
    Colony.summary(w);
    FungalColony.summary(w);
    LargePlant.summary(w);
    PrimaryParasite.summary(w);
    HyperParasite.summary(w);
    PersistentInformation.initialize(w);
    CellSpace.initialize(w);
    const t = totals(w);
    w.ledger.initialE = t.E;
    w.ledger.initialM = t.M;
    return w;
  }
  function infection(w, species, hostId, turn = w.turn, origin = hostId) {
    if(PrimaryParasite.enabled(w))return PrimaryParasite.infection(w,species,hostId,turn,origin);
    return PersistentInformation.attach(w,{
      id: "p:" + origin + ":" + turn,
      species,
      hostId,
      ...(w.config.ecologyRevision === "observation/4.1" ? {location:species === "leafparasite" ? "external" : "internal",load:.5} : {}),
      stage: "first",
      counter: 0,
      E: 0,
      ready: 0,
      q: null,
    });
  }
  function hyper(w, pId, turn = w.turn) {
    if(HyperParasite.enabled(w))return HyperParasite.create(w,pId,turn,pId);
    return PersistentInformation.attach(w,{
      id: "q:" + pId + ":" + turn,
      species: "hyperparasite",
      hostId: pId,
      phase: 1,
      counter: 0,
      E: 0,
      ready: 0,
      special: null,
      modulation: null,
      counts: [0, 0, 0],
      seen: [],
    });
  }
  function loseInfection(w, p) {
    if (p) {
      dissipate(w, p.E + (PrimaryParasite.enabled(w)&&PrimaryParasite.is(p)?p.B:0) + (p.q?.E || 0) + (HyperParasite.enabled(w)&&HyperParasite.is(p.q)?p.q.B:0));
      if (w.tallies) {
        w.tallies.deaths[p.species]++;
        if (p.q) w.tallies.deaths.hyperparasite++;
      }
    }
  }
  function record(ctx, o, type, extra = {}) {
    if (!ctx.events.has(o.id)) ctx.events.set(o.id, []);
    ctx.events.get(o.id).push({ id: o.id, type, cell: o.cell, ...extra });
  }
  return {
    ...H,
    D,
    ProducerSupport,
    Colony,
    FungalColony,
    ConsumerGroup,
    LargePlant,
    Ryouki,
    PrimaryParasite,
    HyperParasite,
    PersistentInformation,
    WorldGeneration,
    CellSpace,
    CellLife,
    activeSpecies,
    activeMain,
    initialRank,
    DIRS,
    DNA,
    FOOD,
    r,
    hash,
    spec,
    PLANT_BASE,
    edibleB,
    leafFactor,
    index,
    xy,
    nearby,
    prepareGeometry,
    inheritGeometry,
    distance,
    oneStep,
    sight,
    maps: sharedMaps,
    mainAt,
    mainRoom,
    withMapScope,
    validHabitat,
    validate,
    OBSERVATION_MODES,
    observationPreset,
    organism,
    ageInfo,
    initializeAge,
    settleAge,
    phenotype,
    trait,
    adjustment,
    totals,
    addSoil,
    dissipate,
    create,
    infection,
    hyper,
    loseInfection,
    ParasiteCohort,
    record,
  };
});
