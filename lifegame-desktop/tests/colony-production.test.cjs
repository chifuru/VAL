"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { E, S, world, add, ready, parents } = require("./ecology-fixtures.cjs");

test("production worker can feed its hungry queen with a finite paid transfer", () => {
  const w = world();
  const worker = add(w, "swarm", "worker", 3, 3, { phase: 3, role: "worker", colony: "home", E: 60 });
  const queen = add(w, "swarm", "queen", 4, 3, { phase: 3, role: "queen", colony: "home", E: 30 });
  const c = ready(w);
  assert(E.B.candidates(w, worker, c, S.maps(w)).some(a => a.type === "care" && a.target === queen.id));
  const before = S.totals(w), donor = worker.E, recipient = queen.E, growth = queen.G;
  c.intents.set(worker.id, { type: "care", target: queen.id, cost: 2 });
  E.B.care(w, c);
  assert.equal(worker.E, S.round(donor - 2));
  assert.equal(queen.E, S.round(recipient + 0.7));
  assert(queen.G > growth);
  assert.equal(S.totals(w).E, S.round(before.E - 1.3));
  assert.equal(S.totals(w).M, before.M);
  queen.colony = "other";
  assert(!E.B.candidates(w, worker, c, S.maps(w)).some(a => a.type === "care"));
  queen.colony = "home";
  queen.E = 65;
  assert(!E.B.candidates(w, worker, c, S.maps(w)).some(a => a.type === "care"));
  queen.E = 30;
  worker.E = 24;
  assert(!E.B.candidates(w, worker, c, S.maps(w)).some(a => a.type === "care"));
});
test("successor model keeps a worker's fungal nursery transfer finite",()=>{
  const w=world();w.config.socialRenewalModel="successor/1";
  const worker=add(w,"swarm","worker",3,3,{phase:3,role:"worker",colony:"home",E:60});
  const queen=add(w,"swarm","queen",4,3,{phase:3,role:"queen",colony:"home",E:30});
  const c=ready(w),before=S.totals(w);c.intents.set(worker.id,{type:"care",target:queen.id,cost:2});
  E.B.care(w,c);
  assert.equal(worker.E,58);assert.equal(queen.E,31.5);
  assert.equal(S.totals(w).E,S.round(before.E-.5));assert.deepEqual(E.invariants(w),[]);
});

test("queen care respects barriers and recipient capacity under competing workers", () => {
  const w = world();
  const worker = add(w, "swarm", "worker", 3, 3, { phase: 3, role: "worker", colony: "home", E: 60 });
  const queen = add(w, "swarm", "queen", 4, 3, { phase: 3, role: "queen", colony: "home", E: 30 });
  const other = add(w, "swarm", "other", 4, 4, { phase: 3, role: "worker", colony: "home", E: 60 });
  const c = ready(w);
  w.tiles[worker.cell].walls.push(queen.cell);
  assert(!E.B.candidates(w, worker, c, S.maps(w)).some(a => a.type === "care" && a.target === queen.id));
  w.tiles[worker.cell].walls = [];
  queen.E = S.round(c.traits.get(queen.id).capE - 2);
  queen.M = 8; queen.G = 90;
  const before = S.totals(w);
  for (const o of [worker, other]) c.intents.set(o.id, { type: "care", target: queen.id, cost: 2 });
  E.B.care(w, c);
  assert.equal(queen.E, S.round(c.traits.get(queen.id).capE - 1.3));
  assert.equal(S.totals(w).E, S.round(before.E - 1.3));
  assert.equal(S.totals(w).M, before.M);
});

test("production successor caste uses local living queens, retaining paid phase-I birth", () => {
  function birth(withQueen) {
    const w = world(), [mother, father] = parents(w, "swarm");
    mother.colony = father.colony = "home";
    mother.E = father.E = 70;
    const neighbour = w.organisms.find(o => o.id === "neighbor");
    w.organisms = w.organisms.filter(o => o !== neighbour);
    if (withQueen) add(w, "swarm", "sister", 2, 2, { phase: 3, role: "queen", colony: "home", E: 70 });
    else add(w, "myth", "neighbour", 2, 2);
    // Choose a deterministic female draw between the two caste thresholds.
    for (let turn = 1; turn < 10000; turn++) {
      const id = `b:${turn}:main:2:1`;
      const draw = S.r(w, "birth/role", turn, mother.id, 17);
      if (draw >= 0.08 && draw < 0.6 && S.r(w, "birth/sex", turn, id) < 0.5) { w.turn = turn; break; }
    }
    const c = ready(w), before = S.totals(w);
    const child = E.R.child(w, { species: "swarm", cell: 17, slot: "main", kind: 0, parents: [mother, father], costs: [16, 16] }, c);
    w.organisms.push(child);
    assert.equal(child.phase, 1);
    assert.equal(child.age, 0);
    assert.deepEqual(child.parents, [mother.id, father.id]);
    assert.equal(mother.E, 54);
    assert.equal(father.E, 54);
    assert.deepEqual(S.totals(w), before);
    return child.role;
  }
  assert.equal(birth(false), "queen");
  assert.equal(birth(true), "worker");
});

test("new successor model gives a paid daughter a viable queen caste without changing older worlds", () => {
  const w=world(),[mother,father]=parents(w,"swarm");
  mother.colony=father.colony="home";mother.E=father.E=70;
  w.organisms=w.organisms.filter(o=>o.id!=="neighbor");
  add(w,"swarm","existing-queen",2,2,{phase:3,role:"queen",colony:"home",E:70});
  for(let turn=1;turn<10000;turn++){
    const id=`b:${turn}:main:2:1`,draw=S.r(w,"birth/role",turn,mother.id,17);
    if(draw>.08&&draw<.45&&S.r(w,"birth/sex",turn,id)<.5){w.turn=turn;break;}
  }
  const candidate={species:"swarm",cell:17,slot:"main",kind:0,parents:[mother,father],costs:[16,16]};
  const original=E.R.child(w,candidate,ready(w));
  assert.equal(original.role,"worker");
  mother.E=father.E=70;w.config.socialRenewalModel="successor/1";
  const before=S.totals(w),daughter=E.R.child(w,candidate,ready(w));w.organisms.push(daughter);
  assert.equal(daughter.role,"queen");assert.equal(daughter.phase,1);assert.equal(daughter.age,0);
  assert.equal(daughter.generation,1);assert.deepEqual(S.totals(w),before);
  assert.deepEqual(E.invariants(w),[]);
});

test("production queen stores only real local paternity and funds later births herself", () => {
  const w = world(), [queen, male] = parents(w, "swarm");
  queen.colony = male.colony = "home";
  let c = ready(w), before = S.totals(w);
  E.R.reproduce(w, c);
  assert.equal(w.colonyMating.matings, 1);
  assert.equal(queen.sperm.uses, 11);
  assert.equal(c.children.length, 1);
  assert.deepEqual(c.children[0].parents, [queen.id, male.id]);
  assert.equal(queen.E, 48); // mating2 + full brood40
  assert.equal(male.E, 88); // only the real mating cost
  assert.equal(S.totals(w).E, S.round(before.E - 4));
  assert.equal(S.totals(w).M, before.M);
  w.organisms = w.organisms.filter(o => o.id !== male.id);
  queen.sperm.uses = 1;
  queen.E = 90; queen.M = 12; queen.birthReady = 0;
  c = ready(w); before = S.totals(w);
  E.R.reproduce(w, c);
  assert.equal(c.children.length, 1);
  assert.equal(queen.sperm.uses, 0);
  assert.equal(queen.E, 50);
  assert.deepEqual(c.children[0].parents, [queen.id, male.id]);
  assert.deepEqual(S.totals(w), before);
  queen.E = 90; queen.M = 12; queen.birthReady = 0;
  c = ready(w);
  E.R.reproduce(w, c);
  assert.equal(c.children.length, 0);
});

test("blocked, juvenile or injured partners cannot establish stored paternity", () => {
  for (const condition of ["blocked", "juvenile", "injured"]) {
    const w = world(), [queen, male] = parents(w, "swarm");
    const c = ready(w);
    if (condition === "blocked") w.tiles[queen.cell].walls.push(male.cell);
    if (condition === "juvenile") c.traits.get(male.id).ageStage = "juvenile";
    if (condition === "injured") c.records.get(male.id).damage = 1;
    E.R.reproduce(w, c);
    assert.equal(queen.sperm, undefined);
  }
});

test("queen lifetime is fixed at birth with ordinary maturation and independent phases", () => {
  const w = world(); w.config.ageModel = "life/1";
  const queen = add(w, "swarm", "queen", 3, 3, { role: "queen", sex: "female", age: 0 });
  const worker = add(w, "swarm", "worker", 4, 3, { role: "worker", sex: "female", age: 0 });
  assert.equal(queen.birthLife, 540);
  assert.equal(S.phenotype(w, queen).life, 540);
  assert.equal(worker.birthLife, 180);
  assert.equal(S.ageInfo(queen).matureAt, S.ageInfo(worker).matureAt);
  for (const phase of [1, 2, 3, 4]) {
    queen.phase = phase; queen.age = 0;
    assert.equal(S.ageInfo(queen).stage, "juvenile");
    queen.age = 405;
    assert.equal(S.ageInfo(queen).stage, "elderly");
    assert.equal(queen.birthLife, 540);
  assert.equal(S.phenotype(w, queen).life, 540);
  }
});
