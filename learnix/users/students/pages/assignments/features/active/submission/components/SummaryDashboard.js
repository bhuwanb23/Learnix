import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SUBMISSION_COLORS } from '../constants/submissionData';

export default function SummaryDashboard({ submission }) {
  return (
    <View style={styles.container}>
      <View style={styles.statCard}>
        <View style={[styles.iconCircle, { backgroundColor: `${SUBMISSION_COLORS.primary}15` }]}>
          <MaterialIcons name="analytics" size={24} color={SUBMISSION_COLORS.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statLabel}>Weight</Text>
          <Text style={styles.statValue}>{submission.weight}</Text>
        </View>
      </View>

      <View style={styles.statCard}>
        <View style={[styles.iconCircle, { backgroundColor: `${SUBMISSION_COLORS.tertiary}15` }]}>
          <MaterialIcons name="timer" size={24} color={SUBMISSION_COLORS.tertiary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statLabel}>Estimated Time</Text>
          <Text style={styles.statValue}>{submission.estimatedTime}</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPercent}>{submission.progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${submission.progress}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    gap: 2,
  },
  statLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    fontWeight: '600',
    color: SUBMISSION_COLORS.onSurfaceVariant,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: SUBMISSION_COLORS.onSurface,
  },
  progressCard: {
    flex: 2,
    backgroundColor: SUBMISSION_COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    fontWeight: '600',
    color: SUBMISSION_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressPercent: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: SUBMISSION_COLORS.primary,
  },
  progressBar: {
    height: 10,
    backgroundColor: SUBMISSION_COLORS.surfaceContainer,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: SUBMISSION_COLORS.primary,
    borderRadius: 5,
  },
});
