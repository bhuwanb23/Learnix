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

export default function PlacementsScreen({ navigation }) {
  const [data, setData] = useState({ activeDrives: [], pendingApprovals: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.placements();
      setData({ activeDrives: d.activeDrives || [], pendingApprovals: d.pendingApprovals || [], stats: d.stats || {} });
    } catch (e) {
      console.warn('Failed to load placements:', e);
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
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Placement Season</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{data.stats.activeDrives || 0}</Text>
            <Text style={styles.heroStatLabel}>Active Drives</Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{data.stats.totalApplications || 0}</Text>
            <Text style={styles.heroStatLabel}>Applications</Text>
          </View>
          <View style={styles.heroStatItem}>
            <Text style={styles.heroStatValue}>{data.stats.offersMade || 0}</Text>
            <Text style={styles.heroStatLabel}>Offers</Text>
          </View>
        </View>
      </View>

      {data.pendingApprovals.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending Drive Approvals</Text>
          {data.pendingApprovals.map((drive, i) => (
            <View key={drive.id || i} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="briefcase" size={18} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{drive.company?.name || drive.companyName || 'Company'}</Text>
                <Text style={styles.cardDesc}>{drive.title || drive.role || 'Campus Drive'}</Text>
                <Text style={styles.cardMeta}>Applied: {drive.createdAt ? new Date(drive.createdAt).toLocaleDateString() : '—'}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Active Drives</Text>
      {data.activeDrives.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="briefcase-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No active drives</Text>
        </View>
      ) : (
        data.activeDrives.map((drive, i) => (
          <View key={drive.id || i} style={styles.card}>
            <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="briefcase" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{drive.company?.name || drive.companyName || 'Company'}</Text>
              <Text style={styles.cardDesc}>{drive.title || drive.role || ''}</Text>
              <Text style={styles.cardMeta}>Status: {drive.status} • {drive.applicationCount || 0} applications</Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  heroCard: { backgroundColor: '#2563eb', margin: 16, borderRadius: 20, padding: 20 },
  heroLabel: { fontSize: 12, color: '#bfdbfe', fontFamily: 'Manrope-Medium', textAlign: 'center', marginBottom: 12 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStatItem: { alignItems: 'center' },
  heroStatValue: { fontSize: 24, color: '#fff', fontFamily: 'PlusJakartaSans-Bold' },
  heroStatLabel: { fontSize: 10, color: '#bfdbfe', fontFamily: 'Manrope-Regular', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  cardDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  cardMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingTop: 20 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
});
