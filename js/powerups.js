// Pickups: supplies dropped by enemies and wave-clear resupplies.
import { rand, dist, clamp } from './util.js';
import { sfx } from './audio.js';
import { WEAPONS, giveWeapon } from './weapons.js';

export const pickups = [];

export function resetPickups() {
  pickups.length = 0;
}

export function spawnPickup(type, x, y) {
  pickups.push({ type, x: clamp(x, 14, 466), y: clamp(y, 14, 306), t: rand(0, 6), life: 14 });
}

export function rollDrop(game, x, y, enemyType) {
  const chance = { grunt: 0.14, trooper: 0.3, shield: 0.35, heavy: 1 }[enemyType] || 0.1;
  if (Math.random() > chance) return;
  const nextWeapon = ['smg', 'shotgun', 'rocket'].find(k => !game.arsenal.owned[k]);
  if (nextWeapon && Math.random() < 0.1) {
    spawnPickup('w_' + nextWeapon, x, y);
    return;
  }
  const table = [['health', 26], ['ammo', 30], ['vest', 16], ['rapid', 11], ['double', 11]];
  let total = 0;
  for (const t of table) total += t[1];
  let roll = rand(0, total);
  for (const t of table) {
    roll -= t[1];
    if (roll <= 0) {
      spawnPickup(t[0], x, y);
      return;
    }
  }
}

export function updatePickups(game, dt) {
  const p = game.player;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const u = pickups[i];
    u.t += dt;
    u.life -= dt;
    if (u.life <= 0) {
      pickups.splice(i, 1);
      continue;
    }
    if (p.hp > 0 && dist(u.x, u.y, p.x, p.y) < p.r + 8) {
      apply(game, u);
      pickups.splice(i, 1);
    }
  }
}

function apply(game, u) {
  const p = game.player, a = game.arsenal;
  const notice = s => {
    game.notice = s;
    game.noticeT = 2.2;
  };
  sfx.pickup();
  switch (u.type) {
    case 'health':
      p.hp = Math.min(p.maxHp, p.hp + 40);
      notice('+40 HEALTH');
      break;
    case 'vest':
      p.armor = Math.min(p.maxArmor, p.armor + 50);
      notice('ARMOR VEST');
      break;
    case 'ammo':
      for (const k of ['smg', 'shotgun', 'rocket']) {
        if (a.owned[k]) a.ammo[k].reserve += WEAPONS[k].magSize * 2;
      }
      notice('AMMO RESUPPLY');
      break;
    case 'rapid':
      p.buffs.rapid = 10;
      notice('RAPID FIRE — 10 SEC');
      break;
    case 'double':
      p.buffs.double = 10;
      notice('DOUBLE DAMAGE — 10 SEC');
      break;
    default:
      if (u.type.startsWith('w_')) {
        const k = u.type.slice(2);
        giveWeapon(game, k);
        notice(WEAPONS[k].name + ' ACQUIRED');
      }
  }
}

export function drawPickups(ctx) {
  for (const u of pickups) {
    if (u.life < 3 && Math.floor(u.t * 6) % 2) continue; // expiry blink
    const x = u.x, y = u.y + Math.sin(u.t * 3) * 1.5;
    const box = (base, border) => {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x - 5, y - 4, 11, 11);
      ctx.fillStyle = base;
      ctx.fillRect(x - 6, y - 6, 11, 11);
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 5.5, y - 5.5, 10, 10);
    };
    switch (u.type) {
      case 'health':
        box('#b6b9ae', '#7c7f74');
        ctx.fillStyle = '#b13a2a';
        ctx.fillRect(x - 2, y - 4, 3, 7);
        ctx.fillRect(x - 4, y - 2, 7, 3);
        break;
      case 'vest':
        box('#5a5f52', '#3c4036');
        ctx.fillStyle = '#9aa0a8';
        ctx.fillRect(x - 3, y - 4, 5, 7);
        ctx.fillRect(x - 4, y - 4, 7, 2);
        break;
      case 'ammo':
        box('#5c6242', '#3e422c');
        ctx.fillStyle = '#c9a227';
        for (let i = 0; i < 3; i++) ctx.fillRect(x - 4 + i * 3, y - 3, 2, 6);
        break;
      case 'rapid':
        box('#6b6030', '#494220');
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.moveTo(x + 1, y - 4);
        ctx.lineTo(x - 3, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.lineTo(x - 1, y + 4);
        ctx.lineTo(x + 3, y - 1);
        ctx.lineTo(x, y - 1);
        ctx.closePath();
        ctx.fill();
        break;
      case 'double':
        box('#6b4530', '#47301f');
        ctx.fillStyle = '#ff9a3a';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x2', x - 0.5, y - 0.5);
        break;
      default: { // weapon crate
        box('#4a4438', '#2e2a20');
        ctx.fillStyle = '#d8d2c0';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const letter = { w_smg: 'S', w_shotgun: 'G', w_rocket: 'R' }[u.type] || 'W';
        ctx.fillText(letter, x - 0.5, y - 0.5);
      }
    }
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}
