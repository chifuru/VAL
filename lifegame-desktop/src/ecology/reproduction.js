(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoReproduction = api;
})(globalThis, function (S) {
  "use strict";
  function lead(values, minimum) {
    const ranked = values
      .map((value, i) => ({ value, i }))
      .sort((a, b) => b.value - a.value || a.i - b.i);
    return ranked[0].value >= minimum && ranked[0].value - ranked[1].value >= 2
      ? ranked[0].i
      : null;
  }
  function growth(w, ctx) {
    for (const o of w.organisms) {
      if (!ctx.traits.has(o.id)) continue;
      const s = S.spec(o),
        p = ctx.traits.get(o.id),
        rec = ctx.records.get(o.id),
        old = p.phase;
      if (s.group !== "main") {
        if (old === 1 && o.age >= s.maturity && o.E >= 6) o.phase = 2;
        continue;
      }
      if (s.id === "kelp" && rec.light > 0 && o.E >= 60 && o.M >= 1) {
        o.E = S.round(o.E - 1);
        S.dissipate(w, 1);
        o.G = S.round(Math.min(300, o.G + 1));
      }
      if (old === 2 && rec.category !== null)
        o.counters[rec.category] = Math.min(64, o.counters[rec.category] + 1);
      if (old === 3 && s.id !== "precocial" && rec.category === o.branch3) {
        let side = null;
        if (o.branch3 === 0) {
          if (rec.reserve >= 1.5 && rec.heal >= 0.5)
            side = ctx.old.get(o.id).HP < 70 ? 1 : 0;
          else if (rec.reserve >= 1.5) side = 0;
          else if (rec.heal >= 0.5) side = 1;
        } else if (o.branch3 === 1) {
          if (rec.moved && rec.organic > 0) {
            const env = w.tiles[o.cell].env;
            o.habitatRun =
              o.habitatEnv === env ? Math.min(4, o.habitatRun + 1) : 1;
            o.habitatEnv = env;
          } else o.habitatRun = 0;
          if (o.habitatRun >= 4) side = 1;
          else if (
            o.pendingMove &&
            o.pendingMove.expires > w.turn &&
            rec.organic > 0
          ) {
            side = 0;
            o.pendingMove = null;
          }
        } else {
          if (ctx.intents.get(o.id).type === "defend" && rec.mitigated >= 2)
            side = 1;
          else if (rec.dealt >= 2 && o.HP >= 50) side = 0;
          else if (rec.mitigated >= 2) side = 1;
        }
        if (side !== null)
          o.ivCounters[side] = Math.min(64, o.ivCounters[side] + 1);
      } else if (old === 3 && o.branch3 === 1) o.habitatRun = 0;
      const early = s.id === "precocial",
        toII = early ? 45 : 30,
        toIII = early ? 120 : 90;
      if (old === 1 && o.G >= toII) o.phase = 2;
      else if (old === 2 && o.G >= toIII && o.M >= p.M3) {
        const branch = lead(o.counters, 4) ?? (w.config.ecologyRevision === "observation/4.1" && o.counters.reduce((a,b)=>a+b,0)>=18 ? o.counters.indexOf(Math.max(...o.counters)) : null);
        if (branch !== null) {
          o.phase = 3;
          o.branch3 = branch;
          o.counters = [0, 0, 0];
          o.ivCounters = [0, 0];
          o.pendingMove = null;
          o.birthReady = w.turn + 5;
        }
      } else if (old === 3 && !early && o.G >= 210 && o.M >= p.M4) {
        const branch = lead(o.ivCounters, 3);
        if (branch !== null) {
          o.phase = 4;
          o.branch4 = branch;
          if(!p.ageEnabled)o.birthReady = Math.min(
            o.birthReady,
            w.turn + S.phenotype(w, o).cooldown + 1,
          );
        }
      }
      if (o.phase !== old) {
        S.record(ctx, o, "growth", { fromPhase: old, phase: o.phase });
        if (s.id === "swarm" && o.role === "queen" && o.phase === 3) {
          const oldColony = o.colony;
          o.colony = o.id;
          if (o.founder && !ctx.founders.has(oldColony)) {
            ctx.founders.add(oldColony);
            for (const a of w.organisms)
              if (a.founder === oldColony && a.role === "worker")
                a.colony = o.id;
          }
        }
      }
    }
  }
  function eligible(w, o, ctx, asexual = false) {
    const s = S.spec(o),
      rec = ctx.records.get(o.id),
      p = ctx.traits.get(o.id);
    if(p?.ageStage === "juvenile")return false;
    if (!rec || rec.damage > 0 || o.HP <= 0 || o.birthReady > w.turn)
      return false;
    if (s.group !== "main")
      return (
        ctx.traits.get(o.id).phase >= 2 &&
        o.E >= (s.group === "prey" ? 12 : 8) &&
        (s.group === "prey" || (o.M >= 0.2 && o.B >= 3))
      );
    return (
      (w.config.ecologyRevision === "observation/4.1" || ctx.traits.get(o.id).phase >= 3) &&
      o.HP >= 70 &&
      o.M >= (w.config.ecologyRevision === "observation/4.1" && !asexual ? 2 : 4) &&
      o.E >= (asexual ? 70 : s.birthEnergy*(w.config.ecologyRevision === "observation/4.1" ? .65 : 1)) &&
      o.role !== "worker"
    );
  }
  function birthCost(w, o, ctx) {
    const s = S.spec(o),
      phase = ctx.traits.get(o.id).phase;
    return s.id === "precocial" ? 30 : 20 * (1 + S.trait(o, "birth", phase));
  }
  function candidates(w, ctx) {
    const m = S.maps(w),
      out = [];
    for (let cell = 0; cell < w.tiles.length; cell++) {
      if (w.tiles[cell].blocked) continue;
      const near = S.nearby(w, cell),
        mains = near.map((p) => m.main.get(p)).filter(Boolean),
        food = near.map((p) => m.food.get(p)).filter(Boolean),
        local = [];
      if (!m.main.has(cell) && w.config.enabled.main) {
        if([2,3].includes(mains.length))for(const mother of mains)
          if(mother.species==="swarm"&&mother.role==="queen"&&mother.sperm?.uses>0&&eligible(w,mother,ctx)&&mother.E>=40&&mother.M>=4&&S.oneStep(w,mother.cell,cell))
            local.push({cell,slot:"main",kind:3,parents:[mother],fatherReference:mother.sperm.father,costs:[40],species:mother.species});
        if ([2, 3].includes(mains.length))
          for (const mother of mains)
            if (
              mother.sex === "female" && !(mother.species === "swarm" && mother.sperm?.uses>0) &&
              eligible(w, mother, ctx) &&
              S.oneStep(w, mother.cell, cell)
            )
              for (const father of mains)
                if (
                  father.sex === "male" &&
                  father.species === mother.species &&
                  eligible(w, father, ctx) &&
                  S.oneStep(w, father.cell, cell) &&
                  S.oneStep(w, mother.cell, father.cell)
                ) {
                  const costs = [
                    birthCost(w, mother, ctx),
                    birthCost(w, father, ctx),
                  ];
                  if (mother.E >= costs[0] && father.E >= costs[1])
                    local.push({
                      cell,
                      slot: "main",
                      kind: 0,
                      parents: [mother, father],
                      costs,
                      species: mother.species,
                    });
                }
        if (mains.length >= 1 && mains.length <= 3)
          for (const mother of mains)
            if (
              mother.species === "jelly" &&
              mother.sex === "female" &&
              mother.maleAbsent >= 8 &&
              eligible(w, mother, ctx, true) &&
              S.oneStep(w, mother.cell, cell)
            )
              local.push({
                cell,
                slot: "main",
                kind: 1,
                parents: [mother],
                costs: [40],
                species: mother.species,
              });
      }
      if (!m.food.has(cell))
        for (const s of S.D.species.filter(
          (s) =>
            ["plant", "fungus", "prey"].includes(s.group) &&
            w.config.enabled[s.group],
        )) {
          if (!S.validHabitat(w, s, cell)) continue;
          const same = food.filter((o) => o.species === s.id);
          if (
            s.group === "prey"
              ? ![2, 3].includes(same.length)
              : w.config.ecologyRevision === "observation/4.1" ? !(s.group === "fungus" ? [1,2,3] : [2,3]).includes(same.length) : same.length !== 3
          )
            continue;
          for (const parent of same)
            if (eligible(w, parent, ctx) && S.oneStep(w, parent.cell, cell))
              local.push({
                cell,
                slot: "food",
                kind: 2,
                parents: [parent],
                costs: [8],
                species: s.id,
              });
        }
      for (const c of local) {
        c.h = S.hash(w, "birth/arbitration", w.turn, c.species, [
          cell,
          c.kind,
          c.parents.map((o) => o.id),
        ]);
        c.key = JSON.stringify([
          c.species,
          cell,
          c.kind,
          c.parents.map((o) => o.id),
        ]);
      }
      for (const slot of ["main", "food"]) {
        const winner = local.filter((c) => c.slot === slot).sort(compare)[0];
        if (winner) out.push(winner);
      }
    }
    return out;
  }
  function compare(a, b) {
    return a.kind - b.kind || a.h - b.h || S.compare(a.key, b.key);
  }
  function child(w, c, ctx) {
    const s = S.D.byId[c.species],
      mother = c.parents[0],
      father = c.parents[1] || c.fatherReference || mother,
      id =
        "b:" +
        w.turn +
        ":" +
        c.slot +
        ":" +
        Math.floor(c.cell / w.config.width) +
        ":" +
        (c.cell % w.config.width),
      T = c.costs.reduce((a, b) => a + b, 0);
    const main = s.group === "main",
      early = s.id === "precocial";
    let sex = main
        ? c.kind === 1
          ? "female"
          : S.r(w, "birth/sex", w.turn, id) < 0.5
            ? "female"
            : "male"
        : null,
      role = null;
    if (s.id === "swarm")
      role =
        sex === "male"
          ? "male"
          : S.r(w, "birth/role", w.turn, mother.id, c.cell) <
              (w.organisms.some((a) =>
                a.id !== mother.id && a.species === "swarm" &&
                a.role === "queen" && a.colony === mother.colony &&
                a.HP > 0 && S.distance(w, a.cell, mother.cell) <= 2)
                ? 0.08 : 0.6)
            ? "queen"
            : "worker";
    const share = early ? 0.6 : role === "queen" ? 0.5 : 0.8;
    const o = S.organism(w, s, c.cell, id, {
      sex,
      role,
      colony: s.id === "swarm" ? mother.colony : null,
      founder: null,
      E: main ? S.round(T * share) : 6,
      B: main ? S.round(T * (1 - share)) : 2,
      M: main ? 1 : s.group === "prey" ? 0 : 0.2,
      HP: main ? 100 : s.capacity[3],
      generation: Math.max(...c.parents.map((o) => o.generation),father.generation) + 1,
      parents: c.fatherReference ? [mother.id,father.id] : c.parents.map((o) => o.id),
    });
    if (main) {
      S.DNA.forEach((axis, i) => {
        const big = S.r(w, "birth/mutation-kind", w.turn, id, null, i) < 0.01,
          range = big ? 0.05 : 0.02;
        o.dna[axis] = S.round(
          S.clamp(
            (mother.dna[axis] + father.dna[axis]) / 2 +
              (2 * S.r(w, "birth/dna", w.turn, id, null, i) - 1) * range,
          ),
        );
      });
      o.birthWeights = s.weights.map((v, i) =>
        S.round(
          S.clamp(
            0.75 * v +
              (0.25 * (mother.birthWeights[i] + father.birthWeights[i])) / 2 +
              (4 * S.r(w, "birth/weights", w.turn, id, null, i) - 2),
            0,
            100,
          ),
        ),
      );
      o.weights = o.birthWeights.slice();
    }
    S.initializeAge(w,o);
    c.parents.forEach((parent, i) => {
      parent.E = S.round(parent.E - c.costs[i]);
      parent.M = S.round(
        parent.M -
          (main ? ([1,3].includes(c.kind) ? 4 : 2) : s.group === "prey" ? 0 : 0.2),
      );
      ctx.parents.add(parent.id);
      const cooldown = ctx.traits.get(parent.id).cooldown;
      parent.birthReady =
        w.turn + Math.ceil(cooldown * (c.kind === 1 ? 1.5 : 1)) + 1;
    });
    if(w.config.ecologyRevision === "observation/4.1")for(const parent of c.parents)parent.firstBirthAt??=w.turn;
    if (main) S.addSoil(w, mother.cell, 3);
    S.record(ctx, o, "birth", { parents: o.parents });
    if(c.kind===3){mother.sperm.uses--;w.colonyMating.storedBirths++;}
    return o;
  }
  function blockers(w,o,ctx,m=S.maps(w)) {
    const s=S.spec(o),p=ctx.traits.get(o.id)||S.phenotype(w,o),reasons=[];
    if(p.ageStage==="juvenile")reasons.push("未成熟");
    if(o.HP<70)reasons.push("健康不足");if(o.E<s.birthEnergy*(w.config.ecologyRevision === "observation/4.1"?.65:1))reasons.push("栄養不足");if(o.M<(o.sperm?.uses>0?4:2))reasons.push("鉱物不足");
    if(o.birthReady>w.turn)reasons.push("待機中");if(o.role==="worker")reasons.push("非繁殖階級");if(ctx.records.get(o.id)?.damage>0)reasons.push("当日被害");
    const near=S.nearby(w,o.cell).map(c=>m.main.get(c)).filter(Boolean);
    if(o.sex==="female" && !(o.sperm?.uses>0) && !(s.id==="jelly"&&o.maleAbsent>=8) && !near.some(a=>a.species===o.species && a.sex!==o.sex && S.ageInfo(a).stage!=="juvenile" && S.oneStep(w,o.cell,a.cell)))reasons.push("局所配偶相手なし");
    if(!S.nearby(w,o.cell).some(c=>!m.main.has(c)&&S.oneStep(w,o.cell,c)&&[2,3].includes(S.nearby(w,c).filter(k=>m.main.has(k)).length)))reasons.push("出生場所不足");
    return reasons;
  }
  function reproduce(w, ctx) {
    if(w.config.ecologyRevision === "observation/4.1"){const m=S.maps(w);for(const o of w.organisms)if(o.slot === "main")o.birthBlockers=blockers(w,o,ctx,m);}
    const matingMap=S.maps(w),usedMales=new Set();
    for(const queen of w.organisms){
      if(queen.species!=="swarm"||queen.role!=="queen"||queen.sperm?.uses>0||(w.config.ecologyRevision!=="observation/4.1"&&ctx.traits.get(queen.id)?.phase<3)||queen.HP<70||queen.E<47||ctx.traits.get(queen.id)?.ageStage==="juvenile"||ctx.records.get(queen.id)?.damage>0)continue;
      const male=S.nearby(w,queen.cell).map(p=>matingMap.main.get(p)).filter(a=>a?.species==="swarm"&&a.role==="male"&&(w.config.ecologyRevision==="observation/4.1"||ctx.traits.get(a.id)?.phase>=3)&&a.HP>=70&&a.E>=2&&ctx.traits.get(a.id)?.ageStage!=="juvenile"&&ctx.records.get(a.id)?.damage===0&&!usedMales.has(a.id)&&S.oneStep(w,queen.cell,a.cell)).sort((a,b)=>S.hash(w,"colony/mate",w.turn,queen.id,a.id)-S.hash(w,"colony/mate",w.turn,queen.id,b.id))[0];
      if(!male)continue;queen.E=S.round(queen.E-2);male.E=S.round(male.E-2);S.dissipate(w,4);usedMales.add(male.id);
      queen.sperm={uses:12,father:{id:male.id,dna:{...male.dna},birthWeights:male.birthWeights.slice(),generation:male.generation}};
      w.colonyMating??={matings:0,storedBirths:0};w.colonyMating.matings++;
    }
    const list = candidates(w, ctx),
      votes = new Map();
    for (const c of list)
      for (const key of [
        ...c.parents.map((o) => o.id),
        "slot:" + c.slot + ":" + c.cell,
      ]) {
        const old = votes.get(key);
        if (!old || compare(c, old) < 0) votes.set(key, c);
      }
    const children = [];
    for (const c of list) {
      const keys = [
        ...c.parents.map((o) => o.id),
        "slot:" + c.slot + ":" + c.cell,
      ];
      if (keys.every((k) => votes.get(k) === c)) {
        children.push(child(w, c, ctx));
        ctx.births.push(c.species);
      }
    }
    w.organisms.push(...children);
    ctx.children = children;
    return children;
  }
  return { lead, growth, eligible, birthCost, candidates, child, reproduce };
});
