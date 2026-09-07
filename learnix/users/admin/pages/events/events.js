import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { api } from '../../../../services/api';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.events();
      setEvents(d.events || []);
    } catch (e) {
      console.warn('Failed to load events:', e);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  const statusColor = (s) => {
    switch (s) {
      case 'PUBLISHED': return '#059669';
      case 'APPROVED': return '#2563eb';
      case 'PENDING': return '#d97706';
      default: return '#64748b';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>No events found</Text>
        </View>
      ) : (
        events.map((ev, i) => (
          <View key={ev.id || i} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="calendar" size={18} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{ev.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>{ev.description || ''}</Text>
              <Text style={styles.cardMeta}>
                {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ''}
                {ev.venue ? ` • ${ev.venue}` : ''}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor(ev.status) + '14' }]}>
              <Text style={[styles.badgeText, { color: statusColor(ev.status) }]}>{ev.status}</Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  cardDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2, lineHeight: 16 },
  cardMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'Manrope-SemiBold' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
});
