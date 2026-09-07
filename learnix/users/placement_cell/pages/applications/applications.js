import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { placementApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = { APPLIED: '#2563eb', SHORTLISTED: '#d97706', INTERVIEW: '#059669', OFFERED: '#0284c7', REJECTED: '#dc2626' };

export default function ApplicationsModule({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try { setError(null); const res = await placementApi.applications(); setApplications(Array.isArray(res) ? res : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDecide = async (appId, decision) => {
    const labels = { SHORTLISTED: 'Shortlist', INTERVIEW: 'Move to Interview', OFFERED: 'Mark Offered', REJECTED: 'Reject' };
    Alert.alert(`${labels[decision]} Candidate`, `Are you sure?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: labels[decision], style: decision === 'REJECTED' ? 'destructive' : 'default', onPress: async () => {
        try { await placementApi.decideApplication(appId, decision); fetchData(); Alert.alert('Done', `Application ${decision.toLowerCase()}.`); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const filtered = applications.filter((a) => filter === 'all' ? true : a.status === filter);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading applications…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        {['APPLIED', 'SHORTLISTED', 'INTERVIEW', 'OFFERED'].map((s) => (
          <View key={s} style={styles.statCard}>
            <Text style={styles.statValue}>{applications.filter((a) => a.status === s).length}</Text>
            <Text style={styles.statLabel}>{s === 'APPLIED' ? 'Applied' : s === 'SHORTLISTED' ? 'Shortlisted' : s === 'INTERVIEW' ? 'Interview' : 'Offered'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterRow}>
        {[{ label: 'All', value: 'all' }, { label: 'Applied', value: 'APPLIED' }, { label: 'Shortlisted', value: 'SHORTLISTED' }, { label: 'Interview', value: 'INTERVIEW' }].map((f) => (
          <TouchableOpacity key={f.value} style={[styles.filterChip, filter === f.value && styles.filterChipActive]} onPress={() => setFilter(f.value)} activeOpacity={0.8}>
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.listLabel}>{filtered.length} applications</Text>

      {filtered.map((app) => (
        <View key={app.id} style={styles.appCard}>
          <View style={[styles.appAvatar, { backgroundColor: '#2563eb14' }]}><Text style={styles.appInitial}>{app.student.charAt(0)}</Text></View>
          <View style={styles.appInfo}>
            <Text style={styles.appName}>{app.student}</Text>
            <Text style={styles.appMeta}>{app.rollNo} • {app.company} — {app.role}</Text>
            <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[app.status] || '#2563eb') + '1A' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[app.status] || '#2563eb' }]}>{app.status}</Text>
            </View>
          </View>
          {(app.status === 'APPLIED' || app.status === 'SHORTLISTED') && (
            <View style={styles.appActions}>
              {app.status === 'APPLIED' && <TouchableOpacity style={styles.actionBtn} onPress={() => handleDecide(app.id, 'SHORTLISTED')} activeOpacity={0.7}><Ionicons name="checkmark" size={16} color="#059669" /></TouchableOpacity>}
              {app.status === 'SHORTLISTED' && <TouchableOpacity style={styles.actionBtn} onPress={() => handleDecide(app.id, 'INTERVIEW')} activeOpacity={0.7}><Ionicons name="people" size={16} color="#2563eb" /></TouchableOpacity>}
              <TouchableOpacity style={[styles.actionBtn, { borderColor: '#fecaca' }]} onPress={() => handleDecide(app.id, 'REJECTED')} activeOpacity={0.7}><Ionicons name="close" size={16} color="#dc2626" /></TouchableOpacity>
            </View>
          )}
        </View>
      ))}
      {filtered.length === 0 && <Text style={styles.emptyText}>No applications found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' }, content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 9, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2, textAlign: 'center' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' }, filterTextActive: { color: '#FFFFFF' },
  listLabel: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 10 },
  appCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  appAvatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  appInitial: { fontSize: 16, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  appInfo: { flex: 1 }, appName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  appMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  appActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
});
