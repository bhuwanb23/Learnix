// F-06 Payroll — one person's payslip (docs/users/06 §3.4).
//
// The old "payslip" was an Alert whose body was a template string: it said the
// slip had been emailed and was available in a portal that does not exist in
// this app. This screen is the actual document.
//
// A payslip has one job above all others: the numbers on it have to add up. The
// earnings lines sum to gross, the deduction lines sum to the deductions, and
// gross minus deductions is exactly the net that was transferred. The server
// guarantees that in paise (ADR-04) and every line is a whole rupee precisely so
// that the printed lines foot — a reader who adds them up and gets a different
// number stops trusting the whole sheet.
//
// It also answers the question a payslip alone cannot: what has this person been
// paid all year, and when was it last paid.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, SkeletonCard, EmptyState } from '../../../../../../components/ui';
import {
  THEME, rupees, formatDate, formatDateTime,
  runStatusMeta, entryStatusMeta, monthLabel, monthShort, lineRupees,
} from '../../payrollMeta';

export default function Payslip({ navigation, route }) {
  const entryId = route?.params?.entryId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    if (!entryId) {
      setError('No payslip selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await accountsApi.payslip(entryId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entryId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handlePay = () => {
    Alert.alert(
      `Pay ${data.entry.staffName}?`,
      `${rupees(data.entry.netRupees)} net for ${monthLabel(data.run.month)}.\n\n`
        + 'This records the transfer against this person only. The run stays open until the last '
        + 'person is paid.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark paid',
          onPress: async () => {
            setBusy(true);
            try {
              await accountsApi.payPayrollEntry(entryId);
              await fetchData();
            } catch (err) {
              Alert.alert('Cannot mark paid', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { entry, run, history, ytd, perDayRupees } = data;
  const runMeta = runStatusMeta(run.status);
  const entryMeta = entryStatusMeta(entry.status);

  // The run has to be APPROVED before anyone on it may be paid — that is a
  // server rule, so the button is simply not offered while it is a draft.
  const canPay = run.status === 'APPROVED' && entry.status !== 'PAID';
  const earningsTotal = entry.earnings.reduce((s, l) => s + lineRupees(l), 0);
  const deductionsTotal = entry.deductions.reduce((s, l) => s + lineRupees(l), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* ── Who ──────────────────────────────────────────── */}
        <AnimatedCard delay={0} style={styles.whoCard}>
          <View style={styles.whoRow}>
            <View style={styles.whoAvatar}>
              <Text style={styles.whoInitial}>
                {entry.staffName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/, '').charAt(0)}
              </Text>
            </View>
            <View style={styles.whoBody}>
              <Text style={styles.whoName} numberOfLines={1}>{entry.staffName}</Text>
              <Text style={styles.whoMeta} numberOfLines={1}>
                {entry.designation ?? 'Staff'}
                {entry.departmentName ? ` · ${entry.departmentName}` : ''}
              </Text>
              {entry.employeeNo ? (
                <Text style={styles.whoMeta}>Employee {entry.employeeNo}</Text>
              ) : null}
            </View>
            <View style={[styles.whoPill, { backgroundColor: entryMeta.bg }]}>
              <Text style={[styles.whoPillText, { color: entryMeta.color }]}>{entryMeta.label}</Text>
            </View>
          </View>

          {/* Only the last four digits are ever stored or shown — a payslip is
              the one document that gets photographed and emailed around. */}
          {entry.bankAccountLast4 ? (
            <View style={styles.bankRow}>
              <Ionicons name="card-outline" size={13} color="#94a3b8" />
              <Text style={styles.bankText}>Credited to account •••• {entry.bankAccountLast4}</Text>
            </View>
          ) : null}
        </AnimatedCard>

        {/* ── The slip ─────────────────────────────────────── */}
        <AnimatedCard delay={40} style={styles.slipCard}>
          <View style={styles.slipHead}>
            <Text style={styles.slipMonth}>{monthLabel(entry.month)}</Text>
            <View style={[styles.slipRunPill, { backgroundColor: runMeta.bg }]}>
              <Text style={[styles.slipRunText, { color: runMeta.color }]}>
                run {runMeta.label.toLowerCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Earnings</Text>
          {entry.earnings.map((l) => (
            <View key={l.label} style={styles.lineRow}>
              <View style={styles.lineIcon}>
                <Ionicons name="add-circle-outline" size={14} color="#059669" />
              </View>
              <Text style={styles.lineLabel}>{l.label}</Text>
              <Text style={styles.lineValue}>{rupees(lineRupees(l))}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Gross</Text>
            <Text style={styles.totalValue}>{rupees(entry.grossRupees)}</Text>
          </View>

          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Deductions</Text>
          {entry.deductions.map((l) => (
            <View key={l.label} style={styles.lineRow}>
              <View style={styles.lineIcon}>
                <Ionicons name="remove-circle-outline" size={14} color="#dc2626" />
              </View>
              <Text style={styles.lineLabel}>{l.label}</Text>
              <Text style={[styles.lineValue, styles.lineValueOut]}>−{rupees(lineRupees(l))}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total deductions</Text>
            <Text style={[styles.totalValue, styles.totalValueOut]}>−{rupees(entry.deductionsRupees)}</Text>
          </View>

          {entry.lopDays > 0 && (
            <View style={styles.lopNote}>
              <Ionicons name="information-circle-outline" size={13} color="#92400e" />
              <Text style={styles.lopText}>
                {entry.lopDays} day{entry.lopDays === 1 ? '' : 's'} of unpaid leave charged at {rupees(perDayRupees)}{' '}
                per day. {entry.note ? entry.note : ''}
              </Text>
            </View>
          )}

          <View style={styles.netCard}>
            <Text style={styles.netLabel}>Net paid</Text>
            <Text style={styles.netValue}>{rupees(entry.netRupees)}</Text>
            {entry.status === 'PAID' ? (
              <Text style={styles.netMeta}>
                {formatDate(entry.paidAt)}{entry.paidBy ? ` · ${entry.paidBy}` : ''}
                {entry.paymentRef ? ` · ${entry.paymentRef}` : ''}
              </Text>
            ) : (
              <Text style={styles.netMetaPending}>
                {run.status === 'DRAFT'
                  ? 'Not yet approved — this is a draft sheet.'
                  : 'Owed, not yet transferred.'}
              </Text>
            )}
          </View>
        </AnimatedCard>

        {canPay && (
          <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.85} disabled={busy}>
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Mark {rupees(entry.netRupees)} paid</Text>
          </TouchableOpacity>
        )}

        {/* ── The year ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>This year so far</Text>
          <Text style={styles.sectionMeta}>{ytd.year}</Text>
        </View>
        <AnimatedCard delay={60} style={styles.block}>
          <View style={styles.ytdRow}>
            <View style={styles.ytdCell}>
              <Text style={styles.ytdValue}>{rupees(ytd.netRupees)}</Text>
              <Text style={styles.ytdLabel}>net across {ytd.months} month{ytd.months === 1 ? '' : 's'}</Text>
            </View>
            <View style={styles.ytdDivider} />
            <View style={styles.ytdCell}>
              <Text style={[styles.ytdValue, styles.ytdPaid]}>{rupees(ytd.paidRupees)}</Text>
              <Text style={styles.ytdLabel}>actually paid</Text>
            </View>
            {ytd.lopDays > 0 && (
              <>
                <View style={styles.ytdDivider} />
                <View style={styles.ytdCell}>
                  <Text style={[styles.ytdValue, styles.ytdLop]}>{ytd.lopDays}d</Text>
                  <Text style={styles.ytdLabel}>loss of pay</Text>
                </View>
              </>
            )}
          </View>
        </AnimatedCard>

        {/* ── History ──────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Every month on record</Text>
          <Text style={styles.sectionMeta}>{history.length} total</Text>
        </View>

        {history.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No other months yet"
            subtitle="This is their first month on the payroll."
          />
        ) : (
          history.map((h, i) => {
            const m = runStatusMeta(h.runStatus);
            const e = entryStatusMeta(h.status);
            return (
              <AnimatedCard
                key={h.id}
                delay={80 + i * 20}
                onPress={h.id === entry.id ? undefined : () => navigation.openModule('Payslip', { entryId: h.id })}
                style={styles.block}
              >
                <View style={styles.histRow}>
                  <View style={[styles.histDot, { backgroundColor: m.color }]} />
                  <View style={styles.histBody}>
                    <Text style={styles.histMonth}>{monthLabel(h.month)}</Text>
                    <Text style={styles.histMeta}>
                      {rupees(h.netRupees)} net
                      {h.lopDays > 0 ? ` · ${h.lopDays}d LOP` : ''}
                      {h.paidAt ? ` · paid ${formatDate(h.paidAt)}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.histPill, { backgroundColor: e.bg }]}>
                    <Text style={[styles.histPillText, { color: e.color }]}>
                      {h.id === entry.id ? 'This slip' : e.label}
                    </Text>
                  </View>
                </View>
              </AnimatedCard>
            );
          })
        )}

        <Text style={styles.footMeta}>
          Run raised by {run.runBy}
          {run.approvedAt ? ` · approved ${formatDateTime(run.approvedAt)}` : ' · not yet approved'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f5f7f9', padding: 24,
  },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: THEME, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  block: { marginBottom: 10 },

  whoCard: { marginBottom: 12 },
  whoRow: { flexDirection: 'row', alignItems: 'center' },
  whoAvatar: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  whoInitial: { fontSize: 18, fontWeight: '800', color: THEME },
  whoBody: { flex: 1, marginLeft: 12 },
  whoName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  whoMeta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  whoPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  whoPillText: { fontSize: 10, fontWeight: '700' },
  bankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f8fafc',
  },
  bankText: { fontSize: 11, color: '#94a3b8' },

  slipCard: { marginBottom: 12 },
  slipHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: 12, marginBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  slipMonth: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  slipRunPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  slipRunText: { fontSize: 10, fontWeight: '700' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 14 },
  sectionSpaced: { marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, marginBottom: 8,
  },

  lineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  lineIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  lineLabel: { flex: 1, fontSize: 13, color: '#475569' },
  lineValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  lineValueOut: { color: '#dc2626' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 11, marginTop: 3,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  totalValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  totalValueOut: { color: '#dc2626' },

  lopNote: {
    flexDirection: 'row', gap: 7, marginTop: 14, padding: 10,
    backgroundColor: '#fffbeb', borderRadius: 10,
  },
  lopText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 16 },

  netCard: {
    backgroundColor: THEME, borderRadius: 14, padding: 18, marginTop: 16, alignItems: 'center',
  },
  netLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  netValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
  netMeta: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  netMetaPending: { fontSize: 11, color: '#fde68a', marginTop: 6 },

  payBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#059669', borderRadius: 12, paddingVertical: 13, marginBottom: 14,
  },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  ytdRow: { flexDirection: 'row', alignItems: 'center' },
  ytdCell: { flex: 1 },
  ytdDivider: { width: 1, height: 30, backgroundColor: '#f1f5f9', marginHorizontal: 10 },
  ytdValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  ytdPaid: { color: '#059669' },
  ytdLop: { color: '#dc2626' },
  ytdLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

  histRow: { flexDirection: 'row', alignItems: 'center' },
  histDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  histBody: { flex: 1 },
  histMonth: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  histMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  histPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  histPillText: { fontSize: 10, fontWeight: '700' },

  footMeta: { fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 16, lineHeight: 15 },
});