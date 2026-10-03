/**
 * Generates narration for every spoken cue and tunes each one to fit its scene.
 *
 * Kokoro's natural read is ~130 wpm; the film is budgeted at 140. Rather than
 * rushing the narrator globally, each cue is generated once at speed 1.0 to
 * measure its true length, then re-generated at the minimum speed adjustment
 * needed to sit inside its scene with a little air.
 *
 * Run: node tools/build-vo.mjs            (all cues)
 *      node tools/build-vo.mjs S07 S19    (specific cues)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VO_DIR = resolve(ROOT, "audio", "vo");
mkdirSync(VO_DIR, { recursive: true });

const master = readFileSync(resolve(ROOT, "docs", "MASTER-SCRIPT.md"), "utf8");
const voDoc = readFileSync(resolve(ROOT, "docs", "VO-SCRIPT.md"), "utf8");

const VOICE = process.env.LRNX_VOICE ?? "bm_george";
const MIN_SPEED = 0.78;
const MAX_SPEED = 1.45;
// The film's read rate. See docs/VO-SCRIPT.md.
const TARGET_WPM = 140;
// When a cue has room, pace is gently pulled toward the target. Without this
// Kokoro drifts anywhere between 95 and 187 wpm line to line and the narration
// stops sounding like one person.
const GENTLE_MAX = 1.15;
// A line may run this far into the next scene and still count as a J-cut
// rather than a collision — the film is one continuous narration bed.
const BRIDGE_TOLERANCE = 0.5;
// Above this the narrator sounds rushed rather than measured.
// Note: a long line in a short scene cannot be slowed below
// words/sceneDuration, so some cues are structurally fast. Those are
// reported separately as `tight`, not `rushed`.
const RUSHED_WPM = 170;

/** Stage directions in parentheses are never spoken. */
const speakable = (s) =>
  s
    .replace(/\*\*(TRIM|BRIDGE)\*\*\s*/g, "")
    .replace(/\*\*BRIDGE[^*]*\*\*/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s*—\s*(?=\*)/g, " ")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();

// ── scene durations from the screenplay ─────────────────────────────────────
const dur = new Map();
for (const m of master.matchAll(/^### (S\d+)[^\d]+?\d+:\d\d[^\d]+?\d+:\d\d[^\d]+?(\d+)s\s*$/gm)) {
  dur.set(m[1], Number(m[2]));
}

// ── narration text from the VO doc ──────────────────────────────────────────
const cues = new Map();
for (const line of voDoc.split("\n")) {
  if (!/^\|\s*S\d\d\s*\|/.test(line)) continue;
  const f = line.split("|");
  if (f.length < 6) continue;
  const id = f[1].trim();
  const cell = f[4];
  if (/^\s*\(*silent/i.test(cell.replace(/\*/g, ""))) continue;
  const text = speakable(cell);
  if (text) cues.set(id, text);
}

// ── TTS ──────────────────────────────────────────────────────────────────────
const tmpTxt = resolve(ROOT, "audio", "_tts.txt");

// Resolve the pinned HyperFrames CLI and invoke it with node directly.
// Shelling through npx is slow per cue and Node 24 refuses to spawn npx.cmd
// without a shell, so we locate the cached install once and reuse it.
const PINNED = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).scripts.check
  .match(/hyperframes@([\d.]+)/)[1];

function resolveCli() {
  if (process.env.LRNX_HYPERFRAMES_CLI && existsSync(process.env.LRNX_HYPERFRAMES_CLI)) {
    return process.env.LRNX_HYPERFRAMES_CLI;
  }
  const roots = [
    resolve(process.env.LOCALAPPDATA ?? "", "npm-cache", "_npx"),
    resolve(process.env.APPDATA ?? "", "npm-cache", "_npx"),
  ].filter((r) => existsSync(r));
  if (!roots.length) return null;

  for (const root of roots) {
    let entries;
    try {
      entries = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
    } catch {
      continue;
    }
    for (const e of entries) {
      const pkgDir = resolve(root, e.name, "node_modules", "hyperframes");
      const pkg = resolve(pkgDir, "package.json");
      if (!existsSync(pkg)) continue;
      try {
        const j = JSON.parse(readFileSync(pkg, "utf8"));
        if (j.version !== PINNED) continue;
        const binRel = typeof j.bin === "string" ? j.bin : j.bin?.hyperframes;
        const bin = resolve(pkgDir, binRel);
        if (existsSync(bin)) return bin;
      } catch {
        /* ignore malformed cache entries */
      }
    }
  }
  return null;
}

const CLI = resolveCli();
if (!CLI) {
  console.error(`could not locate hyperframes@${PINNED} in the npx cache`);
  console.error("set LRNX_HYPERFRAMES_CLI to its bin path and retry");
  process.exit(1);
}

function tts(text, outPath, speed) {
  writeFileSync(tmpTxt, text, "utf8");
  const out = execFileSync(
    process.execPath,
    [CLI, "tts", "--text-file", tmpTxt, "-v", VOICE, "-s", String(speed), "--json", "-o", outPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 }
  );
  const line = out.trim().split("\n").filter((l) => l.trim().startsWith("{")).pop();
  if (!line) throw new Error(`tts produced no JSON for ${outPath}`);
  return JSON.parse(line);
}

// ── generate ─────────────────────────────────────────────────────────────────
const only = process.argv.slice(2).filter((a) => /^S\d\d$/.test(a));
const targets = [...cues.entries()].filter(([id]) => !only.length || only.includes(id));

if (!targets.length) {
  console.error("no spoken cues found");
  process.exit(1);
}

// ── reuse anything already generated ────────────────────────────────────────
// TTS is the slow part of this build. A cue whose text is unchanged and whose
// wav already exists is reused verbatim, so the job resumes where it stopped
// instead of starting over.
const manifestPath = resolve(ROOT, "audio", "vo-manifest.json");
const FORCE = process.argv.includes("--force");
let prior = new Map();
if (!FORCE && existsSync(manifestPath)) {
  try {
    const j = JSON.parse(readFileSync(manifestPath, "utf8"));
    prior = new Map((j.cues ?? []).map((c) => [c.id, c]));
  } catch {
    /* corrupt manifest is not fatal, just ignore it */
  }
}

const results = [];
let generated = 0;
let reused = 0;

for (const [id, text] of targets) {
  const sceneDur = dur.get(id);
  if (!sceneDur) {
    console.error(`  ${id} has no duration in MASTER-SCRIPT.md`);
    process.exit(1);
  }
  const out = resolve(VO_DIR, `${id}.wav`);

  const prev = prior.get(id);
  if (!FORCE && prev && prev.text === text && existsSync(out)) {
    results.push(prev);
    reused++;
    console.log(`  ${id}  reused   ${prev.audioDur}s  ${prev.wpm} wpm  speed ${prev.speed}`);
    continue;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const desired = words / (TARGET_WPM / 60);
  // S07 is the one deliberate bridge — "from outside, a college looks under
  // control" runs on under the first chaos shot. At 9 words it cannot reach the
  // target pace inside 2s, so it is allowed the full 2s bridge. This is the
  // film's first J-cut and it is worth the overlap.
  const sceneAllowance = id === "S07" ? sceneDur + 2.0 : sceneDur;
  const aimFor = Math.min(desired, sceneAllowance * 0.97);

  let r = tts(text, out, 1.0);
  let durSec = r.durationSeconds;
  generated++;

  const want = natural => natural / aimFor;
  let target = Math.min(MAX_SPEED, Math.max(MIN_SPEED, want(durSec)));
  if (target > GENTLE_MAX) target = want(durSec);

  if (Math.abs(target - 1) > 0.01) {
    r = tts(text, out, Number(target.toFixed(3)));
    durSec = r.durationSeconds;
  }

  const fits = durSec <= sceneAllowance + BRIDGE_TOLERANCE;
  const bridge = Number((durSec - sceneAllowance).toFixed(3));
  const wpm = Number(((words / durSec) * 60).toFixed(1));
  const floorWpm = Number(((words / sceneAllowance) * 60).toFixed(1));

  results.push({
    id,
    file: `audio/vo/${id}.wav`,
    text,
    sceneDur,
    audioDur: Number(durSec.toFixed(3)),
    speed: r.speed,
    fits,
    bridge: bridge > 0 ? bridge : 0,
    rushed: wpm > RUSHED_WPM,
    structurallyFast: floorWpm > TARGET_WPM * 1.05,
    floorWpm,
    wpm,
  });
  console.log(`  ${id}  built    ${durSec.toFixed(2)}s  ${Math.round(wpm)} wpm  speed ${r.speed}`);
}

// Merge rather than replace, so `--force S07` does not discard the other 53.
const merged = new Map();
for (const c of prior.values()) merged.set(c.id, c);
for (const c of results) merged.set(c.id, c);
const manifest = [...merged.values()].sort((a, b) => a.id.localeCompare(b.id));
const regenerated = generated;

writeFileSync(
  manifestPath,
  JSON.stringify({ voice: VOICE, generated: manifest.length, cues: manifest }, null, 2),
  "utf8"
);

const bad = manifest.filter((m) => !m.fits);
const bridges = manifest.filter((m) => m.bridge > 0.01);
const rushed = manifest.filter((m) => m.rushed);
const tight = manifest.filter((m) => m.structurallyFast);
const paces = manifest.map((m) => m.wpm).sort((a, b) => a - b);

console.log(`\n${manifest.length} cues · ${generated} built this run · ${reused} reused`);
console.log(
  `pace: ${paces[0]}-${paces.at(-1)} wpm · target ${TARGET_WPM} · median ${paces[Math.floor(paces.length / 2)]}`
);
console.log(`bridges: ${bridges.length}${bridges.length ? " (" + bridges.map((m) => `${m.id} +${m.bridge.toFixed(2)}s`).join(", ") + ")" : ""}`);
if (tight.length) {
  console.log(`\n${tight.length} line(s) cannot reach ${TARGET_WPM} wpm inside their scene — these need +1s or a shorter line:`);
  for (const m of tight) console.log(`  ${m.id}  floor ${m.floorWpm} wpm  (${m.audioDur}s in ${m.sceneDur}s)`);
}
if (rushed.length) {
  console.log(`\nrushed above ${RUSHED_WPM} wpm:`);
  for (const m of rushed) console.log(`  ${m.id}  ${m.wpm} wpm  (${m.audioDur}s in ${m.sceneDur}s)`);
}
if (bad.length) {
  console.log(`\n${bad.length} cue(s) overrun even allowing a ${BRIDGE_TOLERANCE}s bridge — these need a scene extension:`);
  for (const m of bad) console.log(`  ${m.id}  ${m.audioDur}s in ${m.sceneDur}s  (${m.wpm} wpm)`);
  process.exit(2);
}
console.log("\nevery cue sits inside its scene, allowing documented bridges");