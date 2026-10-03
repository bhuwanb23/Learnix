import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { THEME, activityMeta, audienceMeta, relativeTime, formatDate } from './notificationMeta';

// `countKey` is explicit because the feed's stat keys are not a naive +'s' of
// the kind (DIGITAL is singular), and RENEWAL would otherwise be unreachable.
const KIND_FILTERS = [
  { id: 'ALL', label: 'All', countKey: 'total' },
  { id: 'ISSUE', label: 'Issued', countKey: 'issues' },
  { id: 'RETURN', label: 'Returned', countKey: 'returns' },
  { id: 'RENEWAL', label: 'Renewed', countKey: 'renewals' },
  { id: 'FINE', label: 'Fines', countKey: 'fines' },
  { id: 'REQUEST', label: 'Requests', countKey: 'requests' },
  { id: 'DIGITAL', label: 'Digital', countKey: 'digital' },
];

export default function Notifications({ navigation }) {
  const [feed, setFeed] = useState(null);
  const [insights, setInsights] = useState(null);
  const [broadcasts, setBroadcasts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [kind, setKind] = useState('ALL');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [f, i, b] = await Promise.all([
        libraryApi.notificationActivity(),
        libraryApi.notificationInsights(),
        libraryApi.broadcasts(),
      ]);
      setFeed(f);
      setInsights(i);
      setBroadcasts(b);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const events = feed?.events || [];
  const stats = feed?.stats || {};
  const filtered = useMemo(
    () => (kind === 'ALL' ? events : events.filter((e) => e.kind === kind)),
    [events, kind],
  );

  const libraryStats = insights?.library || {};
  const remindersDueNow = useMemo(() => {
    const r = insights?.remindersDueNow;
    if (!r) return 0;
    return (r.dueIn3Days ?? 0) + (r.dueTomorrow ?? 0) + (r.dueToday ?? 0) + (r.overdueFinal ?? 0);
  }, [insights]);
  const overdueAudience = insights?.audiences?.find((a) => a.id === 'OVERDUE_MEMBERS');

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
    >
      {/* Shortcuts */}
      <View style={styles.shortcutRow}>
        <TouchableOpacity style={styles.shortcutPrimary} onPress={() => navigation.openModule('ComposeBroadcast')} activeOpacity={0.85}>
          <View style={styles.shortcutPrimaryIcon}>
            <Ionicons name="megaphone" size={20} color="#fff" />
          </View>
          <View style={styles.shortcutPrimaryText}>
            <Text style={styles.shortcutPrimaryLabel}>New Broadcast</Text>
            <Text style={styles.shortcutPrimarySub}>Reach students instantly</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={THEME} />
        </TouchableOpacity>
      </View>

      <View style={styles.shortcutRow}>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('BroadcastHistory')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#2563eb' }]}>
            <Ionicons name="paper-plane" size={18} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>History</Text>
          <Text style={styles.shortcutCount}>{broadcasts?.broadcasts?.length ?? 0} sent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('AudienceInsights')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#0891b2' }]}>
            <Ionicons name="people" size={18} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Audiences</Text>
          <Text style={styles.shortcutCount}>{libraryStats.totalStudents ?? 0} students</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shortcut} onPress={() => navigation.openModule('ReminderSchedule')} activeOpacity={0.85}>
          <View style={[styles.shortcutIcon, { backgroundColor: '#d97706' }]}>
            <Ionicons name="alarm" size={18} color="#fff" />
          </View>
          <Text style={styles.shortcutLabel}>Reminders</Text>
          <Text style={styles.shortcutCount}>{remindersDueNow} due now</Text>
        </TouchableOpacity>
      </View>

      {/* Library pulse */}
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'On Loan', value: libraryStats.activeLoans ?? 0, icon: 'swap-horizontal', color: THEME },
          { label: 'Overdue', value: libraryStats.overdueLoans ?? 0, icon: 'alert-circle', color: '#dc2626' },
          { label: 'Pending Fines', value: libraryStats.pendingFines ?? 0, icon: 'cash', color: '#d97706' },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}>
                <Ionicons name={s.icon} size={18} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      {/* Audience reach */}
      {overdueAudience && (
        <AnimatedCard delay={60} style={[styles.block, styles.reachCard]} onPress={() => navigation.openModule('AudienceInsights')}>
          <View style={styles.reachRow}>
            <View style={[styles.reachIcon, { backgroundColor: audienceMeta('OVERDUE_MEMBERS').bg }]}>
              <Ionicons name="alarm-outline" size={18} color="#dc2626" />
            </View>
            <View style={styles.reachBody}>
              <Text style={styles.reachTitle}>
                {overdueAudience.recipients} student{overdueAudience.recipients === 1 ? '' : 's'} can be reached with an overdue notice
              </Text>
              <Text style={styles.reachSub}>
                {libraryStats.overdueCoveragePct ?? 0}% of the student body
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </View>
        </AnimatedCard>
      )}

      {/* Activity */}
      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>Activity Feed</Text>
        <Text style={styles.countLabel}>{filtered.length} event{filtered.length === 1 ? '' : 's'}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        <View style={styles.chipsRow}>
          {KIND_FILTERS.map((k) => {
            const count = stats[k.countKey];
            return (
              <TouchableOpacity
                key={k.id}
                style={[
                  styles.chip,
                  kind === k.id && {
                    backgroundColor: k.id === 'ALL' ? THEME : activityMeta(k.id).color,
                    borderColor: k.id === 'ALL' ? THEME : activityMeta(k.id).color,
                  },
                ]}
                onPress={() => setKind(k.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, kind === k.id && styles.chipTextActive]}>
                  {k.label} · {count ?? 0}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {filtered.length === 0 ? (
        <EmptyState
          icon={kind === 'ALL' ? 'pulse-outline' : 'funnel-outline'}
          title={kind === 'ALL' ? 'No activity yet' : 'Nothing in this filter'}
          subtitle={
            kind === 'ALL'
              ? 'Book issues, returns, fines and digital access will appear here as they happen.'
              : 'No events of this type have been recorded yet.'
          }
          color={THEME}
        />
      ) : (
        filtered.map((e, idx) => {
          const meta = activityMeta(e.kind);
          return (
            <AnimatedCard
              key={e.id}
              delay={100 + idx * 35}
              style={styles.block}
              onPress={
                e.deepLink?.module === 'BookRequests'
                  ? () => navigation.openModule('Requests')
                  : e.deepLink?.module
                    ? () => navigation.openModule(e.deepLink.module, { [paramFor(e.deepLink.module)]: e.deepLink.id })
                    : undefined
              }
            >
              <View style={styles.eventRow}>
                <View style={[styles.eventIcon, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon} size={17} color={meta.color} />
                </View>
                <View style={styles.eventBody}>
                  <View style={styles.eventTop}>
                    <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={styles.eventTime}>{relativeTime(e.at)}</Text>
                  </View>
                  <Text style={styles.eventDetail} numberOfLines={2}>{e.detail}</Text>
                </View>
                {e.amountRupees !== undefined ? (
                  <Text style={styles.eventAmount}>₹{e.amountRupees}</Text>
                ) : null}
              </View>
            </AnimatedCard>
          );
        })
      )}

      {broadcasts?.stats?.lastSentAt ? (
        <AnimatedCard delay={200} style={styles.block}>
          <View style={styles.lastSentRow}>
            <Ionicons name="paper-plane-outline" size={15} color={THEME} />
            <Text style={styles.lastSentText}>
              Last broadcast sent {relativeTime(broadcasts.stats.lastSentAt)} ({formatDate(broadcasts.stats.lastSentAt)})
            </Text>
          </View>
        </AnimatedCard>
      ) : null}
    </ScrollView>
  );
}

// Map an activity deep-link module to the route-param name that screen expects.
function paramFor(module) {
  if (module === 'LoanDetail') return 'loanId';
  if (module === 'FineDetail') return 'fineId';
  if (module === 'ResourceDetail') return 'resourceId';
  return 'id';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Shortcuts
  shortcutRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  shortcut: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 12, alignItems: 'center' },
  shortcutIcon: { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 7 },
  shortcutLabel: { fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold' },
  shortcutCount: { fontSize: 9, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 2 },
  shortcutPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: THEME + '0D', borderRadius: 14, borderWidth: 1, borderColor: THEME + '33', padding: 12 },
  shortcutPrimaryIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: THEME, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  shortcutPrimaryText: { flex: 1 },
  shortcutPrimaryLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold' },
  shortcutPrimarySub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Reach
  reachCard: { padding: 14 },
  reachRow: { flexDirection: 'row', alignItems: 'center' },
  reachIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reachBody: { flex: 1 },
  reachTitle: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', lineHeight: 18 },
  reachSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },

  // Filters
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  countLabel: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  chipsScroll: { flexGrow: 0, marginHorizontal: -24, marginBottom: 4 },
  chipsRow: { flexDirection: 'row', paddingHorizontal: 24 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  chipTextActive: { color: '#fff' },

  // Events
  eventRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  eventIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventBody: { flex: 1 },
  eventTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eventTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold', marginRight: 8 },
  eventTime: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Medium' },
  eventDetail: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 16 },
  eventAmount: { fontSize: 13, fontWeight: '800', color: '#dc2626', fontFamily: 'PlusJakartaSans-Bold', marginLeft: 8 },

  lastSentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  lastSentText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', flex: 1 },
});