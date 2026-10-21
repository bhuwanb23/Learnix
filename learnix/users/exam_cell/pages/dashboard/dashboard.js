/**
 * X-11 — The exam cell dashboard: the screen.
 * Docs: 05-exam-cell.md §3.1
 *
 * WHAT THIS SCREEN REPLACED
 * -------------------------
 * A hero banner, four counters, a list of upcoming papers, a "Needs Attention" box of PROSE
 * STRINGS, five recent cheating cases, and a grid of six module tiles. It fetched
 * `GET /examcell/dashboard` and guessed the rest.
 *
 * It was wrong in four ways that could not be fixed in place:
 *
 *   1. It counted THREE of the SIX exam statuses, so a DRAFT exam and a PUBLISHED one were both
 *      INVISIBLE. An officer reading "0 ongoing" could not tell whether that meant "none running"
 *      or "the dashboard does not count that".
 *   2. It counted only `UNDER_REVIEW` misconduct cases, when the open set is REPORTED, UNDER_REVIEW,
 *      COMMITTEE_REVIEW and ESCALATED. Three of the four were invisible.
 *   3. Its alerts were prose strings, which cannot be filtered, counted, or linked to.
 *   4. It had no "absent" and no "appeared" — because the exam domain had NO attendance record at
 *      all, and the only attendance table in the platform was a teacher's per-lecture register,
 *      keyed by course offering, with no join key to an exam slot.
 *
 * (4) is why this feature also adds `ExamAttendance` and the mark-roll that fills it. Absence is
 * RECORDED, never inferred: a paper whose roll nobody has taken is not a paper full of absentees,
 * and the screen says "not marked yet" rather than "0 appeared".
 *
 * EVERYTHING COMES FROM THE SERVER
 * --------------------------------
 * The seven section names, the four quick actions, the six alert kinds, every icon, every colour
 * and every threshold arrive from `GET /examcell/dashboard/catalogue`. The client holds a MIRROR
 * for the frame before the catalogue lands, and nothing else — a client-side list that acted as the
 * source would be a second list to forget to update.
 *
 * EVERY FIGURE IS WHAT THE SERVER SENT
 * ------------------------------------
 * The screen computes nothing about the data. It renders what came back. A number the client
 * derived is a number the client can get wrong.
 */
import React, { useCallback, useMemo } from 'react';
import { examcellApi } from '../../../../services/api';
import { ALERT_KINDS, BLOCKS, QUICK_ACTIONS } from './dashboardMeta';
import { DashboardScreen, useDashboard } from './dashboardUi';
import {
  ExamOverviewSection,
  EvaluationStatusSection,
  ResultProgressSection,
  StudentStatisticsSection,
} from './dashboardState';
import {
  ExamAlertsSection,
  PerformanceSnapshotSection,
  QuickActionsSection,
} from './dashboardActions';

export default function ExamDashboard({ navigation }) {
  const catalogue = useDashboard(() => examcellApi.dashboardCatalogue());
  const overview = useDashboard(() => examcellApi.dashboardOverview());

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

  const openRoute = useCallback(
    (route) => {
      if (!route) return;
      // `openModule` DROPS its second argument, so a route that needs a param cannot be reached
      // this way. Every route the server publishes here is a screen that picks its own exam, so
      // this is the correct call — and the audit asserts every route is a registered key.
      navigation?.openModule?.(route);
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
      <ExamOverviewSection data={d} navigation={navigation} />
      <EvaluationStatusSection data={d} navigation={navigation} />
      <ResultProgressSection data={d} navigation={navigation} />
      <StudentStatisticsSection data={d} />
      <ExamAlertsSection data={d} alerts={alerts} onRoute={openRoute} />
      <QuickActionsSection actions={actionCounts} onRoute={openRoute} />
      <PerformanceSnapshotSection data={d} onRoute={openRoute} />
    </DashboardScreen>
  );
}
