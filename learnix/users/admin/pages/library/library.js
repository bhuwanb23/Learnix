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

export default function LibraryScreen({ navigation }) {
  const [data, setData] = useState({ catalogStats: {}, circulationStats: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.library();
      setData({ catalogStats: d.catalogStats || {}, circulationStats: d.circulationStats || {} });
    } catch (e) {
      console.warn('Failed to load library:', e);
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

  const cs = data.catalogStats;
  const circ = data.circulationStats;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.heroCard}>
        <Ionicons name="library" size={32} color="#fff" />
        <Text style={styles.heroTitle}>Library Overview</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{cs.totalBooks || 0}</Text>
          <Text style={styles.statLabel}>Total Books</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{cs.totalCopies || 0}</Text>
          <Text style={styles.statLabel}>Total Copies</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{circ.currentlyIssued || 0}</Text>
          <Text style={styles.statLabel}>Currently Issued</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{circ.overdueBooks || 0}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  heroCard: { backgroundColor: '#2563eb', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  heroTitle: { fontSize: 16, color: '#fff', fontFamily: 'PlusJakartaSans-Bold', marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  statCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 4 },
});
