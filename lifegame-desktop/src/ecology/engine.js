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
    const counts = Object.fromEntries((S.activeSpecies?.(w)||S.D.species).map((s) => [s.id, 0])),
      phases = [0, 0, 0, 0],
      roles = { queen: 0, worker: 0, male: 0 },
      infectionStages = { first: 0, middle: 0, extra: 0, terminal: 0 },
      colonies = {};
    let main = 0,
      food = 0,
      producer = 0,
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
      } else if(S.LargePlant?.is(o))producer++;
      else food++;
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
    if(S.PrimaryParasite?.enabled(w))for(const {p,carrier} of S.PrimaryParasite.entries(w)){
      if(carrier?.infection!==p||w.organisms.includes(carrier))continue;
      Pcount++;counts[p.species]++;infectionStages[p.stage]++;
      if(p.q){Qcount++;counts.hyperparasite++;}
    }
    counts.hyperparasite += w.searchQ?.length || 0;
    return {
      population: w.organisms.length,
      main,
      food,
      ...(S.LargePlant?.enabled(w)?{producer}:{}),
      P: Pcount,
      Q: Qcount + (w.searchQ?.length || 0),
      ...(w.config.ecologyRevision === "observation/4.1" ? {Qsearch:w.searchQ?.length||0} : {}),
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
    if(S.PrimaryParasite?.enabled(w)){
      ctx.primaryHooks=P;
      ctx.primaryFlow=P.emptyPrimaryFlow(w);
    }
    if(S.HyperParasite?.enabled(w))ctx.hyperFlow=P.emptyHyperFlow(w);
    if(S.PersistentInformation?.enabled(w)){
      ctx.informationHooks=P;
      ctx.persistentInformationFlow=P.emptyInformationFlow(w);
    }
    for (const o of w.organisms) {
      ctx.traits.set(o.id, S.phenotype(w, o));
      ctx.old.set(o.id, {
        phase: o.phase,
        species: o.species,
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
    const sharedPlants=S.LargePlant?.enabled(w);
    if(sharedPlants)S.LargePlant.prepareLight(w,ctx);
    for (const o of w.organisms) {
      const s = S.spec(o),
        p = ctx.traits.get(o.id),
        light =
          s.group === "plant"
            ? 4 * w.tiles[o.cell].light * S.leafFactor(o)
            : s.id === "kelp"
              ? 1.5 * w.tiles[o.cell].light * [0, 1, 1.1, 1.2, 1.3][p.phase]
              : 0;
      const ageLight=sharedPlants&&(s.group==="plant"||s.id==="kelp")?0:S.round(light*p.ageFactors.light*(w.config.solarScale || 1)*S.ProducerSupport.factor(w,o,S));
      if (ageLight) {
        const add = Math.min(p.capE - o.E, ageLight);
        o.E = S.round(o.E + add);
        w.ledger.solar = S.round(w.ledger.solar + ageLight);
        S.dissipate(w, ageLight - add);
        ctx.records.get(o.id).light = ageLight;
        if(S.Colony.is(o))S.Colony.solar(w,o,add);
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
        base: base*(w.config.ecologyRevision === "observation/4.1" && S.spec(o).group === "main" && !S.Ryouki.is(o) ? .65 : 1),
        density,
        neighborCount,
        budget: Math.max(0, o.E - base*(w.config.ecologyRevision === "observation/4.1" && S.spec(o).group === "main" && !S.Ryouki.is(o) ? .65 : 1) - density - (o.infection && !S.PrimaryParasite?.enabled(w) ? 0.2 : 0)),
      });
    }
  }
  const priorities = {
    death: 0,
    birth: 1,
    growth: 1,
    infection: 2,
    "primary-established": 2,
    "primary-transferred": 2,
    "primary-clear": 2,
    "hyper-established": 2,
    "hyper-emerged": 2,
    "hyper-cleared": 2,
    attack: 3,
    feed: 4,
    care: 4,
    move: 5,
    defend: 6,
    light: 7,
  };
  function emptyTallies(w) {
    const species=w&&S.activeSpecies?S.activeSpecies(w):S.D.species;
    return {
      births: Object.fromEntries(species.map((s) => [s.id, 0])),
      deaths: Object.fromEntries(species.map((s) => [s.id, 0])),
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
  function observation(w,ctx) {
    const refs = new Map(w.organisms.map(o=>[o.id,o.species]));
    for(const [id,old] of ctx.old) if(old.species) refs.set(id,old.species);
    const relations={};
    for(const o of w.organisms)if(o.infection){refs.set(o.infection.id,o.infection.species);if(o.infection.q)refs.set(o.infection.q.id,"hyperparasite");}
    if(S.HyperParasite?.enabled(w))for(const {q} of S.HyperParasite.entries(w))refs.set(q.id,q.species);
    function add(from,to,type,amount=1) {
      if(!from||!to)return;
      const key=from+"|"+to+"|"+type;
      relations[key]=(relations[key]||0)+amount;
    }
    for(const [id,list] of ctx.events) for(const e of list) {
      if(e.type==="attack")add(refs.get(id),refs.get(e.target),"combat");
      if(e.type==="feed")add(refs.get(id),e.sourceSpecies || refs.get(e.source),"feeding");
      if(e.type==="care"||e.type==="clear")add(refs.get(id),refs.get(e.target),e.type);
      if(e.type==="infection")add(e.species || refs.get(e.parasite),refs.get(e.target)||refs.get(id),"infection");
      if(S.PrimaryParasite?.enabled(w)){
        if(["primary-established","primary-transferred"].includes(e.type))add(e.species,refs.get(id),"infection");
        if(e.type==="primary-clear")add(refs.get(id),e.species,"clear");
      }
      if(S.HyperParasite?.enabled(w)){
        if(e.type==="hyper-established")add("hyperparasite",e.hostSpecies||refs.get(e.target),"infection");
        if(e.type==="hyper-cleared")add(e.hostSpecies||refs.get(e.target),"hyperparasite","clear");
      }
    }
    const map=S.maps(w),last=new Set(w.contactPairs||[]),pairs=[],contactEpisodes={},contactTurns={};
    const contactAdd=(out,key)=>out[key]=(out[key]||0)+1;
    for(const a of w.organisms)for(const cell of S.nearby(w,a.cell,1,true)){
      if(!S.oneStep(w,a.cell,cell))continue;
      for(const b of (S.Ryouki.enabled(w)?[...S.mainAt(map,cell),map.food.get(cell),map.prey?.get(cell)]:[map.main.get(cell),map.food.get(cell)])){
        if(!b || S.compare(a.id,b.id)>=0)continue;
        const pair=a.id+"|"+b.id,pairSpecies=[a.species,b.species].sort().join("|")+"|contact";
        pairs.push(pair);contactAdd(contactTurns,pairSpecies);
        // Record one new encounter per pair, not one event for each endpoint.
        if(!last.has(pair))contactAdd(contactEpisodes,pairSpecies);
        add(pairSpecies.split('|')[0],pairSpecies.split('|')[1],"contact");
      }
    }
    w.contactPairs=pairs;
    const composition={};const links={};const birthReasons={};
    w.demography ??= {};
    const cohort=(species,generation)=>w.demography[species+"|"+generation]??={species,generation,initial:0,born:0,matured:0,reproduced:0,juvenileDeaths:0};
    const childIds=new Set((ctx.children||[]).map(a=>a.id));
    for(const o of w.organisms){const c=cohort(o.species,o.generation);
      if(w.turn===0)c.initial++;
      if(childIds.has(o.id))c.born++;
      if(!S.Colony.is(o)&&ctx.traits.get(o.id)?.ageStage==="juvenile" && S.ageInfo(o).stage!=="juvenile")c.matured++;
      if(o.firstBirthAt===w.turn && ctx.parents.has(o.id))c.reproduced++;
    }
    for(const d of ctx.deaths)if(d.ageStage==="juvenile")cohort(d.species,d.generation).juvenileDeaths++;

    for(const o of w.organisms) {
      const row=composition[o.species]??={phases:[0,0,0,0],ages:{juvenile:0,adult:0,elderly:0},sex:{female:0,male:0,none:0},roles:{}};
      row.phases[o.phase-1]++;
      if(S.Colony.is(o)){row.ages.nonapplicable=(row.ages.nonapplicable||0)+1;row.sex.nonapplicable=(row.sex.nonapplicable||0)+1;}
      else{row.ages[S.ageInfo(o).stage]++;row.sex[o.sex in row.sex ? o.sex : "none"]++;}
      if(o.birthBlockers){const reasons=birthReasons[o.species]??={};for(const reason of o.birthBlockers)reasons[reason]=(reasons[reason]||0)+1;}
      if(o.role)row.roles[o.role]=(row.roles[o.role]||0)+1;
      if(o.infection){const p=o.infection;add(p.species,o.species,"bond");links[p.species+"|"+o.species+"|bond"]=(links[p.species+"|"+o.species+"|bond"]||0)+1;if(p.q){add("hyperparasite",p.species,"bond");links["hyperparasite|"+p.species+"|bond"]=(links["hyperparasite|"+p.species+"|bond"]||0)+1;}}
      for(const e of ctx.records.get(o.id)?.information || [])add(refs.get(e.sourceId),o.species,"information");
    }
    // Exact observation facts before the animation event cap. No decision reads these.
    const flowTelemetry={definition:"nutrition-observed/1",inputs:[],production:{}};
    if(w.turn>0)for(const [id,list]of ctx.events){
      const species=refs.get(id);if(!species)continue;
      for(const e of list){
        if(e.type==="light")flowTelemetry.inputs.push({id,species,type:"light",energy:e.amount,source:null,sourceSpecies:null,tag:"light",withdrawn:0});
        if(e.type==="feed")flowTelemetry.inputs.push({id,species,type:e.sourceType,energy:e.assimilated||0,source:e.source,sourceSpecies:e.sourceSpecies,tag:e.tag,withdrawn:e.amount||0});
      }
      const produced=ctx.records.get(id)?.light||0;if(produced>0)flowTelemetry.production[species]=(flowTelemetry.production[species]||0)+produced;
    }
    const combat={definition:"combat-observed/1",kills:{}};
    for(const death of ctx.deaths){
      if(death.reason!=="combat")continue;
      const attacker=ctx.records.get(death.id)?.hitBy,credited=refs.get(attacker);
      if(credited)combat.kills[credited]=(combat.kills[credited]||0)+1;
    }
    flowTelemetry.combat=combat;
    if(w.config.relationshipModel==="network/1"){
      // Exact presentation facts before the animation cap. Biology never reads this table.
      const relationship={definition:"relationship-telemetry/1",turn:w.turn,damage:{},kills:{},care:{},clear:{}};
      const pair=(table,from,to,value=1)=>{if(!from||!to||!(value>0))return;const key=from+"|"+to;table[key]=(table[key]||0)+value;};
      if(w.turn>0){
        for(const [id,list]of ctx.events)for(const e of list){
          const from=refs.get(id),to=refs.get(e.target);
          if(e.type==="attack")pair(relationship.damage,from,to,e.actualDamage);
          if(e.type==="care"&&e.amount>0)pair(relationship.care,from,to);
          if(e.type==="clear"&&["groom","immunity"].includes(e.reason))pair(relationship.clear,from,to||from);
          // New P grooming is same-species only; the emitted holder is the beneficiary.
          if(e.type==="primary-clear"&&["groom","immunity"].includes(e.reason))pair(relationship.clear,from,from);
          if(e.type==="hyper-cleared"&&["groom","immunity"].includes(e.reason))pair(relationship.clear,e.hostSpecies,e.hostSpecies);
        }
        for(const death of ctx.deaths)if(death.reason==="combat")pair(relationship.kills,refs.get(ctx.records.get(death.id)?.hitBy),death.species||refs.get(death.id));
      }
      flowTelemetry.relationship=relationship;
    }
    flowTelemetry.information={definition:"information-observed/1",emissions:ctx.infoEmissions||[],receipts:ctx.infoReceipts||[],effects:ctx.infoEffects||[],origins:[]};
    for(const a of w.resources)if(a.kind==="info"&&a.event&&refs.has(a.event.sourceId))flowTelemetry.information.origins.push({id:a.event.id,species:refs.get(a.event.sourceId),time:a.event.time});
    return {...(w.producerSupport?{environmentEstablished:{...w.producerSupport.last.established},externalInput:{E:w.producerSupport.last.inputE,M:w.producerSupport.last.inputM,B:w.producerSupport.last.regrownB}}:{}),...(S.PrimaryParasite?.enabled(w)?{primaryParasite:structuredClone(ctx.primaryFlow)}:{}),...(S.HyperParasite?.enabled(w)?{hyperParasite:structuredClone(ctx.hyperFlow)}:{}),...(S.PersistentInformation?.enabled(w)?{persistentInformation:structuredClone(ctx.persistentInformationFlow)}:{}),turn:w.turn,flowTelemetry,relations:w.turn===0?{}:relations,links,composition,birthReasons,funnel:structuredClone(w.demography),contactEpisodes:w.turn===0?{}:contactEpisodes,contactTurns:w.turn===0?{}:contactTurns,births:ctx.births.length,deaths:ctx.deaths.length,transfers:ctx.transfers};
  }
  function finish(w, ctx) {
    if(S.PersistentInformation?.enabled(w))w.persistentInformationSummary=S.PersistentInformation.summary(w);
    if(S.HyperParasite?.enabled(w))S.HyperParasite.summary(w);
    if(S.PrimaryParasite?.enabled(w))S.PrimaryParasite.summary(w);
    S.Ryouki.summary(w);
    S.Colony.summary(w);
    if(S.LargePlant?.enabled(w))S.LargePlant.summary(w);
    S.ProducerSupport.finish(w,ctx,S);
    w.tallies = w.tallies || emptyTallies(w);
    for (const id of ctx.births) w.tallies.births[id]++;
    for (const death of ctx.deaths) {
      w.tallies.deaths[death.species]++;
      w.tallies.causes[death.reason]=(w.tallies.causes[death.reason]??0)+1;
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

    if(w.config.ecologyRevision === "observation/4.1") w.observation = observation(w,ctx);
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
    if(S.PersistentInformation?.enabled(w))w.persistentInformationSummary=S.PersistentInformation.summary(w);
    if(S.HyperParasite?.enabled(w))S.HyperParasite.summary(w);
    if(S.PrimaryParasite?.enabled(w))S.PrimaryParasite.summary(w);
    S.Ryouki.summary(w);
    w.stats = summarize(w);
    if(w.config.ecologyRevision === "observation/4.1") w.observation=observation(w,context(w));
    w.last = {
      births: 0,
      deaths: 0,
      transfers: 0,
      infectionFailures: 0,
      deathCauses: [],
    };
    w.stopReason = null;
    w.tallies = emptyTallies(w);
    w.checkpoints = [checkpoint(w)];
    return w;
  }
  function beginTurn(previous, options = {}) {
    let w = structuredClone({...previous,tiles:undefined,observation:undefined,diagnostics:undefined}), stage = 0, cancelled = false, failed = false;
    // Prior telemetry is read-only until finish replaces it; do not clone it every turn.
    if(Object.hasOwn(previous,"observation"))w.observation=previous.observation;else delete w.observation;
    if(Object.hasOwn(previous,"diagnostics"))w.diagnostics=previous.diagnostics;else delete w.diagnostics;
    w.tiles=previous.tiles.map(t=>({...t}));
    S.inheritGeometry(previous,w);
    if (w.stopReason === "checkpoint") {
      w.blockEnd += w.config.blockTurns || 1000;
      const initial = w.checkpoints.find((a) => a.turn === 0);
      w.checkpoints = [...(initial ? [initial] : []), checkpoint(w)];
    }
    w.turn++;
    S.Ryouki.begin(w);
    S.Colony.begin(w);
    if(S.LargePlant?.enabled(w))S.LargePlant.begin(w);
    S.ProducerSupport.begin(w,S);
    const ctx = context(w, options.observeId);
    if(S.PersistentInformation?.enabled(w))P.informationTrack(w,ctx);
    if(S.Ryouki.enabled(w))for(const o of w.organisms)if(S.Ryouki.is(o)&&o.ryouki.last.transition)S.record(ctx,o,"phase-variation",{state:o.ryouki.mutated?"mutated":"normal",transition:o.ryouki.last.transition});
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
          if(S.PrimaryParasite?.enabled(w))P.begin(w,ctx);
          prepare(w, ctx);
          if(S.PersistentInformation?.enabled(w)){
            P.informationTrack(w,ctx);
            P.informationBegin(w,ctx);
          }
        } else if (stage === 1) {
          B.choose(w, ctx, w.config.ecologyRevision === "observation/4.1" ? "move" : null);
          B.move(w, ctx);
          // Movement has finished; effects change row values, not indexed topology.
          S.withMapScope(w, () => {
            if(w.config.ecologyRevision === "observation/4.1") B.choose(w,ctx,"effect");
            B.combat(w, ctx);
            B.care(w, ctx);
            if(w.config.ecologyRevision === "observation/4.1") P.clear(w,ctx);
            if(w.config.ecologyRevision === "observation/4.1") N.payActions(w,ctx);
          }, ctx.current);
          // Feeding removes resources between rounds; settlement adds carcasses/removes life.
          N.feed(w, ctx, P.transfer);
          N.settle(w, ctx, P.fee);
        } else {
          S.withMapScope(w, () => {
            B.learn(w, ctx);
            P.contacts(w, ctx);
            P.mature(w, ctx);
            if(w.config.ecologyRevision === "observation/4.1") P.search(w,ctx);
            R.growth(w, ctx);
            // Birth arbitration reads the frozen parent topology; append is its last step.
            R.reproduce(w, ctx);
            if(S.PersistentInformation?.enabled(w))P.informationTrack(w,ctx);
          });
          // Rebuild after births. Supply reads one snapshot, then appends resources at the end.
          S.withMapScope(w, () => {
            const drops = N.investAndDrops(w, ctx),
              minerals = N.mineralCandidates(w, ctx),
              information = P.infoCandidates(w, ctx);
            N.supply(w, ctx, [...drops, ...minerals, ...information]);
          });
          P.reproduce(w, ctx);
          if(S.LargePlant?.enabled(w))S.LargePlant.finalize(w,ctx);
          S.settleAge(w,ctx);
          if(S.PersistentInformation?.enabled(w))P.informationFinalize(w,ctx);
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
    const source={...w};
    delete source.diagnostics;delete source.observation;delete source.events;delete source.warnings;
    const copy=structuredClone(source);
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
      producer = new Set(),
      ids = new Set(),
      resourceKinds = new Map();
    if(S.PrimaryParasite?.enabled(w))errors.push(...S.PrimaryParasite.validate(w));
    if(S.HyperParasite?.enabled(w))errors.push(...S.HyperParasite.validate(w));
    if(S.PersistentInformation?.enabled(w))errors.push(...S.PersistentInformation.validate(w));
    for (const o of w.organisms) {
      const occupied = o.slot === "main" ? main : food;
      if(o.slot === "producer"){
        if(producer.has(o.cell))errors.push("SLOT_DUPLICATE:"+o.id);
        producer.add(o.cell);
      }else{
        if (occupied.has(o.cell)&&!(o.slot==="main"&&S.Ryouki.enabled(w))) errors.push("SLOT_DUPLICATE:" + o.id);
        occupied.add(o.cell);
      }
      if (ids.has(o.id)) errors.push("ID_DUPLICATE:" + o.id);
      ids.add(o.id);
      if(o.species==="ryouki"||o.ryouki){
        const a=o.ryouki;
        if(!S.Ryouki.enabled(w)||!S.Ryouki.is(o)||o.slot!=="main"||!Number.isInteger(o.phase)||o.phase<1||o.phase>4||
          (o.phase>=3&&![0,1,2].includes(o.branch3))||(o.phase===4&&![0,1].includes(o.branch4))||
          !Number.isFinite(o.birthLife)||o.birthLife<=0||typeof a?.mutated!=="boolean"||
          ![a?.highRun,a?.lowRun].every(n=>Number.isSafeInteger(n)&&n>=0)||
          !Array.isArray(a?.window)||a.window.length>32||!Array.isArray(a?.recentCells)||a.recentCells.length>64)errors.push("RYOUKI_STATE:"+o.id);
      }
      if (w.tiles[o.cell]?.blocked) errors.push("BLOCKED:" + o.id);
      if (
        [o.E, o.B, o.M, o.HP, o.G].some(
          (v) => !Number.isFinite(v) || v < -0.000001,
        )
      )
        errors.push("BUDGET:" + o.id);
      if(w.config.ageModel==="life/1"&&!S.Colony.is(o)){
        if(!Number.isFinite(o.birthLife)||o.birthLife<=0)errors.push("AGE_BASIS:"+o.id);
        else if(o.HP>S.phenotype(w,o).maxHP+.000001)errors.push("AGE_HP:"+o.id);
      }
      if(S.Colony.is(o)){
        const c=o.colony,e=c.edibleExposure;
        if(!S.Colony.enabled(w)||S.spec(o).group!=="plant"||![c.baseB,c.capacityB,c.activity,c.replacementDebtB,...Object.values(c.last),...Object.values(c.cumulative)].every(Number.isFinite)||c.baseB!==S.PLANT_BASE||c.activity<0||c.activity>1||o.B<c.baseB-1e-6||S.edibleB(o)>c.capacityB+1e-6||Object.values(c.cumulative).some(v=>v<0))errors.push("COLONY:"+o.id);
        if(e&&(!Number.isFinite(e.E)||e.E<0||!Number.isFinite(e.amount)||e.amount<0||e.amount>1+1e-6||!Number.isSafeInteger(e.expires)))errors.push("COLONY_EXPOSURE:"+o.id);
      }
      if(S.LargePlant?.is(o)){
        const plant=o.plant,p=S.phenotype(w,o),s=S.spec(o),
          finiteLedger=value=>typeof value==="number"?Number.isFinite(value)&&value>=0:
            !!value&&typeof value==="object"&&Object.values(value).every(finiteLedger),
          values=[plant.baseB,plant.activity,plant.replacementDebtB,plant.last,plant.cumulative];
        if(!S.LargePlant.enabled(w)||o.slot!=="producer"||s.kind!=="independent"||s.group!=="plant"||
           !values.every(finiteLedger)||plant.baseB!==S.PLANT_BASE||plant.activity>1||
           o.B<plant.baseB-1e-6||o.B>p.capB+1e-6||o.E>p.capE+1e-6||o.M>p.capM+1e-6||
           !Number.isFinite(o.birthLife)||o.birthLife!==s.life||!Number.isSafeInteger(o.phase)||o.phase<1||o.phase>4||
           (o.phase>=3&&![0,1,2].includes(o.branch3))||(o.phase===4&&![0,1].includes(o.branch4)))errors.push("INDEPENDENT_PLANT:"+o.id);
        if(!Array.isArray(plant.window)||plant.window.length>32||!plant.window.every(finiteLedger))errors.push("INDEPENDENT_WINDOW:"+o.id);
      }else if(o.slot==="producer")errors.push("INDEPENDENT_PLANT:"+o.id);
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
    if(S.Ryouki.enabled(w))for(const list of S.maps(w).mainByCell.values())if(list.length>1&&
      (list.length>3||list.some(o=>!S.Ryouki.is(o)||!o.ryouki.mutated)))errors.push("SLOT_DUPLICATE:"+list.map(o=>o.id).join(","));
    if(S.PrimaryParasite?.enabled(w)){
      for(const carrier of [...w.organisms,...w.carcasses,...w.pending]){
        const p=carrier.infection;if(!p)continue;
        if(!S.PrimaryParasite.is(p))errors.push("PRIMARY_VERSION:"+p.id);
        if(w.organisms.includes(carrier))continue;
        for(const a of [p,p.q].filter(Boolean)){
          if(ids.has(a.id))errors.push("ID_DUPLICATE:"+a.id);ids.add(a.id);
        }
      }
      for(const i of w.primaryInocula||[]){if(ids.has(i.id))errors.push("ID_DUPLICATE:"+i.id);ids.add(i.id);}
    }
    for(const q of w.searchQ||[]){
      if(ids.has(q.id))errors.push("ID_DUPLICATE:"+q.id);ids.add(q.id);
      if(!Number.isFinite(q.E)||q.E<0||!Number.isInteger(q.cell)||!w.tiles[q.cell]||w.tiles[q.cell].blocked)errors.push("SEARCH_Q:"+q.id);
    }
    if(S.HyperParasite?.enabled(w))for(const i of w.hyperInocula||[]){
      if(ids.has(i.id))errors.push("ID_DUPLICATE:"+i.id);ids.add(i.id);
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
    if(w.producerSupport && [w.ledger.producerE,w.ledger.producerM].some(v=>!Number.isFinite(v)||v<0))errors.push("PRODUCER_LEDGER");
    const totals = S.totals(w),
      Eerror = S.round(
        totals.E + w.ledger.sinks - w.ledger.initialE - w.ledger.solar - (w.ledger.producerE||0),
      ),
      Merror = S.round(totals.M + w.ledger.Mloss - w.ledger.initialM - (w.ledger.producerM||0));
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
