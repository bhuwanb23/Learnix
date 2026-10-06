/**
 * Category filter bar for the inbox.
 *
 * Every category is listed whether or not it has anything in it, because the list is
 * built from the server's RULES rather than from the rows returned. The old screen
 * had no filter at all, which is the actual complaint behind "the inbox is
 * undifferentiated": eight kinds of news in one list with no way to narrow it.
 *
 * Unread counts are per category and come from the same grouped query that fills the
 * header, so the numbers here and the badge on the tab cannot disagree.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';

export default function CategoryFilter({
  categories = [],
  active,
  unreadOnly,
  importantOnly,
  onSelect,
  onToggleUnread,
  onToggleImportant,
  importantCount = 0,
}) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <TouchableOpacity
          onPress={() => onSelect(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: !active }}
          style={[styles.chip, !active && styles.chipActive]}
        >
          <Ionicons name="apps" size={13} color={!active ? theme.colors.white : theme.colors.textSecondary} />
          <Text style={[styles.chipText, !active && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>

        {categories.map((c) => {
          const isActive = active === c.id;
          const unread = c.unread ?? 0;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => onSelect(isActive ? null : c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={unread ? `${c.label}, ${unread} unread` : c.label}
              style={[styles.chip, isActive && { backgroundColor: c.color, borderColor: c.color }]}
            >
              <Ionicons name={c.icon} size={13} color={isActive ? theme.colors.white : c.color} />
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{c.label}</Text>
              {unread > 0 ? (
                <View style={[styles.count, isActive && styles.countActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {unread > 99 ? '99+' : unread}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Two orthogonal toggles, kept out of the chip row because they are about HOW
          you are looking, not WHAT you are looking at. `important` only appears when
          there is something to show — an always-present filter that is always empty
          teaches people the inbox is broken. */}
      <View style={styles.toggles}>
        <TouchableOpacity
          onPress={onToggleUnread}
          accessibilityRole="switch"
          accessibilityState={{ checked: !!unreadOnly }}
          style={[styles.toggle, unreadOnly && styles.toggleOn]}
        >
          <Ionicons name="ellipse" size={12} color={unreadOnly ? theme.colors.white : theme.colors.textSecondary} />
          <Text style={[styles.toggleText, unreadOnly && styles.toggleTextOn]}>Unread only</Text>
        </TouchableOpacity>

        {importantCount > 0 ? (
          <TouchableOpacity
            onPress={onToggleImportant}
            accessibilityRole="switch"
            accessibilityState={{ checked: !!importantOnly }}
            style={[styles.toggle, importantOnly && styles.toggleOnImportant]}
          >
            <Ionicons name="alert-circle" size={12} color={importantOnly ? theme.colors.white : theme.colors.error} />
            <Text style={[styles.toggleText, importantOnly && styles.toggleTextOn]}>
              Important ({importantCount})
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    gap: 7,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  count: {
    minWidth: 17,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceHover,
    alignItems: 'center',
  },
  countActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  countTextActive: {
    color: theme.colors.white,
  },
  toggles: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toggleOn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  toggleOnImportant: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  toggleTextOn: {
    color: theme.colors.white,
  },
});