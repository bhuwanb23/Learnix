import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_COLORS } from '../constants/quizData';

export default function SubjectCard({ subject, onPress }) {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.accentBg, { backgroundColor: subject.accentBg }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.leftSection}>
            <View style={[styles.iconContainer, { backgroundColor: subject.bgColor }]}>
              <Ionicons name={subject.icon} size={28} color={subject.color} />
            </View>
            <View>
              <Text style={styles.title}>{subject.title}</Text>
              <Text style={styles.quizzes}>{subject.quizzes} Active Quizzes</Text>
            </View>
          </View>

          <View style={styles.scoreSection}>
            <Text style={[styles.scoreLabel, { color: subject.color }]}>Avg Score</Text>
            <Text style={[styles.scoreValue, { color: subject.color }]}>{subject.avgScore}%</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.participants}>
            {subject.participants.map((participant, index) => (
              <View key={index} style={[styles.participantBadge, { backgroundColor: getParticipantColor(index) }]}>
                <Text style={styles.participantText}>{participant}</Text>
              </View>
            ))}
            {subject.extraParticipants > 0 && (
              <View style={[styles.participantBadge, { backgroundColor: QUIZ_COLORS.tertiaryContainer }]}>
                <Text style={styles.participantText}>+{subject.extraParticipants}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: subject.isResume ? QUIZ_COLORS.onSurfaceVariant : subject.color }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.startButtonText, { color: subject.isResume ? QUIZ_COLORS.surface : '#ffffff' }]}>
              {subject.isResume ? 'Resume' : 'Start Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getParticipantColor = (index) => {
  const colors = [QUIZ_COLORS.surfaceContainerHigh, QUIZ_COLORS.secondaryContainer, QUIZ_COLORS.tertiaryContainer, QUIZ_COLORS.primaryContainer];
  return colors[index % colors.length];
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  accentBg: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  content: {
    padding: 18,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftSection: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_COLORS.onSurface,
    marginBottom: 3,
  },
  quizzes: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_COLORS.onSurfaceVariant,
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participants: {
    flexDirection: 'row',
  },
  participantBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginLeft: -6,
  },
  participantText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_COLORS.onSurface,
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
});
