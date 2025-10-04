import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';
import { COLOR_MAP } from '../constants/performanceData';

export default function SummaryCard({ data, color }) {
  const colorConfig = COLOR_MAP[color] || COLOR_MAP.blue;
  
  return (
    <View style={[styles.container, { backgroundColor: colorConfig.primary }]}>
      <View style={styles.header}>
        <Ionicons 
          name={data.icon} 
          size={20} 
          color={colorConfig.light} 
        />
        <View style={styles.changeBadge}>
          <Text style={styles.changeText}>{data.change}</Text>
        </View>
      </View>
      
      <Text style={styles.value}>
        {data.rate ? `${data.rate}%` : data.score}
      </Text>
      
      <Text style={styles.label}>
        {data.rate ? 'Attendance Rate' : 'Exam Average'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs
  },
  changeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full
  },
  changeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.weights.medium
  },
  value: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    marginBottom: SPACING.xs
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)'
  }
});
