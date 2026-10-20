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
  const spec = (o) => D.byId[o.species];
  const PLANT_BASE = 2;
  const edibleB = (o) =>
    Math.max(0, o.B - (spec(o).group === "plant" ? PLANT_BASE : 0));
  const leafFactor = (o) =>
    0.5 + 0.5 * H.clamp((o.B - PLANT_BASE) / 10, 0, 1);
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
      const m=maps(w),p=w.config.ryoukiSettings;
      for(const o of w.organisms)if(is(o)){
        const a=o.ryouki,density=nearby(w,o.cell,1,true).reduce((n,cell)=>n+mainAt(m,cell).filter(t=>t.id!==o.id&&t.species==="ryouki"&&t.HP>0).length,0);
        a.last={turn:w.turn,density,experience:0,steps:0,transition:null};
        a.highRun=density>=p.densityHigh?Math.min(p.highTurns,a.highRun+1):0;
        a.lowRun=density<=p.densityLow?Math.min(p.lowTurns,a.lowRun+1):0;
        if(!a.mutated&&a.highRun>=p.highTurns){a.mutated=true;a.lowRun=0;a.last.transition="entered";}
        else if(a.mutated&&a.lowRun>=p.lowTurns&&mainAt(m,o.cell).filter(t=>t.HP>0).every(t=>t.id===o.id)){a.mutated=false;a.highRun=0;a.last.transition="released";}
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
  const PrimaryParasite = (() => {
    const VERSION="primary-state/1",ROUTES=["contact","feeding","carcass","water"],STAGES=["first","middle","terminal"];
    const hostTable={
      leafparasite:{first:["grass","moss","forestcrown","starcrown"],middle:["grassbug"],terminal:["recursive","sail","parallel","solar","valis","whale","precocial","ryouki"]},
      tideparasite:{first:["algae","freshwaterlight"],middle:["waterbug"],terminal:["abyss","abyssshell","jelly","whale","cephalopod"]},
    };
    const enabled=w=>w?.config?.primaryParasiteModel==="primary/1";
    const is=p=>!!hostTable[p?.species]&&p?.primary?.version===VERSION;
    function parameters(input={}){
      const defaults={version:"primary-parameters/1",life:120,capE:2,maintenance:[0,.03,.04,.06],hostTax:[0,.06,.08,.10],biomass:[0,.02,.03,.04],
        developmentCost:.01,development:{first:4,middle:6,terminal:8},phaseThresholds:[0,0,8,20],starvationTurns:8,carrierTurns:12,
        entryRates:{contact:.60,feeding:.80,carcass:.60,water:.40},establishmentRate:.70,standardReserve:.06,minimumReserve:.03,
        emissionCost:.12,emissionReserve:.06,emissionCooldown:6,inoculumLifetime:{contact:4,water:4,edible:4,carcass:12},
        mutationRate:.10,mutationStep:.05,resistanceGain:.4,resistanceCap:.8,resistanceHalfLife:40,resistanceMaintenance:.005,
        exclusionCost:.04,exclusionRate:.006,metaCaps:[0,.10,.20,.30],metaCosts:[0,.005,.010,.020],
        initialFraction:.20,initialDistribution:[.4,.4,.2],initialEnergy:.20};
      const object=(value,keys)=>{if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))throw Error("SETTINGS_INVALID: 一次寄生の比較値");};
      object(input,Object.keys(defaults));const out=structuredClone(defaults);
      for(const [key,value]of Object.entries(input)){
        if(["development","entryRates","inoculumLifetime"].includes(key)){object(value,Object.keys(defaults[key]));Object.assign(out[key],value);}
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
      return {id:"p:"+origin+":"+turn,species,hostId,location:species==="leafparasite"?"external":"internal",load:.5,
        stage:"first",counter:0,phase:1,age:0,bornAt:turn,birthLife:p.life,B:p.biomass[1],E:0,ready:0,q:null,
        primary:{version:VERSION,form:["A","B","C"][form(w,inherited.adaptation,origin)],formVersion:"primary-form/1",carrier:false,successT:0,pauseUntil:turn,carrierUntil:null,starvationRun:0,settledAt:turn,
          adaptation:inherited.adaptation,hostPreference:hostPreference(w,species,origin,parent),parents:parent?[parent.parentId??parent.id]:[],generation:parent?(parent.primary?.generation??parent.generation??0)+1:0,
          mutation:inherited.mutation,origin:parent?"descendant":"initial",last:{turn,maintenanceE:0,developmentE:0,progress:0,metaE:0,metaRatio:0}}};
    }
    function inoculum(w,parent,options={}){
      const p=settings(w),createdAt=options.createdAt??w.turn,kind=options.kind??"contact",E=H.round(options.E??p.standardReserve);
      return {id:options.id??"inoculum:"+parent.id+":"+w.turn+":"+kind+":"+options.cell,species:parent.species,kind,cell:options.cell,
        sourceId:parent.id,parentId:parent.id,generation:parent.primary?.generation??0,adaptation:structuredClone(genes(parent)??defaultAdaptation(parent.species)),hostPreference:hostPreference(w,parent.species,parent.id,parent),
        createdAt,expires:options.expires??createdAt+(p.inoculumLifetime[kind]??4),route:options.route??(kind==="water"?"water":"contact"),stage:parent.stage,
        ...options,E,amount:H.round(E/p.standardReserve)};
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
        const requested=w.config.enabled.P?(direct??Math.floor(first.length*p.initialFraction)):0;
        const raw=(direct===undefined?p.initialDistribution:[1,0,0]).map(n=>n*requested),counts=raw.map(Math.floor);
        for(const i of raw.map((n,i)=>({n:n-counts[i],i})).sort((a,b)=>b.n-a.n||a.i-b.i).slice(0,requested-counts.reduce((a,b)=>a+b,0)))counts[i.i]++;
        const item=report.bySpecies[species]={requested:direct??null,firstHosts:first.length,planned:requested,actual:0,shortage:0,stages:{},reasons:[]};
        for(const [index,role]of STAGES.entries()){
          const hosts=w.organisms.filter(o=>!o.infection&&!available.has(o.id)&&hostTable[species][role].includes(o.species)&&(role!=="terminal"||hostRule(species,o).stage==="terminal"))
            .sort((a,b)=>hash(w,"primary/initial-host",0,species,[role,a.id])-hash(w,"primary/initial-host",0,species,[role,b.id])||H.compare(a.id,b.id));
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
      for(const e of entries(w)){const p=e.p;out.count++;out[e.kind==="host"?"hosted":"external"]++;if(e.carrier.kind==="primary-migration")out.migrating++;out.bySpecies[p.species]++;out.phases[p.phase-1]++;out.stages[p.stage]++;if(p.matureAt!==undefined)out.mature++;out.biomassB+=p.B;out.reserveE+=p.E;}
      for(const i of w.primaryInocula||[]){const target=i.kind==="invading"?(i.status==="exposed"?out.exposed:out.invading):out.inocula;target.records++;target.amount+=i.amount;target.reserveE+=i.E;if(target.byKind)target.byKind[i.kind]+=i.amount;}
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
          !Number.isInteger(p.phase)||p.phase<1||p.phase>3||!Object.keys(hostTable).includes(p.species)||
          !["first","middle","extra","terminal"].includes(p.stage)||!["A","B","C"].includes(a.form)||a.formVersion!=="primary-form/1"||!correctGenes||values.some(n=>!Number.isFinite(n)||n<0||n>1)||
          !correctKeys(a.hostPreference,expected.hosts)||Object.values(a.hostPreference??{}).some(n=>!Number.isFinite(n)||n<0||n>1)||
          !Number.isFinite(p.bornAt)||!Number.isFinite(p.birthLife)||p.birthLife<=0||
          (host&&p.hostId!==host.id)||(p.q&&p.q.hostId!==p.id))errors.push("PRIMARY_STATE:"+p.id);
      }
      for(const i of w.primaryInocula||[])if(!Number.isFinite(i.E)||i.E<0||!Number.isFinite(i.amount)||i.amount<0||Math.abs(i.amount-i.E/settings(w).standardReserve)>1e-5||
        !["contact","water","edible","carcass","invading"].includes(i.kind)||!Number.isSafeInteger(i.expires)||!hostTable[i.species]||
        !correctKeys(i.hostPreference,hostTable[i.species]?defaultAdaptation(i.species).hosts:{})||Object.values(i.hostPreference??{}).some(n=>!Number.isFinite(n)||n<0||n>1))errors.push("PRIMARY_INOCULUM:"+i.id);
      return errors;
    }
    return {enabled,is,parameters,settings,hostTable,hostRule,adaptation,childAdaptation,infection,inoculum,takeInoculum,resistance,acquireResistance,beginResistance,entries,locate,ageInfo:parasiteAge,initial,summary,validate};
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
  function maps(w) {
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
    if(Ryouki.enabled(w)){
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
    if(c.ryoukiModel!==undefined&&c.ryoukiModel!=="ryouki/1")throw Error("SETTINGS_INVALID: 量機モデル");
    if(c.ryoukiModel==="ryouki/1"){
      c.ryoukiSettings=Ryouki.settings(c.ryoukiSettings);
      c.ageModel="life/1";
    }else if(c.ryoukiSettings!==undefined)throw Error("SETTINGS_INVALID: 量機モデルの指定が必要です");
    if(c.primaryParasiteModel!==undefined&&c.primaryParasiteModel!=="primary/1")throw Error("SETTINGS_INVALID: 一次寄生モデル");
    if(c.primaryParasiteModel==="primary/1"){
      c.primaryParasiteSettings=PrimaryParasite.parameters(c.primaryParasiteSettings);c.ageModel="life/1";
    }else if(c.primaryParasiteSettings!==undefined)throw Error("SETTINGS_INVALID: 一次寄生モデルの指定が必要です");
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
    return c;
  }
  const ageFactors = Object.freeze({
    juvenile:Object.freeze({attack:.65,defense:.75,hp:.70,move:1.10,maintenance:.80,healing:1.10,birth:1,light:.65}),
    adult:Object.freeze({attack:1,defense:1,hp:1,move:1,maintenance:1,healing:1,birth:1,light:1}),
    elderly:Object.freeze({attack:.85,defense:.90,hp:.90,move:1.15,maintenance:1.05,healing:.80,birth:1.25,light:.85}),
    precocial:Object.freeze({attack:.90,defense:.95,hp:.90,move:1,maintenance:.90,healing:1,birth:1,light:.65}),
  });
  function ageInfo(o) {
    if (Colony.is(o)) return {enabled:false,applicable:false,stage:"adult",factors:ageFactors.adult};
    if (!Number.isFinite(o.birthLife)) return {enabled:false,stage:"adult",factors:ageFactors.adult};
    const s=spec(o),matureAt=s.group==="main"?Math.ceil(o.birthLife*(s.id==="precocial"?.03:s.id==="swarm"&&o.role==="queen"?1/30:.10)):s.maturity,
      elderlyAt=Math.max(matureAt+1,Math.floor(.75*o.birthLife)),
      stage=o.age<matureAt?"juvenile":o.age<elderlyAt?"adult":"elderly";
    return {enabled:true,stage,matureAt,elderlyAt,birthLife:o.birthLife,
      factors:ageFactors[stage==="juvenile"&&s.id==="precocial"?"precocial":stage]};
  }
  function initializeAge(w,o) {
    if(Ryouki.is(o)){
      o.birthLife=Math.floor(D.ryouki.life*(.95+.1*o.dna.skin));
      o.HP=H.round(Math.min(o.HP,Ryouki.phenotype(w,o).maxHP));return o;
    }
    if(LargePlant.is(o)){
      o.birthLife=spec(o).life;const a=ageInfo(o);o.HP=H.round(Math.min(o.HP,spec(o).capacity[3]*a.factors.hp));return o;
    }
    if(Colony.is(o)){delete o.birthLife;return o;}
    if(w.config.ageModel!=="life/1")return o;
    const s=spec(o);
    if(["P","Q"].includes(s.group))return o;
    o.birthLife=s.group==="main"?Math.floor(s.life*(.95+.1*o.dna.skin)*(s.id==="swarm"&&o.role==="queen"?3:1)):s.life;
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
    if(Colony.is(o)&&!Object.hasOwn(options,"B"))o.B=H.round(PLANT_BASE+o.colony.capacityB*Colony.parameters(w,cell).initialFraction);
    delete o.colonyOrigin;
    delete o.plantOrigin;
    return initializeAge(w,o);
  }
  function phenotype(w, o, phase = o.phase, branch = o.branch4) {
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
      capB: Colony.is(o) ? o.colony.baseB+o.colony.capacityB : main ? 32 : s.capacity[1],
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
        s.maintenance *
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
        if (p.q) E += p.q.E;
      }
    };
    for (const o of w.organisms) {
      E += o.E + o.B;
      if(Colony.is(o))E += o.colony.edibleExposure?.E || 0;
      M += o.M;
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
    for (const q of w.searchQ || []) E += q.E;
    if(PrimaryParasite.enabled(w))for(const i of w.primaryInocula||[])E+=i.E;
    for (const t of w.tiles) M += t.soilM;
    return { E: H.round(E), M: H.round(M) };
  }
  function addSoil(w, cell, m) {
    const tile = w.tiles[cell],
      added = Math.min(m, 20 - tile.soilM);
    tile.soilM = H.round(tile.soilM + added);
    w.ledger.Mloss = H.round(w.ledger.Mloss + m - added);
  }
  function dissipate(w, e) {
    w.ledger.sinks = H.round(w.ledger.sinks + e);
  }
  function create(input = {}) {
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
    if(config.ecologyRevision === "observation/4.1") {
      w.searchQ=[];
      config.ecologyParameters={version:1,mainMaintenance:.65,mainMovement:.6,sexualThreshold:.65,sexualMineral:2,producerBirth:"B23",fungusBirth:"B123",initialFoodAgeFraction:.5};
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
    if(config.initialConditions){
      config.initialReport={version:1,usable:usable.length,groups:Object.fromEntries(["plant","fungus","prey"].map(g=>[g,{requested:config.enabled[g]?Math.round(usable.length*config.initialConditions.density[g]):0,actual:w.organisms.filter(o=>D.byId[o.species].group===g).length}])),bySpecies:Object.fromEntries(D.species.filter(s=>["plant","fungus","prey"].includes(s.group)).map(s=>[s.id,w.organisms.filter(o=>o.species===s.id).length])),resources:Object.fromEntries(["mineral","droplet","info"].map(k=>[k,w.resources.filter(a=>a.kind===k).length]))};
    }
    if(config.founderCounts){
      const requested=config.founderCounts;
      config.founderReport={version:1,species:Object.fromEntries(activeSpecies(w).filter(s=>["plant","fungus","prey"].includes(s.group)).map(s=>[s.id,{requested:requested.species[s.id]??null,actual:w.organisms.filter(o=>o.species===s.id).length}])),parasites:Object.fromEntries(["tideparasite","leafparasite","hyperparasite"].map(id=>[id,{requested:requested.parasites[id]??null,actual:id==="hyperparasite"?(w.searchQ?.length||0)+w.organisms.filter(o=>o.infection?.q).length:w.organisms.filter(o=>o.infection?.species===id).length}]))};
      if(config.initialReport)for(const g of ["plant","fungus","prey"]){
        const species=D.species.filter(s=>s.group===g),target=config.enabled[g]?Math.round(usable.length*config.initialConditions.density[g]):0;
        config.initialReport.groups[g].requested=species.reduce((sum,s,i)=>sum+(config.enabled[g]?(requested.species[s.id]??(Math.floor(target/species.length)+(i<target%species.length?1:0))):0),0);
      }
    }
    Colony.summary(w);
    LargePlant.summary(w);
    PrimaryParasite.summary(w);
    const t = totals(w);
    w.ledger.initialE = t.E;
    w.ledger.initialM = t.M;
    return w;
  }
  function infection(w, species, hostId, turn = w.turn, origin = hostId) {
    if(PrimaryParasite.enabled(w))return PrimaryParasite.infection(w,species,hostId,turn,origin);
    return {
      id: "p:" + origin + ":" + turn,
      species,
      hostId,
      ...(w.config.ecologyRevision === "observation/4.1" ? {location:species === "leafparasite" ? "external" : "internal",load:.5} : {}),
      stage: "first",
      counter: 0,
      E: 0,
      ready: 0,
      q: null,
    };
  }
  function hyper(w, pId, turn = w.turn) {
    return {
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
    };
  }
  function loseInfection(w, p) {
    if (p) {
      dissipate(w, p.E + (PrimaryParasite.enabled(w)&&PrimaryParasite.is(p)?p.B:0) + (p.q?.E || 0));
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
    LargePlant,
    Ryouki,
    PrimaryParasite,
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
    record,
  };
});
