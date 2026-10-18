(function (root, factory) {
  const node = typeof module === "object" && module.exports;
  const api = factory(
    node ? require("./state.js") : root.EcoState,
    node ? require("./nutrition.js") : root.EcoNutrition,
    node ? require("./behavior.js") : root.EcoBehavior,
    node ? require("./reproduction.js") : root.EcoReproduction,
    node ? require("./parasites.js") : root.EcoParasites,
  );
  if (node) module.exports = api;
  else root.EcoEngine = api;
})(globalThis, function (S, N, B, R, P) {
  "use strict";
  function summarize(w) {
    const counts = Object.fromEntries(S.D.species.map((s) => [s.id, 0])),
      phases = [0, 0, 0, 0],
      roles = { queen: 0, worker: 0, male: 0 },
      infectionStages = { first: 0, middle: 0, extra: 0, terminal: 0 },
      colonies = {};
    let main = 0,
      food = 0,
      Pcount = 0,
      Qcount = 0;
    for (const o of w.organisms) {
      counts[o.species]++;
      if (o.slot === "main") {
        main++;
        phases[o.phase - 1]++;
        if (o.species === "swarm") {
          roles[o.role]++;
          colonies[o.colony] = (colonies[o.colony] || 0) + 1;
        }
      } else food++;
      if (o.infection) {
        Pcount++;
        counts[o.infection.species]++;
        infectionStages[o.infection.stage]++;
        if (o.infection.q) {
          Qcount++;
          counts.hyperparasite++;
        }
      }
    }
    return {
      population: w.organisms.length,
      main,
      food,
      P: Pcount,
      Q: Qcount,
      resting: w.pending.length + w.carcasses.filter((a) => a.infection).length,
      counts,
      phases,
      roles,
      colonies,
      infectionStages,
      resources: w.resources.length,
      totals: S.totals(w),
    };
  }
  function context(w, observeId = null) {
    const ctx = {
      observeId,
      traits: new Map(),
      old: new Map(),
      intents: new Map(),
      costs: new Map(),
      records: new Map(),
      events: new Map(),
      ca: [],
      startResource: new Set(),
      exhausted: new Set(),
      harvestDead: new Set(),
      parents: new Set(),
      founders: new Set(),
      startInfections: new Map(),
      byParasite: new Map(),
      movedInfections: new Set(),
      births: [],
      deaths: [],
      children: [],
      transfers: 0,
      infectionFailures: 0,
    };
    for (const o of w.organisms) {
      ctx.traits.set(o.id, S.phenotype(w, o));
      ctx.old.set(o.id, {
        phase: o.phase,
        HP: o.HP,
        E: o.E,
        cell: o.cell,
        facing: o.facing,
      });
      ctx.records.set(o.id, {
        organic: 0,
        reserve: 0,
        heal: 0,
        G: 0,
        bites: 0,
        dealt: 0,
        mitigated: 0,
        damage: 0,
        moved: false,
        newPlace: false,
        light: 0,
        information: [],
        emitted: false,
        contacted: false,
        cared: false,
        relieved: false,
        category: null,
        delta: null,
      });
      if (o.infection) {
        const p = o.infection,
          q = p.q,
          entry = {
            p,
            q,
            stage: p.stage,
            counter: p.counter,
            qPhase: q?.phase || 0,
            qCounts: q ? q.counts.slice() : [0, 0, 0],
            full: false,
            qFull: false,
          };
        ctx.startInfections.set(o.id, entry);
        ctx.byParasite.set(p.id, entry);
      }
    }
    return ctx;
  }
  function prepare(w, ctx) {
    for (const o of w.organisms) {
      const s = S.spec(o),
        p = ctx.traits.get(o.id),
        light =
          s.group === "plant"
            ? 4 * w.tiles[o.cell].light * S.leafFactor(o)
            : s.id === "kelp"
              ? 1.5 * w.tiles[o.cell].light * [0, 1, 1.1, 1.2, 1.3][p.phase]
              : 0;
      const ageLight=light*p.ageFactors.light*(w.config.solarScale || 1);
      if (ageLight) {
        const add = Math.min(p.capE - o.E, ageLight);
        o.E = S.round(o.E + add);
        w.ledger.solar = S.round(w.ledger.solar + ageLight);
        S.dissipate(w, ageLight - add);
        ctx.records.get(o.id).light = ageLight;
        S.record(ctx, o, "light", { amount: add });
      }
      ctx.old.get(o.id).E = o.E;
      o.seen = o.seen.filter((a) => a.expires > w.turn);
      if (o.site?.expires <= w.turn) o.site = null;
      if (o.pendingMove?.expires <= w.turn) o.pendingMove = null;
    }
    const m = S.maps(w);
    for (const o of w.organisms) {
      const p = ctx.traits.get(o.id),
        neighborCount =
          o.slot === "main"
            ? S.nearby(w, o.cell).filter((c) => m.main.has(c)).length
            : 2,
        density =
          o.slot !== "main"
            ? 0
            : neighborCount <= 1
              ? 0.1
              : neighborCount <= 4
                ? 0
                : neighborCount <= 6
                  ? 1
                  : 2;
      let base =
        (p.maintenance *
          S.adjustment(w, o, "maintenance", w.tiles[o.cell].env, p.phase)) /
        (1 + S.trait(o, "maintenance", p.phase));
      ctx.costs.set(o.id, {
        action: 0,
        base,
        density,
        neighborCount,
        budget: Math.max(0, o.E - base - density - (o.infection ? 0.2 : 0)),
      });
    }
  }
  const priorities = {
    death: 0,
    birth: 1,
    growth: 1,
    infection: 2,
    attack: 3,
    feed: 4,
    care: 4,
    move: 5,
    defend: 6,
    light: 7,
  };
  function emptyTallies() {
    return {
      births: Object.fromEntries(S.D.species.map((s) => [s.id, 0])),
      deaths: Object.fromEntries(S.D.species.map((s) => [s.id, 0])),
      causes: { combat: 0, starvation: 0, harvest: 0, age: 0 },
      sources: {
        plant: 0,
        fungal: 0,
        animal: 0,
        mineral: 0,
        factor: 0,
        info: 0,
      },
      transfers: 0,
      infectionFailures: 0,
      information: { emissionTurns: 0, received: 0, mediated: 0 },
    };
  }
  function checkpoint(w) {
    return {
      turn: w.turn,
      main: w.stats.main,
      food: w.stats.food,
      P: w.stats.P,
      Q: w.stats.Q,
      counts: { ...w.stats.counts },
      phases: w.stats.phases.slice(),
      roles: { ...w.stats.roles },
      colonies: { ...w.stats.colonies },
      infectionStages: { ...w.stats.infectionStages },
      tallies: structuredClone(w.tallies),
      budgets: {
        totals: S.totals(w),
        soilM: S.round(w.tiles.reduce((n, t) => n + t.soilM, 0)),
        livingM: S.round(w.organisms.reduce((n, o) => n + o.M, 0)),
        resourceM: S.round(w.resources.reduce((n, a) => n + a.M, 0)),
        carcassM: S.round(w.carcasses.reduce((n, a) => n + a.M, 0)),
        Mloss: w.ledger.Mloss,
        solar: w.ledger.solar,
        sinks: w.ledger.sinks,
      },
    };
  }
  function finish(w, ctx) {
    w.tallies = w.tallies || emptyTallies();
    for (const id of ctx.births) w.tallies.births[id]++;
    for (const death of ctx.deaths) {
      w.tallies.deaths[death.species]++;
      w.tallies.causes[death.reason]++;
    }
    for (const list of ctx.events.values())
      for (const event of list)
        if (event.type === "feed")
          w.tallies.sources[event.tag] = S.round(
            (w.tallies.sources[event.tag] || 0) + event.amount,
          );
    for (const record of ctx.records.values()) {
      if (record.emitted) w.tallies.information.emissionTurns++;
      w.tallies.information.received += record.information.length;
    }
    w.tallies.information.mediated += ctx.mediated || 0;
    w.tallies.transfers += ctx.transfers;
    w.tallies.infectionFailures += ctx.infectionFailures;
    if (ctx.diagnostics) {
      ctx.diagnostics.failure = ctx.records.get(ctx.observeId)?.failure || null;
    }

    w.events = [];
    for (const [id, list] of ctx.events) {
      const feeds = list.filter((e) => e.type === "feed"),
        other = list.filter((e) => e.type !== "feed");
      if (feeds.length)
        other.push({
          ...feeds[0],
          supplies: feeds
            .slice(0, 2)
            .map((e) => ({ source: e.source, amount: e.amount, tag: e.tag })),
        });
      other.sort(
        (a, b) => (priorities[a.type] ?? 9) - (priorities[b.type] ?? 9),
      );
      w.events.push(...other.slice(0, 4));
    }
    w.diagnostics = ctx.diagnostics || null;
    w.last = {
      births: ctx.births.length,
      deaths: ctx.deaths.length,
      transfers: ctx.transfers,
      infectionFailures: ctx.infectionFailures,
      deathCauses: ctx.deaths,
    };
    if(w.config.ageModel==="life/1")w.last.ageCapacityLoss=ctx.ageCapacityLoss||0;
    w.stats = summarize(w);
    w.stopReason = null;
    if (w.initialMain > 0 && w.stats.main === 0 && !w.extinctNotified) {
      w.stopReason = "main-extinct";
      w.extinctNotified = true;
    }
    if (w.turn >= w.blockEnd) w.stopReason = "checkpoint";
    const offset = w.turn - (w.blockEnd - (w.config.blockTurns || 1000));
    if ((w.config.blockTurns === 500 ? [50,125,250,500] : [100,250,500,1000]).includes(offset)) {
      const initial = w.checkpoints.find((a) => a.turn === 0);
      const current = w.checkpoints.filter((a) => a.turn >= w.blockEnd - (w.config.blockTurns || 1000));
      w.checkpoints = [
        ...(initial ? [initial] : []),
        ...current.filter((a) => a.turn !== 0),
        checkpoint(w),
      ].slice(-6);
    }
    return w;
  }
  function create(input = {}) {
    const w = S.create(input);
    w.stats = summarize(w);
    w.last = {
      births: 0,
      deaths: 0,
      transfers: 0,
      infectionFailures: 0,
      deathCauses: [],
    };
    w.stopReason = null;
    w.tallies = emptyTallies();
    w.checkpoints = [checkpoint(w)];
    return w;
  }
  function beginTurn(previous, options = {}) {
    let w = structuredClone(previous), stage = 0, cancelled = false, failed = false;
    S.inheritGeometry(previous,w);
    if (w.stopReason === "checkpoint") {
      w.blockEnd += w.config.blockTurns || 1000;
      const initial = w.checkpoints.find((a) => a.turn === 0);
      w.checkpoints = [...(initial ? [initial] : []), checkpoint(w)];
    }
    w.turn++;
    const ctx = context(w, options.observeId);
    const labels = ["資源更新", "移動・採食・戦闘", "成長・繁殖"];
    function ensure() {
      if (cancelled || failed) throw Error("TURN_DISCARDED: 未確定の計算は破棄されました");
    }
    function advance() {
      ensure();
      if (stage === 3) return {phase:3,label:labels[2],done:true,world:w};
      try {
        if (stage === 0) {
          N.expireAndCA(w, ctx);
          prepare(w, ctx);
        } else if (stage === 1) {
          B.choose(w, ctx);
          B.move(w, ctx);
          B.combat(w, ctx);
          B.care(w, ctx);
          N.feed(w, ctx, P.transfer);
          N.settle(w, ctx, P.fee);
        } else {
          B.learn(w, ctx);
          P.contacts(w, ctx);
          P.mature(w, ctx);
          R.growth(w, ctx);
          R.reproduce(w, ctx);
          const drops = N.investAndDrops(w, ctx),
            minerals = N.mineralCandidates(w, ctx),
            information = P.infoCandidates(w, ctx);
          N.supply(w, ctx, [...drops, ...minerals, ...information]);
          P.reproduce(w, ctx);
          S.settleAge(w,ctx);
          finish(w, ctx);
        }
        stage++;
        return {phase:stage,label:labels[stage-1],done:stage===3,world:stage===3?w:null};
      } catch (error) { failed = true; throw error; }
    }
    function preview() {
      ensure();
      const copy = structuredClone(w);
      if (stage < 3) {
        copy.events = structuredClone([...ctx.events.values()].flat());
        copy.stats = summarize(copy);
        copy.diagnostics = null;
      }
      return copy;
    }
    // Synchronous read-only consumer for Worker serialization: no full-world clone.
    // postMessage copies each patch before the next advance can mutate this world.
    function display() {
      ensure();
      return stage===3?w:{...w,events:[...ctx.events.values()].flat(),diagnostics:null};
    }
    return {advance,preview,display,cancel(){cancelled=true;w=null;}};
  }
  function step(previous, options = {}) {
    const turn = beginTurn(previous, options);
    let result;
    do { result = turn.advance(); } while (!result.done);
    return result.world;
  }
  function fingerprint(w) {
    const copy = structuredClone(w);
    delete copy.diagnostics;
    delete copy.events;
    delete copy.warnings;
    copy.organisms.sort((a, b) => S.compare(a.id, b.id));
    copy.resources.sort((a, b) => a.cell - b.cell || S.compare(a.kind, b.kind));
    copy.carcasses.sort((a, b) => S.compare(a.id, b.id));
    copy.messages.sort((a, b) => a.cell - b.cell);
    copy.pending.sort((a, b) => S.compare(a.id, b.id));
    return S.sha256(S.stable(copy));
  }
  function invariants(w) {
    const errors = [],
      main = new Set(),
      food = new Set(),
      ids = new Set(),
      resourceKinds = new Map();
    for (const o of w.organisms) {
      const occupied = o.slot === "main" ? main : food;
      if (occupied.has(o.cell)) errors.push("SLOT_DUPLICATE:" + o.id);
      occupied.add(o.cell);
      if (ids.has(o.id)) errors.push("ID_DUPLICATE:" + o.id);
      ids.add(o.id);
      if (w.tiles[o.cell]?.blocked) errors.push("BLOCKED:" + o.id);
      if (
        [o.E, o.B, o.M, o.HP, o.G].some(
          (v) => !Number.isFinite(v) || v < -0.000001,
        )
      )
        errors.push("BUDGET:" + o.id);
      if(w.config.ageModel==="life/1"){
        if(!Number.isFinite(o.birthLife)||o.birthLife<=0)errors.push("AGE_BASIS:"+o.id);
        else if(o.HP>S.phenotype(w,o).maxHP+.000001)errors.push("AGE_HP:"+o.id);
      }
      if (o.infection) {
        const p = o.infection;
        if (p.hostId !== o.id) errors.push("HOST:" + o.id);
        if (ids.has(p.id)) errors.push("ID_DUPLICATE:" + p.id);
        ids.add(p.id);
        if (p.q) {
          if (p.q.hostId !== p.id) errors.push("Q_HOST:" + o.id);
          if (ids.has(p.q.id)) errors.push("ID_DUPLICATE:" + p.q.id);
          ids.add(p.q.id);
        }
      }
    }
    for (const a of w.resources) {
      if (!resourceKinds.has(a.cell)) resourceKinds.set(a.cell, new Set());
      const set = resourceKinds.get(a.cell);
      if (set.has(a.kind)) errors.push("RESOURCE_DUPLICATE");
      set.add(a.kind);
      if (
        set.size > 3 ||
        a.q > S.FOOD[a.kind].cap ||
        a.q <= 0 ||
        a.E < 0 ||
        a.M < 0
      )
        errors.push("RESOURCE_CAP");
    }
    const totals = S.totals(w),
      Eerror = S.round(
        totals.E + w.ledger.sinks - w.ledger.initialE - w.ledger.solar,
      ),
      Merror = S.round(totals.M + w.ledger.Mloss - w.ledger.initialM);
    if (Math.abs(Eerror) > 0.002) errors.push("ENERGY:" + Eerror);
    if (Math.abs(Merror) > 0.002) errors.push("MATERIAL:" + Merror);
    return errors;
  }
  return {
    create,
    step,
    beginTurn,
    summarize,
    fingerprint,
    invariants,
    context,
    prepare,
    finish,
    S,
    N,
    B,
    R,
    P,
  };
});
