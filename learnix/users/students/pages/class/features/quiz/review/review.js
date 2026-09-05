import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_REVIEW_COLORS, QUIZ_REVIEW_DATA, SAMPLE_QUESTIONS } from './constants/quizReviewData';
import QuestionCard from './components/QuestionCard';

export default function ReviewPage({ navigation, route }) {
  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleStartNextQuiz = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={QUIZ_REVIEW_COLORS.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={QUIZ_REVIEW_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Answers</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{QUIZ_REVIEW_DATA.score}% Score</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Summary */}
        <View style={styles.statsSection}>
          <View style={styles.performanceCard}>
            <View style={styles.performanceContent}>
              <Text style={styles.performanceLabel}>Overall Performance</Text>
              <Text style={styles.performanceTitle}>{QUIZ_REVIEW_DATA.performanceTitle}</Text>
              <Text style={styles.performanceDescription}>
                {QUIZ_REVIEW_DATA.performanceDescription}
              </Text>
            </View>
            <View style={styles.performanceDecoration} />
          </View>

          <View style={styles.questionsCard}>
            <Ionicons name="clipboard" size={32} color="#ffffff" />
            <View>
              <Text style={styles.questionsLabel}>Total Questions</Text>
              <Text style={styles.questionsValue}>
                {QUIZ_REVIEW_DATA.correctAnswers} / {QUIZ_REVIEW_DATA.totalQuestions}
              </Text>
            </View>
          </View>
        </View>

        {/* Questions Review */}
        <View style={styles.questionsSection}>
          {SAMPLE_QUESTIONS.map((question) => (
            <QuestionCard key={question.id} question={question} />
          ))}
        </View>

        {/* Motivational Card */}
        <View style={styles.motivationCard}>
          <View style={styles.motivationGradient}>
            <View style={styles.motivationContent}>
              <Text style={styles.motivationTitle}>Keep the momentum going!</Text>
              <Text style={styles.motivationDescription}>
                You are just 4 correct answers away from achieving your weekly goal of "Elite Scholar" status. Ready for the next module?
              </Text>
              <TouchableOpacity 
                style={styles.motivationButton}
                onPress={handleStartNextQuiz}
                activeOpacity={0.7}
              >
                <Text style={styles.motivationButtonText}>Start Next Quiz</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: QUIZ_REVIEW_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 52,
    backgroundColor: `${QUIZ_REVIEW_COLORS.surfaceContainerLowest}E6`,
    borderBottomWidth: 1,
    borderBottomColor: `${QUIZ_REVIEW_COLORS.outlineVariant}26`,
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_REVIEW_COLORS.onSurface,
    letterSpacing: -0.3,
  },
  scoreBadge: {
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_REVIEW_COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
  },
  statsSection: {
    marginBottom: 24,
  },
  performanceCard: {
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${QUIZ_REVIEW_COLORS.outlineVariant}1A`,
    position: 'relative',
    overflow: 'hidden',
  },
  performanceContent: {
    position: 'relative',
    zIndex: 1,
  },
  performanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_REVIEW_COLORS.onSurfaceVariant,
    marginBottom: 6,
  },
  performanceTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_REVIEW_COLORS.onSurface,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  performanceDescription: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_REVIEW_COLORS.onSurfaceVariant,
    lineHeight: 19,
  },
  performanceDecoration: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${QUIZ_REVIEW_COLORS.primary}0D`,
  },
  questionsCard: {
    backgroundColor: QUIZ_REVIEW_COLORS.primaryDim,
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  questionsLabel: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_REVIEW_COLORS.primaryContainer,
    marginBottom: 4,
  },
  questionsValue: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
  },
  questionsSection: {
    marginBottom: 24,
  },
  motivationCard: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
  },
  motivationGradient: {
    backgroundColor: QUIZ_REVIEW_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: QUIZ_REVIEW_COLORS.primary,
    padding: 20,
  },
  motivationContent: {
    gap: 12,
  },
  motivationTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_REVIEW_COLORS.onSurface,
    letterSpacing: -0.2,
  },
  motivationDescription: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_REVIEW_COLORS.onSurfaceVariant,
    lineHeight: 19,
  },
  motivationButton: {
    backgroundColor: QUIZ_REVIEW_COLORS.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    shadowColor: QUIZ_REVIEW_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  motivationButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
});
