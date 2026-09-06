import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../../../constants/theme';
import { hodApi } from '../../../../services/api';

const menuItems = [
  { icon: 'people-outline', label: 'Department Committees', color: '#2563eb' },
  { icon: 'document-text-outline', label: 'Department Reports', color: '#0891b2' },
  { icon: 'shield-checkmark-outline', label: 'Access & Permissions', color: '#059669' },
  { icon: 'calendar-outline', label: 'Academic Calendar', color: '#d97706' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#dc2626' },
];

export default function Profile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [approvalAlerts, setApprovalAlerts] = useState(true);
  const [attendanceAlerts, setAttendanceAlerts] = useState(true);
  const [meetingAlerts, setMeetingAlerts] = useState(true);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const p = await hodApi.profile();
      setProfile(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Clear the session and re-login as the demo HOD?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('learnix.refreshToken');
          Alert.alert('Logged out', 'Session cleared. The app will re-authenticate on next load.');
        },
      },
    ]);
  };

  if (loading && !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = profile.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>{profile.fullName}</Text>
          <Text style={styles.role}>
            Head of Department{profile.department ? ` · ${profile.department.code}` : ''}
          </Text>
          <Text style={styles.dept}>
            {profile.department?.name ?? 'Learnix Institute'}{profile.designation ? ` · ${profile.designation}` : ''}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(profile.roles ?? []).length}</Text>
              <Text style={styles.statLabel}>Roles</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.department?.code ?? '—'}</Text>
              <Text style={styles.statLabel}>Dept</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact</Text>
          <View style={styles.card}>
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#0891b21a' }]}>
                <Ionicons name="mail-outline" size={18} color="#0891b2" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Email</Text>
              </View>
              <Text style={styles.rowValue} numberOfLines={1}>{profile.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#2563eb1a' }]}>
                <Ionicons name="document-text-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Approval alerts</Text>
                <Text style={styles.rowSub}>Syllabus and leave submissions</Text>
              </View>
              <Switch
                value={approvalAlerts}
                onValueChange={setApprovalAlerts}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={approvalAlerts ? '#2563eb' : '#f4f4f5'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#dc26261a' }]}>
                <Ionicons name="warning-outline" size={18} color="#dc2626" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Attendance alerts</Text>
                <Text style={styles.rowSub}>Classes dropping below 75%</Text>
              </View>
              <Switch
                value={attendanceAlerts}
                onValueChange={setAttendanceAlerts}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={attendanceAlerts ? '#2563eb' : '#f4f4f5'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.rowItem}>
              <View style={[styles.iconWrap, { backgroundColor: '#d977061a' }]}>
                <Ionicons name="people-outline" size={18} color="#d97706" />
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>Meeting alerts</Text>
                <Text style={styles.rowSub}>Faculty meetings and events</Text>
              </View>
              <Switch
                value={meetingAlerts}
                onValueChange={setMeetingAlerts}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={meetingAlerts ? '#2563eb' : '#f4f4f5'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            {menuItems.map((item, idx) => (
              <View key={item.label}>
                <TouchableOpacity
                  style={styles.rowItem}
                  onPress={() => Alert.alert(item.label, 'Coming in a later phase.')}
                >
                  <View style={[styles.iconWrap, { backgroundColor: item.color + '1a' }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
                {idx < menuItems.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Learnix ERP v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  content: { paddingBottom: 40 },
  header: {
    paddingTop: theme.spacing.xl + 10,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  avatarWrap: { position: 'relative', marginTop: theme.spacing.sm },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
    marginTop: 12,
  },
  role: {
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  dept: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: { marginTop: 20, paddingHorizontal: theme.spacing.lg },
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1, marginRight: 8 },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  rowSub: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    maxWidth: '55%',
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: theme.colors.border },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: theme.spacing.lg,
    marginTop: 24,
  },
  logoutText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 8,
  },
  version: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
});
