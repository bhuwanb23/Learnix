/**
 * HD-02 - The HOD's Faculty desk: the Teaching Progress Monitor.
 * Docs: 11-hod.md 3.2
 *
 * TWO HALVES, BECAUSE 'IS THE TEACHING ON TRACK' IS TWO QUESTIONS
 * -------------------------------------------------------
 * Is the SYLLABUS being finished, and are the CLASSES being delivered.
 *
 * It is in its own file because it is a DIFFERENT KIND OF ANSWER from the balancer's and the
 * matrix's: those two say 'what should I do', and this one says 'what is happening'.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { FacultyEmpty, NoteStrip, ProgressBar, Section, StatRow, StatTile } from './facultyUi';
import { AMBER, MUTED, SLATE, THEME, VIOLET, count, hours, plural } from './facultyMeta';

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  progressName: { width: 78, fontSize: 12, fontWeight: '700', color: theme.colors.text },
  progressCol: { flex: 1 },
  progressLabel: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },
  progressNone: { fontSize: 10, color: MUTED, marginTop: 3 },
});

 *
 * Two halves, because "is the teaching on track" is two questions: is the SYLLABUS being
 * finished, and are the CLASSES being DELIVERED.
 */
export function TeachingProgress({ progress }) {
  if (!progress) return null;
  const rows = progress.rows ?? [];
  const summary = progress.summary ?? {};

  return (
    <Section
      title="Teaching progress"
      blurb="How much of the syllabus is done, and how much of the scheduled teaching was delivered."
      icon="trending-up-outline"
      color={VIOLET}
    >
      <StatRow>
        <StatTile
          label="Syllabus tracked"
          value={count(summary.syllabusTracked)}
          hint="teachers with a syllabus"
          icon="book-outline"
          color={VIOLET}
        />
        <StatTile
          label="Delivery tracked"
          value={count(summary.deliveryTracked)}
          hint="teachers with classes held"
          icon="checkmark-done-outline"
          color={THEME}
        />
        <StatTile
          label="Stalled syllabus"
          value={count(summary.staleSyllabi)}
          hint="not moved in a month"
          icon="time-outline"
          color={summary.staleSyllabi > 0 ? AMBER : SLATE}
          tone={summary.staleSyllabi > 0 ? 'warn' : 'clear'}
        />
      </StatRow>

      {rows.length === 0 ? (
        <FacultyEmpty
          icon="trending-up-outline"
          title="Nothing to track"
          message="No teacher has a syllabus or a recorded class yet."
        />
      ) : (
        rows.map((r: any) => (
          <View key={r.userId} style={styles.progressRow}>
            <Text style={styles.progressName} numberOfLines={1}>
              {r.name}
            </Text>
            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>Syllabus</Text>
              {r.syllabusPercent === null ? (
                <Text style={styles.progressNone}>no syllabus</Text>
              ) : (
                <ProgressBar
                  percent={r.syllabusPercent}
                  color={r.staleSyllabi > 0 ? AMBER : VIOLET}
                  label={`${r.syllabusCompleted}/${r.syllabusTopics} topics`}
                />
              )}
            </View>
            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>Delivery</Text>
              {r.deliveryPct === null ? (
                <Text style={styles.progressNone}>no class held</Text>
              ) : (
                <ProgressBar
                  percent={r.deliveryPct}
                  color={r.deliveryPct < 60 ? AMBER : THEME}
                  label={`${r.deliveryPct}% of ${hours(r.scheduledToDateHours)}`}
                />
              )}
            </View>
          </View>
        ))
      )}
    </Section>
  );
}

// ΓöÇΓöÇ The directory list ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * ONE TEACHER'S ROW.
 *
 * The workload bar, the insight badge and the status ΓÇö the three things a HOD scans a directory