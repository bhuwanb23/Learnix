// F-09 Reports — department-wise financial report (docs/users/06 §3.8).
//
// Department spend and the salary bill are shown TOGETHER, because a department
// that looks cheap on claims alone is often the one carrying the largest payroll.
// Claims with no department are kept as an explicit "Institution-wide" row
// rather than dropped: a total that silently omits spend is a total nobody can
// reconcile against the expense statement.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { accountsApi } from '../../../../../../services/api';
import { THEME, GREEN, AMBER, SLATE, compactRupees, rupees, barWidth } from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportDepartments({ route }) {
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('departments', { period }),
    [period],
  );

  const totals = data?.totals ?? {};
  const departments = data?.departments ?? [];
  const combinedMax = Math.max(1, ...departments.map((d) => Math.abs(d.combinedRupees ?? 0)));

  const unattributed = departments.find((d) => d.id === 'institution-wide');

  return (
    <ReportScreen
      title="Department-wise"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'departments', period }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <AnimatedCard>
        <Text style={styles.heroLabel}>Total departmental cost</Text>
        <Text style={[styles.heroValue, { color: THEME }]}>{rupees(totals.combinedRupees ?? 0)}</Text>
        <View style={styles.heroFoot}>
          <Text style={styles.heroFootLabel}>
            {compactRupees(totals.expenseRupees ?? 0)} spend · {compactRupees(totals.payrollRupees ?? 0)} payroll
          </Text>
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell label="Departments" value={String(totals.departments ?? 0)} />
          <StatCell label="Payslips" value={String(totals.staffPaid ?? 0)} tone={GREEN} />
          <StatCell label="Unattributed spend" value={compactRupees(totals.unattributedRupees ?? 0)}
            tone={(totals.unattributedRupees ?? 0) > 0 ? AMBER : SLATE}
            hint="claims with no department" />
          <StatCell label="Payroll share" value={formatShare(totals)} tone={THEME}
            hint="payroll as a share of cost" />
        </StatGrid>
      </AnimatedCard>

      <Section title="By department" note="Two bars on one scale: claims and salaries.">
        {departments.length === 0 ? (
          <ReportEmpty icon="business-outline" title="No departments" subtitle="This institution has no departments set up." />
        ) : (
          departments.map((d) => (
            <AnimatedCard key={d.id} style={styles.dept}>
              <View style={styles.deptHead}>
                <View style={styles.deptNameCol}>
                  <Text style={styles.deptName} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.deptCode}>{d.code} · {d.claims ?? 0} claim{(d.claims ?? 0) === 1 ? '' : 's'}</Text>
                </View>
                <View style={styles.deptRight}>
                  <Text style={styles.deptTotal}>{rupees(d.combinedRupees ?? 0)}</Text>
                  <Text style={styles.deptShare}>{d.sharePercent ?? 0}% of spend</Text>
                </View>
              </View>

              <SplitBar
                expense={d.expenseRupees ?? 0}
                payroll={d.payrollRupees ?? 0}
                max={combinedMax}
              />

              <Text style={styles.deptMeta}>
                {compactRupees(d.expenseRupees ?? 0)} claims · {compactRupees(d.payrollRupees ?? 0)} payroll ·
                {' '}{d.staffPaid ?? 0} staff
                {d.costPerStaffRupees !== null && d.costPerStaffRupees !== undefined
                  ? ` · ${compactRupees(d.costPerStaffRupees)} cost per payslip`
                  : ' · no staff paid'}
              </Text>
            </AnimatedCard>
          ))
        )}
      </Section>

      {unattributed && (unattributed.expenseRupees ?? 0) > 0 ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>
            {compactRupees(unattributed.expenseRupees)} of approved spend belongs to no department
            and is listed under &apos;{unattributed.name}&apos;. Department totals plus that row
            equal the expense statement.
          </Text>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        Payroll is attributed by the department snapshotted onto each payslip entry, so a staff
        member who moved departments is counted where they were paid, not where they are now.
      </Text>
    </ReportScreen>
  );
}

/** Expense on top, payroll below — two colours, one scale, so the mix is visible. */
function SplitBar({ expense, payroll, max }) {
  const expenseW = barWidth(expense, max);
  const payrollW = barWidth(payroll, max);
  return (
    <View style={styles.split}>
      <View style={styles.splitTrack}>
        <View style={[styles.splitExpense, { width: expenseW }]} />
      </View>
      <View style={styles.splitTrack}>
        <View style={[styles.splitPayroll, { width: payrollW }]} />
      </View>
    </View>
  );
}

/** Payroll as a share of the whole cost — the number a HOD asks for. */
function formatShare(totals) {
  const combined = totals.combinedRupees ?? 0;
  if (!combined) return '—';
  const pct = Math.round(((totals.payrollRupees ?? 0) / combined) * 1000) / 10;
  return `${pct}%`;
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  heroFoot: { marginTop: 10 },
  heroFootLabel: { fontSize: 11, color: SLATE },

  dept: { marginBottom: 10 },
  deptHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  deptNameCol: { flex: 1 },
  deptName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  deptCode: { fontSize: 10, color: SLATE, marginTop: 1 },
  deptRight: { alignItems: 'flex-end' },
  deptTotal: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  deptShare: { fontSize: 10, color: SLATE },
  split: { marginTop: 8 },
  splitTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', overflow: 'hidden', marginBottom: 3 },
  splitExpense: { height: 6, borderRadius: 3, backgroundColor: AMBER },
  splitPayroll: { height: 6, borderRadius: 3, backgroundColor: GREEN },
  deptMeta: { fontSize: 10, color: SLATE, marginTop: 6 },

  warn: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, padding: 10, marginTop: 6,
  },
  warnText: { fontSize: 11, color: AMBER, lineHeight: 16 },

  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});