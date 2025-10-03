import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../../../../constants/theme';
import { getStatusConfig, getPriorityConfig } from '../constants/assignmentData';

export default function AssignmentCard({ assignment, onPress, variant = 'default' }) {
  const statusConfig = getStatusConfig(assignment.status);
  const priorityConfig = getPriorityConfig(assignment.priority);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getActionText = () => {
    switch (assignment.status) {
      case 'not_started':
        return 'View Details';
      case 'in_progress':
        return 'Continue';
      case 'ready_to_submit':
        return 'Submit';
      case 'submitted':
        return 'View Submission';
      case 'graded':
        return 'View Feedback';
      default:
        return 'View Details';
    }
  };

  const renderSubmittedInfo = () => {
    if (variant === 'submitted') {
      return (
        <View style={styles.submittedInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={12} color={statusConfig.color} />
            <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
              Submitted: {formatDate(assignment.submittedDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="document-text" size={12} color={COLORS.textSecondary} />
            <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
              {assignment.fileName}
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderGradedInfo = () => {
    if (variant === 'graded') {
      return (
        <View style={styles.gradedInfo}>
          <View style={styles.gradeDisplay}>
            <Text style={styles.gradeScore}>{assignment.score}%</Text>
            <Text style={styles.gradeLetter}>{assignment.grade}</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderTimeInfo = () => {
    if (variant === 'default' || variant === 'pending') {
      return (
        <View style={styles.timeInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
            <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
              Due: {formatDate(assignment.dueDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
            <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
              {assignment.timeLeft}
            </Text>
          </View>
        </View>
      );
    } else if (variant === 'graded') {
      return (
        <View style={styles.timeInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={12} color="#10B981" />
            <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
              Graded: {formatDate(assignment.gradedDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="trophy-outline" size={12} color="#10B981" />
            <Text style={[styles.infoText, { color: '#10B981' }]}>
              Excellent
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderProgressBar = () => {
    if (assignment.progress > 0 && variant !== 'submitted' && variant !== 'graded') {
      return (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercentage}>{assignment.progress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${assignment.progress}%`,
                  backgroundColor: statusConfig.color
                }
              ]} 
            />
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(assignment)}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{assignment.title}</Text>
          <Text style={styles.courseInfo}>
            {assignment.course} • {assignment.courseCode}
          </Text>
        </View>
        
        {variant === 'graded' ? (
          renderGradedInfo()
        ) : (
          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.badgeColor }]}>
            <Text style={[styles.priorityText, { color: '#FFFFFF' }]}>
              {priorityConfig.label}
            </Text>
          </View>
        )}
      </View>

      {variant === 'submitted' ? renderSubmittedInfo() : renderTimeInfo()}
      
      {renderProgressBar()}

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.statusText, { color: COLORS.textSecondary }]}>
            {statusConfig.label}
          </Text>
        </View>
        <Text style={styles.actionText}>{getActionText()}</Text>
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
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  courseInfo: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  priorityBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  gradeDisplay: {
    alignItems: 'flex-end',
  },
  gradeScore: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#10B981',
  },
  gradeLetter: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  submittedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  gradedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    marginLeft: SPACING.xs,
  },
  progressContainer: {
    marginBottom: SPACING.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.xs,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  actionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.primary,
  },
});
