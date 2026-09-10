import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';
import { AnimatedCard, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

const modules = [
  { id: 'Tournaments', title: 'Tournaments', icon: 'trophy-outline', color: '#d97706' },
  { id: 'Venues', title: 'Venues', icon: 'location-outline', color: '#0891b2' },    { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

const fmtDate = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return isToday ? `Today · ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
};

const fmtAgo = (iso) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

export default function SportsDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [dash, notifs] = await Promise.all([
        sportsApi.dashboard(),
        sportsApi.notifications().catch(() => ({ notifications: [] })),
      ]);
      setData(dash);
      setAlerts((notifs.notifications || []).slice(0, 4));
    } catch (e) {
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(false);
  }, [load]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <View style={{ backgroundColor: '#d97706', height: 140, marginHorizontal: 16, marginTop: 16, borderRadius: 20 }} />
        <SkeletonStatRow count={2} style={{ marginTop: 14, paddingHorizontal: 16 }} />
        <SkeletonStatRow count={2} style={{ marginTop: 0, paddingHorizontal: 16 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 14 }} />
        <SkeletonCard style={{ marginHorizontal: 16 }} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={36} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { stats, todayEvents, pendingApprovals } = data;
  const seasonPct = Math.min(100, stats.eventsUpcoming * 10 + stats.activeTeams * 5);

  const statCards = [
    { label: 'Upcoming Events', value: String(stats.eventsUpcoming), sub: `${stats.eventsThisWeek} this week`, color: '#d97706', icon: 'calendar-outline' },
    { label: 'Active Teams', value: String(stats.activeTeams), sub: 'all sports', color: '#059669', icon: 'people-outline' },
    { label: 'Pending Regs', value: String(stats.pendingRegistrations), sub: 'need review', color: '#d97706', icon: 'person-add-outline' },
    { label: 'Equipment Out', value: String(stats.equipmentOut), sub: `${stats.equipmentOverdue} overdue`, color: '#dc2626', icon: 'basketball-outline' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#d97706', '#b45309']} style={styles.hero}>
        <Text style={styles.heroLabel}>SPORTS & CULTURAL SEASON 2026-27</Text>
        <Text style={styles.heroTitle}>Events Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: `${seasonPct}%` }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>{seasonPct}%</Text>
            <Text style={styles.heroSub}>of the season calendar filled</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="trophy-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>{stats.activeTeams} teams active</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {statCards.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '1a' }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today & Upcoming</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Events')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        {todayEvents.length === 0 && (
          <View style={styles.listCard}>
            <Text style={styles.listSub}>Nothing scheduled right now.</Text>
          </View>
        )}
        {todayEvents.map((e) => (
          <View key={`${e.kind}-${e.id}`} style={styles.listCard}>
            <View
              style={[
                styles.eventIcon,
                { backgroundColor: e.kind === 'FIXTURE' ? '#dcfce7' : '#dbeafe' },
              ]}
            >
              <Ionicons
                name={e.kind === 'FIXTURE' ? 'football-outline' : 'calendar-outline'}
                size={16}
                color={e.kind === 'FIXTURE' ? '#059669' : '#d97706'}
              />
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{e.name}</Text>
              <Text style={styles.listSub}>{e.venue}</Text>
            </View>
            <Text style={styles.listTime}>{e.date ? fmtDate(e.date) : 'Ongoing'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Events')}>
            <Text style={styles.seeAll}>Review</Text>
          </TouchableOpacity>
        </View>
        {pendingApprovals.length === 0 && (
          <View style={styles.listCard}>
            <Text style={styles.listSub}>No registrations waiting for review.</Text>
          </View>
        )}
        {pendingApprovals.map((p) => (
          <View key={p.id} style={styles.listCard}>
            <View style={[styles.avatar, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.avatarText, { color: '#d97706' }]}>{p.student.charAt(0)}</Text>
            </View>
            <View style={styles.listBody}>
              <Text style={styles.listTitle}>{p.student}</Text>
              <Text style={styles.listSub}>{p.event}</Text>
            </View>
            <View style={styles.pendingChip}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Tools</Text>
        <View style={styles.moduleGrid}>
          {modules.map((m, idx) => (
            <AnimatedCard
              key={m.id}
              onPress={() => navigation.openModule(m.id)}
              delay={idx * 60}
              style={styles.moduleCard}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '1a' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </AnimatedCard>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {alerts.length === 0 && <Text style={styles.listSub}>No recent alerts.</Text>}
        {alerts.map((a) => (
          <View key={a.id} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: a.read ? theme.colors.surfaceMuted : '#dbeafe' }]}>
              <Ionicons name="notifications-outline" size={14} color={a.read ? theme.colors.textMuted : '#2563eb'} />
            </View>
            <View style={styles.activityBody}>
              <Text style={styles.activityText} numberOfLines={1}>{a.title}</Text>
              <Text style={styles.activityTime}>{fmtAgo(a.createdAt)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 4,
  },
  heroProgress: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 14,
  },
  heroValue: {
    fontSize: 26,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  heroSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 14,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.primary,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  eventIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#2563eb',
  },
  listBody: { flex: 1, marginRight: 8 },
  listTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  listSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  listTime: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  pendingChip: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48.5%',
    padding: 16,
    marginBottom: 10,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moduleTitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityBody: { flex: 1 },
  activityText: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
  },
  activityTime: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});
