import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_ATTEMPT_COLORS, QUIZ_ATTEMPT_DATA, SAMPLE_QUESTION } from './constants/quizAttemptData';
import ProgressIndicator from './components/ProgressIndicator';
import OptionButton from './components/OptionButton';

export default function QuizAttemptPage({ navigation, route }) {
  const [question, setQuestion] = useState(SAMPLE_QUESTION);
  const [selectedOption, setSelectedOption] = useState('B');

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
    console.log('Show hint');
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
          <Text style={styles.headerTitle}>{QUIZ_ATTEMPT_DATA.unitTitle}</Text>
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
                size={24} 
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

        {/* Hint Button */}
        <View style={styles.hintSection}>
          <TouchableOpacity 
            style={styles.hintButton}
            onPress={handleHint}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb" size={16} color={QUIZ_ATTEMPT_COLORS.secondary} />
            <Text style={styles.hintText}>View Hint</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 56,
    backgroundColor: QUIZ_ATTEMPT_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${QUIZ_ATTEMPT_COLORS.outlineVariant}26`,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_ATTEMPT_COLORS.primary,
    letterSpacing: -0.3,
  },
  submitButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_ATTEMPT_COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  questionSection: {
    marginBottom: 24,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_ATTEMPT_COLORS.onSurface,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  flagButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 14,
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
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_ATTEMPT_COLORS.secondary,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: `${QUIZ_ATTEMPT_COLORS.surfaceContainerLowest}E6`,
    borderRadius: 999,
    padding: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: QUIZ_ATTEMPT_COLORS.onSurface,
  },
  nextButton: {
    flex: 1,
    backgroundColor: QUIZ_ATTEMPT_COLORS.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
});
