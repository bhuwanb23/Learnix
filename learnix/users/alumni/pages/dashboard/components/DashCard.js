/**
 * The shell every dashboard section sits in, plus a COMPACT empty state.
 *
 * WHY NOT THE SHARED `EmptyState`
 * ------------------------------
 * `components/ui/EmptyState` is a full-page treatment: an 80px icon, `paddingVertical: 40`
 * and a centred 280px column. Dropped inside a card on a scrolling dashboard it pushes the
 * next two sections below the fold and makes one empty row taller than three populated
 * ones. This is the same component, sized for a card.
 *
 * It is duplicated rather than parameterised on purpose — one prop threading to tune four
 * sizes would be a worse dependency than a 40-line file, and `components/ui` is shared with
 * eight other apps that all want the full-page version.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { tint } from '../dashboardMeta';

export default function DashCard({
  title,
  icon,
  accent,
  actionLabel,
  onAction,
  children,
  style,
}) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tint(accent) }]}>
          <Ionicons name={icon} size={15} color={accent} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {actionLabel && onAction ? (
          <TouchableOpacity
            onPress={onAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={[styles.action, { color: accent }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * Compact empty state for use inside a card.
 *
 * `body` is optional: several of these states are self-explanatory from the title alone
 * ("No mentorship yet"), and a second sentence there is noise.
 */
export function DashEmpty({ icon, title, body, accent = '#64748b', actionLabel, onAction }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={16} color={accent} style={styles.emptyIcon} />
      <View style={styles.emptyBody}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {body ? <Text style={styles.emptyText}>{body}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={[styles.emptyAction, { borderColor: accent }]}
        >
          <Text style={[styles.emptyActionText, { color: accent }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * A labelled value row — the unit the snapshot and career cards are built from.
 *
 * `missing` is a boolean rather than the rendered string, so the caller decides what to
 * print. Centralising the "what does an absent field look like" decision is the whole point
 * of `dashboardMeta.MISSING`; letting each card inline its own placeholder is how the old
 * dashboard ended up saying both "—" and "None" in the same column.
 */
export function Field({ label, value, icon, accent, placeholder }) {
  const absent = value === null || value === undefined || value === '';
  return (
    <View style={styles.field}>
      {icon ? (
        <Ionicons
          name={icon}
          size={13}
          color={absent ? theme.colors.textLight : accent ?? theme.colors.textTertiary}
          style={styles.fieldIcon}
        />
      ) : null}
      <Text style={styles.fieldLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.fieldValue, absent && styles.fieldValueMissing]}
        numberOfLines={1}
        accessibilityLabel={absent ? `${label}: ${placeholder}` : undefined}
      >
        {absent ? placeholder : value}
      </Text>
    </View>
  );
}

/** A single headline number with a caption, used by the mentorship and giving cards. */
export function Stat({ value, label, accent, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={[styles.stat, { backgroundColor: tint(accent) }]}
    >
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </Wrapper>
  );
}

/** Thin progress bar. `percent` is clamped so an over-funded campaign cannot overflow. */
export function Progress({ percent, accent, height = 4 }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  action: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  emptyIcon: { marginTop: 1 },
  emptyBody: { flex: 1, gap: 2 },
  emptyTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
  },
  emptyAction: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  emptyActionText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
  },
  fieldIcon: { width: 15 },
  fieldLabel: {
    width: 92,
    fontSize: 11.5,
    color: theme.colors.textTertiary,
  },
  fieldValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  fieldValueMissing: {
    fontWeight: '500',
    fontStyle: 'italic',
    color: theme.colors.textLight,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
    color: theme.colors.textTertiary,
  },
  track: {
    borderRadius: 2,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});