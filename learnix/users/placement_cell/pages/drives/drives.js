import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { placementApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STATUS_COLORS = { DRAFT: '#64748b', PENDING_ADMIN: '#d97706', APPROVED: '#059669', SCHEDULED: '#2563eb', COMPLETED: '#0284c7' };
const MODES = ['ON_CAMPUS', 'VIRTUAL'];

export default function DrivesModule({ navigation }) {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('list');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ companyId: '', title: '', role: '', packagePerAnnum: '', driveDate: '', mode: 'ON_CAMPUS', eligibilityJson: '' });

  const fetchData = useCallback(async () => {
    try { setError(null); const res = await placementApi.drives(); setDrives(Array.isArray(res) ? res : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredDrives = drives.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'active') return d.status === 'APPROVED' || d.status === 'SCHEDULED';
    if (filter === 'draft') return d.status === 'DRAFT' || d.status === 'PENDING_ADMIN';
    return true;
  });

  const handleCreateDrive = async () => {
    if (!form.companyId.trim() || !form.role.trim() || !form.driveDate.trim()) {
      Alert.alert('Missing Fields', 'Please enter company ID, role, and drive date.'); return;
    }
    try {
      const payload = { ...form, packageMinorPerAnnum: Math.round((parseFloat(form.packagePerAnnum) || 3) * 100000), eligibilityJson: form.eligibilityJson || '{}' };
      await placementApi.createDrive(payload);
      setForm({ companyId: '', title: '', role: '', packagePerAnnum: '', driveDate: '', mode: 'ON_CAMPUS', eligibilityJson: '' });
      setTab('list'); fetchData(); Alert.alert('Drive Created', 'Drive created as DRAFT. Submit for admin approval when ready.');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleSubmitForApproval = async (driveId) => {
    try { await placementApi.submitDrive(driveId); fetchData(); Alert.alert('Submitted', 'Drive submitted for admin approval.'); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading drives…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: '#2563eb14' }]}><Ionicons name="briefcase" size={18} color="#2563eb" /></View><Text style={styles.statValue}>{drives.length}</Text><Text style={styles.statLabel}>Total Drives</Text></View>
        <View style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: '#05966914' }]}><Ionicons name="checkmark-circle" size={18} color="#059669" /></View><Text style={styles.statValue}>{drives.filter((d) => d.status === 'APPROVED' || d.status === 'SCHEDULED').length}</Text><Text style={styles.statLabel}>Active</Text></View>
        <View style={styles.statCard}><View style={[styles.statIcon, { backgroundColor: '#d9770614' }]}><Ionicons name="time" size={18} color="#d97706" /></View><Text style={styles.statValue}>{drives.filter((d) => d.status === 'DRAFT' || d.status === 'PENDING_ADMIN').length}</Text><Text style={styles.statLabel}>Pending</Text></View>
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'list', label: 'All Drives' }, { id: 'create', label: 'New Drive' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' && (
        <>
          <View style={styles.filterRow}>
            {[{ label: 'All', value: 'all' }, { label: 'Active', value: 'active' }, { label: 'Draft/Pending', value: 'draft' }].map((f) => (
              <TouchableOpacity key={f.value} style={[styles.filterChip, filter === f.value && styles.filterChipActive]} onPress={() => setFilter(f.value)} activeOpacity={0.8}>
                <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {filteredDrives.map((drive) => (
            <View key={drive.id} style={styles.driveCard}>
              <View style={[styles.companyIcon, { backgroundColor: '#2563eb14' }]}><Text style={styles.companyInitial}>{drive.company.charAt(0)}</Text></View>
              <View style={styles.driveInfo}>
                <Text style={styles.companyName}>{drive.company}</Text>
                <Text style={styles.driveRole}>{drive.role} • ₹{((drive.packagePerAnnum || 0) / 100000).toFixed(1)} LPA</Text>
                <Text style={styles.driveMeta}>{drive.driveDate ? new Date(drive.driveDate).toLocaleDateString() : ''} • {drive.mode === 'ON_CAMPUS' ? 'On-campus' : 'Virtual'}</Text>
                <View style={styles.driveChips}>
                  <View style={[styles.statusChip, { backgroundColor: (STATUS_COLORS[drive.status] || '#2563eb') + '1A' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[drive.status] || '#2563eb' }]}>{drive.status?.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.appliedText}>{drive.applications} applied</Text>
                </View>
              </View>
              {drive.status === 'DRAFT' && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => handleSubmitForApproval(drive.id)} activeOpacity={0.7}>
                  <Ionicons name="send" size={14} color="#FFFFFF" /><Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {filteredDrives.length === 0 && <Text style={styles.emptyText}>No drives found.</Text>}
        </>
      )}

      {tab === 'create' && (
        <>
          <Text style={styles.formHint}>Schedule a new campus drive. It starts as DRAFT, then submit for admin approval.</Text>
          <Text style={styles.fieldLabel}>Company ID</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.companyId} onChangeText={(v) => setForm((p) => ({ ...p, companyId: v }))} placeholder="Company ID from directory" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Title</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="e.g. TCS Campus Drive 2026" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.role} onChangeText={(v) => setForm((p) => ({ ...p, role: v }))} placeholder="e.g. Software Engineer" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Package (LPA)</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.packagePerAnnum} onChangeText={(v) => setForm((p) => ({ ...p, packagePerAnnum: v }))} placeholder="e.g. 7.5" placeholderTextColor="#cbd5e1" keyboardType="decimal-pad" /></View>
          <Text style={styles.fieldLabel}>Drive Date</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.driveDate} onChangeText={(v) => setForm((p) => ({ ...p, driveDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Mode</Text>
          <View style={styles.modeRow}>
            {MODES.map((m) => (
              <TouchableOpacity key={m} style={[styles.modeChip, form.mode === m && styles.modeChipActive]} onPress={() => setForm((p) => ({ ...p, mode: m }))} activeOpacity={0.8}>
                <Text style={[styles.modeText, form.mode === m && styles.modeTextActive]}>{m === 'ON_CAMPUS' ? 'On-campus' : 'Virtual'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreateDrive} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.createBtnText}>Create Drive</Text>
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
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' },
  activeTabText: { color: '#2563eb' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' }, filterTextActive: { color: '#FFFFFF' },
  driveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  companyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  companyInitial: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  driveInfo: { flex: 1 }, companyName: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  driveRole: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  driveMeta: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  driveChips: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  appliedText: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  submitBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  modeChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  modeText: { fontSize: 13, color: '#475569', fontFamily: 'Manrope-Medium' }, modeTextActive: { color: '#FFFFFF' },
  createBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
