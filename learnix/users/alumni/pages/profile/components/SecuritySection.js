/**
 * Account security.
 *
 * This screen exists because of a real gap, not because a menu item was missing.
 *
 * `changePassword` used to rewrite the password hash and nothing else. The
 * forgot-password flow beside it in the same file — `resetPassword` — revokes every
 * session and carries the comment "password change invalidates existing logins". So the
 * intent was already documented in the codebase and the logged-in path just did not
 * implement it: change your password because you think a device is compromised, and
 * that device stays signed in until its refresh token lapses on its own.
 *
 * Now both paths revoke. The difference is which session survives: the one you are
 * currently using, so changing a password does not also sign you out of the device you
 * did it on.
 *
 * WHY THERE ARE NO DEVICE NAMES
 * -----------------------------
 * `RefreshToken` stores no user agent or IP, so a session can only be identified by
 * when it started. The server returns that limitation in its response and this screen
 * says it plainly rather than presenting a start time as if it identified a phone. A
 * `userAgent` column on the shared token table is the real fix, and it touches every
 * login path — which is not a change to smuggle in beside a bug fix.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { relativeTime } from '../profileMeta';

const RULES = [
  'At least 8 characters',
  'Something you do not use elsewhere',
];

export default function SecuritySection({ authApi }) {
  const [sessions, setSessions] = useState(null);
  const [note, setNote] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revoking, setRevoking] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await authApi.sessions();
      setSessions(res?.data?.sessions ?? res?.sessions ?? []);
      setNote(res?.data?.note ?? res?.note ?? '');
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [authApi]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const changePassword = async () => {
    if (next.length < 8) {
      Alert.alert('Too short', 'Use at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Those do not match', 'The two new passwords differ.');
      return;
    }
    if (next === current) {
      Alert.alert('Same password', 'Choose something different.');
      return;
    }
    setSaving(true);
    try {
      const res = await authApi.changePassword(current, next);
      const revoked = res?.data?.revokedSessions ?? res?.revokedSessions ?? 0;
      setCurrent('');
      setNext('');
      setConfirm('');
      Alert.alert(
        'Password changed',
        revoked > 0
          ? `${revoked} other ${revoked === 1 ? 'session was' : 'sessions were'} signed out. This device stays signed in.`
          : 'This device stays signed in.',
      );
      loadSessions();
    } catch (e) {
      Alert.alert('Could not change your password', e.message);
    } finally {
      setSaving(false);
    }
  };

  const revokeAll = () => {
    Alert.alert(
      'Sign out everywhere else?',
      'Every other device is signed out. This one stays signed in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            setRevoking(true);
            try {
              const res = await authApi.revokeAllSessions();
              const revoked = res?.data?.revoked ?? res?.revoked ?? 0;
              Alert.alert('Done', revoked > 0 ? `${revoked} signed out.` : 'Nothing else was signed in.');
              loadSessions();
            } catch (e) {
              Alert.alert('Could not sign out', e.message);
            } finally {
              setRevoking(false);
            }
          },
        },
      ],
    );
  };

  const others = (sessions ?? []).filter((s) => !s.isCurrent);
  const canSubmit = current.length > 0 && next.length > 0 && confirm.length > 0 && !saving;

  return (
    <>
      <SectionCard title="Password" icon="lock-closed-outline">
        <Text style={styles.hint}>{RULES.join(' · ')}</Text>
        <TextInput
          value={current}
          onChangeText={setCurrent}
          placeholder="Current password"
          placeholderTextColor={theme.colors.textLight}
          secureTextEntry
          accessibilityLabel="Current password"
          style={styles.input}
        />
        <TextInput
          value={next}
          onChangeText={setNext}
          placeholder="New password"
          placeholderTextColor={theme.colors.textLight}
          secureTextEntry
          accessibilityLabel="New password"
          style={styles.input}
        />
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repeat the new password"
          placeholderTextColor={theme.colors.textLight}
          secureTextEntry
          accessibilityLabel="Repeat the new password"
          style={styles.input}
        />
        <TouchableOpacity
          onPress={changePassword}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="Change your password"
          style={[styles.primaryBtn, !canSubmit && styles.busy]}
        >
          <Text style={styles.primaryText}>{saving ? 'Changing…' : 'Change password'}</Text>
        </TouchableOpacity>
        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textTertiary} />
          <Text style={styles.noteText}>
            Changing your password signs out every other device. This one keeps working.
          </Text>
        </View>
      </SectionCard>

      <SectionCard
        title="Signed-in devices"
        icon="devices-outline"
        iconColor="#be123c"
        count={sessions?.length ?? undefined}
        footer={note || 'Sessions are identified by start time — no device information is stored.'}
      >
        {loadingSessions ? (
          <Text style={styles.hint}>Loading…</Text>
        ) : sessions === null || sessions.length === 0 ? (
          <Text style={styles.hint}>Could not load your sessions.</Text>
        ) : (
          sessions.map((s) => (
            <View key={s.id} style={styles.session}>
              <Ionicons
                name={s.isCurrent ? 'phone-portrait-outline' : 'desktop-outline'}
                size={16}
                color={s.isCurrent ? theme.colors.success : theme.colors.textTertiary}
              />
              <View style={styles.sessionBody}>
                <Text style={styles.sessionTitle}>
                  {s.isCurrent ? 'This device' : 'Another device'}
                </Text>
                <Text style={styles.sessionMeta}>
                  Signed in {relativeTime(s.createdAt)} · expires {relativeTime(s.expiresAt)}
                </Text>
              </View>
            </View>
          ))
        )}

        {others.length > 0 ? (
          <TouchableOpacity
            onPress={revokeAll}
            disabled={revoking}
            accessibilityRole="button"
            accessibilityLabel="Sign out of every other device"
            style={[styles.dangerBtn, revoking && styles.busy]}
          >
            <Ionicons name="log-out-outline" size={15} color="#fff" />
            <Text style={styles.dangerText}>
              {revoking ? 'Signing out…' : `Sign out of ${others.length} other ${others.length === 1 ? 'device' : 'devices'}`}
            </Text>
          </TouchableOpacity>
        ) : null}
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13.5,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
    marginTop: 7,
  },
  primaryBtn: {
    marginTop: theme.spacing.md,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  note: {
    flexDirection: 'row',
    gap: 7,
    marginTop: theme.spacing.sm,
    padding: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  session: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  sessionBody: {
    flex: 1,
    gap: 1,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sessionMeta: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.error,
  },
  dangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  hint: {
    fontSize: 11.5,
    lineHeight: 16,
    color: theme.colors.textTertiary,
  },
  busy: {
    opacity: 0.5,
  },
});