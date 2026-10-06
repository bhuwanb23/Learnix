/**
 * Academic history and graduation details.
 *
 * THE CENTRAL POINT OF THIS SECTION IS WHAT IT DOES NOT LET YOU EDIT.
 *
 * `graduationYear` is yours to correct — people genuinely get it wrong, and it is your
 * own fact. `batch` is not: it is the registrar's record, and it decides your program,
 * your department and the graduation year the directory filters on. Letting a graduate
 * re-point themselves at a program they did not attend would corrupt the department
 * filter and the mentor matcher, both of which walk profile → batch → program →
 * department in one query.
 *
 * So when your own year disagrees with your batch's, the response reports BOTH and
 * flags it, rather than silently preferring one. Preferring the batch would make the
 * editable field a lie; preferring your year would break the filter. The office
 * resolves the conflict.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';

function Fact({ label, value, muted }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, muted && styles.factValueMuted]} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function AcademicSection({ academic, saving, onSave }) {
  const [draft, setDraft] = useState(academic?.graduationYear ?? '');
  const dirty = String(draft) !== String(academic?.graduationYear ?? '');

  const save = async () => {
    const year = Number(draft);
    if (!Number.isInteger(year) || year < 1950 || year > 2100) {
      Alert.alert('Check that year', 'Enter a year between 1950 and 2100.');
      return;
    }
    try {
      await onSave({ graduationYear: year });
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  const program = academic?.program;

  return (
    <SectionCard
      title="Academic history"
      icon="school-outline"
      iconColor="#0891b2"
      footer="Batch, program and department are the registrar's record. Correct them through the office."
    >
      <View style={styles.grid}>
        <Fact label="Batch" value={academic?.batchName} />
        <Fact label="Started" value={academic?.startYear ? String(academic.startYear) : null} />
        <Fact label="Program" value={program ? `${program.code} · ${program.name}` : null} />
        <Fact label="Level" value={program?.level} />
        <Fact
          label="Department"
          value={program?.department ? `${program.department.code} · ${program.department.name}` : null}
        />
      </View>

      {academic?.yearMismatch ? (
        <View style={styles.warn} accessibilityRole="alert">
          <Ionicons name="warning-outline" size={15} color={theme.colors.warning} />
          <View style={styles.warnBody}>
            <Text style={styles.warnTitle}>Your year and your batch disagree</Text>
            <Text style={styles.warnText}>
              You set {academic.graduationYear}, and your batch records{' '}
              {academic.batchGraduationYear}. The directory and every broadcast audience use{' '}
              {academic.authoritativeYear} — the batch — until the office resolves it.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.editRow}>
        <Text style={styles.factLabel}>Graduation year</Text>
        <View style={styles.editControls}>
          <TextInput
            value={String(draft)}
            onChangeText={setDraft}
            keyboardType="number-pad"
            maxLength={4}
            accessibilityLabel="Your graduation year"
            style={styles.input}
          />
          {dirty ? (
            <>
              <TouchableOpacity
                onPress={() => setDraft(academic?.graduationYear ?? '')}
                accessibilityRole="button"
                accessibilityLabel="Discard the year change"
                style={styles.discardBtn}
              >
                <Ionicons name="close" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={save}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel="Save the graduation year"
                style={[styles.saveBtn, saving && styles.busy]}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>

      {academic?.batchId ? (
        <Text style={styles.footnote}>
          Your batch is what the mentor matcher and chapter filters match on, so it is not
          editable here.
        </Text>
      ) : (
        <Text style={styles.footnote}>
          No batch is recorded against your profile, so the directory cannot show your
          program or department. Ask the office to link one.
        </Text>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  fact: {
    width: '47%',
    minWidth: 130,
    gap: 1,
  },
  factLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  factValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  factValueMuted: {
    color: theme.colors.textLight,
  },
  warn: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: theme.radius.md,
    backgroundColor: `${theme.colors.warning}12`,
    marginTop: theme.spacing.sm,
  },
  warnBody: {
    flex: 1,
    gap: 2,
  },
  warnTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  warnText: {
    fontSize: 11.5,
    lineHeight: 16,
    color: theme.colors.textSecondary,
  },
  editRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 5,
  },
  editControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  input: {
    width: 90,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13.5,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  discardBtn: {
    padding: 7,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceHover,
  },
  saveBtn: {
    padding: 7,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  busy: {
    opacity: 0.5,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
});