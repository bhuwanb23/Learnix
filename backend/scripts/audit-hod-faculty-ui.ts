/**
 * Suite: the HOD's Faculty desk screens, audited at the source level.
 * Docs: 11-hod.md §3.2
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. The faculty detail must be REGISTERED in the shell's `FEATURE_MODULES`, and
 *      the shell must CARRY THE PARAM. A missing key renders NOTHING: `renderContent` finds no
 *      component, falls through to the tab switcher, and the HOD lands back on the Faculty tab
 *      with no error anywhere.
 *
 *   2. THE MIRROR AGREES WITH THE SERVER. The client mirror deliberately duplicates the server's
 *      vocabulary. A mirror that disagrees with its source is worse than no mirror: it looks like
 *      the truth.
 *
 *   3. THE SERVER OWNS THE VOCABULARY. The bands, the legs, the statuses, the sorts and the
 *      thresholds come from the catalogue, and the client mirror is a FALLBACK.
 *
 *   4. NO SCREEN COMPUTES ANYTHING ABOUT THE DATA. A number the client derived is a number the
 *      client can get wrong — and the workload unit is the obvious place for that to happen.
 *
 *   5. THE POLICY IS ON THE SCREENS. "No data yet is not zero", "the Admin creates a teacher" —
 *      these are decisions a HOD is entitled to read, not behaviour to infer from a grey box.
 *
 *   6. NO DEAD CONTROLS. The old screen had an "Add" button that opened an alert, and a
 *      `TouchableOpacity` it never imported — so the button threw when it was pressed.
 *
 *   7. THE OLD ENDPOINT STAYS.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/audit-hod-faculty-ui.ts
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

const FS = 'users/hod/pages/faculty';
const SCREENS = [
  `${FS}/faculty.js`,
  `${FS}/facultyMeta.js`,
  `${FS}/facultyStyles.js`,
  `${FS}/facultyUi.js`,
  `${FS}/facultyFrame.js`,
  `${FS}/facultyRow.js`,
  `${FS}/facultyDirectory.js`,
  `${FS}/facultyProgress.js`,
  `${FS}/facultyDetail.js`,
  `${FS}/facultyDetailPanels.js`,
  'users/hod/hod.js',
];

const facultySrc = read(`${FS}/faculty.js`);
const metaSrc = read(`${FS}/facultyMeta.js`);
const uiSrc = read(`${FS}/facultyUi.js`);
const directorySrc = read(`${FS}/facultyDirectory.js`);
const rowSrc = read(`${FS}/facultyRow.js`);
const progressSrc = read(`${FS}/facultyProgress.js`);
const detailSrc = read(`${FS}/facultyDetail.js`);
const detailPanelsSrc = read(`${FS}/facultyDetailPanels.js`);
const shellSrc = read('users/hod/hod.js');
const apiSrc = read('services/api.js');

const facultyCode = stripComments(facultySrc);
const metaCode = stripComments(metaSrc);
const uiCode = stripComments(uiSrc);
const directoryCode = stripComments(directorySrc);
const rowCode = stripComments(rowSrc);
const progressCode = stripComments(progressSrc);
const detailCode = stripComments(detailSrc);
const detailPanelsCode = stripComments(detailPanelsSrc);
const apiCode = stripComments(apiSrc);

const rulesSrc = stripComments(readSrc('src/modules/hod/hod-faculty.rules.ts'));
const serviceSrc = stripComments(readSrc('src/modules/hod/hod-faculty.service.ts'));
const detailSvcSrc = stripComments(readSrc('src/modules/hod/hod-faculty.detail.ts'));
const routesSrc = readSrc('src/modules/hod/hod-faculty.routes.ts');
const hodServiceSrc = stripComments(readSrc('src/modules/hod/hod.service.ts'));

// ═══ 1. Every screen file exists ═══════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) {
  ok(fs.existsSync(path.join(LEARNIX, rel)), `${rel}: exists`);
}

// THE OLD FILE IS GONE. It was a separate screen fetched independently, and keeping it around
// means two files claiming to be the faculty detail.
ok(
  !fs.existsSync(path.join(LEARNIX, `${FS}/pages/faculty_detail/faculty_detail.js`)),
  'the old faculty_detail screen is deleted',
);
ok(!fs.existsSync(path.join(LEARNIX, `${FS}/pages`)), 'and its pages folder is gone');
ok(
  !/faculty_detail/.test(facultySrc) && !/faculty_detail/.test(shellSrc),
  'and nothing imports it any more',
);

// ═══ 2. Reachability — the registration and the param channel ═════════════
section('2. The faculty detail is registered and can be reached');

ok(
  shellSrc.includes("FacultyDetail: { title: 'Faculty'"),
  'the shell registers the FacultyDetail module',
);
ok(
  shellSrc.includes("import FacultyDetailScreen from './pages/faculty/facultyDetail'"),
  'and imports its own component',
);
ok(
  /route=\{\{\s*params:\s*screenParams\s*\}\}/.test(shellSrc),
  'the shell passes the params to the module',
);
ok(
  /navigate:\s*\(screen,\s*params\)\s*=>\s*openScreen\(screen,\s*params\)/.test(shellSrc),
  'and navigate carries a second argument',
);
ok(
  /openModule:\s*\(key,\s*params\)\s*=>\s*openScreen\(key,\s*params\)/.test(shellSrc),
  'and openModule carries one too',
);
ok(
  /openModule\?\.\('FacultyDetail',\s*\{\s*userId\s*\}\)/.test(facultySrc),
  'a faculty row opens the detail with its id',
);
ok(
  /route\?\.params\?\.userId/.test(detailSrc),
  'the detail reads the teacher id from the route',
);
ok(detailSrc.includes('hodApi.facultyDetail2(userId)'), 'and fetches the whole teacher');

// ═══ 3. The mirror agrees with the server ═══════════════════════════════════
section('3. The client mirror agrees with the server');

for (const id of ['OVERLOADED', 'HEAVY', 'BALANCED', 'LIGHT', 'UNDERUTILISED']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} band`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} band`);
}
for (const id of ['DELIVERY', 'ATTENDANCE', 'SYLLABUS', 'CLASS_PERFORMANCE']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} leg`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} leg`);
}
for (const id of ['STRONG', 'STEADY', 'NEEDS_SUPPORT']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} insight band`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} insight band`);
}

// THE COUNTS, AND NOT JUST THE NAMES. A mirror that still mentions 'OVERLOADED' in a comparison
// is not a mirror that still HAS the band.
const countList = (src: string, listName: string, ids: string[]): number => {
  const body = src.match(new RegExp(`export const ${listName} = \\[([\\s\\S]*?)\\];`))?.[1] ?? '';
  return ids.filter((id) => new RegExp(`id:\\s*'${id}'`).test(body)).length;
};
eq(
  countList(metaSrc, 'WORKLOAD_BANDS', ['OVERLOADED', 'HEAVY', 'BALANCED', 'LIGHT', 'UNDERUTILISED']),
  5,
  'the client mirror LIST holds five workload bands',
);
eq(
  countList(metaSrc, 'INSIGHT_LEGS', ['DELIVERY', 'ATTENDANCE', 'SYLLABUS', 'CLASS_PERFORMANCE']),
  4,
  'the client mirror LIST holds four insight legs',
);
eq(
  countList(metaSrc, 'INSIGHT_BANDS', ['STRONG', 'STEADY', 'NEEDS_SUPPORT']),
  3,
  'the client mirror LIST holds three insight bands',
);

// THE WEIGHTS MUST AGREE, to the digit.
const serverWeights = [...rulesSrc.matchAll(/id:\s*'(DELIVERY|ATTENDANCE|SYLLABUS|CLASS_PERFORMANCE)',[\s\S]*?weight:\s*([\d.]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`);
const clientWeights = [...metaCode.matchAll(/id:\s*'(DELIVERY|ATTENDANCE|SYLLABUS|CLASS_PERFORMANCE)',[\s\S]*?weight:\s*([\d.]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`);
eq(clientWeights.length, 4, 'the client mirror declares four weights');
eq(
  JSON.stringify([...clientWeights].sort()),
  JSON.stringify([...serverWeights].sort()),
  'the weights agree with the server',
);

// THE THRESHOLDS.
ok(/overloadedPct:\s*100/.test(metaCode), 'the client mirror states the overload threshold');
ok(/underutilisedPct:\s*25/.test(metaCode), 'the client mirror states the underuse floor');
ok(
  /minFreeHoursToSuggest:\s*2/.test(metaCode),
  'the client mirror states the suggestion floor',
);

// THE COLOURS, RESOLVED FROM THE FILE'S OWN CONSTANTS — not from a table written here.
const clientConstants = new Map<string, string>();
for (const m of metaSrc.matchAll(/export const ([A-Z_]+)\s*=\s*['"](#[0-9a-f]{6})['"]/gi)) {
  clientConstants.set(m[1]!, m[2]!.toLowerCase());
}
ok(clientConstants.size >= 8, 'the client mirror declares its palette constants');
const clientColours = new Set<string>();
for (const m of metaCode.matchAll(/color:\s*([A-Z_]+|['"](#[0-9a-f]{6})['"])/g)) {
  const token = m[1]!;
  if (token.startsWith("'") || token.startsWith('"')) {
    clientColours.add(token.slice(1, -1).toLowerCase());
  } else {
    const hex = clientConstants.get(token);
    if (hex) clientColours.add(hex);
  }
}
const serverColours = [...rulesSrc.matchAll(/color:\s*['"](#[0-9a-f]{6})['"]/gi)].map((m) =>
  m[1]!.toLowerCase(),
);
for (const c of new Set(serverColours)) {
  ok(clientColours.has(c), `the client mirror carries the colour ${c}`);
}

// ═══ 4. The server owns the vocabulary ═════════════════════════════════════
section('4. The server owns the vocabulary');

ok(facultyCode.includes('hodApi.facultyCatalogue()'), 'the catalogue is fetched');
ok(facultyCode.includes('hodApi.facultyDirectory('), 'the directory is fetched');
ok(facultyCode.includes('catalogue.data?.statuses'), 'the server status list is the source');
ok(facultyCode.includes('catalogue.data?.workloadBands'), 'the server band list is the source');
ok(facultyCode.includes('catalogue.data?.sorts'), 'the server sort list is the source');
ok(facultyCode.includes('WORKLOAD_BANDS.map'), 'and the mirror is the fallback');ok(
  /statuses:\s*FACULTY_STATUSES\.map/.test(serviceSrc),
  'the catalogue publishes the statuses',
);
ok(
  /workloadBands:\s*WORKLOAD_BANDS\.map/.test(serviceSrc),
  'the catalogue publishes the workload bands',
);
ok(
  /insightLegs:\s*FACULTY_INSIGHT_LEGS/.test(serviceSrc),
  'the catalogue publishes the insight legs',
);
ok(
  /availabilityDays:\s*AVAILABILITY_DAYS/.test(serviceSrc),
  'the catalogue publishes the availability days',
);

// ═══ 5. No screen computes anything about the data ═════════════════════════
section('5. No screen computes anything about the data');

// The client must not derive a utilisation percentage or an insight score. It may FORMAT the
// server's numbers.
const FORBIDDEN = [
  { re: /utilizationPct\s*=\s*.*\*/, label: 'a client-computed utilisation' },
  { re: /score\s*=\s*.*0\.3/, label: 'a client-computed insight score' },
  { re: /assignedWeeklyHours\s*=\s*.*\*/, label: 'a client-computed load' },
  { re: /freeHours\s*=\s*.*-/, label: 'a client-computed free-hours figure' },
];
for (const f of FORBIDDEN) {
  ok(
    !f.re.test(
      facultyCode + detailCode + directoryCode + rowCode + progressCode + uiCode +
        detailPanelsCode,
    ),
    `the client does not compute ${f.label}`,
  );
}

// THE WORKLOAD UNIT IS HOURS, and the screen says so.
ok(
  rowCode.includes('assignedWeeklyHours') && rowCode.includes('maxWorkloadHours'),
  'the screen reads the server\'s hours',
);
ok(
  rowCode.includes('faculty.workload?.utilizationPct'),
  'and the bar is the server\'s own percentage, not a division done on the phone',
);
ok(
  !/assignedWeeklyHours\s*\/\s*faculty/.test(rowCode) &&
    !/assignedWeeklyHours\s*\/\s*.*maxWorkloadHours/.test(rowCode),
  'and the client never divides the load by the cap itself',
);

// THE SERVER MEASURES IN HOURS TOO — the guard, the service and the old list.
ok(
  /durationHours\(slot\.startTime, slot\.endTime\)/.test(hodServiceSrc),
  'the reassign guard measures the load in HOURS',
);
ok(
  !/_count: \{ select: \{ scheduleSlots: true \} \}[\s\S]{0,200}maxWorkloadHours/.test(hodServiceSrc),
  'and it does not compare a slot count against a hours cap',
);

// ═══ 6. The policy is on the screens ═══════════════════════════════════════
section('6. The policy is on the screens');

ok(uiCode.includes('No data yet'), 'the insight badge says "No data yet" for an unmeasured teacher');
ok(
  facultyCode.includes('joins the department through the Admin'),
  'and the directory says the Admin adds a teacher',
);
ok(!/Alert\.alert\(/.test(facultyCode), 'and there is no dead alert button');
ok(!/Add Faculty/.test(facultyCode), 'and no dead "Add Faculty" button');

// THE OLD SCREEN'S BUG: it used `TouchableOpacity` and never imported it, so the button threw
// when it was pressed. The import is the fix.
ok(
  /import\s*\{[^}]*TouchableOpacity[^}]*\}\s*from\s*'react-native'/.test(facultySrc + uiSrc),
  'the screens import the components they use',
);

// ═══ 7. No dead controls ══════════════════════════════════════════════════
section('7. No dead controls');

for (const panel of [
  'WorkloadBalancer',
  'AvailabilityMatrix',
  'TeachingProgress',
  'FacultyRow',
]) {
  ok(facultyCode.includes(`<${panel}`), `the directory draws the ${panel}`);
}
ok(detailCode.includes('<SubjectsPanel'), 'the detail draws the subjects');
ok(detailPanelsCode.includes('title="Assigned subjects"'), 'and the subjects panel carries it');
ok(detailPanelsCode.includes('title="Classes"'), 'and the classes panel too');
ok(detailCode.includes('<InsightGauge'), 'the detail draws the insight gauge');
ok(detailCode.includes('<InsightBreakdown'), 'the detail draws the insight breakdown');
ok(detailCode.includes('<WorkloadBar'), 'the detail draws the workload bar');
ok(detailCode.includes('title="Attendance"'), 'the detail draws the attendance');
ok(detailCode.includes('title="Syllabus"'), 'the detail draws the syllabus');
ok(detailCode.includes('title="Student performance"'), 'the detail draws the performance');
ok(detailCode.includes('title="Activity history"'), 'the detail draws the activity history');

// ═══ 8. The old endpoint stays ═════════════════════════════════════════════
section('8. The old endpoint stays, and the new one is a different path');

ok(apiCode.includes("faculty: () => api.get('/hod/faculty')"), 'the old faculty() stays');
ok(apiCode.includes("facultyCatalogue: () => api.get('/hod/faculty/catalogue')"), 'the catalogue is a NEW method');
ok(apiCode.includes('facultyDirectory: (params = {})'), 'the directory is a NEW method');
ok(apiCode.includes('facultyDetail2: (userId, params = {})'), 'the whole-teacher detail is a NEW method');
ok(
  apiCode.includes('/hod/faculty/${encodeURIComponent(userId)}/detail'),
  'on a path of its own',
);

// The ROUTES, and the MOUNT ORDER.
ok(routesSrc.includes("'/faculty/catalogue'"), 'the catalogue is routed');
ok(routesSrc.includes("'/faculty/directory'"), 'the directory is routed');
ok(routesSrc.includes("'/faculty/:userId/detail'"), 'the detail is routed');
const appCode = stripComments(readSrc('src/app.ts'));
const facultyMount = appCode.indexOf("app.use('/api/v1/hod', hodFacultyRoutes)");
const oldMount = appCode.indexOf("app.use('/api/v1/hod', hodRoutes)");
ok(facultyMount >= 0, 'the Faculty router is mounted at all');
ok(facultyMount < oldMount, 'the Faculty router is mounted BEFORE the old HOD router');

// ═══ 9. The backend claims the screens rely on ═════════════════════════════
section('9. The backend claims the screens rely on');

ok(rulesSrc.includes('export function facultyInsightScore'), 'the insight score is computed on the server');
ok(
  /value !== null && c\.value !== undefined/.test(rulesSrc) ||
    /value !== null && l\.value !== undefined/.test(rulesSrc),
  'and a leg with no data is EXCLUDED rather than scored zero',
);
ok(serviceSrc.includes('balancer: buildBalancer(rows)'), 'the balancer is built by the server');
ok(serviceSrc.includes('availability: buildAvailabilityMatrix(rows)'), 'the matrix is built by the server');
ok(serviceSrc.includes('progress: buildProgressMonitor(rows)'), 'the progress monitor is built by the server');
ok(serviceSrc.includes('MIN_FREE_HOURS_TO_SUGGEST'), 'and a target with no headroom is not offered');
ok(detailSvcSrc.includes('subjects:'), 'the detail publishes the subjects');
ok(detailSvcSrc.includes('classes,'), 'and the classes');
ok(detailSvcSrc.includes('performance:'), 'and the performance');
ok(detailSvcSrc.includes('activity:'), 'and the activity');

// ═══ Report ═══════════════════════════════════════════════════════════════
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('audit-hod-faculty-ui OK');
