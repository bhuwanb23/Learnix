// F-09 Reports — monthly / semester / yearly comparison (docs/users/06 §3.8).
//
// The window is always the last twelve months. "Monthly", "quarterly" and
// "yearly" choose how each BAR is grouped — they do not change how many bars
// there are, and the screen says so rather than letting someone think switching
// to "yearly" gave them three years of history.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { accountsApi } from '../../../../../../services/api';
import {
  THEME, GREEN, RED, AMBER, SLATE, compactRupees, rupees, changePhrase, changeColor,
  GRANULARITIES, barWidth, inflowColor,
} from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, BarRow, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportComparison({ route }) {
  // The comparison is a run of periods, so it has no MONTH/QUARTER/YEAR/ALL
  // selector of its own — it opens in the window the user last chose elsewhere
  // and honours it, then offers the grouping the report actually varies. The
  // chips say how many bars each choice produces, because a control that silently
  // re-scaled the chart would be indistinguishable from one that did nothing.
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const [granularity, setGranularity] = useState('MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('comparison', { period, granularity }),
    [period, granularity],
  );

  const totals = data?.totals ?? {};
  const series = data?.series ?? {};
  const cash = series.cash ?? [];

  const cashMax = Math.max(1, ...cash.flatMap((c) => [c.collectedRupees, c.spentRupees]));
  const collectedMax = Math.max(1, ...(series.collected ?? []).map((c) => Math.abs(c.amountRupees)));

  return (
    <ReportScreen
      title="Period comparison"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'comparison', period, granularity, label: 'Export series' }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <View style={styles.granularityWrap}>
        <Text style={styles.granularityLabel}>Group each bar by</Text>
        <View style={styles.granularityRow}>
          {GRANULARITIES.map((g) => {
            const active = g.id === granularity;
            return (
              <TouchableOpacity
                key={g.id}
                onPress={() => setGranularity(g.id)}
                activeOpacity={0.8}
                style={[styles.gChip, active && styles.gChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.gText, active && styles.gTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.granularityHint}>
          Always the last {data?.months ?? 12} months, bucketed {GRANULARITIES.find((x) => x.id === granularity)?.hint ?? ''}
          {' '}Grouping changes the bars, never the totals.
        </Text>
      </View>

      <AnimatedCard>
        <Text style={styles.heroLabel}>Surplus over {data?.months ?? 12} months</Text>
        <Text style={[styles.heroValue, { color: inflowColor(totals.surplusRupees ?? 0) }]}>
          {rupees(totals.surplusRupees ?? 0)}
        </Text>
        <View style={styles.heroFoot}>
          <Text style={styles.heroFootLabel}>
            {compactRupees(totals.collectedRupees ?? 0)} in ·
            {' '}{compactRupees(totals.spentRupees ?? 0)} out ·
            {' '}{compactRupees(totals.payrollRupees ?? 0)} payroll
          </Text>
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell label="Collected" value={compactRupees(totals.collectedRupees ?? 0)} tone={GREEN}
            hint={`avg ${compactRupees(totals.averageCollectedRupees ?? 0)}`} />
          <StatCell label="Spent" value={compactRupees(totals.spentRupees ?? 0)} tone={AMBER}
            hint={`avg ${compactRupees(totals.averageSpentRupees ?? 0)}`} />
          <StatCell label="Net (before payroll)" value={rupees(totals.netRupees ?? 0)}
            tone={inflowColor(totals.netRupees ?? 0)} />
          <StatCell label="Scholarship released" value={compactRupees(totals.scholarshipsReleasedRupees ?? 0)}
            tone={THEME} />
        </StatGrid>
      </AnimatedCard>

      {(data?.best || data?.worst) ? (
        <AnimatedCard style={styles.card}>
          <View style={styles.extremes}>
            <View style={styles.extreme}>
              <Text style={styles.extremeLabel}>Best collection</Text>
              <Text style={[styles.extremeValue, { color: GREEN }]}>
                {data.best ? `${compactRupees(data.best.amountRupees)} · ${data.best.label}` : '—'}
              </Text>
            </View>
            <View style={styles.extreme}>
              <Text style={styles.extremeLabel}>Worst collection</Text>
              <Text style={[styles.extremeValue, { color: RED }]}>
                {data.worst ? `${compactRupees(data.worst.amountRupees)} · ${data.worst.label}` : '—'}
              </Text>
            </View>
          </View>
        </AnimatedCard>
      ) : null}

      <Section title="Money in and out" note="Both series on one scale, per period.">
        {cash.length === 0 ? (
          <ReportEmpty icon="trending-up-outline" title="Nothing to compare" subtitle="No activity in the last twelve months." />
        ) : (
          <AnimatedCard>
            {cash.map((c) => (
              <View key={c.month} style={styles.cashRow}>
                <View style={styles.cashHead}>
                  <Text style={styles.cashLabel}>{c.label}</Text>
                  <Text style={[styles.cashNet, { color: inflowColor(c.netRupees) }]}>
                    {c.netRupees > 0 ? '+' : ''}{compactRupees(c.netRupees)}
                  </Text>
                </View>
                <View style={styles.cashTrack}>
                  <View style={[styles.cashIn, { width: barWidth(c.collectedRupees, cashMax) }]} />
                </View>
                <View style={styles.cashTrack}>
                  <View style={[styles.cashOut, { width: barWidth(c.spentRupees, cashMax) }]} />
                </View>
                <Text style={styles.cashMeta}>
                  {compactRupees(c.collectedRupees)} in · {compactRupees(c.spentRupees)} out
                </Text>
              </View>
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Collections over time">
        {(series.collected ?? []).length === 0 ? (
          <ReportEmpty icon="cash-outline" title="No collections" subtitle="Nothing was collected in the last twelve months." />
        ) : (
          <AnimatedCard>
            {series.collected.map((c) => (
              <BarRow
                key={c.month}
                label={c.label}
                value={c.amountRupees}
                max={collectedMax}
                color={GREEN}
                right={`${compactRupees(c.amountRupees)} · ${changePhrase(c.changePercent, 'the period before')}`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Payroll over time" note="Months with no run are shown, not skipped.">
        {(series.payroll ?? []).length === 0 ? (
          <ReportEmpty icon="card-outline" title="No payroll" subtitle="No runs in the last twelve months." />
        ) : (
          <AnimatedCard>
            {series.payroll.map((p) => (
              <View key={p.month} style={styles.payrollRow}>
                <Text style={styles.payrollLabel}>{p.label}</Text>
                <Text style={[styles.payrollValue, { color: p.hasRun ? THEME : '#cbd5e1' }]}>
                  {p.hasRun ? rupees(p.netRupees) : 'No run'}
                </Text>
                <Text style={[styles.payrollChange, { color: changeColor(p.changePercent) }]}>
                  {p.hasRun ? changePhrase(p.changePercent, 'the run before') : 'nothing to compare'}
                </Text>
              </View>
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Text style={styles.footnote}>
        Surplus is collections minus approved spend minus net payroll — the three things that
        actually move cash. Scholarship releases are shown separately because they are already
        inside collections, and counting them twice would overstate the position.
      </Text>
    </ReportScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  heroFoot: { marginTop: 10 },
  heroFootLabel: { fontSize: 11, color: SLATE, lineHeight: 16 },

  granularityWrap: { marginBottom: 14 },
  granularityLabel: { fontSize: 11, color: SLATE, marginBottom: 6 },
  granularityRow: { flexDirection: 'row', gap: 8 },
  gChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6ebf2',
  },
  gChipActive: { backgroundColor: THEME, borderColor: THEME },
  gText: { fontSize: 11, fontWeight: '700', color: SLATE },
  gTextActive: { color: '#fff' },
  granularityHint: { fontSize: 10, color: SLATE, marginTop: 6 },

  extremes: { flexDirection: 'row', gap: 12 },
  extreme: { flex: 1 },
  extremeLabel: { fontSize: 10, color: SLATE },
  extremeValue: { fontSize: 13, fontWeight: '800', marginTop: 2 },

  cashRow: { marginBottom: 12 },
  cashHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cashLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  cashNet: { fontSize: 12, fontWeight: '800' },
  cashTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', overflow: 'hidden', marginTop: 4 },
  cashIn: { height: 6, borderRadius: 3, backgroundColor: GREEN },
  cashOut: { height: 6, borderRadius: 3, backgroundColor: AMBER },
  cashMeta: { fontSize: 10, color: SLATE, marginTop: 5 },

  payrollRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  payrollLabel: { width: 54, fontSize: 12, fontWeight: '700', color: '#0f172a' },
  payrollValue: { flex: 1, fontSize: 12, fontWeight: '700' },
  payrollChange: { fontSize: 10, maxWidth: 130, textAlign: 'right' },

  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});