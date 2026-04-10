import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_ATTEMPT_COLORS } from '../constants/quizAttemptData';

export default function ProgressIndicator({ current, total, time }) {
  const completedQuestions = current - 1;
  const remainingQuestions = total - current;
  
  // Create segments array
  const segments = [];
  for (let i = 0; i < completedQuestions && i < 10; i++) {
    segments.push('completed');
  }
  segments.push('current');
  for (let i = 0; i < remainingQuestions && segments.length < 10; i++) {
    segments.push('remaining');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.questionText}>Question {current} of {total}</Text>
        <View style={styles.timerBadge}>
          <Ionicons name="timer-outline" size={14} color={QUIZ_ATTEMPT_COLORS.primary} />
          <Text style={styles.timerText}>{time}</Text>
        </View>
      </View>

      <View style={styles.progressBars}>
        {segments.map((type, index) => (
          <View key={index} style={styles.segmentContainer}>
            <View style={[
              styles.segment, 
              type === 'completed' && styles.segmentCompleted,
              type === 'current' && styles.segmentCurrent,
            ]}>
              {type === 'current' && <View style={styles.currentDot} />}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: QUIZ_ATTEMPT_COLORS.onSurfaceVariant,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: QUIZ_ATTEMPT_COLORS.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_ATTEMPT_COLORS.primary,
  },
  progressBars: {
    flexDirection: 'row',
    gap: 5,
    height: 6,
  },
  segmentContainer: {
    flex: 1,
    position: 'relative',
  },
  segment: {
    flex: 1,
    backgroundColor: QUIZ_ATTEMPT_COLORS.surfaceContainerHigh,
    borderRadius: 999,
  },
  segmentCompleted: {
    backgroundColor: QUIZ_ATTEMPT_COLORS.primary,
  },
  segmentCurrent: {
    backgroundColor: QUIZ_ATTEMPT_COLORS.primaryContainer,
  },
  currentDot: {
    position: 'absolute',
    top: -5,
    left: '50%',
    marginLeft: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: QUIZ_ATTEMPT_COLORS.primary,
    borderWidth: 2,
    borderColor: QUIZ_ATTEMPT_COLORS.surface,
  },
});
