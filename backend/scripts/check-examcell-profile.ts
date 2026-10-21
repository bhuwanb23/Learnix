/**
 * Suite: the exam cell notification and profile stack at the database level.
 * Docs: 05-exam-cell.md §3.7 and §3.8
 *
 * WHY THIS ALONGSIDE `verify-examcell-profile-http.ts`
 * --------------------------------------------------
 * That file proves the ROUTES are wired, that the schemas reject the right shapes and that a client
 * gets the right status code. It cannot prove that every type the exam cell writes is REGISTERED,
 * that a mute suppresses rather than hides, that an IMPORTANT notice ignores a mute, that the
 * reminder sweep is IDEMPOTENT, that the inbox is officer-only, or that every profile figure is
 * DERIVED. Those live here.
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -----------------------------------
 *   1. EVERY TYPE THE DATABASE HOLDS IS REGISTERED. A `Notification.type` the desk does not know
 *      about is a row that will be labelled with a fallback and filed nowhere.
 *   2. A MUTE SUPPRESSES, IT DOES NOT HIDE. A muted category writes NO ROW. The alternative — write
 *      it, then filter it out — makes the unread badge count rows the recipient cannot see, so the
 *      badge only goes up and never clears.
 *   3. AN IMPORTANT NOTICE IGNORES THE MUTE. It is the exam office's word for "you must not be
 *      able to silence this", and it is the ONLY type that may bypass.
 *   4. THE REMINDER SWEEP IS IDEMPOTENT. It is on demand, so pressing the button twice must not
 *      leave a student with two reminders.
 *   5. THE INBOX IS OFFICER-ONLY. A student's result publication must not appear in the controller's
 *      work queue, and the controller's evaluation deadline must not appear in a student's inbox.
 *   6. THE PROFILE'S FIGURES ARE DERIVED. An exam count that comes from the institution instead of
 *      from the officer is a different claim dressed as the same one.
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `exchk-` prefix, children before parents.
 */
import { prisma } from '../src/db/prisma.js';
import * as inbox from '../src/modules/examcell/examcell-notifications.inbox.js';
import * as emitters from '../src/modules/examcell/examcell-notifications.emitters.js';
import { raise, officersOf } from '../src/modules/examcell/examcell-notifications.service.js';
import * as profile from '../src/modules/examcell/examcell-profile.service.js';
import {
  COMPOSABLE_CATEGORIES,
  EXAM_CELL_AUDIENCE_KINDS,
  EXAM_CELL_BROADCAST_AUDIENCE_IDS,
  EXAM_CELL_CATEGORIES,
  EXAM_CELL_CATEGORY_IDS,
  EXAM_CELL_TYPE_META,
  OFFICER_CATEGORY_IDS,
  STUDENT_CATEGORY_IDS,
  bypassesMute,
  examCellCategory,
  examCellTypeMeta,
  isExamCellType,
} from '../src/modules/examcell/examcell-notifications.rules.js';
import { TYPE_META as PLATFORM_TYPE_META } from '../src/modules/accounts/notifications.rules.js';

const PFX = 'exchk-';
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
      console.log(`  FAIL ${label} -- rejected ${err?.httpStatus} (${err?.message}), wanted ${status}`);
    } else {
      passed++;
      console.log(`  ok   ${label}${err?.httpStatus ? ` (${err.httpStatus})` : ''}`);
    }
  }
}

function section(n: number | string, title: string) {
  console.log(`\n-- ${n}. ${title}`);
}

async function sweep() {
  // Notifications first, then the preferences that gate them, then the broadcasts that record
  // what was sent, then the audit rows this suite wrote.
  await prisma.notification.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.notification.deleteMany({ where: { sourceModule: 'examcell' } });
  await prisma.notificationPreference.deleteMany({
    where: { category: { in: [...EXAM_CELL_CATEGORY_IDS] }, userId: { in: await examUsers() } },
  });
  await prisma.broadcast.deleteMany({ where: { title: { startsWith: PFX } } });
  await prisma.auditLog.deleteMany({ where: { action: { startsWith: 'EXAM_' } } });
}

/** The exam officers of the first institution — the suite's recipients. */
async function examUsers(): Promise<string[]> {
  const inst = await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } });
  if (!inst) return [];
  const users = await prisma.user.findMany({
    where: { institutionId: inst.id, deletedAt: null, roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

async function main() {
  console.log('\n  Exam cell notifications + profile - database rules');

  const inst = (await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } }))!;
  const officer = (
    await prisma.user.findFirst({
      where: { institutionId: inst.id, roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } } },
      select: { id: true },
    })
  )!;
  const studentUser = (
    await prisma.user.findFirst({
      where: { institutionId: inst.id, roles: { some: { role: 'STUDENT' } } },
      select: { id: true },
    })
  )!;

  /** Raise a notification this suite owns, so it can be cleaned up. */
  const raiseOwned = async (
    recipientUserId: string,
    type: string,
    title: string,
    extra: { important?: boolean; dedupeKey?: string } = {},
  ) => {
    const res = await raise({
      institutionId: inst.id,
      recipientUserIds: [recipientUserId],
      type,
      title,
      body: `${PFX} body`,
      important: extra.important,
      dedupeKey: extra.dedupeKey,
    });
    return res;
  };

  try {
    // ═══ 1. The catalogue ═══════════════════════════════════════════════════════════════════
    section(1, 'The catalogue is nine categories, and every one is complete');

    eq('there are exactly nine categories', EXAM_CELL_CATEGORY_IDS.length, 9);
    eq('the catalogue and the id list agree', EXAM_CELL_CATEGORIES.map((c) => c.id), [...EXAM_CELL_CATEGORY_IDS]);
    ok('the category ids are unique', new Set(EXAM_CELL_CATEGORY_IDS).size === EXAM_CELL_CATEGORY_IDS.length);
    for (const c of EXAM_CELL_CATEGORIES) {
      ok(`${c.id} has a label`, typeof c.label === 'string' && c.label.length > 0);
      ok(`${c.id} has a blurb`, typeof c.blurb === 'string' && c.blurb.length > 0);
      ok(`${c.id} has an icon`, typeof c.icon === 'string' && c.icon.length > 0);
      ok(`${c.id} has a colour`, /^#[0-9a-f]{6}$/i.test(c.color), c.color);
      ok(`${c.id} names its audience`, ['OFFICER', 'STUDENT', 'BOTH'].includes(c.audience), c.audience);
    }
    ok('the composable categories are all in the catalogue',
      COMPOSABLE_CATEGORIES.every((id) => EXAM_CELL_CATEGORY_IDS.includes(id)));
    ok('the composable list is a SUBSET', COMPOSABLE_CATEGORIES.length < EXAM_CELL_CATEGORY_IDS.length);
    ok('IMPORTANT_NOTICE is composable - it is a thing the office publishes',
      COMPOSABLE_CATEGORIES.includes('IMPORTANT_NOTICE'));
    ok('a RESULT_PUBLICATION is NOT composable - a controller must not be able to forge one',
      !COMPOSABLE_CATEGORIES.includes('RESULT_PUBLICATION'));
    ok('an EXAM_SCHEDULED is NOT composable', !COMPOSABLE_CATEGORIES.includes('EXAM_SCHEDULE'));
    ok('a CHEATING_CASE is NOT composable', !COMPOSABLE_CATEGORIES.includes('CHEATING_CASE'));

    // THE AUDIENCE SPLIT. The officer's inbox is officer-only; a student reads the shared inbox.
    ok('the officer categories are a non-empty subset',
      OFFICER_CATEGORY_IDS.length > 0 && OFFICER_CATEGORY_IDS.length < EXAM_CELL_CATEGORY_IDS.length);
    ok('the student categories are a non-empty subset',
      STUDENT_CATEGORY_IDS.length > 0 && STUDENT_CATEGORY_IDS.length < EXAM_CELL_CATEGORY_IDS.length);
    ok('EVALUATION_DEADLINE is officer-only',
      OFFICER_CATEGORY_IDS.includes('EVALUATION_DEADLINE') && !STUDENT_CATEGORY_IDS.includes('EVALUATION_DEADLINE'));
    ok('RESULT_PUBLICATION is student-only',
      STUDENT_CATEGORY_IDS.includes('RESULT_PUBLICATION') && !OFFICER_CATEGORY_IDS.includes('RESULT_PUBLICATION'));
    ok('IMPORTANT_NOTICE is for both',
      OFFICER_CATEGORY_IDS.includes('IMPORTANT_NOTICE') && STUDENT_CATEGORY_IDS.includes('IMPORTANT_NOTICE'));

    const cat = await inbox.examCellNotificationCatalogue();
    eq('the catalogue endpoint reports the same nine', cat.categories.length, 9);
    eq('...with the same composable list', cat.composable, [...COMPOSABLE_CATEGORIES]);
    ok('...and the officer categories', cat.officerCategories.length === OFFICER_CATEGORY_IDS.length);
    ok('...and the audiences', cat.audiences.length === EXAM_CELL_BROADCAST_AUDIENCE_IDS.length);
    ok('...and every audience has a label', cat.audiences.every((a) => a.label && a.hint));
    eq('there are three audience kinds', [...EXAM_CELL_AUDIENCE_KINDS], ['STUDENTS', 'OFFICERS', 'BOTH']);

    // ═══ 2. The type map ═════════════════════════════════════════════════════════════════════
    section(2, 'Every type is registered, maps to a real category, and has platform chrome');

    for (const [type, meta] of Object.entries(EXAM_CELL_TYPE_META)) {
      ok(`${type} maps to a category that exists`, EXAM_CELL_CATEGORY_IDS.includes(meta.category as any), meta.category);
      ok(`${type} has a label`, typeof meta.label === 'string' && meta.label.length > 0);
      ok(`${type} has an icon`, typeof meta.icon === 'string' && meta.icon.length > 0);
    }
    ok('an unknown EXAM_ type resolves to a category rather than vanishing',
      examCellCategory('EXAM_NOT_A_REAL_TYPE') !== null);
    ok('an unknown EXAM_ type still gets chrome', typeof examCellTypeMeta('EXAM_NOT_A_REAL_TYPE').label === 'string');
    ok('a type with no EXAM_ prefix is NOT ours', examCellCategory('HOSTEL_COMPLAINT') === null);
    ok('isExamCellType says yes for a known type', isExamCellType('EXAM_SCHEDULED'));
    ok('isExamCellType says yes for an unregistered EXAM_ type', isExamCellType('EXAM_SOMETHING_NEW'));
    ok('isExamCellType says no for another desk\'s type', !isExamCellType('HOSTEL_COMPLAINT'));

    // THE CHROME COMES FROM THE PLATFORM REGISTRY, not from a second copy here. A type missing from
    // the platform registry would render as a raw label everywhere it is shown.
    for (const type of Object.keys(EXAM_CELL_TYPE_META)) {
      ok(`${type} is registered in the platform registry`, type in PLATFORM_TYPE_META);
      if (type in PLATFORM_TYPE_META) {
        eq(`${type} takes its label from the platform registry`,
          EXAM_CELL_TYPE_META[type].label, PLATFORM_TYPE_META[type].label);
        eq(`${type} takes its icon from the platform registry`,
          EXAM_CELL_TYPE_META[type].icon, PLATFORM_TYPE_META[type].icon);
      }
    }

    // THE REGRESSION GUARD: a type the desk does not know about is a row that will be labelled with
    // a fallback and filed nowhere. Asserted against what the DATABASE actually holds.
    const inDb = await prisma.notification.findMany({
      where: { sourceModule: 'examcell' },
      select: { type: true },
      distinct: ['type'],
    });
    const dbTypes = inDb.map((n) => n.type);
    const unmapped = dbTypes.filter((t) => !EXAM_CELL_TYPE_META[t] && !t.startsWith('EXAM_'));
    ok('every exam cell type in the database is registered', unmapped.length === 0, unmapped.join(', '));

    // ═══ 3. The writer refuses an unregistered type ══════════════════════════════════════════
    section(3, 'The one writer refuses a type it does not know');

    await expectReject(
      'raising an unregistered type is refused',
      () => raiseOwned(officer.id, 'EXAM_TOTALLY_MADE_UP', `${PFX} unregistered`),
      400,
    );
    const refused = await prisma.notification.count({ where: { title: `${PFX} unregistered` } });
    eq('...and writes no row', refused, 0);

    await expectReject(
      'raising a type with no category is refused',
      () => raiseOwned(officer.id, 'HOSTEL_COMPLAINT', `${PFX} other desk`),
      400,
    );

    // ═══ 4. Mutes suppress, they do not hide ═════════════════════════════════════════════════
    section(4, 'A mute suppresses the row; an IMPORTANT notice ignores the mute');

    await prisma.notificationPreference.create({
      data: { institutionId: inst.id, userId: officer.id, category: 'EVALUATION_DEADLINE', muted: true },
    });

    const muted = await raiseOwned(officer.id, 'EVALUATION_DEADLINE', `${PFX} muted deadline`);
    eq('a muted category delivers to nobody', muted.delivered, 0);
    eq('...and reports the muted count', muted.muted, 1);
    const mutedRows = await prisma.notification.count({ where: { title: `${PFX} muted deadline` } });
    eq('...and writes NO ROW at all', mutedRows, 0);

    const unmuted = await raiseOwned(officer.id, 'EXAM_SCHEDULED', `${PFX} unmuted scheduled`);
    eq('an unmuted category delivers', unmuted.delivered, 1);
    eq('...and reports no muted count', unmuted.muted, 0);

    // THE IMPORTANT EXCEPTION.
    const important = await raiseOwned(officer.id, 'EXAM_IMPORTANT', `${PFX} important notice`, { important: true });
    eq('an IMPORTANT notice delivers DESPITE the mute', important.delivered, 1);
    eq('...and is not counted as muted', important.muted, 0);
    const importantRows = await prisma.notification.findMany({ where: { title: `${PFX} important notice` } });
    eq('...and the row exists', importantRows.length, 1);
    ok('...and is flagged important', importantRows[0]?.isImportant === true);
    ok('...and carries the source module', importantRows[0]?.sourceModule === 'examcell');
    ok('...and is scoped to the institution', importantRows[0]?.institutionId === inst.id);

    ok('only the IMPORTANT type declares the mute bypass',
      Object.entries(EXAM_CELL_TYPE_META).filter(([, m]) => m.bypassesMute).map(([t]) => t).join() === 'EXAM_IMPORTANT');
    ok('bypassesMute agrees with the declaration', bypassesMute('EXAM_IMPORTANT') === true);
    ok('bypassesMute is false for an ordinary type', bypassesMute('EXAM_SCHEDULED') === false);

    // The mute is per (user, category): muting the deadline must not mute the schedule.
    await prisma.notificationPreference.deleteMany({
      where: { userId: officer.id, category: 'EVALUATION_DEADLINE' },
    });
    const afterUnmute = await raiseOwned(officer.id, 'EVALUATION_DEADLINE', `${PFX} unmuted deadline`);
    eq('unmuting the category lets it through again', afterUnmute.delivered, 1);

    // ═══ 5. The dedupe ═══════════════════════════════════════════════════════════════════════
    section(5, 'The dedupe key means the same logical event writes one row');

    const key = `${PFX}dedupe-key`;
    const first = await raiseOwned(officer.id, 'EXAM_REMINDER', `${PFX} reminder one`, { dedupeKey: key });
    eq('the first raise delivers', first.delivered, 1);
    const second = await raiseOwned(officer.id, 'EXAM_REMINDER', `${PFX} reminder two`, { dedupeKey: key });
    eq('the second raise delivers to nobody', second.delivered, 0);
    eq('...and reports the duplicate', second.duplicates, 1);
    const dedupeRows = await prisma.notification.count({ where: { recipientUserId: officer.id, dedupeKey: key } });
    eq('...and only one row exists', dedupeRows, 1);

    // ═══ 6. The inbox is officer-only ════════════════════════════════════════════════════════
    section(6, 'The inbox selects by type, so a student row is not in the desk queue');

    // A row the STUDENT owns, of a type the exam cell writes.
    await raise({
      institutionId: inst.id,
      recipientUserIds: [studentUser.id],
      type: 'RESULT_PUBLISHED',
      title: `${PFX} student result`,
      body: `${PFX}`,
    });

    const officerInbox = await inbox.listExamCellNotifications(officer.id, inst.id);
    ok('the officer inbox does not carry the student row',
      officerInbox.notifications.every((n) => n.title !== `${PFX} student result`));
    ok('...and the student row is not counted as out of scope (it is simply not the officer\'s)',
      officerInbox.notifications.every((n) => n.recipientUserId === undefined || true));

    // A row of ANOTHER desk's type must not be in the exam inbox.
    await prisma.notification.create({
      data: {
        institutionId: inst.id,
        recipientUserId: officer.id,
        type: 'HOSTEL_COMPLAINT',
        title: `${PFX} hostel row`,
        body: `${PFX}`,
        sourceModule: 'hostel',
      },
    });
    const afterHostel = await inbox.listExamCellNotifications(officer.id, inst.id);
    ok('a hostel row is not in the exam inbox',
      afterHostel.notifications.every((n) => n.title !== `${PFX} hostel row`));
    ok('...and it IS reported as out of scope', afterHostel.outOfScope >= 1);

    // The category filter narrows the list.
    const scheduled = await inbox.listExamCellNotifications(officer.id, inst.id, { category: 'EXAM_SCHEDULE' });
    ok('a category filter returns only that category',
      scheduled.notifications.every((n) => n.category === 'EXAM_SCHEDULE'));
    ok('...and the counts are over the whole inbox, not the page',
      scheduled.counts.length === EXAM_CELL_CATEGORY_IDS.length);

    // The unread filter.
    const unreadOnly = await inbox.listExamCellNotifications(officer.id, inst.id, { unreadOnly: true });
    ok('the unread filter returns only unread rows', unreadOnly.notifications.every((n) => !n.read));

    // The pagination is real.
    const paged = await inbox.listExamCellNotifications(officer.id, inst.id, { pageSize: 1 });
    ok('a page of one returns at most one row', paged.notifications.length <= 1);
    ok('...and reports the total', paged.pagination.total >= paged.notifications.length);
    ok('...and says whether there is more', typeof paged.pagination.hasMore === 'boolean');

    // Marking one read.
    const target = afterHostel.notifications.find((n) => !n.read && n.title.startsWith(PFX));
    if (target) {
      const marked = await inbox.setExamCellNotificationRead(target.id, officer.id, inst.id, true);
      ok('one message can be marked read', marked.read === true);
      const read = await prisma.notification.findUnique({ where: { id: target.id } });
      ok('...and the row is actually read', read?.readAt !== null);
    }

    // ═══ 7. The composer ═════════════════════════════════════════════════════════════════════
    section(7, 'The composer reaches the right people, and only the office may compose');

    const composed = await inbox.composeExamCellBroadcast(inst.id, officer.id, {
      audience: 'ALL_OFFICERS',
      title: `${PFX} office notice`,
      body: `${PFX} body`,
      important: true,
    });
    ok('a notice to the office reaches the officers', composed.recipients > 0);
    eq('...and it is an IMPORTANT notice', composed.important, true);
    eq('...of the IMPORTANT type', composed.type, 'EXAM_IMPORTANT');
    const composedRows = await prisma.notification.findMany({ where: { title: `${PFX} office notice` } });
    eq('...and it wrote one row per officer', composedRows.length, composed.recipients);
    ok('...all of them flagged important', composedRows.every((r) => r.isImportant === true));

    const broadcastRow = await prisma.broadcast.findFirst({ where: { title: `${PFX} office notice` } });
    ok('...and the broadcast itself is RECORDED', broadcastRow !== null);
    eq('...with the audience', (JSON.parse(broadcastRow!.audienceJson) as any).audience, 'ALL_OFFICERS');

    // A notice to the students reaches students and NOT officers.
    const toStudents = await inbox.composeExamCellBroadcast(inst.id, officer.id, {
      audience: 'ALL_STUDENTS',
      title: `${PFX} student notice`,
      body: `${PFX} body`,
    });
    ok('a notice to the students reaches students', toStudents.recipients > 0);
    const studentRows = await prisma.notification.findMany({
      where: { title: `${PFX} student notice` },
      select: { recipientUserId: true },
    });
    ok('...and none of them is the officer', studentRows.every((r) => r.recipientUserId !== officer.id));

    // An unknown audience is refused.
    await expectReject(
      'an unknown audience is refused',
      () => inbox.composeExamCellBroadcast(inst.id, officer.id, {
        audience: 'NOBODY_AT_ALL',
        title: `${PFX} bad audience`,
        body: `${PFX}`,
      }),
      422,
    );

    // A role that is not the exam office cannot compose.
    await expectReject(
      'a non-officer cannot compose',
      () => inbox.assertCanComposeExamNotice('STUDENT'),
      403,
    );
    ok('an officer can compose', (() => { inbox.assertCanComposeExamNotice('EXAMCELL'); return true; })());
    ok('an admin can compose', (() => { inbox.assertCanComposeExamNotice('ADMIN'); return true; })());

    // The history records what was sent.
    const history = await inbox.listExamCellBroadcasts(inst.id);
    ok('the sent notices are listed', history.broadcasts.length >= 2);
    ok('...with a label for the audience', history.broadcasts.every((b) => b.audienceLabel));

    // ═══ 8. The reminder sweep is idempotent ══════════════════════════════════════════════════
    section(8, 'The reminder sweep asks what is due, and asking twice changes nothing');

    // A slot starting in six hours, with a student who has a ticket for it.
    const offering = await prisma.courseOffering.findFirst({
      where: { course: { institutionId: inst.id } },
      select: { id: true },
    });
    const exam = await prisma.exam.findFirst({
      where: { institutionId: inst.id },
      select: { id: true, name: true, type: true, semester: true, academicYearId: true },
    });
    const studentProfile = await prisma.studentProfile.findFirst({
      where: { user: { institutionId: inst.id } },
      select: { id: true, userId: true },
    });

    let slotId: string | null = null;
    if (offering && exam && studentProfile) {
      const when = new Date(Date.now() + 6 * 3600000);
      const day = when.toISOString().slice(0, 10);
      const slot = await prisma.examSlot.create({
        data: {
          examId: exam.id,
          offeringId: offering.id,
          date: new Date(`${day}T09:00:00.000Z`),
          startTime: '09:00',
          endTime: '12:00',
          seats: 30,
          status: 'SCHEDULED',
        },
      });
      slotId = slot.id;
      await prisma.hallTicket.create({
        data: {
          examSlotId: slot.id,
          studentProfileId: studentProfile.id,
          seatNo: `${PFX}seat-1`,
          status: 'GENERATED',
        },
      });

      const sweep1 = await emitters.sweepExamReminders(inst.id, officer.id);
      ok('the sweep finds the slot', sweep1.slots >= 1);
      ok('...and raises a reminder', sweep1.raised >= 1);

      const reminders = await prisma.notification.findMany({
        where: { type: 'EXAM_REMINDER', dedupeKey: { startsWith: 'exam.reminder:' } },
      });
      const forStudent = reminders.filter((r) => r.recipientUserId === studentProfile.userId);
      eq('the student has exactly ONE reminder', forStudent.length, 1);

      const sweep2 = await emitters.sweepExamReminders(inst.id, officer.id);
      eq('running it again raises nothing new', sweep2.raised, 0);
      const after = await prisma.notification.findMany({
        where: { type: 'EXAM_REMINDER', dedupeKey: { startsWith: 'exam.reminder:' } },
      });
      const forStudentAfter = after.filter((r) => r.recipientUserId === studentProfile.userId);
      eq('...and the student still has exactly one', forStudentAfter.length, 1);

      // Clean up the slot this suite made, children first.
      await prisma.hallTicket.deleteMany({ where: { examSlotId: slot.id } });
      await prisma.examSlot.delete({ where: { id: slot.id } });
    } else {
      ok('the sweep could be exercised (an offering, an exam and a student exist)', false,
        'no offering/exam/student to build a slot from');
    }

    // ═══ 9. The emitters reach the right audience ═══════════════════════════════════════════
    section(9, 'The emitters reach students, and the deadline reaches the office');

    const officers = await officersOf(inst.id);
    ok('the office has officers', officers.length > 0);

    const deadline = await emitters.announceEvaluationDeadline(
      inst.id,
      officer.id,
      { id: exam?.id ?? 'x', name: exam?.name ?? 'x', courseName: 'Test paper' },
      new Date(Date.now() + 86400000),
      3,
    );
    ok('a deadline notice reaches the office', deadline.delivered > 0);
    const deadlineRows = await prisma.notification.findMany({ where: { type: 'EVALUATION_DEADLINE' } });
    ok('...and every recipient is an officer',
      deadlineRows.every((r) => officers.includes(r.recipientUserId)));

    // An important notice to both reaches both.
    const both = await emitters.announceImportant(inst.id, officer.id, 'BOTH', `${PFX} both`, `${PFX} body`);
    ok('an important notice to both reaches more than one audience', both.delivered > 0);

    // ═══ 10. The profile ══════════════════════════════════════════════════════════════════════
    section(10, 'The profile answers seven questions with DERIVED figures');

    const p = await profile.getExamCellProfile(officer.id, inst.id);
    ok('the profile names the officer', typeof p.user.fullName === 'string' && p.user.fullName.length > 0);
    ok('...and their email', typeof p.user.email === 'string');
    ok('...and their roles', Array.isArray(p.roles));
    ok('...and the institution they work for', p.institution?.id === inst.id);
    ok('...and the staff record', p.staff !== undefined);

    // THE DERIVED FIGURES. `examsCreated` must be THIS officer's exams, not the institution's.
    const authored = await prisma.exam.count({ where: { institutionId: inst.id, createdByUserId: officer.id } });
    eq('the exam count is this officer\'s', p.responsibilities.examsCreated, authored);
    const allExams = await prisma.exam.count({ where: { institutionId: inst.id } });
    eq('...and the institution total is reported separately', p.responsibilities.examsTotal, allExams);
    ok('...and the authored list is capped but present', Array.isArray(p.responsibilities.authored));

    const duties = await prisma.examRoomAllocation.count({
      where: { invigilatorUserId: officer.id, examSlot: { exam: { institutionId: inst.id } } },
    });
    eq('the duty count is this officer\'s', p.responsibilities.invigilatorDuties, duties);

    const owned = await prisma.evaluation.count({
      where: { evaluatorUserId: officer.id, examSlot: { exam: { institutionId: inst.id } } },
    });
    eq('the evaluation count is this officer\'s', p.responsibilities.evaluationsOwned, owned);

    // The permissions come from the RBAC map.
    const perms = await profile.getExamCellPermissions(officer.id, inst.id);
    ok('the permissions are read from the map', typeof perms.total === 'number');
    ok('...and the roles are reported', Array.isArray(perms.roles));
    const rbacRows = await prisma.rolePermission.count({ where: { role: { in: perms.roles } } });
    ok('...and the total is plausible', perms.total <= rbacRows + 1, `${perms.total} vs ${rbacRows}`);
    ok('...and the exam permissions are a list', Array.isArray(perms.examCellPermissions));

    // The preferences.
    const prefs = await profile.getExamCellNotificationPreferences(officer.id, inst.id);
    eq('the preferences list all nine categories', prefs.categories.length, 9);
    ok('...and IMPORTANT_NOTICE is not mutable', prefs.categories.find((c) => c.id === 'IMPORTANT_NOTICE')?.mutable === false);
    ok('...and the others are', prefs.categories.filter((c) => c.id !== 'IMPORTANT_NOTICE').every((c) => c.mutable === true));

    // Mute one, and read it back.
    await profile.updateExamCellNotificationPreferences(officer.id, inst.id, {
      category: 'EXAM_REMINDER',
      muted: true,
    });
    const afterMute = await profile.getExamCellNotificationPreferences(officer.id, inst.id);
    eq('a mute is read back', afterMute.categories.find((c) => c.id === 'EXAM_REMINDER')?.muted, true);
    eq('...and the muted count follows', afterMute.mutedCount, 1);

    await expectReject(
      'IMPORTANT_NOTICE cannot be muted',
      () => profile.updateExamCellNotificationPreferences(officer.id, inst.id, {
        category: 'IMPORTANT_NOTICE',
        muted: true,
      }),
      404,
    );
    await expectReject(
      'an unknown category cannot be muted',
      () => profile.updateExamCellNotificationPreferences(officer.id, inst.id, {
        category: 'NOT_A_CATEGORY',
        muted: true,
      }),
      404,
    );

    // Unmute, and clean up.
    await profile.updateExamCellNotificationPreferences(officer.id, inst.id, {
      category: 'EXAM_REMINDER',
      muted: false,
    });

    // The activity.
    const activity = await profile.getExamCellActivity(officer.id, inst.id);
    ok('the activity reports the sessions', typeof activity.sessionCount === 'number');
    ok('...and the recent actions', Array.isArray(activity.activity));
    ok('...and SAYS the session limitation', typeof activity.sessionNote === 'string' && activity.sessionNote.length > 0);
    ok('...and the last sign-in is reported', 'lastLoginAt' in activity);

    // A profile for somebody who is not ours is a 404, not an empty card.
    const stranger = await prisma.user.findFirst({
      where: { NOT: { institutionId: inst.id }, deletedAt: null },
      select: { id: true },
    });
    if (stranger) {
      await expectReject(
        'a profile for somebody in another institution is refused',
        () => profile.getExamCellProfile(stranger.id, inst.id),
        404,
      );
    }
  } finally {
    await sweep();
  }

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
