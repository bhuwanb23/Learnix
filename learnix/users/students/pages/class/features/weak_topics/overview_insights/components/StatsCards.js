import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEAK_TOPICS_COLORS } from '../constants/weakTopicsData';

export default function StatsCards({ stats }) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Avg Score</Text>
        <Text style={[styles.value, { color: WEAK_TOPICS_COLORS.primary }]}>{stats.avgScore}%</Text>
        <View style={styles.trendRow}>
          <Ionicons name="trending-up" size={14} color={WEAK_TOPICS_COLORS.secondary} />
          <Text style={styles.trendText}>{stats.scoreTrend}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Attempts</Text>
        <Text style={styles.value}>{stats.attempts}</Text>
        <Text style={styles.note}>{stats.attemptsNote}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Top Score</Text>
        <Text style={[styles.value, { color: WEAK_TOPICS_COLORS.tertiary }]}>{stats.topScore}%</Text>
        <View style={styles.trendRow}>
          <Ionicons name="trophy" size={14} color={WEAK_TOPICS_COLORS.onSurfaceVariant} />
          <Text style={styles.trendText}>{stats.topScoreSubject}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${WEAK_TOPICS_COLORS.outlineVariant}1A`,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  value: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.secondary,
  },
  note: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
  },
});
