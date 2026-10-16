(function () {
  'use strict';
  const C = LifeConfig, E = LifeEngine, $ = id => document.getElementById(id);
  const board = $('board'), ctx = board.getContext('2d'), chart = $('chart'), chartCtx = chart.getContext('2d');
  let world = null, loaded = null, running = false, timer = null, selected = null, history = [], lastStepMs = 0;
  const fields = ['seed', 'width', 'height', 'initial', 'maxTurns', 'mode', 'factions'];
  const traits = ['繁殖に長けた小さな生命','防御と回復に優れる','素早く広い範囲を移動','低代謝で空地に適応','強い攻撃と大きな消費','離れた相手を狙う','仲間の近くで強くなる','資源を効率よく採集','消費を抑えて生きる'];
  const escape = str => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  function input() { return Object.fromEntries(fields.map(k => [k, $(k).value])); }
  function dirty() { return Boolean(loaded && fields.some(k => String(input()[k]).trim() !== String(loaded[k]))); }
  function stop() { running = false; clearTimeout(timer); timer = null; }
  function setup(config) {
    stop();
    world = E.create(config); loaded = {...world.config}; selected = null;
    fields.forEach(k => { $(k).value = world.config[k]; });
    $('faction-field').hidden = world.config.mode !== 'faction';
    history = [world.stats.counts.slice()]; $('message').textContent = '';
    render();
  }
  function load(event) {
    if (event) event.preventDefault();
    try { setup(input()); } catch (err) { $('message').textContent = err.message; }
  }
  function tick() {
    if (!world || world.result || dirty()) return;
    const start = performance.now(); world = E.step(world); lastStepMs = performance.now() - start;
    history.push(world.stats.counts.slice()); if (history.length > 500) history.shift();
    if (world.result) stop();
    render();
  }
  function schedule() { timer = setTimeout(() => { if (!running) return; tick(); if (running) schedule(); }, Number($('speed').value)); }
  function toggle() {
    if (running) { stop(); render(); return; }
    if (!world || world.result || dirty()) return;
    running = true; render(); schedule();
  }
  function groupLabel(value) { return world.config.mode === 'species' ? C.SPECIES[value].name : world.config.mode === 'faction' ? '勢力 ' + String.fromCharCode(64 + value) : '血統 #' + value; }
  function draw() {
    const width = world ? world.config.width : 28, height = world ? world.config.height : 22;
    board.width = width * 28; board.height = height * 28; board.style.aspectRatio = width + '/' + height;
    const size = 28; ctx.fillStyle = '#0f211f'; ctx.fillRect(0, 0, board.width, board.height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      ctx.strokeStyle = '#9dbb9b09'; ctx.strokeRect(x * size + .5, y * size + .5, size, size);
      const tile = world && world.resources[y * width + x];
      if ($('resources').checked && tile && tile.amount > 0) {
        ctx.fillStyle = 'rgba(137,168,101,' + (.04 + tile.amount / 12 * .2) + ')';
        ctx.beginPath(); ctx.arc(x * size + 14, y * size + 14, 1 + tile.amount / 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (!world) return;
    for (const c of world.cells) {
      const s = C.SPECIES[c.species], stage = C.stage(c), radius = stage === '幼体' ? 5 : stage === '老齢' ? 7 : 8;
      const x = c.x * size + size / 2, y = c.y * size + size / 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate((c.id % 8) * Math.PI / 4);
      ctx.shadowColor = s.color; ctx.shadowBlur = 7;
      ctx.fillStyle = s.color; ctx.globalAlpha = stage === '老齢' ? .62 : .94;
      ctx.beginPath();
      if (c.species % 3 === 0) { ctx.ellipse(0, 0, radius * 1.2, radius * .66, 0, 0, Math.PI * 2); }
      else if (c.species % 3 === 1) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); } ctx.closePath(); }
      else { ctx.arc(0, 0, radius, 0, Math.PI * 2); }
      ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      ctx.fillStyle = '#152b25'; ctx.beginPath(); ctx.arc(radius * .4, -radius * .15, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff77'; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(0, 0, radius * .5, .5, 2.6); ctx.stroke();
      ctx.restore();
      if (world.config.mode !== 'species') {
        ctx.fillStyle = '#f1efdd'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(world.config.mode === 'faction' ? String.fromCharCode(64 + c.faction) : String(c.lineage), x, y + 13);
      }
      if (c.id === selected) { ctx.strokeStyle = '#f8e1b6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
  function drawChart() {
    const w = chart.width, h = chart.height, pad = 22;
    chartCtx.clearRect(0, 0, w, h);
    const max = Math.max(5, ...history.flat());
    chartCtx.font = '11px sans-serif'; chartCtx.fillStyle = '#91a79b'; chartCtx.fillText(String(max), 0, 18); chartCtx.fillText('0', 8, h - 10);
    for (let i = 0; i < 3; i++) { chartCtx.strokeStyle = '#aac7a314'; chartCtx.beginPath(); chartCtx.moveTo(pad, pad + i * (h - 2 * pad) / 2); chartCtx.lineTo(w, pad + i * (h - 2 * pad) / 2); chartCtx.stroke(); }
    for (let s = 0; s < 9; s++) {
      chartCtx.beginPath(); chartCtx.strokeStyle = C.SPECIES[s + 1].color; chartCtx.lineWidth = 1.8;
      history.forEach((sample, i) => { const x = pad + i / Math.max(1, history.length - 1) * (w - pad), y = h - pad - sample[s] / max * (h - 2 * pad); if (i) chartCtx.lineTo(x, y); else chartCtx.moveTo(x, y); });
      chartCtx.stroke();
    }
  }
  function inspect() {
    const cell = world && world.cells.find(c => c.id === selected);
    if (!cell) { $('individual').innerHTML = selected ? 'この個体は生存していません。<br>別の個体を選択できます。' : '盤面の生物を選択すると、<br>その個体の状態を観察できます。'; return; }
    const s = C.SPECIES[cell.species];
    $('individual').innerHTML = '<strong>' + s.name + ' #' + cell.id + '</strong><br>' + C.stage(cell) + ' · 年齢 ' + cell.age + ' / ' + s.maxAge + ' · 第' + cell.generation + '世代<br>HP ' + cell.hp.toFixed(1) + ' / ' + s.maxHp + '　ENERGY ' + cell.energy.toFixed(1) + '<br>' + C.LABELS[C.BEHAVIORS.indexOf(cell.behavior)] + '<br>血統 #' + cell.lineage + ' / 勢力 ' + String.fromCharCode(64 + cell.faction) + '<br>DNA 攻' + cell.dna.attack.toFixed(2) + ' 防' + cell.dna.defense.toFixed(2) + ' 代謝' + cell.dna.metabolism.toFixed(2);
  }
  function render() {
    const changed = dirty(), result = world && world.result;
    $('empty').hidden = Boolean(world);
    $('status').textContent = !world ? '未準備' : changed ? '設定変更 · 読み込みが必要' : result ? '観測終了' : running ? '観測中' : world.turn === 0 ? '観測準備完了' : '一時停止';
    $('status-dot').className = running ? 'running' : '';
    $('turn').textContent = String(world ? world.turn : 0).padStart(3, '0');
    $('turn-limit').textContent = ' / ' + (world ? world.config.maxTurns : $('maxTurns').value);
    $('start').disabled = !world || changed || Boolean(result); $('step').disabled = !world || changed || running || Boolean(result); $('reset').disabled = !world;
    $('start').innerHTML = running ? '一時停止 <span>Ⅱ</span>' : world && world.turn > 0 ? '観測を再開 <span>▶</span>' : '② 観測を開始 <span>▶</span>';
    $('run-note').textContent = changed ? '設定が変わりました。①で読み込み直してください。' : result ? '結果を記録しました。同じ設定で再現できます。' : running ? '小さな世界の変化を観測しています。' : world ? '開始するか、1ターンずつ観測できます。' : '世界の読み込みを待っています。';
    $('seed-display').textContent = 'SEED ' + (world ? world.config.seed : '—');
    $('result').hidden = !result;
    if (result) { $('result-title').textContent = result.label; $('result-detail').textContent = (result.winner !== null ? groupLabel(result.winner) + ' · ' : '') + 'ターン ' + world.turn + ' / 生存 ' + world.stats.population + '個体 / ' + world.stats.groups + '集団'; }
    const stats = world && world.stats;
    $('population').textContent = stats ? stats.population : '—'; $('species-count').textContent = stats ? stats.species : '—'; $('generation').textContent = stats ? stats.maxGeneration : '—';
    $('births-deaths').textContent = world ? world.births + ' / ' + world.deaths : '— / —';
    $('population-change').textContent = world ? '+' + world.last.births + ' 誕生 / −' + world.last.deaths + ' 死亡' : 'POPULATION';
    const counts = stats ? stats.counts : Array(9).fill(0), max = Math.max(1, ...counts);
    $('ranking').innerHTML = C.SPECIES.slice(1).map((s, i) => ({s, i, count: counts[i]})).sort((a, b) => b.count - a.count || a.i - b.i).map(({s, i, count}) => '<div class="species-row' + (world && !count ? ' extinct' : '') + '"><div class="row-top"><i class="species-swatch" style="background:' + s.color + '"></i><span>' + s.name + '</span><strong>' + (world ? count : '—') + '</strong><small>' + (world ? (count ? Math.round(count / stats.population * 100) + '%' : '絶滅') : '—') + '</small></div><div class="bar"><i style="width:' + count / max * 100 + '%;background:' + s.color + '"></i></div></div>').join('');
    $('list-count').textContent = stats ? stats.population : 0;
    $('cells-table').innerHTML = world ? world.cells.slice(0, 100).map(c => '<tr><td>#' + c.id + '</td><td>' + C.SPECIES[c.species].name + '</td><td>' + c.age + ' / ' + C.stage(c) + '</td><td>' + c.generation + '</td><td>' + c.hp.toFixed(1) + '</td><td>' + c.energy.toFixed(1) + '</td><td>' + C.LABELS[C.BEHAVIORS.indexOf(c.behavior)] + '</td></tr>').join('') : '';
    draw(); drawChart(); inspect();
  }
  $('setup').addEventListener('submit', load); $('start').addEventListener('click', toggle);
  $('step').addEventListener('click', tick); $('reset').addEventListener('click', () => setup(loaded));
  fields.forEach(k => $(k).addEventListener('input', () => { stop(); $('faction-field').hidden = $('mode').value !== 'faction'; render(); }));
  $('resources').addEventListener('change', draw);
  $('speed').addEventListener('change', () => { $('speed-label').textContent = $('speed').selectedOptions[0].textContent.split(' /')[0]; if (running) { clearTimeout(timer); schedule(); } });
  board.addEventListener('click', event => {
    if (!world) return;
    const rect = board.getBoundingClientRect();
    // object-fit may letterbox a wide/tall board inside the max-height area.
    const scale = Math.min(rect.width / board.width, rect.height / board.height);
    const left = rect.left + (rect.width - board.width * scale) / 2, top = rect.top + (rect.height - board.height * scale) / 2;
    const x = Math.floor((event.clientX - left) / scale / 28), y = Math.floor((event.clientY - top) / scale / 28);
    const cell = world.cells.find(c => c.x === x && c.y === y); selected = cell ? cell.id : null; draw(); inspect();
  });
  $('species-guide').innerHTML = C.SPECIES.slice(1).map((s, i) => '<p><strong style="color:' + s.color + '">' + s.name + '</strong><br>' + traits[i] + '<br>攻' + s.attack + ' / 防' + s.defense + ' / 寿命' + s.maxAge + '</p>').join('');
  if (new URLSearchParams(location.search).get('smoke') === '1') window.__LIFE_TEST__ = Object.freeze({snapshot: () => JSON.parse(JSON.stringify({world, running, historyLength: history.length, lastStepMs})), prepare: setup, step: tick});
  render();
})();
