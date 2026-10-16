"use strict";
const E = require("../src/ecology/engine.js"),
  S = E.S;
const CASES = [
  {
    id: "regression",
    seed: "extended-observation",
    width: 40,
    height: 28,
    initial: 80,
  },
  {
    id: "development",
    seed: "ecology-balance-development",
    width: 40,
    height: 28,
    initial: 80,
  },
  {
    id: "heldout",
    seed: "ecology-balance-holdout-a",
    width: 40,
    height: 28,
    initial: 80,
  },
  {
    id: "standard",
    seed: "ECOSYSTEM-2026",
    width: 80,
    height: 56,
    initial: 320,
  },
  {
    id: "few",
    seed: "ecology-balance-holdout-b",
    width: 40,
    height: 28,
    initial: 80,
    lineages: "few",
  },
  {
    id: "scatter",
    seed: "ecology-balance-holdout-a",
    width: 40,
    height: 28,
    initial: 80,
    placement: "scatter",
  },
];
function simulate(config, ticks = 1000) {
  const { id, ...input } = config;
  let w = E.create(input),
    maxGeneration = 0,
    mainBirths = 0,
    descendantBirths = 0,
    firstExtinction = null;
  const phaseIII = new Set(),
    phaseIV = new Set(),
    offspringMatured = new Set(),
    snapshots = [];
  const started = performance.now();
  function snapshot() {
    const t = S.totals(w);
    return {
      turn: w.turn,
      main: w.stats.main,
      food: w.stats.food,
      P: w.stats.P,
      Q: w.stats.Q,
      phases: w.stats.phases,
      counts: { ...w.stats.counts },
      mainBirths,
      descendantBirths,
      maxGeneration,
      offspringMatured: offspringMatured.size,
      phaseIII: phaseIII.size,
      phaseIV: phaseIV.size,
      births: { ...w.tallies.births },
      causes: { ...w.tallies.causes },
      totals: t,
      soilM: S.round(w.tiles.reduce((n, a) => n + a.soilM, 0)),
      sinks: w.ledger.sinks,
      solar: w.ledger.solar,
      Mloss: w.ledger.Mloss,
    };
  }
  snapshots.push(snapshot());
  for (let i = 0; i < ticks; i++) {
    w = E.step(w);
    const errors = E.invariants(w);
    if (errors.length)
      throw Error(id + " tick " + w.turn + ": " + errors.join());
    for (const o of w.organisms) {
      if (o.slot !== "main") continue;
      maxGeneration = Math.max(maxGeneration, o.generation);
      if (o.phase >= 3) {
        phaseIII.add(o.id);
        if (o.generation > 0) offspringMatured.add(o.id);
      }
      if (o.phase >= 4) phaseIV.add(o.id);
      if (o.age === 0 && o.generation > 0) {
        if (o.phase !== 1 || o.G !== 0 || !o.parents.length)
          throw Error("newborn contract");
        mainBirths++;
        if (o.generation >= 2) descendantBirths++;
      }
    }
    if (firstExtinction === null && w.initialMain > 0 && w.stats.main === 0)
      firstExtinction = w.turn;
    if ([100, 250, 500, 1000, 2000].includes(w.turn) || w.turn === ticks)
      snapshots.push(snapshot());
  }
  return {
    id,
    config: input,
    ticks,
    version: w.version,
    mainBirths,
    descendantBirths,
    maxGeneration,
    phaseIII: phaseIII.size,
    phaseIV: phaseIV.size,
    offspringMatured: offspringMatured.size,
    firstExtinction,
    finalMain: w.stats.main,
    finalFood: w.stats.food,
    fingerprint: E.fingerprint(w),
    wallMs: performance.now() - started,
    snapshots,
  };
}
if (require.main === module) {
  const selected = process.argv[2] || "regression",
    ticks = Number(process.argv[3] || 1000);
  if (!Number.isSafeInteger(ticks) || ticks < 1 || ticks > 10000)
    throw Error("invalid tick count");
  const cases =
    selected === "all" ? CASES : CASES.filter((c) => c.id === selected);
  if (!cases.length) throw Error("unknown case");
  const results = cases.map((c) => simulate(c, ticks));
  console.log(
    JSON.stringify(
      {
        version: S.VERSION,
        node: process.version,
        platform: process.platform,
        results,
      },
      null,
      2,
    ),
  );
}
module.exports = { CASES, simulate };
