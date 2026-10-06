/**
 * A titled card with an optional right-hand action, used for every profile section.
 *
 * Extracted so the nine sections share one collapse/expand behaviour and one border
 * treatment. Without it each section re-implemented the same 12 lines of padding and
 * header styling, which is how the previous single-file screen grew to 419 lines with
 * no way to test any one part of it.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../../../constants/theme';

export default function SectionCard({
  title,
  icon,
  iconColor = theme.colors.primary,
  count,
  action,
  onAction,
  children,
  footer,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={icon} size={15} color={iconColor} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {count !== undefined && count !== null ? (
          <View style={styles.count}>
            <Text style={styles.countText}>{count}</Text>
          </View>
        ) : null}
        {action ? (
          <TouchableOpacity
            onPress={onAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={action}
            style={styles.action}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
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
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  count: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceHover,
    alignItems: 'center',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  action: {
    padding: 2,
  },
  footer: {
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.sm,
  },
});