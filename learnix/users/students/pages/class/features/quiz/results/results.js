import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_RESULTS_COLORS, QUIZ_RESULTS_DATA, PERFORMANCE_INSIGHT } from './constants/quizResultsData';
import AccuracyChart from './components/AccuracyChart';
import TimeDisplay from './components/TimeDisplay';
import ResponseRatio from './components/ResponseRatio';
import PerformanceInsight from './components/PerformanceInsight';

export default function ResultsPage({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const headerTopPad = Math.max(insets.top, Platform.OS === 'android' ? 8 : 6);

  const handleBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const handleReviewAnswers = () => {
    console.log('Review answers');
    if (navigation?.navigateToReview) {
      navigation.navigateToReview();
    }
  };

  const handleTryAgain = () => {
    console.log('Try again');
    if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={QUIZ_RESULTS_COLORS.primary} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTopPad }]}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color={QUIZ_RESULTS_COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quiz Results</Text>
        </View>
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Ionicons name="ellipsis-vertical" size={20} color={QUIZ_RESULTS_COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Score Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>Final Performance</Text>
            <Text style={styles.heroTitle}>
              Great Work, {QUIZ_RESULTS_DATA.userName}!
            </Text>
            <Text style={styles.heroDescription}>
              You've mastered the fundamentals of {QUIZ_RESULTS_DATA.topic}. Your score is higher than {QUIZ_RESULTS_DATA.percentile}% of your peers.
            </Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Total Score</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>{QUIZ_RESULTS_DATA.score}</Text>
              <Text style={styles.scoreTotal}>/{QUIZ_RESULTS_DATA.totalScore}</Text>
            </View>
          </View>

          <View style={styles.heroDecoration} />
        </View>

        {/* Bento Grid Stats */}
        <View style={styles.statsGrid}>
          <AccuracyChart percentage={QUIZ_RESULTS_DATA.accuracy} />
          <TimeDisplay 
            time={QUIZ_RESULTS_DATA.timeSpent}
            average={QUIZ_RESULTS_DATA.averagePerQuestion}
          />
          <ResponseRatio 
            correct={QUIZ_RESULTS_DATA.correctCount}
            wrong={QUIZ_RESULTS_DATA.wrongCount}
          />
        </View>

        {/* Performance Insight */}
        <PerformanceInsight insight={PERFORMANCE_INSIGHT} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleReviewAnswers}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Review</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleTryAgain}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={QUIZ_RESULTS_COLORS.onSurface} />
            <Text style={styles.secondaryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: QUIZ_RESULTS_COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 10,
    minHeight: 44,
    backgroundColor: QUIZ_RESULTS_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: `${QUIZ_RESULTS_COLORS.outlineVariant}26`,
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_RESULTS_COLORS.primary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: QUIZ_RESULTS_COLORS.primary,
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.onPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_RESULTS_COLORS.onPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_RESULTS_COLORS.onPrimary,
    lineHeight: 20,
    opacity: 0.9,
  },
  scoreCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: QUIZ_RESULTS_COLORS.onPrimary,
    opacity: 0.8,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
  },
  scoreTotal: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Manrope-SemiBold',
    color: '#ffffff',
    opacity: 0.6,
  },
  heroDecoration: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${QUIZ_RESULTS_COLORS.primaryContainer}33`,
  },
  statsGrid: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: QUIZ_RESULTS_COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: QUIZ_RESULTS_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: '#ffffff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerHigh,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.onSurface,
  },
});