import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function JobHero() {
  return (
    <View style={styles.container}>
      <View style={styles.activeBadge}>
        <View style={styles.activeDot} />
        <Text style={styles.activeBadgeText}>Active Posting</Text>
      </View>
      <Text style={styles.jobTitle}>Senior Product Designer</Text>
      <Text style={styles.companyName}>Lumina Global Systems • Remote, Global</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 80, 212, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: 1.5,
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    letterSpacing: -1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
});
