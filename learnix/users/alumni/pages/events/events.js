import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';
import EventDetail from './pages/event_detail/event_detail';

const COLORS = ['#0891b2', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];
const tabs = ['Upcoming', 'Completed'];

export default function EventsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Upcoming');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const d = await alumniApi.events();
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

  if (selectedId) {
    return (
      <EventDetail
        eventId={selectedId}
        navigation={{
          goBack: () => setSelectedId(null),
          openModule: (key) => navigation.openModule(key),
        }}
      />
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <SkeletonStatRow count={3} style={{ paddingHorizontal: 16 }} />
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={{ marginBottom: 8 }} />
          ))}
        </View>
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

  const upcoming = data?.upcoming ?? [];
  const completed = data?.completed ?? [];
  const filtered = activeTab === 'Upcoming' ? upcoming : completed;
  const totalRsvps = upcoming.reduce((s, e) => s + e.rsvps, 0);

  const stats = [
    { label: 'Upcoming', value: String(upcoming.length), icon: 'calendar-outline', color: '#2563eb' },
    { label: 'Total RSVPs', value: String(totalRsvps), icon: 'people-outline', color: '#059669' },
    { label: 'Completed', value: String(completed.length), icon: 'checkmark-done-outline', color: '#0891b2' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon} size={14} color={s.color} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsWrap}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.map((e, idx) => {
        const color = COLORS[idx % COLORS.length];
        const pct = e.capacity > 0 ? Math.min(Math.round((e.rsvps / e.capacity) * 100), 100) : 0;
        const dateStr = new Date(e.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = new Date(e.startDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        return (
          <AnimatedCard
            key={e.id}
            onPress={() => setSelectedId(e.id)}
            delay={idx * 50}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.dateBadge, { backgroundColor: color + '1a' }]}>
                <Text style={[styles.dateBadgeText, { color }]}>{dateStr}</Text>
              </View>
              <View style={styles.cardHeaderBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {timeStr}{e.venue ? ` · ${e.venue}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <Text style={[styles.rsvpText, { color }]}>{pct}%</Text>
            </View>
            <Text style={styles.rsvpCount}>
              {e.rsvps} of {e.capacity} RSVPs · {e.status}
            </Text>
          </AnimatedCard>
        );
      })}
      {filtered.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title={`No ${activeTab.toLowerCase()} events`}
          subtitle="Check back later for new events"
          color="#0891b2"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 24 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  card: {
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 12,
  },
  dateBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
  cardHeaderBody: { flex: 1 },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  cardMeta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  rsvpText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginLeft: 10,
  },
  rsvpCount: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 5,
  },
});
