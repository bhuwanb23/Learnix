import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
            <MaterialIcons name={completion.suggestionIcon.replace('_', '-')} size={12} color={completion.borderColor} />
            <Text style={[styles.suggestionText, { color: completion.borderColor }]}>
              {completion.suggestionIcon === 'lightbulb' ? 'Suggestion' : 'Next step'}: {completion.suggestion}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24, // space-y-6
  },
  title: {
    fontSize: 18, // text-lg
    fontWeight: '700', // font-bold
    color: '#2c2f31', // assuming text-on-surface
    fontFamily: 'PlusJakartaSans-Bold',
  },
  completionCard: {
    backgroundColor: '#eef1f3', // bg-surface-container-low
    borderRadius: 12, // rounded-xl
    padding: 20, // p-5
    borderLeftWidth: 4, // border-l-4
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // mb-2
  },
  subject: {
    fontSize: 12, // text-xs
    fontWeight: '700', // font-bold
    fontFamily: 'Manrope-Bold',
  },
  grade: {
    fontSize: 18, // text-lg
    fontWeight: '700', // font-bold
    fontFamily: 'PlusJakartaSans-Bold',
  },
  assignmentTitle: {
    fontSize: 14, // text-sm
    fontWeight: '700', // font-bold
    color: '#2c2f31', // text-on-surface
    marginBottom: 8, // mb-2
    fontFamily: 'Manrope-Bold',
  },
  feedbackBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // bg-surface-container-lowest/50
    borderRadius: 8, // rounded-lg
    padding: 12, // p-3
    marginBottom: 12, // mb-3
  },
  feedbackText: {
    fontSize: 12, // text-xs
    fontStyle: 'italic', // italic
    color: '#595c5e', // text-on-surface-variant
    fontFamily: 'Manrope-Medium',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // gap-2
  },
  suggestionText: {
    fontSize: 10, // text-[10px]
    fontWeight: '700', // font-bold
    textTransform: 'uppercase', // uppercase
    fontFamily: 'Manrope-Bold',
  },
});
