/**
 * Static checks for the Hostel Rooms frontend.
 *
 * Runs without `npm install`, which this project cannot currently do (the Expo SDK and the
 * pinned React version disagree, so `npm install` fails on peer deps). So everything here is
 * parse- and import-graph-level, not a render.
 *
 * WHAT IS ACTUALLY PROVEN HERE
 * -----------------------------
 *   1. Every changed file parses as JSX. A stray brace in a `StyleSheet` is invisible to grep
 *      and fatal at runtime.
 *   2. Every relative import resolves. After splitting a 408-line screen into a shell plus two
 *      sections, a wrong `../../` depth is the most likely mistake and it fails only when the
 *      screen is opened.
 *   3. Every `hostelApi.*` call resolves to a key the API module exports. This catches the
 *      split-brain where a screen calls `hostelApi.setBedMaintenance` but `api.js` has never
 *      heard of it.
 *   4. `transferBed` is CALLED. It existed, was routed, and was documented in docs §3.2 as a
 *      room action — and no screen had ever invoked it. Asserting a previously-dead helper now
 *      has a caller is the regression test for "the docs describe a feature nobody can reach".
 *   5. The hardcoded positional `BLOCK_COLORS` array is gone, and block colour is hashed from
 *      the block NAME.
 *   6. No client-side `.filter()` over the room list remains.
 *   7. The room screen renders `beds[]`. It used to render `residents[]` and ignore the bed
 *      array the endpoint returned, which is why a bed under maintenance was invisible.
 *   8. The backend contract the screens rely on actually declares what they call.
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
  'users/hostel/pages/rooms/rooms.js',
  'users/hostel/pages/rooms/pages/room_detail/room_detail.js',
  'users/hostel/pages/rooms/pages/room_detail/roomMeta.js',
  'users/hostel/pages/rooms/pages/room_detail/components/BedsSection.js',
  'users/hostel/pages/rooms/pages/room_detail/components/RoomHistorySection.js',
];

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');

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
  const src = read(rel);
  const specs = [...src.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  const broken: string[] = [];
  for (const spec of specs) {
    const target = resolve(dirname(abs), spec);
    if (!EXT.some((e) => existsSync(target + e))) broken.push(spec);
  }
  ok(`${rel} -- all ${specs.length} relative imports resolve`, broken.length === 0, broken.join(', '));
}

// ---- 3. hostelApi keys exist --------------------------------------------------
console.log('\napi surface');
const apiSrc = read('services/api.js');
const hostelBlock = apiSrc.slice(apiSrc.indexOf('export const hostelApi'));
const declared = new Set([...hostelBlock.matchAll(/^\s{2}([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]));

const SCREENS = FILES.filter((f) => f !== 'services/api.js');
const used = new Map<string, Set<string>>();
for (const rel of SCREENS) {
  for (const m of read(rel).matchAll(/hostelApi\.([A-Za-z_$][\w$]*)/g)) {
    if (!used.has(m[1])) used.set(m[1], new Set());
    used.get(m[1])!.add(rel);
  }
}
for (const [key, where] of used) {
  ok(
    `hostelApi.${key} is exported by services/api.js`,
    declared.has(key),
    `used in ${[...where].join(', ')}`,
  );
}

// `transferBed` is the point of this suite's existence. It was exported, routed and
// documented as a room action while no screen had ever called it.
const EXPECTED_USED = [
  'rooms',
  'roomDetail',
  'roomHistory',
  'allocate',
  'vacateBed',
  'transferBed',
  'setBedMaintenance',
];
for (const key of EXPECTED_USED) {
  ok(`hostelApi.${key} is called by a screen`, used.has(key));
}
ok(
  'the transfer route is the one the API helper targets',
  /`\/hostel\/beds\/\$\{bedId\}\/transfer`/.test(apiSrc),
  'a screen calling transferBed is only useful if the path matches the route',
);

// ---- 4. Server-side filtering -------------------------------------------------
console.log('\nserver-side filtering');
const rooms = read('users/hostel/pages/rooms/rooms.js');
ok('the directory sends q to the server', /hostelApi\.rooms\(\{[\s\S]*?\bq\b/.test(rooms));
ok('the directory sends block to the server', /hostelApi\.rooms\(\{[\s\S]*?\bblock\b/.test(rooms));
ok('the directory sends floor to the server', /hostelApi\.rooms\(\{[\s\S]*?\bfloor\b/.test(rooms));
ok('the directory sends status to the server', /hostelApi\.rooms\(\{[\s\S]*?\bstatus\b/.test(rooms));
ok(
  'no client-side .filter() over the room list remains',
  !/\.filter\(\s*\(?\s*r\s*\)?\s*=>/.test(rooms),
  'a leftover client filter is the bug this change exists to fix',
);
ok('the directory paginates rather than fetching everything', /totalPages/.test(rooms));
ok('Load more appends instead of replacing', /mode === 'append' \? \[\.\.\.prev/.test(rooms));
ok('search is debounced', /setTimeout/.test(rooms));
ok('block chips carry a live count', /\{b\.rooms\}/.test(rooms));

// ---- 5. Block colour ----------------------------------------------------------
console.log('\nblock colour');
ok(
  'the positional BLOCK_COLORS array is gone',
  !/BLOCK_COLORS/.test(rooms),
  'colour came from the chip INDEX, so tapping a different tab changed the block colour',
);
ok('block colour is hashed from the block name', /function blockColor/.test(rooms));

// ---- 6. Beds are rendered -----------------------------------------------------
console.log('\nbed rendering');
const bedsSection = read(
  'users/hostel/pages/rooms/pages/room_detail/components/BedsSection.js',
);
ok('the directory renders one dot per bed', /room\.beds\.map/.test(rooms));
ok('the detail renders one row per bed', /beds\.map/.test(bedsSection));
ok('a maintenance bed is visually distinct from a free one', /bedDotMaintenance/.test(bedsSection));
ok('a maintenance bed is labelled in words, not just colour', /In repair/.test(bedsSection));
ok(
  'the withdraw action is hidden for an occupied bed rather than offered and failing',
  /isMaintenance \?[\s\S]*?:\s*!occupant \?/s.test(bedsSection),
);
ok('withdrawing requires a reason in the form', /Reason required/.test(bedsSection));
ok('returning a bed to service is offered', /Return to service/.test(bedsSection));

// ---- 7. Allocation is gated with a stated reason ------------------------------
console.log('\nallocation gating');
const detail = read('users/hostel/pages/rooms/pages/room_detail/room_detail.js');
ok('Allocate is disabled when there is no headroom', /disabled=\{!!blocker\}/.test(detail));
ok('and the reason is stated', /allocationBlocker/.test(detail) && /\{blocker &&/.test(detail));
ok('the room history section is composed', /<RoomHistorySection/.test(detail));
ok('history failure degrades without blanking the room', /setHistory\(null\)/.test(detail));

// ---- 8. Backend contract ------------------------------------------------------
console.log('\nbackend contract');
const BACKEND = resolve(HERE, '..', 'src', 'modules', 'hostel');
const routesSrc = readFileSync(resolve(BACKEND, 'hostel.routes.ts'), 'utf8');
for (const route of [
  '/rooms',
  '/rooms/:roomId',
  '/rooms/:roomId/history',
  '/beds/:bedId/maintenance',
  '/beds/:bedId/transfer',
]) {
  ok(`route ${route} is declared`, routesSrc.includes(`'${route}'`));
}
ok(
  'the old number-keyed room route is gone',
  !routesSrc.includes("'/rooms/:roomNumber'"),
  'two blocks may hold the same room number, so findFirst-by-number served an arbitrary room',
);

const svcSrc = readFileSync(resolve(BACKEND, 'hostel-rooms.service.ts'), 'utf8');
ok('occupancy is counted from bed status, not the counter', /status === 'ALLOCATED'/.test(svcSrc));
ok('the denormalised counter is never read for status', !/r\.occupiedCount\s*[<>=]/.test(svcSrc));
ok('beds carry their own state', /status: string;/.test(svcSrc));
ok('the occupant travels with the bed row', /occupant:/.test(svcSrc));
ok('allocatable capacity is separate from physical status', /allocatableCapacity/.test(svcSrc));

// The cross-tenant fix, asserted at the source rather than only in the DB suite.
const hostelSvcSrc = readFileSync(resolve(BACKEND, 'hostel.service.ts'), 'utf8');
for (const fn of ['vacateBed', 'transferResident']) {
  const start = hostelSvcSrc.indexOf(`export async function ${fn}`);
  ok(`${fn} exists`, start > -1);
  const body = hostelSvcSrc.slice(start, start + 2200);
  ok(
    `${fn} scopes the allocation lookup by institution`,
    /bed: \{ room: \{ block: \{ institutionId \} \} \}/.test(body),
    'the lookup used to be bedId-only, with institutionId accepted and unused',
  );
}

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Hostel rooms frontend structure OK');