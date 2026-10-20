(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoNutrition = api;
})(globalThis, function (S) {
  "use strict";
  function efficiency(o, tag, phase = o.phase) {
    const s = S.spec(o);
    if (s.group === "prey") return tag === "plant" ? 0.65 : 0;
    if (s.group === "fungus") return tag === "mineral" ? 0.5 : 0.7;
    if (s.group === "plant") return tag === "mineral" ? 0.5 : 0;
    const d = S.D.diets[s.diet].factors,
      factor = d[["plant", "fungal", "animal", "mineral"].indexOf(tag)] || 1;
    return tag === "mineral"
      ? Math.min(
          1,
          0.5 *
            factor *
            (0.9 + 0.2 * o.dna.skin) *
            (1 + S.trait(o, "mineral", phase)),
        )
      : Math.min(
          0.95,
          0.5 *
            factor *
            (0.9 + 0.2 * o.dna.aptitude) *
            (tag === "plant" ? 1 + S.trait(o, "plant", phase) : 1) *
            (o.branch3 === 0 && o.branch4 === 0 ? 1.1 : 1) *
            (s.id === "precocial" && o.phase === 3 && o.branch3 === 0
              ? 1.05
              : 1),
        );
  }
  function absorb(w, o, amount, tag, ctx, options = {}) {
    const beforeE = o.E,
      beforeHP = o.HP,
      p = ctx.traits.get(o.id) || S.phenotype(w, o),
      phase = p.phase;
    let eta = efficiency(o, tag, phase);
    if (options.algae)
      eta = Math.min(0.95, eta * (1 + S.trait(o, "algae", phase)));
    if (tag === "factor")
      eta = Math.min(
        0.95,
        0.5 * (0.9 + 0.2 * o.dna.aptitude) * (1 + S.trait(o, "factor", phase)),
      );
    const e = S.round(amount.E * (tag === "info" ? 1 : eta)),
      m = S.round(amount.M * efficiency(o, "mineral", phase));
    S.dissipate(w, amount.E - e);
    const addM = Math.min(p.capM - o.M, m);
    o.M = S.round(o.M + addM);
    S.addSoil(w, options.cell ?? o.cell, amount.M - m);
    S.addSoil(w, o.cell, m - addM);
    const organic = ["plant", "fungal", "animal"].includes(tag),
      main = S.spec(o).group === "main";
    let remaining = e,
      healed = 0;
    if (organic && main) {
      const reserve = Math.min(remaining, Math.max(0, 35 - o.E));
      o.E = S.round(o.E + reserve);
      remaining = S.round(remaining - reserve);
      let rate = Math.min(
        0.75,
        0.5 *
          (options.healing || 1) *
          p.ageFactors.healing *
          (1 + S.trait(o, "healing", phase)) *
          (o.branch3 === 0 && o.branch4 === 1 ? 1.2 : 1),
      );
      healed = Math.min(p.maxHP - o.HP, remaining * rate);
      const used = S.round(healed / rate);
      o.HP = S.round(o.HP + healed);
      remaining = S.round(Math.max(0, remaining - used));
      S.dissipate(w, used);
    }
    const addE = Math.min(Math.max(0, p.capE - o.E), remaining);
    o.E = S.round(o.E + addE);
    remaining = S.round(remaining - addE);
    if (organic && !main && S.spec(o).group !== "plant" && remaining > 0) {
      healed = Math.min(
        p.maxHP - o.HP,
        remaining *
          Math.min(0.75, 0.5 * (options.healing || 1) * p.ageFactors.healing),
      );
      const used = S.round(
        healed /
          Math.min(0.75, 0.5 * (options.healing || 1) * p.ageFactors.healing),
      );
      o.HP = S.round(o.HP + healed);
      remaining = S.round(Math.max(0, remaining - used));
      S.dissipate(w, used);
    }
    S.dissipate(w, remaining);
    const rec = ctx.records.get(o.id);
    if (organic && main) {
      let g = options.carcass
        ? amount.G * eta
        : e * (tag === "animal" ? 1 + S.trait(o, "animalG", phase) : 1);
      if (o.factor && o.factor.expires > w.turn && e > 0) {
        g += o.factor.level;
        o.factor = null;
      }
      const addG = Math.min(300 - o.G, g);
      o.G = S.round(o.G + addG);
      if (rec) {
        rec.relieved = rec.relieved || (beforeE < 35 && o.E >= 35);
        rec.organic += e;
        rec.reserve += Math.max(0, o.E - beforeE);
        rec.heal += Math.max(0, o.HP - beforeHP);
        rec.G += addG;
      }
    }
    if (tag === "factor" && amount.E > 0) {
      const level = options.level || 1;
      if (!o.factor || o.factor.expires <= w.turn || level > o.factor.level)
        o.factor = { level, expires: w.turn + 3 };
    }
    return { e, m, organic, healed };
  }
  function removeResource(w, a) {
    S.addSoil(w, a.cell, a.M || 0);
    S.dissipate(w, a.E || 0);
  }
  function expireAndCA(w, ctx) {
    const t = w.turn;
    w.resources = w.resources.filter((a) => {
      if (a.expires !== null && a.expires <= t) {
        removeResource(w, a);
        return false;
      }
      return true;
    });
    w.carcasses = w.carcasses.filter((a) => {
      if (a.payloadExpires && a.payloadExpires <= t) {
        S.loseInfection(w, a.infection);
        a.infection = null;
      }
      if (a.expires <= t) {
        removeResource(w, a);
        S.loseInfection(w, a.infection);
        return false;
      }
      return true;
    });
    w.pending = w.pending.filter((a) => {
      if (a.expires <= t) {
        S.loseInfection(w, a.infection);
        return false;
      }
      return true;
    });
    w.messages = w.messages.filter((a) => a.expires > t);
    const m = S.maps(w),
      byKind = new Map();
    for (const a of w.resources) {
      ctx.startResource.add(a.cell + ":" + a.kind);
      if (!byKind.has(a.kind)) byKind.set(a.kind, new Set());
      byKind.get(a.kind).add(a.cell);
    }
    const keep = new Set(w.resources);
    for (const kind of ["mineral", "droplet", "info"]) {
      const f = S.FOOD[kind];
      if (t % f.period) continue;
      const cells = new Set(byKind.get(kind) || []);
      // Experience traces are a latent field, not free physical food or energy.
      if(kind === "info") for(const event of w.messages){
        const source=m.byId.get(event.sourceId);
        if(event.expires>w.turn && w.turn-event.time<8 && event.values?.length &&
          source && S.distance(w,event.cell,source.cell)<=1 && !w.tiles[event.cell].blocked)
          cells.add(event.cell);
      }
      const counts=new Uint8Array(w.tiles.length),candidates=new Set(cells);
      for(const source of cells)for(const cell of S.nearby(w,source)){counts[cell]++;candidates.add(cell);}
      for (const cell of [...candidates].sort((a,b)=>a-b)) {
        if (w.tiles[cell].blocked) continue;
        const n=counts[cell];
        const old = (m.resources.get(cell) || []).find((a) => a.kind === kind);
        if (old) {
          if (n !== 2 && n !== 3) {
            keep.delete(old);
            removeResource(w, old);
          } else if (old.q < f.cap)
            ctx.ca.push({ cell, kind, q: 1, growth: old });
        } else if (n === 3) ctx.ca.push({ cell, kind, q: 2, growth: null });
      }
    }
    w.resources = w.resources.filter((a) => keep.has(a));
  }
  function sourceList(w, o, ctx, m) {
    const spec = S.spec(o),
      main = spec.group === "main",
      fungus = spec.group === "fungus",
      plant = spec.group === "plant",
      intent = ctx.intents.get(o.id);
    const list = [];
    if(plant && S.ProducerSupport.factor(w,o,S)===0)return list;
    function organicAllowed(tag) {
      if (plant) return false;
      if (spec.id === "kelp") return tag === "animal";
      return main || fungus || (spec.group === "prey" && tag === "plant");
    }
    const cells = fungus
      ? S.nearby(w, o.cell, 1, true).filter(
          (p) => p === o.cell || S.oneStep(w, o.cell, p),
        )
      : [o.cell];
    for (const p of cells) {
      for (const a of m.resources.get(p) || []) {
        const f = S.FOOD[a.kind];
        if (a.q <= 0 || (a.E <= 0 && a.M <= 0 && a.kind !== "factor")) continue;
        if (plant && f.tag !== "mineral") continue;
        if (["plant", "fungal", "animal"].includes(f.tag) && !organicAllowed(f.tag)) continue;
        if (
          f.tag === "mineral" &&
          (spec.group === "prey" || (fungus && p !== o.cell))
        )
          continue;
        if (!main && !plant && f.tag !== "mineral" && !organicAllowed(f.tag))
          continue;
        if (!main && ["factor", "info"].includes(a.kind)) continue;
        if (
          f.tag === "mineral" &&
          o.M >=
            (main
              ? Math.max(
                  4,
                  ctx.traits.get(o.id).phase === 2
                    ? ctx.traits.get(o.id).M3
                    : ctx.traits.get(o.id).phase === 3 &&
                        spec.id !== "precocial"
                      ? ctx.traits.get(o.id).M4
                      : 4,
                )
              : 2)
        )
          continue;
        if (
          a.kind === "factor" &&
          o.factor?.level >= a.level &&
          o.factor.expires > w.turn
        )
          continue;
        if (
          a.kind === "info" &&
          (o.infoReady > w.turn ||
            (a.event && o.seen.some((x) => x.id === a.event.id)))
        )
          continue;
        list.push({
          type: "resource",
          id: "r:" + p + ":" + a.kind,
          obj: a,
          cell: p,
          tag: f.tag,
          healing: f.healing || 1,
          level: a.level || 0,
          amount: a.q / S.FOOD[a.kind].cap,
        });
      }
      for (const a of m.carcasses.get(p) || []) {
        if (
          !organicAllowed(a.tag) ||
          (a.species === o.species && !fungus) ||
          a.q <= 0 ||
          (a.E <= 0 && a.M <= 0)
        )
          continue;
        list.push({
          type: "carcass",
          id: a.id,
          obj: a,
          cell: p,
          tag: a.tag,
          healing: 1,
          amount: a.q / 4,
        });
      }
    }
    if (plant && o.M < ctx.traits.get(o.id).capM && w.tiles[o.cell].soilM > 0) {
      list.push({
        type: "soil",
        id: "soil:" + o.cell,
        obj: w.tiles[o.cell],
        cell: o.cell,
        tag: "mineral",
        healing: 1,
        amount: w.tiles[o.cell].soilM / 20,
      });
    }
    if (main) {
      const food = m.food.get(o.cell);
      if (
        food &&
        organicAllowed(S.spec(food).tag) &&
        ["plant", "fungus"].includes(S.spec(food).group) &&
        S.edibleB(food) > 0 &&
        food.HP > 0
      )
        list.push({
          type: "plant",
          id: food.id,
          obj: food,
          cell: food.cell,
          tag: S.spec(food).tag,
          amount:
            S.edibleB(food) /
            (S.phenotype(w, food).capB -
              (S.spec(food).group === "plant" ? S.PLANT_BASE : 0)),
          healing: ["moss", "fungus"].includes(food.species) ? 1.2 : 1,
        });
    }
    if (w.config.ecologyRevision === "observation/4.1" && !plant && !fungus) {
      for (const cell of S.nearby(w,o.cell,1,true)) {
        const target = m.food.get(cell);
        if (!target || target.id === o.id || !organicAllowed(S.spec(target).tag) ||
            !["plant","fungus"].includes(S.spec(target).group) || S.edibleB(target) <= 0 ||
            !S.oneStep(w,o.cell,cell) || list.some(a => a.id === target.id)) continue;
        list.push({type:"plant",id:target.id,obj:target,cell,tag:S.spec(target).tag,
          amount:S.edibleB(target)/Math.max(1,S.phenotype(w,target).capB-S.PLANT_BASE),healing:1});
      }
    }
    if (intent?.type === "harvest" && !plant && !fungus) {
      const target = m.byId.get(intent.target);
      if (
        target &&
        organicAllowed(S.spec(target).tag) &&
        target.HP > 0 &&
        S.edibleB(target) > 0 &&
        S.distance(w, o.cell, target.cell) <= 1 &&
        S.oneStep(w, o.cell, target.cell)
      )
        list.push({
          type: "plant",
          id: target.id,
          obj: target,
          cell: target.cell,
          tag: S.spec(target).tag,
          amount:
            S.edibleB(target) /
            (S.phenotype(w, target).capB -
              (S.spec(target).group === "plant" ? S.PLANT_BASE : 0)),
          healing: ["moss", "fungus"].includes(target.species) ? 1.2 : 1,
        });
    }
    return list;
  }
  function chooseSource(w, o, list, ctx) {
    const p = ctx.traits.get(o.id),
      s = S.spec(o);
    function score(a) {
      const organic = ["plant", "fungal", "animal"].includes(a.tag);
      let priority = 10;
      if (s.group === "plant") priority = a.type === "soil" ? 1 : 0;
      else if (s.group !== "main")
        priority = organic
          ? o.E < p.capE - 1e-8 || o.HP < p.maxHP - 1e-8
            ? 0
            : 10
          : 1;
      else if (o.E < 35 && organic) priority = 0;
      else if (o.HP < 50 && organic) priority = 1;
      else if (o.G < (o.phase === 1 ? 30 : o.phase === 2 ? 90 : 210) && organic)
        priority = 2;
      else if (
        a.tag === "mineral" &&
        o.M < (o.phase === 2 ? p.M3 : o.phase === 3 ? p.M4 : 4)
      )
        priority = 3;
      else if (a.tag === "factor") priority = 4;
      else if (a.tag === "info") priority = 5;
      else if (organic && (o.E < p.capE || o.HP < p.maxHP)) priority = 6;
      else if (a.tag === "mineral") priority = 7;
      const visible = a.amount <= 1 / 3 ? 1 / 3 : a.amount <= 2 / 3 ? 2 / 3 : 1;
      return {
        a,
        priority,
        value:
          visible *
          efficiency(o, a.tag, p.phase) *
          (a.type === "carcass" ? S.D.diets[s.diet]?.carcass || 1 : 1) *
          (o.HP < 50 ? a.healing : 1),
        h: S.hash(w, "feeding/choice", w.turn, o.id, a.id),
      };
    }
    return list
      .map(score)
      .filter((x) => x.priority < 10)
      .sort(
        (a, b) => a.priority - b.priority || b.value - a.value || a.h - b.h,
      )[0]?.a;
  }
  function feed(w, ctx, transfer) {
    let m = S.maps(w);
    for (let round = 0; round < 2; round++) {
      const requests = [];
      for (const o of w.organisms)
        if (o.HP > 0 && !ctx.harvestDead.has(o.id)) {
          const source = chooseSource(w, o, sourceList(w, o, ctx, m), ctx);
          if (source)
            requests.push({
              o,
              source,
              h: S.hash(
                w,
                "feeding/arbitration",
                w.turn,
                o.id,
                source.id,
                round,
              ),
            });
        }
      requests.sort((a, b) => a.h - b.h || S.compare(a.o.id, b.o.id));
      for (const { o, source: a } of requests) {
        if (ctx.harvestDead.has(o.id)) continue;
        const obj = a.obj;
        if (
          (obj.q !== undefined && obj.q <= 0) ||
          (a.type === "plant" && (S.edibleB(obj) <= 0 || obj.HP <= 0))
        )
          continue;
        let amount, harvest = null;
        if (a.type === "soil") {
          amount = {
            E: 0,
            M: S.round(
              Math.min(
                0.1,
                obj.soilM,
                (ctx.traits.get(o.id).capM - o.M) / efficiency(o, "mineral"),
              ),
            ),
            G: 0,
          };
          obj.soilM = S.round(obj.soilM - amount.M);
        } else if (a.type === "plant") {
          const p = ctx.traits.get(o.id),
            need =
              p.capE -
              o.E +
              (2 * (p.maxHP - o.HP)) / (a.healing * p.ageFactors.healing);
          const B = Math.min(
              2,
              S.edibleB(obj),
              S.spec(o).group === "prey"
                ? Math.max(0, S.round(need / efficiency(o, a.tag, p.phase)))
                : Infinity,
            ),
            M = obj.B > 0 ? S.round((obj.M * B) / obj.B) : 0;
          if (B <= 0) continue;
          harvest = {consumedB:B,beforeEdibleB:S.edibleB(obj)};
          obj.B = S.round(obj.B - B);
          obj.M = S.round(obj.M - M);
          amount = { E: B, M, G: 0 };
          if(S.Colony.is(obj))S.Colony.consumed(w,obj,B);
          if (obj.B <= 0) ctx.harvestDead.add(obj.id);
        } else {
          amount = {
            E: S.round((obj.E || 0) / obj.q),
            M: S.round((obj.M || 0) / obj.q),
            G: S.round((obj.G || 0) / obj.q),
          };
          obj.E = S.round(Math.max(0, (obj.E || 0) - amount.E));
          obj.M = S.round(Math.max(0, (obj.M || 0) - amount.M));
          obj.G = S.round(Math.max(0, (obj.G || 0) - amount.G));
          obj.q--;
          if (!obj.q) ctx.exhausted.add(obj.cell + ":" + obj.kind);
        }
        let assimilated=0;
        if (a.tag === "info") {
          (ctx.infoReceipts??=[]).push({recipient:o.id,species:o.species,event:obj.event?{id:obj.event.id,sourceId:obj.event.sourceId,time:obj.event.time,mediated:!!obj.event.mediator,noise:!!obj.event.noise}:null});
          const add = Math.min(ctx.traits.get(o.id).capE - o.E, amount.E);
          o.E = S.round(o.E + add);
          S.dissipate(w, amount.E - add);
          assimilated=add;
          if (obj.event) {
            ctx.records.get(o.id).information.push(obj.event);
            o.seen.push({ id: obj.event.id, expires: obj.event.time + 20 });
            o.seen = o.seen.filter((x) => x.expires > w.turn).slice(-4);
            o.infoReady = w.turn + 6;
          }
        } else {
          const result = absorb(w, o, amount, a.tag, ctx, {
            cell: a.cell,
            healing: a.healing,
            level: a.level,
            algae: a.type === "plant" && obj.species === "algae",
            carcass: a.type === "carcass",
          });
          assimilated=result.e;
          if (result.organic && amount.E > 0) transfer(w, ctx, obj, o, a.type, harvest);
        }
        S.record(ctx, o, "feed", {
          source: a.id,
          sourceType: a.type,
          assimilated,
          sourceSpecies: obj.species || null,
          to: a.cell,
          amount: amount.E,
          material: amount.M,
          tag: a.tag,
        });
        ctx.records.get(o.id).bites++;
      }
      w.resources = w.resources.filter((a) => a.q > 0);
      w.carcasses = w.carcasses.filter((a) => {
        if (a.q > 0) return true;
        removeResource(w, a);
        S.loseInfection(w, a.infection);
        a.infection = null;
        return false;
      });
      m = S.maps(w);
    }
  }
  function spend(w, o, cost) {
    // Quantize the transaction once; both balances must use the same amount.
    cost = S.round(cost);
    const paid = Math.min(o.E, cost);
    o.E = S.round(o.E - paid);
    o.HP = S.round(Math.max(0, o.HP - 2 * (cost - paid)));
    S.dissipate(w, paid);
    return paid;
  }
  function carcass(w, o, ctx) {
    if(S.Colony.is(o)&&o.colony.edibleExposure){S.dissipate(w,o.colony.edibleExposure.E);o.colony.edibleExposure=null;}
    const same = w.carcasses.find(
      (a) => a.cell === o.cell && a.slot === o.slot,
    );
    if (same) {
      removeResource(w, same);
      S.loseInfection(w, same.infection);
      w.carcasses = w.carcasses.filter((a) => a !== same);
    }
    const phase = ctx.traits.get(o.id).phase,
      ratio =
        o.slot === "main"
          ? [0, 1, 1.15, 1.35, 1.6][phase]
          : phase === 1
            ? 1
            : 1.1;
    const a = {
      id: "c:" + o.id + ":" + w.turn,
      species: o.species,
      slot: o.slot,
      cell: o.cell,
      tag: S.spec(o).tag,
      q: Math.min(4, Math.ceil(2 * ratio * (0.75 + 0.5 * o.dna.body))),
      E: S.round(0.5 * (o.E + o.B)),
      M: S.round(0.5 * o.M),
      G: S.round(0.5 * o.B),
      created: w.turn,
      expires: w.turn + 12,
      infection: null,
      payloadExpires: null,
    };
    S.dissipate(w, o.E + o.B - a.E);
    S.addSoil(w, o.cell, o.M - a.M);
    const p = o.infection;
    if (p && (w.config.ecologyRevision === "observation/4.1" ? p.counter >= ({first:4,middle:6,extra:6,terminal:8}[p.stage]) : ["middle", "extra"].includes(p.stage) && p.counter >= 6)) {
      a.infection = p;
      p.hostId = a.id;
      a.payloadExpires = w.turn + 4;
    } else S.loseInfection(w, p);
    o.infection = null;
    w.carcasses.push(a);
  }
  function payActions(w,ctx) {
    for(const o of w.organisms){const c=ctx.costs.get(o.id);if(!c)continue;spend(w,o,c.action);c.action=0;}
  }
  function settle(w, ctx, parasiteFee) {
    for (const o of w.organisms) {
      const c = ctx.costs.get(o.id),
        p = ctx.traits.get(o.id),
        s = S.spec(o),
        intent = ctx.intents.get(o.id);
      spend(w, o, c.action);
      let base = c.base;
      if (["stop", "defend"].includes(intent.type))
        base *= 1 + S.trait(o, "rest", p.phase);
      const paidBase=spend(w, o, base);
      if(S.Colony.is(o)){
        const maintained=paidBase>=S.round(base)&&o.HP>0;
        o.colony.activity=S.round(S.clamp(o.colony.activity+(maintained?.02:-.05),0,1));
        if(maintained)S.Colony.increment(o,"maintainedTurns",1);
      }
      const paidDensity = spend(w, o, c.density);
      ctx.records.get(o.id).crowding = c.neighborCount >= 5 && paidDensity > 0;
      parasiteFee(w, ctx, o);
      o.age++;
    }
    const survivors = [];
    for (const o of w.organisms) {
      const p = ctx.traits.get(o.id);
      let reason = null;
      if (o.HP <= 0)
        reason = ctx.records.get(o.id).damage > 0 ? "combat" : "starvation";
      if (ctx.harvestDead.has(o.id)) reason = "harvest";
      if(!reason&&S.Colony.is(o)&&o.colony.activity<=0)reason="starvation";
      if (!reason && !S.Colony.is(o) && o.age >= p.life) reason = "age";
      if (reason) {
        S.record(ctx, o, "death", { reason, appearance: {
          species:o.species,phase:o.phase,branch3:o.branch3,branch4:o.branch4,
          sex:o.sex,role:o.role,age:o.age,birthLife:o.birthLife,facing:o.facing,
          dna:{...o.dna}
        } });
        ctx.deaths.push({ species: o.species, reason, ...(o.producerReserve===0?{environmentCause:"basal-nutrition-exhausted"}:{}), ...(w.config.ecologyRevision === "observation/4.1" ? {id:o.id,generation:o.generation,ageStage:ctx.traits.get(o.id).ageStage} : {}) });
        carcass(w, o, ctx);
      } else survivors.push(o);
    }
    w.organisms = survivors;
  }
  function investAndDrops(w, ctx) {
    const m = S.maps(w),
      candidates = [];
    for (const o of w.organisms) {
      if (!ctx.traits.has(o.id)) continue;
      const s = S.spec(o);
      if(S.Colony.is(o))S.Colony.regrow(w,o);
      else if (["plant", "fungus"].includes(s.group)) {
        const hasBirth = S.nearby(w, o.cell).some(
            (p) =>
              !m.food.has(p) &&
              S.oneStep(w, o.cell, p) &&
              S.validHabitat(w, s, p) &&
              (w.config.ecologyRevision === "observation/4.1" ? s.group === "fungus" ? [1,2,3] : [2,3] : [3]).includes(S.nearby(w, p).filter((q) => m.food.get(q)?.species === s.id).length),
          ),
          keep =
            s.group === "plant" && o.B < 4
              ? 2
              : o.phase === 2 && hasBirth
                ? 8
                : 5,
          amount = Math.max(
            0,
            Math.min(
              s.group === "plant" ? 2 : 1,
              (s.group === "plant" && S.ProducerSupport.factor(w,o,S)===0) ? 0 : o.E - keep,
              S.phenotype(w, o).capB - o.B,
            ),
          );
        o.E = S.round(o.E - amount);
        o.B = S.round(o.B + amount);
      }
      if (
        o.phase < 2 ||
        ctx.parents.has(o.id) ||
        !["grass", "fungus", "waterbug", "algae", "moss"].includes(s.id) ||
        w.turn % 8 !== S.hash(w, "drop/phase", 0, o.id) % 8
      )
        continue;
      let kind =
        s.id === "grass"
          ? "seed"
          : s.id === "fungus"
            ? "spore"
            : s.id === "waterbug"
              ? "egg"
              : "organic";
      if (
        ["grass", "fungus"].includes(s.id) &&
        S.r(w, "drop/factor", w.turn, o.id) < 0.1
      )
        kind = "factor";
      const B = kind === "factor" ? 0.2 : 2,
        M = kind === "factor" ? 0 : 0.1;
      if (S.edibleB(o) < B || o.M < M) continue;
      const places = S.nearby(w, o.cell, 1, true)
        .filter((p) => !w.tiles[p].blocked)
        .map((cell) => ({
          cell,
          h: S.hash(w, "drop/place", w.turn, o.id, cell),
        }))
        .sort((a, b) => a.h - b.h);
      const place = places.find(({ cell }) => {
        const list = m.resources.get(cell) || [],
          old = list.find((a) => a.kind === kind);
        return old ? old.q < S.FOOD[kind].cap : list.length < 3;
      });
      if (place)
        candidates.push({
          cell: place.cell,
          kind,
          q: 1,
          E: kind === "factor" ? 0.1 : 2,
          M,
          G: 0,
          expires: w.turn + 12,
          source: o,
          costB: B,
          costM: M,
          costE: 0,
          fit: 1,
          level:
            kind === "factor"
              ? 1 + Math.floor(S.r(w, "factor/level", w.turn, o.id) * 3)
              : null,
        });
    }
    return candidates;
  }
  function mineralCandidates(w, ctx) {
    return ctx.ca
      .filter(
        (c) =>
          c.kind !== "info" &&
          !ctx.exhausted.has(c.cell + ":" + c.kind) &&
          (c.growth
            ? w.resources.includes(c.growth)
            : !ctx.startResource.has(c.cell + ":" + c.kind)),
      )
      .map((c) => ({
        ...c,
        E: 0,
        M: c.q * (c.kind === "mineral" ? 2 : 1),
        G: 0,
        expires: null,
        source: w.tiles[c.cell],
        sourceId: "soil:" + c.cell,
        costSoil: c.q * (c.kind === "mineral" ? 2 : 1),
        fit:
          c.kind === "mineral"
            ? w.tiles[c.cell].terrain === "rock"
              ? 2
              : 1
            : ["shallow", "mud"].includes(w.tiles[c.cell].terrain)
              ? 2
              : 1,
      }));
  }
  function candidateOrder(a, b) {
    return (
      b.fit - a.fit ||
      b.capacity - a.capacity ||
      a.h - b.h ||
      S.compare(a.kind, b.kind)
    );
  }
  function supply(w, ctx, candidates) {
    const groups = new Map();
    for (const c of candidates) {
      c.sourceId = c.sourceId || c.source.id;
      c.h = S.hash(w, "supply/arbitration", w.turn, c.sourceId, [
        c.cell,
        c.kind,
      ]);
      c.capacity = Math.min(
        c.costE ? (c.source.E - 5) / c.costE : Infinity,
        c.costB ? c.source.B / c.costB : Infinity,
        c.costM ? c.source.M / c.costM : Infinity,
        c.costSoil ? c.source.soilM / c.costSoil : Infinity,
      );
      if (!groups.has(c.sourceId)) groups.set(c.sourceId, []);
      groups.get(c.sourceId).push(c);
    }
    const funded = [];
    for (const list of groups.values()) {
      list.sort(candidateOrder);
      const source = list[0].source,
        budget = { E: source.E, B: source.B, M: source.M, soilM: source.soilM };
      for (const c of list) {
        if (
          (c.costE && budget.E - c.costE < 5 - 1e-8) ||
          (c.costB && budget.B < c.costB) ||
          (c.costM && budget.M < c.costM) ||
          (c.costSoil && budget.soilM < c.costSoil)
        )
          continue;
        for (const [k, cost] of [
          ["E", c.costE],
          ["B", c.costB],
          ["M", c.costM],
          ["soilM", c.costSoil],
        ])
          if (cost) budget[k] = S.round(budget[k] - cost);
        funded.push(c);
      }
    }
    const cells = new Map();
    for (const c of funded) {
      if (!cells.has(c.cell)) cells.set(c.cell, []);
      cells.get(c.cell).push(c);
    }
    const m = S.maps(w);
    for (const [cell, list] of cells) {
      list.sort(candidateOrder);
      const existing = m.resources.get(cell) || [],
        reserved = new Set(existing.map((a) => a.kind)),
        used = new Set();
      for (const c of list) {
        const old = existing.find((a) => a.kind === c.kind);
        if (
          used.has(c.kind) ||
          (old && old.q >= S.FOOD[c.kind].cap) ||
          (!old && reserved.size >= 3)
        )
          continue;
        if (
          old &&
          c.kind === "info" &&
          old.event && (old.event.id !== c.event?.id ||
            S.stable(old.event) !== S.stable(c.event))
        )
          continue;
        used.add(c.kind);
        reserved.add(c.kind);
        for (const [k, cost] of [
          ["E", c.costE],
          ["B", c.costB],
          ["M", c.costM],
          ["soilM", c.costSoil],
        ])
          if (cost) c.source[k] = S.round(c.source[k] - cost);
        if (c.costE) S.dissipate(w, c.costE - c.E);
        if (c.kind === "factor") S.dissipate(w, c.costB - c.E);
        if (old) {
          if(c.kind === "info" && !old.event) old.event=structuredClone(c.event);
          old.q += c.q;
          old.E = S.round(old.E + c.E);
          old.M = S.round(old.M + c.M);
          if (c.expires !== null)
            old.expires = Math.min(old.expires, c.expires);
        } else
          w.resources.push({
            cell,
            kind: c.kind,
            q: c.q,
            E: c.E,
            M: c.M,
            G: 0,
            created: w.turn,
            expires: c.expires,
            event: c.event || null,
            level: c.level || null,
          });
        if (c.opQ) {
          ctx.mediated = (ctx.mediated || 0) + 1;
          const q = c.opQ;
          q.E = S.round(q.E - 0.02);
          S.dissipate(w, 0.02);
          q.ready = w.turn + 5;
          q.seen.push({ id: c.event.id, expires: c.event.time + 20 });
          q.seen = q.seen.filter((x) => x.expires > w.turn).slice(-5);
        }
        if (c.kind === "info") {
          ctx.records.get(c.source.id).emitted = true;
          (ctx.infoEmissions??=[]).push({id:c.event.id,sourceId:c.event.sourceId,species:c.source.species,time:c.event.time,mediated:!!c.opQ});
        }
      }
    }
  }
  return {
    efficiency,
    absorb,
    expireAndCA,
    sourceList,
    feed,
    spend,
    carcass,
    settle,
    payActions,
    investAndDrops,
    mineralCandidates,
    candidateOrder,
    supply,
  };
});
