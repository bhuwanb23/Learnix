/**
 * HD-05 — The HOD's Students desk: the individual student view.
 * Docs: 11-hod.md §3.4
 *
 * THE CHAIN
 * ---------
 *   Profile → Attendance → Subjects → Marks → Performance → Weak Topics → Interventions
 *
 * ONE CALL, because the chain is a chain: a HOD opens a student and wants their attendance,
 * their marks, their subjects, their gaps and their interventions TOGETHER. Six round trips to
 * assemble one screen is six chances to show a half-drawn student.
 *
 * THE PARAM CHANNEL
 * -----------------
 * The screen is registered in the shell's `FEATURE_MODULES` as `StudentDetail`, and the shell
 * passes `route.params`. The student arrives as `route.params.studentProfileId`.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';
import {
  DetailRow,
  NoteStrip,
  ProgressBar,
  RiskChip,
  Section,
  SignalChips,
  StatRow,
  StatTile,
  StudentsEmpty,
} from './studentsUi';
import { StudentsScreen, useStudents } from './studentsFrame';
import { InterventionHistory, SuggestionPanel } from './studentsInterventions';
import {
  AMBER,
  CYAN,
  GREEN,
  RED,
  SLATE,
  THEME,
  VIOLET,
  count,
  percent,
  plural,
} from './studentsMeta';

export default function StudentDetailScreen({ navigation, route }) {
  const studentProfileId = route?.params?.studentProfileId ?? null;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const detail = useStudents(
    () => (studentProfileId ? hodApi.studentDetail2(studentProfileId) : Promise.resolve(null)),
    [studentProfileId],
  );

  const data = detail.data;
  const student = data?.student ?? null;
  const risk = data?.risk;
  const attendance = data?.attendance;
  const results = data?.results;
  const placement = data?.placement;
  const performance = data?.performance;

  const reload = useCallback(() => detail.reload(), [detail]);

  const recordIntervention = async (suggestion: any) => {
    if (!studentProfileId) return;
    setBusy(true);
    try {
      await hodApi.recordStudentIntervention(studentProfileId, {
        type: suggestion.type,
        title: suggestion.title,
        notes: suggestion.notes,
      });
      setNotice(`Recorded: ${suggestion.title}`);
      reload();
    } catch (e: any) {
      setNotice(e.message || 'That could not be recorded.');
    } finally {
      setBusy(false);
    }
  };

  const advanceIntervention = async (intervention: any) => {
    setBusy(true);
    try {
      await hodApi.updateStudentIntervention(intervention.id, {
        status: intervention.status === 'PROPOSED' ? 'IN_PROGRESS' : 'RESOLVED',
      });
      setNotice(`Updated: ${intervention.title}`);
      reload();
    } catch (e: any) {
      setNotice(e.message || 'That could not be updated.');
    } finally {
      setBusy(false);
    }
  };

  if (!studentProfileId) {
    return (
      <StudentsScreen loading={false} refreshing={false} error={null} onRetry={() => {}} onRefresh={() => {}}>
        <NoteStrip tone="warn">
          No student was named, so there is nothing to show. Open a student from the Students tab.
        </NoteStrip>
      </StudentsScreen>
    );
  }

  return (
    <StudentsScreen
      loading={detail.loading && !data}
      refreshing={detail.refreshing}
      error={detail.error}
      onRetry={detail.reload}
      onRefresh={reload}
    >
      {/* ── The masthead ────────────────────────────────────────────────── */}
      <View style={styles.masthead}>
        <View style={styles.mastheadTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(student?.name ?? '?').charAt(0)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={2}>
              {student?.name ?? '—'}
            </Text>
            <Text style={styles.meta}>
              {student?.rollNo}
              {student?.semester ? ` · sem ${student.semester}` : ''}
              {student?.section ? ` · ${student.section}` : ''}
              {student?.batchName ? ` · ${student.batchName}` : ''}
            </Text>
          </View>
          <RiskChip state={risk?.state} />
        </View>
        {risk?.signals?.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <Text style={styles.signalLabel}>Signals firing</Text>
            <SignalChips signals={risk.signals} />
          </View>
        ) : null}
        {notice ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={14} color={THEME} />
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}
      </View>

      {/* ── The performance ──────────────────────────────────────────────── */}
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
              <Text
                style={[
                  styles.trendValue,
                  performance.declining ? { color: RED } : null,
                ]}
              >
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
            Their pass rate is below the threshold. They have failed nothing — a 40% pass mark and
            a 75% pass rate are different rules, and this is the second one.
          </NoteStrip>
        ) : null}
      </Section>

      {/* ── The attendance ───────────────────────────────────────────────── */}
      <Section
        title="Attendance"
        blurb="The register across this student's classes."
        icon="checkbox-outline"
        color={GREEN}
      >
        {attendance?.records === 0 ? (
          <StudentsEmpty
            icon="checkbox-outline"
            title="No attendance recorded"
            message="No class has been marked for this student, so there is no attendance figure — it is not zero percent."
          />
        ) : (
          <>
            <StatRow>
              <StatTile label="Present" value={count(attendance?.present)} icon="checkmark-outline" color={GREEN} />
              <StatTile label="Late" value={count(attendance?.late)} icon="time-outline" color={AMBER} />
              <StatTile label="Absent" value={count(attendance?.absent)} icon="close-outline" color={RED} />
            </StatRow>
            <ProgressBar
              percent={attendance?.attendancePct ?? 0}
              color={(attendance?.attendancePct ?? 0) < 75 ? RED : GREEN}
              label={`${percent(attendance?.attendancePct)} attended`}
            />
            {attendance?.longestAbsenceStreak > 1 ? (
              <NoteStrip tone="warn">
                {plural(attendance.longestAbsenceStreak, 'absence in a row', 'absences in a row')} — a
                run, not just a low total.
              </NoteStrip>
            ) : null}
          </>
        )}
      </Section>

      {/* ── The subjects ─────────────────────────────────────────────────── */}
      <Section
        title="Subjects"
        blurb="Each course this student takes, their marks in it, and how far behind the cohort they are."
        icon="layers-outline"
        color={VIOLET}
      >
        {(data?.subjects ?? []).length === 0 ? (
          <StudentsEmpty
            icon="layers-outline"
            title="No results"
            message="None of this student's courses has been examined yet."
          />
        ) : (
          data.subjects.map((s: any) => (
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
              <DetailRow
                label="Average marks"
                value={count(s.averageMarks)}
              />
              <DetailRow
                label="Cleared"
                value={`${s.passed} of ${s.results}`}
                tone={s.failed > 0 ? RED : null}
              />
            </View>
          ))
        )}
      </Section>

      {/* ── The weak topics ──────────────────────────────────────────────── */}
      <Section
        title="Weak topics"
        blurb="The topics of the course this student trails the cohort in."
        icon="book-outline"
        color={VIOLET}
      >
        {data?.weakTopics?.course ? (
          <>
            <DetailRow
              label={data.weakTopics.course.code}
              value={`${data.weakTopics.course.gap}% behind the cohort`}
              tone={RED}
            />
            <Text style={styles.weakNote}>{data.weakTopics.note}</Text>
            {(data.weakTopics.topics ?? []).map((t: any) => (
              <View key={t.id} style={styles.topicRow}>
                <Ionicons name="ellipse-outline" size={12} color={SLATE} />
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

      {/* ── The placement readiness ──────────────────────────────────────── */}
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

      {/* ── The suggestions and the history ──────────────────────────────── */}
      <SuggestionPanel suggestions={data?.suggestions} onRecord={recordIntervention} />
      <InterventionHistory interventions={data?.interventions} onAdvance={advanceIntervention} />

      {busy ? <NoteStrip>Working…</NoteStrip> : null}
    </StudentsScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  masthead: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  mastheadTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${THEME}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 17, fontWeight: '800', color: THEME },
  title: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  signalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.sm,
    backgroundColor: `${THEME}0d`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  noticeText: { flex: 1, fontSize: 11, color: THEME, fontWeight: '600', lineHeight: 15 },

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
