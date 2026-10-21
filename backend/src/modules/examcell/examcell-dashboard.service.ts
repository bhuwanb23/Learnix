/**
 * X-11 — The exam cell dashboard: the service.
 * Docs: 05-exam-cell.md §3.1
 *
 * ONE CALL, SEVEN SECTIONS
 * -------------------------
 * `dashboardOverview` answers the whole screen in one request. The alternative — seven per-section
 * requests — is seven round trips on first paint, and a dashboard that takes seven round trips to
 * draw is a dashboard that draws seven different things as they arrive.
 *
 * The per-section route exists for the case that genuinely needs it: a section that refreshes on
 * its own, or a client that wants one block without the rest. It calls the SAME function the
 * overview calls, so the two can never disagree.
 *
 * WHAT THIS FILE DOES NOT DO
 * --------------------------
 * It does not count anything. Every figure is counted in `examcell-dashboard.sections.ts` (the
 * state) or `examcell-dashboard.actions.ts` (the alerts, the actions, the performance), and those
 * files read the desks' own rules rather than restating them. This file is the assembler.
 */
import {
  DASHBOARD_BLOCKS,
  QUICK_ACTIONS,
  ALERT_KINDS,
  UPCOMING_WINDOW_DAYS,
  TREND_LIMIT,
  RECENT_CASE_LIMIT,
  assertDashboardBlock,
  type DashboardBlockId,
} from './examcell-dashboard.rules.js';
import {
  examOverviewSection,
  evaluationStatusSection,
  resultProgressSection,
  studentStatisticsSection,
} from './examcell-dashboard.sections.js';
import {
  examAlertsSection,
  performanceSnapshotSection,
  quickActionsSection,
} from './examcell-dashboard.actions.js';

/**
 * The vocabulary the screen renders from.
 *
 * The block list, the quick actions, the alert kinds and the thresholds. All of it is the SERVER's,
 * so a section added here draws itself on the client with no change to the app.
 */
export async function dashboardCatalogue() {
  return {
    blocks: DASHBOARD_BLOCKS,
    quickActions: QUICK_ACTIONS,
    alertKinds: ALERT_KINDS,
    thresholds: {
      upcomingWindowDays: UPCOMING_WINDOW_DAYS,
      trendLimit: TREND_LIMIT,
      recentCaseLimit: RECENT_CASE_LIMIT,
    },
  };
}

/**
 * The whole screen, in one call.
 *
 * The seven sections are fetched TOGETHER, not in sequence — seven independent reads, and the
 * office is waiting for all of them anyway.
 */
export async function dashboardOverview(institutionId: string, examId?: string) {
  const [overview, evaluation, results, students, alerts, actions, performance] = await Promise.all([
    examOverviewSection(institutionId),
    evaluationStatusSection(institutionId),
    resultProgressSection(institutionId),
    studentStatisticsSection(institutionId),
    examAlertsSection(institutionId),
    quickActionsSection(institutionId),
    performanceSnapshotSection(institutionId, examId),
  ]);

  return {
    scope: examId ? 'exam' : 'institution',
    examId: examId ?? null,
    overview,
    evaluation,
    results,
    students,
    alerts,
    actions,
    performance,
  };
}

/**
 * One section on its own.
 *
 * The SAME function the overview calls, so a per-section read and the overview cannot disagree.
 */
export async function dashboardBlock(institutionId: string, block: string, examId?: string) {
  const id: DashboardBlockId = assertDashboardBlock(block);
  switch (id) {
    case 'EXAM_OVERVIEW':
      return { block: id, data: await examOverviewSection(institutionId) };
    case 'EVALUATION_STATUS':
      return { block: id, data: await evaluationStatusSection(institutionId) };
    case 'RESULT_PROGRESS':
      return { block: id, data: await resultProgressSection(institutionId) };
    case 'STUDENT_STATISTICS':
      return { block: id, data: await studentStatisticsSection(institutionId) };
    case 'EXAM_ALERTS':
      return { block: id, data: await examAlertsSection(institutionId) };
    case 'QUICK_ACTIONS':
      return { block: id, data: await quickActionsSection(institutionId) };
    case 'PERFORMANCE_SNAPSHOT':
      return { block: id, data: await performanceSnapshotSection(institutionId, examId) };
  }
}
