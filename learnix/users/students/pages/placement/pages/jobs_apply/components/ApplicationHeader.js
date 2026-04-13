import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, SPACING, BORDER_RADIUS } from '../../../../../../constants/theme';

export default function ApplicationHeader({ onGoBack }) {
  return (
    <View style={styles.topBar}>
      <TouchableOpacity 
        style={styles.backButton} 
        activeOpacity={0.7}
        onPress={onGoBack}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.title}>Application Process</Text>
      <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.1)',
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '700',
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
  },
  menuButton: {
    padding: SPACING.xs,
  },
});
