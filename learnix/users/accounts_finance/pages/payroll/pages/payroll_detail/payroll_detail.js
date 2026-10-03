// F-06 Payroll — one run, end to end (docs/users/06 §3.4).
//
// This replaces a 434-line screen that imported a hard-coded `SALARY_BREAKDOWN`
// for a staff member who did not exist, showed three months of invented
// "history", and offered two buttons that only raised an Alert: "Process
// Salary" (which did nothing but say it had) and "View / Resend Payslip"
// (which emailed nobody).
//
// The real screen has to answer, for one month:
//   · what does this run cost — gross / deducted / net
//   · what is each person's sheet, line by line
//   · what state is the run in, and what may I legally do next
//   · who has been paid and who has not
//   · what changed, and who did it
//
// The lifecycle is enforced by the SERVER, not by this screen: `canApprove`,
// `canPay` and `canAdjust` all come from the API. Every action row below is
// rendered from those flags, so once a run is approved the "approve" button is
// gone rather than greyed out and waiting to fail.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, SkeletonCard, EmptyState } from '../../../../../components/ui';
import {
  THEME, rupees, formatDateTime, relativeTime,
  runStatusMeta, runStatusHint, entryStatusMeta, monthLabel, daysInMonth,
  REF_PREFIX_PRESETS,
} from '../../payrollMeta';

export default function PayrollDetail({ navigation, route }) {
  const runId = route?.params?.runId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Which bottom sheet is open. One at a time: these are all consequential, and
  // two stacked dialogs on a phone is how the wrong one gets confirmed.
  const [sheet, setSheet] = useState(null); // 'payAll' | 'lop'
  const [lopEntry, setLopEntry] = useState(null);
  const [lopDays, setLopDays] = useState('0');
  const [lopNote, setLopNote] = useState('');
  const [refPrefix, setRefPrefix] = useState('');

  const fetchData = useCallback(async () => {
    if (!runId) {
      setError('No payroll run selected');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setData(await accountsApi.payrollRun(runId));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [runId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const closeSheet = () => {
    setSheet(null);
    setLopEntry(null);
    setLopNote('');
    setRefPrefix('');
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve this payroll?',
      `${monthLabel(data.run.month)} · ${rupees(data.stats.netRupees)} net for ${data.stats.entryCount} staff.\n\n`
        + 'Approving locks every figure on the sheet. Loss of pay can no longer be applied, '
        + 'and the run becomes money this institution owes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setBusy(true);
            try {
              await accountsApi.approvePayrollRun(runId);
              await fetchData();
            } catch (err) {
              Alert.alert('Cannot approve', err.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handlePayEntry = (entry) => {
    Alert.alert(
      `Pay ${entry.staffName}?`,
      `${rupees(entry.netRupees)} net${entry.paymentRef ? `\nReference: ${entry.paymentRef}` : ''}\n\n`
        + 'This records the transfer against this person only. The run stays open until the '
        + 'last person is paid.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark paid',
          onPress: async () => {
            setBusy(true);
            try {
              await accountsApi.payPayrollEntry(entry.id);
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

  const confirmPayAll = async () => {
    setBusy(true);
    try {
      const res = await accountsApi.payAllPayroll(runId, refPrefix.trim() || undefined);
      const closedMonth = data.run.month;
      closeSheet();
      await fetchData();
      Alert.alert(
        'Run closed',
        `${res.paidEntries} payment${res.paidEntries === 1 ? '' : 's'} totalling ${rupees(res.paidRupees)} recorded. `
          + `${monthLabel(closedMonth)} is now fully paid.`,
      );
    } catch (err) {
      Alert.alert('Cannot pay everyone', err.message);
    } finally {
      setBusy(false);
    }
  };

  const openLopSheet = (entry) => {
    setLopEntry(entry);
    setLopDays(String(entry?.lopDays ?? 0));
    setSheet('lop');
  };

  const confirmLop = async () => {
    const days = parseInt(lopDays, 10);
    if (!Number.isFinite(days) || days < 0) {
      Alert.alert('Check the days', 'Loss of pay must be zero or a whole number of days.');
      return;
    }
    const max = daysInMonth(data.run.month);
    if (days > max) {
      Alert.alert('Too many days', `${monthLabel(data.run.month)} has only ${max} days.`);
      return;
    }
    setBusy(true);
    try {
      await accountsApi.adjustPayrollEntry(lopEntry.id, {
        lopDays: days,
        ...(lopNote.trim() ? { note: lopNote.trim() } : {}),
      });
      closeSheet();
      await fetchData();
    } catch (err) {
      // The server caps LOP so deductions can never exceed the gross. That is a
      // real refusal and its message is worth showing verbatim.
      Alert.alert('Cannot apply that', err.message);
    } finally {
      setBusy(false);
    }
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

  const { run, stats, entries, audit } = data;
  const meta = runStatusMeta(run.status);
  const pendingEntries = entries.filter((e) => e.status !== 'PAID');

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* ── The bill ─────────────────────────────────────── */}
        <AnimatedCard delay={0} style={styles.billCard}>
          <View style={styles.billTop}>
            <View style={styles.billLeft}>
              <Text style={styles.billMonth}>{monthLabel(run.month)}</Text>
              <Text style={styles.billSub}>
                {stats.entryCount} staff{run.isCurrentMonth ? ' · this month' : ''}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={12} color={meta.color} />
              <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>

          <Text style={styles.billNet}>{rupees(stats.netRupees)}</Text>
          <Text style={styles.billNetLabel}>net payable</Text>

          <View style={styles.billBreakdown}>
            <View style={styles.billCell}>
              <Text style={styles.billCellLabel}>Gross</Text>
              <Text style={styles.billCellValue}>{rupees(stats.grossRupees)}</Text>
            </View>
            <View style={styles.billCell}>
              <Text style={styles.billCellLabel}>Deducted</Text>
              <Text style={[styles.billCellValue, styles.negative]}>
                −{rupees(stats.deductionsRupees)}
              </Text>
            </View>
            <View style={styles.billCell}>
              <Text style={styles.billCellLabel}>Average</Text>
              <Text style={styles.billCellValue}>{rupees(stats.averageNetRupees)}</Text>
            </View>
          </View>

          {/* Progress is only meaningful once a run is approved — before that
              nothing is owed, so a progress bar would be theatre. */}
          {run.status !== 'DRAFT' && (
            <>
              <View style={styles.progressHead}>
                <Text style={styles.progressLabel}>{stats.paidCount}/{stats.entryCount} paid</Text>
                <Text style={styles.progressLabel}>{rupees(stats.pendingRupees)} still to transfer</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${stats.paidPercent}%`, backgroundColor: meta.color }]} />
              </View>
            </>
          )}

          <Text style={styles.hint}>{runStatusHint(run.status)}</Text>
          {run.notes ? <Text style={styles.notes}>“{run.notes}”</Text> : null}
        </AnimatedCard>

        {/* ── Actions ──────────────────────────────────────── */}
        {/* Every row is gated on a flag the SERVER computed, so an action that
            is illegal is not offered at all. */}
        <AnimatedCard delay={40} style={styles.block}>
          <Text style={styles.sectionLabel}>What you can do</Text>
          <View style={styles.actionList}>
            {run.canApprove && (
              <ActionRow
                icon="checkmark-done-outline"
                label="Approve this run"
                hint="Locks every figure and makes the money owed"
                color="#059669"
                onPress={handleApprove}
                disabled={busy}
              />
            )}
            {run.canPay && (
              <ActionRow
                icon="card-outline"
                label={`Pay all ${pendingEntries.length} remaining`}
                hint={`${rupees(stats.pendingRupees)} in one transfer file`}
                color={THEME}
                onPress={() => setSheet('payAll')}
                disabled={busy}
              />
            )}
            {run.canAdjust && (
              <>
                <ActionRow
                  icon="create-outline"
                  label="Apply loss of pay"
                  hint="Only possible while the run is a draft"
                  color="#d97706"
                  onPress={() => openLopSheet(entries.find((e) => e.status !== 'PAID') || entries[0])}
                  disabled={busy}
                />
                {/* Pick who, rather than defaulting to the first row — applying a
                    loss of pay to the wrong person is the worst bug here. */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
                  {entries.map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      style={styles.pickChip}
                      onPress={() => openLopSheet(e)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.pickText} numberOfLines={1}>
                        {e.staffName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/, '')}
                        {e.lopDays > 0 ? ` · ${e.lopDays}d` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            {!run.canApprove && !run.canPay && !run.canAdjust && (
              <View style={styles.settledRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.settledText}>
                  {run.status === 'PAID'
                    ? 'Closed and fully paid. Nothing left to do.'
                    : 'Locked. Nothing left to do on this run.'}
                </Text>
              </View>
            )}
          </View>
        </AnimatedCard>

        {/* Someone on the payroll but missing from this run is a month where one
            person is quietly not paid — nobody notices until they query it. */}
        {run.staffNotOnRun > 0 && (
          <AnimatedCard delay={60} style={[styles.block, styles.warnCard]}>
            <View style={styles.warnRow}>
              <Ionicons name="warning-outline" size={16} color="#d97706" />
              <Text style={styles.warnText}>
                {run.staffNotOnRun} staff member{run.staffNotOnRun === 1 ? ' is' : 's are'} on the payroll but
                not on this run — they joined, or had a salary set, after it was raised. They will be
                included from next month.
              </Text>
            </View>
          </AnimatedCard>
        )}

        {/* ── The sheet ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Payslips</Text>
          <Text style={styles.sectionMeta}>{entries.length} staff · tap for the full slip</Text>
        </View>

        {entries.length === 0 ? (
          <EmptyState icon="people-outline" title="Nobody on this run" subtitle="This payroll run has no entries." />
        ) : (
          entries.map((e, i) => (
            <EntryRow
              key={e.id}
              entry={e}
              index={i}
              canPay={run.canPay && e.status !== 'PAID'}
              onPay={() => handlePayEntry(e)}
              onOpen={() => navigation.openModule('Payslip', { entryId: e.id, runId })}
            />
          ))
        )}

        {/* ── History ──────────────────────────────────────── */}
        {audit.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>What happened</Text>
              <Text style={styles.sectionMeta}>{audit.length} event{audit.length === 1 ? '' : 's'}</Text>
            </View>
            <AnimatedCard delay={80} style={styles.block}>
              {audit.map((a, i) => (
                <View key={a.id} style={[styles.auditRow, i > 0 && styles.auditRowBordered]}>
                  <View style={styles.auditIcon}>
                    <Ionicons name={auditIcon(a.action)} size={13} color={THEME} />
                  </View>
                  <View style={styles.auditBody}>
                    <Text style={styles.auditText}>{AUDIT_LABEL[a.action] ?? a.action}</Text>
                    <Text style={styles.auditMeta}>{a.actor} · {formatDateTime(a.createdAt)}</Text>
                  </View>
                  <Text style={styles.auditAgo}>{relativeTime(a.createdAt)}</Text>
                </View>
              ))}
            </AnimatedCard>
          </>
        )}

        <Text style={styles.raisedMeta}>
          Raised by {run.runBy} on {formatDateTime(run.createdAt)}
          {run.approvedBy ? `\nApproved by ${run.approvedBy}` : ''}
          {run.paidBy ? `\nClosed by ${run.paidBy}` : ''}
        </Text>
      </ScrollView>

      {/* ── Sheets ───────────────────────────────────────────── */}
      {sheet === 'payAll' && (
        <View style={styles.sheetWrap}>
          <View style={styles.sheetBackdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Pay {pendingEntries.length} staff</Text>
            <Text style={styles.sheetSub}>
              {rupees(stats.pendingRupees)} will be marked paid and {monthLabel(run.month)} will close. Record
              the transfer reference so the bank statement can be reconciled against each payslip later.
            </Text>

            <Text style={styles.fieldLabel}>REFERENCE PREFIX (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={refPrefix}
              onChangeText={setRefPrefix}
              placeholder="e.g. NEFT"
              placeholderTextColor="#cbd5e1"
              maxLength={32}
              autoCapitalize="characters"
            />
            <View style={styles.presetRow}>
              {REF_PREFIX_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, refPrefix === p && styles.presetActive]}
                  onPress={() => setRefPrefix(p)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, refPrefix === p && styles.presetTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.sheetPrimary} onPress={confirmPayAll} activeOpacity={0.85} disabled={busy}>
              {busy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sheetPrimaryText}>Mark all paid</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetGhost} onPress={closeSheet} activeOpacity={0.85}>
              <Text style={styles.sheetGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {sheet === 'lop' && lopEntry && (
        <View style={styles.sheetWrap}>
          <View style={styles.sheetBackdrop} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Loss of pay — {lopEntry.staffName}</Text>
            <Text style={styles.sheetSub}>
              {rupees(lopEntry.grossRupees)} gross over {daysInMonth(run.month)} days, so a day is worth about{' '}
              {rupees(Math.floor(lopEntry.grossRupees / daysInMonth(run.month)))}.
              {'\n\n'}The deduction can never exceed the gross — a fully absent month still owes PF and
              professional tax, so the desk caps it rather than paying a negative salary.
            </Text>

            <Text style={styles.fieldLabel}>STAFF MEMBER</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              {entries.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.preset, lopEntry.id === e.id && styles.presetActive]}
                  onPress={() => { setLopEntry(e); setLopDays(String(e.lopDays ?? 0)); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, lopEntry.id === e.id && styles.presetTextActive]}>
                    {e.staffName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/, '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>DAYS ABSENT</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setLopDays(String(Math.max(0, (parseInt(lopDays, 10) || 0) - 1)))}
                activeOpacity={0.85}
              >
                <Ionicons name="remove" size={18} color={THEME} />
              </TouchableOpacity>
              <TextInput
                style={styles.stepInput}
                value={lopDays}
                onChangeText={setLopDays}
                keyboardType="number-pad"
                maxLength={2}
              />
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setLopDays(String((parseInt(lopDays, 10) || 0) + 1))}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={THEME} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>NOTE FOR THE PAYSLIP (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={lopNote}
              onChangeText={setLopNote}
              placeholder="Why was this deducted?"
              placeholderTextColor="#cbd5e1"
              maxLength={300}
              multiline
            />

            <TouchableOpacity style={styles.sheetPrimary} onPress={confirmLop} activeOpacity={0.85} disabled={busy}>
              {busy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sheetPrimaryText}>Apply loss of pay</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetGhost} onPress={closeSheet} activeOpacity={0.85}>
              <Text style={styles.sheetGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const AUDIT_LABEL = {
  'payroll.run': 'Payroll raised',
  'payroll.approve': 'Run approved — figures locked',
  'payroll.adjust': 'Loss of pay adjusted',
  'payroll.pay': 'Payment recorded',
};

const auditIcon = (action) => {
  if (action === 'payroll.approve') return 'checkmark-done-outline';
  if (action === 'payroll.adjust') return 'create-outline';
  return 'card-outline';
};

/**
 * One person's line on the run. The breakdown is deliberately collapsed: an
 * officer scanning twenty rows needs to see who is short and by how much, and
 * the full sheet is one tap away.
 */
function EntryRow({ entry, index, canPay, onPay, onOpen }) {
  const meta = entryStatusMeta(entry.status);
  const lop = entry.deductions.find((d) => d.label.startsWith('Loss of Pay'));

  return (
    <AnimatedCard delay={90 + index * 20} onPress={onOpen} style={styles.block}>
      <View style={styles.entryRow}>
        <View style={[styles.entryAvatar, { backgroundColor: meta.bg }]}>
          <Text style={[styles.entryInitial, { color: meta.color }]}>
            {entry.staffName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/, '').charAt(0)}
          </Text>
        </View>

        <View style={styles.entryBody}>
          <Text style={styles.entryName} numberOfLines={1}>{entry.staffName}</Text>
          <Text style={styles.entryMeta} numberOfLines={1}>
            {entry.designation ?? 'Staff'}
            {entry.departmentName ? ` · ${entry.departmentName}` : ''}
          </Text>
          {entry.lopDays > 0 && (
            <View style={[styles.tag, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="calendar-outline" size={10} color="#dc2626" />
              <Text style={[styles.tagText, { color: '#dc2626' }]}>
                {entry.lopDays}d loss of pay · {rupees(Math.round((lop?.amountMinor ?? 0) / 100))}
              </Text>
            </View>
          )}
          {entry.note ? (
            <View style={[styles.tag, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.tagText, { color: '#64748b' }]} numberOfLines={1}>{entry.note}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.entryRight}>
          <Text style={styles.entryNet}>{rupees(entry.netRupees)}</Text>
          <Text style={styles.entryGross}>{rupees(entry.grossRupees)} gross</Text>
          {canPay ? (
            <TouchableOpacity style={styles.payBtn} onPress={onPay} activeOpacity={0.85}>
              <Text style={styles.payBtnText}>Pay</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.entryPill, { backgroundColor: meta.bg }]}>
              <Text style={[styles.entryPillText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          )}
        </View>
      </View>
    </AnimatedCard>
  );
}

function ActionRow({ icon, label, hint, color, onPress, disabled }) {
  return (
    <TouchableOpacity style={styles.actionRow} onPress={onPress} activeOpacity={0.85} disabled={disabled}>
      <View style={[styles.actionIcon, { backgroundColor: color + '14' }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.actionBody}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={15} color="#cbd5e1" />
    </TouchableOpacity>
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

  billCard: { marginBottom: 12 },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  billLeft: { flex: 1 },
  billMonth: { fontSize: 13, color: '#64748b', letterSpacing: 0.3, textTransform: 'uppercase' },
  billSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  billNet: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 10 },
  billNetLabel: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  billBreakdown: {
    flexDirection: 'row', marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  billCell: { flex: 1 },
  billCellLabel: { fontSize: 11, color: '#94a3b8' },
  billCellValue: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 3 },
  negative: { color: '#dc2626' },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  progressLabel: { fontSize: 11, color: '#64748b' },
  progressTrack: {
    height: 6, backgroundColor: '#f1f5f9', borderRadius: 3,
    marginTop: 6, overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3 },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 12, fontStyle: 'italic' },
  notes: { fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', letterSpacing: 0.2 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, marginBottom: 8,
  },
  sectionMeta: { fontSize: 11, color: '#94a3b8' },

  actionList: { marginTop: 4 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#f8fafc',
  },
  actionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  actionBody: { flex: 1, marginLeft: 11 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  actionHint: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  picker: { gap: 6, paddingVertical: 6, paddingLeft: 2 },
  pickChip: { backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, maxWidth: 160 },
  pickText: { fontSize: 11, color: '#475569' },
  settledRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 12 },
  settledText: { flex: 1, fontSize: 12, color: '#059669' },

  warnCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  warnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warnText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 16 },

  entryRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryInitial: { fontSize: 15, fontWeight: '800' },
  entryBody: { flex: 1, marginLeft: 11 },
  entryName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  entryMeta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
    marginTop: 5, maxWidth: 200,
  },
  tagText: { fontSize: 10, fontWeight: '600', flexShrink: 1 },
  entryRight: { alignItems: 'flex-end', marginLeft: 8 },
  entryNet: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  entryGross: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  entryPill: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  entryPillText: { fontSize: 10, fontWeight: '700' },
  payBtn: {
    marginTop: 6, backgroundColor: THEME,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
  },
  payBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  auditRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  auditRowBordered: { borderTopWidth: 1, borderTopColor: '#f8fafc' },
  auditIcon: {
    width: 26, height: 26, borderRadius: 9, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  auditBody: { flex: 1, marginLeft: 10 },
  auditText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  auditMeta: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  auditAgo: { fontSize: 10, color: '#cbd5e1' },

  raisedMeta: { fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 16, lineHeight: 15 },

  sheetWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sheetSub: { fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 18 },
  fieldLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 6,
  },
  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  preset: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  presetActive: { backgroundColor: '#eff6ff' },
  presetText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  presetTextActive: { color: THEME },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  stepInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontWeight: '700',
    color: '#0f172a', textAlign: 'center', backgroundColor: '#f8fafc',
  },
  sheetPrimary: {
    marginTop: 20, backgroundColor: THEME, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  sheetPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  sheetGhost: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  sheetGhostText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
});