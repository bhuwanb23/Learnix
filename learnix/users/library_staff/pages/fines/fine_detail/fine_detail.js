import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../../components/ui';
import { THEME, statusMeta, methodLabel, rupees, formatDate, formatDateTime, urgency } from '../fineMeta';

export default function FineDetail({ navigation, route }) {
  const fineId = route?.params?.fineId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!fineId) {
      setError('No fine selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const result = await libraryApi.fineDetail(fineId);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fineId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const collect = () => {
    navigation.openModule('SettleFine', { fineId });
  };

  const extend = () => {
    navigation.openModule('SettleFine', { fineId });
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
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

  const meta = statusMeta(data.status);
  const urgent = urgency(data.daysOverdue);
  const settled = data.status !== 'PENDING';
  const bookReturned = Boolean(data.bookIssue.returnDate);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Hero */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={26} color={meta.color} />
          </View>
          <Text style={[styles.heroAmount, { color: meta.color }]}>{rupees(data.amountRupees)}</Text>
          <View style={[styles.heroChip, { backgroundColor: meta.bg }]}>
            <Text style={[styles.heroChipText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
          </View>
          {data.status === 'PENDING' && (
            <Text style={[styles.heroSub, { color: urgent.color }]}>
              {data.daysOverdue} day(s) overdue · {urgent.label}
            </Text>
          )}
        </View>
      </AnimatedCard>

      {/* Student */}
      <AnimatedCard delay={60} style={styles.block}
        onPress={() => navigation.openModule('StudentProfile', { studentId: data.bookIssue.student.id })}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{data.bookIssue.student.name.charAt(0)}</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{data.bookIssue.student.name}</Text>
            <Text style={styles.rowSub}>{data.bookIssue.student.rollNo}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
        {data.studentTotals.pendingCount > 1 && (
          <View style={styles.studentNote}>
            <Ionicons name="alert-circle-outline" size={14} color="#d97706" />
            <Text style={styles.studentNoteText}>
              {data.studentTotals.pendingCount} pending fine(s) totalling {rupees(data.studentTotals.pendingAmountRupees)}
            </Text>
          </View>
        )}
      </AnimatedCard>

      {/* Book */}
      <AnimatedCard delay={120} style={styles.block}
        onPress={() => navigation.openModule('LoanDetail', { loanId: data.bookIssue.id })}>
        <View style={styles.row}>
          <View style={styles.bookIcon}>
            <Ionicons name="book-outline" size={18} color={THEME} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle} numberOfLines={2}>{data.bookIssue.book.title}</Text>
            <Text style={styles.rowSub}>
              {data.bookIssue.book.author || 'Unknown author'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
      </AnimatedCard>

      {/* Breakdown */}
      <AnimatedCard delay={180} style={styles.block}>
        <Text style={styles.cardLabel}>How This Was Calculated</Text>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Days overdue</Text>
          <Text style={styles.calcValue}>{data.breakdown.daysOverdue}</Text>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Rate per day</Text>
          <Text style={styles.calcValue}>{rupees(data.breakdown.ratePerDayRupees)}</Text>
        </View>
        <View style={styles.calcDivider} />
        <View style={styles.calcRow}>
          <Text style={styles.calcTotalLabel}>Total</Text>
          <Text style={styles.calcTotal}>{rupees(data.breakdown.computedRupees)}</Text>
        </View>
        {data.breakdown.chargedRupees !== data.breakdown.computedRupees && (
          <Text style={styles.adjustedNote}>
            Charged {rupees(data.breakdown.chargedRupees)} — manually adjusted.
          </Text>
        )}
      </AnimatedCard>

      {/* Timeline */}
      <AnimatedCard delay={240} style={styles.block}>
        <Text style={styles.cardLabel}>Record</Text>
        <View style={styles.timelineRow}>
          <View style={styles.timelineGutter}>
            <View style={[styles.timelineDot, { backgroundColor: THEME }]}>
              <Ionicons name="alert-circle" size={11} color="#fff" />
            </View>
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.timelineBody}>
            <Text style={styles.timelineLabel}>Fine raised</Text>
            <Text style={styles.timelineDate}>{formatDateTime(data.createdAt)}</Text>
          </View>
        </View>

        {settled && (
          <View style={styles.timelineRow}>
            <View style={styles.timelineGutter}>
              <View style={[styles.timelineDot, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon} size={11} color="#fff" />
              </View>
              {data.payment ? <View style={styles.timelineLine} /> : null}
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineLabel}>{meta.label}</Text>
              <Text style={styles.timelineDate}>{formatDateTime(data.settledAt)}</Text>
              {data.status === 'PAID' && data.payment ? (
                <View style={styles.paymentBox}>
                  <View style={styles.paymentRow}>
                    <Ionicons name="receipt-outline" size={13} color="#059669" />
                    <Text style={styles.paymentRef}>{data.payment.referenceNo}</Text>
                  </View>
                  <View style={styles.paymentRow}>
                    <Ionicons name="card-outline" size={13} color="#64748b" />
                    <Text style={styles.paymentText}>{methodLabel(data.payment.method)}</Text>
                  </View>
                </View>
              ) : null}
              {data.waivedReason ? (
                <View style={styles.waiverBox}>
                  <Ionicons name="gift-outline" size={13} color="#d97706" />
                  <Text style={styles.waiverText}>{data.waivedReason}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.timelineRow}>
          <View style={styles.timelineGutter}>
            <View style={[styles.timelineDot, { backgroundColor: '#64748b' }]}>
              <Ionicons name="time" size={11} color="#fff" />
            </View>
          </View>
          <View style={styles.timelineBody}>
            <Text style={styles.timelineLabel}>Due date</Text>
            <Text style={styles.timelineDate}>{formatDate(data.bookIssue.dueDate)}</Text>
          </View>
        </View>
      </AnimatedCard>

      {/* Actions */}
      {!settled && (
        <AnimatedCard delay={300} style={[styles.block, styles.actionCard]}>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={collect}
            activeOpacity={0.85}
          >
            <Ionicons name="cash-outline" size={17} color="#fff" />
            <Text style={styles.primaryBtnText}>Settle This Fine</Text>
          </TouchableOpacity>

          {!bookReturned && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={extend}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={16} color="#2563eb" />
              <Text style={styles.secondaryBtnText}>Extend Due Date Instead</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.openModule('StudentFines', { studentId: data.bookIssue.student.id })}
            activeOpacity={0.85}
          >
            <Ionicons name="people-outline" size={16} color="#2563eb" />
            <Text style={styles.secondaryBtnText}>View All Fines For Student</Text>
          </TouchableOpacity>
        </AnimatedCard>
      )}
    </ScrollView>
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
  btnDisabled: { opacity: 0.5 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroAmount: { fontSize: 32, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1 },
  heroChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7, marginTop: 8 },
  heroChipText: { fontSize: 10, fontWeight: '800', fontFamily: 'Manrope-Bold', letterSpacing: 0.5 },
  heroSub: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope-SemiBold', marginTop: 8 },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  rowSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  bookIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 14, marginBottom: 12, padding: 10, borderRadius: 10, backgroundColor: '#fffbeb' },
  studentNoteText: { fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', flex: 1 },

  // Calculation
  cardLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  calcLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' },
  calcValue: { fontSize: 12, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  calcDivider: { height: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  calcTotalLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  calcTotal: { fontSize: 16, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold' },
  adjustedNote: { fontSize: 10, color: '#d97706', fontFamily: 'Manrope-Regular', marginTop: 10 },

  // Timeline
  timelineRow: { flexDirection: 'row' },
  timelineGutter: { width: 26, alignItems: 'center' },
  timelineDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  timelineBody: { flex: 1, paddingBottom: 16, paddingLeft: 10 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  timelineDate: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  paymentBox: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#f0fdf4' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paymentRef: { fontSize: 11, fontWeight: '700', color: '#047857', fontFamily: 'Manrope-Bold' },
  paymentText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  waiverBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#fffbeb' },
  waiverText: { fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', flex: 1, lineHeight: 16 },

  // Actions
  actionCard: { padding: 14, gap: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#059669', borderRadius: 12, paddingVertical: 14 },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: 'Manrope-Bold' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 13, borderWidth: 1, borderColor: '#bfdbfe' },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
});