/**
 * Skills and expertise.
 *
 * Normalised rows rather than a free-text blob because the directory has to answer
 * "who knows Kubernetes" in SQL — a JSON column forces it into a JS scan and cannot be
 * indexed. The practical consequence is a per-skill LEVEL and a claimed years count,
 * both of which make "10+ yrs in distributed systems" answerable.
 *
 * `yearsExperience` is preserved across a save that omits it. The server snapshots the
 * existing values before it replaces the table, because the replace-and-insert order
 * would otherwise wipe every count the graduate typed the first time they changed a
 * level. That was a real bug: the read happened after the write.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { SKILL_LEVELS, skillLevelMeta } from '../profileMeta';

export default function SkillsSection({ skills = [], saving, onSave }) {
  const [draft, setDraft] = useState('');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [years, setYears] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    try {
      const yearsNumber = years.trim() === '' ? null : Number(years);
      if (yearsNumber !== null && (!Number.isInteger(yearsNumber) || yearsNumber < 0 || yearsNumber > 70)) {
        Alert.alert('Check the years', 'Enter a whole number between 0 and 70.');
        return;
      }
      // The payload is the FULL list, because the endpoint replaces. So the existing
      // entries go back in unchanged — which is why `yearsExperience` has to be read
      // from the loaded row rather than kept in component state.
      const next = [
        ...skills.map((s) => ({
          skill: s.skill,
          level: s.level,
          yearsExperience: s.yearsExperience,
        })),
        { skill: name, level, yearsExperience: yearsNumber },
      ];
      await onSave(next);
      setDraft('');
      setYears('');
      setLevel('INTERMEDIATE');
    } catch (e) {
      Alert.alert('Could not save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const changeLevel = async (skill, nextLevel) => {
    try {
      await onSave(
        skills.map((s) => ({
          skill: s.skill,
          level: s.skill === skill ? nextLevel : s.level,
          yearsExperience: s.yearsExperience,
        })),
      );
    } catch (e) {
      Alert.alert('Could not save', e.message);
    }
  };

  const remove = async (skill) => {
    try {
      await onSave(
        skills
          .filter((s) => s.skill !== skill)
          .map((s) => ({ skill: s.skill, level: s.level, yearsExperience: s.yearsExperience })),
      );
    } catch (e) {
      Alert.alert('Could not remove', e.message);
    }
  };

  return (
    <SectionCard
      title="Skills"
      icon="construct-outline"
      iconColor="#7c3aed"
      count={skills.length}
      footer="Skills are matched against mentorship requests, so the level matters more than the count."
    >
      {skills.length === 0 ? (
        <Text style={styles.empty}>No skills listed yet.</Text>
      ) : null}

      {skills.map((s) => {
        const meta = skillLevelMeta(s.level);
        return (
          <View key={s.skill} style={styles.row}>
            <View style={styles.body}>
              <Text style={styles.skill}>{s.skill}</Text>
              <Text style={styles.years}>
                {s.yearsExperience ? `${s.yearsExperience} yr claimed` : 'No years claimed'}
              </Text>
            </View>
            <View style={styles.levelChips}>
              {SKILL_LEVELS.map((l) => {
                const isActive = l.id === s.level;
                return (
                  <TouchableOpacity
                    key={l.id}
                    onPress={() => changeLevel(s.skill, l.id)}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${s.skill} level ${l.label}`}
                    style={[
                      styles.levelChip,
                      isActive && { backgroundColor: meta.color, borderColor: meta.color },
                    ]}
                  >
                    <Text style={[styles.levelText, isActive && { color: '#fff' }]}>{l.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => remove(s.skill)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${s.skill}`}
            >
              <Ionicons name="close-circle-outline" size={17} color={theme.colors.textLight} />
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.add}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a skill"
          placeholderTextColor={theme.colors.textLight}
          onSubmitEditing={add}
          returnKeyType="done"
          accessibilityLabel="New skill"
          style={styles.input}
        />
        <TextInput
          value={years}
          onChangeText={setYears}
          placeholder="yrs"
          placeholderTextColor={theme.colors.textLight}
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Years of experience"
          style={styles.yearsInput}
        />
        <TouchableOpacity
          onPress={add}
          disabled={busy || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add this skill"
          style={[styles.addBtn, (busy || !draft.trim()) && styles.busy]}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.levelRow}>
        <Text style={styles.levelRowLabel}>New skill level</Text>
        <View style={styles.levelChips}>
          {SKILL_LEVELS.map((l) => {
            const isActive = l.id === level;
            return (
              <TouchableOpacity
                key={l.id}
                onPress={() => setLevel(l.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`New skill at ${l.label}`}
                style={[styles.levelChip, isActive && { backgroundColor: l.color, borderColor: l.color }]}
              >
                <Text style={[styles.levelText, isActive && { color: '#fff' }]}>{l.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    paddingBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  body: {
    width: 116,
    gap: 1,
  },
  skill: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  years: {
    fontSize: 10.5,
    color: theme.colors.textTertiary,
  },
  levelChips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  levelChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: theme.spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  yearsInput: {
    width: 58,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
    textAlign: 'center',
  },
  addBtn: {
    padding: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  busy: {
    opacity: 0.45,
  },
  levelRow: {
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  levelRowLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
});