import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function EligibilityCriteria() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="school" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Eligibility</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.criteriaItem}>
          <View style={styles.iconBox}>
            <Ionicons name="star" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.criteriaInfo}>
            <Text style={styles.criteriaLabel}>Min. GPA</Text>
            <Text style={styles.criteriaValue}>3.5 / 4.0</Text>
          </View>
        </View>
        <View style={styles.criteriaItem}>
          <View style={styles.iconBox}>
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.criteriaInfo}>
            <Text style={styles.criteriaLabel}>Batch</Text>
            <Text style={styles.criteriaValue}>2024 & 2025</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  criteriaInfo: {
    flex: 1,
  },
  criteriaLabel: {
    fontSize: 13,
    fontFamily: 'Manrope-Bold',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  criteriaValue: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
  },
});
