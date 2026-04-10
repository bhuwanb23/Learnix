import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_RESULTS_COLORS } from '../constants/quizResultsData';

export default function TimeDisplay({ time, average }) {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>TIME SPENT</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={24} color={QUIZ_RESULTS_COLORS.primary} />
          <Text style={styles.timeText}>{time}</Text>
        </View>
      </View>
      <Text style={styles.averageText}>Average: {average} per question</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerLow,
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Courier New',
    color: QUIZ_RESULTS_COLORS.primary,
    letterSpacing: 2,
  },
  averageText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    marginTop: 12,
  },
});
