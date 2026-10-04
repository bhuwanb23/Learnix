// Payment Plans — what we have agreed to collect, and on what schedule
// (docs/users/06 §3.3).
//
// A plan is not a discount or a deferral: it REPLACES one bill with N real
// bills. The parent becomes SUPERSEDED and stops being collectable, and the
// instalments become ordinary dues that age, get chased and get fined like any
// other. That is deliberate — a plan the desk does not track is just a promise
// written on a slip of paper — and this screen is where that promise is tracked.
//
// Two things this screen must never do: agree a plan on a bill that already has
// money against it (the family would be chased for money they already paid), or
// cancel a plan after a payment has landed (the parent would come back to life
// owing the full original amount). Both are refused by the server; here they are
// prevented from being offered, and explained when they are not possible.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../../../components/ui';
import {
  THEME, rupees, formatDate, formatDateTime, dueStatusMeta, overduePhrase,
  PLAN_FREQUENCIES, previewSchedule,
} from '../duesMeta';

const STATUS_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'ACTIVE', label: 'Running' },
  { id: 'COMPLETED', label: 'Finished' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function PaymentPlans({ navigation, route }) {
  // Opened from a bill with "agree a plan on this": the caller hands over the
  // whole due, not just its id, because the agreement form has to show the
  // balance it is about to split. A bare id would mean a second fetch just to
  // render a form the officer is looking at.
  const prefill = route?.params?.due ?? null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('ALL');

  // Agreement form state
  const [form, setForm] = useState(
    prefill
      ? {
        dueId: prefill.id,
        balanceRupees: prefill.balanceRupees,
        dueTitle: prefill.title,
        studentName: prefill.student ?? 'this student',
      }
      : null,
  );
  const [count, setCount] = useState(3);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Cancellation state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Opened with a planId (from the hub or a bill): start expanded so the officer
  // lands on the schedule rather than having to tap into it.
  const [expanded, setExpanded] = useState(route?.params?.planId ?? null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.duePlans(status === 'ALL' ? {} : { status }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const closeForm = () => { setForm(null); setNote(''); };
  const closeCancel = () => { setCancelTarget(null); setCancelReason(''); };

  const agreePlan = async () => {
    // The server enforces 2–12; catching it here turns a 400 into a sentence.
    if (count < 2 || count > 12) {
      Alert.alert('Pick a valid split', 'A plan runs from 2 to 12 instalments.');
      return;
    }
    setBusy(true);
    try {
      const created = await accountsApi.createDuePlan(form.dueId, {
        count,
        frequency,
        ...(startDate ? { startDate } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      closeForm();
      await fetchData();
      setExpanded(created?.plan?.id ?? created?.id ?? null);
      Alert.alert(
        'Plan agreed',
        `The bill was replaced with ${count} ${frequency.toLowerCase()} instalments. ` +
        'The original is no longer collectable, and each instalment will be chased on its own date.',
      );
    } catch (err) {
      Alert.alert('Cannot Agree This Plan', err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () => {
    if (cancelReason.trim().length < 3) {
      Alert.alert('Reason Required', 'Say why the plan is being cancelled (at least 3 characters).');
      return;
    }
    setBusy(true);
    accountsApi.cancelDuePlan(cancelTarget.id, cancelReason.trim())
      .then(async () => {
        closeCancel();
        await fetchData();
        Alert.alert(
          'Plan cancelled',
          'The original bill is payable again and is back on the recovery list.',
        );
      })
      .catch((err) => Alert.alert('Cannot Cancel', err.message))
      .finally(() => setBusy(false));
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
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { plans, stats } = data;
  const schedule = form ? previewSchedule(form.balanceRupees, count, frequency, startDate) : [];
  const sumCheck = schedule.reduce((s, p) => s + p.amountRupees, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        <AnimatedCard delay={0} style={styles.card}>
          <Text style={styles.heroLabel}>Agreed plans</Text>
          <Text style={styles.heroValue}>{stats.activeCount}</Text>
          <Text style={styles.heroSub}>
            running · {stats.completedCount} finished · {stats.cancelledCount} cancelled
          </Text>
          {stats.overdueRupees > 0 && (
            <View style={styles.lateNote}>
              <Ionicons name="alert-circle-outline" size={13} color="#d97706" />
              <Text style={styles.lateNoteText}>
                Roughly {rupees(stats.overdueRupees)} of instalments are already past their date.
                These are overdue inside an agreed plan — chase them, but the family is cooperating.
              </Text>
            </View>
          )}
        </AnimatedCard>

        <View style={styles.tabRow}>
          {STATUS_TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, status === t.id && styles.tabActive]}
              onPress={() => setStatus(t.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, status === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {plans.length === 0 ? (
          <>
            <EmptyState
              icon="git-branch-outline"
              title={status === 'ALL' ? 'No plans agreed yet' : `No ${STATUS_TABS.find((t) => t.id === status).label.toLowerCase()} plans`}
              subtitle="Open a bill with a balance and use “Agree a payment plan” to split it into instalments."
            />
            {/* EmptyState's action button is not touchable, so a real control is
                rendered out here. */}
            <TouchableOpacity
              style={styles.clearBtn}
              activeOpacity={0.85}
              onPress={() => (status === 'ALL' ? null : setStatus('ALL'))}
            >
              <Ionicons name={status === 'ALL' ? 'receipt-outline' : 'refresh'} size={15} color={THEME} />
              <Text style={styles.clearBtnText}>
                {status === 'ALL' ? 'Open a bill to start a plan' : 'Show all plans'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          plans.map((p, i) => (
            <PlanCard
              key={p.id}
              plan={p}
              index={i}
              expanded={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onCancel={() => { setCancelTarget(p); setCancelReason(''); }}
              navigation={navigation}
            />
          ))
        )}
      </ScrollView>

      {/* ── Agreement sheet ── */}
      {form && (
        <KeyboardAvoidingView style={styles.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closeForm} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Agree a payment plan</Text>
            <Text style={styles.sheetHint}>
              {form.dueTitle} · {form.studentName} · {rupees(form.balanceRupees)} outstanding.
              The bill is replaced by {count} instalments totalling exactly this amount.
            </Text>

            <Text style={styles.fieldLabel}>How many instalments?</Text>
            <View style={styles.countRow}>
              {[2, 3, 4, 6, 12].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.countBtn, count === n && styles.countBtnActive]}
                  onPress={() => setCount(n)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.countText, count === n && styles.countTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldHint}>Between 2 and 12. Past 12 it stops being a schedule.</Text>

            <Text style={styles.fieldLabel}>How often?</Text>
            <View style={styles.countRow}>
              {PLAN_FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.countBtn, styles.countBtnWide, frequency === f.id && styles.countBtnActive]}
                  onPress={() => setFrequency(f.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.countText, frequency === f.id && styles.countTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>First instalment on (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD — blank means today"
              placeholderTextColor="#94a3b8"
              value={startDate}
              onChangeText={setStartDate}
              editable={!busy}
              autoCapitalize="none"
            />

            {/* The schedule is shown BEFORE it is agreed, and the sum is checked
                against the balance on screen. Agreeing a plan whose parts do not
                add up to the balance is the one mistake that is hard to unpick
                later. */}
            <Text style={styles.fieldLabel}>The schedule you are agreeing</Text>
            <View style={styles.scheduleBox}>
              {schedule.map((s) => (
                <View key={s.sequence} style={styles.scheduleRow}>
                  <Text style={styles.scheduleSeq}>#{s.sequence}</Text>
                  <Text style={styles.scheduleDate}>{formatDate(s.dueDate)}</Text>
                  <Text style={styles.scheduleAmount}>{rupees(s.amountRupees)}</Text>
                </View>
              ))}
              <View style={[styles.scheduleRow, styles.scheduleTotal]}>
                <Text style={styles.scheduleTotalLabel}>Total</Text>
                <Text style={[
                  styles.scheduleTotalAmount,
                  Math.abs(sumCheck - form.balanceRupees) > 0.005 && styles.scheduleMismatch,
                ]}>
                  {rupees(sumCheck)}
                </Text>
              </View>
              {Math.abs(sumCheck - form.balanceRupees) > 0.005 && (
                <Text style={styles.mismatchNote}>
                  This does not match the {rupees(form.balanceRupees)} balance — do not agree it.
                </Text>
              )}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Note for the record (optional) — e.g. approved by the HOD"
              placeholderTextColor="#94a3b8"
              value={note}
              onChangeText={setNote}
              editable={!busy}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancel} onPress={closeForm} activeOpacity={0.85} disabled={busy}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirm, Math.abs(sumCheck - form.balanceRupees) > 0.005 && styles.sheetConfirmDisabled]}
                onPress={agreePlan}
                activeOpacity={0.85}
                disabled={busy || Math.abs(sumCheck - form.balanceRupees) > 0.005}
              >
                <Text style={styles.sheetConfirmText}>{busy ? 'Working…' : 'Agree plan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── Cancellation sheet ── */}
      {cancelTarget && (
        <KeyboardAvoidingView style={styles.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={closeCancel} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Cancel this plan?</Text>
            <Text style={styles.sheetHint}>
              {cancelTarget.count} instalments totalling {rupees(cancelTarget.totalRupees)} are removed
              and the original bill of {rupees(cancelTarget.totalRupees)} becomes payable again in one go.
              {'\n\n'}
              {cancelTarget.paidRupees > 0
                ? `${rupees(cancelTarget.paidRupees)} has already been paid against this plan. Cancelling is only possible because no instalment has been paid — if any has, restore the bill instead so the money is not lost.`
                : 'Nothing has been paid yet, so cancelling loses no money.'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Why is the plan being cancelled?"
              placeholderTextColor="#94a3b8"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
              editable={!busy}
            />
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancel} onPress={closeCancel} activeOpacity={0.85} disabled={busy}>
                <Text style={styles.sheetCancelText}>Keep plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirm, styles.sheetConfirmDanger]}
                onPress={confirmCancel}
                activeOpacity={0.85}
                disabled={busy}
              >
                <Text style={styles.sheetConfirmText}>{busy ? 'Working…' : 'Cancel plan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function PlanCard({ plan: p, index, expanded, onToggle, onCancel, navigation }) {
  const done = p.complete;
  const cancelled = p.status === 'CANCELLED';
  const tone = cancelled ? '#64748b' : done ? '#059669' : p.overdueCount > 0 ? '#d97706' : THEME;

  return (
    <AnimatedCard delay={80 + index * 30} style={styles.plan}>
      <TouchableOpacity style={styles.planTop} onPress={onToggle} activeOpacity={0.85}>
        <View style={[styles.planIcon, { backgroundColor: tone + '14' }]}>
          <Ionicons
            name={cancelled ? 'close-circle-outline' : done ? 'checkmark-done-outline' : 'git-branch-outline'}
            size={18}
            color={tone}
          />
        </View>
        <View style={styles.planHead}>
          <Text style={styles.planTitle} numberOfLines={1}>
            {p.count} × {p.frequencyLabel.toLowerCase()}
          </Text>
          <Text style={styles.planMeta}>
            started {formatDate(p.startDate)} · {rupees(p.totalRupees)} total
          </Text>
        </View>
        <View style={styles.planRight}>
          <Text style={[styles.planPaid, { color: tone }]}>{p.progressPercent}%</Text>
          <Text style={styles.planPaidMeta}>{p.settledCount}/{p.count} paid</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color="#cbd5e1" />
      </TouchableOpacity>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(100, p.progressPercent)}%`, backgroundColor: tone }]} />
      </View>

      <View style={styles.planStats}>
        <MiniStat label="Agreed" value={rupees(p.totalRupees)} />
        <MiniStat label="Paid" value={rupees(p.paidRupees)} color="#059669" />
        <MiniStat label="Left" value={rupees(p.balanceRupees)} color="#dc2626" />
        <MiniStat label={p.overdueCount > 0 ? 'Overdue' : 'Next'} value={p.overdueCount > 0 ? `${p.overdueCount} late` : formatDate(p.nextDueDate)} color={p.overdueCount > 0 ? '#d97706' : '#64748b'} />
      </View>

      {p.note && (
        <Text style={styles.planNote}>“{p.note}”</Text>
      )}

      {cancelled && (
        <View style={styles.cancelNote}>
          <Ionicons name="information-circle-outline" size={13} color="#64748b" />
          <Text style={styles.cancelNoteText}>
            Cancelled {formatDateTime(p.cancelledAt)}{p.cancelReason ? ` — “${p.cancelReason}”` : ''}.
            The original bill is collectable again.
          </Text>
        </View>
      )}

      {expanded && p.installments && (
        <View style={styles.instalments}>
          {p.installments.map((inst) => {
            const m = dueStatusMeta(inst.status);
            return (
              <TouchableOpacity
                key={inst.id}
                style={styles.instRow}
                activeOpacity={0.8}
                onPress={() => navigation.openModule('DueDetail', { dueId: inst.id })}
              >
                <View style={[styles.instDot, { backgroundColor: m.color }]} />
                <View style={styles.instBody}>
                  <Text style={styles.instTitle}>
                    #{inst.sequence} · {formatDate(inst.dueDate)}
                  </Text>
                  <Text style={styles.instMeta}>
                    {inst.status === 'CLEARED'
                      ? 'paid in full'
                      : inst.daysOverdue > 0
                        ? overduePhrase(inst.daysOverdue)
                        : 'not yet due'}
                    {inst.lateFeeRupees > 0 ? ` · ${rupees(inst.lateFeeRupees)} fine` : ''}
                  </Text>
                </View>
                <Text style={[styles.instAmount, { color: inst.status === 'CLEARED' ? '#059669' : '#dc2626' }]}>
                  {rupees(inst.balanceRupees)}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {expanded && p.status === 'ACTIVE' && (
        <View style={styles.planActions}>
          <TouchableOpacity
            style={styles.planAction}
            activeOpacity={0.85}
            onPress={() => navigation.openModule('DueDetail', { dueId: p.parentDueId })}
          >
            <Ionicons name="receipt-outline" size={14} color={THEME} />
            <Text style={styles.planActionText}>Open the original bill</Text>
          </TouchableOpacity>
          {p.paidRupees === 0 && (
            <TouchableOpacity style={[styles.planAction, styles.planActionDanger]} activeOpacity={0.85} onPress={onCancel}>
              <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
              <Text style={[styles.planActionText, { color: '#dc2626' }]}>Cancel this plan</Text>
            </TouchableOpacity>
          )}
          {p.paidRupees > 0 && (
            <View style={styles.planLocked}>
              <Ionicons name="lock-closed-outline" size={11} color="#94a3b8" />
              <Text style={styles.planLockedText}>
                {rupees(p.paidRupees)} already paid — a plan with money against it cannot be
                cancelled, or that money would be lost.
              </Text>
            </View>
          )}
        </View>
      )}
    </AnimatedCard>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={[styles.miniValue, color ? { color } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  card: { marginBottom: 10 },

  heroLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginTop: 3, letterSpacing: -1 },
  heroSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  lateNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: '#fffbeb' },
  lateNoteText: { flex: 1, fontSize: 11, color: '#92400e', fontFamily: 'Manrope-Medium', lineHeight: 16 },

  tabRow: { flexDirection: 'row', gap: 7, marginBottom: 13 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  tabActive: { backgroundColor: THEME, borderColor: THEME },
  tabText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Manrope-SemiBold' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  plan: { marginBottom: 10 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, paddingBottom: 9 },
  planIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  planHead: { flex: 1 },
  planTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  planMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  planRight: { alignItems: 'flex-end' },
  planPaid: { fontSize: 14, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  planPaidMeta: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: '#e2e8f0', overflow: 'hidden', marginHorizontal: 13 },
  planStats: { flexDirection: 'row', paddingHorizontal: 13, paddingTop: 12 },
  mini: { flex: 1 },
  miniLabel: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  miniValue: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginTop: 2 },
  planNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', fontStyle: 'italic', paddingHorizontal: 13, paddingTop: 9 },
  cancelNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 13, marginTop: 10, padding: 11, borderRadius: 11, backgroundColor: '#f1f5f9' },
  cancelNoteText: { flex: 1, fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', lineHeight: 16 },
  instalments: { marginHorizontal: 13, marginTop: 11, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  instRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  instDot: { width: 7, height: 7, borderRadius: 4 },
  instBody: { flex: 1 },
  instTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  instMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  instAmount: { fontSize: 12, fontWeight: '800', fontFamily: 'Manrope-Bold' },
  planActions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingTop: 11, flexWrap: 'wrap' },
  planAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: THEME + '10' },
  planActionDanger: { backgroundColor: '#fef2f2' },
  planActionText: { fontSize: 11, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  planLocked: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1, minWidth: 200 },
  planLockedText: { flex: 1, fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', lineHeight: 14 },

  // Sheet
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28, maxHeight: '92%' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  sheetHint: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 5, lineHeight: 17 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 15, marginBottom: 8 },
  fieldHint: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 6 },
  countRow: { flexDirection: 'row', gap: 7 },
  countBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  countBtnWide: { paddingVertical: 10, paddingHorizontal: 6 },
  countBtnActive: { backgroundColor: THEME, borderColor: THEME },
  countText: { fontSize: 13, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  countTextActive: { color: '#fff' },
  scheduleBox: { borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 11, maxHeight: 190 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 },
  scheduleSeq: { width: 26, fontSize: 11, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
  scheduleDate: { flex: 1, fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  scheduleAmount: { fontSize: 12, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  scheduleTotal: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 5, paddingTop: 8 },
  scheduleTotalLabel: { flex: 1, fontSize: 11, fontWeight: '800', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  scheduleTotalAmount: { fontSize: 12, fontWeight: '800', color: '#059669', fontFamily: 'Manrope-Bold' },
  scheduleMismatch: { color: '#dc2626' },
  mismatchNote: { fontSize: 10, color: '#dc2626', fontFamily: 'Manrope-Medium', marginTop: 6 },
  input: { marginTop: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 12, fontSize: 13, color: '#0f172a', fontFamily: 'Manrope-Regular', textAlignVertical: 'top' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  sheetCancel: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  sheetCancelText: { fontSize: 13, fontWeight: '700', color: '#475569', fontFamily: 'Manrope-Bold' },
  sheetConfirm: { flex: 1.4, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME, alignItems: 'center' },
  sheetConfirmDanger: { backgroundColor: '#dc2626' },
  sheetConfirmDisabled: { backgroundColor: '#cbd5e1' },
  sheetConfirmText: { fontSize: 13, fontWeight: '800', color: '#fff', fontFamily: 'Manrope-Bold' },

  clearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: -16, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: THEME + '10', borderWidth: 1, borderColor: THEME + '33' },
  clearBtnText: { fontSize: 13, fontWeight: '700', color: THEME, fontFamily: 'Manrope-Bold' },
});
