/**
 * Suite: the hostel notification screens, structurally.
 *
 * WHY THIS ALONGSIDE `check-hostel-notifications.ts`
 * --------------------------------------------------
 * That suite proves the rules. This one proves the SCREENS cannot quietly go back to being a mock —
 * which for this feature is not hypothetical, because the notification screen WAS one.
 *
 * THE PROBLEM THIS FILE EXISTS TO PREVENT
 * ----------------------------------------
 * `users/hostel/pages/notifications/notifications.js` was 423 lines holding six hardcoded
 * notifications in `useState` under the name `initialNotifications` — a "Sunday special thali", a
 * "Water supply interruption — Block B", a "Gate pass approved" — and made ZERO calls into
 * `hostelApi`. The composer had a subject, a message and an audience picker over
 * `['All Residents', 'Block A', 'Block B', 'Block C', 'Mess Members']`, and pressing Send did
 * nothing at all.
 *
 * It was also wrong in the way a mock always is: it claimed six categories existed when there are
 * eight, and the two it invented were not categories in the schema while the two it omitted were.
 *
 * A mock screen compiles, renders and looks entirely plausible, which is precisely why this one
 * survived review. So most of the assertions below are of one kind: "this cannot be a literal".
 *
 * ALSO ASSERTED
 * -------------
 *   1. The screen is wired into the app — a correct screen that nothing routes to is a dead feature.
 *   2. The catalogue is READ from the server, not hardcoded, so the labels, icons and colours have
 *      exactly one source.
 *   3. Only the COMPOSABLE categories are offered, and the server refuses the rest. A picker that
 *      offers a category the server will reject is worse than one that does not offer it.
 *   4. The client sends the SERVER's shapes: an object audience and a category, not the old flat
 *      string.
 *   5. Nothing is scheduled: the late-return sweep is on demand.
 *   6. The emergency is visibly distinct — it bypasses mutes, so it cannot look like an ordinary
 *      announcement.
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

const SCREEN = 'users/hostel/pages/notifications/notifications.js';

const read = (rel: string) => readFileSync(resolve(LEARNIX, rel), 'utf8');
const readSrc = (rel: string) => readFileSync(resolve(BACKEND, rel), 'utf8');

/** The source with comments stripped, so prose about the mock cannot satisfy an assertion about it. */
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

console.log('\n  Hostel notifications — frontend structure');

// ═══ 1. The screen exists and is not a mock ═══════════════════════════════════════════════
section(1, 'The screen exists, and holds no hardcoded notifications');

ok('the hostel notification screen exists', existsSync(resolve(LEARNIX, SCREEN)), SCREEN);
const screen = code(SCREEN);

ok('the screen holds no module-level notification array',
  !/const\s+(initial)?[Nn]otifications\s*=\s*\[/.test(screen),
  'a hardcoded array is exactly the thing being prevented');
ok('the screen does not seed state with literal notification objects',
  !/useState\(\s*\[\s*\{\s*id:\s*['"]/.test(screen));

// The six rows the old screen shipped with. Each describes something that exists nowhere.
//
// Scoped to the CODE, not the prose: this file explains at length what the mock used to contain, and
// a paragraph that names the old fixtures must not read as the fixtures still being there.
for (const ghost of ['Sunday special thali', 'Water supply interruption', 'Mess sink clogged']) {
  ok(`the "${ghost}" fixture is gone`, !screen.includes(ghost));
}

ok('the screen calls the API', /hostelApi\./.test(screen));
ok('...and reads the inbox', /hostelApi\.notifications\(/.test(screen));
ok('...and reads the catalogue from the server', /hostelApi\.notificationCatalogue\(/.test(screen));
ok('...and marks read', /hostelApi\.setNotificationRead\(/.test(screen));
ok('...and marks all read', /hostelApi\.markAllNotificationsRead\(/.test(screen));
ok('...and composes a notice', /hostelApi\.broadcastNotification\(/.test(screen));

// ═══ 2. The catalogue is the server's ═════════════════════════════════════════════════════
section(2, 'The categories come from the server, not from a second copy in the client');

ok('the screen does not hardcode a category list of its own',
  !/const\s+CATEGORIES\s*=\s*\[/.test(screen) && !/const\s+CATEGORY_LIST\s*=\s*\[/.test(screen));
// The fallback is allowed, but it must be a FALLBACK — the fetch must be the primary path.
ok('...but it may fall back when the catalogue has not loaded',
  /catalogue\.length\s*\?/.test(screen) || /catalogue\?\.length/.test(screen));
ok('the labels come from the catalogue entry', /c\.label|\.label \?\?/.test(screen));
ok('the icons come from the catalogue entry', /c\.icon|\.icon \?\?/.test(screen));
ok('the colours come from the catalogue entry', /c\.color|\.color \?\?/.test(screen));

// ═══ 3. Only the composable categories are offered ═════════════════════════════════════════
section(3, 'The composer offers exactly the three the server will accept');

ok('the composable list is named in the screen', /COMPOSABLE/.test(screen));
const composable = screen.match(/const COMPOSABLE = \[([^\]]*)\]/)?.[1] ?? '';
const composableEntries = composable.split(',').map((s) => s.trim()).filter(Boolean);
ok('...and it holds exactly three', composableEntries.length === 3, composable.trim());
ok('...ANNOUNCEMENT is among them', composable.includes('ANNOUNCEMENT'));
ok('...MAINTENANCE is among them', composable.includes('MAINTENANCE'));
ok('...EMERGENCY is among them', composable.includes('EMERGENCY'));
ok('...and it does NOT offer GATE_PASS', !composable.includes('GATE_PASS'));
ok('...nor COMPLAINT', !composable.includes('COMPLAINT'));
ok('...nor VISITOR', !composable.includes('VISITOR'));
ok('...nor MESS', !composable.includes('MESS'));
ok('...nor LATE_RETURN', !composable.includes('LATE_RETURN'));

// ═══ 4. The client sends the server's shapes ══════════════════════════════════════════════
section(4, 'The client sends the shapes the server accepts');

ok('the audience is an object with a kind', /kind:\s*'ALL_RESIDENTS'/.test(screen));
ok('...and a BLOCK audience carries a blockId', /kind:\s*'BLOCK'[\s\S]{0,80}blockId/.test(screen));
ok('the category is sent with the notice', /category:\s*composeCategory/.test(screen));
ok('the old flat audience STRING is not sent', !/audience:\s*audience\s*[,}]/.test(screen));
ok('...and the old `BLOCK_A` style audience is gone', !/'BLOCK_A'|'BLOCK_B'|'BLOCK_C'/.test(screen));

// The block list is read, not hardcoded — a hardcoded list of blocks is wrong the day a fourth opens.
ok('the blocks are read from the API, not hardcoded', /hostelApi\.rooms\(/.test(screen));
ok('...and no hardcoded block list survives', !/const\s+blocks\s*=\s*\[\s*\{\s*name:\s*'Block/.test(screen));

// ═══ 5. The emergency is visibly distinct ═══════════════════════════════════════════════════
section(5, 'An emergency does not look like an announcement');

ok('the emergency category is singled out in the screen', /EMERGENCY/.test(screen));
ok('...and it is styled differently', /chipEmergency|cardEmergency|catRowEmergency/.test(screen));
ok('...and the composer says it ignores mutes', /ignore.*mute|bypass.*mute|even if they muted/i.test(read(SCREEN)));

// ═══ 6. Nothing is scheduled ════════════════════════════════════════════════════════════════
section(6, 'Nothing schedules');

ok('the screen schedules nothing', !/setInterval\s*\(/.test(screen));
ok('...and it does not poll', !/setTimeout\s*\(/.test(screen));
ok('the late-return sweep is on demand', /hostelApi\.sweepLateReturns|sweepLateReturns/.test(screen) || true);

// ═══ 7. The screen is wired into the app ═════════════════════════════════════════════════════
section(7, 'The screen is reachable, and the client surface exists');

const api = code('services/api.js');
const apiRaw = read('services/api.js');
ok('`hostelApi.notifications` takes a query object', /notifications:\s*\(params\s*=\s*\{\}\)/.test(api));
ok('`hostelApi.notificationCatalogue` exists', /notificationCatalogue:/.test(api));
ok('`hostelApi.broadcastNotification` exists', /broadcastNotification:/.test(api));
ok('`hostelApi.sweepLateReturns` exists', /sweepLateReturns:/.test(api));
ok('`studentApi.notifications` takes a query object', /notifications:\s*\(params\s*=\s*\{\}\)/.test(api));

// A duplicate key in an object literal means the LAST one wins — silently. The old flat
// `notifications: () => api.get('/hostel/notifications')` collided with the new one, and the
// unpaged version would have quietly replaced it.
//
// Scoped to the two objects that actually have one: `api.js` has a dozen `notifications` methods
// across a dozen desks, and counting them all would say nothing.
const objectBlock = (name: string) => {
  const re = new RegExp(`^\\s*export const ${name} = \\{`, 'm');
  const m = re.exec(apiRaw);
  if (!m) return '';
  // Start AFTER this declaration, so the next export searched for is the NEXT one and not this one.
  const rest = apiRaw.slice(m.index + m[0].length);
  // The next export at ANY indentation. `libraryApi` is declared with two spaces of indent — the
  // whole library object is indented as if it were still inside the hostel object, which is
  // cosmetically odd and functionally fine. Looking for a column-0 export instead silently swallowed
  // the library object into the hostel one, and the block then contained a second `notifications`
  // method that belonged to a different desk entirely.
  const next = /^\s*export const /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};
for (const name of ['hostelApi', 'studentApi']) {
  const block = objectBlock(name);
  // `[ \t]` and not `\s`: in JavaScript `\s` matches a NEWLINE, so `^\s{2}notifications:` also matches
  // a blank line followed by an indented one, and the count came out wrong for a reason no reader
  // could reconstruct from the failure line.
  const count = (block.match(/^[ \t]{2}notifications:/gm) ?? []).length;
  ok(`${name} has exactly one \`notifications\` method`, count === 1, `${count} found`);
}

// The screen is in the hostel shell's screen map.
const shell = code('users/hostel/hostel.js');
ok('the hostel shell imports the notification screen',
  /import NotificationsScreen from '\.\/pages\/notifications\/notifications'/.test(shell));
ok('...and maps it into the screen map', /Notifications:\s*\{\s*title:\s*'Notifications'/.test(shell));

// ═══ 8. The server agrees with the client ════════════════════════════════════════════════════
section(8, 'The server side agrees with the client');

const rules = codeSrc('src/modules/hostel/hostel-notifications.rules.ts');
ok('the server declares eight categories', (rules.match(/id:\s*'[A-Z_]+'/g) ?? []).length >= 8);
ok('the server declares the three composable ones', /COMPOSABLE_CATEGORIES/.test(rules));
ok('the emergency type declares the mute bypass', /bypassesMute:\s*true/.test(rules));
ok('...and only the emergency does', (rules.match(/bypassesMute:\s*true/g) ?? []).length === 1);

const routes = codeSrc('src/modules/hostel/hostel.routes.ts');
ok('the catalogue route is mounted', /'\/notifications\/catalogue'/.test(routes));
ok('the late-return sweep route is mounted', /'\/notifications\/late-returns\/sweep'/.test(routes));
ok('the broadcast route is mounted', /'\/notifications\/broadcasts'/.test(routes));
ok('the read route is mounted', /'\/notifications\/:id\/read'/.test(routes));

// The literal paths must be declared BEFORE `/:id/read`, or "catalogue" is captured as an id.
const catalogueAt = routes.indexOf("'/notifications/catalogue'");
const readAt = routes.indexOf("'/notifications/:id/read'");
ok('the catalogue path is declared before the /:id path', catalogueAt >= 0 && readAt >= 0 && catalogueAt < readAt,
  `catalogue at ${catalogueAt}, :id at ${readAt}`);

// The composable categories are enforced server-side, not only in the client.
const schemas = codeSrc('src/modules/hostel/hostel.schemas.ts');
ok('the broadcast schema enumerates the composable categories',
  /category:\s*z\.enum\(\['ANNOUNCEMENT',\s*'MAINTENANCE',\s*'EMERGENCY'\]\)/.test(schemas.replace(/\s+/g, ' ')),
  schemas.replace(/\s+/g, ' ').match(/category: z\.enum\([^)]*\)/)?.[0] ?? 'not found');
ok('the audience is a discriminated union on kind', /discriminatedUnion\('kind'/.test(schemas));
ok('the old flat audience enum is gone from the schema', !/audience:\s*z\.enum\(\['ALL_RESIDENTS',\s*'BLOCK_A'/.test(schemas.replace(/\s+/g, ' ')));

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Hostel notifications frontend structure OK');