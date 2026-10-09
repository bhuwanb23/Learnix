/**
 * Suite: the mess screens, structurally.
 *
 * WHY THIS ALONGSIDE `check-hostel-mess.ts`
 * ------------------------------------------
 * That suite proves the rules are right. This one proves the SCREENS cannot quietly go back to being
 * a mock - which for this feature is not a hypothetical, because it WAS one.
 *
 * THE PROBLEM THIS FILE EXISTS TO PREVENT
 * ----------------------------------------
 * `users/hostel/pages/mess/mess.js` was 386 lines of module-level constants: a literal `menu` object,
 * `plans` claiming "Veg Plan · 892 residents · ₹3,200/mo", attendance reading "1,182 / 1,248 served",
 * a hardcoded `4.1` labelled "Weekly Rating" and a hardcoded `₹3.4L` budget. `hostelApi.mess`,
 * `updateMenu` and `sendMessSurvey` existed in `api.js` and were called by NOTHING - verified across
 * the whole app, not just this screen.
 *
 * So the assertions below are mostly of one kind: "this number cannot be a literal". A mock screen
 * compiles, renders and looks plausible, which is precisely why it survived review. The only way to
 * catch it is to assert on the absence of literals.
 *
 * WHAT ELSE IS ASSERTED
 * --------------------
 *   1. The four shipped bugs cannot return: no client-side day arithmetic, no client-side rate
 *      arithmetic, no "weekly rating" computed from a page of rows.
 *   2. The roll is the only attendance write, and it is warden-side.
 *   3. A 403 on mess money renders as an EXPLANATION, not a total of zero - the failure mode that
 *      would tell a warden the kitchen has spent nothing.
 *   4. The student screen is wired into the app (import, screen map, profile tile, tile dispatch),
 *      because a correct screen that nothing routes to is still a dead feature.
 *   5. Nothing schedules: no cron, no interval. Participation is derived on read.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const LEARNIX = resolve(HERE, '..', '..', 'learnix');
const BACKEND = resolve(HERE, '..');
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

const WARDEN_FILES = [
  'users/hostel/pages/mess/messMeta.js',
  'users/hostel/pages/mess/mess.js',
  'users/hostel/pages/mess/components/RollSheet.js',
  'users/hostel/pages/mess/components/MenuEditor.js',
  'users/hostel/pages/mess/components/AnalyticsSheet.js',
  'users/hostel/pages/mess/components/ExpensesSheet.js',
];
const STUDENT_FILES = ['users/students/pages/mess/messMeta.js', 'users/students/pages/mess/mess.js'];
const FILES = [
  'services/api.js',
  ...WARDEN_FILES,
  ...STUDENT_FILES,
  'users/students/students.js',
  'users/students/pages/profile/profile.js',
  'users/students/pages/profile/components/QuickActions.js',
  'users/students/pages/profile/constants/profileData.js',
];

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');
const readSrc = (rel: string) => readFileSync(resolve(BACKEND, rel), 'utf8');

/** Strip comments before asserting on "is this code still here". */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}
const wardenCode = () => WARDEN_FILES.map((f) => code(f)).join('\n');
const studentCode = () => STUDENT_FILES.map((f) => code(f)).join('\n');
const roll2 = () => code('users/hostel/pages/mess/components/RollSheet.js');

// ---- 1. Parse -----------------------------------------------------------------
console.log('\nparse');
for (const rel of FILES) {
  let parsed = true;
  let err = '';
  try {
    require_('esbuild').transformSync(read(rel), { loader: 'jsx', sourcefile: rel });
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
  const missing = specs.filter((s) => !EXT.some((e) => existsSync(resolve(dirname(abs), s + e))));
  ok(`${rel} has no broken relative imports`, missing.length === 0, missing.join(', '));
}

// ---- 3. NO CROSS-APP IMPORTS --------------------------------------------------
// Nothing in this repo imports across users/<app>/. A student screen reaching into the hostel
// folder would couple two independently shippable apps.
console.log('\nno cross-app imports');
for (const rel of STUDENT_FILES) {
  ok(`${rel} does not import from the hostel app`, !/from\s+['"][^'"]*users\/hostel/.test(read(rel)));
  ok(`${rel} does not reach into another user app`, !/from\s+['"][^'"]*users\/(?!students)/.test(read(rel)));
}

// ---- 4. NO MOCK DATA SURVIVES -------------------------------------------------
console.log('\nthe mock is gone');
{
  const mess = code('users/hostel/pages/mess/mess.js');
  // The specific lies. Each is a number a human typed and no code counted.
  ok('no hardcoded "1,182 / 1,248 served"', !/1,?182/.test(mess));
  ok('no hardcoded resident total', !/\b1,?248\b/.test(mess));
  ok('no hardcoded 4.1 rating', !/\b4\.1\b/.test(mess));
  ok('no hardcoded ₹3.4L budget', !/3\.4L|340000/.test(mess));
  ok('no Veg Plan / Non-Veg plan cards', !/Veg Plan|Non-Veg Plan|plans\s*=\s*\[/.test(mess));
  ok('no module-level menu literal', !/^const\s+menu\s*=\s*\{/m.test(mess));
  ok('no module-level attendance literal', !/^const\s+attendance\s*=\s*\[/m.test(mess));
  ok('no module-level feedback literal', !/^const\s+feedback\s*=\s*\[/m.test(mess));
  // A mock screen reads nothing. This one must.
  ok('the screen fetches from the API', /hostelApi\.mess\(\)/.test(mess));
}

// ---- 5. THE FOUR SHIPPED BUGS CANNOT RETURN ----------------------------------
console.log('\nthe four bugs stay fixed');
{
  const w = wardenCode();
  const s = studentCode();

  // BUG 1 & 2: the client must not decide what day it is. It receives `todayDayOfWeek` and
  // `dayOfWeek` from the server and renders those.
  ok('no client-side new Date() in the warden mess screens', !/new Date\(\s*\)/.test(w));
  ok('no getDay()/setDate() day arithmetic in the warden mess screens', !/\.getDay\(\)|\.setDate\(/.test(w));
  ok('the selected day comes from the server response', /todayDayOfWeek/.test(read('users/hostel/pages/mess/mess.js')));
  // The one permitted exception: query-string builders, which format a date to SEND.
  const analytics = code('users/hostel/pages/mess/components/AnalyticsSheet.js');
  ok(
    'the analytics window is a query string, not a local date computation',
    !/toISOString\(\)\.slice\(0,\s*10\)/.test(analytics),
    'toISOString converts to UTC and turns a local midnight into the previous day',
  );

  // BUG 3 & 4: rates and averages arrive computed.
  ok('no client-side participation division', !/\/\s*(residents|total|roll\.residents)\s*\*\s*100/.test(w));
  ok('no client-side rating average', !/reduce\(\s*\(n,\s*\w+\)\s*=>\s*n\s*\+\s*\w+\.rating/.test(w));
  // Every rate is READ off the payload. `attendanceToday[].ratePct` for the tiles, `a.ratePct` in the
  // bars, `roll.ratePct` on the roll sheet.
  const mess = code('users/hostel/pages/mess/mess.js');
  ok('the tiles read a rate off the response', /attendanceToday[\s\S]{0,80}ratePct/.test(mess));
  ok('the participation bars read a rate off each row', /a\.ratePct/.test(mess));
  ok('the roll sheet reads the server rate after marking', /markedToday\.ratePct/.test(roll2()));
  ok('the sample size is rendered beside the rating', /ratingResponses/.test(mess));
  ok('the student screen reads the day of week from the server', /data\?\.dayOfWeek/.test(s));
  ok('the student screen has no date arithmetic either', !/new Date\(\s*\)/.test(s));
}

// ---- 6. THE ROLL IS THE ONLY ATTENDANCE WRITE --------------------------------
console.log('\nthe roll is warden-side and the only write');
{
  const api = code('services/api.js');
ok('hostelApi can mark a roll', /markMessAttendance/.test(api));
ok('studentApi can rate a meal', /rateMeal/.test(api));
// Scoped to the studentApi OBJECT, not to "everything after the word studentApi". Splitting on the
// name alone swallows every later export in the file, so `teacherApi.markAttendance` and
// `adminApi.attendance` matched and this failed whenever they were declared below studentApi — which
// says nothing about the student surface. The claim is about what a STUDENT can do, so the slice has
// to end at the next top-level export.
const studentApiBlock = (() => {
  const start = api.indexOf('export const studentApi');
  if (start < 0) return '';
  const rest = api.slice(start + 'export const studentApi'.length);
  const next = rest.search(/\nexport const /);
  return next < 0 ? rest : rest.slice(0, next);
})();
ok('the studentApi block was located', studentApiBlock.length > 0);
ok('studentApi has NO attendance write', !/markAttendance|markMessAttendance/.test(studentApiBlock));
ok('studentApi has no menu write', !/updateMenu|setMenu/.test(studentApiBlock));
ok('studentApi has no complaint triage', !/assignComplaint|resolveComplaint|reopenComplaint/.test(studentApiBlock),
  'triage is the warden\'s, not the resident\'s');

  const roll = roll2();
  ok('the roll sheet marks through the endpoint', /markMessAttendance/.test(roll));
  // The rate preview while tapping is allowed and is commented as such; a rate presented as a
  // STORED fact is not. It must not be used after the save.
  ok('the roll seeds its selection from the server marks, not from local guesswork', /for \(const r of res\.data\?\.rows \?\? \[\]\) if \(r\.present\)/.test(roll));
  ok('and the save button diffs against the server view', /roll\?\.rows \?\? \[\]\)\.filter\(\(r\) => r\.present\)/.test(roll));
  ok('and re-reads after marking', /await load\(\)/.test(roll));
}

// ---- 7. THE MONEY FAILURE MODE ------------------------------------------------
console.log('\na refused ledger is explained, not zeroed');
{
  const ex = code('users/hostel/pages/mess/components/ExpensesSheet.js');
  ok('the sheet detects a 403 explicitly', /setDenied\(true\)|=== 403/.test(ex));
  ok('and renders a distinct explanation for it', /Not allowed to see mess spend/.test(ex));
  ok('it does not fall back to a zero total on failure', !/catch[\s\S]{0,200}setData\(\{[^}]*totalRupees:\s*0/.test(ex));
  // The category must not be a field the client can choose.
  ok('the raise form has no category field', !/category/.test(ex.split('function RaiseForm')[1] ?? ''));
  ok('money is converted to paise at the edge, never as a float', /Math\.round\(rupees \* 100\)/.test(ex));
}

// ---- 8. THE STUDENT SCREEN IS ACTUALLY REACHABLE ------------------------------
// A correct screen that nothing routes to is still a dead feature, and it is the easiest mistake
// to make when adding a second user-facing screen.
console.log('\nthe student screen is reachable');
{
  const app = code('users/students/students.js');
  ok('students.js imports the mess screen', /import MessPage from '\.\/pages\/mess\/mess'/.test(app));
  ok('and has a screen-map branch for it', /currentScreen === 'Mess'/.test(app));

  const tiles = code('users/students/pages/profile/constants/profileData.js');
  ok('the profile grid has a mess tile', /id: 'mess'/.test(tiles));
  // The grid renders with MaterialIcons, so an Ionicons name would draw as a tofu box.
  const icon = /id: 'mess'[^\n]*icon: '([a-z-]+)'/.exec(tiles)?.[1];
  ok('the tile icon is a MaterialIcons name, not an Ionicons one', icon === 'restaurant', `got "${icon}"`);

  const quick = code('users/students/pages/profile/components/QuickActions.js');
  ok('QuickActions dispatches the tile to the Mess screen', /category\.id === 'mess'[\s\S]{0,200}navigate\('Mess'\)/.test(quick));

  const profile = code('users/students/pages/profile/profile.js');
  ok('profile.js bridges the tile to the module screen map', /screen === 'mess'[\s\S]{0,240}onOpenModule\('Mess'\)/.test(profile));
  // onOpenModule must be tested FIRST, or every tap is swallowed by the profile's own view state.
  ok(
    'onOpenModule is preferred over onNavigate (a tap must not become a dead end)',
    /screen === 'mess'[\s\S]{0,240}typeof onOpenModule === 'function'\) onOpenModule\('Mess'\)[\s\S]{0,120}else if/.test(profile),
  );
}

// ---- 9. THE API CLIENT COVERS THE WHOLE SURFACE ------------------------------
console.log('\nthe api client covers the screens');
{
  const api = code('services/api.js');
  for (const m of [
    'mess:',
    'messMenu:',
    'updateMenu:',
    'messRoll:',
    'markMessAttendance:',
    'messAttendanceLog:',
    'messAbsent:',
    'messAnalytics:',
    'messFeedback:',
    'sendMessSurvey:',
    'messExpenses:',
    'raiseMessExpense:',
    'myMess:',
    'rateMeal:',
  ]) {
    ok(`api.js exposes ${m.replace(':', '')}`, api.includes(m));
  }
  // isVeg became writable; if it silently lost its default the editor would post undefined.
  ok('updateMenu sends isVeg rather than dropping it', /updateMenu[\s\S]{0,160}isVeg/.test(api));
  // A message that reads like plumbing belongs to the mess routes.
  ok('student mess endpoints are on /student/mess', /api\.get\(`\/student\/mess/.test(api) && /api\.post\('\/student\/mess\/feedback'/.test(api));
}

// ---- 10. THE SCREENS DEGRADE HONESTLY ----------------------------------------
console.log('\nthe screens degrade honestly');
{
  for (const rel of ['users/hostel/pages/mess/mess.js', 'users/students/pages/mess/mess.js']) {
    const c = code(rel);
    ok(`${rel} has an empty state`, /EmptyState/.test(c));
    ok(`${rel} has an error state`, /subtitle=\{error\}|setError/.test(c));
    ok(`${rel} offers a retry`, /onAction=\{\(\) => load\(\)\}/.test(c));
    ok(`${rel} supports pull-to-refresh`, /RefreshControl/.test(c));
    ok(`${rel} shows a loading skeleton`, /SkeletonCard/.test(c));
  }
  // An unknown rate is rendered as a dash, never as 0%.
  const meta = code('users/hostel/pages/mess/messMeta.js');
  ok('fmtPct returns a dash for an unknown rate', /fmtPct[\s\S]{0,160}—/.test(meta));
  ok('and fmtRating says "Not rated" rather than showing 0', /Not rated/.test(meta));
  // A rating with no sample size is the fourth bug wearing a hat.
  ok('fmtRating takes a responses argument', /fmtRating = \(avg, responses\)/.test(meta));
}

// ---- 11. THE NON-VEG FLAG IS EDITABLE AND CHECKED ---------------------------
console.log('\nthe vegetarian flag is real');
{
  const editor = code('users/hostel/pages/mess/components/MenuEditor.js');
  ok('the editor can change the flag', /setIsVeg/.test(editor));
  ok('and warns before the server refuses', /contradiction/.test(editor));
  // Read the SOURCE, not the emitted name: imports say `./hostel.schemas.js` (ESM specifier),
  // but on disk this project is TypeScript, so a literal path has to say `.ts`.
  const schemas = readSrc('src/modules/hostel/hostel.schemas.ts');
  ok('the schema accepts isVeg', /isVeg:\s*z\.boolean\(\)/.test(schemas));
  ok('with a default, so an older client cannot post undefined', /isVeg:\s*z\.boolean\(\)\.default\(true\)/.test(schemas));
}

// ---- 12. NOTHING SCHEDULES ---------------------------------------------------
// Participation is derived on read. A roll that "expires" or a roll that is auto-created at 3am
// would both make today's figure a scheduled value rather than a measured one.
console.log('\nnothing schedules');
for (const f of ['src/modules/hostel/hostel-mess.service.ts', 'src/modules/hostel/hostel-mess.rules.ts']) {
  const src = readSrc(f);
  ok(`${f} has no scheduler`, !/node-cron|scheduleJob|setInterval|setTimeout/.test(src));
}

// ---- 13. THE SERVER OWNS THE DAY -------------------------------------------
console.log('\nthe server owns the day');
{
  const rules = readSrc('src/modules/hostel/hostel-mess.rules.ts');
  ok('the day range is half-open', /lt/.test(rules) && /gte/.test(rules));
  ok('there is exactly one local-midnight helper', (rules.match(/function localMidnightOf/g) ?? []).length === 1);
  ok('the naive "now minus offset" construction is gone', !/new Date\(day\.getTime\(\) - offsetMinutes/.test(rules));
  ok('the window exposes an inclusive `to` and an exclusive `lt`', /to: toDay,/.test(rules) && /lt: addDays\(toDay, 1\)/.test(rules));
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Mess frontend structure OK');