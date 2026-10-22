/**
 * HD-01 — The HOD dashboard: the action sections.
 * Docs: 11-hod.md §HD-01
 *
 * THE THREE THINGS A HOD DOES ABOUT THE DEPARTMENT: clear the approvals, press the four buttons,
 * and see whether the department is moving.
 *
 * THE HEALTH SCORE IS DRAWN AT THE TOP
 * ------------------------------------
 * It is the one number that answers "is this department healthy", and it is drawn before the
 * sections it summarises, because it is the answer the whole screen exists to lead to.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import {
  MUTED,
  SLATE,
  blockMeta,
  fmtDay,
  healthBandMeta,
  healthColor,
  healthIcon,
  percent,
  plural,
  timeAgo,
} from './dashboardMeta';
import {
  ActionTile,
  DashboardEmpty,
  DetailRow,
  HealthGauge,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  Tag,
} from './dashboardUi';

// ═══ ★. The Department Health Score ═══════════════════════════════════════

export function HealthScoreSection({ data }) {
  const h = data?.health;
  if (!h) return null;

  const band = healthBandMeta(h.band);
  const weakest = (h.breakdown ?? []).find((b) => b.id === h.weakest);

  return (
    <HealthGauge
      score={h.score}
      band={h.band}
      bandColor={band?.color ?? SLATE}
      weakestLabel={weakest ? `${weakest.label} (${percent(weakest.value)})` : null}
      note={h.note}
    />
  );
}

/** The component breakdown, under the gauge. */
export function HealthBreakdownSection({ data }) {
  const h = data?.health;
  if (!h) return null;

  return (
    <Section
      title="What the score is made of"
      blurb="The four measures, and the ones left out."
      icon="pie-chart-outline"
      color={SLATE}
    >
      {(h.breakdown ?? []).map((b) => (
        <View key={b.id} style={styles.componentRow}>
          <View
            style={[
              styles.componentIcon,
              { backgroundColor: `${b.color ?? SLATE}18` },
            ]}
          >
            <Ionicons
              name={b.icon ?? 'ellipse-outline'}
              size={14}
              color={b.color ?? SLATE}
            />
          </View>
          <View style={styles.flex}>
            <Text style={styles.componentLabel}>{b.label}</Text>
            <Text style={styles.componentMeta}>
              {b.included
                ? `${percent(b.value)} · ${Math.round((b.weight ?? 0) * 100)}% of the score`
                : 'no data yet — left out of the score'}
            </Text>
          </View>
          <Text
            style={[
              styles.componentValue,
              { color: b.included ? (b.color ?? SLATE) : MUTED },
            ]}
          >
            {b.included ? percent(b.value) : '—'}
          </Text>
        </View>
      ))}
    </Section>
  );
}

// ═══ 7. Pending approvals ══════════════════════════════════════════════════

export function PendingApprovalsSection({ data, onRoute }) {
  const meta = blockMeta('PENDING_APPROVALS');
  const a = data?.approvals;
  if (!a) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile
          label="Leave requests"
          value={a.leave?.count ?? 0}
          tone={(a.leave?.count ?? 0) > 0 ? 'warn' : 'clear'}
          icon="calendar-outline"
        />
        <StatTile
          label="Course changes"
          value={a.courseChange?.count ?? 0}
          tone={(a.courseChange?.count ?? 0) > 0 ? 'warn' : 'clear'}
          icon="document-text-outline"
        />
        <StatTile
          label="Total waiting"
          value={a.total ?? 0}
          tone={(a.total ?? 0) > 0 ? 'warn' : 'clear'}
          icon="hourglass-outline"
        />
      </StatRow>

      {a.note ? <NoteStrip>{a.note}</NoteStrip> : null}

      {(a.leave?.items ?? []).length > 0 ? (
        <>
          <Text style={styles.subLabel}>Leave requests</Text>
          {a.leave.items.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={styles.itemRow}
              onPress={() => onRoute?.('Leave')}
              activeOpacity={0.75}
            >
              <View style={styles.flex}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {l.teacher}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {l.type} · {fmtDay(l.fromDate)}–{fmtDay(l.toDate)} · {plural(l.days ?? 0, 'day')}
                </Text>
              </View>
              <Tag label="Pending" color="#d97706" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {(a.courseChange?.items ?? []).length > 0 ? (
        <>
          <Text style={styles.subLabel}>Course changes</Text>
          {a.courseChange.items.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.itemRow}
              onPress={() => onRoute?.('Syllabus')}
              activeOpacity={0.75}
            >
              <View style={styles.flex}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {c.courseName}
                </Text>
                <Text style={styles.itemMeta} numberOfLines={1}>
                  {c.courseCode} · v{c.version} · {c.submittedBy} ·{' '}
                  {timeAgo(c.updatedAt)}
                </Text>
              </View>
              <Tag label="To review" color="#7c3aed" />
            </TouchableOpacity>
          ))}
        </>
      ) : null}

      {a.total === 0 ? (
        <DashboardEmpty
          icon="checkmark-done-outline"
          title="Nothing waiting"
          message="No leave request and no syllabus version needs this HOD's decision."
        />
      ) : null}
    </Section>
  );
}

// ═══ 8. Quick actions ═════════════════════════════════════════════════════

export function QuickActionsSection({ data, actions, onRoute }) {
  const meta = blockMeta('QUICK_ACTIONS');
  if (!meta) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <View style={styles.actionGrid}>
        {actions.map((a) => (
          <ActionTile
            key={a.id}
            action={a}
            count={a.count}
            tone={a.tone}
            onPress={() => onRoute?.(a.route, a.isTab)}
          />
        ))}
      </View>
    </Section>
  );
}

// ═══ 9. Performance trends ═════════════════════════════════════════════════

export function PerformanceTrendsSection({ data, onRoute }) {
  const meta = blockMeta('PERFORMANCE_TRENDS');
  const t = data?.trends;
  if (!t) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      {(t.semesters ?? []).length === 0 ? (
        <DashboardEmpty
          icon="trending-up-outline"
          title="Nothing to compare yet"
          message="Results appear here as papers are marked and published."
        />
      ) : (
        <>
          <StatRow>
            {t.semesters.map((s) => (
              <StatTile
                key={`${s.semester}-${s.academicYearId}`}
                label={`Sem ${s.semester}`}
                value={percent(s.passPercent)}
                hint={`${s.academicYear} · avg ${s.averageMarks}`}
              />
            ))}
          </StatRow>
          {t.hasTrends ? (
            <>
              <Text style={styles.subLabel}>Subject trends</Text>
              {t.subjectTrends.map((s) => (
                <View key={s.code} style={styles.trendBox}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {s.subject}
                  </Text>
                  {s.points.map((p) => (
                    <View key={`${p.semester}-${p.academicYear}`} style={styles.trendRow}>
                      <Text style={styles.trendLabel} numberOfLines={1}>
                        Sem {p.semester} · {p.academicYear}
                      </Text>
                      <Text style={styles.trendValue}>
                        {percent(p.passPercent)} pass
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </>
          ) : (
            <NoteStrip>
              A subject seen in one semester has a single point, not a trend. Trends appear when a
              subject is examined more than once.
            </NoteStrip>
          )}
        </>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  componentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  componentLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  componentMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  componentValue: { fontSize: 14, fontWeight: '700' },

  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  itemTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  itemMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

  trendBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: 4,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 2,
  },
  trendLabel: { fontSize: 10, color: theme.colors.textMuted, flex: 1 },
  trendValue: { fontSize: 10, fontWeight: '600', color: theme.colors.text },
});
