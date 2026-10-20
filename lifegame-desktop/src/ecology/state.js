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
 const plants=S.D.species.filter(s=>s.group==='plant');
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
 const m=S.maps(w);
 for(const site of state.sites){
  const n=level(w,site.cell),light=w.tiles[site.cell].light;if(n<=0||light<=0)continue;
  let o=m.food.get(site.cell);
  if(!o&&S.r(w,'producer/establish',w.turn,site.species,site.cell)<Math.min(1,c.establishment*n)){
   o=S.organism(w,S.D.byId[site.species],site.cell,'env:producer:'+site.species+':'+w.turn+':'+site.cell,{E:0,B:0,M:0,phase:1,age:0});
   o.origin={kind:'environment',turn:w.turn,cell:site.cell};o.producerReserve=1;
   input(o,'E',6);input(o,'B',S.PLANT_BASE);input(o,'M',.2);w.organisms.push(o);m.food.set(site.cell,o);
   state.established[o.species]=(state.established[o.species]||0)+1;last.established[o.species]=(last.established[o.species]||0)+1;last.births.push({id:o.id,species:o.species,cell:o.cell});
  }
  if(!o||S.spec(o).group!=='plant')continue;
  const p=S.phenotype(w,o),fraction=Math.min(1,n),energy=Math.min(1,Math.max(0,light));
  input(o,'E',Math.max(0,Math.min(c.targetE,p.capE)-o.E)*fraction*energy);
  input(o,'M',Math.max(0,Math.min(c.targetM,p.capM)-o.M)*fraction);
  const b=S.round(Math.max(0,Math.min(c[region(w,o.cell)].regrowth*n*energy,p.capB-o.B)));input(o,'B',b);last.regrownB=S.round(last.regrownB+b);
 }
 for(const o of w.organisms)if(S.spec(o).group==='plant'){
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
    for (const o of w.organisms) {
      byId.set(o.id, o);
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
    return { main, food, byId, resources, carcasses };
  }
  function validHabitat(w, s, p) {
    const t = w.tiles[p];
    if (t.blocked) return false;
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
      c.selected.some((id) => !D.main.some((s) => s.id === id))
    )
      throw Error("SETTINGS_INVALID: 系統");
    c.selected = [...new Set(c.selected)];
    for (const weight of Object.values(c.weights))
      if (!Number.isInteger(weight) || weight < 1 || weight > 4)
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
          const species=D.species.find(s=>s.id===id),allowed=key==="species"?["plant","fungus","prey"]:["P","Q"];
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
    if (!Number.isFinite(o.birthLife)) return {enabled:false,stage:"adult",factors:ageFactors.adult};
    const s=spec(o),matureAt=s.group==="main"?Math.ceil(o.birthLife*(s.id==="precocial"?.03:s.id==="swarm"&&o.role==="queen"?1/30:.10)):s.maturity,
      elderlyAt=Math.max(matureAt+1,Math.floor(.75*o.birthLife)),
      stage=o.age<matureAt?"juvenile":o.age<elderlyAt?"adult":"elderly";
    return {enabled:true,stage,matureAt,elderlyAt,birthLife:o.birthLife,
      factors:ageFactors[stage==="juvenile"&&s.id==="precocial"?"precocial":stage]};
  }
  function initializeAge(w,o) {
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
        (u[axis] = main ? 0.25 + 0.5 * r(w, "init/dna", 0, id, null, i) : 0.5),
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
    return initializeAge(w,o);
  }
  function phenotype(w, o, phase = o.phase, branch = o.branch4) {
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
      capB: main ? 32 : s.capacity[1],
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
        E += p.E;
        if (p.q) E += p.q.E;
      }
    };
    for (const o of w.organisms) {
      E += o.E + o.B;
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
        : D.main.slice(0, 20);
    if (!config.enabled.main) mains = [];
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
            B: s.id === "swarm" && j % 4 === 3 ? 8 : 16,
          }),
        );
      }
    }
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
                  if (validHabitat(w, f, p)) {
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
    if (config.enabled.P)
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
    for(const [id,count]of Object.entries(config.founderCounts?.parasites||{}))if(["tideparasite","leafparasite"].includes(id)){
      const hostSpecies=id==="tideparasite"?"algae":"grass",hosts=w.organisms.filter(o=>o.species===hostSpecies&&!o.infection).sort((a,b)=>hash(w,"init/manual-P",0,id,a.id)-hash(w,"init/manual-P",0,id,b.id)||a.id.localeCompare(b.id));
      if(hosts.length<count)throw Error("PLACEMENT_SHORTAGE: "+D.byId[id].name+" 指定"+count+"群体に対し第一宿主は"+hosts.length+"体です");
      for(const o of hosts.slice(0,count))o.infection=infection(w,id,o.id,0);
    }
    if (
      config.enabled.P &&
      !w.organisms.some((o) => ["algae", "grass"].includes(o.species))
    )
      w.warnings.push("第一宿主不在：寄生虫は初期0です");
    if (config.enabled.Q && !config.enabled.P)
      w.warnings.push("一次寄生虫が無効なため高次寄生虫は初期0です");
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
      config.founderReport={version:1,species:Object.fromEntries(D.species.filter(s=>["plant","fungus","prey"].includes(s.group)).map(s=>[s.id,{requested:requested.species[s.id]??null,actual:w.organisms.filter(o=>o.species===s.id).length}])),parasites:Object.fromEntries(["tideparasite","leafparasite","hyperparasite"].map(id=>[id,{requested:requested.parasites[id]??null,actual:id==="hyperparasite"?(w.searchQ?.length||0)+w.organisms.filter(o=>o.infection?.q).length:w.organisms.filter(o=>o.infection?.species===id).length}]))};
      if(config.initialReport)for(const g of ["plant","fungus","prey"]){
        const species=D.species.filter(s=>s.group===g),target=config.enabled[g]?Math.round(usable.length*config.initialConditions.density[g]):0;
        config.initialReport.groups[g].requested=species.reduce((sum,s,i)=>sum+(config.enabled[g]?(requested.species[s.id]??(Math.floor(target/species.length)+(i<target%species.length?1:0))):0),0);
      }
    }
    const t = totals(w);
    w.ledger.initialE = t.E;
    w.ledger.initialM = t.M;
    return w;
  }
  function infection(w, species, hostId, turn = w.turn, origin = hostId) {
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
      dissipate(w, p.E + (p.q?.E || 0));
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
