(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoBehavior = api;
})(globalThis, function (S) {
  "use strict";
  const phaseA = [0, 1, 1.15, 1.35, 1.6];
  function environmental(w, o, kind, cell = o.cell) {
    const s = S.spec(o),
      env = w.tiles[cell].env;
    if (s.group !== "main") return 1;
    if (env === s.bad) return kind === "move" ? 1.2 : 0.9;
    if (!s.good.includes(env)) return 1;
    const table = {
      attack: [1.15, 1.05, 0.85],
      defense: [1.05, 1.15, 0.9],
      move: [1, 1.05, 0.75],
    };
    return table[s.type][kind === "attack" ? 0 : kind === "defense" ? 1 : 2];
  }
  function moveCost(w, o, to, phase = o.phase, friend = false) {
    const t = w.tiles[to],
      s = S.spec(o);
    let terrain = { plain: 1, shallow: 1, rock: 1.3, deep: 1.4, mud: 1.5 }[
      t.terrain
    ];
    if (
      (s.aquatic && t.terrain === "deep") ||
      (["kelp", "swarm"].includes(s.id) && t.terrain === "mud")
    )
      terrain = 1;
    terrain = Math.min(
      1.8,
      terrain * (["log", "bush"].includes(t.cover) ? 1.2 : 1),
    );
    if (o.branch3 === 1 && o.branch4 === 1) terrain = 1 + 0.75 * (terrain - 1);
    let branch =
      o.branch3 === 1 && o.branch4 === 0
        ? 0.9
        : s.id === "precocial" && phase === 3 && o.branch3 === 1
          ? 0.95
          : 1;
    return (
      terrain *
      environmental(w, o, "move", to) *
      S.adjustment(w, o, "move", t.env, phase) *
      branch *
      (friend ? 1 + S.trait(o, "packMove", phase) : 1)
    );
  }
  function power(w, o, kind, ctx) {
    const s = S.spec(o),
      p = ctx.traits.get(o.id),
      phase = p.phase;
    if (s.group !== "main")
      return kind === "attack" ? 0 : s.group === "prey" ? 1 : 0;
    const m = ctx.current || S.maps(w),
      friends = S.nearby(w, o.cell).filter(
        (c) => m.main.get(c)?.species === o.species,
      ).length;
    const common =
      s.id === "precocial" ? [0, 1.2, 1.35, 1.6][phase] : phaseA[phase];
    let value =
      kind === "attack"
        ? 6 + (6 * (2 * o.dna.body + o.dna.appendage)) / 3
        : 4 + 4 * o.dna.skin;
    value *= common * S.adjustment(w, o, kind, w.tiles[o.cell].env, phase);
    if (kind === "attack") {
      value *= 1 + Math.min(3, friends) * S.trait(o, "packAttack", phase);
      if (o.branch3 === 2 && o.branch4 === 0) value *= 1.1;
      value *= environmental(w, o, "attack");
    } else {
      let env = environmental(w, o, "defense");
      const guarded = ctx.intents.get(o.id)?.type === "defend",
        cover = ["bush", "log"].includes(w.tiles[o.cell].cover);
      if (guarded) env *= 1.25;
      if (cover) env *= 1.15;
      value *= Math.min(1.6, env);
      if (guarded) value *= 1 + S.trait(o, "guard", phase);
      if (cover) value *= 1 + S.trait(o, "coverDefense", phase);
      if (o.branch3 === 2 && o.branch4 === 1) value *= 1.1;
      if (s.id === "precocial" && phase === 3 && o.branch3 === 2) value *= 1.05;
    }
    return value;
  }
  function visible(w, o, p, ctx) {
    const radius = ctx.traits.get(o.id).sense;
    return S.distance(w, o.cell, p) <= radius && S.sight(w, o.cell, p);
  }
  function key(o, c) {
    return [
      c.type,
      o.id,
      c.target || null,
      c.path || [],
      S.xy(c.world, c.cell),
    ];
  }
  function candidates(w, o, ctx, m) {
    const s = S.spec(o),
      p = ctx.traits.get(o.id),
      budget = ctx.costs.get(o.id).budget,
      out = [{ type: "stop", cell: o.cell, cost: 0, path: [] }];
    if (s.group === "plant" || s.group === "fungus") return out;
    const friend = S.nearby(w, o.cell).some(
      (c) => m.main.get(c)?.species === o.species,
    );
    if (s.group === "main")
      out.push({ type: "defend", cell: o.cell, cost: 0, path: [] });
    if (s.group !== "prey" || s.id !== "waterbug" || w.turn % 2 === 0) {
      const [x, y] = S.xy(w, o.cell),
        occupied = o.slot === "main" ? m.main : m.food;
      for (let d = 0; d < 8; d++) {
        const [dx, dy] = S.DIRS[d];
        let prev = o.cell,
          path = [],
          cost = 0;
        for (let n = 1; n <= p.speed; n++) {
          const tx = x + dx * n,
            ty = y + dy * n;
          if (tx < 0 || ty < 0 || tx >= w.config.width || ty >= w.config.height)
            break;
          const cell = S.index(w, tx, ty);
          if (
            occupied.has(cell) ||
            !visible(w, o, cell, ctx) ||
            !S.oneStep(w, prev, cell)
          )
            break;
          cost += moveCost(w, o, cell, p.phase, friend);
          path.push(cell);
          if (cost <= budget + 1e-8)
            out.push({
              type: "move",
              cell,
              cost,
              path: path.slice(),
              direction: d,
            });
          prev = cell;
        }
      }
    }
    for (const cell of S.nearby(w, o.cell, p.sense, true)) {
      if (!visible(w, o, cell, ctx)) continue;
      const main = m.main.get(cell),
        food = m.food.get(cell);
      if (s.group === "main" && o.attackReady <= w.turn)
        for (const target of [main, food])
          if (
            target &&
            target.id !== o.id &&
            target.species !== o.species &&
            ["main", "prey"].includes(S.spec(target).group) &&
            S.distance(w, o.cell, cell) <= p.range
          ) {
            const range = S.distance(w, o.cell, cell),
              cost =
                (range === 2 ? 4 : 3) *
                S.adjustment(w, o, "attackCost", w.tiles[o.cell].env, p.phase);
            if (cost <= budget)
              out.push({
                type: "attack",
                cell: o.cell,
                target: target.id,
                cost,
                path: [],
              });
          }
      if (
        food &&
        ["plant", "fungus"].includes(S.spec(food).group) &&
        (s.group === "main" || S.spec(food).group === "plant") &&
        S.distance(w, o.cell, cell) <= 1 &&
        S.oneStep(w, o.cell, cell)
      )
        out.push({
          type: "harvest",
          cell: o.cell,
          target: food.id,
          cost: 0,
          path: [],
        });
      if (
        s.id === "swarm" &&
        o.role === "worker" &&
        o.E >= 40 &&
        budget >= 2 &&
        main &&
        main.id !== o.id &&
        main.colony === o.colony &&
        main.phase <= 2 &&
        S.distance(w, o.cell, cell) === 1 &&
        S.oneStep(w, o.cell, cell)
      )
        out.push({
          type: "care",
          cell: o.cell,
          target: main.id,
          cost: 2,
          path: [],
        });
    }
    return out;
  }
  function view(w, o, ctx, m) {
    const visibleCells = new Set(
        S.nearby(w, o.cell, ctx.traits.get(o.id).sense, true).filter((p) =>
          visible(w, o, p, ctx),
        ),
      ),
      enemies = [];
    for (const p of visibleCells)
      for (const t of [m.main.get(p), m.food.get(p)])
        if (
          t &&
          t.id !== o.id &&
          t.species !== o.species &&
          ["main", "prey"].includes(S.spec(t).group)
        )
          enemies.push(t);
    return { visibleCells, enemies, m };
  }
  function quality(w, o, cell, v) {
    const s = S.spec(o),
      preferences = {
        plant: [1.2, 1, 0.8, 1],
        animal: [0.8, 1, 1.2, 1],
        fungal: [1, 1.2, 0.8, 1],
        mineral: [1, 1, 0.8, 1.2],
        general: [1, 1, 1, 1],
      };
    const stage = (amount) =>
      amount <= 0 ? 0 : amount <= 1 / 3 ? 1 / 3 : amount <= 2 / 3 ? 2 / 3 : 1;
    const value = (amount, tag) => {
      if (s.group === "prey" && tag !== "plant") return 0;
      const multiplier =
        s.group === "main"
          ? preferences[s.diet][
              ["plant", "fungal", "animal", "mineral"].indexOf(tag)
            ] || 1
          : 1;
      return stage(amount) * multiplier;
    };
    let q = 0;
    const plant = v.m.food.get(cell);
    if (plant && ["plant", "fungus"].includes(S.spec(plant).group))
      q = value(plant.B / S.phenotype(w, plant).capB, S.spec(plant).tag);
    for (const a of v.m.resources.get(cell) || [])
      q = Math.max(q, value(a.q / S.FOOD[a.kind].cap, S.FOOD[a.kind].tag));
    for (const a of v.m.carcasses.get(cell) || [])
      if (a.species !== o.species) q = Math.max(q, value(a.q / 4, a.tag));
    return Math.min(1, q * (0.9 + 0.2 * o.dna.senses));
  }
  function approach(w, origin, to, target) {
    return S.clamp(
      (S.distance(w, origin, target) - S.distance(w, to, target)) / 2,
      -1,
      1,
    );
  }
  function danger(w, o, cell, v) {
    let t = 0;
    for (const enemy of v.enemies) {
      const s = S.spec(enemy);
      if (s.group !== "main") continue;
      const ratio = enemy.HP / S.phenotype(w, enemy).maxHP,
        hp = ratio >= 0.7 ? 1 : ratio >= 0.3 ? 0.7 : 0.4;
      t +=
        (((9 * phaseA[enemy.phase]) / 24) * hp) /
        (1 + S.distance(w, cell, enemy.cell)) ** 2;
    }
    return Math.min(1, t);
  }
  function neighborhood(w, o, cell, v) {
    let friends = 0,
      crowd = 0,
      empty = 0;
    for (const p of S.nearby(w, cell)) {
      if (!v.visibleCells.has(p)) continue;
      const main = v.m.main.get(p);
      if (main && main.id !== o.id) {
        crowd++;
        if (main.species === o.species) friends++;
      }
      const occupant = (o.slot === "main" ? v.m.main : v.m.food).get(p);
      if ((!occupant || occupant.id === o.id) && S.oneStep(w, cell, p)) empty++;
    }
    return { C: friends / 8, D: crowd / 8, O: empty / 8 };
  }
  function evaluate(w, o, c, ctx, v) {
    const s = S.spec(o),
      to = c.cell,
      here = o.cell,
      now = neighborhood(w, o, here, v),
      next = neighborhood(w, o, to, v),
      T = danger(w, o, to, v),
      oldT = danger(w, o, here, v),
      target = c.target ? v.m.byId.get(c.target) : null,
      Q =
        c.type === "harvest" && target
          ? quality(w, o, target.cell, v)
          : c.type === "care"
            ? 0.5
            : quality(w, o, to, v);
    const xi =
      2 *
        S.r(w, "behavior/jitter", w.turn, o.id, [
          c.type,
          c.target || null,
          c.path,
          to,
        ]) -
      1;
    const p = o.infection,
      middle = p && ["middle", "extra"].includes(p.stage),
      scale = p?.q?.phase >= 2 ? 0.5 : 1;
    let lure = 0;
    if (middle) {
      const host = p.species === "tideparasite" ? "algae" : "grass";
      const plant = [...v.visibleCells]
        .map((p) => v.m.food.get(p))
        .find((t) => t?.species === host);
      if (plant) lure = approach(w, here, to, plant.cell) * 0.1 * scale;
    }
    if (s.group === "prey") {
      const tide = middle && p.species === "tideparasite",
        leaf = middle && !tide,
        score =
          (0.6 + (leaf ? 0.03 * scale : 0)) * Q +
          0.3 * next.O +
          0.1 * (c.direction === o.facing ? 1 : 0) -
          (0.8 - (tide ? 0.03 * scale : 0)) * T +
          0.1 * xi +
          (tide && c.type === "move" ? 0.015 * scale : 0) +
          (leaf ? -0.03 * scale * (c.type === "move" ? -0.5 : 0.5) : 0) -
          c.cost / 5 +
          lure;
      return { score, noRandom: score - 0.1 * xi, features: [], xi };
    }
    if (s.group !== "main") return { score: 0, noRandom: 0, features: [], xi };
    const nearest = v.enemies
      .slice()
      .sort(
        (a, b) =>
          S.distance(w, here, a.cell) - S.distance(w, here, b.cell) ||
          S.compare(a.id, b.id),
      )[0];
    const move = c.type === "move",
      attack = c.type === "attack",
      guard = c.type === "defend";
    let mateBonus = 0,
      shelterBonus = 0;
    for (const p of v.visibleCells) {
      const a = v.m.main.get(p);
      if (!a || a.id === o.id || a.species !== o.species) continue;
      if (
        o.phase >= 3 &&
        a.phase >= 3 &&
        a.sex !== o.sex &&
        o.birthReady <= w.turn &&
        S.distance(w, to, p) < S.distance(w, here, p)
      )
        mateBonus = 0.1;
      if (o.phase <= 2 && a.phase >= 3 && S.distance(w, to, p) <= 1)
        shelterBonus = 0.1;
    }
    const direction = move
      ? (() => {
          const a = S.DIRS[o.facing],
            b = S.DIRS[c.direction];
          return (
            (a[0] * b[0] + a[1] * b[1]) / Math.hypot(...a) / Math.hypot(...b)
          );
        })()
      : 0;
    const features = [
      attack ? 1 : move && nearest ? approach(w, here, to, nearest.cell) : 0,
      move ? oldT - T : guard ? 0.25 + 0.5 * oldT : attack ? -0.25 * oldT : 0,
      Q - 0.5 * quality(w, o, here, v),
      c.type === "care" ? 1 : move ? next.C - now.C : attack ? -0.1 : now.C,
      move
        ? next.O - now.O
        : c.type === "stop"
          ? -now.D
          : attack && now.D >= 5 / 8
            ? 0.25
            : 0,
      o.site && o.site.expires > w.turn
        ? here === o.site.cell && !move
          ? 1
          : approach(w, here, to, o.site.cell)
        : 0,
      move ? (!o.history.includes(to) ? 0.5 : -0.25) + (Q > 0 ? 0.25 : 0) : 0,
      direction,
    ];
    features[3] += mateBonus + shelterBonus;
    if (c.type === "care") features[2] = 0.5;
    if (
      attack &&
      S.nearby(w, here).some((p) => {
        const a = v.m.main.get(p);
        return a?.species === o.species && a.phase <= 2;
      })
    )
      features[0] += 0.1;
    const weights = o.weights.slice();
    if (middle) {
      if (p.species === "tideparasite") {
        weights[6] += 3 * scale;
        weights[1] -= 3 * scale;
      } else {
        weights[2] += 3 * scale;
        weights[5] -= 3 * scale;
      }
    }
    const hunger = Math.max(0, (35 - o.E) / 35),
      injury = Math.max(0, (50 - o.HP) / 50);
    let score =
      features.reduce(
        (a, v, i) =>
          a + (S.clamp(weights[i], 0, 100) / 100) * S.clamp(v, -1, 1),
        0,
      ) +
      hunger * features[2] +
      injury * features[1] -
      c.cost / 5 +
      lure;
    if (c.type === "care") score += 0.4;
    if (
      attack &&
      target &&
      target.HP / S.phenotype(w, target).maxHP < 0.3 &&
      S.distance(w, here, target.cell) <= 1
    )
      score += 0.1 * hunger;
    const noRandom = score;
    score += (weights[8] / 100) * xi;
    return { score, noRandom, features, xi };
  }
  function choose(w, ctx) {
    const m = S.maps(w);
    for (const o of w.organisms) {
      const list = candidates(w, o, ctx, m),
        v = view(w, o, ctx, m);
      for (const c of list) {
        Object.assign(c, evaluate(w, o, c, ctx, v));
        c.h = S.hash(w, "behavior/tie", w.turn, o.id, [
          c.type,
          c.target || null,
          c.path,
          c.cell,
        ]);
      }
      list.sort((a, b) => b.score - a.score || a.h - b.h);
      const chosen = list[0],
        without = list
          .slice()
          .sort((a, b) => b.noRandom - a.noRandom || a.h - b.h)[0];
      ctx.intents.set(o.id, chosen);
      if (chosen.type === "defend") S.record(ctx, o, "defend");
      ctx.records.get(o.id).randomChanged = chosen !== without;
      if (o.id === ctx.observeId)
        ctx.diagnostics = {
          id: o.id,
          candidates: list.slice(0, 3).map((c) => ({
            type: c.type,
            target: c.target,
            cell: c.cell,
            score: c.score,
            cost: c.cost,
            features: c.features,
          })),
        };
      if (S.spec(o).id === "jelly" && o.sex === "female" && o.phase >= 3)
        o.maleAbsent = [...v.visibleCells].some((p) => {
          const t = m.main.get(p);
          return t?.species === o.species && t.sex === "male" && t.phase >= 3;
        })
          ? 0
          : Math.min(8, o.maleAbsent + 1);
    }
  }
  function move(w, ctx) {
    const votes = new Map(),
      list = [];
    for (const o of w.organisms) {
      const c = ctx.intents.get(o.id);
      if (c.type !== "move") continue;
      const h = S.hash(w, "movement/arbitration", w.turn, o.id, c.path),
        entry = { o, c, h };
      list.push(entry);
      for (const p of c.path) {
        const k = o.slot + ":" + p,
          old = votes.get(k);
        if (!old || h < old.h || (h === old.h && o.id < old.o.id))
          votes.set(k, entry);
      }
    }
    for (const e of list) {
      const { o, c } = e;
      if (c.path.every((p) => votes.get(o.slot + ":" + p) === e)) {
        const from = o.cell,
          rec = ctx.records.get(o.id);
        rec.moved = true;
        rec.newPlace = !o.history.includes(c.cell);
        o.cell = c.cell;
        o.facing = c.direction;
        ctx.costs.get(o.id).action = c.cost;
        if (rec.newPlace)
          o.pendingMove = { turn: w.turn, expires: w.turn + 3, cell: c.cell };
        o.history.push(c.cell);
        o.history = o.history.slice(-4);
        S.record(ctx, o, "move", { from, path: c.path });
      } else ctx.records.get(o.id).failure = "RESERVATION_LOST";
    }
    ctx.current = S.maps(w);
  }
  function combat(w, ctx) {
    const m = ctx.current || S.maps(w),
      blockers = new Set(
        w.organisms
          .filter((o) => ["main", "prey"].includes(S.spec(o).group))
          .map((o) => o.cell),
      ),
      byTarget = new Map();
    for (const o of w.organisms) {
      const c = ctx.intents.get(o.id);
      if (c.type !== "attack") continue;
      const target = m.byId.get(c.target),
        p = ctx.traits.get(o.id);
      if (
        !target ||
        target.HP <= 0 ||
        S.distance(w, o.cell, target.cell) > p.range ||
        !S.sight(
          w,
          o.cell,
          target.cell,
          S.distance(w, o.cell, target.cell) === 2 ? blockers : null,
        )
      ) {
        ctx.records.get(o.id).failure = "TARGET_LOST";
        continue;
      }
      const range = S.distance(w, o.cell, target.cell),
        A = power(w, o, "attack", ctx) * (range === 2 ? 0.85 : 1),
        D = power(w, target, "defense", ctx),
        damage = Math.max(1, Math.floor(A - 0.5 * D + 0.5)),
        mitigated = Math.max(0, Math.max(1, Math.floor(A + 0.5)) - damage);
      if (!byTarget.has(target.id)) byTarget.set(target.id, []);
      byTarget.get(target.id).push({ o, target, damage, mitigated });
      ctx.costs.get(o.id).action = c.cost;
      if (range === 2) o.attackReady = w.turn + 2;
      S.record(ctx, o, "attack", { target: target.id, to: target.cell });
    }
    for (const [id, hits] of byTarget) {
      const target = m.byId.get(id),
        total = hits.reduce((a, h) => a + h.damage, 0),
        actual = Math.min(target.HP, total);
      for (const h of hits) {
        const share = (actual * h.damage) / total;
        ctx.records.get(h.o.id).dealt += share;
        ctx.records.get(id).mitigated += h.mitigated;
      }
      ctx.records.get(id).damage += actual;
      ctx.records.get(id).hitBy = hits
        .slice()
        .sort(
          (a, b) => b.damage - a.damage || S.compare(a.o.id, b.o.id),
        )[0].o.id;
      target.HP = S.round(Math.max(0, target.HP - total));
    }
  }
  function care(w, ctx) {
    const m = S.maps(w),
      list = w.organisms
        .filter((o) => ctx.intents.get(o.id).type === "care")
        .map((o) => ({
          o,
          target: m.byId.get(ctx.intents.get(o.id).target),
          h: S.hash(w, "care/arbitration", w.turn, o.id),
        }))
        .sort((a, b) => a.h - b.h || S.compare(a.o.id, b.o.id));
    for (const { o, target } of list) {
      if (
        o.HP <= 0 ||
        !target ||
        target.HP <= 0 ||
        ctx.traits.get(target.id).capE - target.E < 1.8 - 1e-8 ||
        !S.oneStep(w, o.cell, target.cell)
      )
        continue;
      o.E = S.round(o.E - 2);
      target.E = S.round(target.E + 1.8);
      S.dissipate(w, 0.2);
      ctx.records.get(o.id).cared = true;
      S.record(ctx, o, "care", {
        target: target.id,
        to: target.cell,
        amount: 1.8,
      });
    }
  }
  function learn(w, ctx) {
    const m = S.maps(w),
      own = new Map();
    for (const o of w.organisms) {
      if (o.slot !== "main") continue;
      const rec = ctx.records.get(o.id),
        delta = Array(9).fill(0);
      if (rec.organic > 0) {
        if (rec.relieved) delta[2] += 2;
        if (rec.newPlace) delta[6]++;
        if (o.site && o.site.cell === o.cell && o.site.expires > w.turn)
          delta[5] += 2;
        o.site = { cell: o.cell, expires: w.turn + 8 };
        if (rec.moved && o.facing === ctx.old.get(o.id).facing) delta[7]++;
        if (rec.randomChanged && rec.newPlace) delta[8]++;
      }
      if (rec.dealt >= 2) delta[0] += 2;
      if (rec.damage >= 5) {
        delta[1] += 2;
        if (ctx.intents.get(o.id).type === "attack") delta[0]--;
        delta[8]--;
      }
      if (rec.crowding) delta[4] += 2;
      if (rec.cared) delta[3] += 2;
      if (
        rec.mitigated >= 2 &&
        S.nearby(w, o.cell).some((p) => m.main.get(p)?.species === o.species)
      )
        delta[3]++;
      const previous = o.survival;
      if (previous) {
        const enemy = m.byId.get(previous.enemy);
        if (!enemy || enemy.HP <= 0 || rec.damage > 0) o.survival = null;
        else if (w.turn === previous.turn + 1) {
          if (
            rec.moved &&
            (S.distance(w, o.cell, enemy.cell) >
              ctx.traits.get(enemy.id).range ||
              !S.sight(w, enemy.cell, o.cell))
          )
            previous.escaped = true;
          else o.survival = null;
        } else if (w.turn === previous.turn + 2) {
          if (previous.escaped) {
            delta[1] += 2;
            rec.escaped = true;
          }
          o.survival = null;
        }
      }
      if (rec.damage > 0 && rec.hitBy)
        o.survival = { enemy: rec.hitBy, turn: w.turn, escaped: false };
      rec.delta = delta.map((v) => S.clamp(v, -2, 2));
      own.set(o.id, rec.delta);
      rec.category =
        rec.dealt >= 2 || rec.mitigated >= 2
          ? 2
          : rec.escaped || (rec.moved && rec.organic > 0)
            ? 1
            : rec.organic > 0
              ? 0
              : null;
    }
    for (const o of w.organisms) {
      if (o.slot !== "main") continue;
      const rec = ctx.records.get(o.id),
        delta = own.get(o.id).slice();
      if (o.contactReady <= w.turn) {
        const contacts = [];
        for (const p of S.nearby(w, o.cell))
          if (S.oneStep(w, o.cell, p)) {
            const a = m.main.get(p);
            if (a?.species === o.species && own.has(a.id))
              own.get(a.id).forEach((v, i) => {
                if (v)
                  contacts.push({
                    v,
                    i,
                    h: S.hash(w, "learning/contact", w.turn, o.id, [a.id, i]),
                  });
              });
          }
        contacts.sort((a, b) => Math.abs(b.v) - Math.abs(a.v) || a.h - b.h);
        if (contacts.length) {
          delta[contacts[0].i] += Math.sign(contacts[0].v);
          o.contactReady = w.turn + 5;
          rec.contacted = true;
        }
      }
      o.weights = o.weights.map((v, i) =>
        S.clamp(v + S.clamp(delta[i], -2, 2), 0, 100),
      );
      for (const event of rec.information) {
        const age = w.turn - event.time,
          fresh =
            age < 5
              ? 1
              : age < 10
                ? 0.75
                : age < 15
                  ? 0.5
                  : age < 20
                    ? 0.25
                    : 0,
          context = event.env === w.tiles[o.cell].env ? 1 : 0.5;
        for (const component of event.values) {
          const d = S.clamp(
            component.value *
              (0.8 + 0.4 * o.dna.sensitivity) *
              Math.min(1, fresh * (event.retention || 1)) *
              context,
            -3,
            3,
          );
          o.weights[component.axis] = S.clamp(
            o.weights[component.axis] + d,
            0,
            100,
          );
        }
      }
      if (w.turn % 10 === 0)
        o.weights = o.weights.map(
          (v, i) =>
            v +
            Math.sign(o.birthWeights[i] - v) *
              Math.min(1, Math.abs(o.birthWeights[i] - v)),
        );
      o.weights = o.weights.map(S.round);
      if (o.pendingMove && o.pendingMove.expires <= w.turn)
        o.pendingMove = null;
    }
  }
  return {
    environmental,
    moveCost,
    power,
    visible,
    candidates,
    evaluate,
    choose,
    move,
    combat,
    care,
    learn,
  };
});
