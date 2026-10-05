// F-09 Reports — expense statement (docs/users/06 §3.8).
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { accountsApi } from '../../../../../../services/api';
import {
  THEME, GREEN, RED, AMBER, SLATE, compactRupees, rupees, changePhrase, changeColor, formatDate,
} from '../../reportsMeta';
import {
  useReport, ReportScreen, PeriodBar, StatCell, StatGrid, Section, BarRow, ReportEmpty, AnimatedCard,
} from '../../reportsUi';

export default function ReportExpenses({ route }) {
  const [period, setPeriod] = useState(route?.params?.period ?? 'MONTH');
  const { data, loading, refreshing, error, reload, onRefresh } = useReport(
    () => accountsApi.report('expenses', { period }),
    [period],
  );

  const totals = data?.totals ?? {};
  const budget = data?.budget ?? {};
  const lines = budget.lines ?? [];
  const byCategory = data?.byCategory ?? [];
  const byVendor = data?.byVendor ?? [];
  const statements = data?.statements ?? [];
  const previous = data?.previous ?? null;

  const catMax = Math.max(1, ...byCategory.map((c) => Math.abs(c.amountRupees)));
  const plannedMax = Math.max(1, ...lines.map((l) => Math.abs(l.plannedRupees)));

  return (
    <ReportScreen
      title="Expense statement"
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
      period={data?.period}
      exportProps={{ reportId: 'expenses', period }}
    >
      <PeriodBar value={period} onChange={setPeriod} />

      <AnimatedCard>
        <Text style={styles.heroLabel}>Approved spend</Text>
        <Text style={[styles.heroValue, { color: AMBER }]}>{rupees(totals.approvedRupees ?? 0)}</Text>
        <View style={styles.heroFoot}>
          <Text style={styles.heroFootLabel}>
            {compactRupees(totals.claimedRupees ?? 0)} claimed · {compactRupees(totals.pendingRupees ?? 0)} awaiting approval
          </Text>
          {previous?.changePercent !== undefined ? (
            <Text style={[styles.change, { color: changeColor(previous.changePercent) }]}>
              {changePhrase(previous.changePercent)}
            </Text>
          ) : null}
        </View>
      </AnimatedCard>

      <AnimatedCard style={styles.card}>
        <StatGrid>
          <StatCell label="Claims" value={String(totals.claimCount ?? 0)}
            hint={totals.claimCount ? `avg ${compactRupees(totals.averageClaimRupees)}` : undefined} />
          <StatCell label="Rejected" value={compactRupees(totals.rejectedRupees ?? 0)}
            tone={(totals.rejectedRupees ?? 0) > 0 ? RED : SLATE} />
          <StatCell label="Tax" value={compactRupees(totals.taxRupees ?? 0)} tone={THEME} />
          <StatCell label="With vendor" value={`${totals.withVendor ?? 0}/${totals.claimCount ?? 0}`}
            tone={(totals.claimCount ?? 0) - (totals.withVendor ?? 0) > 0 ? AMBER : GREEN}
            hint="claims naming a supplier" />
        </StatGrid>
      </AnimatedCard>

      <Section title="Budget" note="Planned against what was actually approved.">
        <AnimatedCard>
          <View style={styles.budgetHead}>
            <Text style={styles.budgetPlanned}>{compactRupees(budget.plannedRupees ?? 0)} planned</Text>
            <Text style={[styles.budgetSpent, { color: (budget.spentRupees ?? 0) > (budget.plannedRupees ?? 0) ? RED : GREEN }]}>
              {compactRupees(budget.spentRupees ?? 0)} spent
            </Text>
          </View>
          {lines.length === 0 ? (
            <ReportEmpty icon="pie-chart-outline" title="No budget set" subtitle="Nothing is planned for this window." />
          ) : (
            lines.map((l) => (
              <BarRow
                key={l.category}
                label={l.category}
                value={l.plannedRupees}
                display={`${compactRupees(l.spentRupees)} of ${compactRupees(l.plannedRupees)}`}
                max={plannedMax}
                color={l.overBudget ? RED : GREEN}
                right={l.overBudget
                  ? `over by ${compactRupees(l.spentRupees - l.plannedRupees)}`
                  : `${compactRupees(l.remainingRupees)} left · ${l.utilisationPercent ?? 0}%`}
              />
            ))
          )}
        </AnimatedCard>
      </Section>

      <Section title="By category">
        {byCategory.length === 0 ? (
          <ReportEmpty icon="receipt-outline" title="No claims" subtitle="Nothing was claimed in this window." />
        ) : (
          <AnimatedCard>
            {byCategory.map((c) => (
              <BarRow
                key={c.category}
                label={c.category}
                value={c.amountRupees}
                max={catMax}
                color={THEME}
                right={`${compactRupees(c.amountRupees)} · ${c.count} · ${c.sharePercent ?? 0}%`}
              />
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="By vendor" note="Only claims that name a supplier.">
        {byVendor.length === 0 ? (
          <ReportEmpty icon="storefront-outline" title="No vendors named" subtitle="Every claim in this window is unattributed." />
        ) : (
          <AnimatedCard>
            {byVendor.map((v) => (
              <View key={v.vendor} style={styles.vendor}>
                <Text style={styles.vendorName} numberOfLines={1}>{v.vendor}</Text>
                <Text style={styles.vendorAmount}>{compactRupees(v.amountRupees)} · {v.count}</Text>
              </View>
            ))}
          </AnimatedCard>
        )}
      </Section>

      <Section title="Statements" note={`${statements.length} claim${statements.length === 1 ? '' : 's'} in this window.`}>
        {statements.length === 0 ? (
          <ReportEmpty icon="document-text-outline" title="Nothing to list" subtitle="No claims matched this period." />
        ) : (
          statements.map((s) => (
            <View key={s.id} style={styles.statement}>
              <View style={styles.statementInfo}>
                <Text style={styles.statementTitle} numberOfLines={1}>{s.title}</Text>
                <Text style={styles.statementMeta} numberOfLines={1}>
                  {formatDate(s.date)} · {s.category} · {s.vendor} · {s.department}
                </Text>
              </View>
              <View style={styles.statementRight}>
                <Text style={styles.statementAmount}>{rupees(s.amountRupees)}</Text>
                <Text style={[styles.statementStatus, { color: statusColor(s.status) }]}>{s.status}</Text>
              </View>
            </View>
          ))
        )}
      </Section>

      <Text style={styles.footnote}>
        A claim is listed whether it was approved, pending or rejected — hiding the rejected
        ones would make the department look tidier than it is. Tax is shown separately
        from the claim amount, not inside it.
      </Text>
    </ReportScreen>
  );
}

function statusColor(status) {
  if (status === 'APPROVED') return GREEN;
  if (status === 'REJECTED') return RED;
  return AMBER;
}

const styles = StyleSheet.create({
  card: { marginTop: 12 },
  heroLabel: { fontSize: 12, color: SLATE },
  heroValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  heroFoot: { marginTop: 10 },
  heroFootLabel: { fontSize: 11, color: SLATE },
  change: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  budgetHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  budgetPlanned: { fontSize: 12, color: SLATE, fontWeight: '600' },
  budgetSpent: { fontSize: 12, fontWeight: '800' },

  vendor: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  vendorName: { flex: 1, fontSize: 12, fontWeight: '600', color: '#0f172a', marginRight: 8 },
  vendorAmount: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  statement: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eef2f7',
    padding: 12, marginBottom: 8,
  },
  statementInfo: { flex: 1 },
  statementTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  statementMeta: { fontSize: 10, color: SLATE, marginTop: 1 },
  statementRight: { alignItems: 'flex-end' },
  statementAmount: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  statementStatus: { fontSize: 9, fontWeight: '700' },

  footnote: { fontSize: 10, color: SLATE, marginTop: 18, lineHeight: 15 },
});