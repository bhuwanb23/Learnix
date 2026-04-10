import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { QUIZ_RESULTS_COLORS } from '../constants/quizResultsData';

export default function AccuracyChart({ percentage }) {
  const radius = 70;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ACCURACY</Text>
      
      <View style={styles.chartContainer}>
        <View style={styles.svgContainer}>
          {/* Background circle */}
          <View style={[styles.circle, styles.backgroundCircle]} />
          
          {/* Progress circle (simplified representation) */}
          <View style={[styles.circle, styles.progressCircle]} />
        </View>
        
        <View style={styles.centerText}>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
      </View>

      <Text style={styles.description}>
        Based on 10 total questions answered in this session.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    letterSpacing: 1,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  chartContainer: {
    width: 160,
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  svgContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 12,
    borderColor: `${QUIZ_RESULTS_COLORS.primary}26`,
    position: 'absolute',
  },
  circle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  backgroundCircle: {
    borderWidth: 12,
    borderColor: `${QUIZ_RESULTS_COLORS.onSurfaceVariant}20`,
  },
  progressCircle: {
    borderWidth: 12,
    borderColor: QUIZ_RESULTS_COLORS.primary,
    borderStyle: 'dashed',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_RESULTS_COLORS.primary,
  },
  description: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
