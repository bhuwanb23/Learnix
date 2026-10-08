/**
 * Shared formatters and card primitive for the gate-pass screens.
 *
 * The LIFECYCLE is the thing every gate-pass screen shows, and it arrives from the server
 * already derived (`hostel-gate-passes.rules.ts`). Nothing here recomputes it. That is
 * deliberate: the same derivation decides the inbox sort order, the overdue count and the
 * student's own list, and a client that derived its own copy could disagree with all three.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

/**
 * Every derived state, with the label a warden would actually say and a tone.
 *
 * `departure_overdue` and `return_overdue` are separate rows here, not one "Overdue". They are
 * different problems: one student should have left and did not, another left and has not come
 * back. The first is a phone call to the student, the second is a reason to worry.
 */
export const LIFECYCLE_META = {
  awaiting_approval: { label: 'Awaiting decision', short: 'Pending', bg: '#fef3c7', color: '#d97706', icon: 'time-outline' },
  departure_overdue: { label: 'Did not leave on time', short: 'Not left', bg: '#ffedd5', color: '#c2410c', icon: 'alert-circle-outline' },
  return_overdue: { label: 'Overdue back', short: 'Overdue', bg: '#fee2e2', color: '#dc2626', icon: 'warning-outline' },
  out: { label: 'Out', short: 'Out', bg: '#dbeafe', color: '#2563eb', icon: 'walk-outline' },
  approved: { label: 'Approved', short: 'Approved', bg: '#dcfce7', color: '#059669', icon: 'checkmark-circle-outline' },
  returned: { label: 'Returned', short: 'Back', bg: '#f1f5f9', color: '#475569', icon: 'home-outline' },
  rejected: { label: 'Rejected', short: 'Rejected', bg: '#fee2e2', color: '#dc2626', icon: 'close-circle-outline' },
  cancelled: { label: 'Withdrawn', short: 'Withdrawn', bg: '#f1f5f9', color: '#64748b', icon: 'remove-circle-outline' },
};

export const lifecycleMeta = (key) =>
  LIFECYCLE_META[key] ?? { label: key, short: key, bg: '#f1f5f9', color: '#64748b', icon: 'ellipse-outline' };

export const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
};

export const fmtTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

/**
 * "2d 4h late" — a duration a warden can act on. Minutes alone is unreadable at three days,
 * and "17 hours" hides that it spans two nights.
 */
export function lateBy(minutes) {
  if (!minutes || minutes <= 0) return null;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d}d ${h}h late`;
  if (h > 0) return `${h}h ${m}m late`;
  return `${m}m late`;
}

export const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export function SectionCard({ title, subtitle, action, onAction, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <TouchableOpacity style={styles.sectionAction} onPress={onAction}>
            <Ionicons name={action.icon} size={13} color={theme.colors.primary} />
            <Text style={styles.sectionActionText}>{action.label}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function Empty({ children }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontFamily: 'Manrope-Bold', color: theme.colors.text, letterSpacing: 0.2 },
  sectionSubtitle: { fontSize: 11, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 2 },
  sectionAction: { flexDirection: 'row', alignItems: 'center' },
  sectionActionText: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: theme.colors.primary, marginLeft: 4 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10 },
  empty: { paddingVertical: 12, alignItems: 'center' },
  emptyText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, textAlign: 'center' },
});