/**
 * Segmented tab bar for the notifications hub.
 *
 * Extracted because the old 516-line screen inlined this, and every tab it drew was
 * the same 40 lines of padding math. Now three tabs share it.
 *
 * `accessibilityRole="tab"` is set deliberately: this is a real tab list, and without
 * the role a screen reader announces the buttons as unrelated pressables with no
 * indication that one of them is selected.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';

export default function SegmentedTabs({ tabs, active, onChange, counts = {} }) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const isActive = tab === active;
        const badge = counts[tab] ?? 0;
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => onChange(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={badge ? `${tab}, ${badge} unread` : tab}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? 'chevron-down' : 'chevron-forward'}
              size={12}
              color={isActive ? theme.colors.white : theme.colors.textTertiary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
              {tab}
            </Text>
            {badge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.white,
  },
  badge: {
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 9,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.white,
  },
});