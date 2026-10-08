/**
 * Shared labels and card primitives for the visitor screens.
 *
 * THE LIFECYCLE ARRIVES DERIVED. It comes from the server (`hostel-visitors.rules.ts`) and nothing
 * here recomputes it - deliberately, for the same reason as `gatePassMeta.js`. The derivation
 * decides the warden's sort order, the overdue count and the resident's own list, so a client with
 * its own copy could disagree with all three and there would be no way to tell which was right.
 *
 * THE ALERTS ARRIVE AS A LIST, AND THAT IS THE POINT
 * ---------------------------------------------------
 * "Restricted" is three different rules that share a word: a barred person, a window outside
 * visiting hours, and someone visiting far more often than is ordinary. A visitor can trip two at
 * once. So the badge shows every reason, and `ALERT_META` gives each its own icon and colour
 * rather than collapsing them into one red flag that tells a warden nothing about what to do.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../constants/theme';

/**
 * The eight derived states. `visit_overdue` and `departure_overdue` are separate rows, not one
 * "Overdue": one visitor is on campus and has outstayed, the other never arrived. The first is a
 * conversation with whoever is on campus; the second is a phone call.
 */
export const LIFECYCLE_META = {
  awaiting_approval: { label: 'Awaiting confirmation', short: 'Pending', bg: '#fef3c7', color: '#d97706', icon: 'time-outline' },
  approved: { label: 'Confirmed, not arrived', short: 'Expected', bg: '#dcfce7', color: '#059669', icon: 'checkmark-circle-outline' },
  in_campus: { label: 'On campus', short: 'On campus', bg: '#dbeafe', color: '#2563eb', icon: 'walk-outline' },
  visit_overdue: { label: 'Overstayed', short: 'Overstayed', bg: '#fee2e2', color: '#dc2626', icon: 'warning-outline' },
  departure_overdue: { label: 'Never arrived', short: 'No-show risk', bg: '#ffedd5', color: '#c2410c', icon: 'alert-circle-outline' },
  left: { label: 'Left', short: 'Left', bg: '#f1f5f9', color: '#475569', icon: 'exit-outline' },
  no_show: { label: 'Never came', short: 'No-show', bg: '#f1f5f9', color: '#64748b', icon: 'close-circle-outline' },
  rejected: { label: 'Refused', short: 'Refused', bg: '#fee2e2', color: '#dc2626', icon: 'ban-outline' },
  cancelled: { label: 'Withdrawn', short: 'Withdrawn', bg: '#f1f5f9', color: '#64748b', icon: 'remove-circle-outline' },
  // An unrecognised stored status. Surfaced, not treated as fine - a bad write should be visible
  // in the queue rather than reading as "nothing to do".
  unknown: { label: 'Unrecognised state', short: 'Check', bg: '#ede9fe', color: '#6d28d9', icon: 'help-circle-outline' },
};

export const lifecycleMeta = (key) => LIFECYCLE_META[key] ?? LIFECYCLE_META.unknown;

/**
 * Alert badges. `BARRED` is the most severe by colour AND by icon, because it is the only one
 * that should stop somebody being let in; the other two are context.
 */
export const ALERT_META = {
  BARRED: { label: 'Barred', icon: 'shield-ban-outline', color: '#b91c1c', bg: '#fee2e2' },
  OUTSIDE_VISITING_HOURS: { label: 'Outside hours', icon: 'moon-outline', color: '#a16207', bg: '#fef3c7' },
  FREQUENT_VISITOR: { label: 'Frequent', icon: 'repeat-outline', color: '#7c3aed', bg: '#ede9fe' },
};

export const alertMeta = (code) =>
  ALERT_META[code] ?? { label: code, icon: 'alert-circle-outline', color: '#64748b', bg: '#f1f5f9' };

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

/** "08:00–19:00", from the policy's minute offsets. Kept here so both sheets format it identically. */
export const fmtWindow = (hours) => {
  if (!hours) return null;
  const to = (m) => `${String(Math.floor((m ?? 0) / 60)).padStart(2, '0')}:${String((m ?? 0) % 60).padStart(2, '0')}`;
  return `${to(hours.startMinutes)}–${to(hours.endMinutes)}`;
};

export const initials = (name) =>
  String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/**
 * The alert strip on a card. Every reason is shown, not just the first - a warden who sees one
 * red badge and acts on it, then discovers a second rule also fired, has been given the wrong
 * information once already.
 */
export function AlertStrip({ alerts, barredReason }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <View style={styles.alertWrap}>
      {alerts.map((a) => {
        const m = alertMeta(a.code);
        return (
          <View key={a.code} style={[styles.alertPill, { backgroundColor: m.bg }]}>
            <Ionicons name={m.icon} size={11} color={m.color} />
            <Text style={[styles.alertText, { color: m.color }]}>
              {a.message || m.label}
            </Text>
          </View>
        );
      })}
      {barredReason ? (
        <Text style={styles.barredReason}>Why: {barredReason}</Text>
      ) : null}
    </View>
  );
}

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
  alertWrap: { marginTop: 8 },
  alertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 4,
  },
  alertText: { fontSize: 10, fontFamily: 'Manrope-SemiBold', marginLeft: 4, flexShrink: 1 },
  barredReason: { fontSize: 10, fontFamily: 'Manrope-Medium', color: theme.colors.textMuted, marginTop: 4 },
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