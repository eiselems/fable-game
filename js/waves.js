// Wave director: composes each wave from a point budget, spawns from the
// arena edges, and runs the announce/spawn/clear/intermission cycle.
import { rand, randInt, pick, clamp, shuffle } from './util.js';
import { sfx, setDroneIntensity } from './audio.js';
import { spawnEnemy, enemies } from './enemies.js';
import { spawnPickup } from './powerups.js';

export function createWaveState() {
  return { num: 0, phase: 'idle', timer: 0, queue: [], spawnT: 0, banner: '', sub: '', bannerT: 0 };
}

export function startNextWave(game) {
  const ws = game.waves;
  ws.num++;
  ws.queue = compose(ws.num);
  ws.phase = 'announce';
  ws.timer = 2.0;
  ws.banner = 'WAVE ' + ws.num;
  ws.sub = 'HOSTILES INBOUND';
  ws.bannerT = 2.0;
  ws.spawnT = 0.3;
  sfx.klaxon();
  setDroneIntensity(ws.num);
}

function compose(n) {
  let budget = 5 + n * 4;
  const list = [];
  const opts = [['grunt', 1, 10]];
  if (n >= 3) opts.push(['trooper', 3, 4 + n]);
  if (n >= 4) opts.push(['shield', 4, 3 + n]);
  if (n >= 6) opts.push(['heavy', 9, n - 4]);
  let heavies = 0;
  const maxHeavy = 1 + Math.floor(n / 5);
  while (budget > 0) {
    const pool = opts.filter(o => o[1] <= budget && (o[0] !== 'heavy' || heavies < maxHeavy));
    if (!pool.length) break;
    let total = 0;
    for (const o of pool) total += o[2];
    let roll = rand(0, total);
    let chosen = pool[0];
    for (const o of pool) {
      roll -= o[2];
      if (roll <= 0) {
        chosen = o;
        break;
      }
    }
    if (chosen[0] === 'heavy') heavies++;
    budget -= chosen[1];
    list.push(chosen[0]);
  }
  return shuffle(list);
}

export function updateWaves(game, dt) {
  const ws = game.waves;
  ws.bannerT = Math.max(0, ws.bannerT - dt);

  if (ws.phase === 'announce') {
    ws.timer -= dt;
    if (ws.timer <= 0) ws.phase = 'spawning';
  }
  if (ws.phase === 'spawning') {
    ws.spawnT -= dt;
    if (ws.spawnT <= 0 && ws.queue.length) {
      const [x, y] = edgePoint(game);
      spawnEnemy(ws.queue.pop(), x, y);
      ws.spawnT = clamp(1.2 - ws.num * 0.06, 0.35, 1.2) * rand(0.7, 1.3);
    }
    if (!ws.queue.length) ws.phase = 'active';
  }
  if (ws.phase === 'active' && enemies.length === 0) {
    ws.phase = 'intermission';
    ws.timer = 5;
    ws.banner = 'WAVE ' + ws.num + ' CLEARED';
    ws.sub = 'RESUPPLY INBOUND';
    ws.bannerT = 2;
    game.score += ws.num * 25;
    dropSupplies(game);
  }
  if (ws.phase === 'intermission') {
    ws.timer -= dt;
    if (ws.timer <= 0) startNextWave(game);
  }
}

function dropSupplies(game) {
  spawnPickup('ammo', game.W / 2 + rand(-60, 60), game.H / 2 + rand(-40, 40));
  // guaranteed weapon unlocks as the fight escalates
  const unlockAt = { 2: 'smg', 4: 'shotgun', 6: 'rocket' };
  const k = unlockAt[game.waves.num];
  if (k && !game.arsenal.owned[k]) {
    spawnPickup('w_' + k, game.W / 2 + rand(-40, 40), game.H / 2 + rand(-30, 30));
  }
  if (Math.random() < 0.5) {
    spawnPickup(pick(['health', 'vest']), rand(60, game.W - 60), rand(50, game.H - 50));
  }
}

function edgePoint(game) {
  const side = randInt(0, 3), m = 10;
  if (side === 0) return [rand(20, game.W - 20), m];
  if (side === 1) return [rand(20, game.W - 20), game.H - m];
  if (side === 2) return [m, rand(20, game.H - 20)];
  return [game.W - m, rand(20, game.H - 20)];
}
