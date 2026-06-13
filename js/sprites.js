// Procedurally pre-rendered sprites: dirt ground, sandbag walls, supply crates.
import { rand, randInt, pick, TAU } from './util.js';

export const sprites = {};

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function generateSprites(W, H) {
  sprites.ground = makeGround(W, H);
  sprites.sandbagH = makeSandbags(36, 14);
  sprites.sandbagV = makeSandbags(14, 36);
  sprites.crate = makeCrate(18);
}

function makeGround(W, H) {
  const c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = '#45402e';
  g.fillRect(0, 0, W, H);

  // dirt speckle
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = pick(['#4a4531', '#403b2a', '#4e4936', '#3a3627', '#514b37']);
    g.fillRect(randInt(0, W - 1), randInt(0, H - 1), 1, 1);
  }

  // cracked concrete pads
  for (const [px, py, pw, ph] of [[36, 26, 96, 62], [326, 208, 116, 74], [206, 116, 72, 84]]) {
    g.fillStyle = '#55524a';
    g.fillRect(px, py, pw, ph);
    g.fillStyle = '#4c4942';
    for (let i = 0; i < 260; i++) g.fillRect(px + randInt(0, pw - 1), py + randInt(0, ph - 1), 1, 1);
    g.strokeStyle = '#3b3933';
    g.lineWidth = 1;
    g.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    // cracks
    g.strokeStyle = 'rgba(40,38,32,0.8)';
    for (let k = 0; k < 3; k++) {
      let x = px + rand(6, pw - 6), y = py + rand(6, ph - 6);
      g.beginPath();
      g.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        x += rand(-12, 12);
        y += rand(-10, 10);
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }

  // tire tracks across the yard
  g.strokeStyle = 'rgba(38,34,24,0.65)';
  g.lineWidth = 2;
  for (const off of [-5, 5]) {
    g.beginPath();
    for (let x = -4; x <= W + 4; x += 8) {
      const y = H * 0.72 + Math.sin(x * 0.02) * 14 + off;
      x === -4 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }

  // oil stains
  for (let i = 0; i < 4; i++) {
    const x = rand(40, W - 40), y = rand(40, H - 40);
    g.fillStyle = 'rgba(24,22,17,0.3)';
    for (let b = 0; b < 4; b++) {
      g.beginPath();
      g.arc(x + rand(-5, 5), y + rand(-4, 4), rand(2, 6), 0, TAU);
      g.fill();
    }
  }

  // faded painted landing mark in the center
  g.strokeStyle = 'rgba(190,180,150,0.16)';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(W / 2, H / 2, 38, 0, TAU);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(W / 2 - 16, H / 2);
  g.lineTo(W / 2 + 16, H / 2);
  g.moveTo(W / 2, H / 2 - 16);
  g.lineTo(W / 2, H / 2 + 16);
  g.stroke();

  return c;
}

function makeSandbags(w, h) {
  const c = cv(w, h), g = c.getContext('2d');
  g.fillStyle = '#2e2a1e';
  g.fillRect(0, 0, w, h);
  const bw = 9, bh = 7;
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let col = -1; col * bw < w + bw; col++) {
      const x = col * bw + off, y = row * bh;
      g.fillStyle = pick(['#6e6748', '#776f4f', '#665f42', '#71694b']);
      g.fillRect(Math.max(x + 1, 0), y + 1, Math.min(bw - 2, w - x - 1), bh - 2);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(Math.max(x + 1, 0), y + 1, Math.min(bw - 2, w - x - 1), 2);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(Math.max(x + 1, 0), y + bh - 2, Math.min(bw - 2, w - x - 1), 1);
    }
  }
  return c;
}

function makeCrate(s) {
  const c = cv(s, s), g = c.getContext('2d');
  g.fillStyle = '#6a5836';
  g.fillRect(0, 0, s, s);
  g.fillStyle = '#5b4a2c';
  for (let y = 4; y < s; y += 5) g.fillRect(1, y, s - 2, 1);
  g.strokeStyle = '#473a22';
  g.lineWidth = 2;
  g.strokeRect(1, 1, s - 2, s - 2);
  g.beginPath();
  g.moveTo(2, 2);
  g.lineTo(s - 2, s - 2);
  g.moveTo(s - 2, 2);
  g.lineTo(2, s - 2);
  g.stroke();
  g.fillStyle = '#3a3019';
  for (const [bx, by] of [[2, 2], [s - 3, 2], [2, s - 3], [s - 3, s - 3]]) g.fillRect(bx, by, 1, 1);
  return c;
}
