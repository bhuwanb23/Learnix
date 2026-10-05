// F-10 Notifications — UI audit (docs/users/06 §3.9).
//
// This is the frontend's counterpart to `verify-notifications.ts`, and it checks
// the things only the frontend can get wrong:
//
//   1. REACHABILITY. Every screen this feature registers must actually be wired
//      into FEATURE_MODULES, and every FEATURE_MODULES key the notification
//      screens navigate to must exist. A screen that exists but is never
//      registered is dead code; a `navigation.openModule('NotificationAlerts')`
//      to an unregistered key renders NOTHING, with no error — the sub-page is
//      simply not in the map, so `renderContent` falls through to the tab
//      switcher and the officer lands back on the dashboard.
//
//   2. THE MIRRORS AGREE. `notificationsMeta.js` deliberately duplicates the
//      server's category list, audience list and alert kinds. Duplication is only
//      safe if something checks it, so this asserts the two agree — otherwise a
//      category added server-side ships an app with no filter for it, or the app
//      offers a filter the server answers 422.
//
//   3. THE ALERT ROUTES ARE REAL. Each server alert carries a `route`, and each
//      must be a registered screen key. An alert that fires and opens a blank
//      page is worse than an alert that does not fire.
//
//   4. THE API SURFACE MATCHES THE ROUTES. Every `accountsApi.notifications*`
//      path must exist server-side, and the old flat paths must be GONE.
//
//   5. THE FIXED DEFECTS STAY FIXED. Source-level assertions that per-item read
//      exists, that a row's tap does not call read-all, and that no screen reads
//      `daysOverdue` or `markAllRead` where it should not.
//
// Run: npx tsx scripts/audit-notifications-ui.ts
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
function eq(actual: unknown, expected: unknown, label: string) {
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
const section = (n: string) => console.log(`\n-- ${n}`);

// `backend/scripts/` -> `backend/` -> the repo root, whose `learnix/` is the app.
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROOT = path.join(REPO, 'learnix');
const FEATURE_DIR = path.join(ROOT, 'users', 'accounts_finance');
const NOTIF_DIR = path.join(FEATURE_DIR, 'pages', 'notifications');

const read = (...p: string[]) => fs.readFileSync(path.join(...p), 'utf8');

// The frontend source, and the server rules it mirrors.
const metaSrc = read(NOTIF_DIR, 'notificationsMeta.js');
const uiSrc = read(NOTIF_DIR, 'notificationsUi.js');
const hubSrc = read(NOTIF_DIR, 'notifications.js');
const inboxSrc = read(NOTIF_DIR, 'pages', 'inbox', 'inbox.js');
const alertsSrc = read(NOTIF_DIR, 'pages', 'alerts', 'alerts.js');
const composeSrc = read(NOTIF_DIR, 'pages', 'compose', 'compose.js');
const historySrc = read(NOTIF_DIR, 'pages', 'history', 'history.js');
const shellSrc = read(FEATURE_DIR, 'accounts_finance.js');
const apiSrc = read(ROOT, 'services', 'api.js');

const BACKEND = path.join(REPO, 'backend', 'src', 'modules', 'accounts');
const rulesSrc = fs.readFileSync(path.join(BACKEND, 'notifications.rules.ts'), 'utf8');
const routesSrc = fs.readFileSync(path.join(BACKEND, 'notifications.routes.ts'), 'utf8');
const serviceSrc = fs.readFileSync(path.join(BACKEND, 'notifications.service.ts'), 'utf8');

const SCREENS = ['notifications.js', 'notificationsUi.js', 'notificationsMeta.js',
  'pages/inbox/inbox.js', 'pages/alerts/alerts.js', 'pages/compose/compose.js', 'pages/history/history.js'];

console.log('F-10 Notifications — UI audit');

// ═══ 1. The files exist ═════════════════════════════════════════════════
section('1. Every screen file exists');

for (const rel of SCREENS) {
  ok(fs.existsSync(path.join(NOTIF_DIR, rel)), `${rel}: exists`);
}

// ═══ 2. Reachability ═════════════════════════════════════════════════════
//
// The failure this catches is silent. `renderContent` looks the key up in
// FEATURE_MODULES and, finding nothing, falls through to the tab switcher — so a
// mistyped key sends the officer back to the dashboard with no error anywhere.
section('2. Every screen is registered in FEATURE_MODULES');

const registeredKeys = new Set<string>();
for (const m of shellSrc.matchAll(/^\s{2}([A-Za-z0-9_]+):\s*\{/gm)) registeredKeys.add(m[1]!);

for (const key of [
  'Notifications', 'NotificationInbox', 'NotificationAlerts',
  'NotificationCompose', 'NotificationHistory',
]) {
  ok(registeredKeys.has(key), `${key}: is registered in FEATURE_MODULES`);
}

// And each registered entry really points at a component that is imported.
for (const [key, importName] of [
  ['Notifications', 'NotificationsModule'],
  ['NotificationInbox', 'NotificationInbox'],
  ['NotificationAlerts', 'NotificationAlerts'],
  ['NotificationCompose', 'NotificationCompose'],
  ['NotificationHistory', 'NotificationHistory'],
] as const) {
  const block = shellSrc.slice(shellSrc.indexOf(`${key}: {`));
  const line = block.slice(0, block.indexOf('\n'));
  ok(line.includes(importName), `${key}: is wired to ${importName}`, line.trim());
  ok(new RegExp(`import ${importName} from`).test(shellSrc), `${importName}: is imported`);
  ok(
    new RegExp(`import ${importName} from '\\./pages/notifications`).test(shellSrc),
    `${importName}: is imported from the notifications feature`,
  );
}

// Every `openModule('X')` inside this feature must name a registered key.
section('3. Every screen this feature navigates to is registered');

/**
 * Strip comments before scanning for call sites.
 *
 * Without this, an explanatory comment that quotes a bad call — e.g. "calling
 * openModule with a tab name opens NOTHING" — is scanned as if it were real code,
 * and the audit fails on prose. Rewording comments to satisfy a scanner is the
 * wrong fix; the scanner should read code, not commentary.
 */
const stripComments = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const ALL_KEYS = new Set(registeredKeys);

// The bottom-nav tabs are a DIFFERENT namespace from FEATURE_MODULES: they are
// keys of TAB_TITLES and are reached with `switchTab`. Reading one as a screen
// key opens nothing, silently.
const tabBlock = shellSrc.slice(shellSrc.indexOf('const TAB_TITLES'));
const TAB_KEYS = new Set(
  [...tabBlock.slice(0, tabBlock.indexOf('};')).matchAll(/^\s{2}([A-Za-z]+):\s*'/gm)].map((m) => m[1]!),
);
ok(TAB_KEYS.size > 0, 'the bottom-nav tabs were located', [...TAB_KEYS].join(','));

for (const [name, src] of [
  ['notifications.js', hubSrc], ['notificationsUi.js', uiSrc], ['inbox.js', inboxSrc],
  ['alerts.js', alertsSrc], ['compose.js', composeSrc], ['history.js', historySrc],
] as const) {
  for (const m of stripComments(src).matchAll(/openModule\(\s*'([A-Za-z0-9_]+)'/g)) {
    const target = m[1]!;
    ok(ALL_KEYS.has(target), `${name}: openModule('${target}') targets a registered screen`);
  }
  // A tab name must go through switchTab, never openModule.
  for (const m of stripComments(src).matchAll(/openModule\(\s*'([A-Za-z0-9_]+)'/g)) {
    ok(!TAB_KEYS.has(m[1]!), `${name}: '${m[1]}' is a tab, so it must not be opened as a module`);
  }
}

// The hub must be reachable, or the whole feature is unreachable no matter how
// well it is built. F-11 REPLACED THE PATH, and this follows the real one: the
// dashboard's seven blocks are all money blocks and none of them is a message
// list, so Notifications is reached from the Profile tab. The old assertion
// (`id: 'Notifications'` inside dashboard.js) would now fail forever while the
// feature stayed perfectly reachable — a test that has stopped describing the
// product is worse than no test. These assert the whole chain instead: the
// registration, the handler, and the button that calls it.
section('4. The desk is reachable from the app shell');

const f11EntrySrc = read(FEATURE_DIR, 'accounts_finance.js');
ok(/Notifications:\s*\{[^}]*component:\s*NotificationsModule/.test(f11EntrySrc),
  'Notifications is registered in FEATURE_MODULES');
ok(/onNotificationsPress/.test(f11EntrySrc) && /setCurrentScreen\('Notifications'\)/.test(f11EntrySrc),
  'and the shell is what actually opens it');
const profileSrc = read(FEATURE_DIR, 'pages', 'profile', 'profile.js');
ok(/onNotificationsPress/.test(profileSrc),
  'the Profile tab renders the control that calls that handler');
ok(/Notifications/.test(profileSrc) || /notification/i.test(profileSrc),
  'and the Profile tab is the screen the officer is on when they do');
// The tile must not still describe itself as a one-way broadcast tool.
ok(!/desc:\s*'Broadcast to students'/.test(read(FEATURE_DIR, 'pages', 'notifications', 'notificationsMeta.js')),
  'and the tile no longer claims the desk is only "Broadcast to students"');

// ═══ 5. The mirrors agree ════════════════════════════════════════════════
//
// `notificationsMeta.js` duplicates the server registry on purpose. The only
// thing that makes that safe is this assertion.
section('5. The app mirrors the server registry');

/**
 * Pull `id: 'X'` pairs out of a named array.
 *
 * Matches on the BARE NAME, not on `= [`, because the server declares its
 * registry with a type annotation:
 *
 *     export const CATEGORIES: { id: CategoryId; ... }[] = [
 *
 * Anchoring on `= [` silently returns [] for the server file, which would make
 * the three mirror assertions below vacuously pass ("" === "").
 */
const idsIn = (src: string, arrayName: string): string[] => {
  const decl = new RegExp(`export const ${arrayName}\\b[^=]*= \\[`).exec(src);
  if (!decl) return [];
  const start = decl.index + decl[0].length;
  const end = src.indexOf('\n];', start);
  const block = src.slice(start, end === -1 ? undefined : end);
  return [...block.matchAll(/\bid:\s*'([A-Z_]+)'/g)].map((m) => m[1]!);
};

const serverCategories = idsIn(rulesSrc, 'CATEGORIES');
const appCategories = idsIn(metaSrc, 'CATEGORIES');
eq(appCategories.length, 7, 'the app publishes seven categories');
eq(appCategories.join(','), serverCategories.join(','),
  'the app categories are the server categories, in the same order');

const serverAlerts = idsIn(rulesSrc, 'ALERT_KINDS');
const appAlerts = idsIn(metaSrc, 'ALERT_KINDS');
eq(appAlerts.length, 4, 'the app publishes four alert kinds');
eq(appAlerts.join(','), serverAlerts.join(','), 'the app alert kinds are the server alert kinds');

const serverAudiences = idsIn(rulesSrc, 'AUDIENCES');
const appAudiences = idsIn(metaSrc, 'AUDIENCES');
eq(appAudiences.join(','), serverAudiences.join(','), 'the app audiences are the server audiences');
// The mirror assertions are only worth anything if BOTH sides were found.
ok(serverCategories.length > 0, 'the server category registry was located and parsed');
ok(serverAlerts.length > 0, 'the server alert registry was located and parsed');
ok(serverAudiences.length > 0, 'the server audience registry was located and parsed');

// Every category the app draws must have a colour and an icon the hub actually
// uses — a chip with no colour renders as an invisible square.
for (const id of appCategories) {
  ok(new RegExp(`id: '${id}',[\\s\\S]{0,400}?icon: '`).test(metaSrc), `${id}: has an icon`);
  ok(new RegExp(`id: '${id}',[\\s\\S]{0,400}?color: '#`).test(metaSrc), `${id}: has a colour`);
}

section('6. The alert routes are real screens');

/** `route: 'X'` inside each ALERT_KINDS entry. */
const routeOf = (kind: string): string | null => {
  const i = rulesSrc.indexOf(`id: '${kind}'`);
  if (i === -1) return null;
  const m = rulesSrc.slice(i, i + 500).match(/route:\s*'([A-Za-z0-9_]+)'/);
  return m?.[1] ?? null;
};
const appRouteOf = (kind: string): string | null => {
  const i = metaSrc.indexOf(`id: '${kind}'`);
  if (i === -1) return null;
  const m = metaSrc.slice(i, i + 500).match(/route:\s*'([A-Za-z0-9_]+)'/);
  return m?.[1] ?? null;
};

// A route is valid if it names a registered SUB-SCREEN or a bottom-nav TAB.
// The two are reached differently — `openModule` for a screen, `switchTab` for a
// tab — and treating a tab name as a screen key opens nothing at all, silently.
for (const kind of appAlerts) {
  const serverRoute = routeOf(kind);
  const appRoute = appRouteOf(kind);
  eq(appRoute, serverRoute, `${kind}: the app and server agree on where it takes you`);
  const reachable = !!appRoute && (ALL_KEYS.has(appRoute) || TAB_KEYS.has(appRoute));
  ok(reachable, `${kind}: route '${appRoute}' is a registered screen or a real tab`, String(appRoute));
  // …and the screen that navigates must know which of the two it is.
  ok(/TAB_ROUTES/.test(alertsSrc) && /switchTab\(route\)/.test(alertsSrc),
    `${kind}: the alerts screen routes tabs through switchTab, not openModule`);
}

section('7. The deep links point at real screens and real params');

const deepLinkSrc = metaSrc.slice(metaSrc.indexOf('export function deepLink'));
for (const m of deepLinkSrc.matchAll(/screen:\s*'([A-Za-z]+)'/g)) {
  ok(ALL_KEYS.has(m[1]!), `deepLink target '${m[1]}' is a registered screen`);
}
// The four param names must match what those screens actually read. This is the
// check that catches a deep link that opens a screen with an empty body, which
// looks exactly like a screen that failed to load.
for (const [screen, param] of [
  ['CollectionDetail', 'paymentId'], ['DueDetail', 'dueId'],
  ['ScholarshipApplication', 'applicationId'], ['PayrollRunDetail', 'runId'],
] as const) {
  ok(deepLinkSrc.includes(param), `deepLink passes ${param} to ${screen}`);
  // …and that screen really reads that key.
  const dirs: Record<string, string> = {
    CollectionDetail: path.join(FEATURE_DIR, 'pages', 'collections', 'collection_detail', 'collection_detail.js'),
    DueDetail: path.join(FEATURE_DIR, 'pages', 'dues', 'due_detail', 'due_detail.js'),
    ScholarshipApplication: path.join(FEATURE_DIR, 'pages', 'scholarships', 'pages', 'application', 'application.js'),
    PayrollRunDetail: path.join(FEATURE_DIR, 'pages', 'payroll', 'pages', 'payroll_detail', 'payroll_detail.js'),
  };
  const target = dirs[screen]!;
  if (fs.existsSync(target)) {
    ok(new RegExp(`params\\?\\.${param}\\b`).test(fs.readFileSync(target, 'utf8')),
      `${screen}: reads ${param} from its route params`);
  }
}

// ═══ 8. The API surface ═════════════════════════════════════════════════
section('8. accountsApi matches the routes');

for (const method of [
  'notificationCatalogue', 'notificationAlerts', 'notifications',
  'markNotificationRead', 'setNotificationRead', 'markAllRead', 'broadcasts', 'broadcast',
]) {
  ok(new RegExp(`^\\s{2}${method}:`, 'm').test(apiSrc), `accountsApi.${method} exists`);
}

// Every accounts notifications path the app calls must exist in the router.
for (const p of [
  '/accounts/notifications/catalogue', '/accounts/notifications/alerts',
  '/accounts/notifications/broadcasts', '/accounts/notifications/read-all',
]) {
  ok(apiSrc.includes(p), `accountsApi calls ${p}`);
  const serverPath = p.replace('/accounts', '');
  ok(routesSrc.includes(`'${serverPath}'`), `the router serves ${serverPath}`);
}

// The superseded paths must be GONE. `POST /accounts/broadcasts` moved under
// /notifications, and leaving the old one reachable would be two endpoints that
// write the same rows.
ok(!/api\.post\('\/accounts\/broadcasts'/.test(apiSrc),
  'the app no longer posts to the superseded /accounts/broadcasts');
ok(!/router\.post\(\s*'\/broadcasts'/.test(routesSrc),
  'and the router no longer serves it');
ok(routesSrc.includes(`router.post(\n  '/notifications/broadcasts'`) ||
   /router\.post\(\s*'\/notifications\/broadcasts'/.test(routesSrc),
  'the router serves POST /notifications/broadcasts');

// The broadcast payload must use `body`, not the `content` the old app sent.
ok(/broadcast: \(payload\) => api\.post\('\/accounts\/notifications\/broadcasts', payload\)/.test(apiSrc),
  'broadcast posts to the new path');
ok(/audience: chosen/.test(composeSrc), 'the composer sends the selected audience');
ok(/title: title\.trim\(\)/.test(composeSrc), 'and a trimmed title');
ok(/body: body\.trim\(\)/.test(composeSrc), 'and a trimmed body');

section('9. The literal routes are registered before the parameterised one');

{
  const catalogueAt = routesSrc.indexOf("'/notifications/catalogue'");
  const alertsAt = routesSrc.indexOf("'/notifications/alerts'");
  const broadcastsAt = routesSrc.indexOf("'/notifications/broadcasts'");
  const paramAt = routesSrc.indexOf("'/notifications/:id/read'");
  ok(catalogueAt > 0 && catalogueAt < paramAt, '/notifications/catalogue is declared before /:id/read');
  ok(alertsAt > 0 && alertsAt < paramAt, '/notifications/alerts is declared before /:id/read');
  ok(broadcastsAt > 0 && broadcastsAt < paramAt, '/notifications/broadcasts is declared before /:id/read');
}

// ═══ 10. The defects stay fixed ══════════════════════════════════════════
section('10. The fixed defects stay fixed');

// THE HEADLINE ONE: reading one message must not mark them all read.
//
// The check is on NotificationRow's own tap, not on the string "markAllRead":
// read-all IS still a legitimate control, it just sits in the toolbar as one
// button among several rather than being what every row does. So the assertion
// is that no <NotificationRow> is handed markAllRead as its onPress.
const rowUsages = [...inboxSrc.matchAll(/<NotificationRow[\s\S]{0,400}?\/>/g)].map((m) => m[0]);
ok(rowUsages.length > 0, 'the inbox renders NotificationRow elements');
for (const [i, usage] of rowUsages.entries()) {
  ok(!/markAllRead/.test(usage), `NotificationRow #${i + 1} is not wired to mark-all-read`, usage.slice(0, 120));
  ok(/openItem/.test(usage), `NotificationRow #${i + 1} opens that one message`);
}
// And read-all must still be reachable, or "I have read everything" is impossible.
ok(/markAllRead/.test(inboxSrc), 'read-all remains available as its own toolbar control');
ok(/markNotificationRead\(item\.id\)/.test(inboxSrc),
  'opening a row marks THAT notification read');
ok(/setNotificationRead\(item\.id, false\)/.test(inboxSrc),
  'and a read message can be put back to unread');
ok(!/onPress=\{markAllRead\}/.test(hubSrc), 'the hub does not wire a row to mark-all-read');

// The old uniform blue bell.
ok(!/name="notifications-outline" size=\{18\} color="#2563eb"/.test(hubSrc),
  'no row is painted a hard-coded blue bell any more');
ok(/typeMeta\(item\.type\)/.test(uiSrc), 'a row takes its icon from the type registry');

// The old unfiltered top-50.
ok(/category:\s*category\s*\?\?\s*undefined/.test(inboxSrc), 'the inbox sends its category filter');
ok(/unreadOnly:\s*unreadOnly\s*\?\s*'true'/.test(inboxSrc),
  'the inbox sends unreadOnly as an explicit string');
ok(/take: PAGE/.test(inboxSrc), 'and pages with take/skip');

// A filter that is sent as a bare boolean would be stringified wrong: the
// server coerces "true"/"false", and `true` in a query string becomes the string
// "true" — but `false` becomes "false" only if the caller says so. Assert the
// explicit form is what ships.
ok(!/unreadOnly:\s*unreadOnly\s*\}/.test(inboxSrc),
  'unreadOnly is never sent as a raw boolean');

// The stale column must not be read by the frontend either.
ok(!/daysOverdue/.test(metaSrc) && !/daysOverdue/.test(hubSrc) && !/daysOverdue/.test(inboxSrc),
  'no screen resolves a defaulter audience from daysOverdue');

// Per-item read needs the whole control set, not just one button.
for (const m of ['markNotificationRead', 'setNotificationRead', 'markAllRead']) {
  ok(new RegExp(`${m}:`, 'm').test(apiSrc), `accountsApi.${m} is available to the screens`);
}

section('11. The screens actually use their data');

// A screen that fetches a field and never renders it is a screen with a dead
// request; a screen that renders a field the server never sends is a screen
// showing "undefined".
ok(/unreadByCategory/.test(inboxSrc), 'the inbox renders the per-category unread counts');
ok(/outOfScope/.test(inboxSrc), 'the inbox reports how many messages were filtered out');
ok(/hasMore/.test(inboxSrc), 'the inbox pages rather than truncating');
ok(/recipientCount/.test(composeSrc), 'the composer shows the live recipient count');
ok(/recipientCount === 0/.test(composeSrc), 'and warns before sending to nobody');
ok(/recipients/.test(composeSrc), 'the composer confirms how many people were reached');
ok(/alertMeta|alerts/.test(alertsSrc), 'the alerts screen renders the computed alerts');
ok(/sentBy/.test(historySrc), 'the history names who sent each announcement');
ok(/audienceLabel/.test(historySrc), 'and the audience it went to');
ok(/audienceLabel/.test(alertsSrc) || /a\.count/.test(alertsSrc), 'the alerts screen shows counts');

// The alerts screen must render each kind's own shape — a generic list would
// print "undefined" in a column labelled amount.
for (const [kind, field] of [
  ['BUDGET_OVERRUN', 'overRupees'], ['PAYROLL_UNFOOTED', 'differenceRupees'],
  ['SCHOLARSHIP_UNRELEASED', 'outstandingRupees'], ['UNALLOCATED_RECEIPTS', 'unallocatedRupees'],
] as const) {
  ok(alertsSrc.includes(field), `the alerts screen renders ${kind} (${field})`);
}

section('12. A clear alert is not painted as an alarm');

ok(/alertTone/.test(metaSrc) || /count === 0/.test(metaSrc),
  'the app has the zero-is-clear rule');
ok(/count > 0 \? alert\.icon : 'checkmark-circle-outline'/.test(uiSrc),
  'a clear alert is drawn with a tick, not the alarm icon');
ok(alertsSrc.includes("'All clear'"), 'the alerts screen says so in words');

// ═══ 13. The server side this depends on ═════════════════════════════════
section('13. The server contract the screens rely on');

ok(/router\.use\(auth, requireRole\('ACCOUNTS', 'ADMIN'\)\)/.test(routesSrc),
  'the router applies its own auth — it no longer inherits it from accountsRoutes');
ok(!/financeCategory\(n\.type\)/.test(metaSrc), 'the app does not re-implement the category mapping');
ok(/financeCategory/.test(serviceSrc), 'the server does the category mapping, once');
ok(/assertCategory/.test(rulesSrc), 'and validates the category server-side');
// Unprocessable input is 422; a mistyped filter is a 400. Both must be reachable.
ok(/export function assertCategory[\s\S]{0,200}unprocessable/.test(rulesSrc),
  'an impossible category is 422');
ok(/export function assertAudience[\s\S]{0,200}badRequest/.test(rulesSrc),
  'an unknown audience is 400');

// ── Report ────────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log(`${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ok audit-notifications-ui: the notification desk is wired, reachable, and honest');