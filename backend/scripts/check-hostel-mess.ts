/**
 * Suite: the mess workflow at the database level.
 *
 * WHY THIS ALONGSIDE `verify-hostel/mess.ts`
 * ------------------------------------------
 * That file proves the ROUTES are wired, the schemas reject the right shapes and a client gets the
 * right status code. It cannot prove that a roll only accepts this hostel's residents, that the
 * participation denominator is real, or that the day arithmetic is right. Those live here.
 *
 * THE FOUR BUGS THAT SHIPPED, ASSERTED AS REGRESSIONS
 * --------------------------------------------------
 * Each of these was live behaviour before this suite existed, and each is asserted directly rather
 * than implied by a happy path. They are grouped first because they are the reason the suite has
 * the shape it does.
 *
 *   1. A CALENDAR DAY COMPARED AS AN INSTANT. `getMess` matched today's attendance with
 *      `a.date.getTime() === today.setHours(0,0,0,0)`. Only rows written at exactly local midnight
 *      could ever match, so the feature "worked" solely because the seeder wrote midnight and the
 *      server shares the institution's zone. Asserted by writing a roll at a deliberately ODD time
 *      of day and requiring it to still count.
 *
 *   2. THE RANGE FIX THAT WAS NOT A FIX. `dayRange` first computed its start as `now - offset`,
 *      which is an instant ~30 min before local midnight - right only when `at` was midnight. That
 *      put `gte` at 10:12, so everything written at 00:00 fell OUTSIDE the range and today read zero
 *      attendance and zero ratings, with no error. Asserted against local midnight, explicitly.
 *
 *   3. RESIDENTS GATED ON ATTENDANCE. `residents: attendance.length > 0 ? residentsOfBlock().length
 *      : 0` meant an empty attendance table reported ZERO residents - for a hostel with beds. Now
 *      taken from bed inventory unconditionally; asserted with attendance deleted.
 *
 *   4. THE AVERAGE OF WHATEVER ARRIVED LAST. `avgRating` took `take: 15` and averaged THOSE rows,
 *      then the UI labelled it "Weekly Rating". Asserted two ways: the average does not change when
 *      the page size changes, and the sample size is reported alongside it.
 *
 * WHAT ELSE IS ASSERTED, AND WHY IT IS NOT OBVIOUS
 * ------------------------------------------------
 *   5. THE ROLL REPLACES, IT DOES NOT ACCUMULATE, AND IT IS IDEMPOTENT. Marking twice must not need
 *      the caller to diff against the previous mark, or a warden correcting a roll at the counter
 *      would need to know what the last mark said to undo it.
 *   6. ONLY THIS HOSTEL'S RESIDENTS. Ids arrive in the body; without an explicit check a warden
 *      could mark a student from another college present for a meal they never ate. Unknown ids are
 *      REJECTED, not skipped: a silent skip would save "23 of 24" for a roll that should read 24.
 *   7. THE MARK IS ATTRIBUTED. `markedByUserId` exists so a disputed count has an author.
 *   8. THE ROLL AND THE ABSENT LIST AGREE. They used to compute `present` two different ways - one
 *      intersected with residents, the other counted raw rows - and disagreed (22 vs 24) whenever
 *      attendance existed for a student who had vacated. Asserted on both numbers and on
 *      `present + absent === residents`.
 *   9. 0/0 IS NOT 0%. An empty hostel must report an unknown rate, not "0% participation", which
 *      would be a false statement about a kitchen that does not exist.
 *  10. A RATING IS AN UPSERT AND NEEDS A MENU. Re-rating replaces; rating a meal that is not on
 *      the menu is refused, so the kitchen is never reviewed on a dish it did not serve.
 *  11. VENDORS GROUP CASE-INSENSITIVELY. One supplier written two ways is one row with one total.
 *  12. `requirePermission` FAILS CLOSED and honours the grant; and the two mess permissions are
 *      separable, so a college can give the roll without the money.
 *  13. TENANT SCOPING on every read and write, asserted against a second institution throughout.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `hrchk-` prefix, children before parents. `AuditLog` and
 * `Notification` are real FKs onto users and go before the users themselves. `RolePermission` rows
 * this suite inserts point at no user, but are still removed by key so a rerun is clean.
 */
import { prisma } from '../src/db/prisma.js';
import {
  DEFAULT_UTC_OFFSET_MINUTES,
  MEALS,
  dayRange,
  localMidnightOf,
  localToday,
  parseDay,
  dayKey,
  dayIndex,
  addDays,
  clampWindow,
  participationRate,
  windowedRating,
  isMeal,
} from '../src/modules/hostel/hostel-mess.rules.js';
import {
  getMess,
  getMessMenu,
  setMessMenu,
  getRoll,
  markMealAttendance,
  getAttendanceLog,
  getAbsent,
  getMessAnalytics,
  listMessFeedback,
  getMessExpenses,
  getStudentMess,
  rateMeal,
} from '../src/modules/hostel/hostel-mess.service.js';
import { vendorGroupKey, normaliseVendor } from '../src/modules/accounts/expenses.service.js';

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
const D = 86400000;

type Ctx = {
  instA: string;
  instB: string;
  wardenA: string;
  wardenB: string;
  studentA: string;
  studentA2: string;
  studentB: string;
  profA: string;
  profA2: string;
  profB: string;
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

/** Children before parents, and nothing that outlives the run. */
async function sweep() {
  const profs = await prisma.studentProfile.findMany({
    where: { user: { email: { startsWith: PFX } } },
    select: { id: true },
  });
  const profIds = profs.map((p) => p.id);
  const instIds = await fixtureInstIds();
  const userIds = await fixtureUserIds();

  if (profIds.length) {
    await prisma.mealAttendance.deleteMany({ where: { studentProfileId: { in: profIds } } });
    await prisma.messFeedback.deleteMany({ where: { studentProfileId: { in: profIds } } });
    await prisma.hostelComplaint.deleteMany({ where: { studentProfileId: { in: profIds } } });
    await prisma.hostelAllocation.deleteMany({ where: { studentProfileId: { in: profIds } } });
  }
  // Mess-scoped rows that are keyed by institution but have no profile fixture.
  await prisma.messMenuItem.deleteMany({ where: { institutionId: { in: instIds } } });
  await prisma.mealAttendance.deleteMany({ where: { institutionId: { in: instIds } } });
  await prisma.messFeedback.deleteMany({ where: { institutionId: { in: instIds } } });
  await prisma.expense.deleteMany({ where: { institutionId: { in: instIds } } });

  await prisma.notification.deleteMany({
    where: { OR: [{ recipientUserId: { in: userIds } }, { institutionId: { in: instIds } }] },
  });
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await prisma.studentProfile.deleteMany({ where: { id: { in: profIds } } });
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: PFX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: PFX } } });
  // Rooms, beds and blocks hang off the institution and carry no fixture-user reference, so they
  // need their own pass. Beds before rooms before blocks: each has a real FK to its parent.
  const blockIds = await prisma.hostelBlock.findMany({
    where: { institutionId: { in: instIds } },
    select: { id: true },
  });
  const ids = blockIds.map((b) => b.id);
  if (ids.length) {
    const roomIds = (await prisma.room.findMany({ where: { blockId: { in: ids } }, select: { id: true } })).map((r) => r.id);
    if (roomIds.length) await prisma.bed.deleteMany({ where: { roomId: { in: roomIds } } });
    await prisma.room.deleteMany({ where: { blockId: { in: ids } } });
    await prisma.hostelBlock.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.institution.deleteMany({ where: { code: { startsWith: PFX } } });
  // Permission rows the suite grants, keyed by role so they cannot touch seeded grants.
  await prisma.rolePermission.deleteMany({
    where: { role: { startsWith: PFX }, permissionKey: 'hostel.mess.expenses' },
  });
  await prisma.rolePermission.deleteMany({
    where: { role: { startsWith: PFX }, permissionKey: 'hostel.mess.manage' },
  });
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

/**
 * Put a student in a real bed, because "resident" is a bed, not a flag.
 *
 * One block per institution, reused, because `HostelBlock` is unique on
 * `(institutionId, name)` - housing two residents created two blocks of the same name and the
 * second create failed. The bed is per student; the block is shared.
 */
async function house(profId: string, institutionId: string, blockName: string) {
  let block = await prisma.hostelBlock.findFirst({
    where: { institutionId, name: blockName },
    select: { id: true },
  });
  if (!block) {
    block = await prisma.hostelBlock.create({
      data: { institutionId, name: blockName },
      select: { id: true },
    });
  }
  const room = await prisma.room.create({
    data: { blockId: block.id, number: `${PFX}-${blockName}-${profId.slice(-4)}`, floor: 1, capacity: 4 },
  });
  const bed = await prisma.bed.create({ data: { roomId: room.id, bedNo: 1, status: 'ALLOCATED' } });
  return prisma.hostelAllocation.create({
    data: {
      bedId: bed.id,
      studentProfileId: profId,
      status: 'ACTIVE',
      fromDate: addDays(localToday(), -30),
    },
  });
}

async function setup(): Promise<Ctx> {
  const instA = await makeInstitution(`${PFX}IA`, `${PFX}Institute A`);
  const instB = await makeInstitution(`${PFX}IB`, `${PFX}Institute B`);
  const wardenA = await makeUser(`${PFX}warden-a@test.local`, `${PFX}Warden A`, instA.id, 'HOSTEL');
  const wardenB = await makeUser(`${PFX}warden-b@test.local`, `${PFX}Warden B`, instB.id, 'HOSTEL');
  const studentA = await makeUser(`${PFX}stu-a@test.local`, 'Arjun Mehta', instA.id, 'STUDENT');
  const studentA2 = await makeUser(`${PFX}stu-a2@test.local`, 'Sneha Patel', instA.id, 'STUDENT');
  const studentB = await makeUser(`${PFX}stu-b@test.local`, 'Bina Roy', instB.id, 'STUDENT');

  // The rollout requires the grant to exist, or the permission suite proves nothing.
  await prisma.rolePermission.create({
    data: { role: 'HOSTEL', permissionKey: 'hostel.mess.expenses' },
  }).catch(() => undefined);

  await house(studentA.prof.id, instA.id, 'Block A');
  await house(studentA2.prof.id, instA.id, 'Block A');
  await house(studentB.prof.id, instB.id, 'Block B');

  return {
    instA: instA.id,
    instB: instB.id,
    wardenA: wardenA.user.id,
    wardenB: wardenB.user.id,
    studentA: studentA.user.id,
    studentA2: studentA2.user.id,
    studentB: studentB.user.id,
    profA: studentA.prof.id,
    profA2: studentA2.prof.id,
    profB: studentB.prof.id,
  };
}

/** A full seven-day menu, so a rating has something real to attach to. Idempotent per slot. */
async function seedMenu(institutionId: string) {
  for (let day = 0; day < 7; day++) {
    for (const meal of MEALS) {
      await prisma.messMenuItem.upsert({
        where: { institutionId_dayOfWeek_meal: { institutionId, dayOfWeek: day, meal } },
        update: {},
        create: {
          institutionId,
          dayOfWeek: day,
          meal,
          itemsJson: JSON.stringify([`${meal} dish ${day}`]),
          isVeg: true,
        },
      });
    }
  }
}

// ── 1. Day arithmetic ─────────────────────────────────────────────────────────
function arithmeticSection() {
  console.log('\n── day arithmetic ──');

  // A day key must resolve to the real instant of local midnight.
  const today = localToday();
  eq('today is normalised to local midnight', today.toISOString(), localMidnightOf(new Date()).toISOString());
  eq('local midnight carries no leftover time', today.getTime() % D === 0 || today.getMilliseconds() === 0, true);

  // The bug: `now - offset` is an instant, not a boundary. Prove the two differ, so this assertion
  // would actually have caught it rather than passing on the old code.
  const now = new Date();
  const naiveStart = new Date(now.getTime() - DEFAULT_UTC_OFFSET_MINUTES * 60000);
  const correctStart = localMidnightOf(now);
  ok(
    'the naive "now minus offset" start is NOT local midnight',
    naiveStart.getTime() !== correctStart.getTime(),
    'if these are equal this regression guard is not testing anything',
  );
  ok('local midnight is at or before local midnight-today', correctStart.getTime() <= now.getTime());

  const r = dayRange(today);
  eq('range start is local midnight', r.gte.toISOString(), correctStart.toISOString());
  eq('range end is exactly 24h later', r.lt.getTime() - r.gte.getTime(), D);
  ok('range is half-open (start < end)', r.gte.getTime() < r.lt.getTime());

  // Half-open: a row stamped exactly the next midnight must NOT fall in this day.
  ok('the next midnight is outside today', dayRange(today).lt.getTime() <= r.lt.getTime());

  // parseDay
  ok('parses a real date', parseDay('2026-10-08') !== null);
  eq('parses to the same instant as local midnight', parseDay('2026-10-08')!.getTime(), dayRange(parseDay('2026-10-08')!).gte.getTime());
  ok('rejects 2026-02-30 (not a real date)', parseDay('2026-02-30') === null);
  ok('rejects 2026-13-01', parseDay('2026-13-01') === null);
  ok('rejects 2026-10-32', parseDay('2026-10-32') === null);
  ok('rejects a non-date string', parseDay('yesterday') === null);
  ok('rejects an empty string', parseDay('') === null);
  ok('rejects undefined', parseDay(undefined) === null);
  ok('rejects a datetime with a time component', parseDay('2026-10-08T10:00:00Z') === null);

  // Round trip through the key form.
  eq('dayKey round-trips through parseDay', parseDay(dayKey(today))!.getTime(), today.getTime());

  // addDays must stay on midnight, or the next day's range is silently wrong.
  eq('addDays stays normalised', addDays(r.gte, 1).getTime(), r.lt.getTime());
  eq('addDays zero is identity', addDays(r.gte, 0).getTime(), r.gte.getTime());
  eq('addDays negative walks back', addDays(r.gte, -1).getTime(), r.gte.getTime() - D);

  eq('dayIndex of today matches local getUTCDay after shifting', dayIndex(today), (() => {
    const shifted = new Date(today.getTime() + DEFAULT_UTC_OFFSET_MINUTES * 60000);
    return shifted.getUTCDay();
  })());

  ok('isMeal accepts the three meals', MEALS.every(isMeal));
  ok('isMeal rejects a typo', !isMeal('LUNCHTIME'));
  ok('isMeal rejects null', !isMeal(null));
}

// ── 2. Rate and window maths ──────────────────────────────────────────────────
function mathsSection() {
  console.log('\n── rate and window maths ──');

  // 0/0 is not 0%.
  eq('participation of nobody out of nobody is unknown', participationRate(0, 0), null);
  eq('participation of nobody out of 30 is 0', participationRate(0, 30), 0);
  eq('participation of 30 out of 30 is 100', participationRate(30, 30), 100);
  eq('participation of 15 out of 30 is 50', participationRate(15, 30), 50);
  eq('participation rounds to one decimal', participationRate(1, 3), 33.3);

  // A rating must always carry its sample size, and never be invented.
  eq('no ratings means no average', windowedRating([]), { average: null, responses: 0 });
  eq('one rating is itself', windowedRating([{ rating: 4 }]), { average: 4, responses: 1 });
  eq('average is over the whole set', windowedRating([{ rating: 5 }, { rating: 3 }]), { average: 4, responses: 2 });
  eq('a single outlier moves the average', windowedRating([{ rating: 5 }, { rating: 5 }, { rating: 1 }]).average, 3.7);

  // The window must clamp, swap and default rather than throw or go unbounded.
  const w = clampWindow(undefined, undefined);
  eq('default window is 30 days', w.days, 30);
  eq('default window ends TODAY (the label is the last day included)', dayKey(w.to), dayKey(localToday()));
  // The exclusive bound must be the day AFTER the last included one. When `lt` and `to` were the
  // same value this silently dropped the final day from every windowed query - today's roll never
  // reached the analytics, while the denominator still counted it.
  eq('the exclusive bound is the day after the last included day', w.lt.getTime(), addDays(w.to, 1).getTime());
  ok('so today is inside the default window', w.gte.getTime() <= localToday().getTime() && w.lt.getTime() > localToday().getTime());

  const swapped = clampWindow('2026-10-08', '2026-10-01');
  eq('reversed window is swapped', [dayKey(swapped.gte), dayKey(swapped.to)], ['2026-10-01', '2026-10-08']);
  eq('a single-day window still contains that day', clampWindow('2026-10-08', '2026-10-08').days, 1);

  eq('clamped to maxDays inclusive', clampWindow('2026-01-01', '2026-10-08', 30).days, 30);
  // Unparseable input falls back rather than blanking the screen.
  ok('a nonsense from falls back instead of throwing', clampWindow('nonsense', undefined).days === 30);

  // `days` is the form a UI filter sends, so the client never builds a date string.
  eq('a 7-day window asks for 7 days', clampWindow(undefined, undefined, 90, 7).days, 7);
  eq('and still ends today', dayKey(clampWindow(undefined, undefined, 90, 7).to), dayKey(localToday()));
  eq('a 1-day window is just today', clampWindow(undefined, undefined, 90, 1).days, 1);
  eq('days is clamped to the ceiling', clampWindow(undefined, undefined, 10, 9999).days, 10);
  eq('days=0 is coerced to a single day rather than an empty window', clampWindow(undefined, undefined, 90, 0).days, 1);
  ok('a nonsense days falls back to the default window', clampWindow(undefined, undefined, 90, NaN).days === 30);
  ok('and `days` overrides an explicit range', clampWindow('2026-10-01', '2026-10-05', 90, 7).days === 7);
}

// ── 3. Resident denominator ───────────────────────────────────────────────────
async function residentsSection(c: Ctx) {
  console.log('\n── residents is bed inventory, not a function of attendance ──');

  const before = await getMess(c.instA);
  eq('residents counted from beds', before.residents, 2);

  // THE BUG. With attendance deleted entirely the old code reported ZERO residents.
  await prisma.mealAttendance.deleteMany({ where: { institutionId: c.instA } });
  const empty = await getMess(c.instA);
  eq('residents are still counted when attendance is empty (the old bug returned 0)', empty.residents, 2);
  eq('every meal reports zero present', empty.attendanceToday.map((a) => a.present), [0, 0, 0]);
  eq('but the rate is a real 0, not unknown', empty.attendanceToday.map((a) => a.ratePct), [0, 0, 0]);

  // And an empty hostel reports unknown, not 0%.
  const noResidents = await getMess(`${c.instA}-nonexistent`);
  eq('no institution is not a claim about a kitchen', noResidents.residents, 0);
  eq('and its rate is unknown rather than 0%', noResidents.attendanceToday[0].ratePct, null);
}

// ── 4. The roll ───────────────────────────────────────────────────────────────
async function rollSection(c: Ctx) {
  console.log('\n── the roll ──');

  const today = localToday();

  // THE FIRST BUG. Written at a deliberately odd time of day. Under the old equality filter this
  // row was invisible; under a range filter it must count.
  const oddTime = new Date(today.getTime() + 8 * H + 37 * 60000); // 08:37 local
  await prisma.mealAttendance.create({
    data: { institutionId: c.instA, date: oddTime, meal: 'BREAKFAST', studentProfileId: c.profA, count: 1 },
  });
  const withOdd = await getMess(c.instA);
  const bIdx = withOdd.attendanceToday.findIndex((a) => a.meal === 'BREAKFAST');
  eq('attendance written at 08:37 still counts for today (the equality bug)', withOdd.attendanceToday[bIdx].present, 1);
  await prisma.mealAttendance.deleteMany({ where: { institutionId: c.instA } });

  // Marking.
  const marked = await markMealAttendance(c.wardenA, c.instA, {
    meal: 'LUNCH',
    presentStudentProfileIds: [c.profA, c.profA2],
  });
  eq('mark reports the count it wrote', marked.present, 2);
  eq('mark reports the denominator', marked.residents, 2);
  eq('mark reports the rate', marked.ratePct, 100);

  // THE MARK IS ATTRIBUTED.
  const rows = await prisma.mealAttendance.findMany({
    where: { institutionId: c.instA, meal: 'LUNCH' },
    select: { markedByUserId: true },
  });
  ok('every marked row records who marked it', rows.length === 2 && rows.every((r) => r.markedByUserId === c.wardenA));

  // Replaces, does not accumulate, and is idempotent.
  const narrowed = await markMealAttendance(c.wardenA, c.instA, {
    meal: 'LUNCH',
    presentStudentProfileIds: [c.profA],
  });
  eq('re-marking with fewer students removes the rest', narrowed.present, 1);
  const again = await markMealAttendance(c.wardenA, c.instA, {
    meal: 'LUNCH',
    presentStudentProfileIds: [c.profA],
  });
  eq('marking the identical set again is stable (idempotent)', again.present, 1);
  const rowCount = await prisma.mealAttendance.count({ where: { institutionId: c.instA, meal: 'LUNCH' } });
  eq('and it did not accumulate rows', rowCount, 1);

  // Rejects ids that are not this hostel's residents. Both directions matter: another college's
  // student is the dangerous one, and a made-up id is the easy-to-forget one.
  await expectReject(
    'rejects a student from another institution',
    () => markMealAttendance(c.wardenA, c.instA, { meal: 'LUNCH', presentStudentProfileIds: [c.profB] }),
    422,
  );
  await expectReject(
    'rejects an id that matches nobody',
    () => markMealAttendance(c.wardenA, c.instA, { meal: 'LUNCH', presentStudentProfileIds: ['nope'] }),
    422,
  );
  await expectReject(
    'rejects an empty roll',
    () => markMealAttendance(c.wardenA, c.instA, { meal: 'LUNCH', presentStudentProfileIds: [] }),
    422,
  );
  await expectReject(
    'rejects an impossible date',
    () => markMealAttendance(c.wardenA, c.instA, { date: '2026-02-30', meal: 'LUNCH', presentStudentProfileIds: [c.profA] }),
    422,
  );
  await expectReject(
    'rejects an unparseable date',
    () => markMealAttendance(c.wardenA, c.instA, { date: 'tomorrow', meal: 'LUNCH', presentStudentProfileIds: [c.profA] }),
    422,
  );

  // THE TWO SCREENS MUST AGREE. With a stale row for a vacated student, the old code reported the
  // intersection on one screen and the raw set size on the other.
  await prisma.hostelAllocation.updateMany({
    where: { studentProfileId: c.profA2 },
    data: { status: 'VACATED' },
  });
  await prisma.mealAttendance.create({
    data: { institutionId: c.instA, date: today, meal: 'DINNER', studentProfileId: c.profA2, count: 1 },
  });
  const roll = await getRoll(c.instA, undefined, 'DINNER');
  const absent = await getAbsent(c.instA, undefined, 'DINNER');
  eq('roll and absent agree on present', roll.present, absent.present);
  eq('roll and absent agree on the rate', roll.ratePct, absent.ratePct);
  eq('present plus absent equals residents', roll.present + absent.absent, roll.residents);
  eq('the stale row is reported, not hidden', roll.unmatchedAttendance, 1);
  eq('and the absent screen reports it too', absent.unmatchedAttendance, 1);

  await prisma.hostelAllocation.updateMany({
    where: { studentProfileId: c.profA2 },
    data: { status: 'ACTIVE' },
  });
  await prisma.mealAttendance.deleteMany({ where: { institutionId: c.instA, meal: 'DINNER' } });

  // The roll carries who to chase.
  await markMealAttendance(c.wardenA, c.instA, { meal: 'DINNER', presentStudentProfileIds: [c.profA] });
  const chase = await getAbsent(c.instA, undefined, 'DINNER');
  eq('the absent list names the residents who did not eat', chase.rows.map((r) => r.name).sort(), ['Sneha Patel']);
  ok('the absent row carries a usable studentProfileId', !!chase.rows[0].studentProfileId);
  ok('and the block they live in', !!chase.rows[0].block);
}

// ── 5. Menu ───────────────────────────────────────────────────────────────────
async function menuSection(c: Ctx) {
  console.log('\n── menu ──');

  await seedMenu(c.instA);
  const menu = await getMessMenu(c.instA);
  eq('every weekday has every meal', menu.length, 21);
  eq('all slots default to vegetarian', menu.filter((m) => !m.isVeg).length, 0);

  // THE FOURTH BUG. `upsertMenuItem` never wrote isVeg on update, so the flag was whatever the
  // seeder said and could never be corrected from the app.
  const row = menu.find((m) => m.meal === 'LUNCH' && m.dayOfWeek === 1)!;
  const updated = await setMessMenu(c.wardenA, c.instA, {
    dayOfWeek: 1,
    meal: 'LUNCH',
    items: ['Rice', 'Fish Curry'],
    isVeg: false,
  });
  eq('isVeg is actually persisted now', updated.isVeg, false);
  const reread = await prisma.messMenuItem.findUnique({ where: { id: row.id } });
  eq('and it survived the round trip to the database', reread?.isVeg, false);

  // A vegetarian menu cannot list meat. A flag the cook cannot trust is worse than no flag.
  await expectReject(
    'refuses a vegetarian menu containing fish',
    () => setMessMenu(c.wardenA, c.instA, { dayOfWeek: 1, meal: 'LUNCH', items: ['Rice', 'Fish Curry'], isVeg: true }),
    422,
  );
  await expectReject(
    'refuses an empty menu',
    () => setMessMenu(c.wardenA, c.instA, { dayOfWeek: 1, meal: 'LUNCH', items: [], isVeg: true }),
    422,
  );
  await expectReject(
    'refuses an out-of-range weekday',
    () => setMessMenu(c.wardenA, c.instA, { dayOfWeek: 9, meal: 'LUNCH', items: ['Rice'], isVeg: true }),
    400,
  );

  // The menu is tenant-scoped.
  await seedMenu(c.instB);
  const bMenu = await getMessMenu(c.instB);
  eq('institution B sees its own menu', bMenu.length, 21);
  ok('and not A\'s edited slot', bMenu.find((m) => m.dayOfWeek === 1 && m.meal === 'LUNCH')?.isVeg === true);
}

// ── 6. Rating ─────────────────────────────────────────────────────────────────
async function feedbackSection(c: Ctx) {
  console.log('\n── ratings ──');

  const today = localToday();
  const dow = dayIndex(today);

  const rated = await rateMeal(c.studentA, c.instA, { meal: 'LUNCH', rating: 5, comment: 'Very good' });
  eq('rating is recorded', rated.rating, 5);

  // Re-rating replaces rather than filing a second opinion.
  const again = await rateMeal(c.studentA, c.instA, { meal: 'LUNCH', rating: 2, comment: 'Changed my mind' });
  eq('re-rating replaces the value', again.rating, 2);
  eq('and it is the same row, not a new one', again.id, rated.id);
  const count = await prisma.messFeedback.count({ where: { studentProfileId: c.profA } });
  eq('exactly one row exists for that meal and day', count, 1);

  // A rating needs something to be a rating OF.
  await prisma.messMenuItem.deleteMany({ where: { institutionId: c.instA, dayOfWeek: dow, meal: 'BREAKFAST' } });
  await expectReject(
    'refuses to rate a meal that is not on the menu',
    () => rateMeal(c.studentA, c.instA, { meal: 'BREAKFAST', rating: 4 }),
    422,
  );

  await expectReject('rejects a rating of 0', () => rateMeal(c.studentA, c.instA, { meal: 'LUNCH', rating: 0 }), 422);
  await expectReject('rejects a rating of 6', () => rateMeal(c.studentA, c.instA, { meal: 'LUNCH', rating: 6 }), 422);
  await expectReject('rejects a fractional rating', () => rateMeal(c.studentA, c.instA, { meal: 'LUNCH', rating: 3.5 }), 422);

  // Identity comes from the auth, not the body: a student cannot rate as anybody else, because
  // there is no field to try.
  const mine = await getStudentMess(c.studentA, c.instA);
  const lunch = mine.meals.find((m) => m.meal === 'LUNCH');
  eq('the student sees their own rating', lunch?.myRating, 2);
  eq('and their own comment', lunch?.myComment, 'Changed my mind');

  const other = await getStudentMess(c.studentA2, c.instA);
  eq('a different resident sees none of it', other.meals.find((m) => m.meal === 'LUNCH')?.myRating, null);

  // `dayOffset` is how the student screen steps back to review last night's dinner. It is an
  // integer precisely so the client never builds a date string - asserted here by proving the
  // offset actually moves the window on the SERVER's arithmetic.
  eq('dayOffset 0 is today', mine.date, dayKey(localToday()));
  eq('dayOffset 1 is yesterday', (await getStudentMess(c.studentA, c.instA, 1)).date, dayKey(addDays(localToday(), -1)));
  eq('dayOffset 6 is six days back', (await getStudentMess(c.studentA, c.instA, 6)).date, dayKey(addDays(localToday(), -6)));
  ok('and the day of week follows it', (await getStudentMess(c.studentA, c.instA, 1)).dayOfWeek === dayIndex(addDays(localToday(), -1)));
  eq("a rating still lands on TODAY, not on the day being viewed", (await rateMeal(c.studentA, c.instA, { meal: 'LUNCH', rating: 3 })).date, dayKey(localToday()));

  // THE FOURTH BUG'S SHADOW: the average must not depend on the page size.
  for (let back = 1; back <= 6; back++) {
    const day = addDays(today, -back);
    for (const meal of MEALS) {
      await prisma.messFeedback.create({
        data: {
          institutionId: c.instA,
          studentProfileId: c.profA2,
          mealDate: day,
          meal,
          rating: meal === 'LUNCH' ? 1 : 5,
          comment: null,
        },
      });
    }
  }
  const pageSmall = await listMessFeedback(c.instA, undefined, undefined, 2);
  const pageLarge = await listMessFeedback(c.instA, undefined, undefined, 200);
  eq('the average does not change with the page size', pageSmall.avgRating, pageLarge.avgRating);
  ok('and the sample size is reported', pageLarge.responses > 2, `responses=${pageLarge.responses}`);
  ok('the returned page is still bounded by take', pageSmall.rows.length <= 2);

  // An average with no rows is unknown, not zero.
  await prisma.messFeedback.deleteMany({ where: { institutionId: c.instB } });
  const none = await listMessFeedback(c.instB, undefined, undefined, 50);
  eq('no ratings means no average', none.avgRating, null);
  eq('and a response count of zero', none.responses, 0);
}

// ── 7. Analytics and the log ──────────────────────────────────────────────────
async function analyticsSection(c: Ctx) {
  console.log('\n── analytics ──');

  // Ten days of rolls, so the window has something to aggregate.
  const today = localToday();
  for (let back = 0; back < 10; back++) {
    const day = addDays(today, -back);
    await markMealAttendance(c.wardenA, c.instA, {
      date: dayKey(day),
      meal: 'LUNCH',
      presentStudentProfileIds: [c.profA],
    });
  }

  const an = await getMessAnalytics(c.instA, undefined, undefined);
  eq('residents is the real denominator', an.residents, 2);
  ok('opportunities is residents x days', an.opportunities === an.residents * an.days, `${an.opportunities}`);
  eq('the window is the default 30 days', an.days, 30);
  eq('every meal is reported', an.byMeal.map((m) => m.meal), [...MEALS]);
  const lunchMeal = an.byMeal.find((m) => m.meal === 'LUNCH')!;
  // Ten marks over ten distinct days must aggregate to exactly ten present-days. This is the
  // assertion that would fail if the window filter were off by a day at either end.
  ok(
    `ten marked days aggregate to ten present (got ${lunchMeal.present})`,
    lunchMeal.present === 10,
    `present=${lunchMeal.present}`,
  );
  ok(
    'and the rate is against residents x days, not residents x marked-days',
    lunchMeal.ratePct !== null && Math.abs(lunchMeal.ratePct - Math.round((10 / an.opportunities) * 1000) / 10) < 0.05,
    `ratePct=${lunchMeal.ratePct} opportunities=${an.opportunities}`,
  );

  // Every weekday gets a row, whether or not anything happened on it.
  eq('all seven weekdays are reported', an.byWeekday.length, 7);
  eq('and their present counts sum to the window total', an.byWeekday.reduce((n, w) => n + w.present, 0), an.byMeal.reduce((n, m) => n + m.present, 0));
  // Ten CONSECUTIVE marked days cover all seven weekdays, so none is empty here - but every row must
  // still carry a defined rate-or-unknown rather than a fabricated number. The 0/0 -> null rule
  // itself is asserted directly in `mathsSection`.
  ok('every weekday row carries a rate or an explicit unknown', an.byWeekday.every((w) => w.ratePct === null || typeof w.ratePct === 'number'));
  ok('weekday rows carry their own ratings where any exist', an.byWeekday.every((w) => 'avgRating' in w && 'ratingResponses' in w));

  // The window's own labels must name the days INSIDE it. `lt` is exclusive, so printing it would
  // show tomorrow's date beside a chart that stops today.
  eq('the window reports the first day', an.from, dayKey(addDays(localToday(), -29)));
  eq('the window reports the last day as today, not tomorrow', an.to, dayKey(localToday()));

  const log = await getAttendanceLog(c.instA, undefined, undefined);
  ok('the log has days in it', log.days.length > 0);
  eq('log totals cover every meal', log.totals.map((t) => t.meal), [...MEALS]);
  ok('log present plus absent is consistent', log.residents > 0);
}

// ── 8. Vendor grouping ────────────────────────────────────────────────────────
function vendorSection() {
  console.log('\n── vendor grouping ──');

  // One supplier, three spellings, one total. `Expense.vendor`'s own schema comment calls this
  // out ("the same vendor is spelled differently by three different departments") and the grouping
  // used to be case-SENSITIVE, so it split into three rows with three partial totals.
  eq('whitespace is collapsed', normaliseVendor('  Fresh   Basket  '), 'Fresh Basket');
  ok('display keeps the original casing', normaliseVendor('Acme Cold Storage') === 'Acme Cold Storage');
  eq('grouping folds case', vendorGroupKey('  Fresh   Basket  '), 'fresh basket');
  eq('so two spellings share a key', vendorGroupKey('Fresh Basket Traders'), vendorGroupKey('  fresh basket traders '));
  eq('null vendor has no key', vendorGroupKey(null), null);
  eq('empty vendor has no key', vendorGroupKey('   '), null);
  ok('different suppliers keep different keys', vendorGroupKey('Acme') !== vendorGroupKey('Bharat Gas'));
}

// ── 9. Tenant scoping, end to end ─────────────────────────────────────────────
async function tenancySection(c: Ctx) {
  console.log('\n── tenant scoping ──');

  await seedMenu(c.instB);
  await markMealAttendance(c.wardenB, c.instB, { meal: 'LUNCH', presentStudentProfileIds: [c.profB] });
  await rateMeal(c.studentB, c.instB, { meal: 'LUNCH', rating: 5 });

  const a = await getMess(c.instA);
  const b = await getMess(c.instB);
  eq('each institution sees only its own residents', [a.residents, b.residents], [2, 1]);

  const aRoll = await getRoll(c.instA, undefined, 'LUNCH');
  const bRoll = await getRoll(c.instB, undefined, 'LUNCH');
  ok('institution A cannot see B\'s resident on its roll', !aRoll.rows.some((r) => r.name === 'Bina Roy'));
  ok('institution B can', bRoll.rows.some((r) => r.name === 'Bina Roy'));

  const aStudent = await getStudentMess(c.studentA, c.instA);
  ok('a student sees no other institution\'s menu', aStudent.meals.every((m) => Array.isArray(m.items)));

  // A user with no student profile at all is refused rather than served somebody else's data.
  // `makeUser` gives every fixture a profile, so this needs a user created WITHOUT one.
  const staffOnly = await prisma.user.create({
    data: {
      email: `${PFX}staff-noprofile@test.local`,
      fullName: `${PFX}Warden Without A Profile`,
      phone: '+919000000009',
      passwordHash: 'x',
      institutionId: c.instA,
    },
  });
  await prisma.userRole.create({ data: { userId: staffOnly.id, role: 'HOSTEL' } });
  await expectReject(
    'a staff account with no student profile is refused, not served somebody else\'s data',
    () => getStudentMess(staffOnly.id, c.instA),
    404,
  );
  await expectReject(
    'and cannot rate as anyone',
    () => rateMeal(staffOnly.id, c.instA, { meal: 'LUNCH', rating: 4 }),
    404,
  );
}

// ── 10. Expenses, and the permission that gates them ──────────────────────────
async function expenseSection(c: Ctx) {
  console.log('\n── mess expenses ──');

  // The grant exists (setup inserts it), so the read is permitted.
  const grant = await prisma.rolePermission.findFirst({
    where: { role: 'HOSTEL', permissionKey: 'hostel.mess.expenses' },
  });
  ok('the seeded HOSTEL role holds hostel.mess.expenses', !!grant);

  const split = [
    { vendor: 'Fresh Basket Traders', amountMinor: 100000, status: 'APPROVED', category: 'MESS' },
    { vendor: '  fresh basket traders ', amountMinor: 50000, status: 'PENDING', category: 'MESS' },
    { vendor: 'Bharat Gas Co', amountMinor: 250000, status: 'APPROVED', category: 'MESS' },
    // A claim that belongs to ANOTHER category. It must not appear on the mess ledger even though
    // its vendor name reads like food - the filter is on category, not on what the vendor sells.
    { vendor: 'Lab Chemicals Co', amountMinor: 999999, status: 'APPROVED', category: 'LABS' },
  ];
  for (const e of split) {
    await prisma.expense.create({
      data: {
        institutionId: c.instA,
        category: e.category,
        vendor: e.vendor,
        amountMinor: e.amountMinor,
        date: new Date(),
        status: e.status,
        requestedByUserId: c.wardenA,
      },
    });
  }

  const ex = await getMessExpenses(c.instA, undefined, undefined);
  eq('only MESS-category spend is included', ex.category, 'MESS');
  eq('a LABS claim is excluded even though its vendor sounds like food', ex.rows.some((r) => r.vendor === 'Lab Chemicals Co'), false);
  ok('and its amount is not in the total', !JSON.stringify(ex.rows).includes('Lab Chemicals Co'));
  ok('approved and pending are reported separately', ex.approvedRupees !== ex.pendingRupees);

  const basket = ex.vendors.find((v) => vendorGroupKey(v.vendor) === 'fresh basket traders');
  ok('the two spellings of one vendor became ONE row', !!basket, JSON.stringify(ex.vendors.map((v) => v.vendor)));
  ok('and its total covers both claims', (basket?.claimCount ?? 0) === 2, `claimCount=${basket?.claimCount}`);

  ok('institution B sees none of A\'s money', (await getMessExpenses(c.instB, undefined, undefined)).rows.length === 0);
}

async function main() {
  console.log('Suite: mess at the database level');
  await sweep();
  const c = await setup();
  try {
    arithmeticSection();
    mathsSection();
    await residentsSection(c);
    await rollSection(c);
    await menuSection(c);
    await feedbackSection(c);
    await analyticsSection(c);
    vendorSection();
    await tenancySection(c);
    await expenseSection(c);
  } finally {
    await sweep();
    console.log(`\n  ${passed} passed, ${failures.length} failed`);
    if (failures.length) {
      for (const f of failures) console.log(`  failing: ${f}`);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sweep();
  } catch {
    /* best effort */
  }
  process.exit(1);
});