import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const MENU_ITEMS = [
  { id: 'edit', label: 'Edit Profile', icon: 'create-outline', color: '#2563eb' },
  { id: 'reports', label: 'Exam Reports', icon: 'analytics-outline', color: '#059669' },
  { id: 'help', label: 'Help & Support', icon: 'help-circle-outline', color: '#d97706' },
  { id: 'logout', label: 'Logout', icon: 'log-out-outline', color: '#dc2626' },
];

export default function ExamProfile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [resultAlerts, setResultAlerts] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await examcellApi.profile();
      setProfile(res);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  const handleMenuPress = (item) => {
    if (item.id === 'edit') {
      Alert.alert('Edit Profile', 'Update your name, title, and contact details.');
    } else if (item.id === 'reports') {
      Alert.alert('Exam Reports', 'Season-wise exam analytics: pass rates, grade distribution, incidents.');
    } else if (item.id === 'help') {
      Alert.alert('Help & Support', 'Contact the ERP support team or view documentation.');
    } else if (item.id === 'logout') {
      Alert.alert('Logout', 'Sign out of the Exam Cell account?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => Alert.alert('Logged Out', 'Returning to login.') },
      ]);
    }
  };

  const initials = profile?.name ? profile.name.split(' ').map((n) => n[0]).join('').substring(0, 2) : 'EC';
  const stats = profile?.stats ?? {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'Exam Cell User'}</Text>
        <Text style={styles.role}>{profile?.designation || 'Controller of Examinations'}</Text>
        <Text style={styles.meta}>Exam Cell • Examinations Department</Text>
        <View style={styles.badgeRow}>
          {profile?.email && (
            <View style={styles.badge}>
              <Ionicons name="mail-outline" size={12} color="#2563eb" />
              <Text style={[styles.badgeText, { color: '#2563eb' }]}>{profile.email}</Text>
            </View>
          )}
          {profile?.employeeNo && (
            <View style={styles.badge}>
              <Ionicons name="id-card-outline" size={12} color="#059669" />
              <Text style={[styles.badgeText, { color: '#059669' }]}>{profile.employeeNo}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.sectionLabel}>Exam Stats</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalExams ?? 0}</Text>
          <Text style={styles.statLabel}>Exams Created</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{(stats.totalHallTickets ?? 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Hall Tickets</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalCheatingCases ?? 0}</Text>
          <Text style={styles.statLabel}>Cases</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Preferences</Text>
      <View style={styles.prefCard}>
        <View style={styles.prefRow}>
          <View style={styles.prefIcon}>
            <Ionicons name="notifications-outline" size={18} color="#2563eb" />
          </View>
          <Text style={styles.prefLabel}>App Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }} thumbColor={notifications ? '#2563eb' : '#f1f5f9'} />
        </View>
        <View style={styles.prefDivider} />
        <View style={styles.prefRow}>
          <View style={styles.prefIcon}>
            <Ionicons name="trophy-outline" size={18} color="#059669" />
          </View>
          <Text style={styles.prefLabel}>Result Publish Alerts</Text>
          <Switch value={resultAlerts} onValueChange={setResultAlerts} trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }} thumbColor={resultAlerts ? '#2563eb' : '#f1f5f9'} />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, idx) => (
          <TouchableOpacity key={item.id} style={[styles.menuRow, idx < MENU_ITEMS.length - 1 && styles.menuDivider]} onPress={() => handleMenuPress(item)} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: item.color + '14' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.version}>Learnix ERP • Exam Cell v1.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  profileCard: { backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 24, alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold' },
  name: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.4 },
  role: { fontSize: 13, fontWeight: '600', color: '#2563eb', fontFamily: 'Manrope-SemiBold', marginTop: 2 },
  meta: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600', fontFamily: 'Manrope-SemiBold' },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', paddingVertical: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
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
