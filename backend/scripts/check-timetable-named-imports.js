// Ad-hoc named-import resolution for the X-02 Timetable screens.
// A parse sweep proves a file is SYNTACTICALLY valid. A screen importing
// `formatDuration` from a meta module that does not export it parses
// perfectly, bundles perfectly, and throws `undefined is not a function` the
// first time that line runs — on a phone, in front of a user.
//
// Run: node scripts/check-timetable-named-imports.js
//
// ESM, because `backend/package.json` sets `"type": "module"` — a `require`
// here is a hard error, not a warning.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const TT = path.join(REPO, 'learnix', 'users', 'exam_cell', 'pages', 'timetable');

const FILES = [
  'timetable.js',
  'timetableMeta.js',
  'timetableUi.js',
  'pages/calendar/calendar.js',
  'pages/exams/exams.js',
  'pages/allocation/allocation.js',
  'pages/slots/slots.js',
  'pages/rooms/rooms.js',
  'pages/duty/duty.js',
  'pages/students/students.js',
  'pages/conflicts/conflicts.js',
];

// `timetableMeta.js` is a leaf — it imports nothing by design, because a
// registry module that could import another registry module would be somewhere
// for the registries to disagree.
//
// `timetableUi.js` is NOT a leaf: it imports the shared `components/ui` kit and
// the meta. Only `timetableMeta.js` gets this rule, and the rule is checked by
// reading the module rather than by trusting the list.
const LEAF = new Set(['timetableMeta.js']);

function resolveModule(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const tries = [base, `${base}.js`, path.join(base, 'index.js')];
  for (const t of tries) {
    if (fs.existsSync(t) && fs.statSync(t).isFile()) return t;
  }
  return null;
}

/** Every named export a module offers, plus its default. */
function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+class\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  for (const m of src.matchAll(/export\s+default/g)) names.add('default');
  return names;
}

let pass = 0;
let fail = 0;
const seenModules = new Map();

for (const rel of FILES) {
  const file = path.join(TT, rel);
  if (!fs.existsSync(file)) {
    console.log(`  FAIL ${rel} — missing`);
    fail += 1;
    continue;
  }
  const src = fs.readFileSync(file, 'utf8');
  const leaf = LEAF.has(rel);
  let bad = 0;
  let imports = 0;

  for (const m of src.matchAll(/import\s+(\{[^}]+\}|[A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g)) {
    const clause = m[1];
    const spec = m[2];

    if (!spec.startsWith('.')) continue; // a package, not our problem here

    const target = resolveModule(file, spec);
    if (!target) {
      console.log(`  FAIL ${rel} — "${spec}" resolves to no file`);
      bad += 1;
      continue;
    }
    if (!seenModules.has(target)) seenModules.set(target, exportsOf(target));
    const available = seenModules.get(target);

    const braced = /^\{([\s\S]*)\}$/.exec(clause.trim());
    if (braced) {
      for (const part of braced[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        imports += 1;
        if (!available.has(name)) {
          console.log(`  FAIL ${rel} — "${spec}" has no export "${name}"`);
          bad += 1;
        }
      }
    } else if (available.has('default')) {
      imports += 1;
    } else {
      console.log(`  FAIL ${rel} — "${spec}" has no default export`);
      bad += 1;
    }
  }

  // The leaf modules must import nothing by design.
  if (leaf && /from\s+['"]\./.test(src)) {
    console.log(`  FAIL ${rel} — a leaf meta module must not import anything`);
    bad += 1;
  }

  if (bad > 0) {
    fail += 1;
    continue;
  }
  console.log(`  ok   ${rel}${imports ? ` (${imports} named imports resolved)` : ''}`);
  pass += 1;
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);