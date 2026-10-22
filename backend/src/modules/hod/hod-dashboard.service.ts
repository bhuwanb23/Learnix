/**
 * HD-01 — The HOD dashboard: the assembler.
 * Docs: 11-hod.md §HD-01
 *
 * ONE CALL, NINE SECTIONS
 * -----------------------
 * `dashboardOverview` answers the whole screen in one request. The alternative — nine per-section
 * requests — is nine round trips on first paint, and a dashboard that takes nine round trips to
 * draw is a dashboard that draws nine different things as they arrive.
 *
 * The per-section route exists for the case that genuinely needs it, and it calls the SAME
 * functions the overview calls, so the two can never disagree.
 *
 * WHAT THIS FILE DOES NOT DO
 * --------------------------
 * It does not count anything. Every figure is counted in `hod-dashboard.sections.ts` (the state),
 * `hod-dashboard.workload.ts` (the workload and the risk) or `hod-dashboard.actions.ts` (the
 * approvals, the actions, the trends and the score). This file is the assembler.
 */
import {
  HOD_ALERT_KINDS,
  HOD_BLOCKS,
  HOD_QUICK_ACTIONS,
  HEALTH_BANDS,
  HEALTH_COMPONENTS,
  ATTENDANCE_RISK_THRESHOLD,
  DEPARTMENT_ATTENDANCE_THRESHOLD,
  PASS_RATE_THRESHOLD,
  RISK_STUDENT_LIMIT,
  SYLLABUS_STALE_DAYS,
  alertTone,
  assertHodBlock,
  type HodBlockId,
} from './hod-dashboard.rules.js';
import { resolveHodScope } from './hod-dashboard.scope.js';
import {
  academicProgressSection,
  attendanceSnapshotSection,
  departmentKpisSection,
  todayOverviewSection,
} from './hod-dashboard.sections.js';
import {
  facultyWorkloadSection,
  studentRiskSection,
} from './hod-dashboard.workload.js';
import {
  healthScoreSection,
  pendingApprovalsSection,
  performanceTrendsSection,
  quickActionsSection,
} from './hod-dashboard.actions.js';

/**
 * The vocabulary the screen renders from.
 *
 * The block list, the quick actions, the alert kinds, the health-score components and bands, and
 * every threshold. All of it is the SERVER's, so a section added here draws itself.
 */
export async function dashboardCatalogue() {
  return {
    blocks: HOD_BLOCKS,
    quickActions: HOD_QUICK_ACTIONS,
    alertKinds: HOD_ALERT_KINDS,
    health: {
      components: HEALTH_COMPONENTS,
      bands: HEALTH_BANDS,
    },
    thresholds: {
      attendanceRisk: ATTENDANCE_RISK_THRESHOLD,
      departmentAttendance: DEPARTMENT_ATTENDANCE_THRESHOLD,
      passRate: PASS_RATE_THRESHOLD,
      syllabusStaleDays: SYLLABUS_STALE_DAYS,
      riskStudentLimit: RISK_STUDENT_LIMIT,
    },
  };
}

/**
 * The whole screen, in one call.
 *
 * The scope is resolved ONCE and every section reads from it, so no section can accidentally use a
 * different scope from its neighbour.
 */
export async function dashboardOverview(
  hodUserId: string,
  institutionId: string,
  academicYearId?: string,
) {
  const scope = await resolveHodScope(hodUserId, institutionId, academicYearId);

  // THE SEVEN SECTIONS, fetched TOGETHER.
  const [kpis, today, attendance, progress, workload, risk, approvals, actions, trends] =
    await Promise.all([
      departmentKpisSection(scope),
      todayOverviewSection(scope),
      attendanceSnapshotSection(scope),
      academicProgressSection(scope),
      facultyWorkloadSection(scope),
      studentRiskSection(scope),
      pendingApprovalsSection(scope),
      quickActionsSection(scope),
      performanceTrendsSection(scope),
    ]);

  // THE HEALTH SCORE, built from the figures the sections already computed — so it cannot
  // disagree with the screen it sits on.
  const health = await healthScoreSection({
    attendance: attendance.attendancePct,
    syllabus: progress.percent,
    balance: workload.balanceScore,
    performance: kpis.passRate,
  });

  // THE ALERTS, structured. Each kind is ALWAYS present with its count, including the zeroes —
  // a section that hides the clear kinds cannot answer "is anything wrong?".
  const alertCounts: Record<string, number> = {
    OVERLOADED_FACULTY: workload.overloaded,
    LOW_ATTENDANCE: attendance.belowThreshold ? 1 : 0,
    POOR_PERFORMANCE: kpis.passVerdict === 'BELOW_THRESHOLD' ? 1 : 0,
    AT_RISK_STUDENTS: risk.atRisk,
    STALLED_SYLLABUS: progress.stalled,
    PENDING_APPROVALS: approvals.total,
  };

  const alerts = HOD_ALERT_KINDS.map((kind) => {
    const count = alertCounts[kind.id] ?? 0;
    return {
      kind: kind.id,
      label: kind.label,
      blurb: kind.blurb,
      icon: kind.icon,
      color: kind.color,
      severity: kind.severity,
      route: kind.route,
      isTab: kind.isTab,
      count,
      // A ZERO IS CLEAR. The kind is still listed, so the section can answer "is anything wrong?".
      tone: alertTone(count),
    };
  });

  return {
    scope: 'department',
    academicYearId: academicYearId ?? null,
    department: scope.department,
    kpis,
    today,
    attendance,
    progress,
    workload,
    risk,
    approvals,
    actions,
    trends,
    health,
    alerts: {
      alerts,
      firing: alerts.filter((a) => a.count > 0).length,
      total: alerts.reduce((s, a) => s + a.count, 0),
      high: alerts.filter((a) => a.severity === 'HIGH' && a.count > 0).length,
    },
  };
}

/**
 * One section on its own.
 *
 * The SAME functions the overview calls, so a per-section read and the overview cannot disagree.
 */
export async function dashboardBlock(
  hodUserId: string,
  institutionId: string,
  block: string,
  academicYearId?: string,
) {
  const id: HodBlockId = assertHodBlock(block);
  const scope = await resolveHodScope(hodUserId, institutionId, academicYearId);

  switch (id) {
    case 'DEPARTMENT_KPIS':
      return { block: id, data: await departmentKpisSection(scope) };
    case 'TODAY_OVERVIEW':
      return { block: id, data: await todayOverviewSection(scope) };
    case 'ATTENDANCE_SNAPSHOT':
      return { block: id, data: await attendanceSnapshotSection(scope) };
    case 'ACADEMIC_PROGRESS':
      return { block: id, data: await academicProgressSection(scope) };
    case 'FACULTY_WORKLOAD':
      return { block: id, data: await facultyWorkloadSection(scope) };
    case 'STUDENT_RISK':
      return { block: id, data: await studentRiskSection(scope) };
    case 'PENDING_APPROVALS':
      return { block: id, data: await pendingApprovalsSection(scope) };
    case 'QUICK_ACTIONS':
      return { block: id, data: await quickActionsSection(scope) };
    case 'PERFORMANCE_TRENDS':
      return { block: id, data: await performanceTrendsSection(scope) };
  }
}
