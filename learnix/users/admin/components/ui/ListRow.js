import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

export default function ListRow({
  icon,
  iconColor = '#7c3aed',
  title,
  subtitle,
  right,
  onPress,
  chevron = true,
  badge,
  badgeColor = '#7c3aed',
}) {
  const renderRight = () => {
    if (right) return right;
    if (badge) {
      return (
        <View style={[styles.badge, { backgroundColor: badgeColor + '1A' }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      );
    }
    if (chevron) {
      return <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />;
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {icon ? (
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '1A' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {renderRight()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
});