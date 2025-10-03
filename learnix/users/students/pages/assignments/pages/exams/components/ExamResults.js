import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';
import { getScoreColor } from '../constants/examData';

export default function ExamResults({ completedExams, stats, onViewDetails }) {
  return (
    <View style={styles.container}>
      <View style={styles.overviewSection}>
        <LinearGradient
          colors={['#F0FDF4', '#D1FAE5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.overviewCard}
        >
          <Text style={styles.overviewTitle}>Overall Performance</Text>
          
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Average Score</Text>
            <Text style={styles.scoreValue}>{stats.averageScore}%</Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${stats.averageScore}%` }
                ]} 
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.resultsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Results</Text>
        </View>

        <View style={styles.resultsList}>
          {completedExams.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.resultCard}
              onPress={() => onViewDetails(exam)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#F9FAFB', '#F3F4F6']}
                start={{ x: 0, y: 0 }}

                end={{ x: 1, y: 1 }}
                style={styles.resultGradient}
              >
                <View style={styles.resultHeader}>
                  <Text style={styles.examTitle}>{exam.title}</Text>
                  <Text style={[styles.examScore, { color: getScoreColor(exam.score) }]}>
                    {exam.score}%
                  </Text>
                </View>

                <View style={styles.scoringBreakdown}>
                  <View style={styles.performanceMetrics}>
                    <Text style={styles.metricLabel}>Strengths:</Text>
                    <Text style={styles.metricValue}>{exam.strengths.join(', ')}</Text>
                  </View>
                  <View style={styles.performanceMetrics}>
                    <Text style={styles.metricLabel}>Weaknesses:</Text>
                    <Text style={styles.metricValue}>{exam.weaknesses.join(', ')}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  overviewSection: {
    marginBottom: SPACING.lg,
  },
  overviewCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  overviewTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
  },
  scoreValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#059669',
  },
  progressBarContainer: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.full,
    height: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#F3F4F6',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: BORDER_RADIUS.full,
  },
  resultsSection: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  resultsList: {
    gap: SPACING.sm,
  },
  resultCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultGradient: {
    padding: SPACING.md,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  examTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  examScore: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scoringBreakdown: {
    marginBottom: SPACING.md,
  },
  performanceMetrics: {
    marginBottom: SPACING.xs,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  viewDetailsButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
  },
});
