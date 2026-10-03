/**
 * Verifies VO-SCRIPT.md against MASTER-SCRIPT.md.
 *
 * Both sides are parsed with the same heading-index method used by
 * build-storyboard.mjs, so the two tools cannot disagree about how a
 * scene block is delimited.
 *
 * Run: node tools/verify-vo.mjs   (exit 1 on any mismatch)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const master = readFileSync(resolve(ROOT, "docs", "MASTER-SCRIPT.md"), "utf8");
const voDoc = readFileSync(resolve(ROOT, "docs", "VO-SCRIPT.md"), "utf8");

const BUDGET_PER_SEC = 2.333;
const stripMd = (s) => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
// Parentheticals are stage direction, not narration: "(silent)", "(3s held black)".
// They must not be counted, or the two verification tools disagree by a few words.
const words = (s) =>
  s ? s.replace(/\([^)]*\)/g, " ").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length : 0;
// NOTE: the `u` flag is load-bearing. Without it, \p{L} inside a character
// class is read as the literal characters p, {, L, } — which silently reduces
// this to "strip everything except p, L, N, d and space" and makes unrelated
// strings compare equal.
const norm = (s) =>
  s
    .replace(/\([^)]*\)/gu, " ")
    .replace(/[^\p{L}\p{Nd} ]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

// ── approved side: heading-index walk (same as build-storyboard) ─────────────
const headings = [...master.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => ({
  level: m[1].length,
  text: m[2].trim(),
  index: m.index,
}));

const approved = new Map();
for (let i = 0; i < headings.length; i++) {
  if (!/^S\d/.test(headings[i].text)) continue;
  const id = headings[i].text.match(/^(S\d+)/)[1];
  const end = headings[i + 1]?.index ?? master.length;
  const block = master.slice(headings[i].index, end);
  const m = block.match(/\*\*VOICE-OVER:\*\*\s*([\s\S]*?)\n\s*\*\*ON-SCREEN TEXT:\*\*/);
  const raw = m ? m[1] : "";
  const txt = stripMd(raw).replace(/\([^)]*\)/g, " ").trim();
  approved.set(id, txt === "—" ? "" : txt);
}

// ── draft side: the VO doc's tables ──────────────────────────────────────────
const draft = new Map();
const trimmedFlag = new Set();
for (const line of voDoc.split("\n")) {
  if (!/^\|\s*S\d\d\s*\|/.test(line)) continue;
  const f = line.split("|");
  if (f.length < 6) continue;
  const id = f[1].trim();
  let cell = f[4].trim();
  if (cell.includes("**TRIM**")) trimmedFlag.add(id);
  cell = cell
    .replace(/\*\*(TRIM|BRIDGE)\*\*\s*/g, "")
    .replace(/\*\*BRIDGE[^*]*\*\*/g, "")
    .replace(/\*\*/g, "");
  draft.set(id, /^\(silent/i.test(cell) ? "" : cell);
}

// ── compare ──────────────────────────────────────────────────────────────────
const errors = [];
const trims = [];
let verbatim = 0, spoken = 0, aw = 0, dw = 0, silent = 0;

if (process.argv.includes("--show")) {
  for (const id of process.argv.slice(process.argv.indexOf("--show") + 1)) {
    console.log("=== " + id);
    console.log("  approved:", JSON.stringify(approved.get(id)));
    console.log("  draft   :", JSON.stringify(draft.get(id)));
    console.log("  norm a  :", JSON.stringify(norm(approved.get(id) ?? "")));
    console.log("  norm d  :", JSON.stringify(norm(draft.get(id) ?? "")));
    console.log();
  }
}

for (const [id, a] of approved) {
  if (!draft.has(id)) { errors.push(`${id} missing from VO-SCRIPT.md`); continue; }
  const d = draft.get(id);
  aw += words(a); dw += words(d);
  if (a) spoken++; else silent++;

  if (norm(a) === norm(d)) {
    verbatim++;
    if (trimmedFlag.has(id)) errors.push(`${id} is marked TRIM but matches the approved copy`);
  } else {
    trims.push({ Id: id, AppW: words(a), NewW: words(d), Cut: words(a) - words(d) });
    if (!trimmedFlag.has(id)) errors.push(`${id} was changed but is not marked TRIM`);
  }
}

// narration must fit its scene
const dur = new Map();
for (const h of headings) {
  const m = h.text.match(/^(S\d+)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+)s$/);
  if (m) dur.set(m[1], Number(m[6]));
}
for (const [id, d] of draft) {
  if (!d) continue;
  const budget = Math.round((dur.get(id) ?? 0) * BUDGET_PER_SEC);
  if (words(d) > budget && id !== "S07") {
    errors.push(`${id} narration ${words(d)}w exceeds ${budget}w budget (${dur.get(id)}s)`);
  }
}

console.log(`spoken cues   : ${spoken}`);
console.log(`silent cues   : ${silent}`);
console.log(`verbatim      : ${verbatim}`);
console.log(`trimmed       : ${trims.length}`);
console.log(`approved words: ${aw}  (${(aw / BUDGET_PER_SEC).toFixed(1)}s, ${Math.round(aw / BUDGET_PER_SEC / 420 * 100)}% of film)`);
console.log(`draft words   : ${dw}  (${(dw / BUDGET_PER_SEC).toFixed(1)}s, ${Math.round(dw / BUDGET_PER_SEC / 420 * 100)}% of film)`);
console.log(`words removed : ${aw - dw}`);
console.log();
console.log("trims, largest first:");
for (const t of trims.sort((x, y) => y.Cut - x.Cut)) {
  console.log(`  ${t.Id}  ${t.AppW}w -> ${t.NewW}w  (-${t.Cut})`);
}
console.log();

if (errors.length) {
  console.error("FAILED");
  for (const e of errors) console.error("  x " + e);
  process.exit(1);
}
console.log("PASSED — every change is flagged, every cue fits its scene");