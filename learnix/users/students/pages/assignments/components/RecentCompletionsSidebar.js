import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

export default function RecentCompletionsSidebar({ completions }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Completions</Text>

      {completions.map((completion) => (
        <View
          key={completion.id}
          style={[
            styles.completionCard,
            { borderLeftColor: completion.borderColor },
          ]}
        >
          <View style={styles.gradeHeader}>
            <Text style={[styles.subject, { color: completion.borderColor }]}>
              {completion.subject}
            </Text>
            <Text
              style={[styles.grade, { color: completion.borderColor }]}
            >
              {completion.grade}
            </Text>
          </View>

          <Text style={styles.assignmentTitle}>{completion.title}</Text>

          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackText}>{completion.feedback}</Text>
          </View>

          <View style={styles.suggestion}>
            <Text style={styles.suggestionIcon}>💡</Text>
            <Text style={styles.suggestionText}>
              Suggestion: {completion.suggestion}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c2f31',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 8,
  },
  completionCard: {
    backgroundColor: '#eef1f3',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subject: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  grade: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c2f31',
    marginBottom: 8,
    fontFamily: 'Manrope-Bold',
  },
  feedbackBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#595c5e',
    lineHeight: 18,
    fontFamily: 'Manrope-Medium',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionIcon: {
    fontSize: 12,
  },
  suggestionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0050d4',
    textTransform: 'uppercase',
    fontFamily: 'Manrope-Bold',
  },
});
