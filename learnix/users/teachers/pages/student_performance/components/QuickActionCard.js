import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';
import { COLOR_MAP } from '../constants/performanceData';

export default function QuickActionCard({ action, onPress }) {
  const colorConfig = COLOR_MAP[action.color] || COLOR_MAP.blue;
  
  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colorConfig.primary }]}
      onPress={() => onPress(action)}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Ionicons 
          name={action.icon} 
          size={28} 
          color={colorConfig.light} 
        />
      </View>
      
      <Text style={styles.title}>{action.title}</Text>
      <Text style={styles.subtitle}>{action.subtitle}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 120,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    ...SHADOWS.sm
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.white,
    marginBottom: SPACING.xs,
    textAlign: 'center',
    lineHeight: 18
  },
  subtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 14
  }
});
