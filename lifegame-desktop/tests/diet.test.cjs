"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { E, S, world, add, ready } = require("./ecology-fixtures.cjs");
test("six feeding niches have stronger primary-food efficiency without forbidding fallback food", () => {
  const w = world();
  for (const [id, tag, other] of [
    ["kelp", "animal", "plant"],
    ["abyss", "animal", "plant"],
    ["jelly", "fungal", "animal"],
    ["gravity", "mineral", "animal"],
  ]) {
    const o = add(w, id, id, 2, 2);
    assert(E.N.efficiency(o, tag) > E.N.efficiency(o, other), id);
    assert(E.N.efficiency(o, other) > 0, id + " fallback");
  }
  assert.equal(Object.keys(S.D.diets).length, 6);
  for (const s of S.D.main) assert(S.D.diets[s.diet]);
  assert.equal(S.D.byId.memory.diet, "scavenger");
});
test("specialized absorption conserves finite energy and mineral budgets", () => {
  for (const id of ["kelp", "abyss", "memory", "gravity", "recursive"]) {
    const w = world(),
      o = add(w, id, "a", 2, 2, { E: 0, M: 0, HP: 60 }),
      c = ready(w);
    const before = S.totals(w);
    E.N.absorb(w, o, { E: 8, M: 2, G: 0 }, "animal", c);
    const after = S.totals(w);
    assert(Math.abs(after.E + w.ledger.sinks - before.E - 8) < 1e-6, id + " E");
    assert(Math.abs(after.M - before.M - 2) < 1e-6, id + " M");
    assert(o.E >= 0 && o.HP <= 100);
  }
});
test("food niches remain deterministic and conserve slots and ledgers through natural competition", () => {
  const config = {
    seed: "diet-heldout",
    width: 40,
    height: 28,
    initial: 80,
    lineages: "few",
    landscape: "templates",
    ageModel: "life/1",
  };
  let a = E.create(config),
    b = E.create(config);
  for (let i = 0; i < 40; i++) {
    a = E.step(a);
    b = E.step(b);
    assert.deepEqual(E.invariants(a), []);
  }
  assert.equal(E.fingerprint(a), E.fingerprint(b));
});

test('comparison source edits tolerate formatting but reject changed or ambiguous rules', () => {
  const replace = require('../design/source-replace.cjs');
  assert.equal(replace('return (terrain *\n environmental(w));','  terrain *\n      environmental','0.8 * terrain * environmental'), 'return (0.8 * terrain * environmental(w));');
  assert.throws(() => replace('return terrain + environmental(w);','terrain * environmental','x'), /missing or ambiguous/);
  assert.throws(() => replace('terrain*environmental;terrain *environmental;', 'terrain * environmental','x'), /missing or ambiguous/);
  assert.equal(replace('const s = "one two";', 'const s="one two";', 'const s="ok";'), 'const s="ok";');
});
