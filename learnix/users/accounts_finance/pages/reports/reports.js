// F-09 Reports — the reporting hub (docs/users/06 §3.8).
//
// What this screen replaced: three hard-coded stat tiles, two breakdown lists,
// and four "Export" cards that fired `Alert.alert` and did nothing. It is now
// one period selector in front of a headline strip and seven real reports.
//
// The report list is NOT hard-coded here. It arrives from `/reports/catalogue`,
// which is where the server tells the app each report's id, title, icon and
// route. A list copied into the app is a list that goes stale the day a report
// is added — the card would either not exist or open a 422. `reportsMeta.js`
// still holds the ids because the seven sub-screens are separate modules that
// must exist at build time; `audit-reports-ui.ts` asserts the two agree.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  THEME, GREEN, RED, AMBER, SLATE, compactRupees, rupees,
  periodMeta, integrityNote, reportScreen, inflowColor,
} from './reportsMeta';
import {
  AnimatedCard, PeriodBar, ReportScreen, StatCell, StatGrid, Section, ReportEmpty,
} from './reportsUi';

export default function ReportsModule({ navigation }) {
  const [period, setPeriod] = useState('MONTH');
  const [catalogue, setCatalogue] = useState(null);
  const [catalogueError, setCatalogueError] = useState(null);

  const loadCatalogue = useCallback(async () => {
    try {
      setCatalogueError(null);
      setCatalogue(await accountsApi.reportCatalogue());
    } catch (err) {
      setCatalogueError(err.message);
    }
  }, []);

  const overview = useReportOverview(period, loadCatalogue);

  const reports = catalogue?.reports ?? [];
  const headline = overview.data?.headline ?? {};

  return (
    <ReportScreen
      loading={overview.loading}
      refreshing={overview.refreshing}
      error={overview.error ?? catalogueError}
      onRetry={() => { loadCatalogue(); overview.reload(); }}
      onRefresh={() => { loadCatalogue(); overview.onRefresh(); }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      {/* The one number that makes the rest worth reading: money in, minus money
          out, including payroll. A month can look healthy on collections alone
          and still have lost money once the salary run lands. */}
      <AnimatedCard>
        <Text style={styles.heroLabel}>Collected {periodMeta(period).short.toLowerCase()}</Text>
        <Text style={styles.heroValue}>{rupees(headline.collectedRupees ?? 0)}</Text>
        <View style={styles.heroFooter}>
          <Text style={styles.heroFootLabel}>Surplus after spend &amp; payroll</Text>
          <Text style={[styles.heroFootValue, { color: inflowColor(headline.surplusRupees ?? 0) }]}>
            {rupees(headline.surplusRupees ?? 0)}
          </Text>
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell
            label="Still owing"
            value={compactRupees(headline.outstandingRupees ?? 0)}
            tone={RED}
            hint={headline.outstandingRupees > 0 ? 'Balance, not billed amount' : 'Nothing outstanding'}
          />
          <StatCell
            label="Recovered"
            value={headline.recoveryPercent === null || headline.recoveryPercent === undefined
              ? '—'
              : `${headline.recoveryPercent}%`}
            tone={(headline.recoveryPercent ?? 0) >= 90 ? GREEN : AMBER}
            hint="of what was billed"
          />
          <StatCell label="Approved spend" value={compactRupees(headline.spentRupees ?? 0)} tone={AMBER} />
          <StatCell label="Payroll (net)" value={compactRupees(headline.payrollRupees ?? 0)} tone={THEME} />
        </StatGrid>
      </AnimatedCard>

      <PayrollIntegrityNote integrity={overview.data?.payrollIntegrity} />

      <Section title="Reports" note="Each opens with this period applied.">
        {reports.length === 0 ? (
          <ReportEmpty icon="stats-chart-outline" title="No reports published" subtitle="The server did not return a report catalogue." />
        ) : (
          reports.map((rep, i) => (
            <AnimatedCard
              key={rep.id}
              delay={i * 45}
              style={styles.reportCard}
              onPress={() => navigation.openModule(reportScreen(rep.id), { period })}
            >
              <View style={styles.reportRow}>
                <View style={[styles.icon, { backgroundColor: `${rep.color}14` }]}>
                  <Ionicons name={rep.icon} size={18} color={rep.color} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{rep.title}</Text>
                  <Text style={styles.blurb}>{rep.blurb}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </View>
              <OneLiner id={rep.id} overview={overview.data} />
            </AnimatedCard>
          ))
        )}
      </Section>

      <Text style={styles.footnote}>
        Figures are whole rupees, tenant-scoped, and exclude reversed payments. Every report
        exports to Excel, CSV or PDF from its own screen.
      </Text>
    </ReportScreen>
  );
}

/**
 * The hub's own fetch, kept local rather than imported: it needs two calls (the
 * catalogue and the overview) and a retry that re-runs both.
 */
function useReportOverview(period, onCatalogue) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.reportOverview({ period }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { onCatalogue(); }, [onCatalogue]);

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  return { data, loading, refreshing, error, reload: load, onRefresh };
}

/**
 * One real figure per card, so the hub answers something without a tap.
 *
 * This reads from the overview the hub already fetched — no seventh request, and
 * no chance of the card and the strip disagreeing because they were loaded at
 * different moments. Two of the seven (departments, comparison) have no headline
 * in the overview payload, so they render no line at all rather than a
 * placeholder zero: a card that says "₹0 surplus over 12 months" when nothing
 * was asked for is worse than a card that says nothing.
 */
function OneLiner({ id, overview }) {
  if (!overview) return null;
  const c = overview.collections;
  const d = overview.dues;
  const e = overview.expenses;
  const p = overview.payroll;
  const s = overview.scholarships;

  const line = {
    collections: `${compactRupees(c?.collectedRupees ?? 0)} in · ${c?.receipts ?? 0} receipts`,
    dues: `${compactRupees(d?.outstandingRupees ?? 0)} owing · ${d?.openBills ?? 0} open bills`,
    expenses: `${compactRupees(e?.approvedRupees ?? 0)} approved of ${compactRupees(e?.claimedRupees ?? 0)} claimed`,
    payroll: `${p?.runs ?? 0} runs · ${compactRupees(p?.netRupees ?? 0)} net`,
    scholarships: `${compactRupees(s?.disbursedRupees ?? 0)} released of ${compactRupees(s?.awardedRupees ?? 0)} awarded`,
  }[id];

  if (!line) return null;
  return <Text style={styles.oneLiner}>{line}</Text>;
}

/**
 * The payroll caveat, on the hub.
 *
 * The report refuses to print a payroll header whose entries disagree with it.
 * That is only honest if the person reading the headline strip finds out, so it
 * is surfaced here rather than hidden on the payroll screen alone.
 */
function PayrollIntegrityNote({ integrity }) {
  const note = integrityNote(integrity);
  if (!note) return null;
  return (
    <View style={styles.warn}>
      <Ionicons name="alert-circle-outline" size={15} color={AMBER} />
      <Text style={styles.warnText}>{note} Check the payroll report before quoting these figures.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  heroFooter: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 10,
  },
  heroFootLabel: { fontSize: 11, color: SLATE },
  heroFootValue: { fontSize: 16, fontWeight: '800' },

  reportCard: { marginBottom: 10 },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  blurb: { fontSize: 11, color: SLATE, marginTop: 1 },
  oneLiner: { fontSize: 11, color: '#0f172a', marginTop: 10, fontWeight: '600' },

  warn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 10, padding: 10,
  },
  warnText: { flex: 1, fontSize: 11, color: AMBER, fontWeight: '600' },

  footnote: { fontSize: 10, color: SLATE, marginTop: 20, lineHeight: 15 },
});