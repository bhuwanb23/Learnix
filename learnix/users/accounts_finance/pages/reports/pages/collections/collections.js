// F-09 Reports — collection report (docs/users/06 §3.8).
// Six levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { accountsApi } from '../../../../../../services/api';
import {
  THEME, GREEN, AMBER, SLATE, compactRupees, rupees, changePhrase, changeColor, barWidth,
} from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, BarRow, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportCollections({ route }) {
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('collections', { period }),
    [period],
  );

  const totals = data?.totals ?? {};
  const previous = data?.previous ?? null;
  const byCategory = data?.byCategory ?? [];
  const byMethod = data?.byMethod ?? [];
  const trend = data?.trend ?? [];
  const recent = data?.recent ?? [];

  const catMax = Math.max(1, ...byCategory.map((c) => Math.abs(c.amountRupees)));
  const trendMax = Math.max(1, ...trend.map((t) => Math.abs(t.amountRupees)));
  const methodMax = Math.max(1, ...byMethod.map((m) => Math.abs(m.amountRupees)));

  return (
    <ReportScreen
      title="Collection report"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'collections', period }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <AnimatedCard>
        <Text style={styles.heroLabel}>Collected</Text>
        <Text style={[styles.heroValue, { color: GREEN }]}>{rupees(totals.collectedRupees ?? 0)}</Text>
        {previous ? (
          <View style={styles.heroFoot}>
            <Text style={styles.heroFootLabel}>{previous.label ?? 'Previous period'}</Text>
            <Text style={styles.heroFootLabel}>{changePhrase(previous.changePercent)}</Text>
            <Text style={[styles.change, { color: changeColor(previous.changePercent) }]}>
              {previous.changePercent === null || previous.changePercent === undefined
                ? '—'
                : `${previous.changePercent > 0 ? '+' : ''}${previous.changePercent}%`}
            </Text>
          </View>
        ) : (
          <Text style={styles.heroFootLabel}>
            Nothing collected in this window
          </Text>
        )}
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell label="Receipts" value={String(totals.receipts ?? 0)}
            hint={totals.receipts ? `avg ${compactRupees(totals.averageReceiptRupees)}` : undefined} />
          <StatCell label="Best month" value={compactRupees(data?.peakRupees ?? 0)} tone={AMBER}
            hint="highest single month" />
          <StatCell label="Donations" value={compactRupees(totals.donationRupees ?? 0)} tone={GREEN} />
          <StatCell label="Unallocated" value={String(totals.unallocatedReceipts ?? 0)}
            tone={(totals.unallocatedReceipts ?? 0) > 0 ? AMBER : SLATE}
            hint="no student attached" />
        </StatGrid>
      </AnimatedCard>

      <Section title="By category">
        {byCategory.length === 0 ? (
          <ReportEmpty icon="cash-outline" title="No money in" subtitle="Nothing was collected in this window." />
        ) : (
          <AnimatedCard>
            {byCategory.map((c) => (
              <BarRow
                key={c.category}
                label={c.category}
                value={c.amountRupees}
                max={catMax}
                color={THEME}
                right={`${compactRupees(c.amountRupees)} · ${c.count} receipt${c.count === 1 ? '' : 's'} · ${c.sharePercent ?? 0}%`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="By method" note="How the money actually arrived.">
        {byMethod.length === 0 ? (
          <ReportEmpty icon="card-outline" title="No receipts" subtitle="No payment method recorded." />
        ) : (
          <AnimatedCard>
            {byMethod.map((m) => (
              <BarRow
                key={m.method}
                label={m.method}
                value={m.amountRupees}
                max={methodMax}
                color={GREEN}
                right={`${compactRupees(m.amountRupees)} · ${m.count}`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Month by month" note="Bars share one scale.">
        {trend.length === 0 ? (
          <ReportEmpty icon="trending-up-outline" title="Nothing to plot" subtitle="No collections in this window." />
        ) : (
          <AnimatedCard>
            {trend.map((t) => (
              <View key={t.month} style={styles.trendRow}>
                <View style={styles.trendBarCol}>
                  <View style={styles.trendTrack}>
                    <View style={[styles.trendFill, { height: barWidth(t.amountRupees, trendMax), backgroundColor: GREEN }]} />
                  </View>
                </View>
                <View style={styles.trendInfo}>
                  <Text style={styles.trendLabel}>{t.label}</Text>
                  <Text style={styles.trendValue}>{rupees(t.amountRupees)}</Text>
                  <Text style={[styles.trendChange, { color: changeColor(t.changePercent) }]}>
                    {changePhrase(t.changePercent, 'the month before')}
                  </Text>
                </View>
              </View>
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Recent receipts">
        {recent.length === 0 ? (
          <ReportEmpty icon="receipt-outline" title="No receipts" subtitle="Nothing recorded in this window." />
        ) : (
          recent.map((r) => (
            <View key={r.id} style={styles.receipt}>
              <View style={styles.receiptInfo}>
                <Text style={styles.receiptStudent} numberOfLines={1}>{r.student}</Text>
                <Text style={styles.receiptMeta}>{r.category} · {r.method} · {r.date}</Text>
              </View>
              <Text style={styles.receiptAmount}>{rupees(r.amountRupees)}</Text>
            </View>
          ))
        )}
      </Section>

      <Text style={styles.footnote}>
        Reversed payments are excluded but keep their row in the ledger. Every figure is
        this institution's alone.
      </Text>
    </ReportScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  heroFootLabel: { fontSize: 11, color: SLATE },
  change: { fontSize: 12, fontWeight: '800' },

  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  // A vertical track for a vertical bar — the height is set from the same
  // barWidth() the horizontal rows use, so a month is not stretched by its own
  // neighbours.
  trendBarCol: { width: 10, height: 44, justifyContent: 'flex-end' },
  trendTrack: { height: 44, width: 10, backgroundColor: '#eef2f7', borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  trendFill: { width: 10, borderRadius: 5 },
  trendInfo: { flex: 1 },
  trendLabel: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  trendValue: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  trendChange: { fontSize: 10 },

  receipt: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7',
    padding: 12, marginBottom: 8,
  },
  receiptInfo: { flex: 1 },
  receiptStudent: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  receiptMeta: { fontSize: 10, color: SLATE, marginTop: 1 },
  receiptAmount: { fontSize: 13, fontWeight: '800', color: GREEN },

  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});