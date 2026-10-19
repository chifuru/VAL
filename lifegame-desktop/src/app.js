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
  let interactionTimer = null, prewarming = true, lastPreparationMs = 0;
  const compute = window.EcoCompute.create({
    onChange: () => { if(running&&!holds.size&&!pendingTurn&&!timer)timer=setTimeout(runLoop,0); },
    onError: text => { stop();message(text); }
  });
  function restoreCommitted() {
    runGeneration++;clearTimeout(timer);timer=null;
    const had=!!pendingTurn;
    if(pendingTurn?.packet)compute.restore(pendingTurn.packet);
    pendingTurn=null;
    renderer.view.animate=false;showTurnStage();
    if(world){renderer.setWorld(world);renderSelection();}
  }
  function hold(reason) { /* Reading and map operations keep ecology running. */ }
  function release(reason) {
    holds.delete(reason);updateHold();
    if(running&&!holds.size&&!pendingTurn&&!timer)timer=setTimeout(runLoop,0);
  }
  function updateHold() {
    const names={map:"マップ操作",detail:"個体詳細の閲覧",guide:"説明シートの閲覧",results:"図鑑の閲覧",settings:"初期条件の編集",hidden:"画面が非表示"};
    $("interaction-note").hidden=!holds.size;
    $("interaction-note").textContent=holds.size?([...holds].map(k=>names[k]).join("・")+"のため停止中") : "";
    $("detail-hold").textContent=holds.has("detail")?"詳細の閲覧を終える ▶":"一時停止して観察";
    $("cancel-settings").hidden=!holds.has("settings");
    if(running)$("status").textContent=holds.size?"操作中・停止":"観測中";
  }
  function mapInteraction() { /* View input never pauses the simulation. */ }
  function startRunning() {
    if(!world||ended)return;
    running=true;$("start").textContent="一時停止 Ⅱ";$("step").disabled=true;
    updateHold();if(!holds.size)timer=setTimeout(runLoop,0);
  }
  const groups = {
    main: "主生物",
    plant: "植物",
    fungus: "菌類",
    prey: "動く餌",
    P: "一次寄生",
    Q: "高次寄生",
  };
  $("groups").innerHTML = Object.entries(groups)
    .map(
      ([id, label]) =>
        `<label class="check"><input id="group-${id}" type="checkbox" checked>${label}</label>`,
    )
    .join("");
  $("lineage-options").innerHTML = D.main
    .map(
      (s, i) =>
        `<label class="check"><input type="checkbox" value="${s.id}" ${i < 20 ? "checked" : ""}>${escape(s.name)}</label>`,
    )
    .join("");
  $("weight-options").innerHTML = D.main
    .map(
      (s) =>
        `<label>${escape(s.name)}<input type="number" min="1" max="4" value="1" data-weight="${s.id}"></label>`,
    )
    .join("");
  $("environment-legend").innerHTML = D.environments
    .map(
      (e, i) =>
        `<span class="habitat-chip"><i style="background-image:url(assets/habitat-${["water", "thermal", "signal", "meadow", "frost", "forest", "earth", "corrosion"][i]}.png);background-size:cover;background-position:center"></i><b>${e.name}</b></span>`,
    )
    .join("");
  $("size").addEventListener("change", () => {
    $("initial").value = { "40,28": 80, "80,56": 320, "160,112": 1280 }[
      $("size").value
    ];
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
  const founderSpecies=D.species.filter(s=>["plant","fungus","prey","P","Q"].includes(s.group));
  $("founder-inputs").innerHTML=founderSpecies.map(s=>`<label>${escape(s.name)} · ${s.group==="P"?"一次寄生":s.group==="Q"?"高次寄生":s.group==="plant"?"生産者":s.group==="fungus"?"分解者":"一次消費者"}（${["P","Q"].includes(s.group)?"群体":"体"}）<input id="founder-${escape(s.id)}" type="number" min="0" max="${s.group==="Q"?1024:17920}" step="1" placeholder="自動"></label>`).join("");
  function readFounders(){
    const result={version:1,species:{},parasites:{}};
    for(const s of founderSpecies){const input=$("founder-"+s.id);if(input.value!=="")result[["P","Q"].includes(s.group)?"parasites":"species"][s.id]=Number(input.value);}
    return Object.keys(result.species).length||Object.keys(result.parasites).length?{founderCounts:result}:{};
  }
  function resetLowerSettings(){
    const [w,h]=$("size").value.split(",").map(Number),mode=S.observationPreset($("observation-mode").value,w,h);
    for(const [k,v]of Object.entries({plant:35,fungus:3,prey:10}))$("density-"+k).value=+(v*mode.initialFoodScale).toFixed(1);
    for(const k of ["mineral","droplet","info"])$("resource-"+k).value=100;
    $("lower-distribution").value="habitat";
    for(const s of founderSpecies)$("founder-"+s.id).value="";
  }
  $("reset-lower-settings").onclick=resetLowerSettings;
  $("producer-supply").onchange=()=>{for(const e of $("supply-inputs").querySelectorAll("input"))e.disabled=!$("producer-supply").checked;};
  function applyObservationMode() {
    const id = $("observation-mode").value,
      [width,height] = $("size").value.split(",").map(Number),
      mode = S.observationPreset(id,width,height), fixed = id !== "custom";
    for (const id of ["map-id","initial","lineages","distribution","placement","guarantee"])
      $(id).disabled = fixed;
    for (const input of document.querySelectorAll("#groups input,#lineage-options input,#weight-options input")) input.disabled = fixed;
    if (fixed) {
      resetLowerSettings();
      $("map-id").value = mode.mapId; $("initial").value = mode.initial;
      $("lineages").value = "manual"; $("distribution").value = mode.distribution;
      $("placement").value = mode.placement; $("guarantee").checked = false;
      for (const input of $("lineage-options").querySelectorAll("input")) input.checked = mode.selected.includes(input.value);
      for (const id of Object.keys(groups)) $("group-"+id).checked = true;
    }
    $("lineage-options").hidden = $("lineages").value !== "manual";
    $("weight-options").hidden = $("distribution").value !== "weighted";
    syncSetupFields();
    $("mode-help").textContent = mode.description.replace("途中の生体補充はありません。","動物の救済補充はありません。") + (fixed ? ` 主生物${mode.initial}体、${mode.selected.length}系統（${mode.selected.map(id=>D.byId[id].name).join(" / ")}）。自然配置・均等配分。固定項目を編集する場合は自由設定へ戻してください。` : "") + " 条件は開始時に固定され、観測中も同じ倍率で計算します。動物・寄生虫の救済補充はありません。生産者の環境供給は別欄で選択できます。";
    updateCohortHint();
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
    return {
      blockTurns: 500,
      ...readFounders(),
      observationMode: $("observation-mode").value,
      producerSupport: $("producer-supply").checked ? {enabled:true,...Object.fromEntries(["land","water"].map(r=>[r,Object.fromEntries(["nutrition","capacity","regrowth"].map(k=>[k,Number($("supply-"+r+"-"+k).value)/(k==="capacity"?100:1)]))]))} : {enabled:false},
      initialConditions:{version:1,density:Object.fromEntries(["plant","fungus","prey"].map(k=>[k,Number($("density-"+k).value)/100])),resources:Object.fromEntries(["mineral","droplet","info"].map(k=>[k,Number($("resource-"+k).value)/100])),distribution:$("lower-distribution").value},
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
  function confirmWorldChange(text) {
    const dialog = $("world-confirm");
    if (dialog.open) return Promise.resolve(false);
    $("world-confirm-text").textContent = text;
    dialog.returnValue = "cancel";
    return new Promise(resolve => {
      dialog.addEventListener("close", () => resolve(dialog.returnValue === "proceed"), {once:true});
      dialog.showModal();
    });
  }
  function stop() {
    clearTimeout(interactionTimer);holds.clear();updateHold();
    compute.close();prewarming=true;
    const hadPending = !!pendingTurn;
    runGeneration++;
    if (pendingTurn) pendingTurn = null;
    running = false;
    renderer.view.animate = false;
    clearTimeout(timer);
    timer = null;
    showTurnStage();
    if (hadPending && world) {
      renderer.setWorld(world);
      renderSelection();
      message("途中の計算を取り消し、最後に確定したターンで一時停止しました。");
    }
    $("start").textContent =
      world?.stopReason === "checkpoint"
        ? `次の${world.config.blockTurns || 1000}ターンを続行 ▶`
        : "観測を開始 ▶";
    $("step").disabled = !world || ended;
    $("status").textContent = world ? "一時停止" : "未準備";
  }
  function prepare(config, playback = null) {
    const next = E.create({
      landscape: "templates",
      ageModel: "life/1",
      ecologyRevision: "observation/4.1",
      blockTurns: 500,
      ...config,
    });
    stop();
    closeWorldDetails();
    setupMessage("");
    replayEntry = playback;
    ended = false;
    pendingResult = null;
    $("export-result").hidden=true;
    $("finish-run").disabled = false;
    $("finish-run").textContent = playback
      ? "再生結果を新規保存"
      : "終了して図鑑へ保存";
    world = next;
    populationHistory = [];
    observations=window.EcoObservations.create(next.config,window.EcoReplayVersion,{species:D.species});observations.append(next);graphFollow=true;followId=null;lastTracked=null;legendKey=null;
    document.body.classList.remove("setup-screen");
    checkpointKey = null;
    $("load").textContent = "この設定で新しい世界を作る ↗";
    $("setup-help").textContent =
      "新しい世界では配置を再生成します。結果図鑑とデバッグCSVは別の保存です。";
    initialConfig = structuredClone(next.config);
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
    const lower=next.config.initialConditions;
    if(lower){for(const k of ["plant","fungus","prey"])$("density-"+k).value=+(lower.density[k]*100).toFixed(1);for(const k of ["mineral","droplet","info"])$("resource-"+k).value=lower.resources[k]*100;$("lower-distribution").value=lower.distribution;}
    else {for(const [k,v]of Object.entries({plant:35,fungus:3,prey:10}))$("density-"+k).value=+(v*(next.config.initialFoodScale||1)).toFixed(1);for(const k of ["mineral","droplet","info"])$("resource-"+k).value=100;$("lower-distribution").value="habitat";}
    if(lower){const baseline={plant:.35,fungus:.03,prey:.1},changed=Object.entries(baseline).some(([k,v])=>Math.abs(lower.density[k]-v*(next.config.initialFoodScale||1))>1e-8)||Object.values(lower.resources).some(v=>v!==1)||lower.distribution!=="habitat"||!support?.enabled||["land","water"].some(r=>Object.entries({nutrition:1,capacity:.35,regrowth:1}).some(([k,v])=>support[r][k]!==v));$("active-mode").textContent+=changed?" 下層・供給：調整あり。":" 下層・供給：基準設定。";}
    for(const s of founderSpecies)$("founder-"+s.id).value=next.config.founderCounts?.[["P","Q"].includes(s.group)?"parasites":"species"]?.[s.id]??"";
    const founders=next.config.founderReport;$("founder-report").hidden=!founders;
    if(founders){
      $("active-mode").textContent+=" 種別・寄生初期数：調整あり。";
      $("founder-report-content").innerHTML=founderSpecies.map(s=>{const row=founders[["P","Q"].includes(s.group)?"parasites":"species"][s.id],unit=["P","Q"].includes(s.group)?"群体":"体";return `<p>${escape(s.name)}：${row.actual}${unit}（${row.requested===null?"自動":"指定 "+row.requested+unit}）</p>`;}).join("");
    }else $("founder-report-content").textContent="";
    const report=next.config.initialReport;if(report)$("active-mode").textContent+=` 初期配置: 生産者${report.groups.plant.actual}/${report.groups.plant.requested}・分解者${report.groups.fungus.actual}/${report.groups.fungus.requested}・一次消費者${report.groups.prey.actual}/${report.groups.prey.requested}（実数/目標）。資源: 鉱物${report.resources.mineral}・水分${report.resources.droplet}・情報${report.resources.info}地点。`;
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
      input.value = next.config.weights[input.dataset.weight] || 1;

    selectedId = null;
    selectedCell = null;
    describedSpecies = null;
    renderer.view.highlights=[];
    for(const input of $("species-key").querySelectorAll("input"))input.checked=false;
    $("presence-note").textContent="";
    renderer.view.selected = null;
    renderer.view.selectedEntity = null;
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
    applyObservationMode();
    render();
    message(
      world.warnings.join(" / ") ||
        "世界を作りました。「観測を開始」で動きます。別の地形は「マップ・初期条件を変更」から選べます。",
    );
    return world;
  }
  function tick() {
    if (!world || ended || pendingTurn) return;
    renderer.view.animate = running;
    renderer.view.duration = 300;
    const start = performance.now(), next = E.step(world, { observeId: selectedId });
    return commitTurn(next,performance.now()-start);
  }
  function commitTurn(next, milliseconds) {
    try{observations.append(next);}catch(e){stop();renderer.setWorld(world);render();message(e.message);return world;}
    world = next;
    lastMs = milliseconds;
    renderer.setWorld(world);
    updateTracking();
    render();
    if (replayEntry && world.turn >= replayEntry.turn) {
      stop();
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
      stop();
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
    timer=null;
    if (!running || holds.size || pendingTurn) return;
    if(!compute.initialized) {
      const limit=replayEntry?.turn || (world.blockEnd + (world.stopReason==="checkpoint"?(world.config.blockTurns||1000):0));
      prewarming=true;compute.init(world,selectedId,limit);
      if(!running)return;
    }
    if(prewarming && (!compute.length || compute.busy || !compute.ready)) {
      $("status").textContent="観測の準備中";
      message(`観測の準備中 · ${(compute.elapsed/1000).toFixed(1)}秒 / 上限60秒。先行計算中もマップを操作できます。`);
      timer=setTimeout(runLoop,100);return;
    }
    if(prewarming){lastPreparationMs=compute.elapsed;prewarming=false;}
    const packet=compute.take();
    if(!packet){compute.fill(2);$("status").textContent="計算待ち";message("次のターンを計算しています。個体やターンを省略せず待機します。");timer=setTimeout(runLoop,100);return;}
    const token=runGeneration,start=performance.now();
    const state=pendingTurn={phase:0,computeMs:packet.computeMs,preview:world,packet};
    compute.fill(2);
    function valid(){return running&&!holds.size&&token===runGeneration&&pendingTurn===state;}
    function advance(){
      if(!valid())return;
      try {
        const i=state.phase,preview=window.EcoTransport.apply(state.preview,packet.patches[i]);
        state.preview=preview;state.phase++;
        const visibleEvents=i===0?["light"]:i===1?["move","attack","feed","care","defend","death"]:["growth","birth","infection"];
        const events=preview.events.filter(e=>visibleEvents.includes(e.type));
        state.previewTypes=[...new Set(events.map(e=>e.type))];
        renderer.view.animate=true;renderer.view.duration=TURN_MS/3;
        renderer.setWorld({...preview,events},true);
        showTurnStage(state.phase,["資源更新","移動・採食・戦闘","成長・繁殖"][i]);
        $("status").textContent="観測中";
        if(state.phase===3)timer=setTimeout(()=>{
          if(!valid())return;
          compute.acknowledge();pendingTurn=null;showTurnStage();renderer.view.animate=false;
          commitTurn(preview,packet.computeMs);
          if(running&&!holds.size)timer=setTimeout(runLoop,0);
        },Math.max(100,TURN_MS-(performance.now()-start)));
        else timer=setTimeout(advance,Math.max(100,state.phase*TURN_MS/3-(performance.now()-start)));
      }catch(e){stop();message("計算結果を表示できませんでした："+e.message);}
    }
    advance();
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
      const config = S.validate(readConfig());
      const count = config.lineages === "all" ? 20 : config.lineages === "few" ? 5 : config.selected.length;
      if (config.enabled.main && (!count || config.initial < count * 4))
        throw Error("参加系統を選び、系統ごとに最低4体の主生物を設定してください。");
      if(world && world.turn>0 && observations?.unexported && !await confirmWorldChange("未出力の全ターン観測データを破棄して新しい世界を作ります。必要ならキャンセルしてCSVを保存してください。")) {
        setupMessage("生成を取り消しました。現在の世界と観測履歴は保持しています。");
        return;
      }
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
  function returnSetup(){stop();closeWorldDetails();document.body.classList.add("setup-screen");document.body.classList.remove("observatory");$("cancel-settings").hidden=!world;syncSetupFields();message("初期設定に戻りました。現在の結果や全ターンCSVを残す場合は、新しい世界を作る前に保存してください。");}
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
  $("step").addEventListener("click", () => {
    stop();
    tick();
  });
  $("reset").addEventListener("click", () => {
    returnSetup();
  });
  $("restart-world").onclick=async()=>{if(initialConfig && (!observations?.unexported || world.turn===0 || await confirmWorldChange("未出力の観測履歴を破棄して同じ世界を最初から再生しますか？")))prepare(initialConfig,replayEntry);};
  function downloadJSON(record){
    if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(record)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`lifegame-result-${record.turn}T-${record.id.slice(-8)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  async function finishRun(reason = "user-ended",{explicit=false}={}) {
    if(!world)return;stop();ended=true;$("start").disabled=true;$("step").disabled=true;
    if(replayEntry&&!explicit){message("再生を終了しました。自動保存はしません。保存ボタンで新しい記録にできます。");return;}
    const finishedWorld=world;
    $("finish-run").disabled=true;$("finish-run").textContent="保存中…";
    try{
      pendingResult ||= archive.capture(world,reason,observations.snapshot(),replayEntry?.id||null);
      if(replayEntry)pendingResult.replayMatch=world.turn===replayEntry.turn?E.fingerprint(world)===(replayEntry.finalFingerprint||replayEntry.id):null;
      const record=pendingResult;await archive.retry();const saved=await archive.save(record,replayEntry?'replay-new':'normal');
      if(world!==finishedWorld)return;observations.markExported();$("finish-run").textContent="図鑑に保存済み";$("export-result").hidden=false;
      message(saved?(replayEntry?"元記録を残し、再生結果を新しい記録として保存しました。":"全期間グラフと最終結果を図鑑へ保存しました。結果から詳細を確認できます。"):"この結果は既に保存されています。");
    }catch(error){if(world!==finishedWorld)return;$("finish-run").disabled=false;$("finish-run").textContent="保存を再試行";$("export-result").hidden=!pendingResult;message("保存できませんでした："+error.message+" 結果は保持しています。");}
  }
  $("export-result").onclick=()=>downloadJSON(pendingResult);
  function replayResult(id) {
    const entry = archive.replay(id);
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
  }
  async function showResults() {
    $("results-error").textContent="";
    try {
      await archive.retry();
      $("results-list").innerHTML =
        archive
          .list()
          .map(
            (r) =>
              `<article class="result-entry"><h3>${escape(r.config.modeResolved?.name || "自由設定")} · ${r.turn}T</h3><p>${escape(r.config.modeResolved?.name || "自由設定")} · ${r.turn}ターン · 主生物 ${fmt(r.final.main)} · ${escape(r.config.mapResolved?.id || "従来地形")} · ${escape(Number.isFinite(Date.parse(r.created))?new Date(r.created).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"}):"日時不明")}</p><button class="small" data-analyze="${escape(r.id)}">最終結果・全期間グラフ</button> <button class="small" data-replay="${escape(r.id)}">初期条件から再生（記録なし）</button> <button class="small secondary" data-remove="${escape(r.id)}">削除</button></article>`,
          )
          .join("") ||
        "<p>終了した観測はまだありません。一時停止では保存されません。</p>";
      for(const b of $("results-list").querySelectorAll("[data-analyze]"))b.onclick=()=>analyzeResult(b.dataset.analyze);
      for (const b of $("results-list").querySelectorAll("[data-replay]"))
        b.onclick = () => {
          try {
            replayResult(b.dataset.replay);
            $("results").close();
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
    if (!$("results").open) $("results").showModal();
  }
  $("finish-run").onclick = () => finishRun("user-ended",{explicit:true});
  $("open-results").onclick = () => {
    hold("results");
    showResults();
  };
  function closeAnalysis(){
    if(analysisState){$("inspector-graphs").append($("graphs-panel"));$("graph-species").value=analysisState.target;$("graph-turn").value=analysisState.turn;graphFollow=analysisState.follow;}
    analysisData=null;analysisRecord=null;analysisState=null;$("results-analysis").hidden=true;$("results-list").hidden=false;if(observations?.rows.length)renderGraphs();
  }
  async function analyzeResult(id){
    try{const record=await archive.get(id);let data=null;if(record.schema===2)data=window.EcoObservations.restore(record.observation,{species:D.species});
      if(!analysisState)analysisState={target:$("graph-species").value,turn:$("graph-turn").value,follow:graphFollow};
      analysisRecord=record;analysisData=data;$("results-list").hidden=true;$("results-analysis").hidden=false;
      $("result-analysis-title").textContent=`保存した最終結果 · ${record.turn}T`;
      $("result-analysis-summary").textContent=`主生物 ${record.final.main} / 下層 ${record.final.food} / P ${record.final.P} / Q ${record.final.Q}。`+(data?'記録時の指標と全確定ターンを参照しています。':'旧記録には全期間グラフが保存されていません。値を再計算して補いません。');
      $("result-final-values").textContent=JSON.stringify({final:record.final,conditions:record.config,originRecordId:record.originRecordId||null,replayMatch:record.replayMatch??null,definitions:record.observation?.definitions||null},null,2);
      $("results-graph-host").hidden=!data;if(data){$("results-graph-host").append($("graphs-panel"));graphFollow=true;$("graph-turn").value=record.turn;renderGraphs();}
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
  });
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
      if(hit){select(hit.cell,hit.id,{groundOnly:hit.groundOnly});hold("detail");}
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
  function select(cell, id = null, {groundOnly=false} = {}) {
    // Selection reads committed state and does not invalidate prepared work.
    describedSpecies = null;
    selectedCell = cell;
    selectedId =
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
    const group=groups[s.group],diet=D.diets[s.diet];
    $('species-description').innerHTML=`<p class="eyebrow">${escape(group)}</p><h2>${escape(s.name)}</h2><canvas id="species-symbol" width="120" height="120"></canvas><p>現在 ${world.stats.counts[id]||0} ${['P','Q'].includes(s.group)?'群体':'個体'}</p><p>${s.dietName ? escape(s.dietName) + ' · ' : ''}${escape(s.dietDescription || diet?.description || (s.group==='plant'?'光合成を行い、他生物を支える生産者。':s.group==='fungus'?'有限の有機物を利用する分解者。':s.group==='prey'?'主生物の食物網を支える小型の餌生物。':s.group==='P'?'宿主を移り生活環を進める一次寄生群体。維持費と排除により失われます。':'一次寄生虫の成熟移行期だけ感染。行動や局所情報へ作用する高次寄生群体。'))}</p><p>${s.good?'得意環境: '+s.good.map(i=>D.environments[i].name).join(' / '):'適合する宿主・生息条件で活動'}${Number.isInteger(s.bad)?' / 苦手: '+D.environments[s.bad].name:''}</p><p>${s.phases?'成長: '+s.phases.join(' → '):'進化相と寄生生活環は別の状態です。'} / ${world.stats.counts[id]?'盤面のチェックで全所在を強調できます。':world.config.enabled[s.group]?'現在の生体は0です。':'この観察では未参加です。'}</p>`;
    R.symbol($('species-symbol').getContext('2d'),id,60,60,42,R.symbolColor(s));
  }
  function parasiteDetails(id){const a=locate(id);if(!a)return '<p>対象は消失しました。別個体へ切り替えません。</p>';const q=a.entity,s=D.byId[q.species];return `<article class="specimen parasite"><h3>${escape(s.name)}</h3><p>${escape(q.id)}<br>宿主: ${escape(q.hostId || 'なし・探索中')}${a.carcass?"（感染性死骸・地表） / 残り"+Math.max(0,a.host.payloadExpires-world.turn)+"T":""}<br>${q.stage?stages[q.stage]+' / 成熟 '+q.counter+'/'+E.P.required[q.stage]+' / 負荷 '+fmt(q.load??.5):'Q '+phase(q.phase)+' / '+(q.cell!==undefined?'探索':'定着')}<br>E ${fmt(q.E)}${q.matureAt!==undefined?'<br>成熟移行 '+q.matureAt+'T / 感染窓 '+(q.matureAt+1)+'〜'+(q.matureAt+3)+'T':''}</p></article>`;}
  const chartCatalogue=()=>analysisData?.metadata.species?.length?analysisData.metadata.species:D.species;
  function chartColor(s){if(!s)return '#839097';const ids=chartCatalogue().filter(a=>a.group===s.group),i=ids.findIndex(a=>a.id===s.id),h={plant:125,fungus:35,prey:185,main:220,P:18,Q:280}[s.group]??200;return `hsl(${h+i*2} 65% ${40+(i%5)*9}%)`;}
  let graphInspect=null;
  const baseGraphOptions=$('graph-species').innerHTML;
  $('inspector-graphs').append($('graphs-panel'));
  const graphObservation=()=>analysisData||observations;
  function paintStack(canvas,data,colors,maximum){
    const g=canvas.getContext('2d'),W=canvas.width,H=canvas.height,last=graphObservation().rows.length-1,keys=[...new Set(data.flatMap(r=>Object.keys(r.values)))],max=maximum||Math.max(1,...data.map(r=>r.total)),x=t=>30+(W-45)*t/Math.max(1,last),y=n=>H-18-n/max*(H-35),base=data.map(()=>0);
    g.clearRect(0,0,W,H);g.strokeStyle='#47646b';g.lineWidth=1;g.beginPath();g.moveTo(30,15);g.lineTo(30,H-18);g.lineTo(W-15,H-18);g.stroke();
    for(const [k,index]of keys.map((k,i)=>[k,i])){g.fillStyle=colors(k,index);g.beginPath();data.forEach((r,i)=>{const px=x(r.turn),py=y(base[i]+(r.values[k]||0));i?g.lineTo(px,py):g.moveTo(px,py);});for(let i=data.length-1;i>=0;i--)g.lineTo(x(data[i].turn),y(base[i]));g.closePath();g.fill();if(data.length===1)g.fillRect(30,y((data[0].values[k]||0)+base[0]),4,(data[0].values[k]||0)/max*(H-35));data.forEach((r,i)=>base[i]+=r.values[k]||0);}
    g.fillStyle='#bcd3d2';g.font='16px sans-serif';g.fillText(Math.round(max),2,15);g.fillText('0',8,H-17);g.fillText('0T',30,H-1);g.fillText(last+'T',W-65,H-1);
    canvas.setAttribute('aria-label','0–'+last+'T / 最大'+max+'管理単位 / 現在'+(data.at(-1)?.total||0));
  }
  function renderGraphs(){
    if(!graphObservation()?.rows.length)return;
    const rows=graphObservation().rows,last=rows.length-1;
    const catalogue=chartCatalogue(),graphById=Object.fromEntries(catalogue.map(s=>[s.id,s])),catalogueKey=JSON.stringify(catalogue);
    if($('graph-species').dataset.catalogue!==catalogueKey){const value=$('graph-species').value;$('graph-species').innerHTML=baseGraphOptions+catalogue.map(s=>`<option value="${escape(s.id)}">${escape(s.name)}</option>`).join('');$('graph-species').value=[...$('graph-species').options].some(o=>o.value===value)?value:'main';$('graph-species').dataset.catalogue=catalogueKey;}
    $('graph-turn').max=last;$('graph-turn').disabled=running&&!analysisData;if(graphFollow||running&&!analysisData)$('graph-turn').value=last;
    const t=Math.max(0,Math.min(last,Number($('graph-turn').value)||0)),r=rows[t],target=$('graph-species').value;graphInspect=t;
    $('graph-range').textContent=`0–${last}T`;
    $('graph-readout').textContent=`参照 ${t}T / 主 ${r.main}・下層 ${r.food}個体 / P ${r.P}・Q ${r.Q}群体。全${rows.length}時点を保持。`;
    const population=graphObservation().series(target);paintStack($('graph-stacked'),population,id=>chartColor(graphById[id]));
    $('population-legend').innerHTML=Object.entries(population.at(-1).values).filter(([,n])=>n>0).map(([id,n])=>`<span><i style="background:${chartColor(graphById[id])}"></i>${escape(graphById[id]?.name||id)} ${n}</span>`).join('')||'現在の対象は0です';
    const series=Object.fromEntries(['phases','sex','ages'].map(k=>[k,graphObservation().series(target,k)])),max=Math.max(1,...series.phases.map(r=>r.total)),palettes={phases:['#80c9c0','#7ba9db','#a698d9','#e0bc76'],sex:['#e4acc5','#87c7e6','#c4d3b1'],ages:['#d8c779','#8dc5ae','#b9a6ca']};
    for(const axis of ['phases','sex','ages'])paintStack($('composition-'+axis),series[axis],(k,i)=>k==='nonapplicable'?'#526773':palettes[axis][axis==='phases'?Number(k):({female:0,male:1,none:2,juvenile:0,adult:1,elderly:2}[k]??i)%palettes[axis].length],max);
    const labels={phases:'I / II / III / IV / 非該当',sex:'雌 / 雄 / 無性別 / 非該当',ages:'幼体 / 成体 / 老齢 / 非該当'};
    for(const axis of ['phases','sex','ages'])$('composition-'+axis).title=labels[axis];
    const lanes=[['species','広がり（関与系統）','#7edbdf'],['types','多様さ（作用種類）','#e7c780'],['continuous','持続性（継続関係）','#bc9eea']];
    $('graph-relations').innerHTML=lanes.map(([key,label,color],i)=>{const value=r=>key==='types'?r.current.relations.types.length:r.current.relations[key],m=Math.max(1,...rows.map(value)),top=i*32+12;return `<text x="0" y="${top}" fill="${color}" font-size="12">${label} ${key==='continuous'&&t<20?'判定待ち':value(r)}</text><path fill="none" stroke="${color}" stroke-width="1.5" d="${rows.map((r,j)=>(j?'L':'M')+(150+r.turn/Math.max(1,last)*260)+','+(top+12-value(r)/m*20)).join(' ')}"/>`;}).join('');
    const p=r.current.pyramid,nodes={plant:[5,15,'生産者'],prey:[145,15,'一次消費者'],main:[285,15,'主生物'],detritus:[5,95,'死骸'],fungus:[145,95,'分解者'],resource:[285,95,'光・無機養分'],host:[5,175,'宿主'],P:[145,175,'P'],Q:[285,175,'Q']},edges={...p.edges};
    for(const [key,n]of Object.entries(r.current.bonds)){const [from,to]=key.split('|'),source=from==='hyperparasite'?'P':'host',dest=from==='hyperparasite'?'Q':'P';edges[source+'|'+dest]=(edges[source+'|'+dest]||0)+n;}
    const basic=['plant|prey','prey|main','detritus|fungus','fungus|resource','resource|plant','host|P','P|Q'],all=[...new Set([...basic,...Object.keys(edges)])];
    let svg='<defs><marker id="food-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#a6c9c8"/></marker></defs>';
    for(const key of all){const [from,to]=key.split('|'),a=nodes[from],b=nodes[to];if(!a||!b)continue;const active=(edges[key]||0)>0,x1=a[0]+65,y1=a[1]+23,x2=b[0]+65,y2=b[1]+23;let d;
      if(from===to)d=`M${x1+30},${y1-20} C${x1+70},${y1-60} ${x1-70},${y1-60} ${x1-30},${y1-20}`;
      else if(a[1]===b[1])d=a[0]<b[0]?`M${a[0]+130},${y1} L${b[0]},${y2}`:`M${a[0]},${y1} L${b[0]+130},${y2}`;
      else d=`M${x1},${y1+22} Q${(x1+x2)/2},${(y1+y2)/2+20} ${x2},${y2+22}`;
      svg+=`<path data-relation="${key}" data-observed="${active}" d="${d}" fill="none" stroke="${active?'#9ecfc9':'#496370'}" stroke-width="${active?2+Math.min(3,Math.log1p(edges[key])):1}" ${active?'':'stroke-dasharray="4 4"'} marker-end="url(#food-arrow)"/>`;
    }
    for(const [id,[x,y,label]]of Object.entries(nodes))svg+=`<rect x="${x}" y="${y}" width="130" height="46" rx="8" fill="#11313b" stroke="${['P','Q','host'].includes(id)?'#a88dd0':'#6399a0'}"/><text x="${x+65}" y="${y+29}" text-anchor="middle" fill="#d7e9df" font-size="18">${label}</text>`;
    $('foodweb-diagram').innerHTML=svg;
    const leader=(a,label)=>a.length?label+'：'+a.filter(v=>v.value===a[0].value).slice(0,2).map(v=>v.name).join('・'):'未観測';
    $('foodweb-leaders').textContent=leader(p.leaders.production,'生産の中心')+' / '+leader(p.leaders.predation,'捕食で優勢')+' / 定着：'+Object.entries(r.current.bonds).filter(([k])=>k.startsWith('tideparasite|')||k.startsWith('leafparasite|')).sort((a,b)=>b[1]-a[1]).slice(0,1).map(([k,n])=>(graphById[k.split('|')[0]]?.name||k.split('|')[0])+' '+n+'群体').join('・')+'。実線＝確認、破線＝未確認。栄養は同化E、寄生は現在の定着数で別尺度。';
    const peak=Math.max(1,...p.layers),names=['生産者','一次消費者','二次消費者','高次（第4段以上）'];
    $('biomass-pyramid').innerHTML=p.layers.map((v,i)=>`<div class="pyramid-level" data-level="${i}" data-value="${v}"><span>${names[i]}</span><div><i style="width:${v/peak*100}%;background:${['#72c48e','#62cbd3','#6ba6dc','#9196d4'][i]}"></i></div><b>${fmt(v)}</b></div>`).reverse().join('')+`<p class="note">食性未観測 B ${fmt(p.side.unknown)} / 分解者 B ${fmt(p.side.decomposer)}<br>死骸の残量 ${fmt(p.side.remains)}（Bと別単位） / P-Qは宿主依存の別枠</p>`;
    $('pyramid-support').textContent='生産 '+(p.production===null?'未観測':fmt(p.production)+' E')+' / 同化 '+(p.uptake===null?'未観測':fmt(p.uptake)+' E')+'（直近'+p.window+'T）。幅は共通B尺度。逆転だけで異常とは判定しません。';
    $('relation-readout').textContent='3系列は別尺度・全期間。関与個体率/世代交代は未観測。層配分は実際の栄養取得と前ターンに確認した供給元によります。';
    if($('graph-values').dataset.catalogue!==catalogueKey){$('graph-values').dataset.catalogue=catalogueKey;$('graph-values').innerHTML=catalogue.map(s=>`<button class="small" data-graph-description="${escape(s.id)}">${escape(s.name)} <b>0</b></button>`).join('');}
    for(const b of $('graph-values').children){b.querySelector('b').textContent=r.counts[b.dataset.graphDescription]||0;b.disabled=!!analysisData;b.onclick=()=>describeSpecies(b.dataset.graphDescription);}
  }
  $('graph-turn').oninput=()=>{graphFollow=false;renderGraphs();};
  $('graph-latest').onclick=()=>{graphFollow=true;renderGraphs();};
  $('graph-species').onchange=renderGraphs;
  $('graphs-panel').ontoggle=()=>{if($('graphs-panel').open)renderGraphs();};
  $('export-observation').onclick=()=>{
    const graph=graphObservation();if(!graph)return;
    try{const blob=new Blob([graph.csv()],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ecology-turns-0-${graph.rows.at(-1).turn}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);graph.markExported();message('全ターンCSVのダウンロードを開始しました。保存先でファイルをご確認ください。');}catch(e){stop();message('観測データを書き出せませんでした: '+e.message);}
  };

  function drawPortrait(canvas, o) {
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
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
    return `<details open><summary>宿主 H → ${D.byId[p.species].name} P ${q ? "→ 抑環 Q" : ""}</summary><p class="stats-line">P: ${escape(p.id)}<br>${stages[p.stage]} / 成熟 ${p.counter}/${E.P.required[p.stage]} / E ${fmt(p.E)}<br>宿主: ${escape(p.hostId)}<br>出産待機 ${Math.max(0, p.ready - world.turn)}</p>${q ? `<p class="stats-line">Q: ${escape(q.id)}<br>${phase(q.phase)}相 / E ${fmt(q.E)} / ${escape({ rectify: "整流", retain: "鮮度保持", modulate: "変調" }[q.special] || "未特化")}<br>宿主: ${escape(q.hostId)}<br>累積 発信/接触/取得: ${q.counts.join(" / ")}</p>` : ""}</details>`;
  }
  function organismHTML(o) {
    const s = S.spec(o),
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
    return `<article class="specimen ${hero ? "specimen-hero" : ""}"><h3>${escape(s.name)}</h3><div class="phase-name">${phase(o.phase)}相 · ${escape(s.phases?.[o.phase - 1] || s.name)} / ${sex[o.sex] || "無性"} ${roles[o.role] || ""}</div>${main ? `<p class="diet-tag">${escape(s.dietName || D.diets[s.diet].name)} · ${escape(s.dietDescription || D.diets[s.diet].description)}</p>` : ""}<canvas class="portrait" width="${hero ? 384 : 116}" height="${hero ? 300 : 116}" data-portrait="${escape(o.id)}"></canvas><p class="micro">${escape(o.id)} · 世代 ${o.generation} · 年齢 ${o.age}ターン${age.enabled ? ` · <strong class="age-stage" data-age-stage="${age.stage}">${ageLabel}</strong> · 成熟${age.matureAt} / 老齢${age.elderlyAt}` : ""}</p><div class="vital-bars"><span>E</span><progress max="${p.capE}" value="${o.E}"></progress><span>${fmt(o.E)} / ${fmt(p.capE)}</span><span>HP</span><progress max="${p.maxHP}" value="${o.HP}"></progress><span>${fmt(o.HP)} / ${p.maxHP}</span></div>${actionNote}${birthNote}${preview}${hero ? affinity + weights : ""}<details class="specimen-data"><summary>栄養・能力・系譜の詳細</summary><p class="stats-line">B ${fmt(o.B)} · M ${fmt(o.M)} · G ${fmt(o.G)}${s.group === "plant" ? "<br>可食葉B " + fmt(S.edibleB(o)) + " / 基部B " + fmt(Math.min(S.PLANT_BASE, o.B)) : ""}<br>食性 ${s.dietName || D.diets[s.diet]?.name || (s.group === "plant" ? "光合成" : s.group === "prey" ? "草食" : "菌類の分解吸収")}<br>寿命 ${p.life} · 維持E ${fmt(p.maintenance)}${age.enabled ? `<br>出生時寿命基準 ${age.birthLife}（進化しても固定）<br>通常姿勢の攻防（観測用）<br>${powerDetails}<br>年齢補正：攻撃×${fmt(p.ageFactors.attack)} / 防御×${fmt(p.ageFactors.defense)} / HP×${fmt(p.ageFactors.hp)}<br>移動費×${fmt(p.ageFactors.move)} / 回復×${fmt(p.ageFactors.healing)} / 繁殖待機×${fmt(p.ageFactors.birth)}<br>最大HP：基礎${p.baseMaxHP} → ${p.maxHP} / 維持：基礎${fmt(p.baseMaintenance)} → ${fmt(p.maintenance)}` : ""}<br>感知 ${p.sense} / 移動 ${p.speed} / 射程 ${p.range}<br>${main ? `枝: ${o.branch3 === null ? "未分岐" : s.branches[o.branch3]} ${o.branch4 === null ? "" : D.branch4[o.branch3][o.branch4]}<br>出生待機 ${Math.max(0, o.birthReady - world.turn)} / 攻撃待機 ${Math.max(0, o.attackReady - world.turn)}<br>` : ""}${o.colony ? "集団 " + escape(o.colony) + "<br>" : ""}両親: ${escape(o.parents.join(", ") || "初期個体")}</p></details>${main ? `<button class="small" data-tree="${s.id}">この系統の進化条件 ↗</button><details><summary>基礎DNA</summary><p class="micro">DNAは出生時固定。行動パラメータは本人・一族・接触・情報の経験で変わります。</p>${S.DNA.map((k) => `<div class="weight-row"><span>${{ body: "体格", appendage: "付属器", senses: "感覚", skin: "外皮", aptitude: "代謝適性", sensitivity: "情報感度" }[k]}</span><span>${fmt(o.dna[k])}</span></div>`).join("")}</details>` : ""}${infectionHTML(o)}${world.diagnostics?.id === o.id ? `<details><summary>直近の候補上位3（観測用）</summary>${world.diagnostics.candidates.map((c) => `<p class="micro">${actions[c.type]} / 得点 ${fmt(c.score)} / 費用 ${fmt(c.cost)}<br>特徴: ${c.features.map(fmt).join(" / ")}</p>`).join("")}</details>` : ""}</article>`;
  }
  function renderSelection() {
    const speciesMode=!!describedSpecies,detailMode=speciesMode||selectedCell!==null;
    $('inspector-graphs').hidden=detailMode;$('inspector-details').hidden=!detailMode;
    if(!detailMode&&world)renderGraphs();
    $("species-info").hidden=!speciesMode;$("selection").hidden=speciesMode;
    $("follow-individual").hidden=speciesMode;$("follow-note").hidden=speciesMode;
    $("close-species").hidden=!speciesMode&&selectedCell===null;
    document.querySelector(".inspector-heading").textContent=speciesMode?"◈ 系統の説明":"◈ 選択中の個体";
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
      `<p class="note">${selectedId&&!located?"選択したIDは消失しました。同じマスの別個体へは追跡を切り替えていません。":""}</p><p class="cell-context">マス (${x}, ${y}) · ${D.environments[t.env].name}<br>${terrain[t.terrain]} / 遮蔽 ${cover[t.cover]}${t.blocked ? " / 通行不可" : ""}<br>光 ${fmt(t.light)} / 土壌M ${fmt(t.soilM)}</p>${occupants.map((o) => `<button class="small" data-observe="${escape(o.id)}">${o.slot === "main" ? "主" : "餌"}: ${escape(S.spec(o).name)}</button>`).join(" ")}${occupants.map(o=>`<span class="parasite-choices">${o.infection?`<button class="small" data-observe="${escape(o.infection.id)}">P ${escape(D.byId[o.infection.species].name)}</button>`:""}${o.infection?.q?`<button class="small" data-observe="${escape(o.infection.q.id)}">Q ${escape(D.byId.hyperparasite.name)}</button>`:""}</span>`).join("")}${(world.searchQ||[]).filter(q=>q.cell===selectedCell).map(q=>`<button class="small" data-observe="${escape(q.id)}">Q 探索群体 ${escape(q.id)}</button>`).join("")}${selectedId?.startsWith("q:")||selectedId?.startsWith("p:")?parasiteDetails(selectedId):""}${occupants.map(organismHTML).join("")}${corpses.map(a=>`<p class="parasite-choices"><button class="small" data-observe="${escape(a.id)}">死骸: ${escape(D.byId[a.species].name)} / ${escape(a.slot)}</button>${a.infection&&(world.turn<a.payloadExpires)?`<button class="small" data-observe="${escape(a.infection.id)}">死骸上P</button>${a.infection.q?`<button class="small" data-observe="${escape(a.infection.q.id)}">死骸上Q</button>`:""}`:""}</p>`).join("")}${resources.map((a) => `<article class="specimen"><h3>${S.FOOD[a.kind].name} · 量 ${fmt(a.q)}</h3><p class="stats-line">E ${fmt(a.E)} / M ${fmt(a.M)} / G ${fmt(a.G)}<br>残存 ${a.expires === null ? "期限なし" : a.expires - world.turn + "ターン"}</p>${a.event ? `<p class="stats-line">情報源 ${escape(a.event.sourceId)}<br>文脈 ${D.environments[a.event.env].name} / 鮮度年齢 ${world.turn - a.event.time}<br>成分 ${a.event.values.map((v) => D.weightNames[v.axis] + " " + fmt(v.value)).join(" / ")}<br>${a.event.noise ? "撹乱情報" : "経験情報"} / ${a.event.mediator ? "Q媒介 " + escape(a.event.mediator.special) : "直接"}</p>` : ""}</article>`).join("")}${corpses.map((a) => {const appearance=renderer.deathAppearance(a.id);return `<p class="stats-line">死骸 ${D.byId[a.species].name} / q ${fmt(a.q)}<br>${appearance?"死亡時: "+phase(appearance.phase)+"相 / "+escape(appearance.sex||"無性別")+" / 年齢"+appearance.age+"T / 枝"+(appearance.branch3??"—")+"-"+(appearance.branch4??"—"):"死亡時の姿は未取得（基本画）"}<br>E ${fmt(a.E)} / M ${fmt(a.M)} / G ${fmt(a.G)}<br>${a.infection ? "感染残存 " + escape(a.infection.species) + " / 期限 " + a.payloadExpires : "感染なし"}</p>`;}).join("")}${!occupants.length ? '<p class="note">生体なし。局所不在は系統全滅とは異なります。</p>' : ""}`;
    [...$("selection").querySelectorAll("details")].forEach((d,i)=>{if(savedOpen[i]!==undefined)d.open=savedOpen[i];});$("selection").scrollTop=savedScroll;document.querySelector(".inspector").scrollTop=inspectorScroll;
    $("follow-individual").disabled=!locate(selectedId);
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
    const counts=observations?.rows.at(-1)?.current.counts||world.stats.counts;
    if(!$("species-key").childElementCount){
      $("species-key").innerHTML=D.species.map(s=>`<span class="map-key-item" data-species="${s.id}"><input type="checkbox" aria-label="${escape(s.name)}の所在を強調" data-highlight="${s.id}"><button class="species-button" data-describe="${s.id}"><canvas width="40" height="40" aria-hidden="true"></canvas><span>${escape(s.name)}</span><b data-count="${s.id}">0</b></button></span>`).join("");
      for(const item of $("species-key").children){const sp=D.byId[item.dataset.species];item.style.setProperty("--presence-color",R.highlightColor(sp.id));R.symbol(item.querySelector("canvas").getContext("2d"),sp.id,20,20,14,R.symbolColor(sp));}
      for(const input of $("species-key").querySelectorAll("[data-highlight]"))input.onchange=()=>{renderer.view.highlights=[...$("species-key").querySelectorAll("[data-highlight]:checked")].map(i=>i.dataset.highlight);};
      for(const button of $("species-key").querySelectorAll("[data-describe]"))button.onclick=()=>describeSpecies(button.dataset.describe);
    }
    for(const s of D.species){
      const count=counts[s.id]||0,node=document.querySelector(`[data-count="${s.id}"]`),item=node.closest(".map-key-item");
      node.textContent=count;
      if(!count&&item.contains(document.activeElement)){$("clear-highlights").focus({preventScroll:true});$("presence-note").textContent=s.name+"の現在個体数は0になりました。過去の記録と所在強調の選択は保持します。";}
      item.hidden=count===0;
    }
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
    $("food-count").textContent = s.food.toLocaleString();
    $("parasite-count").textContent = s.P + " / " + s.Q;
    $("timing").textContent = lastMs ? Math.round(lastMs) + " ms" : "—";
    renderPopulation();
    if($("graphs-panel").open&&(!$("inspector-graphs").hidden||analysisData))renderGraphs();
    if ($("rank-panel").open) renderRanking();
    const key = world.checkpoints.map(a => a.turn).join(",");
    if (checkpointKey !== key) {
      checkpointKey = key;
    $("checkpoints").innerHTML =
      '<div class="table-scroll"><table><tr><th>TURN</th><th>主</th><th>餌</th><th>P</th><th>Q</th></tr>' +
      world.checkpoints
        .map(
          (a) =>
            `<tr><td>${a.turn}</td><td>${a.main}</td><td>${a.food}</td><td>${a.P}</td><td>${a.Q}</td></tr>`,
        )
        .join("") +
      "</table></div>";
    }
    if ($("budget-panel").open) renderBudget();
    $("list-count").textContent = s.population;
    if ($("individual-list").open) renderIndividuals();
    renderSelection();
    if ($("guide").open && activeSheet === "tree") drawTree();
  }
  function renderRanking() {
    if (!world) return;
    const s = world.stats;
    $("ranking").innerHTML =
      D.species
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
        .map(([k, v]) => stages[k] + " " + v)
        .join(" / ") +
      "<br>移行 " +
      world.tallies.transfers +
      " / 失敗 " +
      world.tallies.infectionFailures +
      "<br>情報 発信成功ターン " +
      world.tallies.information.emissionTurns +
      " / 新規受信 " +
      world.tallies.information.received +
      " / Q媒介 " +
      world.tallies.information.mediated +
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
      D.species
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
  function renderIndividuals() {
    if (!world) return;
    $("cells-table").innerHTML = world.organisms
      .slice(0, 100)
      .map(
        (o) =>
          `<tr class="select-row" data-id="${escape(o.id)}"><td>${escape(o.id)}</td><td>${escape(S.spec(o).name)} ${phase(o.phase)}</td><td>${sex[o.sex] || "無性"} ${roles[o.role] || ""}</td><td>${o.age} / ${o.generation}</td><td>${fmt(o.HP)}</td><td>${[o.E, o.B, o.M, o.G].map(fmt).join(" / ")}</td></tr>`,
      )
      .join("");
    for (const tr of $("cells-table").querySelectorAll("tr"))
      tr.onclick = () => {
        const o = world.organisms.find((a) => a.id === tr.dataset.id);
        if (o) {hold("detail");select(o.cell, o.id);}
      };
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
    setText("current-overall",current.summary.overall);
    for(const key of ["breadth","diversity","persistence"]){setText("current-"+key,current.summary[key].text);setText("current-"+key+"-values",current.summary[key].detail);}
    const palette={plant:"#68ce8c",prey:"#53d2df",main:"#62a7ef",fungus:"#efb375",P:"#b88ae5",Q:"#d5b3f2"},c=$("current-donut"),g=c.getContext("2d");g.clearRect(0,0,c.width,c.height);
    let angle=-Math.PI/2;
    for(const group of current.groups){if(!group.count)continue;const end=angle+group.count/Math.max(1,current.total)*Math.PI*2;
      g.beginPath();g.arc(120,94,66,angle,end);g.lineWidth=24;g.strokeStyle=palette[group.id];g.stroke();
      const members=D.species.filter(s=>s.group===group.id);let at=angle;
      for(const s of members){const n=current.counts[s.id]||0;if(!n)continue;const to=at+n/current.total*Math.PI*2;g.beginPath();g.arc(120,94,85,at+.008,Math.max(at+.008,to-.008));g.lineWidth=12;g.strokeStyle=R.highlightColor(s.id);g.stroke();at=to;}
      angle=end;
    }
    g.textAlign="center";g.fillStyle="#d6e5df";g.font="14px sans-serif";g.fillText(current.total?"現在の構成":"生体なし",120,99);
    $("current-legend").innerHTML=current.groups.map(a=>`<span><i style="background:${palette[a.id]}"></i>${escape(a.name)}</span>`).join("");
    $("current-donut").setAttribute("aria-label",current.groups.map(a=>a.name+" "+(current.total?(a.count/current.total*100).toFixed(1)+"%":"0")).join(" / "));
    setText("parasite-count",(current.counts.tideparasite||0)+(current.counts.leafparasite||0)+" / "+(current.counts.hyperparasite||0));

  }
  for (const [id, fn] of [["rank-panel", renderRanking], ["budget-panel", renderBudget], ["individual-list", renderIndividuals]])
    $(id).addEventListener("toggle", () => { if ($(id).open) fn(); });
  function updateCohortHint() {
    syncSetupFields();
    if (!$("group-main").checked) {
      $("cohort-hint").textContent = "主生物なしで、選択した生物群を観察します。";
      return;
    }
    const mode = $("lineages").value,
      count = mode === "all" ? 20 : mode === "few" ? 5 : $("lineage-options").querySelectorAll("input:checked").length,
      total = Number($("initial").value);
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
  $("detail-hold").onclick=()=>running?stop():startRunning();
  for(const id of ["guide","results"])$(id).addEventListener("close",()=>release(id));
  for(const id of ["fit","zoom-in","zoom-out","overview-view","detail-view","focus-view","simplified","grid","resources","emphasis","age-emphasis","status-marks","motion"]){
    $(id)?.addEventListener("click",()=>mapInteraction(!!drag),true);
  }
  document.addEventListener("visibilitychange",()=>document.hidden?hold("hidden"):release("hidden"));
  const card = (title, text) =>
    `<article class="sheet-card"><h3>${title}</h3>${text}</article>`;
  function qGrowthGuide(){
    const favored=world?.config.advantageSettings?.hyperparasite!==false;
    return `I · 完全支払い${favored?1:4}回 → II · 更に${favored?2:8}回とE${favored?"0.02":"0.2"} → III`;
  }
  const sheets = {
    system: () =>
      `<h2>基本システムから読む</h2><p class="note">自然配置は同系統4体の小組。生産者は光・葉量・モード・優遇に応じてEを得てBへ投資し、土壌Mも利用します。生産者の供給設定は光合成と別の外部入力として収支に記録します。</p><div class="flow">初期値 → 固定環境・初期生物 → 局所の同期更新 → 食物網・生存競争 → 観測</div><div class="sheet-grid">${card("セルと生物の重なり", "<p>マスには主生物1体、生産者/分解者1体、一次消費者1体の3枠があり、同じマスに共存できます。最大3種の落ちた資源は別です。一次寄生虫Pは各宿主に1群体、高次寄生虫QはPに1群体付随します。探索Qと感染性死骸も別に存在します。生物は独立個体、P/Qは群体の管理単位です。</p>")}${card("固定環境、変わる生命", "<p>6種類の事前地形から選び、地形用初期値で候補地点の地物を決めます。生態用初期値は個体と資源の配置・生態進行に使います。8環境と地形・光・障害物は開始後に変わりません。系統の得意・苦手環境で攻撃・防御・移動Eが変わります。境界は通行可能なら越えられ、環境ごとに生物を隔離しません。</p>")}${card("三段階の観察", "<p>自動観察は1ターン約1秒。資源更新、移動・採食・戦闘、成長・繁殖を順に表示します。途中はプレビューで、個体数や図鑑は確定した結果を使います。一時停止では最後の確定ターンへ戻ります。地図操作や説明閲覧中も進みます。手動停止中も観察操作ができます。最大60秒の事前計算と上限6ターンの先行計算を使います。負荷が高いときは時間を伸ばし、個体やターンを省略しません。手動の1ターン操作は即時に確定します。</p>")}${card("観察モードの条件", "<p>自由設定は従来の光合成入力と初期餌量。河畔・定着観察は7系統、湖沼・食物網観察は5系統で、主生物は小マップ160体から面積に比例します。両モードは高生産環境として光合成入力2倍。餌生物の初期量は河畔25%増、湖沼50%増です。群密度・種別初期数・資源量は別欄で調整でき、生産者供給も自由設定から選択できます。動物・寄生虫の救済補充はありません。供給ONでは適地の生産者へ外部栄養と環境由来の定着が生じます。実効条件と実配置を図鑑へ保存します。</p>")}${card("10段階の同期ターン", "<ol><li>期限切れ・資源CA</li><li>光と行動候補</li><li>移動予約</li><li>同時戦闘</li><li>育児・採食</li><li>維持費・死亡</li><li>経験・寄生成熟</li><li>成長・繁殖</li><li>有償生産・情報・寄生出産</li><li>結果確定・観測</li></ol>")}${card("有限の収支", "<p>Eは使えるエネルギー、Bは身体の有機量、Mは鉱物、Gは累積成長値。光と、有効時の生産者供給が外部入力です。供給のE/Mは独立台帳へ記録し、食物は生物・死骸・土壌から支払います。植物は所在土壌Mを一口最大0.1取り、吸収率0.5の残りを土へ戻します。二口の上限を共有します。時間だけで食べた餌が無料復活することはありません。散逸分も台帳へ記録します。</p>")}${card("ライフゲーム由来の局所規則", "<p>鉱物片・鉱液滴・情報の発生候補は近傍8マスのB3/S23（3で出生、2/3で残存）。候補に加え供給元の予算・地形条件も必要です。主生物の出生は空き主枠の近傍主生物2〜3体と親条件を使います。生産者は通常B2/3（浮遊微藻はB1/2/3）、生産者優遇ONではB1/2/3。一次消費者は通常B2/3、水游虫優遇ONでは水游虫がB1/2/3です。各出生に成熟・栄養・材料・出生費が必要で、供給ONの環境由来定着は親からの出生と別に記録します。主生物の死因は飢餓・寿命・戦闘です。</p>")}${card("規模と観測の限界", "<p>小40×28、標準80×56、大160×112。基準は1ターン約1秒で、負荷超過時は実時間の進行を減速します。画面外も計算し、個体数を描画上限へ合わせません。500ターンで一時停止し、次区間へ続行できます。</p>")}</div>`,
    food: () =>
      `<h2>植物 → 動く餌 → 主生物、そして分解者へ</h2><div class="flow">光 → 植物 → 動く餌 → 主生物 → 死骸 → 菌・有機粒・土壌<br>本人の経験 → 情報エネルギー体 → 他個体の行動パラメータ</div><table class="food-table"><thead><tr><th>餌・生物</th><th>特色 / 主な供給元</th><th>不足・制約</th></tr></thead><tbody>${[
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
          "動く餌が支払って落とす動物性の餌。",
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
          "経験の滞留・浮遊するエネルギー体。系統を越えて局所へ伝わる。",
          "Eは微量、Gなし。鮮度・文脈・重複拒否で効果が変わる。",
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
      `<h2>明示した戦略モードを持たない行動</h2><p class="note">成熟した繁殖型は、HP70・E35以上なら、可視の同系統・異性の繁殖型へ近づく/隣接を保つ候補の仲間特徴に0.8を加えます。仲間親和の重みで効き方が変わり、待機中も接触を保てます。出生のE/M/待機条件は別に判定します。</p><div class="flow">近傍の見える刺激 × 9パラメータ ＋ 空腹・負傷・費用 ＋ 固定された揺らぎ → 移動と作用をそれぞれ判定・採食も別に成立 → 実成果で更新</div><div class="sheet-grid">${card("9つの個体パラメータ", `<p>${D.weightNames.join(" / ")}。出生時は系統傾向と親の影響、以後は本人の成功・損失、近傍の仲間、情報で変わります。「群れる」「逃げる」「周回する」は組合せから見える結果で、群れ全体の司令塔はありません。</p>`)}${card("移動と適応", "<p>主生物は8方向1歩、相や系統により直線2歩。平地/浅瀬E1、岩1.3、深水1.4、泥1.5を基準とし、適応・環境・倒木/茂み・枝で変化します。岩塊・崖・斜めの岩角を通り抜けません。同枠の交換・押出し・予約落選後の再試行はありません。浅瀬は通行可能で、主生物は深水も移動費を払って渡れます。水生の主系統は深水コストが軽く、一次消費者は適地条件も満たす必要があります。各地形には陸・水の既定経路がありますが、全ての場所への到達を保証するものではありません。</p>")}${card("同じターンでできること", "<p>移動候補を決めて予約移動した後、攻撃・防御・育児・寄生除去などの作用を選び直します。採食はその後に別判定し、成立すれば移動・戦闘と同じターンに行えます。毎回3動作を強制せず、対象・空き枠・栄養・費用がなければ行いません。</p>")}${card("戦闘・射程", "<p>敵は異系統の主生物・動く餌。同系統は仲間です。基本射程1、相と系統により2へ。射程2は攻撃85%・E4・待機2、近接E3。射線上の地形や間の生体で遮られます。各攻撃は同時に確定し、自動反撃はありません。</p><p><code>損害 = max(1, round(A − 0.5D))</code><br>A/DはDNA、相、固有特性、所在環境、枝で変化。防御姿勢や遮蔽はDを高めます。</p>")}${card("捕食と防衛", "<p>植物・菌は刈取り、敵生物は戦闘→死亡→有限死骸の採食。防御姿勢にはそのターンの攻撃がありません。小型の主生物は近傍の同系統成体へ寄りやすく、仲間付近の防衛成果は親和性へ影響します。</p>")}${card("経験とランダム性", "<p>実採食、実損害、生還、混雑、同方向の実益などを各値±2/ターンへ。ランダム性は候補ごとの固定ξを重み付けし、再表示で引き直しません。10ターンごとに出生時の重みへ1ずつ近づきます。DNAは変わりません。</p>")}${card("表示は結果の再生", "<p>移動・攻撃・採食・育児・防御・出生・成長・寄生を確定イベントから描画します。詳細演出は最大128体、各個体直近4件まで。描画の省略・拡大縮小・図鑑閲覧は生態計算を変えません。モーションを切ることもできます。</p>")}</div>`,
    birth: () =>
      `<h2>子は第一相から。年齢と進化相は独立。</h2><p class="note">年齢は出生からの時間、相は経験と資源で決まります。各相に幼体・成体・老齢があり得ます。進化しても若返らず、成熟で無料全快しません。幼体の攻防/HPは控えめで維持費が軽く、老齢は回復・移動費・出生待機にも補正が掛かります。老齢と負傷は別です。</p><div class="flow">I · G30 → II · G90＋M＋経験 → III · 3分岐 → IV · G210＋M＋枝経験 → 3×2の最終経路</div><div class="sheet-grid">${card("成長と分岐", "<p>I→IIはG30。II→IIIはG90、系統別M、採食/移動生還/戦闘の経験の首位4以上・差2（均衡している場合は累積18回から最多の経験）。III→IVはG210、追加M、枝内の経験首位3以上・差2。1ターンで1相だけ進み、新能力は翌ターンから有効です。確定した枝は変わりません。</p>")}${card("有性繁殖", "<p>相を問わず年齢が成体/老齢の同系統の雌雄、隣接・無被害・HP70以上・系統別Eの65%・各M2以上・待機0が必要。空きマスの近傍主生物2〜3体のB2/3候補を、親と出生枠の二段階予約で調停します。親は原則E20とM2ずつを支払い、一方の親から同日に複数出生しません。</p>")}${card("遺伝と雌雄差", "<p>子のDNA6値は両親平均に小さな差分。行動の出生重みには系統と親の不変出生基準を含みます。雌雄は同じ能力基盤。系統ごとの器官・輪郭・斑・階級の差を使い、年齢と進化相から独立して表します。出産で親の相を子へ引き継ぎません。</p>")}${card("早成甲殻 · 三相", "<p>この追加系統はIIIで完成。子もI相・年齢0ですが、初期から殻の完成度が高く、防御向きです。出生費は親E30ずつと高く、M・待機などの負担と交換になります。成長段階の少なさは子を成体として生む意味ではありません。</p>")}${card("浮遊傘 · 単為生殖", "<p>成熟雌が可視の同系統成熟雄を8ターン連続で見ず、HP70/E70/M4・無被害・待機0なら単為候補。本人がE40/M4を支払い雌のI相を生みます。有性繁殖を優先し、世界全体の雄不在を透視しません。</p>")}${card("群体節足 · 真社会性", "<p>繁殖雌・繁殖雄・不妊の働育雌。全員独立個体で、共同育児E2→幼体1.8が世代の存続を助けます。高投資の娘が次の繁殖型候補となり、IIIで新集団へ。女王が失われても自動救済はありません。集団由来と階級は個体観察で確認します。</p>")}${card("回復と繁殖復帰", "<p>有機吸収はまずE35まで補い、負傷があれば年齢補正後のHP上限まで回復し、余りはEへ。HP50は回復の上限ではなく行動の危機境界。小型餌は自分のE容量とHP上限を使います。</p>")}${card("出生にも有限収支", "<p>親が支払ったEは子のE/Bへ、Mは子と土壌へ分配。餌生物・植物も少ない段階で成長し、光・食物と局所条件から繁殖します。死亡や採食と同じターンに費用を二重利用しません。</p>")}</div>`,
    parasite: () =>
      `<h2>宿主に付随する生物。H → P → Q。</h2><div class="flow">潮環：微藻 → 水游虫 → 水系の成熟主生物<br>葉環：草本 → 草棲虫 → 植物食/雑食の成熟主生物<br>幼い主生物へ入った場合：追加中間宿主 → 別の成熟主生物</div><div class="sheet-grid">${card("一次寄生虫Pの生活環", "<p>第一宿主で4回の完全支払いを受け、適合する小型餌が食べると中間へ。中間で6回、死亡後の感染性死骸を別の適合主生物が食べると終宿主へ。年齢が幼体なら追加中間となり、更に6回と別宿主への移行が必要。終宿主は8回で成熟します。</p>")}${card("費用・移行・失敗", "<p>宿主が負荷に応じてPへ有限Eを払い、P自身も維持費を必要とします。Qは蓄えと外部情報資源で維持し、宿主/Pへ追加徴収しません。体表Pは有償清掃、体内Pは有償免疫と資源不足で排除されます。移行日は旧宿主だけが払い、P/QのID・エネルギーを保ち、成熟を一日止めます。宿主不適合・感染済み・期限切れでは移行しません。</p>")}${card("出産は第一宿主へ戻る", "<p>成熟終宿主内のPはE0.1を使い、近くの適合第一宿主へ子を置きます。空き第一宿主がなければ8ターンの有限待機体へ。複数Pが同宿主を選ぶと局所調停し、落選者は別宿主へ取り直しません。Pを自由に歩く餌として描きません。</p>")}${card("高次寄生虫Qの進化", `<p>QはPに寄生。${qGrowthGuide()}。現在の高次寄生優遇${world?.config.advantageSettings?.hyperparasite!==false?"ON":"OFF"}の条件です。既存Pの終宿主内成熟直後の3ターンだけ感染可能。Pの成熟や能力値は直接変えず、行動と局所情報へ作用します。Qは宿主へ直接の新たな栄養負荷を重複請求しません。</p>`)}${card("この世界の初期探索Q", `<p>${world?.config.parasiteInitial?.createdSearchQ??0}群体を初期配置。${world?.config.founderCounts?.parasites.hyperparasite!==undefined?"種別指定":"自動設定"}の結果です。これは開始時の値で、現在数は個体数欄で確認できます。</p>`)}${card("間接的で技術的な操作", "<p>QIIIは累積の発信・接触・情報取得をもとに、整流/鮮度保持/変調へ特化。情報の一成分を半減、鮮度倍率1.25（上限1）、または固定−1/0/+1の変調を行います。E0.02、待機4、同イベントの再操作拒否があり、強制的な全域通信はできません。</p>")}${card("観測と本人の知覚は別", "<p>選択した宿主ではH/P/QのID・段階・成熟・エネルギー・特化を確認できます。生物本人はその観測画面を読みません。初期Pは適合第一宿主から選び、Qは適合条件があるとき探索群体を配置します。自動Qは優遇OFFで4〜16、ONで128〜256群体が目標。種別の初期数指定があればそちらを使い、実数は「種別の初期配置結果」と保存条件で確認できます。実際の初期数は開始条件に記録され、観測途中の救済補充はありません。</p>")}</div>`,
    info: () =>
      `<h2>情報は、外に残った行動の作用。</h2><div class="flow">実際の経験 → 有償の情報分泌 → 局所B3/S23 → 鮮度・環境文脈・Q媒介 → 別個体の行動へ</div><div class="sheet-grid">${card("延長された表現型", "<p>情報は滞留・浮遊するエネルギー体として表現します。生物の実成果が環境に残り、別の個体の行動へ作用するモデルです。遺伝子の水平伝播ではなく、系統・DNA・繁殖条件・進化枝を直接書き換えません。</p>")}${card("系統を越えた局所伝達", "<p>本人の経験変化から絶対値の大きい2成分を候補にし、発信元のEを支払って近くへ生成。受け手の系統は問いません。世界全体へ一瞬で共有せず、元の発信時刻・環境文脈・発信者IDを保ちます。</p>")}${card("文脈と鮮度", "<p>同環境は文脈1、異環境は0.5。鮮度は経過0〜4/5〜9/10〜14/15〜19で1/0.75/0.5/0.25、20で失効。感度DNAと掛け、行動重みへの変化は成分±3以内。摂取待機5、既読ID4件で同じ情報の無限取得を防ぎます。</p>")}${card("撹乱も生態の一部", "<p>90%は実経験、10%は同じ成分の符号を反転し大きさ3へ変える撹乱情報。Qの変調も別に作用し得ます。情報が常に正しいとは限らず、同じ生態からどの動きが残るかを観測します。</p>")}${card("少ない栄養、行動への作用", "<p>情報餌は独立項目。Eは1単位0.05相当、Gはありません。有機餌や鉱物の代わりにして全生活を支えることはできません。光輪の濃さと選択表示で鮮度・発信源・媒介を区別します。</p>")}${card("固定長で計算する", "<p>情報イベントは期限付き、記憶は少数ID、Qの経験は3カウンタ。系統全体や家系の全履歴を常時検索せず、近傍と有限の状態から創発的な影響を作ります。</p>")}</div>`,
  };
  function drawTree() {
    const s = D.byId[activeLineage],
      o = world?.organisms.find(
        (a) => a.id === selectedId && a.species === s.id,
      ),
      group = s.group;
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
      `<div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><div><label>系統を選ぶ<select id="tree-select">${D.species.map((a) => `<option value="${a.id}" ${a.id === s.id ? "selected" : ""}>${escape(a.name)} / ${groups[a.group]}</option>`).join("")}</select></label><p class="note">${s.traitText?.join(" / ") || "食物網の独立した生物系統"}</p></div></div>${tree}<div class="flow">${progress}</div>${group === "main" ? `<p class="note">得意環境: ${s.good.map((i) => D.environments[i].name).join(" / ")} · 苦手: ${D.environments[s.bad].name}<br>食性: ${s.dietName || D.diets[s.diet]?.name || "専用栄養"} / ${s.dietDescription || D.diets[s.diet]?.description || ""}<br>基準寿命 ${s.life} / 維持E ${s.maintenance} / 出生E条件 ${s.birthEnergy} / 出生待機 ${s.birthCooldown}<br>繁殖開始は進化相ではなく年齢成熟で決まります。第三相へ到達すると翌4ターンは繁殖待機です。成長・枝決定は一回、DNAは出生時固定です。</p>` : ""}`;
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
  function frame(now) {
    if (now - paintAt >= 1000 / 30) {
      paintAt = now;
      renderer.drawIfChanged(now);
      $("scale-warning").hidden = renderer.view.scale >= 8;
      setText("status", replayEntry
        ? "再生・記録なし"
        : ended
          ? "観測終了"
          : running
            ? "観測中"
            : world
              ? "一時停止"
              : "未準備");
      setText("render-mode",
        { point: "密集記号表示", simple: "記号表示", detail: "詳細表示" }[
          renderer.diagnostics.mode
        ] +
        " · " +
        fmt(renderer.view.scale) +
        " px/マス");
    }
    requestAnimationFrame(frame);
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
      screenForCell: (cell, id = null) => renderer.screen(cell,id),
      hitAt: renderer.hitAt,
      prepare,
      refresh: render,
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
