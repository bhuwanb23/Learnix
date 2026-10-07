/**
 * Rent dues, and the "mark paid" write.
 *
 * The method chips appear INLINE on the due being collected rather than in a modal. With one
 * row in play there is nothing else to decide in a dialog, and a modal between "Mark Paid" and
 * the tap that confirms it is two interruptions where one row would do.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../../../constants/theme';
import { hostelApi } from '../../../../../../../services/api';
import { SectionCard, Divider, Empty, fmtMonth, rupees, PAY_METHODS } from '../residentMeta';

export default function RentSection({ resident, onChanged }) {
  const [openFor, setOpenFor] = useState(null); // the due currently being collected
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);

  const outstanding = resident.outstandingMinor ?? 0;
  const dues = resident.dues ?? [];

  const collect = async (dueId) => {
    setBusy(true);
    try {
      const res = await hostelApi.collectRent(dueId, method);
      setOpenFor(null);
      Alert.alert(
        'Payment received',
        `${res.student}'s ${fmtMonth(res.month)} rent collected.\nPayment ${res.referenceNo} · Receipt ${res.receiptNo}`,
      );
      await onChanged();
    } catch (e) {
      Alert.alert('Cannot collect', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard title="Rent payments">
      <View style={styles.top}>
        <View>
          <Text style={styles.topLabel}>Outstanding dues</Text>
          <Text style={[styles.topValue, { color: outstanding === 0 ? '#059669' : '#dc2626' }]}>
            {rupees(outstanding)}
          </Text>
        </View>
        {outstanding === 0 && (
          <View style={styles.clearChip}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
            <Text style={styles.clearText}>Clear</Text>
          </View>
        )}
      </View>

      {dues.length > 0 && <Divider />}

      {dues.length === 0 && <Empty>No rent dues recorded.</Empty>}

      {dues.map((d, idx) => (
        <View key={d.id}>
          {idx > 0 && <Divider />}
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Hostel rent — {fmtMonth(d.month)}</Text>
              <Text style={styles.rowMeta}>{d.paid ? 'Receipt issued' : 'Unpaid'}</Text>
            </View>
            <Text style={styles.rowAmount}>{rupees(d.amountMinor)}</Text>

            {d.status === 'PAID' ? (
              <View style={styles.paidChip}>
                <Text style={styles.paidText}>PAID</Text>
              </View>
            ) : openFor === d.id ? (
              <View style={styles.methodWrap}>
                <View style={styles.methodRow}>
                  {PAY_METHODS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodChip, method === m && styles.methodChipActive]}
                      onPress={() => setMethod(m)}
                    >
                      <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.confirmRow}>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => collect(d.id)} disabled={busy}>
                    <Text style={styles.confirmText}>{busy ? 'Saving…' : `Confirm ${method}`}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpenFor(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.receiveBtn}
                onPress={() => {
                  setMethod('CASH');
                  setOpenFor(d.id);
                }}
              >
                <Ionicons name="cash-outline" size={13} color="#fff" />
                <Text style={styles.receiveText}>Mark paid</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  topValue: { fontSize: 20, fontFamily: 'Manrope-ExtraBold', marginTop: 2 },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#059669', marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  rowBody: { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  rowMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginRight: 8,
  },
  paidChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  paidText: { fontSize: 10, fontFamily: 'Manrope-Bold', color: '#059669' },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  receiveText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 4,
  },
  methodWrap: { width: '100%', marginTop: 10 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap' },
  methodChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
    marginBottom: 6,
  },
  methodChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  methodText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
  methodTextActive: { color: '#fff' },
  confirmRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  confirmBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  confirmText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff' },
  cancelBtn: { marginLeft: 10, paddingVertical: 7 },
  cancelText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.textMuted },
});