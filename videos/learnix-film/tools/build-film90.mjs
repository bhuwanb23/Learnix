/**
 * Builds the 90-second cut: index.html
 *
 * Every scene is full of real Learnix content — captured product screens and the
 * real architecture diagrams. There are no empty plates in this cut; that was
 * the fault with the seven-minute version.
 *
 * Run: node tools/build-film90.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (...s) => resolve(ROOT, ...s);

const film = JSON.parse(readFileSync(p("docs", "FILM-90.json"), "utf8"));
const vo = JSON.parse(readFileSync(p("audio", "vo90-manifest.json"), "utf8")).cues;
const voById = new Map(vo.map((c) => [c.id, c]));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A captured screen inside a browser chrome, with a Ken Burns push. */
function screen(asset, index, total) {
  const isSvg = asset.endsWith(".svg");
  return `<div class="shot" data-i="${index}">
        <div class="chrome"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="url">learnix.app</span></div>
        <div class="viewport"><img src="${asset}" alt="" /></div>
      </div>`;
}

const layouts = {
  hero: (s) => `<div class="layout-hero">${s.assets.map((a, i) => screen(a, i)).join("")}</div>`,
  duo: (s) => `<div class="layout-duo">${s.assets.map((a, i) => screen(a, i)).join("")}</div>`,
  trio: (s) => `<div class="layout-trio">${s.assets.map((a, i) => screen(a, i)).join("")}</div>`,
  full: (s) => `<div class="layout-full">${s.assets.map((a) => `<div class="diagram"><img src="${a}" alt="" /></div>`).join("")}</div>`,
  endcard: () => `<div class="endcard">
        <div class="mark">
          <span class="tile t1"></span><span class="tile t2"></span><span class="tile t3"></span><span class="tile t4"></span>
        </div>
        <div class="wordmark" data-part="word">Learnix</div>
        <div class="tagline" data-part="tag">The digital operating system for modern colleges.</div>
      </div>`,
};

let clock = 0;
const clips = [];
const timeline = [];
const audio = [];

for (const s of film.scenes) {
  const start = Number(clock.toFixed(3));
  s.start = start;
  clock += s.dur;

  const body = (layouts[s.layout] ?? layouts.hero)(s);
  const id = s.id.toLowerCase();
  const sel = `#${id}`;

  const caption =
    s.layout === "endcard"
      ? ""
      : `<div class="caption" data-part="cap">
           <span class="kicker">${esc(s.kicker)}</span>
           <span class="title">${esc(s.caption)}</span>
         </div>`;

  clips.push(`    <div id="${id}" class="clip scene" data-start="${start}" data-duration="${s.dur}" data-track-index="0">
      <div class="ground"></div>
      ${body}
      ${caption}
    </div>`);

  // ── motion, positioned at the scene start ────────────────────────────────
  timeline.push(
    `  tl.fromTo("${sel} .shot, ${sel} .diagram", {opacity: 0, y: 26, scale: 0.985},` +
      ` {opacity: 1, y: 0, scale: 1, duration: 0.62, ease: "power2.out", stagger: 0.09}, ${start});`
  );
  if (s.layout !== "endcard") {
    // slow push — the film is never busy, but it is never still either
    timeline.push(
      `  tl.fromTo("${sel} .viewport img, ${sel} .diagram img", {scale: 1.0},` +
        ` {scale: 1.055, duration: ${s.dur.toFixed(2)}, ease: "none"}, ${start});`
    );
    timeline.push(
      `  tl.fromTo("${sel} [data-part='cap']", {opacity: 0, y: 16},` +
        ` {opacity: 1, y: 0, duration: 0.5, ease: "power2.out"}, ${start + 0.28});`
    );
  } else {
    timeline.push(
      `  tl.fromTo("${sel} .tile", {opacity: 0, scale: 0.55},` +
        ` {opacity: 1, scale: 1, duration: 0.34, stagger: 0.09, ease: "back.out(2.2)"}, ${start});`,
      `  tl.fromTo("${sel} [data-part='word']", {opacity: 0, y: 16}, {opacity: 1, y: 0, duration: 0.5}, ${start + 0.44});`,
      `  tl.fromTo("${sel} [data-part='tag']", {opacity: 0}, {opacity: 1, duration: 0.5}, ${start + 0.8});`
    );
  }

  const cue = voById.get(s.id);
  if (cue && !cue.silent) {
    audio.push(`    <audio id="vo-${s.id}" src="${cue.file}" data-start="${start}" data-duration="${cue.audioDur}"></audio>`);
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Learnix — 90 second cut</title>
<style>
  @font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:100 900;font-display:swap;
    src:url("assets/fonts/captured-LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yygg_vb.woff2") format('woff2');}
  @font-face{font-family:'Manrope';font-style:normal;font-weight:100 900;font-display:swap;
    src:url("assets/fonts/captured-xn7gYHE41ni1AdIRggexSvfedN4.woff2") format('woff2');}

  #root{
    position:relative;width:1920px;height:1080px;overflow:hidden;
    container-type:size;background:#0b1220;
  }
  #root *{box-sizing:border-box}
  #root .ground{position:absolute;inset:0;
    background:radial-gradient(120% 90% at 50% 0%, #16233a 0%, #0b1220 55%, #070d18 100%);}
  #root .scene{position:absolute;inset:0}

  /* a captured screen inside browser chrome */
  #root .shot{
    background:#0f172a;border:1px solid #243349;border-radius:14px;overflow:hidden;
    box-shadow:0 40px 110px rgba(0,0,0,.55);
  }
  #root .chrome{
    display:flex;align-items:center;gap:9px;padding:0 18px;height:44px;
    background:#111c2e;border-bottom:1px solid #243349;
  }
  #root .dot{width:10px;height:10px;border-radius:50%;background:#2b3a52}
  #root .url{
    margin-left:14px;font-family:Manrope,system-ui,sans-serif;font-size:14px;font-weight:600;
    letter-spacing:.04em;color:#64748b;
  }
  #root .viewport{overflow:hidden;height:calc(100% - 44px);background:#f5f7f9}
  #root .viewport img{display:block;width:100%;height:100%;object-fit:cover;object-position:top left}

  /* layouts */
  #root .layout-hero{position:absolute;left:150px;right:150px;top:96px;bottom:250px}
  #root .layout-hero .shot{position:absolute;inset:0}

  #root .layout-duo{position:absolute;inset:96px 110px 250px 110px;display:flex;gap:34px}
  #root .layout-duo .shot{flex:1 1 0;height:100%}

  #root .layout-trio{position:absolute;inset:110px 90px 250px 90px;display:flex;gap:26px}
  #root .layout-trio .shot{flex:1 1 0;height:100%}

  #root .layout-full{position:absolute;inset:70px 120px 210px 120px;display:flex;align-items:center;justify-content:center}
  #root .diagram{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  #root .diagram img{max-width:100%;max-height:100%;width:auto;height:auto;border-radius:10px;
    box-shadow:0 40px 110px rgba(0,0,0,.6)}

  /* caption */
  #root .caption{position:absolute;left:150px;bottom:96px;display:flex;flex-direction:column;gap:10px}
  #root .kicker{
    font-family:Manrope,system-ui,sans-serif;font-size:19px;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:#3b82f6;
  }
  #root .title{
    font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:56px;font-weight:700;
    letter-spacing:-.025em;color:#f1f5f9;
  }

  /* end card */
  #root .endcard{position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:26px}
  #root .mark{position:relative;width:112px;height:112px}
  #root .tile{position:absolute;width:48px;height:48px;border-radius:11px}
  #root .t1{left:0;top:0;background:#2563eb}
  #root .t2{right:0;top:0;background:#0ea5e9}
  #root .t3{left:0;bottom:0;background:#1d4ed8}
  #root .t4{right:0;bottom:0;background:#0284c7}
  #root .wordmark{font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:104px;
    font-weight:700;letter-spacing:-.03em;color:#f1f5f9;margin-top:12px}
  #root .tagline{font-family:Manrope,system-ui,sans-serif;font-size:30px;font-weight:500;color:#94a3b8}
</style>
</head>
<body>
<div id="root" data-composition-id="learnix-90" data-start="0" data-duration="90" data-width="1920" data-height="1080">
${clips.join("\n")}
  <audio id="score" src="audio/score90.wav" data-start="0" data-duration="90"></audio>
${audio.join("\n")}
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script>
  window.__timelines = window.__timelines || {};
  var tl = gsap.timeline({ paused: true });
${timeline.join("\n")}
  window.__timelines["learnix-90"] = tl;
</script>
</body>
</html>`;

writeFileSync(p("index.html"), html, "utf8");
console.log(`index.html written — 90 second cut`);
console.log(`  ${film.scenes.length} scenes, all full of real product`);
console.log(`  ${audio.length} narration cues placed`);