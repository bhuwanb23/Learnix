/**
 * HD-01 — The HOD dashboard: the action sections.
 * Docs: 11-hod.md §HD-01
 *
 * WHAT IS IN THIS FILE
 * --------------------
 * The four sections that describe what to DO about the department: the approvals only this HOD can
 * clear, the four quick actions, the semester-by-semester trends, and the Department Health Score.
 *
 * THE HEALTH SCORE IS BUILT FROM THE OTHER SECTIONS
 * -------------------------------------------------
 * Every component of the score is a figure another section already computed, so the score cannot
 * disagree with the screen it sits on. A composite index computed from its own queries is a
 * composite index that will eventually disagree with the dashboard, and then a HOD is looking at
 * two numbers for the same thing.
 */
import { prisma } from '../../db/prisma.js';
import {
  HEALTH_COMPONENTS,
  HOD_QUICK_ACTIONS,
  PASS_RATE_THRESHOLD,
  TREND_LIMIT,
  healthScore,
} from './hod-dashboard.rules.js';
import { hodLeaveScope, type HodScope } from './hod-dashboard.scope.js';

// ═══ 7. Pending approvals ══════════════════════════════════════════════════

/**
 * THE DECISIONS ONLY THIS HOD CAN MAKE.
 *
 * Two kinds, because two kinds exist in the platform:
 *
 *   · LEAVE REQUESTS — a `LeaveRequest` in `PENDING`. Scoped to THIS department's staff, which
 *     the module's leave queries used to get wrong: they were filtered by `institutionId` alone,
 *     so an HOD could see — and approve — every other department's leave.
 *   · COURSE CHANGES — a `SyllabusVersion` awaiting the HOD's approval. A syllabus version IS a
 *     course change in this platform, so it is the course change the department has to clear.
 *
 * THERE IS NO "DEPARTMENTAL REQUEST" KIND, and none is invented. The platform has no model for a
 * free-form departmental request, and a request queue with a category that can never have
 * anything in it is worse than a queue without it.
 */
export async function pendingApprovalsSection(scope: HodScope) {
  const { institutionId } = scope;

  const [leaves, syllabus] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { ...hodLeaveScope(institutionId, scope.department.id), status: 'PENDING' },
      include: { staffUser: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.syllabusVersion.findMany({
      where: {
        course: { institutionId, departmentId: scope.department.id },
        status: 'SUBMITTED',
      },
      include: {
        course: { select: { code: true, name: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
    }),
  ]);

  const submitterIds = [...new Set(syllabus.map((v) => v.submittedByUserId))];
  const submitters = submitterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: submitterIds } },
        select: { id: true, fullName: true },
      })
    : [];
  const submitterMap = new Map(submitters.map((u) => [u.id, u.fullName]));

  return {
    total: leaves.length + syllabus.length,
    leave: {
      count: leaves.length,
      items: leaves.map((l) => ({
        id: l.id,
        teacher: l.staffUser.fullName,
        type: l.type,
        fromDate: l.fromDate,
        toDate: l.toDate,
        days: l.days,
        reason: l.reason,
      })),
    },
    courseChange: {
      count: syllabus.length,
      items: syllabus.map((v) => ({
        id: v.id,
        courseCode: v.course.code,
        courseName: v.course.name,
        version: v.version,
        submittedBy: submitterMap.get(v.submittedByUserId) ?? 'Unknown',
        updatedAt: v.updatedAt,
      })),
    },
    // The kinds that are NOT here, said out loud. A section that silently omits a category the
    // reader expected leaves them wondering whether the screen is broken.
    note:
      'Leave requests and syllabus versions. This platform has no free-form departmental request, so there is nothing to list under one.',
  };
}

// ═══ 8. Quick actions ═════════════════════════════════════════════════════

/**
 * THE FOUR THINGS TO DO NEXT, each with the LIVE COUNT of what it would act on.
 *
 * A tile that says "Approve leave" and one that says "Approve leave (2)" are different screens:
 * the first asks the HOD to go and look, the second tells them whether it is worth the walk.
 */
export async function quickActionsSection(scope: HodScope) {
  const { institutionId } = scope;


  const [draftCourses, students, pendingLeaves, pendingSyllabus] = await Promise.all([
    prisma.course.count({
      where: { institutionId, departmentId: scope.department.id, syllabusVersions: { none: {} } },
    }),
    prisma.studentProfile.count({
      where: { institutionId, programId: { in: scope.programIds } },
    }),
    prisma.leaveRequest.count({
      where: { ...hodLeaveScope(institutionId, scope.department.id), status: 'PENDING' },
    }),
    prisma.syllabusVersion.count({
      where: {
        course: { institutionId, departmentId: scope.department.id },
        status: 'SUBMITTED',
      },
    }),
  ]);

  const counts = {
    ASSIGN_FACULTY: draftCourses,
    VIEW_STUDENTS: students,
    APPROVE_LEAVE: pendingLeaves,
    REVIEW_SYLLABUS: pendingSyllabus,
  };

  return {
    actions: HOD_QUICK_ACTIONS.map((a) => ({ id: a.id, count: counts[a.id] })),
    counts,
  };
}

// ═══ 9. Performance trends ═══════════════════════════════════════════════

/**
 * HOW THE DEPARTMENT HAS MOVED, SEMESTER BY SEMESTER.
 *
 * The pivot is `CourseOffering.semester` — the semester the offering was taught in — and the
 * academic year is carried alongside so two runs of the same course in different years do not
 * merge into one point.
 *
 * A SUBJECT SEEN IN ONE SEMESTER HAS A POINT, NOT A TREND, and the response says so. A line drawn
 * through a single dot is a decoration.
 */
export async function performanceTrendsSection(scope: HodScope) {
  if (!scope.offeringIds.length) {
    return {
      semesters: [],
      academicYears: [],
      subjectTrends: [],
      hasTrends: false,
      note: 'No offerings in this department yet, so there is nothing to compare.',
    };
  }

  const [results, academicYears] = await Promise.all([
    prisma.result.findMany({
      where: { examSlot: { offeringId: { in: scope.offeringIds } } },
      select: {
        marksObtained: true,
        maxMarks: true,
        isPass: true,
        examSlot: {
          select: {
            offering: {
              select: {
                semester: true,
                academicYearId: true,
                course: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.academicYear.findMany({
      where: { id: { in: [...new Set(scope.offerings.map((o) => o.academicYearId))] } },
      select: { id: true, name: true },
    }),
  ]);
  const yearMap = new Map(academicYears.map((y) => [y.id, y.name]));

  type Bucket = {
    total: number;
    passed: number;
    marksSum: number;
    percentSum: number;
  };
  const bySemester = new Map<string, Bucket>();
  const bySubject = new Map<
    string,
    { code: string; subject: string; points: Map<string, Bucket & { semester: number; yearName: string }> }
  >();

  for (const r of results) {
    const offering = r.examSlot.offering;
    const percent = r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;

    const semKey = `${offering.semester}:${offering.academicYearId}`;
    const sem = bySemester.get(semKey) ?? { total: 0, passed: 0, marksSum: 0, percentSum: 0 };
    sem.total += 1;
    if (r.isPass) sem.passed += 1;
    sem.marksSum += r.marksObtained;
    sem.percentSum += percent;
    bySemester.set(semKey, sem);

    const code = offering.course.code;
    if (!bySubject.has(code)) {
      bySubject.set(code, {
        code,
        subject: offering.course.name,
        points: new Map(),
      });
    }
    const subj = bySubject.get(code)!;
    const point = subj.points.get(semKey) ?? {
      total: 0,
      passed: 0,
      marksSum: 0,
      percentSum: 0,
      semester: offering.semester,
      yearName: yearMap.get(offering.academicYearId) ?? '—',
    };
    point.total += 1;
    if (r.isPass) point.passed += 1;
    point.marksSum += r.marksObtained;
    point.percentSum += percent;
    subj.points.set(semKey, point);
  }

  const semesters = [...bySemester.entries()]
    .map(([key, b]) => {
      const [semester, academicYearId] = key.split(':');
      return {
        semester: Number(semester),
        academicYearId,
        academicYear: yearMap.get(academicYearId) ?? '—',
        results: b.total,
        passed: b.passed,
        passPercent: b.total === 0 ? 0 : Math.round((b.passed / b.total) * 100),
        averageMarks: b.total === 0 ? 0 : Math.round((b.marksSum / b.total) * 10) / 10,
        averagePercent: b.total === 0 ? 0 : Math.round((b.percentSum / b.total) * 100) / 100,
      };
    })
    .sort((a, b) => a.semester - b.semester || a.academicYear.localeCompare(b.academicYear));

  const subjectTrends = [...bySubject.values()]
    .map((s) => {
      const points = [...s.points.values()]
        .map((p) => ({
          semester: p.semester,
          academicYear: p.yearName,
          results: p.total,
          passPercent: p.total === 0 ? 0 : Math.round((p.passed / p.total) * 100),
          averagePercent: p.total === 0 ? 0 : Math.round((p.percentSum / p.total) * 100) / 100,
        }))
        .sort((a, b) => a.semester - b.semester);
      return { code: s.code, subject: s.subject, points };
    })
    .sort((a, b) => (a.points[0]?.passPercent ?? 0) - (b.points[0]?.passPercent ?? 0))
    .slice(0, TREND_LIMIT);

  return {
    semesters,
    academicYears: [...new Set(semesters.map((s) => s.academicYear))],
    subjectTrends,
    // A TREND needs more than one point. A subject seen in one semester is a snapshot.
    hasTrends: subjectTrends.some((s) => s.points.length > 1),
    passThreshold: PASS_RATE_THRESHOLD,
    totalResults: results.length,
  };
}

// ═══ ★. The Department Health Score ════════════════════════════════════════

/**
 * THE ONE INDICATOR: attendance, syllabus progress, faculty balance and student performance,
 * combined into one number — with the WEAKEST component named, because a number a HOD cannot act
 * on is a decoration.
 *
 * THE RULE THAT MAKES IT HONEST
 * ------------------------------
 * A component with NO DATA IS EXCLUDED, never scored as zero. A department in week three has no
 * attendance records and a barely-started syllabus; scoring those as zero would report a
 * brand-new department as an unhealthy one, and the number would be CONFIDENTLY wrong — it
 * would look like a measurement rather than an absence of one.
 *
 * The weights are re-normalised over the components that DO have data, so a department measured
 * on two components is not penalised for the two it has no data for. The response says how many
 * components were included and names the ones that were not.
 */
export async function healthScoreSection(
  components: {
    attendance: number | null;
    syllabus: number | null;
    balance: number | null;
    performance: number | null;
  },
) {
  const score = healthScore([
    { id: 'ATTENDANCE', value: components.attendance },
    { id: 'SYLLABUS', value: components.syllabus },
    { id: 'FACULTY_BALANCE', value: components.balance },
    { id: 'STUDENT_PERFORMANCE', value: components.performance },
  ]);

  const meta = new Map(HEALTH_COMPONENTS.map((c) => [c.id, c]));

  return {
    ...score,
    // The components WITH their weights and their values, so the score can be explained.
    breakdown: score.components.map((c) => ({
      id: c.id,
      label: meta.get(c.id)?.label ?? c.id,
      blurb: meta.get(c.id)?.blurb ?? '',
      icon: meta.get(c.id)?.icon ?? 'ellipse-outline',
      color: meta.get(c.id)?.color ?? '#64748b',
      weight: c.weight,
      value: c.value,
      included: c.included,
    })),
    // The note the screen shows when a component was left out.
    note:
      score.excluded.length > 0
        ? `Scored on ${score.included} of ${HEALTH_COMPONENTS.length} measures. No data yet for: ${score.excluded
            .map((id) => meta.get(id)?.label ?? id)
            .join(', ')}.`
        : null,
  };
}
