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
      if(w.config.ecologyRevision === "observation/4.1" && source.payloadExpires>w.turn && !target.infection && p.counter>=required[p.stage]){
        const first=p.species === "tideparasite" ? "algae" : "grass",prey=p.species === "tideparasite" ? "waterbug" : "grassbug";
        if(p.stage === "first" && target.species === prey)stage="middle";
        else if(["middle","extra","terminal"].includes(p.stage) && terminal(p,target))stage=S.ageInfo(target).stage !== "juvenile" ? "terminal" : "extra";
        else if(p.stage === "terminal" && target.species===first)stage="first";
      }
      if (!source.payloadExpires || source.payloadExpires <= w.turn) return;
      if (
        !target.infection &&
        source.species !== target.species &&
        terminal(p, target)
      ) {
        if (p.stage === "middle")
          stage = (w.config.ecologyRevision === "observation/4.1" ? S.ageInfo(target).stage !== "juvenile" : target.phase >= 3) ? "terminal" : "extra";
        else if (p.stage === "extra" && (w.config.ecologyRevision === "observation/4.1" ? S.ageInfo(target).stage !== "juvenile" : target.phase >= 3)) stage = "terminal";
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
  // Paid colony dispersal; all donors are frozen at the beginning of the turn.
  function contactStage(p, target, matureTerminal, ageBased = false) {
    const first = p.species === "tideparasite" ? "algae" : "grass";
    const middle = p.species === "tideparasite" ? "waterbug" : "grassbug";
    if (target.species === first && (p.stage === "first" || matureTerminal)) return "first";
    if (target.species === middle && (["first", "middle"].includes(p.stage) || matureTerminal)) return "middle";
    if (matureTerminal && terminal(p, target)) return (ageBased ? S.ageInfo(target).stage !== "juvenile" : target.phase >= 3) ? "terminal" : "extra";
    if (p.stage === "extra" && terminal(p, target) && (ageBased ? S.ageInfo(target).stage === "juvenile" : target.phase < 3)) return "extra";
    return null;
  }
  function contacts(w, ctx) {
    if (w.contactTurn === w.turn) return;
    w.contactTurn = w.turn;
    const m = S.maps(w), touches = new Map(), proposals = [];
    for (const source of w.organisms) {
      const p = source.infection, entry = p && ctx.byParasite.get(p.id);
      if (!entry || source.HP <= 0 || ctx.movedInfections.has(p.id) || entry.counter < required[entry.stage] || (p.contactReady || 0) > w.turn) continue;
      const matureTerminal = entry.stage === "terminal", radius = matureTerminal ? 2 : 1;
      for (const cell of S.nearby(w, source.cell, radius, true)) {
        for (const target of [m.main.get(cell), m.food.get(cell)]) {
          if (!target || target.HP <= 0 || target.infection || !S.sight(w, source.cell, target.cell)) continue;
          const stage = contactStage(p, target, matureTerminal, w.config.ecologyRevision === "observation/4.1");
          if (!stage) continue;
          const previous = (target.contactExposure || []).find(e => e.source === p.id && w.turn-e.time < 8);
          const hits = Math.min(3, (previous?.hits || 0) + 1);
          if (!touches.has(target.id)) touches.set(target.id, []);
          touches.get(target.id).push({source:p.id,time:w.turn,hits});
          if (hits >= 3 && p.E >= .12) proposals.push({source,p,target,stage,matureTerminal,h:S.hash(w,"parasite/contact",w.turn,p.id,target.id)});
        }
      }
    }
    for (const target of w.organisms) {
      if (target.infection) { if (target.contactExposure) target.contactExposure=[]; continue; }
      const recent = (touches.get(target.id) || []).sort((a,b)=>b.hits-a.hits||S.compare(a.source,b.source)).slice(0,4);
      if (recent.length || target.contactExposure) target.contactExposure=recent;
    }
    proposals.sort((a,b)=>a.h-b.h||S.compare(a.target.id,b.target.id));
    const used = new Map(), taken = new Set();
    for (const c of proposals) {
      const n=used.get(c.p.id)||0;
      if(taken.has(c.target.id)||c.target.infection||n >= (c.matureTerminal?3:1)||c.p.E < .12)continue;
      const child=S.infection(w,c.p.species,c.target.id,w.turn,S.sha256(c.p.id+":"+c.target.id+":contact").slice(0,16));
      child.stage=c.stage;child.E=.04;
      c.p.E=S.round(c.p.E-.12);S.dissipate(w,.08);
      if(w.config.ecologyRevision !== "observation/4.1" && c.p.q && ctx.byParasite.get(c.p.id).qPhase>=2 && c.p.q.E>=.06){
        c.p.q.E=S.round(c.p.q.E-.06);child.q=S.hyper(w,child.id,w.turn);child.q.E=.02;S.dissipate(w,.04);ctx.births.push("hyperparasite");
      }
      c.target.infection=child;c.target.contactExposure=[];ctx.births.push(child.species);ctx.transfers++;
      taken.add(c.target.id);used.set(c.p.id,n+1);ctx.movedInfections.add(child.id);
      S.record(ctx,c.target,"infection",{parasite:child.id,stage:c.stage,route:"contact"});
    }
    for(const c of proposals)if(used.has(c.p.id))c.p.contactReady=w.turn+(c.matureTerminal?3:18);
  }
  function fee(w, ctx, host) {
    const entry = ctx.startInfections.get(host.id);
    if (!entry) return;
    if(w.config.ecologyRevision === "observation/4.1") return upkeep(w,ctx,host,entry);
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
      const suppressed = w.config.ecologyRevision !== "observation/4.1" && entry.qPhase >= 2,
        parity = (w.turn + S.hash(w, "parasite/phase", 0, p.id)) % 2 === 0;
      if (entry.full && (!suppressed || parity))
        p.counter = Math.min(required[p.stage], p.counter + 1);
      if (w.config.ecologyRevision === "observation/4.1" && p.stage === "terminal" && p.counter >= required.terminal && p.matureAt === undefined) p.matureAt=w.turn;
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
      if (w.config.ecologyRevision !== "observation/4.1" && p.q && entry.qPhase === 3 && p.q.E >= 0.1) {
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
      p.ready = w.turn + (w.config.ecologyRevision !== "observation/4.1" && entry.qPhase >= 2 ? 8 : 4) + 1;
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
  function upkeep(w,ctx,host,entry) {
    const p=entry.p;
    // The beginning-of-turn host pays, even after trophic transfer; a cleared colony pays nothing.
    if(!w.organisms.some(o=>o.infection===p) && !w.carcasses.some(c=>c.infection===p))return;
    p.load ??= .5;
    const fee=.12*p.load,paid=Math.min(host.E,fee),add=Math.min(2-p.E,paid);
    host.E=S.round(host.E-paid);p.E=S.round(p.E+add);S.dissipate(w,paid-add);
    const cost=.04,maintenance=Math.min(p.E,cost);p.E=S.round(p.E-maintenance);S.dissipate(w,maintenance);
    p.stress=maintenance+1e-8<cost?(p.stress||0)+1:Math.max(0,(p.stress||0)-1);
    p.load=S.round(S.clamp(p.load+(maintenance>=cost?.01:-.08),0,1));
    entry.full=paid+1e-8>=fee && maintenance+1e-8>=cost;
    if(p.q){feedQ(w,p.q,host.cell);entry.qFull=p.q?.E>=.01;}
    if(p.load<=0||p.stress>=8){S.loseInfection(w,p);const carrier=w.organisms.find(o=>o.infection===p);if(carrier)carrier.infection=null;S.record(ctx,host,"clear",{target:host.id,parasite:p.id,reason:"maintenance"});}
  }
  function feedQ(w,q,cell) {
    // External information resource, never an extra direct tax on host or primary parasite.
    const a=w.resources.find(a=>a.cell===cell&&a.kind==="info"&&a.E>0);
    if(a){const n=Math.min(.03,a.E,1-q.E);q.E=S.round(q.E+n);a.E=S.round(a.E-n);}
    const cost=Math.min(q.E,.001);q.E=S.round(q.E-cost);S.dissipate(w,cost);
  }
  function clear(w,ctx) {
    const m=S.maps(w);
    for(const o of w.organisms){
      const intent=ctx.intents.get(o.id),cost=ctx.costs.get(o.id);
      if(o.HP<=0)continue;
      if(intent?.type==="groom"){
        const target=m.byId.get(intent.target),p=target?.infection;
        if(p && p.location === "external" && target.HP>0 && target.species===o.species && S.oneStep(w,o.cell,target.cell) && cost.budget-cost.action>=.3){
          cost.action+=.3;p.load=S.round(Math.max(0,(p.load??.5)-.22));
          S.record(ctx,o,"clear",{target:target.id,parasite:p.id,species:p.species,reason:"groom"});
          if(p.load<=0){S.loseInfection(w,p);target.infection=null;}
        }
      }
      const p=o.infection;
      if(p && cost.budget-cost.action>=.04){
        // Bounded, paid immunity; no guaranteed clearance or physical damage to the host.
        cost.action+=.04;
        if(S.r(w,"parasite/immunity",w.turn,o.id)<.006){p.load=S.round(Math.max(0,(p.load??.5)-.3));if(p.load<=0){S.loseInfection(w,p);o.infection=null;S.record(ctx,o,"clear",{target:o.id,parasite:p.id,species:p.species,reason:"immunity"});}}
      }
    }
  }
  function windowOpen(w,p){return p.stage==="terminal" && Number.isInteger(p.matureAt) && w.turn>p.matureAt && w.turn<=p.matureAt+3;}
  function search(w,ctx){
    const current=w.searchQ || [],next=[],born=[];
    const infected=w.organisms.filter(o=>o.infection && !o.infection.q && windowOpen(w,o.infection) && !ctx.movedInfections.has(o.infection.id));
    const occupied=new Set();
    for(const q of current.slice().sort((a,b)=>S.compare(a.id,b.id))){
      feedQ(w,q,q.cell);
      if(q.E<=0 || q.expires<=w.turn){S.dissipate(w,q.E);ctx.deaths.push({species:"hyperparasite",reason:"age"});continue;}
      const target=infected.filter(o=>!occupied.has(o.id)&&S.distance(w,q.cell,o.cell)<=1&&S.sight(w,q.cell,o.cell)).sort((a,b)=>S.compare(a.id,b.id))[0];
      if(target && q.E>=.02){q.E=S.round(q.E-.02);S.dissipate(w,.02);q.hostId=target.infection.id;delete q.cell;delete q.expires;target.infection.q=q;occupied.add(target.id);S.record(ctx,target,"infection",{parasite:q.id,species:"hyperparasite",stage:"window",target:target.infection.id});continue;}
      const map=S.maps(w),cue=S.nearby(w,q.cell,3,true).map(c=>map.main.get(c)).filter(o=>o?.infection?.stage==="terminal"&&o.infection.counter>=5&&S.sight(w,q.cell,o.cell)).sort((a,b)=>S.distance(w,q.cell,a.cell)-S.distance(w,q.cell,b.cell)||S.compare(a.id,b.id))[0];
      const moves=S.nearby(w,q.cell).filter(c=>S.oneStep(w,q.cell,c));
      if(moves.length && q.E>.001){const c=moves.sort((a,b)=>(cue?S.distance(w,a,cue.cell)-S.distance(w,b,cue.cell):0)||S.hash(w,"hyper/search",w.turn,q.id,a)-S.hash(w,"hyper/search",w.turn,q.id,b))[0];q.cell=c;q.E=S.round(q.E-.001);S.dissipate(w,.001);}
      next.push(q);
    }
    for(const host of w.organisms){const p=host.infection,q=p?.q;if(!q)continue;
      if(q.E<=0){S.dissipate(w,q.E);p.q=null;ctx.deaths.push({species:"hyperparasite",reason:"starvation"});continue;}
      if(q.phase>=3&&q.ready<=w.turn&&q.E>=.12 && next.length+born.length<256){const child=S.hyper(w,q.id,w.turn);child.cell=host.cell;child.E=.08;child.expires=w.turn+40;q.E=S.round(q.E-.1);q.ready=w.turn+12;S.dissipate(w,.02);born.push(child);ctx.births.push("hyperparasite");}
    }
    w.searchQ=[...next,...born];
  }
  return {
    clear,search,windowOpen,
    required,
    contacts,
    contactStage,
    terminal,
    transfer,
    fee,
    mature,
    prepareMessages,
    infoCandidates,
    reproduce,
  };
});
