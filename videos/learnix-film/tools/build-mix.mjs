/**
 * Builds the final audio mix and muxes it onto the rendered video.
 *
 * Two problems this solves, both found by measuring the first render:
 *   1. Every narration cue sat at the same mean level as the score, so the
 *      score masked the voice. Cues are now levelled to a common peak.
 *   2. The score needed to get out of the way under narration. That is a mix
 *      decision, so it is applied here with sidechain compression rather than
 *      baked into the score, which stays a clean deliverable stem.
 *
 * Run: node tools/build-mix.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => resolve(ROOT, ...s);

const VIDEO = p("renders", "learnix-master-film.mp4");
const SCORE = p("audio", "score.wav");
const VOMIX = p("audio", "vo-mix.wav");
const OUT = p("renders", "learnix-master-film.mp4");

const cues = JSON.parse(readFileSync(p("audio", "vo-manifest.json"), "utf8")).cues;

// scene starts, straight from the screenplay
const master = readFileSync(p("docs", "MASTER-SCRIPT.md"), "utf8");
const startOf = new Map();
for (const m of master.matchAll(/^### (S\d+)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+)s\s*$/gm)) {
  startOf.set(m[1], Number(m[2]) * 60 + Number(m[3]));
}

const FFMPEG = "ffmpeg";
// Narration is the film's spine; it has to sit clearly above the score.
// Measured on the first render the two were ~1 dB apart in the speech band,
// which is inaudible as narration.
const VO_PEAK_TARGET_DB = -1;
const VO_LUFS = -16;
const SCORE_GAIN_DB = -7;
const DUCK_RATIO = 6;

/** Read a s16 PCM mono wav and return its peak, for levelling. */
function wavPeak(file) {
  const buf = readFileSync(file);
  // locate 'data' chunk
  let off = 12;
  while (off < buf.length - 8) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "data") {
      let peak = 0;
      for (let i = off + 8; i + 1 < off + 8 + size; i += 2) {
        const v = Math.abs(buf.readInt16LE(i));
        if (v > peak) peak = v;
      }
      return peak / 32768;
    }
    off += 8 + size + (size % 2);
  }
  return 0;
}

const run = (args) =>
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1 << 26,
  });

// ── 1. level and place every cue ────────────────────────────────────────────
const placed = [];
for (const c of cues) {
  const file = p(c.file);
  if (!existsSync(file)) throw new Error(`missing ${c.file} — run tools/build-vo.mjs`);
  const start = startOf.get(c.id);
  if (start == null) throw new Error(`${c.id} has no scene start`);
  const peak = wavPeak(file);
  const gain = peak > 0 ? Math.pow(10, VO_PEAK_TARGET_DB / 20) / peak : 1;
  placed.push({ ...c, start, gain });
}

const inputs = [];
const chain = [];
placed.forEach((c, i) => {
  inputs.push("-i", p(c.file));
  // resample to 48k stereo, level, then delay to the scene start
  chain.push(
    `[${i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
      `volume=${c.gain.toFixed(4)}dB,adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)}[a${i}]`
  );
});
// amix with normalize=0, otherwise it divides by the input count.
// Loudness-normalise rather than peak-normalise: speech peaks are sparse, so
// levelling peaks leaves the perceived level ~28 dB down and still buried.
chain.push(
  `${placed.map((_, i) => `[a${i}]`).join("")}amix=inputs=${placed.length}:normalize=0[mixed]`,
  `[mixed]loudnorm=I=${VO_LUFS}:TP=-1.5:LRA=11,alimiter=limit=0.891:level=disabled[vo]`
);

run([
  ...inputs,
  "-filter_complex", chain.join(";"),
  "-map", "[vo]",
  "-t", "420",
  "-ar", "48000",
  "-ac", "2",
  VOMIX,
]);
console.log(`vo-mix.wav  ${placed.length} cues levelled to ${VO_PEAK_TARGET_DB} dBFS peak`);

// ── 2. duck the score under the voice, then sum ─────────────────────────────
const FILTER = [
  `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
    `volume=${SCORE_GAIN_DB}dB[scoreflat]`,
  // sidechain: the voice pulls the score down a little further
  `[scoreflat][vo]sidechaincompress=threshold=0.03:ratio=${DUCK_RATIO}:attack=25:release=400:makeup=1[ducked]`,
  `[vo][ducked]amix=inputs=2:normalize=0:dropout_transition=0,` +
    `alimiter=limit=0.891:level=disabled[out]`,
].join(";");

const tmpAudio = p("renders", "mix.wav");
run([
  "-i", SCORE,
  "-i", VOMIX,
  "-filter_complex", FILTER,
  "-map", "[out]",
  "-t", "420",
  "-ar", "48000",
  "-ac", "2",
  tmpAudio,
]);

// ── 3. mux onto the rendered video (video copied, audio replaced) ───────────
const tmpOut = p("renders", "learnix-master-film-muxed.mp4");
run([
  "-i", VIDEO,
  "-i", tmpAudio,
  "-map", "0:v:0",
  "-map", "1:a:0",
  "-c:v", "copy",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  "-shortest",
  tmpOut,
]);

writeFileSync(p("audio", "mix-manifest.json"),
  JSON.stringify({
    voPeakTargetDb: VO_PEAK_TARGET_DB,
    cues: placed.map((c) => ({ id: c.id, start: c.start, gainDb: +(20 * Math.log10(c.gain)).toFixed(2) })),
  }, null, 2),
  "utf8"
);

console.log("mix built and muxed");
console.log(`  -> ${tmpOut}`);