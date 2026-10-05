import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { inrExact, inr, mandateStatusMeta, fmtDate, relativeDay } from '../donationsMeta';

/**
 * One standing gift.
 *
 * Overdue is rendered as a first-class warning rather than a tint on the status
 * chip. Because nothing charges a mandate automatically, "overdue" means a person
 * has to act — and the whole design fails quietly if that is not obvious.
 */
export function RecurringCard({ mandate, showDonor = false, busy, onPause, onResume, onCancel }) {
  const st = mandateStatusMeta(mandate.status);
  const due = mandate.nextDueAt;
  const overdue = mandate.isOverdue;

  return (
    <View style={[styles.card, overdue && styles.cardOverdue]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: st.color + '18' }]}>
          <Ionicons name="repeat" size={16} color={st.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.amount}>
            {inrExact(mandate.amountRupees)}
            <Text style={styles.cadence}> {mandate.cadenceLabel.toLowerCase()}</Text>
          </Text>
          <Text style={styles.meta}>
            {mandate.campaign?.name ?? mandate.fundLabel}
            {showDonor && mandate.donor ? ` · ${mandate.donor}` : ''}
          </Text>
        </View>
        <View style={[styles.chip, { backgroundColor: st.color + '14' }]}>
          <Ionicons name={st.icon} size={9} color={st.color} />
          <Text style={[styles.chipText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={styles.facts}>
        <Fact
          icon="calendar-outline"
          label="Next due"
          // A cancelled mandate has no next due date, and saying "overdue" would be
          // a lie; the row explains the end state instead.
          value={due ? `${fmtDate(due)} · ${relativeDay(due)}` : mandate.status === 'CANCELLED' ? 'Ended' : 'Not scheduled'}
          tone={overdue ? '#dc2626' : undefined}
        />
        <Fact icon="checkmark-done-outline" label="Instalments charged" value={String(mandate.instalmentsCharged)} />
        <Fact icon="trending-up-outline" label="A year of giving" value={inr(mandate.annualisedRupees)} />
      </View>

      {overdue ? (
        <View style={styles.overdueBox}>
          <Ionicons name="alert-circle" size={13} color="#b45309" />
          <Text style={styles.overdueText}>
            Overdue by {mandate.daysOverdue} day{mandate.daysOverdue === 1 ? '' : 's'}
            {mandate.lastChargedAt ? ` · last charged ${fmtDate(mandate.lastChargedAt)}` : ' · never charged'}. The office
            has not charged it yet.
          </Text>
        </View>
      ) : null}

      {mandate.status === 'CANCELLED' && mandate.cancelReason ? (
        <View style={styles.cancelBox}>
          <Text style={styles.cancelLabel}>Cancelled {fmtDate(mandate.cancelledAt)}</Text>
          <Text style={styles.cancelText}>“{mandate.cancelReason}”</Text>
        </View>
      ) : null}

      {mandate.note ? <Text style={styles.note}>“{mandate.note}”</Text> : null}

      {(onPause || onResume || onCancel) && mandate.status !== 'CANCELLED' ? (
        <View style={styles.actions}>
          {mandate.status === 'ACTIVE' && onPause ? (
            <Action icon="pause-outline" label="Pause" onPress={onPause} disabled={busy} />
          ) : null}
          {mandate.status === 'PAUSED' && onResume ? (
            <Action icon="play-outline" label="Resume" onPress={onResume} disabled={busy} />
          ) : null}
          {onCancel ? (
            <Action icon="close-circle-outline" label="Cancel" onPress={onCancel} disabled={busy} tone="#dc2626" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Fact({ icon, label, value, tone }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={11} color={tone ?? theme.colors.textMuted} />
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, tone ? { color: tone } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Action({ icon, label, onPress, disabled, tone = '#2563eb' }) {
  return (
    <TouchableOpacity
      style={[styles.action, { borderColor: tone + '55' }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={12} color={tone} />
      <Text style={[styles.actionText, { color: tone }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 9 },
  cardOverdue: { borderColor: '#fbbf24' },
  head: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 14, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  cadence: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  chipText: { fontSize: 9, fontFamily: 'Manrope-Bold' },

  facts: { marginTop: 11, gap: 5 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factLabel: { width: 108, fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  factValue: { flex: 1, fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },

  overdueBox: { flexDirection: 'row', gap: 6, backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 10 },
  overdueText: { flex: 1, fontSize: 9, fontFamily: 'Manrope-Medium', color: '#92400e', lineHeight: 14 },
  cancelBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 10 },
  cancelLabel: { fontSize: 8, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  cancelText: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.text, marginTop: 3, fontStyle: 'italic' },
  note: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 15 },

  actions: { flexDirection: 'row', gap: 7, marginTop: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  actionText: { fontSize: 11, fontFamily: 'Manrope-Bold' },
});
