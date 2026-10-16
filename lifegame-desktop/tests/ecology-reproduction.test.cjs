"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { E, S, world, add, ready, parents } = require("./ecology-fixtures.cjs");
test("sexual birth has two parents, B3, paid E/M, phaseI and bounded fixed DNA", () => {
  const w = world(),
    [a, b] = parents(w);
  a.dna.body = 0.4;
  b.dna.body = 0.6;
  const c = ready(w),
    before = S.totals(w),
    children = E.R.reproduce(w, c);
  assert.equal(children.length, 1);
  const child = children[0];
  assert.equal(child.phase, 1);
  assert.equal(child.age, 0);
  assert.equal(child.G, 0);
  assert.deepEqual(child.parents, ["mother", "father"]);
  assert.equal(child.E, 32);
  assert.equal(child.B, 8);
  assert.equal(child.M, 1);
  assert.ok(child.dna.body >= 0.45 && child.dna.body <= 0.55);
  assert.deepEqual(S.totals(w), before);
});
test("same parent cannot fund two children; blocked parent-to-child contact cannot give birth", () => {
  const w = world(),
    [a, b] = parents(w);
  const c = ready(w);
  assert.equal(E.R.reproduce(w, c).length, 1);
  assert.equal(c.parents.size, 2);
  const v = world();
  parents(v);
  for (const tile of v.tiles) tile.walls = [];
  const m = S.maps(v);
  for (const o of v.organisms)
    for (const p of S.nearby(v, o.cell))
      if (!m.main.has(p)) {
        v.tiles[o.cell].walls.push(p);
        v.tiles[p].walls.push(o.cell);
      }
  assert.equal(E.R.reproduce(v, ready(v)).length, 0);
});
test("early-completing lineage births a competent phaseI and has no phaseIV", () => {
  const w = world();
  parents(w, "precocial");
  const children = E.R.reproduce(w, ready(w));
  assert.equal(children.length, 1);
  assert.equal(children[0].phase, 1);
  assert.equal(children[0].E, 36);
  assert.equal(children[0].B, 24);
  const c = ready(w),
    o = w.organisms[0];
  o.G = 300;
  o.ivCounters = [64, 0];
  E.R.growth(w, c);
  assert.equal(o.phase, 3);
});
test("plant B3 uses one paying mature parent and a separate food slot", () => {
  const w = world();
  for (const [i, x, y] of [
    [0, 2, 2],
    [1, 3, 2],
    [2, 4, 3],
  ])
    add(w, "grass", "p" + i, x, y, { phase: 2, E: 12, M: 1 });
  add(w, "abyss", "main", 3, 3);
  const c = ready(w),
    before = S.totals(w),
    children = E.R.reproduce(w, c);
  assert.equal(children.length, 1);
  assert.equal(children[0].slot, "food");
  assert.equal(children[0].phase, 1);
  assert.equal(c.parents.size, 1);
  assert.deepEqual(S.totals(w), before);
});
test("facultative parthenogenesis requires eight turns without a visible mature male", () => {
  const w = world(),
    a = add(w, "jelly", "female", 3, 3, {
      phase: 3,
      E: 80,
      M: 4,
      maleAbsent: 7,
    });
  assert.equal(E.R.reproduce(w, ready(w)).length, 0);
  a.maleAbsent = 8;
  const child = E.R.reproduce(w, ready(w))[0];
  assert.ok(child);
  assert.equal(child.sex, "female");
  assert.equal(child.phase, 1);
  assert.equal(child.E, 32);
  assert.equal(child.B, 8);
  assert.equal(a.M, 0);
});
test("worker caste never reproduces, and care remains paid if its recipient later dies", () => {
  const w = world(),
    [a] = parents(w, "swarm", 4);
  a.role = "worker";
  assert.equal(E.R.reproduce(w, ready(w)).length, 0);
  w.organisms = [];
  const worker = add(w, "swarm", "worker", 3, 3, {
      phase: 3,
      role: "worker",
      colony: "c",
      E: 40,
    }),
    juvenile = add(w, "swarm", "young", 4, 3, { colony: "c", age: 999, E: 0 });
  const c = ready(w);
  c.intents.set(worker.id, { type: "care", target: juvenile.id, cost: 2 });
  E.B.care(w, c);
  assert.equal(worker.E, 38);
  assert.equal(juvenile.E, 1.8);
  E.N.settle(w, c, E.P.fee);
  assert.ok(!w.organisms.includes(juvenile));
  assert.ok(worker.E < 38);
  assert.equal(c.records.get(worker.id).cared, true);
});
test("growth is at most one phase and phaseIII gives a fresh four-turn breeding wait", () => {
  const w = world(),
    a = add(w, "recursive", "a", 3, 3, { G: 300, M: 30 }),
    c = ready(w);
  E.R.growth(w, c);
  assert.equal(a.phase, 2);
  assert.equal(a.birthReady, 0);
  a.counters = [4, 0, 0];
  const next = ready(w);
  E.R.growth(w, next);
  assert.equal(a.phase, 3);
  assert.equal(a.branch3, 0);
  assert.equal(a.birthReady, w.turn + 5);
  assert.equal(E.R.eligible(w, a, next), false);
});
test("plant-only actual intake and recovery can qualify the two foraging IV branches", () => {
  for (const side of [0, 1]) {
    const w = world(),
      a = add(w, "recursive", "a", 3, 3, {
        phase: 3,
        G: 210,
        M: 20,
        branch3: 0,
        ivCounters: side === 0 ? [2, 0] : [0, 2],
      }),
      c = ready(w),
      rec = c.records.get(a.id);
    rec.category = 0;
    if (side === 0) rec.reserve = 2;
    else rec.heal = 0.5;
    E.R.growth(w, c);
    assert.equal(a.phase, 4);
    assert.equal(a.branch4, side);
  }
});

test("food maturity becomes reproductive ability on the next turn, not the maturity day", () => {
  const w = world();
  for (const [id, x, y] of [
    ["a", 2, 2],
    ["b", 2, 3],
    ["c", 3, 2],
  ])
    add(w, "grass", id, x, y, { age: 4, phase: 1, E: 15, B: 15, M: 1 });
  const c = ready(w);
  E.R.growth(w, c);
  assert.equal(w.organisms[0].phase, 2);
  assert.equal(E.R.reproduce(w, c).length, 0);
  w.turn++;
  const next = ready(w);
  assert.ok(E.R.reproduce(w, next).length > 0);
});
