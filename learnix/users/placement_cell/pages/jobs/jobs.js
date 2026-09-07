import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { placementApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = { OPEN: '#059669', CLOSED: '#64748b' };

export default function JobsModule({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ companyId: '', role: '', packagePerAnnum: '', location: '', openings: '1', deadline: '', description: '' });

  const fetchData = useCallback(async () => {
    try { setError(null); const res = await placementApi.jobs(); setJobs(Array.isArray(res) ? res : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handlePostJob = async () => {
    if (!form.companyId.trim() || !form.role.trim()) { Alert.alert('Missing Fields', 'Please enter company ID and role.'); return; }
    try {
      await placementApi.postJob({ companyId: form.companyId, role: form.role, packageMinorPerAnnum: Math.round((parseFloat(form.packagePerAnnum) || 3) * 100000), location: form.location, openings: parseInt(form.openings, 10) || 1, deadline: form.deadline || undefined, description: form.description || undefined });
      setForm({ companyId: '', role: '', packagePerAnnum: '', location: '', openings: '1', deadline: '', description: '' });
      setTab('list'); fetchData(); Alert.alert('Job Posted', 'Job is now live on the student board.');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleCloseJob = async (jobId) => {
    Alert.alert('Close Job', 'Close this job posting?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: async () => {
        try { await placementApi.closeJob(jobId); fetchData(); Alert.alert('Closed'); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading jobs…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{jobs.length}</Text><Text style={styles.statLabel}>Total Jobs</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{jobs.filter((j) => j.status === 'OPEN').length}</Text><Text style={styles.statLabel}>Open</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{jobs.reduce((a, j) => a + j.applications, 0)}</Text><Text style={styles.statLabel}>Applications</Text></View>
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'list', label: 'Openings' }, { id: 'create', label: 'Post Job' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' && jobs.map((job) => (
        <View key={job.id} style={styles.jobCard}>
          <View style={[styles.companyIcon, { backgroundColor: '#2563eb14' }]}><Text style={styles.companyInitial}>{job.company.charAt(0)}</Text></View>
          <View style={styles.jobInfo}>
            <Text style={styles.jobTitle}>{job.role}</Text>
            <Text style={styles.jobCompany}>{job.company} • {job.location || 'TBA'}</Text>
            <View style={styles.jobChips}>
              <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[job.status] || '#2563eb') + '1A' }]}><Text style={[styles.statusText, { color: STATUS_COLORS[job.status] || '#2563eb' }]}>{job.status}</Text></View>
              <Text style={styles.jobMeta}>₹{((job.packagePerAnnum || 0) / 100000).toFixed(1)} LPA • {job.applications} applied</Text>
            </View>
          </View>
          {job.status === 'OPEN' && (
            <TouchableOpacity style={styles.closeBtn} onPress={() => handleCloseJob(job.id)} activeOpacity={0.7}>
              <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {tab === 'create' && (
        <>
          <Text style={styles.formHint}>Post a job opening. It appears instantly on the student job board.</Text>
          <Text style={styles.fieldLabel}>Company ID</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.companyId} onChangeText={(v) => setForm((p) => ({ ...p, companyId: v }))} placeholder="Company ID" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.role} onChangeText={(v) => setForm((p) => ({ ...p, role: v }))} placeholder="e.g. Software Engineer" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Package (LPA)</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.packagePerAnnum} onChangeText={(v) => setForm((p) => ({ ...p, packagePerAnnum: v }))} placeholder="e.g. 7.5" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" /></View>
          <Text style={styles.fieldLabel}>Location</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="e.g. Bengaluru" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Openings</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.openings} onChangeText={(v) => setForm((p) => ({ ...p, openings: v }))} placeholder="1" placeholderTextColor="#cbd5e1" keyboardType="numeric" /></View>
          <TouchableOpacity style={styles.createBtn} onPress={handlePostJob} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.createBtnText}>Post Job</Text>
          </TouchableOpacity>
        </>
      )}
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' }, activeTabText: { color: '#2563eb' },
  jobCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  companyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  companyInitial: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  jobInfo: { flex: 1 }, jobTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  jobCompany: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  jobChips: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  jobMeta: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  createBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
