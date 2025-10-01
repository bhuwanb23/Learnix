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

export default function ExamCard({ exam, onPastPapers, onAIPrep }) {
  const getDaysLeft = () => {
    const now = new Date();
    const examDate = new Date(exam.date);
    const diffTime = examDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upcoming Exams</Text>
      
      <View style={styles.examCard}>
        <View style={styles.examHeader}>
          <View style={styles.examInfo}>
            <Text style={styles.examTitle}>{exam.title}</Text>
            <Text style={styles.examDescription}>{exam.description}</Text>
          </View>
          <View style={styles.examDate}>
            <Text style={styles.daysLeft}>{getDaysLeft()}</Text>
            <Text style={styles.daysText}>days left</Text>
          </View>
        </View>

        <View style={styles.examDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{formatDuration(exam.duration)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{exam.totalMarks} marks</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.pastPapersButton]}
            onPress={onPastPapers}
          >
            <Ionicons name="document-text-outline" size={16} color="#8B5CF6" />
            <Text style={[styles.actionButtonText, { color: '#8B5CF6' }]}>
              Past Papers
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.aiPrepButton]}
            onPress={onAIPrep}
          >
            <Ionicons name="bulb-outline" size={16} color="#3B82F6" />
            <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
              AI Prep
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  examInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  examTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
    numberOfLines: 2,
    lineHeight: 18,
  },
  examDescription: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    letterSpacing: 0.1,
    numberOfLines: 2,
    lineHeight: 16,
  },
  examDate: {
    alignItems: 'center',
  },
  daysLeft: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B5CF6',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  daysText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
  examDetails: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
    letterSpacing: 0.1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  pastPapersButton: {
    backgroundColor: '#F3E8FF',
  },
  aiPrepButton: {
    backgroundColor: '#EFF6FF',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
});
