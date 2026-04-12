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
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="analytics" size={28} color={QUIZ_RESULTS_COLORS.secondary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{insight.title}</Text>
        </View>
      </View>

      <Text style={styles.description}>{insight.description}</Text>

      <View style={styles.footer}>
        <View style={styles.xpBadge}>
          <Ionicons name="star" size={16} color={QUIZ_RESULTS_COLORS.secondary} />
          <Text style={styles.xpText}>Level Up: +{insight.xpEarned} XP</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: QUIZ_RESULTS_COLORS.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: `${QUIZ_RESULTS_COLORS.outlineVariant}26`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  iconContainer: {
    width: 56,
    height: 56,
    backgroundColor: QUIZ_RESULTS_COLORS.secondaryContainer,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    color: QUIZ_RESULTS_COLORS.onSurface,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Manrope-Medium',
    color: QUIZ_RESULTS_COLORS.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${QUIZ_RESULTS_COLORS.secondary}14`,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: QUIZ_RESULTS_COLORS.secondary,
  },
});
