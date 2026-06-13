// Procedural audio engine — every sound is synthesized with the Web Audio API.
// No asset files: gunshots are filtered noise bursts, pings are pitch-swept
// oscillators, the ambient bed is a pair of detuned saws through a lowpass.
import { rand } from './util.js';

const VOLUME = 0.5;

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
let drone = null;

export function initAudio() {
  if (ctx) {
    ctx.resume();
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : VOLUME;
  return muted;
}

function noise({ dur = 0.2, type = 'lowpass', freq = 1000, freqEnd = 0, gain = 0.3, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.playbackRate.value = rand(0.85, 1.15);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 30), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

function tone({ type = 'square', freq = 440, freqEnd = 0, dur = 0.1, gain = 0.2, delay = 0 } = {}) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  // weapon names match WEAPONS keys so sfx[arsenal.current]() works
  pistol() {
    noise({ dur: 0.12, freq: 3000, freqEnd: 400, gain: 0.32 });
    tone({ freq: 170, freqEnd: 60, dur: 0.06, gain: 0.18 });
  },
  smg() {
    noise({ dur: 0.08, freq: 2600, freqEnd: 500, gain: 0.2 });
    tone({ freq: 150, freqEnd: 70, dur: 0.04, gain: 0.1 });
  },
  shotgun() {
    noise({ dur: 0.35, freq: 1300, freqEnd: 80, gain: 0.5 });
    tone({ type: 'sine', freq: 120, freqEnd: 40, dur: 0.25, gain: 0.35 });
  },
  rocket() {
    noise({ dur: 0.5, type: 'bandpass', freq: 400, freqEnd: 1800, gain: 0.3 });
    tone({ type: 'sawtooth', freq: 90, freqEnd: 50, dur: 0.3, gain: 0.12 });
  },
  explosion() {
    noise({ dur: 0.7, freq: 750, freqEnd: 50, gain: 0.55 });
    tone({ type: 'sine', freq: 95, freqEnd: 25, dur: 0.6, gain: 0.45 });
  },
  ricochet() {
    tone({ type: 'triangle', freq: rand(2100, 3300), freqEnd: rand(500, 900), dur: 0.12, gain: 0.14 });
    noise({ dur: 0.04, type: 'highpass', freq: 4500, gain: 0.07 });
  },
  fleshHit() {
    noise({ dur: 0.1, freq: 500, freqEnd: 100, gain: 0.24 });
  },
  plateBreak() {
    noise({ dur: 0.25, type: 'bandpass', freq: 950, freqEnd: 200, gain: 0.38 });
    tone({ freq: 320, freqEnd: 80, dur: 0.15, gain: 0.14 });
  },
  reload() {
    tone({ freq: 950, dur: 0.03, gain: 0.11 });
    tone({ freq: 620, dur: 0.04, gain: 0.11, delay: 0.13 });
  },
  empty() {
    tone({ freq: 1250, dur: 0.025, gain: 0.09 });
  },
  pickup() {
    tone({ freq: 520, dur: 0.07, gain: 0.14 });
    tone({ freq: 784, dur: 0.1, gain: 0.14, delay: 0.08 });
  },
  klaxon() {
    tone({ type: 'sawtooth', freq: 440, dur: 0.26, gain: 0.18 });
    tone({ type: 'sawtooth', freq: 330, dur: 0.26, gain: 0.18, delay: 0.3 });
    tone({ type: 'sawtooth', freq: 440, dur: 0.26, gain: 0.18, delay: 0.6 });
  },
  hurt() {
    noise({ dur: 0.2, freq: 420, freqEnd: 80, gain: 0.38 });
    tone({ type: 'sawtooth', freq: 200, freqEnd: 60, dur: 0.2, gain: 0.18 });
  },
  heartbeat() {
    tone({ type: 'sine', freq: 70, freqEnd: 40, dur: 0.12, gain: 0.4 });
    tone({ type: 'sine', freq: 62, freqEnd: 38, dur: 0.1, gain: 0.28, delay: 0.16 });
  },
  enemyShot() {
    noise({ dur: 0.09, freq: 1800, freqEnd: 300, gain: 0.13 });
  },
  spinUp() {
    tone({ type: 'sawtooth', freq: 90, freqEnd: 380, dur: 0.95, gain: 0.08 });
  },
};

// Ambient military drone: detuned saw pair + slow filter LFO + a dull pulse.
export function startDrone() {
  if (!ctx || drone) return;
  const g = ctx.createGain();
  g.gain.value = 0.045;
  g.connect(master);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 160;
  f.Q.value = 4;
  f.connect(g);
  const o1 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = 55;
  o1.connect(f);
  o1.start();
  const o2 = ctx.createOscillator();
  o2.type = 'sawtooth';
  o2.frequency.value = 55.7;
  o2.connect(f);
  o2.start();
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.13;
  const lg = ctx.createGain();
  lg.gain.value = 50;
  lfo.connect(lg);
  lg.connect(f.frequency);
  lfo.start();
  const beat = setInterval(() => {
    tone({ type: 'sine', freq: 58, freqEnd: 36, dur: 0.18, gain: 0.15 });
  }, 1200);
  drone = { g, f, o1, o2, lfo, beat };
}

export function setDroneIntensity(wave) {
  if (!drone) return;
  drone.f.frequency.value = Math.min(160 + wave * 22, 520);
  drone.g.gain.value = Math.min(0.045 + wave * 0.003, 0.085);
}

export function stopDrone() {
  if (!drone) return;
  clearInterval(drone.beat);
  drone.o1.stop();
  drone.o2.stop();
  drone.lfo.stop();
  drone.g.disconnect();
  drone = null;
}
