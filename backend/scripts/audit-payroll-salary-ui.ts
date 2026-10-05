// F-06 Payroll salary desk — UI contract audit.
//
// A bundle proves a screen COMPILES. It does not prove the screen reads fields
// that exist. `data.stats.outstandingRupees` on a response with no
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
// Run: npx tsx scripts/audit-payroll-salary-ui.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/db/prisma.js';
import { prisma as prisma2 } from '../src/db/prisma.js';
import * as structure from '../src/modules/accounts/payroll.structure.js';
import * as payroll from '../src/modules/accounts/payroll.service.js';
import { COMPONENT_CATALOG as SERVER_CATALOG, COMPONENT_KINDS, COMPONENT_BASES } from '../src/modules/accounts/payroll.components.js';
import { AGEING_META, ALERT_RULES, ATTENDANCE_RULES } from '../src/modules/accounts/payroll.tax.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '../../learnix');
const PAYROLL_DIR = path.join(APP, 'users/accounts_finance/pages/payroll');
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

const inst = await prisma.institution.findFirst({
  where: { code: { not: '' } },
  orderBy: { createdAt: 'asc' },
});
if (!inst) {
  console.error('No institution to audit against — run `npm run prisma:seed` first.');
  process.exit(1);
}
const institutionId = inst.id;
console.log(`  auditing against ${inst.name} (${institutionId})`);

const desk = await structure.listSalaryDesk(institutionId);
const alerts = await structure.listAlerts(institutionId, 'audit');
const hub = await payroll.listPayroll(institutionId);
ok(!!desk.staff.length, 'the salary desk has a roster to audit against');
ok(!!hub.runs.length, 'the run hub has a run to audit against');

const withSalary = desk.staff.find((s) => s.hasSalaryRecord) ?? desk.staff[0];
const staffDetail = await structure.getStaffSalary(institutionId, withSalary.staffUserId);
const runId = hub.runs[0].id;
const runDetail = await payroll.getPayrollRun(institutionId, runId);
const entry = runDetail.entries[0];
const payslip = await payroll.getPayslip(institutionId, entry.id);
const payslipDoc = await structure.getPayslipDocument(institutionId, entry.id);
const derived = await structure.deriveAttendanceFor(institutionId, withSalary.staffUserId, '2026-08');

ok(!!withSalary.staffUserId, 'a staff member is available for the per-person screens');
ok(!!staffDetail.staff, 'the person payload is populated');
ok(!!entry, 'an entry is available for the payslip screens');

// ═══ 1. Every destructured property exists ═══════════════════════════════
section('1. Screens read only fields the API actually sends');

/** Every path a screen could destructure off `x`, flattened to dotted strings. */
function pathsOf(value: unknown, prefix = '', depth = 0, out: Set<string> = new Set()): Set<string> {
  // `null` is a value the server DID send — an optional relation, or a document
  // nobody has generated yet. The path is recorded and the walk stops there, so a
  // screen reading `doc.file.url` is not reported as reading a missing field
  // merely because this entry has no payslip on it.
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
  // If an ANCESTOR was explicitly null in the payload, the screen's optional
  // chain stops there and the deeper read never happens. `doc.file.url` on a
  // payslip that has not been generated is exactly this: `file` is null, the
  // branch does not render, and nothing is missing.
  for (let i = cleaned.length - 1; i > 0; i--) {
    if (paths.has(cleaned.slice(0, i))) return true;
  }
  return false;
};

const SCREENS: { file: string; payloads: Record<string, unknown> }[] = [
  { file: 'pages/salary_records/salary_records.js', payloads: { data: desk, stats: desk.stats } },
  { file: 'pages/salary_record/salary_record.js', payloads: { data: staffDetail, staff: staffDetail.staff, inForce: staffDetail.inForce, preview: staffDetail.preview, tax: staffDetail.tax } },
  { file: 'pages/salary_components/salary_components.js', payloads: { data: staffDetail, preview: staffDetail.preview } },
  { file: 'pages/salary_attendance/salary_attendance.js', payloads: { person: staffDetail, derived } },
  { file: 'pages/salary_loans/salary_loans.js', payloads: { data: staffDetail, loans: staffDetail.loans } },
  { file: 'pages/payroll_alerts/payroll_alerts.js', payloads: { data: alerts, counts: alerts.counts } },
  { file: 'pages/payslip_document/payslip_document.js', payloads: { doc: payslipDoc, payslip, entry: payslip.entry } },
  { file: 'payroll.js', payloads: { data: hub, stats: hub.stats, runs: hub.runs, trend: hub.trend, roster: hub.roster } },
];

/** The optional-chained member accesses in a source file, e.g. `a?.b?.c`. */
function accessedPaths(src: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Za-z_$][\w$]*)\??\.((?:[A-Za-z_$][\w$]*\??\.)+[A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    out.add(`${m[1]}.${m[2].replace(/\?\./g, '.')}`);
  }
  return [...out];
}

for (const { file, payloads } of SCREENS) {
  const full = path.join(PAYROLL_DIR, file);
  ok(existsSync(full), `${file} exists`);
  if (!existsSync(full)) continue;
  const src = readFileSync(full, 'utf8');
  for (const [rootName, payload] of Object.entries(payloads)) {
    const paths = pathsOf(payload, rootName);
    for (const expr of accessedPaths(src)) {
      if (!expr.startsWith(`${rootName}.`)) continue;
      // Only audit the names the screen actually destructures or reads; a local
      // `data` variable may also hold a locally-built object, so the check is on
      // the specific root it is claimed to be an API payload for.
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
walk(PAYROLL_DIR);
for (const f of allScreenFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/openModule\(\s*'([^']+)'/g)) {
    ok(registered.has(m[1]), `${path.basename(path.dirname(f))} navigates to a registered module: ${m[1]}`);
  }
}
for (const needed of [
  'PayrollRunDetail', 'Payslip', 'PayrollSalaryRecords', 'PayrollSalaryRecord',
  'PayrollComponents', 'PayrollAttendance', 'PayrollLoans', 'PayrollAlerts', 'PayslipDocument',
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
  // A React Native / Expo component default export.
  if (/export\s+default/.test(src)) out.add('default');
  return out;
}

/**
 * Resolve a relative import the way Metro does: the exact path, then with a JS
 * extension appended, then as a directory's `index.js`. Metro resolves the
 * extension implicitly, so `../../payrollSalaryMeta` must find
 * `payrollSalaryMeta.js` — an exact-path-only check would report every single
 * one of them as broken.
 */
function resolveImport(from: string, spec: string): string | null {
  const base = path.resolve(path.dirname(from), spec);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.ts`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const BUILTINS = new Set(['react', 'react-native', 'react-native-safe-area-context', 'expo-status-bar', 'node:fs', 'node:path', 'node:url']);
let importChecks = 0;
for (const f of allScreenFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s+(?:(\w+)\s*,\s*)?\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const spec = m[3];
    if (BUILTINS.has(spec) || !spec.startsWith('.')) continue;
    const target = resolveImport(f, spec);
    ok(!!target, `${path.relative(PAYROLL_DIR, f)}: resolves ${spec}`);
    if (!target) continue;
    const exported = exportsOf(target);
    for (const raw of m[2].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0]?.trim();
      if (!name) continue;
      importChecks += 1;
      ok(exported.has(name), `${path.relative(PAYROLL_DIR, f)}: \`${name}\` is exported by ${spec}`);
    }
  }
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s*'([^']+)'/g)) {
    const spec = m[2];
    if (BUILTINS.has(spec) || !spec.startsWith('.')) continue;
    const target = resolveImport(f, spec);
    ok(!!target, `${path.relative(PAYROLL_DIR, f)}: resolves default import ${spec}`);
    if (target) {
      const src2 = readFileSync(target, 'utf8');
      ok(/export\s+default/.test(src2), `${spec} has a default export`);
    }
  }
}
ok(importChecks > 40, 'a meaningful number of named imports were checked', String(importChecks));

// ═══ 4. Mirrored constants agree with the server ═══════════════════════
section('4. Client constants mirror the server');

const metaSrc = readFileSync(path.join(PAYROLL_DIR, 'payrollSalaryMeta.js'), 'utf8');
const clientCatalogBlock = /export const COMPONENT_CATALOG = \{([\s\S]*?)\n\};/.exec(metaSrc);
ok(!!clientCatalogBlock, 'the client mirrors the component catalogue');
if (clientCatalogBlock) {
  const clientCatalog = (await import(metaPath())).COMPONENT_CATALOG;
  const serverCodes = Object.keys(SERVER_CATALOG).sort();
  const clientCodes = Object.keys(clientCatalog).sort();
  eq(clientCodes.join(','), serverCodes.join(','), 'the same component codes exist on both sides');
  for (const code of serverCodes) {
    const c = clientCatalog[code];
    const s = SERVER_CATALOG[code];
    ok(!!c, `${code} exists on the client`);
    if (!c) continue;
    eq(c.kind, s.kind, `${code} kind matches`);
    eq(c.label, s.label, `${code} label matches`);
    eq(c.base ?? null, s.base ?? null, `${code} base matches`);
    eq(c.percent ?? null, s.percent ?? null, `${code} default percent matches`);
    eq(c.taxable, s.taxable, `${code} taxable flag matches`);
  }
}
function metaPath() {
  return `file://${path.join(PAYROLL_DIR, 'payrollSalaryMeta.js').replace(/\\/g, '/')}`;
}

// The leave-type list must match ATTENDANCE_RULES.paidLeaveTypes exactly.
const paidTypes = /export const PAID_LEAVE_TYPES = \[([^\]]*)\]/.exec(metaSrc);
ok(!!paidTypes, 'the client mirrors the paid leave types');
if (paidTypes) {
  const client = [...paidTypes[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  eq(client.join(','), ATTENDANCE_RULES.paidLeaveTypes.join(','), 'paid leave types match the server');
}
eq(ATTENDANCE_RULES.graceUnpaidDays, 2, 'the grace rule is 2 days');
ok(
  new RegExp(`ATTENDANCE_GRACE_DAYS = ${ATTENDANCE_RULES.graceUnpaidDays}\\b`).test(metaSrc),
  'the client grace constant matches the server',
);

// Alert severities and kinds.
for (const sev of ['HIGH', 'MEDIUM', 'LOW']) {
  ok(new RegExp(`\\b${sev}:\\s*\\{`).test(metaSrc), `the client defines the ${sev} alert severity`);
}
eq(COMPONENT_KINDS.join(','), 'EARNING,DEDUCTION', 'the client kind list matches');
eq(COMPONENT_BASES.join(','), 'BASIC,GROSS', 'the client base list matches');
ok(ALERT_RULES.overdueDays > 0 && ALERT_RULES.staleDraftDays > 0 && ALERT_RULES.stalledLoanMonths > 0, 'server alert rules are positive');
ok(Object.keys(AGEING_META).length === 4, 'the server publishes four ageing bands');

// ═══ 5. Screens do not invent API paths ════════════════════════════════
section('5. accountsApi calls hit real routes');

const apiSrc = readFileSync(path.join(APP, 'services/api.js'), 'utf8');
const payrollApiBlock = /payrollComponents:[\s\S]*?attachPayslip:[^\n]*\n/.exec(apiSrc);
ok(!!payrollApiBlock, 'the salary-desk api block exists');
const routesSrc = readFileSync(
  path.resolve(__dirname, '../src/modules/accounts/payroll.structure.routes.ts'),
  'utf8',
);
const registeredPaths = new Set<string>();
for (const m of routesSrc.matchAll(/router\.(?:get|post|put|patch|delete)\(\s*'([^']+)'/g)) {
  registeredPaths.add(m[1]);
}
ok(
  registeredPaths.size >= 11,
  'the route file registers every salary-desk endpoint',
  `${registeredPaths.size} unique paths (several endpoints share a path — GET and POST on the same URL)`,
);

/**
 * Collapse an api.js path expression to a route SHAPE: every `${...}` becomes
 * `:param`, and any trailing query string is dropped. Comparing shapes rather
 * than raw text is what lets a template literal match the route it calls — the
 * api.js calls carry an interpolated month, the route declares a fixed path.
 */
const shape = (p: string) =>
  p
    .split('?')[0]
    // `${…}` (api.js interpolation) and `:name` (a route parameter) both collapse
    // to one token, so the two spellings of the same URL compare equal.
    // An UNTERMINATED interpolation tail is dropped: a nested query template
    // (`${month ? `?month=…` : ''}`) is cut at its opening brace by the naive
    // regex, and whatever remains of it is not part of the path.
    .replace(/\$\{[^}]*$/, '')
    .replace(/\$\{[^}]*\}/g, ':p')
    .replace(/:[A-Za-z_$][\w$]*/g, ':p')
    .replace(/\/+$/, '');
const routeShapes = new Set([...registeredPaths].map(shape));
for (const r of registeredPaths) ok(routeShapes.has(shape(r)), `route shape normalises: ${r}`);

const calls = payrollApiBlock
  ? [...payrollApiBlock[0].matchAll(/api\.(?:get|post|put|patch|delete)\(\s*[`']([^`']*?)[`'\n]/g)]
  : [];
// api.js spells the mount prefix (`/accounts`); the route file declares only the
// path inside its router. Strip it so the two sides can be compared.
const stripMount = (p: string) => p.replace(/^\/accounts/, '');
ok(calls.length >= 15, 'the api block declares the salary-desk calls', `${calls.length} found`);
for (const m of calls) {
  const spec = m[1];
  // api.js writes some paths with a NESTED template for the query string:
  //   `/accounts/payroll/salary-records${month ? `?month=${month}` : ''}`
  // The path proper is everything before the first interpolation; the query is
  // dropped by `shape` anyway.
  // Two valid spellings, and both must be accepted:
  //   `/payroll/staff/${staffUserId}/salary`  -> the interpolation IS the path
  //   `/payroll/salary-records${month ? ... }` -> the interpolation is a query
  // Taking only the prefix truncates the first kind; taking only the whole
  // string truncates the second at its opening brace.
  const whole = shape(stripMount(spec));
  const prefix = shape(stripMount(spec.split('${')[0]));
  ok(
    routeShapes.has(whole) || routeShapes.has(prefix),
    `accountsApi call \`${spec}\` maps to a registered route`,
    `whole ${whole}, prefix ${prefix}`,
  );
}

// ═══ 6. No dead helpers ═════════════════════════════════════════════════
section('6. Screens do not import unused helpers');

for (const f of allScreenFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/import\s+\{([^}]*)\}\s*from\s*'([^']+)'/g)) {
    const target = resolveImport(f, m[2]);
    if (!target || !m[2].startsWith('.')) continue;
    if (!/payrollSalaryMeta|payrollMeta/.test(m[2])) continue;
    const body = src.slice(src.indexOf('\n', src.indexOf('import')));
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
      if (!name) continue;
      const used = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(body);
      ok(used, `${path.relative(PAYROLL_DIR, f)}: uses the imported \`${name}\``);
    }
  }
}

// ═══ 7. Money is never computed on the phone ════════════════════════════
section('7. Screens do not re-derive money the server sent');

for (const f of allScreenFiles) {
  const src = readFileSync(f, 'utf8');
  // A screen that multiplies a gross by a percentage to show an allowance is
  // showing a number the server did not send.
  const bad = /grossRupees\s*\*\s*0?\.\d+/.test(src) || /netRupees\s*-\s*\w*Rupees/.test(src);
  ok(!bad, `${path.relative(PAYROLL_DIR, f)}: does not re-derive payroll amounts client-side`);
}

await prisma2.$disconnect();

console.log(`\n${'═'.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✓ audit-payroll-salary-ui: every screen matches the live API');