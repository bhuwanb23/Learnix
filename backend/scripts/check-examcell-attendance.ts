/**
 * Suite: the exam mark-roll, at the database level.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHY THIS ALONGSIDE `verify-examcell-dashboard-http.ts`
 * --------------------------------------------------
 * That file proves the ROUTES are wired and that a client gets the right status code. It cannot
 * prove that the ROLL is the right set of students, that marking is idempotent, that a student who
 * is not on the roll is refused, or that a slot with no marks reads as UNMARKED rather than ABSENT.
 * Those live here.
 *
 * THE RULES THAT ARE EASY TO GET WRONG
 * -----------------------------------
 *   1. THE ROLL IS A UNION. The students ENROLLED on the offering, plus the students holding a
 *      hall ticket. A student in only one half is still sitting the paper.
 *   2. A DROPPED ENROLMENT IS NOT ON THE ROLL. Somebody who dropped the course is not going to
 *      turn up, and listing them would make the college look like it had absences it did not have.
 *   3. MARKING IS IDEMPOTENT. The same student marked twice is CORRECTED, not duplicated.
 *   4. A STUDENT WHO IS NOT ON THE ROLL IS REFUSED. A roll that silently accepts a name from
 *      nowhere is a roll that can be padded, and the absence count is what a college is reported
 *      on.
 *   5. UNMARKED IS NOT ABSENT. A slot nobody has marked reads as UNMARKED, and the dashboard says
 *      "not marked yet" rather than "0 appeared".
 *
 * CLEANUP DISCIPLINE
 * ------------------
 * Preflight sweep plus `finally`, `exdb-` prefix, children before parents.
 */
import { prisma } from '../src/db/prisma.js';
import * as attendance from '../src/modules/examcell/attendance.service.js';
import {
  ATTENDANCE_STATES,
  ROLL_ROW_STATES,
  assertAttendanceState,
  attendanceTone,
} from '../src/modules/examcell/attendance.rules.js';
import { PFX, eq, expectReject, ok, report, section, sweep } from './examcell-dashboard.harness.js';

async function main() {
  console.log('\n  Exam mark-roll - database rules');

  const inst = (await prisma.institution.findFirst({ where: { code: { not: '' } }, orderBy: { createdAt: 'asc' } }))!;
  const officer = (
    await prisma.user.findFirst({
      where: { institutionId: inst.id, roles: { some: { role: { in: ['EXAMCELL', 'ADMIN'] } } } },
      select: { id: true },
    })
  )!;

  try {
    // ═══ 1. The vocabulary ═════════════════════════════════════════════════════════════════════
    section(1, 'The vocabulary is two states, and UNMARKED is a third that is not a state');

    eq('there are exactly two attendance states', [...ATTENDANCE_STATES], ['PRESENT', 'ABSENT']);
    eq('a roll row has three possible labels', [...ROLL_ROW_STATES], ['PRESENT', 'ABSENT', 'UNMARKED']);

    ok('a valid state is accepted', assertAttendanceState('PRESENT') === 'PRESENT');
    ok('a state is case-insensitive', assertAttendanceState('absent') === 'ABSENT');
    await expectReject('an unknown state is refused', async () => assertAttendanceState('LATE'), 422);
    await expectReject('an empty state is refused', async () => assertAttendanceState(''), 422);

    ok('a zero count is CLEAR, not alarming', attendanceTone(0) === 'clear');
    ok('a count of one is a warning', attendanceTone(1) === 'warn');
    ok('a count of two is bad', attendanceTone(2) === 'bad');

    // ═══ 2. The roll is a union ═════════════════════════════════════════════════════════════════
    section(2, 'The roll is the enrolled students PLUS the ticket holders');

    // A paper with three students: one enrolled, one holding a ticket, one both.
    const offering = await prisma.courseOffering.findFirst({
      where: { course: { institutionId: inst.id } },
      select: { id: true },
    });
    const exam = await prisma.exam.findFirst({
      where: { institutionId: inst.id },
      select: { id: true, name: true, academicYearId: true, semester: true, type: true },
    });

    // THREE STUDENTS WITH NO ENROLMENT ON THIS OFFERING, so the suite can put them on the roll
    // itself and know exactly what it put there. A student who already has a row here would make
    // the union untestable — the roll would contain them for reasons the suite did not choose.
    const alreadyEnrolled = offering
      ? new Set(
          (
            await prisma.enrollment.findMany({
              where: { offeringId: offering.id },
              select: { studentProfileId: true },
            })
          ).map((e) => e.studentProfileId),
        )
      : new Set<string>();
    const students = (
      await prisma.studentProfile.findMany({
        where: { institutionId: inst.id, id: { notIn: [...alreadyEnrolled] } },
        select: { id: true, userId: true, rollNo: true },
        take: 4,
      })
    );

    if (!offering || !exam || students.length < 3) {
      ok('the roll could be exercised (an offering, an exam and three students exist)', false,
        'no offering/exam/students to build a paper from');
    } else {
      const [a, b, c] = students;
      // `a` is ENROLLED only. `b` holds a TICKET only. `c` is both.
      await prisma.enrollment.create({
        data: { offeringId: offering.id, studentProfileId: a.id, status: 'ACTIVE' },
      });
      await prisma.enrollment.create({
        data: { offeringId: offering.id, studentProfileId: c.id, status: 'ACTIVE' },
      });

      const slot = await prisma.examSlot.create({
        data: {
          examId: exam.id,
          offeringId: offering.id,
          date: new Date(Date.now() + 86400000),
          startTime: '09:00',
          endTime: '12:00',
          seats: 30,
          status: 'SCHEDULED',
        },
      });
      await prisma.hallTicket.create({
        data: { examSlotId: slot.id, studentProfileId: b.id, seatNo: `${PFX}seat-b`, status: 'GENERATED' },
      });
      await prisma.hallTicket.create({
        data: { examSlotId: slot.id, studentProfileId: c.id, seatNo: `${PFX}seat-c`, status: 'GENERATED' },
      });

      const roll = await attendance.listAttendance(inst.id, slot.id);
      const ids = roll.rows.map((r) => r.studentProfileId);

      ok('the ENROLLED student is on the roll', ids.includes(a.id));
      ok('the TICKET HOLDER is on the roll', ids.includes(b.id));
      ok('the student who is BOTH is on the roll', ids.includes(c.id));
      eq('and the roll has exactly three', roll.rows.length, 3);
      ok('and nobody is on it twice', new Set(ids).size === ids.length);
      ok('the seat number is shown for a ticket holder',
        roll.rows.find((r) => r.studentProfileId === b.id)?.seatNo === `${PFX}seat-b`);
      ok('the enrolled student has no seat',
        roll.rows.find((r) => r.studentProfileId === a.id)?.seatNo === null);

      // A DROPPED enrolment is NOT on the roll.
      const dropped = students[0]!;
      await prisma.enrollment.updateMany({
        where: { offeringId: offering.id, studentProfileId: dropped.id },
        data: { status: 'DROPPED' },
      });
      const afterDrop = await attendance.listAttendance(inst.id, slot.id);
      ok('a DROPPED enrolment is not on the roll',
        !afterDrop.rows.some((r) => r.studentProfileId === dropped.id));
      await prisma.enrollment.deleteMany({
        where: { offeringId: offering.id, studentProfileId: dropped.id },
      });
      await prisma.enrollment.create({
        data: { offeringId: offering.id, studentProfileId: dropped.id, status: 'ACTIVE' },
      });

      // ═══ 3. UNMARKED is not ABSENT ══════════════════════════════════════════════════════════
      section(3, 'A slot nobody has marked reads as UNMARKED, not ABSENT');

      const unmarkedRoll = await attendance.listAttendance(inst.id, slot.id);
      eq('every student starts UNMARKED', unmarkedRoll.counts.UNMARKED, 3);
      eq('and nobody is counted ABSENT', unmarkedRoll.counts.ABSENT, 0);
      eq('and nobody is counted PRESENT', unmarkedRoll.counts.PRESENT, 0);
      ok('and the roll says it has NOT been marked', unmarkedRoll.marked === false);
      ok('and the state label says "Not marked"',
        unmarkedRoll.rows[0]?.stateLabel === 'Not marked');

      // ═══ 4. Marking is idempotent ═══════════════════════════════════════════════════════════
      section(4, 'Marking is a bulk write, and marking twice CORRECTS rather than duplicates');

      const marked = await attendance.markAttendance(inst.id, officer.id, slot.id, {
        marks: [
          { studentProfileId: a.id, state: 'PRESENT' },
          { studentProfileId: b.id, state: 'ABSENT' },
        ],
      });
      eq('the write reports the marks it took', marked.marked, 2);
      eq('...the present count', marked.present, 1);
      eq('...the absent count', marked.absent, 1);

      const rows = await prisma.examAttendance.findMany({ where: { examSlotId: slot.id } });
      eq('and it wrote two rows', rows.length, 2);

      // MARK IT AGAIN, differently. A late arrival is the ordinary case.
      const corrected = await attendance.markAttendance(inst.id, officer.id, slot.id, {
        marks: [{ studentProfileId: b.id, state: 'PRESENT' }],
      });
      eq('the correction is accepted', corrected.marked, 1);
      const rowsAfter = await prisma.examAttendance.findMany({ where: { examSlotId: slot.id } });
      eq('and it did NOT duplicate the row', rowsAfter.length, 2);
      eq('...and the state was corrected',
        rowsAfter.find((r) => r.studentProfileId === b.id)?.state, 'PRESENT');

      // ═══ 5. The refusals ═══════════════════════════════════════════════════════════════════
      section(5, 'A student who is not on the roll is refused, and an empty roll is refused');

      // The outsider is a student who is neither enrolled nor holds a ticket — so the refusal is
      // about the ROLL, not about a duplicate enrolment.
      const outsider = students[3]!;
      await expectReject(
        'a student who is not on the roll is refused',
        () =>
          attendance.markAttendance(inst.id, officer.id, slot.id, {
            marks: [{ studentProfileId: outsider.id, state: 'PRESENT' }],
          }),
        422,
      );
      const afterRefusal = await prisma.examAttendance.findMany({ where: { examSlotId: slot.id } });
      eq('...and NOTHING was written', afterRefusal.length, 2);

      await expectReject(
        'an empty mark-roll is refused',
        () => attendance.markAttendance(inst.id, officer.id, slot.id, { marks: [] }),
        422,
      );

      await expectReject(
        'a bad state is refused',
        () =>
          attendance.markAttendance(inst.id, officer.id, slot.id, {
            marks: [{ studentProfileId: a.id, state: 'LATE' }],
          }),
        422,
      );
      const afterBadState = await prisma.examAttendance.findMany({ where: { examSlotId: slot.id } });
      eq('...and NOTHING was written', afterBadState.length, 2);

      // ═══ 6. The summary ══════════════════════════════════════════════════════════════════════
      section(6, 'The summary reports PRESENT, ABSENT and UNMARKED separately');

      const summary = await attendance.attendanceSummary(inst.id);
      eq('the summary counts the marked present', summary.totals.PRESENT, 2);
      eq('...the marked absent', summary.totals.ABSENT, 0);
      eq('...the unmarked', summary.totals.UNMARKED, 1);
      eq('...the slots', summary.totals.slots >= 1, true);
      ok('...and it says a roll has been taken', summary.marked === true);
      ok('...and it reports a tone for the absences', summary.tone.absent === 'clear');

      const slotRow = summary.slots.find((s) => s.slotId === slot.id);
      ok('the slot is in the summary', slotRow !== undefined);
      eq('...with its present count', slotRow?.present, 2);
      eq('...its absent count', slotRow?.absent, 0);
      eq('...its unmarked count', slotRow?.unmarked, 1);
      ok('...and it is marked', slotRow?.marked === true);
      ok('...and it is NOT complete, because one student is unmarked', slotRow?.complete === false);

      // ═══ 7. Tenant scoping ════════════════════════════════════════════════════════════════════
      section(7, 'Another institution\'s slot is a 404, not an empty roll');

      const rival = await prisma.institution.findFirst({
        where: { NOT: { id: inst.id } },
        select: { id: true },
      });
      if (rival) {
        await expectReject(
          'another institution\'s slot is refused',
          () => attendance.listAttendance(rival.id, slot.id),
          404,
        );
        await expectReject(
          'and marking it is refused too',
          () =>
            attendance.markAttendance(rival.id, officer.id, slot.id, {
              marks: [{ studentProfileId: a.id, state: 'PRESENT' }],
            }),
          404,
        );
      }

      // ═══ 8. The audit trail ═══════════════════════════════════════════════════════════════════
      section(8, 'The roll is audited, because an absence count is a claim about a room');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'EXAM_ATTENDANCE_MARKED', entityId: slot.id },
      });
      ok('marking the roll writes an audit entry', audit !== null);
      eq('...naming the action', audit?.action, 'EXAM_ATTENDANCE_MARKED');
      ok('...and the entity is the slot', audit?.entityType === 'ExamSlot');

      // CLEANUP for this paper: children first.
      await prisma.examAttendance.deleteMany({ where: { examSlotId: slot.id } });
      await prisma.hallTicket.deleteMany({ where: { examSlotId: slot.id } });
      await prisma.enrollment.deleteMany({ where: { offeringId: offering.id, studentProfileId: { in: [a.id, c.id] } } });
      await prisma.examSlot.delete({ where: { id: slot.id } });
    }
  } finally {
    await sweep();
  }

  report('Exam mark-roll - database rules');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
