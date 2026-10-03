import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard, SkeletonStatRow, EmptyState } from '../../../../../components/ui';

const THEME = '#b45309';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const FINE_COLORS = { PENDING: '#dc2626', PAID: '#059669', WAIVED: '#64748b' };

export default function LoanDetail({ navigation, route }) {
  const loanId = route?.params?.loanId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const fetchData = useCallback(async () => {
    if (!loanId) {
      setError('No loan selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await libraryApi.loanDetail(loanId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loanId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleRenew = async () => {
    setBusy('renew');
    try {
      const result = await libraryApi.renewLoan(loanId, 14);
      Alert.alert(
        'Renewed',
        `Extended by 14 days. New due date: ${formatDate(result.dueDate)}.\n${result.renewalsLeft} renewal(s) left.`,
        [{ text: 'Done', onPress: fetchData }],
      );
    } catch (err) {
      Alert.alert('Cannot Renew', err.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmRenew = () => {
    Alert.alert(
      'Renew Loan?',
      `Extend "${data.book.title}" by 14 days?\n\n${data.renewalsLeft} renewal(s) remaining.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Renew', onPress: handleRenew },
      ],
    );
  };

  const handleReturn = async () => {
    setBusy('return');
    try {
      const result = await libraryApi.returnBook(loanId);
      const fineMsg = result.fine
        ? `\n\nFine raised: ₹${result.fine.amountRupees} (${result.fine.daysOverdue}d overdue).`
        : '\n\nReturned on time — no fine.';
      Alert.alert('Returned', `"${result.book}" checked in.${fineMsg}`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(null);
    }
  };

  const confirmReturn = () => {
    const projected = data.projectedFineRupees;
    Alert.alert(
      'Check In Book?',
      projected > 0
        ? `"${data.book.title}" is ${data.daysOverdue} day(s) overdue.\n\nA fine of ₹${projected} will be raised against ${data.student.name}.`
        : `Return "${data.book.title}" to ${data.student.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Return', onPress: handleReturn },
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

  const returned = Boolean(data.returnDate);
  const fineColor = data.fine ? FINE_COLORS[data.fine.status] ?? '#64748b' : '#64748b';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* Book hero */}
        <AnimatedCard delay={0} style={styles.block}>
          <View style={styles.hero}>
            <View style={[styles.heroIcon, data.isOverdue && { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="book" size={26} color={data.isOverdue ? '#dc2626' : THEME} />
            </View>
            <Text style={styles.heroTitle}>{data.book.title}</Text>
            {data.book.author ? <Text style={styles.heroSub}>{data.book.author}</Text> : null}
            <View style={styles.heroChips}>
              {data.book.category ? (
                <View style={styles.heroChip}><Text style={styles.heroChipText}>{data.book.category}</Text></View>
              ) : null}
              {data.book.rackLocation ? (
                <View style={styles.heroChip}><Text style={styles.heroChipText}>Rack {data.book.rackLocation}</Text></View>
              ) : null}
            </View>
          </View>
        </AnimatedCard>

        {/* Borrower */}
        <AnimatedCard delay={60} style={styles.block} onPress={() => navigation.openModule('StudentProfile', { studentId: data.student.id })}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{data.student.name.charAt(0)}</Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{data.student.name}</Text>
              <Text style={styles.rowSub}>{data.student.rollNo}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
          </View>
        </AnimatedCard>

        {/* Loan facts */}
        <AnimatedCard delay={120} style={styles.block}>
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Issued</Text>
              <Text style={styles.factValue}>{formatDate(data.issueDate)}</Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Due</Text>
              <Text style={[styles.factValue, data.isOverdue && { color: '#dc2626' }]}>{formatDate(data.dueDate)}</Text>
            </View>
            <View style={styles.factDivider} />
            <View style={styles.fact}>
              <Text style={styles.factLabel}>Returned</Text>
              <Text style={styles.factValue}>{returned ? formatDate(data.returnDate) : '—'}</Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Status */}
        <AnimatedCard delay={180} style={styles.block}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardLabel}>Status</Text>
            <View style={[
              styles.statusChip,
              { backgroundColor: returned ? '#f0fdf4' : data.isOverdue ? '#fef2f2' : '#fffbeb' },
            ]}>
              <Text style={[
                styles.statusText,
                { color: returned ? '#059669' : data.isOverdue ? '#dc2626' : '#d97706' },
              ]}>
                {returned ? 'RETURNED' : data.isOverdue ? 'OVERDUE' : 'ON LOAN'}
              </Text>
            </View>
          </View>

          {!returned && (
            <View style={styles.healthBox}>
              {data.isOverdue ? (
                <Text style={styles.healthOverdue}>
                  {data.daysOverdue} day(s) overdue — fine accrues at ₹5/day.
                </Text>
              ) : data.daysLeft === 0 ? (
                <Text style={styles.healthSoon}>Due today.</Text>
              ) : (
                <Text style={styles.healthOk}>{data.daysLeft} day(s) remaining on this loan.</Text>
              )}
            </View>
          )}

          <View style={styles.metaLine}>
            <Ionicons name="refresh-circle-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>
              Renewals used: {data.renewCount} of {data.renewalsLeft + data.renewCount}
              {data.lastRenewedAt ? ` · last renewed ${formatDate(data.lastRenewedAt)}` : ''}
            </Text>
          </View>

          {!returned && !data.canRenew && data.renewBlockReason ? (
            <View style={styles.blockerBox}>
              <Ionicons name="information-circle-outline" size={14} color="#d97706" />
              <Text style={styles.blockerText}>{data.renewBlockReason}</Text>
            </View>
          ) : null}
        </AnimatedCard>

        {/* Fine */}
        <AnimatedCard delay={240} style={styles.block}>
          <Text style={styles.cardLabel}>Fine</Text>
          {data.fine ? (
            <View style={styles.fineRow}>
              <View style={[styles.fineIcon, { backgroundColor: fineColor + '14' }]}>
                <Ionicons name="cash-outline" size={18} color={fineColor} />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>₹{data.fine.amountRupees}</Text>
                <Text style={styles.rowSub}>{data.fine.daysOverdue} day(s) overdue</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: fineColor + '14' }]}>
                <Text style={[styles.statusText, { color: fineColor }]}>{data.fine.status}</Text>
              </View>
            </View>
          ) : returned ? (
            <Text style={styles.fineNone}>No fine was raised on this loan.</Text>
          ) : data.projectedFineRupees > 0 ? (
            <View style={styles.projectedBox}>
              <Text style={styles.projectedLabel}>Fine if returned today</Text>
              <Text style={styles.projectedValue}>₹{data.projectedFineRupees}</Text>
              <Text style={styles.projectedHint}>
                Based on {data.daysOverdue} day(s) overdue at ₹5/day. Settle from the Fines tab.
              </Text>
            </View>
          ) : (
            <Text style={styles.fineNone}>No fine. On-time return.</Text>
          )}

          {data.finePayments?.length ? (
            <View style={styles.payments}>
              <Text style={styles.paymentsLabel}>Payments</Text>
              {data.finePayments.map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <Ionicons name="card-outline" size={14} color="#059669" />
                  <Text style={styles.paymentText}>
                    ₹{p.amountRupees} via {p.method} · {formatDate(p.paidAt)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </AnimatedCard>

        {/* Timeline */}
        <AnimatedCard delay={300} style={styles.block}>
          <Text style={styles.cardLabel}>Timeline</Text>
          {data.timeline.map((step, i) => (
            <View key={`${step.label}-${i}`} style={styles.timelineRow}>
              <View style={styles.timelineGutter}>
                <View style={[styles.timelineDot, { backgroundColor: step.color }]}>
                  <Ionicons name={step.icon} size={12} color="#fff" />
                </View>
                {i < data.timeline.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineLabel}>{step.label}</Text>
                <Text style={styles.timelineDate}>{formatDate(step.at)}</Text>
              </View>
            </View>
          ))}
        </AnimatedCard>

        {/* Actions */}
        {!returned && (
          <AnimatedCard delay={360} style={[styles.block, styles.actionCard]}>
            <TouchableOpacity
              style={[styles.secondaryBtn, (!data.canRenew || busy) && styles.btnDisabled]}
              onPress={confirmRenew}
              activeOpacity={0.85}
              disabled={!data.canRenew || Boolean(busy)}
            >
              {busy === 'renew'
                ? <ActivityIndicator size="small" color="#2563eb" />
                : <Ionicons name="refresh" size={16} color="#2563eb" />}
              <Text style={styles.secondaryBtnText}>
                {data.canRenew ? 'Renew 14 Days' : 'Renew Unavailable'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={confirmReturn}
              activeOpacity={0.85}
              disabled={Boolean(busy)}
            >
              {busy === 'return'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="arrow-undo" size={16} color="#fff" />}
              <Text style={styles.primaryBtnText}>Check In Book</Text>
            </TouchableOpacity>
          </AnimatedCard>
        )}

        {returned && (
          <AnimatedCard delay={360} style={styles.block}>
            <View style={styles.closedRow}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.closedText}>This loan is closed. No further actions available.</Text>
            </View>
          </AnimatedCard>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 14 },
  heroIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', textAlign: 'center' },
  heroSub: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 3 },
  heroChips: { flexDirection: 'row', gap: 6, marginTop: 10 },
  heroChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: '#f1f5f9' },
  heroChipText: { fontSize: 10, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Facts
  facts: { flexDirection: 'row', paddingVertical: 14 },
  fact: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  factDivider: { width: 1, backgroundColor: '#eef2f7' },
  factLabel: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium', textTransform: 'uppercase', letterSpacing: 0.5 },
  factValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 4, textAlign: 'center' },

  // Status
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  healthBox: { marginTop: 12, padding: 12, borderRadius: 11, backgroundColor: '#f8fafc' },
  healthOverdue: { fontSize: 12, fontWeight: '600', color: '#dc2626', fontFamily: 'Manrope-SemiBold', lineHeight: 17 },
  healthSoon: { fontSize: 12, fontWeight: '600', color: '#d97706', fontFamily: 'Manrope-SemiBold', lineHeight: 17 },
  healthOk: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 17 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  metaText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', flex: 1 },
  blockerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: '#fffbeb' },
  blockerText: { fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', flex: 1 },

  // Fine
  fineRow: { flexDirection: 'row', alignItems: 'center' },
  fineIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fineNone: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  projectedBox: { padding: 12, borderRadius: 11, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa' },
  projectedLabel: { fontSize: 10, fontWeight: '700', color: '#9a3412', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  projectedValue: { fontSize: 22, fontWeight: '800', color: '#c2410c', fontFamily: 'PlusJakartaSans-Bold', marginTop: 4 },
  projectedHint: { fontSize: 11, color: '#9a3412', fontFamily: 'Manrope-Regular', marginTop: 4, lineHeight: 16 },
  payments: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  paymentsLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  paymentText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', flex: 1 },

  // Timeline
  timelineRow: { flexDirection: 'row' },
  timelineGutter: { width: 26, alignItems: 'center' },
  timelineDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: 16, paddingLeft: 10 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  timelineDate: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Actions
  actionCard: { padding: 14, gap: 10 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14 },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  btnDisabled: { opacity: 0.5 },
  closedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  closedText: { fontSize: 12, color: '#047857', fontFamily: 'Manrope-Medium', flex: 1, lineHeight: 17 },
});