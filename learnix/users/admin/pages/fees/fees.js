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

export default function FeesScreen({ navigation }) {
  const [data, setData] = useState({ structures: [], dues: [], collectionStats: {} });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.fees();
      setData({ structures: d.structures || [], dues: d.dues || [], collectionStats: d.collectionStats || {} });
    } catch (e) {
      console.warn('Failed to load fees:', e);
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

  const cs = data.collectionStats;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Hero stats */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Collected</Text>
        <Text style={styles.heroValue}>₹{((cs.totalCollected || 0) / 100).toLocaleString('en-IN')}</Text>
        <Text style={styles.heroSub}>Target: ₹{((cs.totalTarget || 0) / 100).toLocaleString('en-IN')}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{cs.pendingCount || 0}</Text>
          <Text style={styles.statLabel}>Pending Dues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{cs.overdueCount || 0}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>

      {/* Fee structures */}
      <Text style={styles.sectionTitle}>Fee Structures</Text>
      {data.structures.map((f, i) => (
        <View key={f.id || i} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="school" size={18} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{f.program?.name || f.programName || 'Program'}</Text>
            <Text style={styles.cardDesc}>AY: {f.academicYear?.label || f.ayLabel || '—'}</Text>
            <Text style={styles.cardMeta}>Amount: ₹{((f.amountMinor || f.amount || 0) / 100).toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: f.status === 'APPROVED' ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.badgeText, { color: f.status === 'APPROVED' ? '#059669' : '#d97706' }]}>
              {f.status || 'DRAFT'}
            </Text>
          </View>
        </View>
      ))}

      {data.structures.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No fee structures defined</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  heroCard: { backgroundColor: '#059669', margin: 16, borderRadius: 20, padding: 20, alignItems: 'center' },
  heroLabel: { fontSize: 12, color: '#a7f3d0', fontFamily: 'Manrope-Medium' },
  heroValue: { fontSize: 32, color: '#fff', fontFamily: 'PlusJakartaSans-Bold', marginTop: 4 },
  heroSub: { fontSize: 11, color: '#a7f3d0', fontFamily: 'Manrope-Regular', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  cardDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontFamily: 'Manrope-SemiBold' },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginTop: 10 },
});
