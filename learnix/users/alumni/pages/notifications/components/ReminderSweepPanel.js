/**
 * Reminder sweep panel (office only).
 *
 * There is no scheduler in this backend — nothing has ever run on a timer — so
 * event reminders and the stale-mentorship-queue digest are produced by pressing a
 * button. In exchange the report is explicit and re-runnable without consequence.
 *
 * The panel therefore shows three numbers and explains them, because "0 delivered"
 * is ambiguous and a button that reports nothing is indistinguishable from a button
 * that is broken:
 *
 *   delivered   - rows actually written
 *   muted       - recipients who had that category switched off
 *   duplicates  - messages this sweep had already sent, so it did not repeat them
 *
 * Dry run first. It runs the identical computation and writes nothing, so the office
 * can see "42 people would be reminded, 3 have reminders muted" before sending it to
 * 42 people.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';

function Stat({ label, value, tone }) {
  return (
    <View style={styles.stat}>
      <Text
        style={[
          styles.statValue,
          tone === 'muted' && { color: theme.colors.warning },
          tone === 'dup' && { color: theme.colors.textTertiary },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ReminderSweepPanel({ running, report, onSweep }) {
  const t = report?.totals;

  const run = (dryRun) => {
    if (dryRun) {
      onSweep(true);
      return;
    }
    const delivered = t?.delivered ?? 0;
    const muted = t?.muted ?? 0;
    Alert.alert(
      'Send reminders now?',
      delivered > 0
        ? `${delivered} ${delivered === 1 ? 'reminder' : 'reminders'} will be delivered. ` +
            `${muted} recipient(s) have that category muted and will not receive anything. ` +
            'Running again will not send them twice.'
        : 'Nothing is scheduled to be sent right now. Run a dry run to check.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => onSweep(false) },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="alarm-outline" size={16} color={theme.colors.primary} />
        <Text style={styles.headText}>Reminder sweep</Text>
        {running ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      <Text style={styles.explainer}>
        Nudges people with a confirmed seat 24 hours and 2 hours before an event, and summarises
        mentorship requests that have been waiting over a day. There is no background scheduler,
        so this runs only when you press the button, and pressing it twice will not send anything
        twice.
      </Text>

      {t ? (
        <View style={styles.statsRow}>
          <Stat label={report.dryRun ? 'would send' : 'delivered'} value={t.delivered} />
          <Stat label="muted" value={t.muted} tone="muted" />
          <Stat label="already sent" value={t.duplicates} tone="dup" />
        </View>
      ) : null}

      {report?.eventReminders?.windows ? (
        <View style={styles.windows}>
          {report.eventReminders.windows.map((w) => (
            <View key={w.offsetHours} style={styles.windowRow}>
              <Text style={styles.windowOffset}>{w.offsetHours}h before</Text>
              <Text style={styles.windowText}>
                {w.events === 0
                  ? 'No events in this window'
                  : `${w.events} event${w.events === 1 ? '' : 's'} · ${w.deliveries.delivered} reminder${w.deliveries.delivered === 1 ? '' : 's'}`}
              </Text>
            </View>
          ))}
          <View style={styles.windowRow}>
            <Text style={styles.windowOffset}>Mentorship</Text>
            <Text style={styles.windowText}>
              {report.mentorshipDigest.pending} pending
              {report.mentorshipDigest.stale > 0
                ? `, ${report.mentorshipDigest.stale} waiting over a day`
                : ''}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => run(true)}
          disabled={running}
          accessibilityRole="button"
          style={[styles.btn, styles.btnGhost, running && styles.btnDisabled]}
        >
          <Ionicons name="eye-outline" size={15} color={theme.colors.primary} />
          <Text style={styles.btnGhostText}>Dry run</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => run(false)}
          disabled={running}
          accessibilityRole="button"
          style={[styles.btn, styles.btnPrimary, running && styles.btnDisabled]}
        >
          <Ionicons name="send" size={15} color={theme.colors.white} />
          <Text style={styles.btnPrimaryText}>Run sweep</Text>
        </TouchableOpacity>
      </View>

      {report?.ranAt ? (
        <Text style={styles.ranAt}>
          {report.dryRun ? 'Dry run' : 'Sweep'} at{' '}
          {new Date(report.ranAt).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  statValue: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  windows: {
    gap: 4,
    paddingVertical: 6,
  },
  windowRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  windowOffset: {
    width: 96,
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  windowText: {
    flex: 1,
    fontSize: 11.5,
    color: theme.colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnGhostText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  btnPrimaryText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.white,
  },
  ranAt: {
    fontSize: 10.5,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
});