import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';
import { QUIZ_ACTION_TYPES } from '../constants/quizData';

export default function SubjectsList({ 
  subjects, 
  onSubjectAction, 
  onViewAll 
}) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Subjects</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {subjects.map((subject) => (
          <View key={subject.id} style={styles.subjectCard}>
            <View style={styles.subjectHeader}>
              <View style={styles.subjectInfo}>
                <View style={[styles.iconContainer, { backgroundColor: subject.iconBg }]}>
                  <Ionicons 
                    name={subject.icon} 
                    size={20} 
                    color={subject.iconColor} 
                  />
                </View>
                <View style={styles.subjectDetails}>
                  <Text style={styles.subjectName}>{subject.name}</Text>
                  <Text style={styles.lastActivity}>Last: {subject.lastActivity}</Text>
                </View>
              </View>
              
              <View style={styles.scoreSection}>
                <Text style={[styles.scoreText, { color: subject.progressColor }]}>
                  {subject.score}%
                </Text>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${subject.progress}%`,
                          backgroundColor: subject.progressColor
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.practiceButton}
                onPress={() => onSubjectAction(subject.id, QUIZ_ACTION_TYPES.SUBJECT_PRACTICE)}
                activeOpacity={0.7}
              >
                <Text style={styles.practiceButtonText}>Practice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.testButton}
                onPress={() => onSubjectAction(subject.id, QUIZ_ACTION_TYPES.TIMED_TEST)}
                activeOpacity={0.7}
              >
                <Text style={styles.testButtonText}>Timed Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#3B82F6',
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  lastActivity: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    width: 64,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    marginRight: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  practiceButton: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  practiceButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#2563EB',
  },
  testButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textSecondary,
  },
});
