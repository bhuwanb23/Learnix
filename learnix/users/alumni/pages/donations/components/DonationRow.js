import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import {
  inrExact,
  donationStatusMeta,
  donorInitials,
  donorColor,
  fmtDate,
  lookup,
  METHODS,
} from '../donationsMeta';

/**
 * One row in the donation ledger.
 *
 * `mine` (the donor's own gift) and `canRecord` (the office's confirm button) come
 * from the server. The old screen rendered a Record button on every PLEDGED row
 * for every viewer, so a graduate was offered the office's button and tapping it
 * produced a permission error instead of a receipt.
 */
export function DonationRow({ donation, onPress, onRecord, onShowReceipt, busy = false }) {
  const st = donationStatusMeta(donation.status);
  const method = lookup(METHODS, donation.method, donation.method ?? 'Method not stated');
  const anonymous = donation.donor === 'Anonymous';
  const color = donorColor(donation.donor);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
          <Text style={[styles.initials, { color }]}>{donorInitials(donation.donor)}</Text>
          {anonymous ? (
            <View style={styles.maskBadge}>
              <Ionicons name="eye-off" size={8} color="#fff" />
            </View>
          ) : null}
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {donation.donor}
            </Text>
            {donation.isRecurring ? (
              <View style={styles.recurringChip}>
                <Ionicons name="repeat" size={8} color="#7c3aed" />
                <Text style={styles.recurringText}>standing</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.meta} numberOfLines={1}>
            {donation.batch ? `Batch ${donation.batch} · ` : ''}
            {donation.campaign?.name ?? donation.fundLabel}
          </Text>

          {/* Pledge vs receipt dates are labelled. Showing one undifferentiated
              date made a pledge look like money that had arrived. */}
          <Text style={styles.date}>
            {donation.status === 'RECEIVED'
              ? `Received ${fmtDate(donation.receivedAt)}`
              : `Pledged ${fmtDate(donation.pledgedAt)}`}
            {donation.method ? ` · ${method.label}` : ''}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.amount}>{inrExact(donation.amountRupees)}</Text>
          <View style={[styles.chip, { backgroundColor: st.color + '14' }]}>
            <Ionicons name={st.icon} size={9} color={st.color} />
            <Text style={[styles.chipText, { color: st.color }]}>{st.short}</Text>
          </View>
        </View>
      </View>

      {donation.note ? <Text style={styles.note}>“{donation.note}”</Text> : null}

      <View style={styles.actions}>
        {onRecord && donation.status === 'PLEDGED' ? (
          <TouchableOpacity style={styles.recordBtn} onPress={onRecord} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={12} color="#fff" />
                <Text style={styles.recordText}>Confirm received</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {onShowReceipt && donation.hasReceipt ? (
          <TouchableOpacity style={styles.receiptBtn} onPress={onShowReceipt}>
            <Ionicons name="receipt-outline" size={12} color="#2563eb" />
            <Text style={styles.receiptText}>Receipt</Text>
          </TouchableOpacity>
        ) : null}

        {/* A pledge has no receipt, so the state is explained instead of left as a
            missing button the donor will try to tap. */}
        {donation.status === 'PLEDGED' && !onRecord ? (
          <Text style={styles.awaiting}>{st.hint}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/** A donor avatar + amount, for a campaign's "recent gifts" list. */
export function GiftRow({ gift }) {
  const color = donorColor(gift.donor);
  return (
    <View style={styles.giftRow}>
      <View style={[styles.avatarSm, { backgroundColor: color + '18' }]}>
        <Text style={[styles.initialsSm, { color }]}>{donorInitials(gift.donor)}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 9 }}>
        <Text style={styles.giftName} numberOfLines={1}>
          {gift.donor}
          {gift.isMine ? ' (you)' : ''}
        </Text>
        <Text style={styles.meta}>
          {fmtDate(gift.receivedAt)} · {gift.fundLabel}
        </Text>
      </View>
      <Text style={styles.giftAmount}>{inrExact(gift.amountRupees)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 13, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12, fontFamily: 'Manrope-Bold' },
  initialsSm: { fontSize: 10, fontFamily: 'Manrope-Bold' },
  maskBadge: { position: 'absolute', right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.text, flexShrink: 1 },
  recurringChip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#f5f3ff', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  recurringText: { fontSize: 8, fontFamily: 'Manrope-Bold', color: '#7c3aed' },
  meta: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  date: { fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },

  right: { alignItems: 'flex-end', marginLeft: 8 },
  amount: { fontSize: 12, fontFamily: 'Manrope-ExtraBold', color: theme.colors.text },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  chipText: { fontSize: 9, fontFamily: 'Manrope-Bold' },

  note: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, fontStyle: 'italic', marginTop: 8, lineHeight: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  recordBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#059669', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  recordText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff' },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  receiptText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#2563eb' },
  awaiting: { flex: 1, fontSize: 9, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 14 },

  giftRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  giftName: { fontSize: 11, fontFamily: 'Manrope-Bold', color: theme.colors.text },
  giftAmount: { fontSize: 11, fontFamily: 'Manrope-ExtraBold', color: '#059669', marginLeft: 8 },
});
