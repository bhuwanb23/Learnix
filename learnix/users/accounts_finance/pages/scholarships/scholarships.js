import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = { APPROVED: '#059669', DISBURSED: '#0284c7', REJECTED: '#dc2626' };

export default function ScholarshipsModule({ navigation }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('applications');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.scholarships();
      setData(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleApprove = async (award) => {
    try {
      await accountsApi.approveScholarship(award.id);
      fetchData();
      Alert.alert('Approved', `${award.student} approved.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDisburse = async (award) => {
    Alert.alert('Disburse', `Disburse ₹${award.amountRupees} to ${award.student}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disburse',
        onPress: async () => {
          try {
            await accountsApi.disburseScholarship(award.id);
            fetchData();
            Alert.alert('Disbursed', `₹${award.amountRupees} credited to ${award.student}.`);
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading scholarships…</Text></View>;
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

  // Flatten all awards across scholarships
  const allAwards = data.flatMap((s) => s.awards.map((a) => ({ ...a, scholarshipName: s.name })));
  const pendingAwards = allAwards.filter((a) => a.status === 'APPROVED');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      <View style={styles.statsRow}>
        {[
          { label: 'Schemes', value: data.length, icon: 'school', color: '#2563eb' },
          { label: 'Pending', value: pendingAwards.length, icon: 'time', color: '#d97706' },
          { label: 'Total Awards', value: allAwards.length, icon: 'gift', color: '#059669' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'applications', label: `Awards (${allAwards.length})` }, { id: 'schemes', label: 'Schemes' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'applications' ? (
        allAwards.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyText}>No awards yet</Text></View>
        ) : (
          allAwards.map((award) => (
            <TouchableOpacity key={award.id} style={styles.appCard} activeOpacity={0.8}
              onPress={() => {
                if (award.status === 'APPROVED') handleDisburse(award);
              }}>
              <View style={[styles.avatar, { backgroundColor: (STATUS_COLORS[award.status] || '#64748b') + '14' }]}>
                <Text style={[styles.initial, { color: STATUS_COLORS[award.status] || '#64748b' }]}>{award.student.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.studentName}>{award.student}</Text>
                <Text style={styles.meta}>{award.scholarshipName} • ₹{award.amountRupees.toLocaleString()}</Text>
                <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[award.status] || '#64748b') + '1A' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[award.status] || '#64748b' }]}>{award.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )
      ) : (
        data.map((s) => (
          <View key={s.id} style={styles.schemeCard}>
            <View style={[styles.schemeIcon, { backgroundColor: '#2563eb14' }]}><Ionicons name="school-outline" size={18} color="#2563eb" /></View>
            <View style={styles.schemeInfo}>
              <Text style={styles.schemeName}>{s.name}</Text>
              <Text style={styles.schemeMeta}>{s.type} • {s.coveragePercent}% coverage • {s.awards.length} awards</Text>
            </View>
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
  appCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initial: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  info: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  schemeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  schemeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  schemeInfo: { flex: 1 },
  schemeName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  schemeMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
});
