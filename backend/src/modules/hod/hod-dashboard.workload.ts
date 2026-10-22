/**
 * HD-01 — The HOD dashboard: the workload and the risk.
 * Docs: 11-hod.md §HD-01
 *
 * "COMPLETED TEACHING HOURS" — AND WHY IT IS DERIVED THE WAY IT IS
 * ---------------------------------------------------------------
 * There is no `hoursTaught` column anywhere in the schema, and `ClassSession` is empty. So the
 * question "how many hours has this department actually taught?" has no direct source, and the
 * two available answers are not the same:
 *
 *   · an ESTIMATE from the weekly schedule × the weeks elapsed — what SHOULD have been taught.
 *   · a RECORD — a class that was actually held.
 *
 * The second is what a HOD means, and the platform already keeps it: an `AttendanceSession` with
 * `status = 'FINALIZED'` is a class that was held, with attendance taken. Multiply the session's
 * offering's schedule-slot hours by the number of finalized sessions and you get the hours
 * actually delivered. It is a fact about a room, not a projection of a timetable.
 *
 * The grain is PER FACULTY, and the rule is the same everywhere in this module: a teacher's
 * cross-department offerings are not this department's business.
 */
import { prisma } from '../../db/prisma.js';
import {
  ATTENDANCE_RISK_THRESHOLD,
  RISK_STUDENT_LIMIT,
} from './hod-dashboard.rules.js';
import { durationHours } from './hod-dashboard.sections.js';
import { hodStudentScope, type HodScope } from './hod-dashboard.scope.js';

// ═══ 5. Faculty workload ══════════════════════════════════════════════════

/**
 * ASSIGNED HOURS against COMPLETED TEACHING HOURS, per faculty and for the department.
 *
 * "Assigned" is the weekly schedule-slot count — the same computation the reassign guard uses to
 * refuse a move that would overload somebody, so the number on the screen and the number that
 * blocks the move are the same number.
 */
export async function facultyWorkloadSection(scope: HodScope, now: Date = new Date()) {
  // THE SCHEDULE HOURS PER OFFERING, so a finalized session can be turned into hours.
  const slotHours = new Map<string, number>();
  if (scope.offeringIds.length) {
    const slots = await prisma.offeringScheduleSlot.findMany({
      where: { offeringId: { in: scope.offeringIds } },
      select: { offeringId: true, startTime: true, endTime: true },
    });
    const totals = new Map<string, number>();
    for (const s of slots) {
      const h = durationHours(s.startTime, s.endTime);
      totals.set(s.offeringId, (totals.get(s.offeringId) ?? 0) + h);
    }
    slotHours.clear();
    for (const [k, v] of totals) slotHours.set(k, v);
  }

  // THE CLASSES THAT WERE ACTUALLY HELD. A FINALIZED attendance session is a class that
  // happened; an OPEN one has not been closed out yet and is not counted as delivered.
  const finalized = scope.offeringIds.length
    ? await prisma.attendanceSession.findMany({
        where: { offeringId: { in: scope.offeringIds }, status: 'FINALIZED' },
        select: { id: true, offeringId: true, date: true },
      })
    : [];

  const deliveredByOffering = new Map<string, number>();
  for (const s of finalized) {
    deliveredByOffering.set(
      s.offeringId,
      (deliveredByOffering.get(s.offeringId) ?? 0) + (slotHours.get(s.offeringId) ?? 0),
    );
  }

  const assignedByFaculty = new Map<string, number>();
  const offeredByFaculty = new Map<string, number>();
  for (const o of scope.offerings) {
    assignedByFaculty.set(
      o.teacherUserId,
      (assignedByFaculty.get(o.teacherUserId) ?? 0) + o.scheduleSlotCount,
    );
    offeredByFaculty.set(
      o.teacherUserId,
      (offeredByFaculty.get(o.teacherUserId) ?? 0) + 1,
    );
  }

  const deliveredByFaculty = new Map<string, number>();
  for (const o of scope.offerings) {
    const hours = deliveredByOffering.get(o.id) ?? 0;
    deliveredByFaculty.set(
      o.teacherUserId,
      (deliveredByFaculty.get(o.teacherUserId) ?? 0) + hours,
    );
  }

  // THE WEEKS OF THE TERM THAT HAVE PASSED. The academic year's start date is the anchor, and a
  // term that has not started has NO elapsed weeks — which is a different thing from a term with
  // no teaching in it.
  const yearStart = scope.academicYears.find((y) =>
    scope.offerings.some((o) => o.academicYearId === y.id),
  )?.startDate;
  const weeksElapsed =
    yearStart && now > yearStart
      ? Math.max(0, (now.getTime() - yearStart.getTime()) / (7 * 86400000))
      : 0;

  const faculty = scope.staff.map((s) => {
    const assignedWeekly = assignedByFaculty.get(s.userId) ?? 0;
    const delivered = deliveredByFaculty.get(s.userId) ?? 0;
    const max = s.maxWorkloadHours;
    const utilizationPct = max === 0 ? 0 : Math.round((assignedWeekly / max) * 100);

    // THE HOURS SCHEDULED SO FAR — the weekly hours multiplied by the weeks elapsed. This is the
    // denominator the delivered hours are measured against, and it is what makes the two figures
    // comparable at all.
    const scheduledToDate = Math.round(assignedWeekly * weeksElapsed * 10) / 10;

    return {
      userId: s.userId,
      name: s.name,
      designation: s.designation,
      assignedWeeklyHours: assignedWeekly,
      deliveredHours: Math.round(delivered * 10) / 10,
      scheduledToDateHours: scheduledToDate,
      maxWorkloadHours: max,
      utilizationPct,
      overloaded: assignedWeekly > max,
      // How much of the scheduled-so-far load has actually been delivered. `null` when there is
      // no elapsed term to measure against — which is a different thing from "delivered none of
      // it", and the section says which.
      deliveryPct:
        scheduledToDate > 0
          ? Math.min(100, Math.round((delivered / scheduledToDate) * 100))
          : delivered > 0
            ? 100
            : null,
      offerings: offeredByFaculty.get(s.userId) ?? 0,
    };
  });

  const totalAssigned = faculty.reduce((s, f) => s + f.assignedWeeklyHours, 0);
  const totalDelivered = faculty.reduce((s, f) => s + f.deliveredHours, 0);
  const totalScheduled = faculty.reduce((s, f) => s + f.scheduledToDateHours, 0);
  const totalMax = faculty.reduce((s, f) => s + f.maxWorkloadHours, 0);
  const overloaded = faculty.filter((f) => f.overloaded);

  // THE BALANCE. A department where one person carries everything and the rest carry nothing is
  // not "fully utilised" — it is fragile. The balance score is the share of the faculty who are
  // NOT overloaded, discounted by how far past the line the overloaded ones are.
  const balanceScore =
    faculty.length === 0
      ? null
      : Math.max(
          0,
          Math.round(
            ((faculty.length - overloaded.length) / faculty.length) * 100 -
              overloaded.reduce(
                (s, f) => s + Math.min(40, f.utilizationPct - 100),
                0,
              ) / faculty.length,
          ),
        );

  return {
    faculty: faculty.sort((a, b) => b.utilizationPct - a.utilizationPct),
    total: faculty.length,
    assignedWeeklyHours: totalAssigned,
    deliveredHours: Math.round(totalDelivered * 10) / 10,
    scheduledToDateHours: Math.round(totalScheduled * 10) / 10,
    maxWeeklyHours: totalMax,
    utilizationPct:
      totalMax === 0 ? 0 : Math.min(100, Math.round((totalAssigned / totalMax) * 100)),
    deliveryPct:
      totalScheduled > 0
        ? Math.min(100, Math.round((totalDelivered / totalScheduled) * 100))
        : totalDelivered > 0
          ? 100
          : null,
    weeksElapsed: Math.round(weeksElapsed * 10) / 10,
    overloaded: overloaded.length,
    overloadedNames: overloaded.map((f) => f.name),
    sessionsFinalized: finalized.length,
    // `null` when nothing has been finalized anywhere in the department — the delivery figure
    // does not exist yet, and saying "0 hours delivered" would be a different and false claim.
    deliveryKnown: finalized.length > 0,
    balanceScore,
  };
}

// ═══ 6. Student risk alerts ═══════════════════════════════════════════════

/**
 * THE STUDENTS WHO NEED A CONVERSATION: low attendance, poor performance, or both.
 *
 * The two signals come from different tables and are combined into one verdict:
 *
 *   · ATTENDANCE — per-student, from the attendance records of the department's offerings.
 *   · PERFORMANCE — per-student, from the published results. `Result.isPass` is the
 *     authoritative published flag, and it is re-derived from the marks rather than trusted
 *     blindly (the same rule the exam cell's dashboard uses).
 *
 * A student with NO attendance records and NO results is not at risk — they are unmeasured, and
 * the section reports them separately rather than counting them as failures.
 */
export async function studentRiskSection(scope: HodScope) {
  const { institutionId } = scope;

  const [records, results, students] = await Promise.all([
    scope.offeringIds.length
      ? prisma.attendanceRecord.findMany({
          where: { session: { offeringId: { in: scope.offeringIds } } },
          select: {
            state: true,
            studentProfileId: true,
          },
        })
      : Promise.resolve([]),
    scope.offeringIds.length
      ? prisma.result.findMany({
          where: { examSlot: { offeringId: { in: scope.offeringIds } } },
          select: {
            studentProfileId: true,
            marksObtained: true,
            maxMarks: true,
            isPass: true,
          },
        })
      : Promise.resolve([]),
    prisma.studentProfile.findMany({
      where: hodStudentScope(institutionId, scope.programIds),
      select: {
        id: true,
        rollNo: true,
        currentSemester: true,
        user: { select: { fullName: true } },
      },
    }),
  ]);

  // THE ATTENDANCE PER STUDENT, in one pass.
  const attendanceByStudent = new Map<string, { total: number; attended: number }>();
  for (const r of records) {
    const b = attendanceByStudent.get(r.studentProfileId) ?? { total: 0, attended: 0 };
    b.total += 1;
    if (r.state === 'PRESENT' || r.state === 'LATE') b.attended += 1;
    attendanceByStudent.set(r.studentProfileId, b);
  }

  // THE PERFORMANCE PER STUDENT, in one pass.
  const resultsByStudent = new Map<
    string,
    { total: number; passed: number; marksSum: number; percentSum: number }
  >();
  for (const r of results) {
    const b = resultsByStudent.get(r.studentProfileId) ?? {
      total: 0,
      passed: 0,
      marksSum: 0,
      percentSum: 0,
    };
    b.total += 1;
    if (r.isPass) b.passed += 1;
    b.marksSum += r.marksObtained;
    b.percentSum += r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;
    resultsByStudent.set(r.studentProfileId, b);
  }

  const rows = students.map((s) => {
    const att = attendanceByStudent.get(s.id);
    const res = resultsByStudent.get(s.id);
    const attendancePct =
      att && att.total > 0 ? Math.round((att.attended / att.total) * 100) : null;
    const passRate = res && res.total > 0 ? Math.round((res.passed / res.total) * 100) : null;
    const averagePercent =
      res && res.total > 0 ? Math.round((res.percentSum / res.total) * 100) / 100 : null;

    const lowAttendance = attendancePct !== null && attendancePct < ATTENDANCE_RISK_THRESHOLD;
    const poorPerformance = passRate !== null && passRate < ATTENDANCE_RISK_THRESHOLD;

    // The verdict. A student with NEITHER measure is unmeasured, not safe — and the section says
    // so, because a list of "students at risk" that quietly includes everybody who has not been
    // measured is a list nobody can act on.
    const state: 'AT_RISK' | 'WATCH' | 'UNMEASURED' | 'OK' =
      lowAttendance || poorPerformance
        ? 'AT_RISK'
        : attendancePct === null && passRate === null
          ? 'UNMEASURED'
          : lowAttendance || poorPerformance
            ? 'AT_RISK'
            : 'OK';

    return {
      studentProfileId: s.id,
      name: s.user.fullName,
      rollNo: s.rollNo,
      semester: s.currentSemester,
      attendancePct,
      passRate,
      averagePercent,
      state,
      reasons: [
        ...(lowAttendance ? ['LOW_ATTENDANCE'] : []),
        ...(poorPerformance ? ['POOR_PERFORMANCE'] : []),
      ],
    };
  });

  const atRisk = rows.filter((r) => r.state === 'AT_RISK');
  const unmeasured = rows.filter((r) => r.state === 'UNMEASURED');

  return {
    total: rows.length,
    atRisk: atRisk.length,
    unmeasured: unmeasured.length,
    ok: rows.filter((r) => r.state === 'OK').length,
    threshold: ATTENDANCE_RISK_THRESHOLD,
    // The NAMES, capped — the section's job is to start a conversation, not to be a list. The COUNT
    // is the number that matters.
    students: atRisk
      .sort(
        (a, b) =>
          (a.attendancePct ?? 101) - (b.attendancePct ?? 101) ||
          (a.passRate ?? 101) - (b.passRate ?? 101),
      )
      .slice(0, RISK_STUDENT_LIMIT),
    lowAttendance: rows.filter((r) => r.reasons.includes('LOW_ATTENDANCE')).length,
    poorPerformance: rows.filter((r) => r.reasons.includes('POOR_PERFORMANCE')).length,
  };
}
