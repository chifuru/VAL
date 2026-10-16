'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/model/config.js'), L = require('../src/model/lifecycle.js'), B = require('../src/model/behavior.js'), E = require('../src/model/engine.js');
function cell(id, species, x, y, extra = {}) { return {id, species, x, y, age: 2, generation: 1, hp: C.SPECIES[species].maxHp, energy: 10, sinceBattle: 0, faction: 1, lineage: id, behavior: 'stay', dna: {attack: 1, defense: 1, metabolism: 1}, ...extra}; }
function fixture(cells, config = {}) {
  const w = E.create({seed: 'test', width: 8, height: 8, initial: 2, maxTurns: 200, ...config});
  w.cells = cells; w.resources = w.resources.map(() => ({amount: 0, max: 4, cooldown: 0})); w.result = null; w.nextId = Math.max(...cells.map(c => c.id), 0) + 1;
  w.stats = E.summarize(w); return w;
}
function invariants(w) {
  const ids = new Set(), positions = new Set();
  for (const c of w.cells) {
    assert.ok(!ids.has(c.id), 'unique ID'); ids.add(c.id);
    const pos = c.y * w.config.width + c.x; assert.ok(!positions.has(pos), 'unique position'); positions.add(pos);
    assert.ok(c.x >= 0 && c.x < w.config.width && c.y >= 0 && c.y < w.config.height);
    assert.ok(Number.isFinite(c.energy) && c.energy > 0); assert.ok(Number.isFinite(c.hp) && c.hp > 0 && c.hp <= C.SPECIES[c.species].maxHp);
    assert.ok(c.age <= C.SPECIES[c.species].maxAge); assert.ok(c.generation >= 1);
  }
  assert.equal(w.stats.population, w.cells.length);
  assert.equal(w.stats.counts.reduce((a, b) => a + b, 0), w.cells.length);
  assert.equal(w.config.initial + w.births - w.deaths, w.cells.length);
  for (const r of w.resources) assert.ok(r.amount >= 0 && r.amount <= r.max && r.cooldown >= 0 && r.cooldown <= 5);
}
test('D1: exactly requested initial population, all nine species, stable unique positions', () => {
  const w = E.create({initial: 64, width: 8, height: 8}); invariants(w); assert.equal(w.cells.length, 64); assert.equal(w.stats.species, 9);
});
test('D1: same seed and config replay exactly for 300 turns; another seed differs', () => {
  let a = E.create({seed: 'replay', maxTurns: 300}), b = E.create({seed: 'replay', maxTurns: 300});
  assert.notDeepEqual(a, E.create({seed: 'other', maxTurns: 300}));
  for (let i = 0; i < 300; i++) { a = E.step(a); b = E.step(b); assert.deepEqual(a, b); }
});
test('D1: previous snapshot is unchanged after stepping', () => {
  const w = E.create({seed: 'immutability'}), before = structuredClone(w); const next = E.step(w);
  assert.deepEqual(w, before); assert.notEqual(w, next);
});
test('D1: invalid, fractional, empty and out-of-range settings fail clearly', () => {
  for (const c of [{width: 7}, {height: 49}, {width: 8.2}, {initial: 0}, {initial: 100, width: 8, height: 8}, {maxTurns: 3001}, {maxTurns: ''}, {factions: 1}, {seed: ''}, {seed: ' '.repeat(6)}, {seed: {}}, {mode: 'invalid'}, {initial: null}, {height: Infinity}]) assert.throws(() => E.create(c));
  assert.equal(E.create({seed: 0, width: '8', height: '8', initial: '2'}).config.seed, '0');
});
test('D2: resources return exactly after five recovery ticks', () => {
  const resources = [{amount: 0, max: 12, cooldown: 5}]; for (let i = 0; i < 4; i++) { L.recover(resources); assert.equal(resources[0].amount, 0); }
  L.recover(resources); assert.deepEqual(resources[0], {amount: 12, max: 12, cooldown: 0});
});
test('D2: maturity gate and reproduction conserve energy and inherit lineage/DNA', () => {
  const w = fixture([]), parent = cell(1, 1, 3, 3, {energy: 20, age: 1, lineage: 77, faction: 3});
  assert.equal(L.reproduce(parent, w, new Set([27])), null);
  parent.age = 2; const occupied = new Set([27]), child = L.reproduce(parent, w, occupied);
  assert.equal(parent.energy + child.energy, 20); assert.equal(child.age, 0); assert.equal(child.generation, 2); assert.equal(child.lineage, 77); assert.equal(child.faction, 3); assert.deepEqual(child.dna, parent.dna); assert.notEqual(child.dna, parent.dna);
});
test('D2: juvenile, adult and elderly stages affect growth independently of generation', () => {
  const c = cell(1, 3, 1, 1, {age: 0, generation: 20}); assert.equal(C.stage(c), '幼体'); assert.equal(C.growth(c), .65);
  c.age = 2; assert.equal(C.stage(c), '成体'); c.age = 15; assert.equal(C.stage(c), '老齢');
});
test('D2: faction and lineage determine allies consistently in every mode', () => {
  const a = cell(1, 1, 1, 1, {faction: 1, lineage: 42}), b = cell(2, 2, 2, 1, {faction: 1, lineage: 42});
  assert.equal(C.sameSide(a, b, 'species'), false); assert.equal(C.sameSide(a, b, 'faction'), true); assert.equal(C.sameSide(a, b, 'brawl'), true);
  b.lineage = 43; assert.equal(C.sameSide(a, b, 'brawl'), false);
});
test('D2: lethal attacks resolve simultaneously; dead actors do not reappear', () => {
  const a = cell(1, 5, 1, 1, {hp: 1}), b = cell(2, 5, 2, 1, {hp: 1});
  const w = fixture([a, b], {mode: 'brawl'}); assert.equal(B.combat(w.cells, w).length, 0);
  const state = E.step(fixture([a, b], {mode: 'brawl'})); assert.equal(state.cells.length, 0); assert.equal(state.result.reason, 'extinct');
});
test('D2: all nine behavior policies score finite moves and preserve occupancy', () => {
  for (const behavior of C.BEHAVIORS) {
    const c = cell(1, 3, 2, 2, {behavior}), friend = cell(2, 3, 4, 4), enemy = cell(3, 5, 6, 6);
    const w = fixture([c, friend, enemy]);
    assert.ok(Number.isFinite(B.score(behavior, c, {x: 3, y: 2}, w.cells, new Set([18, 36, 54]), w.config)));
    const occupied = B.move(w.cells, w); assert.equal(occupied.size, 3);
    if (behavior === 'stay') assert.deepEqual({x: c.x, y: c.y}, {x: 2, y: 2});
  }
});
test('D2: same-lineage brawl avoids friendly fire, ranged enemies receive damage', () => {
  const a = cell(1, 6, 1, 1, {lineage: 42, energy: 30}), b = cell(2, 9, 4, 1, {lineage: 42});
  const w = fixture([a, b], {mode: 'brawl'}); B.combat(w.cells, w); assert.equal(b.hp, 2);
  b.lineage = 43; B.combat(w.cells, w); assert.ok(b.hp < 2);
});
test('D2: extinction, sole survival and coexistence do not fabricate winners', () => {
  const w = fixture([]); assert.equal(E.outcome(w).reason, 'extinct');
  w.cells = [cell(1, 1, 1, 1)]; assert.equal(E.outcome(w).reason, 'survivor');
  w.cells.push(cell(2, 2, 3, 3)); w.turn = w.config.maxTurns; assert.equal(E.outcome(w).reason, 'coexist'); assert.equal(E.outcome(w).winner, null);
});
test('D2: old age and starvation remove a cell without corrupting the previous snapshot', () => {
  for (const change of [{age: 20}, {energy: 0}]) {
    const w = fixture([cell(1, 3, 1, 1, change), cell(2, 2, 7, 7)]), before = structuredClone(w);
    const next = E.step(w); assert.ok(!next.cells.some(c => c.id === 1)); assert.deepEqual(w, before);
  }
});
test('D2: multiple seeds and modes maintain biological and population invariants', () => {
  for (const mode of ['species', 'faction', 'brawl']) for (const seed of ['algae', 'stone', 'night']) {
    let w = E.create({mode, seed, width: 16, height: 12, initial: 90, maxTurns: 200});
    for (let i = 0; i < 200; i++) { w = E.step(w); invariants(w); }
  }
});
test('D2: completed worlds do not advance or change their outcome', () => {
  let w = E.create({maxTurns: 1}); w = E.step(w); assert.ok(w.result); assert.equal(E.step(w), w);
});
