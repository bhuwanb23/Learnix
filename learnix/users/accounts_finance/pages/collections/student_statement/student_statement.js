// Student Statement — the whole account in one place (docs/users/06 §3.2).
//
// The desk keeps getting the same question at the counter and having no honest
// answer: "so what do they still owe?" This screen answers it with four
// derived numbers — billed, paid, outstanding, advance — and then shows the
// bills and the payments behind them, so the number can be checked.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonCard } from '../../../../../components/ui';
import {
  THEME, rupees, compactRupees, formatDate, statusMeta, dueStatusMeta,
  categoryMeta, methodMeta,
} from '../collectionMeta';

export default function StudentStatement({ navigation, route }) {
  const presetId = route?.params?.studentProfileId;
  const presetRollNo = route?.params?.rollNo;

  const [term, setTerm] = useState(presetRollNo || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!presetId || !!presetRollNo);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('DUES');

  const load = useCallback(async (selector) => {
    setLoading(true);
    try {
      setError(null);
      setData(await accountsApi.studentStatement(selector));
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (presetId) load({ studentProfileId: presetId });
    else if (presetRollNo) load({ rollNo: presetRollNo });
  }, [presetId, presetRollNo, load]);

  const onSearch = (q) => {
    setTerm(q);
    if (q.trim().length >= 2) load({ rollNo: q.trim() });
    else setData(null);
  };

  const position = data?.position;
  const dues = data?.dues ?? [];
  const payments = data?.payments ?? [];

  const open = useMemo(
    () => dues.filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL'),
    [dues],
  );
  const settled = useMemo(
    () => dues.filter((d) => d.status === 'CLEARED' || d.status === 'WAIVED'),
    [dues],
  );
  const livePayments = useMemo(
    () => payments.filter((p) => !p.isReversed),
    [payments],
  );
  const reversed = useMemo(
    () => payments.filter((p) => p.isReversed),
    [payments],
  );

  const overdueValue = useMemo(
    () => open.filter((d) => d.daysOverdue > 0).reduce((s, d) => s + d.balanceRupees, 0),
    [open],
  );

  const onOpenPayment = (paymentId) =>
    navigation.openModule('CollectionDetail', { paymentId });

  // ── No student chosen yet ────────────────────────────────
  if (!presetId && !presetRollNo && !data && !loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AnimatedCard delay={0} style={styles.block}>
          <Text style={styles.label}>Find a Student</Text>
          <Text style={styles.hintTop}>
            Enter a roll number to see everything billed, everything paid and what is still outstanding.
          </Text>
          <View style={styles.searchWrap}>
            <SearchBar placeholder="e.g. CSE-23-004" onSearch={onSearch} />
          </View>
          {error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {loading && <Text style={styles.searching}>Looking up…</Text>}
        </AnimatedCard>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color="#dc2626" />
        <Text style={styles.errorTextBig}>{error}</Text>
        <View style={styles.retryWrap}>
          <SearchBar placeholder="Try another roll number" onSearch={onSearch} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <EmptyState
          icon="document-text-outline"
          title="No student selected"
          subtitle="Search by roll number to open a statement."
        />
      </View>
    );
  }

  const clearedOut = position.outstandingRupees === 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Identity + headline position */}
      <AnimatedCard delay={0} style={styles.block}>
        <View style={styles.idRow}>
          <View style={styles.idAvatar}>
            <Text style={styles.idInitial}>{data.student.name.charAt(0)}</Text>
          </View>
          <View style={styles.idBody}>
            <Text style={styles.idName}>{data.student.name}</Text>
            <Text style={styles.idMeta}>{data.student.rollNo} · {data.student.email}</Text>
          </View>
        </View>

        <View style={styles.positionBox}>
          <Text style={styles.positionLabel}>Outstanding</Text>
          <Text style={[styles.positionValue, clearedOut && { color: '#059669' }]}>
            {rupees(position.outstandingRupees)}
          </Text>
          <Text style={styles.positionSub}>
            {clearedOut
              ? open.length > 0
                ? `Part-paid on ${open.length} bill${open.length === 1 ? '' : 's'} — nothing is due yet`
                : 'Nothing outstanding on this account'
              : `${open.length} open bill${open.length === 1 ? '' : 's'}`}
            {overdueValue > 0 ? ` · ${rupees(overdueValue)} overdue` : ''}
          </Text>
        </View>

        <View style={styles.ledgerRow}>
          <View style={styles.ledgerCell}>
            <Text style={styles.ledgerLabel}>Billed</Text>
            <Text style={styles.ledgerValue}>{compactRupees(position.billedRupees)}</Text>
          </View>
          <View style={styles.ledgerSign}>
            <Text style={styles.ledgerSignText}>−</Text>
          </View>
          <View style={styles.ledgerCell}>
            <Text style={styles.ledgerLabel}>Paid</Text>
            <Text style={[styles.ledgerValue, { color: '#059669' }]}>{compactRupees(position.paidRupees)}</Text>
          </View>
          <View style={styles.ledgerSign}>
            <Text style={styles.ledgerSignText}>=</Text>
          </View>
          <View style={styles.ledgerCell}>
            <Text style={styles.ledgerLabel}>Due</Text>
            <Text style={[styles.ledgerValue, { color: position.outstandingRupees > 0 ? '#dc2626' : '#059669' }]}>
              {compactRupees(position.outstandingRupees)}
            </Text>
          </View>
        </View>

        {position.unallocatedRupees > 0 && (
          <View style={styles.advanceRow}>
            <Ionicons name="wallet-outline" size={14} color="#d97706" />
            <Text style={styles.advanceText}>
              {rupees(position.unallocatedRupees)} held as an advance — money already received that is not
              matched to a bill yet.
            </Text>
          </View>
        )}
      </AnimatedCard>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.openModule('CollectPayment', { rollNo: data.student.rollNo })}
          activeOpacity={0.85}
        >
          <Ionicons name="cash-outline" size={16} color={THEME} />
          <Text style={styles.actionText}>Collect</Text>
        </TouchableOpacity>
        {open.length > 0 && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnWarn]}
            onPress={() => navigation.switchTab?.('Dues')}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
            <Text style={[styles.actionText, { color: '#d97706' }]}>Recover</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'DUES', label: `Bills (${dues.length})` },
          { id: 'PAYMENTS', label: `Payments (${livePayments.length})` },
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.tabActive]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'DUES' ? (
        <>
          {dues.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="No bills raised"
              subtitle="Nothing has been billed to this student yet."
            />
          ) : (
            <>
              {open.length > 0 && (
                <Text style={styles.groupLabel}>Outstanding · {open.length}</Text>
              )}
              {open.map((d, i) => <DueRow key={d.id} due={d} index={i} />)}

              {settled.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { marginTop: 18 }]}>Settled · {settled.length}</Text>
                  {settled.map((d, i) => <DueRow key={d.id} due={d} index={i} muted />)}
                </>
              )}
            </>
          )}
        </>
      ) : (
        <>
          {payments.length === 0 ? (
            <EmptyState
              icon="cash-outline"
              title="No payments yet"
              subtitle="Money collected at this desk will be listed here."
            />
          ) : (
            <>
              {livePayments.map((p, i) => (
                <PaymentRow key={p.id} payment={p} index={i} onOpen={onOpenPayment} />
              ))}
              {reversed.length > 0 && (
                <>
                  <Text style={[styles.groupLabel, { marginTop: 18, color: '#dc2626' }]}>
                    Reversed · {reversed.length}
                  </Text>
                  {reversed.map((p, i) => (
                    <PaymentRow key={p.id} payment={p} index={i} onOpen={onOpenPayment} />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function DueRow({ due, index, muted }) {
  const meta = dueStatusMeta(due.status);
  const pct = due.amountRupees > 0
    ? Math.min(100, Math.round(((due.amountRupees - due.balanceRupees) / due.amountRupees) * 100))
    : 0;

  return (
    <AnimatedCard delay={120 + index * 40} style={styles.dueCard}>
      <View style={styles.dueTop}>
        <View style={[styles.dueDot, { backgroundColor: meta.color }]} />
        <View style={styles.dueBody}>
          <Text style={[styles.dueTitle, muted && { color: '#64748b' }]} numberOfLines={1}>{due.title}</Text>
          <Text style={styles.dueMeta} numberOfLines={1}>
            {due.program ? `${due.program} · ` : ''}due {formatDate(due.dueDate)}
            {due.daysOverdue > 0 ? ` · ${due.daysOverdue} days overdue` : ''}
          </Text>
        </View>
        <View style={styles.dueRight}>
          <Text style={[styles.dueAmount, due.balanceRupees > 0 && !muted ? { color: '#dc2626' } : null]}>
            {rupees(due.balanceRupees)}
          </Text>
          <Text style={styles.dueBilled}>of {rupees(due.amountRupees)}</Text>
        </View>
      </View>

      {due.status === 'PARTIAL' && (
        <>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
          </View>
          <Text style={styles.barLabel}>{rupees(due.paidRupees)} paid of {rupees(due.amountRupees)}</Text>
        </>
      )}

      <View style={styles.dueFoot}>
        <View style={[styles.metaPill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.metaPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {due.waivedReason && <Text style={styles.waivedText} numberOfLines={1}>Waived: {due.waivedReason}</Text>}
      </View>
    </AnimatedCard>
  );
}

function PaymentRow({ payment, index, onOpen }) {
  const meta = statusMeta(payment);
  const cat = categoryMeta(payment.category);
  const method = methodMeta(payment.method);

  return (
    <AnimatedCard
      delay={120 + index * 40}
      style={[styles.payCard, payment.isReversed && styles.payCardVoided]}
      onPress={() => onOpen?.(payment.id)}
    >
      <View style={styles.payTop}>
        <View style={[styles.payIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={cat.icon} size={16} color={meta.color} />
        </View>
        <View style={styles.payBody}>
          <Text style={styles.payTitle}>{payment.referenceNo}</Text>
          <Text style={styles.payMeta} numberOfLines={1}>
            {formatDate(payment.paidAt ?? payment.createdAt)} · {cat.label} · {method.label}
            {payment.receiptNo ? ` · ${payment.receiptNo}` : ''}
          </Text>
        </View>
        <Text style={[styles.payAmount, payment.isReversed && styles.payAmountStruck]}>
          {rupees(payment.amountRupees)}
        </Text>
      </View>
      {payment.isReversed ? (
        <Text style={styles.payReversal}>Reversed — {payment.reversalReason}</Text>
      ) : (
        <View style={[styles.metaPill, { backgroundColor: meta.bg, alignSelf: 'flex-start', marginTop: 8 }]}>
          <Text style={[styles.metaPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      )}
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  block: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  hintTop: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', lineHeight: 16, marginBottom: 12 },
  searchWrap: { marginBottom: 4 },
  searching: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium', paddingVertical: 12, textAlign: 'center' },
  retryWrap: { marginTop: 16, width: '100%', maxWidth: 320 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 10, padding: 11, marginTop: 10 },
  errorText: { flex: 1, fontSize: 11, color: '#991b1b', fontFamily: 'Manrope-Medium' },
  errorTextBig: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },

  // Identity
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingBottom: 8 },
  idAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: THEME + '14', justifyContent: 'center', alignItems: 'center' },
  idInitial: { fontSize: 18, fontWeight: '800', color: THEME, fontFamily: 'PlusJakartaSans-Bold' },
  idBody: { flex: 1 },
  idName: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  idMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Position
  positionBox: { alignItems: 'center', paddingVertical: 12 },
  positionLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  positionValue: { fontSize: 30, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -1, marginTop: 3 },
  positionSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 3, textAlign: 'center' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingVertical: 11 },
  ledgerCell: { flex: 1, alignItems: 'center' },
  ledgerSign: { width: 16, alignItems: 'center' },
  ledgerSignText: { fontSize: 13, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold' },
  ledgerLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  ledgerValue: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 2 },
  advanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderRadius: 11, padding: 11, marginTop: 10 },
  advanceText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  // Actions
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: 12, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  actionBtnWarn: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  actionText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },

  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#e2e8f0', padding: 4, marginBottom: 14 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  tabActive: { backgroundColor: THEME + '12' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  tabTextActive: { color: THEME, fontWeight: '700' },
  groupLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },

  // Due row
  dueCard: { marginBottom: 9 },
  dueTop: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 13, paddingBottom: 8 },
  dueDot: { width: 8, height: 8, borderRadius: 4 },
  dueBody: { flex: 1 },
  dueTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  dueMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  dueRight: { alignItems: 'flex-end' },
  dueAmount: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  dueBilled: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  bar: { height: 5, borderRadius: 3, backgroundColor: '#eef2f7', marginHorizontal: 13, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  barLabel: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', marginHorizontal: 13, marginTop: 5 },
  dueFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 10 },
  metaPill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaPillText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  waivedText: { flex: 1, fontSize: 10, color: '#7c3aed', fontFamily: 'Manrope-Regular' },

  // Payment row
  payCard: { marginBottom: 9 },
  payCardVoided: { backgroundColor: '#fffbfb', borderColor: '#fecaca' },
  payTop: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, paddingBottom: 6 },
  payIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  payBody: { flex: 1 },
  payTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  payMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  payAmount: { fontSize: 15, fontWeight: '800', color: '#059669', fontFamily: 'PlusJakartaSans-Bold' },
  payAmountStruck: { color: '#94a3b8', textDecorationLine: 'line-through' },
  payReversal: { fontSize: 10, color: '#dc2626', fontFamily: 'Manrope-Medium', paddingHorizontal: 13, paddingBottom: 12, lineHeight: 15 },
});