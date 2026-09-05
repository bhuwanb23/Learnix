import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  INSTITUTION_STATS,
  ADMIN_MODULES,
  RECENT_ACTIVITY,
  QUICK_ACTIONS,
} from './constants/dashboardData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function AdminDashboard({ navigation }) {
  const handleQuickAction = (action) => {
    if (action.id === 'generate-report') {
      navigation.switchTab('Reports');
      return;
    }
    if (action.id === 'add-student') {
      navigation.switchTab('Students');
      return;
    }
    if (action.id === 'add-teacher') {
      navigation.switchTab('Teachers');
      return;
    }
    if (action.id === 'create-course') {
      navigation.switchTab('Courses');
      return;
    }
    navigation.openModule(action.target);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Stats */}
      <View style={styles.statsGrid}>
        {INSTITUTION_STATS.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => {
              if (stat.id === 'students') navigation.switchTab('Students');
              else if (stat.id === 'teachers') navigation.switchTab('Teachers');
              else if (stat.id === 'courses') navigation.switchTab('Courses');
              else navigation.switchTab('Reports');
            }}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.color + '1A' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.quickActionCard}
            onPress={() => handleQuickAction(action)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '1A' }]}>
              <Ionicons name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Module Hub */}
      <Text style={styles.sectionTitle}>Admin Modules</Text>
      <View style={styles.moduleGrid}>
        {ADMIN_MODULES.map((mod) => (
          <TouchableOpacity
            key={mod.id}
            style={styles.moduleCard}
            onPress={() => navigation.openModule(mod.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.moduleIcon, { backgroundColor: mod.color + '1A' }]}>
              <Ionicons name={mod.icon} size={22} color={mod.color} />
            </View>
            <Text style={styles.moduleTitle}>{mod.title}</Text>
            <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.openModule('Notifications')} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.activityList}>
          {RECENT_ACTIVITY.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.activityItem}
              activeOpacity={0.8}
              onPress={() => navigation.openModule('Notifications')}
            >
              <View style={[styles.activityIcon, { backgroundColor: item.color + '1A' }]}>
                <Ionicons name={item.type} size={16} color={item.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: SPACING.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#0f172a',
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  moduleTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 16,
  },
  activitySection: {
    marginBottom: SPACING.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#7c3aed',
    fontFamily: 'Manrope-SemiBold',
    marginBottom: SPACING.sm,
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.sm,
    ...SHADOWS.sm,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  activityDesc: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  activityTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
});