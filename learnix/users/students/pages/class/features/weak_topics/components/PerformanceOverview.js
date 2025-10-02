import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function PerformanceOverview({ performance, stats }) {
  if (!performance) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      
      {/* Main Performance Cards */}
      <View style={styles.mainCardsContainer}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB']}
          style={styles.performanceCard}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Overall Score</Text>
              <Text style={styles.cardValue}>{performance.overallScore}%</Text>
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="trending-up-outline" size={24} color="#BFDBFE" />
            </View>
          </View>
        </LinearGradient>
        
        <LinearGradient
          colors={['#22C55E', '#16A34A']}
          style={styles.performanceCard}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Improvement</Text>
              <Text style={styles.cardValue}>+{performance.improvement}%</Text>
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="arrow-up-outline" size={24} color="#BBF7D0" />
            </View>
          </View>
        </LinearGradient>
      </View>
      
      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        {stats?.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  mainCardsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  performanceCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SPACING.xs,
  },
  cardValue: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
  },
  cardIcon: {
    marginLeft: SPACING.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
});
