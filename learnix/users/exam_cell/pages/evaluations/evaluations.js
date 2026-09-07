import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_META = {
  PENDING: { color: '#2563eb', label: 'Pending' },
  IN_PROGRESS: { color: '#d97706', label: 'In Progress' },
  COMPLETED: { color: '#059669', label: 'Completed' },
};

export default function EvaluationsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.evaluations();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading evaluations…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const evals = data?.evaluations ?? [];
  const completed = evals.reduce((a, e) => a + e.completedPapers, 0);
  const total = evals.reduce((a, e) => a + e.totalPapers, 0);
  const pending = evals.filter((e) => e.status === 'PENDING').length;
  const inProgress = evals.filter((e) => e.status === 'IN_PROGRESS').length;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleComplete = async (evalId) => {
    try {
      await examcellApi.completeEvaluation(evalId);
      Alert.alert('Evaluation Marked Complete');
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const stats = [
    { id: 'completed', label: 'Completed', value: completed.toString(), icon: 'checkmark-done', color: '#059669' },
    { id: 'inProgress', label: 'In Progress', value: inProgress.toString(), icon: 'time', color: '#d97706' },
    { id: 'pending', label: 'Pending', value: pending.toString(), icon: 'clipboard', color: '#2563eb' },
    { id: 'total', label: 'Total Papers', value: total.toString(), icon: 'document-text', color: '#0284c7' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Overall Grading Progress</Text>
          <Text style={styles.progressPct}>{overallPct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${overallPct}%` }]} />
        </View>
        <Text style={styles.progressNote}>{completed} of {total} papers graded • {pending} evaluation(s) pending</Text>
      </View>

      {data?.deadline && (
        <View style={styles.deadlineCard}>
          <Ionicons name="time-outline" size={16} color="#d97706" />
          <Text style={styles.deadlineText}>Grading deadline: {new Date(data.deadline).toLocaleDateString()}</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Evaluation Subjects</Text>
      {evals.map((ev) => {
        const pct = ev.totalPapers > 0 ? Math.round((ev.completedPapers / ev.totalPapers) * 100) : 0;
        const meta = STATUS_META[ev.status] || STATUS_META.PENDING;
        return (
          <View key={ev.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectInfo}>
                <Text style={styles.subjectName}>{ev.course}</Text>
                <Text style={styles.subjectMeta}>{ev.courseCode} • {ev.examName}</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: meta.color + '1A' }]}>
                <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <View style={styles.subjectTrack}>
              <View style={[styles.subjectFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
            </View>
            <View style={styles.subjectFooter}>
              <Text style={styles.subjectCount}>{ev.completedPapers}/{ev.totalPapers} graded • {pct}%</Text>
              {ev.status !== 'COMPLETED' && (
                <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(ev.id)} activeOpacity={0.7}>
                  <Ionicons name="checkmark-circle-outline" size={13} color="#059669" />
                  <Text style={styles.completeText}>Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
      {evals.length === 0 && <Text style={styles.emptyText}>No evaluations found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  progressCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 16, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  progressPct: { fontSize: 18, fontWeight: '800', color: '#2563eb', fontFamily: 'PlusJakartaSans-Bold' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#eef2f7', marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#2563eb' },
  progressNote: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 8 },
  deadlineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fffbeb', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#fde68a', padding: 12, marginBottom: 16, gap: 8 },
  deadlineText: { fontSize: 12, color: '#d97706', fontFamily: 'Manrope-SemiBold' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  subjectCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectInfo: { flex: 1 },
  subjectName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  subjectMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  subjectTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', marginTop: 10, overflow: 'hidden' },
  subjectFill: { height: '100%', borderRadius: 3 },
  subjectFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  subjectCount: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  completeText: { fontSize: 11, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },
});
