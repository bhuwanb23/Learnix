import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SPACING } from '../../../../constants/theme';

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
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary || isDanger ? '#ffffff' : '#0050d4'} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={16}
              color={isPrimary || isDanger ? '#ffffff' : '#0050d4'}
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
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: '#0050d4',
    shadowColor: '#0050d4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  danger: {
    backgroundColor: '#dc2626',
  },
  secondary: {
    backgroundColor: '#2563eb14',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  primaryLabel: {
    color: '#ffffff',
  },
  secondaryLabel: {
    color: '#0050d4',
  },
});