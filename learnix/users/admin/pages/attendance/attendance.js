import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';
import { api } from '../../../../services/api';

export default function AttendanceScreen({ navigation }) {
  const [data, setData] = useState({ overview: {}, lowAttendance: [], thresholdAlerts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.adminApi.attendance();
      setData({ overview: d.overview || {}, lowAttendance: d.lowAttendance || [], thresholdAlerts: d.thresholdAlerts || [] });
    } catch (e) {
      console.warn('Failed to load attendance:', e);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  const ov = data.overview;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Hero stat */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Overall Attendance</Text>
        <Text style={styles.heroValue}>{ov.overallPercentage ?? '—'}%</Text>
        <Text style={styles.heroSub}>{ov.totalSessions ?? 0} sessions across all classes</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{ov.presentToday ?? '—'}</Text>
          <Text style={styles.statLabel}>Present Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{ov.absentToday ?? '—'}</Text>
          <Text style={styles.statLabel}>Absent Today</Text>
        </View>
      </View>

      {/* Threshold alerts */}
      {data.thresholdAlerts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Threshold Alerts</Text>
          {data.thresholdAlerts.map((alert, i) => (
            <View key={i} style={styles.alertCard}>
              <Ionicons name="warning" size={16} color="#dc2626" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.alertName}>{alert.studentName || alert.name}</Text>
                <Text style={styles.alertDetail}>{alert.courseName || alert.detail} — {alert.percentage ?? alert.attendance}%</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Low attendance */}
      {data.lowAttendance.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Low Attendance Students</Text>
          {data.lowAttendance.map((s, i) => (
            <View key={i} style={styles.studentRow}>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>{(s.name || 'S')[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{s.name}</Text>
                <Text style={styles.studentDetail}>{s.courseName || ''} • {s.rollNo || ''}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.badgeText, { color: '#dc2626' }]}>{s.percentage ?? s.attendance}%</Text>
              </View>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9' },
  heroCard: { backgroundColor: '#2563eb', margin: 16, borderRadius: 20, padding: 20, alignItems: 'center' },
  heroLabel: { fontSize: 12, color: '#bfdbfe', fontFamily: 'Manrope-Medium' },
  heroValue: { fontSize: 36, color: '#fff', fontFamily: 'PlusJakartaSans-Bold', marginTop: 4 },
  heroSub: { fontSize: 11, color: '#bfdbfe', fontFamily: 'Manrope-Regular', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', marginHorizontal: 16, marginBottom: 6, borderRadius: 12, padding: 12 },
  alertName: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  alertDetail: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 6, borderRadius: 12, padding: 12 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#2563eb' },
  studentName: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  studentDetail: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Manrope-SemiBold' },
});
