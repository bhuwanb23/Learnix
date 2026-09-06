import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../../../constants/theme';
import { hostelApi } from '../../../../../../services/api';

const fmtMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

const METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING'];

export default function ResidentDetail({ studentProfileId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paySheetFor, setPaySheetFor] = useState(null); // due being collected
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await hostelApi.residentDetail(studentProfileId));
    } catch (e) {
      setError(e.message || 'Failed to load resident');
    } finally {
      setLoading(false);
    }
  }, [studentProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCollect = async () => {
    setBusy(true);
    try {
      const res = await hostelApi.collectRent(paySheetFor, method);
      setPaySheetFor(null);
      Alert.alert(
        'Payment Received',
        `${res.student}'s ${fmtMonth(res.month)} rent collected.\nPayment ${res.referenceNo} · Receipt ${res.receiptNo}`,
      );
      await load();
    } catch (e) {
      Alert.alert('Cannot collect', e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVacate = () => {
    Alert.alert('Vacate Room', `Remove ${data.name} from ${data.room}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Vacate',
        style: 'destructive',
        onPress: async () => {
          try {
            await hostelApi.vacateBed(data.bedId);
            Alert.alert('Vacated', `${data.name} has been checked out. Dues remain in the ledger.`);
            onBack();
          } catch (e) {
            Alert.alert('Cannot vacate', e.message);
          }
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Loading resident…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const outstanding = data.outstandingMinor;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{data.name.charAt(0)}</Text>
          </View>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.meta}>Resident since {new Date(data.fromDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</Text>
          <View style={styles.roomBadge}>
            <Ionicons name="bed-outline" size={13} color="#fff" />
            <Text style={styles.roomBadgeText}>
              {data.room} · Bed {data.bedLabel} · {data.block}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDanger]}
            onPress={handleVacate}
          >
            <Ionicons name="log-out-outline" size={16} color="#dc2626" />
            <Text style={[styles.actionText, { color: '#dc2626' }]}>Vacate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resident Details</Text>
          <View style={styles.infoCard}>
            {[
              { label: 'Phone', value: data.phone || '—' },
              { label: 'Room', value: `${data.room} (${data.block})` },
              { label: 'Bed', value: data.bedLabel },
            ].map((row, idx) => (
              <View key={row.label}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{row.label}</Text>
                  <Text style={styles.infoValue}>{row.value}</Text>
                </View>
                {idx < 2 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rent Payments</Text>
          <View style={styles.paymentCard}>
            <View style={styles.paymentTop}>
              <View>
                <Text style={styles.paymentLabel}>Outstanding Dues</Text>
                <Text
                  style={[
                    styles.paymentValue,
                    { color: outstanding === 0 ? '#059669' : '#dc2626' },
                  ]}
                >
                  ₹{Math.round(outstanding / 100).toLocaleString('en-IN')}
                </Text>
              </View>
              {outstanding === 0 && (
                <View style={styles.clearChip}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                  <Text style={styles.clearText}>Clear</Text>
                </View>
              )}
            </View>
            <View style={styles.divider} />
            {data.dues.map((d) => (
              <View key={d.id} style={styles.historyRow}>
                <View style={styles.historyBody}>
                  <Text style={styles.historyItem}>Hostel rent — {fmtMonth(d.month)}</Text>
                  <Text style={styles.historyDate}>{d.paid ? 'Receipt issued' : 'Unpaid'}</Text>
                </View>
                <Text style={styles.historyAmount}>
                  ₹{Math.round(d.amountMinor / 100).toLocaleString('en-IN')}
                </Text>
                {d.status === 'PAID' ? (
                  <View style={styles.paidChip}>
                    <Text style={styles.paidText}>PAID</Text>
                  </View>
                ) : paySheetFor === d.id ? (
                  <View style={styles.methodRow}>
                    {METHODS.map((m) => (
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
                    <TouchableOpacity
                      style={styles.confirmPayBtn}
                      onPress={handleCollect}
                      disabled={busy}
                    >
                      <Text style={styles.confirmPayText}>{busy ? '…' : 'Confirm'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.receiveBtn}
                    onPress={() => {
                      setMethod('CASH');
                      setPaySheetFor(d.id);
                    }}
                  >
                    <Ionicons name="cash-outline" size={14} color="#fff" />
                    <Text style={styles.receiveText}>Mark Paid</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {data.dues.length === 0 && (
              <Text style={styles.muted}>No rent dues recorded.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Complaints</Text>
          {data.complaints.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.muted}>No complaints on file.</Text>
            </View>
          )}
          {data.complaints.map((c) => (
            <View key={c.id} style={styles.complaintCard}>
              <Ionicons
                name={c.status === 'RESOLVED' ? 'checkmark-circle-outline' : 'time-outline'}
                size={16}
                color={c.status === 'RESOLVED' ? '#059669' : '#d97706'}
              />
              <View style={styles.complaintBody}>
                <Text style={styles.complaintTitle} numberOfLines={1}>
                  {c.description}
                </Text>
                <Text style={styles.complaintMeta}>
                  {c.category} · {c.severity} · {c.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  retryBtn: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#fff' },
  content: { paddingBottom: 32 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  roomBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 11,
    marginHorizontal: 4,
  },
  actionText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.primary,
    marginLeft: 5,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  paymentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
  },
  paymentValue: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    marginTop: 2,
  },
  receiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  receiveText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginLeft: 5,
  },
  methodRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' },
  methodChip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 4,
    marginBottom: 4,
  },
  methodChipActive: { backgroundColor: '#dbeafe' },
  methodText: { fontSize: 9, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted },
  methodTextActive: { color: '#2563eb' },
  confirmPayBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 6,
    marginBottom: 4,
  },
  confirmPayText: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#fff' },
  clearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginLeft: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyBody: { flex: 1 },
  historyItem: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  historyDate: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  historyAmount: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginRight: 8,
  },
  paidChip: {
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  paidText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
  },
  complaintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  complaintBody: { flex: 1, marginLeft: 10 },
  complaintTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  complaintMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
  },
});
