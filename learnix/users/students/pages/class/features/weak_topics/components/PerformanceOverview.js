import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function PerformanceOverview({ performance, stats }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (performance) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [performance]);

  if (!performance) {
    return null;
  }

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim },
        ],
      },
    ]}>
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      
      {/* Main Performance Cards */}
      <View style={styles.mainCardsContainer}>
        <LinearGradient
          colors={['#3B82F6', '#2563EB', '#1D4ED8']}
          style={styles.performanceCard}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Score</Text>
              <Text style={styles.cardValue}>{performance.overallScore}%</Text>
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="trending-up-outline" size={22} color="#BFDBFE" />
            </View>
          </View>
          
          {/* Decorative elements */}
          <View style={styles.cardDecor1} />
          <View style={styles.cardDecor2} />
        </LinearGradient>
        
        <LinearGradient
          colors={['#22C55E', '#16A34A', '#15803D']}
          style={styles.performanceCard}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Improvement</Text>
              <Text style={styles.cardValue}>+{performance.improvement}%</Text>
            </View>
            <View style={styles.cardIcon}>
              <Ionicons name="arrow-up-outline" size={22} color="#BBF7D0" />
            </View>
          </View>
          
          {/* Decorative elements */}
          <View style={styles.cardDecor3} />
          <View style={styles.cardDecor4} />
        </LinearGradient>
      </View>
      
      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        {stats?.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon} size={16} color={stat.color} />
            </View>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md, // Reduced padding
    paddingVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
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
    aspectRatio: 1, // Make cards square
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md, // Reduced padding
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: TYPOGRAPHY.sizes.xl, // Reduced from xxl
    fontWeight: TYPOGRAPHY.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  cardIcon: {
    marginTop: SPACING.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm, // Reduced padding
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 32, // Reduced size
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs, // Reduced margin
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
  // Decorative elements for performance cards
  cardDecor1: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardDecor2: {
    position: 'absolute',
    bottom: -5,
    left: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardDecor3: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardDecor4: {
    position: 'absolute',
    bottom: -6,
    left: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
