import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  INSTITUTION_STATS,
  ADMIN_MODULES,
  RECENT_ACTIVITY,
  QUICK_ACTIONS,
} from './constants/dashboardData';

import SectionHeader from '../../components/ui/SectionHeader';

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

  const handleStatPress = (stat) => {
    if (stat.id === 'students') navigation.switchTab('Students');
    else if (stat.id === 'teachers') navigation.switchTab('Teachers');
    else if (stat.id === 'courses') navigation.switchTab('Courses');
    else navigation.switchTab('Reports');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Hero Banner */}
      <LinearGradient
        colors={['#2563eb', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroGlow} />
        <View style={styles.heroContent}>
          <Text style={styles.heroGreeting}>Institution Overview</Text>
          <Text style={styles.heroTitle}>Learnix Institute</Text>
          <Text style={styles.heroSubtitle}>2026-27 Academic Year • Semester 1</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>1,234</Text>
              <Text style={styles.heroStatLabel}>Students</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>89</Text>
              <Text style={styles.heroStatLabel}>Faculty</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>94.2%</Text>
              <Text style={styles.heroStatLabel}>Attendance</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        {INSTITUTION_STATS.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => handleStatPress(stat)}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statSubtitle} numberOfLines={1}>{stat.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.block}>
        <SectionHeader title="Quick Actions" subtitle="Common administrative tasks" />
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionCard}
              onPress={() => handleQuickAction(action)}
              activeOpacity={0.85}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '14' }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Module Hub */}
      <View style={styles.block}>
        <SectionHeader title="Admin Modules" subtitle="Manage every part of the institution" />
        <View style={styles.moduleGrid}>
          {ADMIN_MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.id}
              style={styles.moduleCard}
              onPress={() => navigation.openModule(mod.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '14' }]}>
                <Ionicons name={mod.icon} size={22} color={mod.color} />
              </View>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.block}>
        <SectionHeader
          title="Recent Activity"
          subtitle="Latest happenings across campus"
          actionLabel="View all"
          onAction={() => navigation.openModule('Notifications')}
        />
        <View style={styles.activityList}>
          {RECENT_ACTIVITY.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.activityItem}
              activeOpacity={0.8}
              onPress={() => navigation.openModule('Notifications')}
            >
              <View style={[styles.activityIcon, { backgroundColor: item.color + '14' }]}>
                <Ionicons name={item.type} size={16} color={item.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
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
    backgroundColor: '#f5f7f9',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  hero: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroGreeting: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 18,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    fontWeight: '800',
    color: '#ffffff',
  },
  heroStatLabel: {
    fontSize: 10,
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    fontWeight: '500',
    marginTop: 2,
  },
  statSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  block: {
    marginTop: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 1,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'center',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 16,
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(171, 173, 175, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(171, 173, 175, 0.08)',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  activityDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 1,
  },
  activityTime: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
});