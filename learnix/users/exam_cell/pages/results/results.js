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

const REVAL_COLORS = {
  REQUESTED: '#2563eb',
  APPROVED: '#d97706',
  COMPLETED: '#059669',
  REJECTED: '#dc2626',
};

export default function ResultsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('publish');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.results();
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
        <Text style={styles.loadingText}>Loading results…</Text>
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

  const pendingPublish = data?.pendingPublish ?? [];
  const published = data?.published ?? [];
  const reevalRequests = data?.reevalRequests ?? [];

  const handlePublish = async (slotId) => {
    try {
      await examcellApi.publishResults(slotId);
      Alert.alert('Results Published', 'Results are now live for students.');
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDecideReval = async (id, decision) => {
    try {
      await examcellApi.decideReevaluation(id, decision);
      Alert.alert(decision === 'APPROVED' ? 'Approved' : 'Rejected', `Re-evaluation ${decision.toLowerCase()}.`);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const stats = [
    { id: 'pending', label: 'Pending Publish', value: pendingPublish.length.toString(), icon: 'time', color: '#d97706' },
    { id: 'published', label: 'Published', value: published.length.toString(), icon: 'checkmark-done', color: '#059669' },
    { id: 'revaluation', label: 'Revaluations', value: reevalRequests.length.toString(), icon: 'refresh', color: '#2563eb' },
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

      <View style={styles.tabsRow}>
        {[
          { id: 'publish', label: `Publish (${pendingPublish.length})` },
          { id: 'published', label: 'Published' },
          { id: 'revaluation', label: `Revaluation (${reevalRequests.length})` },
        ].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'publish' && (
        <>
          <Text style={styles.sectionLabel}>Awaiting Publication</Text>
          {pendingPublish.map((result) => (
            <View key={result.slotId} style={styles.resultCard}>
              <View style={[styles.resultIcon, { backgroundColor: '#2563eb14' }]}>
                <Ionicons name="trophy-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultSubject}>{result.course}</Text>
                <Text style={styles.resultMeta}>{result.courseCode} • {result.examName}</Text>
                <Text style={styles.resultGraded}>{result.graded}/{result.totalStudents} graded</Text>
              </View>
              <TouchableOpacity style={styles.publishBtn} onPress={() => handlePublish(result.slotId)} activeOpacity={0.7}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
          {pendingPublish.length === 0 && <Text style={styles.emptyText}>No results pending publication.</Text>}
        </>
      )}

      {tab === 'published' && (
        <>
          <Text style={styles.sectionLabel}>Published Results</Text>
          {published.map((result, i) => (
            <View key={i} style={styles.resultCard}>
              <View style={[styles.resultIcon, { backgroundColor: '#05966914' }]}>
                <Ionicons name="checkmark-done-outline" size={18} color="#059669" />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultSubject}>{result.course}</Text>
                <Text style={styles.resultMeta}>{result.courseCode} • {result.examName}</Text>
              </View>
              <View style={[styles.passChip, { backgroundColor: '#0596691A' }]}>
                <Text style={[styles.passText, { color: '#059669' }]}>{result.passRate}% pass</Text>
              </View>
            </View>
          ))}
          {published.length === 0 && <Text style={styles.emptyText}>No results published yet.</Text>}
        </>
      )}

      {tab === 'revaluation' && (
        <>
          <Text style={styles.sectionLabel}>Revaluation Requests</Text>
          {reevalRequests.map((request) => (
            <TouchableOpacity key={request.id} style={styles.revalCard} activeOpacity={0.8}
              onPress={() => {
                if (request.status === 'REQUESTED') {
                  Alert.alert('Revaluation Request', `${request.studentName} — ${request.reason}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Approve', onPress: () => handleDecideReval(request.id, 'APPROVED') },
                    { text: 'Reject', style: 'destructive', onPress: () => handleDecideReval(request.id, 'REJECTED') },
                  ]);
                }
              }}
            >
              <View style={[styles.revalIcon, { backgroundColor: (REVAL_COLORS[request.status] || '#2563eb') + '14' }]}>
                <Ionicons name="refresh-outline" size={18} color={REVAL_COLORS[request.status] || '#2563eb'} />
              </View>
              <View style={styles.revalInfo}>
                <Text style={styles.revalStudent}>{request.studentName} • {request.course}</Text>
                <Text style={styles.revalReason}>{request.reason}</Text>
              </View>
              <View style={[styles.revalStatusChip, { backgroundColor: (REVAL_COLORS[request.status] || '#2563eb') + '1A' }]}>
                <Text style={[styles.revalStatusText, { color: REVAL_COLORS[request.status] || '#2563eb' }]}>{request.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {reevalRequests.length === 0 && <Text style={styles.emptyText}>No re-evaluation requests.</Text>}
        </>
      )}
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#2563eb' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  resultIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  resultInfo: { flex: 1 },
  resultSubject: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  resultMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  resultGraded: { fontSize: 11, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  publishBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  passChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  passText: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  revalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  revalIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  revalInfo: { flex: 1 },
  revalStudent: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  revalReason: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  revalStatusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  revalStatusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
