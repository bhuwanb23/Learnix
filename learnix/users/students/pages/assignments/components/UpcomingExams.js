import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function UpcomingExams({ exams, onExamPress }) {
  const getTimeUntilExam = (examDate) => {
    const now = new Date();
    const diffInMs = examDate - now;
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));
    
    if (diffInDays < 0) return 'Past due';
    if (diffInDays === 0) {
      const hours = Math.ceil(diffInHours);
      return hours > 0 ? `${hours} hours` : 'Today';
    }
    if (diffInDays === 1) return `1 day ${24 - Math.floor(diffInHours)} hours`;
    return `${diffInDays} days ${24 - Math.floor(diffInHours)} hours`;
  };

  const formatExamDate = (examDate) => {
    return examDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Exams</Text>
        <Text style={styles.count}>{exams.length} this week</Text>
      </View>
      
      <View style={styles.examsList}>
        {exams.map((exam) => (
          <TouchableOpacity
            key={exam.id}
            style={styles.examCard}
            onPress={() => onExamPress && onExamPress(exam)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[exam.gradientFrom, exam.gradientTo]}
              style={styles.examGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.examHeader}>
                <Text style={[styles.examTitle, { color: `${exam.color}DC` }]}>
                  {exam.title}
                </Text>
                <Ionicons 
                  name="time-outline" 
                  size={16} 
                  color={exam.color} 
                />
              </View>
              
              <Text style={styles.examSubject}>
                {exam.subject}
              </Text>
              
              <View style={styles.examFooter}>
                <View style={styles.examTime}>
                  <Text style={[styles.timeText, { color: exam.color }]}>
                    {getTimeUntilExam(exam.examDate)}
                  </Text>
                  <Text style={styles.dateText}>
                    {formatExamDate(exam.examDate)}
                  </Text>
                </View>
                
                <View style={[styles.readinessBadge, { backgroundColor: exam.color }]}>
                  <Text style={styles.readinessText}>
                    Ready: {exam.readiness}%
                  </Text>
                </View>
              </View>
            </LinearGradient>
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
  examsList: {
    gap: SPACING.sm,
  },
  examCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  examGradient: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  examTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  examSubject: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    opacity: 0.8,
    marginBottom: SPACING.sm,
  },
  examFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examTime: {
    flex: 1,
  },
  timeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 2,
  },
  dateText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    opacity: 0.7,
  },
  readinessBadge: {
        paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  readinessText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
});
