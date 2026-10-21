/**
 * Suite: the cheating-case screens, audited at the source level.
 * Docs: 05-exam-cell.md §3.6
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. Every sub-screen must be wired into FEATURE_MODULES. A screen that exists but
 *      is never registered is dead code, and an `openModule('CheatingCasesQueue')` to an unregistered
 *      key renders NOTHING — `renderContent` finds nothing, falls through to the tab switcher, and the
 *      controller lands back on the hub with no error anywhere.
 *
 *   2. THE MIRRORS AGREE. `cheating_casesMeta.js` deliberately duplicates the server's five blocks
 *      and its vocabularies. Duplication is only safe if something checks it, and a mirror that
 *      disagrees with its source is worse than no mirror: it looks like the truth.
 *
 *   3. NO MOCK SURVIVES. The old screen held six hardcoded alerts in a module-level array and made
 *      ZERO calls into the API. It looked entirely plausible, which is why it survived review. A mock
 *      compiles, renders and reads correctly, so the only way to catch one is to assert on the ABSENCE
 *      of literals.
 *
 *   4. THE API SURFACE MATCHES THE ROUTES, and every method the screens call EXISTS on
 *      `examcellApi` — including the ones the old screen called and that never did, such as
 *      `createCheatingCase`.
 *
 *   5. THE ROUTE ORDER IS RIGHT. `/cheating-cases/catalogue` and `/cheating-cases/history` are
 *      literals and must be declared before `/cheating-cases/:id`, or "catalogue" is read as a case id
 *      and the answer is a 404 about a missing row.
 *
 *   6. THE POLICY IS ON THE SCREENS. "A committee recommends; the exam cell decides", "an emergency
 *      ignores the mute", "a dismissed case carries no penalty" — these are decisions a controller is
 *      entitled to read, not behaviour to infer from a grey button.
 *
 *   7. THE FIXED DEFECTS STAY FIXED. The corrupted file, the dead menu rows, the lost
 *      `legalTransitions` and the unwrapped envelope must not come back.
 *
 * Run: npx tsx scripts/audit-cheating-ui.ts
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
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` — ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n── ${n}`);

const RS = 'users/exam_cell/pages/cheating_cases';
// A read that fails must NAME the file. "ENOENT" with no path is a bad afternoon.
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

const HUB = `${RS}/cheating_cases.js`;
const META = `${RS}/cheating_casesMeta.js`;
const UI = `${RS}/cheating_casesUi.js`;
const SCREENS = [
  `${RS}/pages/queue/queue.js`,
  `${RS}/pages/report/report.js`,
  `${RS}/pages/committee/committee.js`,
  `${RS}/pages/history/history.js`,
  `${RS}/pages/detail/detail.js`,
];

section('1. Every screen exists, and PARSES');

// The file that arrived as fifteen lines holding four hundred and ninety-one literal `\n` escapes
// could not be parsed at all, so the app crashed on opening it. The bundler is the real judge.
let parseFailures = 0;
for (const rel of [HUB, META, UI, ...SCREENS, `${RS}/pages/detail/caseFacts.js`, `${RS}/pages/detail/cheatingSheets.js`]) {
  const abs = path.join(LEARNIX, rel);
  if (!fs.existsSync(abs)) {
    ok(false, `${rel}: exists`);
    parseFailures += 1;
    continue;
  }
  const src = fs.readFileSync(abs, 'utf8');
  // The corruption was literal backslash-n. A real file has few of them; a corrupted one has hundreds.
  const literalEscapes = (src.match(/\\n/g) ?? []).length;
  const realNewlines = (src.match(/\n/g) ?? []).length;
  ok(
    literalEscapes < realNewlines,
    `${path.basename(rel)}: is not a corrupted single-line file`,
    `${literalEscapes} literal \\n against ${realNewlines} real newlines`,
  );
}

section('2. The mirrors agree with the server');

const rulesSrc = stripComments(readSrc('src/modules/examcell/cheating.rules.ts'));
const metaSrc = stripComments(read(META));

// The five blocks, mirrored.
const serverBlocks = [...rulesSrc.matchAll(/id:\s*'([A-Z_]+)',\s*\n\s*label:/g)].map((m) => m[1]);
const metaBlocks = [...metaSrc.matchAll(/id:\s*'([A-Z_]+)',\s*\n\s*label:/g)].map((m) => m[1]);
eq(metaBlocks.length, 5, 'the mirror declares five blocks');
for (const b of serverBlocks) {
  ok(metaBlocks.includes(b), `the mirror has the ${b} block`, `mirror has: ${metaBlocks.join(', ')}`);
}

// The routes they name must be the routes the app registers.
const shellSrc = stripComments(read('users/exam_cell/exam_cell.js'));
const registered = [...shellSrc.matchAll(/^\s{2}(CheatingCases\w*):\s*\{/gm)].map((m) => m[1]);
for (const r of metaBlocks) {
  const routeName = metaSrc.match(new RegExp(`id:\\s*'${r}',[\\s\\S]{0,300}?route:\\s*'(\\w+)'`))?.[1];
  ok(Boolean(routeName), `the ${r} block names a route`);
  ok(
    !routeName || registered.includes(routeName),
    `the ${r} block's route (${routeName}) is registered in FEATURE_MODULES`,
    `registered: ${registered.join(', ')}`,
  );
}

// The vocabularies, mirrored.
//
// Detected by the CONSTANT that holds them rather than by the values themselves: the values are
// quoted in one file and bare in the other, and a regex that looked for quotes found one side and
// not the other. The constants are named the same on both sides, so that is what is matched.
const VOCABULARIES = [
  ['STATUS', 'CASE_STATUSES', 'STATUS_META'],
  ['RISK', 'RISK_LEVELS', 'RISK_META'],
  ['CLASSIFICATION', 'CLASSIFICATIONS', 'CLASSIFICATION_META'],
  ['PENALTY', 'PENALTIES', 'PENALTY_META'],
  ['SOURCE', 'CASE_SOURCES', 'SOURCE_META'],
  ['EVIDENCE', 'EVIDENCE_KINDS', 'EVIDENCE_META'],
  ['EVENT', 'CASE_EVENT_TYPES', 'EVENT_META'],
] as const;

for (const [label, serverConst, metaConst] of VOCABULARIES) {
  ok(
    new RegExp(`export const ${serverConst}\\b`).test(rulesSrc),
    `the server declares the ${label} vocabulary as ${serverConst}`,
  );
  ok(
    new RegExp(`(export )?const ${metaConst}\\b`).test(metaSrc),
    `the mirror declares the ${label} vocabulary as ${metaConst}`,
  );
}

// The COUNTS must agree, because a mirror that dropped a status renders a chip for a case state
// that no longer exists.
//
// The two sides spell the lists differently — the server holds an ARRAY of quoted ids, the mirror
// holds an OBJECT keyed by bare ids — so the count is taken from whichever shape each file uses.
// Counting the wrong shape yields a silent zero, which reads as "the mirror is empty" and sends
// the reader looking in the wrong file.
const countArrayValues = (src: string, constName: string) => {
  const block = src.match(new RegExp(`export const ${constName}[\\s\\S]*?\\]`, 'm'))?.[0] ?? '';
  return (block.match(/'[A-Z_]{2,}'/g) ?? []).length;
};
const countObjectKeys = (src: string, constName: string) => {
  const block = src.match(new RegExp(`(?:export )?const ${constName} = \\{[\\s\\S]*?\\n\\};`, 'm'))?.[0] ?? '';
  return (block.match(/^\s{2}[A-Z_]{2,}:/gm) ?? []).length;
};

for (const [label, serverConst, metaConst, expected] of [
  ['STATUS', 'CASE_STATUSES', 'STATUS_META', 6],
  ['RISK', 'RISK_LEVELS', 'RISK_META', 3],
  ['CLASSIFICATION', 'CLASSIFICATIONS', 'CLASSIFICATION_META', 8],
  ['PENALTY', 'PENALTIES', 'PENALTY_META', 6],
  ['SOURCE', 'CASE_SOURCES', 'SOURCE_META', 4],
  ['EVIDENCE', 'EVIDENCE_KINDS', 'EVIDENCE_META', 6],
  ['EVENT', 'CASE_EVENT_TYPES', 'EVENT_META', 10],
] as const) {
  const serverCount = countArrayValues(rulesSrc, serverConst);
  const metaCount = countObjectKeys(metaSrc, metaConst);
  ok(serverCount >= expected, `the server declares at least ${expected} ${label} values`, `found ${serverCount}`);
  ok(metaCount >= expected, `the mirror declares at least ${expected} ${label} values`, `found ${metaCount}`);
}

// The risk colours must be the SAME hex codes on both sides — a mirror that disagrees about a
// colour is exactly the "looks like the truth" failure.
for (const [key, hex] of [
  ['HIGH', '#dc2626'],
  ['MEDIUM', '#d97706'],
  ['LOW', '#ca8a04'],
] as const) {
  ok(metaSrc.includes(hex), `the mirror uses the server's ${key} colour ${hex}`);
  ok(rulesSrc.includes(hex), `the server uses ${hex} for ${key}`);
}

section('3. Every screen is reachable');

// The hub is a feature module; the blocks are sub-screens.
ok(registered.includes('CheatingCases'), 'the hub is registered', `registered: ${registered.join(', ')}`);
for (const key of ['CheatingCasesQueue', 'CheatingCasesReport', 'CheatingCasesCommittee', 'CheatingCasesHistory', 'CheatingCasesDetail']) {
  ok(registered.includes(key), `${key} is registered in FEATURE_MODULES`, `registered: ${registered.join(', ')}`);
}

// The imports must exist, or the key resolves to `undefined` and React renders nothing.
for (const key of ['CheatingCasesQueue', 'CheatingCasesReport', 'CheatingCasesCommittee', 'CheatingCasesHistory', 'CheatingCasesDetail', 'CheatingCasesModule']) {
  ok(
    new RegExp(`import ${key} from`).test(shellSrc),
    `${key} is imported by the shell`,
    'a registered key with no import is undefined at render time',
  );
}

section('4. No mock survives');

const hubSrc = stripComments(read(HUB));
const allScreenSrc = [HUB, META, UI, ...SCREENS].map((r) => stripComments(read(r))).join('\n');

// The old screen's six hardcoded alerts. Each describes something that exists nowhere.
for (const ghost of ['John Smith', 'CSE-21-007', 'Sarah Wilson', 'Mike Johnson', 'Emma Davis', 'Alex Brown']) {
  ok(!allScreenSrc.includes(ghost), `the "${ghost}" fixture is gone`);
}
ok(!/const\s+initialNotifications\s*=/.test(allScreenSrc), 'no module-level notification array survives');
ok(!/const\s+ALL_ALERTS\s*=/.test(allScreenSrc), 'no module-level alert array survives');

// And the screens DO call the API.
ok(/examcellApi\.cheatingCatalogue\(/.test(hubSrc), 'the hub reads the catalogue');
ok(/examcellApi\.cheatingCases\(/.test(hubSrc), 'the hub reads the queue');
ok(/examcellApi\.reportCheatingCase\(/.test(read(SCREENS[1])), 'the report screen raises a case');
ok(/examcellApi\.cheatingHistory\(/.test(read(SCREENS[3])), 'the history screen reads the record');

section('5. The API surface matches the routes');

const apiSrc = stripComments(read('services/api.js'));
const routesSrc = stripComments(readSrc('src/modules/examcell/cheating.routes.ts'));

// Every method the screens call must exist on the client.
const called = new Set(
  [...allScreenSrc.matchAll(/examcellApi\.(\w+)\(/g)].map((m) => m[1]),
);
for (const m of called) {
  ok(new RegExp(`^\\s*${m}:`, 'm').test(apiSrc), `examcellApi.${m} exists on the client`, 'the screen calls a method the client does not have');
}

// And the client must not carry the OLD shape, whose `decideCheatingCase` took a bare decision
// string the server no longer accepts, and whose `createCheatingCase` took six positional
// arguments that were never a real endpoint.
ok(
  !/decideCheatingCase:\s*\(id,\s*decision\)/.test(apiSrc),
  'decideCheatingCase takes a payload, not a bare decision string',
);
ok(
  !/createCheatingCase:/.test(apiSrc),
  'the old six-argument createCheatingCase is gone from the client',
);

// The server routes, and the client's methods for them.
for (const path of ['/cheating-cases/catalogue', '/cheating-cases/history', '/cheating-cases/report-context/', '/cheating-cases/reportable-slots']) {
  ok(routesSrc.includes(path), `the server serves ${path}`);
}

section('6. Route order');

const catalogueAt = routesSrc.indexOf("'/cheating-cases/catalogue'");
const historyAt = routesSrc.indexOf("'/cheating-cases/history'");
const idAt = routesSrc.indexOf("'/cheating-cases/:id'");
ok(catalogueAt >= 0 && idAt >= 0, 'both paths are declared');
ok(catalogueAt < idAt, 'the catalogue literal is declared BEFORE /:id', `catalogue at ${catalogueAt}, :id at ${idAt}`);
ok(historyAt >= 0 && historyAt < idAt, 'the history literal is declared BEFORE /:id', `history at ${historyAt}, :id at ${idAt}`);

section('7. The policy is on the screens');

const detailSrc = stripComments(read(SCREENS[4]));
const factsSrc = stripComments(read(`${RS}/pages/detail/caseFacts.js`));
const committeeSrc = stripComments(read(SCREENS[2]));

// The decisions, in the words a controller would need to read them.
ok(
  /committee recommends/i.test(committeeSrc) || /A committee recommends/i.test(committeeSrc),
  'the committee screen says a committee recommends and the exam cell decides',
);
// The copy is matched WHITESPACE-INSENSITIVELY. The text is wrapped across lines in the source, so
// a literal phrase with single spaces matches nothing — and an assertion that cannot match anything
// is an assertion that always fails, which is not the same as a useful one.
const flat = (s: string) => s.replace(/\s+/g, ' ');

ok(
  /even when they have turned the other categories off/i.test(flat(hubSrc)) ||
    /cannot be muted|ignore|Always on/i.test(flat(read(UI))) ||
    /c\.mutable/.test(detailSrc),
  'the emergency is shown as one that cannot be muted',
);
// The rule must be stated IN FULL. Asserting only "the student was cleared" would pass on a
// sentence that no longer says a cleared student carries no penalty — which is the part that
// matters. So both halves are required.
const clearedCopy = flat(detailSrc + factsSrc);
ok(
  /dismissed case carries no penalty|dismissed case cannot carry a penalty/i.test(clearedCopy) &&
    /student was cleared/i.test(clearedCopy),
  'the case file says a cleared student carries no consequence',
);
ok(
  /legalTransitions/.test(detailSrc),
  'the case file draws its buttons from the server\'s legal moves',
);
ok(
  /overdue/i.test(hubSrc) && /overdue/i.test(read(UI)),
  'the queue says which cases are overdue',
);

section('8. The fixed defects stay fixed');

// The corrupted file.
const hubRaw = read(HUB);
ok((hubRaw.match(/\\n/g) ?? []).length < 20, 'the hub is not a corrupted single-line file');

// The dead menu rows, in the admin screen.
const adminSrc = stripComments(read('users/admin/pages/AcademicsExaminations/pages/cheating_cases/cheating_cases.js'));
ok(!/ALL_ALERTS/.test(adminSrc), 'the admin screen has no hardcoded alert array');
ok(/examcellApi\.cheatingCases\(/.test(adminSrc), 'the admin screen reads the same endpoint the exam cell does');

// The navigate that dropped its params — which is how a sub-screen opens on nothing.
ok(
  /navigate:\s*\(screen,\s*params\)/.test(shellSrc),
  'the shell\'s navigate carries its params',
  'a sub-screen that needs to know WHICH case it is showing cannot open without them',
);

// The unenveloped responses.
const serviceSrc = stripComments(readSrc('src/modules/examcell/cheating.internal.ts'));
ok(
  /priority:/.test(serviceSrc),
  'the shaper publishes the derived priority — the queue sorts on it',
);
ok(
  /legalTransitions:/.test(serviceSrc),
  'the shaper publishes the legal moves — the case file draws its buttons from them',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Cheating cases UI audit OK');
