// Weapon definitions, firing, and player projectiles.
import { rand, dist, angleTo, pointInRect } from './util.js';
import { input } from './input.js';
import { sfx } from './audio.js';
import { fx } from './particles.js';
import { enemies, damageEnemy } from './enemies.js';
import { damagePlayer } from './player.js';

export const WEAPONS = {
  pistol:  { name: 'M9 SIDEARM',   slot: 1, kind: 'bullet', dmg: 14, rate: 0.3,  spread: 0.04, speed: 430, magSize: 12, startReserve: Infinity, reloadTime: 0.9, pellets: 1, shake: 1.5, barrel: 10, tracer: '#ffd98c' },
  smg:     { name: 'MP5 SMG',      slot: 2, kind: 'bullet', dmg: 8,  rate: 0.08, spread: 0.13, speed: 470, magSize: 32, startReserve: 128,      reloadTime: 1.4, pellets: 1, shake: 1,   barrel: 12, tracer: '#ffd98c' },
  shotgun: { name: 'M870 SHOTGUN', slot: 3, kind: 'bullet', dmg: 7,  rate: 0.95, spread: 0.36, speed: 400, magSize: 6,  startReserve: 24,       reloadTime: 1.9, pellets: 7, shake: 5,   barrel: 13, tracer: '#ffc46b' },
  rocket:  { name: 'M72 LAW',      slot: 4, kind: 'rocket', dmg: 55, rate: 1.2,  spread: 0.02, speed: 200, magSize: 1,  startReserve: 5,        reloadTime: 1.6, pellets: 1, shake: 3,   barrel: 14, tracer: '#cfd2cc', aoe: 50 },
};

export const projectiles = [];

export function createArsenal() {
  const ammo = {};
  for (const k in WEAPONS) {
    ammo[k] = {
      mag: k === 'pistol' ? WEAPONS[k].magSize : 0,
      reserve: k === 'pistol' ? Infinity : 0,
    };
  }
  return { current: 'pistol', owned: { pistol: true }, ammo, cooldown: 0, reload: 0, emptyCd: 0 };
}

export function giveWeapon(game, key) {
  const a = game.arsenal;
  a.owned[key] = true;
  a.ammo[key].mag = WEAPONS[key].magSize;
  a.ammo[key].reserve = Math.max(a.ammo[key].reserve, WEAPONS[key].startReserve);
  a.current = key;
  a.reload = 0;
  a.cooldown = 0.2;
}

function switchTo(game, key) {
  const a = game.arsenal;
  if (!a.owned[key] || a.current === key) return;
  a.current = key;
  a.reload = 0;
  a.cooldown = 0.18;
  sfx.reload();
}

export function updateWeapons(game, dt) {
  const a = game.arsenal, p = game.player;
  a.cooldown -= dt;
  a.emptyCd -= dt;

  for (const k in WEAPONS) {
    if (input.pressed.has('Digit' + WEAPONS[k].slot)) switchTo(game, k);
  }
  if (input.wheel) {
    const owned = Object.keys(WEAPONS).filter(k => a.owned[k]);
    let i = owned.indexOf(a.current);
    i = (i + (input.wheel > 0 ? 1 : -1) + owned.length) % owned.length;
    switchTo(game, owned[i]);
  }

  const w = WEAPONS[a.current], am = a.ammo[a.current];
  game.barrelLen = w.barrel;

  if (a.reload > 0) {
    a.reload -= dt;
    if (a.reload <= 0) {
      const take = Math.min(w.magSize - am.mag, am.reserve);
      am.mag += take;
      if (am.reserve !== Infinity) am.reserve -= take;
    }
    return;
  }

  if (((input.pressed.has('KeyR') && am.mag < w.magSize) || am.mag <= 0) && am.reserve > 0) {
    a.reload = w.reloadTime;
    sfx.reload();
    return;
  }

  if (!input.mouse.down || p.hp <= 0) return;
  if (am.mag <= 0) {
    if (a.emptyCd <= 0) {
      sfx.empty();
      a.emptyCd = 0.35;
    }
    return;
  }
  if (a.cooldown > 0) return;

  am.mag--;
  a.cooldown = w.rate * (p.buffs.rapid > 0 ? 0.45 : 1);
  const dmgMul = p.buffs.double > 0 ? 2 : 1;
  const ox = p.x + Math.cos(p.aim) * (w.barrel + 2);
  const oy = p.y + Math.sin(p.aim) * (w.barrel + 2);
  for (let i = 0; i < w.pellets; i++) {
    const ang = p.aim + rand(-w.spread, w.spread);
    const spd = w.speed * rand(0.92, 1.08);
    projectiles.push({
      x: ox, y: oy,
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
      ang, kind: w.kind,
      dmg: w.dmg * dmgMul,
      tracer: p.buffs.double > 0 ? '#ff8c3a' : w.tracer,
      aoe: w.aoe || 0,
      life: 1.5,
      trail: 0,
    });
  }
  p.kick = w.shake;
  p.muzzle = 0.05;
  game.shake = Math.min(game.shake + w.shake * 0.6, 9);
  sfx[a.current]();
  if (w.kind === 'bullet') fx.casing(p.x, p.y, p.aim);
  else fx.smoke(ox, oy, 4);
}

export function updateProjectiles(game, dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const b = projectiles[i];
    b.life -= dt;
    if (b.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }
    if (b.kind === 'rocket') {
      b.trail -= dt;
      if (b.trail <= 0) {
        fx.smoke(b.x, b.y, 1);
        b.trail = 0.025;
      }
    }
    // substep so fast bullets can't tunnel through targets
    let hit = false;
    const sub = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 4));
    for (let s = 0; s < sub && !hit; s++) {
      b.x += (b.vx * dt) / sub;
      b.y += (b.vy * dt) / sub;
      if (b.x < -4 || b.x > game.W + 4 || b.y < -4 || b.y > game.H + 4) {
        hit = true;
        break;
      }
      for (const o of game.obstacles) {
        if (pointInRect(b.x, b.y, o)) {
          if (b.kind === 'rocket') explode(game, b.x, b.y, b.dmg, b.aoe);
          else fx.sparks(b.x, b.y, 3);
          hit = true;
          break;
        }
      }
      if (hit) break;
      for (const e of enemies) {
        const rr = e.r + (b.kind === 'rocket' ? 2 : 1.2);
        if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 < rr * rr) {
          if (b.kind === 'rocket') explode(game, b.x, b.y, b.dmg, b.aoe);
          else damageEnemy(game, e, b.dmg, b.ang);
          hit = true;
          break;
        }
      }
    }
    if (hit) projectiles.splice(i, 1);
  }
}

export function explode(game, x, y, dmg, radius) {
  fx.explosion(x, y);
  sfx.explosion();
  game.shake = Math.min(game.shake + 8, 14);
  for (const e of [...enemies]) {
    const d = dist(x, y, e.x, e.y);
    if (d < radius + e.r) {
      const falloff = 1 - (d / (radius + e.r)) * 0.6;
      damageEnemy(game, e, dmg * falloff, angleTo(x, y, e.x, e.y), { pierce: 0.5, ignoreShield: true });
    }
  }
  const p = game.player;
  const pd = dist(x, y, p.x, p.y);
  if (pd < radius * 0.7) damagePlayer(game, 25 * (1 - pd / radius));
}

export function drawProjectiles(ctx) {
  for (const b of projectiles) {
    if (b.kind === 'rocket') {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang);
      ctx.fillStyle = '#7d8278';
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.fillStyle = '#ffb13a';
      ctx.fillRect(-5, -1, 2, 2);
      ctx.restore();
    } else {
      ctx.strokeStyle = b.tracer;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}
