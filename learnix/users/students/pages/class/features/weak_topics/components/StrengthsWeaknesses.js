import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function StrengthsWeaknesses({ subjects }) {
  if (!subjects || subjects.length === 0) {
    return null;
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'strong':
        return '#22C55E';
      case 'average':
        return '#F59E0B';
      case 'weak':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'strong':
        return 'Strong';
      case 'average':
        return 'Average';
      case 'weak':
        return 'Weak';
      default:
        return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Strengths & Weaknesses</Text>
      
      <View style={styles.subjectsContainer}>
        {subjects.map((subject) => (
          <LinearGradient
            key={subject.id}
            colors={[subject.bgColor, '#FFFFFF']}
            style={[styles.subjectCard, { borderColor: subject.borderColor }]}
          >
            {/* Header */}
            <View style={styles.subjectHeader}>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(subject.status) }]}>
                <Text style={styles.statusText}>{getStatusText(subject.status)}</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBackground, { backgroundColor: subject.borderColor }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${subject.accuracy}%`,
                      backgroundColor: subject.color,
                    },
                  ]}
                />
              </View>
            </View>
            
            {/* Accuracy and Weak Topics */}
            <View style={styles.subjectFooter}>
              <Text style={[styles.accuracyText, { color: subject.color }]}>
                {subject.accuracy}% accuracy
                {subject.status === 'weak' && ' - Needs attention'}
              </Text>
              
              {subject.weakTopics && subject.weakTopics.length > 0 && (
                <View style={styles.weakTopicsContainer}>
                  <Text style={styles.weakTopicsLabel}>Weak topics:</Text>
                  <View style={styles.weakTopicsList}>
                    {subject.weakTopics.map((topic, index) => (
                      <View key={index} style={styles.weakTopicTag}>
                        <Text style={styles.weakTopicText}>{topic}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md, // Reduced padding
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  subjectsContainer: {
    gap: SPACING.md,
  },
  subjectCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, // Reduced padding
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm, // Reduced margin
  },
  subjectName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs, // Reduced padding
    paddingVertical: 2, // Reduced padding
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: '#FFFFFF',
  },
  progressContainer: {
    marginBottom: SPACING.sm, // Reduced margin
  },
  progressBackground: {
    height: 6, // Reduced height
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectFooter: {
    gap: SPACING.sm,
  },
  accuracyText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  weakTopicsContainer: {
    gap: SPACING.xs,
  },
  weakTopicsLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  weakTopicsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  weakTopicTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.xs, // Reduced padding
    paddingVertical: 2, // Reduced padding
    borderRadius: BORDER_RADIUS.sm,
  },
  weakTopicText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
});
