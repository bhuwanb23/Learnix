/**
 * Audio mix for the 90-second cut.
 * Same approach as tools/build-mix.mjs — narration loudness-normalised and the
 * score ducked under it.
 *
 * Run: node tools/build-mix90.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => resolve(ROOT, ...s);

const FILM = p("renders", "learnix-90s-v2.mp4");
const SCORE = p("audio", "score90.wav");
const VOMIX = p("audio", "vo90-mix.wav");
const OUT = p("renders", "learnix-90s-final.mp4");

const cues = JSON.parse(readFileSync(p("audio", "vo90-manifest.json"), "utf8")).cues.filter((c) => !c.silent);

const VO_LUFS = -16;
const SCORE_GAIN_DB = -8;
const DUCK_RATIO = 6;
const SFX = p("audio", "sfx90.wav");
const SFX_GAIN_DB = -6;
const DUR = 90;

function wavPeak(file) {
  const buf = readFileSync(file);
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
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26,
  });

const inputs = [];
const chain = [];
cues.forEach((c, i) => {
  const file = p(c.file);
  if (!existsSync(file)) throw new Error(`missing ${c.file}`);
  const gain = wavPeak(file) > 0 ? 1 / wavPeak(file) : 1;
  inputs.push("-i", file);
  const ms = Math.round(c.start * 1000);
  chain.push(
    `[${i}:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,` +
      `volume=${gain.toFixed(4)}dB,adelay=${ms}|${ms}[a${i}]`
  );
});
chain.push(
  `${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${cues.length}:normalize=0[mixed]`,
  `[mixed]loudnorm=I=${VO_LUFS}:TP=-1.5:LRA=11,alimiter=limit=0.891:level=disabled[vo]`
);
run([...inputs, "-filter_complex", chain.join(";"), "-map", "[vo]", "-t", String(DUR), "-ar", "48000", "-ac", "2", VOMIX]);
console.log(`vo90-mix.wav  ${cues.length} cues at ${VO_LUFS} LUFS`);

const FILTER = [
  `[1:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${SCORE_GAIN_DB}dB[scoreflat]`,
  `[scoreflat][vo]sidechaincompress=threshold=0.03:ratio=${DUCK_RATIO}:attack=25:release=350:makeup=1[ducked]`,
  // sfx are punctuation; they sit under everything and are never ducked away
  `[2:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,volume=${SFX_GAIN_DB}dB[sfx]`,
  `[vo][ducked][sfx]amix=inputs=3:normalize=0:dropout_transition=0,alimiter=limit=0.891:level=disabled[out]`,
].join(";");

const tmpA = p("renders", "mix90.wav");
run([
  "-i", SCORE, "-i", VOMIX, "-i", SFX,
  "-filter_complex", FILTER, "-map", "[out]",
  "-t", String(DUR), "-ar", "48000", "-ac", "2", tmpA,
]);
run(["-i", FILM, "-i", tmpA, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
     "-movflags", "+faststart", "-shortest", OUT]);

console.log(`mix built -> ${OUT}`);