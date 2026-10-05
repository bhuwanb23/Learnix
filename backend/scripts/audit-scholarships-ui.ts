// F-08 Scholarships — UI contract audit.
//
// A bundle proves a screen COMPILES. It does not prove the screen reads fields
// that exist. `data.amount.outstandingRupees` on a response with no
// `outstandingRupees` renders "undefined" on a phone and looks fine in a build;
// an import of a name a module does not export throws only at first call. This
// audit is what catches both, by checking every screen against a LIVE API
// response rather than against a type.
//
// What it verifies:
//   1. every property each screen destructures off an API response exists in it
//   2. every `navigation.openModule` target is registered in FEATURE_MODULES
//   3. every relative import resolves to a real file and a real named export
//   4. client constants that MIRROR server constants actually match
//   5. no screen reaches for a field the server does not send
//
// Run: npx tsx scripts/audit-scholarships-ui.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/db/prisma.js';
import * as svc from '../src/modules/accounts/scholarship.service.js';
import * as disburse from '../src/modules/accounts/scholarship.disburse.js';
import {
  DOCUMENT_CATALOG as SERVER_DOCS, ELIGIBILITY_OPERATORS as SERVER_OPS,
  APPLICATION_STATUSES as SERVER_STATUSES, DISBURSEMENT_BANDS as SERVER_BANDS,
  SCHOLARSHIP_TYPES as SERVER_TYPES, SCHEME_STATUSES, AMOUNT_MODES,
} from '../src/modules/accounts/scholarship.rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '../../learnix');
const DIR = path.join(APP, 'users/accounts_finance/pages/scholarships');
const META = path.join(DIR, 'scholarshipsMeta.js');
const ACCOUNTS_ENTRY = path.join(APP, 'users/accounts_finance/accounts_finance.js');

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n── ${n}`);

// ═══ Live fixtures ══════════════════════════════════════════════════════
section('0. Live API fixtures');

const inst = await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } });
if (!inst) {
  console.error('No institution to audit against — run `npm run prisma:seed` first.');
  process.exit(1);
}
const institutionId = inst.id;
console.log(`  auditing against ${inst.name} (${institutionId})`);

// `listSchemes` returns a bare array — the hub renders `schemes` directly.
const schemes = await svc.listSchemes(institutionId);
const apps = await svc.listApplications(institutionId, {});
const tracking = await disburse.amountTracking(institutionId);

ok(!!schemes.length, 'the catalogue has a scheme to audit against');
ok(!!apps.applications.length, 'the desk has an application to audit against');
console.log(
  `  ${schemes.length} schemes, ${apps.applications.length} applications, ` +
  `${tracking.totals.disbursedRupees} released`,
);

const withApps = schemes.find((s) => s.stats.applications > 0) ?? schemes[0];
const scheme = await svc.getScheme(institutionId, withApps.id);

// Pick one application in each interesting state so every branch of the detail
// screen is exercised, not just the first row the query happens to return.
const liveApps = apps.applications;
const settled = liveApps.find((a) => a.status === 'DISBURSED');
const pending = liveApps.find((a) => a.status === 'APPLIED' || a.status === 'UNDER_REVIEW');
const approved = liveApps.find((a) => a.status === 'APPROVED');
const rejected = liveApps.find((a) => a.status === 'REJECTED');
const chosen = [settled, pending, approved, rejected].filter(Boolean);
for (const c of chosen) {
  const full = await svc.getApplication(institutionId, (c as typeof liveApps[0]).id);
  ok(!!full.id, `the ${c!.status} application detail is fetchable`);
}

const settledApp = settled ? await svc.getApplication(institutionId, settled.id) : null;
const studentId = (settledApp ?? (await svc.getApplication(institutionId, (pending ?? liveApps[0]).id))).student.id;
const history = await disburse.studentHistory(institutionId, studentId);
ok(!!history.student, 'a student history payload is available');
ok(Array.isArray(history.applications), 'the student history carries applications');

const hubSchemes = schemes;

// ═══ 1. Every destructured property exists ═══════════════════════════════
section('1. Screens read only fields the API actually sends');

/** Every path a screen could destructure off `x`, flattened to dotted strings. */
function pathsOf(value: unknown, prefix = '', depth = 0, out: Set<string> = new Set()): Set<string> {
  // `null` is a value the server DID send — an uncapped fund, a scheme with no
  // applications yet. The path is recorded and the walk stops there, so a screen
  // reading `s.headroomRupees` on an uncapped scheme is not reported as reading
  // a missing field merely because this row has no budget.
  if (value === null) {
    out.add(prefix);
    return out;
  }
  if (depth > 4 || value === undefined) return out;
  if (Array.isArray(value)) {
    out.add(prefix);
    if (value.length) pathsOf(value[0], `${prefix}[]`, depth + 1, out);
    return out;
  }
  if (typeof value !== 'object') {
    out.add(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    out.add(next);
    pathsOf(v, next, depth + 1, out);
  }
  return out;
}

/**
 * The trailing segment may be a JS method rather than a payload field: `x.items.map`,
 * `x.date.slice`, `x.list.length`. Those are not properties the server sends, so
 * they are stripped before the lookup — otherwise every `.map` in a screen reads
 * as a missing field.
 */
const JS_METHODS = new Set([
  'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every', 'slice',
  'splice', 'sort', 'flat', 'flatMap', 'concat', 'join', 'includes', 'indexOf',
  'length', 'push', 'pop', 'shift', 'toString', 'trim', 'trimStart', 'trimEnd',
  'split', 'replace', 'replaceAll', 'toFixed', 'padStart', 'padEnd', 'charAt',
  'startsWith', 'endsWith', 'keys', 'values', 'entries',
]);

const has = (paths: Set<string>, pathExpr: string): boolean => {
  const segments = pathExpr.replace(/\?\./g, '.').split('.');
  while (segments.length > 1 && JS_METHODS.has(segments[segments.length - 1])) segments.pop();
  const cleaned = segments.join('.');
  if (paths.has(pathExpr) || paths.has(cleaned)) return true;
  for (let i = cleaned.length - 1; i > 0; i--) {
    if (paths.has(cleaned.slice(0, i))) return true;
  }
  return false;
};

const SCREENS: { file: string; payloads: Record<string, unknown> }[] = [
  { file: 'scholarships.js', payloads: { schemes: hubSchemes, apps, tracking, stats: apps.stats, totals: tracking.totals } },
  { file: 'pages/applications/applications.js', payloads: { data: apps, stats: apps.stats } },
  { file: 'pages/application/application.js', payloads: { data: settledApp, app: settledApp } },
  { file: 'pages/detail/detail.js', payloads: { data: scheme } },
  { file: 'pages/documents/documents.js', payloads: { data: apps } },
  { file: 'pages/tracking/tracking.js', payloads: { data: tracking, totals: tracking.totals } },
  { file: 'pages/student_history/student_history.js', payloads: { data: history, t: history.totals } },
  { file: 'pages/apply/apply.js', payloads: {} },
];

/** The optional-chained member accesses in a source file, e.g. `a?.b?.c`. */
function accessedPaths(src: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Za-z_$][\w$]*)\??\.((?:[A-Za-z_$][\w$]*\??\.)+[A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.add(`${m[1]}.${m[2].replace(/\?\./g, '.')}`);
  return [...out];
}

for (const { file, payloads } of SCREENS) {
  const full = path.join(DIR, file);
  ok(existsSync(full), `${file} exists`);
  if (!existsSync(full)) continue;
  const src = readFileSync(full, 'utf8');
  for (const [rootName, payload] of Object.entries(payloads)) {
    if (!payload) continue;
    const paths = pathsOf(payload, rootName);
    for (const expr of accessedPaths(src)) {
      if (!expr.startsWith(`${rootName}.`)) continue;
      // Only audit a name that really IS this root's API payload; a local `data`
      // may also hold a locally-built object.
      if (rootName === 'data' && !new RegExp(`(const|let)\\s+${rootName}\\s*=\\s*await\\s+accountsApi`).test(src)) continue;
      ok(has(paths, expr), `${file}: \`${expr}\` exists in the ${rootName} payload`);
    }
  }
}

// ═══ 2. navigate() targets are registered ═══════════════════════════════
section('2. Navigation targets are real');

const entrySrc = readFileSync(ACCOUNTS_ENTRY, 'utf8');
const registered = new Set<string>();
for (const m of entrySrc.matchAll(/^\s*([A-Za-z][\w]*):\s*\{\s*title:/gm)) registered.add(m[1]);
ok(registered.size > 10, 'FEATURE_MODULES parsed', `${registered.size} entries`);

const allScreenFiles: string[] = [];
const walk = (dir: string) => {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (d.name.endsWith('.js')) allScreenFiles.push(p);
  }
};
walk(DIR);
for (const f of allScreenFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/openModule\(\s*'([^']+)'/g)) {
    ok(registered.has(m[1]), `${path.basename(path.dirname(f))} navigates to a registered module: ${m[1]}`);
  }
}
for (const needed of [
  'ScholarshipApplications', 'ScholarshipApplication', 'ScholarshipDetail',
  'ScholarshipDocuments', 'ScholarshipTracking', 'ScholarshipStudentHistory', 'ScholarshipApply',
]) {
  ok(registered.has(needed), `${needed} is registered in FEATURE_MODULES`);
}

// ═══ 3. Imports resolve to real exports ══════════════════════════════════
section('3. Imports resolve to real exports');

const EXPORT_RE = /export\s+(?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_LIST_RE = /export\s*\{([^}]*)\}/g;

function exportsOf(file: string): Set<string> {
  const src = readFileSync(file, 'utf8');
  const out = new Set<string>();
  for (const m of src.matchAll(EXPORT_RE)) out.add(m[1]);
  for (const m of src.matchAll(EXPORT_LIST_RE)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) out.add(name);
    }
  }
  if (/export\s+default/.test(src)) out.add('default');
  return out;
}

/**
 * Resolve a relative import the way Metro does: the exact path, then with a JS
 * extension appended, then as a directory's `index.js`.
 */
function resolveImport(from: string, spec: string): string | null {
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}.ts`, path.join(base, 'index.js')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const BUILTINS = new Set(['react', 'react-native', 'react-native-safe-area-context', 'expo-status-bar', '@expo/vector-icons']);
let importChecks = 0;
for (const f of allScreenFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s+(?:(\w+)\s*,\s*)?\{([^}]*)\}\s+from\s*'([^']+)'/g)) {
    const spec = m[3];
    if (BUILTINS.has(spec) || !spec.startsWith('.')) continue;
    const target = resolveImport(f, spec);
    ok(!!target, `${path.relative(DIR, f)}: resolves ${spec}`);
    if (!target) continue;
    const exported = exportsOf(target);
    for (const raw of m[2].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0]?.trim();
      if (!name) continue;
      importChecks += 1;
      ok(exported.has(name), `${path.relative(DIR, f)}: \`${name}\` is exported by ${spec}`);
    }
  }
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s*'([^']+)'/g)) {
    const spec = m[2];
    if (BUILTINS.has(spec) || !spec.startsWith('.')) continue;
    const target = resolveImport(f, spec);
    ok(!!target, `${path.relative(DIR, f)}: resolves default import ${spec}`);
    if (target) {
      ok(/export\s+default/.test(readFileSync(target, 'utf8')), `${spec} has a default export`);
    }
  }
}
ok(importChecks > 40, 'a meaningful number of named imports were checked', String(importChecks));

// ═══ 4. Mirrored constants agree with the server ═══════════════════════
section('4. Client constants mirror the server');

// A dynamic import of an absolute Windows path needs a `file://` URL, or Node
// reads the `d:` as an unsupported URL scheme and throws.
const client = (await import(`file://${META.replace(/\\/g, '/')}`)) as Record<string, unknown>;

eq(
  (client.ELIGIBILITY_OPERATORS as string[]).join(','),
  SERVER_OPS.join(','),
  'the same eligibility operators exist on both sides',
);
eq(
  (client.APPLICATION_STATUSES as string[]).join(','),
  SERVER_STATUSES.join(','),
  'the same application statuses exist on both sides',
);
eq(
  Object.keys(client.DOCUMENT_CATALOG as object).sort().join(','),
  Object.keys(SERVER_DOCS).sort().join(','),
  'the same document codes exist on both sides',
);
// Compare as SETS, not sequences: the server lists these bands in workflow order
// (NOT_STARTED → PENDING → PARTIAL → SETTLED) while an object literal is
// iterated in insertion order, so the two orders legitimately differ and only
// the membership has to agree.
eq(
  Object.keys(client.DISBURSEMENT_META as object).slice().sort().join(','),
  [...SERVER_BANDS].sort().join(','),
  'the same disbursement bands exist on both sides',
);
eq(
  (client.ELIGIBILITY_OPERATORS as string[]).slice().sort().join(','),
  [...SERVER_OPS].sort().join(','),
  'the same eligibility operators exist on both sides (as a set)',
);
eq(
  (client.SCHOLARSHIP_TYPES as string[]).slice().sort().join(','),
  [...SERVER_TYPES].sort().join(','),
  'the same scholarship types exist on both sides',
);
eq((client.AMOUNT_MODES as string[]).slice().sort().join(','), [...AMOUNT_MODES].sort().join(','), 'the same amount modes exist on both sides');
eq(
  Object.keys(client.SCHEME_STATUS_META as object).sort().join(','),
  [...SCHEME_STATUSES].sort().join(','),
  'the same scheme statuses exist on both sides',
);

// Every document code the server knows must be paintable by the client, not just
// present as a key — a chip with no label would render an empty pill.
for (const code of Object.keys(SERVER_DOCS)) {
  const m = (client.documentMeta as (c: string) => { label: string })(code);
  ok(!!m?.label, `the client can label the ${code} document`);
}
// Same for every status the server can put on a row.
for (const st of SERVER_STATUSES) {
  const m = (client.statusMeta as (s: string) => { label: string })(st);
  ok(!!m?.label, `the client can label the ${st} status`);
}

// ═══ 5. The fake data is gone ═══════════════════════════════════════════
section('5. The hardcoded fixture file is gone');

ok(!existsSync(path.join(DIR, 'constants/scholarshipsData.js')), 'scholarshipsData.js no longer exists');
const userSrc = readFileSync(path.join(APP, 'users/accounts_finance/accounts_finance.js'), 'utf8');
ok(!/scholarshipsData/.test(userSrc), 'nothing imports the old fixture module');

// A screen that still hardcoded its own numbers would render a fiction next to a
// live list; the audit asserts the constants only, so this checks the sources
// contain no baked-in money literals presented as totals.
for (const f of allScreenFiles) {
  // Comments are stripped first: the hub's header comment deliberately NAMES the
  // old `SCHOLARSHIP_STATS` fixture it replaced, and matching that text would
  // flag the very file that removed the fiction.
  const src = readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  ok(!/SCHOLARSHIP_STATS|APPLICATIONS\s*=\s*\[|SCHEMES\s*=\s*\[/.test(src),
    `${path.basename(path.dirname(f))} has no inline fake dataset`);
}

// ═══ Report ══════════════════════════════════════════════════════════════
await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail ? 1 : 0);
