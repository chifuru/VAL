/* Deterministic feeding and whole-body growth. Assets and playback clocks belong to the renderer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./legacy-lineages.js'));
  else root.LegacyCreatureEngine = factory(root.LegacyLineageDefinitions);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (definitions) {
  'use strict';
  if (!definitions || !definitions.LINEAGES || !definitions.PART_DEFINITIONS) throw Error('系統定義を先に読み込んでください');

  var ENGINE_VERSION = 1;
  var PHASES = Object.freeze(['第一相・萌生', '第二相・変容', '第三相・異相']);
  var ENV = Object.freeze(['signal', 'void', 'heat', 'tide']);
  var THRESHOLDS = Object.freeze([1, 180, 600]);
  var ENERGY_QUARTERS_AT_MATURITY = 1801;
  var LINEAGES = definitions.LINEAGES, LINEAGE_BY_ID = definitions.LINEAGE_BY_ID;
  var PART_DEFINITIONS = definitions.PART_DEFINITIONS;
  var BODY_PARTS = Object.freeze(['torso', 'head', 'eyes', 'tail', 'fin', 'limb', 'shell']);
  var PALETTE = Object.freeze({neutral:[142,169,182], fizz:[87,167,225], buzz:[232,204,106], fizzbuzz:[181,132,213]});
  // Anatomical proportions, in BODY_PARTS order. The original DNA remains the
  // identity; a branch changes its expression instead of replacing that genome.
  var BODY_PROFILES = freeze({
    abyss:     [[1.10,.94],[1.02,1.04],[1.04,1.02],[1.14,.94],[1.06,1.04],[1.12,1.05],[.98,1.02]],
    myth:      [[.98,1.04],[1.06,1.05],[.99,1.01],[1.10,1.05],[1.20,1.14],[1.06,1.10],[1.06,1.04]],
    recursive: [[1.02,1.03],[1.18,1.14],[1.10,1.08],[1.03,1.08],[.98,1.04],[1.10,1.08],[1.04,1.06]],
    sail:      [[1.12,.95],[.98,1.02],[1.03,1.02],[1.17,.95],[1.22,1.12],[.97,1.02],[1.01,1.02]],
    gravity:   [[1.06,1.10],[1.04,1.05],[1.01,1.05],[.98,1.08],[1.10,1.06],[1.02,1.04],[1.08,1.12]],
    crystal:   [[1.03,1.08],[1.08,1.10],[1.10,1.10],[1.05,1.07],[.97,1.08],[1.06,1.10],[1.20,1.18]],
    manyeyes:  [[1.08,1.02],[1.13,1.08],[1.22,1.18],[1.07,1.00],[1.04,1.04],[1.08,1.03],[1.01,1.04]],
    abyssshell:[[1.10,1.12],[1.01,1.03],[1.05,1.04],[.97,1.10],[1.02,1.05],[1.06,1.08],[1.22,1.18]],
    parallel:  [[1.02,1.08],[1.05,1.02],[1.04,1.04],[1.09,1.07],[1.08,1.06],[1.22,1.18],[1.08,1.05]],
    memory:    [[1.07,1.08],[1.06,1.06],[1.10,1.05],[1.02,1.09],[1.04,1.06],[1.10,1.09],[1.16,1.12]],
    serpent:   [[1.14,.92],[1.16,1.10],[1.02,1.04],[1.22,.96],[1.03,1.05],[1.08,1.06],[1.06,1.03]],
    solar:     [[1.04,1.05],[1.10,1.08],[1.06,1.04],[1.12,1.07],[1.18,1.12],[1.02,1.06],[1.06,1.04]],
    antimeme:  [[1.03,.97],[1.07,1.01],[1.13,1.05],[1.08,.98],[1.02,.99],[1.04,1.01],[1.00,1.02]],
    valis:     [[1.07,1.01],[1.10,1.04],[1.16,1.08],[1.12,1.02],[1.15,1.10],[1.07,1.05],[1.03,1.06]]
  });

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function round(value) { return Math.round(value * 1000000) / 1000000; }
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) { freeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }
  function validateSeed(seed) {
    seed = Number(seed);
    if (!Number.isSafeInteger(seed) || seed < 1 || seed > 1000) throw Error('1〜1000の整数を入力してください');
    return seed;
  }
  function fmtFizzBuzz(n) {
    if (n % 15 === 0) return 'FizzBuzz';
    if (n % 3 === 0) return 'Fizz';
    if (n % 5 === 0) return 'Buzz';
    return String(n);
  }
  function linesFor(n) {
    n = validateSeed(n);
    return Array.from({length:n}, function (_, i) { return fmtFizzBuzz(i + 1); });
  }
  function kindFor(line) {
    if (line === 'FizzBuzz') return 'fizzbuzz';
    if (line === 'Fizz') return 'fizz';
    if (line === 'Buzz') return 'buzz';
    if (typeof line === 'string' && /^[1-9]\d*$/.test(line) && Number.isSafeInteger(Number(line))) return 'number';
    throw Error('不正なFizzBuzz出力');
  }
  function modifierFor(n) {
    if (!Number.isSafeInteger(n) || n < 1 || n % 3 === 0 || n % 5 === 0) return 0;
    var r3 = n % 3, r5 = n % 5;
    return ((r3 === 1 && r5 <= 2) || (r3 === 2 && r5 >= 3)) ? 1 : -1;
  }
  function stageFor(points) { return points >= 62 ? 2 : points >= 28 ? 1 : 0; }
  function stageForQuarters(quarters) {
    return quarters * 100 >= 62 * ENERGY_QUARTERS_AT_MATURITY ? 2 :
      quarters * 100 >= 28 * ENERGY_QUARTERS_AT_MATURITY ? 1 : 0;
  }
  function dnaFor(seed) {
    seed = validateSeed(seed);
    var x = (seed ^ 0x9e3779b9) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0 || 1;
    function next() { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; }
    var body = next(), appendage = next(), senses = next(), skin = next(), aptitude = next(), sensitivity = next();
    return freeze({seed:seed, body:body, appendage:appendage, senses:senses, skin:skin,
      aptitude:aptitude, sensitivity:sensitivity, bodyVariant:Math.floor(body * 2),
      headRatio:.88 + senses * .24, eyeSpacing:4 + Math.round(senses * 5),
      torsoRatio:.82 + body * .36, tailRatio:.75 + appendage * .5, hue:Math.floor(skin * 8)});
  }
  function emptySituation() { return {exposure:{signal:0, void:0, heat:0, tide:0}, foods:[], envs:[], steps:0}; }
  function initial(seed) {
    seed = validateSeed(seed);
    return {seed:seed, dna:dnaFor(seed), current:0, energyQuarters:0, energy:0, points:0,
      modifier:0, stage:0, lineage:null, history:[], heritage:[], partXp:{}, partImprints:{},
      tissueEnergy:Object.fromEntries(BODY_PARTS.map(function (id) { return [id, 0]; })),
      foods:{number:0, fizz:0, buzz:0, fizzbuzz:0}, regulation:{promote:0, inhibit:0},
      situation:emptySituation(), matured:false, lastMeal:null, finalAppearance:null};
  }
  function levelFor(xp) { return xp >= THRESHOLDS[2] ? 3 : xp >= THRESHOLDS[1] ? 2 : xp >= THRESHOLDS[0] ? 1 : 0; }
  function organGrowth(xp) {
    if (xp < 1) return 0;
    if (xp < 180) return .12 + .28 * (xp - 1) / 179;
    if (xp < 600) return .4 + .42 * (xp - 180) / 420;
    return .82 + .18 * (1 - Math.exp(-(xp - 600) / 300));
  }
  function phenotype(state, id) {
    id = id || state.lineage;
    if (!id) return [];
    return (PART_DEFINITIONS[id] || []).map(function (def) {
      var xp = state.partXp[id + ':' + def[0]] || 0;
      return {id:def[0], label:def[1], anchor:def[2], level:levelFor(xp), xp:xp,
        lineage:id, growth:round(organGrowth(xp)), count:def[5]};
    });
  }
  function chooseLineage(situation) {
    var keys = ['tide', 'heat', 'signal', 'void'], steps = Math.max(1, situation.steps);
    var recent = situation.envs.slice(-12), recentCount = Math.max(1, recent.length);
    var food = situation.foods.slice(-12), foodCount = Math.max(1, food.length);
    var favor = {tentacles:'fizzbuzz', wings:'fizz', heads:'fizz', orbit:'number', shell:'buzz', eyes:'fizzbuzz', limbs:'number', glow:'fizzbuzz'};
    var pressure = keys.map(function (key) {
      return .65 * (situation.exposure[key] || 0) / steps + .35 * recent.filter(function (x) { return x === key; }).length / recentCount;
    });
    var best = LINEAGES[0], bestScore = -Infinity;
    LINEAGES.forEach(function (lineage) {
      var distance = 0;
      for (var i = 0; i < 4; i++) distance += Math.pow(pressure[i] - lineage.niche[i], 2);
      var weight = lineage.id === 'antimeme' || lineage.id === 'valis' ? .035 : .085;
      var bonus = weight * food.filter(function (x) { return x === favor[lineage.primary]; }).length / foodCount;
      var score = -distance + bonus;
      if (score > bestScore) { best = lineage; bestScore = score; }
    });
    return best.id;
  }
  // Retained for deterministic tests; there is no user-facing species preset.
  function plannedEnvironment(state, targetId) {
    var target = LINEAGE_BY_ID[targetId];
    if (!target) throw Error('存在しない系統');
    var keys = ['tide', 'heat', 'signal', 'void'], time = state.situation.steps + 1, exposure = state.situation.exposure;
    var best = keys[0], deficit = -Infinity;
    keys.forEach(function (key, i) {
      var gap = time * target.niche[i] - (exposure[key] || 0);
      if (gap > deficit) { deficit = gap; best = key; }
    });
    return best;
  }
  function partAffinity(dna, key) {
    var hash = 2166136261;
    for (var i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
    var phase = (hash >>> 0) / 4294967296;
    return .8 + .4 * (.5 + .5 * Math.cos(2 * Math.PI * (dna.aptitude - phase)));
  }
  function tissueAffinity(dna, key) {
    var traits = {torso:dna.body, head:dna.senses, eyes:dna.senses, tail:dna.appendage,
      fin:dna.appendage, limb:dna.aptitude, shell:dna.skin};
    return .84 + .32 * traits[key];
  }
  function colorFor(state) {
    var foods = state.foods, total = foods.fizz + foods.buzz + foods.fizzbuzz;
    var base = total ? [0,1,2].map(function (channel) {
      return (foods.fizz * PALETTE.fizz[channel] + foods.buzz * PALETTE.buzz[channel] + foods.fizzbuzz * PALETTE.fizzbuzz[channel]) / total;
    }) : PALETTE.neutral.slice();
    var pigment = (state.dna.skin - .5) * 16;
    return base.map(function (channel, i) { return Math.round(clamp(channel + pigment * [1, -.35, .65][i], 0, 255)); });
  }
  function anatomyFor(state, progress) {
    var dna = state.dna, anatomy = {}, stage = state.stage;
    var primary = state.lineage ? LINEAGE_BY_ID[state.lineage].primary : null;
    var volumeScale = Math.cbrt(1 + 2 * progress);
    var shape = {
      torso:[.82 + .36 * dna.body, 1.13 - .26 * dna.body],
      head:[.88 + .24 * dna.senses, .91 + .18 * dna.body],
      eyes:[.76 + .4 * dna.senses, .82 + .34 * dna.senses],
      tail:[.75 + .5 * dna.appendage, .88 + .24 * dna.body],
      fin:[.76 + .4 * dna.appendage, .82 + .32 * dna.aptitude],
      limb:[.83 + .3 * dna.aptitude, .82 + .32 * dna.appendage],
      shell:[.9 + .2 * dna.skin, .89 + .22 * dna.body]
    };
    BODY_PARTS.forEach(function (key, partIndex) {
      var tissue = (state.tissueEnergy && state.tissueEnergy[key]) || 0;
      var growth = clamp(.75 * progress + .25 * tissue / ENERGY_QUARTERS_AT_MATURITY, 0, 1);
      var profile = state.lineage ? BODY_PROFILES[state.lineage][partIndex] : [1, 1];
      anatomy[key] = {growth:round(growth), level:Math.min(4, 1 + Math.floor(growth * 4)),
        scaleX:round(shape[key][0] * (.68 + .32 * growth) * volumeScale * (1 + stage * .035) * profile[0]),
        scaleY:round(shape[key][1] * (.7 + .3 * growth) * volumeScale * (1 + stage * .025) * profile[1]),
        variant:Math.min(3, Math.floor(({torso:dna.body, head:dna.senses, eyes:dna.senses,
          tail:dna.appendage, fin:dna.appendage, limb:dna.aptitude, shell:dna.skin})[key] * 4)),
        pattern:Math.floor(dna.skin * 4), count:key === 'eyes' || key === 'fin' || key === 'limb' ? 2 : 1};
    });
    anatomy.eyes.spacing = round(.1 + .1 * dna.senses + .03 * anatomy.eyes.growth);
    anatomy.limb.visibility = round(clamp(.1 + .7 * progress + .1 * stage, 0, 1));
    anatomy.shell.visibility = round(clamp(.1 + .7 * progress + (primary === 'shell' ? .2 : 0), 0, 1));
    return anatomy;
  }
  function calculateAppearance(state) {
    var progress = clamp(state.points / 100, 0, 1);
    var phaseStart = [0, 28, 62][state.stage], phaseEnd = [28, 62, 100][state.stage];
    var phaseProgress = clamp((state.points - phaseStart) / (phaseEnd - phaseStart), 0, 1);
    var inherited = [];
    state.heritage.forEach(function (entry) {
      entry.parts.forEach(function (part) { inherited.push({...part}); });
    });
    return freeze({version:ENGINE_VERSION, seed:state.seed, dna:{...state.dna}, stage:state.stage,
      points:state.points, progress:progress, tier:Math.min(4, 1 + Math.floor(phaseProgress * 4)),
      matured:state.matured, lineage:state.lineage, color:colorFor(state), volume:round(1 + 2 * progress),
      anatomy:anatomyFor(state, progress), organs:phenotype(state), inheritedOrgans:inherited});
  }
  function appearanceFor(state) {
    return state.matured && state.finalAppearance ? freeze(state.finalAppearance) : calculateAppearance(state);
  }
  function step(previous, line, environment) {
    if (!ENV.includes(environment)) throw Error('不正な環境');
    var kind = kindFor(line), applied = kind === 'number' ? modifierFor(Number(line)) : previous.modifier;
    var quarters = kind === 'number' ? 0 : 4 + applied;
    var state = {...previous, foods:{...previous.foods}, regulation:{...previous.regulation},
      history:previous.history.slice(), heritage:previous.heritage.slice(), partXp:{...previous.partXp},
      tissueEnergy:{...previous.tissueEnergy}, partImprints:{...previous.partImprints},
      situation:{exposure:{...previous.situation.exposure}, foods:previous.situation.foods.slice(),
        envs:previous.situation.envs.slice(), steps:previous.situation.steps + 1}};
    state.current++;
    state.foods[kind]++;
    state.lastMeal = freeze({kind:kind, modifier:applied, quarters:quarters, sequence:state.current});
    state.situation.exposure[environment]++;
    state.situation.foods.push(kind); state.situation.envs.push(environment);
    if (state.situation.foods.length > 12) state.situation.foods.shift();
    if (state.situation.envs.length > 12) state.situation.envs.shift();
    if (kind === 'number') {
      state.modifier = applied;
      if (applied > 0) state.regulation.promote++;
      else if (applied < 0) state.regulation.inhibit++;
    } else {
      state.modifier = 0;
      state.energyQuarters += quarters;
      state.energy = state.energyQuarters / 4;
      state.points = Math.min(100, 100 * state.energyQuarters / ENERGY_QUARTERS_AT_MATURITY);
    }
    if (!previous.matured) {
      var expression = 1 + .18 * previous.dna.sensitivity * applied;
      if (quarters) BODY_PARTS.forEach(function (key) {
        state.tissueEnergy[key] = round((state.tissueEnergy[key] || 0) + quarters * tissueAffinity(state.dna, key) * expression);
      });
      if (state.lineage) (PART_DEFINITIONS[state.lineage] || []).forEach(function (def) {
        var matches = (environment === def[3] ? 1 : 0) + (kind === def[4] ? 1 : 0);
        if (matches) {
          var key = state.lineage + ':' + def[0];
          state.partXp[key] = round((state.partXp[key] || 0) + matches * partAffinity(state.dna, key) * expression);
        }
      });
      var nextStage = stageForQuarters(state.energyQuarters);
      if (nextStage > state.stage) {
        if (state.lineage) {
          var oldAppearance = calculateAppearance(state);
          state.heritage.push(freeze({phase:state.stage, lineage:state.lineage, sequence:state.current,
            parts:phenotype(state).filter(function (part) { return part.level > 0; }),
            anatomy:oldAppearance.anatomy, color:oldAppearance.color}));
        }
        state.stage = nextStage;
        state.lineage = chooseLineage(state.situation);
        state.history.push(freeze({stage:nextStage, lineage:state.lineage, step:state.current,
          points:state.points, energy:state.energy, environment:environment}));
        state.situation = emptySituation();
      }
      if (state.energyQuarters >= ENERGY_QUARTERS_AT_MATURITY) {
        state.matured = true;
        state.finalAppearance = calculateAppearance(state);
      }
    }
    return state;
  }
  function runAll(seed, environmentPattern) {
    var state = initial(seed);
    linesFor(seed).forEach(function (line, i) {
      var environment = typeof environmentPattern === 'function' ? environmentPattern(i, line, state) : (environmentPattern || 'signal');
      state = step(state, line, environment);
    });
    return state;
  }
  return {ENGINE_VERSION:ENGINE_VERSION, ENERGY_QUARTERS_AT_MATURITY:ENERGY_QUARTERS_AT_MATURITY,
    PHASES:PHASES, ENV:ENV, THRESHOLDS:THRESHOLDS, BODY_PARTS:BODY_PARTS, BODY_PROFILES:BODY_PROFILES,
    LINEAGES:LINEAGES, LINEAGE_BY_ID:LINEAGE_BY_ID, PART_DEFINITIONS:PART_DEFINITIONS,
    fmtFizzBuzz:fmtFizzBuzz, linesFor:linesFor, kindFor:kindFor, modifierFor:modifierFor,
    stageFor:stageFor, stageForQuarters:stageForQuarters, dnaFor:dnaFor, initial:initial,
    levelFor:levelFor, phenotype:phenotype, chooseLineage:chooseLineage,
    plannedEnvironment:plannedEnvironment, appearanceFor:appearanceFor, step:step, runAll:runAll};
});
