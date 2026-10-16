"use strict";
const E = require("../src/ecology/engine.js"),
  S = E.S;
function world() {
  const w = E.create({
    seed: "contract-fixture",
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
  w.tiles = w.tiles.map((t) => ({
    ...t,
    env: 3,
    terrain: "plain",
    cover: "none",
    blocked: false,
    light: 0.7,
    walls: [],
    soilM: 5,
  }));
  w.organisms = [];
  w.resources = [];
  w.carcasses = [];
  w.messages = [];
  w.pending = [];
  w.config.enabled = {
    main: true,
    plant: true,
    fungus: true,
    prey: true,
    P: true,
    Q: true,
  };
  w.turn = 1;
  return w;
}
function add(w, species, id, x, y, options = {}) {
  const o = S.organism(w, S.D.byId[species], S.index(w, x, y), id, {
    dna: Object.fromEntries(S.DNA.map((k) => [k, 0.5])),
    ...options,
  });
  w.organisms.push(o);
  return o;
}
function ready(w) {
  const totals = S.totals(w);
  w.ledger = {
    initialE: totals.E,
    initialM: totals.M,
    solar: 0,
    sinks: 0,
    Mloss: 0,
  };
  w.stats = E.summarize(w);
  const c = E.context(w);
  E.prepare(w, c);
  for (const o of w.organisms)
    c.intents.set(o.id, { type: "stop", cell: o.cell, cost: 0, path: [] });
  return c;
}
function parents(w, species = "abyss", phase = 3) {
  const a = add(w, species, "mother", 1, 1, {
      phase,
      sex: "female",
      E: 90,
      M: 12,
      role: species === "swarm" ? "queen" : null,
    }),
    b = add(w, species, "father", 2, 1, {
      phase,
      sex: "male",
      E: 90,
      M: 12,
      role: species === "swarm" ? "male" : null,
    });
  add(w, "myth", "neighbor", 2, 2);
  return [a, b];
}
module.exports = { E, S, world, add, ready, parents };
