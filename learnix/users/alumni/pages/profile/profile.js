import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../../../constants/theme';
import { alumniApi } from '../../../../services/api';
import { AnimatedCard, SkeletonCard } from '../../../../components/ui';

/**
 * The four preference switches that used to live here are gone — see the
 * `Notification` section below for why. Kept as a comment rather than deleted
 * silently, because `docs/users/12-alumni-relations.md §3.8` still advertised them
 * as a shipped feature and the next person to read the docs will look for them.
 *
 *   { id: 'T1', label: 'Event invites & RSVP alerts',    default: true  }
 *   { id: 'T2', label: 'Donation appeal notifications',  default: true  }
 *   { id: 'T3', label: 'Chapter news & meetups',          default: false }
 *   { id: 'T4', label: 'Mentorship session reminders',   default: true  }
 *
 * The real vocabulary lives on the server:
 * `backend/src/modules/alumni/notifications/notifications.rules.ts`.
 */

const menuItems = [
  { id: 'M1', label: 'Newsletter Archive', icon: 'mail-outline' },
  { id: 'M2', label: 'Alumni Badge & Certificates', icon: 'ribbon-outline' },
  { id: 'M3', label: 'Help & Support', icon: 'help-circle-outline' },
  { id: 'M4', label: 'About Learnix', icon: 'information-circle-outline' },
];

export default function AlumniProfile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError(null);
      const p = await alumniApi.profile();
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

  const onLogout = () => {
    Alert.alert('Logout', 'Clear the session and re-login as the demo user?', [
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
        <View style={{ backgroundColor: '#2563eb', height: 200, margin: 16, borderRadius: 20 }} />
        <SkeletonCard style={{ marginHorizontal: 16 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 10 }} />
        <SkeletonCard style={{ marginHorizontal: 16, marginTop: 10 }} />
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
  const ps = profile.programStats ?? {};
  const statCards = [
    { value: String(ps.activeMentorships ?? 0), label: 'Mentor Pairs' },
    { value: String(ps.sessionsLogged ?? 0), label: 'Sessions' },
    { value: String(ps.activeCampaigns ?? 0), label: 'Campaigns' },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile.fullName}</Text>
        <Text style={styles.role}>
          {(profile.roles ?? []).includes('ADMIN') ? 'Director' : 'Staff'}, Alumni Relations
        </Text>
        <View style={styles.badgeRow}>
          {(profile.roles ?? []).map((r) => (
            <View key={r} style={styles.badge}>
              <Ionicons name="shield-checkmark-outline" size={11} color="#fff" />
              <Text style={styles.badgeText}>{r}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        {statCards.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuRow}>
            <Ionicons name="mail-outline" size={17} color={theme.colors.textMuted} />
            <Text style={styles.menuLabel}>Email</Text>
            <Text style={styles.menuValue} numberOfLines={1}>{profile.email}</Text>
          </View>
        </View>
      </View>

      <AnimatedCard delay={200}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        {/* The four switches that used to be here were seeded from a local
            `useState({ T1: true, T2: true, T3: false, T4: true })` and never left the
            device — no row was written, and no emitter consulted anything, because no
            emitter could. They are replaced by a link to the real preference screen,
            which reads and writes `notification_preferences` and is enforced at
            delivery time.

            A link beats four switches that look authoritative and do nothing: the
            second option teaches people that settings here are not real. */}
        <TouchableOpacity
          style={styles.prefLink}
          onPress={() => navigation?.navigate?.('Notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notification preferences"
          accessibilityHint="Choose which notifications you receive"
        >
          <View style={[styles.prefIcon, { backgroundColor: '#2563eb1a' }]}>
            <Ionicons name="notifications-outline" size={15} color="#2563eb" />
          </View>
          <View style={styles.prefLinkBody}>
            <Text style={styles.prefLabel}>What you hear about</Text>
            <Text style={styles.prefHint}>
              Event reminders, registrations, mentorship, chapter news, giving and office
              broadcasts.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>
      </AnimatedCard>

      <AnimatedCard delay={300}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          {menuItems.map((m, idx) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.menuRow, idx < menuItems.length - 1 && styles.menuRowBorder]}
              onPress={() => Alert.alert(m.label, 'Coming in a later phase.')}
              activeOpacity={0.7}
            >
              <Ionicons name={m.icon} size={17} color={theme.colors.textMuted} />
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </AnimatedCard>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
        <Ionicons name="log-out-outline" size={16} color="#dc2626" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  errorText: { marginTop: 12, fontSize: 13, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: { marginTop: 16, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontFamily: 'Manrope-Bold', fontSize: 13 },
  hero: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 22,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  name: {
    fontSize: 19,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  role: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
    color: '#fff',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 15,
    fontFamily: 'Manrope-ExtraBold',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.textMuted,
    marginTop: 3,
  },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  prefCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  prefLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  prefLinkBody: {
    flex: 1,
    gap: 2,
  },
  prefHint: {
    fontSize: 11.5,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  prefRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prefLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.text,
  },
  switch: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#cbd5e1',
    padding: 3,
  },
  switchOn: {
    backgroundColor: '#2563eb',
  },
  switchKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  switchKnobOn: {
    alignSelf: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: theme.colors.text,
    marginLeft: 12,
  },
  menuValue: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: theme.colors.textMuted,
    maxWidth: '55%',
    textAlign: 'right',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 13,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: '#dc2626',
    marginLeft: 6,
  },
});
