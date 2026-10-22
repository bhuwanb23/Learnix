/**
 * HD-05 — The HOD's Students desk: the service.
 * Docs: 11-hod.md §3.4
 *
 * THE DIRECTORY IS ONE CALL
 * -------------------------
 * Because the eleven features and the two smart features are all VIEWS of the same students, and
 * a screen that assembles them from six requests is six chances to show a half-drawn directory.
 *
 * WHAT IS IN IT
 * -------------
 *   1. STUDENT DIRECTORY       — the list, with every student's figures on the row
 *   2. SEMESTER / YEAR FILTER  — by semester, and by batch
 *   3. STUDENT PROFILES        — roll number, programme, batch, section, admission date
 *   4. ATTENDANCE TRACKING     — the register, and the longest absence run
 *   5. ACADEMIC PERFORMANCE   — the average, the pass rate, the CGPA
 *   6. ASSIGNMENT / EXAM PERFORMANCE — the assignment completion beside the exam results
 *   7. SUBJECT-WISE PERFORMANCE— the average per course, beside the cohort's
 *   8. SKILL-GAP ANALYSIS      — the gap per course, and the biggest one
 *   9. AT-RISK IDENTIFICATION  — the five signals and the verdict
 *  10. PLACEMENT READINESS    — the CGPA, the backlogs, and the drives they clear
 *  11. INTERVENTION HISTORY    — what the department has already tried
 */
import { resolveAttendanceThreshold } from './hod-dashboard.rules.js';
import {
  ATTENDANCE_RISK_THRESHOLD,
  INTERVENTION_STATUS_META,
  INTERVENTION_TYPES,
  PLACEMENT_MAX_BACKLOGS,
  PLACEMENT_READY_CGPA,
  POOR_ASSIGNMENT_COUNT,
  POOR_PERFORMANCE_THRESHOLD,
  REPEATED_ABSENCE_STREAK,
  RISK_SIGNALS,
  RISK_STATES,
  STUDENT_PAGE_SIZE,
  STUDENT_SORTS,
  STUDENT_SORT_LABELS,
  assertStudentSort,
} from './hod-students.rules.js';
import { resolveStudentScope, type StudentScope } from './hod-students.scope.js';
import { biggestGap, studentFigures } from './hod-students.figures.js';
import { buildAtRiskList, buildSuggestions } from './hod-students.smart.js';

// ═══ 1. The vocabulary ════════════════════════════════════════════════════

/** The catalogue: every word the screen draws, from the server. */
export async function studentCatalogue() {
  return {
    riskSignals: RISK_SIGNALS.map((s) => ({
      id: s.id,
      label: s.label,
      blurb: s.blurb,
      icon: s.icon,
      color: s.color,
      weight: s.weight,
    })),
    riskStates: RISK_STATES,
    interventionTypes: INTERVENTION_TYPES.map((t) => ({
      id: t.id,
      label: t.label,
      blurb: t.blurb,
      icon: t.icon,
      color: t.color,
    })),
    interventionStatuses: Object.entries(INTERVENTION_STATUS_META).map(([id, m]) => ({
      id,
      label: m.label,
      color: m.color,
    })),
    sorts: STUDENT_SORTS.map((id) => ({ id, label: STUDENT_SORT_LABELS[id] })),
    thresholds: {
      attendance: ATTENDANCE_RISK_THRESHOLD,
      poorPerformance: POOR_PERFORMANCE_THRESHOLD,
      repeatedAbsenceStreak: REPEATED_ABSENCE_STREAK,
      poorAssignmentCount: POOR_ASSIGNMENT_COUNT,
      placementReadyCgpa: PLACEMENT_READY_CGPA,
      placementMaxBacklogs: PLACEMENT_MAX_BACKLOGS,
      pageSize: STUDENT_PAGE_SIZE,
    },
  };
}

// ═══ 2. The directory ═════════════════════════════════════════════════════

export type StudentDirectoryQuery = {
  academicYearId?: string;
  semester?: number;
  batchId?: string;
  risk?: string;
  search?: string;
  sort?: string;
};

/**
 * THE STUDENT DIRECTORY.
 *
 * Every row carries the risk verdict, the attendance, the pass rate, the CGPA and the gap, so
 * the directory IS the monitoring list and not a name list.
 */
export async function studentDirectory(
  hodUserId: string,
  institutionId: string,
  query: StudentDirectoryQuery = {},
) {
  const scope = await resolveStudentScope(hodUserId, institutionId, query.academicYearId);
  const threshold = await resolveAttendanceThreshold(institutionId);
  const now = new Date();

  const sort = assertStudentSort(query.sort ?? 'name');
  const search = (query.search ?? '').trim().toLowerCase();
  const risk = query.risk && query.risk !== 'ALL' ? query.risk : null;

  const figures = new Map<string, ReturnType<typeof studentFigures>>();
  const rows = scope.students.map((s) => {
    const f = studentFigures(scope, s.id, now, threshold);
    figures.set(s.id, f);
    return { student: s, figures: f };
  });

  let filtered = rows;
  if (query.semester) filtered = filtered.filter((r) => r.student.semester === query.semester);
  if (query.batchId) filtered = filtered.filter((r) => r.student.batchId === query.batchId);
  if (risk) filtered = filtered.filter((r) => r.figures.risk.state === risk);
  if (search) {
    filtered = filtered.filter(
      (r) =>
        r.student.name.toLowerCase().includes(search) ||
        r.student.rollNo.toLowerCase().includes(search),
    );
  }

  const SORTERS: Record<
    string,
    (a: (typeof filtered)[number], b: (typeof filtered)[number]) => number
  > = {
    name: (a, b) => a.student.name.localeCompare(b.student.name),
    rollNo: (a, b) => a.student.rollNo.localeCompare(b.student.rollNo),
    semester: (a, b) => (a.student.semester ?? 0) - (b.student.semester ?? 0),
    attendance: (a, b) =>
      (a.figures.attendance.attendancePct ?? 101) -
      (b.figures.attendance.attendancePct ?? 101),
    risk: (a, b) => b.figures.risk.signals.length - a.figures.risk.signals.length,
    cgpa: (a, b) => (b.figures.results.cgpa ?? -1) - (a.figures.results.cgpa ?? -1),
  };
  const sorted = [...filtered].sort(SORTERS[sort] ?? SORTERS.name!);

  // THE SEMESTERS AND BATCHES, for the filters.
  const semesters = [...new Set(scope.students.map((s) => s.semester).filter((s): s is number => s !== null))].sort(
    (a, b) => a - b,
  );
  const batches = [
    ...new Map(
      scope.students
        .filter((s) => s.batchId)
        .map((s) => [s.batchId!, { id: s.batchId!, name: s.batchName ?? s.batchId! }]),
    ).values(),
  ];

  const atRisk = buildAtRiskList(
    rows.map((r) => ({
      studentProfileId: r.student.id,
      name: r.student.name,
      rollNo: r.student.rollNo,
      semester: r.student.semester,
      risk: r.figures.risk,
      attendance: r.figures.attendance,
    })),
  );

  return {
    scope: {
      institutionId: scope.institutionId,
      department: scope.department,
      academicYearId: query.academicYearId ?? null,
    },
    filters: {
      semester: query.semester ?? null,
      batchId: query.batchId ?? null,
      risk: risk ?? null,
      search: query.search ?? '',
      sort,
    },
    totals: {
      students: scope.students.length,
      atRisk: rows.filter((r) => r.figures.risk.state === 'AT_RISK').length,
      watch: rows.filter((r) => r.figures.risk.state === 'WATCH').length,
      unmeasured: rows.filter((r) => r.figures.risk.state === 'UNMEASURED').length,
      ok: rows.filter((r) => r.figures.risk.state === 'OK').length,
      placementReady: rows.filter(
        (r) => r.figures.placement.eligibleDrives > 0 || r.figures.placement.eligible === true,
      ).length,
      interventions: scope.interventions.length,
      openInterventions: scope.interventions.filter(
        (i) => i.status === 'PROPOSED' || i.status === 'IN_PROGRESS',
      ).length,
    },
    filters2: { semesters, batches },
    atRisk: atRisk.map((a) => ({
      studentProfileId: a.studentProfileId,
      name: a.name,
      rollNo: a.rollNo,
      semester: a.semester,
      state: a.risk.state,
      signals: a.risk.signals,
      attendancePct: a.attendance.attendancePct,
    })),
    students: sorted.map((r) => ({
      studentProfileId: r.student.id,
      userId: r.student.userId,
      name: r.student.name,
      rollNo: r.student.rollNo,
      semester: r.student.semester,
      section: r.student.section,
      batchName: r.student.batchName,
      attendance: r.figures.attendance,
      results: r.figures.results,
      assignments: r.figures.assignments,
      risk: r.figures.risk,
      placement: r.figures.placement,
      subjectCount: r.figures.subjectPerformance.length,
      gap: biggestGap(r.figures.subjectPerformance),
      interventions: r.figures.interventions.length,
      openInterventions: r.figures.interventions.filter(
        (i) => i.status === 'PROPOSED' || i.status === 'IN_PROGRESS',
      ).length,
    })),
  };
}

// ═══ 3. The suggestions for a student ══════════════════════════════════════

/**
 * THE EARLY INTERVENTION SUGGESTIONS for one student.
 *
 * Derived from the signals that fired, with the context filled in — the course they are weakest
 * in, the courses they have failed, the length of their absence run.
 */
export function suggestionsFor(
  scope: StudentScope,
  studentProfileId: string,
  now: Date = new Date(),
  attendanceThreshold: number = 75,
) {
  const f = studentFigures(scope, studentProfileId, now, attendanceThreshold);
  const subjects = f.subjectPerformance;
  const weakest = subjects
    .filter((s) => s.gap !== null)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))[0] ?? null;

  return buildSuggestions(f.risk.signals, {
    weakestCourse: weakest
      ? { code: weakest.code, name: weakest.name, gap: weakest.gap }
      : null,
    failedCourses: f.results.failedCourses,
    absenceStreak: f.attendance.longestAbsenceStreak,
    cgpa: f.results.cgpa,
  });
}
