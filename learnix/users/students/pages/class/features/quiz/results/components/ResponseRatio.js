import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { QUIZ_RESULTS_COLORS } from '../constants/quizResultsData';

export default function ResponseRatio({ correct, wrong }) {
  const total = correct + wrong;
  const correctPercentage = (correct / total) * 100;
  const wrongPercentage = (wrong / total) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESPONSE RATIO</Text>
      
      <View style={styles.barsContainer}>
        <View style={styles.barItem}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>CORRECT</Text>
            <Text style={[styles.barValue, { color: QUIZ_RESULTS_COLORS.primary }]}>{correct}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${correctPercentage}%`,
                  backgroundColor: QUIZ_RESULTS_COLORS.primary 
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.barItem}>
          <View style={styles.barHeader}>
            <Text style={styles.barLabel}>WRONG</Text>
            <Text style={[styles.barValue, { color: QUIZ_RESULTS_COLORS.error }]}>{wrong}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${wrongPercentage}%`,
                  backgroundColor: QUIZ_RESULTS_COLORS.error 
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 20,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    letterSpacing: 1,
    marginBottom: 12,
  },
  barsContainer: {
    gap: 16,
    paddingVertical: 8,
  },
  barItem: {
    gap: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerHigh,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
});
