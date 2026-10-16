(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else root.LifeCycle = factory(root.LifeConfig);
})(globalThis, function (C) {
  'use strict';
  function recover(resources) {
    for (const tile of resources) if (tile.cooldown > 0 && --tile.cooldown === 0) tile.amount = tile.max;
  }
  function maintain(cell, resources, width, density) {
    const spec = C.SPECIES[cell.species]; cell.age++; cell.sinceBattle++;
    if (cell.age > spec.maxAge) return 'age';
    cell.energy -= spec.energyCost * cell.dna.metabolism;
    cell.energy += spec.regen || 0;
    if (cell.energy <= 0) return 'starvation';
    if (cell.sinceBattle >= spec.healTurns) cell.hp = spec.maxHp;
    const tile = resources[cell.y * width + cell.x];
    if (tile.amount > 0 && tile.cooldown === 0) {
      cell.energy += Math.max(1, Math.floor(tile.amount * (spec.harvest || 1) * (1.5 - density)));
      tile.amount = 0; tile.cooldown = 5;
    }
    return null;
  }
  function reproduce(cell, world, occupied) {
    const spec = C.SPECIES[cell.species], {width, height} = world.config;
    if (cell.age < 2 || cell.energy < Math.max(6, spec.reproEnergy)) return null;
    const free = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cell.x + dx, y = cell.y + dy;
      if ((dx || dy) && x >= 0 && y >= 0 && x < width && y < height && !occupied.has(y * width + x)) free.push({x, y});
    }
    if (!free.length) return null;
    const pos = free[Math.floor(C.random(world) * free.length)];
    const energy = Math.floor(cell.energy * spec.reproCostRate);
    cell.energy -= energy;
    const child = {...cell, ...pos, id: world.nextId++, age: 0, generation: cell.generation + 1, hp: spec.maxHp, energy, sinceBattle: 0, dna: {...cell.dna}};
    occupied.add(pos.y * width + pos.x);
    return child;
  }
  return {recover, maintain, reproduce};
});
