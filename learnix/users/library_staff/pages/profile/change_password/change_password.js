import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../../../../services/api';
import { AnimatedCard } from '../../../../../components/ui';

const THEME = '#7c3aed';

const MIN_LENGTH = 8;

const strength = (pw) => {
  let score = 0;
  if (pw.length >= MIN_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 5);
};

const STRENGTH = [
  { label: 'Too short', color: '#dc2626' },
  { label: 'Weak', color: '#dc2626' },
  { label: 'Weak', color: '#d97706' },
  { label: 'Fair', color: '#d97706' },
  { label: 'Good', color: '#059669' },
  { label: 'Strong', color: '#059669' },
];

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key, value) => {
    if (key === 'current') setCurrent(value);
    if (key === 'next') setNext(value);
    if (key === 'confirm') setConfirm(value);
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!current) e.current = 'Enter your current password';
    if (next.length < MIN_LENGTH) e.next = `Use at least ${MIN_LENGTH} characters`;
    if (next && next === current) e.next = 'The new password must differ from the current one';
    if (confirm !== next) e.confirm = 'The two entries do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      Alert.alert(
        'Password updated',
        'Use your new password the next time you sign in.',
        [{ text: 'Done', onPress: () => { setCurrent(''); setNext(''); setConfirm(''); } }],
      );
    } catch (err) {
      // A wrong current password is the common case — say so on the field.
      if (err.status === 401 || /incorrect/i.test(err.message)) {
        setErrors({ current: 'That is not your current password' });
      } else {
        setErrors({ form: err.message });
      }
    } finally {
      setBusy(false);
    }
  };

  const s = strength(next);
  const meter = STRENGTH[s];

  const field = (key, label, value, onChange, extra) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, errors[key] && styles.inputRowError]}>
        <Ionicons name="lock-closed-outline" size={15} color="#94a3b8" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={label}
          placeholderTextColor="#cbd5e1"
        />
        <TouchableOpacity onPress={() => setShow((v) => !v)} activeOpacity={0.7}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color="#94a3b8" />
        </TouchableOpacity>
      </View>
      {extra}
      {errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AnimatedCard delay={0} style={styles.block}>
        <Text style={styles.cardTitle}>Change your password</Text>
        <Text style={styles.cardSub}>
          This updates the sign-in for your Learnix account across every module you have access to.
        </Text>
      </AnimatedCard>

      <AnimatedCard delay={60} style={styles.block}>
        {field('current', 'Current password', current, (v) => set('current', v))}

        <View style={styles.fieldWrap}>
          {field('next', 'New password', next, (v) => set('next', v))}
          {next.length > 0 ? (
            <>
              <View style={styles.meterRow}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[styles.meterBar, { backgroundColor: i < s ? meter.color : '#eef2f7' }]}
                  />
                ))}
              </View>
              <Text style={[styles.meterText, { color: meter.color }]}>{meter.label}</Text>
            </>
          ) : null}
        </View>

        {field('confirm', 'Confirm new password', confirm, (v) => set('confirm', v))}

        {errors.form ? (
          <View style={styles.formError}>
            <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
            <Text style={styles.formErrorText}>{errors.form}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.submitBtn, busy && styles.submitBusy]}
          onPress={submit}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Ionicons name="key-outline" size={16} color="#fff" />
          <Text style={styles.submitText}>{busy ? 'Updating…' : 'Update password'}</Text>
        </TouchableOpacity>
      </AnimatedCard>

      <AnimatedCard delay={120} style={styles.block}>
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={16} color="#d97706" />
          <View style={styles.tipBody}>
            <Text style={styles.tipTitle}>A strong password</Text>
            <Text style={styles.tipText}>
              At least {MIN_LENGTH} characters, mixing upper and lower case, a number and a symbol. Avoid reusing your
              college portal password.
            </Text>
          </View>
        </View>
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  block: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: '#0f172a', padding: 15, paddingBottom: 0 },
  cardSub: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, padding: 15, paddingTop: 6 },

  fieldWrap: { paddingHorizontal: 15, paddingTop: 12 },
  label: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 13, backgroundColor: '#f8fafc' },
  inputRowError: { borderColor: '#fca5a5' },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Manrope-SemiBold', color: '#0f172a' },
  error: { fontSize: 10, color: '#dc2626', fontFamily: 'Manrope-SemiBold', marginTop: 5 },

  meterRow: { flexDirection: 'row', gap: 4, marginTop: 10 },
  meterBar: { flex: 1, height: 4, borderRadius: 2 },
  meterText: { fontSize: 10, fontFamily: 'Manrope-Bold', marginTop: 5 },

  formError: { flexDirection: 'row', alignItems: 'flex-start', marginHorizontal: 15, marginTop: 12, padding: 11, borderRadius: 11, backgroundColor: '#fef2f2' },
  formErrorText: { flex: 1, fontSize: 11, color: '#dc2626', fontFamily: 'Manrope-Medium', marginLeft: 8 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 15, marginTop: 16, marginBottom: 16, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME },
  submitBusy: { opacity: 0.7 },
  submitText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#fff' },

  tipRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  tipBody: { flex: 1, marginLeft: 10 },
  tipTitle: { fontSize: 12, fontFamily: 'Manrope-Bold', color: '#0f172a' },
  tipText: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16, marginTop: 3 },
});
