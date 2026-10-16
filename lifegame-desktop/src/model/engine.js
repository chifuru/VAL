(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'), require('./lifecycle.js'), require('./behavior.js'));
  else root.LifeEngine = factory(root.LifeConfig, root.LifeCycle, root.LifeBehavior);
})(globalThis, function (C, L, B) {
  'use strict';
  function summarize(world) {
    const counts = Array(9).fill(0), groups = new Map();
    let maxGeneration = 0;
    for (const c of world.cells) {
      counts[c.species - 1]++; maxGeneration = Math.max(maxGeneration, c.generation);
      const g = C.group(c, world.config.mode); groups.set(g, (groups.get(g) || 0) + 1);
    }
    return {population: world.cells.length, species: counts.filter(n => n > 0).length, groups: groups.size, counts, maxGeneration, leaders: [...groups].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))};
  }
  function outcome(world, stats = summarize(world)) {
    if (stats.population === 0) return {reason: 'extinct', label: 'すべての生物が絶滅しました', winner: null};
    if (stats.groups === 1) return {reason: 'survivor', label: 'ひとつの' + (world.config.mode === 'species' ? '種族' : world.config.mode === 'faction' ? '勢力' : '血統') + 'が生き残りました', winner: stats.leaders[0][0]};
    if (world.turn >= world.config.maxTurns) return {reason: 'coexist', label: '上限ターンに到達 · 複数の集団が共存', winner: null};
    return null;
  }
  function create(input) {
    const config = C.validate(input), world = {version: 1, config, rng: C.hash(config.seed), turn: 0, cells: [], resources: [], nextId: 1, births: 0, deaths: 0, last: {births: 0, deaths: 0}};
    for (let i = 0; i < config.width * config.height; i++) {
      const max = 1 + Math.floor(C.random(world) * 12); world.resources.push({max, amount: max, cooldown: 0});
    }
    const places = C.shuffle(Array.from({length: config.width * config.height}, (_, i) => i), world);
    for (let i = 0; i < config.initial; i++) {
      const species = i < 9 ? i + 1 : 1 + Math.floor(C.random(world) * 9), s = C.SPECIES[species], p = places[i];
      world.cells.push({id: world.nextId++, species, x: p % config.width, y: Math.floor(p / config.width), faction: i % config.factions + 1, lineage: i + 1, age: 0, generation: 1, hp: s.maxHp, energy: 10, sinceBattle: 0, behavior: C.BEHAVIORS[Math.floor(C.random(world) * 9)], dna: {attack: .9 + C.random(world) * .2, defense: .9 + C.random(world) * .2, metabolism: .9 + C.random(world) * .2}});
    }
    world.stats = summarize(world); world.result = outcome(world);
    return world;
  }
  function step(previous) {
    if (previous.result) return previous;
    const world = {...previous, cells: previous.cells.map(c => ({...c, dna: {...c.dna}})), resources: previous.resources.map(r => ({...r}))};
    L.recover(world.resources);
    const before = world.cells.length, density = before / (world.config.width * world.config.height);
    world.cells = world.cells.filter(c => !L.maintain(c, world.resources, world.config.width, density));
    world.cells = B.combat(world.cells, world);
    const deaths = before - world.cells.length;
    const occupied = B.move(world.cells, world), children = [];
    for (const cell of C.shuffle(world.cells, world)) { const child = L.reproduce(cell, world, occupied); if (child) children.push(child); }
    world.cells.push(...children); world.turn++;
    world.births += children.length; world.deaths += deaths; world.last = {births: children.length, deaths};
    world.stats = summarize(world); world.result = outcome(world);
    return world;
  }
  return {create, step, summarize, outcome};
});
