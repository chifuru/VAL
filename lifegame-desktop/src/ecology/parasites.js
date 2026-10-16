(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoParasites = api;
})(globalThis, function (S) {
  "use strict";
  const required = { first: 4, middle: 6, extra: 6, terminal: 8 };
  function terminal(p, o) {
    if (S.spec(o).group !== "main") return false;
    return p.species === "tideparasite"
      ? ["abyss", "abyssshell", "jelly", "whale", "cephalopod"].includes(
          o.species,
        )
      : ["plant", "general"].includes(S.spec(o).diet);
  }
  function transfer(w, ctx, source, target, type) {
    const p = source.infection;
    if (!p) return;
    let stage = null;
    if (type === "plant") {
      if (p.stage !== "first" || p.counter < 4 || target.infection) return;
      if (
        (p.species === "tideparasite" && target.species === "waterbug") ||
        (p.species === "leafparasite" && target.species === "grassbug")
      )
        stage = "middle";
      else return;
    } else if (type === "carcass") {
      if (!source.payloadExpires || source.payloadExpires <= w.turn) return;
      if (
        !target.infection &&
        source.species !== target.species &&
        terminal(p, target)
      ) {
        if (p.stage === "middle")
          stage = target.phase >= 3 ? "terminal" : "extra";
        else if (p.stage === "extra" && target.phase >= 3) stage = "terminal";
      }
      if (!stage) {
        S.loseInfection(w, p);
        source.infection = null;
        ctx.infectionFailures++;
        return;
      }
    }
    if (stage) {
      source.infection = null;
      target.infection = p;
      p.hostId = target.id;
      p.stage = stage;
      p.counter = 0;
      ctx.movedInfections.add(p.id);
      ctx.transfers++;
      S.record(ctx, target, "infection", { parasite: p.id, stage });
    }
  }
  function fee(w, ctx, host) {
    const entry = ctx.startInfections.get(host.id);
    if (!entry) return;
    const { p, q } = entry,
      paid = Math.min(host.E, 0.2);
    host.E = S.round(host.E - paid);
    host.HP = S.round(Math.max(0, host.HP - 2 * (0.2 - paid)));
    const share = q ? Math.min(0.05, paid) : 0,
      part = paid - share,
      addP = Math.min(2 - p.E, part),
      addQ = q ? Math.min(1 - q.E, share) : 0;
    p.E = S.round(p.E + addP);
    if (q) q.E = S.round(q.E + addQ);
    S.dissipate(w, paid - addP - addQ);
    entry.full = paid >= 0.2 - 1e-8;
    entry.qFull = share >= 0.05 - 1e-8;
  }
  function mature(w, ctx) {
    for (const host of w.organisms) {
      const p = host.infection;
      if (!p || ctx.movedInfections.has(p.id)) continue;
      const entry = ctx.byParasite.get(p.id);
      if (!entry) continue;
      const suppressed = entry.qPhase >= 2,
        parity = (w.turn + S.hash(w, "parasite/phase", 0, p.id)) % 2 === 0;
      if (entry.full && (!suppressed || parity))
        p.counter = Math.min(required[p.stage], p.counter + 1);
      if (p.q && entry.qFull) {
        const q = p.q;
        q.counter++;
        if (entry.qPhase === 1 && q.counter >= 4) {
          q.phase = 2;
          q.counter = 0;
        } else if (entry.qPhase === 2 && q.counter >= 8 && q.E >= 0.2) {
          q.E = S.round(q.E - 0.2);
          S.dissipate(w, 0.2);
          q.phase = 3;
          q.counter = 0;
          const values = entry.qCounts
            .map((value, i) => ({
              value,
              i,
              h: S.hash(w, "hyper/special", w.turn, q.id, null, i),
            }))
            .sort((a, b) => b.value - a.value || a.h - b.h);
          q.special = ["rectify", "retain", "modulate"][values[0].i];
          q.modulation =
            Math.floor(S.r(w, "hyper/modulation", w.turn, q.id) * 3) - 1;
        }
      }
    }
  }
  function prepareMessages(w, ctx) {
    const byCell = new Map(w.messages.map((a) => [a.cell, a]));
    for (const o of w.organisms) {
      const rec = ctx.records.get(o.id);
      if (!rec?.delta?.some(Boolean)) continue;
      const raw = rec.delta
          .map((value, axis) => ({
            value,
            axis,
            h: S.hash(w, "information/component", w.turn, o.id, null, axis),
          }))
          .filter((c) => c.value)
          .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.h - b.h)
          .slice(0, 2),
        noise = S.r(w, "information/noise", w.turn, o.id) < 0.1;
      const values = raw.map((c) => ({
        axis: c.axis,
        value: S.round(
          S.clamp(
            (noise ? -Math.sign(c.value) * 3 : c.value) *
              (0.8 + 0.4 * o.dna.sensitivity),
            noise ? -3 : -2,
            noise ? 3 : 2,
          ),
        ),
      }));
      const event = {
        id: w.turn + ":" + o.id + ":experience:0",
        sourceId: o.id,
        cell: o.cell,
        env: w.tiles[o.cell].env,
        time: w.turn,
        expires: w.turn + 8,
        values,
        noise,
        retention: 1,
        mediator: null,
      };
      byCell.set(o.cell, event);
    }
    w.messages = [...byCell.values()].filter((a) => a.expires > w.turn);
  }
  function infoCandidates(w, ctx) {
    prepareMessages(w, ctx);
    const m = S.maps(w),
      messageMap = new Map(w.messages.map((a) => [a.cell, a])),
      out = [];
    for (const c of ctx.ca.filter(
      (c) => c.kind === "info" && !ctx.exhausted.has(c.cell + ":info"),
    )) {
      let event, source;
      if (c.growth) {
        if (!w.resources.includes(c.growth) || !c.growth.event) continue;
        event = c.growth.event;
        source = m.byId.get(event.sourceId);
        if (
          !source ||
          w.turn - event.time >= 8 ||
          S.distance(w, c.cell, source.cell) > 1
        )
          continue;
      } else {
        const messages = S.nearby(w, c.cell, 1, true)
          .map((p) => messageMap.get(p))
          .filter(
            (a) =>
              a &&
              a.expires > w.turn &&
              m.byId.has(a.sourceId) &&
              S.distance(w, c.cell, m.byId.get(a.sourceId).cell) <= 1,
          );
        messages.sort(
          (a, b) =>
            b.time - a.time ||
            b.values.reduce((s, v) => s + Math.abs(v.value), 0) -
              a.values.reduce((s, v) => s + Math.abs(v.value), 0) ||
            S.hash(w, "information/source", w.turn, a.sourceId, c.cell) -
              S.hash(w, "information/source", w.turn, b.sourceId, c.cell),
        );
        event = messages[0];
        if (!event) continue;
        source = m.byId.get(event.sourceId);
      }
      out.push({
        ...c,
        source,
        costE: 0.1 * c.q,
        costB: 0,
        costM: 0,
        E: 0.05 * c.q,
        M: 0,
        G: 0,
        expires: event.time + 20,
        event: structuredClone(event),
        fit: event.env === w.tiles[c.cell].env ? 2 : 1,
      });
    }
    const byQ = new Map();
    for (const c of out) {
      if (c.growth) continue;
      const p = c.source.infection,
        q = p?.q,
        entry = p && ctx.byParasite.get(p.id);
      if (
        !q ||
        !entry ||
        entry.qPhase !== 3 ||
        ctx.movedInfections.has(p.id) ||
        q.ready > w.turn ||
        q.E < 0.02 ||
        q.seen.some((a) => a.id === c.event.id && a.expires > w.turn)
      )
        continue;
      const key = q.id,
        h = S.hash(w, "supply/arbitration", w.turn, c.source.id, [
          c.cell,
          c.kind,
        ]),
        capacity = (c.source.E - 5) / c.costE;
      c._opRank = [-c.fit, -capacity, h];
      const old = byQ.get(key);
      if (
        !old ||
        c._opRank.some(
          (v, i) =>
            v !== old._opRank[i] &&
            c._opRank.slice(0, i).every((x, j) => x === old._opRank[j]) &&
            v < old._opRank[i],
        )
      )
        byQ.set(key, c);
    }
    for (const c of byQ.values()) {
      const q = c.source.infection.q;
      c.opQ = q;
      c.event.mediator = { id: q.id, special: q.special };
      if (q.special === "retain") c.event.retention = 1.25;
      else {
        const candidates = c.event.values
          .map((v) => ({
            v,
            h: S.hash(w, "hyper/component", w.turn, q.id, c.event.id, v.axis),
          }))
          .sort(
            (a, b) => Math.abs(b.v.value) - Math.abs(a.v.value) || a.h - b.h,
          );
        if (candidates.length) {
          const v = candidates[0].v;
          v.value =
            q.special === "rectify"
              ? v.value * 0.5
              : S.clamp(v.value + q.modulation, -3, 3);
        }
      }
    }
    return out;
  }
  function reproduce(w, ctx) {
    // Select from one frozen host snapshot. A losing parent never retries another host.
    const vacant = w.organisms.filter((o) => !o.infection),
      proposals = [];
    for (const host of w.organisms) {
      const p = host.infection,
        entry = p && ctx.byParasite.get(p.id);
      if (
        !p ||
        !entry ||
        ctx.movedInfections.has(p.id) ||
        entry.stage !== "terminal" ||
        entry.counter < 8 ||
        p.ready > w.turn ||
        p.E < 0.1 ||
        w.pending.some((a) => a.parentId === p.id)
      )
        continue;
      const first = p.species === "tideparasite" ? "algae" : "grass",
        target = vacant
          .filter(
            (o) => o.species === first && S.distance(w, host.cell, o.cell) <= 1,
          )
          .sort(
            (a, b) =>
              S.hash(w, "parasite/offspring-host", w.turn, p.id, a.id) -
              S.hash(w, "parasite/offspring-host", w.turn, p.id, b.id),
          )[0];
      proposals.push({
        host,
        p,
        entry,
        target,
        h: S.hash(w, "parasite/host-vote", w.turn, p.id, target?.id || null),
      });
    }
    const votes = new Map();
    for (const c of proposals)
      if (c.target) {
        const old = votes.get(c.target.id);
        if (
          !old ||
          c.h < old.h ||
          (c.h === old.h && S.compare(c.p.id, old.p.id) < 0)
        )
          votes.set(c.target.id, c);
      }
    for (const { host, p, entry, target, h } of proposals) {
      if (target && votes.get(target.id)?.p !== p) continue;
      const child = S.infection(w, p.species, null, w.turn, p.id);
      ctx.births.push(child.species);
      p.E = S.round(p.E - 0.1);
      S.dissipate(w, 0.1);
      if (p.q && entry.qPhase === 3 && p.q.E >= 0.1) {
        p.q.E = S.round(p.q.E - 0.1);
        S.dissipate(w, 0.1);
        child.q = S.hyper(w, child.id, w.turn);
        ctx.births.push("hyperparasite");
      }
      if (target) {
        child.hostId = target.id;
        target.infection = child;
        S.record(ctx, target, "infection", {
          parasite: child.id,
          stage: "first",
        });
      } else
        w.pending.push({
          id: "candidate:" + child.id,
          parentId: p.id,
          cell: host.cell,
          expires: w.turn + 8,
          infection: child,
        });
      p.ready = w.turn + (entry.qPhase >= 2 ? 8 : 4) + 1;
    }
    const pendingVotes = new Map(),
      pendingChoices = [];
    for (const pending of w.pending) {
      const first =
          pending.infection.species === "tideparasite" ? "algae" : "grass",
        child = (ctx.children || [])
          .filter(
            (o) =>
              o.species === first &&
              !o.infection &&
              S.distance(w, pending.cell, o.cell) <= 1,
          )
          .sort(
            (a, b) =>
              S.hash(w, "parasite/pending", w.turn, pending.id, a.id) -
              S.hash(w, "parasite/pending", w.turn, pending.id, b.id),
          )[0];
      if (child) {
        const c = {
          pending,
          child,
          h: S.hash(w, "parasite/pending-vote", w.turn, pending.id, child.id),
        };
        pendingChoices.push(c);
        const old = pendingVotes.get(child.id);
        if (!old || c.h < old.h) pendingVotes.set(child.id, c);
      }
    }
    for (const c of pendingChoices)
      if (pendingVotes.get(c.child.id) === c) {
        c.child.infection = c.pending.infection;
        c.child.infection.hostId = c.child.id;
        w.pending = w.pending.filter((a) => a !== c.pending);
        S.record(ctx, c.child, "infection", {
          parasite: c.child.infection.id,
          stage: "first",
        });
      }
    for (const host of w.organisms) {
      const p = host.infection,
        q = p?.q,
        entry = p && ctx.byParasite.get(p.id),
        rec = ctx.records.get(host.id);
      if (!q || !entry || ctx.movedInfections.has(p.id) || !rec) continue;
      const signals = [rec.emitted, rec.contacted, rec.information.length > 0];
      q.counts = q.counts.map((v, i) => Math.min(8, v + (signals[i] ? 1 : 0)));
      q.seen = q.seen.filter((a) => a.expires > w.turn);
    }
  }
  return {
    required,
    terminal,
    transfer,
    fee,
    mature,
    prepareMessages,
    infoCandidates,
    reproduce,
  };
});
