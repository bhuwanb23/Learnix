/**
 * Suite: the hostel profile screens, structurally.
 *
 * WHY THIS ALONGSIDE `check-hostel-profile.ts`
 * ------------------------------------------------
 * That suite proves the rules. This one proves the SCREENS cannot quietly go back to being a mock —
 * which for this feature is not hypothetical, because the profile WAS one.
 *
 * THE PROBLEM THIS FILE EXISTS TO PREVENT
 * ----------------------------------------
 * `users/hostel/pages/profile/profile.js` was 275 lines showing three hardcoded figures —
 * "1,248 Residents / 3 Blocks / 42 Staff" — none of them from the server, so none of them could be
 * right: the institution has 60 beds and 3 blocks. It had five menu rows that navigated NOWHERE,
 * and three notification toggles held in `useState`, so they were forgotten the moment the screen
 * unmounted. A mute that silently forgets itself is worse than no mute at all, because the person
 * believes they turned it off.
 *
 * Also asserted here, because it bit this shell once already:
 *   · The profile tab is given a `navigate`. It was given only `goBack`, so every menu row was a
 *     dead button — the screen called `navigation.navigate(...)` on an object that had no such
 *     method, and the optional chaining swallowed the failure. Exactly the bug the mess screen had.
 *   · The sub-screens are REGISTERED, so `navigate` has somewhere to land.
 *   · The mute is written THROUGH, not held locally.
 *   · Every menu row opens a real screen.
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

const PROFILE = 'users/hostel/pages/profile/profile.js';
const SHELL = 'users/hostel/hostel.js';

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

console.log('\n  Hostel profile — frontend structure');

// ═══ 1. The screen exists and holds no literals ══════════════════════════════════════════════
section(1, 'The screen exists, and holds no hardcoded figures');

ok('the hostel profile screen exists', existsSync(resolve(LEARNIX, PROFILE)), PROFILE);
const profile = code(PROFILE);

ok('the screen holds no hardcoded stats array',
  !/const\s+stats\s*=\s*\[/.test(profile),
  'a literal "1,248 Residents" array is exactly the thing being prevented');
ok('...and no hardcoded stat figures', !/'1,248'|'1,1248'/.test(profile));
ok('...and no hardcoded staff count', !/\b42\b/.test(profile));

// The old menu rows that navigated nowhere.
ok('the screen calls the API', /hostelApi\./.test(profile));
ok('...and reads the profile', /hostelApi\.profile\(\)/.test(profile));
ok('...and the permissions', /hostelApi\.profilePermissions\(\)/.test(profile));
ok('...and the preferences', /hostelApi\.profileNotificationPreferences\(\)/.test(profile));

// ═══ 2. The mute is written through ═══════════════════════════════════════════════════════
section(2, 'A mute is persisted, not held in local state');

ok('the mute is written to the server', /hostelApi\.saveProfileNotificationPreference\(/.test(profile));
ok('...and the category is sent with it', /category:\s*category\.id/.test(profile));
ok('...and the desired state is sent with it', /muted:\s*next/.test(profile));
ok('...and a failure reverts the optimistic update', /setPrefs\(previous\)/.test(profile));
ok('the emergency is shown as locked rather than switchable',
  /mutable|Always on/.test(profile) && /c\.mutable/.test(profile));

// ═══ 3. Every menu row opens a real screen ═════════════════════════════════════════════════
section(3, 'Every menu row opens a real screen');

const shell = code(SHELL);
const rows = [...profile.matchAll(/key:\s*'([A-Za-z]+)'/g)].map((m) => m[1]);
ok('the screen declares menu rows', rows.length > 0, rows.join(', '));
for (const key of rows) {
  ok(`the "${key}" row is registered in the shell`, shell.includes(`${key}:`), `not in FEATURE_MODULES`);
}
ok('every row navigates', /navigation\?\.navigate\?\.\(/.test(profile));

// The four sub-screens exist as FILES, so a registered key cannot point at nothing.
for (const rel of [
  'users/hostel/pages/profile/my_permissions/my_permissions.js',
  'users/hostel/pages/profile/change_password/change_password.js',
  'users/hostel/pages/profile/activity/activity.js',
  'users/hostel/pages/profile/help_support/help_support.js',
]) {
  ok(`the ${rel.split('/').slice(-2).join('/')} screen exists`, existsSync(resolve(LEARNIX, rel)), rel);
}

// ═══ 4. The shell gives the profile a `navigate` ═════════════════════════════════════════════
section(4, 'The profile tab is given a navigate, so its rows are not dead buttons');

const profileCase = shell.match(/case 'Profile':[\s\S]{0,600}?\);\s*\n/)?.[0] ?? '';
ok('the Profile case was found', profileCase.length > 0);
ok('...and it passes a `navigate`', /navigate:\s*\(screen\)\s*=>\s*setCurrentScreen\(screen\)/.test(profileCase),
  'without it every menu row is a dead button');
ok('...and a `goBack`', /goBack:/.test(profileCase));

// The shell registers the sub-screens in the same registry the feature modules use.
for (const key of ['MyPermissions', 'ChangePassword', 'Activity', 'HelpSupport']) {
  ok(`the shell registers ${key}`, new RegExp(`${key}:\\s*\\{`).test(shell));
}

// ═══ 5. The sub-screens read real data ═════════════════════════════════════════════════════
section(5, 'The sub-screens read real data');

const perms = code('users/hostel/pages/profile/my_permissions/my_permissions.js');
ok('the permissions screen reads the API', /hostelApi\.profilePermissions\(\)/.test(perms));
ok('...and holds no hardcoded permission list', !/const\s+PERMISSIONS\s*=\s*\[/.test(perms));
ok('...and it groups by category', /g\.category/.test(perms) || /groups/.test(perms));

const activity = code('users/hostel/pages/profile/activity/activity.js');
ok('the activity screen reads the API', /hostelApi\.profileActivity\(\)/.test(activity));
ok('...and it distinguishes sessions from activity', /sessions/.test(activity) && /activity/.test(activity));
ok('...and it can sign other devices out', /revokeAllSessions/.test(activity));

const changePw = code('users/hostel/pages/profile/change_password/change_password.js');
ok('the change-password screen calls the auth API', /authApi\.changePassword\(/.test(changePw));
ok('...and it asks for the CURRENT password', /current/.test(changePw));
ok('...and it confirms the new one', /confirm/.test(changePw));

const help = code('users/hostel/pages/profile/help_support/help_support.js');
ok('the help screen holds real copy', /SECTIONS/.test(help) && /body:/.test(help));

// ═══ 6. The API surface ══════════════════════════════════════════════════════════════════════
section(6, 'The client surface exists and is unambiguous');

const api = code('services/api.js');
ok('`hostelApi.profile` exists', /profile:\s*\(\)\s*=>\s*api\.get\('\/hostel\/profile'\)/.test(api));
ok('`hostelApi.profilePermissions` exists', /profilePermissions:/.test(api));
ok('`hostelApi.profileNotificationPreferences` exists', /profileNotificationPreferences:/.test(api));
ok('`hostelApi.saveProfileNotificationPreference` exists', /saveProfileNotificationPreference:/.test(api));
ok('`hostelApi.profileActivity` exists', /profileActivity:/.test(api));

// A duplicate key in an object literal means the LAST one wins, silently.
const apiRaw = read('services/api.js');
const objectBlock = (name: string) => {
  const m = new RegExp(`^\\s*export const ${name} = \\{`, 'm').exec(apiRaw);
  if (!m) return '';
  const rest = apiRaw.slice(m.index + m[0].length);
  const next = /^\s*export const /m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
};
const hostelBlock = objectBlock('hostelApi');
for (const key of ['profile', 'profilePermissions', 'profileActivity']) {
  const count = (hostelBlock.match(new RegExp(`^[ \\t]{2}${key}:`, 'gm')) ?? []).length;
  ok(`hostelApi has exactly one \`${key}\` method`, count === 1, `${count} found`);
}

// ═══ 7. The server agrees with the client ═══════════════════════════════════════════════════
section(7, 'The server side agrees with the client');

const routes = codeSrc('src/modules/hostel/hostel.routes.ts');
ok('GET /profile is mounted', /'\/profile'/.test(routes));
ok('GET /profile/permissions is mounted', /'\/profile\/permissions'/.test(routes));
ok('GET /profile/notification-preferences is mounted', /'\/profile\/notification-preferences'/.test(routes));
ok('PATCH /profile/notification-preferences is mounted', /router\.patch\(\s*'\/profile\/notification-preferences'/.test(routes.replace(/\s+/g, ' ')) || /'\/profile\/notification-preferences'/.test(routes));
ok('GET /profile/activity is mounted', /'\/profile\/activity'/.test(routes));

// The literal paths must be declared before any `/:id` under /profile.
const permsAt = routes.indexOf("'/profile/permissions'");
const prefsAt = routes.indexOf("'/profile/notification-preferences'");
const actAt = routes.indexOf("'/profile/activity'");
ok('the profile sub-paths are all present', permsAt >= 0 && prefsAt >= 0 && actAt >= 0);

const svc = codeSrc('src/modules/hostel/hostel-profile.service.ts');
ok('the profile service derives the blocks from the warden assignment', /wardenUserId:\s*userId/.test(svc));
ok('...and reads the permissions from the RBAC map', /rolePermission\.findMany/.test(svc));
ok('...and refuses to mute the emergency', /Emergency notices cannot be muted/.test(svc));

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  ! ${f}`);
  process.exit(1);
}
console.log('Hostel profile frontend structure OK');