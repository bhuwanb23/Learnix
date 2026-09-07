import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { placementApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CompaniesModule({ navigation }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('list');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [form, setForm] = useState({ name: '', sector: '', hrContact: '', website: '' });

  const fetchData = useCallback(async () => {
    try { setError(null); const res = await placementApi.companies(); setCompanies(Array.isArray(res) ? res : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const sectors = ['all', ...new Set(companies.map((c) => c.sector).filter(Boolean))];
  const filtered = sectorFilter === 'all' ? companies : companies.filter((c) => c.sector === sectorFilter);

  const handleAddCompany = async () => {
    if (!form.name.trim()) { Alert.alert('Missing Fields', 'Please enter the company name.'); return; }
    try { await placementApi.addCompany({ name: form.name, sector: form.sector || undefined, hrContact: form.hrContact || undefined, website: form.website || undefined }); setForm({ name: '', sector: '', hrContact: '', website: '' }); setTab('list'); fetchData(); Alert.alert('Company Added'); }
    catch (e) { Alert.alert('Error', e.message); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading companies…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{companies.length}</Text><Text style={styles.statLabel}>Partners</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{companies.reduce((a, c) => a + c.jobsCount, 0)}</Text><Text style={styles.statLabel}>Jobs</Text></View>
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'list', label: 'Directory' }, { id: 'add', label: 'Add Company' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' && (
        <>
          <View style={styles.filterRow}>
            {sectors.map((s) => (
              <TouchableOpacity key={s} style={[styles.filterChip, sectorFilter === s && styles.filterChipActive]} onPress={() => setSectorFilter(s)} activeOpacity={0.8}>
                <Text style={[styles.filterText, sectorFilter === s && styles.filterTextActive]}>{s === 'all' ? 'All' : s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {filtered.map((company) => (
            <View key={company.id} style={styles.companyCard}>
              <View style={[styles.companyIcon, { backgroundColor: '#2563eb14' }]}><Text style={styles.companyInitial}>{company.name.charAt(0)}</Text></View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyMeta}>{company.sector || 'N/A'} • {company.jobsCount} jobs • {company.drivesCount} drives</Text>
                {company.hrContact && <Text style={styles.companyPoc}>HR: {company.hrContact}</Text>}
              </View>
            </View>
          ))}
          {filtered.length === 0 && <Text style={styles.emptyText}>No companies found.</Text>}
        </>
      )}

      {tab === 'add' && (
        <>
          <Text style={styles.formHint}>Add a new partner company to the placement directory.</Text>
          <Text style={styles.fieldLabel}>Company Name</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="e.g. TCS" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>Sector</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.sector} onChangeText={(v) => setForm((p) => ({ ...p, sector: v }))} placeholder="e.g. IT" placeholderTextColor="#cbd5e1" /></View>
          <Text style={styles.fieldLabel}>HR Contact</Text>
          <View style={styles.inputContainer}><TextInput style={styles.input} value={form.hrContact} onChangeText={(v) => setForm((p) => ({ ...p, hrContact: v }))} placeholder="e.g. hr@tcs.com" placeholderTextColor="#cbd5e1" /></View>
          <TouchableOpacity style={styles.createBtn} onPress={handleAddCompany} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" /><Text style={styles.createBtnText}>Add Company</Text>
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
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#eef2f7', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  activeTab: { backgroundColor: '#ffffff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'Manrope-SemiBold' }, activeTabText: { color: '#2563eb' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium' }, filterTextActive: { color: '#FFFFFF' },
  companyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  companyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  companyInitial: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  companyInfo: { flex: 1 }, companyName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  companyMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  companyPoc: { fontSize: 11, color: '#2563eb', fontFamily: 'Manrope-SemiBold', marginTop: 2 },
  formHint: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 18, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6, marginTop: 4 },
  inputContainer: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 12 },
  input: { height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular' },
  createBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, marginTop: 4 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
});
