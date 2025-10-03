import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../../constants/theme';
import { getExamTypeConfig, getScoreColor, getGradeConfig } from '../constants/examData';

export default function ExamCard({ exam, variant = 'upcoming', onPress }) {
  const typeConfig = getExamTypeConfig(exam.type);
  const scoreConfig = variant === 'completed' ? getGradeConfig(exam.score) : null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getButtonText = () => {
    if (variant === 'upcoming') {
      return exam.canStart ? 'Start Exam' : 'View Instructions';
    } else if (variant === 'completed') {
      return 'View Details';
    }
    return 'Start';
  };

  const getButtonColor = () => {
    if (variant === 'upcoming') {
      return exam.canStart ? COLORS.primary : COLORS.border;
    } else if (variant === 'completed') {
      return COLORS.border;
    }
    return COLORS.primary;
  };

  const renderUpcomingInfo = () => (
    <View style={styles.examInfo}>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
        <Text style={styles.infoText}>{formatDate(exam.date)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
        <Text style={styles.infoText}>{exam.time}</Text>
      </View>
    </View>
  );

  const renderCompletedInfo = () => (
    <View style={styles.examInfo}>
      <View style={styles.infoRow}>
        <Ionicons name="checkmark-circle" size={12} color="#059669" />
        <Text style={styles.infoText}>{formatDate(exam.completedDate)}</Text>
      </View>
      <View style={styles.scoreDisplay}>
        <Text style={[styles.scoreText, { color: getScoreColor(exam.score) }]}>
          {exam.score}%
        </Text>
        <Text style={styles.gradeText}>{exam.grade}</Text>
      </View>
    </View>
  );

  const renderPracticeInfo = () => (
    <View style={styles.practiceInfo}>
      <Text style={styles.practiceDescription}>{exam.description}</Text>
      {exam.subjects && (
        <View style={styles.subjectsContainer}>
          {exam.subjects.map((subject, index) => (
            <View key={subject} style={styles.subjectChip}>
              <Text style={styles.subjectText}>{subject}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(exam)}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{exam.title}</Text>
          <Text style={styles.subject}>{exam.subject}</Text>
        </View>
        
        {variant === 'upcoming' ? (
          <View style={[styles.typeBadge, { backgroundColor: typeConfig.badgeColor }]}>
            <Text style={[styles.typeText, { color: typeConfig.textColor }]}>
              {typeConfig.label}
            </Text>
          </View>
        ) : variant === 'completed' ? (
          <View style={styles.scoreBadge}>
            <Text style={[styles.scoreLabel, { color: getScoreColor(exam.score) }]}>
              {scoreConfig?.label || 'Unknown'}
            </Text>
          </View>
        ) : null}
      </View>

      {variant === 'upcoming' && renderUpcomingInfo()}
      {variant === 'completed' && renderCompletedInfo()}
      {variant === 'practice' && renderPracticeInfo()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: getButtonColor() }
          ]}
          onPress={() => onPress(exam)}
        >
          <Text style={[
            styles.actionButtonText,
            { color: getButtonColor() === COLORS.primary ? COLORS.white : COLORS.textPrimary }
          ]}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subject: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  typeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  scoreBadge: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  examInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  gradeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  practiceInfo: {
    marginBottom: SPACING.sm,
  },
  practiceDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  subjectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  subjectChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  subjectText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  footer: {
    marginTop: SPACING.sm,
  },
  actionButton: {
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
