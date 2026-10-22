/**
 * Suite: the HOD dashboard screens, audited at the source level.
 * Docs: 11-hod.md §HD-01
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. Every quick action and every alert must point at a screen that EXISTS. A
 *      route naming a section — "AttendanceSnapshot" — is not a screen, and `openModule` on an
 *      unregistered key renders NOTHING: `renderContent` finds no component, falls through to the
 *      tab switcher, and the HOD lands back on the dashboard with no error anywhere. This is the
 *      single most likely way for this screen to ship broken.
 *
 *   2. THE MIRROR AGREES WITH THE SERVER. The client mirror deliberately duplicates the server's
 *      vocabulary. A mirror that disagrees with its source is worse than no mirror: it looks like
 *      the truth.
 *
 *   3. THE SERVER OWNS THE VOCABULARY. The block list, the quick actions, the alert kinds and
 *      the health bands come from the catalogue, and the client mirror is a FALLBACK.
 *
 *   4. NO SECTION COMPUTES ANYTHING ABOUT THE DATA. A number the client derived is a number the
 *      client can get wrong.
 *
 *   5. THE POLICY IS ON THE SCREENS. "Not marked is not absent", "no data yet is left out of the
 *      score" — these are decisions a HOD is entitled to read, not behaviour to infer from a
 *      grey box.
 *
 *   6. THE OLD ENDPOINT STAYS GONE.
 *
 * Run: npx tsx scripts/audit-hod-dashboard-ui.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEARNIX = path.resolve(HERE, '..', '..', 'learnix');
const BACKEND = path.resolve(HERE, '..');

let pass = 0;
let fail = 0;
const failures: string[] = [];
function ok(cond: unknown, label: string, detail = '') {
  if (cond) pass += 1;
  else {
    fail += 1;
    failures.push(`${label}${detail ? ` - ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` - ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n-- ${n}`);

const read = (rel: string) => {
  try {
    return fs.readFileSync(path.join(LEARNIX, rel), 'utf8');
  } catch (e: any) {
    throw new Error(`could not read ${path.join(LEARNIX, rel)}: ${e.message}`);
  }
};
const readSrc = (rel: string) => {
  try {
    return fs.readFileSync(path.join(BACKEND, rel), 'utf8');
  } catch (e: any) {
    throw new Error(`could not read ${path.join(BACKEND, rel)}: ${e.message}`);
  }
};

/** Comment-stripped source, so an assertion cannot pass on prose. */
function stripComments(src: string) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

const DS = 'users/hod/pages/dashboard';
const SCREENS = [
  `${DS}/dashboard.js`,
  `${DS}/dashboardMeta.js`,
  `${DS}/dashboardUi.js`,
  `${DS}/dashboardStyles.js`,
  `${DS}/dashboardState.js`,
  `${DS}/dashboardWorkload.js`,
  `${DS}/dashboardActions.js`,
  'users/hod/hod.js',
];

const dashboardSrc = read(`${DS}/dashboard.js`);
const metaSrc = read(`${DS}/dashboardMeta.js`);
const uiSrc = read(`${DS}/dashboardUi.js`);
const stateSrc = read(`${DS}/dashboardState.js`);
const workloadSrc = read(`${DS}/dashboardWorkload.js`);
const actionsSrc = read(`${DS}/dashboardActions.js`);
const shellSrc = read('users/hod/hod.js');
const apiSrc = read('services/api.js');

const dashboardCode = stripComments(dashboardSrc);
const metaCode = stripComments(metaSrc);
const stateCode = stripComments(stateSrc);
const workloadCode = stripComments(workloadSrc);
const actionsCode = stripComments(actionsSrc);
const shellCode = stripComments(shellSrc);
const apiCode = stripComments(apiSrc);

const rulesSrc = stripComments(readSrc('src/modules/hod/hod-dashboard.rules.ts'));
const healthSrc = stripComments(readSrc('src/modules/hod/hod-dashboard.health.ts'));
const routesSrc = readSrc('src/modules/hod/hod-dashboard.routes.ts');
const serviceSrc = readSrc('src/modules/hod/hod-dashboard.service.ts');

// ── 1. Every screen exists ─────────────────────────────────────────────────
section('1. Every screen file exists');

for (const rel of SCREENS) {
  ok(fs.existsSync(path.join(LEARNIX, rel)), `${rel}: exists`);
}

// ── 2. Reachability ─────────────────────────────────────────────────────────
section('2. Every quick action and alert points at a screen that EXISTS');

// The bottom-nav tabs the HOD shell has.
const TAB_IDS = ['Dashboard', 'Faculty', 'Courses', 'Students', 'Profile'];

// The FEATURE_MODULES keys the HOD shell registers.
const registered = [...shellCode.matchAll(/^\s*([A-Za-z]+):\s*\{/gm)].map((m) => m[1]!);

for (const m of metaCode.matchAll(/route:\s*'([A-Za-z]+)'/g)) {
  const route = m[1]!;
  const isTab = TAB_IDS.includes(route);
  ok(
    isTab || registered.includes(route),
    `the route "${route}" is a tab or a registered screen`,
  );
}
for (const m of rulesSrc.matchAll(/route:\s*'([A-Za-z]+)'/g)) {
  const route = m[1]!;
  const isTab = TAB_IDS.includes(route);
  ok(
    isTab || registered.includes(route),
    `the server route "${route}" is a tab or a registered screen`,
  );
}
ok(
  !/route:\s*'(AttendanceSnapshot|PerformanceTrends|StudentRisk)'/.test(metaCode),
  'no route names a SECTION instead of a screen',
);
ok(
  !/route:\s*'(AttendanceSnapshot|PerformanceTrends|StudentRisk)'/.test(rulesSrc),
  'and the server does not either',
);

// ── 3. The mirror agrees with the server ─────────────────────────────────────
section('3. The client mirror agrees with the server');

const serverBlocks = [
  ...rulesSrc.matchAll(/id:\s*'(DEPARTMENT_KPIS|TODAY_OVERVIEW|ATTENDANCE_SNAPSHOT|ACADEMIC_PROGRESS|FACULTY_WORKLOAD|STUDENT_RISK|PENDING_APPROVALS|QUICK_ACTIONS|PERFORMANCE_TRENDS)'/g),
].map((m) => m[1]!);
eq(new Set(serverBlocks).size, 9, 'the server declares nine sections');
for (const id of new Set(serverBlocks)) {
  ok(metaCode.includes(`'${id}'`), `the client mirror knows ${id}`);
}

const serverAlerts = [
  ...rulesSrc.matchAll(/id:\s*'(OVERLOADED_FACULTY|LOW_ATTENDANCE|POOR_PERFORMANCE|AT_RISK_STUDENTS|STALLED_SYLLABUS|PENDING_APPROVALS)'/g),
].map((m) => m[1]!);
eq(new Set(serverAlerts).size, 6, 'the server declares six alert kinds');
for (const id of new Set(serverAlerts)) {
  ok(metaCode.includes(`'${id}'`), `the client mirror knows ${id}`);
}

const serverActions = [
  ...rulesSrc.matchAll(/id:\s*'(ASSIGN_FACULTY|VIEW_STUDENTS|APPROVE_LEAVE|REVIEW_SYLLABUS)'/g),
].map((m) => m[1]!);
eq(new Set(serverActions).size, 4, 'the server declares four quick actions');
for (const id of new Set(serverActions)) {
  ok(metaCode.includes(`'${id}'`), `the client mirror knows ${id}`);
}

// THE COLOURS MUST AGREE TOO. A mirror that disagrees about a colour is a mirror that shows a
// HIGH alert in green.
const CLIENT_COLOUR_CONSTANTS: Record<string, string> = {
  THEME: '#2563eb',
  RED: '#dc2626',
  AMBER: '#d97706',
  GREEN: '#059669',
  VIOLET: '#7c3aed',
  INDIGO: '#4f46e5',
  CYAN: '#0891b2',
};
const clientColours = new Set<string>();
for (const m of metaCode.matchAll(/color:\s*([A-Z_]+|'(#[0-9a-f]{6})')/g)) {
  const token = m[1]!;
  if (token.startsWith("'")) clientColours.add(token.slice(1, -1).toLowerCase());
  else if (CLIENT_COLOUR_CONSTANTS[token]) {
    clientColours.add(CLIENT_COLOUR_CONSTANTS[token]!.toLowerCase());
  }
}
const serverColours = [
  ...rulesSrc.matchAll(/color:\s*'(#[0-9a-f]{6})'/gi),
].map((m) => m[1]!.toLowerCase());
for (const c of new Set(serverColours)) {
  ok(clientColours.has(c), `the client mirror carries the colour ${c}`);
}

// The health bands and the score thresholds.
for (const b of ['HEALTHY', 'WATCH', 'AT_RISK']) {
  ok(metaCode.includes(`'${b}'`), `the client mirror knows the ${b} band`);
  ok(healthSrc.includes(`'${b}'`), `the server knows the ${b} band`);
}

// ── 4. The server owns the vocabulary ───────────────────────────────────────
section('4. The server owns the vocabulary');

ok(
  dashboardCode.includes('hodApi.dashboardCatalogue()'),
  'the catalogue is fetched',
);
ok(dashboardCode.includes('hodApi.dashboardOverview()'), 'the overview is fetched');
ok(
  dashboardCode.includes('catalogue.data?.blocks ?? BLOCKS'),
  'the server list is the source and the mirror is the fallback',
);
ok(
  dashboardCode.includes('catalogue.data?.quickActions ?? QUICK_ACTIONS'),
  'for the quick actions',
);
ok(
  dashboardCode.includes('catalogue.data?.alertKinds ?? ALERT_KINDS'),
  'and for the alert kinds',
);

// ── 5. No section computes anything about the data ───────────────────────────
section('5. The client computes nothing about the data');

for (const [name, code] of [
  ['the state sections', stateCode],
  ['the workload sections', workloadCode],
  ['the action sections', actionsCode],
]) {
  ok(!/\.reduce\(/.test(code), `${name} does not aggregate the data itself`);
  ok(
    !/results\.filter\(.*isPass/.test(code),
    `${name} does not count passes itself`,
  );
  ok(
    !/Math\.round\(.*attendancePct/.test(code),
    `${name} does not compute an attendance percentage itself`,
  );
}

// ── 6. The policy is on the screens ─────────────────────────────────────────
section('6. The policy is on the screens');

const flat = (s: string) => s.replace(/\s+/g, ' ');
ok(
  /not an absent one/i.test(workloadCode),
  'the risk section says an unmarked student is not an absent one',
);
ok(
  /single point, not a trend/i.test(actionsCode),
  'the trends say a single point is not a trend',
);
ok(
  /left out of the score/i.test(actionsCode),
  'the health breakdown says a missing measure is left out of the score',
);
ok(
  /no data yet/i.test(actionsCode),
  'and that it is because there is no data yet',
);
// THE APPROVALS NOTE IS SERVER-PROVIDED AND CLIENT-RENDERED, so the two are checked together: the
// server has to SAY it, and the client has to SHOW it.
ok(
  /no free-form departmental request/i.test(
    readSrc('src/modules/hod/hod-dashboard.actions.ts'),
  ),
  'the server says there is no free-form departmental request',
);
ok(
  /a\.note\s*\?\s*<NoteStrip>/.test(actionsCode),
  'and the client renders the server\'s note',
);

// ── 7. The API surface ──────────────────────────────────────────────────────
section('7. The API surface matches the routes');

for (const m of ['dashboardCatalogue', 'dashboardOverview', 'dashboardBlock']) {
  ok(apiCode.includes(`${m}:`), `hodApi has "${m}"`);
}
ok(
  !/dashboard:\s*\(\)\s*=>\s*api\.get\('\/hod\/dashboard'\)/.test(apiSrc),
  'the old hodApi.dashboard method is removed',
);
for (const route of [
  "'/dashboard/overview'",
  "'/dashboard/catalogue'",
  "'/dashboard/blocks/:block'",
]) {
  ok(routesSrc.includes(route), `the server has the route ${route}`);
}
ok(
  !/'\/dashboard'/.test(readSrc('src/modules/hod/hod.routes.ts')),
  'and the old /dashboard route is removed from hod.routes.ts',
);

// ── 8. The nine sections are all drawn ──────────────────────────────────────
section('8. All nine sections are drawn');

for (const c of [
  'DepartmentKpisSection',
  'TodayOverviewSection',
  'AttendanceSnapshotSection',
  'AcademicProgressSection',
  'FacultyWorkloadSection',
  'StudentRiskSection',
  'PendingApprovalsSection',
  'QuickActionsSection',
  'PerformanceTrendsSection',
]) {
  ok(dashboardCode.includes(c), `the screen draws ${c}`);
}
ok(dashboardCode.includes('HealthScoreSection'), 'and the health score, first');
ok(dashboardCode.includes('AlertStrip'), 'and the needs-attention strip');

// THE ORDER, in the JSX rather than in the imports — the import statement always comes first, so
// searching for the name finds the import and proves nothing about the drawing order.
const jsxBody = dashboardCode.slice(dashboardCode.indexOf('<DashboardScreen'));
ok(
  jsxBody.indexOf('<HealthScoreSection') < jsxBody.indexOf('<DepartmentKpisSection'),
  'the health score is drawn BEFORE the sections it summarises',
);
ok(
  jsxBody.indexOf('<AlertStrip') < jsxBody.indexOf('<DepartmentKpisSection'),
  'and the needs-attention strip is above them too',
);
ok(
  jsxBody.indexOf('<DepartmentKpisSection') <
    jsxBody.indexOf('<PerformanceTrendsSection'),
  'and the sections are drawn in the server\'s order',
);

// ── 9. The health score is the smart feature, and it is complete ────────────
section('9. The health score is drawn with its breakdown');

ok(actionsSrc.includes('HealthGauge'), 'the gauge is used');
ok(actionsSrc.includes('HealthBreakdownSection'), 'the breakdown is used');
ok(actionsSrc.includes('weakest'), 'the weakest component is named');
ok(uiSrc.includes('Weakest:'), 'and the screen says which');
ok(/not enough data/i.test(uiSrc), 'and a score with no data says so rather than showing 0');
ok(
  /bandFor|healthBandMeta/.test(metaSrc),
  'the client knows the bands',
);

// ── 10. The two tenancy fixes are visible in the code ────────────────────────
section('10. The two tenancy fixes are still in place');

const hodService = readSrc('src/modules/hod/hod.service.ts');
ok(
  hodService.includes('leaveScope(institutionId, dept.id)'),
  'the leave queries are scoped through leaveScope',
);
ok(
  !/prisma\.leaveRequest\.(count|findMany|findFirst)\(\{\s*where:\s*\{\s*institutionId\s*,?\s*status/.test(
    hodService,
  ),
  'and no leave query is filtered by the institution alone',
);
ok(
  hodService.includes('offeringScope(dept.id)'),
  'the workload queries are scoped through offeringScope',
);
ok(
  !/where:\s*\{\s*teacherUserId:\s*\{\s*in:\s*[^}]+\}\s*,\s*\}/.test(hodService),
  'and no offering query is filtered by the teacher alone',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
