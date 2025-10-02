import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function AIRecommendations({ recommendations }) {
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
    <View style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="bulb-outline" size={20} color="#BFDBFE" />
          </View>
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
        
        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
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
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
