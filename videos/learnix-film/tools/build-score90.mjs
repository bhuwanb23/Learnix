/**
 * Score for the 90-second cut.
 *
 * Same language as docs/MUSIC-BRIEF.md — 76 BPM, D minor, the four-note motif,
 * D major only at the close — compressed into ninety seconds. Narration carries
 * only 42s of the film, so the score has room to move.
 *
 * Run: node tools/build-score90.mjs  ->  audio/score90.wav
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 48000;
const DUR = 90;
const BEAT = 60 / 76;
const OUT = resolve(ROOT, "audio", "score90.wav");

const N = SR * DUR;
const buf = new Float32Array(N);

const semis = (n) => Math.pow(2, n / 12);
const freq = (n) => 146.83 * semis(n);
const SCALE = [0, 2, 3, 5, 7, 8, 10];
const deg = (i) => SCALE[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);

function noise(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function addTone(t0, dur, f, gain, { harmonics = 6, decay = 4, attack = 0.004, detune = 0 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const s = s0 + i;
    if (s < 0 || s >= N) continue;
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp(-decay * t) * Math.min(1, (n - i) / (SR * 0.05));
    let v = 0;
    for (let h = 1; h <= harmonics; h++) {
      v += Math.sin(2 * Math.PI * f * h * t) / (h * h);
      if (detune) v += Math.sin(2 * Math.PI * f * (1 + detune) * h * t) / (h * h);
    }
    buf[s] += v * env * gain;
  }
}

function addDrone(t0, dur, f, gain, { harmonics = 4 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const s = s0 + i;
    if (s < 0 || s >= N) continue;
    const t = i / SR;
    const env = Math.min(1, t / 1.2) * Math.min(1, (n - i) / (SR * 1.5));
    let v = 0;
    for (let h = 1; h <= harmonics; h++) v += Math.sin(2 * Math.PI * f * h * t) / h;
    v *= 1 + 0.06 * Math.sin(2 * Math.PI * 0.09 * t);
    buf[s] += v * env * gain;
  }
}

function addHit(t0, gain, { decay = 0.06, tone = 0, len = 0.1 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const s = s0 + i;
    if (s < 0 || s >= N) continue;
    const t = i / SR;
    const env = Math.exp(-decay * 60 * t) * Math.min(1, (n - i) / 200);
    lp += (noise(s * 0.5) * 0.7 - lp) * 0.35;
    let v = lp;
    if (tone) v += Math.sin(2 * Math.PI * tone * t) * 0.5;
    buf[s] += v * env * gain;
  }
}

const ev = [];
const MOTIF = [0, 2, 4, 5];
const ML = MOTIF.length * BEAT;
const motif = (t0, gain = 0.16, oct = 0) =>
  MOTIF.forEach((d, k) => ev.push(() => addTone(t0 + k * BEAT, 1.4, freq(deg(d + oct * 7)), gain, { harmonics: 7, decay: 2.6 })));

// 0-12s — piano alone, the motif. Present at frame 1.
ev.push(() => addDrone(0, 13, freq(deg(0)) / 2, 0.03, { harmonics: 2 }));
motif(0.4, 0.15);
motif(7.0, 0.13);

// 12-40s — the tour begins; pulse enters and a light arpeggio carries the screens
ev.push(() => addDrone(12, 30, freq(deg(0)) / 2, 0.05, { harmonics: 3 }));
const ARP = [0, 4, 2, 5, 4, 7, 5, 9];
for (let b = 0; b < 30 / BEAT; b++) {
  const t = 12 + b * BEAT;
  ev.push(() => addTone(t, BEAT * 0.9, freq(deg(ARP[b % ARP.length] + 7)), 0.05, { harmonics: 5, decay: 3 }));
  if (b % 2 === 0) ev.push(() => addHit(t, 0.026, { decay: 0.04, tone: 1200, len: 0.06 }));
}
for (const t of [14, 21, 28, 35]) motif(t, 0.07, 1);

// 40-58s — the architecture; widen and steady
ev.push(() => addDrone(40, 20, freq(deg(0)), 0.055, { harmonics: 4, detune: 0.005 }));
ev.push(() => addDrone(40, 20, freq(deg(2)), 0.04, { harmonics: 3, detune: 0.005 }));
for (let b = 0; b < 20 / BEAT; b++) {
  const t = 40 + b * BEAT;
  ev.push(() => addTone(t, BEAT * 1.6, freq(deg(ARP[(b * 2) % ARP.length] + 7)), 0.042, { harmonics: 4, decay: 3.4 }));
}

// 58-75s — everything together, still controlled
ev.push(() => addDrone(58, 20, freq(deg(0)), 0.07, { harmonics: 5 }));
ev.push(() => addDrone(58, 20, freq(deg(2)), 0.05, { harmonics: 4 }));
ev.push(() => addDrone(58, 20, freq(deg(4)), 0.04, { harmonics: 4 }));
for (let b = 0; b < 20 / BEAT; b++) {
  ev.push(() => addHit(58 + b * BEAT, 0.03, { decay: 0.05, tone: 1400, len: 0.07 }));
}

// 75-90s — the motif returns in D major. The whole arc in one interval.
for (let t = 75; t < 86; t += ML) {
  MOTIF.forEach((d, k) =>
    ev.push(() => addTone(t + k * BEAT, 2.0, freq(deg(d + 1)), 0.16, { harmonics: 8, decay: 1.6 }))
  );
}
ev.push(() => addDrone(84, 6, freq(0), 0.08, { harmonics: 4 }));
ev.push(() => addDrone(84, 6, freq(4), 0.06, { harmonics: 4 }));
ev.push(() => addDrone(84, 6, freq(7), 0.05, { harmonics: 4 }));
ev.push(() => addTone(84, 5, freq(0) * 2, 0.06, { harmonics: 4, decay: 0.5, attack: 0.2 }));

for (const f of ev) f();

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const TARGET = 0.7;
if (peak > 0) for (let i = 0; i < N; i++) buf[i] *= TARGET / peak;

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + N * 2, 4);
header.write("WAVEfmt ", 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(N * 2, 40);

const pcm = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), i * 2);
}
writeFileSync(OUT, Buffer.concat([header, pcm]));

const rms = (a, b) => {
  let s = 0;
  for (let i = Math.round(a * SR); i < Math.round(b * SR); i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, Math.round(b * SR) - Math.round(a * SR)));
};
const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : "-inf");
console.log(`score90.wav  ${DUR}s  76 BPM  ${(Buffer.concat([header, pcm]).length / 1048576).toFixed(1)} MB  peak ${db(TARGET)} dBFS`);
for (const [n, a, b] of [["open", 0, 12], ["tour", 12, 40], ["architecture", 40, 58], ["full", 58, 75], ["resolve", 75, 90]]) {
  console.log(`  ${n.padEnd(14)} ${a}-${b}s  ${db(rms(a, b)).padStart(7)} dBFS`);
}