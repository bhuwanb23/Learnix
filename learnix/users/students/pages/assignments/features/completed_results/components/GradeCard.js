import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

export default function GradeCard({ results }) {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundBlur} />
      <View style={styles.content}>
        <Text style={styles.label}>Final Evaluation</Text>
        <View style={styles.gradeRow}>
          <Text style={styles.grade}>{results.grade}</Text>
          <Text style={styles.totalGrade}>/ {results.totalGrade}</Text>
        </View>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{results.evaluation}</Text>
          </View>
          <Text style={styles.rankText}>{results.classRank}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_RESULTS_COLORS.primary,
    margin: 16,
    borderRadius: 12,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundBlur: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(241, 242, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 24,
  },
  grade: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 56,
    fontWeight: '800',
    color: COMPLETED_RESULTS_COLORS.onPrimary,
    letterSpacing: -2,
  },
  totalGrade: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(241, 242, 255, 0.6)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onPrimary,
  },
  rankText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(241, 242, 255, 0.9)',
  },
});
