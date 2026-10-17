"use strict";
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { E, S, world, add, ready } = require("./ecology-fixtures.cjs");
test("a hungry mineral specialist values organic food above an already-satisfied mineral need", () => {
  const w = world(),
    o = add(w, "crystal", "o", 3, 3, { E: 20, M: 30 }),
    plant = add(w, "grass", "g", 4, 3, { B: 12 });
  w.resources.push({
    kind: "mineral",
    cell: S.index(w, 2, 3),
    q: 12,
    E: 0,
    M: 12,
  });
  const c = ready(w),
    m = S.maps(w);
  const evaluate = (cell) =>
    E.B.evaluate(
      w,
      o,
      { type: "move", cell, cost: 0, path: [cell], direction: 4 },
      c,
      {
        m,
        enemies: [],
        nearest: null,
        traits: c.traits,
        visibleCells: new Set([o.cell, plant.cell, S.index(w, 2, 3)]),
        qualityCache: new Map(),
      },
    );
  assert(
    evaluate(plant.cell).features[2] > evaluate(S.index(w, 2, 3)).features[2],
  );
  o.E = 80;
  o.M = 0;
  assert(
    evaluate(S.index(w, 2, 3)).features[2] > 0,
    "an actual material deficit still attracts minerals",
  );
});
test("ordinary single-lineage feeding sustains survival and paid reproduction without enemies or replenishment", () => {
  let w = E.create({
    seed: "ordinary-survival/myth",
    landscape: "templates",
    ageModel: "life/1",
    mapId: "river",
    width: 40,
    height: 28,
    initial: 40,
    lineages: "manual",
    selected: ["myth"],
    guarantee: false,
    enabled: {
      main: true,
      plant: true,
      fungus: true,
      prey: true,
      P: false,
      Q: false,
    },
  });
  let starvation = 0;
  for (let i = 0; i < 300; i++) {
    w = E.step(w);
    assert.deepEqual(E.invariants(w), []);
    starvation += w.last.deathCauses.filter(
      (d) => d.species === "myth" && d.reason === "starvation",
    ).length;
  }
  assert(
    w.stats.main >= 10,
    "a substantial cohort remains beyond the founder lifetime",
  );
  assert(w.tallies.births.myth > 0, "real paid generations replace founders");
  assert(starvation < 20, "ordinary starvation is not the principal loss");
});

test("hunger releases an empty territory for exploration without rewriting inherited strategy", () => {
  function intent(Energy) {
    const w = world(),
      o = add(w, "crystal", "territorial", 3, 3, { E: Energy });
    o.site = { cell: o.cell, expires: 100 };
    const weights = o.weights.slice(),
      dna = { ...o.dna },
      c = ready(w);
    E.B.choose(w, c);
    assert.deepEqual(o.weights, weights);
    assert.deepEqual(o.dna, dna);
    return c.intents.get(o.id).type;
  }
  assert.equal(intent(15), "move");
  assert.notEqual(intent(90), "move");
});

test('a grazed living plant retains basal productivity, while darkness never grants energy',()=>{
 const w=world(),o=add(w,'grass','base',3,3,{B:S.PLANT_BASE,E:0});assert.equal(S.leafFactor(o),.5);o.B=S.PLANT_BASE+10;assert.equal(S.leafFactor(o),1);o.B=S.PLANT_BASE;w.tiles[o.cell].light=0;ready(w);assert.equal(w.ledger.solar,0);assert.equal(o.E,0);
});

test("foraging ranks edible yield above a nearly bare base without writing biological state", () => {
  const w = world(),
    o = add(w, "crystal", "forager", 3, 3, { E: 20, M: 30 }),
    thin = add(w, "grass", "thin", 2, 3, { B: 2.08 }),
    full = add(w, "grass", "full", 4, 3, { B: 6 });
  const c = ready(w), m = S.maps(w), before = E.fingerprint(w);
  const resourceValue = (target) => E.B.evaluate(w, o,
    {type:"harvest",cell:o.cell,target:target.id,cost:0,path:[]},c,
    {m,traits:c.traits,enemies:[],nearest:null,visibleCells:new Set([o.cell,thin.cell,full.cell]),qualityCache:new Map()}
  ).features[2];
  assert(resourceValue(full) > resourceValue(thin) * 10,
    "enough leaf for a real meal must outrank residual leaf near the living base");
  assert.equal(E.fingerprint(w), before);
  thin.B = 2;
  assert.equal(resourceValue(thin), 0, "protected base is not potential food");
});

test("hungry defense earns survival value only for a visible threat while ordinary vigilance remains", () => {
  const w = world(),
    o = add(w, "crystal", "guard", 3, 3, { E: 20, HP: 20 }),
    enemy = add(w, "abyss", "enemy", 4, 3, { phase: 4, E: 80, HP: 100 });
  const c = ready(w), m = S.maps(w);
  function defense(Energy, enemies) {
    o.E = Energy;
    const before = E.fingerprint(w), weights = o.weights.slice();
    const result = E.B.evaluate(w, o, {type:"defend",cell:o.cell,cost:0,path:[]}, c,
      {m,traits:c.traits,enemies,nearest:enemies[0]||null,visibleCells:new Set([o.cell,enemy.cell]),qualityCache:new Map()});
    assert.equal(E.fingerprint(w), before);
    assert.deepEqual(o.weights, weights);
    return result.features[1];
  }
  assert.equal(defense(20, []), 0, "hunger without a threat is not rewarded as defense");
  assert.equal(defense(35, []), 0.25, "ordinary vigilance retains its existing evaluation");
  assert(defense(20, [enemy]) > 0.25, "a genuine visible threat still rewards defense while hungry");
  const social = add(w, "swarm", "social", 2, 2, { E: 20, role: "worker", colony: "home" });
  const socialCtx = ready(w);
  const socialGuard = E.B.evaluate(w, social, {type:"defend",cell:social.cell,cost:0,path:[]},socialCtx,
    {m:S.maps(w),traits:socialCtx.traits,enemies:[],nearest:null,visibleCells:new Set([social.cell]),qualityCache:new Map()});
  assert.equal(socialGuard.features[1], 0.25, "social waiting retains its existing evaluation");
});
