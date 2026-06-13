// HUD, wave banners, menus, crosshair — the stencil-and-olive presentation layer.
import { clamp, TAU } from './util.js';
import { input } from './input.js';
import { WEAPONS } from './weapons.js';

function text(ctx, s, x, y, size, color, align = 'left') {
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(s, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(12,11,8,0.75)';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#26241c';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * clamp(frac, 0, 1)), h);
  if (label) text(ctx, label, x + w + 4, y - 1, 6, '#9a937c');
}

function crosshair(ctx, x, y, gap, reloadFrac = 0) {
  ctx.strokeStyle = '#e8e4d0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.moveTo(x + dx * gap, y + dy * gap);
    ctx.lineTo(x + dx * (gap + 4), y + dy * (gap + 4));
  }
  ctx.stroke();
  ctx.fillStyle = '#e8e4d0';
  ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  if (reloadFrac > 0) {
    ctx.strokeStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x, y, gap + 7, -Math.PI / 2, -Math.PI / 2 + TAU * reloadFrac);
    ctx.stroke();
  }
}

export function drawHud(ctx, game) {
  const { W, H } = game;
  const p = game.player, a = game.arsenal, ws = game.waves;
  const w = WEAPONS[a.current], am = a.ammo[a.current];

  // vitals
  bar(ctx, 8, 8, 70, 6, p.hp / p.maxHp, p.hp > 30 ? '#7fa03a' : '#b13a2a', 'HP');
  bar(ctx, 8, 18, 70, 4, p.armor / p.maxArmor, '#9aa0a8', 'AR');

  // wave + score
  text(ctx, 'WAVE ' + ws.num, W - 8, 8, 9, '#d8d2c0', 'right');
  text(ctx, 'SCORE ' + game.score, W - 8, 20, 7, '#9a937c', 'right');

  // weapon slots
  let i = 0;
  for (const k in WEAPONS) {
    const x = 8 + i * 14, y = H - 32;
    ctx.fillStyle = a.current === k ? '#3f3d30' : 'rgba(18,17,13,0.7)';
    ctx.fillRect(x, y, 12, 12);
    ctx.strokeStyle = a.current === k ? '#9a937c' : '#3a382c';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 11, 11);
    text(ctx, String(WEAPONS[k].slot), x + 4, y + 3, 7, a.owned[k] ? '#d8d2c0' : '#56523f');
    i++;
  }

  // weapon name + ammo
  text(ctx, w.name, 8, H - 17, 7, '#d8d2c0');
  const res = am.reserve === Infinity ? '∞' : String(am.reserve);
  text(ctx, am.mag + '/' + res, 8, H - 9, 8, am.mag === 0 ? '#b13a2a' : '#e8d9a0');
  if (a.reload > 0) {
    bar(ctx, 70, H - 14, 36, 4, 1 - a.reload / w.reloadTime, '#ffd23e');
    text(ctx, 'RELOADING', 70, H - 9, 6, '#ffd23e');
  }

  // active buffs
  let by = H - 18;
  if (p.buffs.rapid > 0) {
    text(ctx, 'RAPID FIRE ' + p.buffs.rapid.toFixed(1), W - 8, by, 7, '#ffd23e', 'right');
    by -= 9;
  }
  if (p.buffs.double > 0) {
    text(ctx, 'DMG x2 ' + p.buffs.double.toFixed(1), W - 8, by, 7, '#ff9a3a', 'right');
  }

  // intermission countdown
  if (ws.phase === 'intermission' && ws.bannerT <= 0) {
    text(ctx, 'NEXT WAVE IN ' + Math.ceil(ws.timer), W / 2, 36, 8, '#d8d2c0', 'center');
  }

  // pickup / event notice
  if (game.noticeT > 0) {
    ctx.globalAlpha = Math.min(1, game.noticeT);
    text(ctx, game.notice, W / 2, H - 44, 7, '#e0d8b8', 'center');
    ctx.globalAlpha = 1;
  }

  // wave banner with letterbox bars
  if (ws.bannerT > 0) {
    const alpha = Math.min(1, ws.bannerT / 0.4);
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, H / 2 - 26, W, 52);
    ctx.globalAlpha = alpha;
    text(ctx, ws.banner, W / 2, H / 2 - 16, 16, '#d8d2c0', 'center');
    text(ctx, ws.sub, W / 2, H / 2 + 6, 7, '#b8b09a', 'center');
    ctx.globalAlpha = 1;
  }

  // low-hp warning vignette
  if (p.hp > 0 && p.hp < 35) {
    ctx.strokeStyle = `rgba(140,30,20,${0.3 + 0.22 * Math.sin(game.time * 6)})`;
    ctx.lineWidth = 16;
    ctx.strokeRect(0, 0, W, H);
  }

  crosshair(ctx, input.mouse.x, input.mouse.y, 3 + p.kick * 1.2, a.reload > 0 ? 1 - a.reload / w.reloadTime : 0);
}

export function drawMenu(ctx, game) {
  const { W, H } = game;
  ctx.fillStyle = 'rgba(12,11,8,0.78)';
  ctx.fillRect(0, 0, W, H);

  text(ctx, 'O U T P O S T', W / 2, 56, 26, '#cfc7a6', 'center');
  ctx.fillStyle = '#8a3324';
  ctx.fillRect(W / 2 - 92, 92, 184, 3);
  text(ctx, 'WAVE DEFENSE — SECTOR 7', W / 2, 102, 8, '#9a937c', 'center');

  const lines = [
    'WASD ......... MOVE',
    'MOUSE ........ AIM / FIRE',
    '1-4 / WHEEL .. WEAPON',
    'R ............ RELOAD',
    'P — PAUSE      M — MUTE',
  ];
  lines.forEach((s, i) => text(ctx, s, W / 2 - 78, 134 + i * 12, 7, '#b8b09a'));

  if (game.high > 0) text(ctx, 'HIGH SCORE ' + game.high, W / 2, 206, 8, '#d8d2c0', 'center');

  if (Math.sin(game.time * 5) > -0.3) {
    text(ctx, '[ CLICK TO DEPLOY ]', W / 2, 248, 10, '#e0d8b8', 'center');
  }
  text(ctx, 'SOUND ON FIRST CLICK', W / 2, 290, 6, '#56523f', 'center');

  crosshair(ctx, input.mouse.x, input.mouse.y, 3);
}

export function drawPause(ctx, game) {
  const { W, H } = game;
  ctx.fillStyle = 'rgba(12,11,8,0.6)';
  ctx.fillRect(0, 0, W, H);
  text(ctx, 'PAUSED', W / 2, H / 2 - 14, 16, '#d8d2c0', 'center');
  text(ctx, 'P — RESUME', W / 2, H / 2 + 10, 7, '#9a937c', 'center');
}

export function drawGameOver(ctx, game) {
  const { W, H } = game;
  ctx.fillStyle = `rgba(26,8,6,${Math.min(0.65, game.overT * 0.8)})`;
  ctx.fillRect(0, 0, W, H);

  text(ctx, 'K . I . A .', W / 2, 70, 30, '#c0392b', 'center');
  text(ctx, 'SURVIVED TO WAVE ' + game.waves.num + '  —  ' + game.kills + ' KILLS', W / 2, 130, 8, '#b8b09a', 'center');
  text(ctx, 'SCORE ' + game.score, W / 2, 150, 13, '#d8d2c0', 'center');
  if (game.isNewHigh) {
    if (Math.sin(game.time * 6) > -0.4) text(ctx, '★ NEW HIGH SCORE ★', W / 2, 176, 9, '#ffd23e', 'center');
  } else {
    text(ctx, 'HIGH SCORE ' + game.high, W / 2, 176, 8, '#9a937c', 'center');
  }
  if (game.overT > 1 && Math.sin(game.time * 5) > -0.3) {
    text(ctx, '[ CLICK TO RE-DEPLOY ]', W / 2, 232, 10, '#e0d8b8', 'center');
  }
  crosshair(ctx, input.mouse.x, input.mouse.y, 3);
}
