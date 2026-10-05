// F-08 Scholarships — apply (docs/users/06 §3.7).
// Sub-page 6 levels deep from `users/`, so every relative import is `../../../../../../`.
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accountsApi } from '../../../../../../services/api';
import { AnimatedCard } from '../../../../../../components/ui';
import { THEME, AMBER } from '../../scholarshipsMeta';

// Recording an application. Income and gender are DECLARED here rather than
// typed into a student master: the screen says so plainly, because the officer
// verifying them against documents is what makes them usable.
export default function ScholarshipApply({ navigation, route }) {
  const schemeId = route?.params?.schemeId;
  const [studentProfileId, setStudentProfileId] = useState(route?.params?.studentProfileId ?? '');
  const [income, setIncome] = useState('');
  const [gender, setGender] = useState('');
  const [statement, setStatement] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async () => {
    if (!studentProfileId.trim()) {
      Alert.alert('Who is applying?', 'A student is required.');
      return;
    }
    setBusy(true);
    try {
      const created = await accountsApi.applyScholarship({
        scholarshipId: schemeId,
        studentProfileId: studentProfileId.trim(),
        declaredAnnualIncomeRupees: income.trim() ? Number(income.replace(/[^0-9.]/g, '')) : null,
        declaredGender: gender.trim() ? gender.trim().toUpperCase() : null,
        statement: statement.trim() || null,
      });
      Alert.alert('Recorded', `${created.student?.name ?? 'The student'}'s application is now APPLIED.`, [
        { text: 'Open it', onPress: () => navigation.openModule('ScholarshipApplication', { applicationId: created.id }) },
      ]);
    } catch (err) {
      Alert.alert('Not recorded', err.message);
    } finally {
      setBusy(false);
    }
  }, [schemeId, studentProfileId, income, gender, statement, navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AnimatedCard style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={AMBER} />
        <Text style={styles.noticeText}>
          Income and gender are declared by the student and checked against the uploaded documents. The system cannot verify them on its own.
        </Text>
      </AnimatedCard>

      <Text style={styles.label}>Student profile ID</Text>
      <TextInput style={styles.input} value={studentProfileId} onChangeText={setStudentProfileId} placeholder="Required" autoCapitalize="none" />

      <Text style={styles.label}>Declared annual family income (₹)</Text>
      <TextInput style={styles.input} value={income} onChangeText={setIncome} placeholder="e.g. 320000" keyboardType="numeric" />

      <Text style={styles.label}>Declared gender</Text>
      <TextInput style={styles.input} value={gender} onChangeText={setGender} placeholder="FEMALE / MALE" autoCapitalize="characters" />

      <Text style={styles.label}>Statement from the student</Text>
      <TextInput style={[styles.input, styles.multiline]} value={statement} onChangeText={setStatement} placeholder="Why this scholarship?" multiline />

      <TouchableOpacity style={[styles.btn, busy && styles.btnDisabled]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="send-outline" size={16} color="#fff" />
            <Text style={styles.btnText}>Record the application</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 16, paddingBottom: 40 },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#0f172a', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, backgroundColor: '#fff', fontSize: 14 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: THEME, borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
