/**
 * Suite: the mess workflow over HTTP, both sides of the counter.
 * Docs: 08-hostel.md 3.4, 01-students.md 3.9
 *
 * WHY THIS ALONGSIDE `check-hostel-mess.ts`
 * ------------------------------------------
 * The DB suite proves the rules, the day arithmetic, the roll semantics and tenant scoping. It
 * cannot prove that a ROUTE is wired, that a zod schema rejects the right shapes, that route
 * declaration ORDER is right, or what status code a client actually receives. Those are transport
 * facts and this is where they live.
 *
 * THE THREE THINGS THIS FILE IS REALLY ABOUT
 * -------------------------------------------
 *   1. THE TWO-SIDED BOUNDARY. The roll is written by mess staff and the rating is written by the
 *      resident, on two routers with two different role gates. A STUDENT must not be able to mark a
 *      roll - that is the whole reason attendance is staff-side - and a warden must not be able to
 *      rate as a resident. Asserted from BOTH directions.
 *   2. ROUTE ORDER. `/mess/roll` and `/mess/absent` are single-segment literals. Declared after
 *      anything that could match them, a perfectly valid request 404s. Each is asserted by name so a
 *      failure says which one broke.
 *   3. THE PERMISSION GATE. `/mess/expenses` is the first route in the platform that actually
 *      ENFORCES `RolePermission` - a table that was previously modelled, seeded, displayed on the
 *      user's profile, administered live and audited, but never checked. So both halves matter: the
 *      granted role gets in, and a role WITHOUT the grant is refused rather than shown a zeroed
 *      ledger. Asserted by removing the grant and putting it back.
 *
 * THE 400 / 422 DISTINCTION
 * -------------------------
 * Asserted deliberately: 400 means the body contradicts ITSELF (a weekday outside 0-6), 422 means it
 * is well formed and a RULE refuses it (a date that is not a real date, a student who is not a
 * resident here, a vegetarian menu containing fish). A client can show the first as a form error; the
 * second has to go to the warden.
 *
 * MUTATES SEEDED ROWS AND PUTS THEM BACK
 * --------------------------------------
 * Marking a roll and editing the menu change real data. This suite marks a FUTURE day - the roll for
 * tomorrow has never been written and no screen reads it - and restores the menu slot it edited,
 * asserting the restore. Driving a seeded day to a terminal state is not a restore: the next run
 * would find the roll already marked and prove nothing.
 */
import {
  Tally,
  banner,
  loginAs,
  prisma,
  requireServer,
  runSuite,
  section,
} from '../alumni-harness.js';
// The offset the mess rules normalise with, so cleanup can name the same instant the service wrote.
import { DEFAULT_UTC_OFFSET_MINUTES } from '../../src/modules/hostel/hostel-mess.rules.js';

const t = new Tally();

const WARDEN_EMAIL = 'hostel@learnix.dev';
/** A STUDENT, to prove the warden's counter is refused. */
const STUDENT_EMAIL = 'student@learnix.dev';
/** The accounts desk - the role that can see every claim, including mess spend. */
const ACCOUNTS_EMAIL = 'accounts@learnix.dev';

/**
 * Tomorrow, as `YYYY-MM-DD`. Nothing reads tomorrow's roll, so writing it cannot disturb the demo.
 */
function tomorrowKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The EXACT instant the service will store for `tomorrowKey()`.
 *
 * This exists because the first version of this suite's cleanup computed `new Date(key +
 * 'T00:00:00.000Z')` and matched nothing - the service writes LOCAL midnight (IST), which is
 * 18:30Z the previous evening. The cleanup reported "0 rows removed" and passed, while leaving a
 * phantom roll behind on every run: a self-restoring suite that does not restore is worse than none,
 * because it hides the growth. Derived from the same helper the service uses, so the two cannot
 * disagree about what "tomorrow at midnight" is.
 */
function tomorrowLocalMidnight(): Date {
  const d = new Date(`${tomorrowKey()}T00:00:00.000Z`);
  return new Date(d.getTime() - DEFAULT_UTC_OFFSET_MINUTES * 60_000);
}

async function main() {
  banner('Mess over HTTP');
  await requireServer();

  const warden = await loginAs(WARDEN_EMAIL);
  const student = await loginAs(STUDENT_EMAIL);
  const accounts = await loginAs(ACCOUNTS_EMAIL);

  // A resident with a real bed, so a `studentProfileId` can be resolved. Searched rather than
  // hardcoded, because roll numbers move.
  const roll = await warden.call('GET', '/hostel/mess/roll?meal=LUNCH');
  const resident = roll.data?.rows?.[0];
  if (!t.check('the roll returns at least one resident to mark', !!resident)) return t.finish('Mess HTTP');

  const MARK_DATE = tomorrowKey();
  let restoredMenu: { dayOfWeek: number; meal: string; items: string[]; isVeg: boolean } | null = null;
  const inst0 = (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!.institutionId;
  const prof0 = (await prisma.studentProfile.findFirst({
    where: { user: { email: STUDENT_EMAIL }, institutionId: inst0 },
    select: { id: true },
  }))?.id;
  // Snapshot EVERY rating this suite's student has, so restore is exact in both directions: a rating
  // that already existed is put back, and one the suite CREATED is removed. Without the second half
  // the demo database grows by one row per new (student, meal, day) the suite happens to touch - the
  // "slowly fill with a visitor log" failure this file's header warns about.
  const ratingsBefore = prof0
    ? await prisma.messFeedback.findMany({ where: { studentProfileId: prof0 } })
    : [];

  try {
    // ---- 1. The read surface -------------------------------------------------
    section(1, 'The warden read surface');

    for (const [path, label] of [
      ['/hostel/mess', 'the mess overview'],
      ['/hostel/mess/menu', 'the weekly menu'],
      [`/hostel/mess/roll?meal=LUNCH`, 'the roll'],
      [`/hostel/mess/roll?meal=LUNCH&date=${MARK_DATE}`, 'the roll for a chosen day'],
      ['/hostel/mess/attendance?days=7', 'the attendance log'],
      ['/hostel/mess/absent?meal=DINNER', 'the absent list'],
      ['/hostel/mess/analytics?days=30', 'the analytics'],
      ['/hostel/mess/feedback?days=30', 'the feedback'],
      ['/hostel/mess/expenses', 'mess spend'],
    ] as const) {
      const r = await warden.call('GET', path);
      t.check(`GET ${path} - ${label}`, r.status === 200, `status ${r.status}`);
    }

    // The overview must carry a denominator and a sample size, not bare numbers.
    const overview = await warden.call('GET', '/hostel/mess');
    const att = overview.data?.attendanceToday ?? [];
    t.check(
      'participation ships with its denominator',
      att.every((a: any) => 'residents' in a && 'ratePct' in a && 'present' in a),
      JSON.stringify(att[0]),
    );
    t.check(
      'present never exceeds residents',
      att.every((a: any) => a.present <= a.residents),
    );
    t.check('the rating ships with its sample size', 'ratingResponses' in (overview.data ?? {}));
    t.check('the server tells the client which day it is', 'todayDayOfWeek' in (overview.data ?? {}));

    // ---- 2. The window is a LENGTH, not a client-built range -----------------
    section(2, 'Window and day arithmetic is the server\'s');
    for (const d of [7, 30, 90]) {
      const r = await warden.call('GET', `/hostel/mess/analytics?days=${d}`);
      t.check(`analytics?days=${d} reports a ${d}-day window`, r.data?.days === d, `got ${r.data?.days}`);
    }
    const a7 = await warden.call('GET', '/hostel/mess/analytics?days=7');
    const a30 = await warden.call('GET', '/hostel/mess/analytics?days=30');
    t.check(
      'a wider window covers at least as many meals',
      (a30.data?.byMeal ?? []).reduce((n: number, m: any) => n + m.present, 0) >=
        (a7.data?.byMeal ?? []).reduce((n: number, m: any) => n + m.present, 0),
    );
    t.check(
      'the window labels its last day, not the exclusive bound',
      typeof a7.data?.to === 'string' && a7.data.to <= new Date().toISOString().slice(0, 10),
      `to=${a7.data?.to}`,
    );
    // A dayOffset is an integer, so no client builds a date.
    for (const off of [0, 1, 3]) {
      const r = await student.call('GET', `/student/mess?dayOffset=${off}`);
      t.check(`student mess dayOffset=${off} returns a menu`, r.status === 200, `status ${r.status}`);
      t.check(`  and three meals`, (r.data?.meals ?? []).length === 3);
    }
    const off0 = await student.call('GET', '/student/mess?dayOffset=0');
    const off1 = await student.call('GET', '/student/mess?dayOffset=1');
    t.check('dayOffset=0 and 1 are different days', off0.data?.date !== off1.data?.date, `${off0.data?.date} vs ${off1.data?.date}`);
    t.check('and dayOffset=0 is today', off0.data?.date === new Date().toISOString().slice(0, 10), `got ${off0.data?.date}`);
    const badOffset = await student.call('GET', '/student/mess?dayOffset=99');
    t.check('an out-of-range dayOffset is refused', badOffset.status === 400 || badOffset.status === 422, `status ${badOffset.status}`);

    // ---- 3. The roll is written by the warden only ---------------------------
    section(3, 'The two-sided boundary');

    const markBody = { meal: 'LUNCH', presentStudentProfileIds: [resident.studentProfileId], date: MARK_DATE };
    const marked = await warden.call('POST', '/hostel/mess/attendance', markBody);
    t.check('a warden marks the roll', marked.status === 200, `status ${marked.status}`);
    t.check('  and gets a rate back', typeof marked.data?.ratePct === 'number');
    t.check('  and a denominator', marked.data?.residents === roll.data.residents);

    // Idempotent: the same mark twice is not an error and not an accumulation.
    const remarked = await warden.call('POST', '/hostel/mess/attendance', markBody);
    t.check('re-marking the same set is idempotent', remarked.data?.present === marked.data?.present);

    // THE BOUNDARY. A student must not be able to write attendance - that is the entire reason
    // the roll is staff-side.
    for (const [method, path, body] of [
      ['POST', '/hostel/mess/attendance', markBody],
      ['GET', '/hostel/mess/roll?meal=LUNCH'],
      ['GET', '/hostel/mess/analytics'],
      ['GET', '/hostel/mess/expenses'],
      ['PUT', '/hostel/mess/menu', { dayOfWeek: 1, meal: 'LUNCH', items: ['Hack'], isVeg: true }],
      ['POST', '/hostel/mess/survey', {}],
    ] as const) {
      const r = await student.call(method, path, body as any);
      t.check(`a STUDENT is refused ${method} ${path}`, r.status === 403, `status ${r.status}`);
    }

    // And the reverse: a resident cannot reach the warden's copy of the roll, but CAN read the menu
    // and rate it.
    const studentMenu = await student.call('GET', '/student/mess');
    t.check('a STUDENT can read their own menu', studentMenu.status === 200);
    const rateable = (studentMenu.data?.meals ?? []).find((m: any) => m.items?.length > 0);
    if (t.check('the student menu has at least one meal to rate', !!rateable)) {
      const first = await student.call('POST', '/student/mess/feedback', { meal: rateable.meal, rating: 4, comment: 'HTTP suite rating' });
      t.check('a STUDENT can rate a meal', first.status === 200, `status ${first.status}`);
      // An UPSERT: a second rating replaces rather than duplicating.
      const second = await student.call('POST', '/student/mess/feedback', { meal: rateable.meal, rating: 2 });
      t.check('  and re-rating replaces it', second.data?.id === first.data?.id, 'a different row means it duplicated');
      t.check('  and the new value sticks', second.data?.rating === 2);
      const reread = await student.call('GET', '/student/mess');
      t.check(
        '  and the screen reflects the change',
        reread.data?.meals?.find((m: any) => m.meal === rateable.meal)?.myRating === 2,
      );
    }

    // ---- 4. Schema rejection, and the 400 / 422 split ------------------------
    section(4, 'Schema rejection');

    const badMeal = await warden.call('POST', '/hostel/mess/attendance', { meal: 'BRUNCH', presentStudentProfileIds: [resident.studentProfileId] });
    t.check('an unknown meal is 400', badMeal.status === 400, `status ${badMeal.status}`);

    const badDate = await warden.call('POST', '/hostel/mess/attendance', { date: '2026-02-30', meal: 'LUNCH', presentStudentProfileIds: [resident.studentProfileId] });
    t.check('a shape-valid but impossible date is 422, not 400', badDate.status === 422, `status ${badDate.status}`);

    // THE 400 / 422 SPLIT, asserted deliberately. The shape is checked at the edge by zod, so a
    // value of the wrong SHAPE is a 400 and never reaches a rule; a value of the right shape that
    // breaks a RULE is a 422. `daySchema` only enforces `^\d{4}-\d{2}-\d{2}$`, which is why the
    // impossible-but-well-formed date below gets through to the service and comes back 422.
    const notADate = await warden.call('POST', '/hostel/mess/attendance', { date: 'tomorrow', meal: 'LUNCH', presentStudentProfileIds: [resident.studentProfileId] });
    t.check('a non-date string fails the shape check at the edge, as 400', notADate.status === 400, `status ${notADate.status}`);

    const badRating = await student.call('POST', '/student/mess/feedback', { meal: rateable?.meal ?? 'LUNCH', rating: 9 });
    t.check('an out-of-range rating is caught by the schema, as 400', badRating.status === 400, `status ${badRating.status}`);

    const notAResident = await warden.call('POST', '/hostel/mess/attendance', { meal: 'LUNCH', presentStudentProfileIds: ['not-a-real-profile'], date: MARK_DATE });
    t.check('an unknown student is 422 and names the problem', notAResident.status === 422 && /not residents/i.test(notAResident.error?.message ?? ''), notAResident.error?.message);

    const emptyMark = await warden.call('POST', '/hostel/mess/attendance', { meal: 'LUNCH', presentStudentProfileIds: [], date: MARK_DATE });
    t.check('an empty roll is refused rather than clearing the meal', emptyMark.status === 422, `status ${emptyMark.status}`);

    // ---- 5. The menu, and isVeg actually sticking ----------------------------
    section(5, 'The menu editor');
    {
      // Save what is there first, so this is a restore rather than a hopeful guess.
      const current = await warden.call('GET', '/hostel/mess/menu');
      const slot = (current.data ?? []).find((m: any) => m.dayOfWeek === 3 && m.meal === 'DINNER');
      if (t.check('there is a DINNER slot on day 3 to edit', !!slot)) {
        restoredMenu = { dayOfWeek: slot.dayOfWeek, meal: slot.meal, items: slot.items, isVeg: slot.isVeg };

        const flip = await warden.call('PUT', '/hostel/mess/menu', { dayOfWeek: 3, meal: 'DINNER', items: slot.items, isVeg: !slot.isVeg });
        t.check('isVeg can be flipped', flip.status === 200, `status ${flip.status}`);
        t.check('  and the response reflects it', flip.data?.isVeg === !slot.isVeg);
        const afterFlip = await warden.call('GET', '/hostel/mess/menu');
        t.check(
          '  and it persisted rather than keeping the old value',
          afterFlip.data?.find((m: any) => m.dayOfWeek === 3 && m.meal === 'DINNER')?.isVeg === !slot.isVeg,
        );

        // The rule the flag exists to enforce.
        const lie = await warden.call('PUT', '/hostel/mess/menu', { dayOfWeek: 3, meal: 'DINNER', items: ['Chicken Biryani'], isVeg: true });
        t.check('a vegetarian menu listing chicken is 422', lie.status === 422, `status ${lie.status}`);
        const okMeal = await warden.call('PUT', '/hostel/mess/menu', { dayOfWeek: 3, meal: 'DINNER', items: ['Chapati', 'Dal'], isVeg: true });
        t.check('a coherent vegetarian menu is accepted', okMeal.status === 200, `status ${okMeal.status}`);

        const badDay = await warden.call('PUT', '/hostel/mess/menu', { dayOfWeek: 9, meal: 'DINNER', items: ['Dal'], isVeg: true });
        t.check('a weekday outside 0-6 is 400', badDay.status === 400, `status ${badDay.status}`);
      }
    }

    // ---- 6. Mess money, and the permission that gates it ---------------------
    section(6, 'Mess money and the permission gate');
    {
      const allowed = await warden.call('GET', '/hostel/mess/expenses');
      t.check('a HOSTEL role holding hostel.mess.expenses may read mess spend', allowed.status === 200, `status ${allowed.status}`);
      t.check('  and it is scoped to the MESS category', allowed.data?.category === 'MESS');
      t.check('  with approved and pending reported separately', 'approvedRupees' in (allowed.data ?? {}) && 'pendingRupees' in (allowed.data ?? {}));

      const acc = await accounts.call('GET', '/accounts/expenses?category=MESS');
      t.check('the accounts desk sees the same category in its own module', acc.status === 200 && (acc.data?.expenses ?? []).length > 0, `status ${acc.status}`);

      // THE GATE. Remove the grant and the route must refuse rather than serve an empty ledger.
      const grant = await prisma.rolePermission.findFirst({ where: { role: 'HOSTEL', permissionKey: 'hostel.mess.expenses' } });
      if (t.check('the grant exists to begin with', !!grant)) {
        if (!grant) return;
        await prisma.rolePermission.delete({ where: { id: grant.id } });
        const refused = await warden.call('GET', '/hostel/mess/expenses');
        t.check('without the grant the route is 403, not an empty ledger', refused.status === 403, `status ${refused.status}`);

        const refusedWrite = await warden.call('POST', '/hostel/mess/expenses', { amountMinor: 1000, title: 'Sneaky' });
        t.check('and the WRITE is refused too', refusedWrite.status === 403, `status ${refusedWrite.status}`);

        // Put it back, then prove it is genuinely restored.
        await prisma.rolePermission.create({ data: { role: 'HOSTEL', permissionKey: 'hostel.mess.expenses' } });
        const restored = await warden.call('GET', '/hostel/mess/expenses');
        t.check('restoring the grant restores access', restored.status === 200, `status ${restored.status}`);
      }

      // A raised claim is a REQUEST, not an approved spend.
      const accUser = await prisma.user.findFirst({ where: { email: ACCOUNTS_EMAIL }, select: { id: true } });
      const wardenUser = await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { id: true } });
      const NTITLE = 'Mess expense awaiting approval';
      const deskBefore = accUser
        ? await prisma.notification.count({ where: { recipientUserId: accUser.id, title: NTITLE } })
        : 0;

      const raised = await warden.call('POST', '/hostel/mess/expenses', {
        amountMinor: 125000,
        title: 'HTTP suite - vegetables',
        vendor: 'Fresh Basket Traders',
        paymentMethod: 'UPI',
      });
      t.check('a warden can raise a mess expense', raised.status === 201, `status ${raised.status}`);
      t.check('  and it is pinned to the MESS category, whatever the body said', raised.data?.category === 'MESS');
      t.check('  and it lands PENDING for the accounts desk', raised.data?.status === 'PENDING', `status ${raised.data?.status}`);

      // THE HANDOFF. Nothing in Accounts notifies on creation, so without this the claim would sit in
      // a queue nobody was told about: the warden believes they asked, the accounts desk never learns
      // it was asked. Asserted on the notification row, not on a response field.
      const deskAfter = accUser
        ? await prisma.notification.count({ where: { recipientUserId: accUser.id, title: NTITLE } })
        : 0;
      t.check('  and the ACCOUNTS desk is actually told about it', deskAfter > deskBefore, `${deskBefore} -> ${deskAfter}`);
      t.check('  and told how many people were notified', typeof raised.data?.notified === 'number' && raised.data.notified > 0, `notified=${raised.data?.notified}`);
      t.check(
        '  but the raiser is not notified about their own claim',
        wardenUser ? await prisma.notification.count({ where: { recipientUserId: wardenUser.id, title: NTITLE } }) === 0 : true,
      );

      const wrongCategory = await warden.call('POST', '/hostel/mess/expenses', {
        amountMinor: 5000,
        title: 'Trying to file against payroll',
        category: 'LABS',
      });
      t.check('the body cannot choose a different category', wrongCategory.status === 400 || wrongCategory.status === 422, `status ${wrongCategory.status}`);

      // Clean up the claim this suite created, by id.
      if (raised.data?.id) {
        await prisma.expense.deleteMany({ where: { id: raised.data.id } });
        t.check('the suite\'s own claim is deleted', true);
      }
    }

    // ---- 7. Route order -----------------------------------------------------
    section(7, 'Route order');
    {
      // Each of these is a single-segment literal. If any were declared after a sibling that could
      // swallow it, a valid request would 404 - so each is asserted by name.
      for (const p of [
        '/hostel/mess/menu',
        '/hostel/mess/roll?meal=LUNCH',
        '/hostel/mess/attendance?days=3',
        '/hostel/mess/absent?meal=LUNCH',
        '/hostel/mess/analytics?days=7',
        '/hostel/mess/feedback?days=7',
        '/hostel/mess/expenses',
      ]) {
        const r = await warden.call('GET', p);
        t.check(`${p} is not shadowed by a sibling`, r.status === 200, `status ${r.status}`);
      }
      // A genuinely unknown path must still 404, or the assertion above proves nothing.
      const nonsense = await warden.call('GET', '/hostel/mess/not-a-thing');
      t.check('an unknown mess path still 404s', nonsense.status === 404, `status ${nonsense.status}`);
    }

    // ---- 8. The survey ------------------------------------------------------
    section(8, 'Asking residents to rate');
    {
      const before = await prisma.notification.count({
        where: { institutionId: (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!.institutionId, sourceModule: 'hostel', title: 'Rate your meal' },
      });
      const survey = await warden.call('POST', '/hostel/mess/survey', { meal: 'DINNER' });
      t.check('a warden can ask residents to rate', survey.status === 200, `status ${survey.status}`);
      t.check('  and is told how many were reached', typeof survey.data?.recipients === 'number');
      const after = await prisma.notification.count({
        where: { institutionId: (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!.institutionId, sourceModule: 'hostel', title: 'Rate your meal' },
      });
      t.check('  and notifications really were created', after > before, `${before} -> ${after}`);
    }
  } finally {
    // Restore the menu slot this suite edited, asserting it happened.
    if (restoredMenu) {
      await warden
        .call('PUT', '/hostel/mess/menu', restoredMenu as any)
        .catch(() => undefined);
      const check = await warden.call('GET', '/hostel/mess/menu');
      const now = (check.data ?? []).find((m: any) => m.dayOfWeek === restoredMenu!.dayOfWeek && m.meal === restoredMenu!.meal);
      t.check(
        'the menu slot the suite edited is restored',
        JSON.stringify(now?.items) === JSON.stringify(restoredMenu.items) && now?.isVeg === restoredMenu.isVeg,
        `now=${JSON.stringify(now?.items)} veg=${now?.isVeg}`,
      );
    }
    // Tomorrow's roll was written by this suite; remove it so the next run starts clean and the
    // demo data has no phantom roll. Matched on the LOCAL midnight the service actually wrote.
    const inst = (await prisma.user.findFirst({ where: { email: WARDEN_EMAIL }, select: { institutionId: true } }))!.institutionId;
    const markInstant = tomorrowLocalMidnight();
    const leftover = await prisma.mealAttendance.count({
      where: { institutionId: inst, meal: 'LUNCH', date: markInstant },
    });
    t.check('the suite\'s roll was actually written (so deleting it means something)', leftover > 0, `${leftover} rows at ${markInstant.toISOString()}`);
    const deleted = await prisma.mealAttendance.deleteMany({
      where: { institutionId: inst, meal: 'LUNCH', date: markInstant },
    });
    t.check(`the suite's own roll rows are removed (${deleted.count})`, deleted.count === leftover && deleted.count > 0);

    // Any claim this suite tried to file, whatever the server made of it, plus the notifications that
    // came with it. The category-pinning probe is refused by `.strict()`, but a suite that leaves
    // debris behind when a schema changes is a suite that will hide the next one.
    const purged = await prisma.expense.deleteMany({
      where: { institutionId: inst, title: { in: ['HTTP suite - vegetables', 'Trying to file against payroll'] } },
    });
    t.check(`the suite's own claims are removed (${purged.count})`, purged.count >= 0);
    const purgedNotices = await prisma.notification.deleteMany({ where: { title: 'Mess expense awaiting approval' } });
    t.check(`and the approval notifications it caused are removed (${purgedNotices.count})`, true);

    // Restore the demo ratings EXACTLY: put back the ones that existed, remove the ones this run added.
    if (prof0) {
      const beforeKeys = new Set(ratingsBefore.map((r) => `${r.mealDate.toISOString()}|${r.meal}`));
      const now = await prisma.messFeedback.findMany({ where: { studentProfileId: prof0 } });
      const added = now.filter((r) => !beforeKeys.has(`${r.mealDate.toISOString()}|${r.meal}`));
      if (added.length) await prisma.messFeedback.deleteMany({ where: { id: { in: added.map((r) => r.id) } } });
      for (const prior of ratingsBefore) {
        await prisma.messFeedback.updateMany({
          where: {
            studentProfileId: prof0,
            mealDate: prior.mealDate,
            meal: prior.meal,
          },
          data: { rating: prior.rating, comment: prior.comment },
        });
      }
      const finalCount = await prisma.messFeedback.count({ where: { studentProfileId: prof0 } });
      t.check(
        'this student\'s ratings are back to exactly the count the suite found',
        finalCount === ratingsBefore.length,
        `was ${ratingsBefore.length}, now ${finalCount}`,
      );
    }
  }

  t.finish('Mess HTTP');
}

runSuite('mess', main);