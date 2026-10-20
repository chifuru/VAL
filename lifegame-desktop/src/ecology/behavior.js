(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./state.js")
      : root.EcoState,
    typeof module === "object" && module.exports
      ? require("./nutrition.js")
      : root.EcoNutrition,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EcoBehavior = api;
})(globalThis, function (S, Nutrition) {
  "use strict";
  const phaseA = [0, 1, 1.15, 1.35, 1.6];
  const grouped = w => S.Ryouki?.enabled(w) === true;
  const isRyouki = (w,o) => grouped(w) && S.Ryouki.is(o);
  function mainMembers(w,m,cell) {
    if (grouped(w)) return S.mainAt(m,cell);
    const o=m.main.get(cell);return o?[o]:[];
  }
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
  function moveCost(
    w,
    o,
    to,
    phase = o.phase,
    friend = false,
    ageMove = S.ageInfo(o).factors.move,
  ) {
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
    if (S.LargePlant?.is(o)) return .3 * ageMove * terrain;
    if (isRyouki(w,o)) {
      let extra=1;
      if (phase>=3 && o.branch3===2) {
        extra=.8;
        if (phase===4 && ((o.branch4===0 && ["shallow","deep"].includes(t.terrain)) ||
            (o.branch4===1 && t.env===1))) extra=.65;
      }
      terrain=1+(terrain-1)*extra;
      return .39*ageMove*terrain*environmental(w,o,"move",to)*S.adjustment(w,o,"move",t.env,phase);
    }
    if (o.branch3 === 1 && o.branch4 === 1) terrain = 1 + 0.75 * (terrain - 1);
    let branch =
      o.branch3 === 1 && o.branch4 === 0
        ? 0.9
        : s.id === "precocial" && phase === 3 && o.branch3 === 1
          ? 0.95
          : 1;
    return (
      ageMove *
      (w.config.ecologyRevision === "observation/4.1" && s.group === "main" ? .6 : 1) *
      (s.group === "main" ? 0.65 : 1) *
      (terrain *
        environmental(w, o, "move", to) *
        S.adjustment(w, o, "move", t.env, phase) *
        branch *
        (friend ? 1 + S.trait(o, "packMove", phase) : 1))
    );
  }
  function power(w, o, kind, ctx, breakdown = false) {
    const s = S.spec(o),
      p = ctx.traits.get(o.id),
      phase = p.phase;
    if (s.group !== "main") {
      const base = kind === "attack" ? 0 : s.group === "prey" ? 1 : 0,
        value = base * p.ageFactors[kind];
      return breakdown
        ? {
            base,
            ageFactor: p.ageFactors[kind],
            otherFactor: 1,
            effective: value,
          }
        : value;
    }
    const m = ctx.current || S.maps(w),
      friends = S.nearby(w, o.cell).reduce((n,c) => n+mainMembers(w,m,c).filter(a=>a.species===o.species).length,0);
    const common =
      s.id === "precocial" ? [0, 1.2, 1.35, 1.6][phase] : phaseA[phase];
    let value =
      kind === "attack"
        ? 6 + (6 * (2 * o.dna.body + o.dna.appendage)) / 3
        : 4 + 4 * o.dna.skin;
    const combatScale=isRyouki(w,o)?(kind==="attack"?.45:.60):1,
      baseValue = value * common * combatScale;
    value *=
      combatScale *
      p.ageFactors[kind] *
      common *
      S.adjustment(w, o, kind, w.tiles[o.cell].env, phase);
    if (kind === "attack") {
      value *= 1 + Math.min(3, friends) * S.trait(o, "packAttack", phase);
      if (!isRyouki(w,o) && o.branch3 === 2 && o.branch4 === 0) value *= 1.1;
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
      if (!isRyouki(w,o) && o.branch3 === 2 && o.branch4 === 1) value *= 1.1;
      if (s.id === "precocial" && phase === 3 && o.branch3 === 2) value *= 1.05;
    }
    return breakdown
      ? {
          base: baseValue,
          ageFactor: p.ageFactors[kind],
          otherFactor: baseValue ? value / (baseValue * p.ageFactors[kind]) : 1,
          effective: value,
        }
      : value;
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
  function floatingCandidates(w, o, ctx, m) {
    const out = [{type:"stop",cell:o.cell,cost:0,path:[]}];
    if (o.species !== "freshwaterlight") return out;
    const p = ctx.traits.get(o.id), costs = ctx.costs.get(o.id),
      budget = Math.max(0,costs.budget-costs.action);
    for (const cell of S.nearby(w,o.cell)) {
      if (m.producer?.has(cell) || !S.validHabitat(w,S.spec(o),cell) ||
          !S.oneStep(w,o.cell,cell) || !visible(w,o,cell,ctx)) continue;
      const cost = moveCost(w,o,cell,p.phase,false,p.ageFactors.move);
      if (cost > budget + 1e-8) continue;
      const [x,y] = S.xy(w,o.cell), [tx,ty] = S.xy(w,cell),
        direction = S.DIRS.findIndex(([dx,dy]) => dx === tx-x && dy === ty-y);
      out.push({type:"move",cell,cost,path:[cell],direction});
    }
    return out;
  }
  function chooseFloating(w, o, ctx, m, stage) {
    const sensed = S.nearby(w,o.cell,1,true).filter(cell => S.sight(w,o.cell,cell)),
      consumers = sensed.flatMap(cell => [...mainMembers(w,m,cell),m.prey?.get(cell)])
        .filter(a => a && a.HP > 0 &&
          (S.spec(a).group === "prey" || (S.spec(a).group === "main" && a.species !== "kelp")));
    const score = cell => {
      const tile = w.tiles[cell],
        light = Math.min(1,Math.max(0,tile.light))*S.ProducerSupport.factor(w,{...o,cell},S),
        mineral = Math.min(1,Math.max(0,tile.soilM)/.2),
        pressure = Math.min(2,consumers.reduce((n,a) =>
          n + (S.distance(w,cell,a.cell) <= 1 ? 1/(1+S.distance(w,cell,a.cell)) : 0),0));
      return light + .5*mineral - .45*pressure;
    };
    const list = stage === "effect" ? [{type:"stop",cell:o.cell,cost:0,path:[]}]
      : floatingCandidates(w,o,ctx,m);
    for (const c of list) {
      c.score = c.noRandom = score(c.cell)-c.cost;
      c.features=[];c.xi=0;
      c.h=S.hash(w,"behavior/tie",w.turn,o.id,[c.type,null,c.path,c.cell]);
    }
    let chosen=list[0];
    for (const c of list.slice(1))
      if (c.score > chosen.score+1e-8 ||
          (chosen.type === "move" && Math.abs(c.score-chosen.score)<=1e-8 && c.h < chosen.h)) chosen=c;
    ctx.intents.set(o.id,chosen);ctx.records.get(o.id).randomChanged=false;
    if (o.id === ctx.observeId) ctx.diagnostics={id:o.id,candidates:list.slice().sort((a,b)=>b.score-a.score||a.h-b.h).slice(0,3)
      .map(c=>({type:c.type,target:undefined,cell:c.cell,score:c.score,cost:c.cost,features:[]}))};
  }
  function candidates(w, o, ctx, m) {
    const s = S.spec(o),
      p = ctx.traits.get(o.id),
      budget = Math.max(0, ctx.costs.get(o.id).budget - ctx.costs.get(o.id).action),
      out = [{ type: "stop", cell: o.cell, cost: 0, path: [] }];
    if (S.LargePlant?.is(o)) return floatingCandidates(w,o,ctx,m);
    if (s.group === "plant" || s.group === "fungus") return out;
    const friend = S.nearby(w, o.cell).some(c => mainMembers(w,m,c).some(a=>a.species===o.species));
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
            (grouped(w) && o.slot==="main" ? !S.mainRoom(w,o,cell,m) : occupied.has(cell)) ||
            !(isRyouki(w,o)?S.sight(w,prev,cell):visible(w, o, cell, ctx)) ||
            !S.oneStep(w, prev, cell)
          )
            break;
          cost += moveCost(w, o, cell, p.phase, friend, p.ageFactors.move);
          path.push(cell);
          if (cost <= budget + 1e-8)
            out.push({
              type: "move",
              cell,
              cost,
              path: path.slice(),
              direction: d,
            });
          else if(isRyouki(w,o)) ctx.records.get(o.id).ryoukiMoveBudgetLimited=true;
          prev = cell;
        }
      }
    }
    for (const cell of S.nearby(w, o.cell, p.sense, true)) {
      if (!visible(w, o, cell, ctx)) continue;
      const main = m.main.get(cell),
        food = m.food.get(cell);
      if (s.group === "main" && o.attackReady <= w.turn)
        for (const target of (grouped(w)?[...S.mainAt(m,cell),(m.prey||m.food).get(cell)]:[main, food]))
          if (
            target &&
            target.id !== o.id &&
            target.species !== o.species &&
            (!isRyouki(w,o) || S.spec(target).group === "prey") &&
            !(w.config.ecologyRevision === "observation/4.1" && ["solar","kelp"].includes(o.species) && ["solar","kelp"].includes(target.species)) &&
            ["main", "prey"].includes(S.spec(target).group) &&
            !(s.id === "kelp" && S.spec(target).group !== "prey") &&
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
        s.id !== "kelp" &&
        ["plant", "fungus"].includes(S.spec(food).group) &&
        (!isRyouki(w,o) || S.spec(food).group === "plant") &&
        S.edibleB(food) > 0 &&
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
      const producer=m.producer?.get(cell);
      if (producer && s.id !== "kelp" && S.edibleB(producer)>0 && producer.HP>0 &&
          (s.group === "main" || s.group === "prey") && S.distance(w,o.cell,cell)<=1 && S.oneStep(w,o.cell,cell))
        out.push({type:"harvest",cell:o.cell,target:producer.id,cost:0,path:[]});
      for (const ward of (grouped(w)?S.mainAt(m,cell):[main])) if (
        s.id === "swarm" &&
        o.role === "worker" &&
        o.E >= 25 &&
        budget >= 2 &&
        ward &&
        ward.id !== o.id &&
        ward.colony === o.colony &&
        ((ctx.traits.get(ward.id).ageEnabled
          ? ctx.traits.get(ward.id).ageStage === "juvenile"
          : ward.phase <= 2) || (ward.role === "queen" && ward.E < 65)) &&
        S.distance(w, o.cell, cell) === 1 &&
        S.oneStep(w, o.cell, cell)
      )
        out.push({
          type: "care",
          cell: o.cell,
          target: ward.id,
          cost: 2,
          path: [],
        });
    }
    if (w.config.ecologyRevision === "observation/4.1" && s.group === "main" && budget >= 0.3) {
      for (const cell of S.nearby(w,o.cell,1,true)) {
        for (const target of mainMembers(w,m,cell))
        if(target?.infection?.location === "external" && target.species===o.species && S.oneStep(w,o.cell,cell))
          out.push({type:"groom",cell:o.cell,target:target.id,cost:0.3,path:[]});
      }
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
      for (const t of (grouped(w)?[...S.mainAt(m,p),(m.prey||m.food).get(p)]:[m.main.get(p), m.food.get(p)]))
        if (
          t &&
          t.id !== o.id &&
          t.species !== o.species &&
          ["main", "prey"].includes(S.spec(t).group)
        )
          enemies.push(t);
    const nearest = enemies.reduce(
      (best, a) =>
        !best ||
        S.distance(w, o.cell, a.cell) < S.distance(w, o.cell, best.cell) ||
        (S.distance(w, o.cell, a.cell) === S.distance(w, o.cell, best.cell) &&
          S.compare(a.id, best.id) < 0)
          ? a
          : best,
      null,
    );
    return {
      visibleCells,
      enemies,
      m,
      nearest,
      traits: ctx.traits,
      qualityCache: new Map(),
      dangerCache: new Map(),
      neighborhoodCache: new Map(),
    };
  }
  function quality(w, o, cell, v) {
    if (v.qualityCache?.has(cell)) return v.qualityCache.get(cell);
    if (isRyouki(w,o)) {
      if (!v.visibleCells.has(cell)) return 0;
      let leaves=0,insects=0;
      for(const target of [v.m.food.get(cell),v.m.producer?.get(cell)])
        if(target&&target.HP>0&&S.spec(target).group==="plant")leaves=Math.max(leaves,Math.min(1,S.edibleB(target)/4));
      const prey=(v.m.prey||v.m.food).get(cell);
      if(prey&&prey.HP>0&&S.spec(prey).group==="prey")insects=Math.min(1,S.edibleB(prey)/4);
      for(const a of v.m.carcasses.get(cell)||[])
        if(S.D.byId[a.species]?.group==="prey"&&a.q>0)insects=Math.max(insects,Math.min(1,a.q/4));
      const q=Math.min(1,(.65*leaves+.35*insects)*(.9+.2*o.dna.senses));
      v.qualityCache?.set(cell,q);return q;
    }
    const s = S.spec(o);
    const stage = (amount) =>
      amount <= 0 ? 0 : amount <= 1 / 3 ? 1 / 3 : amount <= 2 / 3 ? 2 / 3 : 1;
    const value = (amount, tag) => {
      if (s.group === "prey" && tag !== "plant") return 0;
      if (s.id === "kelp" && ["plant", "fungal"].includes(tag)) return 0;
      const multiplier =
        s.group === "main"
          ? S.D.diets[s.diet].factors[
              ["plant", "fungal", "animal", "mineral"].indexOf(tag)
            ] || 1
          : 1;
      return stage(amount) * multiplier;
    };
    let q = 0;
    const plant = v.m.food.get(cell);
    if (plant && ["plant", "fungus"].includes(S.spec(plant).group))
      q = value(
        S.edibleB(plant) /
          ((v.traits?.get(plant.id) || S.phenotype(w, plant)).capB -
            (S.spec(plant).group === "plant" ? S.PLANT_BASE : 0)),
        S.spec(plant).tag,
      ) * (s.group === "main" && o.E < 35 ? Math.min(1, S.edibleB(plant) / 4) : 1);
    const producer=v.m.producer?.get(cell);
    if (producer && producer.HP>0 && s.id !== "kelp" && (s.group === "main" || s.group === "prey"))
      q=Math.max(q,value(S.edibleB(producer)/Math.max(1,(v.traits?.get(producer.id)||S.phenotype(w,producer)).capB-S.PLANT_BASE),"plant") *
        (s.group === "main" && o.E<35 ? Math.min(1,S.edibleB(producer)/4) : 1));
    for (const a of v.m.resources.get(cell) || []) {
      const tag = S.FOOD[a.kind].tag;
      let utility = 1;
      if (s.group === "main") {
        const p = v.traits?.get(o.id) || S.phenotype(w, o);
        const needM =
          o.phase === 2
            ? p.M3
            : o.phase === 3 && s.id !== "precocial"
              ? p.M4
              : 4;
        if (tag === "mineral")
          utility =
            S.clamp((needM - o.M) / Math.max(1, needM), 0, 1) *
            (o.E < 35 ? 0.08 : 0.45);
        else if (["info", "factor"].includes(tag))
          utility = o.E < 35 ? 0 : 0.08;
      }
      q = Math.max(q, value(a.q / S.FOOD[a.kind].cap, tag) * utility);
    }
    for (const a of v.m.carcasses.get(cell) || [])
      if (a.species !== o.species) q = Math.max(q, value(a.q / 4, a.tag));
    const result = Math.min(1, q * (0.9 + 0.2 * o.dna.senses));
    v.qualityCache?.set(cell, result);
    return result;
  }
  function approach(w, origin, to, target) {
    return S.clamp(
      (S.distance(w, origin, target) - S.distance(w, to, target)) / 2,
      -1,
      1,
    );
  }
  function danger(w, o, cell, v) {
    if (v.dangerCache?.has(cell)) return v.dangerCache.get(cell);
    let t = 0;
    for (const enemy of v.enemies) {
      const s = S.spec(enemy);
      if (s.group !== "main") continue;
      const ratio =
          enemy.HP / (v.traits?.get(enemy.id) || S.phenotype(w, enemy)).maxHP,
        hp = ratio >= 0.7 ? 1 : ratio >= 0.3 ? 0.7 : 0.4;
      t +=
        (((9 * phaseA[enemy.phase]) / 24) * hp) /
        (1 + S.distance(w, cell, enemy.cell)) ** 2;
    }
    const result = Math.min(1, t);
    v.dangerCache?.set(cell, result);
    return result;
  }
  function neighborhood(w, o, cell, v) {
    if (v.neighborhoodCache?.has(cell)) return v.neighborhoodCache.get(cell);
    let friends = 0,
      crowd = 0,
      empty = 0;
    for (const p of S.nearby(w, cell)) {
      if (!v.visibleCells.has(p)) continue;
      for(const main of mainMembers(w,v.m,p))if (main.id !== o.id) {
        crowd++;
        if (main.species === o.species) friends++;
      }
      const occupant = (o.slot === "main" ? v.m.main : v.m.food).get(p);
      if ((grouped(w)&&o.slot==="main"?S.mainRoom(w,o,p,v.m):(!occupant || occupant.id === o.id)) && S.oneStep(w, cell, p)) empty++;
    }
    const result = { C: friends / 8, D: crowd / 8, O: empty / 8 };
    v.neighborhoodCache?.set(cell, result);
    return result;
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
    const nearest = v.nearest;
    const move = c.type === "move",
      attack = c.type === "attack",
      guard = c.type === "defend";
    const pairReady = (a) => {
      if(isRyouki(w,a)){
        const p=ctx.traits.get(a.id),b=S.spec(a).birth,male=a.sex==="male";
        return p.ageStage!=="juvenile"&&a.HP>=.7*p.maxHP&&a.E>=(male?b.fatherE:b.motherE)&&
          a.M>=(male?b.fatherM:b.motherM)&&a.birthReady<=w.turn;
      }
      return a.species !== "swarm" && (w.config.ecologyRevision === "observation/4.1" || a.phase >= 3) &&
      ctx.traits.get(a.id)?.ageStage !== "juvenile" && a.role !== "worker" &&
      a.HP >= 70 && a.E >= S.spec(a).birthEnergy*(w.config.ecologyRevision === "observation/4.1"?.65:1) && a.M >= (w.config.ecologyRevision === "observation/4.1"?2:4) && a.birthReady <= w.turn;
    };
    let mateBonus = 0,
      pairApproach = 0,
      shelterBonus = 0;
    for (const p of v.visibleCells) {
      const a = v.m.main.get(p);
      const actors=grouped(w)?S.mainAt(v.m,p):[a];
      for(const a of actors){
      if (!a || a.id === o.id || a.species !== o.species) continue;
      if (
        (o.phase < 3 || a.phase < 3) &&
        (S.distance(w, to, p) <= 1 ||
          S.distance(w, to, p) < S.distance(w, here, p))
      )
        shelterBonus = Math.max(shelterBonus, 0.35);
      if (
        s.id === "swarm" && o.role === "worker" &&
        a.colony === o.colony && (a.role === "queen" || a.phase <= 2) &&
        (S.distance(w, to, p) <= 1 ||
          S.distance(w, to, p) < S.distance(w, here, p))
      ) shelterBonus = Math.max(shelterBonus, 0.6);
      if (
        (w.config.ecologyRevision === "observation/4.1" || (o.phase >= 3 && a.phase >= 3)) &&
        ctx.traits.get(o.id).ageStage !== "juvenile" &&
        ctx.traits.get(a.id).ageStage !== "juvenile" &&
        a.sex !== o.sex &&
        o.role !== "worker" &&
        a.role !== "worker" &&
        o.HP >= 70 &&
        o.E >= 35 &&
        (S.distance(w, to, p) <= 1 ||
          S.distance(w, to, p) < S.distance(w, here, p))
      )
        mateBonus = 0.8;
      if (a.sex !== o.sex && pairReady(o) && pairReady(a)) {
        const attraction = move ? 0.65 * approach(w, here, to, p)
          : S.distance(w, here, p) <= 1 ? 0.2 : 0;
        pairApproach = Math.max(pairApproach, attraction);
      }
      if (o.phase <= 2 && a.phase >= 3 && S.distance(w, to, p) <= 1)
        shelterBonus = Math.max(shelterBonus, 0.1);
      }
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
      move ? oldT - T : guard ? (s.id === "swarm" || o.E >= 35 || oldT > 0 ? 0.25 + 0.5 * oldT : 0) : attack ? -0.25 * oldT : 0,
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
        return mainMembers(w,v.m,p).some(a=>a.species===o.species&&a.phase<=2);
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
    // Only food in this individual's actual visible cells may steer its movement.
    if (!v.foodTargetComputed) {
      let best = null,
        score = 0;
      for (const cell of v.visibleCells) {
        const prey = v.m.food.get(cell);
        const ediblePrey =
          prey && S.spec(prey).group === "prey" && s.diet === "animal";
        const q = Math.max(quality(w, o, cell, v), ediblePrey ? 0.9 : 0);
        const value = q / (1 + S.distance(w, here, cell));
        if (value > score) {
          score = value;
          best = cell;
        }
      }
      v.foodTarget = best;
      v.foodTargetComputed = true;
    }
    const hunger = Math.max(0, (35 - o.E) / 35),
      injury = Math.max(0, (50 - o.HP) / 50);
    const livingNeed = Math.max(0, (65 - o.E) / 65);
    weights[5] *= 1 - 0.95 * livingNeed;
    weights[3] *= 1 - 0.5 * livingNeed;
    weights[6] = Math.min(100, weights[6] + 60 * livingNeed);
    weights[2] = Math.min(100, weights[2] + 35 * livingNeed);
    let score =
      features.reduce(
        (a, v, i) =>
          a + (S.clamp(weights[i], 0, 100) / 100) * S.clamp(v, -1, 1),
        0,
      ) +
      hunger * features[2] +
      injury * features[1] -
      c.cost / 5 +
      lure + pairApproach * Math.max(0, 1 - oldT);
    if ((c.type === "stop" || guard) && quality(w, o, here, v) < 0.1)
      score -= 0.3 * livingNeed;
    const feedingNeed = Math.max(0, (75 - o.E) / 75);
    if (move && v.foodTarget !== null)
      score += (0.3 + 0.7 * feedingNeed) * approach(w, here, to, v.foodTarget);
    if (attack && target) {
      const smallPrey = S.spec(target).group === "prey";
      score +=
        (S.D.diets[s.diet].hunt + (smallPrey ? 0.3 : -0.15)) * feedingNeed;
      // A well-fed animal has less reason to spend energy hunting; defense remains available.
      score -= 0.2 * (1 - feedingNeed);
    }
    if (c.type === "care") score += 0.4;
    if (
      attack &&
      target &&
      target.HP / S.phenotype(w, target).maxHP < 0.3 &&
      S.distance(w, here, target.cell) <= 1
    )
      score += 0.1 * hunger;
    if(c.type === "groom") score += 0.3 + 0.4*(o.weights[4]/100);
    if(isRyouki(w,o)){
      const known=cell=>o.ryouki.recentCells.some(a=>a.cell===cell),foodCell=target?.cell??to,
        foodDistance=S.distance(w,here,foodCell);
      let branchWeight=1;
      if(o.phase>=3&&move){
        if(o.branch3===0&&c.path.some(cell=>!known(cell)))branchWeight*=1.2;
        else if(o.branch3===1&&Q>0&&known(foodCell))branchWeight*=1.2;
      }else if(o.phase>=3&&o.branch3===1&&Q>0&&known(foodCell))branchWeight*=1.2;
      if(o.phase===4){
        if(o.branch3===0&&move){
          if(o.branch4===0&&direction>=Math.SQRT1_2-1e-8)branchWeight*=1.3;
          else if(o.branch4===1&&direction<Math.SQRT1_2-1e-8)branchWeight*=1.2;
        }else if(o.branch3===1&&Q>0&&
          ((o.branch4===0&&foodDistance<=1)||(o.branch4===1&&foodDistance>=2&&foodDistance<=3)))branchWeight*=1.25;
      }
      // A branch strengthens a useful candidate, without reversing a negative
      // danger/cost balance or changing the finite cost paid for that action.
      score+=Math.max(0,score)*(branchWeight-1);c.ryoukiBranchMultiplier=branchWeight;
      c.ryoukiGoal=(move&&oldT>T)?"回避":(c.type==="harvest"||attack||Q>0)?"採食":"探索";
      if(o.ryouki.mutated&&o.phase===4&&ctx.traits.get(o.id).ageStage!=="juvenile"){
        const b=S.spec(o).birth,neededE=o.sex==="male"?b.fatherE:b.motherE;
        const preparation=pairApproach*Math.max(0,1-oldT)+
          (o.E<neededE&&(c.type==="harvest"||move)&&Q>0?.25*Q:0);
        if(preparation>0){score+=(w.config.ryoukiSettings.preparationWeight-1)*preparation;c.ryoukiGoal="繁殖準備";}
      }
    }
    const noRandom = score;
    score += (weights[8] / 100) * xi;
    return { score, noRandom, features, xi };
  }
  function choose(w, ctx, stage = null) {
    const m = S.maps(w);
    for (const o of w.organisms) {
      // Stationary basal life has exactly one possible action. Process that
      // shared rule directly instead of constructing visibility and scores.
      const group = S.spec(o).group;
      if (S.LargePlant?.is(o) && o.species === "freshwaterlight") {
        chooseFloating(w,o,ctx,m,stage);
        continue;
      }
      if (group === "plant" || group === "fungus") {
        const type = "stop", cell = o.cell, path = [];
        const chosen = {type, cell, cost:0, path, score:0, noRandom:0, features:[],
          xi:2*S.r(w,"behavior/jitter",w.turn,o.id,[type,null,path,cell])-1,
          h:S.hash(w,"behavior/tie",w.turn,o.id,[type,null,path,cell])};
        ctx.intents.set(o.id,chosen);
        ctx.records.get(o.id).randomChanged=false;
        if(o.id===ctx.observeId)ctx.diagnostics={id:o.id,candidates:[{type,target:undefined,cell,score:0,cost:0,features:[]}]};
        continue;
      }
      const list = candidates(w, o, ctx, m).filter(c => !stage || (stage === "move" ? ["stop","move"].includes(c.type) : c.type !== "move")),
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
      let chosen=list[0],without=list[0];
      for(let i=1;i<list.length;i++){
        const c=list[i];
        if(c.score>chosen.score || (c.score===chosen.score && c.h<chosen.h))chosen=c;
        if(c.noRandom>without.noRandom || (c.noRandom===without.noRandom && c.h<without.h))without=c;
      }
      if(o.id===ctx.observeId)list.sort((a,b)=>b.score-a.score||a.h-b.h);
      ctx.intents.set(o.id, chosen);
      if(isRyouki(w,o)){
        const rec=ctx.records.get(o.id);
        if(stage!=="effect"||chosen.type!=="stop"||!rec.ryoukiGoal)rec.ryoukiGoal=chosen.ryoukiGoal||"探索";
      }
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
      if (
        S.spec(o).id === "jelly" &&
        o.sex === "female" &&
        (w.config.ecologyRevision === "observation/4.1" || o.phase >= 3) &&
        ctx.traits.get(o.id).ageStage !== "juvenile"
      )
        o.maleAbsent = [...v.visibleCells].some((p) => {
          return mainMembers(w,m,p).some(t => (
            t.species === o.species &&
            t.sex === "male" &&
            (w.config.ecologyRevision === "observation/4.1" || t.phase >= 3) &&
            ctx.traits.get(t.id).ageStage !== "juvenile"
          ));
        })
          ? 0
          : Math.min(8, o.maleAbsent + 1);
    }
  }
  function moveGrouped(w,ctx){
    const initial=S.maps(w),positions=new Map(),entries=[];
    for(const o of w.organisms){
      if(!positions.has(o.slot))positions.set(o.slot,new Map());
      const cells=positions.get(o.slot);if(!cells.has(o.cell))cells.set(o.cell,[]);cells.get(o.cell).push(o);
      const c=ctx.intents.get(o.id);
      if(c.type==="move"&&o.HP>0)entries.push({o,c,from:o.cell,steps:[],cost:0,active:true,limit:ctx.traits.get(o.id).speed,
        friend:S.nearby(w,o.cell).some(cell=>mainMembers(w,initial,cell).some(a=>a.species===o.species)),
        h:S.hash(w,"movement/arbitration",w.turn,o.id,c.path)});
    }
    const order=entries.slice().sort((a,b)=>a.h-b.h||S.compare(a.o.id,b.o.id));
    const maximum=Math.max(0,...entries.map(e=>Math.min(e.limit,e.c.path.length)));
    for(let step=0;step<maximum;step++){
      const reserved=new Map([...positions].map(([slot,cells])=>[slot,new Map([...cells].map(([cell,list])=>[cell,list.slice()]))])),accepted=[];
      const mains=reserved.get("main")||new Map(),index={mainByCell:mains,main:new Map([...mains].map(([cell,list])=>[cell,list.at(-1)]))};
      for(const e of order){
        if(!e.active||step>=e.c.path.length||step>=e.limit)continue;
        const cell=e.c.path[step],p=ctx.traits.get(e.o.id),rec=ctx.records.get(e.o.id),budget=ctx.costs.get(e.o.id);
        if(cell===e.o.cell||!w.tiles[cell]||!S.oneStep(w,e.o.cell,cell)||!S.validHabitat(w,S.spec(e.o),cell)||!S.sight(w,e.o.cell,cell)){
          e.active=false;rec.failure="RESERVATION_LOST";continue;
        }
        const cost=moveCost(w,e.o,cell,p.phase,e.friend,p.ageFactors.move);
        if(cost>budget.budget-budget.action+1e-8){
          e.active=false;rec.failure="RESERVATION_LOST";if(isRyouki(w,e.o))rec.ryoukiMoveBudgetLimited=true;continue;
        }
        if(!reserved.has(e.o.slot))reserved.set(e.o.slot,new Map());
        const cells=reserved.get(e.o.slot),occupants=cells.get(cell)||[];
        if(e.o.slot==="main"?!S.mainRoom(w,e.o,cell,index):occupants.some(a=>a.id!==e.o.id)){
          e.active=false;rec.failure="RESERVATION_LOST";continue;
        }
        cells.set(cell,[...occupants,e.o]);if(e.o.slot==="main")index.main.set(cell,e.o);
        accepted.push({e,cell,cost});
      }
      for(const {e,cell,cost}of accepted){
        const cells=positions.get(e.o.slot),old=cells.get(e.o.cell).filter(a=>a.id!==e.o.id);
        if(old.length)cells.set(e.o.cell,old);else cells.delete(e.o.cell);
        cells.set(cell,[...(cells.get(cell)||[]),e.o]);e.o.cell=cell;e.steps.push(cell);e.cost+=cost;
        ctx.costs.get(e.o.id).action+=cost;
      }
    }
    for(const e of entries){
      const {o,c,steps}=e,rec=ctx.records.get(o.id);
      if(isRyouki(w,o)){rec.ryoukiSteps=steps.slice();rec.ryoukiMoveCost=e.cost;}
      if(!steps.length)continue;
      rec.moved=true;rec.newPlace=!o.history.includes(o.cell);o.facing=c.direction;
      if(rec.newPlace)o.pendingMove={turn:w.turn,expires:w.turn+3,cell:o.cell};
      o.history.push(o.cell);o.history=o.history.slice(-4);
      S.record(ctx,o,"move",{from:e.from,to:o.cell,path:steps.slice()});
    }
    ctx.current=S.maps(w);
  }
  function move(w, ctx) {
    if(grouped(w))return moveGrouped(w,ctx);
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
        ctx.costs.get(o.id).action += c.cost;
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
        (S.spec(o).id === "kelp" && S.spec(target).group !== "prey") ||
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
      ctx.costs.get(o.id).action += c.cost;
      if (range === 2) o.attackReady = w.turn + 2;
      S.record(ctx, o, "attack", { target: target.id, to: target.cell });
    }
    for (const [id, hits] of byTarget) {
      const target = m.byId.get(id),
        total = hits.reduce((a, h) => a + h.damage, 0),
        actual = Math.min(target.HP, total);
      for (const h of hits) {
        const share = (actual * h.damage) / total;
        // Presentation facts only; these values are never read by action resolution.
        const event=ctx.events.get(h.o.id)?.find(e=>e.type==="attack"&&e.target===id);
        if(event){event.actualDamage=share;event.mitigated=h.mitigated;}
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
        (ctx.traits.get(target.id).capE - target.E < 1.8 - 1e-8 &&
          target.M >= 8 && target.G >= 90) ||
        !S.oneStep(w, o.cell, target.cell)
      )
        continue;
      o.E = S.round(o.E - 2);
      const material = Math.min(0.2, Math.max(0, o.M - 2), Math.max(0, 8 - target.M));
      o.M = S.round(o.M - material);
      const careGain = Nutrition.absorb(w, target, { E: 2, M: material, G: 0 }, "animal", ctx);
      ctx.records.get(o.id).cared = true;
      S.record(ctx, o, "care", {
        target: target.id,
        to: target.cell,
        amount: careGain.e,
        material: careGain.m,
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
        S.nearby(w, o.cell).some(p => mainMembers(w,m,p).some(a=>a.species===o.species))
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
      rec.category = isRyouki(w,o)?null:
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
            for(const a of mainMembers(w,m,p))
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
        let deltaAbs=0;
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
          const beforeInformation=o.weights[component.axis];
          o.weights[component.axis] = S.clamp(
            o.weights[component.axis] + d,
            0,
            100,
          );
          deltaAbs+=Math.abs(S.round(o.weights[component.axis])-S.round(beforeInformation));
        }
        (ctx.infoEffects??=[]).push({recipient:o.id,species:o.species,event:{id:event.id,sourceId:event.sourceId,time:event.time,mediated:!!event.mediator,noise:!!event.noise},deltaAbs});
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
