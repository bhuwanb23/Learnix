import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';
import { getDaysUntilDue } from '../hooks/useDashboardData';

export default function PendingAssignments({ assignments, onAssignmentPress }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#F87171';
      case 'medium': return '#FB923C';
      case 'low': return '#34D399';
      default: return '#6B7280';
    }
  };

  const getDueText = (dueDate) => {
    const now = new Date();
    const diffInMs = dueDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) return 'Overdue';
    if (diffInDays === 0) return 'Due Today';
    if (diffInDays === 1) return 'Due Tomorrow';
    return `Due in ${diffInDays} days`;
  };

  const getDueColor = (dueDate) => {
    const now = new Date();
    const diffInMs = dueDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) return '#EF4444';
    if (diffInDays <= 1) return '#EF4444';
    if (diffInDays <= 3) return '#F97316';
    return '#10B981';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Assignments</Text>
        <Text style={styles.count}>{assignments.length} due soon</Text>
      </View>
      
      <View style={styles.assignmentsList}>
        {assignments.map((assignment) => (
          <TouchableOpacity
            key={assignment.id}
            style={styles.assignmentCard}
            onPress={() => onAssignmentPress && onAssignmentPress(assignment)}
            activeOpacity={0.7}
          >
            <View style={styles.assignmentContent}>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.assignmentSubject}>{assignment.subject}</Text>
              </View>
              
              <View style={styles.assignmentStatus}>
                <Text style={[
                  styles.dueText, 
                  { color: getDueColor(assignment.dueDate) }
                ]}>
                  {getDueText(assignment.dueDate)}
                </Text>
                <Text style={styles.dueDate}>
                  {assignment.dueDate.toLocaleDateString()}
                </Text>
              </View>
            </View>
            
            <View style={styles.priorityIndicator}>
              <View style={[
                styles.priorityDot,
                { backgroundColor: assignment.priorityColor }
              ]} />
              <Text style={styles.priorityText}>
                {assignment.priority.charAt(0).toUpperCase() + 
                 assignment.priority.slice(1)} Priority
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  assignmentsList: {
    gap: SPACING.sm,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  assignmentContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  assignmentSubject: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
  assignmentStatus: {
    alignItems: 'flex-end',
  },
  dueText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  dueDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
  },
});
