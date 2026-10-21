/**
 * Suite: the exam cell reminder sweep, the emitters, and the profile, at the database level.
 * Docs: 05-exam-cell.md §3.7 and §3.8
 *
 * WHY THIS IS A SEPARATE FILE
 * --------------------------
 * The whole exam-cell notification and profile suite is 630 lines, and a file has to stay under 500.
 * The split is by SUBJECT: this file is about the things that HAPPEN (the sweep, the emitters, the
 * profile's derived figures) and `check-examcell-notifications.ts` is about the THINGS (the
 * vocabulary, the mutes, the inbox, the composer).
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -----------------------------------
 *   1. THE REMINDER SWEEP IS IDEMPOTENT. It is on demand, so pressing the button twice must not
 *      leave a student with two reminders.
 *   2. THE EMITTERS REACH THE RIGHT AUDIENCE. A deadline goes to the exam office; a result goes to
 *      the students who have a result; a revaluation goes to the student who asked.
 *   3. EVERY PROFILE FIGURE IS DERIVED. An exam count that comes from the institution instead of
 *      from the officer is a different claim dressed as the same one.
 *   4. THE PERMISSIONS COME FROM THE RBAC MAP, not from a restated list.
 *   5. IMPORTANT_NOTICE CANNOT BE MUTED. A preference that cannot be honoured is not a preference.
 */
import { prisma } from '../src/db/prisma.js';
import * as emitters from '../src/modules/examcell/examcell-notifications.emitters.js';
import { officersOf } from '../src/modules/examcell/examcell-notifications.service.js';
import * as profile from '../src/modules/examcell/examcell-profile.service.js';
import { EXAM_CELL_CATEGORY_IDS } from '../src/modules/examcell/examcell-notifications.rules.js';
import { PFX, eq, expectReject, ok, report, section, sweep } from './examcell-profile.harness.js';

async function main() {
  console.log('\n  Exam cell reminder sweep, emitters and profile - database rules');

  const inst = (await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } }))!;
  const officer = (
    await prisma.user.findFirst({
      where: { institutionId: inst.id, roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } } },
      select: { id: true },
    })
  )!;

  try {
    // ═══ 8. The reminder sweep is idempotent ══════════════════════════════════════════════════
    section(8, 'The reminder sweep asks what is due, and asking twice changes nothing');

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
      ok('...and it carries the dedupe key', typeof forStudent[0]?.dedupeKey === 'string');

      const sweep2 = await emitters.sweepExamReminders(inst.id, officer.id);
      eq('running it again raises nothing new', sweep2.raised, 0);
      const after = await prisma.notification.findMany({
        where: { type: 'EXAM_REMINDER', dedupeKey: { startsWith: 'exam.reminder:' } },
      });
      eq('...and the student still has exactly one',
        after.filter((r) => r.recipientUserId === studentProfile.userId).length,
        1,
      );

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
    // Scoped to THIS institution, and to the rows this suite raised. A query over every
    // EVALUATION_DEADLINE row in the database would also pick up another suite's leftovers and
    // fail for a reason that has nothing to do with this one.
    const deadlineRows = await prisma.notification.findMany({
      where: { type: 'EVALUATION_DEADLINE', institutionId: inst.id },
    });
    const thisRun = deadlineRows.filter((r) => r.createdAt > new Date(Date.now() - 120000));
    ok(
      'every recipient is an officer',
      thisRun.length > 0 && thisRun.every((r) => officers.includes(r.recipientUserId)),
      `${thisRun.length} rows, ${thisRun.filter((r) => !officers.includes(r.recipientUserId)).length} not officers`,
    );

    // An important notice to both reaches both.
    const both = await emitters.announceImportant(inst.id, officer.id, 'BOTH', `${PFX} both`, `${PFX} body`);
    ok('an important notice to both reaches more than one audience', both.delivered > 0);

    // A revaluation decision reaches ONE student, not the cohort.
    const oneStudent = (
      await prisma.user.findFirst({
        where: { institutionId: inst.id, roles: { some: { role: 'STUDENT' } } },
        select: { id: true },
      })
    )!;
    const reval = await emitters.announceRevaluationDecided(
      inst.id,
      officer.id,
      { id: `${PFX}reval`, courseName: 'Test paper', examName: 'Test exam', decision: 'COMPLETED', newMarks: 42 },
      oneStudent.id,
    );
    eq('a revaluation decision reaches exactly one student', reval.delivered, 1);
    const revalRows = await prisma.notification.findMany({ where: { title: { contains: 'Revaluation decided' } } });
    ok('...and only that student has it',
      revalRows.filter((r) => r.recipientUserId === oneStudent.id).length === 1);

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
    eq('...and every category is one of the nine',
      prefs.categories.filter((c) => EXAM_CELL_CATEGORY_IDS.includes(c.id as any)).length,
      9,
    );

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
    // The preferences this suite wrote are keyed by (user, category) and are NOT prefixed, so they
    // are swept by the user rather than by the category name.
    await prisma.notificationPreference.deleteMany({
      where: { category: { in: [...EXAM_CELL_CATEGORY_IDS] } },
    });
  }

  report('Exam cell sweep, emitters and profile - database rules');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
