import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function DeadlineCard() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Application Deadline</Text>
      <Text style={styles.date}>15 Oct</Text>
      <Text style={styles.remaining}>Remaining: 12 Days</Text>
      {/* Decorative Circle */}
      <View style={styles.decorativeCircle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.sm,
    position: 'relative',
    zIndex: 10,
  },
  date: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.extraBold,
    color: COLORS.white,
    marginBottom: 4,
    position: 'relative',
    zIndex: 10,
  },
  remaining: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    position: 'relative',
    zIndex: 10,
  },
  decorativeCircle: {
    position: 'absolute',
    right: -30,
    bottom: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
