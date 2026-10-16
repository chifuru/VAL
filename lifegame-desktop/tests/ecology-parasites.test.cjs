"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { E, S, world, add, ready } = require("./ecology-fixtures.cjs");
test("H→P→Q transfer retains distinct identities, charges old host once, pauses maturation", () => {
  const w = world(),
    host = add(w, "algae", "plant", 3, 3, { E: 10 }),
    next = add(w, "waterbug", "prey", 4, 3, { E: 10 });
  host.infection = S.infection(w, "tideparasite", host.id, 0);
  host.infection.counter = 4;
  host.infection.q = S.hyper(w, host.infection.id, 0);
  const c = ready(w),
    oldE = host.E,
    p = host.infection,
    q = p.q;
  E.P.transfer(w, c, host, next, "plant");
  E.P.fee(w, c, host);
  E.P.fee(w, c, next);
  E.P.mature(w, c);
  assert.equal(host.infection, null);
  assert.equal(next.infection, p);
  assert.equal(p.hostId, next.id);
  assert.equal(q.hostId, p.id);
  assert.notEqual(q.id, p.id);
  assert.equal(host.E, S.round(oldE - 0.2));
  assert.equal(next.E, 10);
  assert.equal(p.E, 0.15);
  assert.equal(q.E, 0.05);
  assert.equal(p.counter, 0);
});
test("partial host payment gives Q no extra charge and no free maturation", () => {
  const w = world(),
    host = add(w, "grass", "host", 3, 3, { E: 0.03 });
  host.infection = S.infection(w, "leafparasite", host.id);
  host.infection.q = S.hyper(w, host.infection.id);
  const c = ready(w);
  host.E = 0.03;
  const oldHP = host.HP;
  E.P.fee(w, c, host);
  E.P.mature(w, c);
  assert.equal(host.E, 0);
  assert.equal(host.infection.E, 0);
  assert.equal(host.infection.q.E, 0.03);
  assert.equal(host.HP, S.round(oldHP - 0.34));
  assert.equal(host.infection.counter, 0);
  assert.equal(host.infection.q.counter, 0);
});
test("immature plant infection cannot jump directly to a main terminal host", () => {
  const w = world(),
    plant = add(w, "algae", "first", 3, 3),
    adult = add(w, "abyss", "main", 3, 3, { phase: 3 });
  plant.infection = S.infection(w, "tideparasite", plant.id);
  plant.infection.counter = 4;
  const c = ready(w);
  E.P.transfer(w, c, plant, adult, "plant");
  assert.ok(plant.infection);
  assert.equal(adult.infection, null);
});
test("mature prey carcass can pass through an additional juvenile host without skipping stages", () => {
  const w = world(),
    prey = add(w, "waterbug", "prey", 3, 3, { HP: 0 }),
    juvenile = add(w, "abyss", "main", 3, 3);
  prey.infection = S.infection(w, "tideparasite", prey.id);
  prey.infection.stage = "middle";
  prey.infection.counter = 6;
  const c = ready(w);
  E.N.carcass(w, prey, c);
  const corpse = w.carcasses[0];
  assert.ok(corpse.infection);
  E.P.transfer(w, c, corpse, juvenile, "carcass");
  assert.equal(juvenile.infection.stage, "extra");
  assert.equal(juvenile.infection.counter, 0);
  assert.equal(corpse.infection, null);
  juvenile.phase = 3;
  assert.equal(juvenile.infection.stage, "extra");
});
test("information freshness, context and Q variants affect behavior only, not fixed DNA", () => {
  for (const [value, retention, expected] of [
    [2, 1, 0.75],
    [1, 1, 0.375],
    [2, 1.25, 0.9375],
    [3, 1, 1.125],
  ]) {
    const w = world();
    w.turn = 7;
    const a = add(w, "recursive", "a", 3, 3);
    a.dna.sensitivity = 0.5;
    a.weights[2] = 60;
    const dna = structuredClone(a.dna),
      birth = structuredClone(a.birthWeights),
      c = ready(w);
    c.records.get(a.id).information.push({
      id: "e",
      time: 1,
      env: 0,
      values: [{ axis: 2, value }],
      retention,
    });
    E.B.learn(w, c);
    assert.equal(a.weights[2], 60 + expected);
    assert.deepEqual(a.dna, dna);
    assert.deepEqual(a.birthWeights, birth);
  }
});
test("same event grants neither repeated learning nor repeated information E", () => {
  const w = world(),
    a = add(w, "recursive", "a", 3, 3, { E: 40 });
  w.resources.push({
    cell: a.cell,
    kind: "info",
    q: 2,
    E: 0.1,
    M: 0,
    G: 0,
    created: 0,
    expires: 20,
    event: {
      id: "same",
      time: 0,
      env: 3,
      values: [{ axis: 2, value: 2 }],
      retention: 1,
    },
  });
  const c = ready(w);
  E.N.feed(w, c, E.P.transfer);
  assert.equal(w.resources[0].q, 1);
  assert.equal(c.records.get(a.id).information.length, 1);
  assert.equal(a.E, 40.05);
  a.infoReady = 0;
  const again = ready(w);
  E.N.feed(w, again, E.P.transfer);
  assert.equal(a.E, 40.05);
  assert.equal(w.resources[0].q, 1);
});
test("new Q phaseIII uses previous counters, and its information ability waits until next turn", () => {
  const w = world(),
    host = add(w, "recursive", "host", 3, 3, { phase: 3, E: 80 });
  host.infection = S.infection(w, "leafparasite", host.id);
  host.infection.stage = "terminal";
  host.infection.q = S.hyper(w, host.infection.id);
  const q = host.infection.q;
  q.phase = 2;
  q.counter = 7;
  q.E = 0.3;
  q.counts = [8, 1, 0];
  const c = ready(w);
  E.P.fee(w, c, host);
  E.P.mature(w, c);
  assert.equal(q.phase, 3);
  assert.equal(q.special, "rectify");
  c.records.get(host.id).delta = [0, 0, 2, 0, 0, 0, 0, 0, 0];
  c.ca.push({ cell: host.cell, kind: "info", q: 2, growth: null });
  const candidates = E.P.infoCandidates(w, c);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].opQ, undefined);
});

test("two mature parasites competing for one first host use one frozen vote without retry", () => {
  function scenario(reverse) {
    const w = world(),
      a = add(w, "abyss", "a", 3, 3, { phase: 3 }),
      b = add(w, "whale", "b", 3, 4, { phase: 3 }),
      plant = add(w, "algae", "plant", 4, 3);
    for (const o of [a, b]) {
      o.infection = S.infection(w, "tideparasite", o.id, 0);
      Object.assign(o.infection, { stage: "terminal", counter: 8, E: 1 });
    }
    if (reverse) w.organisms.reverse();
    const c = ready(w);
    E.P.reproduce(w, c);
    return {
      parent: plant.infection.id,
      paid: [a.infection.E, b.infection.E],
      pending: w.pending.length,
    };
  }
  const a = scenario(false),
    b = scenario(true);
  assert.deepEqual(a, b);
  assert.equal(a.pending, 0);
  assert.deepEqual(a.paid.slice().sort(), [0.9, 1]);
});
