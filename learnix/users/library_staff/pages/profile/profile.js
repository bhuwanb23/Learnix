import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { libraryApi } from '../../../../services/api';
import { AnimatedCard } from '../../../../components/ui';
import { theme } from '../../../../constants/theme';

const THEME = '#b45309';

const menuItems = [
  { icon: 'person-outline', label: 'Library Staff Members', color: '#b45309' },
  { icon: 'settings-outline', label: 'Circulation Rules', color: '#0891b2' },
  { icon: 'calendar-outline', label: 'Library Timings', color: '#059669' },
  { icon: 'shield-checkmark-outline', label: 'Access & Permissions', color: '#d97706' },
  { icon: 'help-circle-outline', label: 'Help & Support', color: '#dc2626' },
];

function AnimatedStat({ value, label, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={[styles.statItem, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function Profile({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dueReminders, setDueReminders] = useState(true);
  const [autoFines, setAutoFines] = useState(true);
  const [newArrivals, setNewArrivals] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await libraryApi.profile();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive' },
    ]);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.skelHeader}>
          <View style={styles.skelAvatar} />
          <View style={styles.skelLineLight} />
          <View style={[styles.skelLineLight, { width: '45%', marginTop: 8 }]} />
          <View style={styles.skelStats} />
        </View>
        <View style={styles.section}>
          <View style={styles.skelCard} />
          <View style={styles.skelCard} />
        </View>
      </ScrollView>
    );
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
    { label: 'Catalog', value: (data?.stats?.totalBooks ?? 0).toLocaleString() },
    { label: 'Issued', value: (data?.stats?.issuedBooks ?? 0).toLocaleString() },
    { label: 'Members', value: (data?.stats?.activeMembers ?? 0).toLocaleString() },
  ];

  const toggles = [
    { icon: 'time-outline', color: THEME, value: dueReminders, onChange: setDueReminders, label: 'Due reminders', sub: 'Auto-send reminders before due date' },
    { icon: 'cash-outline', color: '#dc2626', value: autoFines, onChange: setAutoFines, label: 'Auto fines', sub: 'Apply overdue fines automatically' },
    { icon: 'notifications-outline', color: '#0891b2', value: newArrivals, onChange: setNewArrivals, label: 'New arrivals', sub: 'Announce newly added books' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={[THEME, '#92400e']} style={styles.header}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>{data?.fullName ?? 'Library Staff'}</Text>
          <Text style={styles.role}>{data?.designation ?? 'Librarian'} · Library Staff</Text>
          <Text style={styles.dept}>Learning Resource Center</Text>
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} delay={100 + i * 100} />
            ))}
          </View>
        </LinearGradient>

        <AnimatedCard delay={200} style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          {toggles.map((t, idx) => (
            <View key={t.label}>
              <View style={styles.rowItem}>
                <View style={[styles.iconWrap, { backgroundColor: t.color + '1a' }]}>
                  <Ionicons name={t.icon} size={18} color={t.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowSub}>{t.sub}</Text>
                </View>
                <Switch
                  value={t.value}
                  onValueChange={t.onChange}
                  trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
                  thumbColor={t.value ? THEME : '#f4f4f5'}
                />
              </View>
              {idx < toggles.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AnimatedCard>

        <AnimatedCard delay={300} style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Account</Text>
          {menuItems.map((item, idx) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.rowItem} onPress={() => Alert.alert(item.label, 'Coming soon')} activeOpacity={0.7}>
                <View style={[styles.iconWrap, { backgroundColor: item.color + '1a' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={styles.rowBody}><Text style={styles.rowLabel}>{item.label}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {idx < menuItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AnimatedCard>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
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
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7f9', padding: 24 },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Medium', textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: THEME, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },

  // Skeleton
  skelHeader: { backgroundColor: THEME, paddingTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, alignItems: 'center' },
  skelAvatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)' },
  skelLineLight: { height: 14, width: '55%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 14 },
  skelStats: { height: 58, alignSelf: 'stretch', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14 },
  skelCard: { height: 170, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginHorizontal: theme.spacing.lg, marginTop: 20 },

  // Header
  header: { paddingTop: theme.spacing.xl + 10, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center' },
  avatarWrap: { position: 'relative', marginTop: theme.spacing.sm },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#fff' },
  name: { fontSize: 20, fontFamily: 'Manrope-ExtraBold', color: '#fff', marginTop: 12 },
  role: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  dept: { fontSize: 12, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 12 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
  statLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Sections
  sectionCard: { marginTop: 20, marginHorizontal: theme.spacing.lg, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  sectionLabel: { fontSize: 12, fontFamily: 'Manrope-Bold', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowBody: { flex: 1, marginRight: 8 },
  rowLabel: { fontSize: 14, fontFamily: 'Manrope-SemiBold', color: theme.colors.text },
  rowSub: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: theme.colors.border },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 14, marginHorizontal: theme.spacing.lg, marginTop: 24 },
  logoutText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 8 },
  version: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 16 },
});
