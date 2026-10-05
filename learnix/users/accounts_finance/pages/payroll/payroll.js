// F-06 Payroll — the salary desk hub (docs/users/06 §3.4).
//
// The screen this replaces had three stat tiles and a list of runs rendered as
// "2026-08 · ₹60,000 · 1 staff". Underneath, the backend wrote ₹60,000 gross
// and ₹6,000 deductions for every employee regardless of who they were, and the
// only two actions were "run payroll" and "mark paid" — the second of which
// stamped the entire month paid in one click, with no way to pay one person, no
// way to see a payslip, and no idea who had actually been transferred.
//
// What a salary desk actually asks, in this order:
//   · is this month raised yet?
//   · what does it cost, and how does that compare with last month?
//   · what is approved-but-unpaid RIGHT NOW — the real liability?
//   · who is on the payroll, and what are they paid?
//   · what happened to the month I raised three weeks ago?
//
// So this screen is a run list with a money headline, a six-month trend, and the
// roster — and the one number that is genuinely owed is called out on its own,
// because "outstanding" in payroll means unpaid people, not unpaid invoices.
//
// Every figure below comes from the server; none of it is computed on the phone
// from a list the server did not send.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import {
  AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard,
} from '../../../../components/ui';
import {
  THEME, rupees, compactRupees, formatDate, relativeTime,
  runStatusMeta, monthLabel, monthShort, suggestedMonth,
} from './payrollMeta';

export default function PayrollModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [running, setRunning] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await accountsApi.payroll());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const stats = data?.stats || {};
  const runs = data?.runs || [];
  const trend = data?.trend || [];
  const roster = data?.roster || [];

  // Is the month we are living in already raised? Everything else on this screen
  // is history; this is the only question that is forward-looking.
  const currentMonth = data?.thisMonth ?? suggestedMonth();
  const currentRun = useMemo(
    () => runs.find((r) => r.month === currentMonth) ?? null,
    [runs, currentMonth],
  );

  const openRun = useMemo(
    () => runs.find((r) => r.status !== 'PAID') ?? null,
    [runs],
  );

  const maxTrendNet = useMemo(
    () => Math.max(1, ...trend.map((t) => t.netRupees || 0)),
    [trend],
  );

  const handleRunPayroll = () => {
    if (currentRun) {
      Alert.alert(
        'Already raised',
        `${monthLabel(currentRun.month)} has already been raised (${runStatusMeta(currentRun.status).label}). `
          + 'Open it to approve it or pay the staff on it.',
        [{ text: 'Close', style: 'cancel' }],
      );
      return;
    }
    Alert.alert(
      'Raise payroll',
      `Raise payroll for ${monthLabel(currentMonth)}?\n\n`
        + `${roster.length} staff on the payroll will be included, each computed from their own salary. `
        + 'You can apply loss of pay before approving it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise it',
          onPress: async () => {
            setRunning(true);
            try {
              const res = await accountsApi.runPayroll(currentMonth);
              await fetchData();
              Alert.alert(
                'Draft ready',
                `${monthLabel(res.month)} raised with ${res.entryCount} staff.\n\n`
                  + 'Nothing is owed yet — open the run to check the sheet and approve it.',
                [{ text: 'Open run', onPress: () => navigation.openModule('PayrollRunDetail', { runId: res.id }) }],
              );
            } catch (err) {
              Alert.alert('Cannot raise payroll', err.message);
            } finally {
              setRunning(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.85}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        {/* The month being paid. Raising it is the one action that creates work. */}
        <AnimatedCard delay={0} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>{monthLabel(currentMonth)}</Text>
              {currentRun ? (
                <>
                  <Text style={styles.heroValue}>{compactRupees(currentRun.netRupees)}</Text>
                  <Text style={styles.heroSub}>
                    {currentRun.entryCount} staff · {currentRun.status === 'PAID'
                      ? 'paid in full'
                      : `${currentRun.paidCount}/${currentRun.entryCount} paid`}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.heroValueNotRun}>Not raised</Text>
                  <Text style={styles.heroSub}>
                    {monthLabel(currentMonth)} payroll has not been raised yet
                  </Text>
                </>
              )}
            </View>
            <View style={styles.heroIcon}>
              <Ionicons name={currentRun ? 'checkmark-done-outline' : 'calendar-outline'} size={22} color={THEME} />
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroRow}>
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>Owed &amp; unpaid</Text>
              <Text style={[styles.heroCellValue, { color: (stats.outstandingRupees ?? 0) > 0 ? '#d97706' : '#059669' }]}>
                {compactRupees(stats.outstandingRupees ?? 0)}
              </Text>
              <Text style={styles.heroCellMeta}>
                {stats.outstandingCount ?? 0} payment{(stats.outstandingCount ?? 0) === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={styles.heroCellDivider} />
            <View style={styles.heroCell}>
              <Text style={styles.heroCellLabel}>This year</Text>
              <Text style={styles.heroCellValue}>{compactRupees(stats.ytdNetRupees ?? 0)}</Text>
              <Text style={styles.heroCellMeta}>{stats.ytdMonths ?? 0} month{(stats.ytdMonths ?? 0) === 1 ? '' : 's'} raised</Text>
            </View>
          </View>

          {/* A draft is a proposal, not a cost. Saying so stops the next person
              counting it twice. */}
          {(stats.draftCount ?? 0) > 0 && (
            <View style={styles.heroFlags}>
              <View style={[styles.flag, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="create-outline" size={11} color="#64748b" />
                <Text style={[styles.flagText, { color: '#64748b' }]}>
                  {stats.draftCount} draft{stats.draftCount === 1 ? '' : 's'} — not yet approved
                </Text>
              </View>
            </View>
          )}
        </AnimatedCard>

        <TouchableOpacity
          style={styles.runBtn}
          onPress={handleRunPayroll}
          activeOpacity={0.85}
          disabled={running}
        >
          <Ionicons name={currentRun ? 'document-text-outline' : 'flash'} size={16} color="#FFFFFF" />
          <Text style={styles.runBtnText}>
            {currentRun ? `Open ${monthShort(currentRun.month)} run` : `Raise ${monthLabel(currentMonth)} payroll`}
          </Text>
        </TouchableOpacity>

        {/* The salary desk is a different job from the run desk: this screen asks
            "what did this month cost", that one asks "what is each person paid, on
            what basis, and what is still owed to them". Both have to be reachable
            from here or the second one is invisible. */}
        <View style={styles.deskRow}>
          <TouchableOpacity
            style={styles.deskBtn}
            onPress={() => navigation.openModule('PayrollSalaryRecords', { month: currentMonth })}
          >
            <Ionicons name="people-outline" size={16} color={THEME} />
            <Text style={styles.deskBtnText}>Salary records</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deskBtn, styles.deskBtnAlert]}
            onPress={() => navigation.openModule('PayrollAlerts', {})}
          >
            <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
            <Text style={[styles.deskBtnText, { color: '#d97706' }]}>Pending salaries</Text>
          </TouchableOpacity>
        </View>

        {openRun && openRun.id !== currentRun?.id && (
          <AnimatedCard
            delay={40}
            onPress={() => navigation.openModule('PayrollRunDetail', { runId: openRun.id })}
            style={[styles.block, styles.nudgeCard]}
          >
            <View style={styles.nudgeRow}>
              <Ionicons name="alert-circle-outline" size={16} color="#d97706" />
              <Text style={styles.nudgeText}>
                {monthLabel(openRun.month)} is {runStatusMeta(openRun.status).label.toLowerCase()} with{' '}
                {openRun.pendingCount} payment{openRun.pendingCount === 1 ? '' : 's'} left. Tap to finish it.
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#d97706" />
            </View>
          </AnimatedCard>
        )}

        {/* Six-month shape. A salary bill that quietly doubles is the thing this
            view exists to make obvious. */}
        {trend.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Monthly cost</Text>
              <Text style={styles.sectionMeta}>net paid out</Text>
            </View>
            <AnimatedCard delay={60} style={styles.block}>
              <View style={styles.trendRow}>
                {trend.map((t) => {
                  const meta = runStatusMeta(t.status);
                  const h = Math.max(6, Math.round(((t.netRupees || 0) / maxTrendNet) * 54));
                  return (
                    <View key={t.month} style={styles.trendCol}>
                      <Text style={styles.trendValue}>{compactRupees(t.netRupees || 0)}</Text>
                      <View style={styles.trendBarTrack}>
                        <View style={[styles.trendBar, { height: h, backgroundColor: meta.color }]} />
                      </View>
                      <Text style={styles.trendMonth}>{monthShort(t.month)}</Text>
                      <View style={[styles.trendDot, { backgroundColor: meta.color }]} />
                    </View>
                  );
                })}
              </View>
            </AnimatedCard>
          </>
        )}

        {/* ── Runs ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Payroll runs</Text>
          <Text style={styles.sectionMeta}>{runs.length} raised</Text>
        </View>

        {runs.length === 0 ? (
          <EmptyState
            icon="card-outline"
            title="No payroll raised yet"
            subtitle={`Tap the button above to raise ${monthLabel(currentMonth)} for ${roster.length} staff.`}
          />
        ) : (
          runs.map((run, i) => (
            <RunCard
              key={run.id}
              run={run}
              index={i}
              isCurrent={run.month === currentMonth}
              onPress={() => navigation.openModule('PayrollRunDetail', { runId: run.id })}
            />
          ))
        )}

        {/* ── Roster ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>On the payroll</Text>
          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={() => setShowRoster((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.sectionToggleText}>{showRoster ? 'Hide' : `${roster.length} people`}</Text>
            <Ionicons name={showRoster ? 'chevron-up' : 'chevron-down'} size={12} color={THEME} />
          </TouchableOpacity>
        </View>

        {showRoster && (
          roster.map((s, i) => (
            <AnimatedCard key={s.staffUserId} delay={80 + i * 20} style={styles.block}>
              <View style={styles.rosterRow}>
                <View style={styles.rosterAvatar}>
                  <Text style={styles.rosterInitial}>
                    {s.staffName.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/, '').charAt(0)}
                  </Text>
                </View>
                <View style={styles.rosterBody}>
                  <Text style={styles.rosterName} numberOfLines={1}>{s.staffName}</Text>
                  <Text style={styles.rosterMeta} numberOfLines={1}>
                    {s.designation ?? 'Staff'}{s.employeeNo ? ` · ${s.employeeNo}` : ''}
                  </Text>
                </View>
                <View style={styles.rosterRight}>
                  <Text style={styles.rosterGross}>{rupees(s.monthlyGrossRupees)}</Text>
                  {s.lastNetRupees != null && (
                    <Text style={styles.rosterNet}>
                      {rupees(s.lastNetRupees)} net{s.lastStatus === 'PAID' ? '' : ' · unpaid'}
                    </Text>
                  )}
                </View>
              </View>
            </AnimatedCard>
          ))
        )}

        {/* Staff the desk cannot pay is a problem the officer needs to see, not
            discover at month end. */}
        {(data?.excluded?.length ?? 0) > 0 && (
          <AnimatedCard delay={100} style={[styles.block, styles.excludedCard]}>
            <View style={styles.nudgeRow}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={styles.excludedText}>
                {data.excluded.length} active staff member{data.excluded.length === 1 ? '' : 's'} not on this payroll
                because no salary is on record: {data.excluded.map((s) => s.staffName).join(', ')}.
              </Text>
            </View>
          </AnimatedCard>
        )}
      </ScrollView>
    </View>
  );
}

function RunCard({ run, index, isCurrent, onPress }) {
  const meta = runStatusMeta(run.status);
  const fullyPaid = run.pendingCount === 0;

  return (
    <AnimatedCard delay={90 + index * 30} onPress={onPress} style={styles.block}>
      <View style={styles.runRow}>
        <View style={[styles.runIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.runBody}>
          <View style={styles.runTitleLine}>
            <Text style={styles.runMonth}>{monthLabel(run.month)}</Text>
            {isCurrent && (
              <View style={styles.nowTag}>
                <Text style={styles.nowTagText}>THIS MONTH</Text>
              </View>
            )}
          </View>
          <Text style={styles.runMeta}>
            {run.entryCount} staff · {rupees(run.grossRupees)} gross · {rupees(run.deductionsRupees)} deducted
          </Text>

          {!fullyPaid && run.status === 'APPROVED' && (
            <View style={styles.runProgressTrack}>
              <View
                style={[styles.runProgressFill, { width: `${run.paidPercent}%`, backgroundColor: meta.color }]}
              />
            </View>
          )}
          <Text style={styles.runFoot}>
            {run.status === 'PAID'
              ? `Paid ${formatDate(run.paidAt)}`
              : `${meta.label} · ${run.paidCount}/${run.entryCount} paid · raised ${relativeTime(run.createdAt)}`}
          </Text>
        </View>

        <View style={styles.runRight}>
          <Text style={styles.runNet}>{rupees(run.netRupees)}</Text>
          <Text style={styles.runNetLabel}>net</Text>
        </View>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  deskRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  deskBtn: {
    flex: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbeafe',
  },
  deskBtnAlert: { borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  deskBtnText: { fontSize: 13, fontWeight: '700', color: THEME },
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', textAlign: 'center' },
  retryBtn: {
    marginTop: 16, backgroundColor: THEME, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  block: { marginBottom: 10 },

  heroCard: { marginBottom: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1 },
  heroLabel: { fontSize: 12, color: '#64748b', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  heroValueNotRun: { fontSize: 24, fontWeight: '800', color: '#d97706', marginTop: 4 },
  heroSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  heroIcon: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  heroDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  heroRow: { flexDirection: 'row' },
  heroCell: { flex: 1 },
  heroCellDivider: { width: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 },
  heroCellLabel: { fontSize: 11, color: '#64748b' },
  heroCellValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 3 },
  heroCellMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  heroFlags: { flexDirection: 'row', marginTop: 12, flexWrap: 'wrap', gap: 8 },
  flag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  flagText: { fontSize: 11, fontWeight: '600' },

  runBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: THEME, borderRadius: 12, paddingVertical: 13, marginBottom: 14,
  },
  runBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  nudgeCard: { backgroundColor: '#fffbeb', borderColor: '#fde68a' },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nudgeText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 10, marginBottom: 8,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', letterSpacing: 0.2 },
  sectionMeta: { fontSize: 11, color: '#94a3b8' },
  sectionToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionToggleText: { fontSize: 11, fontWeight: '600', color: THEME },

  trendRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  trendCol: { flex: 1, alignItems: 'center' },
  trendValue: { fontSize: 9, color: '#64748b', marginBottom: 4 },
  trendBarTrack: { height: 56, justifyContent: 'flex-end' },
  trendBar: { width: 18, borderRadius: 4 },
  trendMonth: { fontSize: 9, color: '#94a3b8', marginTop: 5 },
  trendDot: { width: 5, height: 5, borderRadius: 3, marginTop: 3 },

  runRow: { flexDirection: 'row', alignItems: 'flex-start' },
  runIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  runBody: { flex: 1, marginLeft: 12 },
  runTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  runMonth: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  nowTag: { backgroundColor: '#eff6ff', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  nowTagText: { fontSize: 8, fontWeight: '800', color: THEME, letterSpacing: 0.5 },
  runMeta: { fontSize: 11, color: '#64748b', marginTop: 3 },
  runProgressTrack: {
    height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, marginTop: 8, overflow: 'hidden',
  },
  runProgressFill: { height: 4, borderRadius: 2 },
  runFoot: { fontSize: 10, color: '#94a3b8', marginTop: 6 },
  runRight: { alignItems: 'flex-end', marginLeft: 8 },
  runNet: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  runNetLabel: { fontSize: 9, color: '#94a3b8', marginTop: 1 },

  rosterRow: { flexDirection: 'row', alignItems: 'center' },
  rosterAvatar: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  rosterInitial: { fontSize: 14, fontWeight: '800', color: THEME },
  rosterBody: { flex: 1, marginLeft: 10 },
  rosterName: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  rosterMeta: { fontSize: 11, color: '#64748b', marginTop: 1 },
  rosterRight: { alignItems: 'flex-end' },
  rosterGross: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  rosterNet: { fontSize: 10, color: '#94a3b8', marginTop: 1 },

  excludedCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  excludedText: { flex: 1, fontSize: 11, color: '#991b1b', lineHeight: 16 },
});
