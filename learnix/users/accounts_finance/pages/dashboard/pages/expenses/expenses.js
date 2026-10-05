// F-11 Dashboard — Expense overview (docs/users/06 §3.11, block 3).
//
// "Monthly spending versus allocated budget" — and the honest version of that
// comparison needs three windows, not two, because they are different claims:
//
//   • THIS MONTH is what has actually been approved and spent since the 1st.
//   • THE FISCAL YEAR is the allocation the plan was set in (1 Apr – 31 Mar).
//   • PENDING is money claimed but not yet approved. It will land on the budget
//     the moment somebody signs it, and a screen that hides it until then shows
//     an officer a budget with headroom that is about to disappear.
//
// The old screen had a real defect here: `utilizationPct` was
// `Math.min(Math.round((spent / planned) * 100), 100)`. A budget line at 180% of
// plan drew a FULL bar and printed "100%". The one number on the screen that most
// needed to look alarming was the one number that could not. The clamp now
// happens at draw time, in `SpendBar`, where a pixel width is the only thing at
// stake — and the figure itself is printed unclamped.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AMBER, SLATE, MUTED, GREEN, compactRupees, rupees, percentPhrase } from '../../../dashboardMeta';
import {
  DashboardEmpty, DashboardScreen, Section, SpendBar, StatGrid, StatCell, goToRoute, useDashboard,
} from '../../../dashboardUi';

export default function DashboardExpenses({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardBlock('EXPENSES'),
  );

  const e = data ?? {};
  const lines = e.lines ?? [];
  const trend = e.trend ?? [];
  const trendMax = trend.reduce((m, t) => Math.max(m, t.amountRupees), 0);
  const hasBudget = lines.length > 0;

  return (
    <DashboardScreen
      title="Expense overview"
      subtitle="This month’s approved spend against the allocation set for the year."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <Section title="Spend against plan" note={e.fiscalYearLabel}>
        <View style={styles.card}>
          <StatGrid>
            <StatCell
              label={`Spent in ${e.monthLabel ?? 'this month'}`}
              value={compactRupees(e.monthRupees ?? 0)}
              tone={AMBER}
              hint={`${e.monthCount ?? 0} approved claim${e.monthCount === 1 ? '' : 's'}`}
            />
            <StatCell
              label="Planned for the year"
              value={compactRupees(e.plannedRupees ?? 0)}
              tone={SLATE}
              hint={e.fiscalYear ?? '—'}
            />
            <StatCell
              label="Used so far"
              value={percentPhrase(e.utilisationPercent)}
              tone={e.tone === 'over' ? '#dc2626' : e.tone === 'near' ? AMBER : GREEN}
              hint={`${rupees(e.remainingRupees ?? 0)} left`}
            />
            <StatCell
              label="Awaiting approval"
              value={compactRupees(e.pendingRupees ?? 0)}
              tone={e.pendingCount > 0 ? AMBER : SLATE}
              hint={`${e.pendingCount ?? 0} claim${e.pendingCount === 1 ? '' : 's'} not yet signed`}
            />
          </StatGrid>
        </View>

        {/* Money claimed but not approved. It is not spent, so it is kept out of
            the spend figure — but it is shown, because it is money that is about
            to be spent and an officer deciding whether to approve needs to see
            what approving it would do to the line. */}
        {e.pendingCount > 0 ? (
          <View style={styles.pendingBanner}>
            <Ionicons name="hourglass-outline" size={15} color={AMBER} />
            <View style={styles.pendingBody}>
              <Text style={styles.pendingTitle}>{rupees(e.pendingRupees)} is claimed but not approved</Text>
              <Text style={styles.pendingText}>
                Not counted as spend above. Approving it will draw down the budget it is filed
                against.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => goToRoute(navigation, 'Expenses', false)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.pendingLink}>Review</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Section>

      {/* Per line, on the institution's OWN fiscal year. Budgets are filtered to
          the current FY on the server: the previous screen summed every Budget
          row the institution had ever created, so last year's exhausted lines
          were being added to this year's plan. */}
      <Section
        title="By budget line"
        note={hasBudget ? `${e.overrunCount ?? 0} over plan` : undefined}
      >
        <View style={styles.card}>
          {!hasBudget ? (
            <DashboardEmpty
              icon="pie-chart-outline"
              title={`No budget set for ${e.fiscalYear ?? 'this year'}`}
              subtitle="Without an allocation there is nothing to compare spending against. Set one on the expenses desk to see utilisation here."
            />
          ) : (
            lines.map((l) => (
              <SpendBar
                key={l.budgetId}
                label={`${l.category.replace(/_/g, ' ').toLowerCase()} · ${l.scope}`}
                percent={l.utilisationPercent}
                display={percentPhrase(l.utilisationPercent)}
                sublabel={`${rupees(l.spentRupees)} of ${rupees(l.plannedRupees)}${l.overBudget ? ` · ${rupees(Math.abs(l.remainingRupees))} over` : ''}`}
                over={l.overBudget}
              />
            ))
          )}
        </View>
      </Section>

      <Section title="Last six months" note="Approved spend">
        <View style={styles.card}>
          {trendMax === 0 ? (
            <DashboardEmpty
              icon="trending-up-outline"
              title="No approved spend"
              subtitle="Nothing has been approved in the last six months."
            />
          ) : (
            trend.map((t) => (
              <SpendBar
                key={t.month}
                label={t.label}
                percent={(t.amountRupees / trendMax) * 100}
                display={compactRupees(t.amountRupees)}
                sublabel={t.count > 0 ? `${t.count} claim${t.count === 1 ? '' : 's'}` : 'Nothing approved'}
              />
            ))
          )}
        </View>
      </Section>

      <Text style={styles.footnote}>
        Spend counts APPROVED claims only — a pending claim is not money out. Utilisation is shown
        against the fiscal year the budget was filed under, and is deliberately not capped at
        100%: a line at 180% of plan says 180%, and only the bar is trimmed to fit.
        {'\n'}Recomputing a plan of ₹0 gives no percentage at all rather than 0%, because there
        is nothing to be a percentage of.
      </Text>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15 },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10,
    backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', padding: 13,
  },
  pendingBody: { flex: 1 },
  pendingTitle: { fontSize: 12, fontWeight: '800', color: '#92400e' },
  pendingText: { fontSize: 10, color: '#a16207', marginTop: 3, lineHeight: 14 },
  pendingLink: { fontSize: 12, fontWeight: '700', color: AMBER },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
