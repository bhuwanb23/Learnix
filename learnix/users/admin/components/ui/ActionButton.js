import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../constants/theme';

export default function ActionButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
}) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        isPrimary && styles.primary,
        isDanger && styles.danger,
        variant === 'secondary' && styles.secondary,
        (disabled || loading) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary || isDanger ? '#ffffff' : '#7c3aed'} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={16}
              color={isPrimary || isDanger ? '#ffffff' : '#7c3aed'}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              (isPrimary || isDanger) && styles.primaryLabel,
              variant === 'secondary' && styles.secondaryLabel,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: '#7c3aed',
  },
  danger: {
    backgroundColor: '#dc2626',
  },
  secondary: {
    backgroundColor: '#7c3aed1A',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    fontFamily: 'Manrope-SemiBold',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: '#7c3aed',
  },
});