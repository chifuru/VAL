const fs = require("fs"),
  path = require("path"),
  E = require(
    path.join(
      process.env.LIFEGAME_MODEL_ROOT || path.resolve(__dirname, "../src"),
      "ecology/engine.js",
    ),
  );
const output =
  process.env.LIFEGAME_SURVEY_OUT ||
  path.resolve(__dirname, "../artifacts/diet-survival.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
const results = [];
for (let trial = 0; trial < 10; trial++) {
  let w = E.create({
    seed: "ecology32/" + trial,
    terrainSeed: "ecology32/map/" + trial,
    landscape: "templates",
    ageModel: "life/1",
    mapId: ["river", "lake", "wetland", "ridge", "woodland", "basin"][
      trial % 6
    ],
    width: 40,
    height: 28,
    initial: 80,
    lineages: "few",
    guarantee: false,
  });
  const ids = E.S.D.main.filter((s) => w.stats.counts[s.id]).map((s) => s.id),
    initial = { ...w.stats.counts },
    continuous = Object.fromEntries(ids.map((id) => [id, true])),
    firstLoss = {},
    snapshots = [],
    mainCauses = { combat: 0, starvation: 0, age: 0, harvest: 0 };
  for (let t = 1; t <= 500; t++) {
    w = E.step(w);
    for (const d of w.last.deathCauses)
      if (E.S.D.byId[d.species].group === "main") mainCauses[d.reason]++;
    const err = E.invariants(w);
    if (err.length) throw Error(err);
    for (const id of ids) {
      if (!w.stats.counts[id] && !firstLoss[id]) firstLoss[id] = t;
      if (t >= 300 && !w.stats.counts[id]) continuous[id] = false;
    }
    if ([100, 300, 500].includes(t))
      snapshots.push({
        turn: t,
        counts: w.stats.counts,
        P: w.stats.P,
        Q: w.stats.Q,
        main: w.stats.main,
        food: w.stats.food,
        causes: w.tallies.causes,
      });
  }
  results.push({
    trial,
    mainCauses,
    ids,
    initial,
    continuous,
    firstLoss,
    snapshots,
    births: w.tallies.births,
    fingerprint: E.fingerprint(w),
    config: w.config,
  });
  fs.writeFileSync(output, JSON.stringify({ trials: results }, null, 2));
  console.log(
    trial,
    mainCauses,
    w.stats.main,
    ids.filter((id) => w.stats.counts[id]).join(","),
  );
}
