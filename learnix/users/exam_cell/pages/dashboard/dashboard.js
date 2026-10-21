/**
 * X-11 — The exam cell dashboard: the seven-section screen.
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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { examcellApi } from '../../../../services/api';
import {
  ALERT_KINDS,
  BLOCKS,
  GREEN,
  MUTED,
  QUICK_ACTIONS,
  RED,
  SLATE,
  VIOLET,
  blockMeta,
  fmtDay,
  fmtDayFull,
  percent,
  plural,
  quickActionMeta,
  timeAgo,
} from './dashboardMeta';
import {
  ActionTile,
  AlertRow,
  DashboardEmpty,
  DashboardScreen,
  DetailRow,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  useDashboard,
} from './dashboardUi';

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
  const ex = d?.overview;
  const ev = d?.evaluation;
  const rs = d?.results;
  const st = d?.students;
  const al = d?.alerts;
  const ac = d?.actions;
  const pf = d?.performance;

  // The alert kinds the server sent, and the counts it sent with them. The kind LIST comes from the
  // catalogue so a kind added on the server is drawn; the COUNT comes with the alert, because that
  // is where the query lives.
  const alerts = useMemo(() => {
    const byKind = new Map((al?.alerts ?? []).map((a) => [a.kind, a]));
    return alertKinds.map((kind) => byKind.get(kind.id) ?? { ...kind, count: 0, tone: 'clear' });
  }, [al?.alerts, alertKinds]);

  const actionCounts = useMemo(() => {
    const byId = new Map((ac?.actions ?? []).map((a) => [a.id, a]));
    return quickActions.map((a) => {
      const live = byId.get(a.id);
      return { ...a, count: live?.count ?? 0, tone: live?.tone ?? 'clear' };
    });
  }, [ac?.actions, quickActions]);

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
      {/* 1 — EXAM OVERVIEW. */}
      <Section
        title={blockMeta('EXAM_OVERVIEW')?.label ?? 'Exam overview'}
        blurb={blockMeta('EXAM_OVERVIEW')?.blurb}
        icon={blockMeta('EXAM_OVERVIEW')?.icon}
        color={blockMeta('EXAM_OVERVIEW')?.color}
        right={
          <TouchableOpacity onPress={() => navigation?.switchTab?.('Timetable')} hitSlop={8}>
            <Text style={styles.link}>Timetable</Text>
          </TouchableOpacity>
        }
      >
        <StatRow>
          <StatTile
            label="Ongoing"
            value={ex?.ongoing ?? 0}
            icon="pulse-outline"
            color={blockMeta('EXAM_OVERVIEW')?.color}
          />
          <StatTile
            label="Scheduled"
            value={ex?.scheduled ?? 0}
            hint={`${ex?.draft ?? 0} draft`}
            icon="calendar-outline"
            color={blockMeta('EXAM_OVERVIEW')?.color}
          />
          <StatTile
            label="Completed"
            value={ex?.completed ?? 0}
            icon="checkmark-done-outline"
            color={GREEN}
          />
        </StatRow>

        {ex?.deadline ? (
          <View style={styles.deadline}>
            <Ionicons
              name={ex.deadline.overdue ? 'alarm' : 'alarm-outline'}
              size={14}
              color={ex.deadline.overdue ? RED : SLATE}
            />
            <Text style={[styles.deadlineText, ex.deadline.overdue ? { color: RED } : null]}>
              {ex.deadline.examName} — grading due {fmtDayFull(ex.deadline.dueAt)}
              {ex.deadline.daysLeft !== null
                ? ex.deadline.overdue
                  ? ` (${Math.abs(ex.deadline.daysLeft)}d overdue)`
                  : ` (${ex.deadline.daysLeft}d left)`
                : ''}
            </Text>
          </View>
        ) : null}

        {(ex?.upcoming ?? []).length === 0 ? (
          <DashboardEmpty
            icon="calendar-outline"
            title="No papers in the next week"
            message="The next fortnight is empty. Papers appear here once they are scheduled."
          />
        ) : (
          (ex?.upcoming ?? []).map((u) => (
            <View key={u.slotId} style={styles.paperRow}>
              <View style={styles.paperWhen}>
                <Text style={styles.paperDay}>{fmtDay(u.date)}</Text>
                <Text style={styles.paperTime}>{u.startTime}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.paperTitle} numberOfLines={1}>
                  {u.subject}
                </Text>
                <Text style={styles.paperMeta} numberOfLines={1}>
                  {u.code} · {u.examName}
                  {u.room ? ` · ${u.room}` : ''}
                </Text>
              </View>
              {u.rescheduled ? (
                <View style={styles.rescheduledTag}>
                  <Text style={styles.rescheduledText}>moved</Text>
                </View>
              ) : null}
            </View>
          ))
        )}
      </Section>

      {/* 2 — EVALUATION STATUS. */}
      <Section
        title={blockMeta('EVALUATION_STATUS')?.label ?? 'Evaluation status'}
        blurb={blockMeta('EVALUATION_STATUS')?.blurb}
        icon={blockMeta('EVALUATION_STATUS')?.icon}
        color={blockMeta('EVALUATION_STATUS')?.color}
        right={
          <TouchableOpacity onPress={() => navigation?.switchTab?.('Evaluations')} hitSlop={8}>
            <Text style={styles.link}>Evaluations</Text>
          </TouchableOpacity>
        }
      >
        <StatRow>
          <StatTile label="Evaluated" value={ev?.evaluated ?? 0} hint={`of ${ev?.total ?? 0}`} />
          <StatTile
            label="Still to mark"
            value={ev?.pending ?? 0}
            tone={ev?.pending > 0 ? 'warn' : 'clear'}
          />
          <StatTile
            label="Under review"
            value={ev?.underReview ?? 0}
            tone={ev?.underReview > 0 ? 'warn' : 'clear'}
            hint="moderation"
          />
        </StatRow>
        <ProgressBar
          percent={ev?.percent ?? 0}
          color={blockMeta('EVALUATION_STATUS')?.color}
          label={`${ev?.percent ?? 0}% of papers marked`}
        />
        <DetailRow
          label="Scripts in custody"
          value={`${ev?.scripts?.inCustody ?? 0} of ${ev?.total ?? 0}`}
        />
        <DetailRow
          label="Scripts verified"
          value={`${ev?.scripts?.verified ?? 0}`}
        />
        {ev?.flagged > 0 ? (
          <NoteStrip tone="warn">
            {plural(ev.flagged, 'subject')} flagged by moderation — the marks are unlocked and need
            looking at.
          </NoteStrip>
        ) : null}
      </Section>

      {/* 3 — RESULT PROGRESS. */}
      <Section
        title={blockMeta('RESULT_PROGRESS')?.label ?? 'Result progress'}
        blurb={blockMeta('RESULT_PROGRESS')?.blurb}
        icon={blockMeta('RESULT_PROGRESS')?.icon}
        color={blockMeta('RESULT_PROGRESS')?.color}
        right={
          <TouchableOpacity onPress={() => navigation?.switchTab?.('Results')} hitSlop={8}>
            <Text style={styles.link}>Results</Text>
          </TouchableOpacity>
        }
      >
        <StatRow>
          <StatTile
            label="Published"
            value={rs?.published ?? 0}
            hint={`of ${rs?.total ?? 0}`}
            tone="clear"
          />
          <StatTile
            label="In processing"
            value={rs?.inProcessing ?? 0}
            tone={rs?.inProcessing > 0 ? 'warn' : 'clear'}
          />
          <StatTile
            label="Ready to publish"
            value={rs?.readyToPublish ?? 0}
            tone={rs?.readyToPublish > 0 ? 'warn' : 'clear'}
          />
        </StatRow>
        <ProgressBar
          percent={rs?.publishPercent ?? 0}
          color={blockMeta('RESULT_PROGRESS')?.color}
          label={`${rs?.publishPercent ?? 0}% published`}
        />
        {(rs?.slots ?? []).length === 0 ? (
          <DashboardEmpty
            icon="trophy-outline"
            title="No results yet"
            message="Marks appear here as the papers are consolidated."
          />
        ) : (
          (rs?.slots ?? []).slice(0, 4).map((s) => (
            <View key={s.slotId} style={styles.slotRow}>
              <View style={styles.flex}>
                <Text style={styles.paperTitle} numberOfLines={1}>
                  {s.subject}
                </Text>
                <Text style={styles.paperMeta} numberOfLines={1}>
                  {s.code} · {s.examName}
                </Text>
              </View>
              {s.ready ? (
                <View style={[styles.tag, { backgroundColor: '#dcfce7' }]}>
                  <Text style={[styles.tagText, { color: GREEN }]}>ready</Text>
                </View>
              ) : (
                <Text style={styles.blockers} numberOfLines={1}>
                  {s.blockers[0] ?? 'blocked'}
                </Text>
              )}
            </View>
          ))
        )}
      </Section>

      {/* 4 — STUDENT STATISTICS. */}
      <Section
        title={blockMeta('STUDENT_STATISTICS')?.label ?? 'Student statistics'}
        blurb={blockMeta('STUDENT_STATISTICS')?.blurb}
        icon={blockMeta('STUDENT_STATISTICS')?.icon}
        color={blockMeta('STUDENT_STATISTICS')?.color}
      >
        <StatRow>
          <StatTile label="Registered" value={st?.registered ?? 0} hint="enrolments" />
          <StatTile label="Eligible" value={st?.eligible ?? 0} hint="no warnings" />
          <StatTile
            label="Appeared"
            value={st?.appeared ?? 0}
            tone={st?.marked ? 'clear' : undefined}
            hint={st?.marked ? 'present' : 'not marked yet'}
          />
          <StatTile
            label="Absent"
            value={st?.absent ?? 0}
            tone={st?.absent > 0 ? 'bad' : 'clear'}
          />
        </StatRow>
        {st && !st.marked ? (
          <NoteStrip tone="warn">
            No paper has been marked yet, so the appeared and absent figures are zero because the
            roll has not been taken — not because nobody came. Take the roll from a paper.
          </NoteStrip>
        ) : null}
        {st && st.unmarked > 0 ? (
          <NoteStrip>
            {plural(st.unmarked, 'student')} on the roll {st.unmarked === 1 ? 'has' : 'have'} not
            been marked yet. That is not an absence.
          </NoteStrip>
        ) : null}
        <DetailRow label="Students on the roll" value={`${st?.rollTotal ?? 0}`} />
        <DetailRow
          label="Papers marked"
          value={`${st?.markedSlots ?? 0} of ${st?.slots ?? 0}`}
        />
        <DetailRow
          label="With fee dues"
          value={`${st?.warnings?.outstandingFees ?? 0}`}
        />
      </Section>

      {/* 5 — EXAM ALERTS. */}
      <Section
        title={blockMeta('EXAM_ALERTS')?.label ?? 'Exam alerts'}
        blurb={blockMeta('EXAM_ALERTS')?.blurb}
        icon={blockMeta('EXAM_ALERTS')?.icon}
        color={blockMeta('EXAM_ALERTS')?.color}
      >
        {alerts.map((a) => (
          <AlertRow key={a.kind} alert={a} onPress={() => openRoute(a.route)} />
        ))}
        {(al?.recentCases ?? []).length > 0 ? (
          <>
            <Text style={styles.subLabel}>Recent cases</Text>
            {(al?.recentCases ?? []).map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.caseRow}
                onPress={() => openRoute('CheatingCases')}
                activeOpacity={0.75}
              >
                <Ionicons name="warning-outline" size={15} color={RED} />
                <View style={styles.flex}>
                  <Text style={styles.paperTitle} numberOfLines={1}>
                    {c.student}
                  </Text>
                  <Text style={styles.paperMeta} numberOfLines={1}>
                    {c.subject} · {c.status}
                  </Text>
                </View>
                <Text style={styles.caseWhen}>{timeAgo(c.createdAt)}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}
      </Section>

      {/* 6 — QUICK ACTIONS. */}
      <Section
        title={blockMeta('QUICK_ACTIONS')?.label ?? 'Quick actions'}
        blurb={blockMeta('QUICK_ACTIONS')?.blurb}
        icon={blockMeta('QUICK_ACTIONS')?.icon}
        color={blockMeta('QUICK_ACTIONS')?.color}
      >
        <View style={styles.actionGrid}>
          {actionCounts.map((a) => (
            <ActionTile
              key={a.id}
              action={a}
              count={a.count}
              tone={a.tone}
              onPress={() => openRoute(a.route)}
            />
          ))}
        </View>
      </Section>

      {/* 7 — PERFORMANCE SNAPSHOT. */}
      <Section
        title={blockMeta('PERFORMANCE_SNAPSHOT')?.label ?? 'Performance snapshot'}
        blurb={blockMeta('PERFORMANCE_SNAPSHOT')?.blurb}
        icon={blockMeta('PERFORMANCE_SNAPSHOT')?.icon}
        color={blockMeta('PERFORMANCE_SNAPSHOT')?.color}
        right={
          <TouchableOpacity
            onPress={() => openRoute('ResultsAnalytics')}
            hitSlop={8}
          >
            <Text style={styles.link}>Analytics</Text>
          </TouchableOpacity>
        }
      >
        {(pf?.results ?? 0) === 0 ? (
          <DashboardEmpty
            icon="stats-chart-outline"
            title="No results to summarise"
            message="The pass rate and the subject trends appear once results exist."
          />
        ) : (
          <>
            <StatRow>
              <StatTile label="Pass rate" value={percent(pf?.passPercent)} />
              <StatTile
                label="Average marks"
                value={pf?.averageMarks ?? '—'}
                hint={pf?.averagePercent !== null ? `${pf.averagePercent}%` : undefined}
              />
              <StatTile label="Results" value={pf?.results ?? 0} />
            </StatRow>

            {(pf?.subjects ?? []).length > 0 ? (
              <>
                <Text style={styles.subLabel}>Subject-wise</Text>
                {pf.subjects.slice(0, 6).map((s) => (
                  <View key={s.code} style={styles.subjectRow}>
                    <View style={styles.flex}>
                      <Text style={styles.paperTitle} numberOfLines={1}>
                        {s.subject}
                      </Text>
                      <Text style={styles.paperMeta}>
                        {s.code} · {plural(s.count, 'result')}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.subjectPass,
                        { color: s.passPercent >= 50 ? GREEN : s.passPercent > 0 ? '#d97706' : RED },
                      ]}
                    >
                      {percent(s.passPercent)}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {pf?.hasTrends ? (
              <>
                <Text style={styles.subLabel}>Trends</Text>
                {pf.trends.slice(0, 4).map((t) => (
                  <View key={t.code} style={styles.trendBox}>
                    <Text style={styles.paperTitle} numberOfLines={1}>
                      {t.subject}
                    </Text>
                    {t.points.map((p) => (
                      <View key={p.examId} style={styles.trendRow}>
                        <Text style={styles.trendExam} numberOfLines={1}>
                          {p.examName}
                        </Text>
                        <Text style={styles.trendValue}>
                          {percent(p.averagePercent)} avg · {percent(p.passPercent)} pass
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            ) : (
              <NoteStrip>
                A subject seen in one exam only has a single point, not a trend. Trends appear when a
                subject is examined twice.
              </NoteStrip>
            )}
          </>
        )}
      </Section>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 12 },

  deadline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deadlineText: { fontSize: 11, color: SLATE, flex: 1 },

  paperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  paperWhen: { width: 46 },
  paperDay: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  paperTime: { fontSize: 10, color: MUTED },
  paperTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  paperMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  rescheduledTag: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rescheduledText: { fontSize: 9, fontWeight: '700', color: '#d97706' },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  blockers: { fontSize: 10, color: '#d97706', maxWidth: 130, textAlign: 'right' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: '700' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
  },
  caseWhen: { fontSize: 10, color: MUTED },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  subjectPass: { fontSize: 14, fontWeight: '700' },

  trendBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: 4,
  },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingVertical: 2 },
  trendExam: { fontSize: 10, color: theme.colors.textMuted, flex: 1 },
  trendValue: { fontSize: 10, fontWeight: '600', color: theme.colors.text },
});
