import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_ATTEMPT_COLORS, QUIZ_ATTEMPT_DATA, SAMPLE_QUESTION } from './constants/quizAttemptData';
import ProgressIndicator from './components/ProgressIndicator';
import OptionButton from './components/OptionButton';

export default function QuizAttemptPage({ navigation, route }) {
  const [question, setQuestion] = useState(SAMPLE_QUESTION);
  const [selectedOption, setSelectedOption] = useState('B');
  const [showHint, setShowHint] = useState(false);

  const handleClose = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleSubmit = () => {
    console.log('Quiz submitted');
    if (navigation?.navigateToResults) {
      navigation.navigateToResults();
    }
  };

  const handleFlag = () => {
    setQuestion({ ...question, isFlagged: !question.isFlagged });
  };

  const handleHint = () => {
    setShowHint(!showHint);
  };

  const handlePrevious = () => {
    console.log('Previous question');
  };

  const handleNext = () => {
    console.log('Next question');
  };

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
    setQuestion({
      ...question,
      options: question.options.map(opt => ({
        ...opt,
        isSelected: opt.id === optionId,
      })),
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#2563eb" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={QUIZ_ATTEMPT_COLORS.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{QUIZ_ATTEMPT_DATA.unitTitle}</Text>
        </View>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.7}
        >
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Progress Indicator */}
        <ProgressIndicator
          current={QUIZ_ATTEMPT_DATA.currentQuestion}
          total={QUIZ_ATTEMPT_DATA.totalQuestions}
          time={QUIZ_ATTEMPT_DATA.timeRemaining}
        />

        {/* Question Section */}
        <View style={styles.questionSection}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionText}>{question.text}</Text>
            <TouchableOpacity 
              style={styles.flagButton}
              onPress={handleFlag}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={question.isFlagged ? "flag" : "flag-outline"} 
                size={22} 
                color={question.isFlagged ? QUIZ_ATTEMPT_COLORS.primary : QUIZ_ATTEMPT_COLORS.onSurfaceVariant} 
              />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {question.options.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                isSelected={selectedOption === option.id}
                onSelect={() => handleOptionSelect(option.id)}
              />
            ))}
          </View>
        </View>

        {/* Hint Section */}
        {showHint && (
          <View style={styles.hintBox}>
            <View style={styles.hintHeader}>
              <Ionicons name="bulb" size={18} color={QUIZ_ATTEMPT_COLORS.secondary} />
              <Text style={styles.hintTitle}>Hint</Text>
            </View>
            <Text style={styles.hintText}>
              Remember: ∫ e^(ax) dx = (1/a)e^(ax) + C. Apply the fundamental theorem of calculus with limits 0 to 1.
            </Text>
          </View>
        )}

        {/* Hint Button */}
        <View style={styles.hintSection}>
          <TouchableOpacity 
            style={[styles.hintButton, showHint && styles.hintButtonActive]}
            onPress={handleHint}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showHint ? "bulb" : "bulb-outline"} 
              size={16} 
              color={showHint ? QUIZ_ATTEMPT_COLORS.secondary : QUIZ_ATTEMPT_COLORS.secondary} 
            />
            <Text style={styles.hintTextButton}>{showHint ? 'Hide Hint' : 'View Hint'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={handlePrevious}
          activeOpacity={0.7}
        >
          <View style={styles.navButtonContent}>
            <Ionicons name="chevron-back" size={14} color={QUIZ_ATTEMPT_COLORS.onSurface} />
            <Text style={styles.navButtonText}>Previous</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <View style={styles.nextButtonContent}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="chevron-forward" size={14} color="#ffffff" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: QUIZ_ATTEMPT_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 52,
    backgroundColor: QUIZ_ATTEMPT_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${QUIZ_ATTEMPT_COLORS.outlineVariant}26`,
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_ATTEMPT_COLORS.primary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  submitButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    flexShrink: 0,
  },
  submitText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_ATTEMPT_COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 100,
  },
  questionSection: {
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_ATTEMPT_COLORS.onSurface,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  flagButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionsList: {
    gap: 12,
  },
  hintBox: {
    backgroundColor: `${QUIZ_ATTEMPT_COLORS.secondaryContainer}80`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${QUIZ_ATTEMPT_COLORS.secondary}30`,
  },
  hintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_ATTEMPT_COLORS.secondary,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_ATTEMPT_COLORS.onSurface,
    lineHeight: 18,
  },
  hintSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: QUIZ_ATTEMPT_COLORS.secondaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  hintButtonActive: {
    backgroundColor: `${QUIZ_ATTEMPT_COLORS.secondaryContainer}CC`,
  },
  hintTextButton: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_ATTEMPT_COLORS.secondary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 20,
    left: 14,
    right: 14,
    backgroundColor: `${QUIZ_ATTEMPT_COLORS.surfaceContainerLowest}E6`,
    borderRadius: 999,
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navButtonText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: QUIZ_ATTEMPT_COLORS.onSurface,
  },
  nextButton: {
    flex: 1,
    backgroundColor: QUIZ_ATTEMPT_COLORS.primary,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
});
