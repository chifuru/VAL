"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { E, S, world, add, ready } = require("./ecology-fixtures.cjs");
test("v1.4 Unicode SHA-256 vectors agree in Node and portable browser implementation", () => {
  for (const v of require("../design/specification/ab-readiness-v1.4-vectors.json")
    .vectors) {
    assert.equal(
      S.hash({ config: { seed: v.input[1] } }, ...v.input.slice(2)),
      v.h_uint32,
    );
    assert.equal(
      S.portableSHA256(v.canonical_utf8_json),
      S.sha256(v.canonical_utf8_json),
    );
  }
});
test("catalogue keeps twenty four-phase 3→6 trees and thirty biological definitions", () => {
  assert.equal(S.D.species.length, 30);
  for (const s of S.D.main.slice(0, 20)) {
    assert.equal(s.phases.length, 4);
    assert.equal(s.branches.length, 3);
    assert.equal(s.weights.length, 9);
  }
  assert.equal(S.D.byId.precocial.phases.length, 3);
});
test("fixed terrain, exact initial seed, independent slots and biological-group toggles", () => {
  const config = { seed: " 日本語\n", width: 40, height: 28, initial: 80 };
  const a = E.create(config),
    b = E.create(config);
  assert.equal(E.fingerprint(a), E.fingerprint(b));
  assert.notEqual(
    E.fingerprint(a),
    E.fingerprint(E.create({ ...config, seed: config.seed.trim() })),
  );
  assert.deepEqual(E.invariants(a), []);
  const off = E.create({
    width: 8,
    height: 8,
    initial: 0,
    enabled: {
      main: false,
      plant: false,
      fungus: false,
      prey: false,
      P: true,
      Q: true,
    },
  });
  assert.equal(off.organisms.length, 0);
  assert.equal(off.initialMain, 0);
});
test("recovery can return an injured adult to breeding HP without double crediting energy", () => {
  const w = world(),
    o = add(w, "recursive", "a", 3, 3, { HP: 68, E: 40 });
  const c = ready(w);
  E.N.absorb(w, o, { E: 8, M: 0, G: 0 }, "plant", c);
  assert.equal(o.HP, 70);
  assert.equal(o.E, 40);
  assert.equal(o.G, 4);
  assert.equal(c.records.get(o.id).heal, 2);
});
test("full recovery sends remaining absorbed energy to reserve; prey keeps its own HP cap", () => {
  const w = world(),
    o = add(w, "recursive", "a", 3, 3, { HP: 99, E: 40 }),
    p = add(w, "waterbug", "p", 4, 3, { HP: 7, E: 20 });
  const c = ready(w);
  E.N.absorb(w, o, { E: 8, M: 0, G: 0 }, "plant", c);
  assert.equal(o.HP, 100);
  assert.equal(o.E, 42);
  E.N.absorb(w, p, { E: 4, M: 0, G: 0 }, "plant", c);
  assert.equal(p.HP, 8);
  assert.equal(p.E, 20);
  assert.equal(p.G, 0);
});
test("material absorption returns unabsorbed M to source soil", () => {
  const w = world(),
    o = add(w, "recursive", "a", 3, 3),
    c = ready(w),
    before = w.tiles[o.cell].soilM;
  E.N.absorb(w, o, { E: 0, M: 2, G: 0 }, "mineral", c);
  assert.equal(o.M, 1);
  assert.equal(w.tiles[o.cell].soilM, before + 1);
});
test("movement uses every path reservation; neither swaps nor winner retry occurs", () => {
  const w = world(),
    a = add(w, "abyss", "a", 1, 1),
    b = add(w, "myth", "b", 1, 3),
    c = ready(w),
    cross = S.index(w, 2, 2);
  c.intents.set(a.id, {
    type: "move",
    cell: S.index(w, 3, 3),
    path: [cross, S.index(w, 3, 3)],
    direction: 7,
    cost: 2,
  });
  c.intents.set(b.id, {
    type: "move",
    cell: cross,
    path: [cross],
    direction: 2,
    cost: 1,
  });
  E.B.move(w, c);
  const moved = [a, b].filter((o) => c.records.get(o.id).moved);
  assert.equal(moved.length, 1);
  const loser = [a, b].find((o) => !c.records.get(o.id).moved);
  assert.equal(c.costs.get(loser.id).action, 0);
});
test("cliff edges and diagonal corner rocks stop both movement and sight", () => {
  const w = world(),
    a = S.index(w, 2, 2),
    b = S.index(w, 3, 3);
  w.tiles[S.index(w, 3, 2)].blocked = true;
  assert.equal(S.oneStep(w, a, b), false);
  assert.equal(S.sight(w, a, b), false);
  w.tiles[S.index(w, 3, 2)].blocked = false;
  w.tiles[a].walls.push(S.index(w, 3, 2));
  assert.equal(S.oneStep(w, a, b), false);
});
test("same-turn attacks are simultaneous and do not create an automatic counterattack", () => {
  const w = world(),
    a = add(w, "recursive", "a", 2, 2, { HP: 6 }),
    b = add(w, "myth", "b", 3, 2, { HP: 6 }),
    spectator = add(w, "solar", "s", 4, 2);
  for (const o of [a, b])
    o.dna = {
      body: 0.5,
      appendage: 0.5,
      senses: 0.5,
      skin: 0.5,
      aptitude: 0.5,
      sensitivity: 0.5,
    };
  const c = ready(w);
  c.intents.set(a.id, { type: "attack", target: b.id, cost: 3 });
  c.intents.set(b.id, { type: "attack", target: a.id, cost: 3 });
  E.B.combat(w, c);
  assert.equal(a.HP, 0);
  assert.equal(b.HP, 0);
  assert.equal(spectator.HP, 100);
  assert.equal(c.records.get(a.id).dealt, 6);
});
test("three-neighbor mineral birth is a candidate only and requires finite local M", () => {
  const w = world(),
    cell = S.index(w, 3, 3);
  w.turn = 4;
  for (const p of [S.index(w, 2, 2), S.index(w, 3, 2), S.index(w, 4, 3)])
    w.resources.push({
      cell: p,
      kind: "mineral",
      q: 2,
      E: 0,
      M: 4,
      G: 0,
      created: 0,
      expires: null,
      event: null,
    });
  w.tiles[cell].soilM = 3;
  const c = ready(w);
  E.N.expireAndCA(w, c);
  assert.ok(
    c.ca.some((x) => x.cell === cell && x.kind === "mineral" && !x.growth),
  );
  E.N.supply(w, c, E.N.mineralCandidates(w, c));
  assert.ok(!w.resources.some((a) => a.cell === cell && a.kind === "mineral"));
});
test("funded resource amount can reach dense q9 without free refill", () => {
  const w = world(),
    cell = S.index(w, 3, 3),
    a = {
      cell,
      kind: "mineral",
      q: 2,
      E: 0,
      M: 4,
      G: 0,
      created: 0,
      expires: null,
      event: null,
    };
  w.resources.push(a);
  w.tiles[cell].soilM = 20;
  for (let i = 0; i < 7; i++) {
    w.turn = (i + 1) * 4;
    const c = ready(w);
    c.ca.push({ cell, kind: "mineral", q: 1, growth: a });
    E.N.supply(w, c, E.N.mineralCandidates(w, c));
  }
  assert.equal(a.q, 9);
  assert.equal(a.M, 18);
  assert.equal(w.tiles[cell].soilM, 6);
});
test("exactly one partial plant body unit is shared, with no source overdraw", () => {
  const w = world(),
    plant = add(w, "grass", "food", 3, 3, { B: 1, M: 0.1 }),
    a = add(w, "recursive", "a", 2, 3, { E: 20 }),
    b = add(w, "recursive", "b", 4, 3, { E: 20 }),
    c = ready(w);
  for (const o of [a, b])
    c.intents.set(o.id, { type: "harvest", target: plant.id, cost: 0 });
  E.N.feed(w, c, E.P.transfer);
  assert.equal(plant.B, 0);
  assert.equal(a.E + b.E, 40.5);
  assert.equal(c.records.get(a.id).bites + c.records.get(b.id).bites, 1);
});
