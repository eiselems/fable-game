// Particle system + persistent ground decal layer (blood, scorch, spent brass).
import { rand, TAU, pick } from './util.js';

export const particles = [];

let decal = null, dctx = null;

export function initDecals(W, H) {
  decal = document.createElement('canvas');
  decal.width = W;
  decal.height = H;
  dctx = decal.getContext('2d');
}

export function clearDecals() {
  dctx.clearRect(0, 0, decal.width, decal.height);
}

export function drawDecals(ctx) {
  ctx.drawImage(decal, 0, 0);
}

export function addDecal(type, x, y, r = 4) {
  if (!dctx) return;
  if (type === 'blood') {
    dctx.fillStyle = 'rgba(86,20,12,0.45)';
    for (let i = 0; i < 4; i++) {
      dctx.beginPath();
      dctx.arc(x + rand(-r, r), y + rand(-r, r), rand(1, r * 0.7), 0, TAU);
      dctx.fill();
    }
  } else if (type === 'scorch') {
    dctx.fillStyle = 'rgba(18,16,12,0.5)';
    dctx.beginPath();
    dctx.arc(x, y, r, 0, TAU);
    dctx.fill();
    dctx.fillStyle = 'rgba(10,9,7,0.55)';
    dctx.beginPath();
    dctx.arc(x, y, r * 0.55, 0, TAU);
    dctx.fill();
  } else if (type === 'casing') {
    dctx.fillStyle = '#9d7f1f';
    dctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}

function add(p) {
  if (particles.length < 600) particles.push(p);
}

export const fx = {
  sparks(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(40, 160);
      add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.08, 0.28), size: 1, color: pick(['#ffe9a3', '#ffd25e', '#ffffff']), drag: 4 });
    }
  },
  blood(x, y, dir = null, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = dir === null ? rand(0, TAU) : dir + rand(-0.9, 0.9);
      const s = rand(20, 110);
      add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.12, 0.4), size: rand(1, 2), color: pick(['#7a1d12', '#8e2a16', '#5c150d']), drag: 5 });
    }
  },
  debris(x, y, n = 8, colors = ['#8b929c', '#6f767e', '#555b63', '#a3aab4']) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(30, 130);
      add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.6), size: rand(1, 2.5), color: pick(colors), drag: 3.5 });
    }
  },
  casing(x, y, aim) {
    const side = pick([-1, 1]);
    const a = aim + side * (Math.PI / 2) + rand(-0.4, 0.4);
    const s = rand(28, 60);
    add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.35, 0.55), size: 1, color: '#c9a227', drag: 3, stamp: 'casing' });
  },
  smoke(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(5, 25);
      add({ x: x + rand(-2, 2), y: y + rand(-2, 2), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.35, 0.9), size: rand(2, 3.5), color: pick(['#6a675f', '#7c7970', '#56544c']), drag: 1.5 });
    }
  },
  explosion(x, y) {
    fx.sparks(x, y, 16);
    fx.smoke(x, y, 9);
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU), s = rand(50, 190);
      add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.15, 0.45), size: rand(1, 3), color: pick(['#ff9a3a', '#ffd23e', '#e05a1f', '#fff1ba']), drag: 3.5 });
    }
    addDecal('scorch', x, y, rand(9, 14));
  },
};

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      if (p.stamp) addDecal(p.stamp, p.x, p.y);
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.drag) {
      const f = Math.max(0, 1 - p.drag * dt);
      p.vx *= f;
      p.vy *= f;
    }
  }
}

export function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = p.color;
    const s = p.size || 1;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}
