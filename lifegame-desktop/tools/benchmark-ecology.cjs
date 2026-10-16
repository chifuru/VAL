const E = require("../src/ecology/engine.js");
const result = [];
for (const [width, height, initial] of [
  [40, 28, 80],
  [80, 56, 320],
  [160, 112, 1280],
]) {
  const begin = performance.now();
  let w = E.create({ seed: "ecology-benchmark", width, height, initial });
  const createMs = performance.now() - begin,
    times = [];
  for (let i = 0; i < 12; i++) {
    const t = performance.now();
    w = E.step(w);
    times.push(performance.now() - t);
    const errors = E.invariants(w);
    if (errors.length)
      throw Error(width + " tick" + w.turn + ":" + errors.join());
  }
  result.push({
    width,
    height,
    initial,
    createMs,
    meanMs: times.reduce((a, b) => a + b) / times.length,
    maxMs: Math.max(...times),
    summary: w.stats,
  });
}
let observed = E.create({
  seed: "extended-observation",
  width: 40,
  height: 28,
  initial: 80,
});
const milestones = [];
for (let i = 0; i < 1000; i++) {
  observed = E.step(observed);
  const errors = E.invariants(observed);
  if (errors.length)
    throw Error("extended tick " + observed.turn + ":" + errors.join());
  if ([100, 250, 500, 1000].includes(observed.turn))
    milestones.push({
      turn: observed.turn,
      stats: observed.stats,
      tallies: observed.tallies,
      fingerprint: E.fingerprint(observed),
    });
}
console.log(
  JSON.stringify(
    {
      version: E.S.VERSION,
      node: process.version,
      platform: process.platform,
      results: result,
      extended: { seed: "extended-observation", ticks: 1000, milestones },
    },
    null,
    2,
  ),
);
