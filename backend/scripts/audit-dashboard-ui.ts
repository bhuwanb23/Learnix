// F-11 Dashboard — UI audit (docs/users/06 §3.11).
//
// This is the frontend's counterpart to `verify-dashboard.ts`, and it checks the
// things only the frontend can get wrong:
//
//   1. REACHABILITY. Every sub-screen must be wired into FEATURE_MODULES, and
//      every route the server publishes must resolve to a real screen or a real
//      tab. A screen that exists but is never registered is dead code; an
//      `openModule('DashboardDues')` to an unregistered key renders NOTHING, with
//      no error — `renderContent` falls through to the tab switcher and the
//      officer lands back on the dashboard.
//
//   2. THE MIRRORS AGREE. `dashboardMeta.js` deliberately duplicates the server's
//      seven blocks, three families, eight kinds, four actions and five windows.
//      Duplication is only safe if something checks it.
//
//   3. THE ROUTE RESOLUTION IS CORRECT. A published route is either a
//      bottom-nav TAB or a sub-SCREEN, and they are reached by different calls.
//      This is the check that catches `openModule('Dues')` — which opens nothing,
//      silently.
//
//   4. THE API SURFACE MATCHES THE ROUTES, and the superseded
//      `GET /accounts/dashboard` is GONE from both sides.
//
//   5. THE FIXED DEFECTS STAY FIXED. Source-level assertions that the clamped
//      budget percentage, the merged scholarship figures, the stale
//      `daysOverdue` read and the un-routed tabs have not come back.
//
// Run: npx tsx scripts/audit-dashboard-ui.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: unknown, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

// `backend/scripts/` -> `backend/` -> the repo root, whose `learnix/` is the app.
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = path.join(REPO, 'learnix');
const FEATURE_DIR = path.join(ROOT, 'users', 'accounts_finance');
const DASH_DIR = path.join(FEATURE_DIR, 'pages', 'dashboard');

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

const metaSrc = read(DASH_DIR, 'dashboardMeta.js');
const uiSrc = read(DASH_DIR, 'dashboardUi.js');
const hubSrc = read(DASH_DIR, 'dashboard.js');
const collectionsSrc = read(DASH_DIR, 'pages', 'collections', 'collections.js');
const duesSrc = read(DASH_DIR, 'pages', 'dues', 'dues.js');
const expensesSrc = read(DASH_DIR, 'pages', 'expenses', 'expenses.js');
const payrollSrc = read(DASH_DIR, 'pages', 'payroll', 'payroll.js');
const scholarshipsSrc = read(DASH_DIR, 'pages', 'scholarships', 'scholarships.js');
const alertsSrc = read(DASH_DIR, 'pages', 'alerts', 'alerts.js');
const actionsSrc = read(DASH_DIR, 'pages', 'actions', 'actions.js');
const shellSrc = read(FEATURE_DIR, 'accounts_finance.js');
const apiSrc = read(ROOT, 'services', 'api.js');

const BACKEND = path.join(REPO, 'backend', 'src', 'modules', 'accounts');
const rulesSrc = fs.readFileSync(path.join(BACKEND, 'dashboard.rules.ts'), 'utf8');
const routesSrc = fs.readFileSync(path.join(BACKEND, 'dashboard.routes.ts'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(BACKEND, 'dashboard.service.ts'), 'utf8');

const SCREENS = [
  'dashboard.js', 'dashboardMeta.js', 'dashboardUi.js',
  'pages/collections/collections.js', 'pages/dues/dues.js', 'pages/expenses/expenses.js',
  'pages/payroll/payroll.js', 'pages/scholarships/scholarships.js',
  'pages/alerts/alerts.js', 'pages/actions/actions.js',
];

console.log('F-11 Dashboard — UI audit');

// ═══ 1. The files exist ═══════════════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) ok(fs.existsSync(path.join(DASH_DIR, rel)), `${rel}: exists`);

// The stale fixture is gone. It was a hard-coded list of names and amounts that
// nothing imported, so it was not merely unused — it was a file a reader would
// open believing it described the screen.
ok(!fs.existsSync(path.join(DASH_DIR, 'constants', 'dashboardData.js')),
  'the stale hard-coded dashboardData fixture is deleted');
ok(!fs.existsSync(path.join(DASH_DIR, 'constants')),
  'and so is the directory that held it');

// ═══ 2. Reachability ══════════════════════════════════════════════════════
//
// The failure this catches is silent. `renderContent` looks the key up in
// FEATURE_MODULES and, finding nothing, falls through to the tab switcher — so a
// mistyped key sends the officer back to the dashboard with no error anywhere.
section('2. Every sub-screen is registered in FEATURE_MODULES');

const registeredKeys = new Set<string>();
for (const m of shellSrc.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)) registeredKeys.add(m[1]!);

const BLOCKS = ['Collections', 'Dues', 'Expenses', 'Payroll', 'Scholarships', 'Alerts', 'Actions'];
for (const b of BLOCKS) {
  const key = `Dashboard${b}`;
  ok(registeredKeys.has(key), `${key}: is registered in FEATURE_MODULES`);
}

// And each registered entry really points at a component that is imported FROM
// the dashboard feature — otherwise the import could come from anywhere.
for (const b of BLOCKS) {
  const key = `Dashboard${b}`;
  const block = shellSrc.slice(shellSrc.indexOf(`${key}: {`));
  const line = block.slice(0, block.indexOf('\n'));
  ok(line.includes(`component: ${key}`), `${key}: is wired to its own component`, line.trim());
  ok(
    new RegExp(`import ${key} from '\\./pages/dashboard/pages/${b.toLowerCase()}/`).test(shellSrc),
    `${key}: is imported from the dashboard feature`,
  );
}

// ═══ 3. The tab/sub-screen distinction ════════════════════════════════════
//
// This is the one that bites hardest, because getting it wrong is INVISIBLE. A
// bottom-nav tab is a key of TAB_TITLES reached with `switchTab`; a sub-screen is
// a key of FEATURE_MODULES reached with `openModule`. Passing a tab name to
// `openModule` finds no such key, `renderContent` falls through, and the user
// lands back where they started with no error. The notification alerts screen had
// to work around this with its own hand-written TAB_ROUTES list; here the
// distinction is published by the server and resolved in one place.
section('3. Routes resolve through goToRoute, which knows the difference');

ok(/export const TAB_ROUTES = \[/.test(uiSrc), 'the tab list is declared once, in the file that navigates');
ok(/export function goToRoute/.test(uiSrc), 'and there is one function that resolves a published route');
ok(/if \(isTab && TAB_ROUTES\.includes\(route\)\) navigation\.switchTab/.test(uiSrc),
  'a tab goes through switchTab');
ok(/else navigation\.openModule/.test(uiSrc), 'anything else goes through openModule');

{
  const tabBlock = shellSrc.slice(shellSrc.indexOf('const TAB_TITLES'));
  const TAB_KEYS = new Set(
    [...tabBlock.slice(0, tabBlock.indexOf('};')).matchAll(/^\s{2}([A-Za-z]+):\s*'/gm)].map((m) => m[1]!),
  );
  ok(TAB_KEYS.size === 5, 'the five bottom-nav tabs were located', [...TAB_KEYS].join(','));

  // Every route the SERVER publishes must resolve. This is the assertion that
  // catches a block whose route names a screen nobody registered.
  const routes = new Set<string>();
  for (const m of rulesSrc.matchAll(/route:\s*'([A-Za-z0-9_]+)'/g)) routes.add(m[1]!);
  ok(routes.size > 0, 'the server publishes routes', [...routes].join(','));

  for (const r of routes) {
    const reachable = registeredKeys.has(r) || TAB_KEYS.has(r);
    ok(reachable, `published route '${r}' is a registered screen or a real tab`);
  }
  // …and the mirror must agree on each one, so the app cannot route somewhere the
  // server did not intend.
  const appRoutes = new Set<string>();
  for (const m of metaSrc.matchAll(/route:\s*'([A-Za-z0-9_]+)'/g)) appRoutes.add(m[1]!);
  for (const r of appRoutes) {
    ok(routes.has(r) || registeredKeys.has(r) || TAB_KEYS.has(r),
      `the app's route '${r}' exists server-side or is a local screen`);
  }
  // The DUES block is a SUB-SCREEN (DashboardDues) while the DUES_OVERDUE alert
  // targets the DUES TAB. Two different destinations, one word apart — exactly
  // the pair that gets conflated.
  ok(rulesSrc.includes("route: 'DashboardDues'") && rulesSrc.includes("route: 'Dues'"),
    'the dues block and the dues alert deliberately target different screens');
  // The alerts screen must resolve each kind through goToRoute with the SERVER's
  // flag — not a list of its own. A hand-written list is the thing F-10 had to
  // work around, and it goes stale the moment a route changes.
  ok(/goToRoute\(navigation, k\.route, k\.isTab\)/.test(alertsSrc),
    'the alerts screen resolves each kind through goToRoute with the server flag');
  ok(!/const TAB_ROUTES/.test(alertsSrc),
    'and it keeps no hand-written tab list of its own — the difference is resolved once, in dashboardUi');
}

// ═══ 4. No direct openModule with a tab name ══════════════════════════════
section('4. No screen calls openModule with a bottom-nav tab name');

/**
 * Strip comments before scanning for call sites.
 *
 * Without this, an explanatory comment that quotes a bad call — which these
 * files do, to explain the failure they avoid — is scanned as if it were real
 * code and the audit fails on prose. Rewording comments to satisfy a scanner is
 * the wrong fix; the scanner should read code, not commentary.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

{
  const tabBlock = shellSrc.slice(shellSrc.indexOf('const TAB_TITLES'));
  const TAB_KEYS = new Set(
    [...tabBlock.slice(0, tabBlock.indexOf('};')).matchAll(/^\s{2}([A-Za-z]+):\s*'/gm)].map((m) => m[1]!),
  );
  for (const [name, src] of [
    ['dashboard.js', hubSrc], ['dashboardUi.js', uiSrc],
    ['collections.js', collectionsSrc], ['dues.js', duesSrc], ['expenses.js', expensesSrc],
    ['payroll.js', payrollSrc], ['scholarships.js', scholarshipsSrc],
    ['alerts.js', alertsSrc], ['actions.js', actionsSrc],
  ] as const) {
    for (const m of stripComments(src).matchAll(/openModule\(\s*'([A-Za-z0-9_]+)'/g)) {
      const target = m[1]!;
      ok(!TAB_KEYS.has(target),
        `${name}: '${target}' is a tab, so it must not be opened as a module`);
      ok(registeredKeys.has(target),
        `${name}: openModule('${target}') targets a registered screen`);
    }
  }
}

// ═══ 5. The mirrors agree ═════════════════════════════════════════════════
//
// `dashboardMeta.js` duplicates the server registry on purpose. The only thing
// that makes that safe is this assertion.
section('5. The app mirrors the server registry');

/**
 * Pull `id: 'X'` pairs out of a named array.
 *
 * Matches on the BARE NAME, not on `= [`, because the server declares its
 * registry with a type annotation:
 *
 *     export const ALERT_KINDS: AlertKind[] = [
 *
 * Anchoring on `= [` silently returns [] for the server file, which would make
 * the mirror assertions below vacuously pass ("" === "").
 */
const idsIn = (src: string, arrayName: string): string[] => {
  const decl = new RegExp(`export const ${arrayName}\\b[^=]*= \\[`).exec(src);
  if (!decl) return [];
  const start = decl.index + decl[0].length;
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end === -1 ? undefined : end);
  return [...block.matchAll(/\bid:\s*'([A-Z_]+)'/g)].map((m) => m[1]!);
};

const pairs = (label: string, serverList: string[], appList: string[]) => {
  eq(appList.length, serverList.length, `the app publishes the same number of ${label}`);
  eq(appList.join(','), serverList.join(','), `the app ${label} are the server ${label}, in the same order`);
  ok(serverList.length > 0, `the server ${label} registry was located and parsed`);
};

pairs('blocks', idsIn(rulesSrc, 'BLOCKS'), idsIn(metaSrc, 'BLOCKS'));
pairs('alert families', idsIn(rulesSrc, 'ALERT_FAMILIES'), idsIn(metaSrc, 'ALERT_FAMILIES'));
pairs('alert kinds', idsIn(rulesSrc, 'ALERT_KINDS'), idsIn(metaSrc, 'ALERT_KINDS'));
pairs('quick actions', idsIn(rulesSrc, 'QUICK_ACTIONS'), idsIn(metaSrc, 'QUICK_ACTIONS'));

eq(idsIn(rulesSrc, 'BLOCKS').length, 7, 'the requirement is seven blocks');
eq(idsIn(rulesSrc, 'ALERT_FAMILIES').length, 3, 'and three alert families');
eq(idsIn(rulesSrc, 'ALERT_KINDS').length, 8, 'and eight alert kinds');
eq(idsIn(rulesSrc, 'QUICK_ACTIONS').length, 4, 'and four quick actions');

// The five windows mirror by `id` too, but their ids are lowercase, so the same
// uppercase pattern does not find them.
{
  const winIds = (src: string): string[] => {
    const decl = /export const WINDOWS\b[^=]*= \[/.exec(src);
    if (!decl) return [];
    const start = decl.index + decl[0].length;
    const end = src.indexOf('\n] as const', start) !== -1 ? src.indexOf('\n] as const', start) : src.indexOf('\n];', start);
    const block = src.slice(start, end === -1 ? undefined : end);
    return [...block.matchAll(/\bid:\s*'([A-Z_]+)'/g)].map((m) => m[1]!);
  };
  pairs('windows', winIds(rulesSrc), winIds(metaSrc));
  eq(winIds(rulesSrc).length, 5, 'and five windows');
}

// Every block and kind the app draws must have a colour and an icon the screen
// actually uses — a chip with no colour renders as an invisible square.
for (const id of [...idsIn(metaSrc, 'BLOCKS'), ...idsIn(metaSrc, 'ALERT_KINDS'), ...idsIn(metaSrc, 'ALERT_FAMILIES')]) {
  const i = metaSrc.indexOf(`id: '${id}'`);
  const entry = metaSrc.slice(i, i + 400);
  ok(new RegExp(`id: '${id}',[\\s\\S]{0,400}?icon: '`).test(metaSrc), `${id}: has an icon`);
  ok(new RegExp(`id: '${id}',[\\s\\S]{0,400}?color: '#`).test(metaSrc), `${id}: has a colour`);
  ok(entry.length > 0, `${id}: the entry was located`);
}

// ═══ 6. The API surface ═══════════════════════════════════════════════════
section('6. accountsApi matches the routes');

for (const method of [
  'dashboardCatalogue', 'dashboardOverview', 'dashboardAlerts', 'dashboardActions', 'dashboardBlock',
]) {
  ok(new RegExp(`^\\s{2}${method}:`, 'm').test(apiSrc), `accountsApi.${method} exists`);
}

for (const p of [
  '/accounts/dashboard/catalogue', '/accounts/dashboard/overview',
  '/accounts/dashboard/alerts', '/accounts/dashboard/actions',
]) {
  ok(apiSrc.includes(p), `accountsApi calls ${p}`);
  ok(routesSrc.includes(`'${p.replace('/accounts', '')}'`), `the router serves ${p.replace('/accounts', '')}`);
}
ok(apiSrc.includes('/accounts/dashboard/blocks/'), 'accountsApi calls the per-block route');
ok(routesSrc.includes("'/dashboard/blocks/:block'"), 'the router serves /dashboard/blocks/:block');

// The SUPERSEDED path must be gone from BOTH sides. It served the old
// `getDashboard`, whose hero compared all-time collection against the sum of every
// ACTIVE fee structure — a price list, not a goal. Leaving it reachable would
// leave two endpoints publishing the same money by different rules.
ok(!/api\.get\('\/accounts\/dashboard'\)/.test(apiSrc),
  'the app no longer calls the superseded /accounts/dashboard');
ok(!/router\.get\(\s*'\/dashboard'/.test(routesSrc),
  'and the new router does not serve it');
ok(!/service\.getDashboard/.test(read(BACKEND, 'accounts.routes.ts')),
  'and accounts.routes no longer delegates to getDashboard');
ok(!/export async function getDashboard/.test(read(BACKEND, 'accounts.service.ts')),
  'and getDashboard is deleted rather than left reachable');

// ═══ 7. Route order ═══════════════════════════════════════════════════════
section('7. The literal routes are registered before the parameterised one');

{
  const paramAt = routesSrc.indexOf("'/dashboard/blocks/:block'");
  ok(paramAt > 0, 'the parameterised block route exists');
  for (const lit of [
    '/dashboard/catalogue', '/dashboard/overview', '/dashboard/alerts', '/dashboard/actions',
  ]) {
    const at = routesSrc.indexOf(`'${lit}'`);
    ok(at > 0, `${lit} is declared`);
    ok(at < paramAt, `${lit} is declared before /dashboard/blocks/:block`);
  }
  // The router's own gate. This is asserted at the SOURCE level deliberately,
  // and the reason is measured rather than assumed: removing this line does NOT
  // change what an unauthenticated caller gets back. Every accounts router
  // mounted at this prefix runs `router.use(auth, requireRole(...))`, and Express
  // runs a `use` middleware even for a request the router then fails to MATCH —
  // so the first sibling mounted answers 401/403 for the whole prefix before this
  // router is reached. The HTTP suite's 401 assertions therefore prove the
  // PREFIX is guarded, not that THIS router guards itself, and a source
  // assertion is the only kind that can see the difference.
  ok(/router\.use\(auth, requireRole\('ACCOUNTS', 'ADMIN'\)\)/.test(stripComments(routesSrc)),
    'the router applies its own auth — it no longer inherits it from accountsRoutes');
  // It is mounted BEFORE accountsRoutes, which is what removes the inheritance.
  const appTs = fs.readFileSync(path.join(REPO, 'backend', 'src', 'app.ts'), 'utf8');
  const mountOf = (router: string): number =>
    appTs.indexOf(`app.use('/api/v1/accounts', ${router})`);
  const dashMount = mountOf('dashboardRoutes');
  const accountsMount = mountOf('accountsRoutes');
  ok(dashMount > 0 && accountsMount > 0, 'both routers are mounted at the accounts prefix');
  ok(dashMount < accountsMount,
    'dashboardRoutes is mounted BEFORE accountsRoutes, which is what makes the gate its own responsibility');
}

// ═══ 8. The fixed defects stay fixed ═══════════════════════════════════════
section('8. The fixed defects stay fixed');

// THE CLAMPED BUDGET. `utilizationPct` was `Math.min(..., 100)`, so a line at
// 180% of plan drew a full bar and read "100%" — the one number on the screen
// that most needed to look alarming was the one number that could not.
ok(!/Math\.min\([^)]*100\)/.test(serviceSrc.split('utilisationPercent')[0]?.slice(-200) ?? ''),
  'utilisation is not clamped to 100 on the server');
const utilLine = /utilisationPercent: plannedMinor > 0 \? Math\.round\(\(spentFyMinor \/ plannedMinor\) \* 1000\) \/ 10 : null/.test(serviceSrc);
ok(utilLine, 'utilisation is reported at one decimal place, unbounded');
// The CLAMP belongs in the view, where a pixel width is the only thing at stake.
ok(/export function barWidth/.test(metaSrc) && /Math\.min\(100, n\)/.test(metaSrc),
  'the clamp lives in barWidth, in the view');
ok(/spendTone[\s\S]{0,400}n > 100/.test(metaSrc),
  'and the tone rule still reports "over" above 100 rather than saturating');
// The screen must print the UNCLAMPED number beside the bar.
ok(/display=\{percentPhrase\(e\.utilisationPercent\)\}/.test(hubSrc),
  'the hub prints the server figure, not a clamped one');
ok(/percent=\{e\.utilisationPercent\}/.test(hubSrc), 'and passes the raw figure to the bar');
// …and it must say so, because a user seeing 180% with a full bar needs to know
// the bar is not the number.
ok(/deliberately not capped at\s*\n?\s*100/.test(expensesSrc) || expensesSrc.includes('not capped at'),
  'the expenses screen states that utilisation is not capped at 100');

// THE STALE COUNTER. The old screen filtered on `FeeDue.daysOverdue`, which is
// denormalised and drifts. F-10 found the same bug in the broadcast audience one
// file over.
for (const [name, src] of [
  ['dashboard.js', hubSrc], ['collections.js', collectionsSrc], ['dues.js', duesSrc],
  ['expenses.js', expensesSrc], ['payroll.js', payrollSrc],
  ['scholarships.js', scholarshipsSrc], ['alerts.js', alertsSrc], ['actions.js', actionsSrc],
  ['dashboardMeta.js', metaSrc], ['dashboardUi.js', uiSrc],
] as const) {
  ok(!/daysOverdue/.test(stripComments(src)), `${name}: never reads the stale daysOverdue column`);
}
ok(/daysPastDue/.test(serviceSrc), 'the server computes every age from the due date instead');

// THE MERGED SCHOLARSHIP MONEY. `committed` counted UNDER_REVIEW as promised
// alongside APPROVED and DISBURSED.
// Comments are stripped first: the file's own header explains this defect in
// prose, and the prose contains both words. Without stripping, the audit would
// fail on the very comment that documents the fix.
const serviceCode = stripComments(serviceSrc);
ok(!/committed/.test(serviceCode),
  'no commitment figure is computed anywhere, so an UNDER_REVIEW application cannot be counted as one');
ok(/a\.status === 'APPLIED' \|\| a\.status === 'UNDER_REVIEW'/.test(serviceCode),
  'UNDER_REVIEW is classified as PENDING in the code, not as approved money');
for (const k of ['pendingRupees', 'approvedRupees', 'disbursedRupees', 'unreleasedRupees']) {
  ok(serviceSrc.includes(k), `the server reports ${k} as its own figure`);
  ok(scholarshipsSrc.includes(k), `the scholarships screen renders ${k}`);
}
// …and the screen must not merge them either.
ok(/never added together/.test(scholarshipsSrc),
  'the scholarships screen states that the figures are never added together');
ok(/releasePercent/.test(scholarshipsSrc), 'and reports the release rate separately');

// A CLEAR ALERT IS NOT AN ALARM. Painting "0 problems" in the alarm colour
// teaches the officer to ignore the alarm colour.
ok(/export function alertTone/.test(metaSrc), 'the app has the zero-is-clear rule');
ok(/if \(n <= 0\) return 'clear'/.test(metaSrc), 'and it returns clear for zero');
ok(/count > 0 \? alert\.icon : 'checkmark-circle-outline'/.test(uiSrc),
  'a clear alert is drawn with a tick, not the alarm icon');
// The COLOUR, which is the half that was not asserted. The icon alone is
// cosmetic: a row can carry a green tick and still paint its count in red, and a
// red "0" is exactly the thing that teaches an officer to ignore the red. The
// tone must be selected on `count > 0`, never taken straight from the server —
// because a server that returned a `tone` field for a zero count would be
// believed.
ok(/const tone = alert\.count > 0 \? TONE_COLOR\[alert\.tone\] : TONE_COLOR\.clear;/.test(uiSrc),
  'and its COLOUR is chosen from the count, with a clear alert always green');
ok(!/const tone = TONE_COLOR\[alert\.tone\](?! \?)/.test(stripComments(uiSrc)),
  'the tone is never taken unconditionally from the server, so a bad tone field cannot paint a zero red');
ok(/clear: GREEN/.test(metaSrc) && /warn: AMBER/.test(metaSrc) && /bad: RED/.test(metaSrc),
  'the three tones map to green, amber and red, in one place');
ok(alertsSrc.includes("'All clear'"), 'the alerts screen says so in words');

// THE SILENT ROUTE FAILURE. No screen may reach for a tab with openModule.
ok(/goToRoute/.test(hubSrc), 'the hub routes through goToRoute');
ok(/goToRoute/.test(alertsSrc), 'the alerts screen routes through goToRoute');
ok(/goToRoute/.test(actionsSrc), 'the quick-actions screen routes through goToRoute');

// ═══ 9. The screens actually use their data ════════════════════════════════
section('9. The screens render what the server sends');

{
  // A screen that fetches a field and never renders it is a dead request; a
  // screen that renders a field the server never sends shows "undefined".
  const checks: [string, string, string[]][] = [
    ['collections', collectionsSrc, ['todayRupees', 'monthRupees', 'semesterRupees', 'allTimeRupees', 'reversedCount', 'semesterLabel', 'byCategory', 'trend']],
    ['dues', duesSrc, ['outstandingRupees', 'overdueRupees', 'criticalRupees', 'defaulterStudents', 'defaulterBills', 'studentsOwing', 'recoveryPercent', 'aging', 'topDebtors']],
    ['expenses', expensesSrc, ['monthRupees', 'plannedRupees', 'spentRupees', 'remainingRupees', 'utilisationPercent', 'pendingRupees', 'fiscalYear', 'lines']],
    ['payroll', payrollSrc, ['currentRun', 'currentRunRaised', 'pendingRupees', 'upcoming', 'overdueRunCount', 'duePolicy', 'ytdNetRupees']],
    ['scholarships', scholarshipsSrc, ['approvedRupees', 'pendingRupees', 'disbursedRupees', 'unreleasedRupees', 'requestedRupees', 'releasePercent', 'rejectedCount']],
    ['alerts', alertsSrc, ['kinds', 'families', 'firing', 'total', 'count', 'items']],
    // `countLabel` and `blockedReason` are rendered by the shared `ActionTile`,
    // not by the screen — so they are asserted against the KIT below, where they
    // are actually drawn. Asserting them here would pass on an import alone.
    ['actions', actionsSrc, ['count', 'enabled']],
  ];
  for (const [name, src, fields] of checks) {
    for (const f of fields) ok(src.includes(f), `${name}: renders ${f}`);
  }

  // The ActionTile is where a quick action's live count and its blocked reason
  // become visible. A tile that drops the count is a tile that says "send a
  // reminder" without saying how many people, which is the whole point.
  for (const f of ['action.countLabel', 'action.blockedReason', 'action.count', 'action.enabled']) {
    ok(uiSrc.includes(f), `the ActionTile renders ${f}`);
  }
  ok(/disabled=\{!enabled\}/.test(uiSrc), 'and a blocked tile is actually disabled rather than inert');
  ok(/onPress=\{enabled \? onPress : undefined\}/.test(uiSrc),
    'and its press handler is removed, so a greyed tile cannot quietly do the wrong thing');
  ok(actionsSrc.includes('ActionTile'), 'the actions screen uses the shared tile');
  ok(hubSrc.includes('ActionTile'), 'and so does the hub');

  // The hub renders all seven, from ONE response.
  ok(/dashboardOverview\(\)/.test(hubSrc), 'the hub fetches the overview');
  ok(!/useDashboard\(\(\) => accountsApi\.dashboardBlock/.test(hubSrc),
    'and does NOT fetch seven blocks separately — one call is one moment');
  // The ids are the BLOCK ids, not the screen names: the seventh block is
  // `QUICK_ACTIONS` even though its screen is `DashboardActions`. Deriving the
  // id from the screen name is exactly the kind of near-miss that leaves a card
  // with no content under it.
  for (const id of idsIn(rulesSrc, 'BLOCKS')) {
    ok(new RegExp(`id === '${id}'`).test(hubSrc), `the hub has a summary for the ${id} block`);
  }
  // Every sub-screen fetches ITS OWN block by id, which is what makes the
  // per-block endpoint worth existing.
  const perBlock: [string, string, string][] = [
    ['collections', collectionsSrc, 'COLLECTIONS'], ['dues', duesSrc, 'DUES'],
    ['expenses', expensesSrc, 'EXPENSES'], ['payroll', payrollSrc, 'PAYROLL'],
    ['scholarships', scholarshipsSrc, 'SCHOLARSHIPS'], ['alerts', alertsSrc, 'dashboardAlerts'],
    ['actions', actionsSrc, 'dashboardActions'],
  ];
  for (const [name, src, call] of perBlock) {
    ok(src.includes(`accountsApi.${call === 'dashboardAlerts' || call === 'dashboardActions' ? call : 'dashboardBlock'}`),
      `${name}: fetches its own data`);
    if (call !== 'dashboardAlerts' && call !== 'dashboardActions') {
      ok(src.includes(`'${call}'`), `${name}: asks for the ${call} block by id`);
    }
  }
}

// ═══ 10. The catalogue is the source, not a copy ═══════════════════════════
section('10. The block list comes from the server');

ok(/catalogue\.data\?\.blocks/.test(hubSrc), 'the hub draws its blocks from the catalogue response');
// The mirror is a FALLBACK for the frame before the catalogue lands, and nothing
// more. A mirror that also acted as the source would be a second list to keep true.
ok(/BLOCKS/.test(hubSrc) === false || /fallback/i.test(hubSrc),
  'the app does not silently substitute its own list for the server response');
ok(/thresholds/.test(hubSrc), 'the hub prints the published thresholds, so a flag can be checked');
ok(/unusualMultiple/.test(hubSrc), 'and prints the unusual-payment multiple specifically');
ok(/cashReviewRupees/.test(hubSrc), 'and the cash review limit');
ok(/defaulterMinDays/.test(hubSrc), 'and the defaulter threshold');

// A FAILED request must not look like a settled account. This is the single most
// dangerous thing a dashboard can do: "₹0 outstanding" and "₹0 because the
// request failed" are identical on screen, and the first one gets read out in a
// meeting.
ok(/error=\{overview\.error/.test(hubSrc), 'the hub shows the error IN PLACE of the figures');
ok(/must never look like a settled account/.test(uiSrc),
  'and the shell says why, in words');
ok(/if \(error\)[\s\S]{0,200}return/.test(uiSrc),
  'the shell returns the error panel rather than an empty scroll view');

// ═══ 11. The server side this depends on ═══════════════════════════════════
section('11. The server contract the screens rely on');

for (const fn of ['collectionsBlock', 'duesBlock', 'expensesBlock', 'payrollBlock', 'scholarshipsBlock', 'alertsBlock', 'quickActionsBlock']) {
  ok(new RegExp(`export async function ${fn}`).test(serviceSrc), `${fn} exists and is exported`);
}
ok(/export async function dashboardCatalogue/.test(serviceSrc), 'dashboardCatalogue exists');
ok(/export async function dashboardOverview/.test(serviceSrc), 'dashboardOverview exists');
// The reconciliation questions are asked ONCE, by the notifications desk, and
// reused. Two screens counting the same problem differently is the failure the
// reports feature refuses to print past for an unfooted payroll header.
for (const helper of ['budgetOverruns', 'unreconciledPayroll', 'unreleasedScholarships', 'unallocatedReceipts']) {
  ok(new RegExp(`import[\\s\\S]{0,400}${helper}`).test(serviceSrc),
    `the dashboard imports ${helper} from the notifications desk rather than re-asking it`);
  ok(new RegExp(`export async function ${helper}`).test(read(BACKEND, 'notifications.service.ts')),
    `${helper} is exported for it to use`);
}
ok(/assertBlock/.test(routesSrc) && /unprocessable/.test(rulesSrc),
  'an unknown block is 422, not 404 — it is a choice from a list, not a lookup');
ok(/assertAlertFamily/.test(routesSrc), 'and an unknown family is validated at the route');
ok(/\.strict\(\)/.test(read(BACKEND, 'accounts.schemas.ts')),
  'the dashboard query schemas are strict, so a misspelled filter is a 400');
// `FeeDue` has no institutionId, so every dues query must go through the student.
ok(/studentProfile: \{ user: \{ institutionId/.test(serviceSrc),
  'the dues scope goes through the student, because FeeDue has no institutionId');
ok(!/prisma\.feeDue\.(findMany|count|aggregate)\(\{\s*where: \{[^}]*status/s.test(serviceSrc),
  'no feeDue query filters on status alone, which would drop the tenant scope');

// ── Report ────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok audit-dashboard-ui: the dashboard is wired, reachable, and cannot show a wrong number quietly');
