import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COMPLETED_RESULTS_COLORS } from '../constants/completedResultsData';

export default function InstructorFeedbackCard({ results }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Instructor Feedback</Text>
        <View style={styles.instructorAvatars}>
          {results.feedback.map((item, index) => (
            item.avatar ? (
              <Image key={index} source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View key={index} style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>+{index + 1}</Text>
              </View>
            )
          ))}
        </View>
      </View>

      <View style={styles.feedbackList}>
        {results.feedback.map((item, index) => (
          <View key={index} style={styles.feedbackItem}>
            <View style={[styles.iconContainer, { backgroundColor: index === 0 ? COMPLETED_RESULTS_COLORS.surfaceContainerHigh : COMPLETED_RESULTS_COLORS.surfaceContainerHigh }]}>
              <MaterialIcons 
                name={item.type === 'positive' ? 'format-quote' : 'lightbulb'} 
                size={24} 
                color={index === 0 ? COMPLETED_RESULTS_COLORS.primary : COMPLETED_RESULTS_COLORS.secondary} 
              />
            </View>
            <View style={styles.feedbackContent}>
              <Text style={[styles.feedbackText, item.type === 'suggestion' && styles.italicText]}>
                {item.text}
              </Text>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>{item.instructor}</Text>
                <View style={styles.dot} />
                <Text style={styles.instructorRole}>{item.role}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_RESULTS_COLORS.surfaceContainerLowest,
    margin: 16,
    borderRadius: 12,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onSurface,
  },
  instructorAvatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COMPLETED_RESULTS_COLORS.surfaceContainerLowest,
    marginLeft: -12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COMPLETED_RESULTS_COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COMPLETED_RESULTS_COLORS.surfaceContainerLowest,
    marginLeft: -12,
  },
  avatarText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onPrimary,
  },
  feedbackList: {
    gap: 24,
  },
  feedbackItem: {
    flexDirection: 'row',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  feedbackContent: {
    flex: 1,
    gap: 8,
  },
  feedbackText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: COMPLETED_RESULTS_COLORS.onSurface,
    lineHeight: 22,
  },
  italicText: {
    fontStyle: 'italic',
    color: COMPLETED_RESULTS_COLORS.onSurfaceVariant,
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructorName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: COMPLETED_RESULTS_COLORS.onSurface,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COMPLETED_RESULTS_COLORS.outlineVariant,
  },
  instructorRole: {
    fontFamily: 'Manrope-Medium',
    fontSize: 13,
    fontWeight: '500',
    color: COMPLETED_RESULTS_COLORS.onSurfaceVariant,
  },
});
