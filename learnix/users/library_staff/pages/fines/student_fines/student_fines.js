import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../../components/ui';
import { THEME, statusMeta, methodLabel, rupees, formatDate, urgency } from '../fineMeta';

export default function StudentFines({ navigation, route }) {
  const studentId = route?.params?.studentId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState([]);
  const [sheet, setSheet] = useState(null); // 'collect' | 'waive' | null
  const [method, setMethod] = useState('CASH');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!studentId) {
      setError('No student selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await libraryApi.studentFines(studentId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const pending = data?.pending || [];
  const stats = data?.stats || {};

  const selectedTotal = useMemo(() => {
    return pending
      .filter((f) => selected.includes(f.id))
      .reduce((s, f) => s + f.amountRupees, 0);
  }, [pending, selected]);

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelected((prev) => (prev.length === pending.length ? [] : pending.map((f) => f.id)));
  };

  const runSettle = async (action) => {
    const ids = selected.length ? selected : pending.map((f) => f.id);
    if (action === 'WAIVE' && reason.trim().length < 3) {
      Alert.alert('Reason Required', 'Enter why these fines are being waived.');
      return;
    }

    const finish = () => {
      setSelected([]);
      setSheet(null);
      setReason('');
      fetchData();
    };

    const confirm = () => {
      setBusy(true);
      libraryApi
        .bulkSettleFines({
          studentId,
          action,
          fineIds: ids,
          ...(action === 'COLLECT' ? { method } : { reason: reason.trim() }),
        })
        .then((result) => {
          const msg =
            action === 'COLLECT'
              ? `${result.settledCount} fine(s) totalling ${rupees(result.totalRupees)} settled.\n\nReceipts:\n${result.receipts.map((r) => r.receiptNo).join('\n')}`
              : `${result.settledCount} fine(s) totalling ${rupees(result.totalRupees)} waived.`;
          Alert.alert(action === 'COLLECT' ? 'Fines Settled' : 'Fines Waived', msg, [
            { text: 'Done', onPress: finish },
          ]);
        })
        .catch((err) => Alert.alert('Cannot Settle', err.message))
        .finally(() => setBusy(false));
    };

    Alert.alert(
      action === 'COLLECT' ? 'Collect All?' : 'Waive All?',
      action === 'COLLECT'
        ? `${ids.length} fine(s) totalling ${rupees(selectedTotal || stats.pendingAmountRupees)} will be settled via ${methodLabel(method)}.`
        : `${ids.length} fine(s) totalling ${rupees(selectedTotal || stats.pendingAmountRupees)} will be written off.\n\nReason: ${reason.trim()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: action === 'COLLECT' ? 'Collect' : 'Waive', onPress: confirm },
      ],
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nothingPending = pending.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Student */}
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{data.student.name.charAt(0)}</Text>
            </View>
            <View style={styles.headerBody}>
              <Text style={styles.headerName}>{data.student.name}</Text>
              <Text style={styles.headerRoll}>{data.student.rollNo}</Text>
            </View>
          </View>

          <View style={styles.totalsRow}>
            <View style={styles.totalCell}>
              <Text style={[styles.totalValue, { color: '#dc2626' }]}>{rupees(stats.pendingAmountRupees)}</Text>
              <Text style={styles.totalLabel}>Outstanding</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalCell}>
              <Text style={[styles.totalValue, { color: '#059669' }]}>{rupees(stats.paidAmountRupees)}</Text>
              <Text style={styles.totalLabel}>Paid</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.totalCell}>
              <Text style={[styles.totalValue, { color: '#d97706' }]}>{rupees(stats.waivedAmountRupees)}</Text>
              <Text style={styles.totalLabel}>Waived</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Pending */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionLabel}>
            {nothingPending ? 'Nothing Outstanding' : `Outstanding (${pending.length})`}
          </Text>
          {!nothingPending && (
            <TouchableOpacity onPress={selectAll} activeOpacity={0.8}>
              <Text style={styles.linkText}>
                {selected.length === pending.length ? 'Clear' : 'Select all'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {nothingPending ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="All clear"
            subtitle={`${data.student.name} has no outstanding library fines.`}
            color="#059669"
          />
        ) : (
          pending.map((f, idx) => {
            const urgent = urgency(f.daysOverdue);
            const isSelected = selected.includes(f.id);
            return (
              <AnimatedCard key={f.id} delay={60 + idx * 40} style={styles.block}>
                <View style={styles.fineRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, isSelected && styles.checkboxOn]}
                    onPress={() => toggle(f.id)}
                    activeOpacity={0.8}
                  >
                    {isSelected ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.fineBody}
                    onPress={() => navigation.openModule('FineDetail', { fineId: f.id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.fineTitle} numberOfLines={2}>{f.bookIssue.book.title}</Text>
                    <View style={styles.chipRow}>
                      <View style={[styles.daysChip, { backgroundColor: urgent.bg }]}>
                        <Text style={[styles.daysText, { color: urgent.color }]}>{f.daysOverdue}d overdue</Text>
                      </View>
                      <Text style={styles.fineDate}>{formatDate(f.createdAt)}</Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={styles.fineAmount}>{rupees(f.amountRupees)}</Text>
                </View>
              </AnimatedCard>
            );
          })
        )}

        {/* Settled history */}
        {data.settled.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Settled History</Text>
            {data.settled.slice(0, 10).map((f) => {
              const meta = statusMeta(f.status);
              return (
                <AnimatedCard key={f.id} delay={120} style={styles.block}>
                  <View style={styles.histRow}>
                    <View style={[styles.histIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={15} color={meta.color} />
                    </View>
                    <View style={styles.histBody}>
                      <Text style={styles.histTitle} numberOfLines={1}>{f.bookIssue.book.title}</Text>
                      <Text style={styles.histSub}>
                        {meta.label}
                        {f.payment ? ` · ${methodLabel(f.payment.method)}` : ''}
                        {f.status === 'WAIVED' && f.waivedReason ? ` · ${f.waivedReason}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.histAmount, { color: meta.color }]}>{rupees(f.amountRupees)}</Text>
                  </View>
                </AnimatedCard>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Bulk action bar */}
      {!nothingPending && (
        <View style={styles.actionBar}>
          <View style={styles.actionBarInfo}>
            <Text style={styles.actionBarCount}>
              {selected.length || pending.length} fine{(selected.length || pending.length) === 1 ? '' : 's'}
            </Text>
            <Text style={styles.actionBarAmount}>
              {rupees(selected.length ? selectedTotal : stats.pendingAmountRupees)}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.barBtn, styles.barWaiveBtn]}
            onPress={() => setSheet(sheet === 'waive' ? null : 'waive')}
            activeOpacity={0.85}
          >
            <Ionicons name="gift-outline" size={16} color="#d97706" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.barBtn, styles.barCollectBtn]}
            onPress={() => setSheet(sheet === 'collect' ? null : 'collect')}
            activeOpacity={0.85}
          >
            <Ionicons name="cash-outline" size={16} color="#fff" />
            <Text style={styles.barCollectText}>Collect</Text>
          </TouchableOpacity>

          {sheet === 'collect' && (
            <View style={styles.sheet}>
              <Text style={styles.sheetLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                {['CASH', 'UPI', 'CARD', 'NET_BANKING'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodChip, method === m && styles.methodChipActive]}
                    onPress={() => setMethod(m)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                      {methodLabel(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.confirmBtn, busy && styles.btnDisabled]}
                onPress={() => runSettle('COLLECT')}
                activeOpacity={0.85}
                disabled={busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="checkmark-circle" size={17} color="#fff" />}
                <Text style={styles.confirmBtnText}>Confirm Collection</Text>
              </TouchableOpacity>
            </View>
          )}

          {sheet === 'waive' && (
            <View style={styles.sheet}>
              <Text style={styles.sheetLabel}>Reason (required, audited)</Text>
              <TextInput
                style={styles.input}
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Library closed during exam week"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                style={[styles.confirmBtn, styles.waiveConfirmBtn, (reason.trim().length < 3 || busy) && styles.btnDisabled]}
                onPress={() => runSettle('WAIVE')}
                activeOpacity={0.85}
                disabled={reason.trim().length < 3 || busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="gift" size={17} color="#fff" />}
                <Text style={styles.confirmBtnText}>
                  {reason.trim().length < 3 ? 'Enter a reason' : 'Confirm Waiver'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 150 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },
  btnDisabled: { opacity: 0.5 },
  headerBody: { flex: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  headerName: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  headerRoll: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  totalsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 14, paddingBottom: 4 },
  totalCell: { flex: 1, alignItems: 'center' },
  totalDivider: { width: 1, backgroundColor: '#eef2f7' },
  totalValue: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  totalLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Lists
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  linkText: { fontSize: 12, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  fineRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxOn: { backgroundColor: THEME, borderColor: THEME },
  fineBody: { flex: 1, paddingRight: 8 },
  fineTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  daysChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  daysText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  fineDate: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  fineAmount: { fontSize: 14, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold' },

  histRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  histIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  histBody: { flex: 1, paddingRight: 8 },
  histTitle: { fontSize: 12, fontWeight: '600', color: '#334155', fontFamily: 'Manrope-SemiBold' },
  histSub: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  histAmount: { fontSize: 13, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },

  // Action bar
  actionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    flexWrap: 'wrap',
  },
  actionBarInfo: { flex: 1 },
  actionBarCount: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  actionBarAmount: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  barBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 },
  barWaiveBtn: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  barCollectBtn: { backgroundColor: '#059669' },
  barCollectText: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },

  sheet: { width: '100%', marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  sheetLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  methodChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  methodChipActive: { backgroundColor: THEME + '12', borderColor: THEME },
  methodText: { fontSize: 11, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  methodTextActive: { color: THEME, fontWeight: '700' },
  input: { backgroundColor: '#f8fafc', borderRadius: 11, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 13, height: 44, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular', marginBottom: 12 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 11, paddingVertical: 13 },
  waiveConfirmBtn: { backgroundColor: '#d97706' },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
});