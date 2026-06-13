// Enemy types, AI, and the visible-armor damage model.
// Armor is a separate HP layer rendered as steel plates on top of the body;
// hits on armor spark and ping, and plates break off as debris at thresholds.
import { rand, TAU, dist, angleTo, angDiff, clamp, circleRect, pick } from './util.js';
import { sfx } from './audio.js';
import { fx, addDecal } from './particles.js';
import { damagePlayer } from './player.js';
import { rollDrop } from './powerups.js';

export const enemies = [];
export const enemyShots = [];

const TYPES = {
  grunt:   { hp: 26, armor: 0,   shield: 0,  speed: 72, r: 6,  score: 10, plates: 0, body: '#7d6b4a', helmet: '#6a5a3e' },
  trooper: { hp: 30, armor: 50,  shield: 0,  speed: 46, r: 7,  score: 25, plates: 2, body: '#5d6647', helmet: '#4d5539' },
  shield:  { hp: 35, armor: 0,   shield: 90, speed: 40, r: 7,  score: 35, plates: 0, body: '#4d5560', helmet: '#3f4650' },
  heavy:   { hp: 90, armor: 140, shield: 0,  speed: 27, r: 10, score: 60, plates: 3, body: '#54584a', helmet: '#44483c' },
};

export function resetEnemies() {
  enemies.length = 0;
  enemyShots.length = 0;
}

export function spawnEnemy(type, x, y) {
  const t = TYPES[type];
  enemies.push({
    type, x, y,
    r: t.r,
    hp: t.hp, maxHp: t.hp,
    armor: t.armor, maxArmor: t.armor || 1,
    shieldHp: t.shield, maxShield: t.shield || 1,
    plates: t.plates,
    speed: t.speed * rand(0.9, 1.1),
    score: t.score,
    facing: 0,
    atkCd: rand(0.6, 1.4),
    strafeDir: pick([-1, 1]),
    strafeT: rand(1, 3),
    state: 'walk',
    stateT: 0,
    burst: 0,
    flash: 0,
    lunge: 0,
  });
}

function shoot(e, ang, spread, speed, dmg) {
  const a = ang + rand(-spread, spread);
  enemyShots.push({
    x: e.x + Math.cos(ang) * (e.r + 3),
    y: e.y + Math.sin(ang) * (e.r + 3),
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    dmg,
    life: 2.5,
  });
  sfx.enemyShot();
}

export function updateEnemies(game, dt) {
  const p = game.player;
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt);
    e.lunge = Math.max(0, e.lunge - dt);
    e.atkCd -= dt;
    const toP = angleTo(e.x, e.y, p.x, p.y);
    e.facing = toP;
    const d = dist(e.x, e.y, p.x, p.y);
    let mvx = 0, mvy = 0;

    if (e.type === 'trooper') {
      e.strafeT -= dt;
      if (e.strafeT <= 0) {
        e.strafeDir *= -1;
        e.strafeT = rand(1.2, 2.6);
      }
      if (d > 130) {
        mvx = Math.cos(toP); mvy = Math.sin(toP);
      } else if (d < 90) {
        mvx = -Math.cos(toP) * 0.6; mvy = -Math.sin(toP) * 0.6;
      } else {
        const sa = toP + (Math.PI / 2) * e.strafeDir;
        mvx = Math.cos(sa) * 0.6; mvy = Math.sin(sa) * 0.6;
      }
      if (e.atkCd <= 0 && d < 220 && p.hp > 0) {
        e.atkCd = rand(1.5, 2.2);
        shoot(e, toP, 0.09, 150, 10);
        fx.sparks(e.x + Math.cos(toP) * (e.r + 3), e.y + Math.sin(toP) * (e.r + 3), 2);
      }
    } else if (e.type === 'heavy') {
      if (e.state === 'walk') {
        mvx = Math.cos(toP); mvy = Math.sin(toP);
        if (d < 165 && p.hp > 0) {
          e.state = 'spin';
          e.stateT = 1.0;
          sfx.spinUp();
        }
      } else if (e.state === 'spin') {
        e.stateT -= dt;
        if (e.stateT <= 0) {
          e.state = 'fire';
          e.stateT = 1.3;
          e.burst = 0;
        }
      } else if (e.state === 'fire') {
        e.stateT -= dt;
        e.burst -= dt;
        if (e.burst <= 0 && p.hp > 0) {
          e.burst = 0.09;
          shoot(e, toP, 0.22, 175, 6);
        }
        if (e.stateT <= 0 || d > 260) {
          e.state = 'cool';
          e.stateT = 1.6;
        }
      } else { // cool
        e.stateT -= dt;
        mvx = Math.cos(toP) * 0.5; mvy = Math.sin(toP) * 0.5;
        if (e.stateT <= 0) e.state = 'walk';
      }
    } else { // grunt, shield: close to melee
      mvx = Math.cos(toP); mvy = Math.sin(toP);
      if (d < e.r + p.r + 3 && e.atkCd <= 0 && p.hp > 0) {
        e.atkCd = 0.9;
        e.lunge = 0.15;
        damagePlayer(game, e.type === 'shield' ? 14 : 8);
      }
    }

    e.x += mvx * e.speed * dt;
    e.y += mvy * e.speed * dt;

    // separation from other enemies
    for (const o of enemies) {
      if (o === e) continue;
      const dx = e.x - o.x, dy = e.y - o.y;
      const rr = e.r + o.r;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < rr * rr) {
        const dd = Math.sqrt(d2);
        const push = (rr - dd) * 0.5;
        e.x += (dx / dd) * push;
        e.y += (dy / dd) * push;
      }
    }
    for (const o of game.obstacles) {
      const push = circleRect(e.x, e.y, e.r, o);
      if (push) {
        e.x += push.x;
        e.y += push.y;
      }
    }
    e.x = clamp(e.x, e.r, game.W - e.r);
    e.y = clamp(e.y, e.r, game.H - e.r);
  }

  // enemy bullets
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    let dead = s.life <= 0 || s.x < -4 || s.x > game.W + 4 || s.y < -4 || s.y > game.H + 4;
    if (!dead) {
      for (const o of game.obstacles) {
        if (s.x >= o.x && s.x <= o.x + o.w && s.y >= o.y && s.y <= o.y + o.h) {
          fx.sparks(s.x, s.y, 2);
          dead = true;
          break;
        }
      }
    }
    if (!dead && p.hp > 0 && (s.x - p.x) ** 2 + (s.y - p.y) ** 2 < (p.r + 1.5) ** 2) {
      damagePlayer(game, s.dmg);
      dead = true;
    }
    if (dead) enemyShots.splice(i, 1);
  }
}

export function damageEnemy(game, e, dmg, ang, { pierce = 0, ignoreShield = false } = {}) {
  if (e.hp <= 0) return;

  // riot shield blocks hits arriving at the front arc
  if (e.shieldHp > 0 && !ignoreShield && Math.abs(angDiff(ang + Math.PI, e.facing)) < 1.15) {
    e.shieldHp -= dmg;
    const sx = e.x + Math.cos(e.facing) * (e.r + 2);
    const sy = e.y + Math.sin(e.facing) * (e.r + 2);
    fx.sparks(sx, sy, 5);
    sfx.ricochet();
    if (e.shieldHp <= 0) {
      e.shieldHp = 0;
      fx.debris(sx, sy, 14, ['#39434d', '#5b6c7c', '#2c343c']);
      sfx.plateBreak();
    }
    e.flash = 0.05;
    return;
  }

  if (e.armor > 0) {
    const before = Math.ceil((e.armor / e.maxArmor) * e.plates);
    e.armor -= dmg;          // armor soaks the hit
    e.hp -= dmg * pierce;    // piercing weapons leak through
    if (e.armor < 0) {
      e.hp += e.armor;       // overflow carries into the body
      e.armor = 0;
    }
    const after = Math.max(0, Math.ceil((e.armor / e.maxArmor) * e.plates));
    fx.sparks(e.x, e.y, 4);
    sfx.ricochet();
    if (after < before) {
      fx.debris(e.x, e.y, 10);
      sfx.plateBreak();
    }
  } else {
    e.hp -= dmg;
    fx.blood(e.x, e.y, ang, 6);
    sfx.fleshHit();
    if (Math.random() < 0.4) addDecal('blood', e.x + rand(-3, 3), e.y + rand(-3, 3), rand(2, 4));
  }
  e.flash = 0.06;
  if (e.hp <= 0) kill(game, e);
}

function kill(game, e) {
  game.score += e.score;
  game.kills++;
  fx.blood(e.x, e.y, null, 14);
  addDecal('blood', e.x, e.y, e.r + rand(2, 5));
  if (e.type === 'heavy') {
    game.shake = Math.min(game.shake + 7, 14);
    fx.debris(e.x, e.y, 12);
  }
  rollDrop(game, e.x, e.y, e.type);
  const i = enemies.indexOf(e);
  if (i >= 0) enemies.splice(i, 1);
}

export function drawEnemies(ctx, game) {
  for (const e of enemies) {
    const t = TYPES[e.type];
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 2, e.r, e.r * 0.7, 0, 0, TAU);
    ctx.fill();

    ctx.rotate(e.facing);
    if (e.lunge > 0) ctx.translate(2, 0);

    // body + shoulders
    ctx.fillStyle = t.body;
    ctx.fillRect(-e.r * 0.7, -e.r * 0.85, e.r * 1.3, e.r * 1.7);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-e.r * 0.6, -e.r, e.r * 0.9, e.r * 0.35);
    ctx.fillRect(-e.r * 0.6, e.r * 0.65, e.r * 0.9, e.r * 0.35);

    // weapons in hand
    if (e.type === 'trooper') {
      ctx.fillStyle = '#26271f';
      ctx.fillRect(e.r * 0.3, -1, 9, 2);
    } else if (e.type === 'heavy') {
      const spin = (e.state === 'spin' || e.state === 'fire') && Math.floor(game.time * 30) % 2;
      ctx.fillStyle = '#2a2c28';
      ctx.fillRect(e.r * 0.4, -2.5 + (spin ? 1 : 0), 12, 2);
      ctx.fillRect(e.r * 0.4, 0.5 - (spin ? 1 : 0), 12, 2);
    } else if (e.type === 'grunt') {
      ctx.fillStyle = '#3a3a36';
      ctx.fillRect(e.r * 0.4, -0.5 + (e.lunge > 0 ? -1 : 0), 6, 1.5);
    }

    // helmet
    ctx.fillStyle = t.helmet;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.62, 0, TAU);
    ctx.fill();

    // armor plates overlay
    if (e.plates > 0) {
      const stage = Math.max(0, Math.ceil((e.armor / e.maxArmor) * e.plates));
      if (stage >= 1) {
        ctx.fillStyle = '#959ca6';
        ctx.fillRect(-1, -e.r * 0.7, e.r * 0.9, e.r * 1.4);
        ctx.strokeStyle = '#6e747d';
        ctx.lineWidth = 1;
        ctx.strokeRect(-1, -e.r * 0.7, e.r * 0.9, e.r * 1.4);
        if (stage === 1) {
          // cracked last plate
          ctx.strokeStyle = '#3c4046';
          ctx.beginPath();
          ctx.moveTo(0, -e.r * 0.5);
          ctx.lineTo(e.r * 0.4, 0);
          ctx.lineTo(0, e.r * 0.5);
          ctx.stroke();
        }
      }
      if (stage >= 2) {
        ctx.fillStyle = '#8b929c';
        ctx.fillRect(-e.r * 0.5, -e.r - 1, e.r * 0.7, e.r * 0.45);
        ctx.fillRect(-e.r * 0.5, e.r * 0.55 + 1, e.r * 0.7, e.r * 0.45);
      }
      if (e.plates >= 3 && stage >= 3) {
        ctx.fillStyle = '#a3aab4';
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 0.5, -Math.PI / 2, Math.PI / 2);
        ctx.fill();
        ctx.fillRect(-e.r * 0.55, -e.r * 0.45, e.r * 0.35, e.r * 0.9);
      }
    }

    // riot shield
    if (e.shieldHp > 0) {
      ctx.fillStyle = '#39434d';
      ctx.fillRect(e.r + 1, -e.r - 2, 3, (e.r + 2) * 2);
      ctx.fillStyle = '#5b6c7c';
      ctx.fillRect(e.r + 1, -2, 3, 4);
      if (e.shieldHp < e.maxShield * 0.5) {
        ctx.strokeStyle = '#1d2329';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(e.r + 1, -e.r);
        ctx.lineTo(e.r + 4, -e.r * 0.3);
        ctx.moveTo(e.r + 4, e.r * 0.2);
        ctx.lineTo(e.r + 1, e.r * 0.8);
        ctx.stroke();
      }
    }

    // hit flash
    if (e.flash > 0) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, e.r * 0.9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  // enemy tracers
  ctx.strokeStyle = '#ff7a50';
  ctx.lineWidth = 1;
  for (const s of enemyShots) {
    ctx.beginPath();
    ctx.moveTo(s.x - s.vx * 0.018, s.y - s.vy * 0.018);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
}
