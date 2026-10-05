// F-11 Dashboard — Outstanding dues (docs/users/06 §3.11, block 2).
//
// "Total pending student fees and overdue amount" — two different numbers, and
// the previous dashboard screen reported only the first while labelling a
// *bill count* as a count of defaulters.
//
// Three rules hold on this screen, and each one was a defect somewhere:
//
//   • EVERY FIGURE IS A BALANCE (`amount + lateFee − paid`), never the billed
//     amount. A part-paid bill reported at its original value is the single most
//     expensive mistake a receivables screen can make: it tells the office it is
//     owed ₹1.35L when the family owes ₹45,000, and then chases them for it.
//
//   • EVERY AGE IS COMPUTED FROM `dueDate`, not from `FeeDue.daysOverdue`. That
//     column is denormalised and drifts. The old screen filtered on it for its
//     defaulter list and never refreshed it, so who counted as a defaulter
//     depended on when somebody last opened the dues desk. F-10 found the same
//     bug in the broadcast audience; it was here too.
//
//   • THE DEFAULTER COUNT IS OF FAMILIES, not bills. A student with four unpaid
//     fees is one defaulter who needs one phone call, and a list of four rows
//     makes the work look four times bigger than it is.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { RED, GREEN, SLATE, MUTED, compactRupees, rupees, percentPhrase, balancePhrase } from '../../dashboardMeta';
import {
  DashboardEmpty, DashboardScreen, FigureRow, Section, SpendBar, StatGrid, StatCell, goToRoute, useDashboard,
} from '../../dashboardUi';

export default function DashboardDues({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardBlock('DUES'),
  );

  const d = data ?? {};
  const aging = d.aging ?? [];
  const agingMax = aging.reduce((m, b) => Math.max(m, b.amountRupees), 0);
  const topDebtors = d.topDebtors ?? [];

  return (
    <DashboardScreen
      title="Outstanding dues"
      subtitle="Balances still collectible — not the amounts originally billed."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <Section
        title="What is owed"
        note={d.defaulterMinDays ? `Defaulter = ${d.defaulterMinDays}+ days past due` : undefined}
      >
        <View style={styles.card}>
          <StatGrid>
            <StatCell
              label="Total outstanding"
              value={compactRupees(d.outstandingRupees ?? 0)}
              tone={RED}
              hint={`${d.outstandingBills ?? 0} open bill${d.outstandingBills === 1 ? '' : 's'}`}
            />
            <StatCell
              label="Past its due date"
              value={compactRupees(d.overdueRupees ?? 0)}
              tone={d.overdueRupees > 0 ? RED : GREEN}
              hint={`${d.overdueBills ?? 0} bill${d.overdueBills === 1 ? '' : 's'}`}
            />
            <StatCell
              label="Families owing"
              value={String(d.studentsOwing ?? 0)}
              tone={SLATE}
              hint="Counted once each"
            />
            <StatCell
              label="Defaulters"
              value={String(d.defaulterStudents ?? 0)}
              tone={d.defaulterStudents > 0 ? RED : GREEN}
              hint={`${d.defaulterBills ?? 0} bill${d.defaulterBills === 1 ? '' : 's'} · ${d.defaulterMinDays ?? 7}+ days`}
            />
          </StatGrid>
        </View>

        {/* Overdue, and how bad. Printed only when there is something to print:
            a "₹0 overdue" tile in the alarm colour would train the officer to
            ignore the alarm colour. */}
        {d.overdueRupees > 0 ? (
          <View style={styles.overdueBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={RED} />
            <View style={styles.overdueBody}>
              <Text style={styles.overdueTitle}>{rupees(d.overdueRupees)} is past its due date</Text>
              <Text style={styles.overdueText}>
                {rupees(d.criticalRupees ?? 0)} of that is over {d.criticalOverdueDays ?? 30} days
                late and needs a conversation rather than another letter.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => goToRoute(navigation, 'Dues', true)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={styles.overdueLink}>Chase</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </Section>

      {/* Recovery. Null, not 0%, when nothing was ever billed — "0% recovered"
          and "no bill went out" are different facts and only one is a problem. */}
      <Section title="Recovery" note="Collected against billed">
        <View style={styles.card}>
          <SpendBar
            label="Share of billed fees collected"
            percent={d.recoveryPercent}
            display={percentPhrase(d.recoveryPercent)}
            sublabel={`${rupees(d.paidRupees ?? 0)} of ${rupees(d.billedRupees ?? 0)}`}
          />
          {d.recoveryPercent === null ? (
            <Text style={styles.note}>
              No bill has been raised yet, so there is nothing to recover and no percentage to
              show. That is a different situation from recovering nothing, and this screen does
              not conflate them.
            </Text>
          ) : null}
        </View>
      </Section>

      {/* The receivables ageing, on the dues desk's OWN buckets. Taking the
          buckets from the desk rather than inventing a second set is what stops
          this screen and the recovery screen from disagreeing about how old a
          bill is. */}
      <Section title="How old the money is" note={agingMax > 0 ? `Oldest bucket ${compactRupees(agingMax)}` : undefined}>
        <View style={styles.card}>
          {agingMax === 0 ? (
            <DashboardEmpty
              icon="shield-checkmark-outline"
              title="Nothing outstanding"
              subtitle="Every bill raised has been settled in full."
            />
          ) : (
            aging.map((b) => (
              <SpendBar
                key={b.id}
                label={`${b.label}${b.bills === 0 ? ' — clear' : ` · ${b.bills} bill${b.bills === 1 ? '' : 's'}`}`}
                percent={agingMax > 0 ? (b.amountRupees / agingMax) * 100 : 0}
                display={rupees(b.amountRupees)}
                sublabel={b.bills === 0 ? undefined : `Average ${rupees(Math.round(b.amountRupees / b.bills))} per bill`}
              />
            ))
          )}
        </View>
      </Section>

      {/* Family-level, not bill-level. One family owing across six fees is one
          problem to solve. */}
      <Section title="Biggest balances" note="Per family, not per bill">
        {topDebtors.length === 0 ? (
          <View style={styles.card}>
            <DashboardEmpty
              icon="people-outline"
              title="Nobody owes anything"
              subtitle="There are no open balances to chase."
            />
          </View>
        ) : (
          topDebtors.map((s) => (
            <TouchableOpacity
              key={s.studentProfileId}
              style={styles.debtor}
              activeOpacity={0.8}
              onPress={() => navigation.openModule('StudentDues', { studentProfileId: s.studentProfileId })}
              accessibilityRole="button"
            >
              <View style={styles.debtorIcon}>
                <Ionicons name="person-outline" size={16} color={RED} />
              </View>
              <View style={styles.debtorBody}>
                <Text style={styles.debtorName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.debtorMeta} numberOfLines={1}>
                  {s.rollNo} · {s.bills} open bill{s.bills === 1 ? '' : 's'} · {balancePhrase(s.balanceRupees, s.oldestOverdueDays)}
                </Text>
              </View>
              <Text style={styles.debtorAmount}>{rupees(s.balanceRupees)}</Text>
            </TouchableOpacity>
          ))
        )}
      </Section>

      <Text style={styles.footnote}>
        Every age is worked out from the bill’s own due date, not from a stored counter that can
        drift. Waived and superseded bills are excluded — they are decisions, not balances.
        A cleared bill is never reported as owing, even if its status column says otherwise.
      </Text>
    </DashboardScreen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15 },
  overdueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 10,
    backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', padding: 13,
  },
  overdueBody: { flex: 1 },
  overdueTitle: { fontSize: 13, fontWeight: '800', color: '#991b1b' },
  overdueText: { fontSize: 10, color: '#b91c1c', marginTop: 3, lineHeight: 14 },
  overdueLink: { fontSize: 12, fontWeight: '700', color: RED },
  note: { fontSize: 10, color: SLATE, lineHeight: 15, marginTop: 4 },
  debtor: {
    flexDirection: 'row', alignItems: 'center', gap: 11,
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eef2f7', padding: 12, marginBottom: 8,
  },
  debtorIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: `${RED}14`, alignItems: 'center', justifyContent: 'center' },
  debtorBody: { flex: 1 },
  debtorName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  debtorMeta: { fontSize: 10, color: SLATE, marginTop: 2 },
  debtorAmount: { fontSize: 13, fontWeight: '800', color: RED },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
