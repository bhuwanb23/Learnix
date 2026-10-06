/**
 * Career milestones.
 *
 * A TIMELINE, not a field, and this is the section that was missing entirely: the
 * `AlumniCareerEntry` table existed and the directory rendered it, but no route wrote
 * to it — so the promotions and lateral moves that make a career worth reading could
 * never be recorded by the person they belonged to.
 *
 * Month precision (`YYYY-MM`) throughout. A role does not have a day, and inventing one
 * puts a false date on somebody's job history.
 *
 * THE RULES THE SERVER ENFORCES, SHOWN HERE RATHER THAN DISCOVERED
 * ----------------------------------------------------------------
 *   - One current role. Adding an open-ended role closes the previous one at the new
 *     role's start month; a "current" pin is shown for exactly one entry.
 *   - End after start. A same-month range is refused too.
 *   - An entry needs an employer: a registered company, or a free-text name for the
 *     startups and overseas employers the companies table has never heard of.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { monthLabel, thisMonth } from '../profileMeta';

const emptyDraft = () => ({
  title: '',
  employerLabel: '',
  location: '',
  fromMonth: thisMonth(),
  toMonth: '',
});

export default function CareerSection({ career = [], saving, onAdd, onUpdate, onRemove, onHighlight }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    if (!draft.title.trim()) {
      Alert.alert('Add a job title', 'Every role needs a title.');
      return;
    }
    if (!draft.employerLabel.trim()) {
      Alert.alert('Add an employer', 'Pick a company or type the name.');
      return;
    }
    setBusy(true);
    try {
      await onAdd({
        title: draft.title.trim(),
        employerLabel: draft.employerLabel.trim(),
        location: draft.location.trim() || null,
        fromMonth: draft.fromMonth,
        toMonth: draft.toMonth ? draft.toMonth : null,
      });
      setDraft(emptyDraft());
      setAdding(false);
    } catch (e) {
      Alert.alert('Could not add that role', e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (entry) => {
    Alert.alert('Remove this role?', `${entry.title} at ${entry.companyName ?? 'an unnamed employer'}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await onRemove(entry.id);
          } catch (e) {
            Alert.alert('Could not remove', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SectionCard
      title="Career"
      icon="trending-up-outline"
      iconColor="#0f766e"
      count={career.length}
      action={adding ? undefined : 'Add a role'}
      onAction={() => {
        setAdding(true);
        setDraft(emptyDraft());
      }}
      footer="Showing your timeline to the network is controlled by the Career switch in Privacy."
    >
      {career.length === 0 && !adding ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={22} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>
            No roles recorded yet. Add your current role and the office or your connections
            can see where you are now.
          </Text>
        </View>
      ) : null}

      {career.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.rail}>
            <View style={[styles.dot, entry.isCurrent && styles.dotCurrent]} />
            <View style={styles.line} />
          </View>
          <View style={styles.entryBody}>
            <Text style={styles.entryTitle}>{entry.title}</Text>
            <Text style={styles.entryMeta}>
              {entry.companyName ?? 'Unnamed employer'}
              {entry.location ? ` · ${entry.location}` : ''}
            </Text>
            <View style={styles.entryFoot}>
              <Text style={styles.entryDates}>
                {monthLabel(entry.fromMonth)} — {entry.isCurrent ? 'Present' : monthLabel(entry.toMonth)}
              </Text>
              {entry.isCurrent ? (
                <View style={styles.currentPill}>
                  <Text style={styles.currentText}>Current</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.entryActions}>
              <TouchableOpacity
                onPress={() => onHighlight(entry.id, !entry.isHighlight)}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={entry.isHighlight ? `Unpin ${entry.title}` : `Pin ${entry.title} as a highlight`}
                style={styles.smallBtn}
              >
                <Ionicons
                  name={entry.isHighlight ? 'star' : 'star-outline'}
                  size={14}
                  color={entry.isHighlight ? theme.colors.warning : theme.colors.textTertiary}
                />
                <Text style={styles.smallText}>{entry.isHighlight ? 'Highlighted' : 'Highlight'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => confirmRemove(entry)}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${entry.title}`}
                style={styles.smallBtn}
              >
                <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                <Text style={[styles.smallText, { color: theme.colors.error }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {adding ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New role</Text>
          <TextInput
            value={draft.title}
            onChangeText={set('title')}
            placeholder="Job title"
            placeholderTextColor={theme.colors.textLight}
            accessibilityLabel="Job title"
            style={styles.input}
          />
          <TextInput
            value={draft.employerLabel}
            onChangeText={set('employerLabel')}
            placeholder="Employer"
            placeholderTextColor={theme.colors.textLight}
            accessibilityLabel="Employer"
            style={styles.input}
          />
          <TextInput
            value={draft.location}
            onChangeText={set('location')}
            placeholder="Location (optional)"
            placeholderTextColor={theme.colors.textLight}
            accessibilityLabel="Location"
            style={styles.input}
          />
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>From</Text>
              <TextInput
                value={draft.fromMonth}
                onChangeText={set('fromMonth')}
                placeholder="YYYY-MM"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
                accessibilityLabel="Start month, as YYYY-MM"
                style={styles.input}
              />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>To</Text>
              <TextInput
                value={draft.toMonth}
                onChangeText={set('toMonth')}
                placeholder="blank = now"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
                accessibilityLabel="End month, or blank for the current role"
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.formHint}>
            Months as YYYY-MM. Leave the end blank for your current role — it replaces any
            previous current role.
          </Text>
          <View style={styles.formActions}>
            <TouchableOpacity
              onPress={() => {
                setAdding(false);
                setDraft(emptyDraft());
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel adding a role"
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Save this role"
              style={[styles.submitBtn, busy && styles.busy]}
            >
              <Text style={styles.submitText}>{busy ? 'Saving…' : 'Save role'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: 7,
    paddingVertical: theme.spacing.md,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  entry: {
    flexDirection: 'row',
    gap: 10,
  },
  rail: {
    width: 10,
    alignItems: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  dotCurrent: {
    backgroundColor: theme.colors.success,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 3,
  },
  entryBody: {
    flex: 1,
    paddingBottom: theme.spacing.md,
    gap: 2,
  },
  entryTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  entryMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  entryFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  entryDates: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  currentPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: `${theme.colors.success}15`,
  },
  currentText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.success,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 5,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  form: {
    gap: 7,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 9,
  },
  dateField: {
    flex: 1,
    gap: 3,
  },
  dateLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  formHint: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 3,
  },
  cancelBtn: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceHover,
  },
  cancelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  submitBtn: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
  },
  submitText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#fff',
  },
  busy: {
    opacity: 0.5,
  },
});