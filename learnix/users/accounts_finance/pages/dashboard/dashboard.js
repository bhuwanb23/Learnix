import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const MODULES = [
  { id: 'FeeStructure', label: 'Fee Structure', desc: 'Program fees & revisions', icon: 'school-outline', color: '#2563eb' },
  { id: 'Expenses', label: 'Expenses', desc: 'Approve & track expenses', icon: 'receipt-outline', color: '#059669' },
  { id: 'Scholarships', label: 'Scholarships', desc: 'Awards & disbursements', icon: 'gift-outline', color: '#d97706' },
  { id: 'Reports', label: 'Reports', desc: 'Finance analytics', icon: 'analytics-outline', color: '#0284c7' },
  // The desk is not only "broadcast to students" any more (docs §3.9): it is the
// officer's inbox across all seven finance categories, plus the financial alerts
// and the announcement composer. Saying otherwise here is what made the tile
// look like a one-way spam tool.
  { id: 'Notifications', label: 'Notifications', desc: 'Inbox, alerts & announcements', icon: 'notifications-outline', color: '#dc2626' },
];

export default function AccountsDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.dashboard();
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

  const handleModulePress = (moduleId) => {
    if (moduleId === 'Collections' || moduleId === 'Dues' || moduleId === 'Payroll') {
      navigation.switchTab(moduleId);
    } else {
      navigation.openModule(moduleId);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading finance data…</Text></View>;
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

  const hero = data?.hero || {};
  const stats = data?.stats || {};
  const recentCollections = data?.recentCollections || [];
  const budget = data?.budget || [];
  const alerts = data?.alerts || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}>
      {/* Hero banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}><Ionicons name="wallet" size={20} color="#2563eb" /></View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>FY 2026-27 Financials</Text>
            <Text style={styles.heroSubtitle}>Collection target {hero.targetPct ?? 0}% • {hero.targetRupees ? `₹${(hero.targetRupees / 100000).toFixed(1)}L target` : 'No target set'}</Text>
          </View>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${hero.targetPct ?? 0}%` }]} />
        </View>
        <Text style={styles.heroNote}>₹{((hero.collectedRupees ?? 0) / 100000).toFixed(1)}L collected of ₹{((hero.targetRupees ?? 0) / 100000).toFixed(1)}L target</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { id: 'collected', label: 'Collected', value: `₹${((stats.collected ?? 0) / 1000).toFixed(0)}K`, icon: 'cash', color: '#059669', tab: 'Collections' },
          { id: 'dues', label: 'Unpaid Dues', value: `₹${((stats.unpaidDues ?? 0) / 1000).toFixed(0)}K`, icon: 'alert-circle', color: '#dc2626', tab: 'Dues' },
          { id: 'defaulters', label: 'Defaulters', value: stats.defaulterCount?.toString() ?? '0', icon: 'people', color: '#d97706', tab: 'Dues' },
        ].map((stat) => (
          <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.8} onPress={() => navigation.switchTab(stat.tab)}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}><Ionicons name={stat.icon} size={18} color={stat.color} /></View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent collections */}
      {recentCollections.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Collections</Text>
            <TouchableOpacity onPress={() => navigation.switchTab('Collections')} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>Record payment</Text>
            </TouchableOpacity>
          </View>
          {recentCollections.slice(0, 3).map((item) => (
            <View key={item.id} style={styles.collectionCard}>
              <View style={[styles.collectionIcon, { backgroundColor: '#05966914' }]}><Ionicons name="person-outline" size={16} color="#059669" /></View>
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>{item.student}</Text>
                <Text style={styles.collectionMeta}>{item.category} • {item.method}</Text>
              </View>
              <Text style={styles.collectionAmount}>₹{item.amountRupees.toLocaleString()}</Text>
            </View>
          ))}
        </>
      )}

      {/* Budget utilization */}
      {budget.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budget Utilization</Text>
          </View>
          {budget.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetName}>{item.category}</Text>
                <Text style={[styles.budgetPct, { color: item.utilizationPct > 90 ? '#dc2626' : '#059669' }]}>{item.utilizationPct}%</Text>
              </View>
              <View style={styles.budgetTrack}>
                <View style={[styles.budgetFill, { width: `${item.utilizationPct}%`, backgroundColor: item.utilizationPct > 90 ? '#dc2626' : '#059669' }]} />
              </View>
            </View>
          ))}
        </>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Needs Attention</Text></View>
          {alerts.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.taskCard} activeOpacity={0.8}
              onPress={() => handleModulePress(item.type === 'PENDING_EXPENSES' ? 'Expenses' : item.type === 'PAYROLL_DUE' ? 'Payroll' : 'Dues')}>
              <View style={[styles.taskIcon, { backgroundColor: '#d9770614' }]}><Ionicons name="alert-circle-outline" size={16} color="#d97706" /></View>
              <View style={styles.taskInfo}><Text style={styles.taskTitle}>{item.message}</Text></View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Module hub */}
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Finance Tools</Text></View>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Medium' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
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
  statValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.3 },
  sectionAction: { fontSize: 12, color: '#2563eb', fontFamily: 'Manrope-SemiBold' },
  collectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  collectionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  collectionInfo: { flex: 1 },
  collectionName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  collectionMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  collectionAmount: { fontSize: 14, fontWeight: '700', color: '#059669', fontFamily: 'Manrope-Bold' },
  budgetCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetName: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  budgetPct: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope-Bold' },
  budgetTrack: { height: 6, borderRadius: 3, backgroundColor: '#eef2f7', marginTop: 8, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  taskIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  moduleCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 16 },
  moduleIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleLabel: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 2 },
  moduleDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16 },
});
