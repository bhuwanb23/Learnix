/**
 * Change the sign-in password.
 *
 * The current password is REQUIRED, and the server checks it. A password change that did not ask
 * for the old one would let anyone who found a logged-in device take the account over permanently —
 * which is exactly the scenario this screen is usually opened FROM.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';
import { AnimatedCard } from '../../../../components/ui';
import { authApi } from '../../../../services/api';

export default function ChangePassword({ navigation }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (!current || !next) {
      setError('Fill in your current password and the new one.');
      return;
    }
    if (next !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    if (next.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword(current, next);
      Alert.alert('Password changed', 'Use your new password next time you sign in.', [
        { text: 'Done', onPress: () => navigation?.goBack?.() },
      ]);
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
        You will stay signed in on this device, and every other device is signed out.
      </Text>

      <AnimatedCard style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Current password</Text>
        <TextInput
          style={styles.input}
          placeholder="The password you sign in with now"
          placeholderTextColor={theme.colors.textMuted}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>New password</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters"
          placeholderTextColor={theme.colors.textMuted}
          value={next}
          onChangeText={setNext}
          secureTextEntry
          autoCapitalize="none"
        />

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput
          style={styles.input}
          placeholder="Type it again"
          placeholderTextColor={theme.colors.textMuted}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.btn, saving && styles.btnOff]}
          onPress={submit}
          disabled={saving}
        >
          <Ionicons name="lock-closed-outline" size={16} color={theme.colors.white} />
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Change password'}</Text>
        </TouchableOpacity>
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pad: { padding: theme.spacing.md, gap: theme.spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, color: theme.colors.primary, fontWeight: '600' },
  h1: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 13, color: theme.colors.textMuted, lineHeight: 18 },
  card: { gap: 6 },
  error: { color: theme.colors.error, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: theme.spacing.sm, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.radius.md, marginTop: theme.spacing.md,
  },
  btnOff: { opacity: 0.5 },
  btnText: { color: theme.colors.white, fontWeight: '700', fontSize: 14 },
});
