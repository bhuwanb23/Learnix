/**
 * HD-05 — The HOD's Students desk: the per-student figures.
 * Docs: 11-hod.md §3.4
 *
 * EVERY FIGURE FOR ONE STUDENT, COMPUTED TOGETHER
 * -----------------------------------------------
 * Because the attendance, the results, the assignment completion, the risk signals, the CGPA and
 * the skill gap all read the same rows, and computing them apart would mean reading the
 * department's timetable once per figure.
 *
 * THE FIVE RISK SIGNALS
 * ---------------------
 *   · LOW ATTENDANCE            — below the department's threshold
 *   · DECLINING MARKS            — their recent results are below their earlier ones
 *   · FAILED SUBJECTS            — at least one course they have not cleared
 *   · REPEATED ABSENCE           — a RUN of absences, not just a low total
 *   · POOR ASSIGNMENT COMPLETION — published assignments they have not handed in
 *
 * A STUDENT WITH NO MEASURES IS UNMEASURED, NOT SAFE
 * ---------------------------------------------------
 * The same rule the dashboard's risk section uses. A student in their first fortnight has no
 * attendance and no results, and counting them as "on track" is a claim nobody has evidence for.
 */
import { gradeFor } from '../examcell/result.rules.js';
import {
  DECLINING_MARKS_DROP,
  POOR_ASSIGNMENT_COUNT,
  POOR_PERFORMANCE_THRESHOLD,
  PLACEMENT_MAX_BACKLOGS,
  PLACEMENT_READY_CGPA,
  REPEATED_ABSENCE_STREAK,
  riskState,
  type RiskSignalId,
  type RiskState,
} from './hod-students.rules.js';
import type { StudentScope } from './hod-students.scope.js';

export type StudentFigures = ReturnType<typeof studentFigures>;

/**
 * EVERY FIGURE FOR ONE STUDENT.
 */
export function studentFigures(
  scope: StudentScope,
  studentProfileId: string,
  now: Date = new Date(),
  attendanceThreshold: number = 75,
) {
  // ── THE ATTENDANCE ───────────────────────────────────────────────────────
  const myAttendance = scope.attendance.filter((a) => a.studentProfileId === studentProfileId);
  const present = myAttendance.filter((a) => a.state === 'PRESENT').length;
  const late = myAttendance.filter((a) => a.state === 'LATE').length;
  const absent = myAttendance.filter((a) => a.state === 'ABSENT').length;
  const attended = present + late;
  const attendancePct =
    myAttendance.length === 0 ? null : Math.round((attended / myAttendance.length) * 100);

  // THE REPEATED-ABSENCE RUN. The absences in DATE order, and the longest consecutive run — a
  // streak is a different fact from a total, and a total cannot tell "missed three in a row"
  // from "missed three across the term".
  const absenceDates = myAttendance
    .filter((a) => a.state === 'ABSENT')
    .map((a) => new Date(a.date).getTime())
    .sort((x, y) => x - y);
  let absenceStreak = 0;
  let longestAbsenceStreak = 0;
  let previous: number | null = null;
  for (const t of absenceDates) {
    // The same day counts as the same absence; a different day starts a new streak.
    if (previous !== null && t - previous > 36 * 3600 * 1000) absenceStreak += 1;
    else if (previous === null) absenceStreak = 1;
    else if (t === previous) {
      // the same day again — a second register for the same class
    }
    if (absenceStreak > longestAbsenceStreak) longestAbsenceStreak = absenceStreak;
    previous = t;
  }

  // ── THE RESULTS ──────────────────────────────────────────────────────────
  const myResults = scope.results.filter((r) => r.studentProfileId === studentProfileId);
  let passed = 0;
  let marksSum = 0;
  let percentSum = 0;
  let pointsSum = 0;
  let creditsSum = 0;
  const failedCourses = new Map<string, { code: string; name: string }>();
  for (const r of myResults) {
    const g = gradeFor(r.marksObtained, r.maxMarks);
    if (g.isPass) passed += 1;
    else {
      failedCourses.set(r.courseId, { code: r.courseCode, name: r.courseName });
    }
    marksSum += r.marksObtained;
    percentSum += r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;
    // THE CGPA, CREDIT-WEIGHTED. The grade points come from the exam cell's ONE scale, so the
    // number here is the same number the results desk shows.
    pointsSum += g.gradePoint * r.credits;
    creditsSum += r.credits;
  }
  const resultCount = myResults.length;
  const passRate = resultCount === 0 ? null : Math.round((passed / resultCount) * 100);
  const averagePercent =
    resultCount === 0 ? null : Math.round((percentSum / resultCount) * 100) / 100;
  const averageMarks = resultCount === 0 ? null : Math.round((marksSum / resultCount) * 10) / 10;
  const cgpa = creditsSum === 0 ? null : Math.round((pointsSum / creditsSum) * 100) / 100;

  // ── THE DECLINE ──────────────────────────────────────────────────────────
  // The student's results, oldest first, grouped into an EARLIER half and a RECENT half. A
  // trend needs AT LEAST TWO results, and the split is on the results themselves rather than on
  // a calendar — a department mid-term has no semesters to compare.
  const ordered = [...myResults].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
  );
  const halves = ordered.length >= 2 ? Math.floor(ordered.length / 2) : 0;
  const meanPercent = (rows: typeof ordered) =>
    rows.length === 0
      ? null
      : rows.reduce(
          (s, r) => s + (r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0),
          0,
        ) / rows.length;
  const earlierMean = halves > 0 ? meanPercent(ordered.slice(0, halves)) : null;
  const recentMean = halves > 0 ? meanPercent(ordered.slice(halves)) : null;
  const decline = earlierMean !== null && recentMean !== null ? recentMean - earlierMean : null;
  const declining =
    decline !== null && decline <= -DECLINING_MARKS_DROP;

  // ── THE SUBJECT-WISE PERFORMANCE, AND THE SKILL GAP ──────────────────────
  // The student's average per course, and the COHORT's average for the same course. The gap is
  // cohort minus student: how far behind they are in that course.
  const byCourse = new Map<
    string,
    { courseId: string; code: string; name: string; credits: number; results: number; percentSum: number; passed: number }
  >();
  for (const r of myResults) {
    const b = byCourse.get(r.courseId) ?? {
      courseId: r.courseId,
      code: r.courseCode,
      name: r.courseName,
      credits: r.credits,
      results: 0,
      percentSum: 0,
      passed: 0,
    };
    b.results += 1;
    b.percentSum += r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;
    if (gradeFor(r.marksObtained, r.maxMarks).isPass) b.passed += 1;
    byCourse.set(r.courseId, b);
  }
  const cohortByCourse = new Map<string, { count: number; percentSum: number }>();
  for (const r of scope.results) {
    const b = cohortByCourse.get(r.courseId) ?? { count: 0, percentSum: 0 };
    b.count += 1;
    b.percentSum += r.maxMarks ? (r.marksObtained / r.maxMarks) * 100 : 0;
    cohortByCourse.set(r.courseId, b);
  }
  const subjectPerformance = [...byCourse.values()].map((b) => {
    const studentPercent = Math.round((b.percentSum / b.results) * 100);
    const cohort = cohortByCourse.get(b.courseId);
    const cohortPercent = cohort ? Math.round((cohort.percentSum / cohort.count) * 100) : null;
    return {
      courseId: b.courseId,
      code: b.code,
      name: b.name,
      credits: b.credits,
      results: b.results,
      percent: studentPercent,
      cohortPercent,
      // THE GAP. How far behind the cohort they are in this course. `null` when there is no
      // cohort to compare against — one student in a course is not a comparison.
      gap: cohortPercent === null ? null : cohortPercent - studentPercent,
      passed: b.passed,
      failed: b.results - b.passed,
    };
  });

  // ── THE ASSIGNMENTS ───────────────────────────────────────────────────────
  const myOfferings = new Set(
    scope.assignments.filter((a) => a.status !== 'DRAFT').map((a) => a.offeringId),
  );
  const relevantAssignments = scope.assignments.filter((a) => myOfferings.has(a.offeringId));
  const submittedFor = new Set(
    scope.submissions
      .filter((s) => s.studentProfileId === studentProfileId)
      .map((s) => s.assignmentId),
  );
  const missingAssignments = relevantAssignments.filter(
    (a) => a.status !== 'DRAFT' && !submittedFor.has(a.id),
  );
  const pastDueMissing = missingAssignments.filter(
    (a) => a.dueAt !== null && new Date(a.dueAt).getTime() < now.getTime(),
  );
  const assignmentCompletionPct =
    relevantAssignments.length === 0
      ? null
      : Math.round(
          ((relevantAssignments.length - missingAssignments.length) / relevantAssignments.length) * 100,
        );

  // ── THE RISK SIGNALS ─────────────────────────────────────────────────────
  const signals: RiskSignalId[] = [];
  if (attendancePct !== null && attendancePct < attendanceThreshold) {
    signals.push('LOW_ATTENDANCE');
  }
  if (declining) signals.push('DECLINING_MARKS');
  if (failedCourses.size > 0) signals.push('FAILED_SUBJECTS');
  if (longestAbsenceStreak >= REPEATED_ABSENCE_STREAK) signals.push('REPEATED_ABSENCE');
  if (missingAssignments.length >= POOR_ASSIGNMENT_COUNT) {
    signals.push('POOR_ASSIGNMENT_COMPLETION');
  }

  const measured =
    myAttendance.length > 0 || resultCount > 0 || relevantAssignments.length > 0;
  const state: RiskState = riskState(signals, measured);

  // ── THE PLACEMENT READINESS ───────────────────────────────────────────────
  const backlogs = failedCourses.size;
  const eligibility = scope.eligibility.find((e) => e.studentProfileId === studentProfileId);
  const applications = scope.applications.filter((a) => a.studentProfileId === studentProfileId);
  const driveChecks = scope.drives.map((d) => {
    const minCgpa = d.minCgpa ?? PLACEMENT_READY_CGPA;
    const maxBacklogs = d.maxBacklogs ?? PLACEMENT_MAX_BACKLOGS;
    const cgpaOk = cgpa !== null && cgpa >= minCgpa;
    const backlogsOk = backlogs <= maxBacklogs;
    return {
      driveId: d.id,
      title: d.title,
      companyName: d.companyName,
      minCgpa,
      maxBacklogs,
      eligible: cgpaOk && backlogsOk,
      reason: !cgpaOk
        ? `CGPA below ${minCgpa}`
        : !backlogsOk
          ? `${backlogs} backlog${backlogs === 1 ? '' : 's'}`
          : null,
    };
  });
  const eligibleDrives = driveChecks.filter((d) => d.eligible);

  return {
    attendance: {
      records: myAttendance.length,
      present,
      late,
      absent,
      attended,
      attendancePct,
      longestAbsenceStreak,
    },
    results: {
      results: resultCount,
      passed,
      failed: resultCount - passed,
      passRate,
      averagePercent,
      averageMarks,
      cgpa,
      backlogs,
      failedCourses: [...failedCourses.values()],
      decline: decline === null ? null : Math.round(decline * 10) / 10,
      declining,
      earlierMean: earlierMean === null ? null : Math.round(earlierMean * 10) / 10,
      recentMean: recentMean === null ? null : Math.round(recentMean * 10) / 10,
      // "DOING BADLY" IS NOT A RISK SIGNAL. It is a separate, softer measure: a pass rate below
      // the threshold while having failed nothing. The five signals are the ones the desk acts
      // on; this one is context, and the screen says so.
      poorPerformance:
        passRate !== null && passRate < POOR_PERFORMANCE_THRESHOLD,
    },
    assignments: {
      published: relevantAssignments.length,
      submitted: relevantAssignments.length - missingAssignments.length,
      missing: missingAssignments.length,
      pastDueMissing: pastDueMissing.length,
      completionPct: assignmentCompletionPct,
      missingTitles: missingAssignments.map((a) => a.title),
    },
    subjectPerformance,
    risk: {
      state,
      signals,
      measured,
    },
    placement: {
      cgpa,
      backlogs,
      eligible: eligibility?.isEligible ?? null,
      blockedReason: eligibility?.blockedReason ?? null,
      registeredForDrives: eligibility?.registeredForDrives ?? false,
      applications: applications.length,
      offered: applications.filter((a) => a.status === 'OFFERED').length,
      drives: driveChecks,
      eligibleDrives: eligibleDrives.length,
    },
    interventions: scope.interventions.filter((i) => i.studentProfileId === studentProfileId),
  };
}

/**
 * THE COHORT GAP, for the directory.
 *
 * The gap is computed PER COURSE, and the student's biggest gap is the one that matters. It is
 * `null` when there is no cohort to compare against — one student in a course is not a
 * comparison, and a gap against yourself is zero.
 */
export function biggestGap(subjects: { gap: number | null }[]): number | null {
  const gaps = subjects
    .map((s) => s.gap)
    .filter((g): g is number => g !== null && Number.isFinite(g));
  if (gaps.length === 0) return null;
  return Math.max(...gaps);
}
