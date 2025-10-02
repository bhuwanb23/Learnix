import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../../../../../../constants/theme';

export default function QuickActions({ 
  onStartStudy, 
  onViewProgress, 
  onAITutor, 
  onStudyGroup 
}) {
  const actions = [
    {
      id: 'start-study',
      title: 'Start Study',
      icon: 'play-outline',
      colors: ['#3B82F6', '#2563EB'],
      onPress: onStartStudy,
    },
    {
      id: 'view-progress',
      title: 'View Progress',
      icon: 'bar-chart-outline',
      colors: ['#22C55E', '#16A34A'],
      onPress: onViewProgress,
    },
    {
      id: 'ai-tutor',
      title: 'AI Tutor',
      icon: 'bulb-outline',
      colors: ['#8B5CF6', '#7C3AED'],
      onPress: onAITutor,
    },
    {
      id: 'study-group',
      title: 'Study Group',
      icon: 'people-outline',
      colors: ['#F97316', '#EA580C'],
      onPress: onStudyGroup,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      
      <View style={styles.actionsGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={action.colors}
              style={styles.actionGradient}
            >
              <View style={styles.actionContent}>
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name={action.icon} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
              </View>
              
              {/* Decorative Elements */}
              <View style={styles.decorativeCircle} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  actionButton: {
    width: '47%',
    aspectRatio: 1.2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionGradient: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  actionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  decorativeCircle: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
