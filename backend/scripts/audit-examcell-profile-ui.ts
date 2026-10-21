/**
 * Suite: the exam-cell notification and profile screens, audited at the source level.
 * Docs: 05-exam-cell.md §3.7 and §3.8
 *
 * WHAT ONLY THE FRONTEND CAN GET WRONG
 * -------------------------------------
 *   1. REACHABILITY. Every profile sub-screen must be wired into FEATURE_MODULES. A screen that
 *      exists but is never registered is dead code, and a `navigate('ExamPermissions')` to an
 *      unregistered key renders NOTHING — `renderContent` finds nothing, falls through to the tab
 *      switcher, and the officer lands back on the profile with no error anywhere.
 *
 *   2. NO MOCK SURVIVES. The old screens held hardcoded figures and made ZERO calls into the API
 *      for the profile. The old notification screen FETCHED the inbox but then GUESSED the icon
 *      from the type string (`type.includes('EXAM')`), so a row the server had chrome for was
 *      drawn with the wrong icon. A mock compiles, renders and reads correctly, so the only way to
 *      catch one is to assert on the ABSENCE of literals and of the guessing.
 *
 *   3. NO DEAD BUTTON. Every menu row opens a real screen. The old profile's four rows opened
 *      `Alert.alert` dialogs that said nothing, and its "Logout" row showed an alert saying
 *      "Returning to login" and then did NOTHING — the token stayed.
 *
 *   4. THE API SURFACE MATCHES THE ROUTES, and every method the screens call EXISTS on
 *      `examcellApi`. A method that does not exist throws on the first render.
 *
 *   5. THE MUTE IS WRITTEN THROUGH, not held in local state. A toggle that only exists until the
 *      screen unmounts is a toggle that lies to the person who used it.
 *
 *   6. THE POLICY IS ON THE SCREENS. "Only the office composes important notices", "an important
 *      notice ignores the mute", "the sweep is idempotent" — these are decisions a controller is
 *      entitled to read, not behaviour to infer from a grey button.
 *
 *   7. THE FIXED DEFECTS STAY FIXED. The guessed icons, the dead menu rows, the local-only toggles
 *      and the no-op logout must not come back.
 *
 * Run: npx tsx scripts/audit-examcell-profile-ui.ts
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
    failures.push(`${label}${detail ? ` - ${detail}` : ''}`);
  }
}
function eq(actual: unknown, expected: unknown, label: string, detail = '') {
  ok(
    actual === expected,
    label,
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}${detail ? ` - ${detail}` : ''}`,
  );
}
const section = (n: string) => console.log(`\n-- ${n}`);

const NS = 'users/exam_cell/pages/notifications';
const PS = 'users/exam_cell/pages/profile';

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

const NOTIFY = `${NS}/notifications.js`;
const NOTIFY_UI = `${NS}/notificationsUi.js`;
const PROFILE = `${PS}/profile.js`;
const PROFILE_UI = `${PS}/profileUi.js`;
const PERMISSIONS = `${PS}/my_permissions/my_permissions.js`;
const ACTIVITY = `${PS}/activity/activity.js`;
const CHANGE_PW = `${PS}/change_password/change_password.js`;
const HELP = `${PS}/help_support/help_support.js`;
const SHELL = 'users/exam_cell/exam_cell.js';
const API = 'services/api.js';

const notifySrc = read(NOTIFY);
const notifyUiSrc = read(NOTIFY_UI);
const profileSrc = read(PROFILE);
const shellSrc = read(SHELL);
const apiSrc = read(API);
const notifyCode = stripComments(notifySrc);
const notifyUiCode = stripComments(notifyUiSrc);
const profileCode = stripComments(profileSrc);
const shellCode = stripComments(shellSrc);
const apiCode = stripComments(apiSrc);

// ═══ 1. Every screen exists ═══════════════════════════════════════════════════════════════════
section('1. Every screen exists');

for (const rel of [NOTIFY, NOTIFY_UI, PROFILE, PROFILE_UI, PERMISSIONS, ACTIVITY, CHANGE_PW, HELP]) {
  ok(fs.existsSync(path.join(LEARNIX, rel)), `${rel}: exists`);
}

// ═══ 2. Reachability ═══════════════════════════════════════════════════════════════════════════
section('2. Every sub-screen is REACHABLE');

const PROFILE_SUB_SCREENS: { key: string; file: string; label: string }[] = [
  { key: 'ExamPermissions', file: PERMISSIONS, label: 'Access & Permissions' },
  { key: 'ExamActivity', file: ACTIVITY, label: 'Sign-in history' },
  { key: 'ExamChangePassword', file: CHANGE_PW, label: 'Change Password' },
  { key: 'ExamHelpSupport', file: HELP, label: 'Help & Support' },
];

for (const s of PROFILE_SUB_SCREENS) {
  ok(shellCode.includes(`${s.key}:`), `FEATURE_MODULES has the key "${s.key}"`);
  ok(
    shellSrc.includes(`./pages/profile/`) || shellSrc.includes(s.file.replace(PS, './pages/profile')),
    `the "${s.key}" component is imported`,
  );
  const src = stripComments(read(s.file));
  ok(src.length > 0, `the "${s.key}" screen is not empty`);
  ok(/export default function/.test(src), `the "${s.key}" screen exports a component`);
  // The import path must be right. A path one level too high parses perfectly and fails only at
  // runtime, which is exactly the bug this feature shipped with.
  ok(
    src.includes("from '../../../../../services/api'") || !src.includes('services/api'),
    `the "${s.key}" screen imports the API at the right depth`,
  );
}

// The help screen's PARTS keys must also be registered, because it navigates to them.
const helpSrc = stripComments(read(HELP));
const helpKeys = [...helpSrc.matchAll(/key:\s*'([A-Za-z]+)'/g)].map((m) => m[1]);
ok(helpKeys.length >= 10, 'the help screen names the parts of the module');
for (const k of helpKeys) {
  ok(shellCode.includes(`${k}:`), `FEATURE_MODULES has the help link "${k}"`);
}

// ═══ 3. The API surface ══════════════════════════════════════════════════════════════════════
section('3. The API surface matches the routes');

const EXAM_METHODS = [
  'notificationCatalogue',
  'notifications',
  'markAllRead',
  'setNotificationRead',
  'sweepExamReminders',
  'broadcast',
  'broadcasts',
  'profile',
  'profilePermissions',
  'profileNotificationPreferences',
  'saveProfileNotificationPreference',
  'profileActivity',
];

for (const m of EXAM_METHODS) {
  ok(apiCode.includes(`${m}:`) || apiCode.includes(`${m}(`), `examcellApi has "${m}"`);
}

// Every examcellApi method the screens CALL must exist.
const called = new Set<string>();
for (const src of [notifyCode, profileCode, stripComments(read(PERMISSIONS)), stripComments(read(ACTIVITY)), stripComments(read(CHANGE_PW))]) {
  for (const m of src.matchAll(/examcellApi\.(\w+)/g)) called.add(m[1]!);
}
for (const m of called) {
  ok(apiCode.includes(`${m}:`) || apiCode.includes(`${m}(`), `examcellApi.${m} exists`);
}
ok(called.size >= 8, 'the screens call a real API surface', `${called.size} methods`);

// The ROUTES must exist on the server for the methods the client calls.
const routesSrc = readSrc('src/modules/examcell/examcell.routes.ts');
for (const route of [
  "'/notifications'",
  "'/notifications/catalogue'",
  "'/notifications/read-all'",
  "'/notifications/:id/read'",
  "'/notifications/reminders/sweep'",
  "'/broadcasts'",
  "'/profile'",
  "'/profile/permissions'",
  "'/profile/notification-preferences'",
  "'/profile/activity'",
]) {
  ok(routesSrc.includes(route), `the server has the route ${route}`);
}

// ═══ 4. No mock survives ══════════════════════════════════════════════════════════════════════
section('4. No mock survives');

// The old notification screen GUESSED the icon from the type string. That is the defect this audit
// exists to keep fixed.
ok(
  !/type\?*\.includes\(|type\.includes\(/.test(notifyCode),
  'the notification screen does not guess the icon from the type string',
);
ok(!/getIcon|getColor/.test(notifyCode), 'the notification screen has no getIcon/getColor guessers');
ok(notifyCode.includes('n.icon'), 'the notification screen uses the icon the SERVER sent');
ok(notifyCode.includes('n.color'), 'the notification screen uses the colour the SERVER sent');
ok(notifyCode.includes('n.categoryLabel'), 'the notification screen uses the category label the SERVER sent');

// The catalogue is fetched, not hardcoded.
ok(notifyCode.includes('examcellApi.notificationCatalogue()'), 'the catalogue is fetched from the server');
ok(notifyUiCode.includes('FALLBACK_CATEGORIES'), 'the fallback vocabulary is named');
ok(
  !/const CATEGORIES\s*=\s*\[/.test(notifyCode),
  'the screen does not declare its own category list as the primary source',
);

// The old profile held hardcoded figures and a hardcoded department line.
ok(
  !/Examinations Department/.test(profileCode),
  'the profile does not hardcode the department line as a fallback',
);
ok(profileCode.includes('profile?.department'), 'the profile shows the department the SERVER sent');
ok(profileCode.includes('profile?.institution'), 'the profile shows the institution the SERVER sent');
ok(
  !/1,248|\b42\b\s*Staff|Residents\s*:/i.test(profileCode),
  'the profile holds no hardcoded occupancy figures',
);

// The stats come from `responsibilities`, which the server derives.
ok(profileCode.includes('r?.examsCreated'), 'the exam count comes from the server');
ok(profileCode.includes('r?.invigilatorDuties'), 'the duty count comes from the server');
ok(profileCode.includes('r?.evaluationsOwned'), 'the evaluation count comes from the server');
ok(
  !/stats\?\./.test(profileCode),
  'the profile does not read the old institution-wide `stats` bag',
);

// ═══ 5. No dead button ═══════════════════════════════════════════════════════════════════════
section('5. No dead button');

// Every menu row navigates to a registered key.
for (const s of PROFILE_SUB_SCREENS) {
  ok(
    new RegExp(`key:\\s*'${s.key}'`).test(profileCode),
    `the profile menu has a row for "${s.key}"`,
  );
}
ok(profileCode.includes('navigation?.navigate?.(m.key)'), 'the menu rows navigate to their key');
ok(!/Alert\.alert\('Edit Profile'/.test(profileCode), 'there is no "Edit Profile" dead end');
ok(!/Alert\.alert\('Exam Reports'/.test(profileCode), 'there is no "Exam Reports" dead end');
ok(!/Alert\.alert\('Help & Support'/.test(profileCode), 'there is no "Help & Support" dead end');

// The logout ACTUALLY LOGS OUT.
ok(profileCode.includes('authApi.logout()'), 'the logout calls the real logout');
ok(
  !/onPress:\s*\(\)\s*=>\s*Alert\.alert\('Logged Out'/.test(profileCode),
  'the logout does not just show an alert saying it logged out',
);
ok(!/Returning to login/.test(profileCode), 'the logout does not claim to return to login without doing it');

// The notification screen's buttons all do something.
ok(notifyCode.includes('examcellApi.setNotificationRead'), 'a row can be marked read');
ok(notifyCode.includes('examcellApi.markAllRead'), 'the whole inbox can be marked read');
ok(notifyCode.includes('examcellApi.sweepExamReminders()'), 'the reminder sweep can be run');
ok(notifyCode.includes('examcellApi.broadcast('), 'a notice can be composed and sent');

// ═══ 6. The mute is written through ═════════════════════════════════════════════════════════════
section('6. The mute is written THROUGH, not held in local state');

ok(profileCode.includes('examcellApi.saveProfileNotificationPreference'), 'the mute is saved to the server');
ok(profileCode.includes('toggleMute'), 'the toggle writes through');
ok(
  !/const \[notifications,\s*setNotifications\]\s*=\s*useState\(true\)/.test(profileCode),
  'there is no local-only "App Notifications" toggle',
);
ok(
  !/const \[resultAlerts,\s*setResultAlerts\]\s*=\s*useState\(true\)/.test(profileCode),
  'there is no local-only "Result Publish Alerts" toggle',
);
// A boolean `useState(true)` is the exact shape of the dead toggles the old profile had. The
// `loading` flag is the one legitimate exception, so it is named rather than banned wholesale.
const booleanStates = [...profileCode.matchAll(/const \[(\w+),\s*set\1\]\s*=\s*useState\((true|false)\)/g)].map(
  (m) => m[1]!,
);
eq(
  booleanStates.filter((n) => n !== 'loading').length,
  0,
  'the profile holds no boolean toggle state other than the loading flag',
);

// The IMPORTANT notice cannot be muted, and the screen says so.
ok(profileCode.includes('c.mutable'), 'the profile honours the server\'s mutable flag');
ok(profileCode.includes('Always on'), 'a category that cannot be muted says so');

// ═══ 7. The policy is on the screens ════════════════════════════════════════════════════════════
section('7. The policy is on the screens');

ok(
  /only thing the exam office composes/i.test(notifyCode),
  'the composer says that only the office composes',
);
ok(/ignore/i.test(notifyCode), 'the screen says that important notices ignore the mutes');
ok(
  /ignores the\s+mutes/i.test(notifyCode),
  'the composer says so on the control itself, not only in a comment',
);
ok(
  /does not send a second reminder|already been reminded/i.test(notifyCode),
  'the screen says the sweep is idempotent',
);
ok(
  /forged|forge/i.test(notifyCode),
  'the screen says why the office cannot publish a result',
);

// ═══ 8. The category filters are wired ═════════════════════════════════════════════════════════
section('8. The filters and the paging are wired');

ok(notifyCode.includes('category: category ?? undefined'), 'the category filter is sent to the server');
ok(notifyCode.includes('unread: unreadOnly ?'), 'the unread filter is sent to the server');
ok(notifyCode.includes('important: importantOnly ?'), 'the important filter is sent to the server');
ok(notifyCode.includes('page: targetPage'), 'the page is sent to the server');
ok(notifyCode.includes('pageSize: PAGE_SIZE'), 'the page size is sent to the server');
ok(notifyCode.includes('loadMore'), 'there is a load-more');
ok(
  /pagination\??\.total|pagination\.total/.test(notifyCode),
  'the load-more knows the total',
);

// ═══ 9. The server owns the vocabulary ═══════════════════════════════════════════════════════
section('9. The server owns the vocabulary');

const rulesSrc = readSrc('src/modules/examcell/examcell-notifications.rules.ts');
for (const c of [
  'EXAM_SCHEDULE',
  'TIMETABLE_CHANGE',
  'HALL_TICKET',
  'EXAM_REMINDER',
  'EVALUATION_DEADLINE',
  'RESULT_PUBLICATION',
  'REVALUATION',
  'CHEATING_CASE',
  'IMPORTANT_NOTICE',
]) {
  ok(rulesSrc.includes(`'${c}'`), `the server declares the category ${c}`);
  ok(notifyUiSrc.includes(`'${c}'`), `the fallback agrees about ${c}`);
}

const platformRulesSrc = readSrc('src/modules/accounts/notifications.rules.ts');
for (const t of [
  'EXAM_SCHEDULED',
  'EXAM_PUBLISHED',
  'TIMETABLE_CHANGED',
  'HALL_TICKET_READY',
  'EXAM_REMINDER',
  'RESULT_PUBLISHED',
  'REVALUATION_DECIDED',
  'EVALUATION_DEADLINE',
  'EXAM_IMPORTANT',
  'EXAM_CHEATING',
  'EXAM_CELL_BROADCAST',
]) {
  ok(platformRulesSrc.includes(`${t}:`), `the platform registry holds the chrome for ${t}`);
}

// ═══ 10. The student reads the merged inbox ═══════════════════════════════════════════════════
section('10. The student inbox merges the exam vocabulary');

const studentRoutesSrc = readSrc('src/modules/student/student.routes.ts');
ok(
  studentRoutesSrc.includes('EXAM_CELL_NOTIFICATION_REGISTRY'),
  'the student route merges the exam cell registry',
);
ok(
  /mergeRegistries\(\s*FINANCE_REGISTRY,\s*HOSTEL_NOTIFICATION_REGISTRY,\s*EXAM_CELL_NOTIFICATION_REGISTRY/.test(
    studentRoutesSrc,
  ),
  'and merges it LAST, so the exam cell is authoritative for its own types',
);

// ═══ 11. The emitters are wired ═══════════════════════════════════════════════════════════════
section('11. Every emitter is wired into the service that raises the event');

const timetableSrc = readSrc('src/modules/examcell/timetable.service.ts');
ok(timetableSrc.includes('announceExamScheduled'), 'adding a slot announces the schedule');
ok(timetableSrc.includes('announceExamPublished'), 'publishing an exam announces the timetable');
ok(timetableSrc.includes('announceTimetableChange'), 'rescheduling a slot announces the change');

const hallticketSrc = readSrc('src/modules/examcell/hallticket.service.ts');
ok(hallticketSrc.includes('announceHallTickets'), 'publishing the hall tickets announces them');

const evaluationSrc = readSrc('src/modules/examcell/evaluation.service.ts');
ok(evaluationSrc.includes('announceEvaluationDeadline'), 'reminding the deadline announces it');
ok(
  !/the notification itself is X-09's job/.test(evaluationSrc),
  'the deadline service no longer says the notification is somebody else\'s job',
);

const resultSrc = readSrc('src/modules/examcell/result.service.ts');
ok(resultSrc.includes('announceResultPublished'), 'publishing a result announces it');
ok(resultSrc.includes('announceRevaluationDecided'), 'deciding a revaluation announces it');

const cheatingSrc = readSrc('src/modules/examcell/cheating.write.ts');
ok(cheatingSrc.includes("from './examcell-notifications.service.js'"), 'the cheating desk uses the one writer');
ok(
  !/prisma\.notification\.create\(/.test(cheatingSrc),
  'the cheating desk no longer open-codes its own notification write',
);

// ═══ 12. The old service functions are gone ═══════════════════════════════════════════════════
section('12. The old flat inbox and the old profile bag are GONE');

const examcellServiceSrc = stripComments(readSrc('src/modules/examcell/examcell.service.ts'));
ok(
  !/export async function listNotifications/.test(examcellServiceSrc),
  'the old flat 50-row inbox is removed',
);
ok(!/export async function markAllRead/.test(examcellServiceSrc), 'the old mark-all-read is removed');
ok(!/export async function createBroadcast/.test(examcellServiceSrc), 'the old broadcast composer is removed');
ok(!/export async function getProfile/.test(examcellServiceSrc), 'the old profile bag is removed');
ok(
  !/type:\s*'EXAM_CELL_BROADCAST'/.test(examcellServiceSrc),
  'the old service does not write an unregistered type',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
