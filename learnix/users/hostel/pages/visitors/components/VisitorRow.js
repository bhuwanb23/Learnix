/**
 * One visitor, as a row.
 *
 * THE TIMELINE, NOT THE FIELDS
 * -----------------------------
 * A visit is a sequence - expected, confirmed, arrived, left - and the useful facts are the GAPS.
 * The row therefore leads with where the visitor is in that sequence and shows the planned window
 * beside the actual stamps, rather than four separate labelled fields that a warden has to
 * reconcile mentally.
 *
 * ALERTS ARE SHOWN ON THE ROW, NOT ONLY ON THE DETAIL
 * ---------------------------------------------------
 * The list is sorted with alerts first, so a row that is at the top is a row that needs a
 * judgement. Hiding the reason until you open the card would make the sort order a mystery.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedCard } from '../../../../../components/ui';
import { theme } from '../../../../../constants/theme';
import { lifecycleMeta, fmtTime, initials, AlertStrip } from '../visitorMeta';

export default function VisitorRow({ visitor, delay, onPress, onApprove, onReject, onEntry, onExit }) {
  const meta = lifecycleMeta(visitor.lifecycle);

  // One flag per state, not per stored status. An APPROVED visitor who should already have
  // arrived reads as "Never arrived", because that is the fact that matters at the desk.
  const decidable = visitor.lifecycle === 'awaiting_approval';
  const canEnter = visitor.lifecycle === 'approved';
  const canExit = visitor.lifecycle === 'in_campus' || visitor.lifecycle === 'visit_overdue';

  return (
    <AnimatedCard delay={delay} style={styles.card} onPress={onPress}>
      <View style={styles.top}>
        <View style={[styles.avatar, visitor.isRestricted && styles.avatarAlert]}>
          <Text style={[styles.avatarText, visitor.isRestricted && { color: '#b91c1c' }]}>
            {initials(visitor.name)}
          </Text>
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {visitor.name}
            </Text>
            <View style={[styles.chip, { backgroundColor: meta.bg }]}>
              <Text style={[styles.chipText, { color: meta.color }]}>{meta.short}</Text>
            </View>
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {visitor.relation} · for {visitor.visiting}
            {visitor.room ? ` (${visitor.room})` : ''}
          </Text>

          {visitor.purpose ? (
            <Text style={styles.purpose} numberOfLines={1}>
              {visitor.purpose}
            </Text>
          ) : null}

          {/* Planned beside actual. The mismatch between them IS the signal. */}
          <View style={styles.windowRow}>
            <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
            <Text style={styles.window}>
              {visitor.expectedInAt
                ? `Expected ${fmtTime(visitor.expectedInAt)}–${fmtTime(visitor.expectedOutAt)}`
                : 'No planned window recorded'}
            </Text>
          </View>

          {visitor.checkInAt ? (
            <View style={styles.windowRow}>
              <Ionicons name="log-in-outline" size={11} color={theme.colors.textMuted} />
              <Text style={styles.window}>
                In {fmtTime(visitor.checkInAt)}
                {visitor.checkOutAt ? ` · Out ${fmtTime(visitor.checkOutAt)}` : ''}
              </Text>
            </View>
          ) : null}

          {visitor.phone ? (
            <Text style={styles.phone} numberOfLines={1}>
              {visitor.phone}
            </Text>
          ) : null}
        </View>
      </View>

      <AlertStrip alerts={visitor.alerts} barredReason={visitor.barredReason} />

      {(decidable || canEnter || canExit) && (
        <View style={styles.actions}>
          {decidable ? (
            <>
              <TouchableOpacity style={[styles.action, styles.rejectBtn]} onPress={() => onReject(visitor)}>
                <Ionicons name="close" size={13} color="#dc2626" />
                <Text style={styles.rejectText}>Refuse</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.action, styles.approveBtn]} onPress={() => onApprove(visitor)}>
                <Ionicons name="checkmark" size={13} color="#fff" />
                <Text style={styles.approveText}>Confirm</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {canEnter ? (
            <TouchableOpacity style={[styles.action, styles.entryBtn]} onPress={() => onEntry(visitor)}>
              <Ionicons name="log-in-outline" size={13} color="#fff" />
              <Text style={styles.entryText}>Record entry</Text>
            </TouchableOpacity>
          ) : null}
          {canExit ? (
            <TouchableOpacity style={[styles.action, styles.exitBtn]} onPress={() => onExit(visitor)}>
              <Ionicons name="log-out-outline" size={13} color="#fff" />
              <Text style={styles.exitText}>Record exit</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, marginBottom: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarAlert: { backgroundColor: '#fee2e2' },
  avatarText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  body: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, flex: 1, marginRight: 6 },
  chip: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  chipText: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  meta: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  purpose: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 3 },
  windowRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  window: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginLeft: 4 },
  phone: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 3 },
  actions: { flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 6,
  },
  approveBtn: { backgroundColor: '#059669' },
  approveText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 4 },
  rejectBtn: { backgroundColor: '#fee2e2' },
  rejectText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 4 },
  entryBtn: { backgroundColor: '#2563eb' },
  entryText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 4 },
  exitBtn: { backgroundColor: '#0f766e' },
  exitText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff', marginLeft: 4 },
});