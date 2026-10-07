// X-04 Hall tickets — UI audit (docs/users/05 §3.5).
//
// Run: npx tsx scripts/audit-hallticket-ui.ts
//
// This is the frontend's counterpart to `verify-hallticket.ts`, and it checks
// the things only the FRONTEND can get wrong:
//
//   1. REACHABILITY. Every sub-screen must be wired into FEATURE_MODULES, and
//      every route the server publishes must resolve to a real screen or a real
//      tab. A screen that exists but is never registered is dead code; an
//      `openModule('HallTicketsCentre')` to an unregistered key renders NOTHING
//      — `renderContent` falls through to the tab switcher and the controller
//      lands back on the hub, with no error anywhere.
//
//   2. THE MIRRORS AGREE. `hallTicketMeta.js` deliberately duplicates the
//      server's seven blocks, two request kinds, four request statuses, three
//      correctable fields, three publication statuses, three ticket statuses
//      and six eligibility reasons. Duplication is only safe if something
//      checks it, and a mirror that disagrees with its source is worse than no
//      mirror: it looks like the truth.
//
//   3. THE ROUTE RESOLUTION IS CORRECT. A published route is either a
//      bottom-nav TAB or a sub-SCREEN, and they are reached by different calls.
//
//   4. THE API SURFACE MATCHES THE ROUTES, and the two superseded endpoints
//      are GONE from the app — the old screen called both and got a 404, and
//      its picker called `examcellApi.exams()`, which has never existed on that
//      API object.
//
//   5. THE POLICY IS ON THE SCREENS. "Warnings never block", the per-exam
//      publish gate and the approval/completion split are decisions a
//      controller is entitled to read, not behaviour to infer from a grey
//      button.
//
//   6. THE FIXED DEFECTS STAY FIXED. Source-level assertions that the
//      hard-coded fixture, the removed endpoints, the blocked-student language
//      and the non-strict schemas have not come back.
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
const HT_DIR = path.join(FEATURE_DIR, 'pages', 'hall_tickets');
const BACKEND = path.join(REPO, 'backend', 'src', 'modules', 'examcell');

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

const metaSrc = read(HT_DIR, 'hallTicketMeta.js');
const uiSrc = read(HT_DIR, 'hallTicketUi.js');
const hubSrc = read(HT_DIR, 'hall_tickets.js');
const shellSrc = read(FEATURE_DIR, 'exam_cell.js');
const apiSrc = read(ROOT, 'services', 'api.js');
const rulesSrc = read(BACKEND, 'hallticket.rules.ts');
const routesSrc = read(BACKEND, 'hallticket.routes.ts');
const schemasSrc = read(BACKEND, 'examcell.schemas.ts');

/** The seven sub-screens, keyed by the directory name. */
const SUB: Record<string, string> = {};
for (const rel of [
  'pages/eligibility/eligibility.js',
  'pages/generation/generation.js',
  'pages/tickets/tickets.js',
  'pages/schedule/schedule.js',
  'pages/centre/centre.js',
  'pages/requests/requests.js',
  'pages/publication/publication.js',
]) {
  SUB[rel.split('/').pop()!] = read(HT_DIR, ...rel.split('/'));
}

const SCREENS = [
  'hall_tickets.js',
  'hallTicketMeta.js',
  'hallTicketUi.js',
  'pages/eligibility/eligibility.js',
  'pages/generation/generation.js',
  'pages/tickets/tickets.js',
  'pages/schedule/schedule.js',
  'pages/centre/centre.js',
  'pages/requests/requests.js',
  'pages/publication/publication.js',
];

/** Everything that is one of the eight screens, for whole-feature scans. */
const ALL: Record<string, string> = {
  'hall_tickets.js': hubSrc,
  'hallTicketMeta.js': metaSrc,
  'hallTicketUi.js': uiSrc,
  ...SUB,
};

/** Comment-stripped source, so an assertion cannot pass on prose. */
function stripComments(src: string) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

console.log('X-04 Hall tickets — UI audit');

// ═══ 1. The files exist ═══════════════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) ok(fs.existsSync(path.join(HT_DIR, rel)), `${rel}: exists`);

// The stale fixture is gone. It held four hard-coded stat rows and six invented
// students — and, worse, a `BLOCKED_STUDENTS` list naming students refused for
// "Fee dues pending" and "Attendance below 75%". That directly contradicts the
// one policy this feature is built on: warnings never block. It was not merely
// unused; it was a file a reader would open believing it described the screen.
ok(!fs.existsSync(path.join(HT_DIR, 'constants', 'hallTicketsData.js')),
  'the stale hard-coded hallTicketsData fixture is deleted');
ok(!fs.existsSync(path.join(HT_DIR, 'constants')),
  'and so is the directory that held it');

// Nothing may reference the removed API methods, the deleted fixture, or a
// `examcellApi.exams()` call that has never existed on this API object.
//
// COMMENT-STRIPPED: three of these screens discuss the old defects at length in
// their headers — the hub explains that the old picker called
// `examcellApi.exams()` — and an assertion that fires on prose is an assertion
// that gets weakened the first time someone documents why it exists.
for (const [name, raw] of Object.entries(ALL)) {
  const src = stripComments(raw);
  ok(!/examcellApi\.exams\s*\(/.test(src),
    `${name}: never calls examcellApi.exams() — that method lives on the STUDENT api`);
  ok(!/examcellApi\.(hallTickets|generateHallTickets)\s*\(/.test(src),
    `${name}: calls neither superseded hall-ticket endpoint`);
  ok(!/hallTicketsData/.test(src), `${name}: does not import the deleted fixture`);
  ok(!/BLOCKED_STUDENTS|TICKET_STATS\b/.test(src),
    `${name}: does not resurrect the blocked-student fixture`);
}

// ═══ 2. Reachability ══════════════════════════════════════════════════════
//
// The failure this catches is silent. `renderContent` looks the key up in
// FEATURE_MODULES and, finding nothing, falls through to the tab switcher — so
// a mistyped key sends the controller back to the hub with no error anywhere.
section('2. Every sub-screen is registered in FEATURE_MODULES');

const registeredKeys = new Set<string>();
for (const m of shellSrc.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)) registeredKeys.add(m[1]!);

const EXPECTED_ROUTES = [
  'HallTicketsEligibility', 'HallTicketsGeneration', 'HallTicketsList',
  'HallTicketsSchedule', 'HallTicketsCentre', 'HallTicketsRequests',
  'HallTicketsPublication',
];

for (const key of EXPECTED_ROUTES) {
  ok(registeredKeys.has(key), `${key}: is registered in FEATURE_MODULES`);
}

// …and each really points at a component imported FROM the hall-ticket feature.
for (const key of EXPECTED_ROUTES) {
  const at = shellSrc.indexOf(`${key}: {`);
  ok(at !== -1, `${key}: has a registry entry`);
  if (at === -1) continue;
  const line = shellSrc.slice(at, shellSrc.indexOf('\n', at));
  ok(line.includes(`component: ${key}`), `${key}: is wired to its own component`, line.trim());
  ok(
    new RegExp(`import ${key} from '\\./pages/hall_tickets/pages/[a-z]+/[a-z_]+'`).test(shellSrc),
    `${key}: is imported from the hall_tickets feature`,
  );
  ok(/title:\s*'[^']+'/.test(line), `${key}: has a header title`, line.trim());
}

// The hub itself must be registered, or the dashboard cannot open it at all.
ok(registeredKeys.has('HallTickets'), 'HallTickets (the hub) is registered');

// ═══ 3. The tab/sub-screen distinction ════════════════════════════════════
//
// A bottom-nav tab is a key of TAB_TITLES reached with `switchTab`; a
// sub-screen is a key of FEATURE_MODULES reached with `openModule`. Passing a
// tab name to `openModule` finds no such key, `renderContent` falls through,
// and the controller lands back where they started with no error.
section('3. Routes resolve through goToRoute, which knows the difference');

ok(/export const TAB_ROUTES = \[/.test(uiSrc), 'the tab list is declared once, in the file that navigates');
ok(/export function goToRoute/.test(uiSrc), 'and there is one function that resolves a published route');
ok(/if \(isTab && typeof navigation\.switchTab === 'function'\)/.test(uiSrc),
  'a tab goes through switchTab');
ok(/else if \(typeof navigation\.openModule === 'function'\)/.test(uiSrc),
  'anything else goes through openModule');

{
  const tabBlock = shellSrc.slice(shellSrc.indexOf('const TAB_TITLES'));
  const TAB_KEYS = new Set(
    [...tabBlock.slice(0, tabBlock.indexOf('};')).matchAll(/^\s{2}([A-Za-z]+):\s*'/gm)].map((m) => m[1]!),
  );
  eq(TAB_KEYS.size, 5, 'the five bottom-nav tabs were located', [...TAB_KEYS].join(','));

  // Every route the SERVER publishes must resolve. The server is
  // `hallticket.rules.ts`, not the app mirror — if the two disagree the server
  // wins, because it is what produced the route.
  const routes = new Set<string>();
  for (const m of rulesSrc.matchAll(/route:\s*'([A-Za-z0-9_]+)'/g)) routes.add(m[1]!);
  eq(routes.size, 7, 'the server publishes seven block routes', [...routes].join(','));

  for (const r of routes) {
    ok(registeredKeys.has(r) || TAB_KEYS.has(r), `published route '${r}' is a registered screen or a real tab`);
  }

  // …and the mirror must agree, so the app cannot route somewhere the server
  // did not intend.
  const appRoutes = new Set<string>();
  for (const m of metaSrc.matchAll(/route:\s*'([A-Za-z0-9_]+)'/g)) appRoutes.add(m[1]!);
  eq(appRoutes.size, 7, 'the mirror declares seven routes too', [...appRoutes].join(','));
  for (const r of appRoutes) {
    ok(routes.has(r), `the mirror's route '${r}' is published by the server`);
  }

  // The hub must resolve through goToRoute with the SERVER's flag, not a list
  // of its own. A hand-written list goes stale the moment a route changes.
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
  for (const [name, src] of Object.entries(ALL)) {
    for (const m of stripComments(src).matchAll(/openModule\(\s*'([A-Za-z0-9_]+)'/g)) {
      const target = m[1]!;
      ok(!TAB_KEYS.has(target), `${name}: '${target}' is a tab, so it must not be opened as a module`);
      ok(registeredKeys.has(target), `${name}: openModule('${target}') targets a registered screen`);
    }
  }
}

// ═══ 5. The mirrors agree ═════════════════════════════════════════════════
//
// Every list below exists TWICE on purpose: once where the server can enforce
// it, once where a screen can draw it without a round trip. Duplication is
// only safe because this section compares them.
section('5. The app mirrors the server registry');

/** Compare a list of ids declared in both files. */
function mirrorsBoth(name: string, pattern: RegExp) {
  const fromServer = new Set<string>();
  for (const m of rulesSrc.matchAll(pattern)) fromServer.add(m[1]!);
  const fromApp = new Set<string>();
  for (const m of metaSrc.matchAll(pattern)) fromApp.add(m[1]!);
  eq(
    [...fromApp].sort().join(','),
    [...fromServer].sort().join(','),
    `${name}: mirror and server list the same ids`,
    `server=[${[...fromServer].join(',')}] app=[${[...fromApp].join(',')}]`,
  );
  return fromServer;
}

mirrorsBoth('block ids', /id:\s*'([A-Z_]+)',\s*\n\s*label:/g);
mirrorsBoth('request kinds', /(?:REQUEST_KINDS = \[|kind:\s*')(\w*)/g);
mirrorsBoth('request statuses', /'((?:REQUESTED|APPROVED|REJECTED|COMPLETED))'/g);
mirrorsBoth('correctable fields', /'((?:seatNo|rollNo|fullName))'/g);
mirrorsBoth('publication statuses', /'(DRAFT|PUBLISHED|RECALLED)'/g);
mirrorsBoth('ticket statuses', /'(GENERATED|DOWNLOADED|NOT_GENERATED)'/g);
mirrorsBoth('eligibility reasons', /id:\s*'(PROFILE_NOT_ACTIVE|ENROLLMENT_DROPPED|NO_SCHEDULED_PAPER|FEES_OUTSTANDING|NO_PHOTO|TICKET_ALREADY_ISSUED)'/g);

// The two policy sentences must be character-identical. A screen that prints
// a paraphrase of the policy is a screen that can contradict it while looking
// like it is quoting it.
//
// The two files spell the key differently on purpose: the server nests it in
// `THRESHOLDS.eligibilityPolicy.sentence`, the mirror exports a flat
// `ELIGIBILITY_POLICY` string. Reading only the server's spelling made this
// assertion fail on `null` for both policies — an assertion that never saw the
// app's side cannot compare anything.
function policySentence(src: string, key: string): string | null {
  const at = src.indexOf(key);
  if (at === -1) return null;
  const slice = src.slice(at, at + 700);
  const nested = /sentence:\s*\n?\s*'([^']+)'/.exec(slice);
  if (nested) return nested[1]!;
  const flat = /=\s*\n?\s*'([^']+)'/.exec(slice);
  return flat?.[1] ?? null;
}

for (const [key, appKey] of [
  ['eligibilityPolicy', 'ELIGIBILITY_POLICY'],
  ['publishPolicy', 'PUBLISH_POLICY'],
] as const) {
  const server = policySentence(rulesSrc, key);
  const app = policySentence(metaSrc, appKey);
  ok(!!server, `the server publishes the ${key} sentence`);
  ok(!!app, `the mirror declares ${appKey}`);
  eq(app, server, `${key}: the mirror quotes the server's sentence verbatim`);
}

// `hallTicketMeta.js` is a LEAF — a registry module that could import another
// registry module would be somewhere for the registries to disagree.
ok(!/from\s+['"]\./.test(metaSrc), 'hallTicketMeta.js imports nothing — it is a leaf');
// …while the UI kit is allowed to.
ok(/from\s+['"]\.\/hallTicketMeta'/.test(uiSrc), 'hallTicketUi.js reads the meta, so there is one source');

// ═══ 6. examcellApi matches the routes ════════════════════════════════════
section('6. examcellApi matches the routes');

const EXPECTED_METHODS = [
  'hallTicketCatalogue',
  'hallTicketOverview',
  'hallTicketBlock',
  'generateHallTicketBulk',
  'setHallTicketPublication',
  'generateHallTicket',
  'createHallTicketRequest',
  'decideHallTicketRequest',
  'completeHallTicketRequest',
  'markHallTicketDownloaded',
];
for (const m of EXPECTED_METHODS) {
  ok(new RegExp(`^\\s{2}${m}:`, 'm').test(apiSrc), `examcellApi.${m} exists`);
}

// The two superseded methods are GONE from the app, and the endpoints they
// named are gone from the router. The old screen called both and got a 404.
ok(!/^\s{2}hallTickets:/m.test(apiSrc), 'the old examcellApi.hallTickets is removed');
ok(!/^\s{2}generateHallTickets:/m.test(apiSrc), 'the old examcellApi.generateHallTickets is removed');
ok(!/hall-tickets\?examId=/.test(stripComments(apiSrc)), 'the removed GET /hall-tickets?examId= is not called');
ok(!/post\('\/examcell\/hall-tickets\/generate'/.test(stripComments(apiSrc)),
  'the removed POST /hall-tickets/generate is not called');
ok(!/hall-tickets\?examId=/.test(stripComments(routesSrc)), 'and the router no longer serves it');
ok(!/router\.post\(\s*\n?\s*'\/hall-tickets\/generate'/s.test(routesSrc),
  'nor the generate route');

// Every write the screens perform must have a method.
for (const [file, src] of Object.entries(ALL)) {
  for (const m of stripComments(src).matchAll(/examcellApi\.([A-Za-z]+)\s*\(/g)) {
    const name = m[1]!;
    if (!name.startsWith('hallTicket') && !name.startsWith('generate') && !name.startsWith('mark')
      && !name.startsWith('create') && !name.startsWith('decide') && !name.startsWith('complete')
      && !name.startsWith('set')) continue;
    ok(
      new RegExp(`^\\s{2}${name}:`, 'm').test(apiSrc),
      `${file}: examcellApi.${name} exists`,
    );
  }
}

// ═══ 7. Literal routes precede parameterised ones ═════════════════════════
//
// Everything under `/hall-tickets` shares the first two segments, so a
// parameterised path registered first would swallow `requests`, `catalogue`,
// `blocks` and `exams` as if they were ids.
section('7. The literal routes are registered before the parameterised ones');

{
  const order: Array<{ method: string; route: string; at: number }> = [];
  for (const m of routesSrc.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']+)'/g)) {
    order.push({ method: m[1]!, route: m[2]!, at: m.index! });
  }
  ok(order.length >= 10, `the router declares at least ten routes`, `found ${order.length}`);

  // `/:id/download` must be LAST: it is the only route whose FIRST parameter
  // sits where a literal would otherwise be captured as an id.
  const last = order[order.length - 1];
  ok(last?.route === '/hall-tickets/:id/download',
    '/:id/download is registered last of all', `last was ${last?.method} ${last?.route}`);

  // No parameterised route may precede any literal at the same depth.
  const depth2 = order.filter((r) => r.route.split('/').filter(Boolean).length >= 3);
  const firstParam = depth2.find((r) => r.route.split('/').filter(Boolean).some((s) => s.startsWith(':')));
  const literalsAfter = depth2.filter(
    (r) => firstParam && r.at > firstParam.at && !r.route.split('/').filter(Boolean).some((s) => s.startsWith(':')),
  );
  eq(literalsAfter.length, 0,
    'no literal route is registered after a parameterised one',
    literalsAfter.map((r) => r.route).join(','));

  // `requests` is a literal two segments deep, so it must beat `/:id/...`.
  const requestsAt = order.find((r) => r.route === '/hall-tickets/requests')?.at;
  const patchIdAt = order.find((r) => r.route === '/hall-tickets/requests/:id')?.at;
  ok(requestsAt !== undefined && patchIdAt !== undefined && requestsAt < patchIdAt,
    'POST /requests precedes PATCH /requests/:id');
}

// ═══ 8. The policies are stated on the screens ════════════════════════════
//
// These are decisions a controller is entitled to READ, not behaviour to infer
// from a grey button. Each is asserted as text on the screen that owns it.
section('8. The policies are stated on the screens');

// Warn-only: the eligibility screen prints the sentence, and no screen may
// claim a student is refused.
ok(/ELIGIBILITY_POLICY/.test(metaSrc), 'the eligibility policy is declared in the mirror');
ok(/policy/.test(SUB['eligibility.js']!) && /NoteStrip/.test(SUB['eligibility.js']!),
  'the eligibility screen prints the policy as a strip');
ok(/Warnings never stop generation|warnings are shown alongside|never stop a generation/
    .test(stripComments(SUB['eligibility.js']!) + metaSrc),
  'and the sentence actually says warnings do not block');
for (const [file, raw] of Object.entries(ALL)) {
  if (file === 'hallTicketMeta.js') continue;
  const src = stripComments(raw);
  // Aimed at STUDENT-level claims. `publication.js` legitimately says
  // "publishing IS REFUSED when there is nothing to publish" — that is about an
  // exam, and a pattern broad enough to catch it would be a pattern that gets
  // deleted rather than a pattern that gets narrowed.
  ok(!/\bineligible\b/i.test(src),
    `${file}: never tells the controller a student is ineligible`);
  ok(!/\b(is|been|now) blocked\b/i.test(src),
    `${file}: never tells the controller a student is blocked`);
  ok(!/\bstudent\b[^.\n]{0,50}\brefus/i.test(src),
    `${file}: never claims a student was refused`);
  ok(!/\bwill not be issued\b|\bnot allowed to sit\b/i.test(src),
    `${file}: never claims a ticket will be withheld`);
}

// The publish gate: an exam with no ticket cannot go out, and the screen says
// so BEFORE the button is pressed.
ok(/PUBLISH_POLICY/.test(metaSrc), 'the publish policy is declared in the mirror');
ok(/has no generated ticket|nothing to publish/.test(SUB['publication.js']!),
  'the publication screen states the gate');

// Approval and completion are separate steps.
ok(/APPROVED/.test(SUB['requests.js']!) && /complete/i.test(SUB['requests.js']!),
  'the requests screen offers both decide and apply');
ok(/examcellApi\.decideHallTicketRequest/.test(SUB['requests.js']!),
  'deciding goes through its own call');
ok(/examcellApi\.completeHallTicketRequest/.test(SUB['requests.js']!),
  'applying goes through a DIFFERENT call');
ok(/status === 'REQUESTED'/.test(stripComments(SUB['requests.js']!)),
  'and a request that is not REQUESTED is not offered a decision');

// ═══ 9. The fixed defects stay fixed ══════════════════════════════════════
section('9. The fixed defects stay fixed');

// The old screen's picker called `examcellApi.exams()`, which does not exist
// on this API object — so the screen threw before its first render.
ok(!/examcellApi\.exams\s*\(/.test(shellSrc), 'the shell never calls examcellApi.exams()');
ok(/examcellApi\.hallTicketCatalogue\(\)/.test(uiSrc),
  'the picker builds its exam list from the catalogue instead');
ok(Array.isArray([...uiSrc.matchAll(/hallTicketCatalogue/g)]),
  'and the catalogue is the single source of exams');

// The picker must tolerate a catalogue whose `exams` is not an array — a shape
// change on the server would otherwise throw inside `useExamPicker`.
ok(/Array\.isArray\(res\?\.exams\)/.test(uiSrc),
  'the picker guards the shape of `exams` before reading it');

// Schemas must be strict: an unknown key is a typo, and a typo silently
// dropped is a validation that never ran.
{
  const hq = /hallTicketCatalogueQuerySchema[\s\S]{0,400}?\.strict\(\)/.test(schemasSrc);
  ok(hq, 'the catalogue query schema is .strict()');
  ok(/createHallTicketRequestSchema[\s\S]{0,900}?\.strict\(\)/.test(schemasSrc),
    'the create-request schema is .strict()');
  ok(/publishHallTicketsSchema[\s\S]{0,400}?\.strict\(\)/.test(schemasSrc),
    'the publish schema is .strict()');
}

// The router applies its OWN auth. A sibling router relying on someone else's
// `router.use(auth, ...)` is one reorder away from serving the whole prefix to
// anybody.
ok(/router\.use\(auth,\s*requireRole\('EXAMCELL',\s*'ADMIN'\)\)/.test(routesSrc),
  'the hall-ticket router applies its own auth');

// ═══ 10. Each sub-screen fetches only its own block ═══════════════════════
section('10. Each sub-screen fetches only its own block');

const BLOCK_FOR_SCREEN: Record<string, string> = {
  'eligibility.js': 'ELIGIBILITY',
  'generation.js': 'GENERATION',
  'tickets.js': 'TICKETS',
  'schedule.js': 'SCHEDULE',
  'centre.js': 'VENUE',
  'requests.js': 'REQUESTS',
  'publication.js': 'PUBLICATION',
};
for (const [file, block] of Object.entries(BLOCK_FOR_SCREEN)) {
  const src = SUB[file]!;
  ok(
    new RegExp(`examcellApi\\.hallTicketBlock\\('${block}'`).test(src),
    `${file} fetches its own block (${block})`,
  );
  ok(!/hallTicketOverview\(/.test(src), `${file} does not fetch the whole overview`);
}
// Two screens are INSTITUTION-WIDE on purpose and must not send an empty
// examId the server would reject; four are per-exam and own a picker. The
// split is asserted rather than left to chance, because a screen that renders
// an ExamPicker but never passes it would show a selection that does nothing.
for (const file of ['centre.js', 'requests.js', 'publication.js']) {
  ok(/hallTicketBlock\('[A-Z]+'\)/.test(SUB[file]!),
    `${file} calls its block with no examId (institution-wide)`);
  ok(!/useExamPicker\(\)/.test(SUB[file]!), `${file} owns no exam picker`);
}
for (const file of ['eligibility.js', 'generation.js', 'tickets.js', 'schedule.js']) {
  ok(/hallTicketBlock\('[A-Z]+', picker\.examId\)/.test(SUB[file]!),
    `${file} passes the chosen examId`);
  ok(/useExamPicker\(\)/.test(SUB[file]!), `${file} owns its own exam picker`);
}

// ═══ 11. The hub's own shape ══════════════════════════════════════════════
section('11. The hub renders the catalogue, not a hard-coded list');

ok(/catalogue\.data\?\.blocks\?\.length \? catalogue\.data\.blocks : BLOCKS/.test(hubSrc),
  'the block list comes from the server, with the mirror only as the first-frame fallback');
ok(!/const blocks = BLOCKS;/.test(hubSrc), 'the mirror is not also the source');
ok(/hallTicketCatalogue\(\)/.test(hubSrc), 'the hub fetches the catalogue');
ok(/hallTicketOverview\(\)/.test(hubSrc), 'and the overview');
ok(/badgeFor/.test(hubSrc), 'each block card carries the live number it exists to report');

// Every write path must RELOAD rather than patch local state, because a write
// can be refused and a patched row would show a change the server never
// accepted. `setData` is declared in `hallTicketUi.js`, so it is scanned too.
for (const [file, src] of Object.entries({ ...SUB, 'hall_tickets.js': hubSrc, 'hallTicketUi.js': uiSrc })) {
  const apiCalls = [...stripComments(src).matchAll(/examcellApi\.(generate|mark|create|decide|complete|set)\w*\(/g)];
  const patches = /setData\(\s*(\(\s*\w+\s*\)|\w+)\s*=>/.test(stripComments(src));
  ok(patches === false, `${file} never patches fetched data with a local update`);
  if (apiCalls.length > 0) {
    ok(/reload\(\)/.test(stripComments(src)), `${file} reloads from the server after a write`);
  }
}

// ═══ 12. What a printout needs is on the tickets screen ═══════════════════
//
// Requirements 3, 4, 5 and 6 all land on ONE screen: photo and details,
// subjects and schedule, centre, download. A controller standing at a printer
// with this screen open should not need another one.
section('12. The tickets screen renders everything a printout needs');

{
  const src = stripComments(SUB['tickets.js']!);
  ok(/PhotoTile/.test(src), 'the student photograph (or honest initials)');
  ok(/rollNo/.test(src), 'the roll number');
  ok(/seatNo|seat\b/.test(src), 'the seat number');
  ok(/dayLabel\(/.test(src), 'the paper date');
  ok(/startTime/.test(src), 'and its start and end time');
  ok(/centreMissing/.test(src), 'a centre that cannot be resolved is shown as unknown');
  ok(/markHallTicketDownloaded/.test(src), 'and the download/print step marks it');
  ok(/hasPhoto/.test(src), 'photo ABSENCE is reported, not hidden');
  // Grouped by student, because a student with three papers gets ONE sheet.
  ok(/students\.map/.test(src), 'tickets are grouped into one sheet per student');
  ok(/s\.papers\.map/.test(src), 'with every paper as a line on that sheet');
}

// ═════════════════════════════════════════════════════════════════════════
console.log('');
for (const f of failures) console.log(`  FAIL ${f}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
