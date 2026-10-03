/**
 * Generates narration for the 90-second cut from docs/FILM-90.json.
 * Reuses the CLI resolution and levelling approach from tools/build-vo.mjs.
 *
 * Run: node tools/build-vo90.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => resolve(ROOT, ...s);
const VO_DIR = p("audio", "vo90");
mkdirSync(VO_DIR, { recursive: true });

const film = JSON.parse(readFileSync(p("docs", "FILM-90.json"), "utf8"));
const VOICE = "bm_george";
const TARGET_WPM = 140;
const MIN_SPEED = 0.8;
const MAX_SPEED = 1.4;
const FILL = 0.86; // share of the scene the line occupies

const PINNED = JSON.parse(readFileSync(p("package.json"), "utf8")).scripts.check.match(/hyperframes@([\d.]+)/)[1];

function resolveCli() {
  const roots = [
    resolve(process.env.LOCALAPPDATA ?? "", "npm-cache", "_npx"),
    resolve(process.env.APPDATA ?? "", "npm-cache", "_npx"),
  ].filter((r) => existsSync(r));
  for (const root of roots) {
    let entries;
    try { entries = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()); } catch { continue; }
    for (const e of entries) {
      const dir = resolve(root, e.name, "node_modules", "hyperframes");
      const pkg = resolve(dir, "package.json");
      if (!existsSync(pkg)) continue;
      try {
        const j = JSON.parse(readFileSync(pkg, "utf8"));
        if (j.version !== PINNED) continue;
        const bin = resolve(dir, typeof j.bin === "string" ? j.bin : j.bin?.hyperframes);
        if (existsSync(bin)) return bin;
      } catch { /* skip */ }
    }
  }
  return null;
}
const CLI = resolveCli();
if (!CLI) { console.error("cannot locate hyperframes CLI"); process.exit(1); }

const tmp = p("audio", "_tts90.txt");
const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

function tts(text, out, speed) {
  writeFileSync(tmp, text, "utf8");
  const o = execFileSync(process.execPath,
    [CLI, "tts", "--text-file", tmp, "-v", VOICE, "-s", String(speed), "--json", "-o", out],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 });
  return JSON.parse(o.trim().split("\n").filter((l) => l.trim().startsWith("{")).pop());
}

const manifestPath = p("audio", "vo90-manifest.json");
const prior = new Map();
if (existsSync(manifestPath)) {
  try { for (const c of JSON.parse(readFileSync(manifestPath, "utf8")).cues) prior.set(c.id, c); } catch {}
}

let clock = 0;
const out = [];
let built = 0, reused = 0;

for (const s of film.scenes) {
  s.start = clock;
  clock += s.dur;
  if (!s.vo) { out.push({ id: s.id, start: s.start, sceneDur: s.dur, silent: true }); continue; }

  const file = `audio/vo90/${s.id}.wav`;
  const abs = p(file);
  const prev = prior.get(s.id);

  if (prev && prev.text === s.vo && existsSync(abs)) {
    out.push(prev); reused++;
    console.log(`  ${s.id}  reused  ${prev.audioDur}s  ${prev.wpm} wpm`);
    continue;
  }

  const w = words(s.vo);
  const aim = Math.min(w / (TARGET_WPM / 60), s.dur * FILL);
  let r = tts(s.vo, abs, 1.0);
  let d = r.durationSeconds;
  built++;
  const want = (natural) => natural / aim;
  let speed = Math.min(MAX_SPEED, Math.max(MIN_SPEED, want(d)));
  if (speed > 1.15) speed = want(d);
  if (Math.abs(speed - 1) > 0.01) { r = tts(s.vo, abs, Number(speed.toFixed(3))); d = r.durationSeconds; }

  const rec = {
    id: s.id, file, text: s.vo, start: s.start, sceneDur: s.dur,
    audioDur: Number(d.toFixed(3)), speed: r.speed,
    wpm: Number(((w / d) * 60).toFixed(1)),
    fits: d <= s.dur,
  };
  out.push(rec);
  console.log(`  ${s.id}  built   ${d.toFixed(2)}s  ${Math.round(rec.wpm)} wpm${d > s.dur ? "  OVERRUN" : ""}`);
}

out.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(manifestPath, JSON.stringify({ voice: VOICE, cues: out }, null, 2), "utf8");

const spoken = out.filter((c) => !c.silent);
const bad = spoken.filter((c) => !c.fits);
const pw = spoken.reduce((n, c) => n + words(c.text), 0);
console.log(`\n${spoken.length} cues · ${built} built · ${reused} reused · ${pw} words · ${(pw / 90 * 60).toFixed(0)} wpm`);
console.log(`narration ${(pw / (TARGET_WPM / 60)).toFixed(1)}s of 90s`);
if (bad.length) { console.error(`OVERRUN: ${bad.map((c) => c.id).join(", ")}`); process.exit(2); }
console.log("all cues fit");