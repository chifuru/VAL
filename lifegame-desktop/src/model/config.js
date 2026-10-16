(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LifeConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SPECIES = [null,
    { name: '紅の繁殖者', color: '#ef7d70', attack: 3, defense: 2, reproEnergy: 2, energyCost: 2, reproCostRate: .5, maxAge: 10, maxHp: 5, healTurns: 4, attacksPerTurn: 4 },
    { name: '翠の守り手', color: '#73c99a', attack: 2, defense: 4, reproEnergy: 9, energyCost: 4, regen: 1.5, reproCostRate: .6, maxAge: 8, maxHp: 9, healTurns: 4, attacksPerTurn: 4 },
    { name: '蒼の走者', color: '#6caeea', attack: 4, defense: 2, reproEnergy: 5, energyCost: 3, speed: 8, reproCostRate: .6, maxAge: 20, maxHp: 15, healTurns: 6, attacksPerTurn: 5 },
    { name: '砂の開拓者', color: '#dfca7c', attack: 2, defense: 2, reproEnergy: 8, energyCost: 2, reproCostRate: .6, maxAge: 7, maxHp: 6, healTurns: 10, attacksPerTurn: 4 },
    { name: '紫の捕食者', color: '#b38ad8', attack: 15, defense: 2, reproEnergy: 15, energyCost: 4, reproCostRate: .5, maxAge: 8, maxHp: 12, healTurns: 10, attacksPerTurn: 8 },
    { name: '琥珀の射手', color: '#efab62', attack: 4, defense: 1, reproEnergy: 9, energyCost: 4, reproCostRate: .6, range: 4, rangeBonus: 2, maxAge: 15, maxHp: 7, healTurns: 7, attacksPerTurn: 4 },
    { name: '碧の群生者', color: '#66d4cc', attack: 7, defense: 3, reproEnergy: 7, energyCost: 3, reproCostRate: .5, maxAge: 10, maxHp: 7, healTurns: 3, attacksPerTurn: 6, targetDistance: 1 },
    { name: '若葉の採集者', color: '#b6d77a', attack: 2, defense: 1.8, reproEnergy: 8, energyCost: 5, harvest: 2, reproCostRate: .6, maxAge: 5, maxHp: 6, healTurns: 10, attacksPerTurn: 4 },
    { name: '灰の耐久者', color: '#c6b8a7', attack: 1.5, defense: 1, reproEnergy: 21, energyCost: 1.8, reproCostRate: .9, maxAge: 5, maxHp: 2, healTurns: 10, attacksPerTurn: 2 }
  ].map(s => s && Object.freeze(s));
  Object.freeze(SPECIES);
  const BEHAVIORS = Object.freeze(['approachEnemy', 'approachAlly', 'avoidEnemy', 'avoidAlly', 'seekEmpty', 'stay', 'cornerCenter', 'keepDistance', 'goOuter']);
  const LABELS = Object.freeze(['敵へ接近', '仲間へ接近', '敵を回避', '仲間と距離', '空地を探索', 'その場で待機', '中央・隅へ', '群れの間隔維持', '外周へ移動']);
  const DEFAULTS = Object.freeze({seed: 'VALIS-2026', width: 28, height: 22, initial: 90, maxTurns: 400, mode: 'species', factions: 3});
  function integer(value, name, min, max) {
    const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(name + 'は' + min + '〜' + max + 'の整数で指定してください。');
    return n;
  }
  function validate(input) {
    const c = {...DEFAULTS, ...input};
    if (!['string', 'number'].includes(typeof c.seed)) throw new Error('初期値を入力してください。');
    c.seed = String(c.seed).trim();
    if (!c.seed || c.seed.length > 64) throw new Error('初期値は1〜64文字で指定してください。');
    c.width = integer(c.width, '幅', 8, 48); c.height = integer(c.height, '高さ', 8, 48);
    c.initial = integer(c.initial, '初期個体数', 2, c.width * c.height);
    c.maxTurns = integer(c.maxTurns, '上限ターン', 1, 3000);
    c.factions = integer(c.factions, '勢力数', 2, 9);
    if (!['species', 'faction', 'brawl'].includes(c.mode)) throw new Error('競争モードが不正です。');
    return c;
  }
  function hash(seed) {
    let h = 2166136261;
    for (const c of String(seed)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function random(state) {
    state.rng = (state.rng + 0x6D2B79F5) >>> 0;
    let t = state.rng; t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function shuffle(list, state) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random(state) * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function group(cell, mode) { return mode === 'faction' ? cell.faction : mode === 'brawl' ? cell.lineage : cell.species; }
  function sameSide(a, b, mode) { return Boolean(a && b && group(a, mode) === group(b, mode)); }
  function stage(cell) { return cell.age < 2 ? '幼体' : cell.age >= SPECIES[cell.species].maxAge * .75 ? '老齢' : '成体'; }
  function growth(cell) { return cell.age < 2 ? .65 : stage(cell) === '老齢' ? .85 : 1; }
  return {SPECIES, BEHAVIORS, LABELS, DEFAULTS, validate, hash, random, shuffle, group, sameSide, stage, growth};
});
