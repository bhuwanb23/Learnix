// F-09 Reports — scholarship report (docs/users/06 §3.8).
//
// The whole point of this screen is that "awarded" and "released" are NOT the
// same number and are never added into one. An award is a decision; a release is
// money that reached a student and was matched against a real bill. A committee
// that reads "₹75,000 awarded" as "₹75,000 given away" is exactly the confusion
// this report exists to prevent, so every scheme carries both figures and the
// gap between them.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { accountsApi } from '../../../../../../services/api';
import {
  THEME, GREEN, AMBER, SLATE, VIOLET, compactRupees, rupees, barWidth,
  releasePhrase, releaseTone,
} from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportScholarships({ route }) {
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('scholarships', { period }),
    [period],
  );

  const totals = data?.totals ?? {};
  const schemes = data?.schemes ?? [];
  const creditedTo = data?.creditedTo ?? [];

  const awarded = totals.awardedRupees ?? 0;
  const released = totals.disbursedRupees ?? 0;
  const awaitRelease = Math.max(0, awarded - released);

  return (
    <ReportScreen
      title="Scholarship report"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'scholarships', period }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <AnimatedCard>
        <Text style={styles.heroLabel}>Actually released to students</Text>
        <Text style={[styles.heroValue, { color: GREEN }]}>{rupees(released)}</Text>
        <View style={styles.splitRow}>
          <View style={styles.splitCell}>
            <Text style={styles.splitLabel}>Awarded (a decision)</Text>
            <Text style={[styles.splitValue, { color: VIOLET }]}>{rupees(awarded)}</Text>
          </View>
          <View style={styles.splitCell}>
            <Text style={styles.splitLabel}>Approved, not yet released</Text>
            <Text style={[styles.splitValue, { color: awaitRelease > 0 ? AMBER : GREEN }]}>
              {rupees(awaitRelease)}
            </Text>
          </View>
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell label="Schemes" value={String(totals.schemes ?? 0)}
            hint={`${totals.openSchemes ?? 0} open`} />
          <StatCell label="Applications" value={String(totals.applications ?? 0)} tone={THEME} />
          <StatCell label="Released this window" value={compactRupees(totals.releasedInPeriodRupees ?? 0)}
            tone={GREEN} hint="money that moved in the period" />
          <StatCell label="Unspent fund" value={compactRupees(totals.headroomRupees ?? 0)}
            tone={totals.utilisationPercent !== null && (totals.utilisationPercent ?? 0) >= 90 ? AMBER : GREEN}
            hint={totals.utilisationPercent === null || totals.utilisationPercent === undefined
              ? 'no capped fund'
              : `${totals.utilisationPercent}% committed`} />
        </StatGrid>
      </AnimatedCard>

      {creditedTo.length > 0 ? (
        <AnimatedCard style={styles.card}>
          <Text style={styles.creditHead}>Credited against</Text>
          {creditedTo.map((c) => (
            <View key={c.title} style={styles.creditRow}>
              <Text style={styles.creditTitle} numberOfLines={1}>{c.title}</Text>
              <Text style={styles.creditAmount}>{compactRupees(c.amountRupees)}</Text>
            </View>
          ))}
          <Text style={styles.cardNote}>
            Every rupee above is matched by an allocation against a real bill — this is the
            figure that says money actually moved, not just money that was promised.
          </Text>
        </AnimatedCard>
      ) : null}

      <Section title="Scheme by scheme" note="Awarded and released, side by side.">
        {schemes.length === 0 ? (
          <ReportEmpty icon="ribbon-outline" title="No schemes" subtitle="No scholarship schemes exist yet." />
        ) : (
          schemes.map((s) => {
            const max = Math.max(1, s.awardedRupees ?? 0);
            const tone = releaseTone(s);
            return (
              <AnimatedCard key={s.id} style={styles.scheme}>
                <View style={styles.schemeHead}>
                  <View style={styles.schemeNameCol}>
                    <Text style={styles.schemeName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.schemeSub}>{s.type} · {s.academicYear} · {s.status}</Text>
                  </View>
                  <Text style={[styles.schemePhrase, { color: tone }]}>{releasePhrase(s)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fillAwarded, { width: barWidth(s.awardedRupees, max) }]} />
                  <View style={[styles.fillReleased, { width: barWidth(s.disbursedRupees, max) }]} />
                </View>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: VIOLET }]} />
                    <Text style={styles.legendText}>{compactRupees(s.awardedRupees ?? 0)} awarded</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: GREEN }]} />
                    <Text style={styles.legendText}>{compactRupees(s.disbursedRupees ?? 0)} released</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: '#e2e8f0' }]} />
                    <Text style={styles.legendText}>
                      {s.budgetRupees !== null && s.budgetRupees !== undefined
                        ? `${compactRupees(s.budgetRupees)} fund`
                        : 'uncapped'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.schemeMeta}>
                  {s.applications ?? 0} application{(s.applications ?? 0) === 1 ? '' : 's'} ·
                  {' '}{s.approved ?? 0} approved · {s.disbursed ?? 0} released
                  {s.rejected ? ` · ${s.rejected} rejected` : ''}
                </Text>
                {s.allocations > 0 ? (
                  <Text style={styles.schemeAlloc}>
                    {compactRupees(s.creditedRupees ?? 0)} credited across {s.allocations} bill
                    {s.allocations === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </AnimatedCard>
            );
          })
        )}
      </Section>

      <Text style={styles.footnote}>
        Every released rupee is matched by an allocation against a real bill, so the credited
        figure can never exceed the released one. Where nothing has been released yet the
        report says so rather than showing a scheme as though it had been funded.
      </Text>
    </ReportScreen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  splitRow: { flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 10 },
  splitCell: { flex: 1 },
  splitLabel: { fontSize: 10, color: SLATE },
  splitValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },

  creditHead: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  creditRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  creditTitle: { flex: 1, fontSize: 12, color: '#0f172a', marginRight: 8 },
  creditAmount: { fontSize: 12, fontWeight: '700', color: GREEN },
  cardNote: { fontSize: 10, color: SLATE, marginTop: 10, lineHeight: 15 },

  scheme: { marginBottom: 10 },
  schemeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  schemeNameCol: { flex: 1 },
  schemeName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  schemeSub: { fontSize: 10, color: SLATE, marginTop: 1 },
  schemePhrase: { fontSize: 10, fontWeight: '700', textAlign: 'right', maxWidth: 130 },
  track: {
    height: 9, borderRadius: 5, backgroundColor: '#eef2f7', overflow: 'hidden',
    marginTop: 10, flexDirection: 'row',
  },
  fillAwarded: { height: 9, backgroundColor: VIOLET },
  fillReleased: { height: 9, backgroundColor: GREEN },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, color: SLATE },
  schemeMeta: { fontSize: 10, color: SLATE, marginTop: 6 },
  schemeAlloc: { fontSize: 10, color: GREEN, marginTop: 2, fontWeight: '600' },

  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});