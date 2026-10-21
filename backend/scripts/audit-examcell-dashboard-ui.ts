/**
 * Suite: the exam-cell dashboard and mark-roll screens, audited at the source level.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. The mark-roll screen must be wired into FEATURE_MODULES. A screen that exists
 *      but is never registered is dead code, and an `openModule('ExamAttendance')` to an
 *      unregistered key renders NOTHING — `renderContent` finds nothing, falls through to the tab
 *      switcher, and the officer lands back on the dashboard with no error anywhere.
 *
 *   2. NO MOCK SURVIVES. The old dashboard held a `constants/dashboardData.js` with hardcoded
 *      figures — "12", "97", "Data Structures", "Dr. R. Menon" — imported by NOTHING. Dead mock
 *      data is worse than none: it reads like a real answer.
 *
 *   3. NO GUESSED ICONS. The old notification screen guessed the icon from the type string
 *      (`type.includes('EXAM')`). The old dashboard had the same problem in a different place: the
 *      module grid had a hand-written icon list that could not know which section it was drawing.
 *
 *   4. EVERY QUICK ACTION AND ALERT ROUTE IS REGISTERED. A route that is not registered fails
 *      SILENTLY.
 *
 *   5. THE SERVER OWNS THE VOCABULARY. The block list, the action list, the alert kinds, the
 *      colours — all of it comes from the catalogue, and the client mirror is a FALLBACK.
 *
 *   6. THE CLIENT MIRROR AGREES WITH THE SERVER. A mirror that disagrees with its source is worse
 *      than no mirror: it looks like the truth.
 *
 *   7. THE OLD DASHBOARD'S SHAPE IS GONE. No `hero` bag, no `stats` bag, no guessed icons.
 *
 * Run: npx tsx scripts/audit-examcell-dashboard-ui.ts
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

const DS = 'users/exam_cell/pages/dashboard';
const SCREENS = [
  `${DS}/dashboard.js`,
  `${DS}/dashboardMeta.js`,
  `${DS}/dashboardUi.js`,
  `${DS}/dashboardState.js`,
  `${DS}/dashboardActions.js`,
  'users/exam_cell/pages/attendance/attendance.js',
  'users/exam_cell/exam_cell.js',
];

const dashboardSrc = read(`${DS}/dashboard.js`);
const metaSrc = read(`${DS}/dashboardMeta.js`);
const stateSrc = read(`${DS}/dashboardState.js`);
const actionsSrc = read(`${DS}/dashboardActions.js`);
const attendanceSrc = read('users/exam_cell/pages/attendance/attendance.js');
const shellSrc = read('users/exam_cell/exam_cell.js');
const apiSrc = read('services/api.js');
const rulesSrc = readSrc('src/modules/examcell/examcell-dashboard.rules.ts');
const attendanceRulesSrc = readSrc('src/modules/examcell/attendance.rules.ts');

const dashboardCode = stripComments(dashboardSrc);
const metaCode = stripComments(metaSrc);
const stateCode = stripComments(stateSrc);
const actionsCode = stripComments(actionsSrc);
const attendanceCode = stripComments(attendanceSrc);
const shellCode = stripComments(shellSrc);
const apiCode = stripComments(apiSrc);

// ── 1. Every screen exists ─────────────────────────────────────────────────────
section('1. Every screen file exists');

for (const rel of SCREENS) {
  ok(fs.existsSync(path.join(LEARNIX, rel)), `${rel}: exists`);
}

// ── 2. Reachability ───────────────────────────────────────────────────────────
section('2. The mark-roll is REACHABLE');

ok(shellCode.includes('ExamAttendance:'), 'FEATURE_MODULES has the "ExamAttendance" key');
ok(
  shellSrc.includes("from './pages/attendance/attendance'"),
  'the mark-roll component is imported',
);
ok(
  /ExamAttendance:\s*\{[^}]*component:\s*ExamAttendanceScreen/.test(shellCode),
  'and the key points at its own component',
);

// ── 3. No mock survives ────────────────────────────────────────────────────────
section('3. No mock survives');

ok(
  !fs.existsSync(path.join(LEARNIX, DS, 'constants', 'dashboardData.js')),
  'the dead mock file is deleted',
);
ok(
  !fs.existsSync(path.join(LEARNIX, DS, 'constants')),
  'and the directory that held it is gone too',
);
ok(
  !/Dr\. R\. Menon|Data Structures/.test(dashboardSrc + metaSrc + stateSrc + actionsSrc),
  'no hardcoded exam subjects or invigilator names survive',
);

// ── 4. No guessed icons ───────────────────────────────────────────────────────
section('4. No icon is guessed from a string');

for (const [name, code] of [
  ['the dashboard', dashboardCode],
  ['the state sections', stateCode],
  ['the action sections', actionsCode],
  ['the mark-roll', attendanceCode],
]) {
  ok(!/type\?*\.includes\(|type\.includes\(/.test(code), `${name} does not guess an icon from a type string`);
}

// ── 5. Every route is registered ──────────────────────────────────────────────
section('5. Every quick-action and alert route is REGISTERED');

const serverRules = stripComments(rulesSrc);
const routePattern = /route:\s*'([A-Za-z]+)'/g;
const serverRoutes = [...serverRules.matchAll(routePattern)].map((m) => m[1]!);
ok(serverRoutes.length >= 10, 'the server publishes routes', `${serverRoutes.length} routes`);
for (const r of serverRoutes) {
  ok(shellCode.includes(`${r}:`), `FEATURE_MODULES has the "${r}" key`);
}

// ── 6. The client mirror agrees with the server ───────────────────────────────
section('6. The client mirror agrees with the server');

const blockIds = [...serverRules.matchAll(/id:\s*'(EXAM_OVERVIEW|EVALUATION_STATUS|RESULT_PROGRESS|STUDENT_STATISTICS|EXAM_ALERTS|QUICK_ACTIONS|PERFORMANCE_SNAPSHOT)'/g)].map(
  (m) => m[1]!,
);
eq(blockIds.length, 7, 'the server declares seven sections');
for (const id of blockIds) {
  ok(metaCode.includes(`'${id}'`), `the client mirror knows ${id}`);
}

const alertIds = [...serverRules.matchAll(/id:\s*'(TIMETABLE_CONFLICT|MISSING_MARKS|UNRESOLVED_CASE|DEADLINE_OVERDUE|RESULT_BLOCKED|REEVALUATION_OPEN)'/g)].map(
  (m) => m[1]!,
);
eq(alertIds.length, 6, 'the server declares six alert kinds');
for (const id of alertIds) {
  ok(metaCode.includes(`'${id}'`), `the client mirror knows ${id}`);
}

const actionIds = [...serverRules.matchAll(/id:\s*'(CREATE_SCHEDULE|GENERATE_HALL_TICKETS|ENTER_MARKS|PUBLISH_RESULTS)'/g)].map(
  (m) => m[1]!,
);
eq(actionIds.length, 4, 'the server declares four quick actions');
for (const id of actionIds) {
  ok(metaCode.includes(`'${id}'`), `the client mirror knows ${id}`);
}

// THE COLOURS MUST AGREE TOO. A mirror that disagrees about a colour is a mirror that shows a
// HIGH alert in green.
//
// The client uses NAMED CONSTANTS (`THEME`, `RED`, …) rather than repeating the hex, so the
// comparison is against the CONSTANT'S VALUE, not against the literal in the mirror.
const CLIENT_COLOUR_CONSTANTS: Record<string, string> = {
  THEME: '#2563eb',
  RED: '#dc2626',
  AMBER: '#d97706',
  GREEN: '#059669',
  VIOLET: '#7c3aed',
  INDIGO: '#4f46e5',
  CYAN: '#0891b2',
  '#b91c1c': '#b91c1c',
  '#ea580c': '#ea580c',
  '#c2410c': '#c2410c',
};
const clientColours = new Set<string>();
for (const m of metaCode.matchAll(/color:\s*([A-Z_]+|'(#[0-9a-f]{6})')/g)) {
  const token = m[1]!;
  if (token.startsWith("'")) clientColours.add(token.slice(1, -1).toLowerCase());
  else if (CLIENT_COLOUR_CONSTANTS[token]) clientColours.add(CLIENT_COLOUR_CONSTANTS[token]!.toLowerCase());
}
const serverColours = [...serverRules.matchAll(/color:\s*'(#[0-9a-f]{6})'/gi)].map((m) => m[1]!.toLowerCase());
for (const c of new Set(serverColours)) {
  ok(clientColours.has(c), `the client mirror carries the colour ${c}`);
}

// ── 7. The server owns the vocabulary ─────────────────────────────────────────
section('7. The server owns the vocabulary');

ok(dashboardCode.includes('examcellApi.dashboardCatalogue()'), 'the catalogue is fetched');
ok(dashboardCode.includes('examcellApi.dashboardOverview()'), 'the overview is fetched');
ok(
  dashboardCode.includes('catalogue.data?.blocks ?? BLOCKS'),
  'the server list is the source and the mirror is the fallback',
);
ok(dashboardCode.includes('catalogue.data?.quickActions ?? QUICK_ACTIONS'), 'for the quick actions');
ok(dashboardCode.includes('catalogue.data?.alertKinds ?? ALERT_KINDS'), 'and for the alert kinds');

// ── 8. The API surface ────────────────────────────────────────────────────────
section('8. The API surface matches the routes');

for (const m of [
  'dashboardCatalogue',
  'dashboardOverview',
  'dashboardBlock',
  'attendanceRoll',
  'markAttendance',
  'attendanceSummary',
]) {
  ok(apiCode.includes(`${m}:`) || apiCode.includes(`${m}(`), `examcellApi has "${m}"`);
}

const routesSrc = readSrc('src/modules/examcell/examcell-dashboard.routes.ts');
for (const route of [
  "'/dashboard/overview'",
  "'/dashboard/catalogue'",
  "'/dashboard/blocks/:block'",
]) {
  ok(routesSrc.includes(route), `the server has the route ${route}`);
}
const attendanceRoutesSrc = readSrc('src/modules/examcell/attendance.routes.ts');
for (const route of ["'/attendance/slots/:slotId'", "'/attendance/summary'"]) {
  ok(attendanceRoutesSrc.includes(route), `the server has the route ${route}`);
}

// ── 9. The old dashboard is gone ──────────────────────────────────────────────
section('9. The old dashboard is GONE, at the client and at the server');

ok(!apiCode.includes("api.get('/examcell/dashboard')"), 'the old client method is removed');
ok(!/dashboard:\s*\(\)\s*=>\s*api\.get\('\/examcell\/dashboard'\)/.test(apiSrc), 'and it is not aliased either');
ok(
  !/export async function getDashboard/.test(readSrc('src/modules/examcell/examcell.service.ts')),
  'the old server function is removed',
);
ok(
  !/'\/dashboard'/.test(readSrc('src/modules/examcell/examcell.routes.ts')),
  'and the old route is removed',
);
ok(
  dashboardCode.includes('examcellApi.dashboardOverview') &&
    !dashboardCode.includes('examcellApi.dashboard()'),
  'the screen asks for the new surface',
);

// ── 10. The seven sections are all drawn ───────────────────────────────────────
section('10. All seven sections are drawn');

for (const c of [
  'ExamOverviewSection',
  'EvaluationStatusSection',
  'ResultProgressSection',
  'StudentStatisticsSection',
  'ExamAlertsSection',
  'QuickActionsSection',
  'PerformanceSnapshotSection',
]) {
  ok(dashboardCode.includes(c), `the screen draws ${c}`);
}
ok(
  stateCode.includes('ExamOverviewSection') &&
    stateCode.includes('StudentStatisticsSection'),
  'the state sections are defined',
);
ok(
  actionsCode.includes('ExamAlertsSection') &&
    actionsCode.includes('PerformanceSnapshotSection'),
  'and the action sections too',
);

// ── 11. The client computes nothing about the data ────────────────────────────
section('11. The client computes nothing about the data');

for (const [name, code] of [
  ['the state sections', stateCode],
  ['the action sections', actionsCode],
]) {
  ok(
    !/results\.filter\(.*=>\s*.*\.isPass/.test(code),
    `${name} does not count passes itself`,
  );
  ok(!/\.reduce\(/.test(code), `${name} does not aggregate the data itself`);
}

// ── 12. The policy is on the screens ──────────────────────────────────────────
section('12. The policy is on the screens');

ok(
  /not marked yet/i.test(stateCode),
  'the student statistics says "not marked yet" when no roll has been taken',
);
ok(
  /That is not an absence/i.test(stateCode),
  'and says an unmarked student is not an absence',
);
ok(
  /single point, not a trend/i.test(actionsCode),
  'and says a single point is not a trend',
);
ok(
  /not the same as absent/i.test(attendanceCode),
  'the mark-roll says an unmarked student is not absent either',
);

// ── 13. The mark-roll is a bulk write ─────────────────────────────────────────
section('13. The mark-roll is a bulk write');

ok(attendanceCode.includes('examcellApi.markAttendance'), 'it writes the roll');
ok(attendanceCode.includes('marks:'), 'it sends a marks array');
ok(attendanceCode.includes('All present'), 'and it offers a mark-everyone shortcut');
ok(
  !/examcellApi\.markAttendance\([^)]*,\s*\{[^}]*marks:\s*\[\s*\{[^}]*\}\s*\]\s*\}\s*\)/s.test(attendanceCode),
  'and it does not submit one request per student',
);

// ── 14. The old profile and notifications suites still hold ────────────────────
section('14. The X-09 and X-10 surfaces are untouched');

ok(apiCode.includes('notificationCatalogue'), 'the notification catalogue method is still there');
ok(apiCode.includes('profileNotificationPreferences'), 'and the notification preferences');
ok(apiCode.includes('profileActivity'), 'and the activity');
ok(shellCode.includes('ExamPermissions:'), 'the profile sub-screens are still registered');
ok(shellCode.includes('ExamActivity:'), 'all of them');
ok(shellCode.includes('ExamChangePassword:'), 'all of them');
ok(shellCode.includes('ExamHelpSupport:'), 'all of them');

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
