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
  const survival = (w) => ["survival/1","survival/2","survival/3","survival/4"].includes(w.config.balanceModel);
  function sparseMainBirths(w, ctx) {
    if (!survival(w)) return false;
    if (ctx.sparseMainBirths === undefined) {
      const area = Math.max(1, w.tiles.filter((tile) => !tile.blocked).length),
        count = w.organisms.reduce((n, o) => n + (S.spec(o).group === "main" ? 1 : 0), 0);
      ctx.sparseMainBirths = count / area < .20;
    }
    return ctx.sparseMainBirths;
  }
  function mainNeighborAllowed(w, ctx, count, storedFather = false) {
    return [2, 3].includes(count) ||
      (sparseMainBirths(w, ctx) && count >= (storedFather ? 1 : 2) && count <= 5);
  }
  function lead(values, minimum) {
    const ranked = values
      .map((value, i) => ({ value, i }))
      .sort((a, b) => b.value - a.value || a.i - b.i);
    return ranked[0].value >= minimum && ranked[0].value - ranked[1].value >= 2
      ? ranked[0].i
      : null;
  }
  function growth(w, ctx) {
    S.Ryouki.finalize(w,ctx);
    for (const o of w.organisms) {
      if (!ctx.traits.has(o.id)) continue;
      const s = S.spec(o),
        p = ctx.traits.get(o.id),
        rec = ctx.records.get(o.id),
        old = p.phase;
      if(S.LargePlant.is(o))continue;
      if(S.Ryouki.is(o))continue;
      if (s.group !== "main") {
        if(S.Colony.is(o)||S.FungalColony.is(o)){
          if(old===1&&o.colony.activity>0&&o.E>=6&&S.edibleB(o)>=2)o.phase=2;
          continue;
        }
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
  function birthPressure(w,o,ctx){
    const group=S.spec(o).group;
    if(!w.config.populationRegulation||!["main","prey"].includes(group))return {allowed:true,chance:1,density:0,foodFactor:1};
    const cache=ctx.birthPressure??=new Map();if(cache.has(o.id))return cache.get(o.id);
    let counts=ctx.birthPressureCounts;
    if(!counts){counts=ctx.birthPressureCounts={main:new Map(),prey:new Map()};for(const a of w.organisms){const g=S.spec(a).group;if(counts[g])counts[g].set(a.cell,(counts[g].get(a.cell)||0)+1);}}
    const area=ctx.birthPressureArea??=Math.max(1,w.tiles.filter(t=>!t.blocked).length);
    const cells=S.nearby(w,o.cell,2,true).filter(c=>!w.tiles[c].blocked&&S.validHabitat(w,S.spec(o),c)),
      peers=cells.reduce((n,c)=>n+(counts[group].get(c)||0),0),
      localDensity=peers/Math.max(1,cells.length),
      density=group==="prey"?Math.min(localDensity,counts.prey.size/area*2):localDensity,
      target=group==="main"?(survival(w)?.20:.16):.08,
      rec=ctx.records.get(o.id),maintenance=ctx.traits.get(o.id)?.maintenance||1,
      reserve=Math.max(0,o.E-(group==="main"?(S.spec(o).birthEnergy||60)*.65:8)),
      foodFactor=Math.max(.25,Math.min(1,((rec?.organic||0)+(rec?.light||0)+reserve)/(maintenance*2))),
      chance=foodFactor/(1+(group==="main"?(survival(w)?4:8):12)*Math.max(0,density-target)/target),
      result={chance,density,foodFactor,allowed:S.r(w,"birth/local-pressure",w.turn,o.id)<chance};
    cache.set(o.id,result);return result;
  }
  function eligible(w, o, ctx, asexual = false) {
    const s = S.spec(o),
      rec = ctx.records.get(o.id),
      p = ctx.traits.get(o.id);
    if(S.Ryouki.is(o)){
      const b=s.birth,mother=o.sex==="female";
      return !asexual&&!!rec&&o.HP>0&&p.ageStage!=="juvenile"&&o.HP>=.7*p.maxHP&&o.birthReady<=w.turn&&
        o.E>=(mother?b.motherE:b.fatherE)&&o.M>=(mother?b.motherM:b.fatherM)&&birthPressure(w,o,ctx).allowed;
    }
    if(p?.ageStage === "juvenile" || (s.group === "plant" && S.ProducerSupport.factor(w,o,S)===0))return false;
    if (!rec || rec.damage > 0 || o.HP <= 0 || o.birthReady > w.turn)
      return false;
    if(!birthPressure(w,o,ctx).allowed)return false;
    if(S.LargePlant.is(o)){
      const cost=o.phase===4&&o.branch3===1?(o.branch4===0?14:8):10;
      return p.ageStage!=="juvenile"&&o.plant.activity>0&&o.HP>=.7*p.maxHP&&o.E>=cost+4*p.maintenance&&o.M>=.2;
    }
    if(S.Colony.is(o))return p.phase>=2&&o.colony.activity>0&&o.E>=8&&o.M>=.2&&o.B>=3;
    if(survival(w)&&s.id==="grassbug")return p.phase>=2&&o.E>=10;
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
    const m = S.maps(w),out=[],cells=w.organisms.length*8<w.tiles.length?new Set():null,enabledSpecies=S.D.species.filter(s=>["plant","fungus","prey"].includes(s.group)&&w.config.enabled[s.group]);
    if(cells)for(const o of w.organisms)for(const cell of S.nearby(w,o.cell))cells.add(cell);
    for (let cell=0;cell<w.tiles.length;cell++) {
      if(cells&&!cells.has(cell))continue;
      if (w.tiles[cell].blocked) continue;
      const near = S.nearby(w, cell),
        mains = near.map((p) => m.main.get(p)).filter(Boolean),
        food = near.map((p) => m.food.get(p)).filter(Boolean),
        local = [];
      if(S.LargePlant.enabled(w)&&w.config.enabled.plant&&!m.producer.has(cell)){
        for(const parent of near.map(p=>m.producer.get(p)).filter(Boolean))
          if(S.validHabitat(w,S.spec(parent),cell)&&S.oneStep(w,parent.cell,cell)&&eligible(w,parent,ctx)){
            const cost=parent.phase===4&&parent.branch3===1?(parent.branch4===0?14:8):10;
            local.push({cell,slot:"producer",kind:2,parents:[parent],costs:[cost],species:parent.species});
          }
      }
      if (!m.main.has(cell) && w.config.enabled.main) {
        if(S.Ryouki.enabled(w)&&S.validHabitat(w,S.D.ryouki,cell)){
          const peers=near.flatMap(p=>S.mainAt(m,p)).filter(o=>S.Ryouki.is(o));
          for(const mother of peers)if(mother.sex==="female"&&eligible(w,mother,ctx)&&S.oneStep(w,mother.cell,cell))
            for(const father of peers)if(father.sex==="male"&&eligible(w,father,ctx)&&S.oneStep(w,father.cell,cell)&&S.oneStep(w,mother.cell,father.cell))
              local.push({cell,slot:"main",kind:0,parents:[mother,father],costs:S.D.ryouki.birth.costsE.slice(),species:"ryouki"});
        }
        if(mainNeighborAllowed(w,ctx,mains.length,true))for(const mother of mains)
          if(mother.species==="swarm"&&mother.role==="queen"&&mother.sperm?.uses>0&&eligible(w,mother,ctx)&&mother.E>=40&&mother.M>=4&&S.oneStep(w,mother.cell,cell))
            local.push({cell,slot:"main",kind:3,parents:[mother],fatherReference:mother.sperm.father,costs:[40],species:mother.species});
        if (mainNeighborAllowed(w,ctx,mains.length))
          for (const mother of mains)
            if (
              !S.Ryouki.is(mother) && mother.sex === "female" && !(mother.species === "swarm" && mother.sperm?.uses>0) &&
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
        for (const s of enabledSpecies) {
          if (!S.validHabitat(w, s, cell)) continue;
          const same = food.filter((o) => o.species === s.id);
          if(S.Colony.enabled(w)&&s.group==="plant"){
            if(!S.Colony.allowed(w,s)||!S.Colony.room(w,cell,ctx.colonyCounts??=S.Colony.occupancy(w))||!same.length)continue;
          }else if (
            s.group === "prey"
              ? ![2, 3].includes(same.length) && !(survival(w)&&s.id==="grassbug"&&same.length===1)
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
        if(S.PersistentInformation?.enabled(w)&&ctx.informationHooks){
          c.informationChoices=c.parents.map(parent=>({parent,place:ctx.informationHooks.informationPlace(w,ctx,parent,cell)}));
          c.informationScore=c.informationChoices.reduce((sum,{parent,place})=>sum+place.value+
            (S.spec(parent).group!=="main"?S.PersistentInformation.preference(w,parent,5)/100:0),0)/c.parents.length;
        }
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
      if(S.LargePlant.enabled(w)){const winner=local.filter(c=>c.slot==="producer").sort(compare)[0];if(winner)out.push(winner);}
    }
    return out;
  }
  function compare(a, b) {
    return a.kind - b.kind || (b.informationScore||0)-(a.informationScore||0) || a.h - b.h || S.compare(a.key, b.key);
  }
  function child(w, c, ctx) {
    if(c.species==="ryouki")return ryoukiChild(w,c,ctx);
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
      early = s.id === "precocial", independent=S.LargePlant.is(mother);
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
      ...(independent?{phase:1,age:0,plantOrigin:{kind:"parent",parentId:mother.id,turn:w.turn}}:{}),
      ...((S.Colony.is(mother)||S.FungalColony.is(mother))?{colonyOrigin:{kind:"parent",parentId:mother.id,turn:w.turn}}:{}),
      E: independent ? T-4 : main ? S.round(T * share) : 6,
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
    if(independent){
      for(const axis of S.DNA){const mutation=S.r(w,"independent/inherited-mutation",w.turn,id,axis)<.1?(S.r(w,"independent/inherited-step",w.turn,id,axis)<.5?-.05:.05):0;o.dna[axis]=S.round(S.clamp(mother.dna[axis]+mutation,0,1));}
      S.dissipate(w,2);S.LargePlant.allocation(w,mother,1,T,mother.phase===4&&mother.branch3===1?mother.branch4:null);
    }
    S.initializeAge(w,o);
    c.parents.forEach((parent, i) => {
      parent.E = S.round(parent.E - c.costs[i]);
      parent.M = S.round(
        parent.M -
          (main ? ([1,3].includes(c.kind) ? 4 : 2) : s.group === "prey" ? 0 : 0.2),
      );
      ctx.parents.add(parent.id);
      if(S.Colony.is(parent))S.Colony.increment(parent,"settlements",1);
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
  function ryoukiChild(w,c,ctx){
    const s=S.D.ryouki,b=s.birth,mother=c.parents[0],father=c.parents[1],
      id="b:"+w.turn+":"+c.slot+":"+Math.floor(c.cell/w.config.width)+":"+(c.cell%w.config.width),dna={};
    for(const [i,axis]of S.DNA.entries()){
      const big=S.r(w,"birth/mutation-kind",w.turn,id,null,i)<.01,range=big?.05:.02;
      dna[axis]=S.round(S.clamp((mother.dna[axis]+father.dna[axis])/2+(2*S.r(w,"birth/dna",w.turn,id,null,i)-1)*range));
    }
    const birthWeights=s.weights.map((v,i)=>S.round(S.clamp(.75*v+.25*(mother.birthWeights[i]+father.birthWeights[i])/2+(4*S.r(w,"birth/weights",w.turn,id,null,i)-2),0,100)));
    const o=S.organism(w,s,c.cell,id,{phase:1,age:0,G:0,dna,birthWeights,weights:birthWeights.slice(),
      sex:S.r(w,"birth/sex",w.turn,id)<.5?"female":"male",E:b.childE,B:b.childB,M:b.childM,HP:s.capacity[3],
      generation:Math.max(mother.generation,father.generation)+1,parents:[mother.id,father.id]});
    c.parents.forEach((parent,i)=>{
      parent.E=S.round(parent.E-b.costsE[i]);parent.M=S.round(parent.M-b.costsM[i]);ctx.parents.add(parent.id);
      parent.birthReady=w.turn+Math.ceil(ctx.traits.get(parent.id).cooldown)+1;parent.firstBirthAt??=w.turn;
    });
    S.dissipate(w,b.dissipatedE);S.record(ctx,o,"birth",{parents:o.parents});return o;
  }
  function blockers(w,o,ctx,m=S.maps(w)) {
    const s=S.spec(o),p=ctx.traits.get(o.id)||S.phenotype(w,o),reasons=[];
    if(S.Ryouki.is(o)){
      const b=s.birth,mother=o.sex==="female",near=S.nearby(w,o.cell,1,true).flatMap(cell=>S.mainAt(m,cell));
      if(p.ageStage==="juvenile")reasons.push("未成熟");
      if(o.HP<.7*p.maxHP)reasons.push("健康不足");
      if(o.E<(mother?b.motherE:b.fatherE))reasons.push("栄養不足");
      if(o.M<(mother?b.motherM:b.fatherM))reasons.push("鉱物不足");
      if(o.birthReady>w.turn)reasons.push("待機中");
      if(!near.some(a=>a.id!==o.id&&S.Ryouki.is(a)&&a.sex!==o.sex&&eligible(w,a,ctx)&&S.oneStep(w,o.cell,a.cell)))reasons.push("局所配偶相手なし");
      if(!S.nearby(w,o.cell).some(cell=>!m.main.has(cell)&&S.validHabitat(w,s,cell)&&S.oneStep(w,o.cell,cell)))reasons.push("出生場所不足");
      if(!birthPressure(w,o,ctx).allowed)reasons.push("混雑・栄養収支による出生調整");
      return reasons;
    }
    if(p.ageStage==="juvenile")reasons.push("未成熟");
    if(o.HP<70)reasons.push("健康不足");if(o.E<s.birthEnergy*(w.config.ecologyRevision === "observation/4.1"?.65:1))reasons.push("栄養不足");if(o.M<(o.sperm?.uses>0?4:2))reasons.push("鉱物不足");
    if(o.birthReady>w.turn)reasons.push("待機中");if(o.role==="worker")reasons.push("非繁殖階級");if(ctx.records.get(o.id)?.damage>0)reasons.push("当日被害");
    const near=S.nearby(w,o.cell).map(c=>m.main.get(c)).filter(Boolean);
    if(o.sex==="female" && !(o.sperm?.uses>0) && !(s.id==="jelly"&&o.maleAbsent>=8) && !near.some(a=>a.species===o.species && a.sex!==o.sex && S.ageInfo(a).stage!=="juvenile" && S.oneStep(w,o.cell,a.cell)))reasons.push("局所配偶相手なし");
    if(!S.nearby(w,o.cell).some(c=>!m.main.has(c)&&S.oneStep(w,o.cell,c)&&mainNeighborAllowed(w,ctx,S.nearby(w,c).filter(k=>m.main.has(k)).length,o.sperm?.uses>0)))reasons.push("出生場所不足");
    if(!birthPressure(w,o,ctx).allowed)reasons.push("混雑・栄養収支による出生調整");
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
        if(S.Colony.is(c.parents[0])&&!S.Colony.room(w,c.cell,ctx.colonyCounts??=S.Colony.occupancy(w)))continue;
        children.push(child(w, c, ctx));
        for(const {parent,place}of c.informationChoices||[])ctx.informationHooks.informationUsed(w,ctx,parent,c.cell,place);
        if(S.Colony.is(c.parents[0]))ctx.colonyCounts[S.Colony.region(w,c.cell)]++;
        ctx.births.push(c.species);
      }
    }
    w.organisms.push(...children);
    ctx.children = children;
    return children;
  }
  return { lead, growth, eligible, birthPressure, birthCost, candidates, child, reproduce };
});
