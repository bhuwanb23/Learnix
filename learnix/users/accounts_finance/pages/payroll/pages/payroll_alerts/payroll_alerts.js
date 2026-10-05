// PENDING SALARY ALERTS — what the desk is late on, with an AGE on each item.
//
// The hub used to print "₹4,62,000 outstanding" and leave the officer to work out
// whether that was last week's problem or last year's. An amount without a date is
// not actionable: transferring the money and chasing a person are different jobs,
// and only the age tells them apart.
//
// Every alert here carries what is wrong, how long it has been wrong, how much
// money it is, and which screen fixes it. The thresholds come from the server
// (`ALERT_RULES`) and are shown on this screen, because a desk that cannot see
// why something flagged should not have to guess.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../../../components/ui';
import {
  THEME, rupees, compactRupees, monthShort,
  alertSeverityMeta, alertKindMeta,
} from '../../payrollSalaryMeta';

export default function PayrollAlerts({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.payrollAlerts());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  /** Where a given alert takes the officer. Falling back to the run keeps an
   *  alert useful even when the thing it wants (a salary) is set elsewhere. */
  const openAlert = (a) => {
    if (a.runId) {
      navigation.openModule('PayrollRunDetail', { runId: a.runId });
    } else if (a.kind === 'NO_SALARY_RECORD') {
      navigation.openModule('PayrollSalaryRecords', { focusStaffUserId: a.id.replace('nosalary-', '') });
    } else {
      navigation.openModule('PayrollSalaryRecords', {});
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
      </ScrollView>
    );
  }

  const counts = data?.counts ?? { high: 0, medium: 0, low: 0, total: 0 };
  const all = data?.alerts ?? [];
  const shown = filter === 'ALL' ? all : all.filter((a) => a.severity === filter);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME} />}
    >
      {error ? (
        <AnimatedCard style={{ marginBottom: 12 }}>
          <Text style={{ color: '#dc2626' }}>{error}</Text>
        </AnimatedCard>
      ) : null}

      {/* The headline is PEOPLE, not rupees. An outstanding amount is only
          urgent because somebody has not been paid. */}
      <AnimatedCard>
        <Text style={styles.headLabel}>{counts.total ? 'Salaries still to move' : 'Everything is up to date'}</Text>
        <Text style={[styles.headValue, { color: counts.high ? '#dc2626' : counts.total ? '#d97706' : '#059669' }]}>
          {counts.total === 0 ? 'Nothing pending' : `${counts.total} item${counts.total === 1 ? '' : 's'}`}
        </Text>
        {counts.total > 0 ? (
          <Text style={styles.headSub}>{rupees(data.totalRupees)} outstanding across these</Text>
        ) : null}
        <View style={styles.chipRow}>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((f) => {
            const n = f === 'ALL' ? counts.total : f === 'HIGH' ? counts.high : f === 'MEDIUM' ? counts.medium : counts.low;
            const on = filter === f;
            return (
              <TouchableOpacity key={f} style={[styles.filterChip, on && styles.filterChipOn]} onPress={() => setFilter(f)}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>
                  {f === 'ALL' ? 'All' : f === 'HIGH' ? 'Act now' : f === 'MEDIUM' ? 'Soon' : 'Info'} {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </AnimatedCard>

      {/* The thresholds, so a flag is never a mystery */}
      {data?.rules ? (
        <AnimatedCard style={{ marginTop: 12 }}>
          <View style={styles.rulesHead}>
            <Ionicons name="tune-outline" size={14} color="#64748b" />
            <Text style={styles.rulesTitle}>When this desk flags something</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Approved and unpaid for more than</Text>
            <Text style={styles.ruleValue}>{data.rules.overdueDays} days</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Draft run left open for more than</Text>
            <Text style={styles.ruleValue}>{data.rules.staleDraftDays} days</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Loan with no recovery for</Text>
            <Text style={styles.ruleValue}>{data.rules.stalledLoanMonths} months</Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleLabel}>Absence under</Text>
            <Text style={styles.ruleValue}>{data.rules.graceUnpaidDays} days is not charged</Text>
          </View>
        </AnimatedCard>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          title={filter === 'ALL' ? 'Nothing outstanding' : 'Nothing at this level'}
          message={filter === 'ALL' ? 'Every approved run is paid and every active member has a salary.' : 'Try another filter.'}
        />
      ) : (
        shown.map((a) => {
          const sev = alertSeverityMeta(a.severity);
          const kind = alertKindMeta(a.kind);
          return (
            <AnimatedCard key={a.id} style={[styles.alertCard, { borderLeftColor: sev.color }]}>
              <View style={styles.alertHead}>
                <View style={[styles.alertIcon, { backgroundColor: sev.bg }]}>
                  <Ionicons name={kind.icon} size={16} color={sev.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{a.title}</Text>
                  <Text style={styles.alertKind}>{kind.label} · {sev.label}</Text>
                </View>
                {a.amountRupees > 0 ? (
                  <Text style={[styles.alertAmount, { color: sev.color }]}>{compactRupees(a.amountRupees)}</Text>
                ) : null}
              </View>

              <Text style={styles.alertDetail}>{a.detail}</Text>

              <View style={styles.alertFoot}>
                <View style={styles.alertMetaRow}>
                  {a.month ? (
                    <Ionicons name="calendar-outline" size={11} color="#94a3b8" />
                  ) : null}
                  <Text style={styles.alertMeta}>
                    {a.month ? monthShort(a.month) : a.staffName ?? '—'}
                    {a.daysWaiting !== null && a.daysWaiting !== undefined
                      ? ` · ${a.daysWaiting} day${a.daysWaiting === 1 ? '' : 's'}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity style={styles.actBtn} onPress={() => openAlert(a)}>
                  <Text style={styles.actText}>{a.action}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 14, paddingBottom: 40 },
  headLabel: { fontSize: 12, color: '#64748b' },
  headValue: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  headSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  filterChipOn: { backgroundColor: '#dbeafe' },
  filterText: { fontSize: 11, color: '#475569' },
  filterTextOn: { color: THEME, fontWeight: '700' },
  rulesHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  rulesTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  ruleLabel: { fontSize: 12, color: '#64748b' },
  ruleValue: { fontSize: 12, fontWeight: '700', color: '#334155' },
  alertCard: { marginTop: 12, borderLeftWidth: 4 },
  alertHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  alertKind: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  alertAmount: { fontSize: 15, fontWeight: '800' },
  alertDetail: { fontSize: 12, color: '#475569', marginTop: 8, lineHeight: 17 },
  alertFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  alertMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertMeta: { fontSize: 11, color: '#94a3b8' },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actText: { fontSize: 12, color: THEME, fontWeight: '700' },
});