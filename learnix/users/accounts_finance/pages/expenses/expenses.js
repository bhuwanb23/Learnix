import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = { PENDING: '#d97706', APPROVED: '#059669', REJECTED: '#dc2626' };

export default function ExpensesModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('claims');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.expenses();
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

  const handleAction = async (expense, action) => {
    try {
      if (action === 'approve') await accountsApi.approveExpense(expense.id);
      else await accountsApi.rejectExpense(expense.id);
      fetchData();
      Alert.alert(action === 'approve' ? 'Approved' : 'Rejected', `Expense ${action === 'approve' ? 'approved' : 'rejected'}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading expenses…</Text></View>;
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

  const expenses = data?.expenses || [];
  const budgets = data?.budgets || [];
  const pending = expenses.filter((e) => e.status === 'PENDING');
  const resolved = expenses.filter((e) => e.status !== 'PENDING');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      <View style={styles.statsRow}>
        {[
          { label: 'Pending', value: pending.length, icon: 'time', color: '#d97706' },
          { label: 'Approved', value: expenses.filter((e) => e.status === 'APPROVED').length, icon: 'checkmark-circle', color: '#059669' },
          { label: 'Budgets', value: budgets.length, icon: 'wallet', color: '#2563eb' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'claims', label: `Pending (${pending.length})` }, { id: 'all', label: `All (${expenses.length})` }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {(tab === 'claims' ? pending : expenses).map((item) => (
        <TouchableOpacity key={item.id} style={styles.expenseCard} activeOpacity={item.status === 'PENDING' ? 0.8 : 1}
          onPress={() => item.status === 'PENDING' && Alert.alert('Expense', `${item.category} — ${item.vendor ?? 'N/A'}\n₹${item.amountRupees.toLocaleString()}`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Approve', onPress: () => handleAction(item, 'approve') },
            { text: 'Reject', style: 'destructive', onPress: () => handleAction(item, 'reject') },
          ])}>
          <View style={[styles.avatar, { backgroundColor: (STATUS_COLORS[item.status] || '#64748b') + '14' }]}>
            <Ionicons name="receipt-outline" size={18} color={STATUS_COLORS[item.status] || '#64748b'} />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{item.vendor ?? item.category}</Text>
            <Text style={styles.meta}>{item.category} • {item.date ? new Date(item.date).toLocaleDateString('en-IN') : '—'}</Text>
            <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[item.status] || '#64748b') + '1A' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#64748b' }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={styles.amount}>₹{item.amountRupees.toLocaleString()}</Text>
        </TouchableOpacity>
      ))}

      {budgets.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Budget Overview</Text>
          {budgets.map((b) => (
            <View key={b.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetName}>{b.category}</Text>
                <Text style={[styles.budgetPct, { color: b.utilizationPct > 90 ? '#dc2626' : '#059669' }]}>{b.utilizationPct}%</Text>
              </View>
              <View style={styles.budgetTrack}>
                <View style={[styles.budgetFill, { width: `${b.utilizationPct}%`, backgroundColor: b.utilizationPct > 90 ? '#dc2626' : '#059669' }]} />
              </View>
            </View>
          ))}
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
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10, marginTop: 8 },
  expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  meta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  amount: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'Manrope-Bold', marginLeft: 10 },
  budgetCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  budgetPct: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  budgetTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', marginTop: 8, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
});
