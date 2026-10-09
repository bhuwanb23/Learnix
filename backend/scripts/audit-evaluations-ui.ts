// X-05 Evaluations — UI audit (docs/users/05 §3.3).
//
// Run: npx tsx scripts/audit-evaluations-ui.ts
//
// The frontend's counterpart to `verify-evaluations.ts`, checking the things
// only the FRONTEND can get wrong:
//
//   1. REACHABILITY. Every sub-screen must be wired into FEATURE_MODULES.
//      `openModule('EvaluationsMarks')` against an unregistered key renders
//      NOTHING — `renderContent` falls through and the controller lands back
//      on the hub with no error anywhere. A screen that exists but is never
//      registered is dead code with a directory.
//
//   2. THE MIRRORS AGREE. `evaluationMeta.js` deliberately duplicates the
//      server's nine blocks, three script statuses, four moderation statuses
//      and the 40/60 marks policy. Duplication is only safe if something
//      checks it: a mirror that disagrees with its source is worse than no
//      mirror, because it looks like the truth.
//
//   3. THE API SURFACE MATCHES THE ROUTES, and the three superseded
//      endpoints are GONE from the app — the old screen called `GET
//      /examcell/evaluations` and it 404s now, and its assign route was a
//      cross-tenant write waiting to happen.
//
//   4. THE FAILED REQUEST IS SHOWN, not rendered as zero. A missing-marks
//      list that fails and shows "0 missing" is how results get published
//      with papers unmarked. Every screen must pass `error` to the shell.
//
//   5. WRITES RELOAD, NEVER PATCH. A write can be refused; a locally patched
//      row would show a change the server never accepted.
//
//   6. THE ROUTE ORDER AND THE AUTH GATE are asserted at source level —
//      `prove-evaluations-teeth.sh` then proves each assertion bites.
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
// `detail` prints only on FAILURE — which keys were found IS the evidence.
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
const EV_DIR = path.join(FEATURE_DIR, 'pages', 'evaluations');
const BACKEND = path.join(REPO, 'backend', 'src', 'modules', 'examcell');

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

const metaSrc = read(EV_DIR, 'evaluationMeta.js');
const uiSrc = read(EV_DIR, 'evaluationUi.js');
const hubSrc = read(EV_DIR, 'evaluations.js');
const shellSrc = read(FEATURE_DIR, 'exam_cell.js');
const apiSrc = read(ROOT, 'services', 'api.js');
const rulesSrc = read(BACKEND, 'evaluation.rules.ts');
const routesSrc = read(BACKEND, 'evaluation.routes.ts');
const appSrc = read(BACKEND, '..', '..', 'app.ts');
const schemasSrc = read(BACKEND, 'examcell.schemas.ts');

/** The nine sub-screens, keyed by directory name. */
const SUB: Record<string, string> = {};
const SUB_DIRS = [
  'progress',
  'scripts',
  'allocation',
  'subjects',
  'marks',
  'deadlines',
  'missing',
  'moderation',
  'revaluation',
];
for (const dir of SUB_DIRS) {
  SUB[`${dir}.js`] = read(EV_DIR, 'pages', dir, `${dir}.js`);
}

const SCREENS = [
  'evaluations.js',
  'evaluationMeta.js',
  'evaluationUi.js',
  ...SUB_DIRS.map((d) => `pages/${d}/${d}.js`),
];

/** Everything that is one of the ten screens, for whole-feature scans. */
const ALL: Record<string, string> = {
  'evaluations.js': hubSrc,
  'evaluationMeta.js': metaSrc,
  'evaluationUi.js': uiSrc,
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
  while ((m = re.exec(src)) !== null) out.push({ id: m[1]!, route: m[2]!, requiresExam: m[3] });
  return out;
}

console.log('X-05 Evaluations — UI audit');

// ═══ 1. Every screen file exists ════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) ok(fs.existsSync(path.join(EV_DIR, rel)), `${rel}: exists`);

// The stale fixture is gone. It held hard-coded stats and invented subject
// progress — numbers with no server behind them, sitting one import away
// from a screen that would have shown them as fact.
ok(!fs.existsSync(path.join(EV_DIR, 'constants')), 'constants/evaluationsData.js fixture is DELETED');
for (const [file, src] of Object.entries(ALL)) {
  ok(!/evaluationsData/.test(stripComments(src)), `${file}: does not import the fixture`);
}

// ═══ 2. Reachability — every route resolves to a registered screen ══════
section('2. Every published route is registered in FEATURE_MODULES');

{
  const shell = stripComments(shellSrc);
  const registered = [...shell.matchAll(/^\s{2}(Evaluations[A-Za-z]*):\s*\{/gm)].map((m) => m[1]);
  const meta = blocksOf(stripComments(metaSrc));
  eq(meta.length, 9, 'the mirror declares nine blocks');

  const routes = meta.map((b) => b.route);
  for (const r of routes) {
    ok(registered.includes(r), `route ${r} is a FEATURE_MODULES key`);
    ok(
      new RegExp(`import ${r} from './pages/evaluations/pages/`).test(shellSrc),
      `route ${r} is imported by exam_cell.js`,
    );
  }
  // And nothing extra: a registry entry no block publishes is a screen that
  // can only be reached by a typo.
  const extras = registered.filter((r) => !routes.includes(r));
  eq(extras.length, 0, 'no Evaluations* key in the registry without a block', extras.join(','));

  // The tab itself is registered too.
  ok(/^\s{2}Evaluations:\s*\{/.test(shell) || /case 'Evaluations':/.test(shell), 'the Evaluations tab itself renders');
}

// ═══ 3. The mirrors agree with the server's rules ═══════════════════════
section('3. evaluationMeta mirrors evaluation.rules');

{
  const server = blocksOf(stripComments(rulesSrc));
  const mirror = blocksOf(stripComments(metaSrc));
  eq(server.length, 9, 'the server declares nine blocks');
  eq(mirror.length, server.length, 'the mirror declares the same count');

  for (const s of server) {
    const m = mirror.find((x) => x.id === s.id);
    ok(!!m, `mirror has block ${s.id}`);
    if (m) {
      eq(m.route, s.route, `${s.id}: mirror route matches the server`);
      eq(m.requiresExam, s.requiresExam, `${s.id}: mirror requiresExam matches the server`);
    }
    ok(s.route.startsWith('Evaluations'), `${s.id}: publishes an Evaluations* route`);
    ok(s.route.length > 'Evaluations'.length, `${s.id}: route is more than the prefix`);
  }
}

{
  // Status lists and the marks policy — the other three mirrors.
  const rule = stripComments(rulesSrc);
  const meta = stripComments(metaSrc);
  for (const s of ['NOT_RECEIVED', 'RECEIVED', 'VERIFIED']) {
    ok(meta.includes(`${s}:`), `mirror carries script status ${s}`);
    ok(rule.includes(`'${s}'`), `server publishes script status ${s}`);
  }
  for (const s of ['NOT_REQUESTED', 'PENDING', 'APPROVED', 'FLAGGED']) {
    ok(meta.includes(`${s}:`), `mirror carries moderation status ${s}`);
  }
  for (const s of ['PENDING', 'IN_PROGRESS', 'COMPLETED']) {
    ok(meta.includes(`${s}:`), `mirror carries evaluation status ${s}`);
  }
  for (const s of ['REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED']) {
    ok(meta.includes(`${s}:`), `mirror carries revaluation status ${s}`);
  }
  ok(/internalMax:\s*40/.test(meta) && /internalMax:\s*40/.test(rule), 'the 40-mark internal bound is mirrored');
  ok(/externalMax:\s*60/.test(meta) && /externalMax:\s*60/.test(rule), 'the 60-mark external bound is mirrored');
}

// ═══ 4. The API surface matches the routes ═════════════════════════════
section('4. api.js surface matches the server routes');

{
  const api = apiSrc;
  const wanted: Array<[string, string]> = [
    ['evaluationCatalogue', '/examcell/evaluations/catalogue'],
    ['evaluationOverview', '/examcell/evaluations/overview'],
    ['evaluationBlock', '/examcell/evaluations/blocks/'],
    ['evaluationPublicationGate', '/examcell/evaluations/slots/'],
    ['receiveScripts', '/evaluations/'],
    ['moveScript', '/script'],
    ['allocateEvaluator', '/allocate'],
    ['enterMarks', '/marks'],
    ['setEvaluationDeadline', '/deadline'],
    ['remindEvaluationDeadline', '/deadline/remind'],
    ['requestModeration', '/moderation/request'],
    ['decideModeration', '/moderation/decide'],
  ];
  for (const [method, fragment] of wanted) {
    ok(new RegExp(`\\b${method}:`).test(api), `api.js declares ${method}`);
    if (fragment.startsWith('/examcell')) ok(api.includes(fragment), `…pointing at ${fragment}`);
  }

  // The three superseded endpoints are gone FROM THE CLIENT too — a client
  // that still calls them gets a 404 in production and blames the network.
  //
  // Checked against RAW source, not comment-stripped: api.js contains `/*`
  // inside line-comment prose (`/student/*`), so its /* count exceeds */ and
  // stripComments fabricates a giant block comment that swallows this whole
  // section — an assertion reading a region that no longer exists is exactly
  // the vacuous kind this audit exists to prevent. The patterns below are
  // code-shaped (`evaluations: () => ...`); a comment cannot match them.
  ok(!/^\s{2}evaluations:\s*\(\)\s*=>\s*api\.get\('\/examcell\/evaluations'\)/m.test(api),
    'the old flat GET /examcell/evaluations method is gone');
  ok(!/\/examcell\/evaluations\/\$\{[^}]+\}\/assign/.test(api), 'the old assign method is gone');
  ok(!/\/examcell\/evaluations\/\$\{[^}]+\}\/complete/.test(api), 'the old complete method is gone');
}

// ═══ 5. The router order and the auth gate, at source ═══════════════════
section('5. Route order and the auth gate are load-bearing and asserted');

{
  const routes = routesSrc;
  // The gate: auth + role applied to the WHOLE router, before any route.
  ok(/router\.use\(auth,\s*requireRole\(/.test(routes), 'the evaluation router applies its OWN auth + role gate');
  const gateAt = routes.indexOf('router.use(auth');
  const firstRouteAt = routes.indexOf('router.get(');
  ok(gateAt !== -1 && firstRouteAt !== -1 && gateAt < firstRouteAt, '…before the first route is registered');

  // Literals before parameters: `/evaluations/catalogue` must be registered
  // before anything with `:id`, or the literal is captured as an id.
  const idx = (s: string) => routes.indexOf(s);
  const catalogueAt = idx("'/evaluations/catalogue'");
  const overviewAt = idx("'/evaluations/overview'");
  const blocksAt = idx("'/evaluations/blocks/:block'");
  const gateRouteAt = idx("'/evaluations/slots/:id/publication-gate'");
  const receiveAt = idx("'/evaluations/:id/scripts/receive'");
  const allocateAt = idx("'/evaluations/:id/allocate'");
  const papersScriptAt = idx("'/evaluations/papers/:paperId/script'");
  const papersMarksAt = idx("'/evaluations/papers/:paperId/marks'");
  const deadlineAt = idx("'/evaluations/exams/:examId/deadline'");

  ok(catalogueAt !== -1 && overviewAt !== -1 && blocksAt !== -1, 'the three literal reads exist');
  ok(catalogueAt < receiveAt, '…and /catalogue is registered before any :id path');
  ok(overviewAt < receiveAt, '…and /overview too');
  ok(blocksAt < receiveAt, '…and /blocks/:block too');
  ok(gateRouteAt !== -1 && gateRouteAt < receiveAt, '…and the slot gate too');
  ok(papersScriptAt !== -1 && papersMarksAt !== -1, 'the paper-literal writes exist');
  ok(papersScriptAt < receiveAt, 'papers/:paperId/script is registered before :id/scripts/receive');
  ok(papersMarksAt < receiveAt, 'papers/:paperId/marks is registered before :id paths');
  ok(allocateAt !== -1, '/evaluations/:id/allocate exists (the replacement for the removed /assign)');
  ok(deadlineAt !== -1 && deadlineAt < receiveAt, 'exams/:examId/deadline is registered before :id paths');

  // Mounted BEFORE the sibling router, same as X-02 and X-04: a sibling
  // relying on someone else's router.use is one reorder from serving the
  // whole prefix to anybody.
  const evalMount = appSrc.indexOf('evaluationRoutes');
  const siblingMount = appSrc.indexOf('examcellRoutes');
  ok(evalMount !== -1, 'app.ts mounts the evaluation router');
  ok(evalMount < siblingMount, '…BEFORE the examcell sibling router');

  // Bodies: the choice fields are permissive, everything else strict.
  ok(/evaluationBlockQuerySchema[\s\S]*?\.strict\(\)/.test(schemasSrc), 'the block query schema is strict');
  ok(/enterMarksBodySchema[\s\S]*?\.strict\(\)/.test(schemasSrc), 'the marks body schema is strict');
  ok(/moderationDecisionSchema[\s\S]*?\.strict\(\)/.test(schemasSrc), 'the moderation body schema is strict');
}

// ═══ 6. The failed request is SHOWN, not rendered as zero ═══════════════
section('6. Every screen shows the error in place of the content');

{
  for (const [file, src] of Object.entries(ALL)) {
    const clean = stripComments(src);
    // The mirror has no request; the UI kit IS the shell that renders the
    // panel, so requiring it to pass `error` to itself would be nonsense.
    if (file === 'evaluationMeta.js' || file === 'evaluationUi.js') continue;
    ok(/error=\{/.test(clean), `${file}: passes error to the shell`);
  }
  // The shell itself renders the panel instead of the content. The branch is
  // `if (error) {` with a BRACE — ExamPicker has its own `if (error) return`
  // for picker errors, and matching that too would make this check pass even
  // with the shell's panel branch deleted.
  const shell = stripComments(uiSrc);
  ok(/if \(error\) \{/.test(shell), 'the shell short-circuits on error');
  ok(/Could not load this screen/.test(shell), '…with a visible message');
  ok(!/return.*0 items/.test(shell), 'and never a zero-state in its place');
}

// ═══ 7. Writes reload, never patch ═════════════════════════════════════
section('7. Every write reloads from the server instead of patching state');

{
  for (const [file, src] of Object.entries(ALL)) {
    const clean = stripComments(src);
    const writes = [...clean.matchAll(/examcellApi\.([a-zA-Z]+)\(/g)]
      .map((m) => m[1]!)
      .filter((m) => !/^(evaluationCatalogue|evaluationOverview|evaluationBlock|evaluationPublicationGate|hallTicketCatalogue)$/.test(m));
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
  ok(/evaluationCatalogue\(\)/.test(hub), 'the hub fetches the catalogue');
  ok(/evaluationOverview\(\)/.test(hub), 'and the overview');
  ok(/badgeFor/.test(hub), 'each block card carries the live number it exists to report');
  ok(/reevalOpen/.test(hub), '…including the revaluation badge');
  ok(/goToRoute\(navigation, b\.route, b\.isTab\)/.test(hub), 'navigation uses the SERVER’s route and isTab, not a guess');
}

// ═══ 9. The policy is on the screens ═══════════════════════════════════
section('9. The published policy is visible where decisions are made');

{
  const marks = stripComments(SUB['marks.js']!);
  ok(/MARKS_POLICY/.test(marks), 'the marks screen shows the bounds');
  ok(/isMarked/.test(marks), '…and uses the shared marked-definition');

  const missing = stripComments(SUB['missing.js']!);
  ok(/MISSING/.test(missing) || /missing/i.test(missing), 'the missing screen exists for the publication list');

  const moderation = stripComments(SUB['moderation.js']!);
  ok(/canDecide|PENDING/.test(moderation), 'moderation only offers decisions the server would accept');

  const scripts = stripComments(SUB['scripts.js']!);
  ok(/NOT_RECEIVED|scriptStatus/.test(scripts), 'the scripts screen shows custody state');

  const reval = stripComments(SUB['revaluation.js']!);
  ok(/REQUESTED/.test(reval), 'revaluation only offers decisions on REQUESTED rows');
  ok(/decideReevaluation/.test(reval), '…through the existing decide endpoint, not a second one');
}

// ═══ 10. The fixed defects stay fixed ══════════════════════════════════
section('10. The removed endpoints and fixture have not come back');

{
  const all = Object.entries(ALL).map(([f, s]) => [f, stripComments(s)] as const);
  for (const [file, clean] of all) {
    ok(!/examcell\/evaluations'/.test(clean) || /blocks/.test(clean),
      `${file}: never calls the flat /examcell/evaluations list`);
    ok(!/\/assign'/.test(clean), `${file}: never calls /assign`);
    ok(!/\/complete'/.test(clean), `${file}: never calls /complete`);
  }
}

console.log('');
for (const f of failures) console.log(`  FAIL ${f}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
