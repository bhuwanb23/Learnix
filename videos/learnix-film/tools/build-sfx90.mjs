/**
 * Sound design for the 90-second cut.
 *
 * Synthesised, like the score — there is no SFX library in the repo, and a
 * procedural hit is both reproducible and exactly placeable on a timeline.
 *
 * Cues:
 *   transition  a soft filtered whoosh on each scene change (14)
 *   tick        a dry UI tick as content lands in a scene
 *   click       a small click per diagram node ignition
 *   swell       a low rise under the turn (S04), the film's biggest moment
 *   resolve     one warm tone on the end card
 *
 * Run: node tools/build-sfx90.mjs  ->  audio/sfx90.wav
 */

import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 48000;
const DUR = 90;
const OUT = resolve(ROOT, "audio", "sfx90.wav");

const film = JSON.parse(readFileSync(resolve(ROOT, "docs", "FILM-90.json"), "utf8"));

const N = SR * DUR;
const buf = new Float32Array(N);

/** deterministic noise — Math.random() is banned in this project */
const noise = (i) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

function add(t0, dur, fn) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const s = s0 + i;
    if (s < 0 || s >= N) continue;
    buf[s] += fn(i / SR, i / n, s);
  }
}

/** filtered noise burst — the body of every transition and tick */
function whoosh(t0, gain, { dur = 0.5, f0 = 380, f1 = 2600, q = 0.7 } = {}) {
  let lp = 0, bp = 0;
  add(t0, dur, (t, p, s) => {
    const k = f0 + (f1 - f0) * p;
    const nz = noise(s * 0.37) * 0.5 + noise(s * 0.91) * 0.5;
    lp += (nz - lp) * Math.min(1, k / SR / 8);
    bp += (lp - bp) * q;
    const env = Math.sin(Math.PI * Math.min(1, p * 1.15)) ** 1.5;
    return bp * env * gain;
  });
}

/** a dry, short click/tick */
function tick(t0, gain, { freq = 2100, dur = 0.06, decay = 0.05 } = {}) {
  let lp = 0;
  add(t0, dur, (t, p, s) => {
    const nz = noise(s * 1.7);
    lp += (nz - lp) * 0.7;
    const env = Math.exp(-decay * 60 * t);
    return (lp * 0.6 + Math.sin(2 * Math.PI * freq * t) * 0.4) * env * gain;
  });
}

/** low swell for the turn */
function swell(t0, gain, dur = 3.2, f = 68) {
  let lp = 0;
  add(t0, dur, (t, p, s) => {
    const nz = noise(s * 0.23);
    lp += (nz - lp) * 0.03;
    const env = Math.sin(Math.PI * Math.min(1, p)) ** 1.3;
    const tone = Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 2 * t) * 0.22;
    return (tone * 0.75 + lp * 0.5) * env * gain;
  });
}

/** warm resolving tone for the end card */
function chime(t0, gain, f = 523.25, dur = 2.4) {
  add(t0, dur, (t, p) => {
    const env = Math.min(1, t / 0.02) * Math.exp(-1.5 * t) * Math.min(1, (1 - p) * 6);
    return (
      (Math.sin(2 * Math.PI * f * t) +
        Math.sin(2 * Math.PI * f * 2 * t) * 0.32 +
        Math.sin(2 * Math.PI * f * 3 * t) * 0.14) *
      0.34 *
      env *
      gain
    );
  });
}

// ── place the cues ──────────────────────────────────────────────────────────
let clock = 0;
const log = [];

film.scenes.forEach((s, i) => {
  s.start = clock;
  const isLast = i === film.scenes.length - 1;

  // transition whoosh on every scene change, varied so it never repeats audibly
  if (i > 0 && !isLast) {
    const t = clock - 0.1;
    const up = i % 2 === 0;
    whoosh(t, 0.5, {
      dur: 0.46,
      f0: up ? 320 : 2400,
      f1: up ? 2600 : 340,
      q: up ? 0.6 : 0.75,
    });
    log.push(`  ${String(t.toFixed(2)).padStart(6)}s  transition (${up ? "up" : "down"})`);
  }

  // content landing
  tick(clock + 0.06, 0.4, { freq: 2300, dur: 0.05 });

  // act-specific detail
  if (s.layout === "fragment") for (let k = 1; k < 4; k++) tick(clock + 0.06 + k * 0.1, 0.3, { freq: 2500 });
  if (s.layout === "compete" || s.layout === "documents")
    for (let k = 1; k < 3; k++) tick(clock + 0.06 + k * 0.13, 0.32, { freq: 1900 });

  if (s.layout === "converge") {
    swell(clock, 0.5);
    // four windows snapping together
    for (let k = 0; k < 4; k++) tick(clock + 1.32 + k * 0.07, 0.42, { freq: 1500, dur: 0.08, decay: 0.07 });
    log.push(`  ${clock.toFixed(2).padStart(6)}s  TURN swell + 4 converge clicks`);
  }

  if (s.kind === "diagram") {
    // a click per layer/node as the build runs
    const steps = s.build === "layers" ? 6 : 9;
    for (let k = 0; k < steps; k++) {
      tick(clock + 0.3 + (k * (s.dur - 0.9)) / steps, 0.26, {
        freq: 1700 + ((k * 137) % 900),
        dur: 0.05,
      });
    }
    log.push(`  ${clock.toFixed(2).padStart(6)}s  diagram build (${steps} ticks)`);
  }

  if (s.layout === "hero") whoosh(clock, 0.22, { dur: 0.7, f0: 300, f1: 1500, q: 0.5 });

  if (s.layout === "endcard") {
    chime(clock + 0.55, 0.5);
    chime(clock + 0.75, 0.32, 659.25, 2.2);
    log.push(`  ${clock.toFixed(2).padStart(6)}s  end-card chime`);
  }

  clock += s.dur;
});

// ── normalise and write ─────────────────────────────────────────────────────
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
// sfx sit well under the score; they are punctuation, not content
const TARGET = 0.34;
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

console.log(`sfx90.wav  ${DUR}s  peak ${(20 * Math.log10(TARGET)).toFixed(1)} dBFS`);
for (const l of log) console.log(l);