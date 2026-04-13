import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function JobDescription() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Job Description</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.text}>
          Lumina Global Systems is seeking a visionary Senior Product Designer to join our Academic
          Excellence wing. You will be responsible for defining the user journey for over 2
          million students worldwide, focusing on modular learning paths and achievement
          visualization.
        </Text>
        <Text style={styles.text}>
          The ideal candidate possesses a deep understanding of academic workflows and has a proven
          track record of creating sophisticated, high-density data dashboards that feel intuitive
          and editorial.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  content: {
    gap: SPACING.md,
  },
  text: {
    fontSize: 15,
    fontFamily: 'Manrope-Medium',
    color: COLORS.onSurfaceVariant,
    lineHeight: 24,
  },
});
