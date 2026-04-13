import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY } from '../../../../../constants/theme';

export default function PlacementHeader() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, Alex</Text>
      <Text style={styles.subtitle}>
        Your placement journey is 85% complete. You're in the top 5% of your cohort.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(44, 47, 49, 0.7)',
    lineHeight: 20,
  },
});
