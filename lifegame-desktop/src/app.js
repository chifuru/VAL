/* Observation and controls. No DOM or animation state enters the biological hash. */
(() => {
  "use strict";
  const E = window.EcoEngine,
    S = E.S,
    D = S.D,
    R = window.EcoRenderer;
  const $ = (id) => document.getElementById(id),
    escape = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const setText = (id, value) => {
    const el = $(id), text = String(value);
    if (el.textContent !== text) el.textContent = text;
  };
  const fmt = (v) =>
      Number.isFinite(v) ? Number(v.toFixed(2)).toLocaleString("ja-JP") : "—",
    phase = (n) => ["", "I", "II", "III", "IV"][n],
    sex = { female: "雌", male: "雄" },
    roles = { queen: "繁殖型", worker: "働育型", male: "繁殖雄" },
    terrain = {
      plain: "平地",
      shallow: "浅瀬",
      deep: "深水",
      rock: "岩地",
      mud: "泥地",
    },
    cover = { none: "なし", boulder: "岩塊", log: "倒木", bush: "茂み" },
    actions = {
      stop: "停止",
      move: "移動",
      attack: "攻撃",
      harvest: "刈取り",
      defend: "防御",
      care: "育児",
      groom: "寄生除去",
    },
    stages = {
      first: "第一宿主",
      middle: "中間宿主",
      extra: "追加中間宿主",
      terminal: "終宿主",
    };
  const renderer = R.create($("board"));
  const archive = window.EcoArchive.persistent(
    {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
    },
    E,
    window.EcoReplayVersion,
  );
  let replayEntry = null,
    ended = false,
    pendingResult = null;
  let analysisData=null,analysisRecord=null,analysisState=null;
  let world = null,
    initialConfig = null,
    running = false,
    timer = null,
    selectedId = null,
    selectedCell = null,
    describedSpecies = null,
    lastMs = 0,
    activeSheet = "tree",
    activeLineage = "abyss",
    paintAt = 0,
    populationHistory = [],
    observations = null, graphFollow = true, followId = null, lastTracked = null,
    legendKey = null,
    checkpointKey = null,
    pendingTurn = null,
    runGeneration = 0;
  const TURN_MS = 1000;
  const holds = new Set();
  let interactionTimer = null, prewarming = true, lastPreparationMs = 0, computeWaitAt = null, playbackError = null;
  let graphicsPrepared=false,observationPreparationAt=null,preparationHeldAt=null;
  let worldGeneration=0,returnIntent=null,bufferWorld=null,bufferFingerprint=null,faultKind=null,renderFaulted=false;
  const compute = window.EcoCompute.create({
    onChange: () => { if(running&&!holds.size&&!pendingTurn&&!timer)timer=setTimeout(runLoop,0); },
    onError: text => failObservation("計算",text)
  });
  function restoreCommitted() {
    runGeneration++;clearTimeout(timer);timer=null;
    if(pendingTurn?.packet)compute.restore(pendingTurn.packet);
    pendingTurn=null;
    renderer.view.animate=false;showTurnStage();
    if(world){renderer.setWorld(world);renderSelection();}
  }
  function hold(reason) {
    if(!["guide","results","settings"].includes(reason)||holds.has(reason))return;
    if(!holds.size){
      returnIntent={generation:worldGeneration,world,running};
      try{restoreCommitted();}catch(error){failObservation("表示更新",error);return;}
    }
    holds.add(reason);updateHold();
  }
  function release(reason) {
    holds.delete(reason);
    if(!holds.size&&returnIntent){
      const intent=returnIntent;returnIntent=null;
      if(intent.generation===worldGeneration&&intent.world===world&&!ended&&!playbackError)running=intent.running;
    }
    updateHold();
    if(running&&!holds.size&&!pendingTurn&&!timer)timer=setTimeout(runLoop,0);
  }
  function updateHold() {
    if(holds.size&&preparationHeldAt===null)preparationHeldAt=performance.now();
    if(!holds.size&&preparationHeldAt!==null){if(observationPreparationAt!==null)observationPreparationAt+=performance.now()-preparationHeldAt;preparationHeldAt=null;}
    const names={guide:"説明シートの閲覧",results:"図鑑の閲覧",settings:"初期条件の編集"};
    $("interaction-note").hidden=!holds.size;
    $("interaction-note").textContent=holds.size?([...holds].map(k=>names[k]).join("・")+"のため停止中") : "";
    $("cancel-settings").hidden=!document.body.classList.contains("setup-screen")||!world;
    if(running)$("status").textContent=holds.size?"別画面・停止中":"観測中";
  }
  function mapInteraction(active=false) { renderer.interact?.(active); }
  function failObservation(kind,error) {
    const text=error?.message||String(error);
    stop({discard:true});faultKind=kind;playbackError=text;renderFaulted=kind==="描画";
    $("status").textContent=kind+"エラー・停止";
    $("start").disabled=!world||ended;
    $("start").textContent=ended?"観測終了":"表示と計算を再試行 ▶";
    message(kind+"を継続できませんでした："+text+" 確定ターンと全期間記録は保持しています。"+(ended?"新しい世界を作成できます。":"右上から再試行できます。"));
  }
  function startRunning() {
    if(!world||ended||holds.size)return;
    try {
      if(playbackError){renderer.setWorld(world);render();renderer.draw();}
      if(compute.initialized&&(bufferWorld!==world||(bufferFingerprint!==null&&bufferFingerprint!==E.fingerprint(world)))){compute.close();prewarming=true;bufferWorld=null;}
      bufferFingerprint=null;
    }catch(error){failObservation("表示更新",error);return;}
    observationPreparationAt=performance.now();preparationHeldAt=null;
    playbackError=null;faultKind=null;renderFaulted=false;computeWaitAt=null;running=true;$("start").textContent="一時停止 Ⅱ";$("step").disabled=true;
    updateHold();timer=setTimeout(runLoop,0);
  }
  const groups = {
    main: "主生物",
    plant: "生産者",
    fungus: "分解者",
    prey: "一次消費者",
    P: "一次寄生",
    Q: "高次寄生",
  };
  $("groups").innerHTML = Object.entries(groups)
    .map(
      ([id, label]) =>
        `<label class="check"><input id="group-${id}" type="checkbox" checked>${label}</label>`,
    )
    .join("");
  const setupMain=[...D.main,...(D.ryouki?[D.ryouki]:[])];
  $("lineage-options").innerHTML = setupMain
    .map(
      (s, i) =>
        `<label class="check"><input type="checkbox" value="${s.id}" ${i < 20 || s.id==='ryouki' ? "checked" : ""}>${escape(s.name)}</label>`,
    )
    .join("");
  $("weight-options").innerHTML = setupMain
    .map(
      (s) =>
        `<label>${escape(s.name)}<input type="number" min="${s.id==='ryouki'?0:1}" max="4" value="1" data-weight="${s.id}"></label>`,
    )
    .join("");
  $("environment-legend").innerHTML = D.environments
    .map(
      (e, i) =>
        `<span class="habitat-chip"><i style="background-image:url(assets/habitat-${["water", "thermal", "signal", "meadow", "frost", "forest", "earth", "corrosion"][i]}.png);background-size:cover;background-position:center"></i><b>${e.name}</b></span>`,
    )
    .join("");
  $("size").addEventListener("change", () => {
    if($("observation-mode").value==='custom'&&
      (generationLocks.has('initial')||$('generation-mode').value==='manual'))return;
    const initial={ "40,28": 80, "80,56": 320, "160,112": 1280 }[$("size").value];
    $("initial").value=Math.max(initial,$("lineages").value==='all'?(20+(D.ryouki?1:0))*4:0);
    generationBase.initial=Number($("initial").value);
  });
  $("lineages").addEventListener("change", () => {
    $("lineage-options").hidden = $("lineages").value !== "manual";
    if ($("lineages").value === "manual") $("advanced-settings").open = true;
  });
  $("distribution").addEventListener("change", () => {
    syncSetupFields();
  });
  $("map-id").innerHTML += window.EcoMapTemplates.list()
    .map((m) => `<option value="${escape(m.id)}">${escape(m.name)}</option>`)
    .join("");
  const independent=s=>s?.kind==='independent'&&s.slot==='producer';
  const activeCatalogue=()=>world?S.activeSpecies(world):D.species;
  const independentCount=(counts,catalogue=activeCatalogue())=>catalogue.filter(independent).reduce((n,s)=>n+(counts[s.id]||0),0);
  const displayUnit=(s,config=world?.config)=>['P','Q'].includes(s.group)?'群体':config?.producerModel==='colony/1'&&s.group==='plant'&&!independent(s)?'群落':'個体';
  const speciesDiet=s=>s.id==='ryouki'?{name:'雑食',description:'草の可食部と小型の一次消費者を利用'}:D.diets[s.diet];
  const founderSpecies=[...D.species,...(D.independentPlants||[])].filter(s=>["plant","fungus","prey","P","Q"].includes(s.group));
  $("founder-inputs").innerHTML=founderSpecies.map(s=>`<label>${escape(s.name)} · ${s.group==="P"?"一次寄生":s.group==="Q"?"高次寄生":independent(s)?'独立生産者':s.group==="plant"?"生産者":s.group==="fungus"?"分解者":"一次消費者"}（${["P","Q"].includes(s.group)?"群体":s.group==='plant'&&!independent(s)?'群落':"体"}）<input id="founder-${escape(s.id)}" type="number" min="0" max="${s.group==="Q"?1024:17920}" step="1" placeholder="自動"></label>`).join("");
  function readFounders(){
    const result={version:1,species:{},parasites:{}};
    for(const s of founderSpecies){const input=$("founder-"+s.id);if(input.value!=="")result[["P","Q"].includes(s.group)?"parasites":"species"][s.id]=Number(input.value);}
    return Object.keys(result.species).length||Object.keys(result.parasites).length?{founderCounts:result}:{};
  }
  const generationFields={
    mapId:'map-id',initial:'initial',
    'producerSettings.land.occupancy':'density-plant','producerSettings.water.occupancy':'density-plant-water',
    'producerSettings.land.capacityB':'colony-land-capacity','producerSettings.water.capacityB':'colony-water-capacity',
    'producerSettings.land.initialFraction':'colony-land-initial','producerSettings.water.initialFraction':'colony-water-initial',
    'producerSettings.land.regrowthB':'colony-land-regrowth','producerSettings.water.regrowthB':'colony-water-regrowth',
    'initialConditions.density.fungus':'density-fungus','initialConditions.density.prey':'density-prey',
    'initialConditions.resources.mineral':'resource-mineral','initialConditions.resources.droplet':'resource-droplet',
    'initialConditions.distribution':'lower-distribution',
    'largePlantSettings.autoDensity.land':'large-plant-land-density','largePlantSettings.autoDensity.water':'large-plant-water-density',
    'largePlantSettings.initial.phase':'large-plant-phase','largePlantSettings.initial.ageFraction':'large-plant-age',
    'largePlantSettings.initial.energyFraction':'large-plant-energy','informationSettings.influence':'information-influence',
  };
  const generationLocks=new Set();
  let generationBase={};
  function syncGenerationFields(){
    const automatic=$('generation-mode').value==='auto',preset=$('observation-mode').value!=='custom';
    $('generation-profile').disabled=!automatic;
    for(const [path,id]of Object.entries(generationFields)){
      const check=document.querySelector('[data-generation-lock="'+path+'"]'),input=$(id);
      if(!check)continue;
      const imposed=preset&&['mapId','initial'].includes(path);
      check.checked=!automatic||imposed||generationLocks.has(path);
      check.disabled=!automatic||imposed||(path==='mapId'&&input.value==='auto');
      check.closest('.generation-lock-control').hidden=!automatic;
    }
    const profileNotes={'standard':'基準の条件。','high-production':'容量1.5倍・再生上限1.25倍・初期主生物数1.2倍。','resource-localized':'占有率0.6倍・容量1.5倍・集落分布。','water-focused':'水域35%以上の地形・水の容量1.25倍。','land-focused':'陸域70%以上の地形・陸の容量1.25倍。','information-strong':'情報影響度1.25倍。出現条件と期限は変えません。'};
    $('generation-profile').title=profileNotes[$('generation-profile').value]||'6つの傾向から、固定した条件に適合するものを選びます。';
    $('generation-help').textContent=automatic?($('generation-profile').value==='auto'?'6つの傾向から関連する条件を組で選びます。':profileNotes[$('generation-profile').value]+' 自動項目だけへ適用します。')+' 値の変更は固定になり、0・供給OFF・指定系統を保持します。固定を外すと次の生成で自動になります。':'表示中の値をそのまま使います。地形のおまかせは代表地形から選び、生成後の条件を保存します。';
  }
  function generationSettings(){
    const mode=$('generation-mode').value;
    return {version:'diverse-generation-parameters/1',mode,profile:mode==='auto'?$('generation-profile').value:'auto',
      locks:[...generationLocks].filter(path=>path!=='mapId'||$('map-id').value!=='auto').sort()};
  }
  function showGenerationSettings(config){
    const settings=config.generationSettings;
    $('generation-mode').value=settings?.mode||'auto';$('generation-profile').value=settings?.profile||'auto';
    generationLocks.clear();for(const path of settings?.locks||[])generationLocks.add(path);
    generationBase=structuredClone(config.generationResolved?.base||{});
    syncGenerationFields();
  }
  for(const profile of S.WorldGeneration?.profiles||[]){const option=document.createElement('option');option.value=profile.id;option.textContent=profile.name;$('generation-profile').append(option);}
  for(const [path,id]of Object.entries(generationFields)){
    const input=$(id),label=input.closest('label'),row=document.createElement('div'),control=document.createElement('label');
    row.className='generation-field';label.replaceWith(row);row.append(label);
    control.className='check generation-lock-control';control.innerHTML='<input type="checkbox" data-generation-lock="'+path+'" aria-label="'+escape(label.textContent.trim())+'を固定">固定';row.append(control);
    control.firstChild.addEventListener('change',()=>{if(control.firstChild.checked)generationLocks.add(path);else generationLocks.delete(path);syncGenerationFields();});
    input.addEventListener('input',()=>{if(path==='mapId'&&input.value==='auto')generationLocks.delete(path);else generationLocks.add(path);syncGenerationFields();});
    input.addEventListener('change',()=>{if(path==='mapId'&&input.value==='auto')generationLocks.delete(path);else generationLocks.add(path);syncGenerationFields();});
  }
  $('generation-mode').addEventListener('change',syncGenerationFields);$('generation-profile').addEventListener('change',syncGenerationFields);
  function readProducerSettings(){
    return {version:'colony-parameters/1',standardBiteB:2,...Object.fromEntries(['land','water'].map(region=>{
      const capacityB=Number($('colony-'+region+'-capacity').value);
      return [region,{occupancy:Number($(region==='land'?'density-plant':'density-plant-water').value)/100,capacityB,initialFraction:Number($('colony-'+region+'-initial').value)/100,regrowthB:capacityB*Number($('colony-'+region+'-regrowth').value)/100}];
    }))};
  }
  function showProducerSettings(settings,scale=1){
    for(const region of ['land','water']){
      const values=settings?.[region]||{occupancy:region==='land'?.20:.15,capacityB:20*scale,initialFraction:.7,regrowthB:2*scale};
      $(region==='land'?'density-plant':'density-plant-water').value=values.occupancy*100;
      $('colony-'+region+'-capacity').value=values.capacityB;
      $('colony-'+region+'-initial').value=values.initialFraction*100;
      $('colony-'+region+'-regrowth').value=values.regrowthB/values.capacityB*100;
    }
  }
  function readLargePlantSettings(){
    return {version:'independent-plant-parameters/1',autoDensity:Object.fromEntries(['land','water'].map(r=>[r,Number($('large-plant-'+r+'-density').value)/100])),initial:{phase:Number($('large-plant-phase').value),ageFraction:Number($('large-plant-age').value)/100,energyFraction:Number($('large-plant-energy').value)/100}};
  }
  function showLargePlantSettings(settings){
    for(const r of ['land','water'])$('large-plant-'+r+'-density').value=(settings?.autoDensity?.[r]??.02)*100;
    $('large-plant-phase').value=settings?.initial?.phase??1;
    $('large-plant-age').value=(settings?.initial?.ageFraction??0)*100;
    $('large-plant-energy').value=(settings?.initial?.energyFraction??.5)*100;
  }
  function resetLowerSettings(){
    const [w,h]=$("size").value.split(",").map(Number),mode=S.observationPreset($("observation-mode").value,w,h);
    showProducerSettings(null,mode.initialFoodScale);
    showLargePlantSettings();
    for(const [k,v]of Object.entries({fungus:3,prey:6}))$("density-"+k).value=+(v*mode.initialFoodScale).toFixed(1);
    for(const k of ["mineral","droplet"])$("resource-"+k).value=100;
    $("resource-info").value=0;$("information-influence").value=1;
    $("lower-distribution").value="habitat";
    for(const s of founderSpecies)$("founder-"+s.id).value="";
  }
  $("reset-lower-settings").onclick=resetLowerSettings;
  $("producer-supply").onchange=()=>{for(const e of $("supply-inputs").querySelectorAll("input"))e.disabled=!$("producer-supply").checked;};
  function applyObservationMode({resetLower=true}={}) {
    const id = $("observation-mode").value,
      [width,height] = $("size").value.split(",").map(Number),
      mode = S.observationPreset(id,width,height), fixed = id !== "custom";
    for (const id of ["map-id","initial","lineages","distribution","placement","guarantee"])
      $(id).disabled = fixed;
    for(const input of document.querySelectorAll("#lineage-options input,#weight-options input"))input.disabled=fixed;
    for(const input of document.querySelectorAll("#groups input"))input.disabled=false;
    if (fixed) {
      if(resetLower){
        const kept=Object.entries(generationFields).filter(([path])=>generationLocks.has(path)&&!["mapId","initial"].includes(path)).map(([path,id])=>[path,id,$(id).value,path.endsWith("regrowthB")?Number($(id.replace("regrowth","capacity")).value)*Number($(id).value)/100:null]);
        const founders=founderSpecies.map(s=>[s.id,$("founder-"+s.id).value]);
        resetLowerSettings();for(const [path,id,value,absolute]of kept)$(id).value=absolute===null?value:100*absolute/Number($(id.replace("regrowth","capacity")).value);for(const [id,value]of founders)$("founder-"+id).value=value;
      }
      if(!generationLocks.has("mapId"))$("map-id").value=mode.mapId;
      if(!generationLocks.has("initial"))$("initial").value=mode.initial;
      $("lineages").value = "manual"; $("distribution").value = mode.distribution;
      $("placement").value = mode.placement; $("guarantee").checked = false;
      for (const input of $("lineage-options").querySelectorAll("input")) input.checked = mode.selected.includes(input.value);
      // Explicitly disabled groups survive preset selection; conflicting mode
      // promises are explained by the generation validator rather than enabled silently.
    }
    $("lineage-options").hidden = $("lineages").value !== "manual";
    $("weight-options").hidden = $("distribution").value !== "weighted";
    syncSetupFields();
    $("mode-help").textContent = mode.description.replace("途中の生体補充はありません。","動物の救済補充はありません。") + (fixed ? ` 主生物${mode.initial}体、${mode.selected.length}系統（${mode.selected.map(id=>D.byId[id].name).join(" / ")}）。自然配置・均等配分。固定項目を編集する場合は自由設定へ戻してください。` : "") + " 条件は開始時に固定され、観測中も同じ倍率で計算します。動物・寄生虫の救済補充はありません。生産者の環境供給は別欄で選択できます。";
    updateCohortHint();syncGenerationFields();
  }
  $("observation-mode").addEventListener("change",applyObservationMode);
  $("size").addEventListener("change",applyObservationMode);
  function showTurnStage(phase = 0,label = "") {
    for (const [i,item] of [...$("turn-stages").children].entries()) {
      item.classList.toggle("active",i+1===phase);
      item.classList.toggle("passed",i+1<phase);
    }
    $("turn-progress").textContent = phase ? `TURN ${world.turn+1} · ${phase}/3 ${label}（途中）` : "基準：1ターン約1秒 · 負荷が高い場合は自動減速";
    $("preview-note").hidden = !phase;
    $("selection").inert = false;
  }
  function readConfig() {
    const [width, height] = $("size").value.split(",").map(Number);
    const config = {
      generationModel:'diverse/1',generationSettings:generationSettings(),relationshipModel:'network/1',balanceModel:'survival/2',
      blockTurns: 500,
      randomModel: "table/1",
      producerModel:'colony/1',
      producerSettings:readProducerSettings(),
      largePlantModel:'independent/1',
      largePlantSettings:readLargePlantSettings(),
      ryoukiModel:'ryouki/1',
      ryoukiSettings:S.Ryouki.settings(),
      primaryParasiteModel:'primary/1',
      primaryParasiteSettings:S.PrimaryParasite.parameters(),
      hyperParasiteModel:'hyper/1',
      hyperParasiteSettings:S.HyperParasite.parameters(),
      informationModel:'persistent/1',
      informationSettings:S.PersistentInformation.parameters({influence:Number($("information-influence").value)}),
      ageModel:'life/1',
      ...readFounders(),
      observationMode: $("observation-mode").value,
      producerSupport: $("producer-supply").checked ? {enabled:true,...Object.fromEntries(["land","water"].map(r=>[r,Object.fromEntries(["nutrition","capacity","regrowth"].map(k=>[k,Number($("supply-"+r+"-"+k).value)/(k==="capacity"?100:1)]))]))} : {enabled:false},
      initialConditions:{version:1,density:{plant:0,...Object.fromEntries(["fungus","prey"].map(k=>[k,Number($("density-"+k).value)/100]))},resources:{...Object.fromEntries(["mineral","droplet"].map(k=>[k,Number($("resource-"+k).value)/100])),info:0},distribution:$("lower-distribution").value},
      advantageSettings: window.EcoObservationModel.settings(Object.fromEntries(
        ["producer","waterbug","hyperparasite"].map(k=>[k,$("advantage-"+k).checked]))),
      seed: crypto.randomUUID(),
      ecologyRevision: "observation/4.1",
      landscape: "templates",
      mapId: $("map-id").value,
      terrainSeed: crypto.randomUUID(),
      width,
      height,
      initial: $("group-main").checked ? Number($("initial").value) : 0,
      lineages: $("lineages").value,
      selected: [...$("lineage-options").querySelectorAll("input:checked")].map(
        (i) => i.value,
      ),
      weights: $("group-main").checked && $("distribution").value === "weighted" ? Object.fromEntries(
        [...$("weight-options").querySelectorAll("input")].map((i) => [
          i.dataset.weight,
          Number(i.value),
        ]),
      ) : {},
      placement: $("placement").value,
      distribution: $("distribution").value,
      guarantee: $("guarantee").checked,
      enabled: Object.fromEntries(
        Object.keys(groups).map((id) => [id, $("group-" + id).checked]),
      ),
    };
    if(config.generationSettings.mode==='auto')for(const [path,value]of Object.entries(generationBase)){
      if(generationLocks.has(path)||config.observationMode!=='custom'&&['mapId','initial'].includes(path))continue;
      const parts=path.split('.'),key=parts.pop();let at=config;
      for(const part of parts)at=at[part]??={};at[key]=structuredClone(value);
    }
    return config;
  }
  function message(text) {
    $("message").textContent = text;
    if (document.body.classList.contains("setup-screen")) setupMessage(text);
  }
  function setupMessage(text, error = false) {
    const el = $("setup-message");
    el.textContent = text;
    el.hidden = !text;
    el.classList.toggle("error", error);
    if (error) el.focus();
  }
  function syncSetupFields() {
    const fixed = $("observation-mode").value !== "custom";
    const main = $("group-main").checked;
    for (const id of ["initial", "lineages", "distribution", "placement", "guarantee"])
      $(id).disabled = fixed || !main;
    for (const input of $("lineage-options").querySelectorAll("input"))
      input.disabled = fixed || !main || $("lineages").value !== "manual";
    const weighted = $("distribution").value === "weighted";
    $("weight-options").hidden = !main || !weighted;
    for (const input of $("weight-options").querySelectorAll("input"))
      input.disabled = fixed || !main || !weighted;
  }
  function closeWorldDetails() {
    closeDetails();
    for (const id of ["guide", "results"])
      if ($(id).open){if(id==="results")closeAnalysis();$(id).close();}
  }
  function stop({discard=false}={}) {
    clearTimeout(interactionTimer);holds.clear();returnIntent=null;
    running=false;
    const hadPending=!!pendingTurn;
    try{restoreCommitted();}catch(error){discard=true;pendingTurn=null;}
    if(discard||world?.stopReason||ended){compute.close();prewarming=true;bufferWorld=null;bufferFingerprint=null;}
    else if(compute.initialized)bufferFingerprint=E.fingerprint(world);
    computeWaitAt=null;
    renderer.view.animate=false;
    if(hadPending&&world)message("途中の表示を取り消し、最後に確定したターンで一時停止しました。");
    $("start").textContent=world?.stopReason==="checkpoint"
      ?`次の${world.config.blockTurns||1000}ターンを続行 ▶`
      :world?.turn?"観測を再開 ▶":"観測を開始 ▶";
    $("step").disabled=!world||ended;
    updateHold();
    $("status").textContent=world?"一時停止":"未準備";
  }
  function prepare(config, playback = null) {
    const previousActivation=world?.config||{advantageSettings:window.EcoObservationModel.settings()};
    let next, nextObservations, nextInitialConfig;
    try {
      next = E.create(playback ? structuredClone(config) : {
        landscape:"templates",ageModel:"life/1",ecologyRevision:"observation/4.1",
        blockTurns:500,populationRegulation:{version:1},...config,
      });
      nextObservations=window.EcoObservations.create(next.config,window.EcoReplayVersion,{species:S.activeSpecies(next)});
      nextObservations.append(next);
      nextInitialConfig=structuredClone(next.config);
    } catch(error) {
      E.activate(previousActivation);
      throw error;
    }
    resultReadEpoch++;
    worldGeneration++;
    stop({discard:true});
    closeWorldDetails();
    setupMessage("");
    replayEntry = playback;
    ended = false;
    playbackError=null;faultKind=null;renderFaulted=false;
    pendingResult = null;
    $("export-result").hidden=true;
    $("finish-run").disabled = false;
    $("finish-run").textContent = playback
      ? "再生結果を新規保存"
      : "終了して図鑑へ保存";
    world = next;
    graphicsPrepared=false;observationPreparationAt=null;
    populationHistory = [];
    observations=nextObservations;graphFollow=true;followId=null;lastTracked=null;legendKey=null;
    if(!activeCatalogue().some(s=>s.id===activeLineage))activeLineage='abyss';
    document.body.classList.remove("setup-screen");
    checkpointKey = null;
    $("load").textContent = "この設定で新しい世界を作る ↗";
    $("setup-help").textContent =
      "新しい世界はこの設定から作成します。保存した結果は結果図鑑に残ります。";
    initialConfig = nextInitialConfig;
    showGenerationSettings(next.config);
    $("observation-mode").value = next.config.observationMode || "custom";
    const mode = next.config.modeResolved;
    $("active-mode").textContent = mode ? mode.name + " · " + mode.description.replace("途中の生体補充はありません。","動物の救済補充はありません。") +
      ` 主生物${next.config.initial}体。初期餌${Math.round(mode.initialFoodScale*100)}%。` : "自由設定 · 選択した初期条件で観察。";
    if(next.config.ecologyParameters)$("active-mode").textContent+=" 生活維持・繁殖を支える観察条件: 主の維持消費65%・移動消費60%、有性繁殖の栄養基準65%/鉱物2。追加優遇の有効/無効は以下に表示します。動物・寄生虫の救済補充なし。";
    const advantages=next.config.advantageSettings;
    for(const k of ["producer","waterbug","hyperparasite"])$("advantage-"+k).checked=advantages[k];
    $("active-mode").textContent+=" 優遇: "+[["producer","生産者"],["waterbug","水游虫"],["hyperparasite","高次寄生"]].map(([k,label])=>label+(advantages[k]?"ON":"OFF")).join(" / ")+"。";
    const support=next.config.producerSupport;$("producer-supply").checked=!!support?.enabled;
    for(const r of ["land","water"])for(const k of ["nutrition","capacity","regrowth"])$("supply-"+r+"-"+k).value=(support?.[r]?.[k]??(k==="capacity"?.35:1))*(k==="capacity"?100:1);
    $("producer-supply").onchange();
    $("active-mode").textContent+=support?.enabled?` 生産者供給あり（陸: 栄養${support.land.nutrition}・地点${support.land.capacity*100}%・再生${support.land.regrowth} / 水: 栄養${support.water.nutrition}・地点${support.water.capacity*100}%・再生${support.water.regrowth}）。外部入力は収支へ記録。`:" 生産者供給なし（途中の外部栄養入力なし）。";
    $('information-influence').value=next.config.informationModel==='persistent/1'?next.config.informationSettings.influence:1;
    const lower=next.config.initialConditions;
    const colonies=next.config.producerModel==='colony/1',foodScale=next.config.initialFoodScale||1;
    showProducerSettings(colonies?next.config.producerSettings:null,foodScale);
    showLargePlantSettings(next.config.largePlantModel==='independent/1'?next.config.largePlantSettings:undefined);
    if(lower){for(const k of ["fungus","prey"])$("density-"+k).value=+(lower.density[k]*100).toFixed(1);for(const k of ["mineral","droplet","info"])$("resource-"+k).value=lower.resources[k]*100;$("lower-distribution").value=lower.distribution;}
    else {for(const [k,v]of Object.entries({fungus:3,prey:6}))$("density-"+k).value=+(v*foodScale).toFixed(1);for(const k of ["mineral","droplet","info"])$("resource-"+k).value=100;$("lower-distribution").value="habitat";}
    if(colonies)$("active-mode").textContent+=' 生産者は個体と区別した群落。陸'+next.config.producerSettings.land.occupancy*100+'%／水'+next.config.producerSettings.water.occupancy*100+'%の適地を目標に配置。';
    if(next.config.largePlantModel==='independent/1')$("active-mode").textContent+=' 独立生産者 '+activeCatalogue().filter(independent).map(s=>s.name+' '+(next.stats.counts[s.id]||0)+'個体').join(' / ')+'。基底群落とは別枠です。';
    if(lower){const baseline=colonies?{plant:0,fungus:.03,prey:.06}:{plant:.35,fungus:.03,prey:.06},colonyChanged=colonies&&['land','water'].some(r=>{const c=next.config.producerSettings[r];return c.occupancy!==(r==='land'?.20:.15)||c.capacityB!==20*foodScale||c.initialFraction!==.7||Math.abs(c.regrowthB-c.capacityB*.1)>1e-8;}),changed=colonyChanged||Object.entries(baseline).some(([k,v])=>Math.abs(lower.density[k]-v*foodScale)>1e-8)||Object.values(lower.resources).some(v=>v!==1)||lower.distribution!=="habitat"||!support?.enabled||["land","water"].some(r=>Object.entries({nutrition:1,capacity:.35,regrowth:1}).some(([k,v])=>support[r][k]!==v));$("active-mode").textContent+=changed?" 下層・供給：調整あり。":" 下層・供給：基準設定。";}
    for(const s of founderSpecies)$("founder-"+s.id).value=next.config.founderCounts?.[["P","Q"].includes(s.group)?"parasites":"species"]?.[s.id]??"";
    if(S.PrimaryParasite.enabled(next)){const r=next.config.primaryParasiteInitial;$("active-mode").textContent+=' 一次寄生Pの新生活環。初期P '+r.actual+'/'+r.planned+'群体（実配置/予定）、不足 '+r.shortage+'。本人の相・年齢と宿主段階を別に記録。';}
    if(S.HyperParasite?.enabled(next)){const r=next.config.hyperParasiteInitial;$("active-mode").textContent+=' 高次寄生Q '+r.actual+'/'+r.planned+'群体（寄生中'+r.attached.actual+'／自立IV '+r.free.actual+'）、不足 '+r.shortage+'。初期IVは羽化成功に数えません。';}
    const founders=next.config.founderReport;$("founder-report").hidden=!founders;
    if(founders){
      $("active-mode").textContent+=" 種別・寄生初期数：調整あり。";
      $("founder-report-content").innerHTML=founderSpecies.filter(s=>!independent(s)||next.config.largePlantModel==='independent/1').map(s=>{const row=founders[["P","Q"].includes(s.group)?"parasites":"species"][s.id],unit=displayUnit(s,next.config)==='個体'?'体':displayUnit(s,next.config);return `<p>${escape(s.name)}：${row.actual}${unit}（${row.requested===null?"自動":"指定 "+row.requested+unit}）</p>`;}).join("");
    }else $("founder-report-content").textContent="";
    const report=next.config.initialReport;if(report){
      const placement=colonies?['land','water'].map(r=>{const c=next.colonyRegions?.[r];return (r==='land'?'陸':'水')+(Number.isSafeInteger(c?.initial)?c.initial:'未記録')+'/'+(Number.isSafeInteger(c?.target)?c.target:'未記録');}).join('・'):report.groups.plant.actual+'/'+report.groups.plant.requested;
      $("active-mode").textContent+=` 初期配置: 生産者${colonies?'群落 ':''}${placement}・分解者${report.groups.fungus.actual}/${report.groups.fungus.requested}・一次消費者${report.groups.prey.actual}/${report.groups.prey.requested}（実数/目標）。資源: 鉱物${report.resources.mineral}・水分${report.resources.droplet}・情報${report.resources.info}地点。`;
    }
    $("seed").value = next.config.seed;
    $("terrain-seed").value = next.config.terrainSeed ?? next.config.seed;
    $("map-id").value = next.config.mapId || "auto";
    const map = next.config.mapResolved;
    const mapName =
      map && window.EcoMapTemplates.list().find((m) => m.id === map.id)?.name;
    $("map-summary").textContent = map
      ? `${mapName} · 地形版 ${map.version} · ${map.width}×${map.height} · 地形指紋 ${map.terrainHash.slice(0, 12)}${map.fallback ? " · 安全な既定配置" : ""}`
      : "従来方式の地形";
    $("size").value = next.config.width + "," + next.config.height;
    $("initial").value = next.config.initial;
    for (const key of ["lineages", "distribution", "placement"])
      $(key).value = next.config[key];
    $("guarantee").checked = next.config.guarantee;
    for (const id of Object.keys(groups))
      $("group-" + id).checked = next.config.enabled[id];
    $("lineage-options").hidden = next.config.lineages !== "manual";
    $("weight-options").hidden = next.config.distribution !== "weighted";
    for (const input of $("lineage-options").querySelectorAll("input"))
      input.checked = next.config.selected.includes(input.value);
    for (const input of $("weight-options").querySelectorAll("input"))
      input.value = next.config.weights[input.dataset.weight] ?? 1;

    selectedId = null;
    selectedCell = null;
    describedSpecies = null;
    renderer.view.highlights=[];
    for(const input of $("species-key").querySelectorAll("input"))input.checked=false;
    $("presence-note").textContent="";
    renderer.view.selected = null;
    renderer.view.selectedEntity = null;
    renderer.beginWorld(worldGeneration);
    renderer.setWorld(world);
    renderer.fit();
    $("empty").hidden = true;
    $("start").disabled = false;
    $("step").disabled = false;
    $("reset").disabled = false;
    $("restart-world").disabled=false;
    lastMs = 0;
    const focal =
      [...world.organisms]
        .filter((o) => o.slot === "main")
        .sort((a, b) => {
          const distance = (o) =>
            Math.hypot(
              (o.cell % world.config.width) - world.config.width / 2,
              Math.floor(o.cell / world.config.width) - world.config.height / 2,
            );
          return distance(a) - distance(b);
        })[0] || world.organisms[0];
    // Keep the graphs visible initially; focusing the camera does not select an individual.
    applyObservationMode({resetLower:false});
    if(next.config.generationResolved){const g=next.config.generationResolved;$("active-mode").textContent+=' 条件生成: '+(S.WorldGeneration.profiles.find(p=>p.id===g.profile)?.name||g.profile)+' / 固定'+g.locks.length+'項目。供給・優遇・指定数は保持。';}
    if(next.config.balanceModel==='survival/2')$("active-mode").textContent+=" 初期主生物：寿命前半の年齢が混在。出生個体は年齢0。";
    if(next.config.populationRegulation)$("active-mode").textContent+=["survival/1","survival/2"].includes(next.config.balanceModel)?" 出生：低密度では繁殖しやすく、局所混雑・栄養収支で調整。":" 出生：局所混雑・栄養収支で調整。";
    R.assets.warmWorld?.(world);
    render();
    message(
      world.warnings.join(" / ") ||
        "世界を作りました。「観測を開始」で動きます。別の地形は「マップ・初期条件を変更」から選べます。",
    );
    return world;
  }
  function tick() {
    if (!world || ended || pendingTurn) return;
    compute.close();prewarming=true;bufferWorld=null;bufferFingerprint=null;
    renderer.view.animate = running;
    renderer.view.duration = 300;
    const start = performance.now(), next = E.step(world, { observeId: selectedId });
    return commitTurn(next,performance.now()-start);
  }
  function commitTurn(next, milliseconds) {
    try{observations.append(next);}catch(e){failObservation("観測記録",e);return world;}
    world = next;bufferWorld=world;bufferFingerprint=null;
    lastMs = milliseconds;
    try{renderer.setWorld(world);R.assets.warmWorld?.(world);updateTracking();render();}
    catch(error){failObservation("表示更新",error);return world;}
    if (replayEntry && world.turn >= replayEntry.turn) {
      stop({discard:true});
      ended = true;
      $("start").disabled = true;
      $("step").disabled = true;
      message(
        E.fingerprint(world) === (replayEntry.finalFingerprint||replayEntry.id)
          ? "再生終了：元の最終結果と一致しました。保存ボタンで新しい記録にできます。"
          : "再生終了：元の結果と一致しません。自動保存はしません。",
      );
    } else if (!replayEntry && world.stopReason === "main-extinct") {
      finishRun("main-extinct");
    } else if (world.stopReason && !replayEntry) {
      stop({discard:true});
      message(
        world.stopReason === "main-extinct"
          ? "主生物が全滅しました。他の生物群は残る場合があります。続行して観測できます。"
          : `${world.turn}ターンの観測区間で一時停止しました。続行できます。`,
      );
    } else if (lastMs > TURN_MS)
      message(
        "計算負荷に合わせて進行を減速しています。個体・出生・ターンは間引きません。",
      );
    else message("局所の状態から全個体を同期計算しています。");
    return world;
  }
  function runLoop() {
    try {
    timer=null;
    if (!running || holds.size || pendingTurn) return;
    if(prewarming&&observationPreparationAt!==null&&performance.now()-observationPreparationAt>60000){failObservation('準備','観測の準備が60秒以内に完了しませんでした。');return;}
    if(!graphicsPrepared){
      if(!renderer.prepared||R.assets.warming){
        $("status").textContent="観測の準備中";
        message(`背景・外観を準備中 · ${((performance.now()-observationPreparationAt)/1000).toFixed(1)}秒 / 全体の上限60秒。マップは操作できます。`);
        timer=setTimeout(runLoop,100);return;
      }
      graphicsPrepared=true;
    }
    if(!compute.initialized) {
      const limit=replayEntry?.turn || (world.blockEnd + (world.stopReason==="checkpoint"?(world.config.blockTurns||1000):0));
      prewarming=true;bufferWorld=world;bufferFingerprint=null;compute.init(world,selectedId,limit);
      if(!running)return;
    }
    if(prewarming && (!compute.length || !compute.ready)) {
      $("status").textContent="観測の準備中";
      message(`観測の準備中 · ${((performance.now()-(observationPreparationAt??performance.now()-compute.elapsed))/1000).toFixed(1)}秒 / 上限60秒。先行計算中もマップを操作できます。`);
      timer=setTimeout(runLoop,100);return;
    }
    if(prewarming){lastPreparationMs=observationPreparationAt===null?compute.elapsed:performance.now()-observationPreparationAt;prewarming=false;}
    const packet=compute.take();
    if(!packet){computeWaitAt??=performance.now();compute.fill(2);message(`次のターンを計算中 · ${((performance.now()-computeWaitAt)/1000).toFixed(1)}秒。自動で再開します。個体・ターンは省略しません。`);timer=setTimeout(runLoop,100);return;}
    computeWaitAt=null;
    const token=runGeneration,start=performance.now();
    const state=pendingTurn={phase:0,computeMs:packet.computeMs,preview:world,packet};
    compute.fill(2);
    function valid(){return running&&!holds.size&&token===runGeneration&&pendingTurn===state;}
    function advance(){
      if(!valid())return;
      try {
        const i=state.phase,preview=window.EcoTransport.apply(state.preview,packet.patches[i]);
        state.preview=preview;state.phase++;
        const visibleEvents=i===0?["light"]:i===1?["move","attack","feed","care","defend","clear","death"]:["growth","birth","infection"];
        const events=preview.events.filter(e=>visibleEvents.includes(e.type));
        state.previewTypes=[...new Set(events.map(e=>e.type))];
        renderer.view.animate=true;renderer.view.duration=TURN_MS/3;
        renderer.setWorld({...preview,events},true);
        showTurnStage(state.phase,["資源更新","移動・採食・戦闘","成長・繁殖"][i]);
        $("status").textContent="観測中";
        if(state.phase===3)timer=setTimeout(()=>{
          if(!valid())return;
          try{
            compute.acknowledge();pendingTurn=null;showTurnStage();renderer.view.animate=false;
            commitTurn(preview,packet.computeMs);
            if(running&&!holds.size)timer=setTimeout(runLoop,0);
          }catch(error){failObservation("表示更新",error);}
        },Math.max(100,TURN_MS-(performance.now()-start)));
        else timer=setTimeout(advance,Math.max(100,state.phase*TURN_MS/3-(performance.now()-start)));
      }catch(e){failObservation("表示更新",e);}
    }
    advance();
    }catch(error){failObservation("表示更新",error);}
  }
  let preparingWorld = false;
  $("setup").addEventListener("invalid", event => {
    const field = event.target;
    const details = field.closest("details");
    if (details) details.open = true;
    setupMessage("入力内容を確認してください：" + field.validationMessage, true);
  }, true);
  $("setup").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (preparingWorld) return;
    preparingWorld = true;
    $("load").disabled = true;
    $("setup").setAttribute("aria-busy", "true");
    try {
      const config = readConfig();
      const count = config.lineages === "all" ? setupMain.length : config.lineages === "few" ? 5 : config.selected.length;
      if (config.enabled.main && (!count || config.initial < count * 4))
        throw Error("参加系統を選び、系統ごとに最低4体の主生物を設定してください。");
      setupMessage("世界を生成しています…");
      prepare(config);
      if (!document.body.classList.contains("observatory"))
        $("focus-view").click();
    } catch (error) {
      setupMessage("世界を作成できませんでした：" + error.message + " 設定を修正して再試行してください。", true);
    } finally {
      preparingWorld = false;
      $("load").disabled = false;
      $("setup").removeAttribute("aria-busy");
    }
  });
  function returnSetup(){resultReadEpoch++;hold("settings");closeWorldDetails();document.body.classList.add("setup-screen");document.body.classList.remove("observatory");$("cancel-settings").hidden=!world;if(world){showProducerSettings(world.config.producerModel==='colony/1'?world.config.producerSettings:null,world.config.initialFoodScale||1);showLargePlantSettings(world.config.largePlantModel==='independent/1'?world.config.largePlantSettings:undefined);}showGenerationSettings(world?.config||{});$("resource-info").value=0;$("information-influence").value=world?.config.informationModel==='persistent/1'?world.config.informationSettings.influence:1;syncSetupFields();message("初期設定に戻りました。条件を選んで新しい世界を作れます。取消すと現在の観測へ戻ります。");}
  $("change-world").onclick=returnSetup;
  $("start").addEventListener("click", () => {
    if (running) {
      stop();
      return;
    }
    if (!world || ended || (replayEntry && world.turn >= replayEntry.turn))
      return;
    startRunning();
  });
  if(new URLSearchParams(location.search).has('smoke'))$("step").hidden=false;
  $("step").addEventListener("click", () => {
    stop();
    tick();
  });
  $("reset").addEventListener("click", () => {
    returnSetup();
  });
  $("restart-world").onclick=()=>{if(initialConfig){try{prepare(initialConfig,replayEntry);}catch(error){message("再作成できませんでした："+error.message);}}};
  async function downloadJSON(record){
    if(!record)return;try{const blob=await EcoExport.json(record),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`lifegame-result-${record.turn}T-${record.id.slice(-8)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){message('結果を書き出せませんでした：'+e.message);}
  }
  async function finishRun(reason = "user-ended",{explicit=false}={}) {
    if(!world)return;stop({discard:true});ended=true;$("start").disabled=true;$("step").disabled=true;
    if(replayEntry&&!explicit){message("再生を終了しました。自動保存はしません。保存ボタンで新しい記録にできます。");return;}
    const finishedWorld=world;
    $("finish-run").disabled=true;$("finish-run").textContent="保存中…";
    try{
      pendingResult ||= archive.capture(world,reason,observations.snapshot({copy:false}),replayEntry?.id||null);
      if(replayEntry)pendingResult.replayMatch=world.turn===replayEntry.turn?E.fingerprint(world)===(replayEntry.finalFingerprint||replayEntry.id):null;
      const record=pendingResult;await archive.retry();const saved=await archive.save(record,replayEntry?'replay-new':'normal');
      if(world!==finishedWorld)return;observations.markExported();$("finish-run").textContent="図鑑に保存済み";$("export-result").hidden=false;
      message(saved?(replayEntry?"元記録を残し、再生結果を新しい記録として保存しました。":"全期間グラフと最終結果を図鑑へ保存しました。結果から詳細を確認できます。"):"この結果は既に保存されています。");
    }catch(error){if(world!==finishedWorld)return;$("finish-run").disabled=false;$("finish-run").textContent="保存を再試行";$("export-result").hidden=!pendingResult;message("保存できませんでした："+error.message+" 結果は保持しています。");}
  }
  $("export-result").onclick=()=>downloadJSON(pendingResult);
  let resultReadEpoch=0;
  async function replayResult(id) {
    const epoch=++resultReadEpoch, previous=world;
    const record=await archive.get(id);
    if(epoch!==resultReadEpoch||world!==previous)return false;
    const entry = archive.replayRecord(record);
    prepare(entry.config, entry);
    if (entry.turn === 0) {
      ended = true;
      $("start").disabled = true;
      $("step").disabled = true;
    }
    message(
      "再生・記録なし：" +
        entry.turn +
        "ターンまで同じ初期条件から再計算します。",
    );
    $("start").textContent = "再生を開始 ▶";
    return true;
  }
  function resultName(record){
    const profile=record.generation?.profile||record.config.generationResolved?.profile;
    return (profile?(S.WorldGeneration.profiles.find(p=>p.id===profile)?.name||profile)+' / ':'')+(record.config.modeResolved?.name||'自由設定');
  }
  async function showResults() {
    const epoch=resultReadEpoch, previous=world;
    $("results-error").textContent="";
    try {
      await archive.retry();
      if(epoch!==resultReadEpoch||previous!==world||!holds.has("results"))return;
      $("results-list").innerHTML =
        archive
          .list()
          .map(
            (r) =>
              `<article class="result-entry"><h3>${escape(resultName(r))} · ${r.turn}T</h3><p>${escape(resultName(r))} · ${r.turn}ターン · 主生物 ${fmt(r.final.main)} · ${escape(r.config.mapResolved?.id || "従来地形")} · ${escape(Number.isFinite(Date.parse(r.created))?new Date(r.created).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}):"日時不明")}</p><button class="small" data-analyze="${escape(r.id)}">最終結果・全期間グラフ</button> <button class="small" data-replay="${escape(r.id)}">初期条件から再生（記録なし）</button> <button class="small secondary" data-remove="${escape(r.id)}">削除</button></article>`,
          )
          .join("") ||
        "<p>終了した観測はまだありません。一時停止では保存されません。</p>";
      for(const b of $("results-list").querySelectorAll("[data-analyze]"))b.onclick=()=>analyzeResult(b.dataset.analyze);
      for (const b of $("results-list").querySelectorAll("[data-replay]"))
        b.onclick = async () => {
          try {
            if(await replayResult(b.dataset.replay))$("results").close();
          } catch (e) {
            $("results-error").textContent = e.message;
          }
        };
      for (const b of $("results-list").querySelectorAll("[data-remove]"))
        b.onclick = async () => {
          try {
            await archive.remove(b.dataset.remove);
            showResults();
          } catch (e) {
            $("results-error").textContent = e.message;
          }
        };
    } catch (e) {
      $("results-error").textContent = e.message;
    }
    if(epoch===resultReadEpoch&&previous===world&&holds.has("results")&&!$("results").open)$("results").showModal();
  }
  $("finish-run").onclick = () => finishRun("user-ended",{explicit:true});
  $("open-results").onclick = () => {
    hold("results");
    showResults();
  };
  function closeAnalysis(){
    resultReadEpoch++;
    if(analysisState){summaryHome.after($("current-summary"));$("inspector-graphs").append($("graphs-panel"));$("graph-species").value=analysisState.target;$("graph-turn").value=analysisState.turn;graphFollow=analysisState.follow;}
    analysisData=null;analysisRecord=null;analysisState=null;$("results-analysis").hidden=true;$("results-list").hidden=false;if(observations?.rows.length){renderCurrentSummary(observations.rows.at(-1),activeCatalogue());renderGraphs();}
  }
  async function analyzeResult(id){
    const epoch=++resultReadEpoch, previous=world;
    try{const record=await archive.get(id);if(epoch!==resultReadEpoch||world!==previous)return;let data=null;if([2,3].includes(record.schema))data=window.EcoObservations.restore(record.observation,{species:D.species});
      if(!analysisState)analysisState={target:$("graph-species").value,turn:$("graph-turn").value,follow:graphFollow};
      analysisRecord=record;analysisData=data;$("results-list").hidden=true;$("results-analysis").hidden=false;
      $("result-analysis-title").textContent=`保存した最終結果 · ${record.turn}T`;
      $("result-analysis-summary").textContent=`主生物 ${record.final.main} / 下層 ${record.final.food} / P ${record.final.P} / Q ${record.final.Q}。`+(record.schema===3?" 最終状態の個別例は分類ごとの一部で、全個体の履歴ではありません。":"")+(data?'記録時の指標と全確定ターンを参照しています。':'旧記録には全期間グラフが保存されていません。値を再計算して補いません。');
      $("result-final-values").textContent=JSON.stringify({final:record.final,conditions:record.config,originRecordId:record.originRecordId||null,replayMatch:record.replayMatch??null,definitions:record.observation?.definitions||null},null,2);
      $("results-graph-host").hidden=!data;if(data){$("results-graph-host").append($("current-summary"),$("graphs-panel"));graphFollow=true;$("graph-turn").value=record.turn;renderGraphs();}
    }catch(e){$("results-error").textContent=e.message;}
  }
  $("back-results").onclick=closeAnalysis;$("export-record").onclick=()=>downloadJSON(analysisRecord);
  $("results").addEventListener("close",closeAnalysis);
  $("close-results").onclick = () => {closeAnalysis();$("results").close();};
  $("open-results-setup").onclick=()=>{hold("results");showResults();};
  $("detail-view").onclick = () => {
    if (!world) return;
    const p =
      selectedCell ?? world.organisms.find((o) => o.slot === "main")?.cell ?? 0;
    renderer.focus(p,selectedId);
  };
  $("focus-view").onclick = () => {
    const active = document.body.classList.toggle("observatory");
    $("focus-view").setAttribute("aria-pressed", String(active));
    $("focus-view").textContent = active
      ? "通常の観察配置 ↙"
      : "観察画面を広く表示 ↗";
    requestAnimationFrame(() => {
      if (renderer.view.mode === "overview") renderer.fit();
      else if (renderer.view.mode === "detail") $("detail-view").click();
    });
  };
  $("plane-separation").onchange=()=>{
    renderer.view.planeSeparation=$("plane-separation").checked;
    if(followId)updateTracking();
    else if(renderer.view.mode==="overview")renderer.fit();
    else {
      renderer.view.y+=(renderer.view.planeSeparation?1:-1)*window.EcoDisplayPlane.LIFT*renderer.view.scale/2;
      if(renderer.view.planeSeparation){
        const b=$("board").getBoundingClientRect(),safe=Math.max(48,(b.height-72)/(window.EcoDisplayPlane.LIFT+1.8));
        if(renderer.view.scale>safe)renderer.zoom(safe/renderer.view.scale);
      }
    }
    renderer.draw();
  };
  $("status-marks").addEventListener("change", () => {
    renderer.view.statusMarks = $("status-marks").checked;
    $("status-scope").disabled = !renderer.view.statusMarks;
    renderer.draw();
  });
  $("status-scope").onchange=()=>{renderer.view.statusScope=$("status-scope").value;renderer.draw();};
  $("age-emphasis").addEventListener("change", () => {
    renderer.view.ageEmphasis = $("age-emphasis").checked;
    renderer.draw();
  });
  for (const id of ["resources", "grid", "motion", "emphasis", "simplified"])
    $(id).addEventListener("change", () => {
      renderer.view[id] = $(id).checked;
    });
  $("fit").addEventListener("click", () => renderer.fit());
  $("zoom-in").addEventListener("click", () => renderer.zoom(1.4));
  $("zoom-out").addEventListener("click", () => renderer.zoom(1 / 1.4));
  const canvas = $("board");
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    mapInteraction(true);
    drag = {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 4)
      drag.moved = true;
    if (drag.moved) {
      followId=null;$("follow-note").textContent="手動移動でカメラ追跡を解除。生態は進行します。";
      renderer.view.x += dx;
      renderer.view.y += dy;
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (drag && !drag.moved) {
      const hit=renderer.hitAt(e.clientX,e.clientY,e.shiftKey);
      if(hit){select(hit.cell,hit.id,{groundOnly:hit.groundOnly,information:hit.information});hold("detail");}
    }
    drag = null;
    mapInteraction();
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
    mapInteraction();
  });
  canvas.addEventListener("lostpointercapture",()=>{
    if(drag){drag=null;mapInteraction();}
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!world) return;
      e.preventDefault();
      mapInteraction(!!drag);
      const b = canvas.getBoundingClientRect();
      renderer.zoom(
        Math.exp(-e.deltaY * 0.002),
        e.clientX - b.left,
        e.clientY - b.top,
      );
    },
    { passive: false },
  );
  canvas.addEventListener("keydown", (e) => {
    if (!world) return;
    if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-"].includes(e.key))mapInteraction();
    let cell = selectedCell ?? 0;
    const changes = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -world.config.width,
      ArrowDown: world.config.width,
    };
    if (e.key in changes) {
      e.preventDefault();
      select(S.clamp(cell + changes[e.key], 0, world.tiles.length - 1));
    }
    if (e.key === "+" || e.key === "=") renderer.zoom(1.4);
    if (e.key === "-") renderer.zoom(1 / 1.4);
  });
  function select(cell, id = null, {groundOnly=false,information=false} = {}) {
    // Selection reads committed state and does not invalidate prepared work.
    describedSpecies = null;
    selectedCell = cell;
    selectedId = information ? null :
      id ||
      (!groundOnly?world.organisms.find((o) => o.cell === cell && o.slot === "main")?.id:null) ||
      world.organisms.find((o) => o.cell === cell && (!groundOnly||o.slot!=="main"))?.id ||
      null;
    renderer.view.selected = cell;
    renderer.view.selectedEntity = selectedId;
    renderSelection();
  }
  function locate(id){
    if(!id||!world)return null;
    if(S.HyperParasite?.enabled(world)){
      const e=S.HyperParasite.locate(world,id);
      if(e?.q.id===id)return {host:e.host||e.carrier,entity:e.q,cell:e.cell,carcass:e.location==='carcass',hyper:e};
    }
    if(S.PrimaryParasite.enabled(world)){
      const e=S.PrimaryParasite.locate(world,id);
      if(e&&(e.p.id===id||e.p.q?.id===id))return {host:e.host||e.carrier,entity:e.p.id===id?e.p:e.p.q,cell:e.cell,carcass:e.kind==='carcass',primary:e};
    }
    for(const host of world.organisms){if(host.id===id)return {host,entity:host,cell:host.cell};if(host.infection?.id===id)return {host,entity:host.infection,cell:host.cell};if(host.infection?.q?.id===id)return {host,entity:host.infection.q,cell:host.cell};}
    for(const a of world.carcasses||[]){
      if(a.id===id)return {entity:a,host:a,cell:a.cell,carcass:true};
      if(a.infection && (world.turn<a.payloadExpires)){
        if(a.infection.id===id)return {entity:a.infection,host:a,cell:a.cell,carcass:true};
        if(a.infection.q?.id===id)return {entity:a.infection.q,host:a,cell:a.cell,carcass:true};
      }
    }
    const q=(world.searchQ||[]).find(q=>q.id===id);return q?{host:null,entity:q,cell:q.cell}:null;
  }
  function updateTracking(){
    const found=locate(followId);
    if(found){selectedId=followId;selectedCell=found.cell;lastTracked={id:followId,cell:found.cell,turn:world.turn,hostId:found.host?.id};const [x,y]=renderer.screen(found.cell,followId),b=$('board').getBoundingClientRect();renderer.view.x+=b.width/2-x;renderer.view.y+=b.height/2-y-(renderer.view.planeSeparation&&!found.carcass&&found.host?.slot==='main'?window.EcoDisplayPlane.LIFT*renderer.view.scale/2:0);$('follow-note').textContent='追跡中: '+followId;}
    else if(followId){const death=world.last.deathCauses.find(d=>d.id===followId||d.id===lastTracked?.hostId),cause=death?({combat:"戦闘",starvation:"栄養不足",harvest:"採食による喪失",age:"寿命"}[death.reason]||death.reason):"消失（確定理由の記録なし）";$('follow-note').textContent=`追跡終了: ${followId} · 最終確認 ${lastTracked?.turn ?? world.turn}T / マス${lastTracked?.cell ?? selectedCell} / ${cause}。`;followId=null;}
  }
  $('follow-individual').onclick=()=>{followId=followId?null:selectedId;updateTracking();};
  $('clear-highlights').onclick=()=>{renderer.view.highlights=[];for(const i of $('species-key').querySelectorAll('input'))i.checked=false;};
  function closeDetails(){describedSpecies=null;selectedId=null;selectedCell=null;followId=null;lastTracked=null;renderer.view.selected=null;renderer.view.selectedEntity=null;$("follow-note").textContent="";renderSelection();}
  $('close-species').onclick=closeDetails;
  for(const group of ["basal","prey","P","Q","resource"])$("names-"+group).onchange=()=>{renderer.view.names[group]=$("names-"+group).checked;renderer.draw();};
  function describeSpecies(id){
    if(describedSpecies===id){closeDetails();return;}
    describedSpecies=id;renderSelection();
  }
  function renderSpeciesDescription(id){
    const s=D.byId[id];
    const group=groups[s.group],diet=speciesDiet(s),unit=displayUnit(s);
    $('species-description').innerHTML=`<p class="eyebrow">${escape(group)}</p><h2>${escape(s.name)}</h2><canvas id="species-symbol" width="120" height="120"></canvas><p>現在 ${world.stats.counts[id]||0} ${unit}</p><p>${s.dietName ? escape(s.dietName) + ' · ' : ''}${escape(s.dietDescription || diet?.description || (s.id==='hyperparasite'&&S.HyperParasite?.enabled(world)?'P内で成長し、有償羽化に成功した同じQが自立IVになります。自立後は有限の有機物を採食し産卵します。':s.group==='plant'?'光合成を行い、他生物を支える生産者。':s.group==='fungus'?'有限の有機物を利用する分解者。':s.group==='prey'?'主生物の食物網を支える小型の一次消費者。':s.group==='P'?'宿主を移り生活環を進める一次寄生群体。維持費と排除により失われます。':'一次寄生虫の成熟移行期だけ感染。行動や局所情報へ作用する高次寄生群体。'))}</p><p>${s.good?.length?'得意環境: '+s.good.map(i=>D.environments[i].name).join(' / '):'適合する宿主・生息条件で活動'}${D.environments[s.bad]?' / 苦手: '+D.environments[s.bad].name:''}</p><p>${s.phases?'成長: '+s.phases.join(' → '):'進化相と寄生生活環は別の状態です。'} / ${world.stats.counts[id]?'盤面のチェックで全所在を強調できます。':world.config.enabled[s.group]?'現在の生体は0です。':'この観察では未参加です。'}</p>`;
    R.symbol($('species-symbol').getContext('2d'),id,60,60,42,R.symbolColor(s));
  }
  function parasiteDetails(id){const a=locate(id);if(!a)return '<p>対象は消失しました。別個体へ切り替えません。</p>';const q=a.entity,s=D.byId[q.species];return `<article class="specimen parasite"><h3>${escape(s.name)}</h3><p>${escape(q.id)}<br>宿主: ${escape(q.hostId || 'なし・探索中')}${a.carcass?"（感染性死骸・地表） / 残り"+Math.max(0,a.host.payloadExpires-world.turn)+"T":""}<br>${q.stage?stages[q.stage]+' / 成熟 '+q.counter+'/'+E.P.required[q.stage]+' / 負荷 '+fmt(q.load??.5):'Q '+phase(q.phase)+' / '+(q.cell!==undefined?'探索':'定着')}<br>E ${fmt(q.E)}${q.matureAt!==undefined?'<br>成熟移行 '+q.matureAt+'T / 感染窓 '+(q.matureAt+1)+'〜'+(q.matureAt+3)+'T':''}</p></article>`;}
  const primaryNumber=n=>Number.isFinite(n)?Number(n.toFixed(6)).toLocaleString('ja-JP',{maximumFractionDigits:6}):'未記録';
  const primaryRoute={contact:'接触',feeding:'実摂食',carcass:'死骸食',water:'水媒介'};
  const primaryStage={...stages,extra:'幼若終宿主で運搬'};
  const primaryOutcome={established:'定着',transferring:'移行準備',transferred:'同一Pの移行',clear:'排除',mature:'初回成熟',release:'感染体放出'};
  const primaryReason={maintenance:'維持費不足',development:'発育費不足',zero:'有効な曝露量なし',incompatible:'宿主・経路不適合',occupied:'宿主枠占有',dead:'宿主死亡',accumulating:'曝露量を蓄積中',invasion:'侵入不成立','missing-host':'対象宿主なし','small-dose':'定着量不足',establishment:'定着不成立','carrier-expired':'体外保持期限切れ',starvation:'栄養不足'};
  function primaryDetails(p,entry){
    const a=p.primary,age=S.PrimaryParasite.ageInfo(p),settings=S.PrimaryParasite.settings(world),last=a.last||{},host=entry?.host,
      value=primaryNumber,rows=(obj,names={})=>Object.entries(obj||{}).map(([key,n])=>escape(names[key]||D.byId[key]?.name||stages[key]||key)+' '+value(n)).join(' / ')||'未記録',resistance=host?.primaryResistance,
      route=last.route?primaryRoute[last.route]||last.route:null;
    return `<article class="specimen parasite primary-parasite" data-primary-id="${escape(p.id)}"><h3>${escape(D.byId[p.species].name)} · 1群体</h3><canvas class="portrait" width="116" height="116" data-primary-portrait="${escape(p.id)}"></canvas><p class="micro">${escape(p.id)}<br>形態 ${escape(a.form)} · ${escape({A:"付着",B:"潜行",C:"被覆"}[a.form]||"未記録")}<br>本人 ${phase(p.phase)}相 / 年齢 ${value(p.age)}T / ${age.stage==='elderly'?'老齢':'年齢成熟区分は非該当'}<br>出生時寿命 ${value(p.birthLife)}T / 無雌雄<br>所在 ${entry?.kind==='host'?'生体宿主内':entry?.kind==='carcass'?'感染性死骸に保持':entry?.carrier?.kind==='primary-migration'?'同一Pの宿主移行中':entry?.kind==='pending'?'体外保持中':'未記録'}<br>宿主ID ${escape(host?.id||'現在の生体宿主なし')} / Q ${escape(p.q?.id||'なし')}${entry?.kind!=='host'?'<br>保持期限 '+value(entry?.carrier?.payloadExpires??p.primary.bodyExpires??entry?.carrier?.expires)+'T':''}${entry?.carrier?.kind==='primary-migration'?'<br>移行先ID '+escape(entry.carrier.hostId)+' / 由来 '+escape(entry.carrier.sourceId)+' / 定着判定予定 '+entry.carrier.establishAt+'T':''}</p><p class="stats-line">宿主段階 ${primaryStage[p.stage]||'未記録'} / 発育 ${value(p.counter)}${Number.isFinite(settings.development[p.stage])?'/'+value(settings.development[p.stage]):'（運搬中・発育なし）'}<br>本人相の累積 ${value(a.successT)}T（初期分 ${value(a.initialSuccessT??0)}T / 開始後 ${value(Math.max(0,a.successT-(a.initialSuccessT??0)))}T） / B ${value(p.B)} / E ${value(p.E)}<br>移行後休止 ${value(Math.max(0,a.pauseUntil-world.turn))}T / 栄養不足継続 ${value(a.starvationRun)}T<br>初回終宿主成熟 ${Number.isSafeInteger(p.matureAt)?p.matureAt+'T':'未成立'}<br>直近経路 ${escape(route||'未記録')} / 結果 ${escape(primaryOutcome[last.outcome]||last.outcome||last.reason||'未記録')}${Number.isSafeInteger(last.outcomeAt)?'（'+last.outcomeAt+'T）':''}${last.reason?'<br>理由 '+escape(primaryReason[last.reason]||last.reason):''}<br>徴収 ${value(last.taxE)} E / 維持 ${value(last.maintenanceE)} E / 発育 ${value(last.developmentE)} E / 誘導 ${value(last.metaE)} E<br>不足 ${escape((last.blockers||[]).map(k=>primaryReason[k]||k).join(' / ')||last.failure||'不足の記録なし（成立を保証しません）')}</p><details><summary>遺伝適応と親由来</summary><p class="micro">感染成功・費用の宿主適応: ${rows(a.adaptation?.hosts)}<br>感染経路: ${rows(a.adaptation?.routes,primaryRoute)}<br>発育段階: ${rows(a.adaptation?.stages)}<br>遺伝した宿主の好み（適応・後天抵抗とは別）: ${rows(a.hostPreference)}<br>親 ${escape(a.parents?.join(' / ')||'初期配置')} / 世代 ${value(a.generation)}<br>変異 ${a.mutation?.occurred?'出生時の小変異あり':'なし'}。固定の遺伝適応と宿主選好・後天抵抗は別です。</p></details><details><summary>宿主の後天抵抗</summary><p class="micro">${resistance?.entries?.length?resistance.entries.map(r=>escape(D.byId[r.species]?.name||r.species)+' / '+escape(primaryRoute[r.route]||r.route)+' / 保持 '+value(r.value)+' / 当T実効 '+value(resistance.paidAt===world.turn?r.effective:0)+' / 更新 '+value(r.updatedAt)+'T').join('<br>'):'抵抗の記録なし'}<br>直近維持支出 ${value(resistance?resistance.paidAt===world.turn?resistance.lastPaidE:0:undefined)} E。排除経験による抵抗はPの遺伝形質へ書き戻しません。</p></details><button class="small" data-tree="${p.species}">本人相と生活環を確認 ↗</button><p class="note">体外・侵入中の感染量は生存群体数と別です。同じPの宿主移行は同IDで、娘群体は別IDです。${S.HyperParasite?.enabled(world)?'Q本人の成熟・羽化条件はQの詳細へ記録します。':'Qは従来の生活環で表示します。'}</p></article>`;
  }
  function primaryGuideHTML(){
    const s=S.PrimaryParasite.settings(world),r=world.config.primaryParasiteInitial;
    return `<h2>一次寄生P · 本人の相と宿主生活環を分ける</h2><div class="flow">曝露 → 経路適合 → 侵入 → 翌ターンの定着 → 発育 → 伝播・繁殖</div><div class="sheet-grid">${card('本人の相・年齢・形態',`<p>本人I→II→IIIは実維持・発育の成功${s.phaseThresholds[2]}/${s.phaseThresholds[3]}T。寿命基準${s.life}T、本人の相と宿主段階・年齢は別です。A付着/B潜行/C被覆は出生時の遺伝配分で固定し、宿主移行で相や年齢をリセットしません。</p>`)}${card('生存群体と感染量',`<p>一宿主一P群体。第一/中間/終宿主の進捗${s.development.first}/${s.development.middle}/${s.development.terminal}と、幼若終宿主での運搬を区別します。体外・侵入中の感染量は生体数へ加えず、有限量・実費・期限を別に記録します。同じPの移行は同ID、娘群体は別IDです。</p>`)}${card('適応・抵抗・実結果','<p>遺伝適応は宿主/経路/発育段階別。宿主選好や排除後の後天抵抗と混ぜません。曝露/侵入/定着は別の判定です。未観測や不適合を成功へ補完せず、横詳細と全ターンCSVに実結果・不足を残します。</p>')}${card('初期配置',`<p>予定${r.planned} / 実配置${r.actual} / 不足${r.shortage}群体。開始前の相・年齢・発育分散を、開始後の達成や出生として数えません。明示0と無効群を尊重します。</p>`)}${card('Qとの境界',S.HyperParasite?.enabled(world)?'<p>同じPの移行に既存Qが随伴し、娘PへQをコピーしません。Pの初回成熟時刻と新規侵入窓を保ちます。Qの羽化ではPだけが死亡し、同じQがIVへ離脱します。</p>':'<p>同じPの移行に既存Qが随伴し、娘PへQをコピーしません。Pの初回成熟時刻と既存の感染窓を保ちます。Qは従来の生活環と現在の記録定義で表示します。</p>')}</div>`;
  }
  function primaryAmountsHTML(cell){
    const pools=(world.primaryInocula||[]).filter(i=>i.cell===cell),living=S.PrimaryParasite.entries(world).filter(e=>e.cell===cell),
      groups=[['external','体外感染量',pools.filter(i=>i.kind!=='invading')],['exposed','曝露蓄積中量（侵入未抽選）',pools.filter(i=>i.kind==='invading'&&i.status==='exposed')],['invaded','侵入済量（翌T定着待ち）',pools.filter(i=>i.kind==='invading'&&i.status==='invaded')]],
      amount=i=>`<article class="specimen primary-infection-amount" data-inoculum-id="${escape(i.id)}"><h4>${escape(D.byId[i.species]?.name||i.species)} · ${escape(i.id)}</h4><p class="stats-line">量 ${primaryNumber(i.amount)} / 蓄え ${primaryNumber(i.E)} E<br>経路 ${escape(primaryRoute[i.route]||i.route||'未記録')} / ${escape({contact:'接触性',water:'水中',edible:'可食部付着',carcass:'死骸内',invading:i.status==='exposed'?'曝露蓄積中':'侵入済'}[i.kind]||i.kind)}<br>由来 ${escape(i.sourceId||i.parentId||'未記録')} / 対象宿主 ${escape(i.hostId||'なし')}<br>期限 ${Number.isSafeInteger(i.expires)?i.expires+'T':'未記録'}${Number.isSafeInteger(i.receivedAt)?'<br>到着 '+i.receivedAt+'T':''}${Number.isSafeInteger(i.invadedAt)?' / 侵入成立 '+i.invadedAt+'T':''}${i.status==='invaded'&&Number.isSafeInteger(i.establishAt)?'<br>定着判定予定 '+i.establishAt+'T':''}</p><p class="micro">有限の感染量であり、生存するP群体数へは加算しません。</p></article>`;
    return `<section data-primary-category="living"><h3>生存P群体 · ${living.length}群体</h3>${living.map(e=>`<button class="small" data-observe="${escape(e.p.id)}">P ${escape(D.byId[e.p.species].name)} · ${escape(e.p.id)} / ${e.kind==='host'?'生体宿主内':e.carrier.kind==='primary-migration'?'同一Pの移行中':'体外生存'}</button>`).join(' ')||'<p class="micro">このセルに生存Pの記録なし</p>'}</section>`+groups.map(([key,title,items])=>`<section data-primary-category="${key}"><h3>${title}</h3>${items.map(amount).join('')||'<p class="micro">このセルに感染量の記録なし</p>'}</section>`).join('');
  }
  const hyperState={egg:'P内の卵',larva:'P内の幼生',preparation:'羽化準備',adult:'自立成体'},
    hyperOutcome={established:'P内に定着',laid:'有限卵の産卵・侵入', 'invasion-failed':'侵入不成立','emergence-failed':'羽化失敗',emerged:'羽化成功・同じQがIVへ離脱',cleared:'Pから排除',dead:'死亡'},
    hyperReason={immunity:'Pの免疫排除',groom:'清掃排除',age:'寿命',maintenance:'維持費不足',predation:'被食','resistance-or-chance':'抵抗または羽化判定',invasion:'侵入判定',development:'発育不足',migration:'Pの移行休止',phase:'本人III相に未到達',maturity:'本人の成熟年齢未満',repreparation:'失敗後の再準備待ち','emergence-nutrition':'羽化試行・IV本体の栄養不足'};
  function hyperDetails(q,entry){
    const a=q.hyper,age=S.HyperParasite.ageInfo(q),s=S.HyperParasite.settings(world),last=a.last||{},p=entry?.p,host=entry?.host,resistance=p?.hyperResistance,
      value=primaryNumber,rows=(obj,names={})=>Object.entries(obj||{}).map(([key,n])=>escape(names[key]||D.byId[key]?.name||key)+' '+value(n)).join(' / ')||'未記録',
      window=Number.isSafeInteger(p?.matureAt)?`${p.matureAt+1}〜${p.matureAt+3}T（${world.turn>p.matureAt&&world.turn<=p.matureAt+3?'現在窓内':world.turn<=p.matureAt?'開始前':'窓終了'}）`:'初回成熟が未成立';
    return `<article class="specimen parasite hyper-parasite" data-hyper-id="${escape(q.id)}"><h3>抑環 · 1群体</h3><canvas class="portrait" width="116" height="116" data-hyper-portrait="${escape(q.id)}"></canvas><p class="micro">${escape(q.id)}<br>本人 ${phase(q.phase)}相 / 年齢 ${value(q.age)}T / ${escape({juvenile:'幼体',adult:'年齢成熟',elderly:'老齢'}[age.stage]||'未記録')}<br>本人の成熟年齢 ${value(age.matureAt)}T / 出生時寿命 ${value(q.birthLife)}T / 無雌雄<br>生活状態 ${escape(hyperState[a.state]||a.state)} / ${entry?.kind==='free'?'自立・局所移動':entry?.location==='carcass'?'生Pに随伴・感染性死骸上':entry?.location==='pending'?'生Pと宿主移行中':'P内に付随'}<br>現在のP ${escape(p?.id||'なし')} / H ${escape(host?.id||'現在の生体宿主なし')}${a.emergedFromPid?'<br>羽化元P '+escape(a.emergedFromPid)+' / 元H '+escape(a.emergedFromHid||'未記録')+' / 離脱 '+value(a.detachedAt)+'T':''}</p><p class="stats-line">本人経験 ${value(a.experience)}（初期分 ${value(a.initialExperience??0)}） / II ${value(s.phaseThresholds[2])}・III ${value(s.phaseThresholds[3])}<br>本人発育 ${value(a.development)}/${value(s.development)} / ${entry?.kind==='free'?'羽化準備 非該当（自立IV）':'再準備待ち '+value(Math.max(0,a.prepareUntil-world.turn))+'T'}<br>B ${value(q.B)} / E ${value(q.E)} / 産卵待ち ${value(Math.max(0,q.ready-world.turn))}T<br>栄養不足継続 ${value(a.starvationRun)}T${p?'<br>宿主P段階 '+escape(primaryStage[p.stage]||p.stage)+' / P初回成熟 '+(Number.isSafeInteger(p.matureAt)?p.matureAt+'T':'未成立')+'<br>新規侵入窓 '+window:''}<br>直近結果 ${escape(hyperOutcome[last.outcome]||last.outcome||'未記録')}${Number.isSafeInteger(last.outcomeAt)?'（'+last.outcomeAt+'T）':''}${last.reason?'<br>理由 '+escape(hyperReason[last.reason]||last.reason):''}<br>不足 ${escape((last.blockers||[]).map(k=>hyperReason[k]||k).join(' / ')||'不足の記録なし（成立を保証しません）')}</p><details open><summary>実際に支払った費用・取得</summary><p class="micro">Pから徴収 ${value(last.taxE)} E / 維持 ${value(last.maintenanceE)} E / 発育 ${value(last.developmentE)} E<br>Pへの小補正 ${value(last.metaE)} E / 情報投資 ${value(last.informationE)} E<br>羽化試行 ${value(last.emergenceE)} E / 移動 ${value(last.movementE)} E / 産卵 ${value(last.laidE)} E<br>通常採食の取得 ${value(last.feedingE)} E。情報は栄養にしません。</p></details><details><summary>遺伝適応・好み・親由来</summary><p class="micro">感染成功・費用のP適応: ${rows(a.genes?.hosts)}<br>経路適応: ${rows(a.genes?.routes,{contact:'接触'})} / 段階適応: ${rows(a.genes?.stages,{terminal:'終宿主内のP'})}<br>宿主Pの好み（適応とは別）: ${rows(a.preference)}<br>情報への遺伝配分: ${rows(a.genes?.investment,{promotion:'促進',distortion:'歪曲'})}<br>親 ${escape(a.parents?.join(' / ')||'初期配置')} / 世代 ${value(a.generation)} / 由来 ${escape(a.origin||'未記録')}<br>変異 ${a.mutation?.occurred?'出生時の小変異あり':'なし'}</p></details><details><summary>直接宿主Pの後天抵抗</summary><p class="micro">${resistance?'保持 '+value(resistance.value)+' / 当T実効 '+value(resistance.paidAt===world.turn?resistance.effective:0)+' / 更新 '+value(resistance.updatedAt)+'T<br>当T維持支出 '+value(resistance.paidAt===world.turn?resistance.lastPaidE:0)+' E':'現在のPに抵抗の記録なし'}。Pの後天抵抗をQの遺伝値へ書き戻しません。</p></details><button class="small" data-tree="hyperparasite">本人四相と羽化条件を確認 ↗</button><p class="note">本人の成熟・相・発育は別条件です。既に定着したQは新規侵入窓の終了後も発育できます。羽化成功は同じQのIV移行で、Hを直接殺しません。</p></article>`;
  }
  function hyperCellHTML(cell){
    const entries=S.HyperParasite.entries(world).filter(e=>e.cell===cell),eggs=(world.hyperInocula||[]).filter(i=>i.cell===cell),s=S.HyperParasite.settings(world);
    return `<section data-hyper-category="living"><h3>生存Q群体 · ${entries.length}群体</h3>${entries.map(e=>`<button class="small" data-observe="${escape(e.q.id)}">Q ${escape(e.q.id)} / ${e.kind==='free'?'IV自立成体':'P内に付随'}</button>`).join(' ')||'<p class="micro">このセルに生存Qの記録なし</p>'}</section><section data-hyper-category="invading"><h3>定着前の卵・侵入量</h3>${eggs.map(i=>`<article class="specimen" data-hyper-inoculum="${escape(i.id)}"><p class="stats-line">${escape(i.id)}<br>公称卵量 ${primaryNumber(i.E/s.eggReserve)} / 蓄え ${primaryNumber(i.E)} E<br>由来Q ${escape(i.parentId||i.sourceId||'未記録')} / 対象P ${escape(i.hostId)}<br>期限 ${primaryNumber(i.expires)}T / 定着判定予定 ${primaryNumber(i.establishAt)}T</p><p class="micro">定着前の有限在庫であり、生存Q群体数へは加算しません。</p></article>`).join('')||'<p class="micro">このセルに定着前の卵の記録なし</p>'}</section>`;
  }
  function hyperGuideHTML(){
    const s=S.HyperParasite.settings(world),r=world.config.hyperParasiteInitial;
    return `<section data-hyper-guide><h2>高次寄生Q · 本人四相と有償羽化</h2><div class="flow">P内I → II → III＋本人の成熟・発育・栄養 → 有償羽化 → 同じQの自立IV → 局所の産卵 → 娘Qの翌T定着</div><div class="sheet-grid">${card('本人の相・年齢とPの窓',`<p>本人II/IIIは経験${s.phaseThresholds[2]}/${s.phaseThresholds[3]}。成熟${s.maturity}T、発育${s.development}は別条件です。Pの初回終宿主成熟Tに対するT+1〜T+3窓は新規侵入だけに用い、既に定着したQの発育を止めません。</p>`)}${card('羽化の実結果',`<p>IIIと本人の成熟・発育・栄養・抵抗・再準備を満たすと、実効維持${s.emergenceMultiplier}T分を別途支払って試行。成功率基準${s.emergenceRate*100}%にPの抵抗を適用し、失敗は最低${s.prepareTurns}T再準備します。成功時だけPを殺し、同じQがIVへ離脱します。Hを直接殺さず、Qの年齢・出生時寿命をリセットしません。</p>`)}${card('IVの有限な生活',`<p>自立IVは局所移動・有機物の通常採食・被食・産卵を行います。情報は食べず、IVで新たな遠隔情報加工を始めません。初期IVと実測した羽化成功は別です。</p>`)}${card('初期配置と記録',`<p>予定${r.planned} / 実配置${r.actual} / 不足${r.shortage}群体。寄生中${r.attached.actual}・自立IV ${r.free.actual}。定着前の卵量と生体Qを分け、全確定Tへ株数・羽化試行/失敗/成功・産卵・娘定着・実費を記録します。</p>`)}</div></section>`;
  }
  const chartCatalogue=()=>analysisData?.metadata.species?.length?analysisData.metadata.species:activeCatalogue();
  function chartColor(s){if(!s)return '#839097';const ids=chartCatalogue().filter(a=>a.group===s.group),i=ids.findIndex(a=>a.id===s.id),h={plant:125,fungus:35,prey:185,main:220,P:18,Q:280}[s.group]??200;return `hsl(${h+i*2} 65% ${40+(i%5)*9}%)`;}
  let graphInspect=null;
  const baseGraphOptions=$('graph-species').innerHTML;
  $('inspector-graphs').append($('graphs-panel'));
  const summaryHome = document.createComment('Current ecosystem summary');
  $('current-summary').before(summaryHome);
  const graphObservation=()=>analysisData||observations;
  function paintStack(canvas,data,colors,maximum){
    const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,last=graphObservation().rows.length-1,keys=[...new Set(data.flatMap(r=>Object.keys(r.values)))],max=maximum||Math.max(1,...data.map(r=>r.total)),left=76,bottom=29,top=25,x=t=>left+(W-left-25)*t/Math.max(1,last),y=n=>H-bottom-n/max*(H-top-bottom),base=data.map(()=>0);
    g.clearRect(0,0,W,H);g.strokeStyle='#47646b';g.lineWidth=1.5;g.beginPath();g.moveTo(left,top);g.lineTo(left,H-bottom);g.lineTo(W-25,H-bottom);g.stroke();
    for(const [key,index]of keys.map((key,i)=>[key,i])){g.fillStyle=colors(key,index);g.beginPath();data.forEach((row,i)=>{const px=x(row.turn),py=y(base[i]+(row.values[key]||0));i?g.lineTo(px,py):g.moveTo(px,py);});for(let i=data.length-1;i>=0;i--)g.lineTo(x(data[i].turn),y(base[i]));g.closePath();g.fill();if(data.length===1)g.fillRect(left,y((data[0].values[key]||0)+base[0]),5,(data[0].values[key]||0)/max*(H-top-bottom));data.forEach((row,i)=>base[i]+=row.values[key]||0);}
    g.fillStyle='#bcd3d2';g.font='23px sans-serif';g.textAlign='right';g.fillText(Math.round(max),left-9,top);g.fillText('0',left-9,H-bottom);g.textAlign='left';g.fillText('0T',left,H-2);g.textAlign='right';g.fillText(last+'T',W-25,H-2);
    canvas.setAttribute('aria-label','0–'+last+'T / 最大'+max+'管理単位 / 現在'+(data.at(-1)?.total||0));
  }
  function renderCurrentSummary(row, catalogue) {
    const current=row?.current;if(!current)return;
    $("current-summary").dataset.turn=String(row.turn);
    setText("current-overall",current.summary.overall);
    const relations=current.relations;
    setText('current-breadth-values',`直近${Math.min(50,row.turn)}T：関与 ${relations.species}系統・${Object.keys(relations.edges).length}関係`);
    setText('current-diversity-values',`作用 ${relations.types.length}種類`);
    setText('current-persistence-values',row.turn<20?'継続：判定待ち':`継続 ${relations.continuous}関係`);
    const palette={plant:"#68ce8c",prey:"#53d2df",main:"#62a7ef",fungus:"#efb375",P:"#b88ae5",Q:"#d5b3f2"},c=$("current-donut"),g=c.getContext("2d"),cx=360,cy=270;
    g.clearRect(0,0,c.width,c.height);
    let angle=-Math.PI/2;
    for(const group of current.groups){if(!group.count)continue;const end=angle+group.count/Math.max(1,current.total)*Math.PI*2;
      g.beginPath();g.arc(cx,cy,151,angle,end);g.lineWidth=57;g.strokeStyle=palette[group.id];g.stroke();
      let at=angle;
      for(const member of catalogue.filter(v=>v.group===group.id)){const n=current.counts[member.id]||0;if(!n)continue;const to=at+n/current.total*Math.PI*2;g.beginPath();g.arc(cx,cy,207,at,to);g.lineWidth=31;g.strokeStyle=R.highlightColor(member.id);g.stroke();at=to;}
      angle=end;
    }
    if(!current.total){g.strokeStyle='#38545b';g.lineWidth=57;g.beginPath();g.arc(cx,cy,151,0,Math.PI*2);g.stroke();}
    g.textAlign="center";g.fillStyle="#d6e5df";g.font="34px sans-serif";g.fillText(current.total?"現在の構成":"生体なし",cx,cy+10);
    g.lineWidth=2;g.strokeStyle='#a2bfbb';g.beginPath();g.moveTo(cx-100,cy+114);g.lineTo(95,490);g.lineTo(95,514);g.moveTo(cx+170,cy+118);g.lineTo(590,490);g.lineTo(590,514);g.stroke();
    g.font='30px sans-serif';g.fillText('内側',130,552);g.fillText('外側',585,552);g.font='28px sans-serif';g.fillText('生物グループ',160,592);g.fillText('系統',585,592);
    $("current-legend").innerHTML=current.groups.map(group=>`<span title="${escape(group.name)} ${group.count}記録"><i style="background:${palette[group.id]}"></i>${escape(group.name)}</span>`).join("");
    c.setAttribute("aria-label",'内側は生物グループ、外側は系統。同じ全生物が分母。'+current.groups.map(group=>group.name+" "+(current.total?(group.count/current.total*100).toFixed(1)+"%":"0%")).join(" / "));
    renderCurrentStructure(row, catalogue);
  }
  function renderCurrentStructure(row, catalogue) {
    const p=row.current.pyramid,peak=Math.max(1,...p.layers),names=['生産者','一次消費者','二次消費者','高次（第4段以上）'];
    $('biomass-pyramid').innerHTML=p.layers.map((v,i)=>`<div class="pyramid-level" data-level="${i}" data-value="${v}"><span>${names[i]}</span><div><i style="width:${v/peak*100}%;background:${['#72c48e','#62cbd3','#6ba6dc','#9196d4'][i]}"></i></div><b>${fmt(v)}</b></div>`).reverse().join('')+`<p class="note">未観測 ${fmt(p.side.unknown)} B / 分解者 ${fmt(p.side.decomposer)} B<br>死骸 ${fmt(p.side.remains)}（別単位） / P-Q別枠</p>`;
    $('pyramid-support').textContent='生産 '+(p.production===null?'未記録':fmt(p.production)+' E')+' / 同化 '+(p.uptake===null?'未記録':fmt(p.uptake)+' E')+'（直近'+p.window+'T）。逆転だけでは異常と判定しません。';
    const history=graphObservation();
    if(window.EcoRelationshipNetwork&&history){
      if(analysisData&&$('saved-network-controls').dataset.record!==analysisRecord?.id){
        $('saved-network-controls').dataset.record=analysisRecord?.id||'';
        const last=history.rows.at(-1).turn,blocks=Math.max(1,Math.ceil(last/500));
        $('saved-network-controls').innerHTML=`<label>関係面の500T区切り <select id="saved-network-window">${Array.from({length:blocks},(_,i)=>{const end=Math.min(last,(i+1)*500);return `<option value="${end}" ${i===blocks-1?'selected':''}>${last===0?'0T':i*500+1+'–'+end+'T'}</option>`;}).join('')}</select></label>`;
        $('saved-network-window').onchange=()=>renderCurrentSummary(history.rows.at(-1),catalogue);
      }
      const selected=analysisData&&$('saved-network-window')?Number($('saved-network-window').value):row.turn;
      const model=EcoRelationshipNetwork.build(history,Math.min(row.turn,selected));
      $('relationship-network').innerHTML=EcoRelationshipNetwork.render(model,{symbols:R.symbolPaths,colors:Object.fromEntries(catalogue.map(v=>[v.id,R.symbolColor(D.byId[v.id]||{...v,color:'#91c4bf'})])),species:catalogue});
      if(analysisData){
        const byId=Object.fromEntries(catalogue.map(v=>[v.id,v.name])),label=id=>byId[id]||id.replace('@light','光').replace('@carcass:','死骸：').replace('@resource:','資源：');
        const blocks=[...(model.past||[]).filter(Boolean),model.current].filter(Boolean);
        $('saved-network-data').innerHTML=model.missing?'<p>この旧記録には100T関係面の原値がありません。現在値で補完しません。</p>':'<table><thead><tr><th>区間</th><th>観測T</th><th>作用</th><th>供給元・実行者 → 受け手</th><th>実績</th><th>線幅の尺度</th></tr></thead><tbody>'+blocks.flatMap(block=>block.edges.map(edge=>{const type=EcoRelationshipNetwork.types[edge.type],unit=edge.type==='parasitism'?'群体':type.unit,value=edge.type==='parasitism'?edge.rate:edge.value;return `<tr><td>${block.first}–${block.last}T</td><td>${block.observed}</td><td>${escape(type.name)}</td><td>${escape(label(edge.from))} → ${escape(label(edge.to))}</td><td>${primaryNumber(value)} ${unit}${edge.type==='parasitism'?'（平均）':''}</td><td>${primaryNumber(edge.rate)} ${edge.type==='parasitism'?'群体':unit+'/T'}</td></tr>`;})).join('')+'</tbody></table>';
      }
    }
  }
  let lastChartPaint=-Infinity,chartTimer=null,slowGraphs=false,lastChartData=null,lastChartTurn=-1,lastChartTarget=null;
  function scheduleGraphs(force=false){
    if(!graphObservation()?.rows.length)return;
    const graph=graphObservation(),last=graph.rows.at(-1).turn,target=$('graph-species').value;
    if(!force&&lastChartData===graph&&lastChartTurn===last&&lastChartTarget===target)return;
    const paint=()=>{clearTimeout(chartTimer);chartTimer=null;lastChartPaint=performance.now();lastChartData=graphObservation();lastChartTurn=lastChartData.rows.at(-1).turn;lastChartTarget=$('graph-species').value;if(!analysisData)renderCurrentSummary(observations.rows.at(-1),activeCatalogue());renderGraphs();};
    const delay=1000-(performance.now()-lastChartPaint);
    if(force||!slowGraphs||!running||analysisData||delay<=0)paint();
    else if(!chartTimer)chartTimer=setTimeout(paint,delay);
  }
  function renderGraphs(){
    if(!graphObservation()?.rows.length)return;
    const rows=graphObservation().rows,last=rows.length-1;
    const catalogue=chartCatalogue(),graphById=Object.fromEntries(catalogue.map(s=>[s.id,s])),catalogueKey=JSON.stringify(catalogue);
    if($('graph-species').dataset.catalogue!==catalogueKey){const value=$('graph-species').value;$('graph-species').innerHTML=baseGraphOptions+catalogue.map(s=>`<option value="${escape(s.id)}">${escape(s.name)}</option>`).join('');$('graph-species').value=[...$('graph-species').options].some(o=>o.value===value)?value:'main';$('graph-species').dataset.catalogue=catalogueKey;}
    $('graph-turn').max=last;$('graph-turn').disabled=running&&!analysisData;if(graphFollow||running&&!analysisData)$('graph-turn').value=last;
    const t=Math.max(0,Math.min(last,Number($('graph-turn').value)||0)),r=rows[t],target=$('graph-species').value;graphInspect=t;
    $('graph-range').textContent=`0–${last}T`;
    $('graph-readout').textContent=`参照 ${t}T / 主 ${r.main}・下層 ${r.food+independentCount(r.counts,catalogue)}${graphObservation().metadata.config.producerModel==='colony/1'?'記録（個体・群落）':'個体'} / P ${r.P}・Q ${r.Q}群体。全${rows.length}時点を保持。`;
    const population=graphObservation().series(target);paintStack($('graph-stacked'),population,id=>chartColor(graphById[id]));
    $('population-legend').innerHTML=Object.entries(population.at(-1).values).filter(([,n])=>n>0).map(([id,n])=>`<span><i style="background:${chartColor(graphById[id])}"></i>${escape(graphById[id]?.name||id)} ${n}</span>`).join('')||'現在の対象は0です';
    const series=Object.fromEntries(['phases','sex','ages'].map(k=>[k,graphObservation().series(target,k)])),max=Math.max(1,...series.phases.map(r=>r.total)),palettes={phases:['#80c9c0','#7ba9db','#a698d9','#e0bc76'],sex:['#e4acc5','#87c7e6','#c4d3b1'],ages:['#d8c779','#8dc5ae','#b9a6ca']};
    for(const axis of ['phases','sex','ages'])paintStack($('composition-'+axis),series[axis],(k,i)=>k==='nonapplicable'?'#526773':palettes[axis][axis==='phases'?Number(k):({female:0,male:1,none:2,juvenile:0,adult:1,elderly:2}[k]??i)%palettes[axis].length],max);
    const labels={phases:'I / II / III / IV / 非該当',sex:'雌 / 雄 / 無性別 / 非該当',ages:'幼体 / 成体 / 老齢 / 非該当'};
    for(const axis of ['phases','sex','ages'])$('composition-'+axis).title=labels[axis];
    const lanes=[['species','広がり · 関与系統','#7edbdf'],['types','多様さ · 作用種類','#e7c780'],['continuous','持続性 · 継続関係','#bc9eea']];
    $('graph-relations').innerHTML=lanes.map(([key,label,color],i)=>{const value=r=>key==='types'?r.current.relations.types.length:r.current.relations[key],m=Math.max(1,...rows.map(value)),top=i*51+18;return `<text x="0" y="${top}" fill="${color}" font-size="16">${label} ${key==='continuous'&&t<20?'判定待ち':value(r)}</text><path fill="none" stroke="${color}" stroke-width="2" d="${rows.map((r,j)=>(j?'L':'M')+(250+r.turn/Math.max(1,last)*450)+','+(top+23-value(r)/m*36)).join(' ')}"/>`;}).join('')+`<text x="250" y="178" fill="#9bbab7" font-size="14">0T</text><text x="700" y="178" text-anchor="end" fill="#9bbab7" font-size="14">${last}T</text>`;
    if (analysisData) renderCurrentSummary(rows.at(-1), catalogue);
    const info=r.information;
    $('information-readout').textContent=info?`情報（${r.turn}T）：生成${info.generated} / 取得${info.received} / 重み適用${info.applied} / Q媒介取得${info.mediatedReceived}・適用${info.mediatedApplied} / 由来不明${info.unattributed}。`:'情報の内訳：未記録（旧記録の情報関係は取得基準）。';
    $('information-readout').title='生成は成功した資源生成/増量の件数。適用は情報による非ゼロの直接重み変更。移動結果の変化やQの反実仮想的な寄与を意味しません。全ターン原値と変化量はCSV/保存結果で確認できます。';
    if(r.persistentInformation){const s=r.persistentInformation,f=r.persistentInformationFlow.all;
      $('information-readout').textContent=`非栄養情報（${r.turn}T）：量 ${primaryNumber(s.field.amount)} / ${s.field.origins}由来 / 生成 ${f.normalGenerated+f.lowGenerated} / 受容 ${f.originsRead} / 学習 ${f.learned} / 場所作用 ${f.placeApplications} / 受容費 ${primaryNumber(f.receptionCostE)} E。`;
      $('information-readout').title='生成・受容・実際の学習・場所作用は別の原値です。情報量は生体数・B・栄養Eへ加算しません。Qの促進/歪曲件数はQの利益や生存への因果を意味しません。全確定ターンをCSV/保存結果で確認できます。';
    }
    $('relation-readout').textContent='3系列は別尺度・0Tからの全期間。各点は直近50T、上の関係面は100T区間です。';
    if($('graph-values').dataset.catalogue!==catalogueKey){$('graph-values').dataset.catalogue=catalogueKey;$('graph-values').innerHTML=catalogue.map(s=>`<button class="small" data-graph-description="${escape(s.id)}">${escape(s.name)} <b>0</b></button>`).join('');}
    for(const b of $('graph-values').children){const value=String(r.counts[b.dataset.graphDescription]||0),label=b.querySelector('b');if(label.textContent!==value)label.textContent=value;if(b.disabled!==!!analysisData)b.disabled=!!analysisData;b.onclick ||= ()=>describeSpecies(b.dataset.graphDescription);}
  }
  $('graph-turn').oninput=()=>{graphFollow=false;renderGraphs();};
  $('graph-latest').onclick=()=>{graphFollow=true;renderGraphs();};
  $('graph-species').onchange=()=>scheduleGraphs(true);

  $('export-observation').onclick=async()=>{
    const graph=graphObservation();if(!graph)return;
    const through=graph.rows.at(-1).turn;const control=$('export-observation');control.disabled=true;
    try{const blob=await EcoExport.csv(graph),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ecology-turns-0-${through}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);graph.markExported(through);message('全ターンCSVのダウンロードを開始しました。保存先でファイルをご確認ください。');}catch(e){message('観測データを書き出せませんでした: '+e.message);}finally{control.disabled=false;}
  };

  const displayNames=['names-basal','names-prey','names-P','names-Q','names-resource'];
  function applyDisplaySettings(mode='custom'){
    if(mode!=='custom'){
      const light=mode==='maximum';
      $('motion').checked=!light;$('display-effects').checked=!light;$('display-action-marks').checked=true;
      $('status-marks').checked=!light;$('display-slow-graphs').checked=light;$('display-simple-background').checked=light;
      for(const id of displayNames)$(id).checked=false;
    }
    renderer.view.motion=$('motion').checked;
    renderer.view.effects=$('display-effects').checked;renderer.view.actionMarks=$('display-action-marks').checked;
    renderer.view.statusMarks=$('status-marks').checked;$('status-scope').disabled=!renderer.view.statusMarks;
    renderer.view.interactionSimplify=$('display-simple-background').checked;slowGraphs=$('display-slow-graphs').checked;
    for(const id of displayNames)renderer.view.names[id.slice(6)]=$(id).checked;
    $('display-load-state').textContent=mode==='normal'?'通常':mode==='maximum'?'最大軽減':'個別設定';
    renderer.draw();scheduleGraphs(true);
  }
  $('display-normal').onclick=()=>applyDisplaySettings('normal');
  $('display-maximum').onclick=()=>applyDisplaySettings('maximum');
  for(const id of ['motion','status-marks','display-effects','display-action-marks','display-slow-graphs','display-simple-background',...displayNames])$(id).addEventListener('change',()=>applyDisplaySettings());

  function drawPortrait(canvas, o) {
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    if(S.HyperParasite?.is(o)&&(R.assets.parasitePortrait||R.assets.parasite)(g,o,canvas.width/2,canvas.height/2,canvas.width*.38))return;
    if(S.PrimaryParasite.is(o)&&R.assets.parasite(g,o,canvas.width/2,canvas.height/2,canvas.width*.38))return;
    if(S.Ryouki.is(o)&&(R.assets.ryoukiPortrait||R.assets.ryouki)?.(g,{...o,facing:0},canvas.width/2,canvas.height/2,canvas.width*.28,0))return;
    if(independent(S.spec(o))&&(R.assets.producerPortrait||R.assets.producer)?.(g,{...o,facing:0},canvas.width/2,canvas.height/2,canvas.width*.28,0))return;
    if (S.spec(o).group === "main")
      R.creature(
        g,
        { ...o, facing: 0 },
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.28,
        true,
      );
    else
      R.food(
        g,
        o,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.27,
        world?.tiles[o.cell]?.env ?? 3,
      );
  }
  function infectionHTML(o) {
    const p = o.infection;
    if (!p) return '<p class="micro">寄生なし</p>';
    const q = p.q;
    if(S.PrimaryParasite.is(p))return `<details open><summary>宿主 H → ${escape(D.byId[p.species].name)} P ${q?'→ Q':''}</summary><p class="stats-line">P ${escape(p.id)} / 本人 ${phase(p.phase)}相・年齢 ${fmt(p.age)}T<br>宿主段階 ${primaryStage[p.stage]} / 発育 ${fmt(p.counter)}<br>Q ${escape(q?.id||'なし')}<br><button class="small" data-observe="${escape(p.id)}">このPの相・適応・経路結果 ↗</button></p></details>`;
    return `<details open><summary>宿主 H → ${D.byId[p.species].name} P ${q ? "→ 抑環 Q" : ""}</summary><p class="stats-line">P: ${escape(p.id)}<br>${stages[p.stage]} / 成熟 ${p.counter}/${E.P.required[p.stage]} / E ${fmt(p.E)}<br>宿主: ${escape(p.hostId)}<br>出産待機 ${Math.max(0, p.ready - world.turn)}</p>${q ? `<p class="stats-line">Q: ${escape(q.id)}<br>${phase(q.phase)}相 / E ${fmt(q.E)} / ${escape({ rectify: "整流", retain: "鮮度保持", modulate: "変調" }[q.special] || "未特化")}<br>宿主: ${escape(q.hostId)}<br>累積 発信/接触/取得: ${q.counts.join(" / ")}</p>` : ""}</details>`;
  }
  function producerColonyHTML(o){
    const c=o.colony,s=S.spec(o),elapsed=Number.isSafeInteger(c.establishedAt)?world.turn-c.establishedAt:null,
      value=n=>Number.isFinite(n)?fmt(n):'未記録',edible=Math.max(0,o.B-c.baseB),
      origin={initial:'初期配置',parent:'周辺群落から成立',environment:'環境から成立'}[c.origin?.kind]||'未記録';
    return `<article class="specimen producer-colony" data-colony-id="${escape(o.id)}"><h3>${escape(s.name)} · 1群落</h3><canvas class="portrait" width="116" height="116" data-portrait="${escape(o.id)}"></canvas><p class="micro">${escape(o.id)}<br>成立後経過 ${elapsed===null?'未記録':elapsed+'T'} / ${origin}<br>代表成長段階 ${phase(o.phase)}（内部株の年齢ではありません）</p><p class="stats-line">総B ${value(o.B)}<br>基部 ${value(c.baseB)} B / 可食量 ${value(edible)} B<br>可食容量 ${value(c.capacityB)} B<br>蓄え E ${value(o.E)} / M ${value(o.M)}<br>活性 ${Number.isFinite(c.activity)?value(c.activity*100)+'%':'未記録'}${edible===0?' / 基部が残存':c.activity===0?' / 衰退':''}<br>直近再生 ${value(c.last?.regrowthB)} B${Number.isSafeInteger(c.last?.turn)?'（'+c.last.turn+'T）':''}</p><p class="note">可食部の回復は同じIDの群落です。完全消失後の再成立は別IDとして記録します。内部株の寿命・年齢・性別は記録していません。</p>${infectionHTML(o)}</article>`;
  }
  const plantBranches=['生産','繁殖拡散','耐食'],plantFinals=[['高生産','省資源維持'],['少数大型の繁殖体','多数小型の繁殖体'],['組織保護','再生']];
  function independentPlantHTML(o){
    const s=S.spec(o),p=S.phenotype(world,o),a=S.ageInfo(o),plant=o.plant,last=plant.last,
      branch=Number.isInteger(o.branch3)?plantBranches[o.branch3]:'未分岐',final=Number.isInteger(o.branch4)?plantFinals[o.branch3]?.[o.branch4]:'',
      stage={juvenile:'幼体',adult:'成体',elderly:'老齢'}[a.stage],value=n=>Number.isFinite(n)?fmt(n):'未記録';
    return `<article class="specimen specimen-hero independent-plant" data-plant-id="${escape(o.id)}"><h3>${escape(s.name)} · 1個体</h3><div class="phase-name">${phase(o.phase)}相 / ${escape(branch)}${final?' · '+escape(final):''} / 無性繁殖</div><canvas class="portrait" width="384" height="300" data-portrait="${escape(o.id)}"></canvas><p class="micro">${escape(o.id)} · 世代 ${o.generation}<br>年齢 ${value(o.age)}T / ${stage||'未記録'} · 成熟 ${value(a.matureAt)}T / 老齢 ${value(a.elderlyAt)}T<br>出生時寿命基準 ${value(a.birthLife)}T（相や再生で若返りません）</p><div class="vital-bars"><span>E</span><progress max="${p.capE}" value="${o.E}"></progress><span>${value(o.E)} / ${value(p.capE)}</span><span>HP</span><progress max="${p.maxHP}" value="${o.HP}"></progress><span>${value(o.HP)} / ${value(p.maxHP)}</span></div><p class="stats-line">本体 ${value(plant.baseB)} B / 可食量 ${value(S.edibleB(o))} B<br>可食容量 ${value(plant.capacityB)} B / 総B ${value(o.B)}<br>蓄え E ${value(o.E)} / M ${value(o.M)}<br>活性 ${value(plant.activity*100)}% / 維持 ${value(p.maintenance)} E/T<br>累積実績 ${value(o.G)}（II 12 / III 36 / IV 80）<br>直近生産 ${value(last?.productionB)} B / 被食後再生 ${value(last?.regrowthB)} B / 消費 ${value(last?.consumedB)} B<br>光入力 ${value(last?.solarInputE)} E${Number.isSafeInteger(last?.turn)?'（'+last.turn+'T）':''}<br>出生待機 ${Number.isFinite(o.birthReady)?value(Math.max(0,o.birthReady-world.turn))+'T':'未記録'}<br>${s.id==='freshwaterlight'?'完全浮遊。I相から局所移動できます。':'定着した生産者です。'}可食部0でも生存本体を維持し、回復は同じIDです。</p><p class="micro">相ごとの形態見本</p><div class="phase-strip">${s.phases.map((name,i)=>`<div class="${i+1===o.phase?'active':''}"><canvas width="128" height="112" data-phase="${i+1}" data-owner="${escape(o.id)}"></canvas>${phase(i+1)}</div>`).join('')}</div><button class="small" data-tree="${s.id}">この系統の進化条件 ↗</button>${infectionHTML(o)}</article>`;
  }
  const ryoukiMorph=o=>o.ryouki.mutated?(o.phase===4?'相変異4':'相変異1〜3'):'通常型';
  function ryoukiHTML(o,p){
    if(!S.Ryouki.is(o))return '';
    const a=o.ryouki,last=a.last,settings=world.config.ryoukiSettings,cohabit=S.mainAt(S.maps(world),o.cell).filter(t=>t.id!==o.id),
      value=n=>Number.isFinite(n)?fmt(n):'未記録',purpose=world.turn===0?'初期状態・未実行':last?.goal||'未記録',
      limited=typeof last?.moveBudgetLimited==='boolean'?(last.moveBudgetLimited?'あり（合法な移動候補を予算で除外）':'なし'):'未記録';
    return `<section class="ryouki-state" data-ryouki-state="${escape(o.id)}"><p class="stats-line"><strong>${ryoukiMorph(o)}</strong> / 移動上限 ${p.speed}マス / 感知 ${p.sense}<br>同居実ID: ${cohabit.map(t=>escape(t.id)).join(' / ')||'なし'}<br>近傍の他量機 ${world.turn===0?'初期・未判定':value(last?.density)}<br>高密度継続 ${a.highRun}/${settings.highTurns}T（${settings.densityHigh}体以上）<br>低密度継続 ${a.lowRun}/${settings.lowTurns}T（${settings.densityLow}体以下）${a.mutated&&a.lowRun>=settings.lowTurns&&cohabit.length?'<br>通常枠を確保できず解除待ち':''}<br>確定した目的: ${escape(purpose)}<br>直近移動 ${value(last?.steps)}歩 / 移動費 ${value(last?.moveCost)} E<br>移動費不足: ${limited}<br>繁殖費用・条件の不足: ${o.birthBlockers?.length?o.birthBlockers.map(escape).join(' / '):'不足の記録なし（出生成立を保証しません）'}</p><p class="micro">相変異は可逆な状態です。本人の相・枝・ID・年齢を保ち、同居しても各個体の栄養と生死を別に記録します。</p></section>`;
  }
  function organismHTML(o) {
    if(world.config.largePlantModel==='independent/1'&&o.plant?.version==='independent-plant-state/1')return independentPlantHTML(o);
    if(world.config.producerModel==='colony/1'&&o.colony?.version==='colony-state/1')return producerColonyHTML(o);
    const s = S.spec(o),
      diet = speciesDiet(s),
      p = S.phenotype(world, o),
      main = o.slot === "main",
      hero = o.id === selectedId,
      age = S.ageInfo(o),
      ageLabel = { juvenile: "幼体", adult: "成体", elderly: "老齢" }[
        age.stage
      ];
    const powerContext = { traits: new Map([[o.id, p]]), intents: new Map() },
      powerDetails = age.enabled
        ? ["attack", "defense"]
            .map((kind) => {
              const v = E.B.power(world, o, kind, powerContext, true);
              return `${kind === "attack" ? "攻撃" : "防御"}：基礎${fmt(v.base)} × 年齢${fmt(v.ageFactor)} × 環境等${fmt(v.otherFactor)} → ${fmt(v.effective)}`;
            })
            .join("<br>")
        : "";
    const weights = main
      ? `<details class="strategy-data"><summary>行動パラメータを詳しく</summary><div class="observation-weights"><h4>この個体の行動パラメータ</h4>${o.weights.map((v, i) => `<div class="weight-row"><span>${D.weightNames[i]}</span><progress max="100" value="${v}"></progress><span>${fmt(v)}</span></div>`).join("")}</div></details>`
      : "";
    const affinity = main
      ? `<div class="affinities">${[
          ["attack", "攻撃"],
          ["defense", "防御"],
          ["move", "移動費"],
        ]
          .map(([key, name]) => {
            const v = E.B.environmental(world, o, key);
            return `<div><b>${name} ×${fmt(v)}</b><small>${key === "move" ? (v < 1 ? "得意" : v > 1 ? "苦手" : "標準") : v > 1 ? "有利" : v < 1 ? "不利" : "標準"}</small></div>`;
          })
          .join("")}</div>`
      : "";
    const actionNames = {
        move: "移動",
        attack: "攻撃",
        defend: "防御",
        feed: "採食",
        care: "育児",
      groom: "寄生除去",
        birth: "繁殖",
        growth: "進化",
        infection: "感染",
        light: "光利用",
      },
      outcomes = [
        ...new Set(
          world.events
            .filter((e) => e.id === o.id && actionNames[e.type])
            .map((e) => actionNames[e.type]),
        ),
      ],
      actionNote = hero
        ? `<p class="committed-action">直前の確定結果<br><strong>${outcomes.length ? outcomes.join("・") : world.turn === 0 ? "初期状態・未実行" : "該当イベントなし"}</strong></p>`
        : "";
    const birthNote=main&&hero?`<p class="note">繁殖判定: ${o.birthBlockers?.length?o.birthBlockers.map(escape).join(" / "):"基礎条件に不足なし（競合・交配成立を保証しません）"}</p>`:"";
    const preview =
      main && hero
        ? `<p class="micro">相ごとの形態見本 · 現在は${phase(o.phase)}相</p><div class="phase-strip">${s.phases.map((name, i) => `<div class="${i + 1 === o.phase ? "active" : ""}"><canvas width="128" height="112" data-phase="${i + 1}" data-owner="${escape(o.id)}"></canvas>${phase(i + 1)}</div>`).join("")}</div>`
        : "";
    return `<article class="specimen ${hero ? "specimen-hero" : ""}"${S.Ryouki.is(o)?' data-ryouki-id="'+escape(o.id)+'"':''}><h3>${escape(s.name)}</h3><div class="phase-name">${phase(o.phase)}相 · ${escape(s.phases?.[o.phase - 1] || s.name)} / ${sex[o.sex] || "無性"} ${roles[o.role] || ""}${S.Ryouki.is(o)?" / "+ryoukiMorph(o):""}</div>${main ? `<p class="diet-tag">${escape(s.dietName || diet.name)} · ${escape(s.dietDescription || diet.description)}</p>` : ""}<canvas class="portrait" width="${hero ? 384 : 116}" height="${hero ? 300 : 116}" data-portrait="${escape(o.id)}"></canvas><p class="micro">${escape(o.id)} · 世代 ${o.generation} · 年齢 ${o.age}ターン${age.enabled ? ` · <strong class="age-stage" data-age-stage="${age.stage}">${ageLabel}</strong> · 成熟${age.matureAt} / 老齢${age.elderlyAt}` : ""}</p><div class="vital-bars"><span>E</span><progress max="${p.capE}" value="${o.E}"></progress><span>${fmt(o.E)} / ${fmt(p.capE)}</span><span>HP</span><progress max="${p.maxHP}" value="${o.HP}"></progress><span>${fmt(o.HP)} / ${p.maxHP}</span></div>${ryoukiHTML(o,p)}${actionNote}${birthNote}${preview}${hero ? affinity + weights : ""}<details class="specimen-data"><summary>栄養・能力・系譜の詳細</summary><p class="stats-line">B ${fmt(o.B)} · M ${fmt(o.M)} · G ${fmt(o.G)}${s.group === "plant" ? "<br>可食葉B " + fmt(S.edibleB(o)) + " / 基部B " + fmt(Math.min(S.PLANT_BASE, o.B)) : ""}<br>食性 ${s.dietName || D.diets[s.diet]?.name || (s.group === "plant" ? "光合成" : s.group === "prey" ? "草食" : "菌類の分解吸収")}<br>寿命 ${p.life} · 維持E ${fmt(p.maintenance)}${age.enabled ? `<br>出生時寿命基準 ${age.birthLife}（進化しても固定）<br>通常姿勢の攻防（観測用）<br>${powerDetails}<br>年齢補正：攻撃×${fmt(p.ageFactors.attack)} / 防御×${fmt(p.ageFactors.defense)} / HP×${fmt(p.ageFactors.hp)}<br>移動費×${fmt(p.ageFactors.move)} / 回復×${fmt(p.ageFactors.healing)} / 繁殖待機×${fmt(p.ageFactors.birth)}<br>最大HP：基礎${p.baseMaxHP} → ${p.maxHP} / 維持：基礎${fmt(p.baseMaintenance)} → ${fmt(p.maintenance)}` : ""}<br>感知 ${p.sense} / 移動 ${p.speed} / 射程 ${p.range}<br>${main ? `枝: ${o.branch3 === null ? "未分岐" : s.branches[o.branch3]} ${o.branch4 === null ? "" : (s.fourthBranches||D.branch4)[o.branch3][o.branch4]}<br>出生待機 ${Math.max(0, o.birthReady - world.turn)} / 攻撃待機 ${Math.max(0, o.attackReady - world.turn)}<br>` : ""}${o.colony ? "集団 " + escape(o.colony) + "<br>" : ""}両親: ${escape(o.parents.join(", ") || "初期個体")}</p></details>${main ? `<button class="small" data-tree="${s.id}">この系統の進化条件 ↗</button><details><summary>基礎DNA</summary><p class="micro">DNAは出生時固定。行動パラメータは本人・一族・接触・情報の経験で変わります。</p>${S.DNA.map((k) => `<div class="weight-row"><span>${{ body: "体格", appendage: "付属器", senses: "感覚", skin: "外皮", aptitude: "代謝適性", sensitivity: "情報感度" }[k]}</span><span>${fmt(o.dna[k])}</span></div>`).join("")}</details>` : ""}${infectionHTML(o)}${world.diagnostics?.id === o.id ? `<details><summary>直近の候補上位3（観測用）</summary>${world.diagnostics.candidates.map((c) => `<p class="micro">${actions[c.type]} / 得点 ${fmt(c.score)} / 費用 ${fmt(c.cost)}<br>特徴: ${c.features.map(fmt).join(" / ")}</p>`).join("")}</details>` : ""}</article>`;
  }
  const informationMeaning={feeding:'資源利用',production:'生産',damage:'実被害',support:'支援・共存',reproduction:'繁殖・定着',competition:'混雑・競争',parasitism:'寄生関係'};
  const informationRole={producer:'生産者','primary-consumer':'一次消費者','secondary-consumer':'二次消費者','higher-consumer':'高次消費者',decomposer:'分解者',P:'P',Q:'Q'};
  const informationValues=values=>(values||[]).map(v=>escape(D.weightNames[v.axis]||v.axis)+' '+primaryNumber(v.value)).join(' / ')||'該当成分なし';
  function persistentGenerationHTML(g){
    if(!g)return '<p class="micro">生成判定の詳細は未記録。</p>';
    const e=g.evaluation,b=e?.benchmarks;
    return `<details data-information-generation><summary>生成時に固定した実績・抽選</summary><p class="micro">候補 ${g.kind==='normal'?'通常':g.kind==='low'?'根拠不足':escape(g.kind||'未記録')} / pN ${primaryNumber(g.pN)} / pL ${primaryNumber(g.pL)} / 抽選u ${primaryNumber(g.u)}<br>評価 ${e?.resolved?'S '+primaryNumber(e.S)+' / 維持A '+primaryNumber(e.A)+' / 役割B '+primaryNumber(e.B)+' / 関係C '+primaryNumber(e.C):'未評価'}<br>評価基準 ${escape(b?.species||'未記録')} / 維持 ${primaryNumber(b?.maintainedTurns)}T / 関係 ${primaryNumber(b?.relationTurns)}T / 子の成立 ${primaryNumber(b?.offspringSuccess)}<br>役割別基準量 ${Object.entries(b?.roleAmounts||{}).map(([k,v])=>escape(informationRole[k]||k)+' '+primaryNumber(v)).join(' / ')||'未記録'}</p></details>`;
  }
  function persistentFieldHTML(cell){
    const records=S.PersistentInformation.fieldAt(world,cell);
    return `<section data-persistent-field><h3>非栄養の情報場 · ${records.length}記録</h3><p class="note">情報量は生体数・B・E・Mと別です。読取だけでは量を消費せず、由来・元経験の鮮度・生成後の期限を更新しません。</p>${records.map(r=>`<article class="specimen" data-information-origin="${escape(r.originId)}"><h4>情報量 ${primaryNumber(r.amount)} · ${r.lowEvidence?'根拠不足（初期判断半重み）':'実経験由来'}</h4><p class="micro">由来 ${escape(r.originId)}<br>発信者 ${escape(r.sourceId)} / ${escape(D.byId[r.sourceSpecies]?.name||r.sourceSpecies)}<br>発信時の役割 ${(r.sourceRoles||[]).map(k=>escape(informationRole[k]||k)).join(' / ')}<br>生成 ${r.generatedAt}T / 期限 ${r.expires}T（残り ${r.expires-world.turn}T） / 実績S ${primaryNumber(r.score)}</p>${persistentGenerationHTML(r.generation)}${r.contents.map(c=>`<details open data-information-content="${escape(c.contentId)}"><summary>${escape(informationMeaning[c.meaning]||c.meaning)} · ${escape({normal:'通常',low:'根拠不足', 'confirmed-harm':'確認済み被害'}[c.evidence]||c.evidence)}</summary><p class="micro">元経験 ${c.experienceAt}T / 古さ ${world.turn-c.experienceAt}T / 鮮度 ${primaryNumber(S.PersistentInformation.freshness(c,world.turn))}（半減期 ${c.halfLife}T）<br>範囲 ${c.scope==='all'?'全層向け（局所の適合対象）':'同層向け'} / 役割 ${(c.roles||[]).map(k=>escape(informationRole[k]||k)).join(' / ')}<br>元の場所 ${Number.isInteger(c.context?.cell)?c.context.cell:'未記録'} / 環境 ${escape(D.environments[c.context?.env]?.name||'未記録')}<br>元内容 ${informationValues(c.originalValues)}<br>伝達内容 ${informationValues(c.values)}</p></details>`).join('')}<details data-information-q><summary>Qの出現促進と内容歪曲</summary><p class="micro">出現促進 ${primaryNumber(r.qEffects?.promotion)} / 歪曲 ${informationValues((r.qEffects?.vectors||[]).map((value,axis)=>({axis,value})).filter(v=>v.value!==0))}<br>${(r.qEffects?.traces||[]).map(t=>'加工Q '+escape(t.qId)+' / 直接P '+escape(t.pId)+' / 発信元 '+escape(t.sourceId)+' / 更新 '+t.updatedAt+'T / 離脱 '+(t.detachedAt===null?'未離脱':t.detachedAt+'T')+' / 支払 '+primaryNumber(t.paidE)+' E').join('<br>')||'Q加工の記録なし'}<br>生成時の歪曲は固定値です。元経験・実績を書き換えず、生成後にQの離脱減衰を重ねません。</p></details></article>`).join('')||'<p class="micro">このセルに有効な情報記録はありません。</p>'}</section>`;
  }
  function persistentSubjectHTML(o){
    const a=o.informationState,z=S.PersistentInformation.settings(world),evaluation=S.PersistentInformation.evaluate(world,o),last=a.last,place=last?.place;
    return `<details data-information-subject="${escape(o.id)}"><summary>本人経験・受取学習・場所作用</summary><p class="micro">本人 ${escape(o.id)} / 役割 ${S.PersistentInformation.roles(world,o).map(k=>escape(informationRole[k]||k)).join(' / ')}<br>実績評価 ${evaluation.resolved?'S '+primaryNumber(evaluation.S)+' / A '+primaryNumber(evaluation.A)+' / B '+primaryNumber(evaluation.B)+' / C '+primaryNumber(evaluation.C)+' / 基礎出現率 '+primaryNumber(evaluation.pBase):'未評価（役割基準の欠測を0補完しません）'}</p><h4>本人が確かめた実経験</h4>${a.experience.map(c=>`<p class="micro">${escape(informationMeaning[c.meaning]||c.meaning)} / ${c.count}件・${c.distinctTurns}T / 最終 ${c.lastExperienceAt}T<br>保持資格 ${c.count>=z.holdingCount&&c.distinctTurns>=z.holdingTurns?'到達':'未到達'}（${z.holdingCount}件/${z.holdingTurns}T） / 死亡時候補 ${c.confirmedHarm?'確認済み被害':c.count>=z.normalCount&&c.distinctTurns>=z.normalTurns?'通常':'根拠不足'}<br>${informationValues(c.values)}</p>`).join('')||'<p class="micro">本人実経験の記録なし。</p>'}<h4>他者から受け取った学習</h4>${a.learned.map(c=>`<p class="micro">由来 ${escape(c.originId)} / 発信者 ${escape(c.sourceId)}<br>受容 ${c.receivedAt}T / ${c.source==='environment'?'環境':c.caregiver?'実養育者':'通常個体'} / 内容 ${escape((c.contentIds||[c.contentId]).join(' / '))}</p>`).join('')||'<p class="micro">受取学習の記録なし。</p>'}<p class="micro">直近受容 ${last?last.turn+'T / '+last.received+'由来 / 実適用 '+last.applied+' / 変化量 '+primaryNumber(last.deltaAbs)+' / 費用 '+primaryNumber(last.costE)+' E':'未実行'}<br>${S.spec(o).group==='main'?'学習は現在の行動重みに反映します。': '受取学習の蓄積 '+informationValues(a.learnedPreferences.map((value,axis)=>({axis,value})).filter(v=>v.value!==0))}</p><h4>現在地で実際に使った場所作用</h4><p class="micro">${place?place.turn+'T / 誘引 '+primaryNumber(place.attraction)+' / 警戒 '+primaryNumber(place.warning)+' / 評価 '+primaryNumber(place.value)+'<br>由来 '+escape(place.origins.map(c=>c.originId).join(' / ')):'当Tの利用記録なし（候補照会や表示では加算しません）'}</p><p class="note">受取や場所の反復作用は本人の新経験ではありません。痕跡の期限切れだけで既存学習を消さず、DNAへ書き戻しません。k=${primaryNumber(z.influence)}。</p>${(o.hyperTraces||[]).length?`<h4>本人に残るQの有償痕跡</h4>${o.hyperTraces.map(t=>`<p class="micro">Q ${escape(t.qId)} / P ${escape(t.pId)} / 発信元 ${escape(t.sourceId)}<br>出現促進 ${primaryNumber(t.promotion)} / 歪曲強度 ${primaryNumber(t.distortion)} / 支払 ${primaryNumber(t.paidE)} E<br>離脱 ${t.detachedAt===null?'未離脱':t.detachedAt+'T / 失活 '+(t.detachedAt+z.traceLifetime)+'T'}。保持強度と死亡時の実効値は別です。</p>`).join('')}`:''}</details>`;
  }
  function persistentGuideHTML(){
    const z=S.PersistentInformation.settings(world);
    return `<section data-persistent-guide><h2>実経験から残る、非栄養の情報</h2><div class="flow">本人の実経験 → 死亡時に一度の生成判定 → 次Tから局所の受容・学習／場所作用</div><div class="sheet-grid">${card('量・鮮度・期限は別',`<p>情報量は痕跡の量で、栄養E/B/Mや生体数ではありません。元経験から半減期25/50/100Tで鮮度が下がり、生成後100〜200Tの期限を保持します。読取・拡散・Q加工では若返りません。</p>`)}${card('経験と受取',`<p>通常候補は3件/2T、保持・伝達資格は6件/3T。確認済み被害は別の通常候補、根拠不足は残余最大5%・初期判断半重みです。「正しさ50%」ではありません。本人経験と受取内容を分け、同じ由来の再読取を新経験にしません。</p>`)}${card('学習と場所作用',`<p>環境1・通常個体0.25・実養育者から幼体1。新規受容は最大2由来/T、1由来に維持費1%相当を支払います。学習蓄積と、その場所での一時的な誘引・警戒は別です。k=${primaryNumber(z.influence)}。0でも生成・受容・費用を維持し、両作用を0にします。</p>`)}${card('Qの促進と歪曲',`<p>有償痕跡は発信元1体に最大2つ。直接P・発信元・加工Qを分け、元の実績・経験・役割・期限を書き換えません。離脱後は半減期50T・100Tで失活し、生成時に固定された歪曲へ離脱減衰を重ねません。Q自立IVは既存情報を遠隔加工しません。</p>`)}${card('観測と保存',`<p>全確定ターンのstock/flowをCSVと結果へ保存します。量、取得数、学習・場所作用、Q加工を分け、情報の存在だけで成立関係や生存への利益を認定しません。旧世界は旧定義のままです。</p>`)}</div></section>`;
  }
  function renderSelection() {
    const speciesMode=!!describedSpecies,detailMode=speciesMode||selectedCell!==null;
    $('inspector-graphs').hidden=false;$('inspector-details').hidden=!detailMode;
    $('inspector-details').closest('.inspector').classList.toggle('has-detail',detailMode);
    const chartSelection=[describedSpecies,selectedCell,selectedId].join('|');
    const forceCharts=renderSelection.chartSelection!==chartSelection;renderSelection.chartSelection=chartSelection;
    if(world)scheduleGraphs(forceCharts);
    $("species-info").hidden=!speciesMode;$("selection").hidden=speciesMode;
    $("follow-individual").hidden=speciesMode;$("follow-note").hidden=speciesMode;
    $("close-species").hidden=!speciesMode&&selectedCell===null;
    document.querySelector(".inspector-heading").textContent=speciesMode?"◈ 系統の説明":S.PersistentInformation?.enabled(world)&&!selectedId?"◈ 選択中のマス":"◈ 選択中の個体";
    if(speciesMode&&world){const panel=document.querySelector(".inspector"),scroll=panel.scrollTop;renderSpeciesDescription(describedSpecies);panel.scrollTop=scroll;return;}
    if (!world || selectedCell === null) {
      $("follow-individual").disabled=true;
      $("selection").textContent = "盤面のマスを選択してください。";
      return;
    }
    const located = locate(selectedId);
    if(located)selectedCell=located.cell;
    const observed = located?.host;
    if (observed) {
      selectedCell = observed.cell;
      renderer.view.selected = selectedCell;
      renderer.view.selectedEntity = selectedId;
    }
    const [x, y] = S.xy(world, selectedCell),
      t = world.tiles[selectedCell],
      occupants = world.organisms
        .filter((o) => o.cell === selectedCell)
        .sort((a, b) => (a.slot === "main" ? -1 : b.slot === "main" ? 1 : 0)),
      resources = world.resources.filter((a) => a.cell === selectedCell),
      corpses = world.carcasses.filter((a) => a.cell === selectedCell);
    const inspectorScroll=document.querySelector(".inspector").scrollTop, savedScroll=$("selection").scrollTop, savedOpen=[...$("selection").querySelectorAll("details")].map(d=>d.open);
    $("selection").innerHTML =
      `<p class="note">${selectedId&&!located?"選択したIDは消失しました。同じマスの別個体へは追跡を切り替えていません。":""}</p><p class="cell-context">マス (${x}, ${y}) · ${D.environments[t.env].name}<br>${terrain[t.terrain]} / 遮蔽 ${cover[t.cover]}${t.blocked ? " / 通行不可" : ""}<br>光 ${fmt(t.light)} / 土壌M ${fmt(t.soilM)}</p>${occupants.map((o) => `<button class="small" data-observe="${escape(o.id)}">${o.slot === "main" ? "主" : o.slot === "producer" ? "生産者" : "餌"}: ${escape(S.spec(o).name)}${S.Ryouki.is(o)&&occupants.filter(S.Ryouki.is).length>1?" · "+escape(o.id):""}</button>`).join(" ")}${occupants.map(o=>`<span class="parasite-choices">${o.infection?`<button class="small" data-observe="${escape(o.infection.id)}">P ${escape(D.byId[o.infection.species].name)}</button>`:""}${o.infection?.q?`<button class="small" data-observe="${escape(o.infection.q.id)}">Q ${escape(D.byId.hyperparasite.name)}</button>`:""}</span>`).join("")}${(world.searchQ||[]).filter(q=>q.cell===selectedCell&&!S.HyperParasite?.enabled(world)).map(q=>`<button class="small" data-observe="${escape(q.id)}">Q 探索群体 ${escape(q.id)}</button>`).join("")}${S.HyperParasite?.is(located?.entity)?hyperDetails(located.entity,located.hyper):S.PrimaryParasite.is(located?.entity)?primaryDetails(located.entity,located.primary):selectedId?.startsWith("q:")||selectedId?.startsWith("p:")?parasiteDetails(selectedId):""}${occupants.map(organismHTML).join("")}${corpses.map(a=>`<p class="parasite-choices"><button class="small" data-observe="${escape(a.id)}">死骸: ${escape(D.byId[a.species].name)} / ${escape(a.slot)}</button>${a.infection&&(world.turn<a.payloadExpires)?`<button class="small" data-observe="${escape(a.infection.id)}">死骸上P</button>${a.infection.q?`<button class="small" data-observe="${escape(a.infection.q.id)}">死骸上Q</button>`:""}`:""}</p>`).join("")}${resources.map((a) => `<article class="specimen"><h3>${S.FOOD[a.kind].name} · 量 ${fmt(a.q)}</h3><p class="stats-line">E ${fmt(a.E)} / M ${fmt(a.M)} / G ${fmt(a.G)}<br>残存 ${a.expires === null ? "期限なし" : a.expires - world.turn + "ターン"}</p>${a.event ? `<p class="stats-line">情報源 ${escape(a.event.sourceId)}<br>文脈 ${D.environments[a.event.env].name} / 鮮度年齢 ${world.turn - a.event.time}<br>成分 ${a.event.values.map((v) => D.weightNames[v.axis] + " " + fmt(v.value)).join(" / ")}<br>${a.event.noise ? "撹乱情報" : "経験情報"} / ${a.event.mediator ? "Q媒介 " + escape(a.event.mediator.special) : "直接"}</p>` : ""}</article>`).join("")}${corpses.map((a) => {const appearance=renderer.deathAppearance(a.id);return `<p class="stats-line">死骸 ${D.byId[a.species].name} / q ${fmt(a.q)}<br>${appearance?"死亡時: "+phase(appearance.phase)+"相 / "+escape(appearance.sex||"無性別")+" / 年齢"+appearance.age+"T / 枝"+(appearance.branch3??"—")+"-"+(appearance.branch4??"—"):"死亡時の姿は未取得（基本画）"}<br>E ${fmt(a.E)} / M ${fmt(a.M)} / G ${fmt(a.G)}<br>${a.infection ? "感染残存 " + escape(a.infection.species) + " / 期限 " + a.payloadExpires : "感染なし"}</p>`;}).join("")}${!occupants.length&&!(S.HyperParasite?.enabled(world)&&S.HyperParasite.entries(world).some(e=>e.cell===selectedCell)) ? '<p class="note">生体なし。局所不在は系統全滅とは異なります。</p>' : ""}`;
    if(S.PersistentInformation?.enabled(world)){
      $("selection").insertAdjacentHTML('beforeend',persistentFieldHTML(selectedCell)+(located?.entity?.informationState?persistentSubjectHTML(located.entity):''));
    }
    if(S.PrimaryParasite.enabled(world))$("selection").insertAdjacentHTML('beforeend',primaryAmountsHTML(selectedCell));
    if(S.HyperParasite?.enabled(world))$("selection").insertAdjacentHTML('beforeend',hyperCellHTML(selectedCell));
    [...$("selection").querySelectorAll("details")].forEach((d,i)=>{if(savedOpen[i]!==undefined)d.open=savedOpen[i];});$("selection").scrollTop=savedScroll;document.querySelector(".inspector").scrollTop=inspectorScroll;
    $("follow-individual").disabled=!locate(selectedId);
    for(const c of $("selection").querySelectorAll('[data-hyper-portrait]'))drawPortrait(c,S.HyperParasite.locate(world,c.dataset.hyperPortrait).q);
    for(const c of $("selection").querySelectorAll('[data-primary-portrait]'))drawPortrait(c,S.PrimaryParasite.locate(world,c.dataset.primaryPortrait).p);
    for (const c of $("selection").querySelectorAll("[data-portrait]"))
      drawPortrait(
        c,
        occupants.find((o) => o.id === c.dataset.portrait),
      );
    for (const c of $("selection").querySelectorAll("[data-phase]")) {
      const o = occupants.find((a) => a.id === c.dataset.owner);
      drawPortrait(c, {
        ...o,
        phase: Number(c.dataset.phase),
        branch3: Number(c.dataset.phase) >= 3 ? o.branch3 : null,
        branch4: Number(c.dataset.phase) >= 4 ? o.branch4 : null,
      });
    }
    for (const b of $("selection").querySelectorAll("[data-observe]"))
      b.onclick = () => {
        describedSpecies = null;
        selectedId = b.dataset.observe;
        renderSelection();
      };
    for (const b of $("selection").querySelectorAll("[data-tree]"))
      b.onclick = () => {
        activeLineage = b.dataset.tree;
        openGuide("tree");
      };
  }
  function renderMapKey() {
    const counts=observations?.rows.at(-1)?.current.counts||world.stats.counts,catalogue=activeCatalogue(),key=catalogue.map(s=>s.id).join('|');
    if($("species-key").dataset.catalogue!==key){
      $("species-key").dataset.catalogue=key;
      $("species-key").innerHTML=['plant','prey','main','fungus','P','Q'].map(group=>`<section class="species-group" data-group="${group}" aria-label="${groups[group]}"><h4>${groups[group]}</h4><div class="species-key-items">${catalogue.filter(s=>s.group===group).map(s=>`<span class="map-key-item" data-species="${s.id}"><input type="checkbox" aria-label="${escape(s.name)}の所在を強調" data-highlight="${s.id}"><button class="species-button" data-describe="${s.id}"><canvas width="40" height="40" aria-hidden="true"></canvas><span>${escape(s.name)}</span><b data-count="${s.id}">0</b></button></span>`).join('')}</div></section>`).join('');
      for(const item of $("species-key").querySelectorAll(".map-key-item")){const sp=D.byId[item.dataset.species];item.style.setProperty("--presence-color",R.highlightColor(sp.id));R.symbol(item.querySelector("canvas").getContext("2d"),sp.id,20,20,14,R.symbolColor(sp));}
      for(const input of $("species-key").querySelectorAll("[data-highlight]"))input.onchange=()=>{renderer.view.highlights=[...$("species-key").querySelectorAll("[data-highlight]:checked")].map(i=>i.dataset.highlight);};
      for(const button of $("species-key").querySelectorAll("[data-describe]"))button.onclick=()=>describeSpecies(button.dataset.describe);
    }
    for(const s of catalogue){
      const count=counts[s.id]||0,node=document.querySelector(`[data-count="${s.id}"]`),item=node.closest(".map-key-item");
      node.textContent=count;
      if(!count&&item.contains(document.activeElement)){$("clear-highlights").focus({preventScroll:true});$("presence-note").textContent=s.name+"の現在個体数は0になりました。過去の記録と所在強調の選択は保持します。";}
      item.hidden=count===0;
    }
    for(const group of $("species-key").querySelectorAll('.species-group'))group.hidden=![...group.querySelectorAll('.map-key-item')].some(item=>!item.hidden);
    if ($("resource-key").childElementCount) return;
    $("resource-key").innerHTML = Object.entries(S.FOOD)
      .map(
        ([id, f]) =>
          `<span class="map-key-item" data-resource="${id}"><canvas width="40" height="40" aria-hidden="true"></canvas><span>${escape(f.name)}</span></span>`,
      )
      .join("");
    for (const item of $("resource-key").children)
      R.symbol(
        item.querySelector("canvas").getContext("2d"),
        item.dataset.resource,
        20,
        20,
        12,
        item.dataset.resource === "info" ? "#8be9ff" : "#e9d4a1",
      );
  }
  function render() {
    if (!world) return;
    const s = world.stats;
    renderMapKey();
    $("turn").textContent = world.turn;
    $("turn-limit").textContent = "/ " + world.blockEnd;
    $("status").textContent = running ? "観測中" : "一時停止";
    $("main-count").textContent = s.main.toLocaleString();
    $("food-count").textContent = (s.food+(s.producer||0)).toLocaleString();
    const lower={plant:0,prey:0,fungus:0};for(const group of observations?.rows.at(-1)?.current.groups||[])if(group.id in lower)lower[group.id]=group.count;
    const plantIndividuals=independentCount(observations?.rows.at(-1)?.counts||s.counts);
    $("food-breakdown").textContent=`生産者 ${world.config.producerModel==='colony/1'?lower.plant-plantIndividuals+'群落'+(world.config.largePlantModel==='independent/1'?'＋'+plantIndividuals+'個体':''):lower.plant} / 一次消費者 ${lower.prey} / 分解者 ${lower.fungus}`;
    $("parasite-count").textContent = s.P + " / " + s.Q;
    $("timing").textContent = lastMs ? Math.round(lastMs) + " ms" : "—";
    renderPopulation();
    if ($("rank-panel").open) renderRanking();
    const key = world.checkpoints.map(a => a.turn).join(",");
    if (checkpointKey !== key) {
      checkpointKey = key;
    $("checkpoints").innerHTML =
      '<div class="table-scroll"><table><tr><th>TURN</th><th>主</th><th>下層</th><th>P</th><th>Q</th></tr>' +
      world.checkpoints
        .map(
          (a) =>
            `<tr><td>${a.turn}</td><td>${a.main}</td><td>${a.food+independentCount(a.counts)}</td><td>${a.P}</td><td>${a.Q}</td></tr>`,
        )
        .join("") +
      "</table></div>";
    }
    if ($("budget-panel").open) renderBudget();
    renderSelection();
    if ($("guide").open && activeSheet === "tree") drawTree();
  }
  function renderRanking() {
    if (!world) return;
    const s = world.stats;
    $("ranking").innerHTML =
      activeCatalogue()
        .map(
          (a) =>
            `<div class="rank"><i class="dot" style="background:${a.color}"></i><span>${escape(a.name)}${!world.config.enabled[a.group] ? " · 未参加" : s.counts[a.id] === 0 ? " · 生体0" : ""}</span><strong>${s.counts[a.id]}</strong></div>`,
        )
        .join("") +
      `<p class="note">感染残存・待機 ${s.resting}<br>群体節足: 繁殖型 ${s.roles.queen} / 働育 ${s.roles.worker} / 雄 ${s.roles.male}<br>集団数 ${Object.keys(s.colonies).length}<br>出生 ${world.last.births} / 死亡 ${world.last.deaths}（当ターン）</p>`;
  }
  function renderBudget() {
    if (!world) return;
    const s = world.stats;
    $("budget-content").innerHTML =
      '<p class="stats-line">光からの投入E ' +
      fmt(world.ledger.solar) +
      (world.config.producerSupport?.enabled?" / 生産者への外部入力E "+fmt(world.ledger.producerE||0)+"・M "+fmt(world.ledger.producerM||0):"") +
      " / 散逸E " +
      fmt(world.ledger.sinks) +
      "<br>現存E " +
      fmt(s.totals.E) +
      " / 現存M " +
      fmt(s.totals.M) +
      " / M散逸 " +
      fmt(world.ledger.Mloss) +
      "<br>現在相 I/II/III/IV: " +
      s.phases.join(" / ") +
      "<br>感染段階: " +
      Object.entries(s.infectionStages)
        .map(([k, v]) => (S.PrimaryParasite.enabled(world)?primaryStage[k]:stages[k]) + " " + v)
        .join(" / ") +
      "<br>移行 " +
      world.tallies.transfers +
      " / 失敗 " +
      world.tallies.infectionFailures +
      (S.PersistentInformation?.enabled(world)?"<br>非栄養情報 量 "+primaryNumber(world.persistentInformationSummary.field.amount)+" / 累積生成量 "+primaryNumber(world.persistentInformationSummary.ledger.generatedAmount)+" / 累積失活量 "+primaryNumber(world.persistentInformationSummary.ledger.inactivatedAmount)+" / 当T受容 "+world.observation.persistentInformation.all.originsRead+" / 学習 "+world.observation.persistentInformation.all.learned+" / 場所作用 "+world.observation.persistentInformation.all.placeApplications+" / 受容費 "+primaryNumber(world.observation.persistentInformation.all.receptionCostE)+" E":"<br>情報 発信成功ターン " +
      world.tallies.information.emissionTurns +
      " / 新規受信 " +
      world.tallies.information.received +
      " / Q媒介 " +
      world.tallies.information.mediated) +
      "<br>採食E（吸収前・供給元別） " +
      Object.entries(world.tallies.sources)
        .map(([k, v]) => k + " " + fmt(v))
        .join(" / ") +
      "<br>死因 " +
      Object.entries(world.tallies.causes)
        .map(
          ([k, v]) =>
            ({
              combat: "戦闘",
              starvation: "栄養不足",
              harvest: "刈取り",
              age: "寿命",
            })[k] +
            " " +
            v,
        )
        .join(" / ") +
      '</p><div class="table-scroll"><table><tr><th>系統</th><th>出生</th><th>死亡</th></tr>' +
      activeCatalogue()
        .map(
          (a) =>
            "<tr><td>" +
            a.name +
            "</td><td>" +
            world.tallies.births[a.id] +
            "</td><td>" +
            world.tallies.deaths[a.id] +
            "</td></tr>",
        )
        .join("") +
      "</table></div>";
  }
  function renderPopulation() {
    const births = D.main.reduce((n, a) => n + world.tallies.births[a.id], 0),
      deaths = D.main.reduce((n, a) => n + world.tallies.deaths[a.id], 0);
    setText("main-balance", `出生 ${births} / 死亡 ${deaths}（累計）`);
    const sample = {turn: world.turn, count: world.stats.main};
    if (populationHistory.at(-1)?.turn !== sample.turn) {
      populationHistory.push(sample);
      // Exact turn records are retained by observations; no rolling deletion.
    }
    const current=observations.rows.at(-1)?.current;if(!current)return;
    if (!analysisData) scheduleGraphs();
    setText("parasite-count",(current.counts.tideparasite||0)+(current.counts.leafparasite||0)+" / "+(current.counts.hyperparasite||0));

  }
  for (const [id, fn] of [["rank-panel", renderRanking], ["budget-panel", renderBudget]])
    $(id).addEventListener("toggle", () => { if ($(id).open) fn(); });
  function updateCohortHint() {
    syncSetupFields();
    if (!$("group-main").checked) {
      $("cohort-hint").textContent = "主生物なしで、選択した生物群を観察します。";
      return;
    }
    const mode = $("lineages").value,total = Number($("initial").value),
      excludedRyouki=!!D.ryouki&&mode!=='few'&&$("distribution").value==='weighted'&&Number($("weight-options").querySelector('[data-weight="ryouki"]').value)===0&&(mode==='all'||$("lineage-options").querySelector('[value="ryouki"]').checked),
      count = (mode === "all" ? 20+(D.ryouki?1:0) : mode === "few" ? 5 : $("lineage-options").querySelectorAll("input:checked").length)-Number(excludedRyouki);
    $("cohort-hint").textContent = count ? `${count}系統 / 主生物${total}体 · 均等なら1系統あたり約${Math.floor(total/count)}体。少数の集団は配偶相手を失いやすくなります。生存は保証しません。` : "参加させる系統を選んでください。";
  }
  $("setup").addEventListener("input", updateCohortHint);
  $("setup").addEventListener("change", updateCohortHint);
  applyObservationMode();
  $("setup").addEventListener("focusin",()=>hold("settings"));
  $("cancel-settings").onclick=()=>{
    closeWorldDetails();
    if(document.body.classList.contains("observatory")===false)$("focus-view").click();
    document.body.classList.remove("setup-screen");release("settings");message("編集内容を適用せず、現在の世界の観測へ戻ります。");
  };
  for(const id of ["guide","results"])$(id).addEventListener("close",()=>release(id));
  for(const id of ["fit","zoom-in","zoom-out","overview-view","detail-view","focus-view","simplified","grid","resources","emphasis","age-emphasis","status-marks","motion"]){
    $(id)?.addEventListener("click",()=>mapInteraction(!!drag),true);
  }
  const card = (title, text) =>
    `<article class="sheet-card"><h3>${title}</h3>${text}</article>`;
  function qGrowthGuide(){
    const favored=world?.config.advantageSettings?.hyperparasite!==false;
    return `I · 完全支払い${favored?1:4}回 → II · 更に${favored?2:8}回とE${favored?"0.02":"0.2"} → III`;
  }
  const sheets = {
    system: () =>
      `<h2>基本システムから読む</h2><p class="note">自然配置は同系統4体の小組。生産者は光・葉量・モード・優遇に応じてEを得てBへ投資し、土壌Mも利用します。生産者の供給設定は光合成と別の外部入力として収支に記録します。</p><div class="flow">初期値 → 固定環境・初期生物 → 局所の同期更新 → 食物網・生存競争 → 観測</div><div class="sheet-grid">${card("セルと生物の重なり", "<p>マスには主生物1体、生産者/分解者1体、一次消費者1体の3枠があり、同じマスに共存できます。最大3種の落ちた資源は別です。一次寄生虫Pは各宿主に1群体、高次寄生虫QはPに1群体付随します。探索Qと感染性死骸も別に存在します。生物は独立個体、P/Qは群体の管理単位です。</p>")}${card("固定環境、変わる生命", "<p>6種類の事前地形から選び、地形用初期値で候補地点の地物を決めます。生態用初期値は個体と資源の配置・生態進行に使います。8環境と地形・光・障害物は開始後に変わりません。系統の得意・苦手環境で攻撃・防御・移動Eが変わります。境界は通行可能なら越えられ、環境ごとに生物を隔離しません。</p>")}${card("三段階の観察", "<p>自動観察は1ターン約1秒。資源更新、移動・採食・戦闘、成長・繁殖を順に表示します。途中はプレビューで、個体数や図鑑は確定した結果を使います。一時停止では最後の確定ターンへ戻ります。地図操作・個体選択では進みます。説明・図鑑・初期設定へ移る間は停止し、元が観測中なら同じ世界へ戻ると再開します。手動停止中も観察操作ができます。最大60秒の事前計算と上限6ターンの先行計算を使います。負荷が高いときは時間を伸ばし、個体やターンを省略しません。行動の軌跡と短いマークで成立した作用を示します。</p>")}${card("観察モードの条件", "<p>自由設定は従来の光合成入力と初期餌量。河畔・定着観察は7系統、湖沼・食物網観察は5系統で、主生物は小マップ160体から面積に比例します。両モードは高生産環境として光合成入力2倍。一次消費者の初期量は河畔25%増、湖沼50%増です。群密度・種別初期数・資源量は別欄で調整でき、生産者供給も自由設定から選択できます。動物・寄生虫の救済補充はありません。供給ONでは適地の生産者へ外部栄養と環境由来の定着が生じます。実効条件と実配置を図鑑へ保存します。</p>")}${card("10段階の同期ターン", "<ol><li>期限切れ・資源CA</li><li>光と行動候補</li><li>移動予約</li><li>同時戦闘</li><li>育児・採食</li><li>維持費・死亡</li><li>経験・寄生成熟</li><li>成長・繁殖</li><li>有償生産・情報・寄生出産</li><li>結果確定・観測</li></ol>")}${card("有限の収支", "<p>Eは使えるエネルギー、Bは身体の有機量、Mは鉱物、Gは累積成長値。光と、有効時の生産者供給が外部入力です。供給のE/Mは独立台帳へ記録し、食物は生物・死骸・土壌から支払います。植物は所在土壌Mを一口最大0.1取り、吸収率0.5の残りを土へ戻します。二口の上限を共有します。時間だけで食べた餌が無料復活することはありません。散逸分も台帳へ記録します。</p>")}${card("ライフゲーム由来の局所規則", "<p>鉱物片・鉱液滴・情報の発生候補は近傍8マスのB3/S23（3で出生、2/3で残存）。候補に加え供給元の予算・地形条件も必要です。主生物の出生は空き主枠の近傍主生物2〜3体と親条件を使います。生産者は通常B2/3（浮遊微藻はB1/2/3）、生産者優遇ONではB1/2/3。一次消費者は通常B2/3、水游虫優遇ONでは水游虫がB1/2/3です。各出生に成熟・栄養・材料・出生費が必要で、供給ONの環境由来定着は親からの出生と別に記録します。主生物の死因は飢餓・寿命・戦闘です。</p>")}${card("規模と観測の限界", "<p>小40×28、標準80×56、大160×112。基準は1ターン約1秒で、負荷超過時は実時間の進行を減速します。画面外も計算し、個体数を描画上限へ合わせません。500ターンで一時停止し、次区間へ続行できます。</p>")}</div>`,
    food: () =>
      `<h2>植物 → 一次消費者 → 主生物、そして分解者へ</h2><div class="flow">光 → 植物 → 一次消費者 → 主生物 → 死骸 → 菌・有機粒・土壌<br>${S.PersistentInformation?.enabled(world)?"本人の実経験 → 非栄養の情報痕跡 → 学習・場所作用":"本人の経験 → 情報エネルギー体 → 他個体の行動パラメータ"}</div><table class="food-table"><thead><tr><th>餌・生物</th><th>特色 / 主な供給元</th><th>不足・制約</th></tr></thead><tbody>${[
        [
          "微藻・岩苔・草本",
          "動かず光からEを生産。多く分布し、可食葉の刈取り量は小さく、基部B2を残します。微藻は浅水、岩苔は寒冷/静/湿潤の岩・浅瀬、草本は深水以外。",
          "生産者/分解者枠は共有。主生物・一次消費者と同居できます。葉量・維持費・寿命・土壌に依存し、供給ONなら設定に応じて支援されます。",
        ],
        [
          "浮遊微藻",
          "水中の独立した生産者。光と土壌由来の無機材料で増え、水游虫などの基盤になります。付着性の微藻とは別系統です。",
          "生産者枠を共有。適地と有限収支、B1/2/3の局所出生を使い、供給ONなら水域の支援設定が働きます。",
        ],
        [
          "菌膜",
          "死骸・有機物を利用する分解者。失活胞子は回復寄与1.2倍。",
          "光合成しない。生きた植物への刈取りでは増えない。",
        ],
        [
          "水游虫・草棲虫",
          "自ら移動し採食・繁殖する一次消費者。攻撃力0。水游虫は偶数ターンに移動候補。寿命・維持・防御・出生条件は選択した優遇に従い、水游虫優遇ONでは長寿・低維持になります。",
          "捕食には攻撃による死亡と死骸の採食が必要。無限栄養ではない。",
        ],
        [
          "種実・有機粒",
          "植物のBを有償で落とす植物性の餌。多いが1粒あたりは小さい。",
          "供給元のE/B/Mが足りなければ発生しない。",
        ],
        [
          "失活胞子",
          "菌由来の餌。回復向き、繁殖する菌そのものとは別。",
          "胞子を食べても新しい遺伝情報は得ない。",
        ],
        [
          "栄養卵",
          "一次消費者が支払って落とす動物性の餌。",
          "出生する個体とは別の資源。",
        ],
        [
          "鉱物片・鉱液滴",
          "土壌Mから有償で供給。鉱物片は4、鉱液滴は3ターン周期にCA更新。",
          "それだけでは有機Eを補えず、主生物は有機食も必要。",
        ],
        [
          "代謝因子",
          "主生物の有限分泌。直接Eと成長Gの補助。",
          "1マス1単位まで。",
        ],
        [
          "死骸",
          "死亡個体の残E+B、M、Gの一部を有限に保持。菌・主生物へ再循環。",
          "同系統の死骸は主生物の採食対象外。感染性には別の短い期限。",
        ],
        [
          "情報",
          S.PersistentInformation?.enabled(world)?"実経験に由来する非栄養の痕跡。生体数・B・Eへ加算しません。":"経験の滞留・浮遊するエネルギー体。系統を越えて局所へ伝わる。",
          S.PersistentInformation?.enabled(world)?"非消費読取。元経験の鮮度・有限期限・適用範囲・受容費を別に持ちます。":"Eは微量、Gなし。鮮度・文脈・重複拒否で効果が変わる。",
        ],
      ]
        .map(
          (row) =>
            "<tr>" + row.map((a) => "<td>" + a + "</td>").join("") + "</tr>",
        )
        .join(
          "",
        )}</tbody></table><div class="sheet-grid">${card("食性と吸収", "<p>主生物は植物・動物・菌・鉱物・雑食の得意食が系統ごとに異なります。同じ一口でも代謝DNA・固有特性・枝で吸収が変化します。満腹・全快の小型は葉を取らず、必要E/HP分だけ部分取得します。合計2口/ターン、残量を複数個体で調停し、同じ餌を二重取得しません。</p>")}${card("見た目は残量と環境に対応", "<p>残qの上限比で疎・中・密。植物はBで芽・葉群・繁茂へ。水域は水膜、寒冷は霜、熱域は乾いた縁、湿潤は菌糸など、同じ栄養種の外形を変えます。情報の光輪は鮮度の表示です。</p>")}</div>`,
    action: () =>
      `<h2>明示した戦略モードを持たない行動</h2><p class="note">成熟した繁殖型は、HP70・E35以上なら、可視の同系統・異性の繁殖型へ近づく/隣接を保つ候補の仲間特徴に0.8を加えます。仲間親和の重みで効き方が変わり、待機中も接触を保てます。出生のE/M/待機条件は別に判定します。</p><div class="flow">近傍の見える刺激 × 9パラメータ ＋ 空腹・負傷・費用 ＋ 固定された揺らぎ → 移動と作用をそれぞれ判定・採食も別に成立 → 実成果で更新</div><div class="sheet-grid">${card("9つの個体パラメータ", `<p>${D.weightNames.join(" / ")}。出生時は系統傾向と親の影響、以後は本人の成功・損失、近傍の仲間、情報で変わります。「群れる」「逃げる」「周回する」は組合せから見える結果で、群れ全体の司令塔はありません。</p>`)}${card("移動と適応", "<p>主生物は8方向1歩、相や系統により直線2歩。平地/浅瀬E1、岩1.3、深水1.4、泥1.5を基準とし、適応・環境・倒木/茂み・枝で変化します。岩塊・崖・斜めの岩角を通り抜けません。同枠の交換・押出し・予約落選後の再試行はありません。浅瀬は通行可能で、主生物は深水も移動費を払って渡れます。水生の主系統は深水コストが軽く、一次消費者は適地条件も満たす必要があります。各地形には陸・水の既定経路がありますが、全ての場所への到達を保証するものではありません。</p>")}${card("同じターンでできること", "<p>移動候補を決めて予約移動した後、攻撃・防御・育児・寄生除去などの作用を選び直します。採食はその後に別判定し、成立すれば移動・戦闘と同じターンに行えます。毎回3動作を強制せず、対象・空き枠・栄養・費用がなければ行いません。</p>")}${card("戦闘・射程", "<p>敵は異系統の主生物・一次消費者。同系統は仲間です。基本射程1、相と系統により2へ。射程2は攻撃85%・E4・待機2、近接E3。射線上の地形や間の生体で遮られます。各攻撃は同時に確定し、自動反撃はありません。</p><p><code>損害 = max(1, round(A − 0.5D))</code><br>A/DはDNA、相、固有特性、所在環境、枝で変化。防御姿勢や遮蔽はDを高めます。</p>")}${card("捕食と防衛", "<p>植物・菌は刈取り、敵生物は戦闘→死亡→有限死骸の採食。防御姿勢にはそのターンの攻撃がありません。小型の主生物は近傍の同系統成体へ寄りやすく、仲間付近の防衛成果は親和性へ影響します。</p>")}${card("経験とランダム性", "<p>実採食、実損害、生還、混雑、同方向の実益などを各値±2/ターンへ。ランダム性は候補ごとの固定ξを重み付けし、再表示で引き直しません。10ターンごとに出生時の重みへ1ずつ近づきます。DNAは変わりません。</p>")}${card("表示は結果の再生", "<p>移動・攻撃・採食・育児・防御・出生・成長・寄生を確定イベントから描画します。詳細演出は最大128体、各個体直近4件まで。描画の省略・拡大縮小・図鑑閲覧は生態計算を変えません。モーションを切ることもできます。</p>")}</div>`,
    birth: () =>
      `<h2>子は第一相から。年齢と進化相は独立。</h2><p class="note">年齢は出生からの時間、相は経験と資源で決まります。各相に幼体・成体・老齢があり得ます。進化しても若返らず、成熟で無料全快しません。幼体の攻防/HPは控えめで維持費が軽く、老齢は回復・移動費・出生待機にも補正が掛かります。老齢と負傷は別です。</p><div class="flow">I · G30 → II · G90＋M＋経験 → III · 3分岐 → IV · G210＋M＋枝経験 → 3×2の最終経路</div><div class="sheet-grid">${card("成長と分岐", "<p>I→IIはG30。II→IIIはG90、系統別M、採食/移動生還/戦闘の経験の首位4以上・差2（均衡している場合は累積18回から最多の経験）。III→IVはG210、追加M、枝内の経験首位3以上・差2。1ターンで1相だけ進み、新能力は翌ターンから有効です。確定した枝は変わりません。</p>")}${card("有性繁殖", "<p>相を問わず年齢が成体/老齢の同系統の雌雄、隣接・無被害・HP70以上・系統別Eの65%・各M2以上・待機0が必要。空きマスの近傍主生物2〜3体のB2/3候補を、親と出生枠の二段階予約で調停します。親は原則E20とM2ずつを支払い、一方の親から同日に複数出生しません。</p>")}${card("遺伝と雌雄差", "<p>子のDNA6値は両親平均に小さな差分。行動の出生重みには系統と親の不変出生基準を含みます。雌雄は同じ能力基盤。系統ごとの器官・輪郭・斑・階級の差を使い、年齢と進化相から独立して表します。出産で親の相を子へ引き継ぎません。</p>")}${card("早成甲殻 · 三相", "<p>この追加系統はIIIで完成。子もI相・年齢0ですが、初期から殻の完成度が高く、防御向きです。出生費は親E30ずつと高く、M・待機などの負担と交換になります。成長段階の少なさは子を成体として生む意味ではありません。</p>")}${card("浮遊傘 · 単為生殖", "<p>成熟雌が可視の同系統成熟雄を8ターン連続で見ず、HP70/E70/M4・無被害・待機0なら単為候補。本人がE40/M4を支払い雌のI相を生みます。有性繁殖を優先し、世界全体の雄不在を透視しません。</p>")}${card("群体節足 · 真社会性", "<p>繁殖雌・繁殖雄・不妊の働育雌。全員独立個体で、共同育児E2→幼体1.8が世代の存続を助けます。高投資の娘が次の繁殖型候補となり、IIIで新集団へ。女王が失われても自動救済はありません。集団由来と階級は個体観察で確認します。</p>")}${card("回復と繁殖復帰", "<p>有機吸収はまずE35まで補い、負傷があれば年齢補正後のHP上限まで回復し、余りはEへ。HP50は回復の上限ではなく行動の危機境界。小型餌は自分のE容量とHP上限を使います。</p>")}${card("出生にも有限収支", "<p>親が支払ったEは子のE/Bへ、Mは子と土壌へ分配。一次消費者・植物も少ない段階で成長し、光・食物と局所条件から繁殖します。死亡や採食と同じターンに費用を二重利用しません。</p>")}</div>`,
    parasite: () =>
      S.HyperParasite?.enabled(world)?primaryGuideHTML()+hyperGuideHTML():S.PrimaryParasite.enabled(world)?primaryGuideHTML():`<h2>宿主に付随する生物。H → P → Q。</h2><div class="flow">潮環：微藻 → 水游虫 → 水系の成熟主生物<br>葉環：草本 → 草棲虫 → 植物食/雑食の成熟主生物<br>幼い主生物へ入った場合：追加中間宿主 → 別の成熟主生物</div><div class="sheet-grid">${card("一次寄生虫Pの生活環", "<p>第一宿主で4回の完全支払いを受け、適合する小型餌が食べると中間へ。中間で6回、死亡後の感染性死骸を別の適合主生物が食べると終宿主へ。年齢が幼体なら追加中間となり、更に6回と別宿主への移行が必要。終宿主は8回で成熟します。</p>")}${card("費用・移行・失敗", "<p>宿主が負荷に応じてPへ有限Eを払い、P自身も維持費を必要とします。Qは蓄えと外部情報資源で維持し、宿主/Pへ追加徴収しません。体表Pは有償清掃、体内Pは有償免疫と資源不足で排除されます。移行日は旧宿主だけが払い、P/QのID・エネルギーを保ち、成熟を一日止めます。宿主不適合・感染済み・期限切れでは移行しません。</p>")}${card("出産は第一宿主へ戻る", "<p>成熟終宿主内のPはE0.1を使い、近くの適合第一宿主へ子を置きます。空き第一宿主がなければ8ターンの有限待機体へ。複数Pが同宿主を選ぶと局所調停し、落選者は別宿主へ取り直しません。Pを自由に歩く餌として描きません。</p>")}${card("高次寄生虫Qの進化", `<p>QはPに寄生。${qGrowthGuide()}。現在の高次寄生優遇${world?.config.advantageSettings?.hyperparasite!==false?"ON":"OFF"}の条件です。既存Pの終宿主内成熟直後の3ターンだけ感染可能。Pの成熟や能力値は直接変えず、行動と局所情報へ作用します。Qは宿主へ直接の新たな栄養負荷を重複請求しません。</p>`)}${card("この世界の初期探索Q", `<p>${world?.config.parasiteInitial?.createdSearchQ??0}群体を初期配置。${world?.config.founderCounts?.parasites.hyperparasite!==undefined?"種別指定":"自動設定"}の結果です。これは開始時の値で、現在数は個体数欄で確認できます。</p>`)}${card("間接的で技術的な操作", "<p>QIIIは累積の発信・接触・情報取得をもとに、整流/鮮度保持/変調へ特化。情報の一成分を半減、鮮度倍率1.25（上限1）、または固定−1/0/+1の変調を行います。E0.02、待機4、同イベントの再操作拒否があり、強制的な全域通信はできません。</p>")}${card("観測と本人の知覚は別", "<p>選択した宿主ではH/P/QのID・段階・成熟・エネルギー・特化を確認できます。生物本人はその観測画面を読みません。初期Pは適合第一宿主から選び、Qは適合条件があるとき探索群体を配置します。自動Qは一次寄生の初期群体数の半分（端数切捨て）が上限。優遇ONではその数、OFFでは従来の4〜16群体目標との小さい方を使います。種別の初期数指定があればそちらを使い、実数は「種別の初期配置結果」と保存条件で確認できます。実際の初期数は開始条件に記録され、観測途中の救済補充はありません。</p>")}</div>`,
    info: () =>
      S.PersistentInformation?.enabled(world)?persistentGuideHTML():`<h2>情報は、外に残った行動の作用。</h2><div class="flow">実際の経験 → 有償の情報分泌 → 局所B3/S23 → 鮮度・環境文脈・Q媒介 → 別個体の行動へ</div><div class="sheet-grid">${card("延長された表現型", "<p>情報は滞留・浮遊するエネルギー体として表現します。生物の実成果が環境に残り、別の個体の行動へ作用するモデルです。遺伝子の水平伝播ではなく、系統・DNA・繁殖条件・進化枝を直接書き換えません。</p>")}${card("系統を越えた局所伝達", "<p>本人の経験変化から絶対値の大きい2成分を候補にし、発信元のEを支払って近くへ生成。受け手の系統は問いません。世界全体へ一瞬で共有せず、元の発信時刻・環境文脈・発信者IDを保ちます。</p>")}${card("文脈と鮮度", "<p>同環境は文脈1、異環境は0.5。鮮度は経過0〜4/5〜9/10〜14/15〜19で1/0.75/0.5/0.25、20で失効。感度DNAと掛け、行動重みへの変化は成分±3以内。摂取待機5、既読ID4件で同じ情報の無限取得を防ぎます。</p>")}${card("撹乱も生態の一部", "<p>90%は実経験、10%は同じ成分の符号を反転し大きさ3へ変える撹乱情報。Qの変調も別に作用し得ます。情報が常に正しいとは限らず、同じ生態からどの動きが残るかを観測します。</p>")}${card("少ない栄養、行動への作用", "<p>情報餌は独立項目。Eは1単位0.05相当、Gはありません。有機餌や鉱物の代わりにして全生活を支えることはできません。光輪の濃さと選択表示で鮮度・発信源・媒介を区別します。</p>")}${card("固定長で計算する", "<p>情報イベントは期限付き、記憶は少数ID、Qの経験は3カウンタ。系統全体や家系の全履歴を常時検索せず、近傍と有限の状態から創発的な影響を作ります。</p>")}</div>`,
  };
  function drawIndependentTree(s,o){
    const conditions=[['好条件の高生産と省資源維持','光入力と維持の配分'],['一回の親費用と子の蓄え','近傍の適地・空き枠への定着'],['被食されにくい組織と被食後の更新','形成・再生へ実際に支払った量']],
      progress=o?`選択個体 ${escape(o.id)} / ${phase(o.phase)}相 / 年齢 ${fmt(o.age)}T / 累積実績 ${fmt(o.G)}。${o.phase<4?'次の相まで '+fmt(Math.max(0,[12,36,80][o.phase-1]-o.G)):'第四相へ到達'}。初期配置の高位相は実績獲得とは別です。`:'全分岐の参照図です。実際の到達状態とは別に表示しています。';
    $("guide-content").innerHTML=`<section data-independent-tree="${s.id}"><div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><label>系統を選ぶ<select id="tree-select">${activeCatalogue().map(a=>`<option value="${a.id}" ${a.id===s.id?'selected':''}>${escape(a.name)} / ${groups[a.group]}</option>`).join('')}</select></label></div><h2>${escape(s.name)} · 独立した生産者</h2><div class="tree-root"><div class="phase-box" data-plant-phase="1"><small>I</small><br>${escape(s.phases[0])}</div><span>実績12 →</span><div class="phase-box" data-plant-phase="2"><small>II</small><br>${escape(s.phases[1])}</div></div><p class="note">IIIは累積実績36、IVは80。維持・純生産・被食後再生・子の定着という実成果で進みます。移動しただけでは加点しません。</p><div class="tree-branches">${plantBranches.map((name,i)=>`<div><div class="phase-box" data-plant-phase="3" data-plant-third="${i}"><small>III</small><h4>${name}</h4><p>${conditions[i][1]}</p></div><div class="tree-finals">${plantFinals[i].map((name,j)=>`<div data-plant-phase="4" data-plant-third="${i}" data-plant-fourth="${j}">IV · ${name}<p>${conditions[i][0]}</p></div>`).join('')}</div></div>`).join('')}</div><div class="flow">${progress}</div><p class="note">本体1個体と有限の可食量を分けます。年齢成熟後はI/II相でも有限費用・待機・適地・近傍8セルの空き条件を通して繁殖でき、子はI相・年齢0です。相/枝と年齢は独立しています。${s.id==='freshwaterlight'?'根を持たず完全浮遊し、I相から移動できます。':'本体は定着し移動しません。'}</p></section>`;
    $('tree-select').onchange=e=>{activeLineage=e.target.value;drawTree();};
    const portrait=o||{species:s.id,slot:'producer',phase:4,age:s.maturity,birthLife:s.life,sex:null,facing:0,dna:{body:.5,appendage:.5},branch3:0,branch4:0,cell:0,B:24,plant:{version:'independent-plant-state/1',baseB:2,capacityB:32,activity:1}};
    drawPortrait($('tree-portrait'),portrait);
    for(const box of $('guide-content').querySelectorAll('[data-plant-phase]')){
      const c=document.createElement('canvas');c.width=144;c.height=112;c.className='tree-node-art';box.prepend(c);
      drawPortrait(c,{...portrait,phase:Number(box.dataset.plantPhase),branch3:box.dataset.plantThird===undefined?null:Number(box.dataset.plantThird),branch4:box.dataset.plantFourth===undefined?null:Number(box.dataset.plantFourth)});
    }
  }
  function drawRyoukiTree(s,o){
    const settings=world?.config.ryoukiSettings||S.Ryouki.settings(),g=s.experience,
      thirds=['新しい地点への到達','近傍の実在資源を利用','合法な難所を3歩以上通過'],
      finals=[['移動した8T以上、方向維持率65%以上','移動した8T以上、方向を変える実績'],['採食8T以上、平均利用距離1.5以内','採食8T以上、平均利用距離1.5超'],['水域/高温の通過8歩以上から水域の実績','水域/高温の通過8歩以上から高温の実績']],
      progress=o?`選択個体 ${escape(o.id)} / ${ryoukiMorph(o)} / ${phase(o.phase)}相 / 年齢 ${o.age}T / G ${fmt(o.G)} / M ${fmt(o.M)}`:'通常型の全経路と可逆な相変異の参照図です。実際の到達状態とは別に表示します。';
    $('guide-content').innerHTML=`<section data-ryouki-tree><div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><label>系統を選ぶ<select id="tree-select">${activeCatalogue().map(a=>`<option value="${a.id}" ${a.id===s.id?'selected':''}>${escape(a.name)} / ${groups[a.group]}</option>`).join('')}</select></label></div><h2>量機 · 通常型と可逆な相変異</h2><div class="tree-root"><div class="phase-box" data-ryouki-phase="1">I · 通常型</div><span>G${g.II} →</span><div class="phase-box" data-ryouki-phase="2">II · 通常型</div></div><p class="note">IIIはG${g.III}・M${s.M3}、IVはG${g.IV}・M${s.M4}をDNA補正。本人の維持・実採食・成功した移動から経験を得て、直近32Tの実績で分岐します。通常型の移動上限はI/II/III/IVで1/2/3/4マス。相と年齢は独立し、成熟すればI/IIでも繁殖できます。</p><div class="tree-branches">${s.branches.map((name,i)=>`<div><div class="phase-box" data-ryouki-phase="3" data-ryouki-third="${i}"><small>III</small><h4>${escape(name)}</h4><p>${thirds[i]}</p></div><div class="tree-finals">${s.fourthBranches[i].map((name,j)=>`<div data-ryouki-phase="4" data-ryouki-third="${i}" data-ryouki-fourth="${j}">IV · ${escape(name)}<p>${finals[i][j]}</p></div>`).join('')}</div></div>`).join('')}</div><h3>密度による相変異 · 系統や進化枝を増やしません</h3><div class="tree-root"><div class="phase-box" data-ryouki-mutated="early">相変異1〜3 · 背中だけ黒</div><div class="phase-box" data-ryouki-mutated="IV">相変異4 · 黒と深緑<br>成立した局所候補に繁殖準備の評価</div></div><p class="note">同セルと周囲8セルの他量機が${settings.densityHigh}体以上で${settings.highTurns}T連続すると相変異。${settings.densityLow}体以下が${settings.lowTurns}T連続し、通常の1個体枠を確保できると解除します。同居中は無償に押し出さず解除待ちです。相変異中は全相3マス、量機の相変異個体だけ同セル最大3個体。ID・齢・相・枝を保ち、追加の繁殖率倍率はありません。</p><div class="flow">${progress}</div></section>`;
    $('tree-select').onchange=e=>{activeLineage=e.target.value;drawTree();};
    const portrait=o||{species:'ryouki',slot:'main',phase:4,age:s.maturity,birthLife:s.life,sex:'female',facing:0,dna:Object.fromEntries(S.DNA.map(k=>[k,.5])),branch3:0,branch4:0,ryouki:{version:'ryouki-state/1',mutated:false}};
    drawPortrait($('tree-portrait'),portrait);
    for(const box of $('guide-content').querySelectorAll('[data-ryouki-phase],[data-ryouki-mutated]')){
      const c=document.createElement('canvas');c.width=144;c.height=112;c.className='tree-node-art';box.prepend(c);
      const mutated=box.dataset.ryoukiMutated!==undefined,p=mutated?(box.dataset.ryoukiMutated==='IV'?4:3):Number(box.dataset.ryoukiPhase);
      drawPortrait(c,{...portrait,phase:p,branch3:p>=3?Number(box.dataset.ryoukiThird||0):null,branch4:p>=4?Number(box.dataset.ryoukiFourth||0):null,ryouki:{...portrait.ryouki,mutated}});
    }
  }
  function drawPrimaryTree(s,p){
    const c=S.PrimaryParasite.settings(world);
    $('guide-content').innerHTML=`<section data-primary-tree="${s.id}"><div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><label>系統を選ぶ<select id="tree-select">${activeCatalogue().map(a=>`<option value="${a.id}" ${a.id===s.id?'selected':''}>${escape(a.name)} / ${groups[a.group]}</option>`).join('')}</select></label></div><h2>${escape(s.name)} · 本人三相と宿主生活環</h2><div class="tree-root">${[1,2,3].map(n=>`<div class="phase-box" data-primary-phase="${n}">${phase(n)} · 本人相${n>1?' / 実維持・発育 '+c.phaseThresholds[n]+'T':''}</div>`).join('')}</div><p class="note">本人の相・年齢・出生時寿命と、宿主段階は独立です。初期の高位相は開始後の実績とは別に記録します。A付着/B潜行/C被覆は出生時に固定される形態で、本人相や宿主段階から推定しません。</p><div class="flow">第一宿主 発育${c.development.first} → 中間宿主 発育${c.development.middle} → 終宿主 発育${c.development.terminal}<br>幼若な終宿主は有限の運搬状態。移行後1Tは発育を休み、同PのID・年齢・Q参照を保持します。</div><p class="note">曝露→適合→侵入→翌T定着は別の成立条件です。体外感染量や侵入中量を生存P数へ加算せず、娘Pを同一Pの宿主移行と混同しません。Qと情報は現在の記録定義で表示します。</p><div class="flow">${p?'選択P '+escape(p.id)+' / 本人'+phase(p.phase)+'相 / 年齢'+fmt(p.age)+'T / 宿主段階 '+primaryStage[p.stage]:'本人相の参照図です。宿主段階や年齢の推定ではありません。'}</div></section>`;
    $('tree-select').onchange=e=>{activeLineage=e.target.value;drawTree();};
    const portrait=p||{species:s.id,phase:3,stage:'terminal',counter:0,primary:{version:'primary-state/1',form:'A'}};drawPortrait($('tree-portrait'),portrait);
    for(const box of $('guide-content').querySelectorAll('[data-primary-phase]')){const canvas=document.createElement('canvas');canvas.width=144;canvas.height=112;canvas.className='tree-node-art';box.prepend(canvas);drawPortrait(canvas,{...portrait,phase:Number(box.dataset.primaryPhase)});}
  }
  function drawHyperTree(s,q){
    const c=S.HyperParasite.settings(world),portrait=q||{species:s.id,phase:3,age:c.maturity,birthLife:c.life,maturity:c.maturity,hyper:{version:'hyper-state/1',state:'preparation'}};
    $('guide-content').innerHTML=`<section data-hyper-tree><div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><label>系統を選ぶ<select id="tree-select">${activeCatalogue().map(a=>`<option value="${a.id}" ${a.id===s.id?'selected':''}>${escape(a.name)} / ${groups[a.group]}</option>`).join('')}</select></label></div><h2>抑環 · 本人四相と自立</h2><div class="tree-root">${[1,2,3,4].map(n=>`<div class="phase-box" data-hyper-phase="${n}">${phase(n)} · ${n===4?'翅なしの自立成体':n===1?'P内の珠状組織':n===2?'P内の連結珠状組織':'P内の網状組織'}${n===2||n===3?'<br>本人経験 '+c.phaseThresholds[n]:''}</div>`).join('')}</div><p class="note">相・年齢成熟・生活状態・発育は別です。IIIの絵だけで羽化を成立させません。本人の成熟${c.maturity}T＋発育${c.development}＋維持・栄養・P抵抗・再準備を満たして試行します。</p><div class="flow">羽化試行は実効維持${c.emergenceMultiplier}T分の追加支出。基準成功率${c.emergenceRate*100}%にP抵抗を適用し、失敗後は最低${c.prepareTurns}T再準備。<br>成功時はPだけ死亡、同じQがIVへ離脱。Hを直接殺さず、Qの年齢・出生時寿命・IDを維持します。</div><p class="note">IVは局所移動・通常採食・被食・産卵を行い、情報を食べません。娘QはIから別IDで生まれ、限定窓への新規侵入と翌T定着を通ります。初期IVを羽化成功に数えません。</p><p class="note">各画像は採用した相の参照図です。年齢や発育の達成・飛翔能力の推定には使いません。</p>${q?`<div class="flow">選択Q ${escape(q.id)} / 本人${phase(q.phase)}相 / 年齢${primaryNumber(q.age)}T / 生活状態 ${escape(hyperState[q.hyper.state])}</div>`:''}</section>`;
    $('tree-select').onchange=e=>{activeLineage=e.target.value;drawTree();};drawPortrait($('tree-portrait'),portrait);
    for(const box of $('guide-content').querySelectorAll('[data-hyper-phase]')){const canvas=document.createElement('canvas');canvas.width=144;canvas.height=112;canvas.className='tree-node-art';box.prepend(canvas);const n=Number(box.dataset.hyperPhase);drawPortrait(canvas,{...portrait,phase:n,hyper:{...portrait.hyper,state:n===4?'adult':n===3?'preparation':n===2?'larva':'egg'}});}
  }
  function drawTree() {
    const s = D.byId[activeLineage],
      o = world?.organisms.find(
        (a) => a.id === selectedId && a.species === s.id,
      ),
      group = s.group;
    if(independent(s)){drawIndependentTree(s,o);return;}
    if(s.id==='ryouki'){drawRyoukiTree(s,o);return;}
    if(s.group==='Q'&&S.HyperParasite?.enabled(world)){drawHyperTree(s,S.HyperParasite.locate(world,selectedId)?.q);return;}
    if(s.group==='P'&&S.PrimaryParasite.enabled(world)){const entry=S.PrimaryParasite.locate(world,selectedId);drawPrimaryTree(s,entry?.p.species===s.id?entry.p:null);return;}
    const progress = o
      ? `選択個体: ${escape(o.id)} / ${phase(o.phase)}相 / G ${fmt(o.G)} / M ${fmt(o.M)}<br>第三相経験 ${o.counters.join(" / ")} · 第四相経験 ${o.ivCounters.join(" / ")}<br>${o.phase < 2 ? "IIまで不足G " + fmt(Math.max(0, (s.id === "precocial" ? 45 : 30) - o.G)) : o.phase < 3 ? "IIIまで不足G " + fmt(Math.max(0, (s.id === "precocial" ? 120 : 90) - o.G)) + " / 不足M " + fmt(Math.max(0, S.phenotype(world, o).M3 - o.M)) : o.phase < 4 && s.id !== "precocial" ? "IVまで不足G " + fmt(Math.max(0, 210 - o.G)) + " / 不足M " + fmt(Math.max(0, S.phenotype(world, o).M4 - o.M)) : "この相からの全経路を参照できます。"}`
      : "図鑑の全経路です。個体の到達経路とは別に表示しています。";
    const third = ["実採食の経験", "移動先の実益・生還", "実損害・軽減の経験"],
      fourth = [
        ["有機吸収後の余剰E≥1.5", "実回復HP≥0.5"],
        ["新地点で2ターン以内の採食", "同環境で4回の移動採食"],
        ["実損害≥2", "実軽減≥2"],
      ];
    let tree;
    if (group === "main") {
      tree = `<div class="tree-root"><div class="phase-box"><small>I</small><br>${s.phases[0]}</div><span>G${s.id === "precocial" ? 45 : 30} →</span><div class="phase-box"><small>II</small><br>${s.phases[1]}</div></div><p class="note">III条件: G${s.id === "precocial" ? 120 : 90}・系統M${s.M3}をDNA補正、経験首位4以上・次点差2、または累積18回の最多経験。I→IIはG${s.id === "precocial" ? 45 : 30}。上位相ほど能力が上がります。</p><div class="tree-branches">${s.branches.map((name, i) => `<div><div class="phase-box"><small>III · ${s.phases[2]}</small><h4>${name}</h4><p>${third[i]}<br>通常は首位4以上 / 次点差2。均衡時は累積18回から判定。</p></div>${s.phases.length === 4 ? `<div class="tree-finals">${D.branch4[i].map((b, j) => `<div>IV · ${escape(s.phases[3])}<br><strong>${b}</strong><p>${fourth[i][j]}<br>G210・M${s.M4}（DNA補正）<br>経験首位3以上 / 差2</p></div>`).join("")}</div>` : '<p class="note">IIIで完成。第四相なし。</p>'}</div>`).join("")}</div>`;
    } else if (group === "P") {
      tree =
        '<div class="flow">' +
        (s.id === "tideparasite"
          ? "微藻（4） → 水游虫（6） → 水系の成熟主生物（8）"
          : "草本（4） → 草棲虫（6） → 植物食/雑食の成熟主生物（8）") +
        "<br>若い主生物を経由: 追加中間（6） → 別の成熟主生物</div><p>数字は根宿主から完全支払いを受ける成熟回数。移行日には進みません。</p>";
    } else if (group === "Q") {
      tree =
        `<div class="flow">${qGrowthGuide()} · 整流 / 鮮度保持 / 変調</div><p>現在の高次寄生優遇${world?.config.advantageSettings?.hyperparasite!==false?"ON":"OFF"}の条件。各特化はそれまでの発信・接触・情報取得の蓄積で一つに固定。</p>`;
    } else
      tree = `<div class="flow">I · 幼生 → 年齢${s.maturity} / 条件を満たす → II · 成熟</div><p>段階は2つ。食物網の生物として採食/光合成・維持・繁殖・死亡を行います。</p>`;
    $("guide-content").innerHTML =
      `<div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><div><label>系統を選ぶ<select id="tree-select">${activeCatalogue().map((a) => `<option value="${a.id}" ${a.id === s.id ? "selected" : ""}>${escape(a.name)} / ${groups[a.group]}</option>`).join("")}</select></label><p class="note">${s.traitText?.join(" / ") || "食物網の独立した生物系統"}</p></div></div>${tree}<div class="flow">${progress}</div>${group === "main" ? `<p class="note">得意環境: ${s.good.map((i) => D.environments[i].name).join(" / ")} · 苦手: ${D.environments[s.bad].name}<br>食性: ${s.dietName || D.diets[s.diet]?.name || "専用栄養"} / ${s.dietDescription || D.diets[s.diet]?.description || ""}<br>基準寿命 ${s.life} / 維持E ${s.maintenance} / 出生E条件 ${s.birthEnergy} / 出生待機 ${s.birthCooldown}<br>繁殖開始は進化相ではなく年齢成熟で決まります。第三相へ到達すると翌4ターンは繁殖待機です。成長・枝決定は一回、DNAは出生時固定です。</p>` : ""}`;
    $("tree-select").onchange = (e) => {
      activeLineage = e.target.value;
      drawTree();
    };
    const portrait = o || {
      species: s.id,
      slot: s.slot,
      phase: s.phases.length,
      sex: "female",
      facing: 0,
      dna: { body: 0.5 },
      branch3: 1,
      branch4: s.phases.length === 4 ? 0 : null,
      cell: 0,
      B: 12,
    };
    drawPortrait($("tree-portrait"), portrait);
    if (s.group === "main") {
      const boxes = [...$("guide-content").querySelectorAll(".phase-box")];
      boxes.forEach((box, i) => {
        const c = document.createElement("canvas");
        c.width = 144;
        c.height = 112;
        c.className = "tree-node-art";
        box.prepend(c);
        drawPortrait(c, {
          ...portrait,
          phase: i < 2 ? i + 1 : 3,
          branch3: i < 2 ? null : i - 2,
          branch4: null,
        });
      });
      [...$("guide-content").querySelectorAll(".tree-finals > div")].forEach(
        (box, i) => {
          const c = document.createElement("canvas");
          c.width = 144;
          c.height = 112;
          c.className = "tree-node-art";
          box.prepend(c);
          drawPortrait(c, {
            ...portrait,
            phase: 4,
            branch3: Math.floor(i / 2),
            branch4: i % 2,
          });
        },
      );
    }
  }
  function showSheet(name) {
    activeSheet = name;
    for (const b of $("guide-tabs").querySelectorAll("button"))
      b.classList.toggle("active", b.dataset.sheet === name);
    if (name === "tree") drawTree();
    else {
      $("guide-content").innerHTML = sheets[name]();
      if (name === "food")
        $("guide-content").insertAdjacentHTML(
          "beforeend",
          '<h3>六つの食性と食物網</h3><div class="sheet-grid">' +
            Object.values(D.diets)
              .map((d) =>
                card(
                  d.name,
                  "<p>" +
                    d.description +
                    "。得意な餌ほど吸収効率と探索評価が高まり、不足時には不得意食も利用します。鉱物だけで有機成長はできません。</p>",
                ),
              )
              .join("") +
            "</div>",
        );
      if (name === "system")
        $("guide-content").insertAdjacentHTML(
          "beforeend",
          card(
            "通常生活と生存競争",
            "<p>通常の採食と世代交代で生存できる収支を目指し、主生物の維持・移動・孤立時の負担を調整しています。空腹時は空の場所への固執が弱まり、必要な栄養を探す評価が高まります。鉱物や情報だけを追って餓死し続けないよう、現在の不足を反映します。寿命・老化・有限の繁殖費は残り、主生物間の戦闘の損害・射程は変えません。</p><p>群体の働育型は同じコロニーの幼体と空腹の繁殖型を支援します。給餌は供給者のE/Mを使い、通常の消化で成長にもつながります。繁殖型は長寿ですが、戦闘や飢餓で死亡します。実際の隣接交配後は父の情報を最大12出生に使えます。各出生は母が40E/4Mを支払い、子は第一相・年齢0から始まります。</p>",
          ),
        );
      if (name === "parasite")
        $("guide-content").insertAdjacentHTML(
          "beforeend",
          card(
            "繰り返し接触による分散",
            "<p>適合する近傍宿主へ8ターン以内に3回接触すると、PがE0.12を払い娘群体E0.04を形成します。未終宿主は範囲1・1件・待機18、成熟終宿主は範囲2・最大3件・待機3。宿主の見通しと適合を守り、新しい群体は同じターンに連鎖しません。QII以上はE0.06を払える場合だけ娘Q（I相・E0.02）を付随させます。IIIの情報操作と群体分散の成熟条件は別です。</p>",
          ),
        );
    }
    $("guide-content").scrollTop = 0;
  }
  function openGuide(name = "tree") {
    showSheet(name);
    hold("guide");
    if (!$("guide").open) $("guide").showModal();
  }
  $("open-guide").onclick = () => openGuide();
  $("close-guide").onclick = () => $("guide").close();
  for (const b of $("guide-tabs").querySelectorAll("button"))
    b.onclick = () => showSheet(b.dataset.sheet);
  // Refit the overview after layout/viewport changes; keep a panned or detailed
  // view centred on its previous location rather than resetting its selection.
  let boardSize = null;
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    const previous = boardSize; boardSize = { width, height };
    if (!world || !previous) return;
    if (renderer.view.mode === "overview") renderer.fit();
    else {
      renderer.view.x += (width - previous.width) / 2;
      renderer.view.y += (height - previous.height) / 2;
    }
    renderer.draw();
  }).observe($("board"));
  function frame(now) {
    try {
    if (now - paintAt >= 1000 / 30) {
      paintAt = now;
      if(!renderFaulted)renderer.drawIfChanged(now);
      $("scale-warning").hidden = renderer.view.scale >= 8;
      setText("status", playbackError ? (faultKind||"計算")+"エラー・停止" : ended ? "観測終了" : holds.size ? "別画面・停止中" : running
        ? prewarming && !pendingTurn ? "観測の準備中"
          : !pendingTurn && !compute.length ? `計算待ち · ${Math.floor((now-(computeWaitAt??now))/1000)}秒`
          : replayEntry ? "再生中・記録なし" : "観測中"
        : world ? world.stopReason === "checkpoint" ? "区間終了・一時停止" : "一時停止" : "未準備");
      $("status").title=playbackError||$("message").textContent;
      setText("render-mode",
        { point: "密集記号表示", simple: "記号表示", detail: "詳細表示" }[
          renderer.diagnostics.mode
        ] +
        " · " +
        fmt(renderer.view.scale) +
        " px/マス" + (renderer.diagnostics.terrainPending ? " · 背景を精細化中" : ""));
    }
      if(running&&!holds.size&&!pendingTurn&&!timer&&!playbackError)timer=setTimeout(runLoop,0);
    }catch(error){failObservation("描画",error);}
    finally {requestAnimationFrame(frame);}
  }
  requestAnimationFrame(frame);
  R.assets.ready.then(() => {
    if (world) renderer.setWorld(world);
    renderSelection();
    if ($("guide").open) showSheet(activeSheet);
    if (R.assets.errors.length)
      message(
        "画像を読み込めませんでした。配布ZIPをすべて展開してから起動してください。",
      );
  });
  // Present only in explicitly requested smoke mode; Electron remains sandboxed.
  if (new URLSearchParams(location.search).has("smoke"))
    window.__LIFE_TEST__ = {
      observations:()=>observations,
      archive:()=>archive,
      readConfig,
      screenForCell: (cell, id = null) => renderer.screen(cell,id),
      hitAt: renderer.hitAt,
      prepare,
      refresh: () => { if(world)renderer.setWorld(world);render(); },
      draw: renderer.draw,
      drawIfChanged: renderer.drawIfChanged,
      finish: finishRun,
      replay: replayResult,
      records: () => archive.list(),
      step: tick,
      stop,
      select,
      showSheet,
      openGuide,
      snapshot: () => ({
        world: world && structuredClone(world),
        running,
        faultKind,playbackError,worldGeneration,scheduled:!!timer,
        pending: pendingTurn && {phase:pendingTurn.phase,nextTurn:world.turn+1,events:[...(pendingTurn.previewTypes || [])]},
        cadenceMs:TURN_MS,
        holds:[...holds],
        compute:{initialized:compute.initialized,ready:compute.ready,busy:compute.busy,buffered:compute.length,preparationMs:lastPreparationMs,metadata:compute.metadata},
        replay: !!replayEntry,
        ended,
        lastMs,
        selectedId,
        observationTurns:observations?.rows.length,
        followId,
        view: { ...renderer.view },
        render: { ...renderer.diagnostics },
        assets: { loaded: R.assets.loaded, errors: [...R.assets.errors] },
      }),
      fingerprint: () => world && E.fingerprint(world),
    };
})();
