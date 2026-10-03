/** Structural QA on the generated board — catches drift the generator's own checks cannot. */
import { readFileSync } from "node:fs";
const html = readFileSync("storyboard.html", "utf8");

const cells = [...html.matchAll(/<article class="cell" id="(S\d+)"/g)].map((m) => m[1]);
const acts = [...html.matchAll(/<h2>([^<]*?)\s*<span class="act-time">/g)].map((m) => m[1].trim());
const problems = [];

const expected = Array.from({ length: 61 }, (_, i) => "S" + String(i + 1).padStart(2, "0"));
if (cells.length !== 61) problems.push(`expected 61 cells, found ${cells.length}`);
for (const id of expected) if (!cells.includes(id)) problems.push(`missing cell ${id}`);
if (new Set(cells).size !== cells.length) problems.push("duplicate cell ids");
if (acts.length !== 11) problems.push(`expected 11 act headings, found ${acts.length}`);

// Scope each check to a single cell: split on the article marker so a cell's
// block cannot bleed into its neighbour's fields.
const blocks = html.split('<article class="cell"').slice(1);
const byId = new Map();
for (const b of blocks) {
  const id = b.match(/id="(S\d+)"/)?.[1];
  if (id) byId.set(id, b.split("</article>")[0]);
}

for (const id of cells) {
  const blk = byId.get(id) ?? "";
  if (!blk) { problems.push(`${id} block not found`); continue; }
  if (!/>\d+:\d\d – \d+:\d\d</.test(blk)) problems.push(`${id} has no timecode`);
  if (!/class="badges"/.test(blk)) problems.push(`${id} has no badges`);
  if (!/class="wordbar/.test(blk)) problems.push(`${id} has no word bar`);
  if (!/class="intent"/.test(blk)) problems.push(`${id} has no emotional intent`);
  if (!/class="note"><b>camera<\/b>/.test(blk)) problems.push(`${id} has no camera note`);
  if (/class="wordbar over"/.test(blk) && id !== "S07") {
    problems.push(`${id} word bar is over budget`);
  }
}

// no unrendered template artefacts or stray markdown
if (html.includes("${")) problems.push("unrendered template literal present");
const stray = html.match(/\*\*[A-Z]/g);
if (stray) problems.push(`stray markdown bold in output (${stray.length})`);
if (/undefined|NaN|\[object/.test(html)) problems.push("undefined/NaN leaked into output");

const badges = {};
for (const m of html.matchAll(/class="bd bd-([a-z-]+)"/g)) badges[m[1]] = (badges[m[1]] ?? 0) + 1;

// badge classes must match between the legend and the cells, or the legend lies
const legendBlock = html.slice(html.indexOf('class="legend"'), html.indexOf("</div>", html.indexOf('class="legend"')));
const legendClasses = new Set([...legendBlock.matchAll(/class="bd bd-([a-z-]+)"/g)].map((m) => m[1]));
const cellBadges = {};
for (const b of blocks) {
  const bd = b.slice(b.indexOf('class="badges"'), b.indexOf('class="badges"') + 900);
  for (const m of bd.matchAll(/class="bd bd-([a-z-]+)"/g)) cellBadges[m[1]] = (cellBadges[m[1]] ?? 0) + 1;
}
for (const c of legendClasses) {
  if (!(c in cellBadges)) problems.push(`legend badge "${c}" is never used on a cell`);
}
for (const c of Object.keys(cellBadges)) {
  if (!legendClasses.has(c)) problems.push(`cell badge "${c}" is missing from the legend`);
}

console.log(`cells      : ${cells.length}`);
console.log(`acts       : ${acts.length}`);
console.log(`badges     :`, badges);
console.log();
if (problems.length) {
  console.error("STORYBOARD QA FAILED");
  for (const p of problems) console.error("  x " + p);
  process.exit(1);
}
console.log("STORYBOARD QA PASSED");