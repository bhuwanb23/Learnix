/**
 * Achievements — self-declared, office-verified.
 *
 * The badge is the point, so the two states are rendered differently rather than
 * hidden. An unverified claim is still true as a *claim* — most alumni will never have
 * their certificate checked by the office, and hiding those entries would leave this
 * section looking empty for almost everyone. What the office provides is endorsement.
 *
 * The graduate cannot set `isVerified`, and the server enforces that: `isVerified`,
 * `verifiedByUserId` and `verifiedAt` are not in the create schema at all, so there is
 * no payload that writes one. That is asserted in check-profile.ts, not just here.
 *
 * Editing the TITLE of a verified entry strips the badge, because the office endorsed
 * what was there, not what is there now. The server returns `demoted: true` and this
 * component says so out loud rather than letting the badge silently disappear.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import SectionCard from './SectionCard';
import { ACHIEVEMENT_KINDS, achievementKindMeta } from '../profileMeta';

const emptyDraft = () => ({ title: '', kind: 'AWARD', issuer: '', year: '', url: '' });

export default function AchievementsSection({ achievements = [], verifiedCount = 0, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    if (draft.title.trim().length < 2) {
      Alert.alert('Give it a title', 'For example "ACM Distinguished Speaker".');
      return;
    }
    setBusy(true);
    try {
      await onAdd({
        title: draft.title.trim(),
        kind: draft.kind,
        issuer: draft.issuer.trim() || null,
        year: draft.year ? Number(draft.year) : null,
        url: draft.url.trim() || null,
      });
      setDraft(emptyDraft());
      setAdding(false);
    } catch (e) {
      Alert.alert('Could not add that', e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (a) => {
    Alert.alert('Remove this achievement?', a.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await onRemove(a.id);
          } catch (e) {
            Alert.alert('Could not remove', e.message);
          }
        },
      },
    ]);
  };

  return (
    <SectionCard
      title="Achievements"
      icon="trophy-outline"
      iconColor="#b45309"
      count={achievements.length}
      action={adding ? undefined : 'Add one'}
      onAction={() => {
        setAdding(true);
        setDraft(emptyDraft());
      }}
      footer={
        verifiedCount > 0
          ? `${verifiedCount} verified by the office. Unverified entries are yours alone to see and claim.`
          : 'The office verifies achievements — a verified badge is endorsed, an unverified one is your claim.'
      }
    >
      {achievements.length === 0 && !adding ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={22} color={theme.colors.textLight} />
          <Text style={styles.emptyText}>
            Nothing here yet. Awards, certifications, publications, talks and volunteering
            all count.
          </Text>
        </View>
      ) : null}

      {achievements.map((a) => {
        const kind = achievementKindMeta(a.kind);
        return (
          <View key={a.id} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: `${kind.color}18` }]}>
              <Ionicons name={kind.icon} size={16} color={kind.color} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleLine}>
                <Text style={styles.title} numberOfLines={2}>
                  {a.title}
                </Text>
                {a.isVerified ? (
                  <View
                    style={styles.verified}
                    accessibilityLabel="Verified by the Alumni Relations Office"
                  >
                    <Ionicons name="shield-checkmark" size={12} color={theme.colors.success} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : (
                  <View style={styles.unverified}>
                    <Text style={styles.unverifiedText}>Your claim</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>
                {kind.label}
                {a.issuer ? ` · ${a.issuer}` : ''}
                {a.year ? ` · ${a.year}` : ''}
              </Text>
              {a.url ? (
                <Text style={styles.url} numberOfLines={1}>
                  {a.url}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => confirmRemove(a)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${a.title}`}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.textLight} />
            </TouchableOpacity>
          </View>
        );
      })}

      {adding ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>New achievement</Text>
          <View style={styles.kindRow}>
            {ACHIEVEMENT_KINDS.map((k) => {
              const isActive = k.id === draft.kind;
              return (
                <TouchableOpacity
                  key={k.id}
                  onPress={() => set('kind')(k.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={[styles.kindChip, isActive && { backgroundColor: k.color, borderColor: k.color }]}
                >
                  <Text style={[styles.kindText, isActive && { color: '#fff' }]}>{k.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            value={draft.title}
            onChangeText={set('title')}
            placeholder="What is it?"
            placeholderTextColor={theme.colors.textLight}
            accessibilityLabel="Achievement title"
            style={styles.input}
          />
          <TextInput
            value={draft.issuer}
            onChangeText={set('issuer')}
            placeholder="Who gave it? (optional)"
            placeholderTextColor={theme.colors.textLight}
            accessibilityLabel="Issuer"
            style={styles.input}
          />
          <View style={styles.dateRow}>
            <View style={styles.yearField}>
              <Text style={styles.dateLabel}>Year</Text>
              <TextInput
                value={draft.year}
                onChangeText={set('year')}
                placeholder="YYYY"
                placeholderTextColor={theme.colors.textLight}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Year"
                style={styles.input}
              />
            </View>
            <View style={styles.urlField}>
              <Text style={styles.dateLabel}>Link</Text>
              <TextInput
                value={draft.url}
                onChangeText={set('url')}
                placeholder="https://…"
                placeholderTextColor={theme.colors.textLight}
                autoCapitalize="none"
                accessibilityLabel="Link to the achievement"
                style={styles.input}
              />
            </View>
          </View>
          <Text style={styles.formHint}>
            Added as your claim. The office verifies achievements when they can.
          </Text>
          <View style={styles.formActions}>
            <TouchableOpacity
              onPress={() => {
                setAdding(false);
                setDraft(emptyDraft());
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Save this achievement"
              style={[styles.submitBtn, busy && styles.busy]}
            >
              <Text style={styles.submitText}>{busy ? 'Saving…' : 'Add'}</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: `${theme.colors.success}15`,
  },
  verifiedText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.success,
  },
  unverified: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9,
    backgroundColor: theme.colors.surfaceHover,
  },
  unverifiedText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: theme.colors.textTertiary,
  },
  meta: {
    fontSize: 11.5,
    color: theme.colors.textSecondary,
  },
  url: {
    fontSize: 11,
    color: theme.colors.primary,
  },
  form: {
    gap: 7,
    paddingTop: theme.spacing.sm,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  formTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  kindChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  kindText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
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
  yearField: {
    width: 92,
    gap: 3,
  },
  urlField: {
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