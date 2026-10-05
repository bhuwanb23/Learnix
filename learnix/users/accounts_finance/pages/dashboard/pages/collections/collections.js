// F-11 Dashboard — Total collection (docs/users/06 §3.11, block 1).
//
// "Today's, monthly and semester-wise collections" — and the three numbers are
// not interchangeable, which is exactly why the screen prints all three with the
// window each belongs to. An officer who reads "₹42,000 collected" with no
// window has learned nothing; the same figure means a good day and a bad month.
//
// Two rules hold everywhere on this screen:
//
//   • REVERSED MONEY IS EXCLUDED AND REPORTED. A reversed payment keeps its row
//     (an accountant must be able to see that money came in and went back out),
//     but it is not money in the bank. The total is net of reversals and the
//     reversal count is printed beside it, so its absence is visible.
//
//   • THE SEMESTER IS THE INSTITUTION'S OWN. It is derived from the academic
//     year's real start and end dates — the same window the reports desk uses —
//     not a hardcoded Jan–Jun split. A July–June college gets Jul–Dec / Jan–Jun.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { GREEN, RED, SLATE, MUTED, AMBER, compactRupees, rupees, formatDateTime, percentPhrase } from '../../dashboardMeta';
import {
  DashboardEmpty, DashboardScreen, FigureRow, Section, SpendBar, StatGrid, StatCell, goToRoute, useDashboard,
} from '../../dashboardUi';

export default function DashboardCollections({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardBlock('COLLECTIONS'),
  );

  const c = data ?? {};
  const trend = c.trend ?? [];
  const peak = trend.reduce((m, t) => Math.max(m, t.amountRupees), 0);
  const monthAvg = trend.length
    ? Math.round(trend.reduce((s, t) => s + t.amountRupees, 0) / trend.length)
    : 0;
  const byCategory = c.byCategory ?? [];

  return (
    <DashboardScreen
      title="Total collection"
      subtitle="Money that actually landed and has not been taken back."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      {/* The three windows. Each is a card, not a row of a table, because they
          are three different claims and a table invites reading them as one. */}
      <Section title="By window" note={c.semesterLabel ?? undefined}>
        <View style={styles.card}>
          <StatGrid>
            <StatCell
              label="Today"
              value={compactRupees(c.todayRupees ?? 0)}
              tone={GREEN}
              hint={`${c.todayCount ?? 0} receipt${c.todayCount === 1 ? '' : 's'} since midnight`}
            />
            <StatCell
              label="This month"
              value={compactRupees(c.monthRupees ?? 0)}
              tone={GREEN}
              hint={`${c.monthCount ?? 0} receipt${c.monthCount === 1 ? '' : 's'}`}
            />
            <StatCell
              label="This semester"
              value={compactRupees(c.semesterRupees ?? 0)}
              tone={GREEN}
              hint={c.academicYearName ?? c.semesterLabel ?? '—'}
            />
            <StatCell
              label="All time"
              value={compactRupees(c.allTimeRupees ?? 0)}
              tone={SLATE}
              hint={`${c.allTimeCount ?? 0} receipts ever`}
            />
          </StatGrid>
        </View>

        {c.reversedCount > 0 ? (
          <View style={styles.reversal}>
            <Ionicons name="arrow-undo-outline" size={14} color={AMBER} />
            <Text style={styles.reversalText}>
              {rupees(c.reversedRupees)} across {c.reversedCount} reversed payment
              {c.reversedCount === 1 ? ' is' : 's are'} excluded from every figure above. The
              receipt was voided and the money left again — the ledger keeps the row.
            </Text>
          </View>
        ) : null}
      </Section>

      {/* Six months, so "is this month normal?" is answerable without leaving the
          screen. Months with no receipts are drawn as a real zero rather than
          skipped — a gap in a series that is silently omitted reads as a
          continuous line of smaller bars. */}
      <Section title="Last six months" note={peak > 0 ? `Peak ${compactRupees(peak)}` : undefined}>
        <View style={styles.card}>
          {trend.length === 0 ? (
            <DashboardEmpty
              icon="bar-chart-outline"
              title="No collections yet"
              subtitle="Nothing has been received in the last six months."
            />
          ) : (
            trend.map((t) => (
              <SpendBar
                key={t.month}
                label={`${t.label}${t.count === 0 ? ' — nothing received' : ''}`}
                percent={peak > 0 ? (t.amountRupees / peak) * 100 : 0}
                display={compactRupees(t.amountRupees)}
                sublabel={t.count > 0 ? `${t.count} receipt${t.count === 1 ? '' : 's'}` : undefined}
              />
            ))
          )}
          {monthAvg > 0 ? (
            <Text style={styles.note}>
              Averaging {rupees(monthAvg)} a month over these six. This month is{' '}
              <Text style={styles.noteStrong}>
                {percentPhrase(
                  Math.round((((c.monthRupees ?? 0) - monthAvg) / monthAvg) * 100),
                )}
              </Text>{' '}
              against that average.
            </Text>
          ) : null}
        </View>
      </Section>

      <Section title="Where the money came from" note="This month, by category">
        {byCategory.length === 0 ? (
          <View style={styles.card}>
            <DashboardEmpty
              icon="cash-outline"
              title="Nothing collected this month"
              subtitle="No payment has been recorded since the 1st."
            />
          </View>
        ) : (
          <View style={styles.card}>
            {byCategory.map((cat) => (
              <FigureRow
                key={cat.category}
                label={cat.category.replace(/_/g, ' ').toLowerCase()}
                value={rupees(cat.amountRupees)}
                tone={GREEN}
                sublabel={`${cat.count} receipt${cat.count === 1 ? '' : 's'}`}
              />
            ))}
          </View>
        )}
      </Section>

      <Section title="Most recent" note="Open one for its receipt">
        {(c.recent ?? []).length === 0 ? (
          <View style={styles.card}>
            <DashboardEmpty
              icon="receipt-outline"
              title="No receipts yet"
              subtitle="Once a payment is recorded it appears here with its receipt number."
            />
          </View>
        ) : (
          (c.recent ?? []).map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.recent}
              activeOpacity={0.8}
              onPress={() => navigation.openModule('CollectionDetail', { paymentId: p.id })}
              accessibilityRole="button"
            >
              <View style={styles.recentIcon}>
                <Ionicons name="person-outline" size={16} color={GREEN} />
              </View>
              <View style={styles.recentBody}>
                <Text style={styles.recentName} numberOfLines={1}>{p.student ?? 'Donation'}</Text>
                <Text style={styles.recentMeta} numberOfLines={1}>
                  {p.receiptNo ?? p.category} · {p.method?.replace(/_/g, ' ') ?? '—'} · {formatDateTime(p.createdAt)}
                </Text>
              </View>
              <Text style={styles.recentAmount}>{rupees(p.amountRupees)}</Text>
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Text style={styles.footnote}>
        Semester is split from this institution’s own academic-year dates
        {c.academicYearName ? ` (${c.academicYearName})` : ''}, so it is the same window the
        collection report uses. All figures are whole rupees and tenant-scoped.
      </Text>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15 },
  reversal: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 10,
    backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', padding: 12,
  },
  reversalText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 16 },
  note: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 4 },
  noteStrong: { fontWeight: '800', color: '#0f172a' },
  recent: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  recentIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: `${GREEN}14`, alignItems: 'center', justifyContent: 'center' },
  recentBody: { flex: 1 },
  recentName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  recentMeta: { fontSize: 10, color: SLATE, marginTop: 2 },
  recentAmount: { fontSize: 13, fontWeight: '800', color: GREEN },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
