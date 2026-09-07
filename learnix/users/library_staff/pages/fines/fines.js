import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function FinesModule({ navigation }) {
  const [tab, setTab] = useState('unpaid');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.fines();
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

  const handleCollect = async (item) => {
    setProcessing(item.id);
    try {
      await libraryApi.collectFine(item.id, 'CASH');
      fetchData();
      Alert.alert('Collected', `₹${item.amountRupees} received from ${item.student}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleWaive = (item) => {
    Alert.alert('Waive Fine', `Waive the ₹${item.amountRupees} fine for ${item.student}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Waive',
        onPress: async () => {
          setProcessing(item.id);
          try {
            await libraryApi.waiveFine(item.id, 'Waived by librarian');
            fetchData();
            Alert.alert('Waived', `₹${item.amountRupees} fine waived for ${item.student}.`);
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setProcessing(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading fines…</Text></View>;
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
  const unpaid = data?.pending || [];
  const collected = data?.collected || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Pending', value: stats.pendingCount ?? 0, icon: 'time', color: '#d97706' },
          { label: 'Amount', value: `₹${stats.pendingAmountRupees ?? 0}`, icon: 'cash', color: '#dc2626' },
          { label: 'Collected', value: `₹${stats.collectedAmountRupees ?? 0}`, icon: 'checkmark-circle', color: '#059669' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[{ id: 'unpaid', label: `Pending (${unpaid.length})` }, { id: 'collected', label: 'Collected' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'unpaid' ? (
        unpaid.length === 0 ? (
          <View style={styles.emptyState}><Ionicons name="checkmark-circle-outline" size={40} color="#059669" /><Text style={styles.emptyText}>No pending fines</Text></View>
        ) : (
          unpaid.map((item) => (
            <View key={item.id} style={styles.fineCard}>
              <View style={[styles.fineIcon, { backgroundColor: '#dc262614' }]}><Ionicons name="cash-outline" size={18} color="#dc2626" /></View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{item.student}</Text>
                <Text style={styles.meta}>{item.book} • {item.daysOverdue} days overdue</Text>
                <Text style={styles.fineAmount}>₹{item.amountRupees}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.collectBtn} onPress={() => handleCollect(item)} activeOpacity={0.85} disabled={processing === item.id}>
                  {processing === item.id ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark-circle" size={14} color="#FFFFFF" /><Text style={styles.collectBtnText}>Collect</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.waiveBtn} onPress={() => handleWaive(item)} activeOpacity={0.7} disabled={processing === item.id}>
                  <Ionicons name="gift-outline" size={15} color="#059669" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )
      ) : (
        <>
          <Text style={styles.sectionLabel}>Recently Collected</Text>
          {collected.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No collected fines yet</Text></View>
          ) : (
            collected.map((item) => (
              <View key={item.id} style={styles.collectedCard}>
                <View style={[styles.collectedIcon, { backgroundColor: (item.status === 'WAIVED' ? '#d97706' : '#059669') + '14' }]}>
                  <Ionicons name={item.status === 'WAIVED' ? 'gift-outline' : 'checkmark-circle-outline'} size={18} color={item.status === 'WAIVED' ? '#d97706' : '#059669'} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.studentName}>{item.student}</Text>
                  <Text style={styles.meta}>{item.book} • {item.status === 'WAIVED' ? 'Waived' : 'Paid'}</Text>
                </View>
                <Text style={[styles.collectedAmount, { color: item.status === 'WAIVED' ? '#d97706' : '#059669' }]}>₹{item.amountRupees}</Text>
              </View>
            ))
          )}
        </>
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#2563eb' },
  fineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  fineIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  fineAmount: { fontSize: 13, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  collectBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  waiveBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  collectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  collectedIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  collectedAmount: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
