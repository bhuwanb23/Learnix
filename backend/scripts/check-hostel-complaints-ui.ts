/**
 * Suite: the complaint screens, structurally.
 *
 * WHY THIS ALONGSIDE `check-hostel-complaints.ts`
 * ------------------------------------------------
 * That suite proves the rules are right. This one proves the SCREENS cannot quietly go back to being a
 * mock - which for this feature is not hypothetical, because it WAS one.
 *
 * THE PROBLEM THIS FILE EXISTS TO PREVENT
 * ----------------------------------------
 * `users/hostel/pages/complaints/complaints.js` was 356 lines holding six hardcoded complaints in
 * `useState` under the name `initialComplaints`, and it made ZERO calls into `hostelApi`. It shipped
 * category chips reading "Plumbing / Electrical / Network / Maintenance" - two of which are not
 * categories in the schema at all - while omitting FOOD and SECURITY, which are. So the filter chips
 * could only ever empty the list. Meanwhile `api.js` had `createComplaint`, `assignComplaint` and
 * `resolveComplaint` defined and called by nothing.
 *
 * A mock screen compiles, renders and looks entirely plausible, which is precisely why this one
 * survived review. So most of the assertions below are of one kind: "this cannot be a literal".
 *
 * THE BUG THIS SCREEN ACTUALLY SHIPPED WITH
 * -----------------------------------------
 * `mess.js` has had a "Report a problem" button on every meal card for a long time. It called
 * `navigation.navigate('Complaints', …)`, but `students.js` is a `currentScreen` switch rather than a
 * navigator, so there was no `Complaints` case and the call went nowhere. A resident who found a hair
 * in the dal tapped the one control aimed at exactly that and got silence. So the wiring assertions
 * below check the SHELL has a case for the screen, not merely that the screen file exists.
 *
 * ALSO ASSERTED
 * -------------
 *   1. The student screen and the warden screen call the API rather than shaping data themselves.
 *   2. `assignComplaint` and `resolveComplaint` send the bodies the server REQUIRES. The previous
 *      versions took no body at all, so any caller would have been refused with a 400.
 *   3. The support-staff client uses `/staff-complaints`, NOT `/hostel/…` - the server mounts it
 *      separately precisely so a technician cannot reach the room register.
 *   4. The derived fields are read off the response, never recomputed in JS: escalation is a function
 *      of `createdAt` and the live policy, and a client-side copy would silently disagree with the
 *      server the first time somebody edited the thresholds.
 *   5. The security severity floor is SURFACED to the resident rather than silently applied.
 *   6. The poor-rating-reopens rule is visible in the copy, because a resident asked to grade a repair
 *      should not meet a consequence they were never told about.
 *   7. The profile tile exists, uses a Material icon name (that grid renders with MaterialIcons, so an
 *      Ionicons name draws a tofu box), and dispatches through `onOpenModule` FIRST.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const LEARNIX = resolve(HERE, '..', '..', 'learnix');
const BACKEND = resolve(HERE, '..');

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

function section(n: number | string, title: string) {
  console.log(`\n── ${n}. ${title}`);
}

const WARDEN_SCREEN = 'users/hostel/pages/complaints/complaints.js';
const STUDENT_SCREEN = 'users/students/pages/complaints/complaints.js';

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');
const readSrc = (rel: string) => readFileSync(resolve(BACKEND, rel), 'utf8');

/**
 * The source with comments stripped, so an assertion like "the word 'plumbing' must not appear as a
 * chip" cannot be satisfied by a paragraph explaining why plumbing is not a category. This is the whole
 * trick: the reason a mock survived is that prose about it was as long as the mock.
 */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

function codeSrc(rel: string): string {
  return readSrc(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

console.log('\n  Hostel complaints — frontend structure');

// ═══ 1. The screens exist at all ════════════════════════════════════════════════════════
section(1, 'Both screens exist');

ok('the warden complaint screen exists', existsSync(resolve(LEARNIX, WARDEN_SCREEN)), WARDEN_SCREEN);
ok('the student complaint screen exists', existsSync(resolve(LEARNIX, STUDENT_SCREEN)), STUDENT_SCREEN);

// ═══ 2. Neither screen is a mock ══════════════════════════════════════════════════════════
section(2, 'Neither screen holds hardcoded complaints');

const warden = existsSync(resolve(LEARNIX, WARDEN_SCREEN)) ? code(WARDEN_SCREEN) : '';
const student = existsSync(resolve(LEARNIX, STUDENT_SCREEN)) ? code(STUDENT_SCREEN) : '';

for (const [name, src] of [['warden', warden], ['student', student]] as const) {
  ok(`the ${name} screen holds no module-level complaint array`,
    !/const\s+(initial)?[Cc]omplaints\s*=\s*\[/.test(src),
    'a hardcoded array is exactly the thing being prevented');
  ok(`the ${name} screen does not seed state with literal complaint objects`,
    !/useState\(\s*\[\s*\{\s*id:\s*['"]/.test(src));
}

// The six rows the old warden screen shipped with. Each described something that exists nowhere.
for (const ghost of ['Lift stuck between floors', 'Mess sink clogged', 'AC not cooling']) {
  ok(`the "${ghost}" fixture is gone`, !warden.includes(ghost) && !student.includes(ghost));
}

ok('the warden screen calls the API', /hostelApi\./.test(warden));
ok('the student screen calls the API', /studentApi\./.test(student));
ok('the warden screen reads the complaints list', /hostelApi\.complaints\(/.test(warden));
ok('the student screen reads their own complaints', /studentApi\.myComplaints\(/.test(student));

// ═══ 3. The chips match the real taxonomy ══════════════════════════════════════════════════
section(3, 'The filter chips match the schema, not a guess');

const REAL_CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'NETWORK', 'MAINTENANCE', 'FOOD', 'SECURITY'];

// The old screen's chips, asserted absent. The filter chips were hardcoded as
// `['All','Plumbing','Electrical','Network','Maintenance']` — a display-name array, not the enum — so
// what is asserted here is the ABSENCE OF THAT ARRAY SHAPE, not the absence of the word. "Plumbing" has
// to appear somewhere: it is the human label for the PLUMBING category, and banning the word would
// forbid the screen from naming the thing it handles.
ok('the chip list is not a hardcoded display-name array',
  !/const\s+categories\s*=\s*\[\s*['"][^'"]+['"]/.test(warden),
  'a literal ["All","Plumbing",…] is the exact shape being prevented');
ok('the chips are SEVERITY and STATUS, not invented categories',
  /STATUS_FILTERS/.test(warden) && /SEVERITIES/.test(warden));
ok('the warden screen labels categories from the enum, not a second hand-written list',
  /CATEGORY_LABEL/.test(warden) && /ELECTRICAL:\s*'Electrical'/.test(warden));
ok('the warden screen mentions SECURITY', warden.includes('SECURITY'));
ok('the warden screen mentions FOOD', warden.includes('FOOD'));
ok('the student screen offers FOOD as a category', /FOOD/.test(student));
ok('the student screen offers SECURITY as a category', /SECURITY/.test(student));
ok('every real category is either selectable or filtered by the warden screen',
  REAL_CATEGORIES.every((c) => warden.includes(c)));

// ═══ 4. The derived fields are read, not recomputed ════════════════════════════════════════
section(4, 'Escalation is read off the server, never recomputed in JS');

ok('the warden screen reads `escalated`', /escalated/.test(warden));
ok('the warden screen reads `hoursToEscalation`', /hoursToEscalation/.test(warden));
// `priority` is deliberately NOT read as a value. The server sorts by it and the screen renders the
// list in the order it arrived, so a client that read the number would either re-sort (disagreeing
// with the API) or ignore it. What is asserted is that the screen does not SORT — see below — and that
// it mentions the field so the ordering rule is documented where it applies.
ok('the warden screen documents that `priority` drives the order it renders',
  /priority/.test(read(WARDEN_SCREEN)));

// A client-side escalation copy. `Date.now() - createdAt > X` is the shape of the bug, and X would
// have to be a hardcoded threshold that drifts the moment a warden edits the policy.
ok('the warden screen does NOT compare a complaint age against a hardcoded hour count',
  !/Date\.now\(\)\s*-\s*new Date\([^)]*createdAt[^)]*\)\s*>/.test(warden));
ok('...and holds no escalation threshold of its own',
  !/\b(24|48|72|168)\s*\*\s*3600000\b/.test(warden),
  'thresholds belong to the policy, not to the screen');

ok('the warden screen does not re-sort the list',
  // The server sorts by priority; a client-side `.sort(` on an already-ordered list is either a no-op
  // or a disagreement, and the disagreement is invisible until a warden acts on the wrong row.
  !/complaints\.(sort|reverse)\(/.test(warden),
  'order is the server\'s');

ok('the student screen shows the derived fields too', /escalated|priority/.test(student));

// ═══ 5. The API client sends what the server requires ══════════════════════════════════════
section(5, 'The API client sends the required bodies');

const api = code('services/api.js');

ok('`hostelApi` exists', /export const hostelApi/.test(api));
ok('`studentApi` exists', /export const studentApi/.test(api));
ok('`staffComplaintsApi` exists', /export const staffComplaintsApi/.test(api));

// The two that were broken. `assignComplaint: (id) => api.post(...)` sent no body, and the server's
// `complaintAssignSchema` requires `assigneeUserId` — so every call 400'd.
const assignMethod = api.match(/assignComplaint:[\s\S]{0,220}?\),\s*\n/)?.[0] ?? '';
ok('`assignComplaint` takes an assignee', /assignComplaint:\s*\([^)]*assigneeUserId/.test(api), assignMethod.slice(0, 60));
ok('...and sends it in the body', /assignComplaint[\s\S]{0,200}?assigneeUserId/.test(api) && /\{ assigneeUserId/.test(api));
ok('`resolveComplaint` takes a resolution note', /resolveComplaint:\s*\([^)]*resolutionNote/.test(api));
ok('...and sends it in the body', /\{ resolutionNote \}/.test(api));

ok('`createComplaint` accepts a full payload', /createComplaint:\s*\(payload\)/.test(api));
ok('`reopenComplaint` exists', /reopenComplaint:/.test(api));
ok('`complaintPolicy` and `saveComplaintPolicy` exist', /complaintPolicy:/.test(api) && /saveComplaintPolicy:/.test(api));
ok('`complaintAssignees` exists', /complaintAssignees:/.test(api));
ok('the student list method exists', /myComplaints:/.test(api));
ok('the student report method exists', /reportComplaint:/.test(api));
ok('the feedback method exists', /submitComplaintFeedback:/.test(api));

// ═══ 6. The staff surface uses its own base path ═══════════════════════════════════════════
section(6, 'The support-staff client does not borrow the hostel router');

// This is the point of the separate mount. The hostel router is gated HOSTEL/ADMIN; putting staff
// calls under it would have required widening that gate to MAINTENANCE, handing a plumber the room
// register, every resident profile, the gate-pass register and the visitor register.
const staffBlock = api.match(/export const staffComplaintsApi = \{[\s\S]*?\n\};/)?.[0] ?? '';
ok('the staff API block was found', staffBlock.length > 0);
ok('it calls `/staff-complaints/…`', /\/staff-complaints\/complaints/.test(staffBlock));
ok('it does NOT call `/hostel/complaints`', !/\/hostel\/complaints/.test(staffBlock));
ok('it offers an inbox read', /inbox:/.test(staffBlock));
ok('it offers a resolve, with the required note', /resolve:[\s\S]{0,160}resolutionNote/.test(staffBlock));
ok('it offers a note write', /addNote:/.test(staffBlock));
// Triage is the warden's call, so there must be no assign method on the staff surface.
ok('it has NO assign method — triage is the warden\'s', !/\bassign[A-Z]?\s*:/.test(staffBlock));

// ═══ 7. The screens are actually routed to ═══════════════════════════════════════════════
section(7, 'Both screens are reachable, and the mess button lands somewhere real');

const shell = code('users/students/students.js');
ok('the student shell imports the complaints screen', /import ComplaintsPage from '\.\/pages\/complaints\/complaints'/.test(shell));
ok('the student shell has a `Complaints` case', /currentScreen === 'Complaints'/.test(shell));

// THE bug this feature actually shipped with: `mess.js` called `navigation.navigate('Complaints')`
// against a `currentScreen` switch that had no such case, so the tap did nothing and looked live.
const mess = code('users/students/pages/mess/mess.js');
ok('the mess "Report a problem" button navigates to Complaints', /navigate\('Complaints'/.test(mess));
ok('...with the FOOD category preselected', /category:\s*'FOOD'/.test(mess));
// `?.navigate?.()` swallowed the failure. A report button that cannot report must say so.
ok('the mess button no longer uses an optional-chained navigate (which silently did nothing)',
  !/navigation\?\.navigate\?\./.test(mess),
  'an optional call turns a dead button into a silent one');

const wardenShell = code('users/hostel/hostel.js');
ok('the warden shell imports the complaints screen',
  /import ComplaintsModule from '\.\/pages\/complaints\/complaints'/.test(wardenShell));
ok('the warden shell maps it into its screen map', /Complaints:\s*\{\s*title:\s*'Complaints'/.test(wardenShell));

// ═══ 8. The profile tile ═══════════════════════════════════════════════════════════════════
section(8, 'The profile tile exists and dispatches correctly');

const profileData = code('users/students/pages/profile/constants/profileData.js');
const profile = code('users/students/pages/profile/profile.js');

ok('a complaints tile is declared in the quick-actions grid', /id:\s*'complaints'/.test(profileData));

// `QuickActions.js` renders with MaterialIcons, so an Ionicons name draws a tofu box. `mess.js`'s
// tile already learned this the hard way.
const iconMatch = profileData.match(/id:\s*'complaints'[^}]*icon:\s*'([^']+)'/);
const icon = iconMatch?.[1] ?? '';
ok('the tile has an icon', icon.length > 0, icon);
ok('the icon is a MATERIAL name, not an Ionicons one',
  !/-(outline|sharp)$/.test(icon), `icon="${icon}" draws a tofu box if it is Ionicons`);

ok('the profile dispatches `complaints`', /screen === 'complaints'/.test(profile));
// `onOpenModule` must be tested FIRST: it is the hook that opens the module, and `onNavigate` is
// always supplied by the caller, so checking it first would swallow every tap into a dead sub-view.
// The window is wide enough to hold the whole branch including its comments, because the ordering is
// the claim being made and the two calls are 60 lines apart in the source.
const dispatchStart = profile.indexOf("screen === 'complaints'");
const dispatchEnd = profile.indexOf('} else if', dispatchStart + 10);
const dispatch = dispatchStart >= 0 ? profile.slice(dispatchStart, dispatchEnd > dispatchStart ? dispatchEnd : dispatchStart + 600) : '';
ok('the complaints dispatch block was found', dispatch.length > 0);
ok('the dispatch calls `onOpenModule(\'Complaints\')`',
  /onOpenModule\('Complaints'\)/.test(dispatch));
ok('...and that call comes BEFORE the `onNavigate` fallback',
  dispatch.indexOf('onOpenModule') >= 0
    && dispatch.indexOf('onNavigate') > dispatch.indexOf('onOpenModule'),
  'onOpenModule must be tested first or every tap is swallowed');
ok('the dispatch falls back to `onNavigate(\'Complaints\')`',
  /onNavigate\('Complaints'\)/.test(dispatch));

// ═══ 9. The resident-facing rules are visible ══════════════════════════════════════════════
section(9, 'The resident is told what the rules do');

const studentFull = read(STUDENT_SCREEN);

// A resident who rates a repair below the threshold reopens it. Hiding that means the rating appears
// to do nothing while the complaint stays "Resolved", which is the failure this feature exists to fix.
ok('the student screen surfaces the `severityRaised` flag', /severityRaised/.test(student));
ok('...and reads `reopened` off the feedback response', /reopened/.test(student));
ok('the reopen consequence is explained in the copy', /threshold/i.test(studentFull));
ok('the security severity floor is explained in the copy', /security/i.test(studentFull) && /at least Medium|never treated as minor/i.test(studentFull));

// ═══ 10. No scheduling, and the walls hold ═════════════════════════════════════════════════
section(10, 'Nothing polls, and nothing crosses a boundary');

for (const [name, src] of [['warden', warden], ['student', student]] as const) {
  ok(`the ${name} screen schedules nothing`, !/setInterval\s*\(/.test(src));
  ok(`the ${name} screen fetches on mount and on refresh only`, /useEffect\s*\(/.test(src));
}

// A technician's screen must not reach for the hostel router's other surfaces.
ok('the warden screen does not touch rooms/residents/gate-passes',
  !/hostelApi\.(rooms|residents|gatePasses|visitors)\s*\(/.test(warden));
ok('the student screen calls no warden-only method',
  !/hostelApi\./.test(student), 'the resident has no business on the warden surface');

// ═══ 11. The server side agrees with the client ════════════════════════════════════════════
section(11, 'The client and the server name the same things');

const routes = readSrc('src/modules/hostel/hostel.routes.ts');
const app = readSrc('src/app.ts');

ok('the staff router is mounted in app.ts', /staff-complaints/.test(app));
ok('...on its own base path', /app\.use\(['"]\/api\/v1\/staff-complaints/.test(app));

// The client sends `?category=`; the server must read that name. It used to read `req.query.id`
// through `idParamSchema`, so the only key that validated was `id` and the obvious one 400'd.
ok('the assignees route reads a `category` query param', /req\.query\.category/.test(routes));
ok('...and validates it as one', /validate\(complaintAssigneeQuerySchema, 'query'\)/.test(routes));

// The old filter built a `where` and then threw it away, so category/severity/q/assignedTo were
// silently ignored and every filter returned the whole queue.
const svc = codeSrc('src/modules/hostel/hostel-complaints.service.ts');
const listBody = svc.match(/export async function listComplaints[\s\S]*?\n\}/)?.[0] ?? '';
ok('listComplaints passes its `where` to Prisma', /where,\s*\n\s*include:/.test(listBody) || /\{ where, include:/.test(listBody.replace(/\s+/g, ' ')));
ok('...not a bare `{ institutionId }`', !/findMany\(\{\s*where:\s*\{\s*institutionId\s*\},\s*include:/.test(listBody));

// `resolveComplaint` used to return `{ id, status, resolvedAt }`, so the caller never saw the note it
// had just written.
ok('resolveComplaint returns the shaped complaint', /return out\s*\?/.test(svc) || /shape\(out, policy/.test(svc));

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Complaints frontend structure OK');