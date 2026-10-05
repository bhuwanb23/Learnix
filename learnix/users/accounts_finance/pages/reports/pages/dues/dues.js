// F-09 Reports — outstanding dues report (docs/users/06 §3.8).
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { accountsApi } from '../../../../../../services/api';
import { THEME, GREEN, RED, AMBER, SLATE, compactRupees, rupees, agingColor, barWidth } from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, BarRow, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportDues({ route }) {
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('dues', { period }),
    [period],
  );

  const totals = data?.totals ?? {};
  const aging = data?.aging ?? [];
  const topDebtors = data?.topDebtors ?? [];
  const inPeriod = data?.collectedInPeriod ?? null;

  const agingMax = Math.max(1, ...aging.map((b) => Math.abs(b.amountRupees)));
  const debtorMax = Math.max(1, ...topDebtors.map((d) => Math.abs(d.amountRupees)));

  // Outstanding is what is LEFT, never what was billed. Showing the bill next to
  // the balance is what makes the difference legible instead of surprising.
  const balanceOfBilled = (totals.billedRupees ?? 0) - (totals.outstandingRupees ?? 0);

  return (
    <ReportScreen
      title="Outstanding dues"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'dues', period }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <AnimatedCard>
        <Text style={styles.heroLabel}>Still owing</Text>
        <Text style={[styles.heroValue, { color: RED }]}>{rupees(totals.outstandingRupees ?? 0)}</Text>
        <View style={styles.heroFoot}>
          <Text style={styles.heroFootLabel}>across {totals.openBills ?? 0} open bill{totals.openBills === 1 ? '' : 's'}</Text>
          <Text style={styles.heroFootLabel}>of {compactRupees(totals.billedRupees ?? 0)} billed</Text>
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell
            label="Recovery"
            value={totals.recoveryPercent === null || totals.recoveryPercent === undefined
              ? '—'
              : `${totals.recoveryPercent}%`}
            tone={recoveryTone(totals.recoveryPercent)}
            hint={totals.recoveryPercent === null || totals.recoveryPercent === undefined
              ? 'nothing billed in this window'
              : 'of what was billed'}
          />
          <StatCell label="Recovered" value={compactRupees(totals.recoveredRupees ?? 0)} tone={GREEN} />
          <StatCell label="Settled" value={compactRupees(balanceOfBilled)} tone={THEME}
            hint="billed minus what is left" />
          <StatCell label="Largest bill" value={compactRupees(totals.largestSingleBillRupees ?? 0)} tone={AMBER} />
        </StatGrid>
      </AnimatedCard>

      {inPeriod ? (
        <AnimatedCard style={styles.card}>
          <Text style={styles.inPeriodText}>
            {rupees(inPeriod.amountRupees ?? 0)} was collected during this window across{' '}
            {inPeriod.count ?? 0} receipt{(inPeriod.count ?? 0) === 1 ? '' : 's'}. Outstanding above is
            what is left AFTER that.
          </Text>
        </AnimatedCard>
      ) : null}

      <Section title="Ageing" note="Oldest first — the bands are the dues desk's own.">
        {aging.length === 0 ? (
          <ReportEmpty icon="checkmark-done-outline" title="Nothing outstanding" subtitle="Every bill in this window is settled." />
        ) : (
          <AnimatedCard>
            {aging.map((b) => (
              <BarRow
                key={b.bucket}
                label={b.label}
                value={b.amountRupees}
                max={agingMax}
                color={b.color ?? agingColor(b.bucket)}
                right={`${compactRupees(b.amountRupees)} · ${b.count} bill${b.count === 1 ? '' : 's'}`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Who owes the most" note="Balance per student, not per bill.">
        {topDebtors.length === 0 ? (
          <ReportEmpty icon="people-outline" title="No debtors" subtitle="Nobody owes anything right now." />
        ) : (
          <AnimatedCard>
            {topDebtors.map((d, i) => (
              <View key={d.rollNo} style={styles.debtor}>
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={styles.debtorInfo}>
                  <Text style={styles.debtorName} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.debtorRoll}>{d.rollNo}</Text>
                  <View style={styles.debtorTrack}>
                    <View style={[styles.debtorFill, { width: barWidth(d.amountRupees, debtorMax), backgroundColor: RED }]} />
                  </View>
                </View>
                <View style={styles.debtorRight}>
                  <Text style={styles.debtorAmount}>{rupees(d.amountRupees)}</Text>
                  <Text style={styles.debtorShare}>{d.sharePercent ?? 0}% of dues</Text>
                </View>
              </View>
            ))}
          </AnimatedCard>
        )}
      </Section>

      {(totals.waivedBills ?? 0) > 0 || (totals.clearedBills ?? 0) > 0 ? (
        <AnimatedCard style={styles.card}>
          <StatGrid>
            <StatCell label="Cleared in window" value={String(totals.clearedBills ?? 0)}
              hint={compactRupees(totals.clearedRupees ?? 0)} tone={GREEN} />
            <StatCell label="Waived in window" value={String(totals.waivedBills ?? 0)}
              hint={compactRupees(totals.waivedRupees ?? 0)} tone={AMBER} />
          </StatGrid>
        </AnimatedCard>
      ) : null}

      <Text style={styles.footnote}>
        Every figure here is scoped to this institution. A bill belonging to another
        college cannot appear, whatever it is worth.
      </Text>
    </ReportScreen>
  );
}

/** No comparable base means no percentage — a fabricated 0% would read as "nothing owed". */
function recoveryTone(percent) {
  if (percent === null || percent === undefined) return SLATE;
  if (percent >= 90) return GREEN;
  if (percent >= 70) return AMBER;
  return RED;
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  heroFootLabel: { fontSize: 11, color: SLATE },
  inPeriod: { flexDirection: 'row', alignItems: 'flex-start' },
  inPeriodText: { fontSize: 11, color: SLATE, lineHeight: 16 },
  debtor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rank: { width: 20, fontSize: 12, fontWeight: '800', color: '#cbd5e1' },
  debtorInfo: { flex: 1 },
  debtorName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  debtorRoll: { fontSize: 10, color: SLATE },
  debtorTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', overflow: 'hidden', marginTop: 5 },
  debtorFill: { height: 6, borderRadius: 3 },
  debtorRight: { alignItems: 'flex-end', minWidth: 92 },
  debtorAmount: { fontSize: 13, fontWeight: '800', color: RED },
  debtorShare: { fontSize: 10, color: SLATE },
  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});