import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';

const fmt = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const modules = [
  { id: 'Mentorship', title: 'Mentorship', icon: 'hand-left-outline', color: '#2563eb' },
  { id: 'Chapters', title: 'Chapters', icon: 'location-outline', color: '#059669' },
  { id: 'Notifications', title: 'Notify', icon: 'megaphone-outline', color: '#d97706' },
];

export default function AlumniDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await alumniApi.dashboard();
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const engagement = data?.engagement ?? { totalAlumni: 0, activeAlumni: 0, percentage: 0 };
  const stats = data?.stats ?? {};
  const events = data?.upcomingEvents ?? [];
  const alerts = data?.alerts ?? [];
  const campaigns = data?.campaigns ?? [];

  const statCards = [
    { label: 'Registered', value: String(stats.alumni ?? 0), sub: `${engagement.activeAlumni} active`, color: '#2563eb', icon: 'people-outline' },
    { label: 'Events', value: String(stats.upcomingEvents ?? 0), sub: 'upcoming', color: '#059669', icon: 'calendar-outline' },
    { label: 'Donations', value: fmt(stats.donationsReceivedRupees ?? 0), sub: 'received FY', color: '#d97706', icon: 'gift-outline' },
    { label: 'Mentors', value: String(stats.activeMentorships ?? 0), sub: `${stats.pendingMentorships ?? 0} pending`, color: '#0891b2', icon: 'hand-left-outline' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <Text style={styles.heroLabel}>ALUMNI RELATIONS OFFICE</Text>
        <Text style={styles.heroTitle}>Engagement Overview</Text>
        <View style={styles.heroProgress}>
          <View style={[styles.heroProgressFill, { width: `${engagement.percentage}%` }]} />
        </View>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroValue}>{engagement.percentage}%</Text>
            <Text style={styles.heroSub}>engagement · {engagement.totalAlumni} alumni</Text>
          </View>
          {(data?.unreadNotifications ?? 0) > 0 && (
            <View style={styles.heroBadge}>
              <Ionicons name="notifications-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>{data.unreadNotifications} unread</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {statCards.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '1a' }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statSub, { color: s.color }]}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => navigation.switchTab('Events')}>
            <Text style={styles.seeAll}>View all</Text>
          </TouchableOpacity>
        </View>
        {events.map((e) => {
          const pct = e.capacity > 0 ? Math.min(Math.round((e.rsvps / e.capacity) * 100), 100) : 0;
          return (
            <View key={e.id} style={styles.listCard}>
              <View style={[styles.typeIcon, { backgroundColor: '#0891b21a' }]}>
                <Ionicons name="calendar-outline" size={16} color="#0891b2" />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.listSub}>
                  {new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {e.venue ? ` · ${e.venue}` : ''}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: '#0891b2' }]} />
                </View>
                <Text style={[styles.rsvpText, { color: '#0891b2' }]}>
                  {e.rsvps}/{e.capacity} RSVPs
                </Text>
              </View>
            </View>
          );
        })}
        {events.length === 0 && <Text style={styles.emptyText}>No upcoming events scheduled.</Text>}
      </View>

      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Office Alerts</Text>
          {alerts.map((a, idx) => (
            <View key={idx} style={styles.alertCard}>
              <View style={styles.alertIcon}>
                <Ionicons name="warning-outline" size={16} color="#d97706" />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{a.message}</Text>
                <Text style={styles.listSub}>{a.type}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {campaigns.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fundraising Campaigns</Text>
          {campaigns.map((c, idx) => (
            <View key={c.name} style={styles.listCard}>
              <View style={[styles.typeIcon, { backgroundColor: '#d977061a' }]}>
                <Ionicons name="gift-outline" size={16} color="#d97706" />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle} numberOfLines={1}>{c.name}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(c.percent, 100)}%`, backgroundColor: '#d97706' }]} />
                </View>
                <Text style={[styles.rsvpText, { color: '#d97706' }]}>
                  {fmt(c.raisedRupees)} of {fmt(c.targetRupees)} · {c.percent}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Tools</Text>
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.moduleCard}
              onPress={() => navigation.openModule(m.id)}
            >
              <View style={[styles.moduleIcon, { backgroundColor: m.color + '1a' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={styles.moduleTitle}>{m.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, paddingVertical: 8 },
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
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  alertIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fef3c7',
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
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  rsvpText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
});
