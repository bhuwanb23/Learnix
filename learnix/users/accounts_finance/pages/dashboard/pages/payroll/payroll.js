// F-11 Dashboard — Payroll summary (docs/users/06 §3.11, block 4).
//
// "Current payroll, pending salaries and upcoming payment dates" — and the old
// screen answered the first of those wrongly: it published
// `PayrollRun.findFirst(orderBy: createdAt desc)`, which is the most recently
// CREATED run, not the run for the current month. An office that touched last
// quarter's run last had it reported as "this month" with nothing on screen to
// say so. A month with no run is now an explicit "not raised yet", which is a
// different and much more useful statement.
//
// ON THE DUE DATE. `PayrollRun` has no payment-date column. Inventing one in the
// database would be a migration to record a convention that is not really data,
// so the policy lives on the server, is published in `duePolicy`, and is printed
// on this screen. Salaries for month M are due on the 7th of the month AFTER —
// which is why December's salaries are due on 7 January. The screen says that is a
// policy, because a date the office never recorded must not be presented as one
// it did.
//
// A DRAFT run is a proposal, not a liability. Pending salaries count APPROVED
// runs only; the draft is reported beside them as something still to decide.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { THEME, GREEN, RED, SLATE, MUTED, compactRupees, rupees, percentPhrase, formatDate } from '../../../dashboardMeta';
import {
  DashboardEmpty, DashboardScreen, FigureRow, Section, SpendBar, StatGrid, StatCell, goToRoute, useDashboard,
} from '../../../dashboardUi';

export default function DashboardPayroll({ navigation }) {
  const { data, loading, refreshing, error, reload, onRefresh } = useDashboard(
    () => accountsApi.dashboardBlock('PAYROLL'),
  );

  const p = data ?? {};
  const run = p.currentRun;
  const upcoming = p.upcoming ?? [];

  return (
    <DashboardScreen
      title="Payroll summary"
      subtitle={`${p.thisMonthLabel ?? 'This month'} · ${p.staffCount ?? 0} on the staff roll`}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRetry={reload}
      onRefresh={onRefresh}
    >
      {/* The run for THIS month, or an explicit statement that there isn't one.
          Those are different facts and an officer needs to be able to tell them
          apart before quoting a salary figure. */}
      <Section title="This month's run" note={p.thisMonth}>
        <View style={styles.card}>
          {!p.currentRunRaised ? (
            <View style={styles.noRun}>
              <Ionicons name="calendar-outline" size={22} color={AMBER_ICON} />
              <View style={styles.noRunBody}>
                <Text style={styles.noRunTitle}>No run raised for {p.thisMonthLabel}</Text>
                <Text style={styles.noRunText}>
                  {p.staffCount ?? 0} {p.staffCount === 1 ? 'person is' : 'people are'} on the
                  staff roll, and none of them is owed anything yet — a run is a proposal until it
                  is approved. It is due by {formatDate(p.currentRunDueOn)}.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => goToRoute(navigation, 'Payroll', true)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Raise it</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.runHead}>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor(run.status)}14` }]}>
                  <Text style={[styles.statusText, { color: statusColor(run.status) }]}>{run.status}</Text>
                </View>
                <Text style={styles.runNet}>{rupees(run.netRupees)}</Text>
              </View>
              <Text style={styles.runSub}>
                Net of {rupees(run.deductionsRupees)} deductions from {rupees(run.grossRupees)} gross
              </Text>
              <SpendBar
                label="Payslips paid"
                percent={run.paidPercent}
                display={percentPhrase(run.paidPercent)}
                sublabel={`${run.paidCount} of ${run.entryCount} paid${run.pendingCount > 0 ? ` · ${run.pendingCount} to go` : ''}`}
              />
              <TouchableOpacity
                style={styles.openRun}
                activeOpacity={0.8}
                onPress={() => navigation.openModule('PayrollRunDetail', { runId: run.runId })}
                accessibilityRole="button"
              >
                <Ionicons name="open-outline" size={14} color={THEME} />
                <Text style={styles.openRunText}>Open the run</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Section>

      {/* Money that is genuinely owed: an APPROVED run with entries still unpaid.
          This is the block the old screen did not have at all, which is why an
          approved-but-unpaid salary run was invisible on the screen an officer
          opens first. */}
      <Section
        title="Salaries still to pay"
        note={upcoming.length > 0 ? `${upcoming.length} run${upcoming.length === 1 ? '' : 's'}` : 'All paid'}
      >
        <View style={styles.card}>
          <StatGrid>
            <StatCell
              label="Outstanding"
              value={compactRupees(p.pendingRupees ?? 0)}
              tone={p.pendingRupees > 0 ? AMBER_ICON : GREEN}
              hint={`${p.pendingCount ?? 0} ${p.pendingCount === 1 ? 'person' : 'people'} unpaid`}
            />
            <StatCell
              label="Runs past due"
              value={String(p.overdueRunCount ?? 0)}
              tone={p.overdueRunCount > 0 ? RED : GREEN}
              hint="Approved, transfers not out"
            />
          </StatGrid>

          {upcoming.length === 0 ? (
            <Text style={styles.clearNote}>
              Every approved salary has been paid. Nothing is outstanding on any run.
            </Text>
          ) : (
            upcoming.map((u) => (
              <TouchableOpacity
                key={u.runId}
                style={styles.upcoming}
                activeOpacity={0.8}
                onPress={() => navigation.openModule('PayrollRunDetail', { runId: u.runId })}
                accessibilityRole="button"
              >
                <View style={[styles.upcomingIcon, { backgroundColor: u.overdue ? `${RED}14` : `${THEME}14` }]}>
                  <Ionicons name="card-outline" size={16} color={u.overdue ? RED : THEME} />
                </View>
                <View style={styles.upcomingBody}>
                  <Text style={styles.upcomingTitle}>
                    {u.month} · {rupees(u.pendingRupees)}
                  </Text>
                  <Text style={styles.upcomingMeta}>
                    {u.pendingCount} {u.pendingCount === 1 ? 'person' : 'people'} unpaid · due{' '}
                    {formatDate(u.dueOn)} · waiting {u.daysWaiting}d
                  </Text>
                </View>
                {u.overdue ? <View style={styles.latePill}><Text style={styles.lateText}>LATE</Text></View> : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      </Section>

      <Section title="This year so far" note={`${p.ytdMonths ?? 0} run${p.ytdMonths === 1 ? '' : 's'} raised`}>
        <View style={styles.card}>
          <FigureRow
            label="Net owed"
            value={rupees(p.ytdNetRupees ?? 0)}
            sublabel="Across every run raised this calendar year"
          />
          <FigureRow
            label="Net paid"
            value={rupees(p.ytdPaidRupees ?? 0)}
            tone={GREEN}
            sublabel={
              p.ytdNetRupees > 0
                ? `${percentPhrase(Math.round((p.ytdPaidRupees / p.ytdNetRupees) * 100))} of what was owed`
                : 'Nothing owed yet this year'
            }
          />
        </View>
      </Section>

      {/* The policy, printed. A date the office never recorded must not be
          presented as one it did. */}
      {p.duePolicy ? (
        <View style={styles.policy}>
          <Ionicons name="information-circle-outline" size={14} color={SLATE} />
          <Text style={styles.policyText}>{p.duePolicy}</Text>
        </View>
      ) : null}

      <Text style={styles.footnote}>
        A DRAFT run is a proposal, not a liability, so pending salaries count approved runs only.
        Overdue means an approved run with unpaid entries for more than the payroll alert
        threshold, not a run that is late by some rule this screen invented.
      </Text>
    </DashboardScreen>
  );
}

const AMBER_ICON = '#d97706';

const statusColor = (status) => {
  if (status === 'PAID') return GREEN;
  if (status === 'APPROVED') return THEME;
  return AMBER_ICON;
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#eef2f7', padding: 15 },
  noRun: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  noRunBody: { flex: 1 },
  noRunTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  noRunText: { fontSize: 11, color: SLATE, marginTop: 3, lineHeight: 15 },
  link: { fontSize: 12, fontWeight: '700', color: THEME },
  runHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '800' },
  runNet: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  runSub: { fontSize: 10, color: SLATE, marginTop: 3, marginBottom: 12 },
  openRun: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  openRunText: { fontSize: 12, fontWeight: '700', color: THEME },
  clearNote: { fontSize: 11, color: SLATE, lineHeight: 16, marginTop: 10 },
  upcoming: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 11,
  },
  upcomingIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  upcomingBody: { flex: 1 },
  upcomingTitle: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  upcomingMeta: { fontSize: 10, color: SLATE, marginTop: 2 },
  latePill: { backgroundColor: RED, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  lateText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  policy: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 16,
    backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 12,
  },
  policyText: { flex: 1, fontSize: 10, color: SLATE, lineHeight: 15 },
  footnote: { fontSize: 10, color: MUTED, marginTop: 18, lineHeight: 15 },
});
