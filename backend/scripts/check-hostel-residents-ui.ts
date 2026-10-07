/**
 * Static checks for the Hostel residents frontend split.
 *
 * Runs without `npm install`, which this project cannot currently do (the Expo SDK and the
 * pinned React version disagree, so `npm install` fails on peer deps). Everything here is
 * therefore parse- and import-graph-level, not a render.
 *
 * WHAT IS ACTUALLY PROVEN HERE
 * -----------------------------
 *   1. Every new/changed file parses as JSX. A stray brace in a `StyleSheet` is invisible
 *      to grep and fatal at runtime.
 *   2. Every relative import resolves to a file that exists. After splitting one 515-line
 *      screen into six, a wrong `../../` depth is the single most likely mistake, and it
 *      fails only when the screen is opened.
 *   3. Every `hostelApi.*` call resolves to a key the API module actually exports. This is
 *      the check that catches the classic split-brain: a screen calling
 *      `hostelApi.residentHistory(...)` while `api.js` still only has `residentDetail`.
 *   4. No client-side `.filter()` over the resident list is left behind. Filtering moved to
 *      the server; a leftover client filter is the bug this change exists to fix, and it is
 *      easy to reintroduce by muscle memory.
 *   5. The old hardcoded block-colour map is gone. It silently rendered every block past
 *      the third in one fallback colour.
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
  'users/hostel/pages/residents/residents.js',
  'users/hostel/pages/residents/pages/resident_detail/resident_detail.js',
  'users/hostel/pages/residents/pages/resident_detail/residentMeta.js',
  'users/hostel/pages/residents/pages/resident_detail/components/ProfileSection.js',
  'users/hostel/pages/residents/pages/resident_detail/components/RentSection.js',
  'users/hostel/pages/residents/pages/resident_detail/components/ContactsSection.js',
  'users/hostel/pages/residents/pages/resident_detail/components/HistorySection.js',
  'users/hostel/pages/residents/pages/resident_detail/components/AbsenceSection.js',
  'users/hostel/pages/residents/pages/resident_detail/components/ComplaintsSection.js',
];

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');

/**
 * Strip comments before asserting on "is this code still here".
 *
 * Without this, `!/BLOCK_COLORS/` fails because a COMMENT explains that `BLOCK_COLORS` was
 * removed and why. Asserting against prose makes the suite punish its own documentation.
 */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// ---- 1. Parse -----------------------------------------------------------------
console.log('\nparse');
for (const rel of FILES) {
  let src;
  try {
    src = read(rel);
  } catch (e) {
    ok(`${rel} is readable`, false, String((e as Error)?.message ?? e));
    continue;
  }
  let parsed = true;
  let err = '';
  try {
    // esbuild is already present as a tsx dependency, so no new install is needed.
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
  const src = read(rel);
  const specs = [...src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  const broken = [];
  for (const spec of specs) {
    const target = resolve(dirname(abs), spec);
    if (!EXT.some((e) => existsSync(target + e))) broken.push(spec);
  }
  ok(`${rel} — all ${specs.length} relative imports resolve`, broken.length === 0, broken.join(', '));
}

// ---- 3. hostelApi keys exist --------------------------------------------------
console.log('\napi surface');
const apiSrc = read('services/api.js');
const hostelBlock = apiSrc.slice(apiSrc.indexOf('export const hostelApi'));
const declared = new Set(
  [...hostelBlock.matchAll(/^\s{2}([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]),
);
const SCREEN_FILES = FILES.filter((f) => f !== 'services/api.js');
const used = new Map();
for (const rel of SCREEN_FILES) {
  for (const m of read(rel).matchAll(/hostelApi\.([A-Za-z_$][\w$]*)/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1]).add(rel);
  }
}
for (const [key, where] of used) {
  ok(
    `hostelApi.${key} is exported by services/api.js`,
    declared.has(key),
    `used in ${[...where].join(', ')}`,
  );
}
// Split on purpose. `residents` / `residentFacets` / `residentDetail` and the two contact
// writes are CALLED by a screen, so an unused one of those is dead weight. The three
// single-resource reads below are not called by any screen -- `GET /residents/:id` composes
// contacts, history and absence server-side -- so they are asserted to exist for callers
// that want exactly one of them, not to be invoked here.
const CALLED_BY_A_SCREEN = [
  'residents',
  'residentFacets',
  'residentDetail',
  'saveResidentContact',
  'deleteResidentContact',
];
for (const key of CALLED_BY_A_SCREEN) {
  ok(`hostelApi.${key} is actually used by a screen`, used.has(key));
}
const SINGLE_RESOURCE_READS = ['residentHistory', 'residentAbsence', 'residentContacts'];
for (const key of SINGLE_RESOURCE_READS) {
  ok(`hostelApi.${key} is declared for single-resource reads`, declared.has(key));
  ok(
    `hostelApi.${key} is genuinely unused by screens (the detail response composes it)`,
    !used.has(key),
    'if a screen starts calling this, drop it from SINGLE_RESOURCE_READS',
  );
}

// ---- 4. Filtering really moved to the server ---------------------------------
console.log('\nserver-side filtering');
const dir = read('users/hostel/pages/residents/residents.js');
ok('the directory sends `q` to the server', /hostelApi\.residents\(\{[^}]*\bq\b/.test(dir));
ok('the directory sends `block` to the server', /hostelApi\.residents\(\{[^}]*block\b/s.test(dir));
ok('the directory sends `feeStatus` to the server', /hostelApi\.residents\(\{[^}]*feeStatus\b/s.test(dir));
ok(
  'no client-side .filter() over the resident list remains',
  !/\.(filter)\(\s*\(?\s*r\s*\)?\s*=>/.test(code('users/hostel/pages/residents/residents.js')),
  'a leftover client filter is the bug this change exists to fix',
);
ok('the directory paginates rather than fetching everything', /totalPages/.test(dir));
ok('Load more appends instead of replacing', /mode === 'append' \? \[\.\.\.prev/.test(dir));
ok('search is debounced', /setTimeout/.test(dir));

// ---- 5. Hardcoded block colours gone ------------------------------------------
console.log('\nblock colours');
ok(
  'the hardcoded Block A/B/C colour map is gone',
  !/BLOCK_COLORS/.test(code('users/hostel/pages/residents/residents.js')),
  'a fourth block would render in the fallback colour with no way to tell',
);
ok('block colour is derived from the block name instead', /function blockColor/.test(dir));

// ---- 6. Contact form requires the fields the server requires -----------------
console.log('\ncontact form parity');
const contacts = read(
  'users/hostel/pages/residents/pages/resident_detail/components/ContactsSection.js',
);
for (const field of ['name', 'relation', 'phone']) {
  // Case-insensitive: the JSX prop is `label="Name"`, and matching the lowercase key is what
  // makes the assertion about the FIELD rather than about its display capitalisation.
  ok(
    `the contact form collects ${field}`,
    new RegExp(`label="${field}"`, 'i').test(contacts),
  );
}
ok('the form offers both contact kinds', /GUARDIAN[\s\S]*EMERGENCY/.test(contacts));
ok('the form states that primary is per-kind', /independent/i.test(contacts));

// ---- 7. Cross-check the new backend contract the screens rely on --------------
console.log('\nbackend contract');
const BACKEND = resolve(HERE, '..', 'src', 'modules', 'hostel');
const routesSrc = readFileSync(resolve(BACKEND, 'hostel.routes.ts'), 'utf8');
for (const route of [
  '/residents/facets',
  '/residents/:id/history',
  '/residents/:id/contacts',
  '/residents/:id/contacts/:contactId',
  '/residents/:id/absence',
]) {
  ok(`route ${route} is declared`, routesSrc.includes(`'${route}'`));
}
const svcSrc = readFileSync(resolve(BACKEND, 'hostel-residents.service.ts'), 'utf8');
ok('the detail response composes contacts', /contacts,/.test(svcSrc));
ok('the detail response composes absence', /absence,/.test(svcSrc));
ok('the detail response composes history', /history,/.test(svcSrc));
ok('the directory resolves the fee filter in the query, not in JS', /rentDues: \{ (none|some)/.test(svcSrc));
ok("the directory's bed-number search guards non-numeric input", /\\d\+\$/.test(svcSrc));

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Hostel resident frontend structure OK');