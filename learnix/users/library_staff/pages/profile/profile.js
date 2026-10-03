import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Animated, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { libraryApi, authApi } from '../../../../services/api';
import { AnimatedCard, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { theme } from '../../../../constants/theme';

const THEME = '#b45309';

/** Menu rows all open a real screen now — none of these are placeholders. */
const MENU_ITEMS = [
  { key: 'LibrarySettings', icon: 'settings-outline', label: 'Library Settings', sub: 'Loan rules, fines, timings', color: '#0891b2' },
  { key: 'StaffDirectory', icon: 'people-outline', label: 'Library Staff', sub: 'Everyone on this desk', color: THEME },
  { key: 'MyPermissions', icon: 'shield-checkmark-outline', label: 'Access & Permissions', sub: 'What your role allows', color: '#d97706' },
  { key: 'ChangePassword', icon: 'lock-closed-outline', label: 'Change Password', sub: 'Update your sign-in', color: '#7c3aed' },
  { key: 'HelpSupport', icon: 'help-circle-outline', label: 'Help & Support', sub: 'How this module works', color: '#2563eb' },
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
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(null); // preference key currently in flight
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      setData(await libraryApi.profile());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  /**
   * Preferences write straight through to the library's settings record — these
   * are the same three switches the Circulation Rules and Reminder screens obey,
   * so a toggle here genuinely changes desk behaviour.
   */
  const togglePreference = async (key, value) => {
    setSaving(key);
    // Optimistic: reflect the intent immediately, roll back if the write fails.
    setData((d) => ({ ...d, policy: { ...d.policy, [key]: value } }));
    try {
      const saved = await libraryApi.saveLibrarySettings({ [key]: value });
      // The server echoes the whole saved record, so re-sync every field from it
      // rather than trusting the optimistic value.
      setData((d) => ({
        ...d,
        policy: {
          ...d.policy,
          loanPeriodDays: saved.loanPeriodDays,
          maxActiveLoans: saved.maxActiveLoans,
          maxRenewalsPerLoan: saved.maxRenewalsPerLoan,
          finePerDayRupees: saved.finePerDayRupees,
          maxOutstandingFineRupees: saved.maxOutstandingFineRupees,
          openTime: saved.openTime,
          closeTime: saved.closeTime,
          closedDays: saved.closedDays,
          dueRemindersEnabled: saved.dueRemindersEnabled,
          autoFineEnabled: saved.autoFineEnabled,
          announceNewArrivals: saved.announceNewArrivals,
        },
      }));
    } catch (err) {
      setData((d) => ({ ...d, policy: { ...d.policy, [key]: !value } }));
      Alert.alert('Could not save', err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'You will need to sign in again to reach the circulation desk.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await authApi.logout();
          } catch (err) {
            Alert.alert('Log out', err.message);
          } finally {
            setLoggingOut(false);
          }
        },
      },
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
        <TouchableOpacity style={styles.retryBtn} onPress={fetchData}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = data?.stats || {};
  const policy = data?.policy || {};

  const headerStats = [
    { label: 'Titles', value: (stats.titles ?? 0).toLocaleString() },
    { label: 'Copies Out', value: (stats.copiesIssued ?? 0).toLocaleString() },
    { label: 'Members', value: (stats.members ?? 0).toLocaleString() },
  ];

  const toggles = [
    {
      key: 'dueRemindersEnabled',
      icon: 'alarm-outline',
      color: '#0891b2',
      label: 'Due reminders',
      sub: 'Count due and overdue students on the reminder screen',
    },
    {
      key: 'autoFineEnabled',
      icon: 'cash-outline',
      color: '#dc2626',
      label: 'Auto fines',
      sub: `Raise a ₹${policy.finePerDayRupees ?? 5}/day fine automatically on an overdue return`,
    },
    {
      key: 'announceNewArrivals',
      icon: 'megaphone-outline',
      color: THEME,
      label: 'Announce new arrivals',
      sub: 'Broadcast to all students whenever a title is added',
    },
  ];

  const facts = [
    { icon: 'mail-outline', label: 'Email', value: data?.email ?? '—' },
    { icon: 'call-outline', label: 'Phone', value: data?.phone || 'Not set' },
    { icon: 'id-card-outline', label: 'Employee No', value: data?.employeeNo ?? '—' },
    { icon: 'calendar-outline', label: 'Joined', value: data?.joiningDate ? new Date(data.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
    { icon: 'key-outline', label: 'Last sign-in', value: data?.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'This is your first session' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME]} />}
      >
        <LinearGradient colors={[THEME, '#92400e']} style={styles.header}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{data?.initials ?? '??'}</Text>
            </View>
            {data?.status === 'ACTIVE' ? <View style={styles.onlineDot} /> : null}
          </View>
          <Text style={styles.name}>{data?.fullName ?? 'Library Staff'}</Text>
          <Text style={styles.role}>{data?.designation ?? 'Librarian'}</Text>
          <Text style={styles.dept}>{data?.institution?.name ?? 'Library'}</Text>
          <View style={styles.statsRow}>
            {headerStats.map((s, i) => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} delay={100 + i * 100} />
            ))}
          </View>
        </LinearGradient>

        {/* Circulation at a glance */}
        <AnimatedCard delay={200} style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Library at a glance</Text>
          <View style={styles.factGrid}>
            {[
              { label: 'On loan', value: stats.activeLoans ?? 0, color: '#2563eb' },
              { label: 'Overdue', value: stats.overdueLoans ?? 0, color: '#dc2626' },
              { label: 'Pending fines', value: stats.pendingFineCount ?? 0, color: '#d97706' },
              { label: 'Book requests', value: stats.pendingRequests ?? 0, color: '#7c3aed' },
              { label: 'Issued today', value: stats.issuesToday ?? 0, color: '#059669' },
              { label: 'Returned today', value: stats.returnsToday ?? 0, color: '#0891b2' },
            ].map((s) => (
              <View key={s.label} style={styles.factCell}>
                <Text style={[styles.factValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.factLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.circulationRow}
            onPress={() => navigation.switchTab('Circulation')}
            activeOpacity={0.85}
          >
            <View style={styles.circulationTrack}>
              <View style={[styles.circulationFill, { width: `${stats.circulationRatePct ?? 0}%` }]} />
            </View>
            <Text style={styles.circulationText}>
              {stats.copiesOnShelf ?? 0} of {stats.copies ?? 0} copies on the shelf ({stats.circulationRatePct ?? 0}% issued)
            </Text>
          </TouchableOpacity>
        </AnimatedCard>

        {/* Preferences — real writes */}
        <AnimatedCard delay={300} style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Desk preferences</Text>
          {toggles.map((t, idx) => (
            <View key={t.key}>
              <View style={styles.rowItem}>
                <View style={[styles.iconWrap, { backgroundColor: t.color + '1a' }]}>
                  <Ionicons name={t.icon} size={18} color={t.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{t.label}</Text>
                  <Text style={styles.rowSub}>{t.sub}</Text>
                </View>
                <Switch
                  value={!!policy[t.key]}
                  disabled={saving === t.key}
                  onValueChange={(v) => togglePreference(t.key, v)}
                  trackColor={{ false: '#e5e7eb', true: '#fcd34d' }}
                  thumbColor={policy[t.key] ? THEME : '#f4f4f5'}
                />
              </View>
              {idx < toggles.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <TouchableOpacity
            style={styles.policyLink}
            onPress={() => navigation.openModule('LibrarySettings')}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={14} color={THEME} />
            <Text style={styles.policyLinkText}>
              Loan {policy.loanPeriodDays ?? 14} days · {policy.maxActiveLoans ?? 4} books · {policy.maxRenewalsPerLoan ?? 2} renewals · fine ₹{policy.finePerDayRupees ?? 5}/day
            </Text>
            <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
          </TouchableOpacity>
        </AnimatedCard>

        {/* Identity */}
        <AnimatedCard delay={400} style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Account</Text>
          {facts.map((f, idx) => (
            <View key={f.label}>
              <View style={styles.rowItem}>
                <View style={[styles.iconWrap, { backgroundColor: '#f1f5f9' }]}>
                  <Ionicons name={f.icon} size={17} color="#64748b" />
                </View>
                <Text style={styles.factRowLabel}>{f.label}</Text>
                <Text style={styles.factRowValue} numberOfLines={1}>{f.value}</Text>
              </View>
              {idx < facts.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
          <View style={styles.contributionRow}>
            <Ionicons name="ribbon-outline" size={15} color={THEME} />
            <Text style={styles.contributionText}>
              You have issued {data?.contribution?.loansIssued ?? 0} books and sent {data?.contribution?.broadcastsSent ?? 0} broadcasts from this desk.
            </Text>
          </View>
        </AnimatedCard>

        {/* Menu */}
        <AnimatedCard delay={500} style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Manage</Text>
          {MENU_ITEMS.map((item, idx) => (
            <View key={item.key}>
              <TouchableOpacity
                style={styles.rowItem}
                onPress={() => navigation.openModule(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: item.color + '1a' }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </TouchableOpacity>
              {idx < MENU_ITEMS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </AnimatedCard>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={loggingOut} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.logoutText}>{loggingOut ? 'Signing out…' : 'Logout'}</Text>
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
  initials: { fontSize: 28, fontFamily: 'Manrope-ExtraBold', color: '#fff' },
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

  // Facts grid
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8 },
  factCell: { width: '33.33%', alignItems: 'center', paddingVertical: 10 },
  factValue: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold' },
  factLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  circulationRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  circulationTrack: { height: 7, borderRadius: 4, backgroundColor: '#eef2f7', overflow: 'hidden' },
  circulationFill: { height: '100%', borderRadius: 4, backgroundColor: '#2563eb' },
  circulationText: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 8 },

  // Policy link
  policyLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4, marginBottom: 10, paddingVertical: 10, paddingHorizontal: 11, borderRadius: 11, backgroundColor: THEME + '12', borderWidth: 1, borderColor: THEME + '33' },
  policyLinkText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-SemiBold', color: THEME },

  // Identity rows
  factRowLabel: { flex: 1, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted },
  factRowValue: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: theme.colors.text, maxWidth: '55%', textAlign: 'right' },
  contributionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  contributionText: { flex: 1, fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, lineHeight: 16, marginLeft: 8 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 14, marginHorizontal: theme.spacing.lg, marginTop: 24 },
  logoutText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#dc2626', marginLeft: 8 },
  version: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', marginTop: 16 },
});
