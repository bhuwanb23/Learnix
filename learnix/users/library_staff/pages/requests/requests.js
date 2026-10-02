import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

const STATUS_COLORS = {
  PENDING: '#d97706',
  APPROVED: '#059669',
  REJECTED: '#dc2626',
  PROCURED: '#2563eb',
};

export default function RequestsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.requests();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAction = async (request, action) => {
    setProcessing(request.id);
    try {
      await libraryApi.decideRequest(request.id, action);
      fetchData();
      Alert.alert(action === 'APPROVED' ? 'Approved' : 'Rejected', `"${request.title}" ${action === 'APPROVED' ? 'approved' : 'rejected'}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
      </View>
    );
  }

  const stats = data?.stats || {};
  const requests = data?.requests || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}>
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Pending', value: stats.pending ?? 0, icon: 'cart', color: '#d97706' },
          { label: 'Approved', value: stats.approved ?? 0, icon: 'checkmark-done', color: '#059669' },
          { label: 'Total', value: stats.total ?? 0, icon: 'people', color: THEME },
        ].map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statCell}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </AnimatedCard>

      <Text style={styles.sectionLabel}>Student Requests</Text>

      {requests.length === 0 ? (
        <EmptyState icon="cart-outline" title="No book requests" subtitle="Student requests for new titles will appear here for approval." color={THEME} />
      ) : (
        requests.map((request, idx) => {
          const statusColor = STATUS_COLORS[request.status] || '#64748b';
          const isPending = request.status === 'PENDING';
          return (
            <AnimatedCard key={request.id} delay={100 + idx * 60} style={styles.block}>
              <View style={styles.requestRow}>
                <View style={[styles.requestIcon, { backgroundColor: statusColor + '14' }]}>
                  <Ionicons name="cart-outline" size={18} color={statusColor} />
                </View>
                <View style={styles.requestBody}>
                  <Text style={styles.bookTitle} numberOfLines={2}>{request.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{request.student} · {request.rollNo}</Text>
                  {request.reason ? <Text style={styles.reason} numberOfLines={2}>"{request.reason}"</Text> : null}
                  <View style={[styles.statusChip, { backgroundColor: statusColor + '1A' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{request.status}</Text>
                  </View>
                </View>
                {isPending ? (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.approveBtn, processing === request.id && styles.actionBusy]}
                      onPress={() => handleAction(request, 'APPROVED')}
                      activeOpacity={0.8}
                      disabled={processing === request.id}
                    >
                      {processing === request.id
                        ? <ActivityIndicator size="small" color="#059669" />
                        : <Ionicons name="checkmark" size={16} color="#059669" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleAction(request, 'REJECTED')}
                      activeOpacity={0.8}
                      disabled={processing === request.id}
                    >
                      <Ionicons name="close" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </AnimatedCard>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10, marginTop: 6 },

  // Request rows
  requestRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  requestIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  requestBody: { flex: 1, paddingRight: 8 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  reason: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 3 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center' },
  actionBusy: { opacity: 0.6 },
});
