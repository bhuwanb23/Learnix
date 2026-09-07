import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const STAT_META = [
  { id: 'activeExams', label: 'Active Exams', icon: 'calendar', color: '#2563eb' },
  { id: 'pendingEvaluations', label: 'Pending Evaluations', icon: 'clipboard', color: '#d97706' },
  { id: 'pendingResults', label: 'Results Pending', icon: 'trophy', color: '#059669' },
  { id: 'activeCheatingCases', label: 'Cheating Cases', icon: 'warning', color: '#dc2626' },
];

const MODULES = [
  { id: 'Timetable', label: 'Exam Timetable', desc: 'Schedule exams & allocate rooms', icon: 'calendar-outline', color: '#2563eb' },
  { id: 'Evaluations', label: 'Evaluations', desc: 'Track grading progress', icon: 'clipboard-outline', color: '#059669' },
  { id: 'Results', label: 'Results', desc: 'Publish & moderate results', icon: 'trophy-outline', color: '#d97706' },
  { id: 'HallTickets', label: 'Hall Tickets', desc: 'Issue & verify admit cards', icon: 'ticket-outline', color: '#0284c7' },
  { id: 'CheatingCases', label: 'Cheating Cases', desc: 'Review AI-detected alerts', icon: 'warning-outline', color: '#dc2626' },
  { id: 'Notifications', label: 'Notify Students', desc: 'Broadcast exam updates', icon: 'megaphone-outline', color: '#4f46e5' },
];

export default function ExamDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await examcellApi.dashboard();
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hero = data?.hero ?? {};
  const stats = data?.stats ?? {};

  const handleModulePress = (moduleId) => {
    if (moduleId === 'Timetable' || moduleId === 'Evaluations' || moduleId === 'Results') {
      navigation.switchTab(moduleId);
    } else {
      navigation.openModule(moduleId);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      {/* Hero banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="calendar" size={20} color="#2563eb" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Exams Overview</Text>
            <Text style={styles.heroSubtitle}>
              {hero.activeExams ?? 0} active · {hero.scheduledExams ?? 0} scheduled · {hero.completedExams ?? 0} completed
            </Text>
          </View>
        </View>
        {hero.totalStudents > 0 && (
          <>
            <View style={styles.heroProgressTrack}>
              <View style={[styles.heroProgressFill, { width: `${Math.min(((hero.completedExams ?? 0) / Math.max((hero.activeExams ?? 0) + (hero.scheduledExams ?? 0) + (hero.completedExams ?? 0), 1)) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.heroNote}>{hero.totalStudents} total hall tickets generated</Text>
          </>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STAT_META.map((stat) => (
          <TouchableOpacity
            key={stat.id}
            style={styles.statCard}
            activeOpacity={0.8}
            onPress={() => {
              if (stat.id === 'activeExams') navigation.switchTab('Timetable');
              if (stat.id === 'pendingEvaluations') navigation.switchTab('Evaluations');
              if (stat.id === 'pendingResults') navigation.switchTab('Results');
              if (stat.id === 'activeCheatingCases') navigation.openModule('CheatingCases');
            }}
          >
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stats[stat.id] ?? 0}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Upcoming exams */}
      {data?.upcomingExams?.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Exams</Text>
          </View>
          {data.upcomingExams.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.examCard}
              activeOpacity={0.8}
              onPress={() => navigation.switchTab('Timetable')}
            >
              <View style={styles.timeBox}>
                <Text style={styles.timeText}>{item.startTime}</Text>
                <Text style={styles.timeAm}>{item.endTime}</Text>
              </View>
              <View style={[styles.examIcon, { backgroundColor: '#2563eb14' }]}>
                <Ionicons name="create-outline" size={16} color="#2563eb" />
              </View>
              <View style={styles.examInfo}>
                <Text style={styles.examTitle}>{item.subject}</Text>
                <Text style={styles.examMeta}>{item.code} • {item.room ?? 'TBA'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Alerts */}
      {data?.alerts?.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Needs Attention</Text>
          </View>
          {data.alerts.map((alert, i) => (
            <View key={i} style={styles.alertCard}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.alertText}>{alert}</Text>
            </View>
          ))}
        </>
      )}

      {/* Recent cheating */}
      {data?.recentCheating?.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Cheating Alerts</Text>
          </View>
          {data.recentCheating.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.taskCard}
              activeOpacity={0.8}
              onPress={() => navigation.openModule('CheatingCases')}
            >
              <View style={[styles.taskIcon, { backgroundColor: '#dc262614' }]}>
                <Ionicons name="warning-outline" size={16} color="#dc2626" />
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{item.student}</Text>
                <Text style={styles.taskDetail}>{item.issue} • {item.subject}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </>
      )}

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Manrope-Regular',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#dc2626',
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Manrope-Bold',
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
    fontSize: 13,
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
    fontFamily: 'Manrope-Regular',
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
});
