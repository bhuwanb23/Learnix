// F-11 Dashboard — Financial alerts (docs/users/06 §3.11, block 6).
//
// "Unusual transactions, overdue payments and reconciliation issues" — three
// families, and the separation is the design. "Something is wrong with the money"
// is not a question anybody can act on. The old screen had two flat strings
// ("3 expense(s) awaiting approval", "12 student(s) with unpaid dues") with no
// figure, no route, and no mention of a single unusual transaction or
// reconciliation problem — which are the two things an accounts officer most
// needs to see before a board meeting.
//
//   UNUSUAL        — one transaction that does not look like the others. There
//                    are many transactions; this is the one to look at.
//   OVERDUE        — money that is late, in BOTH directions. A family owes us,
//                    or a member of staff is owed. The old screen only knew the
//                    first, so an approved-but-unpaid salary run was invisible on
//                    the screen an officer opens first.
//   RECONCILIATION  — the books disagree with each other. Nothing is late; the
//                    numbers simply do not add up. This is the worst of the three,
//                    because it means no figure on this screen can be trusted
//                    until it is resolved.
//
// NOTHING HERE IS STORED. Every alert is a question the database can answer right
// now, so a problem that has been fixed stops being reported without anybody
// dismissing it, and an alert can never be read twice or left behind describing a
// problem that no longer exists.
//
// A CLEAR ALERT IS PAINTED GREEN WITH A TICK, never the alarm icon in amber. A
// screen that paints "0 problems" as a problem is a screen whose colours stop
// meaning anything, and the officer is the one who pays for that.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { GREEN, RED, SLATE, MUTED, rupees, timeAgo, overduePhrase, percentPhrase } from '../../dashboardMeta';
import {
  AlertRow, DashboardEmpty, DashboardScreen, FamilyHeader, goToRoute, useDashboard,
} from '../../dashboardUi';

export default function DashboardAlerts({ navigation }) {
  // The family is held here rather than passed in a route param, because tapping
  // an alert on the hub opens the screen focused on that KIND and the screen
  // works out which family it belongs to. A param that had to be kept in step
  // with the registry is a param that will drift.
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardAlerts(),
  );

  const a = data ?? {};
  const families = a.families ?? [];
  const kinds = a.kinds ?? [];

  return (
    <DashboardScreen
      title="Financial alerts"
      subtitle="Worked out from live rows each time this screen opens. Nothing is stored."
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      <View style={[styles.hero, a.firing === 0 ? styles.heroClear : styles.heroBad]}>
        <Text style={[styles.heroLabel, a.firing === 0 ? styles.heroLabelClear : styles.heroLabelBad]}>
          {a.firing === 0
            ? 'All clear'
            : `${a.firing} of ${kinds.length} checks failing`}
        </Text>
        <Text style={styles.heroValue}>
          {a.firing === 0
            ? 'Nothing to look at'
            : `${a.total ?? 0} item${a.total === 1 ? '' : 's'} need a decision`}
        </Text>
        <Text style={styles.heroHint}>
          {a.firing === 0
            ? 'No unusual transaction, no overdue money in either direction, and every set of books adds up.'
            : 'Each one below opens the screen where it can be fixed. A reconciliation failure means the other figures are provisional until it is resolved.'}
        </Text>
      </View>

      {families.length === 0 ? (
        <DashboardEmpty
          icon="shield-checkmark-outline"
          title="No alert families published"
          subtitle="The server did not return a list of checks to run."
        />
      ) : (
        families.map((f) => {
          const inFamily = kinds.filter((k) => k.family === f.id);
          return (
            <View key={f.id}>
              <FamilyHeader family={f} count={f.count} />
              {inFamily.length === 0 ? (
                <Text style={styles.noKinds}>The server published no checks in this family.</Text>
              ) : (
                inFamily.map((k) => (
                  <View key={k.id}>
                    <AlertRow
                      alert={k}
                      onPress={() => {
                        // A firing alert goes where the problem can be fixed. A
                        // clear one expands here instead — sending a user to a
                        // dues screen because nothing is wrong is noise.
                        if (k.count > 0) goToRoute(navigation, k.route, k.isTab);
                      }}
                    />
                    {k.count > 0 ? <AlertDetail kind={k} /> : null}
                  </View>
                ))
              )}
            </View>
          );
        })
      )}

      <Text style={styles.footnote}>
        Nothing here is stored, so a problem that has been fixed stops being reported without
        anybody dismissing it, and an alert can never be read twice or left behind.
        {'\n'}The four reconciliation checks are the same four the financial alerts desk runs,
        counted by the same server helpers — the two screens cannot report different numbers for
        the same problem.
      </Text>
    </DashboardScreen>
  );
}

/**
 * The rows behind one firing alert.
 *
 * Each kind carries a different shape, so they are rendered by kind rather than
 * through one generic list. A generic list would need every row to have the same
 * keys, and the two or three that did would print "undefined" in a column
 * labelled "amount" — which on a screen about money is the worst possible
 * failure.
 */
function AlertDetail({ kind }) {
  const items = Array.isArray(kind.items) ? kind.items : [];
  if (items.length === 0) {
    // A count with no rows is possible (a payroll-unfooted run, for instance,
    // carries a count but its items are the run identifiers). Saying so is
    // better than drawing an empty section.
    return (
      <View style={styles.noItems}>
        <Ionicons name="information-circle-outline" size={13} color={MUTED} />
        <Text style={styles.noItemsText}>
          {kind.count} found. Open {kind.label.toLowerCase()} on the linked screen for the detail.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.items}>
      {items.slice(0, 8).map((item, i) => (
        <View key={item.paymentId ?? item.runId ?? item.applicationId ?? item.budgetId ?? i} style={styles.item}>
          <Text style={styles.itemTitle} numberOfLines={1}>{titleFor(kind.id, item)}</Text>
          <Text style={styles.itemSub} numberOfLines={2}>{subtitleFor(kind.id, item)}</Text>
          {amountFor(kind.id, item) ? (
            <Text style={[styles.itemAmount, amountColor(kind.id)]}>{amountFor(kind.id, item)}</Text>
          ) : null}
        </View>
      ))}
      {items.length > 8 ? (
        <Text style={styles.more}>and {items.length - 8} more — open the linked screen to see them all.</Text>
      ) : null}
    </View>
  );
}

const titleFor = (kind, i) => {
  switch (kind) {
    case 'LARGE_PAYMENT':
    case 'LARGE_CASH':
      return i.referenceNo ?? 'Payment';
    case 'DUES_OVERDUE':
      return i.student ?? 'Student';
    case 'PAYROLL_OVERDUE':
      return `Payroll run ${i.month}`;
    case 'PAYROLL_UNFOOTED':
      return `Payroll run ${i.month}`;
    case 'UNALLOCATED_RECEIPTS':
      return i.referenceNo ?? 'Receipt';
    case 'BUDGET_OVERRUN':
      return i.category ?? 'Budget line';
    case 'SCHOLARSHIP_UNRELEASED':
      return i.student ?? 'Student';
    default:
      return 'Item';
  }
};

const subtitleFor = (kind, i) => {
  switch (kind) {
    case 'LARGE_PAYMENT':
    case 'LARGE_CASH':
      return `${i.reason} · ${i.method} · ${timeAgo(i.receivedAt)}`;
    case 'DUES_OVERDUE':
      return `${i.rollNo} · ${i.bills} open bill${i.bills === 1 ? '' : 's'} · ${overduePhrase(i.oldestOverdueDays)}`;
    case 'PAYROLL_OVERDUE':
      return `${i.pendingCount} unpaid · due waiting ${i.daysWaiting} day${i.daysWaiting === 1 ? '' : 's'}`;
    case 'PAYROLL_UNFOOTED':
      return `Header says ${rupees(i.headerNetRupees)}, payslips add up to ${rupees(i.entryNetRupees)} — ${i.status}`;
    case 'UNALLOCATED_RECEIPTS':
      return `Received ${timeAgo(i.receivedAt)} and not matched to any bill`;
    case 'BUDGET_OVERRUN':
      return `FY ${i.fiscalYear} — planned ${rupees(i.plannedRupees)}, spent ${rupees(i.spentRupees)}`;
    case 'SCHOLARSHIP_UNRELEASED':
      return `${i.scheme} · approved ${rupees(i.approvedRupees)} · waiting ${i.daysWaiting ?? 0}d`;
    default:
      return '';
  }
};

const amountFor = (kind, i) => {
  switch (kind) {
    case 'LARGE_PAYMENT':
    case 'LARGE_CASH':
      return rupees(i.amountRupees);
    case 'DUES_OVERDUE':
      return rupees(i.balanceRupees);
    case 'PAYROLL_OVERDUE':
      return `${rupees(i.pendingRupees)} unpaid`;
    case 'PAYROLL_UNFOOTED':
      return `Off by ${rupees(Math.abs(i.differenceRupees))}`;
    case 'UNALLOCATED_RECEIPTS':
      return `${rupees(i.unallocatedRupees)} unallocated`;
    case 'BUDGET_OVERRUN':
      return `Over by ${rupees(i.overRupees)}${i.percent === null ? '' : ` (${percentPhrase(i.percent)})`}`;
    case 'SCHOLARSHIP_UNRELEASED':
      return `${rupees(i.outstandingRupees)} unreleased`;
    default:
      return null;
  }
};

/** The colour a figure is painted in, per kind. Cash and unreleased money are red. */
const amountColor = (kind) =>
  kind === 'LARGE_PAYMENT' || kind === 'LARGE_CASH' || kind === 'DUES_OVERDUE' || kind === 'SCHOLARSHIP_UNRELEASED'
    ? RED
    : '#0f172a';

const styles = StyleSheet.create({
  hero: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 4 },
  heroClear: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  heroBad: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  heroLabel: { fontSize: 12, fontWeight: '700' },
  heroLabelClear: { color: '#065f46' },
  heroLabelBad: { color: '#991b1b' },
  heroValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  heroHint: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 7 },
  noKinds: { fontSize: 11, color: MUTED, marginBottom: 8, marginLeft: 4 },
  noItems: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginLeft: 12, marginTop: -4, marginBottom: 8,
  },
  noItemsText: { flex: 1, fontSize: 10, color: MUTED, lineHeight: 14 },
  items: { marginLeft: 12, marginBottom: 10, borderLeftWidth: 2, borderLeftColor: '#e2e8f0', paddingLeft: 10 },
  item: { marginBottom: 9 },
  itemTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  itemSub: { fontSize: 10, color: SLATE, marginTop: 2, lineHeight: 14 },
  itemAmount: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  more: { fontSize: 10, color: MUTED, marginTop: 2 },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
