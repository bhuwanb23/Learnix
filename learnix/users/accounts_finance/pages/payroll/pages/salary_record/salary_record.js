// One staff member's SALARY RECORD — the screen that answers "what is this person
// paid, on what basis, and who last changed it".
//
// The run desk (payroll_detail) tells you what a month COST. This tells you what
// the month was BUILT FROM, which is a different question with a different
// consequence: a wrong run can be re-raised, a wrong salary silently re-prices
// every future payslip.
//
// So the four things it always shows, in this order:
//   1. the CURRENT version, with its effective window and author
//   2. the full VERSION HISTORY, newest first — the raise trail
//   3. the components, as RULES ("40% of basic"), not as computed numbers
//   4. the year-to-date TAX position and any loan being recovered
//
// Every figure comes from the server. The preview is the server's own
// computation for the month, not arithmetic done on the phone.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Modal, TextInput, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../components/ui';
import {
  THEME, rupees, compactRupees, formatDate, effectiveDateLabel, monthLabel, monthShort,
  currentMonth, shiftMonth, componentMeta, componentFormula, isPercentComponent,
  attendanceTone, loanTone, LOAN_KIND_LABELS, SALARY_REASON_PRESETS,
} from '../../payrollSalaryMeta';

const Section = ({ title, icon, count, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHead}>
      <Ionicons name={icon} size={15} color={THEME} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {count !== undefined && count !== null ? <Text style={styles.sectionCount}>{count}</Text> : null}
    </View>
    {children}
  </View>
);

const Row = ({ label, value, tone, sub }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <View style={styles.rowValueWrap}>
      <Text style={[styles.rowValue, tone ? { color: tone } : null]}>{value}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
    </View>
  </View>
);

export default function SalaryRecord({ navigation, route }) {
  const staffUserId = route?.params?.staffUserId;
  const [month, setMonth] = useState(route?.params?.month ?? currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const staff = data?.staff;
  const inForce = data?.inForce;
  const preview = data?.preview;
  const previewWarnings = data?.previewWarnings ?? [];

  const openRaise = () => {
    const next = inForce
      ? `${inForce.effectiveFrom ? inForce.effectiveFrom.slice(0, 7) : month}-01`
      : `${month}-01`;
    setRaiseOpen({
      monthlyGrossRupees: String(inForce?.monthlyGrossRupees ?? staff?.monthlyGrossRupees ?? 0),
      effectiveFrom: next > `${month}-01` ? next : `${month}-01`,
      reason: 'Annual increment',
      note: '',
    });
  };

  const submitRaise = async () => {
    const gross = Number(String(raiseOpen.monthlyGrossRupees).replace(/[^0-9.]/g, ''));
    if (!gross || gross <= 0) {
      Alert.alert('Enter a monthly gross', 'The gross must be a positive whole-rupee amount.');
      return;
    }
    setBusy(true);
    try {
      await accountsApi.setSalary(staffUserId, {
        monthlyGrossRupees: Math.round(gross),
        effectiveFrom: raiseOpen.effectiveFrom,
        reason: raiseOpen.reason.trim() || null,
        note: raiseOpen.note.trim() || null,
      });
      setRaiseOpen(false);
      await fetchData();
      Alert.alert('Salary saved', 'The previous version was closed and a new one is now in force.');
    } catch (err) {
      Alert.alert('Could not save', err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
      >
        {/* Month picker — the record is priced for a month, and so is the tax. */}
        <View style={styles.monthBar}>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthBtn}>
            <Ionicons name="chevron-back" size={18} color={THEME} />
          </TouchableOpacity>
          <View style={styles.monthCentre}>
            <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
            <Text style={styles.monthHint}>What this month pays this person</Text>
          </View>
          <TouchableOpacity onPress={() => setMonth(shiftMonth(month, 1))} style={styles.monthBtn}>
            <Ionicons name="chevron-forward" size={18} color={THEME} />
          </TouchableOpacity>
        </View>

        {error ? (
          <AnimatedCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchData}><Text style={styles.retry}>Retry</Text></TouchableOpacity>
          </AnimatedCard>
        ) : null}

        {/* Who */}
        <AnimatedCard>
          <View style={styles.whoRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(staff?.staffName ?? '?').slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{staff?.staffName}</Text>
              <Text style={styles.nameSub}>
                {staff?.designation ?? 'Staff'}{staff?.departmentName ? ` · ${staff.departmentName}` : ''}
              </Text>
              <Text style={styles.nameSub}>
                {staff?.employeeNo ? `${staff.employeeNo} ` : ''}
                {staff?.bankAccountLast4 ? `· A/C ••••${staff.bankAccountLast4}` : ''}
              </Text>
            </View>
          </View>

          {!inForce ? (
            <View style={styles.warnBox}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={styles.warnText}>
                No salary record. Payroll will skip this person until one exists.
              </Text>
            </View>
          ) : (
            <View style={styles.grossBox}>
              <Text style={styles.grossLabel}>Monthly gross</Text>
              <Text style={styles.grossValue}>{rupees(inForce.monthlyGrossRupees)}</Text>
              <Text style={styles.grossMeta}>
                In force from {effectiveDateLabel(inForce.effectiveFrom)}
                {inForce.effectiveTo ? ` to ${effectiveDateLabel(inForce.effectiveTo)}` : ' — current'}
              </Text>
              {inForce.reason ? (
                <View style={styles.reasonRow}>
                  <StatusChip label={inForce.reason} color="#2563eb" bg="#eff6ff" icon="git-branch-outline" />
                  <Text style={styles.setBy}>set by {inForce.setBy}</Text>
                </View>
              ) : null}
            </View>
          )}
        </AnimatedCard>

        {/* What this month actually pays */}
        {preview ? (
          <Section title={`${monthShort(month)} — what this pays`} icon="calculator-outline">
            <AnimatedCard>
              <Row label="Gross" value={rupees(preview.grossRupees)} />
              <Row label="Basic (tax base)" value={rupees(preview.basicRupees)} sub={`Taxable ${rupees(preview.taxableRupees)}`} />
              <Row label="Deductions" value={rupees(preview.deductionsRupees)} tone="#dc2626" />
              <View style={styles.divider} />
              <Row label="Net pay" value={rupees(preview.netRupees)} tone="#059669" />
              {preview.lopDays > 0 ? (
                <Row label="Loss of pay" value={`${preview.lopDays} day${preview.lopDays === 1 ? '' : 's'}`} tone="#d97706" />
              ) : null}

              <View style={styles.linesBox}>
                {preview.earnings.map((e) => (
                  <View key={`e-${e.code}`} style={styles.lineRow}>
                    <Text style={styles.lineLabel}>+ {e.label}</Text>
                    <Text style={styles.lineAmt}>{rupees(e.amountRupees)}</Text>
                  </View>
                ))}
                <View style={styles.thinLine} />
                {preview.deductions.map((d) => (
                  <View key={`d-${d.code}`} style={styles.lineRow}>
                    <Text style={styles.lineLabel}>− {d.label}</Text>
                    <Text style={[styles.lineAmt, { color: '#dc2626' }]}>−{rupees(d.amountRupees)}</Text>
                  </View>
                ))}
              </View>

              {previewWarnings.length ? (
                <View style={styles.warnBox}>
                  <Ionicons name="information-circle-outline" size={15} color="#d97706" />
                  <Text style={styles.warnText}>{previewWarnings.join(' ')}</Text>
                </View>
              ) : null}
            </AnimatedCard>
          </Section>
        ) : null}

        {/* Components as RULES */}
        {inForce?.components?.length ? (
          <Section title="Salary structure" icon="options-outline" count={inForce.components.length}>
            <AnimatedCard>
              {inForce.components.map((c) => {
                const meta = componentMeta(c.code);
                const earnings = meta.kind === 'EARNING';
                return (
                  <View key={c.id} style={styles.compRow}>
                    <Ionicons name={meta.icon} size={17} color={earnings ? '#059669' : '#dc2626'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.compLabel}>{c.label}</Text>
                      <Text style={styles.compFormula}>
                        {componentFormula(c)}
                        {c.isTaxable ? ' · taxable' : ''}
                      </Text>
                    </View>
                    <Text style={[styles.compValue, { color: earnings ? '#059669' : '#dc2626' }]}>
                      {earnings ? '+' : '−'}
                      {isPercentComponent(c) ? `${c.percent}%` : rupees(c.amountRupees)}
                    </Text>
                  </View>
                );
              })}
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => navigation.openModule('PayrollComponents', { staffUserId, salaryRecordId: inForce.id })}
              >
                <Text style={styles.linkText}>Edit allowances & deductions</Text>
                <Ionicons name="chevron-forward" size={15} color={THEME} />
              </TouchableOpacity>
            </AnimatedCard>
          </Section>
        ) : null}

        {/* VERSION HISTORY — the raise trail */}
        <Section title="Version history" icon="git-branch-outline" count={data?.history?.length ?? 0}>
          {(data?.history ?? []).length === 0 ? (
            <EmptyState icon="document-outline" title="No salary versions" message="Set a salary to start the trail." />
          ) : (
            <AnimatedCard>
              {data.history.map((h, i) => (
                <View key={h.id} style={styles.histRow}>
                  <View style={styles.histLine}>
                    <View style={[styles.histDot, { backgroundColor: h.isCurrent ? '#059669' : '#cbd5e1' }]} />
                    {i < data.history.length - 1 ? <View style={styles.histStem} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histAmount}>{rupees(h.monthlyGrossRupees)}</Text>
                    <Text style={styles.histWindow}>
                      {effectiveDateLabel(h.effectiveFrom)} → {h.effectiveTo ? effectiveDateLabel(h.effectiveTo) : 'present'}
                    </Text>
                    {h.reason ? <Text style={styles.histReason}>{h.reason} · {h.setBy}</Text> : null}
                    {h.note ? <Text style={styles.histNote}>{h.note}</Text> : null}
                    {h.componentSummary ? (
                      <Text style={styles.histComps}>{h.componentSummary}</Text>
                    ) : null}
                  </View>
                  {h.isCurrent ? <StatusChip label="Current" color="#059669" bg="#f0fdf4" icon="checkmark-circle" /> : null}
                </View>
              ))}
            </AnimatedCard>
          )}
        </Section>

        {/* Tax */}
        {data?.tax ? (
          <Section title={`Tax position — ${data.tax.year}`} icon="receipt-outline">
            <AnimatedCard>
              <Row label="Taxable income (YTD)" value={rupees(data.tax.taxableRupees)} />
              <Row label="Standard deduction" value={rupees(data.tax.standardDeductionRupees)} />
              <Row label="Annual liability" value={rupees(data.tax.annualTaxRupees)} />
              <Row label="Already collected" value={rupees(data.tax.alreadyTdsRupees)} tone="#64748b" />
              <View style={styles.divider} />
              <Row label="Still to collect" value={rupees(data.tax.remainingTaxRupees)} tone="#d97706" />
              <Row
                label={`Monthly TDS (${data.tax.monthsRemaining} month${data.tax.monthsRemaining === 1 ? '' : 's'} left)`}
                value={rupees(data.tax.monthlyTdsRupees)}
                tone="#d97706"
              />
              {(data.tax.lines ?? []).length ? (
                <View style={styles.slabBox}>
                  {data.tax.lines.map((l, i) => (
                    <View key={`slab-${i}`} style={styles.slabRow}>
                      <Text style={styles.slabLabel}>
                        {l.fromRupees.toLocaleString('en-IN')}–{l.toRupees === null ? 'above' : l.toRupees.toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.slabRate}>{l.ratePercent}%</Text>
                      <Text style={styles.slabAmt}>{rupees(l.amountRupees)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </AnimatedCard>
          </Section>
        ) : null}

        {/* Loans */}
        <Section title="Loans & advances" icon="card-outline" count={data?.loans?.length ?? 0}>
          {(data?.loans ?? []).length === 0 ? (
            <EmptyState icon="card-outline" title="No loans or advances" message="Nothing is being recovered from this salary." />
          ) : (
            (data.loans ?? []).map((l) => {
              const tone = loanTone(l.status);
              return (
                <AnimatedCard key={l.id} style={{ marginBottom: 10 }}>
                  <View style={styles.loanHead}>
                    <Text style={styles.loanLabel}>{l.label}</Text>
                    <StatusChip label={tone.label} color={tone.color} bg={tone.bg} />
                  </View>
                  <Text style={styles.loanMeta}>
                    {LOAN_KIND_LABELS[l.kind] ?? l.kind} · granted {monthShort(l.grantedMonth)}
                  </Text>
                  <View style={styles.bar}>
                    <View style={[styles.barFill, { width: `${l.progressPercent}%`, backgroundColor: tone.color }]} />
                  </View>
                  <Row label="Outstanding" value={rupees(l.outstandingRupees)} tone={l.outstandingRupees > 0 ? '#d97706' : '#059669'} />
                  <Row label="Recovered of" value={`${rupees(l.recoveredRupees)} / ${rupees(l.principalRupees)}`} />
                  {l.installmentRupees > 0 ? <Row label="Monthly instalment" value={rupees(l.installmentRupees)} /> : null}
                  {l.recoveries?.length ? (
                    <Text style={styles.loanRecov}>
                      Recent: {l.recoveries.slice(0, 4).map((r) => `${monthShort(r.month)} ${rupees(r.amountRupees)}`).join(' · ')}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => navigation.openModule('PayrollLoans', { staffUserId })}
                  >
                    <Text style={styles.linkText}>Manage recoveries</Text>
                    <Ionicons name="chevron-forward" size={15} color={THEME} />
                  </TouchableOpacity>
                </AnimatedCard>
              );
            })
          )}
        </Section>

        {/* Attendance */}
        <Section title="Attendance" icon="calendar-outline" count={data?.attendance?.length ?? 0}>
          {(data?.attendance ?? []).length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No attendance recorded"
              message="Loss of pay has to come from somewhere. Record this person's attendance."
            />
          ) : (
            <AnimatedCard>
              {data.attendance.map((a) => {
                const tone = attendanceTone(a.presentPercent);
                return (
                  <View key={a.month} style={styles.attRow}>
                    <Text style={styles.attMonth}>{monthShort(a.month)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attDays}>
                        {a.presentDays} present · {a.paidLeaveDays} paid leave · {a.unpaidLeaveDays} unpaid
                      </Text>
                      <Text style={styles.attNote}>{a.note ?? '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.attPct, { color: tone.color }]}>{a.presentPercent}%</Text>
                      {a.lopDays > 0 ? <Text style={styles.attLop}>−{a.lopDays}d LOP</Text> : null}
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => navigation.openModule('PayrollAttendance', { staffUserId, month })}
              >
                <Text style={styles.linkText}>Record attendance</Text>
                <Ionicons name="chevron-forward" size={15} color={THEME} />
              </TouchableOpacity>
            </AnimatedCard>
          )}
        </Section>
      </ScrollView>

      {/* Raise sheet */}
      {raiseOpen ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setRaiseOpen(false)}>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheet}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={styles.sheetTitle}>{inForce ? 'Raise or revise salary' : 'Set salary'}</Text>
                <Text style={styles.sheetHint}>
                  This opens a new version and closes the current one. Payslips already
                  approved are never re-priced.
                </Text>

                <Text style={styles.fieldLabel}>Monthly gross (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={raiseOpen.monthlyGrossRupees}
                  onChangeText={(v) => setRaiseOpen({ ...raiseOpen, monthlyGrossRupees: v })}
                  keyboardType="numeric"
                  placeholder="60000"
                />

                <Text style={styles.fieldLabel}>Effective from</Text>
                <TextInput
                  style={styles.input}
                  value={raiseOpen.effectiveFrom}
                  onChangeText={(v) => setRaiseOpen({ ...raiseOpen, effectiveFrom: v })}
                  placeholder="2026-08-01"
                />

                <Text style={styles.fieldLabel}>Reason</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {SALARY_REASON_PRESETS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.chip, raiseOpen.reason === r && styles.chipOn]}
                      onPress={() => setRaiseOpen({ ...raiseOpen, reason: r })}
                    >
                      <Text style={[styles.chipText, raiseOpen.reason === r && styles.chipTextOn]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  style={styles.input}
                  value={raiseOpen.reason}
                  onChangeText={(v) => setRaiseOpen({ ...raiseOpen, reason: v })}
                  placeholder="Why is this changing?"
                />

                <Text style={styles.fieldLabel}>Note</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={raiseOpen.note}
                  onChangeText={(v) => setRaiseOpen({ ...raiseOpen, note: v })}
                  placeholder="Anything the next reader should know"
                  multiline
                />

                <View style={styles.sheetActions}>
                  <TouchableOpacity style={styles.btnGhost} onPress={() => setRaiseOpen(false)}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={submitRaise} disabled={busy || saving}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Save salary</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* FAB — the one action this screen exists to enable */}
      <TouchableOpacity style={styles.fab} onPress={openRaise} disabled={saving}>
        <Ionicons name={inForce ? 'trending-up' : 'add'} size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 90 },
  monthBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8 },
  monthBtn: { padding: 10 },
  monthCentre: { flex: 1, alignItems: 'center' },
  monthLabel: { fontWeight: '700', color: '#0f172a' },
  monthHint: { fontSize: 11, color: '#64748b' },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  errorText: { flex: 1, color: '#dc2626', fontSize: 13 },
  retry: { color: THEME, fontWeight: '700' },
  whoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontWeight: '700', color: THEME },
  name: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  nameSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  warnBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginTop: 12 },
  warnText: { flex: 1, fontSize: 12, color: '#b91c1c' },
  grossBox: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  grossLabel: { fontSize: 12, color: '#64748b' },
  grossValue: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  grossMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  setBy: { fontSize: 11, color: '#94a3b8' },
  section: { marginTop: 18 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.4 },
  sectionCount: { fontSize: 11, color: '#94a3b8' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowLabel: { fontSize: 13, color: '#475569' },
  rowValueWrap: { alignItems: 'flex-end' },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowSub: { fontSize: 11, color: '#94a3b8' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  linesBox: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lineLabel: { fontSize: 12, color: '#475569' },
  lineAmt: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  thinLine: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  compLabel: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  compFormula: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  compValue: { fontSize: 13, fontWeight: '700' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  linkText: { color: THEME, fontWeight: '700', fontSize: 13 },
  histRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  histLine: { width: 14, alignItems: 'center' },
  histDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  histStem: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginTop: 2 },
  histAmount: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  histWindow: { fontSize: 11, color: '#64748b' },
  histReason: { fontSize: 11, color: '#2563eb', marginTop: 2 },
  histNote: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  histComps: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  slabBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  slabRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  slabLabel: { fontSize: 11, color: '#64748b' },
  slabRate: { fontSize: 11, color: '#64748b', marginLeft: 8 },
  slabAmt: { fontSize: 11, fontWeight: '600', color: '#0f172a' },
  loanHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loanLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  loanMeta: { fontSize: 11, color: '#94a3b8', marginBottom: 8 },
  loanRecov: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
  bar: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: 6, borderRadius: 3 },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  attMonth: { fontSize: 12, fontWeight: '700', color: THEME, width: 52 },
  attDays: { fontSize: 12, color: '#334155' },
  attNote: { fontSize: 11, color: '#94a3b8' },
  attPct: { fontSize: 14, fontWeight: '700' },
  attLop: { fontSize: 10, color: '#d97706' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, maxHeight: '88%' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  sheetHint: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 14, color: '#0f172a', backgroundColor: '#fff',
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f1f5f9', marginRight: 6 },
  chipOn: { backgroundColor: '#dbeafe' },
  chipText: { fontSize: 12, color: '#475569' },
  chipTextOn: { color: THEME, fontWeight: '700' },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
  btnGhost: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  btnGhostText: { color: '#475569', fontWeight: '700' },
  btnPrimary: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: THEME, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  fab: {
    position: 'absolute', right: 18, bottom: 22, width: 56, height: 56, borderRadius: 28,
    backgroundColor: THEME, alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#0f172a', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
});