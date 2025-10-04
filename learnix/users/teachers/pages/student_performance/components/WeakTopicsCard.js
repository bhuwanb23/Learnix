import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../constants/theme';
import { COLOR_MAP } from '../constants/performanceData';

export default function WeakTopicsCard({ topics }) {
  const getProgressColor = (percentage) => {
    if (percentage < 40) return COLOR_MAP.red.primary;
    if (percentage < 60) return COLOR_MAP.orange.primary;
    return COLOR_MAP.yellow.primary;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weak Topics Detected</Text>
        <Ionicons name="warning-outline" size={20} color={COLOR_MAP.orange.primary} />
      </View>
      
      <View style={styles.topicsList}>
        {topics.map((topic) => (
          <View key={topic.id} style={styles.topicItem}>
            <Text style={styles.topicName}>{topic.subject}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${topic.percentage}%`,
                      backgroundColor: getProgressColor(topic.percentage)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.percentage}>{topic.percentage}%</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary
  },
  topicsList: {
    gap: SPACING.sm
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  topicName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    flex: 1
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  progressBar: {
    width: 64,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full
  },
  percentage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    minWidth: 32,
    textAlign: 'right'
  }
});
