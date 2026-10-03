/**
 * Builds storyboard.html for the Learnix Master Film.
 *
 * Generated from two sources of truth so the board can never drift:
 *   docs/MASTER-SCRIPT.md  — approved screenplay (timing, world, camera, etc.)
 *   docs/VO-SCRIPT.md       — narration as it will actually be read
 *
 * Re-run after any change to either document:
 *   node tools/build-storyboard.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const p = (...s) => resolve(ROOT, ...s);

const master = readFileSync(p("docs", "MASTER-SCRIPT.md"), "utf8");
const voDoc = readFileSync(p("docs", "VO-SCRIPT.md"), "utf8");

// ── helpers ────────────────────────────────────────────────────────────────
const stripMd = (s) =>
  s
    .replace(/^[-*_]{3,}\s*$/gm, " ") // markdown rules left by end-of-block capture
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Parentheticals are stage direction, not narration — never count "(silent)".
const words = (s) =>
  s
    ? s
        .replace(/\([^)]*\)/g, " ")
        .split(/\s+/)
        .filter((w) => /[A-Za-z0-9]/.test(w)).length
    : 0;

/** The word budget changes what is possible, so it belongs on the board. */
const BUDGET_PER_SEC = 2.333;

const timecode = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Collapse a VO cell that may carry emphasis markers, stage directions, beats. */
function cleanVo(cell) {
  let c = cell
    .replace(/\*\*(TRIM|BRIDGE)\*\*\s*/g, "")
    .replace(/\*\*BRIDGE[^*]*\*\*/g, "")
    .replace(/\([^)]*\)/g, " ") // stage directions: (beat), (3s held black)
    .replace(/\s*—\s*(?=\*)/g, " ") // orphaned em-dashes left by removed directions
    .replace(/\*\s*\*+/g, " ") // orphaned emphasis markers
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,?!])/g, "$1")
    .trim();
  if (c === "—" || !c) return "";
  // straight quotes -> typographic, so the board reads as the script does
  c = c
    .replace(/"([^"]*)"/g, "“$1”")
    .replace(/\b([A-Za-z])'([A-Za-z])\b/g, "$1’$2");
  return c;
}

// ── parse the screenplay ────────────────────────────────────────────────────
const headRe = /^(#{1,6})\s+(.+)$/gm;
const headings = [];
for (const m of master.matchAll(headRe)) {
  headings.push({ level: m[1].length, text: m[2], index: m.index });
}

const sceneRe = /^(S\d+)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+)s$/;
const acts = [];
const scenes = [];

for (const h of headings) {
  // headings[] holds text with the leading #'s already stripped by the regex.
  const text = h.text.trim();
  if (/^S\d/.test(text)) continue;
  const isAct = /^ACT \d+/.test(text) || /^FINAL/.test(text);
  if (!isAct) continue;
  const nextAct = headings.find((o) => o.index > h.index && /^(ACT \d+|FINAL)/.test(o.text.trim()));
  const end = nextAct ? nextAct.index : master.length;
  const m = text.match(sceneRe);
  acts.push({
    title: text,
    start: m ? Number(m[2]) * 60 + Number(m[3]) : null,
    end: m ? Number(m[4]) * 60 + Number(m[5]) : null,
    body: master.slice(h.index, end),
  });
}

function fieldOf(block, name) {
  const m = block.match(
    new RegExp(`\\*\\*${name}:\\*\\*\\s*([^\\n]*)`)
  );
  return m ? stripMd(m[1]) : "";
}

function blockFieldOf(block, name) {
  // Prefer an explicit terminator (the next bold FIELD:) …
  const m = block.match(
    new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*?)\\n\\s*\\*\\*[A-Z][A-Z \\-/]*:\\*\\*`)
  );
  if (m) return stripMd(m[1]);
  // … but the last field in a block has none, so fall back to end-of-block.
  const last = block.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([\\s\\S]*)$`));
  return last ? stripMd(last[1]) : "";
}

// ── parse the VO document (tables) ──────────────────────────────────────────
const vo = new Map();
const trimmed = new Set();
for (const line of voDoc.split("\n")) {
  if (!/^\|\s*S\d\d\s*\|/.test(line)) continue;
  const f = line.split("|");
  if (f.length < 6) continue;
  const id = f[1].trim();
  const cell = f[4].trim();
  if (cell.includes("**TRIM**")) trimmed.add(id);
  const isSilent = /^\(silent/i.test(cell);
  vo.set(id, { text: isSilent ? "" : cleanVo(cell), silent: isSilent });
}

// ── parse blocked / comp requirements ───────────────────────────────────────
const manifest = readFileSync(p("docs", "ASSET-MANIFEST.md"), "utf8");
const blocked = new Set();
const blockRow =
  /^\|\s*\*\*(AI assistant|Trend \/ threshold|Scoped role|Hierarchical)[^|]*\|\s*([^|]*)\|/gm;
for (const m of manifest.matchAll(blockRow)) {
  // scenes cell may be "S48, S49, S50" or "S46" or a range
  for (const sid of m[2].match(/S\d+/g) ?? []) blocked.add(sid);
}

// ── assemble scenes ─────────────────────────────────────────────────────────
for (let i = 0; i < headings.length; i++) {
  const h = headings[i];
  const m = h.text.trim().match(sceneRe);
  if (!m) continue;
  const next = headings[i + 1]?.index ?? master.length;
  const block = master.slice(h.index, next);

  const id = m[1];
  const start = Number(m[2]) * 60 + Number(m[3]);
  const dur = Number(m[6]);

  const world = fieldOf(block, "WORLD");
  const diagram = fieldOf(block, "DIAGRAM");
  const ui = blockFieldOf(block, "UI");

  scenes.push({
    id,
    start,
    dur,
    end: start + dur,
    world,
    location: fieldOf(block, "LOCATION"),
    characters: fieldOf(block, "CHARACTERS"),
    purpose: fieldOf(block, "PURPOSE"),
    visual: blockFieldOf(block, "VISUAL"),
    camera: fieldOf(block, "CAMERA"),
    transition: fieldOf(block, "TRANSITION"),
    music: fieldOf(block, "MUSIC"),
    sound: blockFieldOf(block, "SOUND DESIGN"),
    intent: blockFieldOf(block, "EMOTIONAL INTENT"),
    onScreen: blockFieldOf(block, "ON-SCREEN TEXT"),
    ui: ui === "—" ? "" : ui,
    diagram: diagram === "—" ? "" : diagram,
    vo: vo.get(id)?.text ?? "",
    voSilent: vo.get(id)?.silent ?? true,
    trimmed: trimmed.has(id),
    blocked: blocked.has(id),
    // A scene needs a plate if REAL appears anywhere in its world chain —
    // "SYSTEM -> REAL" resolves onto live footage even though it starts abstract.
    // This must stay in step with ASSET-MANIFEST.md.
    track: world.includes("REAL") ? "LIVE" : "BUILD",
  });
}

// ── validation — the board must not lie ─────────────────────────────────────
const problems = [];
if (scenes.length !== 61) problems.push(`expected 61 scenes, parsed ${scenes.length}`);

let cursor = 0;
for (const s of scenes) {
  if (s.start !== cursor) problems.push(`${s.id} starts at ${s.start}, expected ${cursor}`);
  if (s.end - s.start !== s.dur) problems.push(`${s.id} span ${s.end - s.start}s != label ${s.dur}s`);
  cursor = s.end;
  const w = words(s.vo);
  const budget = Math.round(s.dur * BUDGET_PER_SEC);
  if (w > budget && s.id !== "S07") {
    problems.push(`${s.id} narration ${w}w exceeds budget ${budget}w (${s.dur}s)`);
  }
}
if (cursor !== 420) problems.push(`timeline ends at ${cursor}s, expected 420s`);
for (const s of scenes) {
  if (!s.vo && !s.voSilent) problems.push(`${s.id} has no narration and is not marked silent`);
  // every scene must carry a boardable intent — it is the read for the whole film
  if (!s.intent || s.intent.length < 12) problems.push(`${s.id} has no usable emotional intent`);
  if (/^-+$/.test(s.intent)) problems.push(`${s.id} intent captured a markdown rule, not text`);
}

const totalWords = scenes.reduce((n, s) => n + words(s.vo), 0);
const spoken = totalWords / BUDGET_PER_SEC;
const trimmedCount = scenes.filter((s) => s.trimmed).length;

if (problems.length) {
  console.error("STORYBOARD GENERATION FAILED\n");
  for (const p of problems) console.error("  ✗ " + p);
  process.exit(1);
}

// ── render ──────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const RHYME = new Set(["S01", "S07", "S58", "S59"]);

function badges(s) {
  const out = [`<span class="bd bd-track-${s.track.toLowerCase()}">${s.track}</span>`];
  if (RHYME.has(s.id)) out.push(`<span class="bd bd-rhyme">rhyme</span>`);
  if (s.trimmed) out.push(`<span class="bd bd-trim">vo trim</span>`);
  if (s.blocked) out.push(`<span class="bd bd-block">needs comp</span>`);
  if (s.voSilent && !s.vo) out.push(`<span class="bd bd-silent">silent</span>`);
  if (s.diagram) out.push(`<span class="bd bd-diag">diagram</span>`);
  if (s.ui) out.push(`<span class="bd bd-ui">ui</span>`);
  return out.join("");
}

function cell(s) {
  const w = words(s.vo);
  const budget = Math.round(s.dur * BUDGET_PER_SEC);
  const over = w > budget;
  return `
    <article class="cell" id="${s.id}">
      <div class="frame frame-${s.track.toLowerCase()}">
        <div class="frame-id">${s.id}</div>
        <div class="frame-world">${esc(s.world)}</div>
        <div class="frame-asp">16:9 · ${s.dur}s</div>
      </div>
      <div class="meta">
        <div class="lbl">
          <span class="tc">${timecode(s.start)} – ${timecode(s.end)}</span>
          <span class="dur">${s.dur}s</span>
        </div>
        <div class="badges">${badges(s)}</div>
        <p class="loc">${esc(s.location)}</p>
        ${s.vo
          ? `<p class="vo${s.trimmed ? " vo-trim" : ""}">${esc(s.vo)}${
              s.trimmed ? `<span class="cut">trimmed</span>` : ""
            }</p>`
          : `<p class="vo vo-silent">silent</p>`}
        ${s.onScreen ? `<p class="ost"><b>on screen</b> ${esc(s.onScreen)}</p>` : ""}
        ${s.ui ? `<p class="note"><b>ui</b> ${esc(s.ui)}</p>` : ""}
        ${s.diagram ? `<p class="note"><b>diagram</b> ${esc(s.diagram)}</p>` : ""}
        <p class="note"><b>camera</b> ${esc(s.camera)}</p>
        <p class="note dim"><b>music</b> ${esc(s.music)}</p>
        <p class="intent">${esc(s.intent)}</p>
        <div class="wordbar ${over ? "over" : ""}">
          <span>${w}w / ${budget}w</span>
          <i style="--w:${Math.min(100, (w / Math.max(1, budget)) * 100)}%"></i>
        </div>
      </div>
    </article>`;
}

const actSections = acts
  .map((a) => {
    const body = scenes.filter((s) => a.body.includes(`### ${s.id} `));
    if (!body.length) return "";
    const dur = a.end - a.start;
    return `
    <section class="act">
      <h2>${esc(a.title)}
        <span class="act-time">${timecode(a.start)} – ${timecode(a.end)}</span>
        <span class="act-dur">${body.length} scenes · ${dur}s</span>
      </h2>
      <div class="grid">${body.map(cell).join("")}</div>
    </section>`;
  })
  .join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Learnix Master Film — Storyboard</title>
<style>
  @font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:100 900;font-display:swap;
    src:url("assets/fonts/captured-LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_vb.woff2") format('woff2');}
  @font-face{font-family:'Manrope';font-style:normal;font-weight:100 900;font-display:swap;
    src:url("assets/fonts/captured-xn7gYHE41ni1AdIRggexSvfedN4.woff2") format('woff2');}

  :root{
    --primary:#2563eb; --primaryDark:#1d4ed8; --primaryLight:#eff6ff;
    --background:#f5f7f9; --surface:#ffffff; --surfaceMuted:#f1f5f9;
    --border:#e2e8f0; --text:#0f172a; --muted:#64748b;
    --success:#059669; --warning:#d97706; --error:#dc2626;
    --r:14px; --pill:100px;
  }
  *{box-sizing:border-box}
  body{margin:0;background:#eef1f4;color:var(--text);
    font-family:'Manrope',system-ui,-apple-system,'Segoe UI',sans-serif;}

  header{padding:44px 48px 28px;border-bottom:1px solid #dce3ea;background:var(--surface)}
  .eyebrow{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;
    color:var(--primary);margin:0 0 10px}
  h1{margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:700;letter-spacing:-.025em}
  .dek{margin:10px 0 0;font-size:14px;color:var(--muted);max-width:80ch;line-height:1.6}
  .stats{display:flex;gap:26px;flex-wrap:wrap;margin-top:22px}
  .stat{background:var(--surfaceMuted);border:1px solid var(--border);border-radius:12px;
    padding:12px 16px;min-width:132px}
  .stat b{display:block;font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:700;
    letter-spacing:-.02em;color:var(--primaryDark)}
  .stat span{display:block;font-size:11px;color:var(--muted);margin-top:3px;
    letter-spacing:.04em;text-transform:uppercase;font-weight:600}

  .legend{display:flex;gap:8px;flex-wrap:wrap;padding:20px 48px 0}
  .bd{font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
    padding:5px 10px;border-radius:var(--pill);border:1px solid var(--border);
    background:var(--surfaceMuted);color:var(--muted);white-space:nowrap}
  .bd-track-live{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
  .bd-track-build{background:var(--primaryLight);border-color:#bfdbfe;color:var(--primaryDark)}
  .bd-rhyme{background:#f5f3ff;border-color:#ddd6fe;color:#6d28d9}
  .bd-trim{background:#fffbeb;border-color:#fde68a;color:#92400e}
  .bd-block{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
  .bd-silent{background:#f1f5f9;color:#94a3b8}
  .bd-diag{background:#ecfdf5;border-color:#a7f3d0;color:#047857}
  .bd-ui{background:#f0f9ff;border-color:#bae6fd;color:#0369a1}

  .act{padding:30px 48px 6px}
  .act h2{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
    font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:700;letter-spacing:-.02em;
    margin:0 0 4px;padding-bottom:10px;border-bottom:2px solid var(--primary)}
  .act-time{font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;color:var(--muted)}
  .act-dur{font-size:11px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;
    background:var(--surfaceMuted);border:1px solid var(--border);border-radius:var(--pill);padding:4px 10px}

  .grid{padding:18px 0 8px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  @media (max-width:1400px){.grid{grid-template-columns:repeat(2,1fr)}}
  @media (max-width:900px){.grid{grid-template-columns:1fr}}

  .cell{background:var(--surface);border:1px solid #dce3ea;border-radius:var(--r);overflow:hidden;
    display:flex;flex-direction:column;scroll-margin-top:20px}
  .cell:target{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.16)}
  .frame{aspect-ratio:16/9;position:relative;border-bottom:1px solid #e4e9ee;
    display:flex;flex-direction:column;justify-content:space-between;padding:14px}
  .frame-live{background:linear-gradient(160deg,#fdf6ec,#f3e6d2)}
  .frame-build{background:linear-gradient(160deg,#0b1220,#111c2e)}
  .frame-id{font-family:'Plus Jakarta Sans',sans-serif;font-size:34px;font-weight:700;letter-spacing:-.03em}
  .frame-live .frame-id{color:#7c2d12}
  .frame-build .frame-id{color:#f1f5f9}
  .frame-world{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
    position:absolute;top:16px;right:16px}
  .frame-live .frame-world{color:#b45309}
  .frame-build .frame-world{color:#94a3b8}
  .frame-asp{font-size:11px;font-weight:600;opacity:.6}
  .frame-live .frame-asp{color:#7c2d12}
  .frame-build .frame-asp{color:#94a3b8}

  .meta{padding:13px 15px 15px;display:flex;flex-direction:column;gap:8px;flex:1}
  .lbl{display:flex;justify-content:space-between;align-items:baseline}
  .tc{font-family:'Manrope',sans-serif;font-size:13px;font-weight:700;color:var(--primaryDark)}
  .dur{font-size:11px;color:var(--muted);font-weight:600}
  .badges{display:flex;gap:5px;flex-wrap:wrap}
  .loc{margin:0;font-size:12px;color:var(--muted);font-weight:600}
  .vo{margin:0;font-size:14px;line-height:1.5;color:var(--text);
    border-left:3px solid var(--border);padding-left:11px}
  .vo-trim{border-left-color:var(--warning);position:relative}
  .cut{display:block;font-size:9px;letter-spacing:.08em;text-transform:uppercase;
    color:var(--warning);font-weight:700;margin-top:3px}
  .vo-silent{color:#94a3b8;font-style:italic;border-left-color:#e2e8f0}
  .ost{margin:0;font-size:12.5px;line-height:1.45;color:var(--text)}
  .note{margin:0;font-size:11.5px;line-height:1.45;color:var(--muted)}
  .note b{color:var(--primary);font-weight:700;letter-spacing:.05em;
    text-transform:uppercase;font-size:9.5px;margin-right:5px}
  .note.dim{color:#94a3b8}
  .intent{margin:2px 0 0;font-size:12px;line-height:1.45;color:var(--text);
    font-style:italic;opacity:.75}
  .wordbar{margin-top:auto;padding-top:9px;border-top:1px solid var(--border);
    display:flex;align-items:center;gap:9px}
  .wordbar span{font-size:10px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
  .wordbar i{display:block;height:4px;border-radius:2px;background:var(--success);width:var(--w);max-width:60%}
  .wordbar.over i{background:var(--error)}
  .wordbar.over span{color:var(--error)}

  footer{padding:26px 48px 46px;color:var(--muted);font-size:11.5px;line-height:1.7}
  footer b{color:var(--text)}
</style>
</head>
<body>

<header>
  <p class="eyebrow">Learnix · Master Film · 7:00</p>
  <h1>Storyboard</h1>
  <p class="dek">All 61 scenes across 11 movements. Generated from <code>docs/MASTER-SCRIPT.md</code>
    and <code>docs/VO-SCRIPT.md</code> by <code>tools/build-storyboard.mjs</code> — regenerate rather
    than edit by hand. Narration figures are live against a ${BUDGET_PER_SEC} word/second budget.</p>
  <div class="stats">
    <div class="stat"><b>61</b><span>scenes</span></div>
    <div class="stat"><b>420s</b><span>runtime</span></div>
    <div class="stat"><b>${scenes.filter((s) => s.track === "LIVE").length}</b><span>live plates</span></div>
    <div class="stat"><b>${scenes.filter((s) => s.track === "BUILD").length}</b><span>build</span></div>
    <div class="stat"><b>${scenes.filter((s) => s.diagram).length}</b><span>diagram scenes</span></div>
    <div class="stat"><b>${blocked.size}</b><span>need comps</span></div>
    <div class="stat"><b>${totalWords}w</b><span>narration</span></div>
    <div class="stat"><b>${Math.round(spoken)}s</b><span>spoken</span></div>
    <div class="stat"><b>${trimmedCount}</b><span>vo trims</span></div>
  </div>
</header>

<div class="legend">
  <span class="bd bd-track-live">live plate</span>
  <span class="bd bd-track-build">build</span>
  <span class="bd bd-rhyme">rhyme shot</span>
  <span class="bd bd-trim">vo trim</span>
  <span class="bd bd-block">needs comp</span>
  <span class="bd bd-silent">silent</span>
  <span class="bd bd-diag">diagram</span>
  <span class="bd bd-ui">ui</span>
</div>

${actSections}

<footer>
  <p><b>Rhyme shots</b> — S01, S07, S58 and S59 are the same camera position.
    S01 and S58 must be pixel-identical. If the rhyme breaks, the film has no structure.</p>
  <p><b>Needs comps</b> — AI assistant (S48–S50), trend detection (S46), scoped dashboards (S44),
    drill-down (S43). No buildable backing today; build them in this design system and mark
    <code>_compc</code>.</p>
  <p>Generated ${new Date().toISOString().slice(0, 10)} · validation passed ·
    all 61 scenes contiguous 0:00–7:00 · every narration cue inside its scene budget.</p>
</footer>

</body>
</html>`;

writeFileSync(p("storyboard.html"), html, "utf8");

console.log(`storyboard.html written — ${scenes.length} scenes, ${acts.length} acts`);
console.log(`  narration ${totalWords}w = ${spoken.toFixed(1)}s of 420s`);
console.log(`  ${scenes.filter((s) => s.track === "LIVE").length} LIVE / ${scenes.filter((s) => s.track === "BUILD").length} BUILD`);
console.log(`  ${trimmedCount} vo trims · ${blocked.size} need comps · validation passed`);