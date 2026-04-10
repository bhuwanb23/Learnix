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
          <Ionicons name="trending-up" size={12} color={WEAK_TOPICS_COLORS.secondary} />
          <Text style={styles.trendText}>{stats.scoreTrend}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Top Score</Text>
        <Text style={[styles.value, { color: WEAK_TOPICS_COLORS.tertiary }]}>{stats.topScore}%</Text>
        <View style={styles.trendRow}>
          <Ionicons name="trophy" size={12} color={WEAK_TOPICS_COLORS.onSurfaceVariant} />
          <Text style={styles.trendText}>{stats.topScoreSubject}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: WEAK_TOPICS_COLORS.surfaceContainerLowest,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${WEAK_TOPICS_COLORS.outlineVariant}1A`,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
    color: WEAK_TOPICS_COLORS.secondary,
  },
  note: {
    fontSize: 10,
    fontWeight: '500',
    fontFamily: 'Manrope-Regular',
    color: WEAK_TOPICS_COLORS.onSurfaceVariant,
  },
});
