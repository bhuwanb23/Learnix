import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_REVIEW_COLORS } from '../constants/quizReviewData';

export default function QuestionCard({ question }) {
  const getOptionStyle = (option) => {
    if (option.isCorrect && option.isUserSelected) {
      return styles.optionCorrectSelected;
    }
    if (option.isCorrect) {
      return styles.optionCorrect;
    }
    if (option.isUserSelected && !option.isCorrect) {
      return styles.optionWrong;
    }
    return styles.optionDefault;
  };

  const getOptionTextStyle = (option) => {
    if (option.isCorrect && option.isUserSelected) {
      return styles.optionTextCorrectSelected;
    }
    if (option.isCorrect) {
      return styles.optionTextCorrect;
    }
    if (option.isUserSelected && !option.isCorrect) {
      return styles.optionTextWrong;
    }
    return styles.optionTextDefault;
  };

  const getOptionLetterStyle = (option) => {
    if (option.isCorrect) {
      return styles.optionLetterCorrect;
    }
    if (option.isUserSelected && !option.isCorrect) {
      return styles.optionLetterWrong;
    }
    return styles.optionLetterDefault;
  };

  const getOptionLetterTextStyle = (option) => {
    if (option.isCorrect || (option.isUserSelected && !option.isCorrect)) {
      return styles.optionLetterTextWhite;
    }
    return styles.optionLetterTextDefault;
  };

  return (
    <View style={styles.container}>
      {/* Question Number */}
      <View style={styles.numberRow}>
        <View style={[
          styles.numberBadge,
          { backgroundColor: question.isCorrect ? `${QUIZ_REVIEW_COLORS.primary}1A` : `${QUIZ_REVIEW_COLORS.error}1A` }
        ]}>
          <Text style={[
            styles.numberText,
            { color: question.isCorrect ? QUIZ_REVIEW_COLORS.primary : QUIZ_REVIEW_COLORS.error }
          ]}>
            {question.number}
          </Text>
        </View>
        <View style={styles.line} />
      </View>

      {/* Question Card */}
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{question.question}</Text>

        {/* Options */}
        <View style={styles.optionsList}>
          {question.options.map((option) => (
            <View key={option.id} style={[styles.option, getOptionStyle(option)]}>
              <View style={[styles.optionLetter, getOptionLetterStyle(option)]}>
                <Text style={[styles.optionLetterText, getOptionLetterTextStyle(option)]}>
                  {option.id}
                </Text>
              </View>
              <Text style={[styles.optionText, getOptionTextStyle(option)]}>
                {option.text}
              </Text>
              {(option.isCorrect || option.isUserSelected) && (
                <Ionicons
                  name={option.isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={option.isCorrect ? QUIZ_REVIEW_COLORS.success : QUIZ_REVIEW_COLORS.error}
                />
              )}
            </View>
          ))}
        </View>

        {/* Explanation */}
        <View style={styles.explanationBox}>
          <View style={styles.explanationHeader}>
            <Ionicons name="bulb" size={16} color={QUIZ_REVIEW_COLORS.primary} />
            <Text style={styles.explanationTitle}>Explanation</Text>
          </View>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainer,
  },
  questionCard: {
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: `${QUIZ_REVIEW_COLORS.outlineVariant}1A`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_REVIEW_COLORS.onSurface,
    lineHeight: 22,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
    marginBottom: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionDefault: {
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainerLow,
    borderColor: `${QUIZ_REVIEW_COLORS.outlineVariant}33`,
    opacity: 0.6,
  },
  optionCorrect: {
    backgroundColor: QUIZ_REVIEW_COLORS.successLight,
    borderColor: QUIZ_REVIEW_COLORS.success,
  },
  optionCorrectSelected: {
    backgroundColor: QUIZ_REVIEW_COLORS.successLight,
    borderColor: QUIZ_REVIEW_COLORS.success,
    borderWidth: 2,
  },
  optionWrong: {
    backgroundColor: QUIZ_REVIEW_COLORS.errorLight,
    borderColor: QUIZ_REVIEW_COLORS.error,
    borderWidth: 2,
  },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionLetterDefault: {
    borderWidth: 1,
    borderColor: QUIZ_REVIEW_COLORS.onSurfaceVariant,
  },
  optionLetterCorrect: {
    backgroundColor: QUIZ_REVIEW_COLORS.success,
  },
  optionLetterWrong: {
    backgroundColor: QUIZ_REVIEW_COLORS.error,
  },
  optionLetterText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  optionLetterTextDefault: {
    color: QUIZ_REVIEW_COLORS.onSurfaceVariant,
  },
  optionLetterTextWhite: {
    color: '#ffffff',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  optionTextDefault: {
    color: QUIZ_REVIEW_COLORS.onSurfaceVariant,
  },
  optionTextCorrect: {
    color: '#065f46',
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  optionTextCorrectSelected: {
    color: '#065f46',
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  optionTextWrong: {
    color: '#991b1b',
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
  },
  explanationBox: {
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainerLow,
    borderRadius: 10,
    padding: 16,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_REVIEW_COLORS.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  explanationText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_REVIEW_COLORS.onSurfaceVariant,
    lineHeight: 19,
  },
});
