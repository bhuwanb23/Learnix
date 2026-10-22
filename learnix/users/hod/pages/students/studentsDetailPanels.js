/**
 * HD-05 — The HOD's Students desk: the detail's performance and placement panels.
 * Docs: 11-hod.md §3.4
 *
 * THEY ARE IN THEIR OWN FILE BECAUSE THE DETAIL SCREEN IS THE LONGEST FILE IN THE DESK
 * ---------------------------------------------------------------------------
 * And because these two panels are a different KIND of answer from the chain around them: the
 * chain says what this student HAS, and these two say what it MEANS — how the marks are moving,
 * and whether the department can put them in front of a recruiter.
 *
 * THE PASS RATE AND THE PASS MARK ARE NOT THE SAME NUMBER
 * -------------------------------------------------------
 * A student at 60% has failed nothing and is doing badly. The platform's pass mark is 40%, and
 * the "poor performance" threshold is a 75% pass RATE. The panel says which of the two it means,
 * because a screen that blurred them would tell a HOD that a student with no backlogs has failed.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import {
  DetailRow,
  NoteStrip,
  ProgressBar,
  Section,
  StatRow,
  StatTile,
  StudentsEmpty,
} from './studentsUi';
import {
  AMBER,
  CYAN,
  GREEN,
  RED,
  SLATE,
  THEME,
  count,
  percent,
  plural,
} from './studentsMeta';

const styles = StyleSheet.create({
  flex: { flex: 1 },

  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  trendLabel: { fontSize: 12, color: theme.colors.textMuted },
  trendValue: { fontSize: 12, fontWeight: '700', color: theme.colors.text },

  subject: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  subjectHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  subjectPercent: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  subjectMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1, marginBottom: 4 },

  weakNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 6,
    marginBottom: 6,
    lineHeight: 15,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  topicTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, flex: 1 },
  topicUnit: { fontSize: 10, color: theme.colors.textMuted, width: 80, textAlign: 'right' },
});

// ── The performance ─────────────────────────────────────────────────────────

export function PerformancePanel({ data }) {
  const results = data?.results;
  const performance = data?.performance;

  return (
    <Section
      title="Performance"
      blurb="How this student is doing, and which way it is moving."
      icon="trophy-outline"
      color={THEME}
    >
      <StatRow>
        <StatTile
          label="CGPA"
          value={count(results?.cgpa)}
          hint="credit-weighted"
          icon="calculator-outline"
          color={THEME}
        />
        <StatTile
          label="Pass rate"
          value={percent(results?.passRate)}
          hint={`${count(results?.results)} results`}
          icon="trending-up-outline"
          color={GREEN}
        />
        <StatTile
          label="Backlogs"
          value={count(results?.backlogs)}
          hint="courses not cleared"
          icon="close-circle-outline"
          color={results?.backlogs > 0 ? RED : SLATE}
          tone={results?.backlogs > 0 ? 'bad' : 'clear'}
        />
      </StatRow>

      {performance?.earlierMean !== null && performance?.earlierMean !== undefined ? (
        <>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Earlier average</Text>
            <Text style={styles.trendValue}>{percent(performance.earlierMean)}</Text>
          </View>
          <View style={styles.trendRow}>
            <Text style={styles.trendLabel}>Recent average</Text>
            <Text style={[styles.trendValue, performance.declining ? { color: RED } : null]}>
              {percent(performance.recentMean)}
            </Text>
          </View>
          <ProgressBar
            percent={performance.recentMean ?? 0}
            color={performance.declining ? RED : GREEN}
            label={
              performance.declining
                ? `Down ${Math.abs(performance.decline ?? 0)}% on their earlier results`
                : 'Holding their earlier results'
            }
          />
        </>
      ) : (
        <NoteStrip>
          A trend needs at least two results. This student has one, so nothing is claimed about
          which way they are moving.
        </NoteStrip>
      )}

      {performance?.poorPerformance ? (
        <NoteStrip tone="warn">
          Their pass rate is below the threshold. They have failed nothing — a 40% pass mark and a
          75% pass rate are different rules, and this is the second one.
        </NoteStrip>
      ) : null}
    </Section>
  );
}

// ── The subjects ───────────────────────────────────────────────────────────

export function SubjectsPanel({ data }) {
  const subjects = data?.subjects ?? [];
  return (
    <Section
      title="Subjects"
      blurb="Each course this student takes, their marks in it, and how far behind the cohort they are."
      icon="layers-outline"
      color="#7c3aed"
    >
      {subjects.length === 0 ? (
        <StudentsEmpty
          icon="layers-outline"
          title="No results"
          message="None of this student's courses has been examined yet."
        />
      ) : (
        subjects.map((s: any) => (
          <View key={s.courseId} style={styles.subject}>
            <View style={styles.subjectHead}>
              <Text style={styles.subjectTitle}>{s.code}</Text>
              <Text
                style={[
                  styles.subjectPercent,
                  s.gap !== null && s.gap > 0 ? { color: RED } : null,
                ]}
              >
                {percent(s.percent)}
              </Text>
            </View>
            <Text style={styles.subjectMeta}>
              {s.name} · {plural(s.results, 'result', 'results')} · cohort{' '}
              {percent(s.cohortPercent)}
            </Text>
            <DetailRow
              label="Gap to the cohort"
              value={s.gap === null ? 'no cohort' : `${s.gap > 0 ? '+' : ''}${s.gap}%`}
              tone={s.gap !== null && s.gap > 0 ? RED : null}
            />
            <DetailRow label="Average marks" value={count(s.averageMarks)} />
            <DetailRow
              label="Cleared"
              value={`${s.passed} of ${s.results}`}
              tone={s.failed > 0 ? RED : null}
            />
          </View>
        ))
      )}
    </Section>
  );
}

// ── The weak topics ────────────────────────────────────────────────────────

export function WeakTopicsPanel({ data }) {
  const weak = data?.weakTopics;
  return (
    <Section
      title="Weak topics"
      blurb="The topics of the course this student trails the cohort in."
      icon="book-outline"
      color="#7c3aed"
    >
      {weak?.course ? (
        <>
          <DetailRow
            label={weak.course.code}
            value={`${weak.course.gap}% behind the cohort`}
            tone={RED}
          />
          <Text style={styles.weakNote}>{weak.note}</Text>
          {(weak.topics ?? []).map((t: any) => (
            <View key={t.id} style={styles.topicRow}>
              <Text style={styles.topicTitle}>{t.title}</Text>
              <Text style={styles.topicUnit} numberOfLines={1}>
                {t.unit}
              </Text>
            </View>
          ))}
        </>
      ) : (
        <StudentsEmpty
          icon="book-outline"
          title="No gap to work on"
          message="This student is not behind the cohort in any course, so there is no weak topic to name."
        />
      )}
    </Section>
  );
}

// ── The placement readiness ────────────────────────────────────────────────

export function PlacementPanel({ data }) {
  const placement = data?.placement;
  return (
    <Section
      title="Placement readiness"
      blurb="Whether this student clears the drives the department is running."
      icon="briefcase-outline"
      color={CYAN}
    >
      <StatRow>
        <StatTile
          label="CGPA"
          value={count(placement?.cgpa)}
          hint={`${count(placement?.backlogs)} backlogs`}
          icon="calculator-outline"
          color={THEME}
        />
        <StatTile
          label="Drives cleared"
          value={count(placement?.eligibleDrives)}
          hint={`of ${count(placement?.drives?.length)}`}
          icon="checkmark-circle-outline"
          color={GREEN}
        />
        <StatTile
          label="Applications"
          value={count(placement?.applications)}
          hint={`${count(placement?.offered)} offered`}
          icon="document-text-outline"
          color={SLATE}
        />
      </StatRow>
      {placement?.blockedReason ? (
        <NoteStrip tone="warn">Blocked: {placement.blockedReason}</NoteStrip>
      ) : null}
      {(placement?.drives ?? []).map((d: any) => (
        <DetailRow
          key={d.driveId}
          label={d.title}
          value={d.eligible ? 'Clears' : (d.reason ?? 'Not eligible')}
          tone={d.eligible ? GREEN : AMBER}
        />
      ))}
    </Section>
  );
}
