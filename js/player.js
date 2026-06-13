import { clamp, angleTo, circleRect, rand, TAU } from './util.js';
import { input } from './input.js';
import { sfx } from './audio.js';
import { fx, addDecal } from './particles.js';

export function createPlayer() {
  return {
    x: 240, y: 160, r: 7,
    hp: 100, maxHp: 100,
    armor: 0, maxArmor: 100,
    speed: 115,
    aim: 0,
    iframe: 0,
    kick: 0,
    muzzle: 0,
    heartT: 0,
    buffs: { rapid: 0, double: 0 },
  };
}

export function updatePlayer(game, dt) {
  const p = game.player;
  if (p.hp <= 0) return;

  let mx = 0, my = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) my -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) my += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) mx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;
  if (mx || my) {
    const len = Math.hypot(mx, my);
    p.x += (mx / len) * p.speed * dt;
    p.y += (my / len) * p.speed * dt;
  }

  for (const o of game.obstacles) {
    const push = circleRect(p.x, p.y, p.r, o);
    if (push) {
      p.x += push.x;
      p.y += push.y;
    }
  }
  p.x = clamp(p.x, p.r + 1, game.W - p.r - 1);
  p.y = clamp(p.y, p.r + 1, game.H - p.r - 1);

  p.aim = angleTo(p.x, p.y, input.mouse.x, input.mouse.y);
  p.iframe = Math.max(0, p.iframe - dt);
  p.muzzle = Math.max(0, p.muzzle - dt);
  p.kick *= Math.max(0, 1 - 10 * dt);
  p.buffs.rapid = Math.max(0, p.buffs.rapid - dt);
  p.buffs.double = Math.max(0, p.buffs.double - dt);

  if (p.hp <= 30) {
    p.heartT -= dt;
    if (p.heartT <= 0) {
      sfx.heartbeat();
      p.heartT = 0.5 + p.hp / 40;
    }
  }
}

export function damagePlayer(game, dmg) {
  const p = game.player;
  if (p.iframe > 0 || p.hp <= 0) return;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, dmg * 0.6);
    p.armor -= absorbed;
    dmg -= absorbed;
    fx.sparks(p.x, p.y, 4);
  }
  p.hp -= dmg;
  p.iframe = 0.6;
  game.shake = Math.min(game.shake + 5, 12);
  sfx.hurt();
  fx.blood(p.x, p.y, null, 10);
  addDecal('blood', p.x + rand(-3, 3), p.y + rand(-3, 3), 3);
  if (p.hp <= 0) {
    p.hp = 0;
    fx.blood(p.x, p.y, null, 30);
    addDecal('blood', p.x, p.y, 10);
  }
}

export function drawPlayer(game, ctx) {
  const p = game.player;
  if (p.hp <= 0) return;
  if (p.iframe > 0 && Math.floor(game.time * 20) % 2) return; // hit flicker

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 5, 0, 0, TAU);
  ctx.fill();

  ctx.rotate(p.aim);
  // torso + shoulder pads
  ctx.fillStyle = '#4f5a33';
  ctx.fillRect(-5, -6, 9, 12);
  ctx.fillStyle = '#3c452a';
  ctx.fillRect(-4, -7, 6, 3);
  ctx.fillRect(-4, 4, 6, 3);
  // weapon
  const barrel = game.barrelLen || 10;
  ctx.fillStyle = '#23241f';
  ctx.fillRect(2 - p.kick, -1.5, barrel, 3);
  ctx.fillStyle = '#8a8268';
  ctx.fillRect(2 - p.kick, -1, 2, 2); // hands on grip
  // helmet
  ctx.fillStyle = '#55603a';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#46512f';
  ctx.beginPath();
  ctx.arc(-1, 0, 3.4, 0, TAU);
  ctx.fill();
  // muzzle flash
  if (p.muzzle > 0) {
    const fxl = 2 - p.kick + barrel;
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath();
    ctx.moveTo(fxl, -3);
    ctx.lineTo(fxl + 7, 0);
    ctx.lineTo(fxl, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff7d8';
    ctx.fillRect(fxl, -1, 3, 2);
  }
  ctx.restore();
}
