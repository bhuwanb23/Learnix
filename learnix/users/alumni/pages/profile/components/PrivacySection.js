/**
 * Privacy settings.
 *
 * Every switch here maps to a column the SERVER reads when it decides what to redact,
 * so this screen is not a set of preferences in the abstract — turning one off
 * changes what the next directory request returns. That is asserted in
 * check-profile.ts against `visibilityFor`, because the failure mode is invisible: a
 * switch that saves fine and redacts nothing looks exactly like one that works.
 *
 * TWO ASYMMETRIES, STATED PLAINLY BECAUSE THEY SURPRISE PEOPLE
 * -----------------------------------------------------------
 *
 * 1. "Who can contact you" applies to your EMAIL AND PHONE ONLY. Your location,
 *    career, skills and links are not contact fields, so they stay visible under every
 *    setting. Somebody who chooses "my connections only" and then wonders why a
 *    non-connection can still see their job history has been given the wrong model.
 *
 * 2. Professional LINKS are not gated by "who can contact you" either. A LinkedIn URL
 *    is a public identifier, not a way to reach somebody. The "Professional links"
 *    switch governs them on its own — so you can hide your employer history and still
 *    show your GitHub.
 *
 * Achievements follow the skills switch, since an achievement is a credential.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { PRIVACY_SWITCHES, VISIBLE_TO_OPTIONS } from '../profileMeta';

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PrivacySection({ privacy, saving, onSave }) {
  const p = privacy ?? {};
  const current = p.visibleTo ?? 'CONNECTIONS';

  const toggle = async (key, value) => {
    try {
      await onSave({ [key]: value });
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  return (
    <SectionCard
      title="Privacy"
      icon="eye-outline"
      iconColor="#4f46e5"
      footer="Contact details are off by default. Being an alumnus is not consent to publish an address or a number."
    >
      {PRIVACY_SWITCHES.map((s) => {
        if (s.key === 'visibleTo') {
          return (
            <View key={s.key} style={styles.block}>
              <Text style={styles.label}>{s.label}</Text>
              <View style={styles.chipRow}>
                {VISIBLE_TO_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    active={o.id === current}
                    onPress={() => toggle('visibleTo', o.id)}
                  />
                ))}
              </View>
              <Text style={styles.hint}>{s.hint}</Text>
            </View>
          );
        }
        return (
          <View key={s.key} style={styles.row}>
            <View style={styles.body}>
              <Text style={styles.label}>{s.label}</Text>
              <Text style={styles.hint}>{s.hint}</Text>
            </View>
            <Switch
              value={p[s.key] !== false}
              onValueChange={(v) => toggle(s.key, v)}
              disabled={saving}
              accessibilityLabel={s.label}
              accessibilityHint={s.hint}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#fff"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        );
      })}

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.textTertiary} />
        <Text style={styles.noteText}>
          Turning off "Appear in directory search" hides you from browse and from mentor
          suggestions. Someone who already has your link can still reach you — hiding from
          search and blocking contact are different intentions.
        </Text>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  block: {
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 6,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  hint: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
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
});