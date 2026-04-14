import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function CoverLetter({ value, onChangeText }) {
  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(162, 56, 0, 0.05)' }]}>
            <Ionicons name="create-outline" size={22} color={COLORS.tertiary} />
          </View>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Tell us why you are a great fit for Lumina..."
          placeholderTextColor={COLORS.outlineVariant}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: BORDER_RADIUS.lg + 4,
    padding: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg + SPACING.xs,
    paddingTop: SPACING.lg + SPACING.xs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 0,
    borderRadius: BORDER_RADIUS.lg - 2,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 15,
    fontFamily: 'Manrope-SemiBold',
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 150,
    paddingTop: SPACING.md + 4,
  },
});
