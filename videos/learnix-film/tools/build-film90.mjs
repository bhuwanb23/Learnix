/**
 * Builds the 90-second cut: index.html
 *
 * Fragmentation to unity, light institutional register. Every scene carries
 * content; the only structural motion lives in the background layer and the
 * transitions, so the product screens stay readable.
 *
 * Two things this learned the hard way:
 *  - every tween must be POSITIONED at its own time; an unpositioned tween
 *    lands at t=0 and fires the whole act at once
 *  - all background motion is deterministic (index-derived, never Math.random)
 *
 * Run: node tools/build-film90.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => resolve(ROOT, ...s);

const film = JSON.parse(readFileSync(p("docs", "FILM-90.json"), "utf8"));
const voFile = p("audio", "vo90-manifest.json");
const vo = existsSync(voFile) ? JSON.parse(readFileSync(voFile, "utf8")).cues : [];
const voById = new Map(vo.map((c) => [c.id, c]));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f2 = (n) => Number(n.toFixed(2));

// deterministic pseudo-placement — index-derived, never Math.random
const px = (i, span, mod) => ((i * 137 + 61) % mod) / mod * span;

// ── background layer ─────────────────────────────────────────────────────────
function bgLayer(seed, opts = {}) {
  const mesh = (film.background?.mesh ?? []).map((m, i) => {
    const dx = ((seed * 29 + i * 53) % 9) - 4;
    const dy = ((seed * 17 + i * 31) % 7) - 3;
    return `<div class="bg-mesh" data-part="mesh${i}"
      style="left:${m.x}%;top:${m.y}%;width:${m.size}px;height:${m.size}px;
             margin-left:-${m.size / 2}px;margin-top:-${m.size / 2}px;
             background:radial-gradient(closest-side, var(--${m.hue}), transparent 70%);opacity:${m.opacity};
             transform:translate(${dx * 6}px,${dy * 5}px)"></div>`;
  }).join("");
  return `<div class="bg">
      <div class="bg-ground"></div>
      <div class="bg-grid" data-part="grid" data-layout-allow-overflow></div>
      ${mesh}
    </div>`;
}

// Four windows, one screen, four disagreeing systems. Each keeps its own accent
// and its own number, and every window stays legible — an earlier attempt
// cropped the screenshot into slivers, which read as nothing at all.
const MULTI = [
  { tag: "Attendance portal", value: "87%", accent: "#B45309", x: -404, y: -196, r: -3.4 },
  { tag: "Class register", value: "81%", accent: "#166534", x: 386, y: -232, r: 2.8 },
  { tag: "Department sheet", value: "91%", accent: "#0369A1", x: -352, y: 208, r: 2.4 },
  { tag: "Group chat", value: "?", accent: "#B91C1C", x: 396, y: 244, r: -2.6 },
];

function multiWin(s, idPrefix) {
  const a = s.assets[0];
  return MULTI.map(
    (m, i) => `<div class="mw" data-part="${idPrefix}${i}" data-layout-allow-overlap style="left:50%; top:50%;">
        <div class="mw-shot"><img src="${a}" alt="" /></div>
        <div class="mw-badge" data-layout-allow-overlap style="background:${m.accent}">${esc(m.tag)}</div>
        <div class="mw-value" data-layout-allow-overlap style="color:${m.accent}">${esc(m.value)}</div>
      </div>`
  ).join("");
}

// ── scene bodies ─────────────────────────────────────────────────────────────
function win(asset, i, scene) {
  const fit = scene.fit === "contain" ? "win-fit-contain" : "win-fit-cover";
  const tag = scene.windowTag ? `<div class="win-tag">${esc(scene.windowTag)}</div>` : "";
  return `<div class="win" data-part="win${i}" style="position:${i === 0 && scene.layout === "hero" ? "absolute;inset:0" : "relative"}">
        <div class="halo" data-layout-allow-overflow></div>
        <div class="win-shot ${fit}" data-layout-allow-overflow><img src="${asset}" alt="" data-part="img${i}" /></div>
        ${tag}
      </div>`;
}

const bodies = {
  hero: (s) => `<div class="lay-hero">${s.assets.map((a, i) => win(a, i, s)).join("")}</div>`,
  duo: (s) => `<div class="lay-duo">${s.assets.map((a, i) => win(a, i, s)).join("")}</div>`,
  trio: (s) => `<div class="lay-trio">${s.assets.map((a, i) => win(a, i, s)).join("")}</div>`,
  full: (s) => `<div class="lay-full"><div class="diagram"><img src="${s.assets[0]}" alt="" data-part="dia" /></div></div>`,

  // Four windows scattered — the same college, four systems.
  fragment: (s) => `<div class="lay-multi">${multiWin(s, "mw")}</div>`,

  // three windows that plainly disagree
  compete: (s) => `<div class="lay-compete">${s.panels
    .map(
      (pn, i) => `<div class="panel" data-part="panel${i}"
        style="border-color:${pn.accent}55;background:${pn.accent}0d;--pc:${pn.accent}">
        <div>
          <div class="panel-title" style="color:${pn.accent}">${esc(pn.title)}</div>
          <div class="panel-rule" style="background:${pn.accent};margin-top:18px"></div>
        </div>
        <div>
          <div class="panel-value" style="color:${pn.accent}" data-count="${esc(pn.value)}">${esc(pn.value)}</div>
          <div class="panel-note" style="color:${pn.accent};opacity:.8">${esc(pn.note)}</div>
        </div>
        <div class="panel-marks">
          <i style="background:${pn.accent}"></i><i style="background:${pn.accent};opacity:.4"></i><i style="background:${pn.accent};opacity:.2"></i>
        </div>
      </div>`
    )
    .join("")}</div>`,

  // one request, three dates
  documents: (s) => `<div class="lay-documents">${s.panels
    .map(
      (pn, i) => `<div class="doc" data-part="doc${i}" style="border-top:5px solid ${pn.accent}">
        <div class="doc-head" style="color:${pn.accent}">${esc(pn.title)}</div>
        <div class="doc-rule" style="background:${pn.accent}"></div>
        <div class="doc-value" style="color:${pn.accent}">${esc(pn.value)}</div>
        <div class="doc-note">${esc(pn.note)}</div>
        <div class="doc-line" style="background:${pn.accent};width:82%"></div>
        <div class="doc-line" style="background:${pn.accent};width:64%"></div>
        <div class="doc-line" style="background:${pn.accent};width:73%"></div>
      </div>`
    )
    .join("")}</div>`,

  // the four systems aligning into one — they start scattered and snap together
  converge: (s) => `<div class="bg-sweep" data-part="sweep" style="position:absolute; top:-40%; left:-60%; width:46%; height:180%;"></div>
      <div class="lay-multi" data-part="conv-stage">${multiWin(s, "conv")}</div>
      <div class="turn-type">
        <div class="turn-rule" data-part="t-rule"></div>
        <div class="turn-slot">
          <div class="turn-line" data-part="tl-a">One college should not run</div>
          <div class="turn-line" data-part="tl-b">on four versions of the truth.</div>
        </div>
      </div>`,

  endcard: () => `<div class="endcard">
      <div class="mark">
        <i class="m1" data-part="m1"></i><i class="m2" data-part="m2"></i>
        <i class="m3" data-part="m3"></i><i class="m4" data-part="m4"></i>
      </div>
      <div class="wordmark" data-part="word">Learnix</div>
      <div class="tagline" data-part="tag">The digital operating system for modern colleges.</div>
    </div>`,
};

// ── build ────────────────────────────────────────────────────────────────────
let clock = 0;
const scenes = [];
for (const s of film.scenes) {
  s.start = f2(clock);
  clock += s.dur;
  scenes.push(s);
}

const tl = [];
const clips = [];
const audio = [];
const sceneIds = scenes.map((s) => s.id.toLowerCase());

scenes.forEach((s, idx) => {
  const id = s.id.toLowerCase();
  const sel = `#${id}`;
  const st = s.start;
  const d = s.dur;

  const body = bodies[s.layout] ? bodies[s.layout](s) : "";
  const caption =
    s.layout === "converge" || s.layout === "endcard"
      ? ""
      : s.copy
        ? `<div class="copy" data-part="copy">
             <span class="kicker">${esc(s.kicker)}</span>
             <span class="title">${esc(s.caption)}</span>
             ${s.copy.b ? `<span class="title title-sw" data-part="copyb">${esc(s.copy.b)}</span>` : ""}
           </div>`
        : `<div class="copy" data-part="copy">
             <span class="kicker">${esc(s.kicker)}</span>
             <span class="title">${esc(s.caption)}</span>
           </div>`;

  clips.push(`  <div id="${id}" class="scene" data-start="${st}" data-duration="${d}" data-track-index="0">
      ${bgLayer(idx + 1)}
      ${body}
      ${caption}
    </div>`);

  // ── background drift: every scene, deterministic ──────────────────────────
  tl.push(
    `  tl.fromTo("${sel} [data-part='grid']", {x: -120, y: -120}, {x: 0, y: 0, duration: ${f2(d)}, ease: "none"}, ${st});`,
    `  tl.to("${sel} [data-part='mesh0']", {x: 60, y: -34, duration: ${f2(d * 0.9)}, ease: "sine.inOut"}, ${st});`,
    `  tl.to("${sel} [data-part='mesh1']", {x: -48, y: 30, duration: ${f2(d * 1.1)}, ease: "sine.inOut"}, ${st});`
  );

  // ── per-scene internal motion ─────────────────────────────────────────────
  switch (s.layout) {
    case "fragment":
      // the four systems sit scattered; the scatter lives in the `from` because
      // GSAP transform properties are not valid CSS in a style attribute
      MULTI.forEach((m, k) => {
        tl.push(
          `  tl.fromTo("${sel} [data-part='mw${k}']", {opacity: 0, x: ${m.x}, y: ${m.y}, rotation: ${m.r}, scale: 0.97},` +
            ` {opacity: 1, x: ${m.x}, y: ${m.y}, rotation: ${m.r}, scale: 1, duration: 0.6, ease: "power2.out"}, ${st});`
        );
      });
      tl.push(
        `  tl.to("${sel} .mw", {y: "+=14", duration: ${f2(d * 0.42)}, ease: "sine.inOut", yoyo: true, repeat: 1, stagger: 0.14}, ${st + 0.8});`,
        `  tl.fromTo("${sel} [data-part='copy']", {opacity: 0, y: 18}, {opacity: 1, y: 0, duration: 0.5}, ${st + 0.34});`
      );
      break;

    case "compete":
      tl.push(
        `  tl.fromTo("${sel} .panel", {opacity: 0, y: 26}, {opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.14}, ${st});`,
        `  tl.fromTo("${sel} [data-part='copy']", {opacity: 0, y: 18}, {opacity: 1, y: 0, duration: 0.5}, ${st + 0.34});`
      );
      break;

    case "documents":
      tl.push(
        `  tl.fromTo("${sel} .doc", {opacity: 0, rotate: (i) => (i - 1) * 2.4, y: 22}, {opacity: 1, rotate: 0, y: 0, duration: 0.56, ease: "power2.out", stagger: 0.13}, ${st});`,
        `  tl.fromTo("${sel} [data-part='copy']", {opacity: 0, y: 18}, {opacity: 1, y: 0, duration: 0.5}, ${st + 0.4});`
      );
      // the mid-scene copy swap
      if (s.copy?.b) {
        tl.push(
          `  tl.to("${sel} [data-part='copy']", {opacity: 0, y: -18, duration: 0.36, ease: "power2.in"}, ${st + d * 0.56});`,
          `  tl.fromTo("${sel} [data-part='copyb']", {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.4, ease: "power2.out"}, ${st + d * 0.56 + 0.36});`
        );
      }
      break;

    case "converge": {
      // the four windows start scattered and snap into one stack
      MULTI.forEach((m, k) => {
        tl.push(
          `  tl.fromTo("${sel} [data-part='conv${k}']", {x: ${m.x}, y: ${m.y}, rotation: ${m.r}, scale: 1, opacity: 1},` +
            ` {x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 1.05, ease: "power4.inOut"}, ${f2(st + 0.35 + k * 0.07)});`
        );
      });
      // the four badges fade, and only one system remains legible
      tl.push(
        `  tl.to("${sel} .mw-badge", {opacity: 0, duration: 0.45, stagger: 0.06}, ${f2(st + 1.25)});`,
        `  tl.to("${sel} .mw-value", {opacity: 0, duration: 0.4, stagger: 0.06}, ${f2(st + 1.25)});`,
        `  tl.fromTo("${sel} [data-part='sweep']", {x: -700, opacity: 0}, {x: 2500, opacity: 1, duration: 1.6, ease: "power2.inOut"}, ${st});`,
        `  tl.fromTo("${sel} [data-part='tl-a']", {opacity: 0, y: 22}, {opacity: 1, y: 0, duration: 0.6, ease: "power2.out"}, ${st + 2.6});`,
        `  tl.fromTo("${sel} [data-part='t-rule']", {scaleX: 0}, {scaleX: 1, duration: 0.5, ease: "power3.out"}, ${st + 3.3});`,
        `  tl.to("${sel} [data-part='tl-a']", {opacity: 0, y: -18, duration: 0.34, ease: "power2.in"}, ${st + d * 0.56});`,
        `  tl.fromTo("${sel} [data-part='tl-b']", {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.5, ease: "power2.out"}, ${st + d * 0.56 + 0.34});`
      );
      break;
    }

    case "hero":
    case "duo":
    case "trio": {
      tl.push(
        `  tl.fromTo("${sel} .win", {opacity: 0, y: 24, scale: 0.985}, {opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out", stagger: 0.08}, ${st});`,
        `  tl.fromTo("${sel} [data-part='copy']", {opacity: 0, y: 18}, {opacity: 1, y: 0, duration: 0.5}, ${st + 0.3});`
      );
      // halo breathes behind the content
      tl.push(`  tl.to("${sel} .halo", {opacity: 0.9, scale: 1.05, duration: ${f2(d * 0.6)}, ease: "sine.inOut"}, ${st});`);
      // focus push-in: crop into the region that carries the point
      const f = s.focus;
      if (f) {
        tl.push(
          `  tl.fromTo("${sel} [data-part='img0']", {transformOrigin: "${f.x * 100}% ${f.y * 100}%", scale: 1},
             {scale: ${f.z}, duration: ${f2(d)}, ease: "none"}, ${st});`
        );
      }
      break;
    }

    case "full": {
      tl.push(
        `  tl.fromTo("${sel} [data-part='dia']", {opacity: 0, scale: 0.97}, {opacity: 1, scale: 1, duration: 0.7, ease: "power2.out"}, ${st});`,
        `  tl.fromTo("${sel} [data-part='copy']", {opacity: 0, y: 18}, {opacity: 1, y: 0, duration: 0.5}, ${st + 0.36});`
      );
      if (s.build === "layers") {
        // reveal the architecture in bands, top to bottom
        tl.push(
          `  tl.fromTo("${sel} [data-part='dia']", {clipPath: "inset(0% 0% 100% 0%)"}, {clipPath: "inset(0% 0% 0% 0%)", duration: ${f2(d * 0.72)}, ease: "power2.inOut"}, ${st + 0.3});`
        );
      }
      if (s.build === "nodes") {
        // slow drift plus a light pass across the map
        tl.push(
          `  tl.fromTo("${sel} [data-part='dia']", {transformOrigin: "50% 50%", scale: 1.09}, {scale: 1, duration: ${f2(d)}, ease: "power2.inOut"}, ${st});`
        );
      }
      break;
    }

    case "endcard":
      tl.push(
        `  tl.fromTo("${sel} .mark i", {opacity: 0, scale: 0.5}, {opacity: 1, scale: 1, duration: 0.32, stagger: 0.08, ease: "back.out(2.2)"}, ${st});`,
        `  tl.fromTo("${sel} [data-part='word']", {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: 0.5}, ${st + 0.4});`,
        `  tl.fromTo("${sel} [data-part='tag']", {opacity: 0}, {opacity: 1, duration: 0.5}, ${st + 0.8});`
      );
      break;
  }

  const cue = voById.get(s.id);
  if (cue && !cue.silent) {
    audio.push(`  <audio id="vo-${s.id}" src="${cue.file}" data-start="${st}" data-duration="${cue.audioDur}"></audio>`);
  }
});

// ── transitions, driven from the root like the promo ─────────────────────────
// rotated so consecutive scenes never repeat the same move
const MOVES = [
  { name: "blurPush", out: 'filter: "blur(12px)", scale: 1.04, opacity: 0', inFrom: 'filter: "blur(12px)", scale: 0.96, opacity: 0', t: 0.62 },
  { name: "wipe", out: "scaleX: 0, transformOrigin: 'left center'", inFrom: "scaleX: 0, transformOrigin: 'right center'", t: 0.46 },
  { name: "slide", out: "x: -1920", inFrom: "x: 1920", t: 0.54 },
  { name: "punch", out: "scale: 2.4, opacity: 0, filter: 'blur(8px)'", inFrom: "scale: 0.55, opacity: 0, filter: 'blur(8px)'", t: 0.44 },
  { name: "lift", out: "y: -1080", inFrom: "y: 1080", t: 0.52 },
  { name: "zoomThrough", out: "scale: 0.82, opacity: 0", inFrom: "scale: 1.22, opacity: 0", t: 0.58 },
];

const trans = [];
for (let i = 0; i < scenes.length - 1; i++) {
  const a = scenes[i], b = scenes[i + 1];
  const at = f2(a.start + a.dur - 0.06); // overlap slightly so there is no dead frame
  const mv = MOVES[(i * 5 + 1) % MOVES.length];
  const A = `#${a.id.toLowerCase()}`;
  const B = `#${b.id.toLowerCase()}`;
  trans.push(
    `  tl.to("${A}", {${mv.out}, duration: ${mv.t}, ease: "power3.inOut"}, ${at});`,
    `  tl.fromTo("${B}", {${mv.inFrom}}, {filter: "blur(0px)", scale: 1, x: 0, y: 0, scaleX: 1, opacity: 1, duration: ${mv.t}, ease: "power3.out"}, ${at});`
  );
}

// grain is a single overlay across the whole film so nothing looks pasted
const grainSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/></filter><rect width="200" height="200" filter="url(#n)" opacity="0.5"/></svg>`
)}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Learnix — 90 seconds</title>
<style>
  @font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:100 900;font-display:swap;
    src:url("assets/fonts/captured-LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_vb.woff2") format('woff2');}
  @font-face{font-family:'Manrope';font-style:normal;font-weight:100 900;font-display:swap;
    src:url("assets/fonts/captured-xn7gYHE41ni1AdIRggexSvfedN4.woff2") format('woff2');}
  html,body{margin:0;padding:0;background:#f5f7f9}
</style>
<link rel="stylesheet" href="assets/film90.css" />
</head>
<body>
<div id="root" data-composition-id="learnix-90" data-start="0" data-duration="90" data-width="1920" data-height="1080">
${clips.join("\n")}
  <div class="scene" data-start="0" data-duration="90" style="pointer-events:none">
    <div class="bg-grain" style="background-image:url(&quot;${grainSvg}&quot;);background-size:200px 200px"></div>
  </div>
  <audio id="score" src="audio/score90.wav" data-start="0" data-duration="90"></audio>
${audio.join("\n")}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
${tl.join("\n")}
${trans.join("\n")}
  tl.to({}, { duration: 90 }, 0);
  window.__timelines["learnix-90"] = tl;
</script>
</body>
</html>`;

writeFileSync(p("index.html"), html, "utf8");
console.log(`index.html written — ${film.scenes.length} scenes, ${clock}s`);
console.log(`  transitions: ${trans.length / 2}`);
console.log(`  narration cues placed: ${audio.length}`);
console.log(`  acts: ${[...new Set(scenes.map((s) => s.act))].join(", ")}`);