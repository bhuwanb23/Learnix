// F-09 Reports — payroll report (docs/users/06 §3.8).
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import {
  THEME, RED, AMBER, SLATE, compactRupees, rupees, barWidth, integrityNote,
} from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, BarRow, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportPayroll({ route }) {
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('payroll', { period }),
    [period],
  );

  const totals = data?.totals ?? {};
  const runs = data?.runs ?? [];
  const lines = data?.deductionLines ?? [];
  const trend = data?.trend ?? [];
  const note = integrityNote(data?.integrity);

  const lineMax = Math.max(1, ...lines.map((l) => Math.abs(l.amountRupees)));
  const netMax = Math.max(1, ...runs.map((r) => Math.abs(r.netRupees)));

  return (
    <ReportScreen
      title="Payroll report"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'payroll', period }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <AnimatedCard>
        <Text style={styles.heroLabel}>Net paid</Text>
        <Text style={[styles.heroValue, { color: THEME }]}>{rupees(totals.netRupees ?? 0)}</Text>
        <View style={styles.heroFoot}>
          <Text style={styles.heroFootLabel}>
            {compactRupees(totals.grossRupees ?? 0)} gross · {compactRupees(totals.deductionsRupees ?? 0)} deducted
          </Text>
        </View>
      </AnimatedCard>

      {/* The caveat leads, not trails. A run whose header disagrees with its
          entries means the number above is being reported without corroboration,
          and that has to be visible before the figure is quoted to anyone. */}
      {note ? (
        <View style={styles.warn}>
          <Ionicons name="alert-circle-outline" size={16} color={AMBER} />
          <Text style={styles.warnText}>{note} The totals above are summed from the entries, which
            is why they may not match the run headers.</Text>
        </View>
      ) : null}

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell label="Runs" value={String(totals.runs ?? 0)}
            hint={`${totals.entries ?? 0} payslips`} />
          <StatCell label="Headcount" value={String(totals.entries ?? 0)}
            hint={totals.averageGrossRupees ? `avg ${compactRupees(totals.averageGrossRupees)} gross` : undefined} />
          <StatCell label="Loss-of-pay days" value={String(totals.lossOfPayDays ?? 0)}
            tone={(totals.lossOfPayDays ?? 0) > 0 ? AMBER : SLATE} />
          <StatCell label="Deduction rate"
            value={totals.deductionRatePercent === null || totals.deductionRatePercent === undefined
              ? '—'
              : `${totals.deductionRatePercent}%`}
            tone={AMBER}
            hint="of gross" />
        </StatGrid>
      </AnimatedCard>

      <Section title="Deductions" note="What came out of the gross, and why.">
        {lines.length === 0 ? (
          <ReportEmpty icon="card-outline" title="No deductions" subtitle="Nothing was deducted in this window." />
        ) : (
          <AnimatedCard>
            {lines.map((l) => (
              <BarRow
                key={l.label}
                label={l.label}
                value={l.amountRupees}
                max={lineMax}
                color={AMBER}
                right={`${compactRupees(l.amountRupees)} · ${l.count} staff · ${l.sharePercent ?? 0}%`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Run by run" note="Gross − deductions = net, for every row.">
        {runs.length === 0 ? (
          <ReportEmpty icon="calendar-outline" title="No runs" subtitle="No payroll was run in this window." />
        ) : (
          <AnimatedCard>
            {runs.map((run) => (
              <View key={run.month} style={styles.run}>
                <View style={styles.runHead}>
                  <Text style={styles.runMonth}>{run.label ?? run.month}</Text>
                  <View style={styles.runRight}>
                    <Text style={styles.runNet}>{rupees(run.netRupees ?? 0)}</Text>
                    <Text style={styles.runStatus}>{run.status}</Text>
                  </View>
                </View>
                <View style={styles.runTrack}>
                  <View style={[styles.runFill, { width: barWidth(run.netRupees, netMax), backgroundColor: THEME }]} />
                </View>
                <Text style={styles.runMeta}>
                  {compactRupees(run.grossRupees ?? 0)} gross · {compactRupees(run.deductionsRupees ?? 0)} deducted ·{' '}
                  {run.headcount ?? 0} staff
                </Text>
                {run.footsToEntries === false ? (
                  <View style={styles.runBad}>
                    <Ionicons name="warning-outline" size={12} color={RED} />
                    <Text style={styles.runBadText}>This run&apos;s header does not match its entries</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Net paid over time">
        {trend.length === 0 ? (
          <ReportEmpty icon="trending-up-outline" title="Nothing to plot" subtitle="No payroll in this window." />
        ) : (
          <AnimatedCard>
            {trend.map((t) => (
              <BarRow
                key={t.month}
                label={t.label}
                value={t.netRupees}
                max={Math.max(1, ...trend.map((x) => Math.abs(x.netRupees)))}
                color={THEME}
                right={`${compactRupees(t.netRupees)} · ${t.headcount ?? 0} staff`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Text style={styles.footnote}>
        Totals are summed from payslip entries, never read off a run header. Where the two
        disagree, this screen says so on the row rather than quietly picking one.
      </Text>
    </ReportScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  heroFoot: { marginTop: 10 },
  heroFootLabel: { fontSize: 11, color: SLATE },

  warn: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 12,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, padding: 10,
  },
  warnText: { flex: 1, fontSize: 11, color: AMBER, fontWeight: '600', lineHeight: 16 },

  run: { marginBottom: 14 },
  runHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  runMonth: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  runRight: { alignItems: 'flex-end' },
  runNet: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  runStatus: { fontSize: 9, color: SLATE, fontWeight: '700' },
  runTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', overflow: 'hidden', marginTop: 6 },
  runFill: { height: 6, borderRadius: 3 },
  runMeta: { fontSize: 10, color: SLATE, marginTop: 5 },
  runBad: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  runBadText: { fontSize: 10, color: RED, fontWeight: '700' },

  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});