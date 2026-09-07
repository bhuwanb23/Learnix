import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function ReportsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.reports();
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading reports…</Text></View>;
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

  const summary = data?.summary || {};
  const collectionsByCategory = data?.collectionsByCategory || [];
  const duesByStatus = data?.duesByStatus || [];
  const expensesByCategory = data?.expensesByCategory || [];

  const REPORT_TYPES = [
    { id: 'collections', name: 'Fee Collection Summary', desc: 'Collections by category', icon: 'cash-outline', color: '#059669' },
    { id: 'dues', name: 'Dues Aging Report', desc: 'Outstanding dues by status', icon: 'alert-circle-outline', color: '#dc2626' },
    { id: 'expenses', name: 'Expense vs Budget', desc: 'Budget utilization breakdown', icon: 'wallet-outline', color: '#d97706' },
    { id: 'payroll', name: 'Payroll Summary', desc: 'Monthly payroll history', icon: 'card-outline', color: '#2563eb' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      {/* Summary stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Collected', value: `₹${(summary.totalCollectedRupees ?? 0).toLocaleString()}`, color: '#059669' },
          { label: 'Unpaid', value: `₹${(summary.totalUnpaidDuesRupees ?? 0).toLocaleString()}`, color: '#dc2626' },
          { label: 'Expenses', value: `₹${(summary.totalExpensesRupees ?? 0).toLocaleString()}`, color: '#d97706' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Collections by category */}
      {collectionsByCategory.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Collections by Category</Text>
          {collectionsByCategory.map((item, idx) => (
            <View key={idx} style={styles.reportRow}>
              <Text style={styles.reportName}>{item.category}</Text>
              <Text style={styles.reportValue}>₹{item.amountRupees.toLocaleString()} ({item.count})</Text>
            </View>
          ))}
        </>
      )}

      {/* Expenses by category */}
      {expensesByCategory.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Expenses by Category</Text>
          {expensesByCategory.map((item, idx) => (
            <View key={idx} style={styles.reportRow}>
              <Text style={styles.reportName}>{item.category}</Text>
              <Text style={styles.reportValue}>₹{item.amountRupees.toLocaleString()} ({item.count})</Text>
            </View>
          ))}
        </>
      )}

      {/* Export buttons */}
      <Text style={styles.sectionLabel}>Export Reports</Text>
      {REPORT_TYPES.map((report) => (
        <TouchableOpacity key={report.id} style={styles.reportCard} activeOpacity={0.8}
          onPress={() => Alert.alert('Export', `Export "${report.name}" as CSV?`)}>
          <View style={[styles.reportIcon, { backgroundColor: report.color + '14' }]}><Ionicons name={report.icon} size={18} color={report.color} /></View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.name}</Text>
            <Text style={styles.reportDesc}>{report.desc}</Text>
          </View>
          <Ionicons name="download-outline" size={18} color="#2563eb" />
        </TouchableOpacity>
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10, marginTop: 8 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 8 },
  reportName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  reportValue: { fontSize: 13, fontWeight: '700', color: '#2563eb', fontFamily: 'Manrope-Bold' },
  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  reportIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reportInfo: { flex: 1 },
  reportTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  reportDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
});
