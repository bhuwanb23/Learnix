/**
 * HD-02 — The HOD's Faculty desk: one teacher's row in the directory.
 * Docs: 11-hod.md §3.2
 *
 * IT IS IN ITS OWN FILE BECAUSE A ROW IS NOT A PANEL
 * ---------------------------------------------
 * The three smart features are panels — a titled card with a blurb and a body. A row is not: it
 * is a list entry, and it is drawn in a list. Keeping it here means the panels file is about
 * panels.
 *
 * THE THREE THINGS A HOD SCANS A DIRECTORY FOR
 * -------------------------------------------
 * The workload bar, the performance badge and the status — so all three are on the row, and
 * none of them is somewhere else.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { BandChip, InsightBadge, ProgressBar, Tag } from './facultyUi';
import { AMBER, THEME, hours, plural, workloadBandMeta } from './facultyMeta';

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
  flex: { flex: 1 },
});

/**
 * ONE TEACHER'S ROW.
 *
 * The workload bar, the insight badge and the status — the three things a HOD scans a directory
 * for.
 */
export function FacultyRow({ faculty, onPress }) {
  const band = workloadBandMeta(faculty.workload?.band);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.rowHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(faculty.name ?? '?').charAt(0)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.rowName} numberOfLines={1}>
            {faculty.name}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {faculty.designation} · {plural(faculty.subjects?.length ?? 0, 'subject', 'subjects')} ·{' '}
            {plural(faculty.classes?.length ?? 0, 'class', 'classes')}
          </Text>
        </View>
        <View style={styles.rowChips}>
          {faculty.status === 'ON_LEAVE' ? (
            <Tag label="On leave" color={AMBER} bg={`${AMBER}18`} />
          ) : null}
          <BandChip band={band} small />
          <InsightBadge insight={faculty.insight} small />
        </View>
      </View>
      <View style={styles.rowBars}>
        <View style={styles.flex}>
          <ProgressBar
            percent={faculty.workload?.utilizationPct ?? 0}
            color={band?.color ?? THEME}
            label={`${hours(faculty.workload?.assignedWeeklyHours)} of ${hours(
              faculty.workload?.maxWorkloadHours,
            )} a week`}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
