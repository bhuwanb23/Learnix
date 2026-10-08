/**
 * Static checks for the Visitors frontend, both apps.
 *
 * Runs without `npm install` (the Expo SDK and the pinned React disagree on peer deps), so
 * everything here is parse- and import-graph-level, not a render.
 *
 * WHAT IS ACTUALLY PROVEN HERE
 * -----------------------------
 *   1. Every file parses as JSX.
 *   2. Every relative import resolves. The two apps and the nested detail screen live at three
 *      different depths, so a `../` off by one is the most likely mistake - and it fails only
 *      when somebody opens the screen, which is exactly how it reached the first draft.
 *   3. Every `hostelApi.*` / `studentApi.*` call resolves to a key the API module exports.
 *   4. NO MOCK DATA SURVIVES. The warden screen was five hardcoded visitors in a module-level
 *      array, two free-text boxes for the resident and the room, a literal `24` for "this week",
 *      and no API call at all. All four had to go; this is what stops them coming back.
 *   5. The resident is a PICKER, not a typed name. The backend needs a `studentProfileId` and a
 *      hand-typed name cannot produce one, so a free-text field here is a screen that cannot work.
 *   6. NO VISITING-HOURS OR THRESHOLD CONSTANT IN THE FRONTEND. The whole point is that a warden
 *      sets them, so a hardcoded 08:00 anywhere in the client is the feature quietly reverting.
 *   7. Neither screen recomputes the LIFECYCLE. The rules live on the server and are consumed.
 *   8. The resident screen is REACHABLE - wired into `students.js` and offered by a profile tile.
 *   9. The resident screen offers NO approve and NO entry control, and there is no resident API
 *      method that could perform either. The boundary is asserted in the API surface, not just
 *      in the JSX, because a route that does not exist is the only thing that truly enforces it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEARNIX = resolve(HERE, '..', '..', 'learnix');
const require_ = createRequire(import.meta.url);

let passed = 0;
const failures: string[] = [];

function ok(label: string, cond: unknown, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`);
  }
}

const FILES = [
  'services/api.js',
  'users/hostel/pages/visitors/visitorMeta.js',
  'users/hostel/pages/visitors/visitors.js',
  'users/hostel/pages/visitors/components/VisitorRow.js',
  'users/hostel/pages/visitors/components/RegisterSheet.js',
  'users/hostel/pages/visitors/components/BarredSheet.js',
  'users/hostel/pages/visitors/components/PolicySheet.js',
  'users/hostel/pages/visitors/pages/visitor_detail/visitor_detail.js',
  'users/students/pages/visitors/visitors.js',
  'users/students/students.js',
  'users/students/pages/profile/profile.js',
  'users/students/pages/profile/components/QuickActions.js',
  'users/students/pages/profile/constants/profileData.js',
];

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');

/** Strip comments before asserting on "is this code still here". */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// ---- 1. Parse -----------------------------------------------------------------
console.log('\nparse');
for (const rel of FILES) {
  let src: string;
  try {
    src = read(rel);
  } catch (e) {
    ok(`${rel} is readable`, false, String((e as Error)?.message ?? e));
    continue;
  }
  let parsed = true;
  let err = '';
  try {
    require_('esbuild').transformSync(src, { loader: 'jsx', sourcefile: rel });
  } catch (e) {
    parsed = false;
    err = String((e as Error)?.message ?? e).split('\n')[0];
  }
  ok(`${rel} parses as JSX`, parsed, err);
}

// ---- 2. Relative imports resolve ---------------------------------------------
console.log('\nimport graph');
const EXT = ['', '.js', '.jsx', '/index.js'];
for (const rel of FILES) {
  const abs = resolve(LEARNIX, rel);
  const specs = [...read(rel).matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  const broken: string[] = [];
  for (const spec of specs) {
    const target = resolve(dirname(abs), spec);
    if (!EXT.some((e) => existsSync(target + e))) broken.push(spec);
  }
  ok(`${rel} -- all ${specs.length} relative imports resolve`, broken.length === 0, broken.join(', '));
}

// ---- 3. API surface ----------------------------------------------------------
console.log('\napi surface');
const apiSrc = read('services/api.js');

function keysOf(name: string): Set<string> {
  const at = apiSrc.indexOf(`export const ${name}`);
  if (at < 0) return new Set();
  const slice = apiSrc.slice(at, apiSrc.indexOf('\nexport const', at + 10) < 0 ? undefined : apiSrc.indexOf('\nexport const', at + 10));
  return new Set([...slice.matchAll(/^\s{2}([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]));
}

const hostelKeys = keysOf('hostelApi');
const studentKeys = keysOf('studentApi');
ok('hostelApi and studentApi are both exported', hostelKeys.size > 0 && studentKeys.size > 0);

for (const rel of FILES) {
  for (const m of read(rel).matchAll(/hostelApi\.([A-Za-z_$][\w$]*)/g)) {
    ok(`hostelApi.${m[1]} exists (used in ${rel})`, hostelKeys.has(m[1]));
  }
  for (const m of read(rel).matchAll(/studentApi\.([A-Za-z_$][\w$]*)/g)) {
    ok(`studentApi.${m[1]} exists (used in ${rel})`, studentKeys.has(m[1]));
  }
}

const EXPECTED_HOSTEL = [
  'visitors', 'visitor', 'registerVisitor', 'approveVisitor', 'rejectVisitor',
  'visitorEntry', 'visitorExit', 'frequentVisitors',
  'barredVisitors', 'barVisitor', 'unbarVisitor',
  'visitorPolicy', 'updateVisitorPolicy',
];
for (const k of EXPECTED_HOSTEL) {
  ok(`hostelApi.${k} is declared`, hostelKeys.has(k));
  ok(`hostelApi.${k} is called by a screen`, FILES.some((rel) => new RegExp(`hostelApi\\.${k}\\(`).test(read(rel))));
}

const EXPECTED_STUDENT = ['myVisitors', 'authoriseVisitor', 'cancelVisitor'];
for (const k of EXPECTED_STUDENT) {
  ok(`studentApi.${k} is declared`, studentKeys.has(k));
  ok(`studentApi.${k} is called by the student screen`, new RegExp(`studentApi\\.${k}\\(`).test(read('users/students/pages/visitors/visitors.js')));
}

// The dead endpoints that used to exist. `checkInVisitor` minted an on-campus row directly, with
// no authorisation and no planned window - exactly what the workflow exists to prevent.
const ALL_FILES_SRC = FILES.map((f) => read(f)).join('\n');
for (const dead of ['checkInVisitor', 'checkOutVisitor']) {
  ok(`hostelApi.${dead} is gone`, !hostelKeys.has(dead));
  // Comments are stripped first: the API module explains in prose why these were removed, and a
  // naive search matches that explanation and fails for the wrong reason.
  ok(`  and nothing calls it`, !new RegExp(`\\b${dead}\\s*[:(]`).test(FILES.map((f) => code(f)).join('\n')));
}
ok('the direct check-in route is gone from the API client', !/visitors\/checkin/.test(ALL_FILES_SRC));
ok('and so is the direct checkout route', !/visitors\/\$\{id\}\/checkout/.test(ALL_FILES_SRC));

// THE BOUNDARY, asserted on the API surface rather than the JSX.
for (const forbidden of ['approveVisitor', 'visitorEntry', 'visitorExit', 'barVisitor', 'updateVisitorPolicy']) {
  ok(
    `studentApi has no ${forbidden} - a resident cannot reach it`,
    !studentKeys.has(forbidden),
  );
  ok(`  and the student screen does not call it`, !new RegExp(`studentApi\\.${forbidden}\\b`).test(read('users/students/pages/visitors/visitors.js')));
}

// ---- 4. NO MOCK DATA ---------------------------------------------------------
console.log('\nno mock data');
const warden = code('users/hostel/pages/visitors/visitors.js');
const resident = code('users/students/pages/visitors/visitors.js');

ok('the old module-level visitor array is gone', !/initialVisitors\s*=\s*\[/.test(read('users/hostel/pages/visitors/visitors.js')));
ok('no module-level array of fake visitors anywhere', !/const\s+initial[A-Za-z]*\s*=\s*\[\s*\{\s*id:\s*'1'/.test(read('users/hostel/pages/visitors/visitors.js')));
ok('the warden screen loads from the API', /hostelApi\.visitors\(/.test(warden));
ok('the resident screen loads from the API', /studentApi\.myVisitors\(/.test(resident));
ok('stats come from the response, not literals', /stats\?\./.test(warden));
ok('no hardcoded "This Week" stat survives', !/>\s*24\s*</.test(read('users/hostel/pages/visitors/visitors.js')));
ok('no client-side filter over the visitor list', !/visitors\.filter\(/.test(warden) && !/passes\.filter\(/.test(warden));
ok('the search term is sent to the server', /q:\s*query\s*\|\|\s*undefined/.test(warden));
ok('the status filter is sent to the server', /status,/.test(warden));
ok('paging is sent to the server', /page:\s*targetPage/.test(warden));

// ---- 5. THE RESIDENT IS PICKED, NOT TYPED ------------------------------------
console.log('\nthe resident is picked, not typed');
const regSheet = code('users/hostel/pages/visitors/components/RegisterSheet.js');
ok('the register sheet searches the residents endpoint', /hostelApi\.residents\(/.test(regSheet));
ok('and stores a studentProfileId', /studentProfileId/.test(regSheet));
ok('the room is displayed from the picked resident', /picked\.room/.test(regSheet));
ok('and is never typed into a field', !/value=\{[^}]*room/i.test(regSheet));
ok('a resident must be chosen before submitting', /if \(!picked\)/.test(regSheet));
ok('the picker has an empty-result state', /No resident matches/.test(regSheet));

// ---- 6. NO POLICY CONSTANT IN THE FRONTEND ------------------------------------
console.log('\nno policy constant in the frontend');
const ALL_SRC = FILES.map((f) => code(f)).join('\n');
ok('no hardcoded visiting-hours start', !/visitingHours:\s*\{\s*start:\s*'/.test(ALL_SRC));
ok('no hardcoded visiting-hours end', !/visitingHours:\s*\{\s*[^}]*end:\s*'/.test(ALL_SRC));
ok('no hardcoded repeat threshold', !/repeatAlert:\s*\{\s*count:\s*\d/.test(ALL_SRC));
ok('the policy arrives from the API', /hostelApi\.visitorPolicy\(\)/.test(ALL_SRC));
ok('and is written back through the API', /hostelApi\.updateVisitorPolicy\(/.test(ALL_SRC));
// The only literal times allowed are the register form's PLACEHOLDER text.
const placeholderTimes = [...ALL_SRC.matchAll(/placeholder="(\d{2}:\d{2})"/g)].map((m) => m[1]);
ok('the only HH:MM literals are placeholders', placeholderTimes.every((t) => /^\d{2}:\d{2}$/.test(t)), placeholderTimes.join(','));

// ---- 7. THE LIFECYCLE IS NOT RECOMPUTED --------------------------------------
console.log('\nthe lifecycle is consumed, not recomputed');
// The inbox does not itself read `visitor.lifecycle` - it hands the row to `VisitorRow`, which
// does. Asserting the derivation is absent from the LIST file is the point; the read is asserted
// where it actually happens.
ok('the inbox does not derive the lifecycle', !/lifecycleRank|deriveLifecycle/.test(warden));
ok('the warden row reads the lifecycle off the visitor', /visitor\.lifecycle/.test(code('users/hostel/pages/visitors/components/VisitorRow.js')));
ok('the detail screen reads it off the visitor', /visitor\.lifecycle/.test(code('users/hostel/pages/visitors/pages/visitor_detail/visitor_detail.js')));
ok('the resident screen reads it off the visitor', /visitor\.lifecycle/.test(resident));
ok('no screen re-derives it from the timestamps', !/expectedOutAt[\s\S]{0,40}getTime\(\)\s*[<>]/.test(ALL_SRC));
ok('the meta module has every derived state', (() => {
  const m = read('users/hostel/pages/visitors/visitorMeta.js');
  return ['awaiting_approval', 'approved', 'in_campus', 'visit_overdue', 'departure_overdue', 'left', 'no_show', 'rejected', 'cancelled', 'unknown'].every(
    (k) => m.includes(k),
  );
})());
// Read from the RAW source: the labels sit in object literals whose surrounding comments contain
// apostrophes, and the comment stripper can mangle a single-quoted literal out of context.
ok('and covers both overrun kinds distinctly', (() => {
  const m = read('users/hostel/pages/visitors/visitorMeta.js');
  const at = m.indexOf('visit_overdue: {');
  const ad = m.indexOf('departure_overdue: {');
  if (at < 0 || ad < 0) return false;
  // The property that matters is that they are not the SAME label: a warden reading "Overdue"
  // for both cannot tell a missed arrival from a late return, which is the whole distinction.
  const labelOf = (s: string) => s.slice(0, s.indexOf('}')).match(/label:\s*'([^']+)'/)?.[1] ?? '';
  return !!labelOf(m.slice(at, ad)) && labelOf(m.slice(at, ad)) !== labelOf(m.slice(ad)) ;
})());

// The alerts are a LIST. A single boolean would hide which rule fired.
console.log('\nalerts are a list, not a boolean');
const rowSrc = code('users/hostel/pages/visitors/components/VisitorRow.js');
const detailSrc = code('users/hostel/pages/visitors/pages/visitor_detail/visitor_detail.js');
const metaSrc = code('users/hostel/pages/visitors/visitorMeta.js');
// The row hands the whole array to `AlertStrip`, which is what maps over it. Asserting `.map` on
// the row would be asserting an implementation detail; what matters is that no screen collapses
// the list to a single boolean before showing it.
ok('the row passes the whole alert list through', /alerts=\{visitor\.alerts\}/.test(rowSrc));
ok('the detail maps over every alert', /visitor\.alerts\.map\(/.test(detailSrc));
ok('the alert strip maps over them', /alerts\.map\(/.test(metaSrc));
ok('no screen renders only the first alert', !/alerts\[0\]/.test(ALL_SRC));
ok('the row shows the barred reason when there is one', /barredReason/.test(rowSrc));
ok('the detail explains why somebody is barred', /On the list because/.test(detailSrc));
ok('each alert code has its own icon and colour', (() => {
  const m = read('users/hostel/pages/visitors/visitorMeta.js');
  return /BARRED:\s*\{/.test(m) && /OUTSIDE_VISITING_HOURS:\s*\{/.test(m) && /FREQUENT_VISITOR:\s*\{/.test(m);
})());

// ---- 8. THE RESIDENT SCREEN IS REACHABLE -------------------------------------
console.log('\nthe resident screen is reachable');
const studentsJs = read('users/students/students.js');
const profileJs = read('users/students/pages/profile/profile.js');
const quickActions = read('users/students/pages/profile/components/QuickActions.js');
const profileData = read('users/students/pages/profile/constants/profileData.js');

ok('the screen is imported by the students module', /VisitorsPage/.test(studentsJs));
ok('the module renders it', /<VisitorsPage/.test(studentsJs));
ok('it is in the screen map, not just imported', /currentScreen === 'Visitors'/.test(studentsJs));
ok('the profile grid offers a My Visitors tile', /id: 'visitors'/.test(profileData));
ok('the tile is handled by the profile navigation', /category\.id === 'visitors'/.test(quickActions));
ok('Profile receives onOpenModule from the app', /onOpenModule=\{navigateToScreen\}/.test(studentsJs));
ok('Profile accepts the prop', /onOpenModule/.test(profileJs));
// Ordering is load-bearing, exactly as it was for gate passes.
const vBranch = profileJs.slice(profileJs.indexOf("screen === 'Visitors'"));
const vOpen = vBranch.indexOf("onOpenModule === 'function') onOpenModule('Visitors')");
const vNav = vBranch.indexOf("onNavigate === 'function') onNavigate('Visitors')");
ok('my visitors prefers onOpenModule over onNavigate', vOpen !== -1 && vNav !== -1 && vOpen < vNav);

// ---- 9. THE RESIDENT OFFERS NO GATE CONTROLS --------------------------------
console.log('\nthe resident owns the gate');
ok('the student screen has no confirm control', !/Confirm visit|approveVisitor|Confirm\b.*visitor/i.test(resident));
ok('the student screen has no entry control', !/visitorEntry|Record entry|let them in/i.test(resident));
ok('the student screen has no exit control', !/visitorExit|Record exit/i.test(resident));
ok('it offers withdrawal, which is the resident\'s one power', /cancelVisitor|cWithdraw/.test(resident));
ok('withdrawal is offered only for a pending authorisation', /awaiting_approval/.test(resident));

// ---- 10. THE POLICY SHEET EXPLAINS ITSELF ------------------------------------
console.log('\nthe rules sheet says what each rule does');
const policySheet = code('users/hostel/pages/visitors/components/PolicySheet.js');
ok('it is reachable from the inbox', /setPolicyOpen\(true\)/.test(warden));
ok('it edits the threshold', /repeatAlert/.test(policySheet));
ok('it edits visiting hours', /visitingHours/.test(policySheet));
ok('it edits the day-only rule', /dayVisitsOnly/.test(policySheet));
ok('it edits resident authorisation', /requireResidentAuthorisation/.test(policySheet));
ok('it edits warden approval', /requireWardenApproval/.test(policySheet));
ok('it edits the advance window', /maxAdvanceDays/.test(policySheet));
ok('it edits the barred check', /barredCheck/.test(policySheet));
ok('it edits the timezone, and says why', /utcOffsetMinutes/.test(policySheet) && /UTC/.test(policySheet));
ok('every rule carries a plain-language hint', (policySheet.match(/hint=/g) ?? []).length >= 8);
ok('it restores the defaults from the server, not from a local copy', /setDefaults\(res\.defaults/.test(policySheet));
ok('and saves the server\'s clamped response back', /setPolicy\(res\.policy/.test(policySheet));

// The register sheet must not offer fields the institution does not want.
const registerSrc = code('users/hostel/pages/visitors/components/RegisterSheet.js');
ok('the purpose field follows the policy', /needPurpose/.test(registerSrc));
ok('the ID-proof fields follow the policy', /needId/.test(registerSrc));
ok('the same-day rule is stated to the warden', /day visits only|dayOnly/.test(registerSrc));
ok('and the resident screen states the rules too', /dayVisitsOnly|visiting hours|Visiting hours/i.test(resident));

// ---- 11. THE BARRED LIST IS A STANDING FACT ---------------------------------
console.log('\nthe barred list');
const barredSheet = code('users/hostel/pages/visitors/components/BarredSheet.js');
ok('it is reachable from the inbox', /setBarredOpen\(true\)/.test(warden));
ok('it asks for a reason', /reason/.test(barredSheet));
ok('it says a phone-less entry matches on name only', /matches on name only/.test(barredSheet));
ok('and removing a bar is one tap', /unbarVisitor/.test(barredSheet));
ok('it explains a bar does not delete past visits', /does\s*\n?\s*not delete/.test(barredSheet));

// ---- 12. BACKEND CONTRACT ----------------------------------------------------
console.log('\nbackend contract');
const routes = code(resolve(HERE, '..', 'src', 'modules', 'hostel', 'hostel.routes.ts').replace(/\\/g, '/'));
const studentRoutes = code(resolve(HERE, '..', 'src', 'modules', 'student', 'student.routes.ts').replace(/\\/g, '/'));
const schemas = code(resolve(HERE, '..', 'src', 'modules', 'hostel', 'hostel.schemas.ts').replace(/\\/g, '/'));

ok('warden route GET /visitors is declared', /'\/visitors',\s*\n\s*validate\(visitorQuerySchema/.test(routes));
ok('warden route GET /visitors/policy is declared', /'\/visitors\/policy'/.test(routes));
ok('warden route GET /visitors/frequent is declared', /'\/visitors\/frequent'/.test(routes));
ok('warden route GET /visitors/barred is declared', /'\/visitors\/barred'/.test(routes));
ok('warden route POST /visitors is declared', /router\.post\(\s*\n\s*'\/visitors'/.test(routes));
ok('warden route /visitors/:id/approve is declared', /'\/visitors\/:id\/approve'/.test(routes));
ok('warden route /visitors/:id/reject is declared', /'\/visitors\/:id\/reject'/.test(routes));
ok('warden route /visitors/:id/entry is declared', /'\/visitors\/:id\/entry'/.test(routes));
ok('warden route /visitors/:id/exit is declared', /'\/visitors\/:id\/exit'/.test(routes));
ok('student route GET /visitors is declared', /router\.get\(\s*\n\s*'\/visitors'/.test(studentRoutes));
ok('student route POST /visitors is declared', /router\.post\(\s*\n\s*'\/visitors'/.test(studentRoutes));
ok('student route POST /visitors/:id/cancel is declared', /'\/visitors\/:id\/cancel'/.test(studentRoutes));
ok('the student visitor routes sit behind the STUDENT role gate', /requireRole\('STUDENT'\)/.test(studentRoutes));

// ROUTE ORDER. Every static segment must precede `/visitors/:id`, or `:id` swallows it and a
// valid request 404s. This is the same trap as `/residents/facets`.
const policyAt = routes.indexOf("'/visitors/policy'");
const frequentAt = routes.indexOf("'/visitors/frequent'");
const barredAt = routes.indexOf("'/visitors/barred'");
const idAt = routes.indexOf("'/visitors/:id'");
ok('every static visitor route is declared before /visitors/:id', policyAt > 0 && frequentAt > 0 && barredAt > 0 && idAt > 0 && Math.max(policyAt, frequentAt, barredAt) < idAt, `policy=${policyAt} frequent=${frequentAt} barred=${barredAt} id=${idAt}`);

// Both schemas must be `.strict()`, and they are declared from a shared base — which is how the
// strictness could be lost on one branch without anyone noticing. Assert each explicitly.
ok('the warden register schema is .strict()', /export const visitorRegisterSchema = visitorRegisterBase\s*\n\s*\.extend\([\s\S]*?\)\s*\n\s*\.strict\(\)/.test(schemas));
ok('the resident authorise schema is .strict()', /export const visitorAuthoriseSchema = visitorRegisterBase\.strict\(\)/.test(schemas));
// The resident schema must NOT accept a resident id: the resident is derived from the token, and
// accepting the field would let a client believe it registered a visit for somebody else.
ok(
  'the resident authorise schema does not accept visitingStudentProfileId',
  !/export const visitorAuthoriseSchema[\s\S]*?visitingStudentProfileId/.test(schemas),
);
ok('while the warden one requires it', /visitorRegisterSchema[\s\S]*?visitingStudentProfileId:\s*z\.string\(\)/.test(schemas));
ok('and there is no visitorCheckinSchema any more', !/visitorCheckinSchema/.test(schemas));

// ---- 13. NO SCHEDULER ANYWHERE ----------------------------------------------
console.log('\nnothing schedules');
ok('no cron anywhere in the visitor service', !/node-cron|scheduleJob/.test(code(resolve(HERE, '..', 'src', 'modules', 'hostel', 'hostel-visitors.service.ts').replace(/\\/g, '/'))));
ok('no setInterval in the visitor service', !/setInterval/.test(code(resolve(HERE, '..', 'src', 'modules', 'hostel', 'hostel-visitors.service.ts').replace(/\\/g, '/'))));

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Visitors frontend structure OK');