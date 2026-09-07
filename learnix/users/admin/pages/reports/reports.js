import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function ReportsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try { setError(null); setData(await adminApi.reports()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading reports…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{data?.totalStudents ?? 0}</Text><Text style={styles.statLabel}>Students</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{data?.passRate ?? 0}%</Text><Text style={styles.statLabel}>Pass Rate</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{data?.totalResults ?? 0}</Text><Text style={styles.statLabel}>Results</Text></View>
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Key Insights</Text>
        <View style={styles.insightsGrid}>
          {(data?.insights || []).map((insight, i) => (
            <View key={i} style={styles.insightCard}>
              <Text style={styles.insightValue}>{insight.value}</Text>
              <Text style={styles.insightLabel}>{insight.label}</Text>
              {insight.trend && <Text style={styles.insightTrend}>{insight.trend}</Text>}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Export Center</Text>
        {[
          { id: 'students', label: 'Student Master', desc: 'All student records', icon: 'people-outline', color: '#2563eb' },
          { id: 'attendance', label: 'Attendance Report', desc: 'Monthly attendance data', icon: 'checkmark-done-outline', color: '#059669' },
          { id: 'marks', label: 'Marks Report', desc: 'Exam results & grades', icon: 'trophy-outline', color: '#d97706' },
          { id: 'fees', label: 'Fee Report', desc: 'Collections & dues', icon: 'cash-outline', color: '#0284c7' },
        ].map((option) => (
          <TouchableOpacity key={option.id} style={styles.exportCard} activeOpacity={0.85}>
            <View style={[styles.exportIcon, { backgroundColor: option.color + '14' }]}><Ionicons name={option.icon} size={20} color={option.color} /></View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>{option.label}</Text>
              <Text style={styles.exportDesc}>{option.desc}</Text>
            </View>
            <Ionicons name="download-outline" size={20} color="#2563eb" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' }, content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  block: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 14 },
  insightsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  insightCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  insightValue: { fontSize: 20, fontWeight: '800', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  insightLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  insightTrend: { fontSize: 10, color: '#059669', fontFamily: 'Manrope-Bold', marginTop: 4 },
  exportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  exportIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  exportInfo: { flex: 1 }, exportTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  exportDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
});
