import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const METHODS = [
  { id: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { id: 'NET_BANKING', label: 'Net Banking', icon: 'globe-outline' },
  { id: 'CARD', label: 'Card', icon: 'card-outline' },
  { id: 'CASH', label: 'Cash', icon: 'cash-outline' },
];

export default function CollectionsModule({ navigation }) {
  const [tab, setTab] = useState('list');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ rollNo: '', category: 'TUITION', amount: '', method: 'CASH' });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.collections();
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

  const handleRecord = async () => {
    if (!form.amount.trim()) {
      Alert.alert('Missing Fields', 'Please enter the amount.');
      return;
    }
    try {
      await accountsApi.recordPayment({
        rollNo: form.rollNo.trim() || undefined,
        category: form.category,
        amountMinor: parseInt(form.amount) * 100,
        method: form.method,
      });
      setForm({ rollNo: '', category: 'TUITION', amount: '', method: 'CASH' });
      setTab('list');
      fetchData();
      Alert.alert('Payment Recorded', 'Receipt issued and ledger updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading collections…</Text></View>;
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
  const collections = data?.collections || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.totalPayments ?? 0, icon: 'cash', color: '#2563eb' },
          { label: 'Cleared', value: `₹${((stats.clearedRupees ?? 0) / 1000).toFixed(0)}K`, icon: 'checkmark-circle', color: '#059669' },
          { label: 'Partial', value: stats.partialCount ?? 0, icon: 'time', color: '#d97706' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'list', label: 'Collections' }, { id: 'record', label: 'Record Payment' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' ? (
        <>
          <Text style={styles.sectionLabel}>Recent Collections</Text>
          {collections.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyText}>No collections yet</Text></View>
          ) : (
            collections.slice(0, 20).map((item) => (
              <View key={item.id} style={styles.collectionCard}>
                <View style={[styles.avatar, { backgroundColor: (item.status === 'CLEARED' ? '#059669' : '#d97706') + '14' }]}>
                  <Text style={[styles.initial, { color: item.status === 'CLEARED' ? '#059669' : '#d97706' }]}>{(item.student ?? 'D').charAt(0)}</Text>
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={styles.studentName}>{item.student ?? 'Donor'}</Text>
                  <Text style={styles.collectionMeta}>{item.category} • {item.method} • {item.receiptNo ?? '—'}</Text>
                  <View style={styles.chips}>
                    <View style={[styles.statusChip, { backgroundColor: (item.status === 'CLEARED' ? '#059669' : '#d97706') + '1A' }]}>
                      <Text style={[styles.statusText, { color: item.status === 'CLEARED' ? '#059669' : '#d97706' }]}>{item.status}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.amount}>₹{item.amountRupees.toLocaleString()}</Text>
              </View>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={styles.formHint}>Record an offline or manual payment. The ledger and student fee account update automatically.</Text>
          <Text style={styles.fieldLabel}>Student Roll Number (optional)</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.rollNo} onChangeText={(v) => setForm((p) => ({ ...p, rollNo: v }))} placeholder="e.g. CSE-23-014" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.methodGrid}>
            {['TUITION', 'HOSTEL_RENT', 'MESS', 'TRANSPORT', 'FINE', 'DONATION', 'MISC'].map((c) => (
              <TouchableOpacity key={c} style={[styles.catChip, form.category === c && styles.catChipActive]} onPress={() => setForm((p) => ({ ...p, category: c }))} activeOpacity={0.8}>
                <Text style={[styles.catText, form.category === c && styles.catTextActive]}>{c.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Amount (₹)</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.amount} onChangeText={(v) => setForm((p) => ({ ...p, amount: v }))} placeholder="e.g. 42000" placeholderTextColor="#cbd5e1" keyboardType="numeric" /></View>
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <View style={styles.methodGrid}>
            {METHODS.map((m) => (
              <TouchableOpacity key={m.id} style={[styles.methodChip, form.method === m.id && styles.methodChipActive]} onPress={() => setForm((p) => ({ ...p, method: m.id }))} activeOpacity={0.8}>
                <Ionicons name={m.icon} size={14} color={form.method === m.id ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.methodLabel, form.method === m.id && styles.methodLabelActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.recordBtn} onPress={handleRecord} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            <Text style={styles.recordBtnText}>Record Payment</Text>
          </TouchableOpacity>
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
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  collectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initial: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold' },
  collectionInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  collectionMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chips: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  amount: { fontSize: 14, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold', marginLeft: 10 },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  methodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  methodChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  methodLabel: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium' },
  methodLabelActive: { color: '#FFFFFF' },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  catChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catText: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium' },
  catTextActive: { color: '#FFFFFF' },
  recordBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14 },
  recordBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
