const fs = require("fs"),
  path = require("path"),
  E = require(
    path.join(
      process.env.LIFEGAME_MODEL_ROOT || path.resolve(__dirname, "../src"),
      "ecology/engine.js",
    ),
  );
const output =
  process.env.LIFEGAME_SURVIVAL_OUT ||
  path.resolve(__dirname, "../artifacts/ordinary-survival.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
const results = [];
for (const id of ["myth", "recursive", "crystal", "kelp", "swarm"]) {
  let w = E.create({
    seed: "ordinary-survival/" + id,
    landscape: "templates",
    ageModel: "life/1",
    mapId: "river",
    width: 40,
    height: 28,
    initial: 40,
    lineages: "manual",
    selected: [id],
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
  const deaths = { combat: 0, starvation: 0, age: 0, harvest: 0 },
    snapshots = [];
  for (let t = 1; t <= 500; t++) {
    w = E.step(w);
    const errs = E.invariants(w);
    if (errs.length) throw Error(errs);
    for (const d of w.last.deathCauses)
      if (E.S.D.byId[d.species].group === "main") deaths[d.reason]++;
    if ([100, 300, 500].includes(t))
      snapshots.push({
        turn: t,
        main: w.stats.main,
        births: w.tallies.births[id],
        phases: w.stats.phases,
      });
  }
  results.push({ id, deaths, snapshots });
  fs.writeFileSync(
    output,
    JSON.stringify(
      {
        label:
          "unaltered production, single primary lineage, P/Q disabled; prey predation remains enabled",
        results,
      },
      null,
      2,
    ),
  );
  console.log(id, JSON.stringify({ deaths, snapshots }));
}
