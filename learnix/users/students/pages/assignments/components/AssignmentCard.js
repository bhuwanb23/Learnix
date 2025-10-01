import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';
import { getStatusColor, getStatusText } from '../constants/assignmentData';

export default function AssignmentCard({ assignment, onPress, onActionPress }) {
  const getDueDateText = () => {
    if (!assignment || !assignment.dueDate) {
      return 'No due date';
    }
    
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Overdue';
    } else if (diffDays === 0) {
      return 'Due Today';
    } else if (diffDays === 1) {
      return 'Due Tomorrow';
    } else {
      return `${diffDays} days left`;
    }
  };

  const getStatusBadgeColor = () => {
    if (!assignment || !assignment.dueDate) {
      return '#6B7280'; // Gray
    }
    
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return '#EF4444'; // Red
    } else if (diffDays <= 1) {
      return '#F59E0B'; // Yellow
    } else {
      return '#10B981'; // Green
    }
  };

  const getActionText = () => {
    if (!assignment || assignment.progress === undefined) {
      return 'Start';
    }
    
    if (assignment.progress === 0) {
      return 'Start';
    } else if (assignment.progress === 100) {
      return 'Review';
    } else {
      return 'Continue';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: (assignment && assignment.status ? getStatusColor(assignment.status) : '#6B7280') + '40' }
      ]}
      onPress={() => onPress(assignment)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{assignment && assignment.title ? assignment.title : 'Untitled Assignment'}</Text>
          <Text style={styles.description}>{assignment && assignment.description ? assignment.description : 'No description'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (assignment && assignment.dueDate ? getStatusBadgeColor() : '#6B7280') + '20' }]}>
          <Text style={[styles.statusText, { color: assignment && assignment.dueDate ? getStatusBadgeColor() : '#6B7280' }]}>
            {assignment && assignment.dueDate ? getDueDateText() : 'No due date'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${assignment && assignment.progress ? assignment.progress : 0}%`,
                  backgroundColor: assignment && assignment.status ? getStatusColor(assignment.status) : '#6B7280',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{assignment && assignment.progress ? assignment.progress : 0}%</Text>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onActionPress(assignment)}
        >
          <Text style={styles.actionText}>{getActionText()}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    numberOfLines: 2,
    lineHeight: 18,
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    letterSpacing: 0.1,
    numberOfLines: 2,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    marginRight: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: '#6b7280',
    minWidth: 30,
    textAlign: 'right',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
  actionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
});
