import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import theme
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../constants/theme';

export default function QuickActions({ onActionPress }) {
  const quickActions = [
    {
      id: 'notes',
      title: 'Notes',
      icon: 'book-outline',
      gradientColors: ['#3B82F6', '#1E40AF'],
      iconColor: '#FFFFFF',
    },
    {
      id: 'quizzes',
      title: 'Quizzes',
      icon: 'help-circle-outline',
      gradientColors: ['#06B6D4', '#0891B2'],
      iconColor: '#FFFFFF',
    },
    {
      id: 'weak-topics',
      title: 'Weak Topics',
      icon: 'warning-outline',
      gradientColors: ['#F59E0B', '#D97706'],
      iconColor: '#FFFFFF',
    },
    {
      id: 'syllabus-tracker',
      title: 'Syllabus Tracker',
      icon: 'list-outline',
      gradientColors: ['#8B5CF6', '#7C3AED'],
      iconColor: '#FFFFFF',
    },
  ];

  const handlePress = (actionId) => {
    onActionPress(actionId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {quickActions.map((action, index) => (
          <View key={action.id} style={styles.actionWrapper}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePress(action.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBackground}
              >
                <View style={styles.actionContent}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={action.icon}
                      size={28}
                      color={action.iconColor}
                    />
                  </View>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </View>
                
                {/* Decorative elements */}
                <View style={styles.decorativeCircle1} />
                <View style={styles.decorativeCircle2} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  actionWrapper: {
    width: '48%',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButton: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  actionContent: {
    alignItems: 'center',
    gap: SPACING.sm,
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -10,
    right: -10,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 10,
    left: 10,
  },
});
