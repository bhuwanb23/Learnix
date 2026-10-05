// F-09 Reports — UI contract audit.
//
// A bundle proves a screen COMPILES. It does not prove the screen reads fields
// that exist. `data.totals.outstandingRupees` on a response that calls it
// something else renders `undefined` on a phone and looks fine in a build; an
// import of a name a module does not export throws only at first call. This
// audit checks every screen against a LIVE service response rather than a type.
//
// What it verifies:
//   1. every property each screen reads off an API response exists in it
//   2. every `navigation.openModule` target is registered in FEATURE_MODULES
//   3. REACHABILITY — every registered report screen is actually opened by
//      something, which is how the scheme editor and document upload survived
//      a "complete" report in F-08
//   4. every documented sub-feature has BOTH a route and the implementation
//      behind it
//   5. every relative import resolves to a real file and a real named export
//   6. client constants that MIRROR server constants actually match
//   7. the fake fixture module is gone and the leaky legacy endpoint with it
//
// Run: npx tsx scripts/audit-reports-ui.ts
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../src/db/prisma.js';
import * as svc from '../src/modules/accounts/reports.service.js';
import { REPORTS as SERVER_REPORTS } from '../src/modules/accounts/reports.routes.js';
import { PERIODS, PERIOD_META } from '../src/modules/accounts/reports.rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '../../learnix');
const DIR = path.join(APP, 'users/accounts_finance/pages/reports');
const META = path.join(DIR, 'reportsMeta.js');
const UI = path.join(DIR, 'reportsUi.js');
const ACCOUNTS_ENTRY = path.join(APP, 'users/accounts_finance/accounts_finance.js');
const API_FILE = path.join(APP, 'services/api.js');

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
section('0. Live service fixtures');

const inst = await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } });
if (!inst) {
  console.error('No institution to audit against — run `npm run prisma:seed` first.');
  process.exit(1);
}
const institutionId = inst.id;
console.log(`  auditing against ${inst.name} (${institutionId})`);

const overview = await svc.reportsOverview(institutionId, 'ALL');
const catalogue = await svc.reportCatalogue();
const payloads: Record<string, unknown> = {
  collections: await svc.collectionsReport(institutionId, 'ALL'),
  dues: await svc.duesReport(institutionId, 'ALL'),
  expenses: await svc.expensesReport(institutionId, 'ALL'),
  payroll: await svc.payrollReport(institutionId, 'ALL'),
  scholarships: await svc.scholarshipsReport(institutionId, 'ALL'),
  departments: await svc.departmentsReport(institutionId, 'ALL'),
  comparison: await svc.comparisonReport(institutionId, 'MONTH'),
};
ok(Object.keys(payloads).length === 7, 'all seven reports produced a payload');
console.log(
  `  collected ${overview.headline.collectedRupees}, outstanding ${overview.headline.outstandingRupees}, ` +
  `${catalogue.reports.length} reports catalogued`,
);

// The export response is the one payload no service function hands back — the
// route assembles it. Rebuilding it here from the same expressions would check
// nothing, so the shape is taken from the route source and every field the
// ExportBar reads must appear in it.
const routeSrc = readFileSync(path.resolve(__dirname, '../src/modules/accounts/reports.routes.ts'), 'utf8');

// Comments are stripped before any source pattern is tested. Several of these
// files quote the exact string another assertion is looking for — in an
// explanatory comment, to say why it matters — and a regex that matches its own
// documentation is a test that passes for the wrong reason.
const stripJsComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const client = (await import(`file://${META.replace(/\\/g, '/')}`)) as Record<string, unknown>;
const reportScreen = client.reportScreen as (id: string) => string;

// ═══ 1. Screens read only fields the API actually sends ═════════════════
section('1. Screens read only fields the API sends');

/** Every path a screen could read off `x`, flattened to dotted strings. */
function pathsOf(value: unknown, prefix = '', depth = 0, out: Set<string> = new Set()): Set<string> {
  // `null` is a value the server DID send — an uncapped fund, a month with no
  // prior. The path is recorded and the walk stops, so a screen reading
  // `s.headroomRupees` on an uncapped scheme is not flagged merely because this
  // row happens to have no budget.
  if (value === null) {
    out.add(prefix);
    return out;
  }
  if (depth > 5 || value === undefined) return out;
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

const JS_METHODS = new Set([
  'map', 'filter', 'reduce', 'forEach', 'find', 'findIndex', 'some', 'every', 'slice',
  'splice', 'sort', 'flat', 'flatMap', 'concat', 'join', 'includes', 'indexOf',
  'length', 'push', 'pop', 'shift', 'toString', 'trim', 'trimStart', 'trimEnd',
  'split', 'replace', 'replaceAll', 'toFixed', 'padStart', 'padEnd', 'charAt',
  'startsWith', 'endsWith', 'keys', 'values', 'entries', 'flatMap',
]);

const has = (paths: Set<string>, expr: string): boolean => {
  const segments = expr.replace(/\?\./g, '.').split('.');
  while (segments.length > 1 && JS_METHODS.has(segments[segments.length - 1])) segments.pop();
  const cleaned = segments.join('.');
  if (paths.has(expr) || paths.has(cleaned)) return true;
  // An ANCESTOR of a real path is a real read too: `overview.data` on its own is
  // the response object being handed to a child component as a prop. Without
  // this the parent of every payload would read as a missing field.
  //
  // Deliberately NOT the other way round. A "strip trailing segments until
  // something matches" fallback made EVERY read under a real object pass, so
  // `data.totals.lifetimeOutstandingRupees` — a field the server has never sent —
  // checked out clean. A wrong deep field is exactly the bug this audit exists
  // to catch, and it has to be able to fail.
  const prefix = `${cleaned}.`;
  for (const p of paths) if (p.startsWith(prefix)) return true;
  return false;
};

/**
 * Optional-chained member accesses in a source file, e.g. `a?.b?.c`.
 * The trailing group is `(?:...\??\.)*` — zero-or-more, not one-or-more.
 * Requiring two segments meant single-level reads like `data?.totals` were
 * never collected, which is most of what these screens do.
 */
function accessedPaths(src: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Za-z_$][\w$]*)\??\.((?:[A-Za-z_$][\w$]*\??\.)*[A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.add(`${m[1]}.${m[2].replace(/\?\./g, '.')}`);
  return [...out];
}

/**
 * Is `name` in this screen bound to something the API actually returned?
 *
 * The reports screens reach the API through a local `useReport(() =>
 * accountsApi.x())` hook rather than a bare `await` in an effect, so the gate
 * has to recognise that shape too — otherwise every screen silently audits
 * zero fields and the report looks green for the wrong reason.
 */
function boundToApi(src: string, name: string): boolean {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  // `const { data, loading, ... } = useReport(`
  for (const m of src.matchAll(/const\s*\{([^}]*)\}\s*=\s*useReport\w*\(/g)) {
    if (m[1].split(',').map((s) => s.trim().split(':')[0].trim()).includes(name)) return true;
  }
  if (new RegExp(`(const|let)\\s+${name}\\s*=\\s*await\\s+accountsApi`).test(src)) return true;
  if (new RegExp(`set${cap}\\(\\s*await\\s+accountsApi`).test(src)) return true;
  for (const m of src.matchAll(/const\s*\[([^\]]+)\]\s*=\s*await\s+Promise\.all\(/g)) {
    const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    if (names.includes(name)) return true;
    if (names.some((n) => new RegExp(`set${cap}\\(\\s*${n}\\b`).test(src))) return true;
  }
  // The hub's own hook: `const overview = useReportOverview(period, ...)`, whose
  // body is `setData(await accountsApi.reportOverview(...))`.
  if (new RegExp(`(const|let)\\s+${name}\\s*=\\s*useReport\\w*\\(`).test(src)) return true;
  return false;
}

/**
 * The state a report hook returns. A read of one of these is NOT a payload
 * field, so it must not be checked against a response — and must be checked
 * against the hook instead, or the hub would render a control wired to nothing.
 */
const HOOK_FIELDS = new Set(['loading', 'refreshing', 'error', 'reload', 'onRefresh']);

const SCREENS: { file: string; payload: unknown; root: string; rootPrefix?: string }[] = [
  // The hub is the awkward one: `overview` is a HOOK, so `overview.loading` and
  // `overview.onRefresh` are state, while `overview.data.headline` is the
  // response and `overview.collections` is that same response handed to a child
  // as a prop. It gets its own pass below rather than pretending all three
  // shapes are one.
  { file: 'reports.js', payload: overview, root: 'overview', rootPrefix: 'overview.data' },
  { file: 'pages/collections/collections.js', payload: payloads.collections, root: 'data' },
  { file: 'pages/dues/dues.js', payload: payloads.dues, root: 'data' },
  { file: 'pages/expenses/expenses.js', payload: payloads.expenses, root: 'data' },
  { file: 'pages/payroll/payroll.js', payload: payloads.payroll, root: 'data' },
  { file: 'pages/scholarships/scholarships.js', payload: payloads.scholarships, root: 'data' },
  { file: 'pages/departments/departments.js', payload: payloads.departments, root: 'data' },
  { file: 'pages/comparison/comparison.js', payload: payloads.comparison, root: 'data' },
];

let fieldChecks = 0;
for (const { file, payload, root, rootPrefix } of SCREENS) {
  const full = path.join(DIR, file);
  ok(existsSync(full), `${file} exists`);
  if (!existsSync(full) || !payload) continue;
  const src = readFileSync(full, 'utf8');
  ok(boundToApi(src, root), `${file}: \`${root}\` is bound to an accountsApi response`);

  const paths = pathsOf(payload, root);
  const prefix = rootPrefix ?? root;
  let perScreen = 0;
  for (const expr of accessedPaths(src)) {
    // A prefixed read (`overview.data.x`) resolves against the prefixed tree; a
    // bare one (`overview.x`) resolves against the payload as a whole, because
    // that is the prop the child components receive.
    const matches = expr.startsWith(`${prefix}.`) || expr === prefix
      ? [[prefix, expr]]
      : prefix !== root && (expr.startsWith(`${root}.`) || expr === root)
        ? [[root, expr]]
        : [];
    if (!matches.length) continue;
    const [tree, e] = matches[0];
    // The hub also reads `overview.loading` etc., which are hook state, not
    // response — those are asserted against the hook's contract further down.
    if (prefix !== root && !expr.startsWith(`${prefix}.`) && HOOK_FIELDS.has(expr.slice(root.length + 1))) continue;
    fieldChecks += 1;
    perScreen += 1;
    ok(has(tree === root ? paths : pathsOf(payload, tree), e),
      `${file}: \`${e}\` exists in the live ${root} payload`);
  }
  ok(perScreen > 0, `${file}: contributes payload field reads to the audit`, String(perScreen));

  // The strongest form of the same check: every top-level key a screen pulls off
  // the payload with `data?.<key> ?? {}` must exist on the real response.
  for (const m of src.matchAll(/data\?\.([A-Za-z_$][\w$]*)/g)) {
    ok(
      Object.prototype.hasOwnProperty.call(payload as object, m[1]),
      `${file}: top-level \`${m[1]}\` is really sent`,
    );
  }
}

// The hub's non-payload reads are the hook's own return value. If `useReport`
// stopped returning `onRefresh`, the hub would render a pull-to-refresh control
// that calls undefined — so the hook's contract is asserted against its use.
{
  const uiSrc = readFileSync(UI, 'utf8');
  const hookBody = /export function useReport[\s\S]*?return \{([^}]*)\}/.exec(uiSrc)?.[1] ?? '';
  const returned = new Set(
    hookBody.split(',').map((s) => s.trim().split(':')[0].trim()).filter(Boolean),
  );
  ok(returned.size > 0, 'useReport returns a state object', String([...returned].join(', ')));
  const hubSrc = readFileSync(path.join(DIR, 'reports.js'), 'utf8');
  // Only the hook's own fields are asserted here. `overview.collections` and
  // friends are the PAYLOAD passed down to a child as a prop, and they are
  // already validated against a live response in section 1.
  for (const m of hubSrc.matchAll(/\boverview\.([A-Za-z_$][\w$]*)/g)) {
    if (m[1] !== 'data' && !HOOK_FIELDS.has(m[1])) continue;
    ok(returned.has(m[1]), `the hub reads overview.${m[1]}, which useReport really returns`);
  }
  for (const field of HOOK_FIELDS) {
    ok(returned.has(field), `useReport returns \`${field}\``);
  }
}
ok(fieldChecks > 20, 'a meaningful number of payload field reads were checked', String(fieldChecks));

// The ExportBar is the one component whose payload is assembled by the route.
{
  const src = readFileSync(UI, 'utf8');
  const reads = [...new Set([...src.matchAll(/\b(res|exported)\??\.([A-Za-z_$][\w$]*)/g)]
    .map((m) => m[2]))];
  ok(reads.length > 0, 'the export bar reads fields off the export response', String(reads.length));
  for (const field of reads) {
    ok(new RegExp(`\\b${field}\\s*[:,]`).test(routeSrc),
      `the export route really returns \`${field}\` — the screen reads something real`);
  }
}

// ═══ 2. Navigation targets are real ═════════════════════════════════════
section('2. Navigation targets are real');

const entrySrc = readFileSync(ACCOUNTS_ENTRY, 'utf8');
const registered = new Set<string>();
for (const m of entrySrc.matchAll(/^\s*([A-Za-z][\w]*):\s*\{\s*title:/gm)) registered.add(m[1]);
ok(registered.size > 10, 'FEATURE_MODULES parsed', `${registered.size} entries`);

const screenFiles: string[] = [];
const walk = (dir: string) => {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (d.name.endsWith('.js')) screenFiles.push(p);
  }
};
walk(DIR);

for (const f of screenFiles) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/openModule\(\s*'([^']+)'/g)) {
    ok(registered.has(m[1]), `${path.basename(f)} navigates to a registered module: ${m[1]}`);
  }
}
for (const needed of ['Reports', ...SERVER_REPORTS.map((id) => reportScreen(id))]) {
  ok(registered.has(needed), `${needed} is registered in FEATURE_MODULES`);
}

// ═══ 3. Reachability ════════════════════════════════════════════════════
section('3. Every report screen is reachable, not just registered');

// Registration is not reachability. A screen registered in FEATURE_MODULES but
// opened by nothing is code the user can never reach — which is exactly how the
// scheme editor, document upload and reversal survived a "complete" F-08
// report: all three were built, tested and registered, with no entry point.
//
// The reports hub opens its screens DYNAMICALLY (`openModule(reportScreen(id))`)
// because the list comes from the server, so a literal `openModule('ReportX')`
// scan would find nothing and pass for the wrong reason. The argument is instead
// closed in three steps: the hub really calls openModule with a computed key,
// every server report id maps to exactly one key, and every key is registered.
{
  const hubSrc = readFileSync(path.join(DIR, 'reports.js'), 'utf8');
  ok(/openModule\(\s*reportScreen\(/m.test(hubSrc),
    'the hub opens its report screens through reportScreen(), not a hardcoded list');

  const screens = client.REPORT_SCREENS as Record<string, string>;
  const ids = client.REPORT_IDS as string[];
  eq(Object.keys(screens).length, ids.length, 'every report id maps to a screen key');
  for (const id of ids) {
    const key = reportScreen(id);
    eq(screens[key], id, `${id} maps to ${key}`);
    ok(registered.has(key), `${key} is registered, so the computed key resolves to a component`);
    // The registered entry must point at a file that exists and exports a
    // component — a key wired to `undefined` renders a blank screen, which is
    // reachable-but-broken, the worst of both.
    const rel = new RegExp(`${key}:\\s*\\{[^}]*component:\\s*(\\w+)`).exec(entrySrc);
    ok(!!rel, `${key} names a component in FEATURE_MODULES`);
    if (rel) {
      const importRe = new RegExp(`import\\s+${rel[1]}\\s+from\\s+'([^']+)'`);
      const spec = importRe.exec(entrySrc)?.[1];
      ok(!!spec, `${rel[1]} is imported by the accounts entry`);
      if (spec) {
        // Metro resolves a bare `./x` to `./x.js`; a raw path check would report
        // a missing module for a file that is sitting right there.
        const target = resolveImport(ACCOUNTS_ENTRY, spec);
        ok(!!target, `${spec} exists`);
        if (target) {
          ok(/export\s+default/.test(readFileSync(target, 'utf8')), `${spec} exports a default component`);
        }
      }
    }
  }
  // The hub must still be one tap away from the finance home screen. The PATH
  // changed in F-11 and this follows the path instead of pinning the old one:
  // Reports used to be a hard-coded module card in dashboard.js, and is now the
  // GENERATE_REPORT quick action, whose route is PUBLISHED BY THE SERVER rather
  // than written into the app. Asserting `id: 'Reports'` in dashboard.js from
  // here on would assert that the dashboard never changes again.
  const dashSrc = readFileSync(path.join(APP, 'users/accounts_finance/pages/dashboard/dashboard.js'), 'utf8');
  const dashRules = readFileSync(path.resolve(__dirname, '../src/modules/accounts/dashboard.rules.ts'), 'utf8');
  const genReport = /id:\s*'GENERATE_REPORT'[\s\S]*?route:\s*'([^']+)'/.exec(dashRules)?.[1] ?? null;
  ok(genReport === 'Reports',
    'the dashboard offers Generate a report, routed to the Reports module');
  // …and the app must follow the published route rather than keep its own copy.
  ok(!/route:\s*'Reports'/.test(stripJsComments(dashSrc)),
    'the app does not hard-code the Reports route the server already publishes');
  ok(/ActionTile/.test(dashSrc) && /onPress/.test(dashSrc),
    'and the dashboard renders its quick actions as tappable tiles');
}

// ═══ 4. Every documented sub-feature has a route AND an implementation ═══
section('4. Sub-feature coverage: route + implementation');

const implSrc = ['reports.rules.ts', 'reports.xlsx.ts', 'reports.pdf.ts', 'reports.service.ts', 'reports.routes.ts']
  .map((f) => readFileSync(path.resolve(__dirname, '../src/modules/accounts', f), 'utf8'))
  .join('\n');
const routerPaths = new Set(
  [...routeSrc.matchAll(/router\.(?:get|post|put)\(\s*\n\s*'([^']+)'/g)].map((m) => m[1]),
);

const SUB_FEATURES: [string, string[], string[]][] = [
  // The seven reports all share one parametrised route; what makes each one a
  // real sub-feature is that its id is in the allow-list AND the builder behind
  // it exists — checked below.
  ['Collection reports', ['/reports/:report'], ['collectionsReport', 'clearedScope']],
  ['Outstanding dues reports', ['/reports/:report'], ['duesReport', 'duesScope', 'balanceOfDue']],
  ['Expense statements', ['/reports/:report'], ['expensesReport', 'budgetVariance']],
  ['Payroll reports', ['/reports/:report'], ['payrollReport', 'unfooted']],
  ['Scholarship reports', ['/reports/:report'], ['scholarshipsReport', 'creditedToDuesRupees']],
  ['Department-wise reports', ['/reports/:report'], ['departmentsReport', 'costPerStaffRupees']],
  ['Monthly/semester/yearly comparisons', ['/reports/:report'], ['comparisonReport', 'surplusRupees', 'resolvePeriod']],
  ['Period resolution (month/semester/year)', ['/reports/overview'], ['resolvePeriod', 'academicYearFor', 'PERIOD_META']],
  ['Excel export', ['/reports/:report/export'], ['buildXlsx', 'columnName', 'safeSheetName']],
  ['CSV export', ['/reports/:report/export'], ['toCsv', 'reportCsv']],
  ['PDF export', ['/reports/:report/export'], ['renderReportPdf', 'moneyText']],
  ['Report catalogue (drives the hub)', ['/reports/catalogue'], ['reportCatalogue']],
  ['Export is audited', ['/reports/:report/export'], ['auditExport', 'REPORT_EXPORTED']],
];
for (const [label, routes, fns] of SUB_FEATURES) {
  for (const r of routes) ok(routerPaths.has(r), `${label}: route ${r} exists`);
  for (const f of fns) ok(implSrc.includes(f), `${label}: ${f} is implemented`);
}

// Every catalogued report must be in the route's allow-list, or the catalogue
// would advertise a screen that answers 422.
// The router no longer keeps its own copy of the list — it derives it from
// `REPORT_IDS`, so the two cannot drift. The assertion reads the ONE list both
// files are now built from instead of a literal that has moved.
const rulesSrc = readFileSync(path.resolve(__dirname, '../src/modules/accounts/reports.rules.ts'), 'utf8');
ok(/const REPORTS = REPORT_IDS/.test(routeSrc),
  'the router derives its allow-list from REPORT_IDS instead of keeping a second copy');
const routeAllowList = /export const REPORT_IDS = \[([^\]]*)\]/.exec(rulesSrc)?.[1] ?? '';
for (const id of SERVER_REPORTS) {
  ok(new RegExp(`['"\`]${id}['"\`]`).test(routeAllowList), `${id} is in the route allow-list`);
}
ok(/assertReport/.test(routeSrc), 'the route validates the report id rather than trusting it');

// The seven report ids must be the same seven the server serves and the same
// seven the app registers — three lists that can each drift independently.
eq(
  (client.REPORT_IDS as string[]).join(','),
  [...SERVER_REPORTS].join(','),
  'the client report ids match the server report ids, in order',
);
eq(
  catalogue.reports.map((r: { id: string }) => r.id).join(','),
  [...SERVER_REPORTS].join(','),
  'and the catalogue the hub renders lists exactly those seven',
);
for (const r of catalogue.reports as { id: string; route: string }[]) {
  eq(r.route, `/reports/${r.id}`, `${r.id}: the published route is the one the screen is served on`);
}

// ═══ 5. Imports resolve to real exports ══════════════════════════════════
section('5. Imports resolve to real exports');

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

function resolveImport(from: string, spec: string): string | null {
  const base = path.resolve(path.dirname(from), spec);
  for (const candidate of [base, `${base}.js`, `${base}.jsx`, `${base}.ts`, path.join(base, 'index.js')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const BUILTINS = new Set([
  'react', 'react-native', 'react-native-safe-area-context', 'expo-status-bar', '@expo/vector-icons',
]);
let importChecks = 0;
for (const f of screenFiles) {
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
    if (target) ok(/export\s+default/.test(readFileSync(target, 'utf8')), `${spec} has a default export`);
  }
}
ok(importChecks > 40, 'a meaningful number of named imports were checked', String(importChecks));

// ═══ 6. Mirrored constants agree with the server ═══════════════════════
section('6. Client constants mirror the server');

eq((client.PERIODS as string[]).join(','), PERIODS.join(','), 'the same periods exist on both sides, in order');
const meta = client.PERIOD_META as Record<string, { label: string; hint: string }>;
for (const p of PERIODS) {
  ok(!!meta[p]?.label, `${p}: the client can label it`);
  ok(!!meta[p]?.hint, `${p}: and explain what window it covers`);
  ok(!!PERIOD_META[p as keyof typeof PERIOD_META], `${p}: the server can label it too`);
}

// The format chips must be exactly the server's allow-list — one more chip on
// screen is a button that returns 400.
const serverFormats = (await import('node:fs')).readFileSync(
  path.resolve(__dirname, '../src/modules/accounts/reports.routes.ts'), 'utf8',
).match(/\['xlsx', 'csv', 'pdf'\]/)?.[0] ?? '';
ok(serverFormats.includes('xlsx') && serverFormats.includes('csv') && serverFormats.includes('pdf'),
  'the server really allows xlsx, csv and pdf');
const formats = client.EXPORT_FORMATS as { id: string; ext: string; label: string }[];
eq(formats.map((f) => f.id).join(','), 'xlsx,csv,pdf', 'the client offers exactly those three formats, in order');
for (const f of formats) {
  ok(!!f.label && !!f.ext, `${f.id}: has a label and an extension`);
  eq(f.id, f.ext, `${f.id}: the button's extension matches the format it asks for`);
}

// ═══ 7. The fake data and the leaky legacy endpoint are gone ═════════════
section('7. The fake fixture and the legacy endpoint are gone');

ok(!existsSync(path.join(DIR, 'constants/reportsData.js')), 'reportsData.js no longer exists');
ok(!existsSync(path.join(DIR, 'constants')), 'the empty constants/ directory went with it');
ok(!/reportsData/.test(entrySrc), 'nothing imports the old fixture module');
ok(!/REPORT_STATS|CASH_FLOW\s*=|REPORT_TYPES\s*=\s*\[/.test(
  screenFiles.map((f) => readFileSync(f, 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''),
), 'no screen carries an inline fake dataset');

// The endpoint that leaked every tenant's dues must be gone, not merely unused.
const accountsRoutes = readFileSync(path.resolve(__dirname, '../src/modules/accounts/accounts.routes.ts'), 'utf8');
ok(!/router\.get\(\s*\n\s*'\/reports'/.test(accountsRoutes),
  'the tenant-leaking GET /accounts/reports endpoint no longer exists');
const accountsService = readFileSync(path.resolve(__dirname, '../src/modules/accounts/accounts.service.ts'), 'utf8');
ok(!/export\s+async\s+function\s+getReports/.test(accountsService), 'and its service function is deleted, not just unwired');
ok(/reportsRoutes/.test(readFileSync(path.resolve(__dirname, '../src/app.ts'), 'utf8')),
  'the reporting router is mounted in app.ts');
const appSrc = readFileSync(path.resolve(__dirname, '../src/app.ts'), 'utf8');
// Compare the MOUNT lines, not the first mention of the identifier — the import
// block mentions both long before either is mounted, so `indexOf` on the bare
// name would have compared an import line to a mount line.
const mountAt = (name: string) =>
  appSrc.indexOf(`app.use('/api/v1/accounts', ${name})`);
const atReports = mountAt('reportsRoutes');
const atAccounts = mountAt('accountsRoutes');
ok(atReports >= 0 && atAccounts >= 0, 'both routers are mounted at /api/v1/accounts');
ok(
  atReports >= 0 && atAccounts >= 0 && atReports < atAccounts,
  'reportsRoutes is mounted BEFORE accountsRoutes, so its literal routes win',
  `reports at ${atReports}, accounts at ${atAccounts}`,
);

// The client must call the new endpoints, not the removed one.
const apiSrc = readFileSync(API_FILE, 'utf8');
ok(!/api\.get\('\/accounts\/reports'\)/.test(apiSrc), 'the client no longer calls the removed endpoint');
for (const [method, url] of [
  ['reportCatalogue', '/accounts/reports/catalogue'],
  ['reportOverview', '/accounts/reports/overview'],
  ['exportReport', '/accounts/reports/${id}/export'],
]) {
  ok(new RegExp(`${method}:`).test(apiSrc), `accountsApi.${method} exists`);
  ok(apiSrc.includes(url), `accountsApi.${method} targets ${url}`);
}
ok(/report:\s*\(id/.test(apiSrc), 'accountsApi.report(id) exists');
ok(/reportQs/.test(apiSrc), 'the report calls share one query-string helper');

await prisma.$disconnect();
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log(`  - ${f}`));
}
process.exit(fail ? 1 : 0);