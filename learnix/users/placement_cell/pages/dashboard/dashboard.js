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
  PLACEMENT_STATS,
  TODAY_SCHEDULE,
  PENDING_SHORTLISTS,
  MODULES,
  RECENT_ACTIVITY,
} from './constants/dashboardData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const TYPE_META = {
  test: { icon: 'create-outline', color: '#2563eb' },
  interview: { icon: 'people-outline', color: '#059669' },
  talk: { icon: 'mic-outline', color: '#d97706' },
};

export default function PlacementDashboard({ navigation }) {
  const handleModulePress = (moduleId) => {
    if (moduleId === 'Drives' || moduleId === 'Applications' || moduleId === 'Students') {
      navigation.switchTab(moduleId);
    } else {
      navigation.openModule(moduleId);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Hero banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="briefcase" size={20} color="#2563eb" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Placement Season 2026-27</Text>
            <Text style={styles.heroSubtitle}>6 active drives • 684 applications • 231 offers</Text>
          </View>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: '64%' }]} />
        </View>
        <Text style={styles.heroNote}>64% of placement target achieved (231 / 360 offers)</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {PLACEMENT_STATS.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => {
              if (stat.id === 'activeDrives') navigation.switchTab('Drives');
              if (stat.id === 'applications') navigation.switchTab('Applications');
              if (stat.id === 'shortlists') navigation.switchTab('Applications');
            }}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's schedule */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <Text style={styles.sectionDate}>Dec 8, 2026</Text>
      </View>
      {TODAY_SCHEDULE.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.scheduleCard}
          activeOpacity={0.8}
          onPress={() => navigation.switchTab('Drives')}
        >
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
            <Text style={styles.timeAm}>{item.time.split(' ')[1]}</Text>
          </View>
          <View style={[styles.scheduleIcon, { backgroundColor: TYPE_META[item.type].color + '14' }]}>
            <Ionicons name={TYPE_META[item.type].icon} size={16} color={TYPE_META[item.type].color} />
          </View>
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleTitle}>{item.title}</Text>
            <Text style={styles.scheduleMeta}>{item.venue} • {item.attendees}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
      ))}

      {/* Pending shortlists */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Pending Shortlists</Text>
        <TouchableOpacity onPress={() => navigation.switchTab('Applications')} activeOpacity={0.7}>
          <Text style={styles.sectionAction}>View all</Text>
        </TouchableOpacity>
      </View>
      {PENDING_SHORTLISTS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.shortlistCard}
          activeOpacity={0.8}
          onPress={() => navigation.switchTab('Applications')}
        >
          <View style={[styles.shortlistIcon, { backgroundColor: item.color + '14' }]}>
            <Ionicons name="checkmark-done" size={16} color={item.color} />
          </View>
          <View style={styles.shortlistInfo}>
            <Text style={styles.shortlistTitle}>{item.drive}</Text>
            <Text style={styles.shortlistMeta}>Due {item.deadline}</Text>
          </View>
          <View style={styles.shortlistCount}>
            <Text style={[styles.shortlistCountText, { color: item.color }]}>{item.count}</Text>
            <Text style={styles.shortlistCountLabel}>to review</Text>
          </View>
        </TouchableOpacity>
      ))}

      {/* Module hub */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Placement Tools</Text>
      </View>
      <View style={styles.moduleGrid}>
        {MODULES.map((mod) => (
          <TouchableOpacity
            key={mod.id}
            style={styles.moduleCard}
            activeOpacity={0.8}
            onPress={() => handleModulePress(mod.id)}
          >
            <View style={[styles.moduleIcon, { backgroundColor: mod.color + '14' }]}>
              <Ionicons name={mod.icon} size={20} color={mod.color} />
            </View>
            <Text style={styles.moduleLabel}>{mod.label}</Text>
            <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>
      {RECENT_ACTIVITY.map((item) => (
        <View key={item.id} style={styles.activityRow}>
          <View style={[styles.activityDot, { backgroundColor: item.color }]} />
          <View style={styles.activityInfo}>
            <Text style={styles.activityText}>{item.text}</Text>
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f9',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#2563eb',
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  heroProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 16,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  heroNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Manrope-Medium',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: -0.3,
  },
  sectionDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Manrope-Medium',
  },
  sectionAction: {
    fontSize: 12,
    color: '#2563eb',
    fontFamily: 'Manrope-SemiBold',
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  timeBox: {
    width: 44,
    marginRight: 12,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  timeAm: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Medium',
  },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  scheduleMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  shortlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  shortlistIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shortlistInfo: {
    flex: 1,
  },
  shortlistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  shortlistMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  shortlistCount: {
    alignItems: 'flex-end',
  },
  shortlistCountText: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans-Bold',
  },
  shortlistCountLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  moduleCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 16,
  },
  moduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    lineHeight: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: '#334155',
    fontFamily: 'Manrope-Regular',
    lineHeight: 19,
  },
  activityTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
});