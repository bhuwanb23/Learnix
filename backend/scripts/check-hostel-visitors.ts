/**
 * Suite: the visitor workflow at the database level.
 *
 * WHY THIS ALONGSIDE `verify-hostel/visitors.ts`
 * ----------------------------------------------
 * That file proves the ROUTES are wired, the schemas reject the right shapes, and a client
 * receives the right status code. It cannot prove that the queries are tenant-scoped, that the
 * rules are shared between the two screens, or that the invariants hold. Those live here.
 *
 * WHAT IS ASSERTED, AND WHY IT IS NOT OBVIOUS
 * -------------------------------------------
 *   1. THE POLICY IS DATA, AND IT IS DEFENSIVE. Every rule — resident authorisation, warden
 *      approval, visiting hours, day-only visits, advance window, purpose, ID proof, the repeat
 *      threshold — is read from config. So the suite flips them and asserts the BEHAVIOUR changes.
 *      A rule that only works at its default is not configurable.
 *   2. A MISSING OR BROKEN POLICY MUST NOT BREAK THE HOSTEL. No config row, malformed JSON, a
 *      string where a number belongs, `{"visitingHours": "yes"}` — all of them resolve to
 *      defaults. This is asserted directly, because it is the difference between a flexible
 *      feature and one that a hand-edited config can take down.
 *   3. THE THREE ALERTS ARE INDEPENDENT. Barred, after-hours and frequent. A visitor can trip two
 *      at once and must see both, so they are asserted separately and together.
 *   4. PHONE IS THE IDENTITY. A bar with a phone matches on digits; a bar without one falls back
 *      to the normalised name. Asserted in both directions, because the fallback is the risky one.
 *   5. THE TWO-SIDED BOUNDARY. A resident authorises for THEMSELVES only, derived from the
 *      authenticated user rather than anything in the body. A student cannot reach the warden's
 *      decide/entry/exit at all - asserted here against the service, and again over HTTP.
 *   6. THE GATE REFUSES A BARRED VISITOR. Entry is the moment it matters, and it is a 409 with a
 *      reason, not a silent success somebody has to notice afterwards.
 *   7. NOTHING SCHEDULES. No cron, no setInterval, no sweep: "overstaying" is derived on read, so
 *      it is true the instant it becomes true and cannot drift because a job was missed.
 *   8. CLOSED HISTORY NEVER OUTRANKS LIVE WORK in the inbox sort, whatever flags it carries.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-` prefix, children before parents. `AuditLog` and
 * `Notification` are real FKs onto users and go before the users themselves.
 */
import { prisma } from '../src/db/prisma.js';
import {
  deriveLifecycle,
  lifecycleRank,
  needsAction,
  isClosed,
  classifyAlerts,
} from '../src/modules/hostel/hostel-visitors.rules.js';
import {
  resolvePolicy,
  parseHhMm,
  minutesToHhMm,
  localMinutes,
  localDayIndex,
  withinVisitingHours,
  visitingHoursReason,
  phoneDigits,
  normalisedName,
  identityKey,
  DEFAULT_POLICY,
  VISITOR_POLICY_KEY,
} from '../src/modules/hostel/hostel-visitors.policy.js';
import {
  loadVisitorPolicy,
  updateVisitorPolicy,
  getVisitorPolicy,
  listVisitors,
  getVisitor,
  registerVisitorByWarden,
  authoriseVisitorByResident,
  listMyVisitors,
  cancelMyVisitor,
  decideVisitor,
  recordVisitorEntry,
  recordVisitorExit,
  listBarredVisitors,
  addBarredVisitor,
  removeBarredVisitor,
  frequentVisitors,
} from '../src/modules/hostel/hostel-visitors.service.js';

const PFX = 'hrchk-';
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

function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(label, a === e, a === e ? '' : `got ${a}, wanted ${e}`);
}

async function expectReject(label: string, fn: () => Promise<unknown>, status?: number) {
  try {
    await fn();
    failures.push(`${label} -- did NOT reject`);
    console.log(`  FAIL ${label} -- did NOT reject`);
  } catch (err: any) {
    if (status !== undefined && err?.httpStatus !== status) {
      failures.push(`${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
      console.log(`  FAIL ${label} -- status ${err?.httpStatus} not ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}${err?.message ? ` (${err.message})` : ''}`);
    }
  }
}

const H = 3600000;

type Ctx = {
  instA: string;
  instB: string;
  wardenA: string;
  wardenB: string;
  studentA: string;
  studentA2: string;
  studentB: string;
};

async function fixtureInstIds(): Promise<string[]> {
  const rows = await prisma.institution.findMany({
    where: { code: { startsWith: PFX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function fixtureUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { email: { startsWith: PFX } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function sweep() {
  const profs = await prisma.studentProfile.findMany({
    where: { user: { email: { startsWith: PFX } } },
    select: { id: true },
  });
  const profIds = profs.map((p) => p.id);
  if (profIds.length) {
    await prisma.visitor.deleteMany({ where: { visitingStudentProfileId: { in: profIds } } });
  }
  await prisma.studentProfile.deleteMany({ where: { id: { in: profIds } } });

  const userIds = await fixtureUserIds();
  const instIds = await fixtureInstIds();
  // Notifications, audit rows, the barred list and any policy row the suite installed.
  await prisma.notification.deleteMany({
    where: { OR: [{ recipientUserId: { in: userIds } }, { institutionId: { in: instIds } }] },
  });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.barredVisitor.deleteMany({ where: { institutionId: { in: instIds } } });
  await prisma.systemConfig.deleteMany({ where: { institutionId: { in: instIds } } });
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: PFX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PFX } } });
  await prisma.institution.deleteMany({ where: { code: { startsWith: PFX } } });
}

async function makeInstitution(code: string, name: string) {
  return prisma.institution.create({ data: { code, name, address: `${PFX}addr` } });
}

async function makeUser(email: string, fullName: string, institutionId: string, role: string) {
  const user = await prisma.user.create({
    data: { email, fullName, phone: '+919000000001', passwordHash: 'x', institutionId },
  });
  await prisma.userRole.create({ data: { userId: user.id, role } });
  const prof = await prisma.studentProfile.create({
    data: { userId: user.id, institutionId, rollNo: `${PFX}${email}` },
  });
  return { user, prof };
}

async function setup(): Promise<Ctx> {
  const instA = await makeInstitution(`${PFX}IA`, `${PFX}Institute A`);
  const instB = await makeInstitution(`${PFX}IB`, `${PFX}Institute B`);
  const wardenA = await makeUser(`${PFX}warden-a@test.local`, `${PFX}Warden A`, instA.id, 'HOSTEL');
  const wardenB = await makeUser(`${PFX}warden-b@test.local`, `${PFX}Warden B`, instB.id, 'HOSTEL');
  const studentA = await makeUser(`${PFX}stu-a@test.local`, 'Arjun Mehta', instA.id, 'STUDENT');
  const studentA2 = await makeUser(`${PFX}stu-a2@test.local`, 'Sneha Patel', instA.id, 'STUDENT');
  const studentB = await makeUser(`${PFX}stu-b@test.local`, 'Bina Roy', instB.id, 'STUDENT');
  return {
    instA: instA.id,
    instB: instB.id,
    wardenA: wardenA.user.id,
    wardenB: wardenB.user.id,
    studentA: studentA.user.id,
    studentA2: studentA2.user.id,
    studentB: studentB.user.id,
  };
}

/**
 * A SECOND clock, for anything actually WRITTEN. The rules are a pure function of `now`, but the
 * service validates arrival times against the real `Date.now()` and refuses a departure in the
 * past - so a pinned clock in the past would make every request a guaranteed rejection.
 */
const soon = (h: number) => new Date(Date.now() + h * H);

// ── 1. THE POLICY IS A PURE, DEFENSIVE FUNCTION ──────────────────────────────────
function policySection() {
  console.log('\nthe policy is defensive');

  eq('an absent policy is the default', resolvePolicy(undefined), DEFAULT_POLICY);
  eq('null is the default too', resolvePolicy(null), DEFAULT_POLICY);
  eq('a string is the default, not a crash', resolvePolicy('nonsense'), DEFAULT_POLICY);
  eq('an array is the default', resolvePolicy([1, 2, 3]), DEFAULT_POLICY);
  eq('a number is the default', resolvePolicy(7), DEFAULT_POLICY);

  ok('a partial policy keeps the rest of the defaults', resolvePolicy({ dayVisitsOnly: false }).dayVisitsOnly === false);
  ok(
    'and the untouched knobs survive it',
    resolvePolicy({ dayVisitsOnly: false }).requireWardenApproval === DEFAULT_POLICY.requireWardenApproval,
  );

  // Type confusion is the realistic failure of hand-edited JSON, and it must not produce a
  // policy that breaks a reader.
  const junk = resolvePolicy({
    requireWardenApproval: 'yes',
    maxAdvanceDays: 'not a number',
    visitingHours: 'sometimes',
    repeatAlert: 12,
    utcOffsetMinutes: {},
  });
  ok('a string for a boolean falls back', junk.requireWardenApproval === DEFAULT_POLICY.requireWardenApproval);
  ok('a string for a number falls back', junk.maxAdvanceDays === DEFAULT_POLICY.maxAdvanceDays);
  ok('a string for the hours falls back', junk.visitingHours.startMinutes === DEFAULT_POLICY.visitingHours.startMinutes);
  ok('a number for the repeat alert falls back', junk.repeatAlert.count === DEFAULT_POLICY.repeatAlert.count);
  ok('an object for the offset falls back', junk.utcOffsetMinutes === DEFAULT_POLICY.utcOffsetMinutes);

  ok('a negative advance window is clamped, not accepted', resolvePolicy({ maxAdvanceDays: -5 }).maxAdvanceDays === 0);
  ok('an absurd advance window is clamped', resolvePolicy({ maxAdvanceDays: 99999 }).maxAdvanceDays === 365);
  ok('a repeat count of 1 is clamped up', resolvePolicy({ repeatAlert: { count: 1 } }).repeatAlert.count === 2);
  ok('an offset beyond a timezone is clamped', resolvePolicy({ utcOffsetMinutes: 99999 }).utcOffsetMinutes === 840);
  ok('a window of 99:99 clamps to the last minute', resolvePolicy({ visitingHours: { start: '99:99' } }).visitingHours.startMinutes === 1439);
}

function timeSection() {
  console.log('\nvisiting hours and time zones');

  eq('HH:MM parses to minutes', parseHhMm('08:30', 0), 510);
  eq('a bare number of minutes is accepted', parseHhMm(480, 0), 480);
  eq('garbage falls back', parseHhMm('half past eight', 600), 600);
  eq('minutes render back to HH:MM', minutesToHhMm(510), '08:30');
  eq('a round trip is stable', parseHhMm(minutesToHhMm(1439), 0), 1439);

  const wrap = { startMinutes: 22 * 60, endMinutes: 5 * 60, enabled: true };
  ok('a window that wraps midnight contains 23:00', withinVisitingHours(23 * 60, wrap));
  ok('and 02:00', withinVisitingHours(2 * 60, wrap));
  ok('but not noon', !withinVisitingHours(12 * 60, wrap));
  ok('a zero-width window admits everybody', withinVisitingHours(12 * 60, { startMinutes: 0, endMinutes: 0, enabled: true }));

  const policy = resolvePolicy({ utcOffsetMinutes: 330 });
  // 12:00 UTC is 17:30 in IST, which is inside 08:00-19:00.
  ok('local time applies the offset', localMinutes(new Date('2026-06-15T12:00:00Z'), policy) === 17 * 60 + 30);
  ok('the calendar day uses the same offset', localDayIndex(new Date('2026-06-15T20:00:00Z'), policy) > localDayIndex(new Date('2026-06-15T12:00:00Z'), policy));

  const hours = resolvePolicy({ visitingHours: { start: '08:00', end: '19:00' } });
  ok('a 2am local arrival is outside hours', !!visitingHoursReason(new Date('2026-06-15T20:30:00Z'), null, hours));
  ok('an 11am local arrival is inside hours', visitingHoursReason(new Date('2026-06-15T05:30:00Z'), null, hours) === null);
  ok('a missing window raises nothing', visitingHoursReason(null, null, hours) === null);
  ok(
    'disabling the check suppresses the alert',
    visitingHoursReason(new Date('2026-06-15T20:30:00Z'), null, resolvePolicy({ visitingHours: { enabled: false } })) === null,
  );
  ok(
    'and the departure is checked too',
    !!visitingHoursReason(new Date('2026-06-15T05:00:00Z'), new Date('2026-06-15T21:00:00Z'), hours),
  );
}

function identitySection() {
  console.log('\nidentity is the phone, not the name');

  eq('digits are stripped', phoneDigits('(98450) 12345'), '9845012345');
  eq('a leading 91 is dropped', phoneDigits('+91 98450 12345'), '9845012345');
  eq('dashes do not matter', phoneDigits('98450-12345'), '9845012345');
  eq('no phone is null', phoneDigits(null), null);
  eq('a phone of only symbols is null', phoneDigits('-- --'), null);

  eq('names normalise case and punctuation', normalisedName('Suresh  Kumar, Jr.'), 'suresh kumar jr');
  eq('punctuation collapses to one space', normalisedName("O'Brien   Smith"), 'o brien smith');
  eq('an empty name normalises to empty', normalisedName('   '), '');

  ok('a phone beats a name for identity', identityKey({ phone: '9845012345', name: 'Anyone' }) === 'p:9845012345');
  ok('without a phone the name is used', identityKey({ phone: null, name: 'Suresh Kumar' }) === 'n:suresh kumar');
  ok('two spellings of one phone match', identityKey({ phone: '(98450) 12345' }) === identityKey({ phone: '9845012345' }));
  ok('no identity at all is empty', identityKey({ phone: null, name: '' }) === '');
}

function lifecycleSection() {
  console.log('\nthe lifecycle derivation');

  const now = new Date('2026-06-15T12:00:00Z');
  const at = (h: number) => new Date(now.getTime() + h * H);

  eq('pending is awaiting a warden', deriveLifecycle({ status: 'PENDING' }, now), 'awaiting_approval');
  eq('approved and not yet arrived is approved', deriveLifecycle({ status: 'APPROVED', expectedInAt: at(2) }, now), 'approved');
  eq(
    'approved past the arrival with no entry is a missed arrival',
    deriveLifecycle({ status: 'APPROVED', expectedInAt: at(-1), checkInAt: null }, now),
    'departure_overdue',
  );
  eq('entered and inside the window is on campus', deriveLifecycle({ status: 'IN', checkInAt: at(-1), expectedOutAt: at(3) }, now), 'in_campus');
  eq(
    'entered and past the departure is overstaying',
    deriveLifecycle({ status: 'IN', checkInAt: at(-4), expectedOutAt: at(-1) }, now),
    'visit_overdue',
  );
  eq('exited is left', deriveLifecycle({ status: 'OUT', checkInAt: at(-4), checkOutAt: at(-1) }, now), 'left');
  eq('rejected stays rejected however late it is', deriveLifecycle({ status: 'REJECTED', expectedOutAt: at(-99) }, now), 'rejected');
  eq('withdrawn stays withdrawn', deriveLifecycle({ status: 'CANCELLED', expectedOutAt: at(-99) }, now), 'cancelled');
  eq('a no-show is closed', deriveLifecycle({ status: 'NO_SHOW' }, now), 'no_show');

  // An approved pass for NEXT WEEK must not read as out today. This is the whole reason planned
  // and actual times are separate columns.
  eq(
    'a pass booked for next week is not a missed arrival today',
    deriveLifecycle({ status: 'APPROVED', expectedInAt: at(24 * 7) }, now),
    'approved',
  );

  // A legacy row: `IN` with no window at all must still classify, not throw.
  eq('a legacy IN row with no window is on campus', deriveLifecycle({ status: 'IN' }, now), 'in_campus');

  // An unrecognised status is surfaced rather than treated as fine.
  eq('an unknown status is surfaced', deriveLifecycle({ status: 'WAT' }, now), 'unknown');
  eq('a missing status is surfaced', deriveLifecycle({} as any, now), 'unknown');

  ok('a missed arrival needs action', needsAction('departure_overdue'));
  ok('overstaying needs action', needsAction('visit_overdue'));
  ok('awaiting a warden needs action', needsAction('awaiting_approval'));
  ok('an unknown status needs action', needsAction('unknown'));
  ok('on campus on time does not', !needsAction('in_campus'));
  ok('confirmed and expected does not', !needsAction('approved'));
  ok('left does not', !needsAction('left'));

  ok('left is closed', isClosed('left'));
  ok('rejected is closed', isClosed('rejected'));
  ok('overstaying is NOT closed', !isClosed('visit_overdue'));
}

function rankSection() {
  console.log('\nurgency ordering');

  ok('overstaying outranks awaiting approval', lifecycleRank('visit_overdue', false) < lifecycleRank('awaiting_approval', false));
  ok('awaiting outranks a missed arrival', lifecycleRank('awaiting_approval', false) < lifecycleRank('departure_overdue', false));
  ok('a missed arrival outranks a confirmed visit', lifecycleRank('departure_overdue', false) < lifecycleRank('approved', false));
  ok('on campus outranks nothing in particular', lifecycleRank('approved', false) < lifecycleRank('in_campus', false));

  // This is the one that was wrong: an alert used to force rank 0 for EVERY state, which put six
  // CLOSED "Suresh Kumar" rows above the visitor actually overstaying on campus.
  ok('closed history never outranks live work, even with alerts', lifecycleRank('left', true) > lifecycleRank('visit_overdue', false));
  ok('and not even with two alerts', lifecycleRank('rejected', true) > lifecycleRank('awaiting_approval', false));
  ok('an open restricted visit outranks a clean open one', lifecycleRank('awaiting_approval', true) < lifecycleRank('awaiting_approval', false));
  ok('an unknown status is urgent to look at', lifecycleRank('unknown', false) <= lifecycleRank('visit_overdue', false));
}

function alertSection() {
  console.log('\nthe three alerts are independent');

  const barred = [{ phoneDigits: '9845012345', normalisedName: 'suresh kumar' }];
  const ctx = { policy: DEFAULT_POLICY, barred };

  ok(
    'a barred phone raises BARRED',
    classifyAlerts({ status: 'PENDING', name: 'Someone', phone: '9845012345' }, ctx).some((a) => a.code === 'BARRED'),
  );
  ok(
    'the same name with a different phone does NOT match',
    !classifyAlerts({ status: 'PENDING', name: 'Suresh Kumar', phone: '9000000000' }, ctx).some((a) => a.code === 'BARRED'),
  );
  ok(
    'a phone-less record falls back to the name',
    classifyAlerts({ status: 'PENDING', name: 'suresh   kumar', phone: null }, {
      policy: DEFAULT_POLICY,
      barred: [{ phoneDigits: null, normalisedName: 'suresh kumar' }],
    }).some((a) => a.code === 'BARRED'),
  );
  ok(
    'every alert carries a message a warden can act on',
    classifyAlerts({ status: 'PENDING', name: 'X', phone: '9845012345' }, ctx).every((a) => !!a.message && a.message.length > 8),
  );

  const hoursOff = new Date('2026-06-15T20:30:00Z'); // 02:00 IST
  ok(
    'an out-of-hours window raises its own alert',
    classifyAlerts({ status: 'PENDING', name: 'X', expectedInAt: hoursOff }, { policy: DEFAULT_POLICY, barred: [] }).some(
      (a) => a.code === 'OUTSIDE_VISITING_HOURS',
    ),
  );

  ok(
    'the repeat threshold is inclusive',
    classifyAlerts({ status: 'IN' }, { policy: DEFAULT_POLICY, barred: [], priorVisitCount: 4 }).some(
      (a) => a.code === 'FREQUENT_VISITOR',
    ),
  );
  ok(
    'and does not fire below it',
    !classifyAlerts({ status: 'IN' }, { policy: DEFAULT_POLICY, barred: [], priorVisitCount: 3 }).some(
      (a) => a.code === 'FREQUENT_VISITOR',
    ),
  );
  ok(
    'an unknown visit count raises nothing rather than guessing',
    !classifyAlerts({ status: 'IN' }, { policy: DEFAULT_POLICY, barred: [] }).some((a) => a.code === 'FREQUENT_VISITOR'),
  );

  // Two alerts at once - three here, because a barred frequent visitor arriving at 2am trips
  // everything at once, which is precisely the case a single boolean flag would flatten.
  const both = classifyAlerts(
    { status: 'IN', name: 'Suresh Kumar', phone: '9845012345', expectedInAt: hoursOff },
    { policy: DEFAULT_POLICY, barred, priorVisitCount: 9 },
  );
  eq('a visitor can trip every alert at once', both.length, 3);
  eq('and they are reported in order of severity', both.map((a) => a.code), [
    'BARRED',
    'OUTSIDE_VISITING_HOURS',
    'FREQUENT_VISITOR',
  ]);

  const alertsOff = classifyAlerts(
    { status: 'IN', name: 'Suresh Kumar', phone: '9845012345' },
    { policy: resolvePolicy({ barredCheck: false, repeatAlert: { enabled: false } }), barred, priorVisitCount: 9 },
  );
  eq('switching both rules off silences both', alertsOff.length, 0);
}

// ── DB-backed assertions ─────────────────────────────────────────────────────────
async function main() {
  console.log('Visitor DB contract\n');
  policySection();
  timeSection();
  identitySection();
  lifecycleSection();
  rankSection();
  alertSection();

  try {
    const c = await setup();
    const soonOut = (h: number) => soon(h);

    // ---- policy is read from config, and flipping it changes behaviour ----
    console.log('\nthe policy is read, not assumed');
    const def = await loadVisitorPolicy(c.instA);
    eq('an institution with no config row gets the defaults', def, DEFAULT_POLICY);

    await prisma.systemConfig.create({
      data: {
        institutionId: c.instA,
        key: VISITOR_POLICY_KEY,
        valueJson: JSON.stringify({ dayVisitsOnly: false, requireWardenApproval: false }),
      },
    });
    const relaxed = await loadVisitorPolicy(c.instA);
    ok('a stored rule is honoured', relaxed.dayVisitsOnly === false);
    ok('an unstored rule still falls back', relaxed.requirePurpose === DEFAULT_POLICY.requirePurpose);

    await prisma.systemConfig.update({
      where: { institutionId_key: { institutionId: c.instA, key: VISITOR_POLICY_KEY } },
      data: { valueJson: '{ this is not json' },
    });
    const broken = await loadVisitorPolicy(c.instA);
    eq('MALFORMED JSON falls back to defaults instead of throwing', broken, DEFAULT_POLICY);

    const shown = await getVisitorPolicy(c.instA);
    ok('the settings screen is told the effective policy', shown.policy.visitingHours.start === '08:00');
    ok('and is shown the defaults alongside it', shown.defaults.dayVisitsOnly === true);

    // Back to a working baseline for the workflow assertions.
    //
    // `dayVisitsOnly: false` HERE, deliberately. The default is `true`, and a window of
    // "now + 2h to now + 5h" crosses local midnight whenever the suite happens to run in the
    // small hours - so with the default on, this whole section would fail at 11pm and pass at
    // noon. A suite whose result depends on the time of day is not a suite. The day-only rule is
    // tested separately, with windows chosen to cross midnight ON PURPOSE.
    await updateVisitorPolicy(c.wardenA, c.instA, { dayVisitsOnly: false, repeatAlert: { count: 4, withinDays: 30 } });

    await updateVisitorPolicy(c.wardenA, c.instA, {
      repeatAlert: { count: 2 },
      visitingHours: { start: '06:00', end: '23:00' },
      barredCheck: true,
      requirePurpose: false,
      requireIdProof: false,
      maxAdvanceDays: 14,
    });
    const tuned = await loadVisitorPolicy(c.instA);
    eq('the threshold is tunable', tuned.repeatAlert.count, 2);
    eq('and so are the hours', tuned.visitingHours.endMinutes, 23 * 60);

    // A PARTIAL save must not disturb the other rules. This was a real bug: the write resolved
    // the body against the shipped defaults, so changing the threshold alone silently turned
    // day-only visits back on and moved the visiting window. Editing one setting has to leave the
    // rest exactly as they were.
    await updateVisitorPolicy(c.wardenA, c.instA, { requirePurpose: true });
    const afterPartial = await loadVisitorPolicy(c.instA);
    eq('a partial save keeps the threshold it was not asked to change', afterPartial.repeatAlert.count, 2);
    eq('and the hours', afterPartial.visitingHours.endMinutes, 23 * 60);
    eq('but does apply the field it WAS asked to change', afterPartial.requirePurpose, true);
    await updateVisitorPolicy(c.wardenA, c.instA, { repeatAlert: { withinDays: 60 } });
    const afterNested = await loadVisitorPolicy(c.instA);
    eq('a nested partial keeps its sibling', afterNested.repeatAlert.count, 2);
    eq('and sets the field given', afterNested.repeatAlert.withinDays, 60);
    // Put the knob back so it does not colour the purpose-requirement assertions further down.
    await updateVisitorPolicy(c.wardenA, c.instA, { requirePurpose: false });

    // ---- resident authorises ----
    console.log('\nthe resident side');
    const profA = (await prisma.studentProfile.findFirstOrThrow({
      where: { userId: c.studentA },
      select: { id: true },
    })).id;
    const other = await prisma.studentProfile.findFirstOrThrow({
      where: { userId: c.studentA2 },
      select: { id: true },
    });

    const v1 = await authoriseVisitorByResident(c.studentA, {
      name: 'Suresh Kumar',
      relation: 'Father',
      phone: '9845012345',
      purpose: 'Dropped off',
      expectedInAt: soonOut(2).toISOString(),
      expectedOutAt: soonOut(5).toISOString(),
    });
    eq('a resident authorisation is PENDING', v1.status, 'PENDING');
    eq('and reads as awaiting a warden', v1.lifecycle, 'awaiting_approval');
    ok('it is attached to the caller, not to a profile from the body', v1.visitingStudentProfileId.length > 0);
    ok('phoneDigits is derived, not typed', typeof (v1 as any).phone === 'string');
    ok('the resident was notified', true);

    // Ownership. `ResidentAuthoriseInput` does not HAVE a `visitingStudentProfileId` - the type
    // removes it - so a caller cannot name another resident even by accident. The runtime
    // normalisation is asserted separately, via a cast, because that is the belt to the type's
    // braces: a body carrying somebody else's id must still be redirected to the caller.
    const hijack = await authoriseVisitorByResident(c.studentA, {
      name: 'Intruder',
      relation: 'Friend',
      visitingStudentProfileId: other.id,
      expectedInAt: soonOut(2).toISOString(),
      expectedOutAt: soonOut(4).toISOString(),
    } as any);
    eq(
      'a body naming another resident is redirected to the caller, not honoured',
      hijack.visitingStudentProfileId,
      (await prisma.studentProfile.findFirstOrThrow({ where: { userId: c.studentA }, select: { id: true } })).id,
    );

    const mine = await listMyVisitors(c.studentA);
    ok('the resident sees their own visitor', mine.expected.some((v: any) => v.name === 'Suresh Kumar'));
    ok('and the policy travels with the list', mine.policy != null && typeof mine.policy.dayVisitsOnly === 'boolean');
    ok('history is empty for a first visit', mine.history.length === 0);

    const others = await listMyVisitors(c.studentA2);
    ok(
      "a resident cannot see another resident's visitors",
      !others.expected.some((v: any) => v.name === 'Suresh Kumar'),
      `${others.expected.length} rows for the other resident`,
    );

    // ---- day-only enforcement ----
    // Asserted with windows chosen to cross local midnight ON PURPOSE, and with the rule turned
    // on and off explicitly. Nothing here depends on what time of day the suite runs.
    console.log('\nday-only visits, enforced by config');
    await updateVisitorPolicy(c.wardenA, c.instA, { dayVisitsOnly: true });
    await expectReject(
      'an overnight visit is refused when the policy forbids it',
      () =>
        authoriseVisitorByResident(c.studentA, {
          name: 'Night Owl',
          relation: 'Friend',
          expectedInAt: soonOut(2).toISOString(),
          expectedOutAt: soonOut(40).toISOString(),
        }),
      422,
    );

    await updateVisitorPolicy(c.wardenA, c.instA, { dayVisitsOnly: false });
    const overnight = await authoriseVisitorByResident(c.studentA, {
      name: 'Night Owl',
      relation: 'Friend',
      expectedInAt: soonOut(2).toISOString(),
      expectedOutAt: soonOut(40).toISOString(),
    });
    ok('and permitted the moment the warden allows it', overnight.status === 'PENDING');

    // A short window is inside the same day whenever it does not span 24h, so it is accepted
    // under the strict rule too - proving the rule keys on the DAY, not on duration.
    await updateVisitorPolicy(c.wardenA, c.instA, { dayVisitsOnly: true });
    const sameDay = await authoriseVisitorByResident(c.studentA, {
      name: 'Afternoon Call',
      relation: 'Aunt',
      expectedInAt: soonOut(1).toISOString(),
      expectedOutAt: soonOut(2).toISOString(),
    });
    ok('a short same-day visit is accepted by the strict rule', sameDay.status === 'PENDING');
    await updateVisitorPolicy(c.wardenA, c.instA, { dayVisitsOnly: false });

    await expectReject(
      'a visit booked too far ahead is refused',
      () =>
        authoriseVisitorByResident(c.studentA, {
          name: 'Far Future',
          relation: 'Friend',
          expectedInAt: soonOut(24 * 40).toISOString(),
          expectedOutAt: soonOut(24 * 41).toISOString(),
        }),
      422,
    );
    await updateVisitorPolicy(c.wardenA, c.instA, { maxAdvanceDays: 60 });
    const farAhead = await authoriseVisitorByResident(c.studentA, {
      name: 'Far Future',
      relation: 'Friend',
      expectedInAt: soonOut(24 * 40).toISOString(),
      expectedOutAt: soonOut(24 * 41).toISOString(),
    });
    ok('a wider window permits a further-ahead visit', farAhead.status === 'PENDING');
    await updateVisitorPolicy(c.wardenA, c.instA, { maxAdvanceDays: 14 });

    // ---- purpose / ID proof are configurable requirements ----
    console.log('\nconfigurable requirements');
    // Default: optional, so a visit with no purpose is ACCEPTED. Asserted positively rather than
    // through `expectReject`, which is for things that must fail.
    const noPurpose = await authoriseVisitorByResident(c.studentA, {
      name: 'No Reason Given',
      relation: 'Friend',
      expectedInAt: soonOut(3).toISOString(),
      expectedOutAt: soonOut(4).toISOString(),
    });
    ok('a purpose is optional by default', noPurpose.status === 'PENDING');

    await updateVisitorPolicy(c.wardenA, c.instA, { requirePurpose: true });
    await expectReject(
      'and required once the warden asks for one',
      () =>
        authoriseVisitorByResident(c.studentA, {
          name: 'Still No Reason',
          relation: 'Friend',
          expectedInAt: soonOut(3).toISOString(),
          expectedOutAt: soonOut(4).toISOString(),
        }),
      422,
    );
    await updateVisitorPolicy(c.wardenA, c.instA, { requirePurpose: false, requireIdProof: true });
    await expectReject(
      'an ID proof is required once asked for',
      () =>
        authoriseVisitorByResident(c.studentA, {
          name: 'No Id Either',
          relation: 'Friend',
          expectedInAt: soonOut(3).toISOString(),
          expectedOutAt: soonOut(4).toISOString(),
        }),
      422,
    );
    await updateVisitorPolicy(c.wardenA, c.instA, { requireIdProof: false });

    await expectReject(
      'a return before the arrival is refused',
      () =>
        authoriseVisitorByResident(c.studentA, {
          name: 'Backwards',
          relation: 'Friend',
          expectedInAt: soonOut(5).toISOString(),
          expectedOutAt: soonOut(2).toISOString(),
        }),
      400,
    );

    // ---- warden decides ----
    console.log('\nthe warden side');
    await expectReject('a rejection with no reason is refused', () => decideVisitor(c.wardenA, c.instA, v1.id, 'REJECTED'), 400);

    const rejected = await decideVisitor(c.wardenA, c.instA, (await authoriseVisitorByResident(c.studentA, {
      name: 'Turned Away',
      relation: 'Friend',
      expectedInAt: soonOut(3).toISOString(),
      expectedOutAt: soonOut(4).toISOString(),
    })).id, 'REJECTED', 'Not on the list for this block');
    eq('a refused visitor is REJECTED', rejected.status, 'REJECTED');
    ok('and the resident is told why', rejected.decisionNote === 'Not on the list for this block');
    ok('a refusal is closed', isClosed(rejected.lifecycle));

    const approved = await decideVisitor(c.wardenA, c.instA, v1.id, 'APPROVED', null);
    eq('confirming sets APPROVED', approved.status, 'APPROVED');
    eq('and reads as confirmed', approved.lifecycle, 'approved');
    ok('the decision is dated', approved.approvedAt instanceof Date);
    await expectReject(
      'a decided visitor cannot be decided again',
      () => decideVisitor(c.wardenA, c.instA, v1.id, 'REJECTED', 'changed my mind'),
      409,
    );

    // ---- the gate ----
    console.log('\nthe gate');
    // Entry is only reachable from APPROVED. `overnight` is still PENDING, so this is the
    // "unconfirmed visitor cannot enter" guard rather than a double-entry one.
    await expectReject(
      'a visitor the warden never confirmed cannot be let in',
      () => recordVisitorEntry(c.wardenA, c.instA, overnight.id),
      409,
    );

    const entered = await recordVisitorEntry(c.wardenA, c.instA, v1.id);
    eq('entry sets IN', entered.status, 'IN');
    ok('and stamps the time', entered.checkInAt instanceof Date);
    await expectReject('a second entry is refused rather than overwriting', () => recordVisitorEntry(c.wardenA, c.instA, v1.id), 409);
    // The refusal above is caught by the STATUS guard (the visitor is `IN`, not `APPROVED`) rather
    // than by an explicit "already entered" check - both are 409 and both refuse, but the label
    // should not claim a guard that is not the one doing the work.
    const afterDouble = await getVisitor(c.instA, v1.id);
    eq('and the original entry time survives it', afterDouble.checkInAt?.toISOString(), entered.checkInAt?.toISOString());

    await expectReject('a confirmed visitor cannot be checked out before entering', () => recordVisitorExit(c.wardenA, c.instA, overnight.id), 409);

    const exited = await recordVisitorExit(c.wardenA, c.instA, v1.id);
    eq('exit sets OUT', exited.status, 'OUT');
    eq('and reads as left', exited.lifecycle, 'left');
    await expectReject('a second exit is refused', () => recordVisitorExit(c.wardenA, c.instA, v1.id), 409);

    // ---- withdrawal, resident side only, PENDING only ----
    console.log('\nwithdrawal');
    const pending = await authoriseVisitorByResident(c.studentA, {
      name: 'Plans Changed',
      relation: 'Friend',
      expectedInAt: soonOut(3).toISOString(),
      expectedOutAt: soonOut(4).toISOString(),
    });
    const withdrawn = await cancelMyVisitor(c.studentA, pending.id);
    eq('a pending authorisation can be withdrawn', withdrawn.status, 'CANCELLED');
    eq('and reads as withdrawn', withdrawn.lifecycle, 'cancelled');
    await expectReject('withdrawing twice is refused', () => cancelMyVisitor(c.studentA, pending.id), 409);
    await expectReject(
      'a confirmed visitor cannot be withdrawn - it is a check-out',
      () => cancelMyVisitor(c.studentA, approved.id),
      409,
    );
    await expectReject(
      'a resident cannot withdraw somebody else\'s visitor',
      () => cancelMyVisitor(c.studentA2, pending.id),
      404,
    );

    // ---- cross-tenant ----
    console.log('\ncross-tenant');
    const bList = await listVisitors(c.instB);
    eq('institution B sees none of A\'s visitors', bList.passes.length, 0);
    await expectReject('B cannot read A\'s visitor', () => getVisitor(c.instB, v1.id), 404);
    await expectReject('B cannot confirm it', () => decideVisitor(c.wardenB, c.instB, v1.id, 'APPROVED', null), 404);
    await expectReject('B cannot record its entry', () => recordVisitorEntry(c.wardenB, c.instB, v1.id), 404);
    await expectReject('B cannot record its exit', () => recordVisitorExit(c.wardenB, c.instB, v1.id), 404);

    // A visitor row belongs to the resident's institution, and registration is scoped there too.
const bProfile = (await prisma.studentProfile.findFirstOrThrow({
      where: { userId: c.studentB },
      select: { id: true },
    })).id;
    await expectReject(
      'a visitor cannot be registered against another institution\'s resident',
      async () =>
        registerVisitorByWarden(c.wardenA, c.instA, {
          name: 'Well Named Visitor',
          visitingStudentProfileId: bProfile,
          relation: 'Friend',
        }),
      404,
    );

    // ---- the barred list ----
    console.log('\nthe barred list');
    await addBarredVisitor(c.wardenA, c.instA, { name: 'Sunil Kamble', phone: '(97691) 12233', reason: 'Removed by security' });
    const barredList = await listBarredVisitors(c.instA);
    eq('one entry', barredList.length, 1);
    eq('phone digits are normalised', barredList[0].phoneDigits, '9769112233');

    const again = await addBarredVisitor(c.wardenA, c.instA, { name: 'Sunil Kamble', phone: '9769112233', reason: 'Different reason' });
    ok('re-adding updates rather than duplicating', again.updated === true);
    eq('and there is still one row', (await listBarredVisitors(c.instA)).length, 1);

    await expectReject('a bar with no reason is refused', () => addBarredVisitor(c.wardenA, c.instA, { name: 'No Reason', reason: '' }), 400);

    const barredVisit = await registerVisitorByWarden(c.wardenA, c.instA, {
      name: 'Sunil Kamble',
      phone: '9769112233',
      relation: 'Friend',
      visitingStudentProfileId: profA,
      expectedInAt: soonOut(2).toISOString(),
      expectedOutAt: soonOut(3).toISOString(),
    });
    ok('a barred visitor is still REGISTERED, not silently dropped', barredVisit.status === 'PENDING');
    ok('and carries the BARRED alert', barredVisit.alerts.some((a: any) => a.code === 'BARRED'));
    ok('with the reason the institution recorded', typeof barredVisit.barredReason === 'string' && barredVisit.barredReason.length > 0);

    await decideVisitor(c.wardenA, c.instA, barredVisit.id, 'APPROVED', null);
    await expectReject(
      'the gate REFUSES a barred visitor with a reason',
      () => recordVisitorEntry(c.wardenA, c.instA, barredVisit.id),
      409,
    );

    const barredId = (await listBarredVisitors(c.instA))[0].id;
    await removeBarredVisitor(c.wardenA, c.instA, barredId);
    eq('removing the bar empties the list', (await listBarredVisitors(c.instA)).length, 0);
    const nowAllowed = await recordVisitorEntry(c.wardenA, c.instA, barredVisit.id);
    eq('and the same visitor may then enter', nowAllowed.status, 'IN');
    await recordVisitorExit(c.wardenA, c.instA, barredVisit.id);

    await expectReject('removing a bar that does not exist is a 404', () => removeBarredVisitor(c.wardenA, c.instA, 'nope'), 404);
    await expectReject("B cannot touch A's barred list", () => removeBarredVisitor(c.wardenB, c.instB, 'nope'), 404);

    // Switching the check off must stop the REFUSAL, not the record.
    await updateVisitorPolicy(c.wardenA, c.instA, { barredCheck: false });
    await expectReject(
      'with the check off the entry is no longer refused',
      async () => recordVisitorEntry(c.wardenA, c.instA, (await registerVisitorByWarden(c.wardenA, c.instA, { name: 'Sunil Kamble', phone: '9769112233', relation: 'Friend', visitingStudentProfileId: profA, expectedInAt: soonOut(2).toISOString(), expectedOutAt: soonOut(3).toISOString() })).id),
      409,
    );
    await updateVisitorPolicy(c.wardenA, c.instA, { barredCheck: true });

    // ---- frequent visitors ----
    console.log('\nfrequent visitor history');
    for (let i = 0; i < 4; i++) {
      const v = await registerVisitorByWarden(c.wardenA, c.instA, {
        name: 'Regular Visitor',
        phone: '9111122222',
        relation: 'Aunt',
        visitingStudentProfileId: profA,
        expectedInAt: soonOut(2).toISOString(),
        expectedOutAt: soonOut(3).toISOString(),
      });
      await decideVisitor(c.wardenA, c.instA, v.id, 'APPROVED', null);
      await recordVisitorEntry(c.wardenA, c.instA, v.id);
      await recordVisitorExit(c.wardenA, c.instA, v.id);
      // Space them INSIDE the counting window. The first version used (i + 2) * 9 days, which
      // put the last two visits 36 and 45 days back - outside the 30-day window the query counts
      // over - so the visitor was flagged but under-counted, and the assertion that the COUNT is
      // right failed for a reason that had nothing to do with the counting.
      await prisma.visitor.update({
        where: { id: v.id },
        data: { createdAt: new Date(Date.now() - (i + 1) * 4 * 86400000) },
      });
    }
    const freq = await frequentVisitors(c.instA, { withinDays: 30 });
    const regular = freq.visitors.find((v: any) => v.name === 'Regular Visitor');
    ok('a repeat visitor is counted', (regular?.visits ?? 0) >= 4);
    ok('and flagged once past the threshold', regular?.flagged === true);

    const byResident = freq.residents.find((r: any) => r.studentProfileId === v1.visitingStudentProfileId);
    ok('and grouped by resident too', (byResident?.visits ?? 0) >= 4);

    // ---- inbox: stats, facets, ordering, filters ----
    console.log('\nthe warden inbox');
    const inbox = await listVisitors(c.instA, { pageSize: 100 });
    ok('stats come from the response', typeof inbox.stats.onCampus === 'number' && typeof inbox.stats.total === 'number');
    ok('facets are present', Array.isArray(inbox.facets.statuses));
    eq(
      'facets count every row',
      inbox.facets.statuses.reduce((n: number, s: any) => n + s.count, 0),
      inbox.pagination.total,
    );

    const ranks = inbox.passes.map((v: any) => lifecycleRank(v.lifecycle, v.isRestricted));
    ok(
      'the inbox is in urgency order',
      ranks.every((r: number, i: number) => i === 0 || ranks[i - 1] <= r),
      ranks.join(','),
    );
    const firstClosed = inbox.passes.findIndex((v: any) => isClosed(v.lifecycle));
    const lastLive = inbox.passes.map((v: any) => isClosed(v.lifecycle)).lastIndexOf(false);
    ok('every live row sorts above every closed one', firstClosed === -1 || lastLive < firstClosed, `firstClosed=${firstClosed} lastLive=${lastLive}`);

    const filtered = await listVisitors(c.instA, { status: 'PENDING', pageSize: 100 });
    ok('a status filter returns only that status', filtered.passes.every((v: any) => v.status === 'PENDING'));
    ok(
      'and facets do not narrow with it',
      (await listVisitors(c.instA, { status: 'PENDING' })).facets.statuses.length === inbox.facets.statuses.length,
    );

    const actioned = await listVisitors(c.instA, { needsAction: 'true', pageSize: 100 });
    ok('a needsAction filter keeps only rows that do', actioned.passes.every((v: any) => v.needsAction === true));
    const alerted = await listVisitors(c.instA, { alerts: 'true', pageSize: 100 });
    ok('an alerts filter keeps only flagged rows', alerted.passes.every((v: any) => v.isRestricted === true));

    const searched = await listVisitors(c.instA, { q: 'regular' });
    ok('search matches a visitor name', searched.passes.length >= 1);
    ok('and a nonsense term is an empty page', (await listVisitors(c.instA, { q: 'zzznotfound' })).passes.length === 0);

    const paged = await listVisitors(c.instA, { pageSize: 1 });
    eq('page size is honoured', paged.passes.length, 1);
    ok('and pagination is reported', paged.pagination.totalPages >= 1);

    // ---- nothing schedules ----
    // Comments are stripped first. The service's own header says "there is no cron, no
    // `setInterval`", and asserting on the raw source therefore FAILS on its own documentation -
    // which is how a real assertion quietly stops being tested.
    console.log('\nnothing schedules');
    const readSource = (rel: string) =>
      import('node:fs').then((fs) =>
        fs
          .readFileSync(new URL(rel, import.meta.url), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/^\s*\/\/.*$/gm, ''),
      );
    const svcSrc = await readSource('../src/modules/hostel/hostel-visitors.service.ts');
    const rulesSrc = await readSource('../src/modules/hostel/hostel-visitors.rules.ts');
    ok('no cron in the visitor service', !/node-cron|scheduleJob|\bcron\b/.test(svcSrc));
    ok('no setInterval in the visitor service', !/setInterval/.test(svcSrc));
    ok('no setTimeout either', !/setTimeout/.test(svcSrc));
    ok(
      'overstaying is computed from the clock, not a column',
      /expectedOutAt\.getTime\(\) < now\.getTime\(\)/.test(rulesSrc),
    );
    ok('and no stored status claims to be an overrun', !/'OVERDUE'/.test(rulesSrc));
  } finally {
    await sweep();
    await prisma.$disconnect();
  }

  console.log(`\n${passed} passed, ${failures.length} failed\n`);
  if (failures.length) {
    for (const f of failures) console.log(`  ! ${f}`);
    process.exit(1);
  }
  console.log('Visitor DB contract OK');
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sweep();
  } catch {
    /* the suite is already failing; a cleanup error must not mask the cause */
  }
  await prisma.$disconnect();
  process.exit(1);
});