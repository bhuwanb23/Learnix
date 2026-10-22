/**
 * Suite: the HOD's Students desk screens, audited at the source level.
 * Docs: 11-hod.md §3.4
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. The student detail must be REGISTERED in the shell's `FEATURE_MODULES`, and
 *      the shell must CARRY THE PARAM. A missing key renders NOTHING: `renderContent` finds no
 *      component, falls through to the tab switcher, and the HOD lands back on the Students tab
 *      with no error anywhere.
 *
 *   2. THE MIRROR AGREES WITH THE SERVER. The client mirror deliberately duplicates the server's
 *      vocabulary. A mirror that disagrees with its source is worse than no mirror: it looks like
 *      the truth.
 *
 *   3. THE SERVER OWNS THE VOCABULARY. The signals, the states, the intervention kinds and the
 *      thresholds come from the catalogue, and the client mirror is a FALLBACK.
 *
 *   4. NO SCREEN COMPUTES ANYTHING ABOUT THE DATA. A number the client derived is a number the
 *      client can get wrong — and the skill gap is the obvious place for that to happen.
 *
 *   5. THE POLICY IS ON THE SCREENS. "Not measured is not on track", "the weak topics are not a
 *      per-topic score" — these are decisions a HOD is entitled to read, not behaviour to infer
 *      from a grey box.
 *
 *   6. EVERY SUGGESTION IS A BUTTON. A suggestion card that cannot be acted on is a decoration.
 *
 * Run: node node_modules/tsx/dist/cli.mjs scripts/audit-hod-students-ui.ts
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

const SS = 'users/hod/pages/students';
const SCREENS = [
  `${SS}/students.js`,
  `${SS}/studentsMeta.js`,
  `${SS}/studentsStyles.js`,
  `${SS}/studentsUi.js`,
  `${SS}/studentsFrame.js`,
  `${SS}/studentsRow.js`,
  `${SS}/studentsAtRisk.js`,
  `${SS}/studentsInterventions.js`,
  `${SS}/studentsDetail.js`,
  'users/hod/hod.js',
];

const studentsSrc = read(`${SS}/students.js`);
const metaSrc = read(`${SS}/studentsMeta.js`);
const uiSrc = read(`${SS}/studentsUi.js`);
const rowSrc = read(`${SS}/studentsRow.js`);
const atRiskSrc = read(`${SS}/studentsAtRisk.js`);
const interventionsSrc = read(`${SS}/studentsInterventions.js`);
const detailSrc = read(`${SS}/studentsDetail.js`);
const shellSrc = read('users/hod/hod.js');
const apiSrc = read('services/api.js');

const studentsCode = stripComments(studentsSrc);
const metaCode = stripComments(metaSrc);
const uiCode = stripComments(uiSrc);
const rowCode = stripComments(rowSrc);
const atRiskCode = stripComments(atRiskSrc);
const interventionsCode = stripComments(interventionsSrc);
const detailCode = stripComments(detailSrc);
const apiCode = stripComments(apiSrc);

const rulesSrc = stripComments(readSrc('src/modules/hod/hod-students.rules.ts'));
const serviceSrc = stripComments(readSrc('src/modules/hod/hod-students.service.ts'));
const figuresSrc = stripComments(readSrc('src/modules/hod/hod-students.figures.ts'));
const smartSrc = stripComments(readSrc('src/modules/hod/hod-students.smart.ts'));
const routesSrc = readSrc('src/modules/hod/hod-students.routes.ts');

// ═══ 1. Every screen file exists ═══════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) {
  ok(fs.existsSync(path.join(LEARNIX, rel)), `${rel}: exists`);
}

// ═══ 2. Reachability — the registration and the param channel ═════════════
section('2. The student detail is registered and can be reached');

ok(
  shellSrc.includes("StudentDetail: { title: 'Student'"),
  'the shell registers the StudentDetail module',
);
ok(
  shellSrc.includes("import StudentDetailScreen from './pages/students/studentsDetail'"),
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
  /openModule\?\.\('StudentDetail',\s*\{\s*studentProfileId\s*\}\)/.test(studentsSrc),
  'a student row opens the detail with its id',
);
ok(
  /route\?\.params\?\.studentProfileId/.test(detailSrc),
  'the detail reads the student id from the route',
);
ok(detailSrc.includes('hodApi.studentDetail2(studentProfileId)'), 'and fetches the whole student');

// ═══ 3. The mirror agrees with the server ═══════════════════════════════════
section('3. The client mirror agrees with the server');

for (const id of [
  'LOW_ATTENDANCE',
  'DECLINING_MARKS',
  'FAILED_SUBJECTS',
  'REPEATED_ABSENCE',
  'POOR_ASSIGNMENT_COMPLETION',
]) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} signal`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} signal`);
}
for (const id of ['AT_RISK', 'WATCH', 'OK', 'UNMEASURED']) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} state`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} state`);
}
for (const id of [
  'REMEDIAL_CLASS',
  'FACULTY_MENTORING',
  'RESOURCES',
  'PEER_LEARNING',
]) {
  ok(rulesSrc.includes(`'${id}'`), `the server knows the ${id} intervention kind`);
  ok(metaCode.includes(`'${id}'`), `the client mirror knows the ${id} intervention kind`);
}

// THE COUNTS, AND NOT JUST THE NAMES. A mirror that still mentions 'ARCHIVED' in a comparison
// is not a mirror that still HAS the status.
const countList = (src: string, listName: string, ids: string[]): number => {
  const body = src.match(new RegExp(`export const ${listName} = \\[([\\s\\S]*?)\\];`))?.[1] ?? '';
  return ids.filter((id) => new RegExp(`id:\\s*'${id}'`).test(body)).length;
};
eq(
  countList(metaSrc, 'RISK_SIGNALS', [
    'LOW_ATTENDANCE',
    'DECLINING_MARKS',
    'FAILED_SUBJECTS',
    'REPEATED_ABSENCE',
    'POOR_ASSIGNMENT_COMPLETION',
  ]),
  5,
  'the client mirror LIST holds five signals',
);
eq(
  countList(metaSrc, 'RISK_STATES', ['AT_RISK', 'WATCH', 'OK', 'UNMEASURED']),
  4,
  'the client mirror LIST holds four states',
);
eq(
  countList(metaSrc, 'INTERVENTION_TYPES', [
    'REMEDIAL_CLASS',
    'FACULTY_MENTORING',
    'RESOURCES',
    'PEER_LEARNING',
  ]),
  4,
  'the client mirror LIST holds four intervention kinds',
);

// THE WEIGHTS MUST AGREE, to the digit.
const serverWeights = [...rulesSrc.matchAll(/id:\s*'(LOW_ATTENDANCE|DECLINING_MARKS|FAILED_SUBJECTS|REPEATED_ABSENCE|POOR_ASSIGNMENT_COMPLETION)',[\s\S]*?weight:\s*([\d.]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`);
const clientWeights = [...metaCode.matchAll(/id:\s*'(LOW_ATTENDANCE|DECLINING_MARKS|FAILED_SUBJECTS|REPEATED_ABSENCE|POOR_ASSIGNMENT_COMPLETION)',[\s\S]*?weight:\s*([\d.]+)/g)]
  .map((m) => `${m[1]}:${m[2]}`);
eq(clientWeights.length, 5, 'the client mirror declares five weights');
eq(
  JSON.stringify([...clientWeights].sort()),
  JSON.stringify([...serverWeights].sort()),
  'the weights agree with the server',
);

// THE THRESHOLDS.
ok(/attendance:\s*75/.test(metaCode), 'the client mirror states the attendance threshold');
ok(/repeatedAbsenceStreak:\s*3/.test(metaCode), 'the client mirror states the absence streak');
ok(/poorAssignmentCount:\s*2/.test(metaCode), 'the client mirror states the assignment count');
ok(/placementReadyCgpa:\s*7/.test(metaCode), 'the client mirror states the CGPA rule');

// THE COLOURS, RESOLVED FROM THE FILE'S OWN CONSTANTS.
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

// AND THE COLOUR OF EACH ITEM, which is the check that can actually SEE a drift.
//
// The palette check above compares the WHOLE set, and a palette that is used in more than one
// place will keep a colour the drift removed — so it cannot tell "the AT RISK colour changed"
// from "the palette still has a red in it". The per-item check can.
const colourOf = (src: string, id: string): string | null => {
  const m = src.match(
    new RegExp(`id: '${id}',[\\s\\S]{0,400}?color:\\s*(?:'([^']+)'|([A-Z_]+))`),
  );
  if (!m) return null;
  if (m[1]) return m[1].toLowerCase();
  return clientConstants.get(m[2]!) ?? null;
};
const COLOUR_ITEMS = [
  'LOW_ATTENDANCE',
  'DECLINING_MARKS',
  'FAILED_SUBJECTS',
  'REPEATED_ABSENCE',
  'POOR_ASSIGNMENT_COMPLETION',
  'AT_RISK',
  'WATCH',
  'OK',
  'UNMEASURED',
  'REMEDIAL_CLASS',
  'FACULTY_MENTORING',
  'RESOURCES',
  'PEER_LEARNING',
];
for (const id of COLOUR_ITEMS) {
  const server = colourOf(rulesSrc, id);
  const client = colourOf(metaSrc, id);
  ok(
    !!server && !!client && server === client,
    `the client mirror's ${id} colour matches the server`,
    `server=${server} client=${client}`,
  );
}

// ═══ 4. The server owns the vocabulary ═════════════════════════════════════
section('4. The server owns the vocabulary');

ok(studentsCode.includes('hodApi.studentsCatalogue()'), 'the catalogue is fetched');
ok(studentsCode.includes('hodApi.studentsDirectory('), 'the directory is fetched');
ok(studentsCode.includes('catalogue.data?.riskStates'), 'the server state list is the source');
ok(studentsCode.includes('catalogue.data?.sorts'), 'the server sort list is the source');
ok(studentsCode.includes('RISK_STATES.map'), 'and the mirror is the fallback');
ok(
  /riskSignals:\s*RISK_SIGNALS\.map/.test(serviceSrc),
  'the catalogue publishes the signals',
);
ok(
  /interventionTypes:\s*INTERVENTION_TYPES\.map/.test(serviceSrc),
  'the catalogue publishes the intervention kinds',
);

// ═══ 5. No screen computes anything about the data ═════════════════════════
section('5. No screen computes anything about the data');

const FORBIDDEN = [
  { re: /passRate\s*=\s*.*\*/, label: 'a client-computed pass rate' },
  { re: /attendancePct\s*=\s*.*\*/, label: 'a client-computed attendance rate' },
  { re: /cgpa\s*=\s*.*\*/, label: 'a client-computed CGPA' },
  { re: /cohortPercent\s*-/, label: 'a client-computed skill gap' },
  { re: /percentSum/, label: 'a client-computed average' },
];
for (const f of FORBIDDEN) {
  ok(
    !f.re.test(
      studentsCode + detailCode + rowCode + atRiskCode + interventionsCode + uiCode,
    ),
    `the client does not compute ${f.label}`,
  );
}

// THE GAP IS THE SERVER'S, and it is a PERCENTAGE.
ok(figuresSrc.includes('gap: cohortPercent === null ? null : cohortPercent - studentPercent'), 'the gap is the server\'s');
ok(
  figuresSrc.includes('const studentPercent = Math.round(b.percentSum / b.results);'),
  'and the percentage is not multiplied by 100 twice',
);

// ═══ 6. The policy is on the screens ═══════════════════════════════════════
section('6. The policy is on the screens');

ok(uiCode.includes('No signals'), 'the signal chips say when nothing is firing');
ok(atRiskCode.includes('not measured'), 'the at-risk panel says what the unmeasured are');
ok(studentsCode.includes('not measured'), 'and the directory says it too');
ok(
  detailCode.includes('weakTopics.note'),
  'the weak-topics panel renders the server\'s note',
);
ok(
  readSrc('src/modules/hod/hod-students.detail.ts').includes('not a score for each'),
  'and the server says what the weak topics are NOT',
);
ok(
  detailCode.includes('A trend needs at least two results'),
  'and a trend needs two results',
);

// ═══ 7. Every suggestion is a button ═══════════════════════════════════════
section('7. Every suggestion is a button, and every control does something');

ok(
  interventionsCode.includes('Record this intervention'),
  'a suggestion can be recorded',
);
ok(
  interventionsCode.includes('onRecord?.(s)'),
  'and it is wired to the handler',
);
ok(detailCode.includes('hodApi.recordStudentIntervention('), 'the handler calls the API');
ok(detailCode.includes('hodApi.updateStudentIntervention('), 'and the history can be advanced');
ok(interventionsCode.includes('Mark resolved'), 'and the button says what it does');
ok(!/Alert\.alert\(/.test(studentsCode + detailCode + interventionsCode), 'and there is no dead alert');

// THE AT-RISK LIST IS DRAWN, and it is ordered.
ok(studentsCode.includes('<AtRiskPanel'), 'the at-risk panel is drawn');
ok(atRiskCode.includes('onOpen?.(s.studentProfileId)'), 'and its rows open a student');
ok(
  smartSrc.includes('b.risk.signals.length - a.risk.signals.length'),
  'and the server orders it by the number of signals',
);

// ═══ 8. The old endpoint stays ═════════════════════════════════════════════
section('8. The old endpoint stays, and the new one is a different path');

ok(apiCode.includes("students: (year) => api.get(`/hod/students${year ? `?year=${year}` : ''}`)"), 'the old students() stays');
ok(
  apiCode.includes("studentsCatalogue: () => api.get('/hod/students/catalogue')"),
  'the catalogue is a NEW method',
);
ok(apiCode.includes('studentsDirectory: (params = {})'), 'the directory is a NEW method');
ok(apiCode.includes('studentDetail2: (studentProfileId, params = {})'), 'the whole-student detail is a NEW method');
ok(
  apiCode.includes('recordStudentIntervention: (studentProfileId, body)'),
  'the intervention write is a NEW method',
);

// The ROUTES, and the MOUNT ORDER.
ok(routesSrc.includes("'/students/catalogue'"), 'the catalogue is routed');
ok(routesSrc.includes("'/students/directory'"), 'the directory is routed');
ok(routesSrc.includes("'/students/:studentProfileId/detail'"), 'the detail is routed');
ok(routesSrc.includes("'/students/:studentProfileId/interventions'"), 'the intervention write is routed');
const appCode = stripComments(readSrc('src/app.ts'));
const studentsMount = appCode.indexOf("app.use('/api/v1/hod', hodStudentsRoutes)");
const oldMount = appCode.indexOf("app.use('/api/v1/hod', hodRoutes)");
ok(studentsMount >= 0, 'the Students router is mounted at all');
ok(studentsMount < oldMount, 'the Students router is mounted BEFORE the old HOD router');

// ═══ 9. The backend claims the screens rely on ═════════════════════════════
section('9. The backend claims the screens rely on');

ok(rulesSrc.includes('export function riskState'), 'the verdict is computed on the server');
ok(
  rulesSrc.includes("return 'UNMEASURED'"),
  'and an unmeasured student is UNMEASURED, not on track',
);
ok(
  figuresSrc.includes('attendancePct =') &&
    figuresSrc.includes('myAttendance.length === 0 ? null'),
  'and a measure with no data is null, not zero',
);
ok(
  figuresSrc.includes('myAttendance.length > 0 || resultCount > 0'),
  'and the verdict knows what has been measured',
);
ok(figuresSrc.includes('signals.push('), 'the signals are computed on the server');
ok(
  figuresSrc.includes("signals.push('POOR_ASSIGNMENT_COMPLETION')"),
  'including the assignment signal',
);
ok(
  figuresSrc.includes('overdueAssignments.length >= POOR_ASSIGNMENT_COUNT'),
  'and only OVERDUE work counts towards it',
);
ok(
  figuresSrc.includes('myOfferingIds.has(a.offeringId)'),
  'and only the student\'s OWN assignments',
);
ok(
  figuresSrc.includes('longestAbsenceStreak >= REPEATED_ABSENCE_STREAK'),
  'and a repeated absence is a RUN',
);
ok(
  figuresSrc.includes('halves > 0'),
  'and a decline needs two results',
);
ok(
  smartSrc.includes('type.forSignals.some((s) => signals.includes(s))'),
  'and a suggestion is derived from the signal that fired',
);

// ═══ Report ═══════════════════════════════════════════════════════════════
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('audit-hod-students-ui OK');
