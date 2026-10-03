/**
 * Generates compositions/acts/act-NN.html for all 11 movements.
 *
 * One scene, one treatment. Every scene in the screenplay gets a real visual
 * treatment — the film's digital and system worlds are built here, and the
 * live-world scenes get a clean plate stand-in awaiting footage.
 *
 * Generate: node tools/build-acts.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => resolve(ROOT, ...s);
mkdirSync(p("compositions", "acts"), { recursive: true });

const master = readFileSync(p("docs", "MASTER-SCRIPT.md"), "utf8");
const voManifest = JSON.parse(readFileSync(p("audio", "vo-manifest.json"), "utf8"));
const voById = new Map(voManifest.cues.map((c) => [c.id, c]));

// ── parse ───────────────────────────────────────────────────────────────────
const stripMd = (s) =>
  s
    .replace(/^[-*_]{3,}\s*$/gm, " ")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

const headings = [...master.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => ({
  level: m[1].length, text: m[2].trim(), index: m.index,
}));

const fieldOf = (b, n) => {
  const m = b.match(new RegExp(`\\*\\*${n}:\\*\\*\\s*([^\\n]*)`));
  return m ? stripMd(m[1]) : "";
};
const blockFieldOf = (b, n) => {
  let m = b.match(new RegExp(`\\*\\*${n}:\\*\\*\\s*([\\s\\S]*?)\\n\\s*\\*\\*[A-Z][A-Z \\-/]*:\\*\\*`));
  if (m) return stripMd(m[1]);
  m = b.match(new RegExp(`\\*\\*${n}:\\*\\*\\s*([\\s\\S]*)$`));
  return m ? stripMd(m[1]) : "";
};

const scenes = [];
for (let i = 0; i < headings.length; i++) {
  const h = headings[i];
  const m = h.text.match(/^(S\d+)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+):(\d\d)[^\d]+?(\d+)s$/);
  if (!m) continue;
  const end = headings[i + 1]?.index ?? master.length;
  const block = master.slice(h.index, end);
  const world = fieldOf(block, "WORLD");
  scenes.push({
    id: m[1],
    start: Number(m[2]) * 60 + Number(m[3]),
    dur: Number(m[6]),
    world,
    location: fieldOf(block, "LOCATION"),
    track: world.includes("REAL") ? "LIVE" : "BUILD",
    diagram: fieldOf(block, "DIAGRAM"),
    ui: blockFieldOf(block, "UI"),
    onScreen: blockFieldOf(block, "ON-SCREEN TEXT"),
    camera: fieldOf(block, "CAMERA"),
    vo: voById.get(m[1]) ?? null,
  });
}

const actBounds = [];
for (const h of headings) {
  if (!/^(ACT \d+|FINAL)/.test(h.text)) continue;
  const end = headings.find((o) => o.index > h.index && /^(ACT \d+|FINAL)/.test(o.text));
  actBounds.push({ title: h.text, start: h.index, end: end ? end.index : master.length });
}

// ── act 1 and act 10 grade warm; act 2-3 grade flat; act 4+ clean ────────────
function groundFor(s, actIndex) {
  if (actIndex === 0) return "ground-golden";
  if (actIndex === 1 || actIndex === 2) return s.track === "BUILD" ? "ground-void" : "ground-flat";
  if (actIndex >= 9) return "ground-golden";
  return s.track === "LIVE" ? "ground-golden" : s.world.includes("CLEAN") ? "ground-clean" : "ground-void";
}

// ── treatments ──────────────────────────────────────────────────────────────
const RHYME = new Set(["S01", "S07", "S58"]);

const GROUND = {
  golden: `<div class="ground ground-golden"></div>`,
  flat: `<div class="ground ground-flat"></div>`,
  void: `<div class="ground ground-void"></div>`,
  clean: `<div class="ground ground-clean"></div>`,
};

const RING = ["ACADEMIC", "STUDENT", "ADMINISTRATION", "FINANCE", "PEOPLE", "CAMPUS", "CAREER"];

/** Diagram 2 — centralised ERP. Three states share node ids so S27 animates into S35. */
function erpDiagram(state) {
  if (state === "core") {
    return `<div class="dia-wrap">
      <div class="dia-title">One core</div>
      <div class="dia-stage" style="width:900px;height:900px">
        <div style="position:absolute;left:330px;top:330px"><div class="dia-core" data-node="core">ONE<br/>RECORD</div></div>
      </div>
    </div>`;
  }
  const nodes = RING.map((label, i) => {
    const a = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
    const x = 450 + Math.cos(a) * 340 - 90;
    const y = 430 + Math.sin(a) * 340 - 26;
    const dim = state === "consolidated";
    return `<div class="dia-node${dim ? " is-on" : ""}" data-node="${label.toLowerCase()}"
      style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:180px;height:52px;opacity:${dim ? 1 : 0.001}">${label}</div>`;
  }).join("");
  return `<div class="dia-wrap">
    <div class="dia-title">${state === "consolidated" ? "Every module. One record." : "One core, eight modules"}</div>
    <div class="dia-stage" style="width:900px;height:900px">
      <div style="position:absolute;left:330px;top:310px"><div class="dia-core" data-node="core">ONE<br/>RECORD</div></div>
      ${nodes}
    </div>
    <div class="dia-intel" data-node="intel">INTELLIGENCE OVER ALL OF IT</div>
  </div>`;
}

function abstractSeed(density = 6) {
  const nodes = Array.from({ length: density }, (_, i) => {
    const x = ((i * 271) % 1700) + 110;
    const y = ((i * 419) % 820) + 130;
    const lit = i % 3 === 0 ? " is-lit" : "";
    return `<div class="abs-node${lit}" style="left:${x}px;top:${y}px"></div>`;
  }).join("");
  return `<div class="abs-field">
    <div class="abs-glow" style="width:760px;height:760px;left:280px;top:120px;background:#1d4ed8;opacity:.16"></div>
    <div class="abs-glow" style="width:520px;height:520px;left:1120px;top:520px;background:#0ea5e9;opacity:.11"></div>
    <div class="abs-rule" style="top:360px"></div>
    <div class="abs-rule" style="top:720px"></div>
    ${nodes}
  </div>`;
}

/** Act 2 — nine wrong systems. Each has its own accent, type and chrome. */
function chaosGrid() {
  const wins = [
    ["#f5f5f4", "#78716c", "chaos-t", "ATTENDANCE PORTAL", "78%", "#a8a29e"],
    ["#fffbeb", "#b45309", "chaos-m", "ASSIGNMENT TRACKER", "12", "#d6d3d1"],
    ["#f0f9ff", "#0369a1", "chaos-s", "DEPARTMENT SHEET", "—", "#bae6fd"],
    ["#fef2f2", "#b91c1c", "chaos-t", "NOTICE BOARD", "URGENT", "#fecaca"],
    ["#f0fdf4", "#166534", "chaos-m", "ACCOUNTS LEDGER", "₹ 4,20,000", "#bbf7d0"],
    ["#fff7ed", "#c2410c", "chaos-s", "HOSTEL BOARD", "68", "#fed7aa"],
    ["#faf5ff", "#7c3aed", "chaos-t", "EXAM CELL", "3 DAYS", "#e9d5ff"],
    ["#f8fafc", "#475569", "chaos-m", "PLACEMENT", "142", "#e2e8f0"],
    ["#fefce8", "#a16207", "chaos-s", "TRANSPORT", "ROUTE 4", "#fef08a"],
  ];
  const cells = wins
    .map(
      ([bg, accent, fam, title, big, line]) => `
    <div class="chaos-win" style="background:${bg};border:1px solid ${line}">
      <div class="chaos-title" style="color:${accent}">${title}</div>
      <div class="chaos-line" style="background:${accent};opacity:.28;width:70%"></div>
      <div class="chaos-amount ${fam}" style="color:${accent}">${big}</div>
      <div class="chaos-line" style="background:${accent};opacity:.18"></div>
    </div>`
    )
    .join("");
  return `<div class="chaos-grid" style="grid-template-columns:repeat(3,1fr)">${cells}</div>`;
}

function uiCard(title, rows, opts = {}) {
  const chips = (opts.chips ?? [])
    .map((c) => `<span class="ui-chip ${c.kind ?? ""}">${c.t}</span>`)
    .join("");
  const stat = opts.stat
    ? `<div class="ui-stat">${opts.stat}</div><div class="ui-stat-note">${opts.statNote ?? ""}</div>`
    : "";
  const cite = opts.cite
    ? `<div class="ui-cite"><b>Source</b> — ${opts.cite}</div>`
    : "";
  const compc = opts.compc ? `<div class="ui-compc-flag">production comp · _compc</div>` : "";
  return `<div class="ui-card" ${opts.id ? `id="${opts.id}"` : ""}>
    <div class="ui-bar">
      <span class="ui-dot is-on"></span><span class="ui-dot"></span><span class="ui-dot"></span>
      <span class="ui-bar-title">${title}</span>
    </div>
    <div class="ui-body">
      ${stat}
      ${rows
        .map(
          ([k, v, kind]) =>
            `<div class="ui-row"><span>${k}</span><b class="${kind ? "ui-chip " + kind : ""}">${v}</b></div>`
        )
        .join("")}
      ${chips ? `<div style="display:flex;gap:10px;flex-wrap:wrap">${chips}</div>` : ""}
      ${cite}${compc}
    </div>
  </div>`;
}

/** S22 — the hinge of the film. */
function hingeCard() {
  return `<div class="quote-stage" data-part="a">
    <div class="quote-text">A college is not<br/>one department.</div>
    <div class="quote-rule"></div>
  </div>`;
}

function closingCard() {
  return `<div class="card-close">
    <div class="card-line" data-part="line1">Run the institution.</div>
    <div class="card-line" data-part="line2">Not the paperwork.</div>
  </div>`;
}

/** The mark builds from its own parts. It never fades in. */
function logoResolve() {
  const tiles = [
    [12, 12, "var(--primary)"], [88, 12, "var(--accent)"],
    [12, 88, "var(--primary-dark)"], [88, 88, "var(--info)"],
  ];
  return `<div class="card-close">
    <div class="logo-mark">
      ${tiles
        .map(
          ([x, y, c], i) =>
            `<div class="logo-tile" data-part="tile${i}" style="left:${x}px;top:${y}px;background:${c}"></div>`
        )
        .join("")}
      <div class="logo-word" data-part="word" style="position:absolute;left:0;top:76px;width:220px;text-align:center;font-size:40px;opacity:0">L</div>
    </div>
    <div class="logo-word" data-part="mark">Learnix</div>
    <div class="logo-sub" data-part="sub">The digital operating system for modern colleges.</div>
  </div>`;
}

/** Per-scene treatment dispatch. */
function treatment(s) {
  const d = s.id;
  switch (d) {
    case "S16": return { kind: "chaos", body: chaosGrid(), ground: "flat" };
    case "S17": return { kind: "abs", body: abstractSeed(8), ground: "void" };
    case "S18":
    case "S19":
      return { kind: "abs", body: abstractSeed(9), ground: "void" };
    case "S20":
      return { kind: "abs", body: abstractSeed(7), ground: "void" };
    case "S21": return { kind: "abs", body: abstractSeed(4), ground: "void" };
    case "S22": return { kind: "card", body: hingeCard(), ground: "void" };
    case "S23": return { kind: "abs", body: abstractSeed(5), ground: "void" };
    case "S24": return { kind: "abs", body: abstractSeed(6), ground: "void" };
    case "S25": return { kind: "dia", body: erpDiagram("core"), ground: "void" };
    case "S26": return { kind: "abs", body: abstractSeed(3), ground: "void" };
    case "S27": return { kind: "dia", body: erpDiagram("full"), ground: "void" };
    case "S28":
      return { kind: "ui", ground: "clean",
        body: uiCard("Teacher · Attendance", [["Section B — Period 3", "87%", "is-ok"], ["Section A — Period 3", "91%", "is-ok"]]) };
    case "S29":
      return { kind: "ui", ground: "clean",
        body: uiCard("Student · Record", [["Roll number", "21CS014"], ["Semester", "6", "is-ok"], ["Credits", "148", "is-ok"]]) };
    case "S30":
      return { kind: "ui", ground: "clean",
        body: uiCard("Approvals", [["Leave request — 12 Oct", "Approved", "is-ok"], ["Budget revision — Q3", "In review", "is-warn"]],
          { chips: [{ t: "visible to 3 roles" }] }) };
    case "S31":
      return { kind: "ui", ground: "clean",
        body: uiCard("Accounts", [["Fee receipt — 21CS014", "Paid", "is-ok"], ["Scholarship credit", "Applied", "is-ok"], ["Outstanding", "₹ 0", "is-ok"]],
          { stat: "1", statNote: "record — nothing to reconcile" }) };
    case "S32":
      return { kind: "ui", ground: "clean",
        body: uiCard("Faculty · Leave", [["Casual leave — 4 days", "Approved", "is-ok"], ["Policy", "Applied"]], { chips: [{ t: "audit trail on" }] }) };
    case "S33":
      return { kind: "ui", ground: "clean",
        body: `<div class="ui-stage">
          ${uiCard("Hostel", [["Block C — 214", "Occupied", "is-ok"]])}
          ${uiCard("Library", [["Issue history", "1 record", "is-ok"]])}
        </div>` };
    case "S34":
      return { kind: "ui", ground: "clean",
        body: uiCard("Placement", [["Drive — 21CS014", "Offer", "is-ok"], ["Outcome written back", "Done", "is-ok"]]) };
    case "S35": return { kind: "dia", body: erpDiagram("consolidated"), ground: "void" };
    case "S36":
      return { kind: "ui", ground: "clean",
        body: uiCard("Learnix — Student", [["Today", "3 items"], ["Next class", "11:30"], ["Due", "1 assignment", "is-warn"]],
          { stat: "1", statNote: "screen. everything the day needs." }) };
    case "S37":
      return { kind: "ui", ground: "clean",
        body: `<div class="ui-stage">
          ${uiCard("Student", [["Attendance", "Present", "is-ok"]])}
          ${uiCard("Department", [["Section B — P3", "87%", "is-ok"]])}
          ${uiCard("Management", [["Attendance today", "91%", "is-ok"]])}
        </div>` };
    case "S38":
      return { kind: "ui", ground: "clean",
        body: uiCard("Assignment · Lifecycle", [["Set once", "Done", "is-ok"], ["Delivered", "74 students", "is-ok"], ["Marked in one place", "Done", "is-ok"]]) };
    case "S39":
      return { kind: "ui", ground: "clean",
        body: uiCard("Examination", [["Exam cell", "Script", "is-ok"], ["Faculty", "Paper", "is-ok"], ["Student", "Result", "is-ok"], ["Admin", "Seat", "is-ok"]],
          { stat: "4", statNote: "audiences · one truth" }) };
    case "S40":
      return { kind: "ui", ground: "clean",
        body: uiCard("Faculty · Today", [["Attendance", "Open"], ["Assignments", "6"], ["Leave", "1", "is-ok"], ["Reports", "1"]]) };
    case "S42":
      return { kind: "ui", ground: "clean",
        body: uiCard("Management", [["Enrolment", "4,812"], ["Attendance today", "91%", "is-ok"], ["Fees outstanding", "₹ 3.1 L", "is-warn"]],
          { stat: "4,812", statNote: "students · current to this morning" }) };
    case "S43":
      return { kind: "ui", ground: "clean",
        body: uiCard("Drill-down", [["College", "4,812"], ["→ Department", "6"], ["→ Course", "21"], ["→ Class", "58"], ["→ Student", "1", "is-ok"]],
          { compc: true }) };
    case "S44":
      return { kind: "ui", ground: "clean",
        body: uiCard("Access", [["Department head", "Department only", "is-ok"], ["Principal", "Whole college", "is-ok"], ["Student", "Own record", "is-ok"], ["Unauthorised", "Blocked", "is-bad"]],
          { compc: true }) };
    case "S45":
      return { kind: "ui", ground: "clean",
        body: uiCard("Alerts", [["Fee reminders", "128", "is-warn"], ["Pending approvals", "14", "is-warn"], ["Attendance exceptions", "0", "is-ok"]]) };
    case "S46":
      return { kind: "ui", ground: "clean",
        body: uiCard("Analytics", [["Attendance trend", "−4 weeks", "is-bad"], ["Threshold", "Crossed", "is-bad"]],
          { chips: [{ t: "trend detected" }, { t: "threshold crossed" }], compc: true }) };
    case "S47":
      return { kind: "ui", ground: "clean",
        body: uiCard("Policy", [["Affects", "38 students"], ["Policy applied", "Attendance < 75%", "is-ok"], ["Actioned by", "Dept. head"], ["Recorded", "Yes", "is-ok"]],
          { chips: [{ t: "audit trail on" }] }) };
    case "S48":
      return { kind: "ui", ground: "clean",
        body: uiCard("Ask the institution", [["Question", "Attendance below 75% in CS-4"], ["Answer", "38 students · 4 sections"]],
          { cite: "attendance.b5 · section b5_attendance · as of 07:40", compc: true }) };
    case "S49":
      return { kind: "ui", ground: "clean",
        body: uiCard("Assistant · Your classes", [["Scope", "CS-4 only", "is-ok"], ["Would have taken", "~1 hour", "is-warn"]],
          { cite: "scoped to your role · sections b5_attendance", compc: true }) };
    case "S50":
      return { kind: "ui", ground: "clean",
        body: uiCard("Assistant · Student", [["Scope", "Own record", "is-ok"], ["Your attendance", "87%", "is-ok"]],
          { cite: "same intelligence · your view only", compc: true }) };
    case "S51":
    case "S52":
    case "S53": return { kind: "abs", body: abstractSeed(12), ground: "void" };
    case "S59": return { kind: "card", body: closingCard(), ground: "clean" };
    case "S60": return { kind: "card", body: logoResolve(), ground: "clean" };
    case "S61": return { kind: "card", ground: "clean", body: "" };
    default: return null;
  }
}

// ── emit ────────────────────────────────────────────────────────────────────
const ACT_FILES = [];
let sceneCount = 0;

for (let a = 0; a < actBounds.length; a++) {
  const act = actBounds[a];
  const body = master.slice(act.start, act.end);
  const list = scenes.filter((s) => body.includes(`### ${s.id} `));
  if (!list.length) continue;

  const num = String(a + 1).padStart(2, "0");
  const compId = `act-${num}`;
  const actStart = list[0].start;
  const actEnd = list.at(-1).start + list.at(-1).dur;

  const clips = list
    .map((s) => {
      sceneCount++;
      const local = Number((s.start - actStart).toFixed(3));
      const t = treatment(s);

      if (!t) {
        // live-world plate awaiting footage
        const g = GROUND[groundFor(s, a) === "ground-golden" ? "golden" : groundFor(s, a) === "ground-flat" ? "flat" : groundFor(s, a) === "ground-clean" ? "clean" : "void"];
        return `    <div id="${s.id.toLowerCase()}" class="clip scene-clip" data-start="${local}" data-duration="${s.dur}" data-track-index="0">
      ${g}
      <div class="plate-rule" style="color:var(--text)"></div>
      <div class="plate-mark" style="color:var(--text)">
        <span class="plate-id">${s.id}</span>
        <span class="plate-note">${s.track === "LIVE" ? "awaiting plate" : "abstract"} · ${s.location}</span>
      </div>
      ${RHYME.has(s.id) ? '<div class="plate-rhyme"></div>' : ""}
    </div>`;
      }

      const g = GROUND[t.ground] ?? GROUND.void;
      const extras =
        s.id === "S22" ? ' data-split="hinge"'
        : s.id === "S59" ? ' data-split="close"'
        : s.id === "S60" ? ' data-split="logo"'
        : "";
      return `    <div id="${s.id.toLowerCase()}" class="clip scene-clip" data-start="${local}" data-duration="${s.dur}" data-track-index="0"${extras}>
      ${g}
      ${t.body}
    </div>`;
    })
    .join("\n");

  // ── animation. Every tween is POSITIONED at its scene's local start — an
  // unpositioned tween lands at t=0, which fires the whole act at once.
  const timeline = [];
  for (const s of list) {
    const local = Number((s.start - actStart).toFixed(3));
    const t = treatment(s);
    if (!t) continue; // plate: hold, nothing to animate
    const sel = `#${s.id.toLowerCase()}`;

    if (s.id === "S27") {
      timeline.push(
        `  tl.to("${sel} .dia-node", {opacity: 1, color: "var(--on-void)", borderColor: "var(--primary)", background: "#16264a", duration: 0.5, stagger: 1.0, ease: "none"}, ${local});`,
        `  tl.fromTo("${sel} .dia-intel", {opacity: 0}, {opacity: 1, duration: 0.8}, ${local + 8});`
      );
    } else if (s.id === "S35") {
      timeline.push(`  tl.fromTo("${sel} .dia-intel", {opacity: 0}, {opacity: 1, duration: 1.2}, ${local});`);
    } else if (s.id === "S22") {
      timeline.push(`  tl.to("${sel} [data-part='a']", {opacity: 0, duration: 0.25}, ${local + 2.6});`);
    } else if (s.id === "S59") {
      timeline.push(`  tl.fromTo("${sel} [data-part='line2']", {opacity: 0}, {opacity: 1, duration: 0.7}, ${local + 0.8});`);
    } else if (s.id === "S60") {
      timeline.push(
        `  tl.fromTo("${sel} .logo-tile", {opacity: 0, scale: 0.6}, {opacity: 1, scale: 1, duration: 0.4, stagger: 0.12, ease: "back.out(2)"}, ${local});`,
        `  tl.fromTo("${sel} [data-part='mark']", {opacity: 0, y: 14}, {opacity: 1, y: 0, duration: 0.6}, ${local + 0.6});`,
        `  tl.fromTo("${sel} [data-part='sub']", {opacity: 0}, {opacity: 1, duration: 0.6}, ${local + 1.1});`
      );
    } else {
      const fadeTargets =
        `${sel} .ui-card, ${sel} .dia-wrap, ${sel} .quote-stage, ${sel} .card-close, ` +
        `${sel} .chaos-grid, ${sel} .abs-field`;
      timeline.push(
        `  tl.fromTo("${fadeTargets}", {opacity: 0}, {opacity: 1, duration: 0.6, ease: "power2.out"}, ${local});`
      );
      // Abstract fields breathe very slowly. The film is never busy.
      if (s.world.includes("SYSTEM") || s.world.includes("ABSTRACT")) {
        timeline.push(
          `  tl.to("${sel} .abs-glow", {scale: 1.14, opacity: 0.62, transformOrigin: "50% 50%",` +
            ` duration: ${Math.max(2, s.dur * 0.55).toFixed(2)}, ease: "sine.inOut"}, ${local});`
        );
      }
    }
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Learnix Master Film — ${act.title}</title>
<link rel="stylesheet" href="assets/tokens.css" />
<link rel="stylesheet" href="assets/film.css" />
<style>
  /* Sub-composition roots are styled by id: rules get scoped to
     [data-composition-id], so a root class would become a descendant selector
     that cannot match the root itself. */
  #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; container-type: size; }
  #root .clip { opacity: 1; }
</style>
</head>
<body>
<div id="root" data-composition-id="${compId}" data-start="0" data-duration="${(actEnd - actStart).toFixed(3)}" data-width="1920" data-height="1080">
${clips}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
${timeline.join("\n")}
  window.__timelines["${compId}"] = tl;
</script>
</body>
</html>`;

  const file = `compositions/acts/act-${num}.html`;
  writeFileSync(p(file), html, "utf8");
  ACT_FILES.push({ compId, file, act: act.title, start: actStart, dur: actEnd - actStart, scenes: list.length });
  console.log(`  act-${num}.html  ${act.title.padEnd(26)} ${list.length} scenes  ${(actEnd - actStart).toFixed(0)}s`);
}

writeFileSync(
  p("compositions", "acts", "index.json"),
  JSON.stringify({ acts: ACT_FILES }, null, 2),
  "utf8"
);
console.log(`\n${ACT_FILES.length} act compositions · ${sceneCount} scenes`);