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
  const actions = [
    {
      id: 'create-event',
      title: 'Create Event',
      subtitle: 'Host your own',
      icon: 'add-circle-outline',
      gradient: ['#3B82F6', '#1D4ED8'],
    },
    {
      id: 'join-group',
      title: 'Join Group',
      subtitle: 'Find communities',
      icon: 'people-outline',
      gradient: ['#10B981', '#059669'],
    },
    {
      id: 'bookmark',
      title: 'Bookmarks',
      subtitle: 'Saved events',
      icon: 'bookmark-outline',
      gradient: ['#F59E0B', '#D97706'],
    },
    {
      id: 'calendar',
      title: 'Calendar',
      subtitle: 'View schedule',
      icon: 'calendar-outline',
      gradient: ['#8B5CF6', '#7C3AED'],
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={() => onActionPress(action)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={action.gradient}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={action.icon} size={24} color="#FFFFFF" />
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  actionCard: {
    width: '48%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
  },
  gradient: {
    padding: SPACING.md,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#FFFFFF',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
});
