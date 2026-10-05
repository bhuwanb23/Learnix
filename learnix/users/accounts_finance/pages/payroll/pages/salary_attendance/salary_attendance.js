// ATTENDANCE for one staff member and one month — the only source a payslip's
// loss-of-pay line may come from.
//
// This screen exists because loss of pay used to be a number typed into a box.
// That is not a calculation, it is an assertion: nobody could say where it came
// from, and an employee told their net was short had no way to challenge it.
//
// So the flow is deliberately DERIVE → REVIEW → SAVE:
//   · the server reads approved leave, clips it to this month, and separates paid
//     from unpaid types
//   · only APPROVED leave counts — a pending request must never cost anybody money
//   · absence inside the grace period is not charged, and the screen says so
//   · the officer can lower the figure (a half day) but never raise it beyond what
//     the attendance supports; the server refuses that, and so does this form
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, StatusChip } from '../../../../../../components/ui';
import {
  THEME, monthLabel, monthShort, shiftMonth, currentMonth, daysInMonth,
  attendanceTone, isPaidLeaveType, LEAVE_TYPE_LABELS, ATTENDANCE_GRACE_DAYS,
} from '../../payrollSalaryMeta';

export default function SalaryAttendance({ navigation, route }) {
  const staffUserId = route?.params?.staffUserId;
  const [month, setMonth] = useState(route?.params?.month ?? currentMonth());
  const [person, setPerson] = useState(null);
  const [derived, setDerived] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [salary, att] = await Promise.all([
        accountsApi.staffSalary(staffUserId, month),
        accountsApi.staffAttendance(staffUserId, month, daysInMonth(month)),
      ]);
      setPerson(salary);
      setDerived(att);
      const saved = (salary?.attendance ?? []).find((a) => a.month === month);
      setForm({
        workingDays: saved?.workingDays ?? att.workingDays,
        presentDays: saved?.presentDays ?? att.presentDays,
        paidLeaveDays: saved?.paidLeaveDays ?? att.paidLeaveDays,
        unpaidLeaveDays: saved?.unpaidLeaveDays ?? att.unpaidLeaveDays,
        lopDays: saved?.lopDays ?? att.lopDays,
        note: saved?.note ?? '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffUserId, month]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  /** Recompute the loss-of-pay preview as the officer types, using the server's rule. */
  const preview = useCallback(() => {
    if (!form) return null;
    const wd = Number(form.workingDays) || 0;
    const paid = Number(form.paidLeaveDays) || 0;
    const unpaid = Number(form.unpaidLeaveDays) || 0;
    const present = Number(form.presentDays) || 0;
    const absent = Math.max(0, wd - present - paid - unpaid);
    const raw = Math.min(wd, unpaid + absent);
    const withinGrace = raw > 0 && raw <= ATTENDANCE_GRACE_DAYS;
    const maxLop = withinGrace ? 0 : raw;
    return { absent, raw, withinGrace, maxLop, presentPercent: wd ? Math.round((present / wd) * 100) : 0 };
  }, [form]);

  const save = async () => {
    setSaving(true);
    try {
      await accountsApi.saveAttendance(staffUserId, month, {
        workingDays: Number(form.workingDays),
        presentDays: Number(form.presentDays),
        paidLeaveDays: Number(form.paidLeaveDays),
        unpaidLeaveDays: Number(form.unpaidLeaveDays),
        lopDays: Number(form.lopDays),
        note: form.note.trim() || null,
      });
      await load();
      Alert.alert('Attendance saved', 'The next payroll for this month will use these numbers.');
    } catch (err) {
      Alert.alert('Could not save', err.message);
    } finally {
      setSaving(false);
    }
  };

  const useDerived = () => {
    if (!derived) return;
    setForm({
      workingDays: derived.workingDays,
      presentDays: derived.presentDays,
      paidLeaveDays: derived.paidLeaveDays,
      unpaidLeaveDays: derived.unpaidLeaveDays,
      lopDays: derived.lopDays,
      note: form.note,
    });
  };

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonCard />
      </ScrollView>
    );
  }

  const p = preview();
  const lopTooHigh = form && p && Number(form.lopDays) > p.maxLop;
  const tone = attendanceTone(p?.presentPercent ?? 0);

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
            <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
            <Text style={styles.monthHint}>{person?.staff?.staffName}</Text>
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

        {/* What the LEAVE TABLE says — the derivation, before anyone touches it */}
        <AnimatedCard>
          <View style={styles.cardHead}>
            <Ionicons name="git-compare-outline" size={16} color={THEME} />
            <Text style={styles.cardTitle}>Derived from approved leave</Text>
          </View>
          {derived ? (
            <>
              <Text style={styles.basis}>{derived.basis}</Text>
              <View style={styles.deriveRow}>
                <Text style={styles.deriveLabel}>Paid leave</Text>
                <Text style={styles.deriveValue}>{derived.paidLeaveDays} day{derived.paidLeaveDays === 1 ? '' : 's'}</Text>
              </View>
              <View style={styles.deriveRow}>
                <Text style={styles.deriveLabel}>Unpaid leave</Text>
                <Text style={[styles.deriveValue, { color: derived.unpaidLeaveDays ? '#dc2626' : '#059669' }]}>
                  {derived.unpaidLeaveDays} day{derived.unpaidLeaveDays === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.deriveRow}>
                <Text style={styles.deriveLabel}>Loss of pay (derived)</Text>
                <Text style={[styles.deriveValue, { color: derived.lopDays ? '#d97706' : '#059669' }]}>
                  {derived.lopDays} day{derived.lopDays === 1 ? '' : 's'}
                </Text>
              </View>
              {derived.withinGrace ? (
                <View style={styles.okBox}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
                  <Text style={styles.okText}>
                    Inside the {ATTENDANCE_GRACE_DAYS}-day grace — this absence is not charged.
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.deriveBtn} onPress={useDerived}>
                <Text style={styles.deriveBtnText}>Use these numbers</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </AnimatedCard>

        {/* The source rows, so a person can be shown the evidence */}
        {derived?.leaves?.length ? (
          <AnimatedCard style={{ marginTop: 12 }}>
            <Text style={styles.cardTitle}>Leave records this month</Text>
            <Text style={styles.cardSub}>
              Only APPROVED requests count. A leave that spans two months is split at the boundary.
            </Text>
            {derived.leaves.map((l) => {
              const paid = isPaidLeaveType(l.type);
              return (
                <View key={l.id} style={styles.leaveRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.leaveType}>{LEAVE_TYPE_LABELS[l.type] ?? l.type}</Text>
                    <Text style={styles.leaveDates}>{l.fromDate} → {l.toDate} · {l.days} day{l.days === 1 ? '' : 's'}</Text>
                    {l.reason ? <Text style={styles.leaveReason}>{l.reason}</Text> : null}
                  </View>
                  <StatusChip
                    label={l.status === 'APPROVED' ? (paid ? 'Paid' : 'Unpaid') : l.status}
                    color={l.status !== 'APPROVED' ? '#64748b' : paid ? '#059669' : '#dc2626'}
                    bg={l.status !== 'APPROVED' ? '#f1f5f9' : paid ? '#f0fdf4' : '#fef2f2'}
                  />
                </View>
              );
            })}
          </AnimatedCard>
        ) : (
          <AnimatedCard style={{ marginTop: 12 }}>
            <EmptyState
              icon="calendar-clear-outline"
              title="No leave recorded"
              message="Approved leave for this month would appear here automatically."
            />
          </AnimatedCard>
        )}

        {/* What payroll will actually do */}
        {form ? (
          <AnimatedCard style={{ marginTop: 12 }}>
            <Text style={styles.cardTitle}>Attendance for {monthShort(month)}</Text>

            {[
              ['workingDays', 'Working days in the month'],
              ['presentDays', 'Days present'],
              ['paidLeaveDays', 'Paid leave days'],
              ['unpaidLeaveDays', 'Unpaid leave days'],
            ].map(([key, label]) => (
              <View key={key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={String(form[key] ?? 0)}
                  onChangeText={(v) => setForm({ ...form, [key]: v.replace(/[^0-9]/g, '') })}
                  keyboardType="numeric"
                />
              </View>
            ))}

            <View style={styles.divider} />

            {p ? (
              <>
                <View style={styles.deriveRow}>
                  <Text style={styles.deriveLabel}>Days present</Text>
                  <Text style={[styles.deriveValue, { color: tone.color }]}>{p.presentPercent}%</Text>
                </View>
                <View style={styles.deriveRow}>
                  <Text style={styles.deriveLabel}>Unaccounted days</Text>
                  <Text style={styles.deriveValue}>{p.absent}</Text>
                </View>
                <View style={styles.deriveRow}>
                  <Text style={styles.deriveLabel}>Chargeable absence</Text>
                  <Text style={[styles.deriveValue, { color: p.maxLop ? '#d97706' : '#059669' }]}>
                    {p.maxLop} day{p.maxLop === 1 ? '' : 's'}
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Loss of pay to charge</Text>
              <TextInput
                style={[styles.fieldInput, lopTooHigh && { borderColor: '#dc2626' }]}
                value={String(form.lopDays ?? 0)}
                onChangeText={(v) => setForm({ ...form, lopDays: v.replace(/[^0-9]/g, '') })}
                keyboardType="numeric"
              />
            </View>
            {lopTooHigh ? (
              <View style={styles.warnBox}>
                <Ionicons name="warning-outline" size={14} color="#dc2626" />
                <Text style={styles.warnText}>
                  The attendance only supports {p.maxLop} day{p.maxLop === 1 ? '' : 's'}. You may
                  reduce this (a half day) but not raise it.
                </Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 56, textAlignVertical: 'top' }]}
              value={form.note ?? ''}
              onChangeText={(v) => setForm({ ...form, note: v })}
              placeholder="Where did these numbers come from?"
              multiline
            />
          </AnimatedCard>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, (saving || lopTooHigh) && { opacity: 0.5 }]}
          onPress={save}
          disabled={saving || lopTooHigh}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save attendance</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 100 },
  monthBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, marginBottom: 12 },
  monthBtn: { padding: 10 },
  monthLabel: { fontWeight: '700', color: '#0f172a' },
  monthHint: { fontSize: 11, color: '#64748b' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 6 },
  basis: { fontSize: 12, color: '#475569', marginBottom: 10 },
  deriveRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  deriveLabel: { fontSize: 13, color: '#475569' },
  deriveValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  okBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: '#f0fdf4', padding: 9, borderRadius: 8 },
  okText: { flex: 1, fontSize: 12, color: '#047857' },
  deriveBtn: { marginTop: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: '#eff6ff', alignItems: 'center' },
  deriveBtnText: { color: THEME, fontWeight: '700', fontSize: 13 },
  leaveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  leaveType: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  leaveDates: { fontSize: 11, color: '#64748b' },
  leaveReason: { fontSize: 11, color: '#94a3b8' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  fieldLabel: { flex: 1, fontSize: 13, color: '#475569' },
  fieldInput: { width: 90, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: '#0f172a', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },
  warnBox: { flexDirection: 'row', gap: 6, backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginTop: 8 },
  warnText: { flex: 1, fontSize: 12, color: '#b91c1c' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { paddingVertical: 12, borderRadius: 10, backgroundColor: THEME, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});