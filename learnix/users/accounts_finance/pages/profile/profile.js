import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

export default function AccountsProfile({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState(true);
  const [collectionAlerts, setCollectionAlerts] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await accountsApi.profile();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading profile…</Text></View>;
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

  const stats = [
    { label: 'Collected', value: `₹${((data?.stats?.totalCollectedRupees ?? 0) / 100000).toFixed(1)}L` },
    { label: 'Staff', value: data?.stats?.totalStaff ?? 0 },
    { label: 'Scholarships', value: data?.stats?.totalScholarships ?? 0 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>AF</Text></View>
        <Text style={styles.name}>{data?.fullName ?? 'Accounts Officer'}</Text>
        <Text style={styles.role}>{data?.designation ?? 'Chief Accounts Officer'}</Text>
        <Text style={styles.meta}>Accounts & Finance • Finance Department</Text>
      </View>

      <Text style={styles.sectionLabel}>This Year</Text>
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statBox}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Preferences</Text>
      <View style={styles.prefCard}>
        <View style={styles.prefRow}>
          <View style={styles.prefIcon}><Ionicons name="notifications-outline" size={18} color="#2563eb" /></View>
          <Text style={styles.prefLabel}>App Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }} thumbColor={notifications ? '#2563eb' : '#f1f5f9'} />
        </View>
        <View style={styles.prefDivider} />
        <View style={styles.prefRow}>
          <View style={styles.prefIcon}><Ionicons name="cash-outline" size={18} color="#059669" /></View>
          <Text style={styles.prefLabel}>Large Collection Alerts</Text>
          <Switch value={collectionAlerts} onValueChange={setCollectionAlerts} trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }} thumbColor={collectionAlerts ? '#2563eb' : '#f1f5f9'} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuCard}>
        {[
          { label: 'Financial Reports', icon: 'analytics-outline', color: '#059669' },
          { label: 'Help & Support', icon: 'help-circle-outline', color: '#d97706' },
          { label: 'Logout', icon: 'log-out-outline', color: '#dc2626' },
        ].map((item, idx) => (
          <TouchableOpacity key={item.label} style={[styles.menuRow, idx < 2 && styles.menuDivider]}
            onPress={() => item.label === 'Logout'
              ? Alert.alert('Logout', 'Sign out?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', style: 'destructive' }])
              : Alert.alert(item.label, 'Coming soon')}>
            <View style={[styles.menuIcon, { backgroundColor: item.color + '14' }]}><Ionicons name={item.icon} size={18} color={item.color} /></View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.version}>Learnix ERP • Accounts & Finance v1.0</Text>
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
  profileCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 24, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold' },
  name: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.4 },
  role: { fontSize: 13, fontWeight: '600', color: '#2563eb', fontFamily: 'Manrope-SemiBold', marginTop: 2 },
  meta: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  prefCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', paddingHorizontal: 16, marginBottom: 24 },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  prefIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  prefLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  prefDivider: { height: 1, backgroundColor: '#eef2f7' },
  menuCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', paddingHorizontal: 16, marginBottom: 24 },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  version: { textAlign: 'center', fontSize: 11, color: '#94a3b8', fontFamily: 'Manrope-Regular' },
});
