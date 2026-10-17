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
    plant = add(w, "grass", "food", 3, 3, { B: 3, M: 0.1 }),
    a = add(w, "recursive", "a", 2, 3, { E: 20 }),
    b = add(w, "recursive", "b", 4, 3, { E: 20 }),
    c = ready(w);
  for (const o of [a, b])
    c.intents.set(o.id, { type: "harvest", target: plant.id, cost: 0 });
  E.N.feed(w, c, E.P.transfer);
  assert.equal(plant.B, 2);
  assert.equal(a.E + b.E, 40.5);
  assert.equal(c.records.get(a.id).bites + c.records.get(b.id).bites, 1);
});

test("phaseIII continues mineral intake past phaseIII qualification toward phaseIV, without overfeeding", () => {
  const w = world(),
    o = add(w, "abyss", "adult", 3, 3, {
      phase: 3,
      G: 210,
      E: 70,
      M: 0,
      branch3: 0,
    });
  const p = S.phenotype(w, o);
  o.M = p.M4 - 0.5;
  w.resources.push({
    cell: o.cell,
    kind: "mineral",
    q: 2,
    E: 0,
    M: 4,
    G: 0,
    created: 0,
    expires: null,
    event: null,
  });
  const c = ready(w);
  E.N.feed(w, c, E.P.transfer);
  assert.ok(o.M >= p.M4, "must acquire the M required for phaseIV");
  assert.equal(
    c.records.get(o.id).bites,
    1,
    "stop once next-phase and breeding M qualification is satisfied",
  );
  o.ivCounters = [3, 0];
  E.R.growth(w, c);
  assert.equal(o.phase, 4);
});

test("plant roots share two bites, transfer finite soil M, and stop at capacity or exhaustion", () => {
  for (const [M, soil, expectedM, expectedSoil, bites] of [
    [0, 5, 0.1, 4.9, 2],
    [1.99, 5, 2, 4.99, 1],
    [0, 0, 0, 0, 0],
  ]) {
    const w = world(),
      o = add(w, "grass", "root", 3, 3, { M });
    w.tiles[o.cell].soilM = soil;
    const c = ready(w),
      energy = o.E;
    E.N.feed(w, c, E.P.transfer);
    assert.equal(o.M, expectedM);
    assert.equal(w.tiles[o.cell].soilM, expectedSoil);
    assert.equal(o.E, energy);
    assert.equal(o.G, 0);
    assert.equal(c.records.get(o.id).bites, bites);
    assert.deepEqual(E.invariants(w), []);
  }
});
test("healthy full prey neither strips leaves nor consumes a mineral source", () => {
  const w = world(),
    plant = add(w, "grass", "plant", 3, 3),
    prey = add(w, "grassbug", "prey", 2, 3, { E: 20, HP: 6 });
  w.resources.push({
    cell: prey.cell,
    kind: "mineral",
    q: 2,
    E: 0,
    M: 4,
    G: 0,
    created: 0,
    expires: null,
    event: null,
  });
  const c = ready(w);
  c.intents.set(prey.id, { type: "harvest", target: plant.id, cost: 0 });
  E.N.feed(w, c, E.P.transfer);
  assert.equal(plant.B, 12);
  assert.equal(prey.M, 0);
  assert.equal(c.records.get(prey.id).bites, 0);
  assert.equal(w.resources[0].q, 2);
});
test("slightly hungry prey takes only the needed leaf fraction and leaves the living base", () => {
  const w = world(),
    plant = add(w, "grass", "plant", 3, 3, { B: 12 }),
    prey = add(w, "grassbug", "prey", 2, 3, { E: 19.8 });
  const c = ready(w);
  c.intents.set(prey.id, { type: "harvest", target: plant.id, cost: 0 });
  E.N.feed(w, c, E.P.transfer);
  assert.equal(prey.E, 20);
  assert.equal(prey.G, 0);
  assert.ok(Math.abs(plant.B - 11.692308) < 0.000001);
  assert.equal(c.records.get(prey.id).bites, 1);
  assert.deepEqual(E.invariants(w), []);
});
test("bare living bases are not edible targets, while fungi have no protected plant base", () => {
  const w = world(),
    root = add(w, "grass", "root", 3, 3, { B: 2 }),
    main = add(w, "recursive", "main", 2, 3),
    fungus = add(w, "fungus", "fungus", 2, 2, { B: 1 });
  const c = ready(w),
    m = S.maps(w),
    list = E.B.candidates(w, main, c, m);
  assert.ok(!list.some((a) => a.target === root.id && a.type === "harvest"));
  assert.ok(list.some((a) => a.target === fungus.id && a.type === "harvest"));
  c.intents.set(main.id, { type: "harvest", target: root.id, cost: 0 });
  E.N.feed(w, c, E.P.transfer);
  assert.equal(root.B, 2);
  assert.equal(c.records.get(main.id).bites, 0);
});
test("leaf loss lowers paid light input; basal tissue cannot be spent on drops", () => {
  for (const [B, gain] of [
    [12, 2.8],
    [2, 1.4], // Living basal tissue retains half of full light capture (v2.1).
  ]) {
    const w = world(),
      plant = add(w, "grass", "plant", 3, 3, { B, E: 0, M: 2, phase: 2 });
    const c = ready(w);
    assert.equal(plant.E, gain);
    assert.equal(w.ledger.solar, gain);
    if (B === 2) {
      w.turn = S.hash(w, "drop/phase", 0, plant.id) % 8;
      plant.E = 0;
      const candidates = E.N.investAndDrops(w, c);
      assert.ok(!candidates.some((a) => a.source === plant));
      assert.equal(plant.B, 2);
    }
  }
});
test("a base in darkness can die and never triggers a replacement without parents", () => {
  const w = world(),
    plant = add(w, "grass", "plant", 3, 3, { B: 2, E: 0, HP: 0.1, M: 0 });
  w.tiles[plant.cell].light = 0;
  w.tiles[plant.cell].soilM = 0;
  ready(w);
  const next = E.step(w);
  assert.equal(next.organisms.length, 0);
  assert.deepEqual(E.invariants(next), []);
});
test("natural initialization keeps four related founders near a legal center and preserves exact counts", () => {
  const config = {
    seed: "cohort-contract",
    width: 40,
    height: 28,
    initial: 80,
  };
  const a = E.create(config),
    b = E.create(config);
  assert.equal(a.version, "ecology-ab/1.5");
  assert.equal(E.fingerprint(a), E.fingerprint(b));
  for (const s of S.D.main.slice(0, 20)) {
    const members = a.organisms.filter((o) => o.species === s.id);
    assert.equal(members.length, 4);
    assert.equal(members.filter((o) => o.sex === "male").length, 2);
    assert.equal(members.filter((o) => o.sex === "female").length, 2);
    assert.ok(
      members.slice(1).every((o) => S.oneStep(a, members[0].cell, o.cell)),
    );
  }
  assert.deepEqual(
    a.tiles,
    E.create({ ...config, placement: "scatter" }).tiles,
  );
  assert.deepEqual(E.invariants(a), []);
});

test("mate proximity emerges from affinity weights, remains during cooldown, and never grants unqualified birth", () => {
  function intent(affinity, energy = 80, partnerEnergy = 0) {
    const w = world(),
      o = add(w, "recursive", "self", 3, 3, {
        phase: 3,
        E: energy,
        M: 0,
        sex: "female",
        facing: 3,
        birthReady: 100,
      }),
      partner = add(w, "recursive", "mate", 4, 3, {
        phase: 3,
        E: partnerEnergy,
        M: 0,
        sex: "male",
      });
    o.weights = [0, 0, 0, affinity, 0, 0, 100, 50, 0];
    const c = ready(w);
    E.B.choose(w, c);
    assert.equal(E.R.eligible(w, o, c), false);
    return {
      cell: c.intents.get(o.id).cell,
      distance: S.distance(w, c.intents.get(o.id).cell, partner.cell),
    };
  }
  assert.ok(intent(0).distance > 1);
  assert.ok(intent(100).distance <= 1);
  assert.deepEqual(intent(100, 80, 0), intent(100, 80, 100));
  assert.ok(intent(100, 34).distance > 1);
});
