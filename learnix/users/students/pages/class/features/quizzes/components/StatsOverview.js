import React from 'react';
import {
  View,
  Text,
  StyleSheet
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function StatsOverview({ stats }) {
  const statItems = [
    {
      id: 'score',
      label: 'Score',
      value: `${stats.score}%`,
      icon: 'trophy-outline',
      gradient: ['#EFF6FF', '#DBEAFE'],
      iconColor: '#3B82F6',
      textColor: '#2563EB'
    },
    {
      id: 'accuracy',
      label: 'Accuracy',
      value: `${stats.accuracy}%`,
      icon: 'target-outline',
      gradient: ['#F0FDF4', '#DCFCE7'],
      iconColor: '#22C55E',
      textColor: '#16A34A'
    },
    {
      id: 'tests',
      label: 'Tests',
      value: stats.testsCompleted.toString(),
      icon: 'time-outline',
      gradient: ['#FAF5FF', '#F3E8FF'],
      iconColor: '#A855F7',
      textColor: '#9333EA'
    }
  ];

  return (
    <View style={styles.container}>
      {statItems.map((item) => (
        <LinearGradient
          key={item.id}
          colors={item.gradient}
          style={styles.statCard}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.iconColor }]}>
            <Ionicons name={item.icon} size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.value, { color: item.textColor }]}>{item.value}</Text>
        </LinearGradient>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: '#FFFFFF',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});
