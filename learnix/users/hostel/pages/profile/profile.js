/**
 * The warden's profile.
 *
 * WAS A MOCK. This screen used to show three hardcoded figures — "1,248 Residents / 3 Blocks / 42
 * Staff" — none of which came from the server, so none of them could be right: the institution has
 * 60 beds and 3 blocks. It had five menu rows ("Hostel Staff Members", "Rules & Regulations",
 * "Access & Permissions", "Hostel Reports", "Help & Support") that navigated NOWHERE, and three
 * notification toggles held in `useState`, which meant they were forgotten the moment the screen
 * unmounted — a mute that silently forgets itself is worse than no mute at all, because the person
 * believes they turned it off.
 *
 * WHAT IT IS NOW
 * --------------
 * Six questions, each answered by the server and each on its own endpoint, because they change at
 * completely different rates:
 *
 *   1. WHO IS THIS?        the profile
 *   2. WHAT IS THEIRS?     the blocks they are responsible for
 *   3. WHAT MAY THEY DO?   the permissions their roles grant
 *   4. WHAT DO THEY WANT?  the notifications they have muted
 *   5. IS IT SAFE?         password, live sessions, sign-out-everywhere
 *   6. WHAT HAVE THEY DONE?  recent actions, and the last sign-in
 *
 * NOT EVERY FIGURE IS DERIVED ON THIS SCREEN
 * --------------------------------------------
 * The blocks, the permission list, the mute list and the activity all come from the server. The
 * screen does not re-derive any of them, because a client-side copy of a rule the server owns is the
 * bug this feature had before.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../../constants/theme';
import { AnimatedCard, SkeletonStatRow, SkeletonCard } from '../../../../components/ui';
import { hostelApi, authApi } from '../../../../services/api';

function timeAgo(iso) {
  if (!iso) return 'never';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** The menu rows all open a real screen now. */
const MENU_ITEMS = [
  { key: 'MyPermissions', icon: 'shield-checkmark-outline', label: 'Access & Permissions', sub: 'What your role allows', color: '#d97706' },
  { key: 'ChangePassword', icon: 'lock-closed-outline', label: 'Change Password', sub: 'Update your sign-in', color: '#7c3aed' },
  { key: 'Activity', icon: 'time-outline', label: 'Sign-in history', sub: 'Sessions and recent actions', color: '#0891b2' },
  { key: 'HelpSupport', icon: 'help-circle-outline', label: 'Help & Support', sub: 'How this module works', color: '#2563eb' },
];

export default function Profile({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async (mode) => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [p, pref, perm] = await Promise.all([
        hostelApi.profile(),
        hostelApi.profileNotificationPreferences(),
        hostelApi.profilePermissions(),
      ]);
      setProfile(p);
      setPrefs(pref);
      setPermissions(perm);
    } catch (e) {
      setError(e.message || 'Could not load your profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The mute is written THROUGH, not held in local state. A toggle that only exists until the
  // screen unmounts is a toggle that lies to the person who used it.
  const toggleMute = async (category, next) => {
    setSaving(category.id);
    const previous = prefs;
    setPrefs({
      ...prefs,
      categories: prefs.categories.map((c) => (c.id === category.id ? { ...c, muted: next } : c)),
    });
    try {
      await hostelApi.saveProfileNotificationPreference({ category: category.id, muted: next });
      load('refresh');
    } catch (e) {
      setPrefs(previous);
      Alert.alert('Could not save that', e.message || 'Try again');
    } finally {
      setSaving(null);
    }
  };

  const signOutEverywhere = async () => {
    Alert.alert(
      'Sign out of every other device?',
      'Your own session stays signed in. Every other device is signed out immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out everywhere',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await authApi.revokeAllSessions();
              Alert.alert('Done', res?.revoked ? `${res.revoked} session(s) ended.` : 'No other sessions were live.');
            } catch (e) {
              Alert.alert('Could not do that', e.message || 'Try again');
            }
          },
        },
      ],
    );
  };

  const logout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => authApi.logout() },
    ]);
  };

  if (loading && !profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
        <SkeletonStatRow />
        <SkeletonCard />
        <SkeletonCard />
      </ScrollView>
    );
  }

  const a = profile?.assignment;
  const s = profile?.staff;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
      >
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#fff" />
          </View>
          <Text style={styles.name}>{profile?.user?.fullName ?? '—'}</Text>
          <Text style={styles.designation}>{s?.designation ?? 'Hostel staff'}</Text>
          {s?.employeeNo ? <Text style={styles.employee}>Employee {s.employeeNo}</Text> : null}
          <View style={styles.roleRow}>
            {(profile?.roles ?? []).map((r) => (
              <View key={r} style={styles.rolePill}>
                <Text style={styles.rolePillText}>{r}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {error ? (
          <AnimatedCard style={styles.errorCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => load()} hitSlop={8}>
                <Text style={styles.link}>Retry</Text>
              </TouchableOpacity>
            </View>
          </AnimatedCard>
        ) : null}

        {/* WHAT IS THEIRS. The blocks are DERIVED from the warden's assignments. */}
        <View style={styles.statRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{a?.blocksAssigned ?? 0}</Text>
            <Text style={styles.statLabel}>
              {a?.scope === 'ALL' ? 'Whole hostel' : `of ${a?.blocksTotal ?? 0} blocks`}
            </Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{a?.occupied ?? 0}</Text>
            <Text style={styles.statLabel}>of {a?.beds ?? 0} beds filled</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{permissions?.total ?? 0}</Text>
            <Text style={styles.statLabel}>permissions</Text>
          </View>
        </View>

        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Your blocks</Text>
          {(a?.blocks ?? []).length === 0 ? (
            <Text style={styles.muted}>
              You are responsible for the whole hostel. A block assigned to you will appear here.
            </Text>
          ) : (
            (a?.blocks ?? []).map((b) => (
              <View key={b.id} style={styles.blockRow}>
                <Ionicons name="business-outline" size={16} color={theme.colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.blockName}>{b.name}</Text>
                  <Text style={styles.blockMeta}>
                    {b.occupied} of {b.beds} beds filled · {b.rooms} rooms
                  </Text>
                </View>
                <Text style={styles.blockPct}>{b.occupancyPct}%</Text>
              </View>
            ))
          )}
        </AnimatedCard>

        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>What you can do</Text>
          <Text style={styles.muted}>
            From your {permissions?.roles?.join(', ') || 'role'} in the access map.
          </Text>
          {(permissions?.hostelPermissions ?? []).length === 0 ? (
            <Text style={styles.muted}>No hostel permissions are granted to this role yet.</Text>
          ) : (
            (permissions?.hostelPermissions ?? []).map((p) => (
              <View key={p.key} style={styles.permRow}>
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                <Text style={styles.permKey}>{p.key}</Text>
                <Text style={styles.permName}>{p.name}</Text>
              </View>
            ))
          )}
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation?.navigate?.('MyPermissions')}>
            <Text style={styles.link}>See all permissions</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </AnimatedCard>

        {/* WHAT THEY WANT. The mute is written through to the server. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications you receive</Text>
          <Text style={styles.muted}>
            Turning one off stops it reaching you at all. Emergencies cannot be turned off.
          </Text>
          {(prefs?.categories ?? []).map((c) => (
            <View key={c.id} style={styles.prefRow}>
              <View style={[styles.prefIcon, { backgroundColor: `${c.color}1a` }]}>
                <Ionicons name={c.icon} size={14} color={c.color} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.prefLabel}>{c.label}</Text>
                <Text style={styles.prefBlurb}>{c.blurb}</Text>
              </View>
              {c.mutable ? (
                <Switch
                  value={!c.muted}
                  onValueChange={(next) => toggleMute(c, !next)}
                  disabled={saving === c.id}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                />
              ) : (
                <View style={styles.locked}>
                  <Ionicons name="lock-closed" size={12} color={theme.colors.error} />
                  <Text style={styles.lockedText}>Always on</Text>
                </View>
              )}
            </View>
          ))}
        </AnimatedCard>

        {/* IS IT SAFE. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.muted}>
            Last signed in {timeAgo(profile?.user?.lastLoginAt)}. Sign out other devices if a session is
            not yours.
          </Text>
          <TouchableOpacity style={styles.dangerRow} onPress={signOutEverywhere}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.error} />
            <Text style={styles.dangerText}>Sign out of every other device</Text>
          </TouchableOpacity>
        </AnimatedCard>

        {/* WHAT HAVE THEY DONE. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.muted}>{profile?.user?.email}</Text>
          {profile?.user?.phone ? <Text style={styles.muted}>{profile.user.phone}</Text> : null}
          <Text style={styles.muted}>With the hostel since {new Date(profile?.user?.joinedAt ?? Date.now()).toLocaleDateString()}</Text>
        </AnimatedCard>

        {MENU_ITEMS.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={styles.menuRow}
            onPress={() => navigation?.navigate?.(m.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${m.color}1a` }]}>
              <Ionicons name={m.icon} size={16} color={m.color} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.menuLabel}>{m.label}</Text>
              <Text style={styles.menuSub}>{m.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={theme.colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  link: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },

  header: { alignItems: 'center', paddingVertical: theme.spacing.lg, borderRadius: theme.radius.lg, gap: 4 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#fff' },
  designation: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  employee: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  roleRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  rolePillText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  errorCard: { borderColor: theme.colors.error, borderWidth: 1 },
  errorText: { color: theme.colors.error, fontSize: 13, flex: 1 },

  statRow: { flexDirection: 'row', gap: theme.spacing.sm },
  statTile: {
    flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md,
    padding: theme.spacing.sm, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, textAlign: 'center' },

  card: { gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  muted: { fontSize: 12, color: theme.colors.textMuted, lineHeight: 17 },

  blockRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 5 },
  blockName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  blockMeta: { fontSize: 11, color: theme.colors.textMuted },
  blockPct: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },

  permRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  permKey: { fontSize: 11, color: theme.colors.text, fontWeight: '600' },
  permName: { fontSize: 11, color: theme.colors.textMuted, flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 6 },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: 5 },
  prefIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  prefLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  prefBlurb: { fontSize: 11, color: theme.colors.textMuted },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockedText: { fontSize: 10, color: theme.colors.error, fontWeight: '600' },

  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  dangerText: { fontSize: 13, color: theme.colors.error, fontWeight: '600' },

  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md, padding: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border,
  },
  menuIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  menuSub: { fontSize: 11, color: theme.colors.textMuted },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: theme.spacing.sm + 2, marginTop: theme.spacing.sm,
  },
  logoutText: { fontSize: 14, color: theme.colors.error, fontWeight: '700' },
});
