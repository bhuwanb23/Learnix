/**
 * Leave / absence, derived from gate-pass records.
 *
 * NOT A NEW FEATURE
 * -----------------
 * `GatePass` already stores `outAt`, `expectedInAt` and `actualInAt`. The warden inbox showed
 * these in a separate module, so anyone asking "is this student in tonight?" had to leave
 * the resident's page to find out. This is a read of data that already existed.
 *
 * The status is COMPUTED here rather than left to the reader. `isOut` and `isOverdue` are
 * derived on the server from the expected return time, because "approved, gone, and past the
 * time they said they'd be back" is the single fact a warden is scanning for, and deriving it
 * in three separate `if`s across the card would let the three disagree.
 *
 * Roll-call attendance is deliberately NOT here. "Who is in tonight" as a gate-pass question
 * and "who is in tonight" as an attendance question are different records with different
 * consequences, and conflating them would invent roll-call semantics nobody agreed to.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { SectionCard, Empty, fmtDate } from '../residentMeta';

function stateOf(pass) {
  if (pass.isOverdue) return { label: 'Overdue', color: '#dc2626', icon: 'alert-circle' };
  if (pass.isOut) return { label: 'Out', color: '#d97706', icon: 'walk-outline' };
  if (pass.actualInAt) return { label: 'Returned', color: '#059669', icon: 'checkmark-circle' };
  return { label: pass.status, color: theme.colors.textMuted, icon: 'ellipse-outline' };
}

export default function AbsenceSection({ absence }) {
  const list = absence ?? [];

  return (
    <SectionCard title="Leave & absence">
      {list.length === 0 && (
        <Empty>No gate passes recorded. This resident has not signed out.</Empty>
      )}

      {list.map((p) => {
        const s = stateOf(p);
        return (
          <View key={p.id} style={styles.item}>
            <View style={[styles.iconWrap, { backgroundColor: s.color + '1a' }]}>
              <Ionicons name={s.icon} size={15} color={s.color} />
            </View>
            <View style={styles.body}>
              <View style={styles.head}>
                <Text style={styles.reason} numberOfLines={1}>
                  {p.reason}
                </Text>
                <Text style={[styles.state, { color: s.color }]}>{s.label}</Text>
              </View>
              <Text style={styles.span}>
                Out {fmtDate(p.outAt)} · expected back {fmtDate(p.expectedInAt)}
              </Text>
              {p.actualInAt ? (
                <Text style={styles.returned}>Returned {fmtDate(p.actualInAt)}</Text>
              ) : (
                <Text style={[styles.pending, { color: s.color }]}>Not yet marked back</Text>
              )}
            </View>
          </View>
        );
      })}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  body: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reason: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
    flex: 1,
    marginRight: 8,
  },
  state: { fontSize: 11, fontFamily: 'Manrope-Bold' },
  span: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  returned: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#059669',
    marginTop: 2,
  },
  pending: { fontSize: 11, fontFamily: 'Manrope-SemiBold', marginTop: 2 },
});