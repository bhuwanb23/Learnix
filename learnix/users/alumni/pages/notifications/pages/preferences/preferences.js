/**
 * Preferences page.
 *
 * Almost entirely PreferenceGrid; the shell exists so the loading and error states
 * have somewhere to live, and so the office's sweep panel can sit above the grid —
 * an officer who mutes "mentorship" still gets the queue digest (the server sends it
 * with `respectMutes: false`), and this is where that is explained rather than left
 * as a surprise.
 */
import React from 'react';
import { View, ScrollView, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../../../../../../constants/theme';
import { EmptyState, SkeletonCard } from '../../../../../../components/ui';
import PreferenceGrid from '../../components/PreferenceGrid';
import ReminderSweepPanel from '../../components/ReminderSweepPanel';

export default function PreferencesPage({
  loading,
  error,
  catalogue,
  preferences,
  saving,
  isOffice,
  sweepRunning,
  sweepReport,
  onToggle,
  onSweep,
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <SkeletonCard />
      </View>
    );
  }

  if (error && !preferences) {
    return <EmptyState icon="cloud-offline-outline" title="Could not load your preferences" message={error} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {isOffice ? (
        <ReminderSweepPanel running={sweepRunning} report={sweepReport} onSweep={onSweep} />
      ) : null}

      <PreferenceGrid
        catalogue={catalogue}
        preferences={preferences}
        saving={saving}
        onToggle={onToggle}
      />

      <View style={styles.footnote}>
        <Text style={styles.footnoteTitle}>Why some messages always arrive</Text>
        <Text style={styles.footnoteBody}>
          The Alumni Relations Office's own work queue is not something you can switch off — mentorship
          requests waiting for a decision are shown regardless of the Mentorship switch, because
          muting news must not be able to lose a request somebody made for help.
        </Text>
      </View>

      {sweepRunning ? (
        <View style={styles.runningRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.runningText}>Running…</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: theme.spacing.lg,
  },
  scroll: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  footnote: {
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    gap: 3,
  },
  footnoteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  footnoteBody: {
    fontSize: 11.5,
    lineHeight: 16,
    color: theme.colors.textTertiary,
  },
  runningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    justifyContent: 'center',
    paddingTop: theme.spacing.sm,
  },
  runningText: {
    fontSize: 11.5,
    color: theme.colors.textTertiary,
  },
});
