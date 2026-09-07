import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING } from '../../../../constants/theme';
import { api } from '../../../../services/api';

export default function AssignmentsScreen({ navigation }) {
  const [data, setData] = useState({ assignments: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.assignments();
      setData({ assignments: d.assignments || [], stats: d.stats || {} });
    } catch (e) {
      console.warn('Failed to load assignments:', e);
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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.stats.totalAssignments || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{data.stats.activeAssignments || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#059669' }]}>{data.stats.submitted || 0}</Text>
          <Text style={styles.statLabel}>Submitted</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>All Assignments</Text>
      {data.assignments.map((a, i) => (
        <View key={a.id || i} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="document-text" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardDesc}>{a.courseName || a.offering?.course?.name || ''} • Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</Text>
            <Text style={styles.cardMeta}>{a.submissionCount || 0} submissions</Text>
          </View>
        </View>
      ))}

      {data.assignments.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No assignments found</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  statsRow: { flexDirection: 'row', gap: 10, padding: 16 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a', paddingHorizontal: 16, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  cardDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  cardMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
});
