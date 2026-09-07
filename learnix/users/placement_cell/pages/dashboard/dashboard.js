import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { placementApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STAT_META = [
  { id: 'activeDrives', label: 'Active Drives', icon: 'briefcase', color: '#2563eb' },
  { id: 'totalApplications', label: 'Applications', icon: 'document-text', color: '#059669' },
  { id: 'shortlisted', label: 'Shortlisted', icon: 'checkmark-done', color: '#d97706' },
  { id: 'offersAccepted', label: 'Offers Accepted', icon: 'ribbon', color: '#0284c7' },
];

const MODULES = [
  { id: 'Drives', label: 'Drives', desc: 'Manage campus hiring drives', icon: 'briefcase-outline', color: '#2563eb' },
  { id: 'Applications', label: 'Applications', desc: 'Review candidate pipeline', icon: 'document-text-outline', color: '#059669' },
  { id: 'Students', label: 'Students', desc: 'Placement-eligible pool', icon: 'people-outline', color: '#d97706' },
  { id: 'Jobs', label: 'Jobs', desc: 'Post & manage openings', icon: 'cash-outline', color: '#0284c7' },
  { id: 'Companies', label: 'Companies', desc: 'Partner directory', icon: 'business-outline', color: '#4f46e5' },
  { id: 'Notifications', label: 'Notify', desc: 'Broadcast to students', icon: 'megaphone-outline', color: '#dc2626' },
];

export default function PlacementDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try { setError(null); setData(await placementApi.dashboard()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleModulePress = (moduleId) => {
    if (['Drives', 'Applications', 'Students'].includes(moduleId)) navigation.switchTab(moduleId);
    else navigation.openModule(moduleId);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading dashboard…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  const hero = data?.hero ?? {};
  const stats = data?.stats ?? {};
  const targetOffers = 360;
  const progressPct = hero.offersAccepted ? Math.min(Math.round((hero.offersAccepted / targetOffers) * 100), 100) : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}><Ionicons name="briefcase" size={20} color="#2563eb" /></View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Placement Season</Text>
            <Text style={styles.heroSubtitle}>{hero.activeDrives ?? 0} active drives • {hero.totalApplications ?? 0} applications • {hero.offersAccepted ?? 0} offers</Text>
          </View>
        </View>
        <View style={styles.heroProgressTrack}><View style={[styles.heroProgressFill, { width: `${progressPct}%` }]} /></View>
        <Text style={styles.heroNote}>{progressPct}% of placement target achieved ({hero.offersAccepted ?? 0} / {targetOffers} offers)</Text>
      </View>

      <View style={styles.statsRow}>
        {STAT_META.map((stat) => (
          <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.8}
            onPress={() => { if (stat.id === 'activeDrives') navigation.switchTab('Drives'); if (stat.id === 'totalApplications') navigation.switchTab('Applications'); }}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}><Ionicons name={stat.icon} size={18} color={stat.color} /></View>
            <Text style={styles.statValue}>{stats[stat.id] ?? 0}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {data?.activeDrives?.length > 0 && (
        <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Active Drives</Text></View>
          {data.activeDrives.map((drive) => (
            <TouchableOpacity key={drive.id} style={styles.driveCard} activeOpacity={0.8} onPress={() => navigation.switchTab('Drives')}>
              <View style={[styles.companyIcon, { backgroundColor: '#2563eb14' }]}><Text style={styles.companyInitial}>{drive.company.charAt(0)}</Text></View>
              <View style={styles.driveInfo}>
                <Text style={styles.companyName}>{drive.company}</Text>
                <Text style={styles.driveRole}>{drive.role} • ₹{(drive.packagePerAnnum / 100000).toFixed(1)} LPA</Text>
                <Text style={styles.driveMeta}>{drive.applications} applied • {drive.registrations} registered</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {data?.pendingApplications?.length > 0 && (
        <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Pending Reviews</Text></View>
          {data.pendingApplications.map((app) => (
            <TouchableOpacity key={app.id} style={styles.shortlistCard} activeOpacity={0.8} onPress={() => navigation.switchTab('Applications')}>
              <View style={[styles.shortlistIcon, { backgroundColor: '#d9770614' }]}><Ionicons name="person-outline" size={16} color="#d97706" /></View>
              <View style={styles.shortlistInfo}>
                <Text style={styles.shortlistTitle}>{app.student}</Text>
                <Text style={styles.shortlistMeta}>{app.rollNo} • {app.company} — {app.role}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Placement Tools</Text></View>
      <View style={styles.moduleGrid}>
        {MODULES.map((mod) => (
          <TouchableOpacity key={mod.id} style={styles.moduleCard} activeOpacity={0.8} onPress={() => handleModulePress(mod.id)}>
            <View style={[styles.moduleIcon, { backgroundColor: mod.color + '14' }]}><Ionicons name={mod.icon} size={20} color={mod.color} /></View>
            <Text style={styles.moduleLabel}>{mod.label}</Text>
            <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  heroCard: { backgroundColor: '#2563eb', borderRadius: BORDER_RADIUS.lg, padding: 20, marginBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  heroText: { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope-Regular', marginTop: 2 },
  heroProgressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 16, overflow: 'hidden' },
  heroProgressFill: { height: '100%', borderRadius: 3, backgroundColor: '#FFFFFF' },
  heroNote: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontFamily: 'Manrope-Medium', marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.3 },
  driveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  companyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  companyInitial: { fontSize: 18, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  driveInfo: { flex: 1 },
  companyName: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold' },
  driveRole: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', marginTop: 1 },
  driveMeta: { fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 1 },
  shortlistCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  shortlistIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  shortlistInfo: { flex: 1 },
  shortlistTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  shortlistMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  moduleCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 16 },
  moduleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 2 },
  moduleDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16 },
});
