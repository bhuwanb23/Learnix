/**
 * X-11 — The exam cell dashboard: the three action sections, as components.
 * Docs: 05-exam-cell.md §3.1
 *
 * THE THREE THAT DESCRIBE WHAT TO DO ABOUT THE SEASON
 * --------------------------------------------------
 * `dashboardState.js` carries the four that describe the STATE. These three carry the alerts, the
 * quick actions, and the performance — the parts a controller ACTS on.
 *
 * EVERY FIGURE IS WHAT THE SERVER SENT
 * ------------------------------------
 * No section computes anything about the data. The alert kinds come from the catalogue and their
 * counts from the overview; the action list comes from the catalogue and its counts from the
 * overview. A number the client derived is a number the client can get wrong.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import {
  GREEN,
  MUTED,
  RED,
  blockMeta,
  percent,
  plural,
  timeAgo,
} from './dashboardMeta';
import {
  ActionTile,
  AlertRow,
  DashboardEmpty,
  DetailRow,
  NoteStrip,
  Section,
  StatRow,
  StatTile,
} from './dashboardUi';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 12 },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },

  caseRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 5 },
  caseWhen: { fontSize: 10, color: MUTED },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

  paperTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  paperMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 4 },
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

// ═══ 5. Exam alerts ═══════════════════════════════════════════════════════

export function ExamAlertsSection({ data, alerts, onRoute }) {
  const meta = blockMeta('EXAM_ALERTS');
  const al = data?.alerts;
  return (
    <Section title={meta?.label} blurb={meta?.blurb} icon={meta?.icon} color={meta?.color}>
      {alerts.map((a) => (
        <AlertRow key={a.kind} alert={a} onPress={() => onRoute(a.route)} />
      ))}
      {(al?.recentCases ?? []).length > 0 ? (
        <>
          <Text style={styles.subLabel}>Recent cases</Text>
          {(al?.recentCases ?? []).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.caseRow}
              onPress={() => onRoute('CheatingCases')}
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
  );
}

// ═══ 6. Quick actions ═════════════════════════════════════════════════════

export function QuickActionsSection({ actions, onRoute }) {
  const meta = blockMeta('QUICK_ACTIONS');
  return (
    <Section title={meta?.label} blurb={meta?.blurb} icon={meta?.icon} color={meta?.color}>
      <View style={styles.actionGrid}>
        {actions.map((a) => (
          <ActionTile
            key={a.id}
            action={a}
            count={a.count}
            tone={a.tone}
            onPress={() => onRoute(a.route)}
          />
        ))}
      </View>
    </Section>
  );
}

// ═══ 7. Performance snapshot ══════════════════════════════════════════════

export function PerformanceSnapshotSection({ data, onRoute }) {
  const meta = blockMeta('PERFORMANCE_SNAPSHOT');
  const pf = data?.performance;
  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
      right={
        <TouchableOpacity onPress={() => onRoute('ResultsAnalytics')} hitSlop={8}>
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
              hint={
                pf?.averagePercent !== null && pf?.averagePercent !== undefined
                  ? `${pf.averagePercent}%`
                  : undefined
              }
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
  );
}
