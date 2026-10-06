/**
 * Notification preferences grid.
 *
 * This is the screen that replaces three switches on the profile page that were
 * seeded from a local `useState({ T1: true, T2: true, T3: false })` and never left
 * the device. Tapping them changed nothing in the database and nothing about whether
 * a message arrived, while the docs listed them under §3.8 as a shipped feature.
 * A toggle that saves nothing is worse than no toggle, because it teaches people
 * that this screen is trustworthy.
 *
 * Every row here is a real row in `notification_preferences`, and every category the
 * server suppresses at delivery consults it. The switch writes optimistically and
 * rolls back on failure, because a switch that visibly snaps back without saying why
 * is the other half of the same problem.
 */
import React from 'react';
import { View, Text, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';

export default function PreferenceGrid({ catalogue, preferences, saving, onToggle }) {
  if (!preferences) return null;

  const byCategory = new Map(preferences.map((p) => [p.category, p]));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="options-outline" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.headText}>What you hear about</Text>
        {saving ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      <Text style={styles.explainer}>
        Muted categories are never delivered, so they never reach your inbox or your unread count.
        Everything is on by default.
      </Text>

      {catalogue.categories.map((c, idx) => {
        const pref = byCategory.get(c.id);
        const muted = pref ? pref.muted : c.defaultMuted;
        return (
          <View
            key={c.id}
            style={[
              styles.row,
              idx === 0 && styles.rowFirst,
              idx === catalogue.categories.length - 1 && styles.rowLast,
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${c.color}18` }]}>
              <Ionicons name={c.icon} size={16} color={c.color} />
            </View>

            <View style={styles.body}>
              <Text style={styles.label}>{c.label}</Text>
              <Text style={styles.blurb}>{c.blurb}</Text>
              {!pref?.explicit ? <Text style={styles.defaultTag}>Default — on</Text> : null}
            </View>

            <Switch
              value={!muted}
              onValueChange={(on) => onToggle(c.id, !on)}
              disabled={saving}
              accessibilityLabel={`${c.label} notifications`}
              accessibilityHint={c.blurb}
              trackColor={{ false: theme.colors.border, true: c.color }}
              thumbColor={theme.colors.white}
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 4,
  },
  headText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  explainer: {
    fontSize: 11.5,
    lineHeight: 16,
    color: theme.colors.textTertiary,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowLast: {
    paddingBottom: theme.spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  blurb: {
    fontSize: 11.5,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  defaultTag: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textLight,
    marginTop: 1,
  },
});