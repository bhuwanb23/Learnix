import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading requests…</Text></View>;
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Pending', value: stats.pending ?? 0, icon: 'cart', color: '#d97706' },
          { label: 'Approved', value: stats.approved ?? 0, icon: 'checkmark-done', color: '#059669' },
          { label: 'Total', value: stats.total ?? 0, icon: 'people', color: '#2563eb' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Student Requests</Text>
      {requests.length === 0 ? (
        <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={40} color="#059669" /><Text style={styles.emptyText}>No requests</Text></View>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={[styles.requestIcon, { backgroundColor: (STATUS_COLORS[request.status] || '#64748b') + '14' }]}>
              <Ionicons name="cart-outline" size={18} color={STATUS_COLORS[request.status] || '#64748b'} />
            </View>
            <View style={styles.info}>
              <Text style={styles.bookTitle}>{request.title}</Text>
              <Text style={styles.meta}>{request.student} • {request.rollNo}</Text>
              {request.reason ? <Text style={styles.reason}>"{request.reason}"</Text> : null}
              <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[request.status] || '#64748b') + '1A' }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[request.status] || '#64748b' }]}>{request.status}</Text>
              </View>
            </View>
            {request.status === 'PENDING' ? (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleAction(request, 'APPROVED')} activeOpacity={0.8} disabled={processing === request.id}>
                  {processing === request.id ? <ActivityIndicator size="small" color="#059669" /> : <Ionicons name="checkmark" size={16} color="#059669" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleAction(request, 'REJECTED')} activeOpacity={0.8} disabled={processing === request.id}>
                  <Ionicons name="close" size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  requestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  requestIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  reason: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  actions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center' },
});
