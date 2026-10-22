/**
 * HD-05 — The HOD's Students desk: the At-Risk Detection panel.
 * Docs: 11-hod.md §3.4
 *
 * THE FIVE SIGNALS, AND THE LIST THEY PRODUCE
 * ---------------------------------------------
 * The panel is the answer to "who needs me this term", and it is a LIST — the students with the
 * most signals firing first, and the lowest attendance breaking the tie. A HOD reads the top of
 * the list; the order is the work.
 *
 * AND THE STUDENTS WITH NO MEASUREMENTS ARE NOT IN THE LIST
 * ----------------------------------------------------------
 * A student with no attendance and no results is UNMEASURED, and a list of "students at risk"
 * that quietly includes everybody who has not been measured is a list nobody can act on. The
 * count of the unmeasured is reported separately, with a line saying what it means.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { NoteStrip, RiskChip, Section, SignalChips, StudentsEmpty } from './studentsUi';
import { RED, count, percent, plural } from './studentsMeta';

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  itemBody: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  itemMeta: { fontSize: 10, color: theme.colors.textMuted, marginTop: 1 },
  itemStat: { fontSize: 12, fontWeight: '800', color: theme.colors.text },
  flex: { flex: 1 },
});

export function AtRiskPanel({ atRisk, totals, onOpen }) {
  const list = atRisk ?? [];
  return (
    <Section
      title="At-risk detection"
      blurb="The five signals, and the students they fire for. Most signals first, then the lowest attendance."
      icon="alert-circle-outline"
      color={RED}
    >
      {list.length === 0 ? (
        <StudentsEmpty
          icon="checkmark-done-outline"
          title="Nobody is at risk"
          message="No student in this department has a serious signal firing."
        />
      ) : (
        list.map((s: any) => (
          <TouchableOpacity
            key={s.studentProfileId}
            style={styles.item}
            onPress={() => onOpen?.(s.studentProfileId)}
            activeOpacity={0.75}
          >
            <View style={styles.itemBody}>
              <Text style={styles.itemName} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.itemMeta}>
                {s.rollNo}
                {s.semester ? ` · sem ${s.semester}` : ''} · attendance{' '}
                {percent(s.attendancePct)}
              </Text>
              <SignalChips signals={s.signals} small />
            </View>
            <Text style={styles.itemStat}>
              {plural(s.signals?.length ?? 0, 'signal', 'signals')}
            </Text>
            <Ionicons name="chevron-forward-outline" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ))
      )}

      {totals?.unmeasured > 0 ? (
        <NoteStrip>
          {plural(totals.unmeasured, 'student is', 'students are')} not measured at all — no
          register, no results. They are not on the list because they are not ON TRACK either; the
          department simply has no picture of them yet.
        </NoteStrip>
      ) : null}
    </Section>
  );
}
