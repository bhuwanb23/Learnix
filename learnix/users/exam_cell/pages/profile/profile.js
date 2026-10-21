/**
 * X-10 — The exam officer's profile.
 * Docs: 05-exam-cell.md §3.8
 *
 * WAS A MOCK, AND A MENU OF DEAD ENDS. This screen fetched `GET /examcell/profile` and got a name, a
 * designation and three counts. The header then printed a HARDCODED "Exam Cell • Examinations
 * Department" line, and the stats row showed "Hall Tickets" and "Cases" — which were the
 * INSTITUTION's totals, presented as if they were the officer's own work. Two notification toggles
 * were `useState` and died on unmount, so a mute that silently forgot itself was worse than no mute
 * at all: the person believed they had turned it off.
 *
 * And the four menu rows did nothing:
 *
 *   Edit Profile     → an alert saying "Update your name, title, and contact details."
 *   Exam Reports     → an alert saying "Season-wise exam analytics: pass rates, grade distribution."
 *   Help & Support   → an alert saying "Contact the ERP support team."
 *   Logout           → an alert saying "Returning to login", and then nothing. The token stayed.
 *
 * WHAT IT IS NOW
 * --------------
 * Seven questions, each answered by the server and each on its own endpoint, because they change at
 * completely different rates:
 *
 *   1. WHO IS THIS?         the profile — name, designation, employee number, contact
 *   2. WHERE DO THEY WORK?   the institution and the department they belong to
 *   3. WHAT IS THEIRS?      the exams they created, the duties they hold, the evaluations they own
 *   4. WHAT MAY THEY DO?    the permissions their roles actually grant
 *   5. WHAT DO THEY WANT?   which notifications they have muted
 *   6. IS THE ACCOUNT SAFE? password, live sessions, sign-out-everywhere
 *   7. WHAT HAVE THEY DONE? recent actions, and when they last signed in
 *
 * EVERY FIGURE IS DERIVED ON THE SERVER
 * ---------------------------------------
 * The screen re-derives nothing. A client-side copy of a rule the server owns is the bug this
 * feature had before: a count that cannot go stale, because it was never written down.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
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
import { examcellApi, authApi } from '../../../../services/api';
import { styles } from './profileUi';

function timeAgo(iso) {
  if (!iso) return 'never';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * The menu rows all open a real screen now.
 *
 * Each key is registered in `exam_cell.js`'s `FEATURE_MODULES`. A key that is not registered fails
 * SILENTLY — `renderContent` finds nothing and drops the controller back on the hub with no error
 * anywhere — so `audit-examcell-profile-ui.ts` asserts every one of them is present.
 */
const MENU_ITEMS = [
  {
    key: 'ExamPermissions',
    icon: 'shield-checkmark-outline',
    label: 'Access & Permissions',
    sub: 'What your role allows',
    color: '#d97706',
  },
  {
    key: 'ExamActivity',
    icon: 'time-outline',
    label: 'Sign-in history',
    sub: 'Sessions and recent actions',
    color: '#0891b2',
  },
  {
    key: 'ExamChangePassword',
    icon: 'lock-closed-outline',
    label: 'Change Password',
    sub: 'Update your sign-in',
    color: '#7c3aed',
  },
  {
    key: 'ExamHelpSupport',
    icon: 'help-circle-outline',
    label: 'Help & Support',
    sub: 'How this module works',
    color: '#2563eb',
  },
];

export default function ExamProfile({ navigation }) {
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
        examcellApi.profile(),
        examcellApi.profileNotificationPreferences(),
        examcellApi.profilePermissions(),
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
      await examcellApi.saveProfileNotificationPreference({ category: category.id, muted: next });
      load('refresh');
    } catch (e) {
      setPrefs(previous);
      Alert.alert('Could not save that', e.message || 'Try again');
    } finally {
      setSaving(null);
    }
  };

  const signOutEverywhere = () => {
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
              Alert.alert(
                'Done',
                res?.revoked ? `${res.revoked} session(s) ended.` : 'No other sessions were live.',
              );
            } catch (e) {
              Alert.alert('Could not do that', e.message || 'Try again');
            }
          },
        },
      ],
    );
  };

  /**
   * Logout — and it ACTUALLY LOGS OUT.
   *
   * The old screen showed an alert that said "Returning to login" and then did nothing at all: the
   * refresh token stayed in storage and the officer stayed signed in. A logout that does not log
   * out is worse than no logout, because the officer believes they signed out.
   */
  const logout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout();
          } catch (e) {
            // The local session is cleared regardless: a failed server call must not leave the
            // person stranded in a signed-in app.
            Alert.alert('Signed out locally', e.message || 'The server could not be reached.');
          }
        },
      },
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

  const s = profile?.staff;
  const r = profile?.responsibilities;
  const dept = profile?.department;
  const inst = profile?.institution;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} />}
      >
        <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="school" size={38} color="#fff" />
          </View>
          <Text style={styles.name}>{profile?.user?.fullName ?? '—'}</Text>
          <Text style={styles.designation}>{s?.designation ?? 'Controller of Examinations'}</Text>
          {s?.employeeNo ? <Text style={styles.employee}>Employee {s.employeeNo}</Text> : null}
          {/* The department is the SERVER's answer. An officer with no department row gets no
              department line at all — a hardcoded "Examinations Department" would be a guess
              dressed as a fact, and it is wrong the moment somebody joins the office from
              another department. */}
          <Text style={styles.where}>
            {[inst?.name, dept?.name].filter(Boolean).join(' • ')}
          </Text>
          <View style={styles.roleRow}>
            {(profile?.roles ?? []).map((role) => (
              <View key={role} style={styles.rolePill}>
                <Text style={styles.rolePillText}>{role}</Text>
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

        {/* WHAT IS THEIRS. Derived from the rows the officer actually owns. */}
        <View style={styles.statRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{r?.examsCreated ?? 0}</Text>
            <Text style={styles.statLabel}>of {r?.examsTotal ?? 0} exams created</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{r?.invigilatorDuties ?? 0}</Text>
            <Text style={styles.statLabel}>duties held</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{r?.evaluationsOwned ?? 0}</Text>
            <Text style={styles.statLabel}>evaluations</Text>
          </View>
        </View>

        {/* WHAT THEY CREATED. Named, not just counted. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Exams you created</Text>
          {(r?.authored ?? []).length === 0 ? (
            <Text style={styles.muted}>
              You have not created an exam yet. One you create will appear here.
            </Text>
          ) : (
            (r?.authored ?? []).map((e) => (
              <View key={e.id} style={styles.examRow}>
                <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
                <View style={styles.flex}>
                  <Text style={styles.examName}>{e.name}</Text>
                  <Text style={styles.examMeta}>
                    Semester {e.semester} · {e.type}
                  </Text>
                </View>
                <Text style={styles.examStatus}>{e.status}</Text>
              </View>
            ))
          )}
        </AnimatedCard>

        {/* WHAT MAY THEY DO. Read from the RBAC map. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>What you can do</Text>
          <Text style={styles.muted}>
            From your {permissions?.roles?.join(', ') || 'role'} in the access map.
          </Text>
          {(permissions?.examCellPermissions ?? []).length === 0 ? (
            <Text style={styles.muted}>No examination permissions are granted to this role yet.</Text>
          ) : (
            (permissions?.examCellPermissions ?? []).map((p) => (
              <View key={p.key} style={styles.permRow}>
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                <Text style={styles.permKey}>{p.key}</Text>
                <Text style={styles.permName}>{p.name}</Text>
              </View>
            ))
          )}
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation?.navigate?.('ExamPermissions')}
          >
            <Text style={styles.link}>See all permissions</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
          </TouchableOpacity>
        </AnimatedCard>

        {/* WHAT THEY WANT. The mute is written through to the server. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications you receive</Text>
          <Text style={styles.muted}>
            Turning one off stops it reaching you at all. Important notices cannot be turned off.
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
            Last signed in {timeAgo(profile?.user?.lastLoginAt)}. Sign out other devices if a session
            is not yours.
          </Text>
          <TouchableOpacity style={styles.dangerRow} onPress={signOutEverywhere}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.error} />
            <Text style={styles.dangerText}>Sign out of every other device</Text>
          </TouchableOpacity>
        </AnimatedCard>

        {/* THE ACCOUNT ITSELF. */}
        <AnimatedCard style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.muted}>{profile?.user?.email}</Text>
          {profile?.user?.phone ? <Text style={styles.muted}>{profile.user.phone}</Text> : null}
          <Text style={styles.muted}>
            With the examination office since{' '}
            {new Date(profile?.user?.joinedAt ?? Date.now()).toLocaleDateString()}
          </Text>
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
