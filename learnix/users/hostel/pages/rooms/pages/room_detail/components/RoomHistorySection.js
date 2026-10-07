/**
 * Who has stayed in this room, and when they moved in and out.
 *
 * THE DATA WAS ALWAYS THERE
 * -------------------------
 * `transferResident` and `vacateBed` have always written `toDate` and closed the allocation row
 * with `TRANSFERRED`/`VACATED`, so every stay this room has ever had was already on record.
 * There was simply no reader for it.
 *
 * This is the ROOM's turnover, not the resident's. The per-resident timeline answers "how long
 * has this student been here"; this answers "how often does this room turn over" and "who was
 * in bed 2 before the current tenant" — neither of which is answerable from any single
 * resident's history.
 *
 * An open-ended stay reports `null` nights rather than 0, because printing "0 days" for the bed
 * someone is sleeping in tonight would read as a bug.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { SectionCard, Empty, fmtDate, nights, blockColor } from '../roomMeta';

const STATUS_STYLE = {
  ACTIVE: { label: 'Current', color: '#059669', icon: 'home' },
  TRANSFERRED: { label: 'Moved on', color: '#0891b2', icon: 'swap-horizontal' },
  VACATED: { label: 'Checked out', color: '#6b7280', icon: 'exit-outline' },
};

export default function RoomHistorySection({ history, blockName }) {
  const list = history ?? [];
  const color = blockColor(blockName);

  return (
    <SectionCard
      title="Room history"
      subtitle={`${list.length} recorded stay${list.length === 1 ? '' : 's'}`}
    >
      {list.length === 0 && (
        <Empty>Nobody has been allocated to this room yet.</Empty>
      )}

      {list.map((h, idx) => {
        const meta = STATUS_STYLE[h.status] ?? {
          label: h.status,
          color: theme.colors.textMuted,
          icon: 'ellipse-outline',
        };
        return (
          <View key={h.id} style={styles.item}>
            {/* A rail, so consecutive stays read as one continuous history of the room
                rather than as unrelated rows. */}
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon} size={10} color="#fff" />
              </View>
              {idx < list.length - 1 && <View style={styles.line} />}
            </View>

            <View style={styles.body}>
              <View style={styles.head}>
                <Text style={styles.who}>{h.studentName}</Text>
                <Text style={[styles.status, { color: meta.color }]}>{meta.label}</Text>
              </View>
              <Text style={[styles.bed, { color }]}>
                Bed {h.bedNo} · {h.bedLabel}
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
  who: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, flex: 1, marginRight: 8 },
  status: { fontSize: 11, fontFamily: 'Manrope-Bold' },
  bed: { fontSize: 12, fontFamily: 'Manrope-SemiBold', marginTop: 2 },
  span: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
});