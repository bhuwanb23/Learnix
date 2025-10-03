import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function QuickStats({ stats }) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <View style={[styles.statCard, styles.upcomingCard]}>
          <View style={styles.statHeader}>
            <Ionicons name="time-outline" size={16} color="#2563EB" />
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <Text style={styles.statValue}>{stats.upcomingCount}</Text>
        </View>

        <View style={[styles.statCard, styles.completedCard]}>
          <View style={styles.statHeader}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <Text style={styles.statValue}>{stats.completedCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
  },
  upcomingCard: {
    backgroundColor: '#EBF8FF', // bg-blue-50 equivalent
  },
  completedCard: {
    backgroundColor: '#F0FDF4', // bg-green-50 equivalent
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: '#1E40AF', // text-blue-800 equivalent
    marginLeft: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#1E3A8A', // text-blue-900 equivalent
  },
});
