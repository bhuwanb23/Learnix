import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function PracticeOptions({ practiceCategories, onStartPractice }) {
  const getIconName = (iconType) => {
    switch (iconType) {
      case 'brain': return 'brain-outline';
      case 'stopwatch': return 'time-outline';
      case 'chart-line': return 'analytics-outline';
      default: return 'help-outline';
    }
  };

  const getGradientColors = (color) => {
    const colorMap = {
      '#7C3AED': ['#F3E8FF', '#E9D5FF'], // Purple
      '#059669': ['#ECFDF5', '#D1FAE5'], // Green
      '#2563EB': ['#EFF6FF', '#DBEAFE'], // Blue
    };
    return colorMap[color] || ['#F3F4F6', '#E5E7EB'];
  };

  return (
    <View style={styles.container}>
      {practiceCategories.map((category) => (
        <View key={category.id} style={styles.optionCard}>
          <LinearGradient
            colors={getGradientColors(category.color)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name={getIconName(category.icon)} 
                  size={20} 
                  color={category.color} 
                />
              </View>
              <Text style={styles.categoryTitle}>{category.title}</Text>
            </View>

            <Text style={styles.categoryDescription}>{category.description}</Text>

            {category.subjects && (
              <View style={styles.subjectsGrid}>
                {category.subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={[styles.subjectButton, { backgroundColor: category.color + '20' }]}
                    onPress={() => onStartPractice(category.id, subject)}
                  >
                    <Text style={[styles.subjectText, { color: category.color }]}>
                      {subject}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {category.duration && (
              <View style={styles.durationContainer}>
                <Ionicons name="time-outline" size={14} color={category.color} />
                <Text style={[styles.durationText, { color: category.color }]}>
                  {category.duration}
                </Text>
              </View>
            )}

            {category.features && (
              <View style={styles.featuresContainer}>
                {category.features.map((feature, index) => (
                  <Text key={index} style={styles.featureText}>
                    • {feature}
                  </Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: category.color }]}
              onPress={() => onStartPractice(category.id)}
            >
              <Text style={styles.startButtonText}>
                {category.id === 'mcq' ? 'Select Subject' : 
                 category.id === 'timed' ? 'Start Mock Test' : 
                 'View Analytics'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  optionCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gradientBackground: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
  },
  categoryDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  subjectButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: 'transparent',
  },
  subjectText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  durationText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginLeft: SPACING.xs,
  },
  featuresContainer: {
    marginBottom: SPACING.md,
  },
  featureText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  startButton: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.white,
  },
});
