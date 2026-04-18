import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function RecentCompletionsSidebar({ completions }) {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isCompact && styles.titleCompact]}>Recent Completions</Text>

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

          <View style={[styles.suggestion, isCompact && styles.suggestionCompact]}>
            <MaterialIcons name={completion.suggestionIcon.replace('_', '-')} size={14} color={completion.borderColor} />
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
    gap: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: SPACING.xs,
  },
  titleCompact: {
    fontSize: 15,
  },
  completionCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  subject: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Medium',
  },
  grade: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-ExtraBold',
  },
  assignmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    fontFamily: 'Manrope-Medium',
  },
  feedbackBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  feedbackText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.gray600,
    fontFamily: 'Manrope-Regular',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  suggestionCompact: {
    alignItems: 'flex-start',
  },
  suggestionText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: 'Manrope-Medium',
  },
});
