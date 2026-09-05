import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function StatCard({ icon, value, label, subtitle, color = '#7c3aed', onPress, compact }) {
  const content = (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '1A' }]}>
        <Ionicons name={icon} size={compact ? 16 : 20} color={color} />
      </View>
      <Text style={[styles.value, compact && styles.compactValue]}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity style={styles.wrapper} onPress={onPress} activeOpacity={0.8}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  compactCard: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  compactValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
});