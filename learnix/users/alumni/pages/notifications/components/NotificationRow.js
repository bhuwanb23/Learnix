/**
 * One row in the inbox.
 *
 * Three things this fixes from the old inline row:
 *
 * 1. ICON AND COLOUR COME FROM THE CATEGORY, NOT A LOCAL MAP. The old row did
 *    `TYPE_META[n.type] ?? TYPE_META.SYSTEM`, and `TYPE_META` had no `EVENT` entry,
 *    so all 33 live RSVP-confirmation rows rendered as a grey "System" message. The
 *    server now sends `label`/`icon`/`color` per row, resolved through its own rules
 *    file, so this component never guesses.
 *
 * 2. TAPPING MARKS THAT ROW READ — not read-all. Previously the only affordance was
 *    "mark all read", so opening the inbox marked a pending mentorship approval as
 *    seen without anyone having read it.
 *
 * 3. THE PIN REQUIRES UNREAD. The server only promotes `isImportant && readAt ===
 *    null` rows, so an important broadcast from six months ago stops competing with
 *    today's mail the moment it is read. That rule lives server-side because it has
 *    to: it is a property of the query, not of the renderer.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';
import { relativeTime, deepLinkTarget } from '../notificationsMeta';

export default function NotificationRow({ row, onPress, onToggleRead }) {
  const target = deepLinkTarget(row.deepLink);
  const readable = row.read;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(row, target)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${row.label}: ${row.title}. ${readable ? 'Read' : 'Unread'}. ${relativeTime(row.createdAt)}`}
      accessibilityHint={target ? `Opens ${target.screen}` : undefined}
      style={[styles.row, readable && styles.rowRead]}
    >
      {/* Unread marker. A dot rather than a background wash, because the wash made
          a long list of mostly-read rows look like a wall of pink. */}
      <View style={[styles.dot, readable && styles.dotRead, { backgroundColor: readable ? 'transparent' : row.color }]} />

      <View style={[styles.iconWrap, { backgroundColor: `${row.color}18` }]}>
        <Ionicons name={row.icon} size={18} color={row.color} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={[styles.title, !readable && styles.titleUnread]} numberOfLines={2}>
            {row.title}
          </Text>
          {row.important ? (
            <View style={styles.importantPill} accessibilityLabel="Important">
              <Ionicons name="alert-circle" size={11} color={theme.colors.error} />
              <Text style={styles.importantText}>Important</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.bodyText} numberOfLines={2}>
          {row.body}
        </Text>

        <View style={styles.metaLine}>
          <View style={[styles.categoryChip, { borderColor: `${row.color}44` }]}>
            <Text style={[styles.categoryText, { color: row.color }]}>{row.label}</Text>
          </View>
          <Text style={styles.time}>{relativeTime(row.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {/* Explicit un-read as well as read. Without it, marking one row read by
            mistake is permanent — there was no way back before. */}
        <TouchableOpacity
          onPress={() => onToggleRead?.(row, !readable)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={readable ? `Mark "${row.title}" unread` : `Mark "${row.title}" read`}
          style={styles.moreBtn}
        >
          <Ionicons
            name={readable ? 'ellipse-outline' : 'checkmark-done'}
            size={17}
            color={readable ? theme.colors.textLight : theme.colors.primary}
          />
        </TouchableOpacity>
        {target ? (
          <Ionicons name="chevron-forward" size={15} color={theme.colors.textLight} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  rowRead: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 16,
  },
  dotRead: {
    backgroundColor: 'transparent',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 3,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    lineHeight: 19,
  },
  titleUnread: {
    fontWeight: '700',
  },
  importantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: `${theme.colors.error}14`,
  },
  importantText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.error,
    letterSpacing: 0.2,
  },
  bodyText: {
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    lineHeight: 17,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  categoryChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  time: {
    fontSize: 10.5,
    color: theme.colors.textLight,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  moreBtn: {
    padding: 3,
  },
});
