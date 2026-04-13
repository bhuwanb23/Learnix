import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function ApplyFooter({ navigation }) {
  const handleApplyNow = () => {
    if (navigation) {
      navigation.navigate('JobApply', {});
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
        <Text style={styles.saveButtonText}>Save for Later</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.applyButton} 
        activeOpacity={0.85}
        onPress={handleApplyNow}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(245, 247, 249, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(171, 173, 175, 0.1)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  applyButton: {
    flex: 2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
});
