import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SUBMISSION_REVIEW_COLORS } from '../constants/submissionReviewData';

export default function StudentInfoFooter({ data }) {
  const getColorForTag = (color) => {
    switch (color) {
      case 'tertiary':
        return {
          bg: `${SUBMISSION_REVIEW_COLORS.tertiary}15`,
          text: SUBMISSION_REVIEW_COLORS.tertiary,
        };
      case 'secondary':
        return {
          bg: `${SUBMISSION_REVIEW_COLORS.secondary}15`,
          text: SUBMISSION_REVIEW_COLORS.secondary,
        };
      default:
        return {
          bg: `${SUBMISSION_REVIEW_COLORS.primary}15`,
          text: SUBMISSION_REVIEW_COLORS.primary,
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.studentInfo}>
        <Image
          source={{ uri: data.student.avatar }}
          style={styles.avatar}
        />
        <View style={styles.studentDetails}>
          <Text style={styles.studentName}>Submitting as {data.student.name}</Text>
          <Text style={styles.studentId}>ID: {data.student.id}</Text>
        </View>
      </View>

      <View style={styles.tagsContainer}>
        {data.tags.map((tag, index) => {
          const colors = getColorForTag(tag.color);
          return (
            <View key={index} style={[styles.tag, { backgroundColor: colors.bg }]}>
              <Text style={[styles.tagText, { color: colors.text }]}>{tag.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  studentDetails: {
    gap: 2,
  },
  studentName: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: SUBMISSION_REVIEW_COLORS.onSurface,
  },
  studentId: {
    fontFamily: 'Manrope-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: SUBMISSION_REVIEW_COLORS.onSurfaceVariant,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 10,
    fontWeight: '700',
  },
});
