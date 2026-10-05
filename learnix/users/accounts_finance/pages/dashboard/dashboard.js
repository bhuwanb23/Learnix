// F-11 Dashboard — the finance officer's morning screen (docs/users/06 §3.11).
//
// What this screen replaced: a hero reading "₹4.2 Cr collected of ₹5.1 Cr target"
// where the "target" was the sum of every ACTIVE fee structure — a price list,
// not a goal, so the ratio could exceed 100% and did — plus three stat tiles, a
// list of five recent payments, four budget bars whose percentages were CLAMPED
// so a line at 180% of plan read "100%", and two alert strings ("3 expense(s)
// awaiting approval") with no figure and nowhere to go.
//
// It is now seven blocks, each answering one question, each with a route:
//
//   1. Total collection   — today, this month, this semester
//   2. Outstanding dues   — balances, not billed amounts; overdue by due date
//   3. Expense overview   — month vs fiscal-year plan, plus what's pending
//   4. Payroll summary    — this month's run, salaries due, and when
//   5. Scholarship status — promised vs approved vs actually released
//   6. Financial alerts   — unusual, overdue, and reconciliation, in families
//   7. Quick actions      — four, each with the live count of what it acts on
//
// EVERYTHING COMES FROM ONE CALL. The block list is NOT hard-coded here: it
// arrives from `/dashboard/catalogue` with each block's id, label, icon, colour
// and route, so a block added on the server draws itself. `dashboardMeta.js`
// still mirrors the ids because the seven sub-screens are separate modules that
// must exist at build time, and `audit-dashboard-ui.ts` asserts the two agree.
//
// The hero says WHICH WINDOW it is showing. The old one had no window at all, so
// "₹4.2 Cr collected" and "₹18.4 L collected" were the same sentence — and a
// number with nothing to compare it to is not information.
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  THEME, GREEN, RED, AMBER, SLATE, MUTED,
  compactRupees, rupees, windowMeta, percentPhrase,
} from './dashboardMeta';
import {
  ActionTile, BlockCard, DashboardScreen, Section, SpendBar, StatGrid, StatCell,
  goToRoute, useDashboard,
} from './dashboardUi';

export default function AccountsDashboard({ navigation }) {
  const catalogue = useDashboard(() => accountsApi.dashboardCatalogue());
  const overview = useDashboard(() => accountsApi.dashboardOverview());

  const reload = useCallback(() => {
    catalogue.reload();
    overview.reload();
  }, [catalogue, overview]);

  // The block list comes from the server. The mirror in dashboardMeta.js is the
  // FALLBACK for the frame before the catalogue lands, and nothing more — a
  // fallback that also acted as the source would be a second list to keep true.
  const blocks = catalogue.data?.blocks ?? [];
  const thresholds = catalogue.data?.thresholds ?? {};

  const d = overview.data;
  const collections = d?.collections;
  const dues = d?.dues;
  const expenses = d?.expenses;
  const payroll = d?.payroll;
  const scholarships = d?.scholarships;
  const alerts = d?.alerts;
  const actions = d?.actions ?? [];

  const reloadBoth = () => reload();

  return (
    <DashboardScreen
      loading={overview.loading && catalogue.loading}
      refreshing={overview.refreshing || catalogue.refreshing}
      error={overview.error ?? catalogue.error}
      onRetry={reloadBoth}
      onRefresh={reloadBoth}
    >
      {/* The hero. It states the WINDOW before the number, because the number
          means something different in each one — and it states that there is no
          target, because the old target was a fiction built out of a price list. */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>Collected this month</Text>
          <View style={styles.heroStamp}>
            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroStampText}>Calendar month</Text>
          </View>
        </View>
        <Text style={styles.heroValue}>{rupees(collections?.monthRupees ?? 0)}</Text>
        <View style={styles.heroRule} />
        <View style={styles.heroRow}>
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>Today</Text>
            <Text style={styles.heroCellValue}>{compactRupees(collections?.todayRupees ?? 0)}</Text>
            <Text style={styles.heroCellNote}>{collections?.todayCount ?? 0} receipt{collections?.todayCount === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroCell}>
            <Text style={styles.heroCellLabel}>This semester</Text>
            <Text style={styles.heroCellValue}>{compactRupees(collections?.semesterRupees ?? 0)}</Text>
            <Text style={styles.heroCellNote} numberOfLines={1}>
              {collections?.semesterLabel ?? '—'}
            </Text>
          </View>
        </View>
        <Text style={styles.heroFootnote}>
          {windowMeta('MONTH')?.why}
        </Text>
      </View>

      {/* The three numbers an officer checks before they check anything else. */}
      <View style={styles.statCard}>
        <StatGrid>
          <StatCell
            label="Still owing"
            value={compactRupees(dues?.outstandingRupees ?? 0)}
            tone={RED}
            hint="Balance, not billed amount"
            onPress={() => navigation.openModule('DashboardDues')}
          />
          <StatCell
            label="Of that, overdue"
            value={compactRupees(dues?.overdueRupees ?? 0)}
            tone={dues?.overdueRupees > 0 ? RED : GREEN}
            hint={`${dues?.overdueBills ?? 0} bill${dues?.overdueBills === 1 ? '' : 's'} past due`}
            onPress={() => navigation.openModule('DashboardDues')}
          />
          <StatCell
            label="Spent this month"
            value={compactRupees(expenses?.monthRupees ?? 0)}
            tone={AMBER}
            hint={`${percentPhrase(expenses?.utilisationPercent)} of FY plan`}
            onPress={() => navigation.openModule('DashboardExpenses')}
          />
          <StatCell
            label="Salaries still to pay"
            value={compactRupees(payroll?.pendingRupees ?? 0)}
            tone={payroll?.overdueRunCount > 0 ? RED : THEME}
            hint={
              payroll?.pendingCount > 0
                ? `${payroll.pendingCount} ${payroll.pendingCount === 1 ? 'person' : 'people'} unpaid`
                : 'All approved salaries paid'
            }
            onPress={() => navigation.openModule('DashboardPayroll')}
          />
        </StatGrid>
      </View>

      {/* A reconciliation warning sits ABOVE the blocks, not below them. If the
          books do not add up, every figure underneath is provisional, and a user
          who reads top-to-bottom has to be stopped before they reach the money. */}
      {alerts && alerts.firing > 0 ? (
        <TouchableWarningBlock
          alerts={alerts}
          navigation={navigation}
          onPress={() => navigation.openModule('DashboardAlerts')}
        />
      ) : null}

      {alerts && alerts.firing === 0 ? (
        <View style={styles.allClear}>
          <Ionicons name="shield-checkmark-outline" size={15} color={GREEN} />
          <Text style={styles.allClearText}>
            All eight financial checks are clear. Nothing unusual, nothing overdue, and the
            books add up.
          </Text>
        </View>
      ) : null}

      {/* The seven blocks, in the order they are asked about. */}
      <Section title="Where the money stands" note="Each opens with its own detail">
        {blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            badge={badgeFor(block.id, { alerts, dues, payroll, scholarships })}
            onPress={() => goToRoute(navigation, block.route, block.isTab)}
          >
            <BlockSummary id={block.id} data={d} />
          </BlockCard>
        ))}
        {blocks.length === 0 ? (
          <Text style={styles.noBlocks}>
            The server did not return a block list, so there is nothing to show here.
          </Text>
        ) : null}
      </Section>

      {/* The four actions an officer reaches for in the first five minutes, each
          with the LIVE count of what it would act on. */}
      {actions.length > 0 ? (
        <Section title="Do something now" note="Each shows what it would act on">
          {actions.map((a) => (
            <ActionTile
              key={a.id}
              action={a}
              onPress={() => goToRoute(navigation, a.route, a.isTab)}
            />
          ))}
        </Section>
      ) : null}

      {/* The thresholds, published. An officer who wants to know why a payment
          was flagged needs the number, not "a large amount". */}
      {thresholds.unusualMultiple ? (
        <Text style={styles.footnote}>
          A payment is flagged as unusual when it is at least {thresholds.unusualMultiple}× the
          usual payment here and over {rupees(thresholds.unusualFloorRupees)}, or when it is cash
          over {rupees(thresholds.cashReviewRupees)}. Compared against this institution's own
          receipts from the last {thresholds.unusualWindowDays} days, not a fixed rule.
          {'\n'}A defaulter is a bill at least {thresholds.defaulterMinDays} days past its due
          date, worked out from the date itself. {payroll?.duePolicy ?? ''}
        </Text>
      ) : null}
    </DashboardScreen>
  );
}

/**
 * The badge on a block card.
 *
 * Only blocks that have something to count get one, and only counts that mean
 * "look here" — not a count of every open bill on the dues card, which would be
 * alarming by default and stop meaning anything.
 */
function badgeFor(id, { alerts, dues, payroll, scholarships }) {
  if (id === 'ALERTS') return alerts?.total ?? 0;
  if (id === 'DUES') return dues?.defaulterStudents ?? 0;
  if (id === 'PAYROLL') return payroll?.overdueRunCount ?? 0;
  if (id === 'SCHOLARSHIPS') return scholarships?.unreleasedCount ?? 0;
  return null;
}

/**
 * One real figure under each block card, so the hub answers something without a
 * tap.
 *
 * This reads from the overview the hub already fetched — no seventh request, and
 * no chance of the card and the strip disagreeing because they were loaded at
 * different moments. Each block has its OWN shape, so they are rendered by id
 * rather than through one generic list; a generic list would print "undefined"
 * in a column labelled "amount".
 */
function BlockSummary({ id, data }) {
  if (!data) return null;

  if (id === 'COLLECTIONS') {
    const c = data.collections;
    return (
      <>
        <Text style={styles.summary}>{rupees(c.todayRupees)} today · {rupees(c.monthRupees)} this month</Text>
        <Text style={styles.summaryNote}>
          {c.semesterLabel} · {rupees(c.semesterRupees)}
          {c.reversedCount > 0 ? ` · ${c.reversedCount} reversal${c.reversedCount === 1 ? '' : 's'} excluded` : ''}
        </Text>
      </>
    );
  }

  if (id === 'DUES') {
    const d2 = data.dues;
    return (
      <>
        <Text style={styles.summary}>
          {rupees(d2.outstandingRupees)} across {d2.outstandingBills} open bill{d2.outstandingBills === 1 ? '' : 's'}
        </Text>
        <Text style={styles.summaryNote}>
          {d2.studentsOwing} {d2.studentsOwing === 1 ? 'family' : 'families'} owe · {d2.defaulterStudents} defaulter{d2.defaulterStudents === 1 ? '' : 's'} at {d2.defaulterMinDays}+ days
        </Text>
      </>
    );
  }

  if (id === 'EXPENSES') {
    const e = data.expenses;
    return (
      <>
        <Text style={styles.summary}>
          {rupees(e.spentRupees)} of {rupees(e.plannedRupees)} planned
        </Text>
        <SpendBar
          label={`${e.fiscalYear} budget used`}
          percent={e.utilisationPercent}
          display={percentPhrase(e.utilisationPercent)}
          sublabel={`${rupees(e.remainingRupees)} left · ${rupees(e.pendingRupees)} pending approval`}
          over={e.overrunCount > 0}
        />
      </>
    );
  }

  if (id === 'PAYROLL') {
    const p = data.payroll;
    if (!p.currentRun) {
      return (
        <>
          <Text style={styles.summary}>No payroll run raised for {p.thisMonthLabel}</Text>
          <Text style={styles.summaryNote}>
            {p.staffCount} on the staff roll. A run is a proposal until it is approved, so nothing
            is owed yet.
          </Text>
        </>
      );
    }
    return (
      <>
        <Text style={styles.summary}>
          {p.currentRun.status} · {rupees(p.currentRun.netRupees)} net for {p.currentRun.entryCount} staff
        </Text>
        <Text style={styles.summaryNote}>
          {p.currentRun.paidCount} paid · {p.currentRun.pendingCount} to go
          {p.pendingCount > 0 ? ` · ${rupees(p.pendingRupees)} outstanding across all runs` : ''}
        </Text>
      </>
    );
  }

  if (id === 'SCHOLARSHIPS') {
    const s = data.scholarships;
    return (
      <>
        <Text style={styles.summary}>
          {rupees(s.disbursedRupees)} released of {rupees(s.approvedRupees)} approved
        </Text>
        <Text style={styles.summaryNote}>
          {percentPhrase(s.releasePercent)} of what was granted has reached a student
          {s.unreleasedCount > 0 ? ` · ${rupees(s.unreleasedRupees)} still unreleased` : ''}
        </Text>
      </>
    );
  }

  if (id === 'ALERTS') {
    const a = data.alerts;
    if (a.firing === 0) {
      return <Text style={[styles.summary, { color: GREEN }]}>All eight checks clear.</Text>;
    }
    return (
      <>
        <Text style={[styles.summary, { color: RED }]}>
          {a.firing} of {a.kinds.length} firing · {a.total} item{a.total === 1 ? '' : 's'}
        </Text>
        <Text style={styles.summaryNote}>
          {a.families.filter((f) => f.count > 0).map((f) => f.label).join(' · ')}
        </Text>
      </>
    );
  }

  if (id === 'QUICK_ACTIONS') {
    const acts = data.actions ?? [];
    return (
      <Text style={styles.summaryNote}>
        {acts.filter((x) => x.enabled !== false).length} of {acts.length} available right now
      </Text>
    );
  }

  return null;
}

/**
 * The reconciliation warning.
 *
 * It says which family is firing and what the total is, and it sits above every
 * figure because a user who scrolls past a payroll header that disagrees with
 * its own payslips has read a net salary total that is not real.
 */
function TouchableWarningBlock({ alerts, navigation, onPress }) {
  const firing = alerts.families.filter((f) => f.count > 0);
  return (
    <View style={styles.warn}>
      <View style={styles.warnTop}>
        <Ionicons name="warning-outline" size={16} color={RED} />
        <Text style={styles.warnTitle}>
          {alerts.firing} financial check{alerts.firing === 1 ? '' : 's'} failing
        </Text>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
          <Text style={styles.warnLink}>See all</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.warnBody}>
        {firing.map((f) => `${f.label} (${f.count})`).join(' · ')}
      </Text>
      <Text style={styles.warnNote}>
        A reconciliation failure means a figure below may not be right until it is resolved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: THEME, borderRadius: 16, padding: 18, marginTop: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroLabel: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  heroStamp: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  heroStampText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  heroValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 6, letterSpacing: -1 },
  heroRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'stretch' },
  heroCell: { flex: 1 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginHorizontal: 14 },
  heroCellLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  heroCellValue: { fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroCellNote: { fontSize: 9, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroFootnote: { fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 14, lineHeight: 14, fontStyle: 'italic' },

  statCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#eef2f7', padding: 15, marginTop: 12,
  },

  warn: {
    backgroundColor: '#fef2f2', borderRadius: 14, borderWidth: 1,
    borderColor: '#fecaca', padding: 14, marginTop: 12,
  },
  warnTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  warnTitle: { flex: 1, fontSize: 13, fontWeight: '800', color: '#991b1b' },
  warnLink: { fontSize: 12, fontWeight: '700', color: RED },
  warnBody: { fontSize: 11, color: '#b91c1c', marginTop: 6, lineHeight: 16, fontWeight: '600' },
  warnNote: { fontSize: 10, color: '#b91c1c', marginTop: 6, lineHeight: 14, fontStyle: 'italic' },

  allClear: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: '#ecfdf5', borderRadius: 12, borderWidth: 1,
    borderColor: '#a7f3d0', padding: 12,
  },
  allClearText: { flex: 1, fontSize: 11, color: '#065f46', lineHeight: 15, fontWeight: '600' },

  summary: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 10 },
  summaryNote: { fontSize: 10, color: SLATE, marginTop: 3, lineHeight: 14 },
  noBlocks: { fontSize: 12, color: MUTED, marginTop: 8 },

  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
