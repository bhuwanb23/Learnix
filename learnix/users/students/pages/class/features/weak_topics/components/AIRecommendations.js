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

export default function AIRecommendations({ recommendations }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [recommendations]);

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return 'alert-circle-outline';
      case 'medium':
        return 'time-outline';
      case 'low':
        return 'checkmark-circle-outline';
      default:
        return 'information-circle-outline';
    }
  };

  return (
    <Animated.View style={[
      styles.container,
      {
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      },
    ]}>
      <LinearGradient
        colors={['#3B82F6', '#2563EB', '#1E40AF']}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View style={[
            styles.headerIcon,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
              transform: [{
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              }],
            },
          ]}>
            <Ionicons name="bulb-outline" size={22} color="#BFDBFE" />
          </Animated.View>
          <Text style={styles.headerTitle}>AI Study Plan</Text>
        </View>
        
        {/* Recommendations */}
        <View style={styles.recommendationsContainer}>
          {recommendations.map((recommendation) => (
            <View key={recommendation.id} style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <View style={styles.recommendationInfo}>
                  <Text style={styles.recommendationTitle}>
                    {recommendation.title}
                  </Text>
                  <View style={styles.priorityBadge}>
                    <Ionicons 
                      name={getPriorityIcon(recommendation.priority)} 
                      size={12} 
                      color="#FFFFFF" 
                    />
                    <View style={[
                      styles.priorityDot, 
                      { backgroundColor: recommendation.priorityColor }
                    ]} />
                    <Text style={styles.priorityText}>
                      {recommendation.priority.charAt(0).toUpperCase() + recommendation.priority.slice(1)}
                    </Text>
                  </View>
                </View>
                {recommendation.estimatedTime && (
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={12} color="#BFDBFE" />
                    <Text style={styles.timeText}>{recommendation.estimatedTime}</Text>
                  </View>
                )}
              </View>
              
              <Text style={styles.recommendationDescription}>
                {recommendation.description}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Enhanced Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
        <View style={styles.decorativeWave} />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md, // Reduced padding
    paddingBottom: SPACING.lg,
  },
  card: {
    borderRadius: BORDER_RADIUS['2xl'],
    padding: SPACING.xl,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: '#FFFFFF',
  },
  recommendationsContainer: {
    gap: SPACING.md,
  },
  recommendationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  recommendationInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#FFFFFF',
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  timeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#BFDBFE',
  },
  recommendationDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: '#BFDBFE',
    lineHeight: 16,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 60,
    left: -10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeWave: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 100,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopLeftRadius: 50,
  },
});
