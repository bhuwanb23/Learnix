import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function DuesModule({ navigation }) {
  const [tab, setTab] = useState('defaulters');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.dues();
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

  const handleRemind = async (item) => {
    setProcessing(item.id);
    try {
      await accountsApi.remindDue(item.id);
      Alert.alert('Sent', `Reminder sent to ${item.student}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleWaive = (item) => {
    Alert.alert('Waive Fee', `Waive ₹${item.amountRupees} for ${item.student}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Waive',
        onPress: async () => {
          setProcessing(item.id);
          try {
            await accountsApi.waiveFee(item.id, 'Waived by finance officer');
            fetchData();
            Alert.alert('Waived', `₹${item.amountRupees} waived for ${item.student}.`);
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading dues…</Text></View>;
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
  const dues = data?.dues || [];
  const unpaid = dues.filter((d) => d.status === 'UNPAID' || d.status === 'PARTIAL');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      <View style={styles.statsRow}>
        {[
          { label: 'Unpaid', value: stats.unpaidCount ?? 0, icon: 'alert-circle', color: '#dc2626' },
          { label: 'Amount', value: `₹${((stats.unpaidRupees ?? 0) / 1000).toFixed(0)}K`, icon: 'cash', color: '#d97706' },
          { label: 'Cleared', value: stats.clearedCount ?? 0, icon: 'checkmark-circle', color: '#059669' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'defaulters', label: `Defaulters (${unpaid.length})` }, { id: 'all', label: `All Dues (${dues.length})` }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(tab === 'defaulters' ? unpaid : dues).map((item) => (
        <View key={item.id} style={styles.defaulterCard}>
          <View style={[styles.avatar, { backgroundColor: (item.daysOverdue > 15 ? '#dc2626' : item.daysOverdue > 7 ? '#d97706' : '#64748b') + '14' }]}>
            <Text style={[styles.initial, { color: item.daysOverdue > 15 ? '#dc2626' : item.daysOverdue > 7 ? '#d97706' : '#64748b' }]}>{item.student.charAt(0)}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.studentName}>{item.student}</Text>
            <Text style={styles.meta}>{item.rollNo} • {item.title}</Text>
            {item.daysOverdue > 0 && (
              <View style={[styles.overdueChip, { backgroundColor: (item.daysOverdue > 15 ? '#dc2626' : '#d97706') + '1A' }]}>
                <Text style={[styles.overdueText, { color: item.daysOverdue > 15 ? '#dc2626' : '#d97706' }]}>{item.daysOverdue} days overdue</Text>
              </View>
            )}
          </View>
          <View style={styles.right}>
            <Text style={styles.due}>₹{item.amountRupees.toLocaleString()}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleRemind(item)} activeOpacity={0.7} disabled={processing === item.id}>
                <Ionicons name="megaphone-outline" size={15} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleWaive(item)} activeOpacity={0.7} disabled={processing === item.id}>
                <Ionicons name="gift-outline" size={15} color="#059669" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
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
  defaulterCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initial: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  info: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  overdueChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  overdueText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  right: { alignItems: 'flex-end', gap: 8 },
  due: { fontSize: 14, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
});
