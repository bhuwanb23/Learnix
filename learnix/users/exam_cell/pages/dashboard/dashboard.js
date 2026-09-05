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
  EXAM_STATS,
  TODAY_EXAMS,
  PENDING_TASKS,
  MODULES,
  RECENT_ACTIVITY,
} from './constants/dashboardData';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function ExamDashboard({ navigation }) {
  const handleModulePress = (moduleId) => {
    if (moduleId === 'Timetable' || moduleId === 'Evaluations' || moduleId === 'Results') {
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
            <Ionicons name="calendar" size={20} color="#2563eb" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Final Exams • Sem 4</Text>
            <Text style={styles.heroSubtitle}>Dec 15-24 • 12 exams • 1,240 students</Text>
          </View>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: '38%' }]} />
        </View>
        <Text style={styles.heroNote}>38% of exam season completed (5 / 13 days)</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {EXAM_STATS.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => {
              if (stat.id === 'activeExams') navigation.switchTab('Timetable');
              if (stat.id === 'pendingEval') navigation.switchTab('Evaluations');
              if (stat.id === 'results') navigation.switchTab('Results');
              if (stat.id === 'cheating') navigation.openModule('CheatingCases');
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

      {/* Today's exams */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Exams</Text>
        <Text style={styles.sectionDate}>Dec 8, 2026</Text>
      </View>
      {TODAY_EXAMS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.examCard}
          activeOpacity={0.8}
          onPress={() => navigation.switchTab('Timetable')}
        >
          <View style={styles.timeBox}>
            <Text style={styles.timeText}>{item.time.split(' ')[0]}</Text>
            <Text style={styles.timeAm}>{item.time.split(' ')[1]}</Text>
          </View>
          <View style={[styles.examIcon, { backgroundColor: item.color + '14' }]}>
            <Ionicons name="create-outline" size={16} color={item.color} />
          </View>
          <View style={styles.examInfo}>
            <Text style={styles.examTitle}>{item.subject}</Text>
            <Text style={styles.examMeta}>{item.code} • {item.room} • {item.students} students</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
      ))}

      {/* Pending tasks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Needs Attention</Text>
      </View>
      {PENDING_TASKS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.taskCard}
          activeOpacity={0.8}
          onPress={() => handleModulePress(item.target)}
        >
          <View style={[styles.taskIcon, { backgroundColor: item.color + '14' }]}>
            <Ionicons name={item.icon} size={16} color={item.color} />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text style={styles.taskDetail}>{item.detail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
      ))}

      {/* Module hub */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Exam Tools</Text>
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
  examCard: {
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
    width: 48,
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
  examIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  examInfo: {
    flex: 1,
  },
  examTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  examMeta: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#eef2f7',
    padding: 14,
    marginBottom: 10,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    fontFamily: 'Manrope-SemiBold',
  },
  taskDetail: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
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