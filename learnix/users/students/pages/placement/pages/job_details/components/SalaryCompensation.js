import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function SalaryCompensation() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cash" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Salary & Compensation</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.salaryRow}>
          <Text style={styles.salaryAmount}>$120k - $160k</Text>
          <Text style={styles.salaryPeriod}>/ year</Text>
        </View>
        <View style={styles.benefits}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
            <Text style={styles.benefitText}>Performance Bonus (15%)</Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.secondary} />
            <Text style={styles.benefitText}>Equity Options</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  content: {
    gap: SPACING.md,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  salaryAmount: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.textPrimary,
  },
  salaryPeriod: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
  },
  benefits: {
    gap: SPACING.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  benefitText: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
  },
});
