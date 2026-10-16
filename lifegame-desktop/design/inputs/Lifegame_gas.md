# Life.gs
// Google Apps Script to simulate a Life Game inspired ecosystem

  

// Movement policy descriptions

// approachEnemy   - move toward the nearest enemy

// approachAlly    - move toward the nearest ally

// avoidEnemy      - move away from enemies

// avoidAlly       - move away from allies

// seekEmpty       - prefer positions with many open cells nearby

// stay            - remain in place

// cornerCenter    - move toward corners or the center

// keepDistance    - maintain a distance specified by targetDistance

// goOuter         - move toward the board edge

  

// Species definitions

var SPECIES = [

  null,

  // Species1: high reproduction rate with low parent cost

  // aggressive type, seeks out enemies

  { name: 'Species1', attack: 3, defense: 2, reproEnergy: 2, energyCost: 2,

    reproCostRate: 0.5, maxAge: 10, maxHp: 5, healTurns: 4, attacksPerTurn: 4 },

  // Species2: strong defense with regeneration

  // defensive type, tends to hold position

  { name: 'Species2', attack: 2, defense: 4, reproEnergy: 9, energyCost: 4,

    regen: 1.5, reproCostRate: 0.6, maxAge: 8, maxHp: 9, healTurns: 4, attacksPerTurn: 4 },

  // Species3: faster movement

  // swift scout, keeps away from enemies

  { name: 'Species3', attack: 4, defense: 2, reproEnergy: 5, energyCost: 3,

    speed: 8, reproCostRate: 0.6, maxAge: 20, maxHp: 15, healTurns: 6, attacksPerTurn: 5 },

  // Species4: low energy cost due to adaptation

  // explorer seeking open ground

  { name: 'Species4', attack: 2, defense: 2, reproEnergy: 8, energyCost: 2,

    reproCostRate: 0.6, maxAge: 7, maxHp: 6, healTurns: 10, attacksPerTurn: 4 },

  // Species5: high attack but costly

  // strong attacker heading to corners or center

  { name: 'Species5', attack: 15, defense: 2, reproEnergy: 15, energyCost: 4,

    reproCostRate: 0.5, maxAge: 8, maxHp: 12, healTurns: 10, attacksPerTurn: 8 },

  // Species6: powerful ranged attacks

  // ranged unit preferring the outer edge

  { name: 'Species6', attack: 4, defense: 1, reproEnergy: 9, energyCost: 4,

    reproCostRate: 0.6, range: 4, rangeBonus: 2, maxAge: 15, maxHp: 7, healTurns: 7, attacksPerTurn: 4 },

  // Species7: stronger when allies nearby

  // pack hunter keeping moderate distance from allies

  { name: 'Species7', attack: 7, defense: 3, reproEnergy: 7, energyCost: 3,

    reproCostRate: 0.5, maxAge: 10, maxHp: 7, healTurns: 3, attacksPerTurn: 6, targetDistance: 1 },

  // Species8: efficient resource gathering

  // resource gatherer moving toward allies

  { name: 'Species8', attack: 2, defense: 1.8, reproEnergy: 8, energyCost: 5,

    harvest: 2, reproCostRate: 0.6, maxAge: 5, maxHp: 6, healTurns: 10, attacksPerTurn: 4 },

  // Species9: very low energy consumption

  // patient species that stays put

  { name: 'Species9', attack: 1.5, defense: 1, reproEnergy: 21, energyCost: 1.8,

    reproCostRate: 0.9, maxAge: 5, maxHp: 2, healTurns: 10, attacksPerTurn: 2 }

];

var BEHAVIORS = [

  "approachEnemy","approachAlly","avoidEnemy","avoidAlly",

  "seekEmpty","stay","cornerCenter","keepDistance","goOuter"

];

  

var BATTLE_TYPE = 'species';

  

function sameSide(a, b) {

  if (!a || !b) return false;

  if (BATTLE_TYPE === 'faction') {

    return a.faction && b.faction && a.faction === b.faction;

  }

  if (BATTLE_TYPE === 'brawl') {

    return a.lineage && b.lineage && a.lineage === b.lineage;

  }

  

  return a.species === b.species;

}

  

function differentSide(a, b) {

  return !sameSide(a, b);

}

  
  

function createGrid(width, height) {

  var grid = [];

  for (var y = 0; y < height; y++) {

    var row = [];

    for (var x = 0; x < width; x++) {

      row.push(null);

    }

    grid.push(row);

  }

  return grid;

}

  

function createResourceGrid(width, height) {

  var res = [];

  for (var y = 0; y < height; y++) {

    var row = [];

    for (var x = 0; x < width; x++) {

      var amt = 1 + Math.floor(Math.random() * 12);

      row.push({ amount: amt, max: amt, cooldown: 0 });

    }

    res.push(row);

  }

  return res;

}

  

function getFactionName(index) {

  var name = '';

  index++;

  while (index > 0) {

    index--;

    name = String.fromCharCode(65 + (index % 26)) + name;

    index = Math.floor(index / 26);

  }

  return name;

}

  

function getGroupName(index) {

  return getFactionName(index) + (index + 1);

}

  

function placeInitialCells(grid, count, type, factionCount) {

  var height = grid.length;

  var width = grid[0].length;

  var factions = [];

  if (type === 'faction') {

    for (var i = 0; i < factionCount; i++) {

      factions.push(getFactionName(i));

    }

  }

  for (var i = 0; i < count; i++) {

    var x = Math.floor(Math.random() * width);

    var y = Math.floor(Math.random() * height);

    var speciesId = 1 + Math.floor(Math.random() * 9);

    var spec = SPECIES[speciesId];

    var behavior = BEHAVIORS[Math.floor(Math.random() * BEHAVIORS.length)];

    var cell = { species: speciesId, energy: 10, generation: 1, age: 0,

      hp: spec.maxHp, sinceBattle: 0, behavior: behavior };

    if (type === 'faction') {

      cell.faction = factions[Math.floor(Math.random() * factionCount)];

    } else if (type === 'brawl') {

      cell.lineage = getGroupName(i);

  

    }

    grid[y][x] = cell;

  

  }

}

  

function simulateStep(grid, resources) {

  var height = grid.length;

  var width = grid[0].length;

  var newGrid = createGrid(width, height);

  

  // update resource cooldowns

  for (var ry = 0; ry < height; ry++) {

    for (var rx = 0; rx < width; rx++) {

      var r = resources[ry][rx];

      if (r.cooldown > 0) {

        r.cooldown--;

        if (r.cooldown === 0) r.amount = r.max;

      }

    }

  }

  

  // compute current population density for resource scaling

  var population = 0;

  for (var py = 0; py < height; py++) {

    for (var px = 0; px < width; px++) {

      if (grid[py][px]) population++;

    }

  }

  var density = population / (width * height);

  var densityFactor = 1.5 - density; // low density -> >1, high density -> <1

  
  
  

  function neighbors(x, y, r) {

    r = r || 1;

    var res = [];

    for (var dy = -r; dy <= r; dy++) {

      for (var dx = -r; dx <= r; dx++) {

        if (dx === 0 && dy === 0) continue;

        if (Math.abs(dx) > r || Math.abs(dy) > r) continue;

        var nx = x + dx;

        var ny = y + dy;

        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {

          res.push({ x: nx, y: ny });

        }

      }

    }

    return res;

  }

  

  function nearestDistance(predicate, x, y) {

    var min = null;

    for (var yy = 0; yy < height; yy++) {

      for (var xx = 0; xx < width; xx++) {

        if (xx === x && yy === y) continue;

        var c = grid[yy][xx];

        if (predicate(c)) {

          var d = Math.max(Math.abs(xx - x), Math.abs(yy - y));

          if (min === null || d < min) min = d;

        }

      }

    }

    return min === null ? width + height : min;

  }

  

  function emptyCountAround(px, py) {

    return neighbors(px, py).filter(function(n) {

      return !grid[n.y][n.x] && !newGrid[n.y][n.x];

    }).length;

  }

  

  function distanceToCenter(px, py) {

    var cx = (width - 1) / 2;

    var cy = (height - 1) / 2;

    return Math.max(Math.abs(px - cx), Math.abs(py - cy));

  }

  

  function distanceToEdge(px, py) {

    return Math.min(px, py, width - 1 - px, height - 1 - py);

  }

  

  function evaluateMove(policy, cell, pos) {

    switch (policy) {

      case 'approachEnemy':

        return -nearestDistance(function(c){return c && differentSide(cell, c);}, pos.x, pos.y);

      case 'approachAlly':

        return -nearestDistance(function(c){return c && sameSide(cell, c);}, pos.x, pos.y);

      case 'avoidEnemy':

        return nearestDistance(function(c){return c && differentSide(cell, c);}, pos.x, pos.y);

      case 'avoidAlly':

        return nearestDistance(function(c){return c && sameSide(cell, c);}, pos.x, pos.y);

      case 'seekEmpty':

        return emptyCountAround(pos.x, pos.y);

      case 'stay':

        return pos.x === cell.x && pos.y === cell.y ? 1000 : -1000;

      case 'cornerCenter':

        var cornerDist = Math.min(

          Math.max(pos.x, pos.y),

          Math.max(width - 1 - pos.x, pos.y),

          Math.max(pos.x, height - 1 - pos.y),

          Math.max(width - 1 - pos.x, height - 1 - pos.y)

        );

        var centerDist = distanceToCenter(pos.x, pos.y);

        return -Math.min(cornerDist, centerDist);

      case 'keepDistance':

        var target = cell.targetDistance || 2;

        var d = nearestDistance(function(c){return c && sameSide(cell, c);}, pos.x, pos.y);

        return -Math.abs(d - target);

      case 'goOuter':

        return -distanceToEdge(pos.x, pos.y);

      default:

        return Math.random();

    }

  }

  

  function allyCount(cell, x, y) {

    return neighbors(x, y).filter(function(n) {

      var c = grid[n.y][n.x];

      return c && sameSide(cell, c);

    }).length;

  }

  

  for (var y = 0; y < height; y++) {

    for (var x = 0; x < width; x++) {

      var cell = grid[y][x];

      if (!cell) continue;

  

      var spec = SPECIES[cell.species];

      cell.age++;

      if (spec.maxAge && cell.age > spec.maxAge) {

        grid[y][x] = null;

        continue;

      }

      cell.sinceBattle++;

      if (cell.sinceBattle >= (spec.healTurns || 3) && cell.hp < spec.maxHp) {

        cell.hp = spec.maxHp;

      }

  

      cell.energy -= spec.energyCost; // energy consumption

      if (spec.regen) {

        cell.energy += spec.regen; // defense species regenerates

      }

      if (cell.energy <= 0) continue; // dead

  

      // gather resource from this tile

      var tile = resources[y][x];

      if (tile.amount > 0 && tile.cooldown === 0) {

        var gain = tile.amount;

        if (spec.harvest) {

          gain = Math.ceil(gain * spec.harvest);

        }

        gain = Math.max(1, Math.floor(gain * densityFactor));

        cell.energy += gain;

        tile.amount = 0;

        tile.cooldown = 5;

      }

  

      // reproduction

      if (cell.energy >= spec.reproEnergy) {

        var ns = neighbors(x, y).filter(function(n) { return !grid[n.y][n.x] && !newGrid[n.y][n.x]; });

        if (ns.length > 0) {

          var target = ns[Math.floor(Math.random() * ns.length)];

          var rate = spec.reproCostRate || 0.5;

          var cost = Math.floor(cell.energy * rate);

          var childSpec = SPECIES[cell.species];

          var child = { species: cell.species, energy: cost,

            generation: cell.generation + 1, age: 0, hp: childSpec.maxHp,

            sinceBattle: 0, behavior: cell.behavior };

          if (BATTLE_TYPE === 'faction') child.faction = cell.faction;

          if (BATTLE_TYPE === 'brawl') child.lineage = cell.lineage;

          newGrid[target.y][target.x] = child;

  

          cell.energy -= cost;

        }

      }

  

      // competition

      var range = spec.range || 1;

      var enemies = neighbors(x, y, range).filter(function(n) {

        var e = grid[n.y][n.x];

        return e && differentSide(cell, e);

      });

      var attacksLeft = spec.attacksPerTurn || 1;

      while (attacksLeft > 0 && enemies.length > 0) {

        var idx = Math.floor(Math.random() * enemies.length);

        var targetPos = enemies.splice(idx, 1)[0];

        var enemy = grid[targetPos.y][targetPos.x];

        if (!enemy) continue;

        var enemySpec = SPECIES[enemy.species];

        var allyBonus = cell.species === 7 ? allyCount(cell, x, y) : 0;

        var enemyAllyBonus = enemy.species === 7 ? allyCount(enemy, targetPos.x, targetPos.y) : 0;

        var dist = Math.max(Math.abs(targetPos.x - x), Math.abs(targetPos.y - y));

        var attackPower = spec.attack + allyBonus + cell.energy;

        if (cell.species === 6 && dist > 1 && spec.rangeBonus) {

          attackPower += spec.rangeBonus; // long-range bonus

        }

        var defensePower = enemySpec.defense + enemyAllyBonus + enemy.energy;

        var damage = attackPower - defensePower;

        if (damage > 0) {

          enemy.hp -= damage;

          cell.sinceBattle = 0;

          enemy.sinceBattle = 0;

          if (enemy.hp <= 0) {

            cell.energy += Math.floor(enemy.energy / 2);

            grid[targetPos.y][targetPos.x] = null; // enemy defeated

          }

        }

        attacksLeft--;

      }

  

      var dest = { x: x, y: y };

      var moveRange = spec.speed || 1;

      var moves = neighbors(x, y, moveRange).filter(function(n) {

        return !grid[n.y][n.x] && !newGrid[n.y][n.x];

      });

      moves.push({ x: x, y: y });

      if (moves.length > 0) {

        var policy = cell.behavior || 'random';

        if (policy === 'random') {

          if (Math.random() < 0.5) {

            dest = moves[Math.floor(Math.random() * moves.length)];

          }

        } else {

          var best = moves[0];

          var bestScore = evaluateMove(policy, { species: cell.species, faction: cell.faction, x: x, y: y, targetDistance: spec.targetDistance }, best);

          for (var mi = 1; mi < moves.length; mi++) {

            var m = moves[mi];

            var score = evaluateMove(policy, { species: cell.species, faction: cell.faction, x: x, y: y, targetDistance: spec.targetDistance }, m);

            if (score > bestScore) {

              bestScore = score;

              best = m;

            }

          }

          dest = best;

        }

      }

  

      if (!newGrid[dest.y][dest.x]) {

        newGrid[dest.y][dest.x] = cell;

      } else if (!newGrid[y][x]) {

        newGrid[y][x] = cell;

      }

    }

  }

  return newGrid;

}

  

function runSimulation(steps, width, height, initial, type, factionCount) {

  BATTLE_TYPE = type || 'species';

  var grid = createGrid(width, height);

  var resources = createResourceGrid(width, height);

  placeInitialCells(grid, initial, BATTLE_TYPE, factionCount);

  for (var s = 0; s < steps; s++) {

    Logger.log('ターン ' + s);

    logGrid(grid);

    grid = simulateStep(grid, resources);

  }

}

  

function logGrid(grid) {

  Logger.log('\n' + gridToText(grid));

}

  

function gridToText(grid) {

  return grid.map(function(row) {

    return row.map(function(cell) {

      return cell ? cell.generation : '-';

    }).join(' ');

  }).join('\n');

}

  

function gridToNumbers(grid) {

  return grid.map(function(row) {

    return row.map(function(cell) {

      return cell ? cell.species : 0;

    });

  });

}

  

function gridToStates(grid) {

  return grid.map(function(row) {

    return row.map(function(cell) {

      if (!cell) return { species: 0, generation: 0, faction: null, lineage: null };

      return {

        species: cell.species,

        generation: cell.generation,

        faction: cell.faction || null,

        lineage: cell.lineage || null

      };

    });

  });

}

  

function runSimulationUI(steps, width, height, initial, type, factionCount) {

  BATTLE_TYPE = type || 'species';

  var grid = createGrid(width, height);

  var resources = createResourceGrid(width, height);

  placeInitialCells(grid, initial, BATTLE_TYPE, factionCount);

  var logs = [];

  for (var s = 0; s < steps; s++) {

    logs.push('ターン ' + s + '\n' + gridToText(grid));

    grid = simulateStep(grid, resources);

  }

  logs.push('ターン ' + steps + '\n' + gridToText(grid));

  return logs.join('\n\n');

}

  

function runSimulationStates(steps, width, height, initial, type, factionCount) {

  BATTLE_TYPE = type || 'species';

  var grid = createGrid(width, height);

  var resources = createResourceGrid(width, height);

  placeInitialCells(grid, initial, BATTLE_TYPE, factionCount);

  var states = [gridToStates(grid)];

  for (var s = 0; s < steps; s++) {

    grid = simulateStep(grid, resources);

    states.push(gridToStates(grid));

  }

  return { states: states, type: BATTLE_TYPE };

}

  

function doGet() {

  return HtmlService.createHtmlOutputFromFile('index');

}


# index.html
<!DOCTYPE html>

<html>

  <head>

    <base target="_top">

    <style>

      body { font-family: Arial, sans-serif; }

      table { border-collapse: collapse; }

      td { width: 20px; height: 20px; border: 1px solid #ccc; text-align:center; font-size:12px; }

      .color-box { display:inline-block; width:12px; height:12px; margin-right:4px; vertical-align:middle; }

    </style>

  </head>

  <body>

    <h1>Life Simulation</h1>

    <label>Steps: <input type="number" id="steps" value="50"></label><br>

    <label>Width: <input type="number" id="width" value="25"></label><br>

    <label>Height: <input type="number" id="height" value="25"></label><br>

    <label>Initial Cells: <input type="number" id="initial" value="30"></label><br>

    <label><input type="radio" name="mode" value="species" checked>種族戦</label>

    <label><input type="radio" name="mode" value="faction">勢力戦</label>

    <label><input type="radio" name="mode" value="brawl">乱戦</label>

    <label id="factionLabel" style="display:none;">Factions: <input type="number" id="factions" value="3" min="2"></label><br>

    <button id="runBtn" onclick="run()">Run</button>

    <button id="stopBtn" onclick="stop()" disabled>Stop</button>

    <div id="board"></div>

    <div>ターン: <span id="turn">0</span></div>

    <div id="info">セルの数字は各個体の世代を示します</div>

    <h2>パラメーター</h2>

    <ul>

      <li>Steps: 世代数を指定します</li>

      <li>Width/Height: 盤面の大きさを決めます</li>

      <li>Initial Cells: 初期配置される個体数です</li>

    </ul>

    <h2>種族説明</h2>

    <ol>

      <li><span class="color-box" style="background-color:#f44336"></span>種族1: 繁殖力が高く繁殖時の親の消費エネルギーが少ない</li>

      <li><span class="color-box" style="background-color:#4caf50"></span>種族2: 防御力が高く毎ターン少し回復</li>

      <li><span class="color-box" style="background-color:#2196f3"></span>種族3: 移動速度が速く攻守のバランスが良い</li>

      <li><span class="color-box" style="background-color:#ffeb3b"></span>種族4: 消費エネルギーが少ない</li>

      <li><span class="color-box" style="background-color:#9c27b0"></span>種族5: 攻撃力が高いが消費が多い</li>

      <li><span class="color-box" style="background-color:#ff9800"></span>種族6: 遠距離攻撃が強力</li>

      <li><span class="color-box" style="background-color:#00bcd4"></span>種族7: 同族が近いと強化される</li>

      <li><span class="color-box" style="background-color:#8bc34a"></span>種族8: 資源採取効率が高い</li>

      <li><span class="color-box" style="background-color:#795548"></span>種族9: 省エネルギーで生存する</li>

    </ol>

    <script>

      var speciesColors = ['#ffffff', '#f44336', '#4caf50', '#2196f3', '#ffeb3b', '#9c27b0', '#ff9800', '#00bcd4', '#8bc34a', '#795548'];

      var timer = null;

  

      function updateMode() {

        var mode = document.querySelector('input[name="mode"]:checked').value;

        var show = mode === 'faction';

        document.getElementById('factionLabel').style.display = show ? 'inline' : 'none';

        var info = 'セルの数字は各個体の世代を示します';

        if (mode === 'faction') info = 'セルの文字は所属勢力を示します';

        if (mode === 'brawl') info = 'セルの文字は集団番号を示します';

        document.getElementById('info').textContent = info;

      }

  

      document.querySelectorAll('input[name="mode"]').forEach(function(r) {

        r.addEventListener('change', updateMode);

      });

      updateMode();

  
  

      function run() {

        if (timer) return;

        var steps = parseInt(document.getElementById('steps').value, 10);

        var width = parseInt(document.getElementById('width').value, 10);

        var height = parseInt(document.getElementById('height').value, 10);

        var initial = parseInt(document.getElementById('initial').value, 10);

        var mode = document.querySelector('input[name="mode"]:checked').value;

        var factions = parseInt(document.getElementById('factions').value, 10) || 0;

        document.getElementById('runBtn').disabled = true;

        document.getElementById('stopBtn').disabled = false;

        google.script.run.withSuccessHandler(function(res) {

          animate(res.states, res.type);

        }).runSimulationStates(steps, width, height, initial, mode, factions);

      }

  

      function stop() {

        if (timer) {

          clearInterval(timer);

          timer = null;

        }

        document.getElementById('runBtn').disabled = false;

        document.getElementById('stopBtn').disabled = true;

      }

  

      function animate(states, type) {

        var board = document.getElementById('board');

        var height = states[0].length;

        var width = states[0][0].length;

        board.innerHTML = '';

        var table = document.createElement('table');

        var cells = [];

        for (var y = 0; y < height; y++) {

          var tr = document.createElement('tr');

          var row = [];

          for (var x = 0; x < width; x++) {

            var td = document.createElement('td');

            tr.appendChild(td);

            row.push(td);

          }

          table.appendChild(tr);

          cells.push(row);

        }

        board.appendChild(table);

  

        var step = 0;

        function render() {

          var grid = states[step];

          for (var y = 0; y < height; y++) {

            for (var x = 0; x < width; x++) {

              var cell = grid[y][x];

              cells[y][x].style.backgroundColor = speciesColors[cell.species];

              var text = '';

              if (cell.species) {

                if (type === 'faction') text = cell.faction;

                else if (type === 'brawl') text = cell.lineage;

                else text = cell.generation;

              }

              cells[y][x].textContent = text;

            }

          }

          var g = step + 1;

          document.getElementById('turn').textContent = g;

          step++;

          if (step >= states.length) {

            clearInterval(timer);

            timer = null;

            document.getElementById('runBtn').disabled = false;

            document.getElementById('stopBtn').disabled = true;

          }

        }

        timer = setInterval(render, 500);

        render();

      }

    </script>

  </body>

</html>
