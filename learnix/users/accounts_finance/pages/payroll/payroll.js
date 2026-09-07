import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function PayrollModule({ navigation }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.payroll();
      setRuns(result || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleRunPayroll = async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    Alert.alert('Process Payroll', `Process payroll for ${month}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Process',
        onPress: async () => {
          setProcessing(true);
          try {
            await accountsApi.runPayroll(month);
            fetchData();
            Alert.alert('Payroll Initiated', `Payroll for ${month} created.`);
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  };

  const handleMarkPaid = async (run) => {
    Alert.alert('Mark Paid', `Mark payroll ${run.month} as paid?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          try {
            await accountsApi.markPayrollPaid(run.id);
            fetchData();
            Alert.alert('Done', `Payroll ${run.month} marked as paid.`);
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading payroll…</Text></View>;
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

  const currentRun = runs.length > 0 ? runs[0] : null;
  const totalStaff = currentRun?.entries?.length ?? 0;
  const totalNet = currentRun?.entries?.reduce((s, e) => s + (e.netRupees || 0), 0) ?? 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      <View style={styles.statsRow}>
        {[
          { label: 'Staff', value: totalStaff, icon: 'people', color: '#2563eb' },
          { label: 'Total Net', value: `₹${(totalNet / 1000).toFixed(0)}K`, icon: 'cash', color: '#059669' },
          { label: 'Status', value: currentRun?.status ?? '—', icon: 'checkmark-circle', color: '#d97706' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '14' }]}><Ionicons name={s.icon} size={18} color={s.color} /></View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.runBtn} onPress={handleRunPayroll} activeOpacity={0.85} disabled={processing}>
        {processing ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="flash" size={16} color="#FFFFFF" /><Text style={styles.runBtnText}>Process New Payroll</Text></>}
      </TouchableOpacity>

      {runs.map((run) => (
        <View key={run.id} style={styles.runCard}>
          <View style={styles.runHeader}>
            <Text style={styles.runMonth}>{run.month}</Text>
            <TouchableOpacity style={[styles.statusBadge, { backgroundColor: (run.status === 'PAID' ? '#059669' : '#d97706') + '1A' }]}
              onPress={() => run.status !== 'PAID' && handleMarkPaid(run)}>
              <Text style={[styles.statusText, { color: run.status === 'PAID' ? '#059669' : '#d97706' }]}>{run.status}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.runTotal}>₹{run.totalRupees.toLocaleString()} • {run.entries.length} staff</Text>
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  runBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 13, marginBottom: 20 },
  runBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  runCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  runHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  runMonth: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold', textTransform: 'capitalize' },
  runTotal: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 6 },
});
