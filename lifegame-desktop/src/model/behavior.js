(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else root.LifeBehavior = factory(root.LifeConfig);
})(globalThis, function (C) {
  'use strict';
  const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  function allies(cell, cells, mode) { return cells.filter(c => c.id !== cell.id && C.sameSide(cell, c, mode) && distance(cell, c) <= 1).length; }
  function combat(cells, world) {
    const damage = new Map(), hits = new Set(), {mode} = world.config;
    // All attacks use this fixed living population. Applying damage afterwards permits mutual kills.
    for (const cell of C.shuffle(cells, world)) {
      const s = C.SPECIES[cell.species];
      const enemies = cells.filter(e => !C.sameSide(cell, e, mode) && distance(cell, e) <= (s.range || 1));
      for (const enemy of C.shuffle(enemies, world).slice(0, s.attacksPerTurn)) {
        const defense = C.SPECIES[enemy.species];
        const pack = cell.species === 7 ? allies(cell, cells, mode) : 0;
        const guard = enemy.species === 7 ? allies(enemy, cells, mode) : 0;
        const ranged = distance(cell, enemy) > 1 ? s.rangeBonus || 0 : 0;
        const power = s.attack * cell.dna.attack * C.growth(cell) + pack + ranged;
        const resistance = defense.defense * enemy.dna.defense + guard;
        const hit = Math.max(0, power - resistance + .1 * (cell.energy - enemy.energy));
        if (hit > 0) { damage.set(enemy.id, (damage.get(enemy.id) || 0) + hit); hits.add(cell.id); hits.add(enemy.id); }
      }
    }
    for (const cell of cells) { cell.hp -= damage.get(cell.id) || 0; if (hits.has(cell.id)) cell.sinceBattle = 0; }
    return cells.filter(c => c.hp > 0);
  }
  function score(policy, cell, pos, cells, occupied, config) {
    const friends = cells.filter(c => c.id !== cell.id && C.sameSide(cell, c, config.mode));
    const enemies = cells.filter(c => !C.sameSide(cell, c, config.mode));
    const nearest = list => list.length ? Math.min(...list.map(c => distance(pos, c))) : config.width + config.height;
    const edge = Math.min(pos.x, pos.y, config.width - 1 - pos.x, config.height - 1 - pos.y);
    switch (policy) {
      case 'approachEnemy': return -nearest(enemies);
      case 'approachAlly': return -nearest(friends);
      case 'avoidEnemy': return nearest(enemies);
      case 'avoidAlly': return nearest(friends);
      case 'stay': return pos.x === cell.x && pos.y === cell.y ? 10000 : -10000;
      case 'goOuter': return -edge;
      case 'keepDistance': return -Math.abs(nearest(friends) - (C.SPECIES[cell.species].targetDistance || 2));
      case 'cornerCenter': return -Math.min(distance(pos, {x: (config.width - 1) / 2, y: (config.height - 1) / 2}), Math.max(pos.x, pos.y), Math.max(config.width - 1 - pos.x, pos.y), Math.max(pos.x, config.height - 1 - pos.y), Math.max(config.width - 1 - pos.x, config.height - 1 - pos.y));
      case 'seekEmpty': {
        let free = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = pos.x + dx, y = pos.y + dy;
          if ((dx || dy) && x >= 0 && y >= 0 && x < config.width && y < config.height && !occupied.has(y * config.width + x)) free++;
        }
        return free;
      }
      default: throw new Error('Unknown movement policy: ' + policy);
    }
  }
  function move(cells, world) {
    const {width, height} = world.config;
    const occupied = new Set(cells.map(c => c.y * width + c.x));
    for (const cell of C.shuffle(cells, world)) {
      const radius = C.SPECIES[cell.species].speed || 1;
      const choices = [{x: cell.x, y: cell.y}];
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        const x = cell.x + dx, y = cell.y + dy;
        if ((dx || dy) && x >= 0 && y >= 0 && x < width && y < height && !occupied.has(y * width + x)) choices.push({x, y});
      }
      // Shuffle before sorting so equal scores do not always drift to the top-left.
      let best, value = -Infinity;
      for (const p of C.shuffle(choices, world)) {
        const v = score(cell.behavior, cell, p, cells, occupied, world.config);
        if (v > value) { value = v; best = p; }
      }
      occupied.delete(cell.y * width + cell.x);
      cell.x = best.x; cell.y = best.y; occupied.add(cell.y * width + cell.x);
    }
    return occupied;
  }
  return {distance, score, combat, move};
});
