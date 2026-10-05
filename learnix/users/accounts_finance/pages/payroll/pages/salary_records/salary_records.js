// SALARY RECORDS — the roster, told honestly what each person is paid and why.
//
// This is the screen the feature was missing: a list of staff with a real,
// versioned salary behind each one, and an explicit flag on anyone payroll would
// silently SKIP. Before this, active staff with no salary simply did not appear in
// a run, and nothing on the desk said so.
//
// Each row carries the things that decide whether the number is right:
//   · the gross, and how many VERSIONS it has been through
//   · the effective date of the version in force
//   · this month's attendance and loss of pay, if recorded
//   · anything still being recovered from the salary
//   · "no salary record" for anyone payroll would skip
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SearchBar, SkeletonCard, SkeletonStatRow, StatusChip } from '../../../../../../components/ui';
import {
  THEME, rupees, compactRupees, monthLabel, shiftMonth, currentMonth,
  attendanceTone, effectiveDateLabel,
} from '../../payrollSalaryMeta';

export default function SalaryRecords({ navigation, route }) {
  const [month, setMonth] = useState(route?.params?.month ?? currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.salaryDesk(month));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const staff = data?.staff ?? [];
  const stats = data?.stats ?? {};

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return staff;
    return staff.filter((s) =>
      [s.staffName, s.employeeNo, s.designation, s.departmentName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [staff, q]);

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
    >
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => setMonth(shiftMonth(month, -1))} style={styles.monthBtn}>
          <Ionicons name="chevron-back" size={18} color={THEME} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
          <Text style={styles.monthHint}>{stats.staffCount} active staff</Text>
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
        <View style={styles.statRow}>
          <Stat label="On payroll" value={stats.onPayroll ?? 0} tone="#059669" />
          <Stat label="No salary" value={stats.missingSalary ?? 0} tone={stats.missingSalary ? '#dc2626' : '#64748b'} />
          <Stat label="Attendance in" value={stats.attendanceRecorded ?? 0} tone="#2563eb" />
        </View>
        <View style={styles.moneyRow}>
          <View>
            <Text style={styles.moneyLabel}>Monthly gross</Text>
            <Text style={styles.moneyValue}>{compactRupees(stats.totalGrossRupees)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.moneyLabel}>Recovered from loans</Text>
            <Text style={[styles.moneyValue, { color: stats.loanOutstandingRupees ? '#d97706' : '#059669' }]}>
              {compactRupees(stats.loanOutstandingRupees)}
            </Text>
          </View>
        </View>
      </AnimatedCard>

      {/* The red flag, stated plainly and separately */}
      {stats.missingSalary > 0 ? (
        <AnimatedCard style={styles.warnCard}>
          <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.warnTitle}>
              {stats.missingSalary} active {stats.missingSalary === 1 ? 'member has' : 'members have'} no salary
            </Text>
            <Text style={styles.warnBody}>
              Payroll skips anyone without a salary record. They are listed below so nobody
              is quietly left unpaid.
            </Text>
          </View>
        </AnimatedCard>
      ) : null}

      <View style={styles.searchWrap}>
        {/* `SearchBar` owns its input and debounces; it reports via onSearch. */}
        <SearchBar onSearch={setQ} placeholder="Search name, employee no, department" />
      </View>

      {shown.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={q ? 'Nobody matches that' : 'No staff yet'}
          message={q ? 'Try a different name or department.' : 'Active staff will appear here.'}
        />
      ) : (
        shown.map((s) => {
          const tone = attendanceTone(s.attendance.presentPercent);
          return (
            <AnimatedCard key={s.staffUserId} style={[styles.personCard, s.needsSalary && { borderColor: '#fecaca' }]}>
              <TouchableOpacity
                style={styles.personHead}
                onPress={() => navigation.openModule('PayrollSalaryRecord', { staffUserId: s.staffUserId, month })}
              >
                <View style={[styles.avatar, s.needsSalary && { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.avatarText, s.needsSalary && { color: '#dc2626' }]}>
                    {(s.staffName ?? '?').slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{s.staffName}</Text>
                  <Text style={styles.sub}>
                    {s.designation ?? 'Staff'}{s.departmentName ? ` · ${s.departmentName}` : ''}
                  </Text>
                  <Text style={styles.sub}>
                    {s.employeeNo ?? '—'}{s.bankAccountLast4 ? ` · ••••${s.bankAccountLast4}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {s.hasSalaryRecord ? (
                    <>
                      <Text style={styles.gross}>{compactRupees(s.monthlyGrossRupees)}</Text>
                      <Text style={styles.versionTag}>
                        v{s.versionCount} · from {s.effectiveFrom ? effectiveDateLabel(s.effectiveFrom) : '—'}
                      </Text>
                    </>
                  ) : (
                    <StatusChip label="No salary" color="#dc2626" bg="#fef2f2" icon="alert-circle" />
                  )}
                </View>
              </TouchableOpacity>

              {s.hasSalaryRecord ? (
                <View style={styles.metaRow}>
                  {s.components?.length ? (
                    <View style={styles.compWrap}>
                      {s.components.slice(0, 5).map((code) => (
                        <View key={code} style={styles.compChip}>
                          <Text style={styles.compChipText}>{code}</Text>
                        </View>
                      ))}
                      {s.components.length > 5 ? (
                        <View style={styles.compChip}>
                          <Text style={styles.compChipText}>+{s.components.length - 5}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.footRow}>
                <View style={styles.footItem}>
                  <Ionicons name="calendar-outline" size={12} color={s.attendance.recorded ? tone.color : '#cbd5e1'} />
                  <Text style={[styles.footText, s.attendance.recorded && { color: tone.color }]}>
                    {s.attendance.recorded
                      ? `${s.attendance.presentPercent}% present${s.attendance.lopDays ? ` · −${s.attendance.lopDays}d` : ''}`
                      : 'No attendance in'}
                  </Text>
                </View>
                {s.loanOutstandingRupees > 0 ? (
                  <View style={styles.footItem}>
                    <Ionicons name="card-outline" size={12} color="#d97706" />
                    <Text style={[styles.footText, { color: '#d97706' }]}>
                      {rupees(s.loanOutstandingRupees)} to recover
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => navigation.openModule('PayrollSalaryRecord', { staffUserId: s.staffUserId, month })}
                >
                  <Text style={styles.openText}>Open</Text>
                  <Ionicons name="chevron-forward" size={14} color={THEME} />
                </TouchableOpacity>
              </View>
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

const Stat = ({ label, value, tone }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 40 },
  monthBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, marginBottom: 12 },
  monthBtn: { padding: 10 },
  monthLabel: { fontWeight: '700', color: '#0f172a' },
  monthHint: { fontSize: 11, color: '#64748b' },
  statRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  moneyLabel: { fontSize: 11, color: '#94a3b8' },
  moneyValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 1 },
  warnCard: { marginTop: 12, flexDirection: 'row', gap: 10, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  warnTitle: { fontSize: 13, fontWeight: '700', color: '#b91c1c' },
  warnBody: { fontSize: 11, color: '#b91c1c', marginTop: 2, lineHeight: 15 },
  searchWrap: { marginVertical: 12 },
  personCard: { marginBottom: 10 },
  personHead: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700', color: THEME },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 11, color: '#94a3b8' },
  gross: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  versionTag: { fontSize: 10, color: '#94a3b8' },
  metaRow: { marginTop: 10 },
  compWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  compChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: '#f1f5f9' },
  compChipText: { fontSize: 10, color: '#475569' },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footText: { fontSize: 11, color: '#94a3b8' },
  openBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { fontSize: 12, color: THEME, fontWeight: '700' },
});