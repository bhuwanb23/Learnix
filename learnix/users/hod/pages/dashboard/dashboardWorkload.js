/**
 * HD-01 — The HOD dashboard: the workload and the risk.
 * Docs: 11-hod.md §HD-01
 *
 * TWO SECTIONS, BOTH ABOUT PEOPLE
 * -------------------------------
 * The faculty workload, and the students who need a conversation. They sit together because they
 * are the two views a HOD has of the same department from opposite ends.
 *
 * THE TWO FIGURES ARE NOT THE SAME UNIT, AND THE LABELS SAY SO
 * -----------------------------------------------------------
 * "Assigned" is a WEEKLY figure — it is measured against `maxWorkloadHours`, which is also a
 * weekly figure, so the utilisation percentage is a like-for-like comparison. "Delivered" is a
 * TERM-TO-DATE total. The section shows the absolute numbers beside each other and never divides
 * one into the other, because 28 weekly hours against 270 delivered hours is not "961% delivered" —
 * it is a category error, and a HOD who read it as a percentage would draw the wrong conclusion.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../../constants/theme';
import { MUTED, SLATE, blockMeta, percent, plural } from './dashboardMeta';
import {
  DashboardEmpty,
  DetailRow,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  Tag,
} from './dashboardUi';

// ═══ 5. Faculty workload ══════════════════════════════════════════════════

export function FacultyWorkloadSection({ data, onRoute }) {
  const meta = blockMeta('FACULTY_WORKLOAD');
  const w = data?.workload;
  if (!w) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile
          label="Assigned"
          value={`${w.assignedWeeklyHours ?? 0}h`}
          hint="per week"
          icon="calendar-outline"
        />
        <StatTile
          label="Delivered"
          value={`${w.deliveredHours ?? 0}h`}
          hint={w.deliveryKnown ? 'taught' : 'nothing recorded'}
          icon="checkmark-done-outline"
        />
        <StatTile
          label="Utilisation"
          value={percent(w.utilizationPct)}
          tone={(w.overloaded ?? 0) > 0 ? 'bad' : 'clear'}
          hint={`of ${w.maxWeeklyHours ?? 0}h capacity`}
        />
        <StatTile
          label="Overloaded"
          value={w.overloaded ?? 0}
          tone={(w.overloaded ?? 0) > 0 ? 'bad' : 'clear'}
          icon="warning-outline"
        />
      </StatRow>

      {w.coverageNote ? <NoteStrip>{w.coverageNote}</NoteStrip> : null}
      {w.overloaded > 0 ? (
        <NoteStrip tone="bad">
          {plural(w.overloaded, 'teacher is', 'teachers are')} over their maximum weekly hours:{' '}
          {w.overloadedNames?.join(', ')}.
        </NoteStrip>
      ) : null}

      <DetailRow
        label="Delivery over the recorded period"
        value={
          w.deliveryPct === null || w.deliveryPct === undefined
            ? 'not measurable yet'
            : percent(w.deliveryPct)
        }
      />
      <DetailRow
        label="Attendance recorded for"
        value={`${w.recordedWeeks ?? 0} of ${w.weeksElapsed ?? 0} elapsed weeks`}
      />
      <DetailRow label="Classes held" value={`${w.sessionsFinalized ?? 0}`} />

      {(w.faculty ?? []).length === 0 ? (
        <DashboardEmpty
          icon="people-outline"
          title="No faculty assigned"
          message="The department has no staff on its roll yet."
        />
      ) : (
        (w.faculty ?? []).map((f) => (
          <View key={f.userId} style={styles.facultyRow}>
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {f.designation ?? 'Faculty'} · {f.assignedWeeklyHours ?? 0}h/week of{' '}
                {f.maxWorkloadHours ?? 0}h
                {f.deliveredHours ? ` · ${f.deliveredHours}h taught` : ''}
              </Text>
            </View>
            <Text
              style={[
                styles.pct,
                {
                  color:
                    f.utilizationPct > 100
                      ? '#dc2626'
                      : f.utilizationPct > 85
                        ? '#d97706'
                        : '#059669',
                },
              ]}
            >
              {percent(f.utilizationPct)}
            </Text>
          </View>
        ))
      )}
    </Section>
  );
}

// ═══ 6. Student risk alerts ═══════════════════════════════════════════════

export function StudentRiskSection({ data, onRoute }) {
  const meta = blockMeta('STUDENT_RISK');
  const r = data?.risk;
  if (!r) return null;

  return (
    <Section
      title={meta?.label}
      blurb={meta?.blurb}
      icon={meta?.icon}
      color={meta?.color}
    >
      <StatRow>
        <StatTile
          label="At risk"
          value={r.atRisk ?? 0}
          tone={(r.atRisk ?? 0) > 0 ? 'bad' : 'clear'}
          icon="alert-circle-outline"
        />
        <StatTile
          label="Low attendance"
          value={r.lowAttendance ?? 0}
          tone={(r.lowAttendance ?? 0) > 0 ? 'warn' : 'clear'}
        />
        <StatTile
          label="Poor performance"
          value={r.poorPerformance ?? 0}
          tone={(r.poorPerformance ?? 0) > 0 ? 'warn' : 'clear'}
        />
        <StatTile label="Unmeasured" value={r.unmeasured ?? 0} icon="help-circle-outline" />
      </StatRow>

      {r.unmeasured > 0 ? (
        <NoteStrip>
          {plural(r.unmeasured, 'student has', 'students have')} neither an attendance record nor a
          result yet. An unmarked student is not an absent one — they are unmeasured, and the
          section says so rather than counting them as failures.
        </NoteStrip>
      ) : null}
      {r.atRisk === 0 ? (
        <NoteStrip>
          No student is below the {r.threshold}% threshold on either measure.
        </NoteStrip>
      ) : null}

      {(r.students ?? []).length === 0 ? (
        <DashboardEmpty
          icon="shield-checkmark-outline"
          title="Nobody needs a conversation"
          message="Every measured student is above the threshold on both attendance and results."
        />
      ) : (
        (r.students ?? []).map((s) => (
          <View key={s.studentProfileId} style={styles.studentRow}>
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {s.rollNo}
                {s.semester ? ` · sem ${s.semester}` : ''}
              </Text>
            </View>
            <View style={styles.studentNumbers}>
              <Text style={styles.studentNumber}>
                {s.attendancePct === null ? '—' : percent(s.attendancePct)}
              </Text>
              <Text style={styles.studentNumber}>
                {s.passRate === null ? '—' : percent(s.passRate)}
              </Text>
            </View>
            <Tag
              label={(s.reasons ?? []).map((x) => (x === 'LOW_ATTENDANCE' ? 'attend' : 'marks')).join(' + ')}
              color="#dc2626"
            />
          </View>
        ))
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  name: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  meta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  pct: { fontSize: 14, fontWeight: '700' },

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  studentNumbers: { alignItems: 'flex-end' },
  studentNumber: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
});
