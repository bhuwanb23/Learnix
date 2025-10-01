import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function EventStats({ stats }) {
  const statItems = [
    {
      icon: 'calendar-outline',
      label: 'Today',
      value: stats?.today || 0,
      color: '#3B82F6',
    },
    {
      icon: 'people-outline',
      label: 'Attending',
      value: stats?.attending || 0,
      color: '#10B981',
    },
    {
      icon: 'star-outline',
      label: 'Favorites',
      value: stats?.favorites || 0,
      color: '#F59E0B',
    },
    {
      icon: 'time-outline',
      label: 'Upcoming',
      value: stats?.upcoming || 0,
      color: '#8B5CF6',
    },
  ];

  return (
    <View style={styles.container}>
      {statItems.map((item, index) => (
        <View key={index} style={styles.statItem}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <Text style={styles.statValue}>{item.value}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
