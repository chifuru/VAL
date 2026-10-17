"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { E, S, world, add, ready } = require("./ecology-fixtures.cjs");
function fixture() {
  const w = world(),
    a = add(w, "algae", "source", 3, 3),
    b = add(w, "algae", "target", 4, 3),
    c = add(w, "algae", "chain", 5, 3);
  a.infection = S.infection(w, "tideparasite", a.id);
  a.infection.counter = 4;
  a.infection.E = 1;
  ready(w);
  return { w, a, b, c };
}
test("three nearby contacts create a paid daughter colony without moving the parent or chaining", () => {
  const { w, a, b, c } = fixture();
  for (let t = 1; t <= 3; t++) {
    w.turn = t;
    E.P.contacts(w, E.context(w));
    if (t < 3) assert.equal(b.infection, null);
  }
  assert(a.infection && b.infection);
  assert.equal(c.infection, null);
  assert.equal(b.infection.hostId, b.id);
  assert.equal(b.infection.stage, "first");
  assert.equal(b.infection.counter, 0);
  assert.equal(b.infection.E, 0.04);
  assert.equal(a.infection.E, 0.88);
  assert.equal(b.infection.sex, undefined);
  assert.deepEqual(E.invariants(w), []);
  const p = E.fingerprint(w);
  E.P.contacts(w, E.context(w));
  assert.equal(E.fingerprint(w), p);
});
test("expired contact and walls prevent infection, and exposure memory stays bounded", () => {
  const { w, a, b } = fixture();
  w.turn = 1;
  E.P.contacts(w, E.context(w));
  assert.equal(b.contactExposure[0].hits, 1);
  w.turn = 10;
  E.P.contacts(w, E.context(w));
  assert.equal(b.contactExposure[0].hits, 1);
  w.tiles[a.cell].walls = [b.cell];
  w.tiles[b.cell].walls = [a.cell];
  w.turn++;
  E.P.contacts(w, E.context(w));
  assert.equal(b.infection, null);
  assert.equal(b.contactExposure.length, 0);
  assert(w.organisms.every((o) => (o.contactExposure || []).length <= 4));
});
test("mature terminal colony disperses at most three paid daughters and paid hyperparasites", () => {
  const w = world(),
    a = add(w, "kelp", "source", 3, 3, { phase: 3 });
  for (const [i, [x, y]] of [
    [2, 3],
    [3, 2],
    [4, 3],
    [3, 4],
  ].entries())
    add(w, "grass", "g" + i, x, y);
  a.infection = S.infection(w, "leafparasite", a.id);
  const p = a.infection;
  p.stage = "terminal";
  p.counter = 8;
  p.E = 1;
  p.q = S.hyper(w, p.id);
  p.q.phase = 3;
  p.q.E = 0.2;
  ready(w);
  for (let t = 1; t <= 3; t++) {
    w.turn = t;
    E.P.contacts(w, E.context(w));
  }
  const children = w.organisms.filter((o) => o !== a && o.infection);
  assert.equal(children.length, 3);
  assert.equal(p.E, 0.64);
  assert.equal(p.q.E, 0.02);
  assert(children.every((o) => o.infection.q.hostId === o.infection.id));
  assert.deepEqual(E.invariants(w), []);
});
test("donors with insufficient energy, immature stages or incompatible hosts cannot infect", () => {
  for (const option of ["unfunded", "immature", "incompatible"]) {
    const { w, a, b } = fixture();
    if (option === "unfunded") a.infection.E = 0.1;
    if (option === "immature") a.infection.counter = 3;
    if (option === "incompatible") b.species = "grass";
    for (let t = 1; t < 6; t++) {
      w.turn = t;
      E.P.contacts(w, E.context(w));
    }
    assert.equal(b.infection, null, option);
  }
});
test("simultaneous contact competition is independent of organism array order", () => {
  const { w, a, b } = fixture();
  const second = add(w, "algae", "second", 4, 2);
  second.infection = S.infection(w, "tideparasite", second.id);
  second.infection.counter = 4;
  second.infection.E = 1;
  ready(w);
  const u = structuredClone(w);
  u.organisms.reverse();
  for (let t = 1; t <= 3; t++)
    for (const x of [w, u]) {
      x.turn = t;
      E.P.contacts(x, E.context(x));
    }
  assert.equal(E.fingerprint(w), E.fingerprint(u));
  assert(w.organisms.find((o) => o.id === b.id).infection);
});

test("Q stage II can disperse a paid immature daughter, but stage I cannot", () => {
  for (const phase of [1, 2]) {
    const { w, a, b } = fixture();
    a.infection.q = S.hyper(w, a.infection.id);
    a.infection.q.phase = phase;
    a.infection.q.E = 0.2;
    ready(w);
    for (let t = 1; t <= 3; t++) {
      w.turn = t;
      E.P.contacts(w, E.context(w));
    }
    assert(b.infection);
    if (phase === 1) assert.equal(b.infection.q, null);
    else {
      assert.equal(b.infection.q.phase, 1);
      assert.equal(b.infection.q.E, 0.02);
      assert.equal(a.infection.q.E, 0.14);
    }
    assert.deepEqual(E.invariants(w), []);
  }
});
