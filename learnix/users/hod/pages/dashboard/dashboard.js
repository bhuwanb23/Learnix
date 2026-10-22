/**
 * HD-01 — The HOD dashboard: the screen.
 * Docs: 11-hod.md §HD-01
 *
 * WHAT THIS SCREEN REPLACED
 * -------------------------
 * A hero banner, four counters, a list of upcoming exams, a "Needs Attention" box of PROSE
 * STRINGS, five recent cheating alerts, and a grid of three module tiles. It fetched
 * `GET /hod/dashboard` and guessed the rest.
 *
 * It was wrong in four ways that could not be fixed in place:
 *
 *   1. It counted the leave requests INSTITUTION-WIDE, so an HOD's "pending" figure included
 *      other departments' leave — and the leave list and the leave decision let that HOD see and
 *      APPROVE them.
 *   2. Its workload query was filtered by teacher alone, so a teacher who also taught in another
 *      department inflated this department's utilisation and could raise a false "overloaded"
 *      alert.
 *   3. Its alerts were prose strings, which cannot be filtered, counted or linked to.
 *   4. It had no attendance, no pass rate, no syllabus progress, no teaching hours delivered, no
 *      student risk, no trends and no health score.
 *
 * EVERYTHING COMES FROM THE SERVER
 * --------------------------------
 * The nine section names, the four quick actions, the six alert kinds, the health components and
 * bands, every icon, every colour and every threshold arrive from
 * `GET /hod/dashboard/catalogue`. The client holds a MIRROR for the frame before the catalogue
 * lands, and nothing else — a client-side list that acted as the source would be a second list to
 * forget to update.
 *
 * EVERY FIGURE IS WHAT THE SERVER SENT
 * ------------------------------------
 * The screen computes nothing about the data. It renders what came back.
 */
import React, { useCallback, useMemo } from 'react';
import { hodApi } from '../../../../services/api';
import { ALERT_KINDS, BLOCKS, QUICK_ACTIONS } from './dashboardMeta';
import { AlertStrip, DashboardScreen, useDashboard } from './dashboardUi';
import {
  AcademicProgressSection,
  AttendanceSnapshotSection,
  DepartmentKpisSection,
  TodayOverviewSection,
} from './dashboardState';
import {
  FacultyWorkloadSection,
  StudentRiskSection,
} from './dashboardWorkload';
import {
  HealthBreakdownSection,
  HealthScoreSection,
  PendingApprovalsSection,
  PerformanceTrendsSection,
  QuickActionsSection,
} from './dashboardActions';

export default function HodDashboard({ navigation }) {
  const catalogue = useDashboard(() => hodApi.dashboardCatalogue());
  const overview = useDashboard(() => hodApi.dashboardOverview());

  const reload = useCallback(() => {
    catalogue.reload();
    overview.reload();
  }, [catalogue, overview]);

  // THE SERVER'S VOCABULARY, with the mirror as the fallback for the frame before it lands.
  const blocks = catalogue.data?.blocks ?? BLOCKS;
  const quickActions = catalogue.data?.quickActions ?? QUICK_ACTIONS;
  const alertKinds = catalogue.data?.alertKinds ?? ALERT_KINDS;

  const d = overview.data;

  // The alert kinds the server sent, and the counts it sent with them. The kind LIST comes from
  // the catalogue so a kind added on the server is drawn; the COUNT comes with the alert, because
  // that is where the query lives.
  const alerts = useMemo(() => {
    const byKind = new Map((d?.alerts?.alerts ?? []).map((a) => [a.kind, a]));
    return alertKinds.map((kind) => byKind.get(kind.id) ?? { ...kind, count: 0, tone: 'clear' });
  }, [d?.alerts?.alerts, alertKinds]);

  const actionCounts = useMemo(() => {
    const byId = new Map((d?.actions?.actions ?? []).map((a) => [a.id, a]));
    return quickActions.map((a) => {
      const live = byId.get(a.id);
      return { ...a, count: live?.count ?? 0, tone: live?.tone ?? 'clear' };
    });
  }, [d?.actions?.actions, quickActions]);

  // THE ROUTES.
  //
  // A route that names a BOTTOM-NAV TAB is reached with `switchTab`; anything else is a
  // sub-screen and is reached with `openModule`. Getting this wrong is not a crash — it is a tap
  // that silently does nothing, which is why the two are kept apart here rather than guessed at
  // the call site.
  const openRoute = useCallback(
    (route, isTab) => {
      if (!route) return;
      if (isTab) navigation?.switchTab?.(route);
      else navigation?.openModule?.(route);
    },
    [navigation],
  );

  return (
    <DashboardScreen
      loading={overview.loading && catalogue.loading}
      refreshing={overview.refreshing || catalogue.refreshing}
      error={overview.error ?? catalogue.error}
      onRetry={reload}
      onRefresh={reload}
    >
      {/* THE HEALTH SCORE, first, because it is the answer the screen exists to lead to. */}
      <HealthScoreSection data={d} />
      <AlertStrip alerts={alerts} onRoute={openRoute} />

      <DepartmentKpisSection data={d} onRoute={openRoute} />
      <TodayOverviewSection data={d} onRoute={openRoute} />
      <AttendanceSnapshotSection data={d} onRoute={openRoute} />
      <AcademicProgressSection data={d} onRoute={openRoute} />
      <FacultyWorkloadSection data={d} onRoute={openRoute} />
      <StudentRiskSection data={d} onRoute={openRoute} />
      <PendingApprovalsSection data={d} onRoute={openRoute} />
      <QuickActionsSection data={d} actions={actionCounts} onRoute={openRoute} />
      <PerformanceTrendsSection data={d} onRoute={openRoute} />
      <HealthBreakdownSection data={d} />
    </DashboardScreen>
  );
}
