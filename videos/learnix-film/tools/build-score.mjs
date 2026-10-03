/**
 * Synthesises the score from docs/MUSIC-BRIEF.md.
 *
 * Deliberately not MusicGen: the brief requires 76 BPM held for seven minutes,
 * a D minor -> D major resolution that happens only in the last 25 seconds,
 * a hard cut at 1:30, and eight seconds of digital silence at 1:52. None of that
 * survives a generative model, and all of it is trivial to control directly.
 *
 * Run: node tools/build-score.mjs   ->  audio/score.wav
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SR = 48000;
const DUR = 420;
const BPM = 76;
const BEAT = 60 / BPM;
const OUT = resolve(ROOT, "audio", "score.wav");

const N = SR * DUR;
const buf = new Float32Array(N);

// ── helpers ─────────────────────────────────────────────────────────────────
const semis = (n) => Math.pow(2, n / 12);
const freq = (note) => 146.83 * semis(note); // D3 = 146.83Hz

// D natural minor scale degrees, semitone offsets from D
const SCALE = [0, 2, 3, 5, 7, 8, 10];
const deg = (i) => SCALE[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);

/** Deterministic noise — Math.random() is banned, and a fixed seed is reproducible. */
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
    // slow movement so the drone never sits perfectly still
    v *= 1 + 0.06 * Math.sin(2 * Math.PI * 0.07 * t);
    buf[s] += v * env * gain;
  }
}

/** Percussion: filtered noise burst, damped. Wood, rim, brush. */
function addHit(t0, gain, { decay = 0.09, tone = 0, len = 0.12 } = {}) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(len * SR);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const s = s0 + i;
    if (s < 0 || s >= N) continue;
    const t = i / SR;
    const env = Math.exp(-decay * 60 * t) * Math.min(1, (n - i) / 200);
    const nz = noise(s * 0.5) * 0.7;
    lp += (nz - lp) * 0.35; // one-pole lowpass
    let v = lp;
    if (tone) v += Math.sin(2 * Math.PI * tone * t) * 0.5;
    buf[s] += v * env * gain;
  }
}

/** Place a note by scale degree at a beat offset. */
const note = (t, d, i, gain, opts) => addTone(t, d, freq(deg(i)), gain, opts);

// ── M1 · Morning — piano alone, one motif ────────────────────────────────────
// Four-note motif: D F G A  (0 2 4 5)
const MOTIF = [0, 2, 4, 5];
const MOTIF_LEN = MOTIF.length * BEAT; // ~3.16s

function motif(t0, gain = 0.16, octave = 0) {
  MOTIF.forEach((d, k) => {
    note(t0 + k * BEAT, 1.5, d + octave * 7, gain, { harmonics: 7, decay: 2.4 });
  });
}

// ── build the movements ─────────────────────────────────────────────────────
const ev = [];

// M1 0:00-0:30 — present at frame 1, then sparse piano.
// The brief is explicit: no fade-in, the film starts already observed.
ev.push(() => addDrone(0, 30, freq(deg(0)) / 2, 0.035, { harmonics: 2 })); // bed from frame 1
for (let t = 0; t < 30; t += MOTIF_LEN + 2.2) motif(t, 0.15);
// a bare sustained note under S06/S07
ev.push(() => addTone(25.2, 4.6, freq(deg(0)), 0.06, { harmonics: 4, decay: 0.5, attack: 0.6 }));

// M2 0:30-1:30 — pulse, then three waves of percussion, motif fragmented
ev.push(() => addDrone(30, 20, freq(deg(0)) / 2, 0.075)); // sub pedal from 0:40
ev.push(() => addDrone(50, 40, freq(deg(0)) / 2, 0.075));
for (let t = 30; t < 90; t += BEAT * 2) {
  // low pulse — felt, not heard
  ev.push(() => addTone(t, 0.5, freq(deg(0)) / 2, 0.05, { harmonics: 2, decay: 7, attack: 0.05 }));
}
// wave 1: muted wooden taps from ~0:55
for (let t = 55; t < 90; t += BEAT * 1.5) ev.push(() => addHit(t, 0.05, { decay: 0.06, tone: 320, len: 0.09 }));
// wave 2: dry rim click, off-grid, from ~1:10
for (let t = 70; t < 90; t += BEAT * 1.5) ev.push(() => addHit(t + BEAT * 0.37, 0.038, { decay: 0.03, tone: 900, len: 0.05 }));
// wave 3: brushed swell from ~1:25
for (let t = 85; t < 90; t += BEAT) ev.push(() => addHit(t, 0.026, { decay: 0.02, len: 0.22 }));
// motif, fragmented — same melody, disassembled
for (const [t, d] of [[38, 0], [44, 2], [52, 4], [63, 1], [68, 3], [76, 5], [82, 2]]) {
  ev.push(() => note(t, 1.1, d, 0.10, { harmonics: 5, decay: 3 }));
}

// M3 1:30-1:52 — everything cuts; sub-bass only
ev.push(() => addDrone(90, 22, freq(deg(0)) / 2, 0.10, { harmonics: 2 }));

// ---- 1:52-2:00 EIGHT SECONDS OF DIGITAL SILENCE. Non-negotiable. ----

// M4 2:00-2:20 — one sustained tone, one piano note, no pulse
ev.push(() => addTone(120, 16, freq(deg(0)), 0.055, { harmonics: 3, decay: 0.28, attack: 1.4, detune: 0.004 }));
ev.push(() => note(125, 4.5, 0, 0.17, { harmonics: 8, decay: 1.6 })); // motif note 1, alone
ev.push(() => addDrone(126, 14, freq(deg(2)) / 2, 0.045, { harmonics: 3 }));

// M5 2:20-3:30 — precise arpeggio, one tick per module ignition at 2:20
const ARP = [0, 4, 2, 5, 4, 7, 5, 9];
for (let b = 0; b < 70 / BEAT; b++) {
  const t = 140 + b * BEAT;
  const d = ARP[b % ARP.length];
  ev.push(() => note(t, BEAT * 0.95, d + 7, 0.052, { harmonics: 5, decay: 2.6, attack: 0.006 }));
}
// motif as a sustained bed underneath
for (let t = 140; t < 210; t += MOTIF_LEN * 2) motif(t, 0.055, 1);
// eight ticks matching S27's module ignition, one per second from 2:21
for (let k = 0; k < 8; k++) ev.push(() => addHit(141 + k * 1.0, 0.05, { decay: 0.05, tone: 1500, len: 0.07 }));
// 3:11 the consolidation — arpeggio stops, what remains is a held chord.
// S35 carries the film's thesis narration, so the reveal is held down to leave
// the narrator room; measured against the VO it was previously a 0.1 dB margin.
ev.push(() => addDrone(191, 19, freq(deg(0)), 0.042, { harmonics: 5 }));
ev.push(() => addDrone(191, 19, freq(deg(2)), 0.028, { harmonics: 4 }));
ev.push(() => addDrone(191, 19, freq(deg(4)), 0.022, { harmonics: 4 }));
motif(191, 0.10);

// M6 3:30-5:00 — warm, almost no percussion; brief F major colour near 3:38
ev.push(() => addDrone(210, 45, freq(deg(0)), 0.05, { harmonics: 3, detune: 0.005 }));
ev.push(() => addDrone(210, 45, freq(deg(2)), 0.04, { harmonics: 3, detune: 0.005 }));
// F major passing colour: F A C  (deg 3, 5, 7 in D minor -> F major colours)
ev.push(() => note(218, 5, 3, 0.06, { harmonics: 5, decay: 1.4 }));
ev.push(() => note(219.4, 5, 5, 0.055, { harmonics: 5, decay: 1.4 }));
ev.push(() => note(220.8, 5, 7, 0.05, { harmonics: 5, decay: 1.4 }));
for (const [t, d] of [[228, 0], [236, 2], [244, 4], [250, 5], [262, 2], [272, 4], [284, 0], [292, 5]]) {
  ev.push(() => note(t, 2.2, d, 0.075, { harmonics: 6, decay: 1.8 }));
}

// M7 5:00-6:15 — Dorian (raised 3rd), forward motion, no drums
ev.push(() => addDrone(300, 75, freq(0), 0.05, { harmonics: 3, detune: 0.006 }));
ev.push(() => addDrone(300, 75, freq(4), 0.04, { harmonics: 3, detune: 0.006 })); // Dorian third
for (let b = 0; b < 75 / (BEAT * 2); b++) {
  const t = 300 + b * BEAT * 2;
  ev.push(() => note(t, BEAT * 1.8, ARP[(b * 3) % ARP.length] + 7, 0.038, { harmonics: 4, decay: 3 }));
}
for (const [t, d] of [[310, 0], [318, 2], [326, 5], [334, 4], [342, 2], [348, 5]]) {
  ev.push(() => note(t, 2.4, d, 0.08, { harmonics: 6, decay: 1.6 }));
}
// S47's single notification tone, musically integrated
ev.push(() => addTone(308, 2.4, freq(deg(0)) * 4, 0.05, { harmonics: 2, decay: 1.6, attack: 0.01 }));
// widening from 5:40
for (const t of [340, 344, 348, 352, 356, 360, 364, 368]) {
  ev.push(() => addTone(t, 5, freq(deg(0)) * 4, 0.026, { harmonics: 3, decay: 0.7, attack: 0.8, detune: 0.004 }));
}

// M8 6:15-7:00 — the motif returns in D MAJOR for the first time in the film
const shift = (d) => d + 1; // D minor -> D major
for (let t = 375; t < 405; t += MOTIF_LEN) {
  MOTIF.forEach((d, k) => {
    ev.push(() => note(t + k * BEAT, 2.2, shift(d), 0.15, { harmonics: 8, decay: 1.5 }));
  });
}
// strings answer from 6:35
for (let b = 0; b < 25 / BEAT; b++) {
  const t = 395 + b * BEAT;
  ev.push(() => addTone(t, BEAT * 3.2, freq(shift(deg((b * 2) % 7)) + 7), 0.035, {
    harmonics: 5, decay: 0.6, attack: 0.35, detune: 0.008,
  }));
}
// resolve, then stop — not fade
ev.push(() => addDrone(405, 13, freq(0), 0.075, { harmonics: 4 }));
ev.push(() => addDrone(405, 13, freq(4), 0.055, { harmonics: 4 }));
ev.push(() => addDrone(405, 13, freq(shift(deg(2))), 0.045, { harmonics: 4 }));
motif(405, 0.14);
ev.push(() => addTone(412, 5, freq(0) * 2, 0.06, { harmonics: 4, decay: 0.5, attack: 0.2 }));

for (const f of ev) f();

// ── normalise, guarantee the silence, write ─────────────────────────────────
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const TARGET_PEAK = 0.72; // about -2.8 dBFS, leaving headroom for the narration mix
const g = peak > 0 ? TARGET_PEAK / peak : 1;
for (let i = 0; i < N; i++) buf[i] *= g;

// The 8s silence must be digital silence, not merely quiet.
for (let s = Math.round(112 * SR); s < Math.round(120 * SR); s++) buf[s] = 0;

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

const out = Buffer.alloc(N * 2);
for (let i = 0; i < N; i++) {
  const v = Math.max(-1, Math.min(1, buf[i]));
  out.writeInt16LE(Math.round(v * 32767), i * 2);
}
writeFileSync(OUT, Buffer.concat([header, out]));

// ── report ──────────────────────────────────────────────────────────────────
const rms = (a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const db = (v) => (v > 0 ? (20 * Math.log10(v)).toFixed(1) : "-inf");
const marks = [
  ["M1 Morning", 0, 30], ["M2 Fracture", 30, 90], ["M3 Collapse", 90, 112],
  ["SILENCE", 112, 120], ["M4 Turn", 120, 140], ["M5 Architecture", 140, 210],
  ["M6 Human", 210, 300], ["M7 Intelligence", 300, 375], ["M8 Resolve", 375, 420],
];
console.log(`score.wav  ${DUR}s @ ${SR}Hz  ${BPM} BPM  ${(Buffer.concat([header, out]).length / 1048576).toFixed(1)} MB`);
console.log(`peak ${db(TARGET_PEAK)} dBFS (pre-normalise peak was ${db(peak)} dBFS)`);
for (const [name, a, b] of marks) {
  console.log(`  ${name.padEnd(16)} ${a}-${b}s  ${db(rms(Math.round(a * SR), Math.round(b * SR))).padStart(7)} dBFS`);
}