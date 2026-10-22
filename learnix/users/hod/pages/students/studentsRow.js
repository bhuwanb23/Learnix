/**
 * HD-05 — The HOD's Students desk: one student's row in the directory.
 * Docs: 11-hod.md §3.4
 *
 * IT IS IN ITS OWN FILE BECAUSE A ROW IS NOT A PANEL
 * ------------------------------------------------
 * The at-risk detection is a panel — a titled card with a blurb and a body. A row is not: it is a
 * list entry, and it is drawn in a list.
 *
 * THE ROW CARRIES THE VERDICT AND THE SIGNALS
 * -------------------------------------------
 * Because a HOD scanning a directory is looking for one thing — "who needs me?" — and the verdict
 * plus the signals that produced it answer that in a single glance.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { ProgressBar, RiskChip, SignalChips } from './studentsUi';
import { THEME, count, percent, plural } from './studentsMeta';

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#fff',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${THEME}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: THEME },
  rowName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  rowChips: { alignItems: 'flex-end', gap: 4 },
  rowBars: { flexDirection: 'row', marginTop: 8 },
  interventionLine: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0891b2',
    marginTop: 6,
  },
  flex: { flex: 1 },
});

export function StudentRow({ student, onPress }) {
  const attendance = student.attendance?.attendancePct ?? null;
  const passRate = student.results?.passRate ?? null;
  const cgpa = student.results?.cgpa ?? null;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(student.name ?? '?').charAt(0)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.rowName} numberOfLines={1}>
            {student.name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {student.rollNo}
            {student.semester ? ` · sem ${student.semester}` : ''}
            {student.section ? ` · ${student.section}` : ''} ·{' '}
            {plural(student.subjectCount ?? 0, 'subject', 'subjects')}
          </Text>
        </View>
        <View style={styles.rowChips}>
          <RiskChip state={student.risk?.state} small />
        </View>
      </View>

      <View style={styles.rowBars}>
        <View style={styles.flex}>
          <ProgressBar
            percent={attendance}
            color={attendance !== null && attendance < 75 ? '#dc2626' : '#059669'}
            label={`Attendance ${percent(attendance)} · pass ${percent(passRate)} · CGPA ${count(cgpa)}`}
          />
        </View>
      </View>

      <SignalChips signals={student.risk?.signals} small />

      {student.openInterventions > 0 ? (
        <Text style={styles.interventionLine}>
          {plural(student.openInterventions, 'intervention', 'interventions')} open
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}
