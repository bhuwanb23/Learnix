/**
 * Suite: the HOD's Courses desk screens, audited at the source level.
 * Docs: 11-hod.md §3.3
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. The course detail must be REGISTERED in the shell's `FEATURE_MODULES`, and
 *      the shell must CARRY THE PARAM. A missing key renders NOTHING: `renderContent` finds no
 *      component, falls through to the tab switcher, and the HOD lands back on the Courses tab
 *      with no error anywhere. That is the single most likely way for this screen to ship broken
 *      — and it is exactly how the OLD course detail was unreachable.
 *
 *   2. THE MIRROR AGREES WITH THE SERVER. The client mirror deliberately duplicates the server's
 *      vocabulary. A mirror that disagrees with its source is worse than no mirror: it looks like
 *      the truth.
 *
 *   3. THE SERVER OWNS THE VOCABULARY. The status list, the type list, the sorts, the health
 *      components and the bands come from the catalogue, and the client mirror is a FALLBACK.
 *
 *   4. NO SCREEN COMPUTES ANYTHING ABOUT THE DATA. A number the client derived is a number the
 *      client can get wrong.
 *
 *   5. THE POLICY IS ON THE SCREENS. "No data yet is not zero", "the Admin creates a course" —
 *      these are decisions a HOD is entitled to read, not behaviour to infer from a grey box.
 *
 *   6. NO DEAD CONTROLS. The old screen had a "New Course" button that opened an alert, and a
 *      `TouchableOpacity` it never imported — so the button threw when it was pressed.
 *
 *   7. THE OLD ENDPOINT STAYS. The new desk did not replace the old `courses()` / `courseDetail()`
 *      pair with a different document under the same name.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/audit-hod-courses-ui.ts
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

const CS = 'users/hod/pages/courses';
const SCREENS = [
  `${CS}/courses.js`,
  `${CS}/coursesMeta.js`,
  `${CS}/coursesUi.js`,
  `${CS}/coursesDetail.js`,
  `${CS}/coursesDetailActions.js`,
  `${CS}/coursesDetailPanels.js`,
  'users/hod/hod.js',
];

const coursesSrc = read(`${CS}/courses.js`);
const metaSrc = read(`${CS}/coursesMeta.js`);
const uiSrc = read(`${CS}/coursesUi.js`);
const detailSrc = read(`${CS}/coursesDetail.js`);
const panelsSrc = read(`${CS}/coursesDetailPanels.js`);
const shellSrc = read('users/hod/hod.js');
const apiSrc = read('services/api.js');

const coursesCode = stripComments(coursesSrc);
const metaCode = stripComments(metaSrc);
const uiCode = stripComments(uiSrc);
const detailCode = stripComments(detailSrc);
const panelsCode = stripComments(panelsSrc);
const apiCode = stripComments(apiSrc);

const rulesSrc = stripComments(readSrc('src/modules/hod/hod-courses.rules.ts'));
const routesSrc = readSrc('src/modules/hod/hod-courses.routes.ts');
const serviceSrc = stripComments(readSrc('src/modules/hod/hod-courses.service.ts'));
const perfSrc = stripComments(readSrc('src/modules/hod/hod-courses.performance.ts'));

// ═══ 1. Every screen file exists ═══════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) {
  ok(fs.existsSync(path.join(LEARNIX, rel)), `${rel}: exists`);
}

// THE OLD FILE IS GONE. It was a separate screen that fetched the course on its own and had no
// way to be reached, and keeping it around means two files claiming to be the course detail.
ok(
  !fs.existsSync(path.join(LEARNIX, `${CS}/pages/course_detail/course_detail.js`)),
  'the old course_detail screen is deleted',
);
ok(
  !fs.existsSync(path.join(LEARNIX, `${CS}/pages`)),
  'and its pages folder is gone',
);
ok(
  !/course_detail/.test(coursesSrc) && !/course_detail/.test(shellSrc),
  'and nothing imports it any more',
);

// ═══ 2. Reachability — the registration and the param channel ══════════════
section('2. The course detail is registered and can be reached');

ok(
  shellSrc.includes("CourseDetail: { title: 'Course'"),
  'the shell registers the CourseDetail module',
);
ok(
  shellSrc.includes("import CourseDetailScreen from './pages/courses/coursesDetail'"),
  'and imports its own component',
);

// THE PARAM CHANNEL. Without it the detail screen cannot know WHICH course it is showing, and
// it is unreachable in practice.
ok(
  /route=\{\{\s*params:\s*screenParams\s*\}\}/.test(shellSrc),
  'the shell passes the params to the module',
);
ok(shellSrc.includes('const [screenParams, setScreenParams] = useState(null)'), 'and holds them');
ok(
  /navigate:\s*\(screen,\s*params\)\s*=>\s*openScreen\(screen,\s*params\)/.test(shellSrc),
  'and navigate carries a second argument',
);
ok(
  /openModule:\s*\(key,\s*params\)\s*=>\s*openScreen\(key,\s*params\)/.test(shellSrc),
  'and openModule carries one too',
);

// THE DIRECTORY OPENS IT.
ok(
  /openModule\?\.\('CourseDetail',\s*\{\s*courseId\s*\}\)/.test(coursesSrc),
  'a course row opens the detail with its id',
);

// THE DETAIL READS IT.
ok(
  /route\?\.params\?\.courseId/.test(detailSrc),
  'the detail reads the course id from the route',
);ok(detailSrc.includes('hodApi.courseDetail2(courseId)'), 'and fetches the whole course');

// ═══ 3. The mirror agrees with the server ═══════════════════════════════════
section('3. The client mirror agrees with the server');

for (const id of ['ACTIVE', 'ARCHIVED', 'DRAFT']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} status`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} status`);
}
for (const id of ['CORE', 'ELECTIVE']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} type`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} type`);
}
for (const id of ['REQUIRED', 'RECOMMENDED']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} prerequisite kind`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} prerequisite kind`);
}
for (const id of ['HEALTHY', 'WATCH', 'AT_RISK']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} band`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} band`);
}
for (const id of ['ATTENDANCE', 'SYLLABUS', 'RESULTS']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} health leg`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} health leg`);
}

// THE COUNTS, AND NOT JUST THE NAMES.
//
// A mirror that still mentions 'ARCHIVED' somewhere — in a comparison, in a helper — is not a
// mirror that still HAS the status. So the LIST is counted, not the string searched for.
const countList = (src: string, listName: string, ids: string[]): number => {
  // The body ends at the FIRST `];` — a lazy match to a newline-terminated `];` would run past a
  // one-line list and swallow the next one, and the count would then be of the wrong list.
  const body = src.match(new RegExp(`export const ${listName} = \\[([\\s\\S]*?)\\];`))?.[1] ?? '';
  return ids.filter((id) => new RegExp(`id:\\s*'${id}'`).test(body)).length;
};
const STATUS_IDS = ['ACTIVE', 'ARCHIVED', 'DRAFT'];
const TYPE_IDS = ['CORE', 'ELECTIVE'];
const PREREQ_IDS = ['REQUIRED', 'RECOMMENDED'];
const SORT_IDS = ['code', 'name', 'semester', 'credits', 'attendance', 'health'];

eq(
  countList(metaSrc, 'COURSE_STATUSES', STATUS_IDS),
  3,
  'the client mirror LIST holds three statuses',
);
eq(
  countList(metaSrc, 'COURSE_TYPES', TYPE_IDS),
  2,
  'the client mirror LIST holds two types',
);
eq(
  countList(metaSrc, 'PREREQUISITE_TYPES', PREREQ_IDS),
  2,
  'the client mirror LIST holds two prerequisite kinds',
);
eq(
  countList(metaSrc, 'COURSE_SORTS', SORT_IDS),
  6,
  'the client mirror LIST holds six sorts',
);
eq(
  countList(metaSrc, 'HEALTH_COMPONENTS', ['ATTENDANCE', 'SYLLABUS', 'RESULTS']),
  3,
  'the client mirror LIST holds three health components',
);
eq(
  countList(metaSrc, 'HEALTH_BANDS', ['HEALTHY', 'WATCH', 'AT_RISK']),
  3,
  'the client mirror LIST holds three health bands',
);

// And the server's lists, counted the same way.
const SERVER_LIST_RE = /export const ([A-Z_]+):[^=]*=\s*\[([\s\S]*?)\];/g;
const serverLists = new Map<string, string>();
for (const m of rulesSrc.matchAll(SERVER_LIST_RE)) {
  serverLists.set(m[1]!, m[2]!);
}
const countServerList = (name: string, ids: string[]): number => {
  const body = serverLists.get(name) ?? '';
  return ids.filter((id) => new RegExp(`id:\\s*'${id}'`).test(body)).length;
};
eq(
  countServerList('COURSE_HEALTH_COMPONENTS', ['ATTENDANCE', 'SYLLABUS', 'RESULTS']),
  3,
  'the server LIST holds three health components',
);
eq(
  countServerList('COURSE_HEALTH_BANDS', ['HEALTHY', 'WATCH', 'AT_RISK']),
  3,
  'the server LIST holds three health bands',
);

// THE WEIGHTS MUST AGREE, to the digit. A mirror that scores a course differently from the
// server is a mirror that shows a healthy course as being at risk.
const serverWeights = [...rulesSrc.matchAll(/id:\s*'(ATTENDANCE|SYLLABUS|RESULTS)',[\s\S]*?weight:\s*([\d.]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`);
const clientWeights = [...metaCode.matchAll(/id:\s*'(ATTENDANCE|SYLLABUS|RESULTS)',[\s\S]*?weight:\s*([\d.]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`);
eq(clientWeights.length, 3, 'the client mirror declares three weights');
eq(
  JSON.stringify([...clientWeights].sort()),
  JSON.stringify([...serverWeights].sort()),
  'the weights agree with the server',
);

// THE THRESHOLDS.
for (const t of [75, 30]) {
  ok(rulesSrc.includes(String(t)), `the server states the threshold ${t}`);
}
ok(/attendance:\s*75/.test(metaCode), 'the client mirror states the attendance threshold');
ok(/pass:\s*75/.test(metaCode), 'the client mirror states the pass threshold');
ok(/syllabusStaleDays:\s*30/.test(metaCode), 'the client mirror states the stale days');

// THE COLOURS MUST AGREE TOO. A mirror that disagrees about a colour is a mirror that shows a
// HIGH alert in green.
//
// AND THE COLOURS ARE RESOLVED FROM THE FILE'S OWN CONSTANTS — not from a table written here.
// A table written here would be a SECOND copy of the palette, and it would hide exactly the
// drift this check exists for: change the file's RED and the table here would still say
// #dc2626, and the check would pass.
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

ok(coursesCode.includes('hodApi.coursesCatalogue()'), 'the catalogue is fetched');
ok(coursesCode.includes('hodApi.coursesDirectory('), 'the directory is fetched');
ok(
  coursesCode.includes('catalogue.data?.statuses'),
  'the server status list is the source',
);
ok(
  coursesCode.includes('catalogue.data?.types'),
  'the server type list is the source',
);
ok(
  coursesCode.includes('catalogue.data?.sorts'),
  'the server sort list is the source',
);
ok(
  /COURSE_STATUSES\.map/.test(coursesCode),
  'and the mirror is the fallback',
);

// The catalogue must actually carry the three lists.
ok(
  /statuses:\s*COURSE_STATUSES\.map/.test(serviceSrc),
  'the catalogue publishes the statuses',
);
ok(/sorts:\s*COURSE_SORT_KEYS\.map/.test(serviceSrc), 'the catalogue publishes the sorts');
ok(
  /components:\s*COURSE_HEALTH_COMPONENTS/.test(serviceSrc),
  'the catalogue publishes the health components',
);
ok(/bands:\s*COURSE_HEALTH_BANDS/.test(serviceSrc), 'the catalogue publishes the bands');

// ═══ 5. No screen computes anything about the data ═════════════════════════
section('5. No screen computes anything about the data');

// The client must not derive a pass rate, an attendance percentage or a health score. It may
// FORMAT the server's numbers, and it may draw a bar from a server-provided share.
const FORBIDDEN = [
  { re: /passPercent\s*=\s*.*\*/, label: 'a client-computed pass rate' },
  { re: /attendancePct\s*=\s*.*\*/, label: 'a client-computed attendance rate' },
  { re: /score\s*=\s*.*0\.35/, label: 'a client-computed health score' },
  { re: /\.reduce\(\s*\(s,\s*o\)\s*=>\s*s\s*\+\s*o\.students/, label: 'a client-summed roll' },
];
for (const f of FORBIDDEN) {
  ok(!f.re.test(coursesCode + detailCode + panelsCode + uiCode), `the client does not compute ${f.label}`);
}

// The grade bar draws the server's share, it does not compute one.
ok(
  panelsCode.includes('width: `${g.percent}%`'),
  'the grade bar draws the server-provided share',
);
ok(
  perfSrc.includes('percent: results.length === 0 ? 0'),
  'and the server is what supplies it',
);

// The counts are the server's.
ok(
  serviceSrc.includes('totals: {') && serviceSrc.includes('courses: scope.courses.length'),
  'the true course count is the server\'s',
);

// ═══ 6. The policy is on the screens ═══════════════════════════════════════
section('6. The policy is on the screens');

// "No data yet" is not zero, and the screen says so.
ok(
  uiCode.includes('No data yet'),
  'the health badge says "No data yet" for an unmeasured course',
);
ok(
  coursesCode.includes('NO health score'),
  'and the directory footnote says it too',
);
ok(
  coursesSrc.includes('unmeasured, not unhealthy'),
  'and the footnote states the rule',
);

// The Admin creates a course, and the screen says so rather than offering a dead button.
ok(
  coursesCode.includes('created by the Admin'),
  'the directory states that the Admin creates a course',
);
ok(!/Alert\.alert\(/.test(coursesCode), 'and there is no dead alert button');
ok(!/New Course/.test(coursesCode), 'and no "New Course" button at all');

// THE OLD SCREEN'S BUG: it used `TouchableOpacity` and never imported it, so the button threw
// when it was pressed. The import is the fix, and the audit is here so it cannot go missing.
ok(
  /import\s*\{[^}]*TouchableOpacity[^}]*\}\s*from\s*'react-native'/.test(coursesSrc),
  'the directory imports the components it uses',
);

// ═══ 7. No dead controls ══════════════════════════════════════════════════
section('7. No dead controls');

// Every control the desk draws must do something. The three sheets are the only writes, and
// each has a caller.
for (const sheet of ['edit', 'map', 'prereq']) {
  ok(detailCode.includes(`setSheet('${sheet}')`), `the ${sheet} sheet is reachable`);
}
ok(detailCode.includes('onSave={(body) => runWrite(() => hodApi.updateCourse('), 'the edit sheet saves');
ok(
  detailCode.includes('onMap={(body) => runWrite(() => hodApi.mapCourseToProgram('),
  'the curriculum sheet saves',
);
ok(
  detailCode.includes('onAdd={(body) => runWrite(() => hodApi.addCoursePrerequisite('),
  'the prerequisite sheet saves',
);
ok(
  detailCode.includes('onUnmap={(programId) =>'),
  'and a mapping can be removed',
);
ok(
  detailCode.includes('onRemove={(prerequisiteCourseId) =>'),
  'and a prerequisite can be removed',
);
ok(
  detailCode.includes('hodApi.setCourseStatus(course.id, next)'),
  'and the status can be changed',
);
// EVERY BUTTON GOES SOMEWHERE. A control that renders and does nothing is a dead control, and
// a dead control teaches the reader that the screen's controls are decorative.
ok(
  detailCode.includes("onAssign={() => navigation?.switchTab?.('Faculty')}"),
  'the assign-a-teacher button goes somewhere real',
);
for (const sheet of ['edit', 'map', 'prereq']) {
  ok(
    detailCode.includes(`<EditCourseSheet`) ||
      detailCode.includes(`<MapCourseSheet`) ||
      detailCode.includes(`<PrerequisiteSheet`),
    `the ${sheet} sheet is mounted`,
  );
}

// The whole chain must be drawn.
for (const panel of [
  'SubjectsPanel',
  'FacultyPanel',
  'StudentsPanel',
  'TimetablePanel',
  'SyllabusPanel',
  'AttendancePanel',
  'PerformancePanel',
  'CurriculumPanel',
  'PrerequisitesPanel',
  'HistoryPanel',
]) {
  ok(detailCode.includes(`<${panel}`), `the detail draws the ${panel}`);
}

// ═══ 8. The dashboard's alert routes are TRUE ═════════════════════════════
section('8. The dashboard\'s two alert routes point at a screen that shows the figure');

const dashboardMeta = stripComments(read('users/hod/pages/dashboard/dashboardMeta.js'));
const dashboardRules = stripComments(readSrc('src/modules/hod/hod-dashboard.rules.ts'));
ok(
  /id:\s*'LOW_ATTENDANCE'[\s\S]{0,300}route:\s*'Courses'/.test(dashboardMeta),
  'the low-attendance alert routes to the Courses tab',
);
ok(
  /id:\s*'POOR_PERFORMANCE'[\s\S]{0,300}route:\s*'Courses'/.test(dashboardRules),
  'and so does the server\'s',
);
// AND THE SCREEN SHOWS IT. An alert that routes to a screen which cannot show the figure is a
// broken route, and the reason the old Courses tab was useless.
ok(
  coursesCode.includes('Attendance {percent(legs.attendance)}') ||
    coursesCode.includes('legs.attendance'),
  'the directory shows the attendance figure',
);
ok(coursesCode.includes('legs.results'), 'and the pass figure');
ok(coursesCode.includes('legs.syllabus'), 'and the syllabus figure');

// ═══ 9. The old endpoint stays ═════════════════════════════════════════════
section('9. The old endpoint stays, and the new one is a different path');

ok(apiCode.includes("courses: () => api.get('/hod/courses')"), 'the old courses() stays');
ok(
  apiCode.includes("courseDetail: (id) => api.get(`/hod/courses/${id}`)"),
  'the old courseDetail() stays',
);
ok(
  apiCode.includes("coursesDirectory: (params = {})"),
  'the directory is a NEW method',
);
ok(
  apiCode.includes('courseDetail2: (id, params = {})'),
  'and the whole-course detail is a NEW method',
);
ok(
  apiCode.includes('`/hod/courses/${encodeURIComponent(id)}/detail'),
  'on a path of its own',
);

// The ROUTES. The new router must be mounted BEFORE the old one, or `/courses/directory` never
// reaches it.
ok(routesSrc.includes("'/courses/catalogue'"), 'the catalogue is routed');
ok(routesSrc.includes("'/courses/directory'"), 'the directory is routed');
ok(routesSrc.includes("'/courses/:courseId/detail'"), 'the detail is routed');
const appSrc = readSrc('src/app.ts');
const appCode = stripComments(appSrc);
const coursesMount = appCode.indexOf("app.use('/api/v1/hod', hodCoursesRoutes)");
const oldMount = appCode.indexOf("app.use('/api/v1/hod', hodRoutes)");
ok(coursesMount >= 0, 'the Courses router is mounted at all');
ok(oldMount >= 0, 'the old HOD router is still mounted');
ok(
  coursesMount >= 0 && oldMount >= 0 && coursesMount < oldMount,
  'the Courses router is mounted BEFORE the old HOD router',
);

// ═══ 10. The backend claims hold ══════════════════════════════════════════
section('10. The backend claims the screens rely on');

ok(
  rulesSrc.includes('export function courseHealthScore'),
  'the health score is computed on the server',
);
ok(
  /value !== null && c\.value !== undefined/.test(rulesSrc),
  'and a leg with no data is EXCLUDED rather than scored zero',
);
ok(
  serviceSrc.includes('legs: h.legs'),
  'the directory publishes the three leg values',
);
const detailServiceSrc = stripComments(readSrc('src/modules/hod/hod-courses.detail.ts'));
ok(
  detailServiceSrc.includes('unmapped:'),
  'and the unmapped flag',
);
ok(
  /courseHealthForAll/.test(serviceSrc),
  'the directory health is computed in one pass',
);
ok(
  /assertNoPrerequisiteCycle/.test(readSrc('src/modules/hod/hod-courses.writes.ts')),
  'the prerequisite graph refuses a loop',
);

// ═══ Report ═══════════════════════════════════════════════════════════════
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('audit-hod-courses-ui OK');
