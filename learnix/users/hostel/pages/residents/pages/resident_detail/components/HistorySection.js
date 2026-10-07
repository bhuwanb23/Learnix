/**
 * Residential move-in / move-out timeline.
 *
 * This section exists because the DATA was already being written and never read. `vacateBed`
 * and `transferResident` have always set `toDate` and closed the allocation with
 * `TRANSFERRED` or `VACATED`, so every stay this student has ever had is on record — there
 * was simply no reader for it. The old detail screen showed only the current stay, which
 * answered "where are they now" but not "how long have they been here" or "have they moved
 * before".
 *
 * The current stay is listed first and its `nights` is null, because an open-ended stay has
 * no duration yet. Printing "0 nights" for the room someone is sleeping in tonight would read
 * as a bug.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { SectionCard, Empty, fmtDate, nights } from '../residentMeta';

const STATUS_STYLE = {
  ACTIVE: { label: 'Current', color: '#059669', icon: 'home' },
  TRANSFERRED: { label: 'Transferred', color: '#0891b2', icon: 'swap-horizontal' },
  VACATED: { label: 'Vacated', color: '#6b7280', icon: 'exit-outline' },
};

export default function HistorySection({ history }) {
  const list = history ?? [];

  return (
    <SectionCard title="Residence history">
      {list.length === 0 && <Empty>No recorded stays. This resident has no allocation history.</Empty>}

      {list.map((h, idx) => {
        const meta = STATUS_STYLE[h.status] ?? {
          label: h.status,
          color: theme.colors.textMuted,
          icon: 'ellipse-outline',
        };
        return (
          <View key={h.id} style={styles.item}>
            {/* A rail down the left, so consecutive stays read as one continuous tenancy
                rather than as unrelated rows. */}
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon} size={10} color="#fff" />
              </View>
              {idx < list.length - 1 && <View style={styles.line} />}
            </View>

            <View style={styles.body}>
              <View style={styles.head}>
                <Text style={styles.bed}>{h.bedLabel}</Text>
                <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={styles.where}>
                {h.room} · {h.block}
              </Text>
              <Text style={styles.span}>
                {fmtDate(h.fromDate)} → {h.toDate ? fmtDate(h.toDate) : 'present'}
                {h.nights ? ` · ${nights(h.nights)}` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row' },
  rail: { width: 26, alignItems: 'center' },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  line: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginVertical: 3 },
  body: { flex: 1, paddingBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bed: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  status: { fontSize: 11, fontFamily: 'Manrope-Bold' },
  where: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  span: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
});