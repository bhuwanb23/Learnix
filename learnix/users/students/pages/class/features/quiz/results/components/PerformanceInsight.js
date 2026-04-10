import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QUIZ_RESULTS_COLORS } from '../constants/quizResultsData';

export default function PerformanceInsight({ insight }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="analytics" size={32} color={QUIZ_RESULTS_COLORS.secondary} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.description}>{insight.description}</Text>
      </View>

      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>Level Up: +{insight.xpEarned} XP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerLowest,
    borderRadius: 14,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: `${QUIZ_RESULTS_COLORS.outlineVariant}26`,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: QUIZ_RESULTS_COLORS.secondaryContainer,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_RESULTS_COLORS.onSurface,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    lineHeight: 18,
  },
  xpBadge: {
    backgroundColor: `${QUIZ_RESULTS_COLORS.secondary}1A`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.secondary,
  },
});
