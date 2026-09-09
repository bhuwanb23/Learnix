import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { transportApi } from '../../../../services/api';
import RouteDetail from './pages/route_detail/route_detail';
import { AnimatedCard, SearchBar, StatusChip, EmptyState, SkeletonCard, SkeletonStatRow } from '../../../../components/ui';

export default function RoutesModule({ navigation }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return routes;
    const q = query.toLowerCase();
    return routes.filter((r) => r.name.toLowerCase().includes(q) || (r.bus || '').toLowerCase().includes(q));
  }, [routes, query]);

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const data = await transportApi.routes();
      setRoutes(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load routes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (selectedRouteId) {
    return (
      <RouteDetail
        routeId={selectedRouteId}
        onBack={() => {
          setSelectedRouteId(null);
          load(false);
        }}
      />
    );
  }

  const totalStudents = routes.reduce((s, r) => s + r.students, 0);
  const liveCount = routes.filter((r) => r.status !== 'IDLE').length;
  const onTimePct =
    liveCount === 0
      ? 100
      : Math.round((routes.filter((r) => r.status === 'ON_TIME').length / liveCount) * 100);

  if (loading && routes.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error && routes.length === 0) {
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

  const statusStyle = (s) => {
    if (s === 'ON_TIME') return { bg: '#dcfce7', color: '#059669', label: 'On Time' };
    if (s === 'DELAYED') return { bg: '#fee2e2', color: '#dc2626', label: 'Delayed' };
    return { bg: '#f1f5f9', color: theme.colors.textMuted, label: 'Idle' };
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(false); }} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{routes.length}</Text>
          <Text style={styles.statLabel}>Active Routes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalStudents}</Text>
          <Text style={styles.statLabel}>Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{onTimePct}%</Text>
          <Text style={styles.statLabel}>On-Time Rate</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Routes</Text>
      </View>

      {routes.length === 0 && <Text style={styles.empty}>No routes yet.</Text>}
      {routes.map((r) => {
        const st = statusStyle(r.status);
        return (
          <TouchableOpacity
            key={r.id}
            style={styles.card}
            onPress={() => setSelectedRouteId(r.id)}
          >
            <View style={[styles.routeIcon, { backgroundColor: st.bg }]}>
              <Ionicons name="bus-outline" size={18} color={st.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{r.name}</Text>
              <Text style={styles.meta}>
                {r.stops} stops · {r.students} students · {r.distanceKm} km
              </Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                <Text style={styles.timeText}>
                  {r.firstPickup || '—'} → {r.lastDrop || '—'} · {r.bus || 'no bus'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusChip, { backgroundColor: st.bg }]}>
              <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 24 },
  errorText: { fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 10, textAlign: 'center' },
  retryBtn: { marginTop: 14, backgroundColor: theme.colors.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 9 },
  retryText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#fff' },
  empty: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
  },
  routeIcon: {
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginLeft: 4,
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
