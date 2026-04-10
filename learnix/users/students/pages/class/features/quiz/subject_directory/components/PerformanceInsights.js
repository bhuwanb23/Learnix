import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { QUIZ_COLORS } from '../constants/quizData';

export default function PerformanceInsights({ data }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Performance Insights</Text>
          <Text style={styles.subtitle}>Tracking your progress across academic domains</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {data.subjects.map((subject, index) => (
              <View key={index} style={styles.barContainer}>
                <View style={[styles.bar, { height: `${subject.score}%`, backgroundColor: subject.color }]} />
                <Text style={styles.barLabel}>{subject.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.masterySection}>
            <Text style={styles.masteryLabel}>Mastery Level</Text>
            <Text style={styles.masteryValue}>{data.masteryLevel}</Text>
          </View>

          <View style={styles.statsContent}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Quizzes Completed</Text>
              <Text style={styles.statValue}>{data.quizzesCompleted}</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${data.progressPercent}%` }]} />
            </View>

            <Text style={styles.encouragement}>"{data.encouragement}"</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_COLORS.onSurface,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: QUIZ_COLORS.onSurfaceVariant,
  },
  grid: {
    gap: 12,
  },
  chartCard: {
    backgroundColor: QUIZ_COLORS.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    gap: 8,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statsCard: {
    backgroundColor: QUIZ_COLORS.primary,
    padding: 16,
    borderRadius: 12,
  },
  masterySection: {
    marginBottom: 14,
  },
  masteryLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_COLORS.primaryContainer,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  masteryValue: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
  },
  statsContent: {
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
  progressBar: {
    height: 6,
    backgroundColor: QUIZ_COLORS.primaryDim,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: QUIZ_COLORS.primaryContainer,
    borderRadius: 3,
  },
  encouragement: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
