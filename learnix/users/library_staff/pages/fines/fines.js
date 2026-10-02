import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard, EmptyState, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';

const THEME = '#b45309';

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
    Alert.alert('Waive Fine', `Waive the ₹${item.amountRupees} fine for ${item.student}? This is recorded in the audit log.`, [
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
  const unpaid = data?.pending || [];
  const collected = data?.collected || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}>
      {/* Stats */}
      <AnimatedCard delay={0} style={[styles.block, styles.statsRow]}>
        {[
          { label: 'Pending', value: stats.pendingCount ?? 0, icon: 'time', color: '#d97706' },
          { label: 'Amount', value: `₹${stats.pendingAmountRupees ?? 0}`, icon: 'cash', color: '#dc2626' },
          { label: 'Collected', value: `₹${stats.collectedAmountRupees ?? 0}`, icon: 'checkmark-circle', color: '#059669' },
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

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[{ id: 'unpaid', label: `Pending (${unpaid.length})` }, { id: 'collected', label: 'Settled' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'unpaid' ? (
        unpaid.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="No pending fines"
            subtitle="All overdue fines have been collected or waived."
            color="#059669"
          />
        ) : (
          unpaid.map((item, idx) => (
            <AnimatedCard key={item.id} delay={100 + idx * 60} style={styles.block}>
              <View style={styles.fineRow}>
                <View style={[styles.fineIcon, { backgroundColor: '#dc2626' + '14' }]}>
                  <Ionicons name="cash-outline" size={18} color="#dc2626" />
                </View>
                <View style={styles.fineBody}>
                  <Text style={styles.studentName} numberOfLines={1}>{item.student}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{item.book} · {item.daysOverdue} days overdue</Text>
                  <Text style={styles.fineAmount}>₹{item.amountRupees}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.collectBtn, processing === item.id && styles.collectBtnBusy]} onPress={() => handleCollect(item)} activeOpacity={0.85} disabled={processing === item.id}>
                    {processing === item.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <><Ionicons name="checkmark-circle" size={14} color="#FFFFFF" /><Text style={styles.collectBtnText}>Collect</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.waiveBtn} onPress={() => handleWaive(item)} activeOpacity={0.7} disabled={processing === item.id}>
                    <Ionicons name="gift-outline" size={15} color="#059669" />
                  </TouchableOpacity>
                </View>
              </View>
            </AnimatedCard>
          ))
        )
      ) : (
        <>
          <Text style={styles.sectionLabel}>Recently Settled</Text>
          {collected.length === 0 ? (
            <EmptyState icon="receipt-outline" title="Nothing settled yet" subtitle="Collected and waived fines will appear here." color={THEME} />
          ) : (
            collected.map((item, idx) => {
              const waived = item.status === 'WAIVED';
              return (
                <AnimatedCard key={item.id} delay={100 + idx * 60} style={styles.block}>
                  <View style={styles.fineRow}>
                    <View style={[styles.fineIcon, { backgroundColor: (waived ? '#d97706' : '#059669') + '14' }]}>
                      <Ionicons name={waived ? 'gift-outline' : 'checkmark-circle-outline'} size={18} color={waived ? '#d97706' : '#059669'} />
                    </View>
                    <View style={styles.fineBody}>
                      <Text style={styles.studentName} numberOfLines={1}>{item.student}</Text>
                      <Text style={styles.meta} numberOfLines={1}>{item.book} · {waived ? 'Waived' : 'Paid'}</Text>
                    </View>
                    <Text style={[styles.settledAmount, { color: waived ? '#d97706' : '#059669' }]}>₹{item.amountRupees}</Text>
                  </View>
                </AnimatedCard>
              );
            })
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
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  block: { marginBottom: 10 },

  // Stats
  statsRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6 },
  statDivider: { width: 1, backgroundColor: '#eef2f7', marginVertical: 8 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },

  // Tabs
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: THEME },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },

  // Fine rows
  fineRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  fineIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  fineBody: { flex: 1, paddingRight: 8 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  fineAmount: { fontSize: 13, fontWeight: '700', color: '#dc2626', fontFamily: 'Manrope-Bold', marginTop: 4 },
  settledAmount: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  collectBtnBusy: { opacity: 0.7 },
  collectBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  waiveBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', justifyContent: 'center', alignItems: 'center' },
});
