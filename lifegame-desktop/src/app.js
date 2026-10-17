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
    },
    stages = {
      first: "第一宿主",
      middle: "中間宿主",
      extra: "追加中間宿主",
      terminal: "終宿主",
    };
  const renderer = R.create($("board"));
  const archive = window.EcoArchive.create({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)},E,window.EcoReplayVersion);
  let replayEntry=null, ended=false, pendingResult=null;
  let world = null,
    initialConfig = null,
    running = false,
    timer = null,
    selectedId = null,
    selectedCell = null,
    lastMs = 0,
    activeSheet = "tree",
    activeLineage = "abyss",
    paintAt = 0;
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
        `<span class="habitat-chip"><i style="background-position:${((i % 4) * 100) / 3}% ${i < 4 ? 0 : 100}%"></i><b>${e.name}</b></span>`,
    )
    .join("");
  $("size").addEventListener("change", () => {
    $("initial").value = { "40,28": 80, "80,56": 320, "160,112": 1280 }[
      $("size").value
    ];
  });
  $("lineages").addEventListener("change", () => {
    $("lineage-options").hidden = $("lineages").value !== "manual";
  });
  $("distribution").addEventListener("change", () => {
    $("weight-options").hidden = $("distribution").value !== "weighted";
  });
  $("map-id").innerHTML += window.EcoMapTemplates.list().map(m=>`<option value="${escape(m.id)}">${escape(m.name)}</option>`).join("");
  function readConfig() {
    const [width, height] = $("size").value.split(",").map(Number);
    return {
      seed: $("seed").value,
      landscape: "templates",
      mapId: $("map-id").value,
      terrainSeed: $("terrain-seed").value || $("seed").value,
      width,
      height,
      initial: Number($("initial").value),
      lineages: $("lineages").value,
      selected: [...$("lineage-options").querySelectorAll("input:checked")].map(
        (i) => i.value,
      ),
      weights: Object.fromEntries(
        [...$("weight-options").querySelectorAll("input")].map((i) => [
          i.dataset.weight,
          Number(i.value),
        ]),
      ),
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
  }
  function stop() {
    running = false;
    renderer.view.animate = false;
    clearTimeout(timer);
    timer = null;
    $("start").textContent =
      world?.stopReason === "checkpoint"
        ? "次の1000ターンを続行 ▶"
        : "観測を開始 ▶";
    $("step").disabled = !world || ended;
    $("status").textContent = world ? "一時停止" : "未準備";
  }
  function prepare(config, playback=null) {
    const next = E.create({landscape:"templates",ageModel:"life/1",...config});
    stop();
    replayEntry=playback;ended=false;pendingResult=null;
    $("finish-run").disabled=false;
    $("finish-run").textContent=playback?"再生を終了（記録なし）":"終了して図鑑へ保存";
    world = next;
    initialConfig = structuredClone(next.config);
    $("seed").value = next.config.seed;
    $("terrain-seed").value = next.config.terrainSeed ?? next.config.seed;
    $("map-id").value = next.config.mapId || "auto";
    const map=next.config.mapResolved;
    const mapName=map&&window.EcoMapTemplates.list().find(m=>m.id===map.id)?.name;
    $("map-summary").textContent=map?`${mapName} · 地形版 ${map.version} · ${map.width}×${map.height} · 地形指紋 ${map.terrainHash.slice(0,12)}${map.fallback?" · 安全な既定配置":""}`:"従来方式の地形";
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
    renderer.view.selected = null;
    renderer.setWorld(world);
    renderer.fit();
    $("empty").hidden = true;
    $("start").disabled = false;
    $("step").disabled = false;
    $("reset").disabled = false;
    lastMs = 0;
    const focal =
      world.organisms.find((o) => o.species === "solar") ||
      world.organisms.find((o) => o.slot === "main") ||
      world.organisms[0];
    if (focal) {
      selectedId = focal.id;
      selectedCell = focal.cell;
      renderer.view.selected = focal.cell;
    }
    render();
    message(
      world.warnings.join(" / ") ||
        "世界を読み込みました。環境は固定され、時間はまだ進んでいません。",
    );
    return world;
  }
  function tick() {
    if (!world || ended) return;
    renderer.view.animate = running;
    renderer.view.duration = Math.min(300, 800 / Number($("speed").value));
    const start = performance.now();
    world = E.step(world, { observeId: selectedId });
    lastMs = performance.now() - start;
    renderer.setWorld(world);
    render();
    if(replayEntry && world.turn>=replayEntry.turn){
      stop();ended=true;$("start").disabled=true;$("step").disabled=true;
      message(E.fingerprint(world)===replayEntry.id?"再生終了：元の最終結果と一致しました。記録は追加しません。":"再生終了：元の結果と一致しません。記録は追加しません。");
    } else if (!replayEntry && world.stopReason === "main-extinct") {
      finishRun("main-extinct");
    } else if (world.stopReason && !replayEntry) {
      stop();
      message(
        world.stopReason === "main-extinct"
          ? "主生物が全滅しました。他の生物群は残る場合があります。続行して観測できます。"
          : `${world.turn}ターンの観測区間で一時停止しました。続行できます。`,
      );
    } else if (lastMs > 1000 / Number($("speed").value))
      message(
        "計算負荷に合わせて進行を減速しています。個体・出生・ターンは間引きません。",
      );
    else message("局所の状態から全個体を同期計算しています。");
    return world;
  }
  function runLoop() {
    if (!running) return;
    tick();
    if (running)
      timer = setTimeout(
        runLoop,
        Math.max(0, 1000 / Number($("speed").value) - lastMs),
      );
  }
  $("setup").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      prepare(readConfig());
    } catch (error) {
      message(error.message);
    }
  });
  $("start").addEventListener("click", () => {
    if (running) {
      stop();
      return;
    }
    if (!world || ended || (replayEntry && world.turn>=replayEntry.turn)) return;
    running = true;
    $("start").textContent = "一時停止 Ⅱ";
    $("step").disabled = true;
    $("status").textContent = "観測中";
    timer = setTimeout(runLoop, 0);
  });
  $("step").addEventListener("click", () => {
    stop();
    tick();
  });
  $("reset").addEventListener("click", () => {
    if (initialConfig) prepare(initialConfig,replayEntry);
  });
  function finishRun(reason="user-ended") {
    if(!world)return;
    stop();ended=true;$("start").disabled=true;$("step").disabled=true;
    if(replayEntry){message("再生を終了しました。記録は追加しません。");return;}
    pendingResult ||= archive.capture(world,reason);
    try{archive.save(pendingResult);$("finish-run").disabled=true;message("最終結果を図鑑に保存しました。再生から同じ初期条件を観察できます。");}
    catch(error){$("finish-run").textContent="保存を再試行";message("保存できませんでした："+error.message);}
  }
  function replayResult(id){
    const entry=archive.replay(id);prepare(entry.config,entry);
    if(entry.turn===0){ended=true;$("start").disabled=true;$("step").disabled=true;}
    message("再生・記録なし："+entry.turn+"ターンまで同じ初期条件から再計算します。");
    $("start").textContent="再生を開始 ▶";
  }
  function showResults(){
    try{
      $("results-list").innerHTML=archive.list().map(r=>`<article class="result-entry"><h3>${escape(r.config.seed)}</h3><p>${r.turn}ターン · 主生物 ${fmt(r.final.main)} · ${escape(r.config.mapResolved?.id || "従来地形")} · ${escape(r.created.slice(0,10))}</p><button class="small" data-replay="${escape(r.id)}">初期条件から再生（記録なし）</button> <button class="small secondary" data-remove="${escape(r.id)}">削除</button></article>`).join("")||"<p>終了した観測はまだありません。一時停止では保存されません。</p>";
      for(const b of $("results-list").querySelectorAll("[data-replay]"))b.onclick=()=>{try{replayResult(b.dataset.replay);$("results").close();}catch(e){$("results-error").textContent=e.message;}};
      for(const b of $("results-list").querySelectorAll("[data-remove]"))b.onclick=()=>{try{archive.remove(b.dataset.remove);showResults();}catch(e){$("results-error").textContent=e.message;}};
    }catch(e){$("results-error").textContent=e.message;}
    if(!$("results").open)$("results").showModal();
  }
  $("finish-run").onclick=()=>finishRun();
  $("open-results").onclick=()=>{stop();showResults();};
  $("close-results").onclick=()=>$("results").close();
  $("detail-view").onclick=()=>{
    if(!world)return;const p=selectedCell??world.organisms.find(o=>o.slot==="main")?.cell??0;
    renderer.view.mode="detail";renderer.view.scale=160;renderer.view.x=canvas.clientWidth/2-(p%world.config.width+.5)*160;
    renderer.view.y=canvas.clientHeight/2-(Math.floor(p/world.config.width)+.5)*160;
    renderer.view.x=Math.max(canvas.clientWidth-world.config.width*160,Math.min(0,renderer.view.x));
    renderer.view.y=Math.max(canvas.clientHeight-world.config.height*160,Math.min(0,renderer.view.y));
  };
  $("focus-view").onclick=()=>{
    const active=document.body.classList.toggle("observatory");
    $("focus-view").setAttribute("aria-pressed",String(active));
    $("focus-view").textContent=active?"設定も表示 ↙":"観察画面を広く表示 ↗";
    requestAnimationFrame(()=>{if(renderer.view.mode==="overview")renderer.fit();else if(renderer.view.mode==="detail")$("detail-view").click();});
  };
  $("age-emphasis").addEventListener("change",()=>{renderer.view.ageEmphasis=$("age-emphasis").checked;renderer.draw();});
  for (const id of ["resources", "grid", "motion"])
    $(id).addEventListener("change", () => {
      renderer.view[id] = $(id).checked;
    });
  $("fit").addEventListener("click", () => renderer.fit());
  $("zoom-in").addEventListener("click", () => renderer.zoom(1.4));
  $("zoom-out").addEventListener("click", () => renderer.zoom(1 / 1.4));
  const canvas = $("board");
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
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
      renderer.view.x += dx;
      renderer.view.y += dy;
    }
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  canvas.addEventListener("pointerup", (e) => {
    if (drag && !drag.moved) {
      const cell = renderer.cellAt(e.clientX, e.clientY);
      if (cell !== null) select(cell);
    }
    drag = null;
  });
  canvas.addEventListener("pointercancel", () => {
    drag = null;
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!world) return;
      e.preventDefault();
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
  function select(cell, id = null) {
    selectedCell = cell;
    selectedId =
      id ||
      world.organisms.find((o) => o.cell === cell && o.slot === "main")?.id ||
      world.organisms.find((o) => o.cell === cell)?.id ||
      null;
    renderer.view.selected = cell;
    renderSelection();
  }
  function drawPortrait(canvas, o) {
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    if (
      canvas.classList.contains("portrait") &&
      canvas.width > 200 &&
      R.assets.images.terrain
    ) {
      const texture = R.assets.images.terrain,
        env = world?.tiles[o.cell]?.env ?? 3,
        tw = texture.width / 4,
        th = texture.height / 2;
      g.globalAlpha = 0.4;
      g.drawImage(
        texture,
        (env % 4) * tw,
        Math.floor(env / 4) * th,
        tw,
        th,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      g.globalAlpha = 1;
      const shade = g.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.7,
      );
      shade.addColorStop(0, "#00192300");
      shade.addColorStop(1, "#001822ee");
      g.fillStyle = shade;
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
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
      ageLabel = {juvenile:"幼体",adult:"成体",elderly:"老齢"}[age.stage];
    const powerContext={traits:new Map([[o.id,p]]),intents:new Map()},
      powerDetails=age.enabled?["attack","defense"].map(kind=>{
        const v=E.B.power(world,o,kind,powerContext,true);
        return `${kind==="attack"?"攻撃":"防御"}：基礎${fmt(v.base)} × 年齢${fmt(v.ageFactor)} × 環境等${fmt(v.otherFactor)} → ${fmt(v.effective)}`;
      }).join("<br>"):"";
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
    const actionNames={move:"移動",attack:"攻撃",defend:"防御",feed:"採食",care:"育児",birth:"繁殖",growth:"進化",infection:"感染",light:"光利用"},
      outcomes=[...new Set(world.events.filter(e=>e.id===o.id&&actionNames[e.type]).map(e=>actionNames[e.type]))],
      actionNote=hero?`<p class="committed-action">直前の確定結果<br><strong>${outcomes.length?outcomes.join("・"):world.turn===0?"初期状態・未実行":"該当イベントなし"}</strong></p>`:"";
    const preview =
      main && hero
        ? `<p class="micro">相ごとの形態見本 · 現在は${phase(o.phase)}相</p><div class="phase-strip">${s.phases.map((name, i) => `<div class="${i + 1 === o.phase ? "active" : ""}"><canvas width="128" height="112" data-phase="${i + 1}" data-owner="${escape(o.id)}"></canvas>${phase(i + 1)}</div>`).join("")}</div>`
        : "";
    return `<article class="specimen ${hero ? "specimen-hero" : ""}"><h3>${escape(s.name)}</h3><div class="phase-name">${phase(o.phase)}相 · ${escape(s.phases?.[o.phase - 1] || s.name)} / ${sex[o.sex] || "無性"} ${roles[o.role] || ""}</div><canvas class="portrait" width="${hero ? 384 : 116}" height="${hero ? 300 : 116}" data-portrait="${escape(o.id)}"></canvas><p class="micro">${escape(o.id)} · 世代 ${o.generation} · 年齢 ${o.age}ターン${age.enabled ? ` · <strong class="age-stage" data-age-stage="${age.stage}">${ageLabel}</strong> · 成熟${age.matureAt} / 老齢${age.elderlyAt}` : ""}</p><div class="vital-bars"><span>E</span><progress max="${p.capE}" value="${o.E}"></progress><span>${fmt(o.E)} / ${fmt(p.capE)}</span><span>HP</span><progress max="${p.maxHP}" value="${o.HP}"></progress><span>${fmt(o.HP)} / ${p.maxHP}</span></div>${actionNote}${preview}${hero ? affinity + weights : ""}<details class="specimen-data"><summary>栄養・能力・系譜の詳細</summary><p class="stats-line">B ${fmt(o.B)} · M ${fmt(o.M)} · G ${fmt(o.G)}${s.group === "plant" ? "<br>可食葉B " + fmt(S.edibleB(o)) + " / 基部B " + fmt(Math.min(S.PLANT_BASE, o.B)) : ""}<br>寿命 ${p.life} · 維持E ${fmt(p.maintenance)}${age.enabled ? `<br>出生時寿命基準 ${age.birthLife}（進化しても固定）<br>通常姿勢の攻防（観測用）<br>${powerDetails}<br>年齢補正：攻撃×${fmt(p.ageFactors.attack)} / 防御×${fmt(p.ageFactors.defense)} / HP×${fmt(p.ageFactors.hp)}<br>移動費×${fmt(p.ageFactors.move)} / 回復×${fmt(p.ageFactors.healing)} / 繁殖待機×${fmt(p.ageFactors.birth)}<br>最大HP：基礎${p.baseMaxHP} → ${p.maxHP} / 維持：基礎${fmt(p.baseMaintenance)} → ${fmt(p.maintenance)}` : ""}<br>感知 ${p.sense} / 移動 ${p.speed} / 射程 ${p.range}<br>${main ? `枝: ${o.branch3 === null ? "未分岐" : s.branches[o.branch3]} ${o.branch4 === null ? "" : D.branch4[o.branch3][o.branch4]}<br>出生待機 ${Math.max(0, o.birthReady - world.turn)} / 攻撃待機 ${Math.max(0, o.attackReady - world.turn)}<br>` : ""}${o.colony ? "集団 " + escape(o.colony) + "<br>" : ""}両親: ${escape(o.parents.join(", ") || "初期個体")}</p></details>${main ? `<button class="small" data-tree="${s.id}">この系統の進化条件 ↗</button><details><summary>基礎DNA</summary><p class="micro">DNAは出生時固定。行動パラメータは本人・一族・接触・情報の経験で変わります。</p>${S.DNA.map((k) => `<div class="weight-row"><span>${{ body: "体格", appendage: "付属器", senses: "感覚", skin: "外皮", aptitude: "代謝適性", sensitivity: "情報感度" }[k]}</span><span>${fmt(o.dna[k])}</span></div>`).join("")}</details>` : ""}${infectionHTML(o)}${world.diagnostics?.id === o.id ? `<details><summary>直近の候補上位3（観測用）</summary>${world.diagnostics.candidates.map((c) => `<p class="micro">${actions[c.type]} / 得点 ${fmt(c.score)} / 費用 ${fmt(c.cost)}<br>特徴: ${c.features.map(fmt).join(" / ")}</p>`).join("")}</details>` : ""}</article>`;
  }
  function renderSelection() {
    if (!world || selectedCell === null) {
      $("selection").textContent = "盤面のマスを選択してください。";
      return;
    }
    const observed = world.organisms.find((o) => o.id === selectedId);
    if (observed) {
      selectedCell = observed.cell;
      renderer.view.selected = selectedCell;
    }
    const [x, y] = S.xy(world, selectedCell),
      t = world.tiles[selectedCell],
      occupants = world.organisms
        .filter((o) => o.cell === selectedCell)
        .sort((a, b) => (a.slot === "main" ? -1 : b.slot === "main" ? 1 : 0)),
      resources = world.resources.filter((a) => a.cell === selectedCell),
      corpses = world.carcasses.filter((a) => a.cell === selectedCell);
    $("selection").innerHTML =
      `<p class="cell-context">マス (${x}, ${y}) · ${D.environments[t.env].name}<br>${terrain[t.terrain]} / 遮蔽 ${cover[t.cover]}${t.blocked ? " / 通行不可" : ""}<br>光 ${fmt(t.light)} / 土壌M ${fmt(t.soilM)}</p>${occupants.map((o) => `<button class="small" data-observe="${escape(o.id)}">${o.slot === "main" ? "主" : "餌"}: ${escape(S.spec(o).name)}</button>`).join(" ")}${occupants.map(organismHTML).join("")}${resources.map((a) => `<article class="specimen"><h3>${S.FOOD[a.kind].name} · 量 ${fmt(a.q)}</h3><p class="stats-line">E ${fmt(a.E)} / M ${fmt(a.M)} / G ${fmt(a.G)}<br>残存 ${a.expires === null ? "期限なし" : a.expires - world.turn + "ターン"}</p>${a.event ? `<p class="stats-line">情報源 ${escape(a.event.sourceId)}<br>文脈 ${D.environments[a.event.env].name} / 鮮度年齢 ${world.turn - a.event.time}<br>成分 ${a.event.values.map((v) => D.weightNames[v.axis] + " " + fmt(v.value)).join(" / ")}<br>${a.event.noise ? "撹乱情報" : "経験情報"} / ${a.event.mediator ? "Q媒介 " + escape(a.event.mediator.special) : "直接"}</p>` : ""}</article>`).join("")}${corpses.map((a) => `<p class="stats-line">死骸 ${D.byId[a.species].name} / q ${fmt(a.q)}<br>E ${fmt(a.E)} / M ${fmt(a.M)} / G ${fmt(a.G)}<br>${a.infection ? "感染残存 " + escape(a.infection.species) + " / 期限 " + a.payloadExpires : "感染なし"}</p>`).join("")}${!occupants.length ? '<p class="note">生体なし。局所不在は系統全滅とは異なります。</p>' : ""}`;
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
        selectedId = b.dataset.observe;
        renderSelection();
      };
    for (const b of $("selection").querySelectorAll("[data-tree]"))
      b.onclick = () => {
        activeLineage = b.dataset.tree;
        openGuide("tree");
      };
  }
  function renderMapKey(){
    const counts=world.stats.counts;
    $("species-key").innerHTML=D.species.filter(s=>!["P","Q"].includes(s.group)&&counts[s.id]>0).map(s=>`<span class="map-key-item" data-species="${s.id}"><canvas width="40" height="40" aria-hidden="true"></canvas><span>${escape(s.name)}</span><b>${counts[s.id]}</b></span>`).join("");
    for(const item of $("species-key").children){const s=D.byId[item.dataset.species],c=item.querySelector("canvas");R.symbol(c.getContext("2d"),s.id,20,20,14,R.symbolColor(s));}
    $("resource-key").innerHTML=Object.entries(S.FOOD).map(([id,f])=>`<span class="map-key-item" data-resource="${id}"><canvas width="40" height="40" aria-hidden="true"></canvas><span>${escape(f.name)}</span></span>`).join("");
    for(const item of $("resource-key").children)R.symbol(item.querySelector("canvas").getContext("2d"),item.dataset.resource,20,20,12,item.dataset.resource==="info"?"#8be9ff":"#e9d4a1");
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
    $("ranking").innerHTML =
      D.species
        .map(
          (a) =>
            `<div class="rank"><i class="dot" style="background:${a.color}"></i><span>${escape(a.name)}${!world.config.enabled[a.group] ? " · 未参加" : s.counts[a.id] === 0 ? " · 生体0" : ""}</span><strong>${s.counts[a.id]}</strong></div>`,
        )
        .join("") +
      `<p class="note">感染残存・待機 ${s.resting}<br>群体節足: 繁殖型 ${s.roles.queen} / 働育 ${s.roles.worker} / 雄 ${s.roles.male}<br>集団数 ${Object.keys(s.colonies).length}<br>出生 ${world.last.births} / 死亡 ${world.last.deaths}（当ターン）</p>`;
    $("checkpoints").innerHTML =
      '<div class="table-scroll"><table><tr><th>TURN</th><th>主</th><th>餌</th><th>P</th><th>Q</th></tr>' +
      world.checkpoints
        .map(
          (a) =>
            `<tr><td>${a.turn}</td><td>${a.main}</td><td>${a.food}</td><td>${a.P}</td><td>${a.Q}</td></tr>`,
        )
        .join("") +
      "</table></div>";
    $("checkpoints").innerHTML +=
      '<details style="padding:12px"><summary>収支・出生/死因・情報の累積を見る</summary><p class="stats-line">光からの投入E ' +
      fmt(world.ledger.solar) +
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
      "</table></div></details>";
    $("list-count").textContent = s.population;
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
        if (o) select(o.cell, o.id);
      };
    renderSelection();
    if ($("guide").open && activeSheet === "tree") drawTree();
  }
  const card = (title, text) =>
    `<article class="sheet-card"><h3>${title}</h3>${text}</article>`;
  const sheets = {
    system: () =>
      `<h2>基本システムから読む</h2><p class="note">v1.5：自然配置は同系統4体の小組。植物は基部B2を残し、光4×固定光量×葉量係数でEを得て最大2EをBへ投資。植物の土壌吸収は一口M0.1・吸収率0.5で、合計二口の上限を共有します。</p><div class="flow">初期値 → 固定環境・初期生物 → 局所の同期更新 → 食物網・生存競争 → 観測</div><div class="sheet-grid">${card("セルと生物の重なり", "<p>マスには主生物1体、餌生物1体、最大3種の落ちた資源。一次寄生虫Pは各宿主に1体、高次寄生虫QはPに1体付随します。植物・菌・動く餌は同じ餌枠を使います。1体は常に独立個体です。</p>")}${card("固定環境、変わる生命", "<p>6種類の事前地形から選び、地形用初期値で候補地点の地物を決めます。生態用初期値は個体と資源の配置・生態進行に使います。8環境と地形・光・障害物は開始後に変わりません。系統の得意・苦手環境で攻撃・防御・移動Eが変わります。境界は通行可能なら越えられ、環境ごとに生物を隔離しません。</p>")}${card("10段階の同期ターン", "<ol><li>期限切れ・資源CA</li><li>光と行動候補</li><li>移動予約</li><li>同時戦闘</li><li>育児・採食</li><li>維持費・死亡</li><li>経験・寄生成熟</li><li>成長・繁殖</li><li>有償生産・情報・寄生出産</li><li>結果確定・観測</li></ol>")}${card("有限の収支", "<p>Eは使えるエネルギー、Bは身体の有機量、Mは鉱物、Gは累積成長値。光がEの外部入力で、食物は生物・死骸・土壌から支払います。植物は所在土壌Mを一口最大0.1取り、吸収率0.5の残りを土へ戻します。二口の上限を共有します。時間だけで食べた餌が無料復活することはありません。散逸分も台帳へ記録します。</p>")}${card("ライフゲーム由来の局所規則", "<p>鉱物片・鉱液滴・情報の発生候補は近傍8マスのB3/S23（3で出生、2/3で残存）。候補に加え供給元の予算・地形条件も必要です。主生物の出生は空きマスの近傍主生物2〜3体と二親条件、植物はB3、小型餌は2〜3近傍を使います。主生物の死因は飢餓・寿命・戦闘です。</p>")}${card("規模と観測の限界", "<p>小40×28、標準80×56、大160×112。1/5/10ターン毎秒を指定でき、負荷超過時は実時間の進行を減速します。画面外も計算し、個体数を描画上限へ合わせません。1000ターンで一時停止し、次区間へ続行できます。</p>")}</div>`,
    food: () =>
      `<h2>植物 → 動く餌 → 主生物、そして分解者へ</h2><div class="flow">光 → 植物 → 動く餌 → 主生物 → 死骸 → 菌・有機粒・土壌<br>本人の経験 → 情報エネルギー体 → 他個体の行動パラメータ</div><table class="food-table"><thead><tr><th>餌・生物</th><th>特色 / 主な供給元</th><th>不足・制約</th></tr></thead><tbody>${[
        [
          "微藻・岩苔・草本",
          "動かず光からEを生産。多く分布し、可食葉の刈取り量は小さく、基部B2を残します。微藻は浅水、岩苔は寒冷/静/湿潤の岩・浅瀬、草本は深水以外。",
          "同じ餌枠に他の生物は入れない。葉が減ると光入力が下がり、維持不能・寿命で死亡。",
        ],
        [
          "菌膜",
          "死骸・有機物を利用する分解者。失活胞子は回復寄与1.2倍。",
          "光合成しない。生きた植物への刈取りでは増えない。",
        ],
        [
          "水游虫・草棲虫",
          "自ら移動し採食・繁殖する動物性の餌。攻撃力0、寿命は短い。水游虫は偶数ターンに移動候補。",
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
      `<h2>明示した戦略モードを持たない行動</h2><p class="note">成熟した繁殖型は、HP70・E35以上なら、可視の同系統・異性の繁殖型へ近づく/隣接を保つ候補の仲間特徴に0.8を加えます。仲間親和の重みで効き方が変わり、待機中も接触を保てます。出生のE/M/待機条件は別に判定します。</p><div class="flow">近傍の見える刺激 × 9パラメータ ＋ 空腹・負傷・費用 ＋ 固定された揺らぎ → 1つの合法動作 → 実成果で更新</div><div class="sheet-grid">${card("9つの個体パラメータ", `<p>${D.weightNames.join(" / ")}。出生時は系統傾向と親の影響、以後は本人の成功・損失、近傍の仲間、情報で変わります。「群れる」「逃げる」「周回する」は組合せから見える結果で、群れ全体の司令塔はありません。</p>`)}${card("移動と適応", "<p>8方向1歩、相や系統により直線2歩。平地/浅瀬E1、岩1.3、深水1.4、泥1.5を基準とし、適応・環境・倒木/茂み・枝で変化します。岩塊・崖・斜めの岩角を通り抜けません。同枠の交換・押出し・予約落選後の再試行はありません。</p>")}${card("戦闘・射程", "<p>敵は異系統の主生物・動く餌。同系統は仲間です。基本射程1、相と系統により2へ。射程2は攻撃85%・E4・待機2、近接E3。射線上の地形や間の生体で遮られます。各攻撃は同時に確定し、自動反撃はありません。</p><p><code>損害 = max(1, round(A − 0.5D))</code><br>A/DはDNA、相、固有特性、所在環境、枝で変化。防御姿勢や遮蔽はDを高めます。</p>")}${card("捕食と防衛", "<p>植物・菌は刈取り、敵生物は戦闘→死亡→有限死骸の採食。防御姿勢にはそのターンの攻撃がありません。小型の主生物は近傍の同系統成体へ寄りやすく、仲間付近の防衛成果は親和性へ影響します。</p>")}${card("経験とランダム性", "<p>実採食、実損害、生還、混雑、同方向の実益などを各値±2/ターンへ。ランダム性は候補ごとの固定ξを重み付けし、再表示で引き直しません。10ターンごとに出生時の重みへ1ずつ近づきます。DNAは変わりません。</p>")}${card("表示は結果の再生", "<p>移動・攻撃・採食・育児・防御・出生・成長・寄生を確定イベントから描画します。詳細演出は最大128体、各個体直近4件まで。描画の省略・拡大縮小・図鑑閲覧は生態計算を変えません。モーションを切ることもできます。</p>")}</div>`,
    birth: () =>
      `<h2>子は第一相から。年齢と進化相は独立。</h2><p class="note">年齢は出生からの時間、相は経験と資源で決まります。各相に幼体・成体・老齢があり得ます。進化しても若返らず、成熟で無料全快しません。幼体の攻防/HPは控えめで維持費が軽く、老齢は回復・移動費・出生待機にも補正が掛かります。老齢と負傷は別です。</p><div class="flow">I · G30 → II · G90＋M＋経験 → III · 3分岐 → IV · G210＋M＋枝経験 → 3×2の最終経路</div><div class="sheet-grid">${card("成長と分岐", "<p>I→IIはG30。II→IIIはG90、系統別M、採食/移動生還/戦闘の経験の首位4以上・差2。III→IVはG210、追加M、枝内の経験首位3以上・差2。1ターンで1相だけ進み、新能力は翌ターンから有効です。確定した枝は変わりません。</p>")}${card("有性繁殖", "<p>III以上かつ成体/老齢の同系統の雌雄、隣接・無被害・HP70以上・系統別E・各M4以上・待機0が必要。空きマスの近傍主生物2〜3体のB2/3候補を、親と出生枠の二段階予約で調停します。親は原則E20とM2ずつを支払い、一方の親から同日に複数出生しません。</p>")}${card("遺伝と雌雄差", "<p>子のDNA6値は両親平均に小さな差分。行動の出生重みには系統と親の不変出生基準を含みます。雌雄は同じ能力基盤、雄は小さな冠/触角、雌は側面斑の差。出産で親の相を子へ引き継ぎません。</p>")}${card("早成甲殻 · 三相", "<p>この追加系統はIIIで完成。子もI相・年齢0ですが、初期から殻の完成度が高く、防御向きです。出生費は親E30ずつと高く、M・待機などの負担と交換になります。成長段階の少なさは子を成体として生む意味ではありません。</p>")}${card("浮遊傘 · 単為生殖", "<p>成熟雌が可視の同系統成熟雄を8ターン連続で見ず、HP70/E70/M4・無被害・待機0なら単為候補。本人がE40/M4を支払い雌のI相を生みます。有性繁殖を優先し、世界全体の雄不在を透視しません。</p>")}${card("群体節足 · 真社会性", "<p>繁殖雌・繁殖雄・不妊の働育雌。全員独立個体で、共同育児E2→幼体1.8が世代の存続を助けます。高投資の娘が次の繁殖型候補となり、IIIで新集団へ。女王が失われても自動救済はありません。集団由来と階級は個体観察で確認します。</p>")}${card("回復と繁殖復帰", "<p>有機吸収はまずE35まで補い、負傷があれば年齢補正後のHP上限まで回復し、余りはEへ。HP50は回復の上限ではなく行動の危機境界。小型餌は自分のE容量とHP上限を使います。</p>")}${card("出生にも有限収支", "<p>親が支払ったEは子のE/Bへ、Mは子と土壌へ分配。餌生物・植物も少ない段階で成長し、光・食物と局所条件から繁殖します。死亡や採食と同じターンに費用を二重利用しません。</p>")}</div>`,
    parasite: () =>
      `<h2>宿主に付随する生物。H → P → Q。</h2><div class="flow">潮環：微藻 → 水游虫 → 水系の成熟主生物<br>葉環：草本 → 草棲虫 → 植物食/雑食の成熟主生物<br>幼い主生物へ入った場合：追加中間宿主 → 別の成熟主生物</div><div class="sheet-grid">${card("一次寄生虫Pの生活環", "<p>第一宿主で4回の完全支払いを受け、適合する小型餌が食べると中間へ。中間で6回、死亡後の感染性死骸を別の適合主生物が食べると終宿主へ。III未満なら追加中間となり、更に6回と別宿主への移行が必要。終宿主は8回で成熟します。</p>")}${card("費用・移行・失敗", "<p>根宿主がE0.2/ターンを支払い、Pへ0.15、Qがいれば0.05。足りなければ宿主HPが失われ、成熟条件も不足。移行日は旧宿主だけが払い、P/QのID・エネルギーを保ち、成熟を一日止めます。宿主不適合・感染済み・期限切れでは移行しません。</p>")}${card("出産は第一宿主へ戻る", "<p>成熟終宿主内のPはE0.1を使い、近くの適合第一宿主へ子を置きます。空き第一宿主がなければ8ターンの有限待機体へ。複数Pが同宿主を選ぶと局所調停し、落選者は別宿主へ取り直しません。Pを自由に歩く餌として描きません。</p>")}${card("高次寄生虫Qの進化", "<p>QはPに寄生。Iで4回→II、さらに8回とE0.2でIIIへ。II以降はPの成熟を隔ターン、出産待機を2倍、宿主行動の操作を半分へ。Qは宿主へ直接の新たな栄養負荷を重複請求しません。</p>")}${card("間接的で技術的な操作", "<p>QIIIは累積の発信・接触・情報取得をもとに、整流/鮮度保持/変調へ特化。情報の一成分を半減、鮮度倍率1.25（上限1）、または固定−1/0/+1の変調を行います。E0.02、待機4、同イベントの再操作拒否があり、強制的な全域通信はできません。</p>")}${card("観測と本人の知覚は別", "<p>選択した宿主ではH/P/QのID・段階・成熟・エネルギー・特化を確認できます。生物本人はその観測画面を読みません。初期Pは適合第一宿主の5%、QはPの1%を初期値で選ぶため、0体でも不正な状態ではありません。</p>")}</div>`,
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
      tree = `<div class="tree-root"><div class="phase-box"><small>I</small><br>${s.phases[0]}</div><span>G${s.id === "precocial" ? 45 : 30} →</span><div class="phase-box"><small>II</small><br>${s.phases[1]}</div></div><p class="note">III条件: G${s.id === "precocial" ? 120 : 90}・系統M${s.M3}をDNA補正、経験首位4以上・次点差2。I→IIはG${s.id === "precocial" ? 45 : 30}。上位相ほど能力が上がります。</p><div class="tree-branches">${s.branches.map((name, i) => `<div><div class="phase-box"><small>III · ${s.phases[2]}</small><h4>${name}</h4><p>${third[i]}<br>首位4以上 / 次点差2</p></div>${s.phases.length === 4 ? `<div class="tree-finals">${D.branch4[i].map((b, j) => `<div>IV · ${escape(s.phases[3])}<br><strong>${b}</strong><p>${fourth[i][j]}<br>G210・M${s.M4}（DNA補正）<br>経験首位3以上 / 差2</p></div>`).join("")}</div>` : '<p class="note">IIIで完成。第四相なし。</p>'}</div>`).join("")}</div>`;
    } else if (group === "P") {
      tree =
        '<div class="flow">' +
        (s.id === "tideparasite"
          ? "微藻（4） → 水游虫（6） → 水系のIII以上（8）"
          : "草本（4） → 草棲虫（6） → 植物食/雑食のIII以上（8）") +
        "<br>若い主生物を経由: 追加中間（6） → 別のIII以上</div><p>数字は根宿主から完全支払いを受ける成熟回数。移行日には進みません。</p>";
    } else if (group === "Q") {
      tree =
        '<div class="flow">I · 完全支払い4回 → II · 更に8回とE0.2 → III · 整流 / 鮮度保持 / 変調</div><p>各特化はそれまでの発信・接触・情報取得の蓄積で一つに固定。</p>';
    } else
      tree = `<div class="flow">I · 幼生 → 年齢${s.maturity} / 条件を満たす → II · 成熟</div><p>段階は2つ。食物網の生物として採食/光合成・維持・繁殖・死亡を行います。</p>`;
    $("guide-content").innerHTML =
      `<div class="tree-head"><canvas id="tree-portrait" width="180" height="180"></canvas><div><label>系統を選ぶ<select id="tree-select">${D.species.map((a) => `<option value="${a.id}" ${a.id === s.id ? "selected" : ""}>${escape(a.name)} / ${groups[a.group]}</option>`).join("")}</select></label><p class="note">${s.traitText?.join(" / ") || "食物網の独立した生物系統"}</p></div></div>${tree}<div class="flow">${progress}</div>${group === "main" ? `<p class="note">得意環境: ${s.good.map((i) => D.environments[i].name).join(" / ")} · 苦手: ${D.environments[s.bad].name}<br>基準寿命 ${s.life} / 維持E ${s.maintenance} / 出生E条件 ${s.birthEnergy} / 出生待機 ${s.birthCooldown}<br>第三相到達後4ターンは繁殖待機。成長・枝決定は一回、DNAは出生時固定です。</p>` : ""}`;
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
    else $("guide-content").innerHTML = sheets[name]();
    $("guide-content").scrollTop = 0;
  }
  function openGuide(name = "tree") {
    showSheet(name);
    if (!$("guide").open) $("guide").showModal();
  }
  $("open-guide").onclick = () => openGuide();
  $("close-guide").onclick = () => $("guide").close();
  for (const b of $("guide-tabs").querySelectorAll("button"))
    b.onclick = () => showSheet(b.dataset.sheet);
  function frame(now) {
    if (now - paintAt >= 1000 / 30) {
      paintAt = now;
      renderer.draw();
      $("scale-warning").hidden=renderer.view.scale>=8;
      $("status").textContent=replayEntry?"再生・記録なし":ended?"観測終了":running?"観測中":world?"一時停止":"未準備";
      $("render-mode").textContent =
        { point: "密集記号表示", simple: "記号表示", detail: "詳細表示" }[
          renderer.diagnostics.mode
        ] +
        " · " +
        fmt(renderer.view.scale) +
        " px/マス";
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  R.assets.ready.then(() => {
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
      prepare,
      refresh: render,
      finish: finishRun,
      replay: replayResult,
      records: ()=>archive.list(),
      step: tick,
      stop,
      select,
      showSheet,
      openGuide,
      snapshot: () => ({
        world: world && structuredClone(world),
        running,
        replay:!!replayEntry,
        ended,
        lastMs,
        selectedId,
        view: { ...renderer.view },
        render: { ...renderer.diagnostics },
        assets: { loaded: R.assets.loaded, errors: [...R.assets.errors] },
      }),
      fingerprint: () => world && E.fingerprint(world),
    };
})();
