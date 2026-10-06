/**
 * DB-free checks for the notifications feature (docs/users/12-alumni-relations.md §3.7).
 *
 * No server, no database. These exercise the parts that are pure contracts: the
 * category vocabulary, the Zod schemas, the reminder-window arithmetic, and — the one
 * that matters most — the agreement between this desk's rules file and the accounts
 * desk's type registry, which are two files in two modules that both read the same
 * `notifications` table.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM check-notifications-db.ts
 * -----------------------------------------------------------
 * The DB-backed suite proves behaviour (a mute actually suppresses, a dedupe key
 * actually dedupes). This one proves AGREEMENT, and agreement is what silently
 * rots: someone adds a category to `notifications.rules.ts`, everything passes in
 * dev because their own inbox renders it, and an alumni row that reaches the finance
 * inbox is labelled with the unknown-type fallback and counted as in-scope. No
 * behavioural test catches that, because nothing is broken from one desk's point of
 * view. This runs without a database, so it can run in CI.
 */
import { readFileSync } from 'node:fs';
import {
  CATEGORIES,
  CATEGORY_IDS,
  CATEGORY_BY_TYPE,
  categoryForType,
  categoryMeta,
  isCategoryId,
  typesForCategory,
  UNKNOWN_TYPE_META,
  REMINDER_OFFSETS_H,
  REMINDER_SLACK_MIN,
  FANOUT_CHUNK,
  NOTIFICATION_BOUND_COLUMNS,
  INBOX_MAX_LIMIT,
} from '../src/modules/alumni/notifications/notifications.rules.js';
import {
  inboxQuerySchema,
  notificationIdSchema,
  preferencePatchSchema,
  readStateSchema,
  audienceSchema,
  broadcastCreateSchema,
  sweepSchema,
} from '../src/modules/alumni/notifications/notifications.schemas.js';
import { TYPE_META as ACCOUNTS_TYPES } from '../src/modules/accounts/notifications.rules.js';
import { UnknownCategoryError } from '../src/modules/alumni/notifications/notifications.delivery.js';

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`  FAIL: ${msg}`);
  }
};

const section = (name: string) => console.log(`\n[${name}]`);

// ── The vocabulary ─────────────────────────────────────────────────────────────
section('category vocabulary');
ok(CATEGORIES.length === 8, `8 categories, got ${CATEGORIES.length}`);
ok(CATEGORY_IDS.length === 8, `8 ids, got ${CATEGORY_IDS.length}`);
ok(new Set(CATEGORY_IDS).size === CATEGORY_IDS.length, 'category ids are unique');

for (const c of CATEGORIES) {
  ok(!!c.label, `${c.id} has a label`);
  ok(!!c.icon, `${c.id} has an icon`);
  ok(!!c.color, `${c.id} has a colour`);
  ok(/^#[0-9a-f]{6}$/i.test(c.color), `${c.id} colour is a hex value (${c.color})`);
  ok(!!c.blurb && c.blurb.length > 10, `${c.id} has a blurb a person can read`);
  ok(c.defaultMuted === false, `${c.id} defaults to on`);
  ok(!!c.module, `${c.id} declares its module`);
  ok(Array.isArray(c.legacyTypes), `${c.id} declares legacyTypes`);
  ok(isCategoryId(c.id), `${c.id} passes isCategoryId`);
  ok(categoryMeta(c.id) === c, `categoryMeta resolves ${c.id}`);
  // "All eight are mutable, default on" is a product decision, so it is asserted
  // structurally rather than by a flag: the type has no `mandatory`/`alwaysOn`
  // escape hatch at all, so an office-authored category cannot be added as
  // non-mutable without changing the shape and failing this file's compilation.
  ok(!('mandatory' in c), `${c.id} has no "mandatory" escape hatch — every category is mutable`);
}

// The mute list is built from the rules file, so "all eight are mutable" is also a
// statement about what the preferences screen can show: it must never render fewer
// rows than there are categories.
ok(
  CATEGORIES.length === CATEGORY_IDS.length,
  `every category is offered on the preferences screen (${CATEGORIES.length} rules, ${CATEGORY_IDS.length} ids)`,
);

section('type ↔ category reverse index');
for (const c of CATEGORIES) {
  ok(categoryForType(c.type) === c.id, `current type ${c.type} resolves to ${c.id}`);
  ok(typesForCategory(c.id).includes(c.type), `typesForCategory includes ${c.type}`);
  for (const legacy of c.legacyTypes) {
    ok(categoryForType(legacy) === c.id, `legacy type ${legacy} resolves to ${c.id}`);
    ok(typesForCategory(c.id).includes(legacy), `typesForCategory includes legacy ${legacy}`);
  }
}
ok(CATEGORY_BY_TYPE.size >= CATEGORIES.length, 'reverse index has an entry per category');

// The regression this index exists for: 863 rows written as plain `BROADCAST` before
// the alumni desk took its own type. Without the legacy entry they all render "Other".
ok(categoryForType('BROADCAST') === 'BROADCAST', 'legacy BROADCAST rows still categorise');
ok(
  typesForCategory('BROADCAST').includes('BROADCAST') &&
    typesForCategory('BROADCAST').includes('ALUMNI_BROADCAST'),
  'BROADCAST category owns both the current and the legacy type',
);

// Two categories must not claim the same type, or the reverse index is order-dependent.
const claimed = new Map<string, string>();
let collision = '';
for (const c of CATEGORIES) {
  for (const t of [c.type, ...c.legacyTypes]) {
    if (claimed.has(t)) collision = `${t} claimed by both ${claimed.get(t)} and ${c.id}`;
    else claimed.set(t, c.id);
  }
}
ok(collision === '', collision || 'no type is claimed by two categories');

section('unregistered types degrade honestly');
ok(categoryForType('PAYSLIP') === null, 'a finance type is not claimed by this desk');
ok(UNKNOWN_TYPE_META.label === 'Other', 'the fallback does not pretend to be "System"');
ok(UNKNOWN_TYPE_META.icon.length > 0 && UNKNOWN_TYPE_META.color.length > 0, 'the fallback has chrome');

section('deep links');
for (const c of CATEGORIES) {
  // A category whose deep link throws on a payload must not be able to take the
  // inbox down; deepLinkFor catches, but the function itself must not return garbage.
  const link = c.deepLink({});
  ok(link === null || typeof link.screen === 'string', `${c.id} deep link returns a screen or null`);
  const withIds = c.deepLink({ eventId: 'e1', requestId: 'r1', pairId: 'p1', donationId: 'd1', chapterId: 'c1', campaignId: 'k1' });
  ok(withIds === null || typeof withIds.screen === 'string', `${c.id} deep link survives a full payload`);
}

// ANNOUNCEMENT and BROADCAST are institution-wide and have nowhere to go.
ok(
  CATEGORIES.filter((c) => c.id === 'ANNOUNCEMENT' || c.id === 'BROADCAST').every((c) => c.deepLink({})?.screen === 'Notifications'),
  'institution-wide categories route back to the inbox rather than nowhere',
);

section('reminder windows');
ok(REMINDER_OFFSETS_H.length === 2, 'two reminder offsets');
ok(REMINDER_OFFSETS_H.includes(24) && REMINDER_OFFSETS_H.includes(2), 'the 24h and 2h offsets are present');
ok(REMINDER_OFFSETS_H.every((h) => h > 0), 'no offset is in the past');
ok(REMINDER_SLACK_MIN > 0, 'slack is non-zero, or a window would have zero width');

// The window must not overlap, or one sweep pass would fire two offsets for one event.
// Both sides of this comparison are in HOURS: `gap` is a difference of hour offsets,
// and the slack is converted from its 30-minute unit, not compared to it raw.
const slackHours = REMINDER_SLACK_MIN / 60;
for (let i = 0; i < REMINDER_OFFSETS_H.length - 1; i++) {
  const gap = REMINDER_OFFSETS_H[i] - REMINDER_OFFSETS_H[i + 1];
  ok(
    gap > slackHours * 2,
    `offsets ${REMINDER_OFFSETS_H[i]}h and ${REMINDER_OFFSETS_H[i + 1]}h do not overlap (gap ${gap}h > ${slackHours * 2}h of slack)`,
  );
}

section('limits');
// The arithmetic that matters: a notifications row binds nine columns, and SQLite
// caps a statement at 999 variables. This exact check caught FANOUT_CHUNK being set
// to 250 while it was being written — 2,250 variables, so `ALL_ALUMNI` (863 people in
// dev) would have failed at the database on the first real broadcast.
ok(
  FANOUT_CHUNK * NOTIFICATION_BOUND_COLUMNS < 999,
  `a fan-out chunk binds ${FANOUT_CHUNK * NOTIFICATION_BOUND_COLUMNS} variables, under SQLite’s 999 (${FANOUT_CHUNK} rows × ${NOTIFICATION_BOUND_COLUMNS} columns)`,
);
ok(FANOUT_CHUNK > 0 && FANOUT_CHUNK <= 111, `chunk size is at or under the ${Math.floor(999 / NOTIFICATION_BOUND_COLUMNS)}-row ceiling`);
ok(INBOX_MAX_LIMIT > 0 && INBOX_MAX_LIMIT <= 50, 'inbox page size is capped');

// ── Zod contracts ──────────────────────────────────────────────────────────────
section('inbox query schema');
ok(inboxQuerySchema.safeParse({}).success, 'no filters is valid');
ok(inboxQuerySchema.safeParse({ unread: 'true' }).success, 'unread=true is valid');
ok(inboxQuerySchema.safeParse({ unread: 'false' }).success, 'unread=false is valid');
ok(!inboxQuerySchema.safeParse({ unread: 'yes' }).success, 'unread=yes is rejected');
ok(inboxQuerySchema.safeParse({ category: 'EVENT' }).success, 'a valid category is accepted');
ok(!inboxQuerySchema.safeParse({ category: 'NOPE' }).success, 'an unknown category is rejected');
ok(inboxQuerySchema.safeParse({ page: '2', pageSize: '25' }).success, 'numeric strings coerce');
ok(!inboxQuerySchema.safeParse({ page: '0' }).success, 'page 0 is rejected');
ok(!inboxQuerySchema.safeParse({ pageSize: '500' }).success, 'an oversized page is rejected');
ok(
  (inboxQuerySchema.parse({ page: '3', pageSize: '10' }) as any).page === 3,
  'a coerced page is a number, not the string "3"',
);

section('single-row contracts');
ok(notificationIdSchema.safeParse({ id: 'abc' }).success, 'an id is accepted');
ok(!notificationIdSchema.safeParse({}).success, 'a missing id is rejected');
ok(readStateSchema.safeParse({ read: true }).success, 'read:true is accepted');
ok(readStateSchema.safeParse({ read: false }).success, 'read:false is accepted (un-read must be possible)');
ok(!readStateSchema.safeParse({}).success, 'read is required — no implicit default');
ok(!readStateSchema.safeParse({ read: 'true' }).success, 'the string "true" is rejected');

section('preference patch');
for (const id of CATEGORY_IDS) {
  ok(preferencePatchSchema.safeParse({ [id]: true }).success, `${id}: true is accepted`);
  ok(preferencePatchSchema.safeParse({ [id]: false }).success, `${id}: false is accepted`);
}
// An empty or unrecognisable patch is a 400, not a silent no-op: a client sending
// `{}` (or only keys from a newer build) has a bug worth surfacing.
ok(!preferencePatchSchema.safeParse({}).success, 'an empty patch is rejected rather than silently ignored');
ok(!preferencePatchSchema.safeParse({ NOPE: true }).success, 'a patch of only unknown keys is rejected');
ok(preferencePatchSchema.safeParse({ EVENT: true, NOPE: true }).success, 'an unknown key alongside a valid one is tolerated');
ok(
  JSON.stringify(preferencePatchSchema.parse({ EVENT: true, NOPE: true })) === JSON.stringify({ EVENT: true }),
  'and the unknown key is stripped from the parsed result',
);
ok(!preferencePatchSchema.safeParse({ EVENT: 'yes' }).success, 'a non-boolean value is rejected');

section('audience schema');
ok(audienceSchema.safeParse({ kind: 'ALL_ALUMNI' }).success, 'ALL_ALUMNI needs no value');
ok(audienceSchema.safeParse({ kind: 'MENTORS' }).success, 'MENTORS needs no value');
ok(audienceSchema.safeParse({ kind: 'GRADUATION_YEAR', value: 2019 }).success, 'a year is accepted');
ok(audienceSchema.safeParse({ kind: 'GRADUATION_YEAR', value: '2019' }).success, 'a year as a string coerces');
ok(!audienceSchema.safeParse({ kind: 'GRADUATION_YEAR' }).success, 'a year with no value is rejected');
ok(!audienceSchema.safeParse({ kind: 'GRADUATION_YEAR', value: 12 }).success, 'year 12 is rejected');
ok(!audienceSchema.safeParse({ kind: 'GRADUATION_YEAR', value: 3000 }).success, 'year 3000 is rejected');
ok(audienceSchema.safeParse({ kind: 'CHAPTER_CITY', value: 'Bengaluru' }).success, 'a city is accepted');
ok(!audienceSchema.safeParse({ kind: 'CHAPTER_CITY' }).success, 'a city with no value is rejected');
ok(!audienceSchema.safeParse({ kind: 'CHAPTER_CITY', value: '   ' }).success, 'a blank city is rejected');
ok(audienceSchema.safeParse({ kind: 'CHAPTER_MEMBERS', chapterId: 'c1' }).success, 'a chapter id is accepted');
ok(!audienceSchema.safeParse({ kind: 'CHAPTER_MEMBERS' }).success, 'CHAPTER_MEMBERS without an id is rejected');
ok(!audienceSchema.safeParse({ kind: 'NOPE' }).success, 'an unknown kind is rejected');

section('broadcast schema');
ok(
  broadcastCreateSchema.safeParse({ audience: { kind: 'ALL_ALUMNI' }, title: 'Hello there', body: 'Body text' }).success,
  'a minimal broadcast is accepted',
);
ok(
  broadcastCreateSchema.safeParse({ audience: { kind: 'ALL_ALUMNI' }, title: 'Hi', body: 'Body' }).success === false,
  'a 2-character title is rejected',
);
ok(
  broadcastCreateSchema.safeParse({ audience: { kind: 'ALL_ALUMNI' }, title: 'Hello', body: 'x'.repeat(2001) }).success === false,
  'an over-long body is rejected',
);
ok(
  broadcastCreateSchema.safeParse({ audience: { kind: 'ALL_ALUMNI' }, title: 'Hello', body: 'Body', isImportant: true }).success,
  'isImportant is accepted',
);
ok(
  broadcastCreateSchema.safeParse({ audience: { kind: 'ALL_ALUMNI' }, title: 'Hello', body: 'Body', isImportant: 'yes' }).success === false,
  'a string isNot accepted for isImportant',
);

section('sweep schema');
ok(sweepSchema.safeParse({}).success, 'no options is valid');
ok(sweepSchema.safeParse({ dryRun: 'true' }).success, 'dryRun=true is valid');
ok(!sweepSchema.safeParse({ dryRun: 'yes' }).success, 'dryRun=yes is rejected');

// ── Cross-desk agreement ───────────────────────────────────────────────────────
section('accounts registry agreement');
for (const c of CATEGORIES) {
  const meta = (ACCOUNTS_TYPES as Record<string, { category: string | null }>)[c.type];
  ok(!!meta, `accounts registers the type "${c.type}"`);
  if (meta) {
    ok(
      meta.category === null,
      `"${c.type}" is category:null so the finance inbox excludes it (found ${meta.category})`,
    );
  }
}

// The collision this whole arrangement exists to prevent.
ok(
  (ACCOUNTS_TYPES as Record<string, any>).BROADCAST?.category === 'ANNOUNCEMENT',
  'accounts keeps BROADCAST mapped to its own finance announcement category',
);
ok(
  (ACCOUNTS_TYPES as any).ALUMNI_BROADCAST?.category === null,
  'the alumni desk writes ALUMNI_BROADCAST, which the finance inbox excludes',
);

// Sharing an existing key must not change what accounts meant by it.
ok((ACCOUNTS_TYPES as any).EVENT?.category === null, 'EVENT was already category:null and is unchanged');
ok((ACCOUNTS_TYPES as any).EVENT_REG?.category === null, 'EVENT_REG was already category:null and is unchanged');

section('unknown-category guard');
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ok(new UnknownCategoryError('NOPE').category === 'NOPE', 'the error carries the offending id');
  pass++;
} catch {
  fail++;
  console.log('  FAIL: UnknownCategoryError is not constructible');
}

section('route declaration order');
// Express matches in DECLARATION order, so a literal single-segment route declared
// after `/:id` is dead — it answers "Notification not found" instead of its own
// handler.
//
// This exact bug shipped here: `GET /broadcasts` sat below `GET /:id`, so the office's
// send-history request would have been answered with a 404 about a missing row. No
// behavioural test catches it, because every service works and only the wiring is
// wrong — the DB-backed suite calls services directly. So the order is asserted
// statically instead.
{
  const src = readFileSync(
    new URL('../src/modules/alumni/notifications/notifications.routes.ts', import.meta.url),
    'utf8',
  );
  // Capture `router.<method>('<path>'` in declaration order.
  const declared = [...src.matchAll(/router\.(get|post|patch|delete)\(\s*'([^']*)'/g)].map((m) => ({
    method: m[1].toUpperCase(),
    path: m[2],
  }));

  ok(declared.length >= 12, `found the route declarations (${declared.length})`);

  const idIndex = declared.findIndex((r) => r.method === 'GET' && r.path === '/:id');
  ok(idIndex >= 0, 'GET /:id is declared');

  // Every single-segment literal GET route must precede GET /:id.
  for (const r of declared) {
    if (r.method !== 'GET') continue;
    if (r.path === '/:id') continue;
    if (r.path.includes('/:')) continue; // multi-segment parameter routes cannot collide
    ok(
      declared.indexOf(r) < idIndex,
      `GET ${r.path} is declared before GET /:id (index ${declared.indexOf(r)} < ${idIndex})`,
    );
  }

  // And the two routes that are easy to forget entirely.
  ok(declared.some((r) => r.method === 'POST' && r.path === '/read-all'), 'read-all is still routable');
  ok(declared.some((r) => r.method === 'PATCH' && r.path === '/preferences'), 'preferences can be patched');
  ok(
    declared.some((r) => r.method === 'POST' && r.path === '/reminders/sweep'),
    'the sweep is routable',
  );
}

// ────────────────────────────────────────────────────────────────────────────────
console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail > 0 ? 1 : 0);