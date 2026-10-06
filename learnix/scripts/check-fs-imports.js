// Static check that every named import in the Fee Structure, Payroll, Scholarships
// and Reports screens resolves to a real export in the module it imports from.
//
// A Babel parse sweep only proves the file is SYNTACTICALLY valid. A screen
// importing `formatDay` from a meta module that does not export it parses
// perfectly, bundles perfectly, and throws `undefined is not a function` the
// first time that line runs — on a phone, in front of a user. So this checks
// names, which the parse sweep cannot.
//
// Usage: node scripts/check-fs-imports.js
const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.resolve(__dirname, '..', 'users', 'accounts_finance', 'pages');
const FS_DIR = path.join(PAGES_DIR, 'fee_structure');
const API_FILE = path.resolve(__dirname, '..', 'services', 'api.js');

// The exam cell timetable desk (docs/users/05 §3.9). It lives under a different
// user folder, so it gets its own root rather than being folded into PAGES_DIR.
const EXAM_PAGES_DIR = path.resolve(__dirname, '..', 'users', 'exam_cell', 'pages');
const TT_DIR = path.join(EXAM_PAGES_DIR, 'timetable');

// A meta module is a leaf — it imports nothing by design — so the
// "has at least one relative import" check does not apply to it.
const LEAF_META = new Set([
  'feeStructureMeta.js', 'payrollSalaryMeta.js', 'payrollMeta.js', 'scholarshipsMeta.js',
  'reportsMeta.js', 'notificationsMeta.js', 'dashboardMeta.js',
  'timetableMeta.js',
]);

const files = [
  path.join(FS_DIR, 'fee_structure.js'),
  path.join(FS_DIR, 'feeStructureMeta.js'),
  ...['component_editor', 'concessions', 'installments', 'penalties', 'structure_detail', 'version_history']
    .map((d) => path.join(FS_DIR, 'pages', d, `${d}.js`)),

  // The payroll salary desk (docs/users/06 §3.4).
  path.join(PAGES_DIR, 'payroll', 'payroll.js'),
  path.join(PAGES_DIR, 'payroll', 'payrollMeta.js'),
  path.join(PAGES_DIR, 'payroll', 'payrollSalaryMeta.js'),
  ...['payroll_detail', 'payslip', 'payslip_document', 'payroll_alerts', 'salary_attendance',
      'salary_components', 'salary_loans', 'salary_record', 'salary_records']
    .map((d) => path.join(PAGES_DIR, 'payroll', 'pages', d, `${d}.js`)),

  // The scholarship desk (docs/users/06 §3.7).
  path.join(PAGES_DIR, 'scholarships', 'scholarships.js'),
  path.join(PAGES_DIR, 'scholarships', 'scholarshipsMeta.js'),
  ...['applications', 'application', 'apply', 'detail', 'documents', 'scheme_editor',
      'student_history', 'tracking']
    .map((d) => path.join(PAGES_DIR, 'scholarships', 'pages', d, `${d}.js`)),

  // The reporting centre (docs/users/06 §3.8).
  path.join(PAGES_DIR, 'reports', 'reports.js'),
  path.join(PAGES_DIR, 'reports', 'reportsMeta.js'),
  path.join(PAGES_DIR, 'reports', 'reportsUi.js'),
  ...['collections', 'comparison', 'departments', 'dues', 'expenses', 'payroll', 'scholarships']
    .map((d) => path.join(PAGES_DIR, 'reports', 'pages', d, `${d}.js`)),

  // The notification desk (docs/users/06 §3.9). The four sub-pages live under
  // `pages/notifications/pages/<name>/<name>.js` — one directory deeper than the
  // reports and scholarship sub-pages, because the hub itself already sits at
  // `pages/notifications/notifications.js`.
  path.join(PAGES_DIR, 'notifications', 'notifications.js'),
  path.join(PAGES_DIR, 'notifications', 'notificationsMeta.js'),
  path.join(PAGES_DIR, 'notifications', 'notificationsUi.js'),
  ...['alerts', 'compose', 'history', 'inbox']
    .map((d) => path.join(PAGES_DIR, 'notifications', 'pages', d, `${d}.js`)),

  // The finance dashboard (docs/users/06 §3.11). One sub-screen per block.
  path.join(PAGES_DIR, 'dashboard', 'dashboard.js'),
  path.join(PAGES_DIR, 'dashboard', 'dashboardMeta.js'),
  path.join(PAGES_DIR, 'dashboard', 'dashboardUi.js'),
  ...['actions', 'alerts', 'collections', 'dues', 'expenses', 'payroll', 'scholarships']
    .map((d) => path.join(PAGES_DIR, 'dashboard', 'pages', d, `${d}.js`)),

  // The exam cell timetable (docs/users/05 §3.9). Hub, meta, the shared Ui kit,
  // and one sub-screen per block. The sub-screens sit two levels below the hub
  // (`pages/timetable/pages/<block>/<block>.js`), so their relative imports have
  // to climb FOUR levels to reach `services/api.js` — which is exactly the depth
  // the Accounts F-11 build got wrong in all seven of its sub-screens.
  path.join(TT_DIR, 'timetable.js'),
  path.join(TT_DIR, 'timetableMeta.js'),
  path.join(TT_DIR, 'timetableUi.js'),
  ...['allocation', 'calendar', 'conflicts', 'duty', 'exams', 'rooms', 'slots', 'students']
    .map((d) => path.join(TT_DIR, 'pages', d, `${d}.js`)),
];

/** Every named export a module offers, plus its default. */
function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  if (/export\s+default/.test(src)) names.add('default');
  return names;
}

let passed = 0;
let failed = 0;
const fails = [];

function check(label, ok, detail) {
  if (ok) { passed += 1; console.log(`  ✓ ${label}`); }
  else {
    failed += 1;
    const line = `${label}${detail ? ` — ${detail}` : ''}`;
    fails.push(line);
    console.log(`  ✗ ${line}`);
  }
}

const cache = new Map();
function exportsCached(file) {
  if (!cache.has(file)) cache.set(file, exportsOf(file));
  return cache.get(file);
}

for (const file of files) {
  const rel = path.relative(path.resolve(__dirname, '..'), file);
  const src = fs.readFileSync(file, 'utf8');
  // The meta module is a leaf — it imports nothing by design — so "has at least
  // one relative import" only applies to the screens.
  const mustHaveImports = !LEAF_META.has(path.basename(file));

  // Only relative imports can be resolved from disk; package imports are a
  // different question and are checked by the bundler instead.
  const importRe = /import\s+(?:([\w$]+)\s*,\s*)?\{([^}]*)\}\s*from\s+'([^']+)'/g;
  let sawAny = false;
  for (const m of src.matchAll(importRe)) {
    const [, defaultName, namedRaw, spec] = m;
    if (!spec.startsWith('.')) continue;
    sawAny = true;

    // Metro resolves a bare `./x` to `./x.js`; `fs.existsSync` does not. Try the
    // specifier as written, then the extensions Metro would try, so this check
    // reports a genuinely missing module rather than a missing file suffix.
    const base = path.resolve(path.dirname(file), spec);
    const resolved = [base, `${base}.js`, path.join(base, 'index.js')].find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (!resolved) {
      check(`${rel}: '${spec}' resolves to a file`, false, base);
      continue;
    }
    check(`${rel}: '${spec}' resolves to a file`, true);

    const available = exportsCached(resolved);
    const wanted = namedRaw.split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    for (const name of wanted) {
      check(`${rel}: '${name}' is exported by ${path.basename(spec)}`, available.has(name),
        `exports: ${[...available].sort().join(', ')}`);
    }
    if (defaultName) {
      check(`${rel}: ${spec} has a default export`, available.has('default'));
    }
  }
  if (mustHaveImports) {
    check(`${rel}: has at least one relative import checked`, sawAny);
  }
}

// Unused imports are the mirror failure: a screen that imports three names and
// uses one usually means a copy-paste slipped and a field is being read from the
// wrong place. Surfaced as a list, not a failure — an unused import is dead
// weight, not a crash.
console.log('\nunused imports (dead weight, not a crash):');
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(path.resolve(__dirname, '..'), file);
  const unused = [];
  for (const m of src.matchAll(/import\s+(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s+from\s+'([^']+)'/g)) {
    const [, namedRaw, spec] = m;
    if (!spec.startsWith('.')) continue;
    const body = src.slice(m.index + m[0].length);
    for (const raw of namedRaw.split(',')) {
      const local = raw.trim().split(/\s+as\s+/).pop().trim();
      if (!local) continue;
      const used = new RegExp(`\\b${local.replace(/\$/g, '\\$')}\\b`).test(body);
      if (!used) unused.push(`${local} (from ${spec})`);
    }
  }
  if (unused.length) console.log(`  ${rel}: ${unused.join(', ')}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (fails.length) {
  console.log('\nFailures:');
  fails.forEach((f) => console.log(`  - ${f}`));
}
process.exit(failed ? 1 : 0);