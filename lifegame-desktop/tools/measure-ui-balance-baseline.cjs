"use strict";

// Read-only production-model baseline. No replenishment or tuning is applied.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const E = require("../src/ecology/engine.js");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "operations/evidence/ui-balance-baseline-v1");
fs.mkdirSync(out, { recursive: true });
const hashes = {};
for (const file of fs.readdirSync(path.join(root, "src/ecology")).filter(f => f.endsWith(".js"))) {
  const name = "src/ecology/" + file;
  hashes[name] = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, name))).digest("hex");
}
for (const name of ["src/app.js", "src/Index.html", "src/styles.css", "tools/measure-ui-balance-baseline.cjs"]) {
  hashes[name] = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, name))).digest("hex");
}
const results = [];
for (let trial = 0; trial < 10; trial++) {
  const input = { seed: "ui-balance-baseline-v1/" + trial, width: 40, height: 28,
    initial: 80, lineages: "few", landscape: "watershed", guarantee: false };
  let w = E.create(input);
  const counts = () => Object.fromEntries(E.S.D.species.map(s => [s.id, w.stats.counts[s.id] || 0]));
  const initialCounts = counts(), ids = E.S.D.main.map(s => s.id).filter(id => initialCounts[id] > 0);
  const firstLoss = Object.fromEntries(ids.map(id => [id, null]));
  const continuous = Object.fromEntries(ids.map(id => [id, true]));
  const births = Object.fromEntries(ids.map(id => [id, 0]));
  const snapshots = [];
  let firstMainExtinction = null;
  for (let turn = 1; turn <= 500; turn++) {
    w = E.step(w);
    const errors = E.invariants(w);
    if (errors.length) throw Error("trial " + trial + " turn " + turn + ": " + errors.join());
    for (const id of ids) {
      if (!w.stats.counts[id] && firstLoss[id] === null) firstLoss[id] = turn;
      if (turn >= 300 && !w.stats.counts[id]) continuous[id] = false;
    }
    for (const o of w.organisms) if (o.slot === "main" && o.age === 0 && o.generation > 0) {
      births[o.species]++;
      if (o.phase !== 1 || o.G !== 0) throw Error("newborn contract");
    }
    if (!w.stats.main && firstMainExtinction === null) firstMainExtinction = turn;
    if ([100, 300, 500].includes(turn)) snapshots.push({ turn, main: w.stats.main, food: w.stats.food,
      P: w.stats.P, Q: w.stats.Q, counts: counts(), causes: { ...w.tallies.causes } });
  }
  const survivors = ids.filter(id => w.stats.counts[id] > 0).sort();
  const max = Math.max(0, ...ids.map(id => w.stats.counts[id] || 0));
  results.push({ trial, config: w.config, initialCounts, firstLoss, continuous300to500: continuous,
    births, firstMainExtinction, survivors, leaders: max ? ids.filter(id => w.stats.counts[id] === max) : [],
    snapshots, fingerprint: E.fingerprint(w) });
  process.stderr.write("trial " + trial + " completed; surviving main lineages: " + survivors.length + "\n");
}
const coverage = E.S.D.main.map(s => {
  const trials = results.filter(r => r.initialCounts[s.id] > 0);
  return { id: s.id, name: s.name, trials: trials.length,
    continuous300to500: trials.filter(r => r.continuous300to500[s.id]).length,
    withBirths: trials.filter(r => r.births[s.id] > 0).length };
});
const report = { kind: "untuned-production-baseline-not-release-acceptance", engine: E.S.VERSION,
  node: process.version, platform: process.platform, configPolicy: "UI watershed / few / 80 / 40x28 / no guarantee",
  ticks: 500, trialCount: 10, invariantCheckedTurns: 5000, coverage,
  terminalMainExtinctions: results.filter(r => r.firstMainExtinction !== null).length,
  terminalSurvivorSets: [...new Set(results.map(r => r.survivors.join(",")))],
  limitations: ["Ten total trials, not ten trials per lineage", "Unrepresented lineages are not evaluated",
    "No tuning or held-out acceptance", "No new age, map-template or plant model is implemented by this measurement"], results };
fs.writeFileSync(path.join(out, "source-hashes.json"), JSON.stringify(hashes, null, 2) + "\n");
fs.writeFileSync(path.join(out, "balance.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ trialCount: report.trialCount, invariantCheckedTurns: 5000,
  terminalMainExtinctions: report.terminalMainExtinctions, coverage, terminalSurvivorSets: report.terminalSurvivorSets }, null, 2));
