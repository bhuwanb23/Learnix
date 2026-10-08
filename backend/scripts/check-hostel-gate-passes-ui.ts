/**
 * Static checks for the Gate Passes frontend, both apps.
 *
 * Runs without `npm install` (the Expo SDK and the pinned React disagree on peer deps), so
 * everything here is parse- and import-graph-level, not a render.
 *
 * WHAT IS ACTUALLY PROVEN HERE
 * -----------------------------
 *   1. Every file parses as JSX.
 *   2. Every relative import resolves. The two apps live at different depths, so a `../../` off
 *      by one is the most likely mistake and it fails only when the screen is opened.
 *   3. Every `hostelApi.*` / `studentApi.*` call resolves to a key the API module exports.
 *   4. NO MOCK DATA SURVIVES. The warden screen was six hardcoded rows in a module-level array
 *      with two invented stat numbers and no API call at all; `initialPasses` had to be found
 *      and deleted, and this is what stops it coming back.
 *   5. Neither screen recomputes the LIFECYCLE. The derivation lives on the server and is
 *      consumed; a client-side copy is how the student's "Approved" and the warden's "overdue
 *      since Tuesday" drift apart.
 *   6. The student screen is REACHABLE — wired into `students.js` and offered by a profile
 *      tile. A request screen nothing can navigate to is the same failure as the missing
 *      endpoint this feature set out to fix.
 *   7. The backend contract the screens rely on is actually declared.
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
  'users/hostel/pages/gate_passes/gatePassMeta.js',
  'users/hostel/pages/gate_passes/gate_passes.js',
  'users/hostel/pages/gate_passes/components/DecisionSheet.js',
  'users/hostel/pages/gate_passes/pages/pass_detail/pass_detail.js',
  'users/students/pages/gate_passes/gatePassMeta.js',
  'users/students/pages/gate_passes/gate_passes.js',
  'users/students/students.js',
  'users/students/pages/profile/profile.js',
  'users/students/pages/profile/components/QuickActions.js',
  'users/students/pages/profile/constants/profileData.js',
];

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');

/** Strip comments before asserting on "is this code still here" — see the residents suite. */
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

// ---- 3. API surface ------------------------------------------------------------
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
  'gatePasses',
  'gatePass',
  'gatePassDecide',
  'gatePassExit',
  'gatePassReturn',
];
const WARDEN_SCREENS = [
  'users/hostel/pages/gate_passes/gate_passes.js',
  'users/hostel/pages/gate_passes/pages/pass_detail/pass_detail.js',
  'users/hostel/pages/gate_passes/components/DecisionSheet.js',
];
for (const k of EXPECTED_HOSTEL) {
  ok(`hostelApi.${k} is declared`, hostelKeys.has(k));
  ok(
    `hostelApi.${k} is called by a screen`,
    WARDEN_SCREENS.some((rel) => code(rel).includes(`hostelApi.${k}`)),
  );
}
// A declared-but-uncalled helper is surface area with no user. The residents feature shipped
// three of these once; this asserts the same thing here.
for (const k of hostelKeys) {
  const used = [...WARDEN_SCREENS, 'users/students/pages/gate_passes/gate_passes.js'].some((rel) =>
    code(rel).includes(`hostelApi.${k}`),
  );
  if (k.startsWith('gatePass')) ok(`hostelApi.${k} is not dead code`, used);
}
for (const k of ['myGatePasses', 'requestGatePass', 'cancelGatePass']) {
  ok(`studentApi.${k} is declared`, studentKeys.has(k));
  ok(`studentApi.${k} is called by the student screen`, code('users/students/pages/gate_passes/gate_passes.js').includes(`studentApi.${k}`));
}

// ---- 4. NO MOCK DATA -----------------------------------------------------------
console.log('\nno mock data');
const warden = code('users/hostel/pages/gate_passes/gate_passes.js');
ok('the old initialPasses array is gone', !/initialPasses/.test(warden));
ok(
  'no module-level array of fake passes',
  !/const\s+\w*(passes|initial)\w*\s*=\s*\[/.test(warden),
  'the screen used to render six invented rows and no API call at all',
);
ok('the screen loads from the API', /hostelApi\.gatePasses\(/.test(warden));
ok('stats come from the response, not literals', /stats &&/.test(warden) && /\{stats\./.test(warden));
ok('the old hardcoded "28" and "6" stats are gone', !/value=\{28\}|value=\{6\}/.test(warden));
ok('no client-side filter over the pass list', !/\.filter\(\s*\(?\s*p\s*\)?\s*=>/.test(warden));

// ---- 5. Lifecycle comes from the server ----------------------------------------
console.log('\nlifecycle is derived server-side');
for (const [label, rel] of [
  ['warden inbox', 'users/hostel/pages/gate_passes/gate_passes.js'],
  ['warden detail', 'users/hostel/pages/gate_passes/pages/pass_detail/pass_detail.js'],
  ['student list', 'users/students/pages/gate_passes/gate_passes.js'],
]) {
  const c = code(rel);
  // The student screen names its map variable `p`, the warden's `pass`. Match either rather than
  // hardcoding one, which is how a check ends up asserting on a variable name instead of on
  // behaviour.
  ok(`${label} reads the lifecycle off the pass`, /\b(p|pass)\.lifecycle\b/.test(c));
  ok(
    `${label} does not recompute the lifecycle`,
    !/actualInAt\s*===\s*null\s*&&\s*.*expectedInAt\s*[<>]/.test(c),
    'the old absence logic: approved && no return && before expected == "out"',
  );
}
ok('the shared meta table exists for the warden app', existsSync(resolve(LEARNIX, 'users/hostel/pages/gate_passes/gatePassMeta.js')));
ok('the shared meta table exists for the student app', existsSync(resolve(LEARNIX, 'users/students/pages/gate_passes/gatePassMeta.js')));
for (const rel of [
  'users/hostel/pages/gate_passes/gatePassMeta.js',
  'users/students/pages/gate_passes/gatePassMeta.js',
]) {
  const c = code(rel);
  ok(
    `${rel} covers both overrun states`,
    /departure_overdue/.test(c) && /return_overdue/.test(c),
    'collapsing them into one "Overdue" hides that they are different problems',
  );
}

// ---- 6. The student screen is reachable ---------------------------------------
console.log('\nstudent screen is reachable');
const studentsJs = read('users/students/students.js');
ok('the screen is imported by the students module', /GatePassesPage/.test(studentsJs));
ok('the module renders it', /<GatePassesPage/.test(studentsJs));
ok('it is in the screen map, not just imported', /currentScreen === 'GatePasses'/.test(studentsJs));
ok('the profile grid offers a Gate Passes tile', /id: 'gate_passes'/.test(read('users/students/pages/profile/constants/profileData.js')));
ok('the tile is handled by the profile navigation', /category\.id === 'gate_passes'/.test(read('users/students/pages/profile/components/QuickActions.js')));
ok('Profile receives onOpenModule from the app', /onOpenModule=\{navigateToScreen\}/.test(studentsJs));
ok('Profile accepts the prop', /onOpenModule/.test(read('users/students/pages/profile/profile.js')));

// Ordering is load-bearing. `onNavigate` is ALWAYS passed by the caller, so testing it first
// swallows the tap and sets a profile sub-view this file cannot render — a dead end.
const profileSrc = read('users/students/pages/profile/profile.js');
const gateBranch = profileSrc.slice(profileSrc.indexOf("screen === 'GatePasses'"));
const openIdx = gateBranch.indexOf("onOpenModule === 'function') onOpenModule('GatePasses')");
const navIdx = gateBranch.indexOf("onNavigate === 'function') onNavigate('GatePasses')");
ok('gate passes prefer onOpenModule over onNavigate', openIdx !== -1 && navIdx !== -1 && openIdx < navIdx);

// ---- 7. The one-open-pass rule is surfaced, not just enforced ------------------
console.log('\none open pass at a time');
const student = code('users/students/pages/gate_passes/gate_passes.js');
ok('the student screen detects an open pass', /status === 'PENDING' \|\| \(p\.status === 'APPROVED'/.test(student) || /p\.status === 'PENDING'/.test(student));
ok('and explains the block instead of hiding the button', /blockerText/.test(read('users/students/pages/gate_passes/gate_passes.js')));
ok('emergency is described as a priority flag, not an exemption', /does not skip approval|does not bypass/i.test(read('users/students/pages/gate_passes/gate_passes.js')));

// ---- 8. Verification is a separate claim --------------------------------------
console.log('\nverification claim');
const sheet = read('users/hostel/pages/gate_passes/components/DecisionSheet.js');
ok('the approve sheet offers an explicit ID check', /checked this student's ID/.test(sheet));
ok('it defaults to OFF', /useState\(false\)/.test(sheet));
ok('it sends `verified` to the API', /verified/.test(sheet) && /gatePassDecide/.test(sheet));
ok('the inbox shows an approved-but-unverified pass', /Approved without an ID check/.test(warden));
ok('rejection requires a reason in the UI', /Reason required/.test(sheet));

// ---- 9. Backend contract -------------------------------------------------------
console.log('\nbackend contract');
const BACKEND = resolve(HERE, '..', 'src', 'modules');
const hostelRoutes = readFileSync(resolve(BACKEND, 'hostel', 'hostel.routes.ts'), 'utf8');
const studentRoutes = readFileSync(resolve(BACKEND, 'student', 'student.routes.ts'), 'utf8');
for (const r of ['/gate-passes', '/gate-passes/overdue', '/gate-passes/:id', '/gate-passes/:id/decide', '/gate-passes/:id/exit', '/gate-passes/:id/return']) {
  ok(`warden route ${r} is declared`, hostelRoutes.includes(`'${r}'`));
}
ok('student route GET /gate-passes is declared', studentRoutes.includes("'/gate-passes'"));
// Matched loosely on purpose: the route is written across several lines, and pinning the exact
// whitespace would make this check fail on a reformat rather than on a real regression.
ok(
  'student route POST /gate-passes is declared',
  /router\.post\(\s*'\/gate-passes',\s*validate\(gatePassRequestSchema\)/s.test(studentRoutes),
);
ok('student route POST /gate-passes/:id/cancel is declared', studentRoutes.includes("/gate-passes/:id/cancel"));
ok(
  'the student gate-pass routes sit behind requireRole(STUDENT)',
  studentRoutes.indexOf("requireRole('STUDENT')") < studentRoutes.indexOf("/gate-passes/:id/cancel"),
);
ok(
  'NO create route exists in the warden router',
  !/router\.post\(\s*'\/gate-passes',\s*validate\(gatePass/.test(hostelRoutes.replace(/\s+/g, ' ').replace(/,\s*$/, '')),
  'a warden must not be able to mint its own approvals',
);

const rulesSrc = readFileSync(resolve(BACKEND, 'hostel', 'hostel-gate-passes.rules.ts'), 'utf8');
ok('the lifecycle rules export the derivation', /export function deriveLifecycle/.test(rulesSrc));
ok('the rules own the urgency ordering', /export function lifecycleRank/.test(rulesSrc));
ok('an emergency outranks the approval queue', /isEmergency \? 0 : 2/.test(rulesSrc));
ok('the rules own the one-open-pass check', /export function blocksNewRequest/.test(rulesSrc));
ok('the rules treat a PENDING pass as not approved', /case 'PENDING':\s*\n\s*return 'awaiting_approval'/.test(rulesSrc));
ok('the rules distinguish the two overruns', /return_overdue/.test(rulesSrc) && /departure_overdue/.test(rulesSrc));

const residentsSrc = readFileSync(resolve(BACKEND, 'hostel', 'hostel-residents.service.ts'), 'utf8');
ok('the resident absence list uses the shared derivation', /deriveLifecycle\(g, now\)/.test(residentsSrc));
ok(
  'the old broken absence expression is gone',
  !/actualInAt === null && g\.expectedInAt\.getTime\(\) > now/.test(residentsSrc),
  'it marked a student out from the moment of APPROVAL, ignoring outAt entirely',
);

// ---- 8. The four defects this review turned up -------------------------------
console.log('\nregression guards');
const wardenSrc = read('users/hostel/pages/gate_passes/gate_passes.js');
const detailSrc = read('users/hostel/pages/gate_passes/pages/pass_detail/pass_detail.js');
const svcSrc = readFileSync(resolve(BACKEND, 'hostel', 'hostel-gate-passes.service.ts'), 'utf8');

// (1) A row mutation must refresh the LIST. It used to call `onPress`, which opens the detail
//     screen — so a successful "Mark exited" looked like it did nothing at all.
ok('PassRow takes a distinct onChanged callback', /function PassRow\(\{[^}]*onChanged/.test(wardenSrc));
ok('a recorded exit refreshes via onChanged', /gatePassExit\(pass\.id\);\s*\n\s*\/\/ Refresh the list[\s\S]*?onChanged\(\)/.test(wardenSrc));
ok('the list hands it the real reload', /onChanged=\{reload\}/.test(wardenSrc));
ok('and no longer refreshes through onPress', !/gatePassExit\(pass\.id\);\s*\n\s*onPress\(\)/.test(wardenSrc));

// (2) Approval must be dated by the DECISION. `verifiedAt` is only set when the warden ticked
//     the ID box, so falling back to it (then to createdAt) dated every unverified approval at
//     the moment it was requested, erasing how long the student waited.
ok('the decision step reads decidedAt', /pass\.decidedAt/.test(detailSrc));
ok('and no longer reconstructs it from verifiedAt', !/verifiedAt \?\? pass\.createdAt/.test(detailSrc));

// (3) `UserRole` has no institutionId, so paging every HOSTEL role notified wardens in EVERY
//     institution.
ok('warden notifications are scoped to the institution', /role: 'HOSTEL',\s*user: \{ institutionId \}/.test(svcSrc));
ok('and are not looked up by role alone', !/findMany\(\{ where: \{ role: 'HOSTEL' \}/.test(svcSrc));

// (4) A withdrawal returned a three-field stub instead of the shaped pass.
ok('cancelling returns the full shaped pass', !/return \{ id: pass\.id, status: 'CANCELLED'/.test(svcSrc));
ok('and re-reads it like every other mutation', /return getGatePass\(pass\.studentProfile\.user\.institutionId, pass\.id\)/.test(svcSrc));

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Gate passes frontend structure OK');