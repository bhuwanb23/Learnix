import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { sportsApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonCard } from '../../../../components/ui';
import EventDetail from './pages/event_detail/event_detail';

const CATEGORY_MAP = {
  SPORTS: { label: 'Sports', icon: 'football-outline', color: '#059669' },
  CULTURAL: { label: 'Cultural', icon: 'musical-notes-outline', color: '#d97706' },
  TECH: { label: 'Technical', icon: 'hardware-chip-outline', color: '#2563eb' },
  OTHER: { label: 'Other', icon: 'star-outline', color: '#0891b2' },
};

const STATUS_STYLE = {
  PUBLISHED: { bg: '#dcfce7', color: '#059669' },
  APPROVED: { bg: '#dcfce7', color: '#059669' },
  PENDING_ADMIN: { bg: '#fef3c7', color: '#d97706' },
  DRAFT: { bg: '#e0e7ff', color: '#4f46e5' },
  COMPLETED: { bg: '#f1f5f9', color: '#64748b' },
  CANCELLED: { bg: '#fee2e2', color: '#dc2626' },
};

const fmtRange = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  if (sameDay) return s.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${s.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
};

export default function EventsModule({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('All');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await sportsApi.events();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (selectedEventId) {
    return (
      <EventDetail
        eventId={selectedEventId}
        onBack={() => {
          setSelectedEventId(null);
          load(false);
        }}
      />
    );
  }

  const categories = ['All', ...new Set(events.map((e) => CATEGORY_MAP[e.category]?.label || e.category))];
  const filtered =
    category === 'All'
      ? events
      : events.filter((e) => (CATEGORY_MAP[e.category]?.label || e.category) === category);

  if (loading && events.length === 0) {
    return (
      <View style={styles.center}>
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 16 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 10 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 10 }} />
      </View>
    );
  }

  if (error && events.length === 0) {
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

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
      >
        {filtered.length === 0 && (
          <EmptyState
            icon="calendar-outline"
            title="No events found"
            subtitle="No events in this category yet"
            color="#d97706"
          />
        )}
        {filtered.map((e, idx) => {
          const meta = CATEGORY_MAP[e.category] || CATEGORY_MAP.OTHER;
          const st = STATUS_STYLE[e.status] || STATUS_STYLE.DRAFT;
          const pct = e.capacity > 0 ? Math.round((e.registrations / e.capacity) * 100) : 0;
          return (
            <AnimatedCard
              key={e.id}
              onPress={() => setSelectedEventId(e.id)}
              delay={idx * 40}
              style={styles.card}
            >
              <View style={[styles.eventIcon, { backgroundColor: meta.color + '1a' }]}>
                <Ionicons name={meta.icon} size={19} color={meta.color} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{e.title}</Text>
                <Text style={styles.meta}>
                  {fmtRange(e.startDate, e.endDate)} · {e.venue || 'TBD'}
                </Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[styles.progressFill, { width: pct + '%', backgroundColor: meta.color }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {e.registrations}/{e.capacity}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
                <Text style={[styles.statusText, { color: st.color }]}>{e.status.replace('_', ' ')}</Text>
              </View>
            </AnimatedCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 30 },
  chipsRow: { flexGrow: 0, marginTop: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    marginRight: 8,
  },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  chipTextActive: { color: '#fff' },
  list: { paddingTop: 12, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBody: { flex: 1, marginRight: 8 },
  name: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
  },
  statusChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
  },
});
