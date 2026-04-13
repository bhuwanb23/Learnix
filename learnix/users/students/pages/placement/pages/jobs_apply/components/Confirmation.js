import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function Confirmation({ isConfirmed, onToggle }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.checkboxRow}
        activeOpacity={0.7}
        onPress={onToggle}
      >
        <View style={[styles.checkbox, isConfirmed && styles.checkboxChecked]}>
          {isConfirmed && (
            <Ionicons name="checkmark" size={16} color={COLORS.white} />
          )}
        </View>
        <Text style={styles.confirmationText}>
          I confirm that the information provided is accurate and I agree to the{' '}
          <Text style={styles.linkText}>Privacy Policy</Text> and{' '}
          <Text style={styles.linkText}>Terms of Service</Text>.
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  confirmationText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  linkText: {
    color: COLORS.primary,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
  },
});
