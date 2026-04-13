import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../constants/theme';

export default function SubmitButton({ isDisabled, onPress }) {
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isDisabled && styles.containerDisabled
      ]} 
      activeOpacity={0.85}
      onPress={onPress}
    >
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.buttonText}>Confirm Application</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  gradient: {
    paddingVertical: SPACING.lg + 2,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
