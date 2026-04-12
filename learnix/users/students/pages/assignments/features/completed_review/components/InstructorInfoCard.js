import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COMPLETED_REVIEW_COLORS } from '../constants/completedReviewData';

export default function InstructorInfoCard({ assignment }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Instructor Info</Text>
      <View style={styles.instructorRow}>
        <Image
          source={{ uri: assignment.instructor.avatar }}
          style={styles.avatar}
        />
        <View style={styles.instructorInfo}>
          <Text style={styles.instructorName}>{assignment.instructor.name}</Text>
          <Text style={styles.instructorTitle}>{assignment.instructor.title}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <Text style={styles.timelineText}>
        "{assignment.gradeTimeline}"
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainerLowest,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  title: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
    marginBottom: 16,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  instructorInfo: {
    gap: 4,
  },
  instructorName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: COMPLETED_REVIEW_COLORS.onSurface,
  },
  instructorTitle: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: COMPLETED_REVIEW_COLORS.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: COMPLETED_REVIEW_COLORS.surfaceContainer,
    marginBottom: 12,
  },
  timelineText: {
    fontFamily: 'Manrope-Medium',
    fontSize: 10,
    fontWeight: '500',
    color: COMPLETED_REVIEW_COLORS.onSurfaceVariant,
    fontStyle: 'italic',
  },
});
