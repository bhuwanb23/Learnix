// LOANS & ADVANCES for one staff member.
//
// This is the deduction an Indian payroll desk is asked about every month and
// which no version of the original schema could record: a festival advance
// handed over in October and recovered over the months that follow. Without it
// there is nowhere to put the money, so it gets netted off informally and the
// ledger is wrong.
//
// Three rules the server enforces and this screen mirrors:
//   · a recovery cannot exceed what is outstanding
//   · a recovery cannot be posted before the month the advance was paid
//   · one recovery per month per loan — a second one is a mistake, not a top-up
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import {
  THEME, rupees, monthLabel, monthShort, currentMonth, shiftMonth,
  loanTone, LOAN_KIND_LABELS, LOAN_LABEL_PRESETS,
} from '../../payrollSalaryMeta';

const Row = ({ label, value, tone }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, tone ? { color: tone } : null]}>{value}</Text>
  </View>
);

export default function SalaryLoans({ navigation, route }) {
  const staffUserId = route?.params?.staffUserId;
  const [month, setMonth] = useState(route?.params?.month ?? currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [recoverFor, setRecoverFor] = useState(null);
  const [draft, setDraft] = useState({ kind: 'ADVANCE', label: 'Festival advance', principalRupees: '', installmentRupees: '', grantedMonth: currentMonth(), note: '' });
  const [recoverDraft, setRecoverDraft] = useState({ amountRupees: '', note: '' });

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.staffSalary(staffUserId, month));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffUserId, month]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const grant = async () => {
    const principal = Number(String(draft.principalRupees).replace(/[^0-9]/g, ''));
    const instalment = Number(String(draft.installmentRupees).replace(/[^0-9]/g, '')) || 0;
    if (!principal) { Alert.alert('Enter the amount', 'A loan needs a principal amount.'); return; }
    if (instalment > principal) { Alert.alert('Check the instalment', 'A monthly instalment cannot exceed the amount advanced.'); return; }
    setBusy(true);
    try {
      await accountsApi.grantLoan(staffUserId, {
        kind: draft.kind,
        label: draft.label.trim(),
        principalRupees: principal,
        installmentRupees: instalment,
        grantedMonth: draft.grantedMonth,
        note: draft.note.trim() || null,
      });
      setGrantOpen(false);
      setDraft({ ...draft, principalRupees: '', installmentRupees: '', note: '' });
      await load();
      Alert.alert('Advance recorded', 'It will be recovered from net pay each month.');
    } catch (err) {
      Alert.alert('Could not grant', err.message);
    } finally {
      setBusy(false);
    }
  };

  const recover = async () => {
    const amount = Number(String(recoverDraft.amountRupees).replace(/[^0-9]/g, ''));
    if (!amount) { Alert.alert('Enter the amount', 'A recovery needs an amount.'); return; }
    setBusy(true);
    try {
      await accountsApi.recoverLoan(recoverFor.id, { month, amountRupees: amount, note: recoverDraft.note.trim() || null });
      setRecoverFor(null);
      setRecoverDraft({ amountRupees: '', note: '' });
      await load();
    } catch (err) {
      Alert.alert('Could not post the recovery', err.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = (loan) => {
    Alert.alert(
      `Cancel "${loan.label}"?`,
      loan.outstandingRupees > 0
        ? `₹${loan.outstandingRupees.toLocaleString('en-IN')} will be written off. This cannot be undone.`
        : 'This loan will be closed.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel it',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await accountsApi.cancelLoan(loan.id, 'Cancelled from the salary desk');
              await load();
            } catch (err) {
              Alert.alert('Could not cancel', err.message);
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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonCard />
      </ScrollView>
    );
  }

  const loans = data?.loans ?? [];
  const active = loans.filter((l) => l.status === 'ACTIVE');
  const closed = loans.filter((l) => l.status !== 'ACTIVE');
  const outstanding = loans.reduce((s, l) => s + l.outstandingRupees, 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
      >
        <View style={styles.monthBar}>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={18} color={THEME} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.monthLabel}>Recovering for {monthLabel(month)}</Text>
            <Text style={styles.monthHint}>{data?.staff?.staffName}</Text>
          </View>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={18} color={THEME} />
          </TouchableOpacity>
        </View>

        {error ? (
          <AnimatedCard style={{ marginBottom: 12 }}>
            <Text style={{ color: '#dc2626' }}>{error}</Text>
          </AnimatedCard>
        ) : null}

        <AnimatedCard>
          <Text style={styles.summaryLabel}>Outstanding across all loans</Text>
          <Text style={[styles.summaryValue, { color: outstanding ? '#d97706' : '#059669' }]}>{rupees(outstanding)}</Text>
          <Text style={styles.summarySub}>
            {active.length} active · {closed.length} closed · deducted automatically from net pay
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={() => setGrantOpen(true)}>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.grantText}>Grant an advance</Text>
          </TouchableOpacity>
        </AnimatedCard>

        {!loans.length ? (
          <EmptyState
            icon="card-outline"
            title="No loans or advances"
            message="Nothing is being recovered from this salary."
          />
        ) : null}

        {active.map((l) => {
          const tone = loanTone(l.status);
          const postedThisMonth = (l.recoveries ?? []).some((r) => r.month === month);
          return (
            <AnimatedCard key={l.id} style={{ marginTop: 12 }}>
              <View style={styles.loanHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.loanLabel}>{l.label}</Text>
                  <Text style={styles.loanMeta}>
                    {LOAN_KIND_LABELS[l.kind] ?? l.kind} · granted {monthShort(l.grantedMonth)}
                  </Text>
                </View>
                <StatusChip label={tone.label} color={tone.color} bg={tone.bg} />
              </View>

              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${l.progressPercent}%`, backgroundColor: tone.color }]} />
              </View>

              <Row label="Advanced" value={rupees(l.principalRupees)} />
              <Row label="Recovered" value={rupees(l.recoveredRupees)} tone="#059669" />
              <Row label="Outstanding" value={rupees(l.outstandingRupees)} tone={l.outstandingRupees ? '#d97706' : '#059669'} />
              {l.installmentRupees > 0 ? (
                <Row label="Monthly instalment" value={rupees(l.installmentRupees)} sub={`${Math.ceil(l.outstandingRupees / l.installmentRupees)} months left`} />
              ) : null}

              {postedThisMonth ? (
                <View style={styles.okBox}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                  <Text style={styles.okText}>Already recovered for {monthShort(month)}. One recovery a month.</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.recoverBtn}
                  onPress={() => { setRecoverFor(l); setRecoverDraft({ amountRupees: String(l.installmentRupees || ''), note: '' }); }}
                >
                  <Text style={styles.recoverText}>Post recovery for {monthShort(month)}</Text>
                </TouchableOpacity>
              )}

              {(l.recoveries ?? []).length ? (
                <View style={styles.recoveryList}>
                  <Text style={styles.recoveryTitle}>Recovery trail</Text>
                  {l.recoveries.map((r) => (
                    <View key={`${l.id}-${r.month}`} style={styles.recoveryRow}>
                      <Text style={styles.recoveryMonth}>{monthShort(r.month)}</Text>
                      <Text style={styles.recoveryAmt}>{rupees(r.amountRupees)}</Text>
                      {r.note ? <Text style={styles.recoveryNote}>{r.note}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => cancel(l)} disabled={busy}>
                <Text style={styles.cancelText}>Cancel this loan</Text>
              </TouchableOpacity>
            </AnimatedCard>
          );
        })}

        {closed.length ? (
          <>
            <Text style={styles.closedTitle}>Closed</Text>
            {closed.map((l) => {
              const tone = loanTone(l.status);
              return (
                <AnimatedCard key={l.id} style={{ marginTop: 8, opacity: 0.75 }}>
                  <View style={styles.loanHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.loanLabel}>{l.label}</Text>
                      <Text style={styles.loanMeta}>
                        {rupees(l.principalRupees)} · {monthShort(l.grantedMonth)}
                      </Text>
                    </View>
                    <StatusChip label={tone.label} color={tone.color} bg={tone.bg} />
                  </View>
                </AnimatedCard>
              );
            })}
          </>
        ) : null}
      </ScrollView>

      {/* Grant sheet */}
      {grantOpen ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setGrantOpen(false)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>Grant an advance</Text>
                <Text style={styles.sheetHint}>
                  Money handed over now, recovered from net pay over the months that follow.
                </Text>

                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.modeRow}>
                  {Object.entries(LOAN_KIND_LABELS).map(([k, label]) => (
                    <TouchableOpacity key={k} style={[styles.modeBtn, draft.kind === k && styles.modeBtnOn]} onPress={() => setDraft({ ...draft, kind: k })}>
                      <Text style={[styles.modeText, draft.kind === k && styles.modeTextOn]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Label</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {LOAN_LABEL_PRESETS.map((l) => (
                    <TouchableOpacity key={l} style={[styles.chip, draft.label === l && styles.chipOn]} onPress={() => setDraft({ ...draft, label: l })}>
                      <Text style={[styles.chipText, draft.label === l && styles.chipTextOn]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput style={styles.input} value={draft.label} onChangeText={(v) => setDraft({ ...draft, label: v })} placeholder="Festival advance" />

                <Text style={styles.fieldLabel}>Amount advanced (₹)</Text>
                <TextInput style={styles.input} value={draft.principalRupees} onChangeText={(v) => setDraft({ ...draft, principalRupees: v })} keyboardType="numeric" placeholder="12000" />

                <Text style={styles.fieldLabel}>Monthly recovery (₹, 0 for manual)</Text>
                <TextInput style={styles.input} value={draft.installmentRupees} onChangeText={(v) => setDraft({ ...draft, installmentRupees: v })} keyboardType="numeric" placeholder="2000" />

                <Text style={styles.fieldLabel}>Paid in month</Text>
                <TextInput style={styles.input} value={draft.grantedMonth} onChangeText={(v) => setDraft({ ...draft, grantedMonth: v })} placeholder="2026-08" />
                <Text style={styles.fieldHint}>A recovery cannot be posted before this month.</Text>

                <Text style={styles.fieldLabel}>Note</Text>
                <TextInput style={[styles.input, { minHeight: 56, textAlignVertical: 'top' }]} value={draft.note} onChangeText={(v) => setDraft({ ...draft, note: v })} multiline />

                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.btnGhost} onPress={() => setGrantOpen(false)}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={grant} disabled={busy}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Grant</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Recovery sheet */}
      {recoverFor ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setRecoverFor(null)}>
          <View style={styles.backdrop}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Post recovery</Text>
              <Text style={styles.sheetHint}>
                {recoverFor.label} · {monthShort(month)} · {rupees(recoverFor.outstandingRupees)} outstanding
              </Text>
              <Text style={styles.fieldLabel}>Amount recovered (₹)</Text>
              <TextInput style={styles.input} value={recoverDraft.amountRupees} onChangeText={(v) => setRecoverDraft({ ...recoverDraft, amountRupees: v })} keyboardType="numeric" />
              <Text style={styles.fieldHint}>Cannot exceed {rupees(recoverFor.outstandingRupees)}.</Text>

              <Text style={styles.fieldLabel}>Note</Text>
              <TextInput style={styles.input} value={recoverDraft.note} onChangeText={(v) => setRecoverDraft({ ...recoverDraft, note: v })} placeholder="Auto-recovered from net pay" />

              <View style={styles.sheetActions}>
                <TouchableOpacity style={styles.btnGhost} onPress={() => setRecoverFor(null)}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={recover} disabled={busy}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Post recovery</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 40 },
  monthBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, marginBottom: 12 },
  monthBtn: { padding: 10 },
  monthLabel: { fontWeight: '700', color: '#0f172a' },
  monthHint: { fontSize: 11, color: '#64748b' },
  summaryLabel: { fontSize: 12, color: '#64748b' },
  summaryValue: { fontSize: 26, fontWeight: '800' },
  summarySub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  grantBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 11, borderRadius: 9, backgroundColor: THEME },
  grantText: { color: '#fff', fontWeight: '700' },
  loanHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loanLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  loanMeta: { fontSize: 11, color: '#94a3b8' },
  bar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginVertical: 10 },
  barFill: { height: 6, borderRadius: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#475569' },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  okBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', padding: 9, borderRadius: 8 },
  okText: { flex: 1, fontSize: 12, color: '#047857' },
  recoverBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 9, backgroundColor: '#eff6ff', alignItems: 'center' },
  recoverText: { color: THEME, fontWeight: '700', fontSize: 13 },
  recoveryList: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  recoveryTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  recoveryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  recoveryMonth: { fontSize: 12, color: '#475569', width: 52 },
  recoveryAmt: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  recoveryNote: { fontSize: 10, color: '#94a3b8' },
  cancelBtn: { marginTop: 14, alignItems: 'center' },
  cancelText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  closedTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 18, textTransform: 'uppercase', letterSpacing: 0.4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '88%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sheetHint: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 4 },
  fieldHint: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 14, color: '#0f172a' },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  modeBtnOn: { backgroundColor: '#dbeafe' },
  modeText: { fontSize: 12, color: '#475569' },
  modeTextOn: { color: THEME, fontWeight: '700' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 6 },
  chipOn: { backgroundColor: '#dbeafe' },
  chipText: { fontSize: 12, color: '#475569' },
  chipTextOn: { color: THEME, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnGhost: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  btnGhostText: { color: '#475569', fontWeight: '700' },
  btnPrimary: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: THEME, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});