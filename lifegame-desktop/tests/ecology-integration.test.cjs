"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const E = require("../src/ecology/engine.js");
test("deterministic progress, observer independence, immutable input and fixed environment", () => {
  let a = E.create({ seed: "replay-eco", width: 40, height: 28, initial: 80 }),
    b = structuredClone(a);
  const terrain = JSON.stringify(a.tiles.map(({ soilM, ...t }) => t)),
    initial = E.fingerprint(a);
  const first = E.step(a);
  assert.equal(E.fingerprint(a), initial);
  assert.equal(first.turn, 1);
  for (let i = 0; i < 35; i++) {
    a = E.step(a);
    b = E.step(b, {
      observeId: b.organisms.find((o) => o.slot === "main")?.id,
    });
    assert.equal(E.fingerprint(a), E.fingerprint(b));
    assert.deepEqual(E.invariants(a), []);
  }
  assert.equal(JSON.stringify(a.tiles.map(({ soilM, ...t }) => t)), terrain);
});
test("three initial seeds retain finite energy/material and occupancy through 120 turns", () => {
  for (const seed of ["grove", "tide", "symbiosis"]) {
    let w = E.create({ seed, width: 40, height: 28, initial: 80 });
    for (let i = 0; i < 120; i++) {
      w = E.step(w);
      assert.deepEqual(E.invariants(w), [], seed + " turn " + w.turn);
    }
    assert.equal(w.turn, 120);
  }
});
test("main-off experiment remains active without a false main extinction stop", () => {
  let w = E.create({
    width: 40,
    height: 28,
    initial: 0,
    enabled: { main: false },
  });
  assert.equal(w.stats.main, 0);
  w = E.step(w);
  assert.notEqual(w.stopReason, "main-extinct");
  assert.ok(w.stats.food > 0);
  assert.deepEqual(E.invariants(w), []);
});

test("checkpoints keep initial and current block, with real counters and no false main extinction", () => {
  let w = E.create({
    seed: "checkpoint",
    width: 8,
    height: 8,
    initial: 0,
    enabled: {
      main: false,
      plant: true,
      fungus: false,
      prey: false,
      P: false,
      Q: false,
    },
  });
  w.turn = 999;
  w.blockEnd = 1000;
  w = E.step(w);
  assert.equal(w.stopReason, "checkpoint");
  assert.equal(w.checkpoints[0].turn, 0);
  assert.equal(w.checkpoints.at(-1).turn, 1000);
  assert.ok(w.checkpoints.at(-1).budgets.totals.M >= 0);
  w = E.step(w);
  assert.equal(w.blockEnd, 2000);
  assert.equal(w.stopReason, null);
  assert.equal(w.checkpoints[0].turn, 0);
  assert.ok(w.checkpoints.length <= 6);
});
