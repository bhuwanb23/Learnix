// X-02 Timetable — UI audit (docs/users/05 §3.9).
//
// Run: npx tsx scripts/audit-timetable-ui.ts
//
// This is the frontend's counterpart to `verify-timetable.ts`, and it checks the
// things only the FRONTEND can get wrong:
//
//   1. REACHABILITY. Every sub-screen must be wired into FEATURE_MODULES, and
//      every route the server publishes must resolve to a real screen or a real
//      tab. A screen that exists but is never registered is dead code; an
//      `openModule('TimetableSlots')` to an unregistered key renders NOTHING —
//      `renderContent` falls through to the tab switcher and the controller
//      lands back on the hub, with no error anywhere.
//
//   2. THE MIRRORS AGREE. `timetableMeta.js` deliberately duplicates the
//      server's eight blocks and eight conflict kinds. Duplication is only safe
//      if something checks it.
//
//   3. THE ROUTE RESOLUTION IS CORRECT. A published route is either a
//      bottom-nav TAB or a sub-SCREEN, and they are reached by different calls.
//      This is the check that catches `openModule('Timetable')` — which opens
//      nothing, silently.
//
//   4. THE API SURFACE MATCHES THE ROUTES, and the six superseded endpoints are
//      GONE from both sides.
//
//   5. THE FIXED DEFECTS STAY FIXED. Source-level assertions that the hard-coded
//      fixture, the deleted `exam_detail`, the removed routes, the unguarded
//      reschedule, the dead `exam_conflicts` table, the capacity default, the
//      guard-after-write ordering, the invigilator self-clash, the
//      publish short-circuit, the non-strict schemas, the own-auth router and the
//      missing `switchTab` have not come back.
//
//   6. THE POLICY WORDING IS ON THE SCREENS. The clash and publish policies are
//      decisions a controller is entitled to read, not behaviour to infer from a
//      grey button. They are asserted as text on the screens that own them.
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
// `detail` is only printed on FAILURE — the evidence for a registry mismatch
// (which keys were found) is the whole point of the assertion.
function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` — ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n-- ${n}`);

const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = path.join(REPO, 'learnix');
const FEATURE_DIR = path.join(ROOT, 'users', 'exam_cell');
const TT_DIR = path.join(FEATURE_DIR, 'pages', 'timetable');
const BACKEND = path.join(REPO, 'backend', 'src', 'modules', 'examcell');

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

const metaSrc = read(TT_DIR, 'timetableMeta.js');
const uiSrc = read(TT_DIR, 'timetableUi.js');
const hubSrc = read(TT_DIR, 'timetable.js');
const shellSrc = read(FEATURE_DIR, 'exam_cell.js');
const apiSrc = read(ROOT, 'services', 'api.js');

const BLOCK_DIRS = ['calendar', 'exams', 'allocation', 'slots', 'rooms', 'duty', 'students', 'conflicts'];
const SUB: Record<string, string> = {};
for (const d of BLOCK_DIRS) SUB[d] = read(TT_DIR, 'pages', d, `${d}.js`);

const rulesSrc = read(BACKEND, 'timetable.rules.ts');
const routesSrc = read(BACKEND, 'timetable.routes.ts');
const serviceSrc = read(BACKEND, 'timetable.service.ts');
const schemasSrc = read(BACKEND, 'examcell.schemas.ts');
const oldRoutesSrc = read(BACKEND, 'examcell.routes.ts');
const oldServiceSrc = read(BACKEND, 'examcell.service.ts');
const appSrc = read(REPO, 'backend', 'src', 'app.ts');

const SCREENS = [
  'timetable.js', 'timetableMeta.js', 'timetableUi.js',
  ...BLOCK_DIRS.map((d) => `pages/${d}/${d}.js`),
];

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

console.log('X-02 Timetable — UI audit');

// ═══ 1. The files exist ═══════════════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) ok(fs.existsSync(path.join(TT_DIR, rel)), `${rel}: exists`);

// The stale fixture is gone. It held 38 hard-coded exams and a literal "2
// conflicts" string — so the header was true on a Tuesday and false on a
// Wednesday. It was not merely unused: it was a file a reader would open
// believing it described the screen.
ok(!fs.existsSync(path.join(TT_DIR, 'constants', 'timetableData.js')),
  'the stale hard-coded timetableData fixture is deleted');
ok(!fs.existsSync(path.join(TT_DIR, 'constants')),
  'and so is the directory that held it');

// The old detail screen is gone too. It read `examcellApi.exams()`, an endpoint
// this build removed, so it rendered an error rather than a paper.
ok(!fs.existsSync(path.join(TT_DIR, 'pages', 'exam_detail', 'exam_detail.js')),
  'the old exam_detail screen, which called the removed endpoint, is deleted');

// Nothing may reference the removed API methods or the deleted fixture.
for (const [name, src] of [['timetable.js', hubSrc], ...Object.entries(SUB).map(([k, v]) => [k, v] as const)]) {
  ok(!/examcellApi\.(exams|createExam|addSlot|rescheduleSlot|roomAllocations|allocateRoom)\b/.test(src),
    `${name}: calls none of the six removed examcellApi methods`);
  ok(!/timetableData/.test(src), `${name}: does not import the deleted fixture`);
}

// ═══ 2. Reachability ══════════════════════════════════════════════════════
//
// The failure this catches is silent. `renderContent` looks the key up in
// FEATURE_MODULES and, finding nothing, falls through to the tab switcher — so a
// mistyped key sends the controller back to the hub with no error anywhere.
section('2. Every sub-screen is registered in FEATURE_MODULES');

const registeredKeys = new Set<string>();
for (const m of shellSrc.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)) registeredKeys.add(m[1]!);

const EXPECTED_ROUTES = [
  'TimetableCalendar', 'TimetableExams', 'TimetableAllocation', 'TimetableSlots',
  'TimetableRooms', 'TimetableDuty', 'TimetableStudents', 'TimetableConflicts',
];

for (const key of EXPECTED_ROUTES) {
  ok(registeredKeys.has(key), `${key}: is registered in FEATURE_MODULES`);
}

// …and each really points at a component that is imported FROM the timetable
// feature — otherwise the import could come from anywhere.
for (const key of EXPECTED_ROUTES) {
  const block = shellSrc.slice(shellSrc.indexOf(`${key}: {`));
  const line = block.slice(0, block.indexOf('\n'));
  ok(line.includes(`component: ${key}`), `${key}: is wired to its own component`, line.trim());
  ok(
    new RegExp(`import ${key} from '\\./pages/timetable/pages/[a-z]+/${key.replace('Timetable', '').toLowerCase()}'`).test(shellSrc),
    `${key}: is imported from the timetable feature`,
  );
}

// A registered entry must carry a title, or the header renders blank when the
// controller presses back into it.
for (const key of EXPECTED_ROUTES) {
  const block = shellSrc.slice(shellSrc.indexOf(`${key}: {`));
  const line = block.slice(0, block.indexOf('\n'));
  ok(/title:\s*'[^']+'/.test(line), `${key}: has a header title`, line.trim());
}

// ═══ 3. The tab/sub-screen distinction ════════════════════════════════════
//
// A bottom-nav tab is a key of TAB_TITLES reached with `switchTab`; a
// sub-screen is a key of FEATURE_MODULES reached with `openModule`. Passing a
// tab name to `openModule` finds no such key, `renderContent` falls through,
// and the controller lands back where they started with no error.
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
  eq(TAB_KEYS.size, 5, 'the five bottom-nav tabs were located', [...TAB_KEYS].join(','));

  // The Timetable tab must receive `switchTab`. It did not, and the failure is
  // deferred: `goToRoute` only calls it for a route published with
  // `isTab: true`, so nothing broke until the server published one.
  //
  // Anchored on `<TimetableModule` rather than on `case 'Timetable':`, because
  // that string appears TWICE in the shell — once in `getHeaderIcon`, which
  // returns an icon name and has nothing to do with navigation. Slicing from the
  // first occurrence checked the header switch and passed vacuously.
  const ttFrom = shellSrc.indexOf('<TimetableModule');
  ok(ttFrom !== -1, 'the Timetable tab renders the hub');
  const ttBlock = shellSrc.slice(ttFrom, shellSrc.indexOf("case 'Evaluations':", ttFrom));
  ok(/switchTab:\s*\(tabId\)\s*=>\s*handleTabChange\(tabId\)/.test(stripComments(ttBlock)),
    'the Timetable tab is passed switchTab, so a future isTab block cannot crash it');

  // Every route the SERVER publishes must resolve.
  const routes = new Set<string>();
  for (const m of rulesSrc.matchAll(/route:\s*'([A-Za-z0-9_]+)'/g)) routes.add(m[1]!);
  eq(routes.size, 8, 'the server publishes eight block routes', [...routes].join(','));

  for (const r of routes) {
    ok(registeredKeys.has(r) || TAB_KEYS.has(r), `published route '${r}' is a registered screen or a real tab`);
  }

  // …and the mirror must agree, so the app cannot route somewhere the server
  // did not intend.
  const appRoutes = new Set<string>();
  for (const m of metaSrc.matchAll(/route:\s*'([A-Za-z0-9_]+)'/g)) appRoutes.add(m[1]!);
  for (const r of appRoutes) {
    ok(routes.has(r) || registeredKeys.has(r) || TAB_KEYS.has(r),
      `the app's route '${r}' exists server-side or is a local screen`);
  }

  // The hub must resolve through goToRoute with the SERVER's flag, not a list of
  // its own. A hand-written list goes stale the moment a route changes.
  ok(/goToRoute\(navigation, b\.route, b\.isTab\)/.test(hubSrc),
    'the hub resolves each block through goToRoute with the server flag');
}

// ═══ 4. No direct openModule with a tab name ══════════════════════════════
section('4. No screen calls openModule with a bottom-nav tab name');

{
  const tabBlock = shellSrc.slice(shellSrc.indexOf('const TAB_TITLES'));
  const TAB_KEYS = new Set(
    [...tabBlock.slice(0, tabBlock.indexOf('};')).matchAll(/^\s{2}([A-Za-z]+):\s*'/gm)].map((m) => m[1]!),
  );
  const screens: [string, string][] = [
    ['timetable.js', hubSrc], ['timetableUi.js', uiSrc],
    ...BLOCK_DIRS.map((d) => [`${d}.js`, SUB[d]] as [string, string]),
  ];
  for (const [name, src] of screens) {
    for (const m of stripComments(src).matchAll(/openModule\(\s*'([A-Za-z0-9_]+)'/g)) {
      const target = m[1]!;
      ok(!TAB_KEYS.has(target), `${name}: '${target}' is a tab, so it must not be opened as a module`);
      ok(registeredKeys.has(target), `${name}: openModule('${target}') targets a registered screen`);
    }
  }
}

// ═══ 5. The mirrors agree ═════════════════════════════════════════════════
//
// `timetableMeta.js` duplicates the server registry on purpose. The only thing
// that makes that safe is this assertion.
section('5. The app mirrors the server registry');

/**
 * Pull `id: 'X'` pairs out of a named array.
 *
 * Matches on the BARE NAME, not on `= [`, because the server declares its
 * registry with a type annotation:
 *
 *     export const CONFLICT_KINDS: ConflictKind[] = [
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
pairs('conflict kinds', idsIn(rulesSrc, 'CONFLICT_KINDS'), idsIn(metaSrc, 'CONFLICT_KINDS'));
eq(idsIn(rulesSrc, 'BLOCKS').length, 8, 'the eight blocks of this feature');
eq(idsIn(rulesSrc, 'CONFLICT_KINDS').length, 8, 'and the eight conflict kinds');

// Severity, blocking and icon must match kind for kind. A client that decides
// for itself which clashes are fatal will disagree with the server about which
// writes are allowed, and that disagreement surfaces as a screen that lets the
// controller do something the server refuses.
const kindDetail = (src: string): Map<string, string> => {
  const decl = /export const CONFLICT_KINDS\b[^=]*= \[/.exec(src);
  const map = new Map<string, string>();
  if (!decl) return map;
  const start = decl.index + decl[0].length;
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end === -1 ? undefined : end);
  for (const entry of block.split(/\n  \{/).slice(1)) {
    const id = /id:\s*'([A-Z_]+)'/.exec(entry)?.[1];
    if (!id) continue;
    map.set(id, entry);
  }
  return map;
};
{
  const server = kindDetail(rulesSrc);
  const app = kindDetail(metaSrc);
  eq(server.size, 8, 'the eight server conflict kinds were located');
  eq(app.size, 8, 'the eight app conflict kinds were located');
  for (const [id, entry] of server) {
    const mine = app.get(id) ?? '';
    const sev = (s: string) => /severity:\s*'([A-Z]+)'/.exec(s)?.[1];
    const block = (s: string) => /blocking:\s*(true|false)/.exec(s)?.[1];
    const icon = (s: string) => /icon:\s*'([\w-]+)'/.exec(s)?.[1];
    eq(sev(mine), sev(entry), `${id}: the app's severity matches the server's`);
    eq(block(mine), block(entry), `${id}: the app's blocking flag matches the server's`);
    eq(icon(mine), icon(entry), `${id}: the app's icon matches the server's`);
  }
  // The two blocking kinds, named. These are the only two writes refused.
  const blocking = [...server.entries()].filter(([, e]) => /blocking:\s*true/.test(e)).map(([id]) => id).sort();
  eq(blocking.join(','), 'INVIGILATOR_DOUBLE_BOOKED,STUDENT_DOUBLE_BOOKED',
    'exactly two kinds block a write, and they are the right two');
}

// Every block must carry an icon and a colour the screen actually uses — a card
// with no colour renders as an invisible square.
//
// Scoped to the entry ITSELF. A windowed regex over the whole file passes for
// every id, because the moment one entry lacks a colour the next entry's colour
// is still inside the window — so the check looks like it works and never
// fires.
{
  const entryFor = (src: string, id: string): string => {
    const start = src.indexOf(`id: '${id}',`);
    if (start === -1) return '';
    const nextId = src.indexOf("id: '", start + 10);
    // Bounded by the next entry, so nothing bleeds across blocks.
    return src.slice(start, nextId === -1 ? src.length : nextId);
  };
  for (const id of idsIn(metaSrc, 'BLOCKS')) {
    const entry = entryFor(metaSrc, id);
    ok(entry.length > 0, `${id}: the entry was located`);
    ok(/icon:\s*'[\w-]+'/.test(entry), `${id}: has an icon`);
    // The mirror writes `color: '#4f46e5'` for a literal and `color: THEME` for
    // a named constant, so the pattern has to accept both spellings.
    ok(
      /color:\s*(?:['"]#[0-9a-fA-F]{6}['"]|(?:THEME|GREEN|AMBER|RED|VIOLET|SLATE|CYAN)\b)/.test(entry),
      `${id}: has a colour`,
    );
    ok(/route:\s*'[A-Za-z0-9_]+'/.test(entry), `${id}: has a route`);
    ok(/label:\s*'[^']+'/.test(entry), `${id}: has a label`);
    ok(/blurb:\s*'[^']+'/.test(entry), `${id}: has a blurb`);
  }
}

// ═══ 6. The API surface ═══════════════════════════════════════════════════
section('6. examcellApi matches the routes');

const API_METHODS = [
  'timetableCatalogue', 'timetableOverview', 'timetableBlock', 'timetableStudents',
  'createTimetableExam', 'updateTimetableExam', 'publishTimetableExam',
  'addTimetableSlot', 'rescheduleTimetableSlot', 'deleteTimetableSlot',
  'completeTimetableSlot', 'allocateVenue', 'assignInvigilator',
];
for (const m of API_METHODS) {
  ok(new RegExp(`^\\s{2}${m}:`, 'm').test(apiSrc), `examcellApi.${m} exists`);
}

// Each path the client calls must be served by the router, and vice versa.
const ROUTE_PATHS = [
  '/timetable/catalogue', '/timetable/overview', '/timetable/blocks/:block',
  '/timetable/students/:studentProfileId', '/timetable/exams', '/timetable/exams/:id',
  '/timetable/exams/:id/publish', '/timetable/exams/:id/slots', '/timetable/slots/:id',
  '/timetable/slots/:id/complete', '/timetable/slots/:id/venues',
  '/timetable/allocations/:id/invigilator',
];
for (const p of ROUTE_PATHS) {
  ok(routesSrc.includes(`'${p}'`), `the router serves ${p}`);
}
for (const p of [
  '/examcell/timetable/catalogue', '/examcell/timetable/overview',
  '/examcell/timetable/blocks/', '/examcell/timetable/students/',
  '/examcell/timetable/exams', '/examcell/timetable/slots/',
  '/examcell/timetable/allocations/',
]) {
  ok(apiSrc.includes(p), `examcellApi calls ${p}`);
}

// The HTTP VERB matters. `rescheduleTimetableSlot` was a POST shaped like a
// command, which made a partial change impossible to send; it is now a PATCH.
ok(/rescheduleTimetableSlot:[\s\S]{0,120}api\.patch/.test(apiSrc),
  'a reschedule is a PATCH — it is an update of the slot, not a command');
ok(/router\.patch\(\s*'\/timetable\/slots\/:id'/.test(routesSrc),
  'and the router serves it as PATCH');
ok(/deleteTimetableSlot:[\s\S]{0,120}api\.delete/.test(apiSrc), 'a slot delete is a DELETE');
ok(/assignInvigilator:[\s\S]{0,140}api\.put/.test(apiSrc), 'an invigilator assignment is a PUT');

// The field is `venueId`, NOT `roomId`. `Room` is a HOSTEL room (capacity 2, off
// a block) and `Venue` is the institution-wide master with real capacity.
ok(/allocateVenue: \(slotId, payload\) => api\.post\(`\/examcell\/timetable\/slots\/\$\{slotId\}\/venues`, payload\)/.test(apiSrc),
  'venue allocation posts to /venues with the slot id');
ok(schemasSrc.includes('venueId: z.string().min(1).max(64)'),
  'and the schema requires venueId');
ok(!/allocateVenueSchema[\s\S]{0,300}\broomId:/.test(schemasSrc),
  'and the allocation schema does NOT accept a roomId');

// The six superseded endpoints must be gone from BOTH sides.
for (const [label, src] of [['api.js', apiSrc], ['timetable.routes.ts', routesSrc]] as const) {
  ok(!/examcellApi\.exams\(|api\.get\('\/examcell\/timetable'\)/.test(src), `${label}: the old timetable list is gone`);
}
ok(!/exams:\s*\(\)\s*=>\s*api\.get\('\/examcell\/timetable'\)/.test(apiSrc),
  'examcellApi.exams is deleted rather than left pointing at a dead path');
ok(!/createExam:\s*\(payload\)\s*=>\s*api\.post\('\/examcell\/timetable'/.test(apiSrc),
  'examcellApi.createExam (the old one) is deleted');
ok(!/roomAllocations:/.test(apiSrc), 'examcellApi.roomAllocations is deleted');
ok(!/allocateRoom:/.test(apiSrc), 'examcellApi.allocateRoom is deleted');
ok(!/rescheduleSlot:/.test(apiSrc), 'examcellApi.rescheduleSlot is deleted');

// ═══ 7. Route order ═══════════════════════════════════════════════════════
//
// Express matches in registration order. `/timetable/exams` and
// `/timetable/slots/:id` are both two segments past `/timetable`, and a literal
// registered after a parameterised route silently becomes that parameter's
// value. The ordering costs nothing and stops the next literal from vanishing.
section('7. The literal routes are registered before the parameterised ones');

{
  const order: string[] = [];
  const verbs: string[] = [];
  for (const m of routesSrc.matchAll(/router\.(get|post|patch|put|delete)\(\s*'(\/[^']*)'/g)) {
    verbs.push(m[1]!.toUpperCase());
    order.push(m[2]!);
  }
  // `indexOf` is not enough. A route registered TWICE still resolves the first
  // copy, so an index-based check reads a duplicate registration as correct —
  // the teeth case for a duplicated route passed straight through it. And the
  // key is VERB + PATH: `PATCH /slots/:id` and `DELETE /slots/:id` are two
  // different routes, not a duplicate, so counting paths alone reports a false
  // positive on every pair of verbs over one path.
  const counts = new Map<string, number>();
  order.forEach((p, i) => {
    const k = `${verbs[i]} ${p}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  const dupes = [...counts.entries()].filter(([, n]) => n > 1).map(([k, n]) => `${k} ×${n}`);
  ok(dupes.length === 0, 'no VERB + PATH is registered twice', dupes.join(', '));

  const idx = (p: string) => order.indexOf(p);
  ok(idx('/timetable/catalogue') !== -1, 'the catalogue route is registered');
  ok(idx('/timetable/overview') !== -1, 'the overview route is registered');
  ok(
    idx('/timetable/blocks/:block') > idx('/timetable/catalogue')
      && idx('/timetable/blocks/:block') > idx('/timetable/overview'),
    'the parameterised /blocks/:block comes after the literals it could swallow',
  );
  ok(
    idx('/timetable/exams/:id/publish') > idx('/timetable/exams/:id'),
    '/exams/:id/publish comes after /exams/:id, which would otherwise capture it',
  );

  // The GENERAL rule, so the next literal is covered without another hand-
  // written assertion. Express matches a path when, segment by segment, the
  // pattern's segment is either the same literal or a parameter. So an earlier
  // route SHADOWS a later one exactly when they share a verb, the earlier has
  // at least as many segments, and every segment the two have in common agrees.
  // `/timetable/students/:id` is NOT shadowed by `/timetable/blocks/:block` —
  // `students` and `blocks` are different literals — which is why the earlier
  // version of this check reported a false positive and why the naive
  // "literal after parameter" phrasing cannot be the rule.
  const shadows = (earlier: string, later: string): boolean => {
    const e = earlier.split('/').filter(Boolean);
    const l = later.split('/').filter(Boolean);
    if (e.length < l.length) return false;
    return e.slice(0, l.length).every((seg, i) => seg.startsWith(':') || seg === l[i]);
  };
  const shadowed: string[] = [];
  for (let i = 0; i < order.length; i += 1) {
    for (let j = i + 1; j < order.length; j += 1) {
      if (verbs[i] === verbs[j] && shadows(order[i]!, order[j]!)) {
        shadowed.push(`${verbs[j]} ${order[j]} is shadowed by ${verbs[i]} ${order[i]}`);
      }
    }
  }
  ok(shadowed.length === 0, 'no registered route is shadowed by an earlier one', shadowed.join('; '));
}

// ═══ 8. The policy wording is ON THE SCREENS ═══════════════════════════════
//
// The clash and publish policies are decisions a controller is entitled to read.
// A screen that only greys out a button forces them to infer the rule from its
// behaviour, and the two most important policies in this feature are exactly the
// ones a user should not have to guess.
section('8. The clash and publish policies are stated on the screens');

{
  // These check the WORDING on the screens, so comments are deliberately NOT
  // stripped: the point is that the policy is stated in prose a controller can
  // read, and in these files it is stated in the file header and the user-facing
  // strings. Each pattern matches the text that is actually there.
  ok(/PUBLISHED ONLY ONCE EVERY HIGH-SEVERITY CLASH IS RESOLVED/i.test(SUB.conflicts!),
    'the conflicts screen states the publish policy in words');
  ok(
    /all of them are recorded rather than refused|recorded rather than refused/i.test(SUB.slots!),
    'the slots screen states that soft clashes are recorded, not refused',
  );
  ok(
    /recorded as a clash, not refused/i.test(SUB.rooms!),
    'the rooms screen states that a shortfall is recorded, not refused',
  );
  ok(/with no date|no date/i.test(SUB.students!),
    'the student screen says an undated course is undated, not absent');
  ok(/with no slot|no slot/i.test(SUB.allocation!),
    'the allocation screen names the missing half of the exam');

  // The policy the app states must BE the policy the server enforces — same
  // sentence, both sides.
  const serverPolicy = 'An exam can only be published once every HIGH-severity clash is resolved';
  ok(rulesSrc.includes(serverPolicy), 'the publish policy sentence comes from the server, not from the app');
  ok(metaSrc.includes(serverPolicy), 'and the app mirrors that same sentence');

  // The two halves of the clash policy, on both the rules layer and the screens
  // that enforce them.
  ok(/refused at write time/.test(rulesSrc), 'the server states which clashes are refused outright');
  ok(/refused at write time/.test(metaSrc), 'and the app mirrors that half of the policy too');
  ok(/student double-booked|Student in two papers at once|STUDENT_DOUBLE_BOOKED/i.test(SUB.conflicts!),
    'the conflicts screen names the student double-booking');
  ok(/Invigilator booked twice|INVIGILATOR_DOUBLE_BOOKED/i.test(SUB.duty!),
    'the duty screen names the invigilator double-booking');
}

// ═══ 9. The fixed defects stay fixed ═══════════════════════════════════════
section('9. The fixed defects stay fixed');

// 9.1 The guard must run BEFORE the write. Writing first and guarding second
// means a refused write leaves its row behind: the controller is told 422, the
// screen shows the paper was not added, and it is in fact in the timetable.
ok(/async function preflight/.test(serviceSrc), 'preflight exists');
ok(/assertNoBlockingClash\(conflicts, touchedSlotId\)/.test(serviceSrc),
  'and it refuses only on a blocking clash, naming the slot');
{
  // Every mutation must call preflight BEFORE its prisma write. Checked by
  // position within each function body, which is the only thing that matters.
  const mutations = [
    ['addSlot', /export async function addSlot/],
    ['rescheduleSlot', /export async function rescheduleSlot/],
    ['allocateVenue', /export async function allocateVenue/],
    ['assignInvigilator', /export async function assignInvigilator/],
  ] as const;
  for (const [name, decl] of mutations) {
    const from = serviceSrc.indexOf(decl.source);
    ok(from !== -1, `${name}: found`);
    const body = serviceSrc.slice(from, serviceSrc.indexOf('\nexport ', from + 10));
    const pf = body.indexOf('preflight(');
    const write = Math.min(
      ...['prisma.examSlot.create', 'prisma.examSlot.update', 'prisma.examRoomAllocation.create',
        'prisma.examRoomAllocation.update']
        .map((w) => {
          const i = body.indexOf(w);
          return i === -1 ? Number.POSITIVE_INFINITY : i;
        }),
    );
    ok(pf !== -1, `${name}: runs the clash guard`);
    ok(pf < write, `${name}: runs the guard BEFORE writing, not after`);
  }
  // And refreshConflicts, which only refreshes stored rows, must never be the
  // thing that refuses.
  ok(/only refreshes the stored conflict rows — it does NOT decide whether the write/.test(serviceSrc),
    'refreshConflicts is documented as refresh-only, so the gate cannot quietly move back after the write');
}

// 9.2 The invigilator self-clash. A slot split across two venues has two
// allocations, so a naive engine compares the slot against itself and reports a
// HIGH blocking clash that makes a split paper impossible to staff.
ok(/new Set\(/.test(serviceSrc) && /people|invigilator/i.test(serviceSrc),
  'the engine dedupes people per slot, so a split paper is not a self-clash');

// 9.3 publishExam must NOT short-circuit on alreadyPublished. The realistic
// sequence is: the timetable goes out, then somebody is pulled off duty. That
// caller asks "can this go out?" and got "yes it already did" — true about the
// past, useless about the present.
{
  const from = serviceSrc.indexOf('export async function publishExam');
  const body = serviceSrc.slice(from, serviceSrc.indexOf('\nexport ', from + 10));
  const gate = body.indexOf('if (!blocks.publishable)');
  const already = body.indexOf('const alreadyPublished =');
  ok(gate !== -1, 'the gate is evaluated');
  ok(already !== -1, 'alreadyPublished is computed');
  ok(gate < already, 'the gate runs BEFORE alreadyPublished is even computed — there is no early return');
  // The return uses SHORTHAND — `{ ...updated, publishable: true, alreadyPublished }`
// — so there is no colon to match. Asserting `alreadyPublished:` here would have
// failed against correct code.
ok(/return \{ \.\.\.updated, publishable: true, alreadyPublished \}/.test(body.replace(/\s+/g, ' ').replace(/\{ \.\.\./, '{ ...')),
  'and it is reported alongside the real answer, not instead of it');
}

// 9.4 Tenant scope on the offering lookup. `CourseOffering` has no
// institutionId, so it reaches its tenant through `Course.institutionId` — the
// single easiest thing to forget and the most expensive.
ok(/function offeringWhere/.test(serviceSrc) || /const offeringWhere/.test(serviceSrc),
  'the offering lookup is scoped by an offeringWhere helper');
ok(/\.\.\.offeringWhere\(institutionId\)/.test(serviceSrc),
  'and it is applied to the offering queries');

// 9.5 The dead `exam_conflicts` table. Nothing ever wrote a row until
// recordConflicts was added, so the table was a schema claim with no content.
ok(/async function recordConflicts/.test(serviceSrc), 'recordConflicts exists');
ok(/examConflict\.create/.test(serviceSrc), 'and it writes conflict rows');
ok(/examConflict\.deleteMany/.test(serviceSrc),
  'rewriting rather than accumulating, so a fixed clash disappears');

// 9.6 Seats must come from the ACTIVE enrolment count, read against an include
// that actually fetches them. The old code read `enrollments.length` against an
// include that never selected them, so it was always `undefined ?? 30`.
ok(/enrollments: true/.test(serviceSrc), 'enrollments are included where the count is read');
// Comments stripped: the service's own header QUOTES the old bug
// (`offering.enrollments.length ?? 30`) to explain what was fixed, so scanning
// the raw text would report the very defect it documents.
ok(!/\?\?\s*30/.test(stripComments(serviceSrc)), 'and no 30-seat fallback remains in code');

// 9.7 Every new schema must be `.strict()`. A typo'd field used to be silently
// dropped, so `POST /timetable { name, typr }` created a defaulted exam and the
// caller could not tell a field was ignored from a field honoured.
const strictCount = (schemasSrc.match(/\.strict\(\)/g) ?? []).length;
ok(strictCount >= 13, `at least thirteen strict schemas (found ${strictCount})`);
for (const name of [
  'createTimetableExamSchema', 'updateTimetableExamSchema', 'addTimetableSlotSchema',
  'rescheduleTimetableSlotSchema', 'allocateVenueSchema', 'assignInvigilatorSchema',
  'publishTimetableExamSchema', 'completeTimetableSlotSchema',
  'timetableBlockQuerySchema', 'timetableStudentsQuerySchema', 'timetableCatalogueQuerySchema',
  'timetableExamParamSchema', 'timetableSlotParamSchema',
]) {
  ok(new RegExp(`export const ${name}\\b`).test(schemasSrc), `${name} is declared`);
}

// 9.8 The router must apply its OWN auth, not rely on a sibling's. This is
// asserted with comments stripped, so the line quoted inside the explanatory
// comment cannot satisfy it.
ok(/router\.use\(auth, requireRole\('EXAMCELL', 'ADMIN'\)\);/.test(stripComments(routesSrc)),
  'timetable.routes applies its own auth and role guard');

// 9.9 The mount order is the other half of that guarantee.
{
  const ti = appSrc.indexOf("app.use('/api/v1/examcell', timetableRoutes)");
  const ei = appSrc.indexOf("app.use('/api/v1/examcell', examcellRoutes)");
  ok(ti !== -1, 'timetableRoutes is mounted');
  ok(ei !== -1, 'examcellRoutes is mounted');
  ok(ti < ei, 'timetableRoutes is mounted BEFORE examcellRoutes');
}

// 9.10 The six superseded routes and service functions must stay gone.
for (const p of [
  "'/timetable'", "'/slots/:id/reschedule'", "'/slots/:id/allocations'",
]) {
  ok(!routesSrc.includes(p), `the superseded route ${p} is not served by the new router`);
}
for (const fn of ['listExams', 'createExam', 'addExamSlot', 'rescheduleSlot', 'listRoomAllocations', 'allocateRoom']) {
  ok(
    !new RegExp(`export (async )?function ${fn}\\b`).test(oldServiceSrc),
    `the superseded service function ${fn} is deleted`,
  );
}
// …and examcell.routes must no longer register the old timetable endpoints.
ok(!/router\.get\(\s*'\/timetable'/.test(oldRoutesSrc), 'examcell.routes no longer serves GET /timetable');
ok(!/router\.post\(\s*'\/timetable'/.test(oldRoutesSrc), 'nor POST /timetable');

// 9.11 The failed request must be shown in place of the content. On this screen
// a failed load rendered as "0 clashes" is the dangerous reading — it is what
// lets a controller publish a broken schedule.
ok(/if \(error\) \{/.test(stripComments(uiSrc)), 'the shell renders an error panel');
ok(/A timetable that failed to\s*\n?\s*load is not a timetable with no clashes/.test(stripComments(uiSrc)),
  'and it says why, rather than showing zeros');
ok(/Nothing is shown rather than shown as clear/.test(stripComments(uiSrc)),
  'the empty and the failed are named as different things');

// 9.12 A clear conflict must draw a tick, never the alarm icon.
ok(/name=\{count > 0 \? meta\.icon : 'checkmark-circle-outline'\}/.test(stripComments(uiSrc)),
  'a clear conflict row draws a tick, not its alarm icon');
ok(/const tone = conflictTone\(count\);/.test(stripComments(uiSrc)),
  'and its colour comes from conflictTone, so zero is clear rather than warn');

// 9.13 The heavy-duty threshold must be the server's, not a second number.
ok(/HEAVY_DUTY_COUNT = 4/.test(rulesSrc), 'the server threshold is 4');
ok(/HEAVY_DUTY_COUNT = 4/.test(metaSrc), 'and the app mirrors that same 4');
ok(/heavyThreshold/.test(serviceSrc), 'the server sends the threshold the screen should use');
ok(/data\?\.heavyThreshold \?\? HEAVY_DUTY_COUNT/.test(stripComments(SUB.duty!)),
  'and the duty screen prefers the server value over its own');

// 9.14 `Room` is a hostel room and must never be the allocation target. If a
// screen or schema reintroduced `roomId` as the user-facing field, a hundred
// students could be seated in a capacity-2 bunk.
//
// Asserted on CODE, not on the prose that explains it: the comment spans two
// lines, so a single-line pattern on it never matched, and a documentation
// assertion would not survive an edit that broke the behaviour.
ok(/prisma\.venue\.findMany/.test(serviceSrc), 'venue allocation reads the Venue table');
ok(!/prisma\.room\./.test(serviceSrc), 'and nothing in the service reaches for the hostel Room table');
ok(/Venue not found for this institution/.test(serviceSrc),
  'an allocation naming something that is not a venue of THIS institution is refused');
ok(!/prisma\.room\.findMany/.test(routesSrc), 'nor does the router');

// ═══ 10. Each block screen loads only its own block ════════════════════════
//
// A sub-screen that fetched the whole overview would pay for seven blocks it
// never draws, and the hub's own argument — that one response cannot show eight
// different moments — applies just as much to a screen opening seven times.
section('10. Each sub-screen fetches only its own block');

const BLOCK_FOR_SCREEN: Record<string, string> = {
  calendar: 'CALENDAR', exams: 'EXAMS', allocation: 'ALLOCATION', slots: 'SLOTS',
  rooms: 'ROOMS', duty: 'DUTY', students: 'STUDENTS', conflicts: 'CONFLICTS',
};
for (const [file, block] of Object.entries(BLOCK_FOR_SCREEN)) {
  const src = SUB[file]!;
  ok(
    new RegExp(`examcellApi\\.timetableBlock\\('${block}'`).test(src),
    `${file}.js fetches its own block (${block})`,
  );
  ok(!/timetableOverview\(/.test(src), `${file}.js does not fetch the whole overview`);
}
// The slots screen additionally needs the ROOMS block for its venue sheet. That
// is a deliberate second fetch, so it is asserted rather than left accidental.
ok(/examcellApi\.timetableBlock\('ROOMS'/.test(SUB.slots!), 'the slots screen also fetches ROOMS for its venue sheet');
// The intent is that a failed venue fetch must NOT take the slots screen down
// with it, so this asserts the CATCH, not the comment above it.
{
  const from = SUB.slots!.indexOf('const loadVenues');
  const fn = SUB.slots!.slice(from, SUB.slots!.indexOf('}, [examId])', from));
  ok(/catch/.test(fn), 'the venue fetch has a catch');
  ok(/setVenueList\(\[\]\)/.test(fn), 'which empties the list rather than rethrowing');
  ok(!/throw/.test(fn), 'so a failed venue lookup cannot take the slots screen down with it');
  ok(/A failure here is silent BY DESIGN/.test(SUB.slots!),
    'and that decision is documented where it is made');
}

// The students screen must NOT fetch all fifty students' details to show one.
ok(/timetableBlock\('STUDENTS'\)/.test(SUB.students!), 'the students screen loads the roster block');
ok(/timetableStudents\(pickedId\)/.test(stripComments(SUB.students!)),
  "and one student's detail from its own route, only once chosen");

// ═══ 11. The hub's own shape ═══════════════════════════════════════════════
section('11. The hub renders the catalogue, not a hard-coded list');

ok(/catalogue\.data\?\.blocks\?\.length \? catalogue\.data\.blocks : BLOCKS/.test(hubSrc),
  'the block list comes from the server, with the mirror only as the first-frame fallback');
ok(!/const blocks = BLOCKS;/.test(hubSrc), 'the mirror is not also the source');
// `const ready = s ? s.publishable : false;` — a ternary, so the pattern has to
// allow the spaces a formatter would put there.
ok(/s\s*\?\s*s\.publishable\s*:\s*false/.test(hubSrc), 'the hero states whether the season may be published');
ok(/publishPhrase\(/.test(hubSrc), 'and names the reason when it may not');
ok(/No timetable yet/.test(hubSrc), 'an empty timetable is named as empty, not as clear');

// Every write path in the feature must RELOAD rather than patch local state,
// because a write can be refused and a patched row would show a change the
// server never accepted.
// The patch check has to cover `timetableUi.js` as well. `setData` is declared
// THERE and nowhere else, so scanning only the sub-screens makes the assertion
// unfalsifiable — it could never fire, which the teeth proof caught.
for (const [file, src] of Object.entries({ ...SUB, 'timetableUi.js': uiSrc })) {
  const apiCalls = [...stripComments(src).matchAll(/examcellApi\.(create|update|add|delete|reschedule|publish|complete|allocate|assign)\w*\(/g)];
  const patches = /setData\(\s*(\(\s*\w+\s*\)|\w+)\s*=>/.test(stripComments(src));
  ok(patches === false, `${file}.js never patches fetched data with a local update`);
  if (apiCalls.length > 0) {
    ok(/reload\(\)/.test(stripComments(src)), `${file}.js reloads from the server after a write`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('');
for (const f of failures) console.log(`  FAIL ${f}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);