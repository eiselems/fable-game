import { clamp, rand } from './util.js';
import { input, initInput, endFrame } from './input.js';
import { initAudio, toggleMute, startDrone, sfx } from './audio.js';
import { sprites, generateSprites } from './sprites.js';
import { initDecals, clearDecals, updateParticles, drawParticles, drawDecals, particles } from './particles.js';
import { createPlayer, updatePlayer, drawPlayer } from './player.js';
import { createArsenal, updateWeapons, updateProjectiles, drawProjectiles, projectiles } from './weapons.js';
import { resetEnemies, updateEnemies, drawEnemies } from './enemies.js';
import { createWaveState, startNextWave, updateWaves } from './waves.js';
import { resetPickups, updatePickups, drawPickups } from './powerups.js';
import { drawHud, drawMenu, drawPause, drawGameOver } from './hud.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = canvas.width, H = canvas.height;

const game = {
  W, H,
  state: 'menu',
  time: 0,
  shake: 0,
  player: null,
  arsenal: null,
  waves: createWaveState(),
  score: 0,
  kills: 0,
  high: +(localStorage.getItem('outpost.high') || 0),
  isNewHigh: false,
  notice: '',
  noticeT: 0,
  overT: 0,
  barrelLen: 10,
  obstacles: [
    { x: 96,  y: 64,  w: 36, h: 14, kind: 'sandbagH' },
    { x: 348, y: 64,  w: 36, h: 14, kind: 'sandbagH' },
    { x: 96,  y: 242, w: 36, h: 14, kind: 'sandbagH' },
    { x: 348, y: 242, w: 36, h: 14, kind: 'sandbagH' },
    { x: 56,  y: 142, w: 14, h: 36, kind: 'sandbagV' },
    { x: 410, y: 142, w: 14, h: 36, kind: 'sandbagV' },
    { x: 166, y: 118, w: 18, h: 18, kind: 'crate' },
    { x: 296, y: 184, w: 18, h: 18, kind: 'crate' },
  ],
};

generateSprites(W, H);
initDecals(W, H);
initInput(canvas);

function reset() {
  game.player = createPlayer();
  game.arsenal = createArsenal();
  game.waves = createWaveState();
  game.score = 0;
  game.kills = 0;
  game.shake = 0;
  game.notice = '';
  game.noticeT = 0;
  game.isNewHigh = false;
  resetEnemies();
  resetPickups();
  projectiles.length = 0;
  particles.length = 0;
  clearDecals();
  startNextWave(game);
}

function update(dt) {
  updatePlayer(game, dt);
  updateWeapons(game, dt);
  updateProjectiles(game, dt);
  updateEnemies(game, dt);
  updateWaves(game, dt);
  updatePickups(game, dt);
  updateParticles(dt);
  game.shake = Math.max(0, game.shake - dt * 18);
  game.noticeT = Math.max(0, game.noticeT - dt);

  if (game.player.hp <= 0) {
    game.state = 'gameover';
    game.overT = 0;
    sfx.explosion();
    if (game.score > game.high) {
      game.high = game.score;
      game.isNewHigh = true;
      localStorage.setItem('outpost.high', String(game.high));
    }
  }
}

function render() {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate(rand(-game.shake, game.shake) * 0.5, rand(-game.shake, game.shake) * 0.5);
  }
  ctx.drawImage(sprites.ground, 0, 0);
  drawDecals(ctx);
  for (const o of game.obstacles) ctx.drawImage(sprites[o.kind], o.x, o.y);
  drawPickups(ctx);
  drawEnemies(ctx, game);
  if (game.player) drawPlayer(game, ctx);
  drawProjectiles(ctx);
  drawParticles(ctx);
  ctx.restore();

  if (game.state === 'menu') {
    drawMenu(ctx, game);
  } else {
    drawHud(ctx, game);
    if (game.state === 'paused') drawPause(ctx, game);
    if (game.state === 'gameover') drawGameOver(ctx, game);
  }
}

let last = performance.now();
function frame(now) {
  const dt = clamp((now - last) / 1000, 0, 0.035);
  last = now;
  game.time += dt;

  if (input.pressed.has('KeyM')) {
    const m = toggleMute();
    game.notice = m ? 'SOUND OFF' : 'SOUND ON';
    game.noticeT = 1.5;
  }

  if (game.state === 'menu') {
    if (input.clicked) {
      initAudio();
      startDrone();
      reset();
      game.state = 'playing';
    }
  } else if (game.state === 'playing') {
    if (input.pressed.has('KeyP')) game.state = 'paused';
    else update(dt);
  } else if (game.state === 'paused') {
    if (input.pressed.has('KeyP') || input.clicked) game.state = 'playing';
  } else if (game.state === 'gameover') {
    game.overT += dt;
    updateParticles(dt);
    if (game.overT > 1 && input.clicked) {
      reset();
      game.state = 'playing';
    }
  }

  render();
  endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
