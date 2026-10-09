// X-06 Results — UI audit (docs/users/05 §3.4).
//
// Run: npx tsx scripts/audit-results-ui.ts
//
// The frontend's counterpart to `verify-results.ts`, checking the things
// only the FRONTEND can get wrong:
//
//   1. REACHABILITY. Every sub-screen must be wired into FEATURE_MODULES.
//      `openModule('ResultsGrades')` against an unregistered key renders
//      NOTHING — `renderContent` falls through and the controller lands back
//      on the hub with no error anywhere. A screen that exists but is never
//      registered is dead code with a directory.
//
//   2. THE MIRRORS AGREE. `resultsMeta.js` deliberately duplicates the
//      server's eleven blocks, four workflow statuses and the grade scale.
//      Duplication is only safe if something checks it: a mirror that
//      disagrees with its source is worse than no mirror, because it looks
//      like the truth.
//
//   3. THE API SURFACE MATCHES THE ROUTES, and the three superseded
//      endpoints are GONE from the app — the old screen called `GET
//      /examcell/results` and its `enterResult` handed the grade to the
//      client, which is the exact defect this feature exists to remove.
//
//   4. THE FAILED REQUEST IS SHOWN, not rendered as zero. A verification
//      queue that fails and shows "0 rows" lets a controller approve
//      nothing forever. Every screen must pass `error` to the shell.
//
//   5. WRITES RELOAD, NEVER PATCH. A write can be refused (blockers,
//      mismatches); a locally patched row would show a change the server
//      never accepted.
//
//   6. THE ROUTE ORDER AND THE AUTH GATE are asserted at source level —
//      `prove-results-teeth.sh` then proves each assertion bites.
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
/** `detail` prints only on FAILURE — which keys were found IS the evidence. */
function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` — ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n── ${n}`);

const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = path.join(REPO, 'learnix');
const FEATURE_DIR = path.join(ROOT, 'users', 'exam_cell');
const RS_DIR = path.join(FEATURE_DIR, 'pages', 'results');
const BACKEND = path.join(REPO, 'backend', 'src', 'modules', 'examcell');

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

const metaSrc = read(RS_DIR, 'resultsMeta.js');
const uiSrc = read(RS_DIR, 'resultsUi.js');
const hubSrc = read(RS_DIR, 'results.js');
const shellSrc = read(FEATURE_DIR, 'exam_cell.js');
const apiSrc = read(ROOT, 'services', 'api.js');
const rulesSrc = read(BACKEND, 'result.rules.ts');
const routesSrc = read(BACKEND, 'result.routes.ts');
const appSrc = read(BACKEND, '..', '..', 'app.ts');
const schemasSrc = read(BACKEND, 'examcell.schemas.ts');

/** The eleven sub-screens, keyed by directory name. */
const SUB: Record<string, string> = {};
const SUB_DIRS = [
  'consolidate',
  'grades',
  'cgpa',
  'passfail',
  'verify',
  'approval',
  'publish',
  'marksheet',
  'revaluation',
  'analytics',
  'export',
];
for (const dir of SUB_DIRS) {
  SUB[`${dir}.js`] = read(RS_DIR, 'pages', dir, `${dir}.js`);
}

const SCREENS = [
  'results.js',
  'resultsMeta.js',
  'resultsUi.js',
  ...SUB_DIRS.map((d) => `pages/${d}/${d}.js`),
];

/** Everything that is one of the fourteen screens, for whole-feature scans. */
const ALL: Record<string, string> = {
  'results.js': hubSrc,
  'resultsMeta.js': metaSrc,
  'resultsUi.js': uiSrc,
  ...SUB,
};

/** Comment-stripped source, so an assertion cannot pass on prose. */
function stripComments(src: string) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** The block ids and routes each source declares, for mirror comparisons. */
function blocksOf(src: string): Array<{ id: string; route: string; requiresExam?: string }> {
  const out: Array<{ id: string; route: string; requiresExam?: string }> = [];
  const re = /id:\s*'([A-Z_]+)'[\s\S]*?route:\s*'([A-Za-z]+)'[\s\S]*?requiresExam:\s*(true|false)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.push({ id: m[1]!, route: m[2]!, requiresExam: m[3]! });
  return out;
}

console.log('X-06 Results — UI audit');

// ═══ 1. Every screen file exists ════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) ok(fs.existsSync(path.join(RS_DIR, rel)), `${rel}: exists`);

// The stale fixture is gone. It held hard-coded stats and invented
// revaluation rows — numbers with no server behind them, sitting one import
// away from a screen that would have shown them as fact.
ok(!fs.existsSync(path.join(RS_DIR, 'constants')), 'constants/resultsData.js fixture is DELETED');
for (const [file, src] of Object.entries(ALL)) {
  ok(!/resultsData/.test(stripComments(src)), `${file}: does not import the fixture`);
}

// ═══ 2. Reachability — every route resolves to a registered screen ══════
section('2. Every published route is registered in FEATURE_MODULES');

{
  const shell = stripComments(shellSrc);
  const registered = [...shell.matchAll(/^\s{2}(Results[A-Za-z]*):\s*\{/gm)].map((m) => m[1]!);
  const meta = blocksOf(stripComments(metaSrc));
  eq(meta.length, 11, 'the mirror declares eleven blocks');

  const routes = meta.map((b) => b.route);
  for (const r of routes) {
    ok(registered.includes(r), `route ${r} is a FEATURE_MODULES key`);
    ok(
      new RegExp(`import ${r} from './pages/results/pages/`).test(shellSrc),
      `route ${r} is imported by exam_cell.js`,
    );
  }
  // And nothing extra: a registry entry no block publishes is a screen that
  // can only be reached by a typo.
  const extras = registered.filter((r) => !routes.includes(r));
  eq(extras.length, 0, 'no Results* key in the registry without a block', extras.join(','));

  // The tab itself is registered too.
  ok(/case 'Results':/.test(shell), 'the Results tab itself renders');
}

// ═══ 3. The mirrors agree with the server's rules ═══════════════════════
section('3. resultsMeta mirrors result.rules');

{
  const server = blocksOf(stripComments(rulesSrc));
  const mirror = blocksOf(stripComments(metaSrc));
  eq(server.length, 11, 'the server declares eleven blocks');
  eq(mirror.length, server.length, 'the mirror declares the same count');

  for (const s of server) {
    const m = mirror.find((x) => x.id === s.id);
    ok(!!m, `mirror has block ${s.id}`);
    if (m) {
      eq(m.route, s.route, `${s.id}: mirror route matches the server`);
      eq(m.requiresExam, s.requiresExam, `${s.id}: mirror requiresExam matches the server`);
    }
    ok(s.route.startsWith('Results'), `${s.id}: publishes a Results* route`);
    ok(s.route.length > 'Results'.length, `${s.id}: route is more than the prefix`);
  }
}

{
  // Status lists and the grade scale — the other mirrors.
  const rule = stripComments(rulesSrc);
  const meta = stripComments(metaSrc);
  for (const s of ['DRAFT', 'VERIFIED', 'APPROVED', 'PUBLISHED']) {
    ok(meta.includes(`${s}:`), `mirror carries result status ${s}`);
    ok(rule.includes(`'${s}'`), `server publishes result status ${s}`);
  }
  for (const s of ['REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED']) {
    ok(meta.includes(`${s}:`), `mirror carries revaluation status ${s}`);
  }
  // The grade scale: same seven bands, same mins, in both files. This is the
  // number a client would otherwise re-decide for itself.
  for (const band of [
    { min: 90, grade: 'O' },
    { min: 80, grade: 'A+' },
    { min: 40, grade: 'C' },
    { min: 0, grade: 'F' },
  ]) {
    ok(
      new RegExp(`min:\\s*${band.min}[\\s\\S]{0,40}grade:\\s*'${band.grade.replace('+', '\\+')}'`).test(meta),
      `mirror carries band ${band.grade} at ${band.min}%`,
    );
    ok(
      new RegExp(`min:\\s*${band.min}[\\s\\S]{0,40}grade:\\s*'${band.grade.replace('+', '\\+')}'`).test(rule),
      `server publishes band ${band.grade} at ${band.min}%`,
    );
  }
  ok(/PASS_PERCENT\s*=\s*40/.test(meta) && /PASS_PERCENT\s*=\s*40/.test(rule), 'the 40% pass threshold is mirrored');
}

// ═══ 4. The API surface matches the routes ═════════════════════════════
section('4. api.js surface matches the server routes');

{
  const api = apiSrc;
  const wanted: Array<[string, string]> = [
    ['resultCatalogue', '/examcell/results/catalogue'],
    ['resultOverview', '/examcell/results/overview'],
    ['resultBlock', '/examcell/results/blocks/'],
    ['resultMarksheet', '/examcell/results/marksheets/'],
    ['resultExport', '/examcell/results/export'],
    ['consolidateResults', '/consolidate'],
    ['verifyResults', '/verify'],
    ['approveResults', '/approve'],
    ['publishResults', '/publish'],
    ['decideReevaluation', '/re-evaluations/'],
  ];
  for (const [method, fragment] of wanted) {
    ok(new RegExp(`\\b${method}:`).test(api), `api.js declares ${method}`);
    ok(api.includes(fragment), `…pointing at ${fragment}`);
  }

  // The three superseded endpoints are gone FROM THE CLIENT too — a client
  // that still calls them gets a 404 in production and blames the network.
  //
  // Checked against RAW source, not comment-stripped: api.js contains `/*`
  // inside line-comment prose, so stripComments can fabricate a giant block
  // comment that swallows this section. The patterns below are code-shaped;
  // a comment cannot match them.
  // Scoped to /examcell: `studentApi.results` (`GET /student/results`) is a
  // different feature's read and matching it here would cry wolf on a
  // healthy line — a check that fails on correct code gets ignored.
  ok(!/^\s{2}results:\s*\(\)\s*=>\s*api\.get\('\/examcell\/results'/m.test(api),
    'the old flat GET /examcell/results method is gone');
  ok(!/enterResult/.test(api) || !/api\.post\('\//.test(api.split('enterResult')[0]?.slice(-80) ?? ''),
    'the old enterResult method (client-supplied grade) is gone');
  ok(!/results\/publish',\s*\{\s*examSlotId/.test(api),
    'the old publish-by-slotId-with-no-gate method is gone');
}

// ═══ 5. The router order and the auth gate, at source ═══════════════════
section('5. Route order and the auth gate are load-bearing and asserted');

{
  const routes = routesSrc;
  // The gate: auth + role applied to the WHOLE router, before any route.
  ok(/router\.use\(auth,\s*requireRole\(/.test(routes), 'the results router applies its OWN auth + role gate');
  const gateAt = routes.indexOf('router.use(auth');
  const firstRouteAt = routes.indexOf('router.get(');
  ok(gateAt !== -1 && firstRouteAt !== -1 && gateAt < firstRouteAt, '…before the first route is registered');

  // Literals before parameters: `/results/catalogue` must be registered
  // before anything with `:slotId`, or the literal is captured as an id.
  const idx = (s: string) => routes.indexOf(s);
  const catalogueAt = idx("'/results/catalogue'");
  const overviewAt = idx("'/results/overview'");
  const blocksAt = idx("'/results/blocks/:block'");
  const marksheetAt = idx("'/results/marksheets/:studentProfileId'");
  const exportAt = idx("'/results/export'");
  const slotWriteAt = idx("'/results/slots/:slotId/consolidate'");
  const decideAt = idx("'/re-evaluations/:id/decide'");

  ok(catalogueAt !== -1 && overviewAt !== -1 && blocksAt !== -1, 'the three literal reads exist');
  ok(catalogueAt < slotWriteAt, '…and /catalogue is registered before any :slotId path');
  ok(overviewAt < slotWriteAt, '…and /overview too');
  ok(blocksAt < slotWriteAt, '…and /blocks/:block too');
  ok(marksheetAt !== -1 && marksheetAt < slotWriteAt, '…and the marksheet read too');
  ok(exportAt !== -1 && exportAt < slotWriteAt, '…and /export too');
  ok(decideAt !== -1, 'the re-evaluation decide route moved HERE from examcellRoutes');

  // The four workflow writes take no body — the row's status is the
  // authority — and the empty-body schema is strict, so a typo'd field on a
  // parameterless POST is a 400 rather than a silently ignored field.
  for (const op of ['consolidate', 'verify', 'approve', 'publish']) {
    ok(routes.includes(`/results/slots/:slotId/${op}`), `the ${op} write exists`);
  }
  ok(/emptyBodySchema[\s\S]*?\.strict\(\)/.test(schemasSrc), 'the empty body schema is strict');

  // Mounted BEFORE the sibling router, same as X-02/X-04/X-05: a sibling
  // relying on someone else's router.use is one reorder from serving the
  // whole prefix to anybody.
  const resMount = appSrc.indexOf('resultRoutes');
  const siblingMount = appSrc.indexOf('examcellRoutes');
  ok(resMount !== -1, 'app.ts mounts the results router');
  ok(resMount < siblingMount, '…BEFORE the examcell sibling router');

  // The superseded endpoints are GONE from the sibling at source level.
  const examcellRoutes = read(BACKEND, 'examcell.routes.ts');
  ok(!/enterResultSchema/.test(examcellRoutes), 'examcell.routes no longer imports enterResultSchema');
  ok(!/publishResultsSchema/.test(examcellRoutes), 'examcell.routes no longer imports publishResultsSchema');
  ok(!/decideRevalSchema/.test(examcellRoutes), 'examcell.routes no longer imports decideRevalSchema');
  const examcellService = read(BACKEND, 'examcell.service.ts');
  ok(!/export async function enterResult/.test(examcellService), 'examcell.service no longer defines enterResult');
  ok(!/export async function listResults/.test(examcellService), 'examcell.service no longer defines listResults');
  ok(!/export async function publishResults/.test(examcellService), 'examcell.service no longer defines publishResults');
  ok(!/export async function decideReevaluation/.test(examcellService), 'examcell.service no longer defines decideReevaluation');
}

// ═══ 6. The failed request is SHOWN, not rendered as zero ═══════════════
section('6. Every screen shows the error in place of the content');

{
  for (const [file, src] of Object.entries(ALL)) {
    const clean = stripComments(src);
    // The mirror has no request; the UI kit IS the shell that renders the
    // panel, so requiring it to pass `error` to itself would be nonsense.
    if (file === 'resultsMeta.js' || file === 'resultsUi.js') continue;
    ok(/error=\{/.test(clean), `${file}: passes error to the shell`);
  }
  // The shell itself renders the panel instead of the content. The branch is
  // `if (error) {` with a BRACE — ExamPicker has its own `if (error) return`
  // for picker errors, and matching that too would make this check pass even
  // with the shell's panel branch deleted.
  const shell = stripComments(uiSrc);
  ok(/if \(error\) \{/.test(shell), 'the shell short-circuits on error');
  ok(/Could not load this screen/.test(shell), '…with a visible message');
}

// ═══ 7. Writes reload, never patch ═════════════════════════════════════
section('7. Every write reloads from the server instead of patching state');

{
  for (const [file, src] of Object.entries(ALL)) {
    const clean = stripComments(src);
    const writes = [...clean.matchAll(/examcellApi\.([a-zA-Z]+)\(/g)]
      .map((m) => m[1]!)
      .filter((m) => !/^(resultCatalogue|resultOverview|resultBlock|resultMarksheet|resultExport)$/.test(m));
    if (writes.length === 0) continue;
    // Either an explicit `reload()` call, or `reload` handed to `useAction`
    // — which reloads after every mutation it runs.
    ok(/reload\(\)|useAction\(reload\)/.test(clean), `${file}: reloads after a write (${writes.join(', ')})`);
    ok(!/setData\(\s*\(/.test(clean), `${file}: never patches fetched data locally`);
  }
}

// ═══ 8. The hub derives, never hard-codes ══════════════════════════════
section('8. The hub renders the catalogue, not a hard-coded list');

{
  const hub = stripComments(hubSrc);
  ok(/catalogue\.data\?\.blocks\?\.length \? catalogue\.data\.blocks : BLOCKS/.test(hub),
    'the block list comes from the server, the mirror only as first-frame fallback');
  ok(!/const blocks = BLOCKS;/.test(hub), 'the mirror is not also the source');
  ok(/resultCatalogue\(\)/.test(hub), 'the hub fetches the catalogue');
  ok(/resultOverview\(\)/.test(hub), 'and the overview');
  ok(/badgeFor/.test(hub), 'each block card carries the live number it exists to report');
  ok(/reevalOpen/.test(hub), '…including the revaluation badge');
  ok(/goToRoute\(navigation, b\.route, b\.isTab\)/.test(hub), 'navigation uses the SERVER’s route and isTab, not a guess');
}

// ═══ 9. The policy is on the screens ═══════════════════════════════════
section('9. The published policy is visible where decisions are made');

{
  const grades = stripComments(SUB['grades.js']!);
  ok(/GRADE_SCALE/.test(grades), 'the grades screen shows the scale');
  ok(/drift/.test(grades), '…and flags rows whose stored grade disagrees with it');

  const consolidate = stripComments(SUB['consolidate.js']!);
  ok(!/TextInput/.test(consolidate), 'consolidation has no marks input — grades are derived, never typed');

  const verify = stripComments(SUB['verify.js']!);
  ok(/paperMarks/.test(verify), 'verification shows each row against its paper');
  ok(/mismatch/i.test(verify), '…and names what disagrees');

  const publish = stripComments(SUB['publish.js']!);
  ok(/blocker/.test(publish), 'publication shows the blockers, not a bare disabled button');

  const reval = stripComments(SUB['revaluation.js']!);
  ok(/allowed/.test(reval), 'revaluation drives its buttons from the SERVER’s allowed list');
  ok(/revisedMarks/.test(reval), '…and asks for the revised marks a COMPLETED decision requires');
  ok(/decideReevaluation/.test(reval), '…through the decide endpoint, not a second one');

  const exportScreen = stripComments(SUB['export.js']!);
  ok(/resultExport\(/.test(exportScreen), 'export downloads through the export endpoint');
  ok(/Share\.share|content/.test(exportScreen), '…and hands the content to the device, not an empty file');
}

// ═══ 10. The fixed defects stay fixed ══════════════════════════════════
section('10. The removed endpoints and fixture have not come back');

{
  for (const [file, src] of Object.entries(ALL)) {
    const clean = stripComments(src);
    ok(!/examcellApi\.results\(/.test(clean), `${file}: never calls the flat /examcell/results list`);
    ok(!/examcellApi\.enterResult\(/.test(clean), `${file}: never posts a client-supplied grade`);
    ok(!/publishResults\(\s*examSlotId|publishResults\(\s*slot\b/.test(clean) || /publishResults\(slot\.slotId\)/.test(clean),
      `${file}: publish goes through the gated endpoint`);
    ok(!/pendingPublish|reevalRequests/.test(clean), `${file}: never reads the old response shape`);
  }
  // The hub no longer imports the deleted methods at all.
  ok(!/examcellApi\.results\(\)/.test(stripComments(hubSrc)), 'the hub does not call the removed list endpoint');
}

console.log('');
for (const f of failures) console.log(`  FAIL ${f}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
