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
  PerformancePanel,
  PlacementPanel,
  SubjectsPanel,
  WeakTopicsPanel,
} from './studentsDetailPanels';
import { AMBER, GREEN, RED, THEME, count, percent, plural } from './studentsMeta';

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
      <PerformancePanel data={data} />

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
              <StatTile
                label="Present"
                value={count(attendance?.present)}
                icon="checkmark-outline"
                color={GREEN}
              />
              <StatTile
                label="Late"
                value={count(attendance?.late)}
                icon="time-outline"
                color={AMBER}
              />
              <StatTile
                label="Absent"
                value={count(attendance?.absent)}
                icon="close-outline"
                color={RED}
              />
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

      {/* ── The subjects, the weak topics, the readiness ─────────────────── */}
      <SubjectsPanel data={data} />
      <WeakTopicsPanel data={data} />
      <PlacementPanel data={data} />

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
});
