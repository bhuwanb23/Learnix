/**
 * X-10 — Change password.
 * Docs: 05-exam-cell.md §3.8
 *
 * THE REFRESH TOKEN IS SENT, and that is the whole point of this screen existing rather than a
 * "forgot password" link. Changing a password revokes every OTHER session and keeps THIS one — so
 * somebody who suspects a compromise can lock the intruder out without locking themselves out on
 * the device they are using. The token travels in the request body, and the server uses it only to
 * identify the row to KEEP; it is never stored by the response.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { AnimatedCard } from '../../../../../components/ui';
import { authApi } from '../../../../../services/api';

export default function ExamChangePassword({ navigation }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!current || !next || !confirm) {
      setError('Fill in all three fields.');
      return;
    }
    if (next.length < 8) {
      setError('The new password must be at least eight characters.');
      return;
    }
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await authApi.changePassword(current, next);
      Alert.alert(
        'Password changed',
        res?.revokedSessions
          ? `${res.revokedSessions} other session(s) were signed out.`
          : 'Your password was changed.',
        [{ text: 'Done', onPress: () => navigation?.goBack?.() }],
      );
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(e.message || 'Could not change your password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pad}>
      <TouchableOpacity style={styles.back} onPress={() => navigation?.goBack?.()}>
        <Ionicons name="chevron-back" size={18} color={theme.colors.primary} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.h1}>Change password</Text>
      <Text style={styles.sub}>
        Changing your password signs out every other device. This one stays signed in.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AnimatedCard style={styles.card}>
        <Text style={styles.label}>Current password</Text>
        <TextInput
          style={styles.input}
          value={current}
          onChangeText={setCurrent}
          placeholder="Your current password"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          value={next}
          onChangeText={setNext}
          placeholder="At least eight characters"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Type it again"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </AnimatedCard>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveOff]} onPress={submit} disabled={saving}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
        <Text style={styles.saveText}>{saving ? 'Changing…' : 'Change password'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl, gap: theme.spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  error: { color: theme.colors.error, fontSize: 13 },
  card: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: theme.spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
  },
  saveOff: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
