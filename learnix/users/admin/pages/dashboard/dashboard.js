import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { adminApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

const MODULES = [
  { id: 'AcademicsExaminations', title: 'Academics & Exams', desc: 'Exam schedules, evaluations, results', icon: 'school-outline', color: '#2563eb' },
  { id: 'Timetable', title: 'Timetable', desc: 'Class schedule management', icon: 'calendar-outline', color: '#059669' },
  { id: 'Attendance', title: 'Attendance', desc: 'Track attendance records', icon: 'checkmark-done-outline', color: '#d97706' },
  { id: 'Assignments', title: 'Assignments', desc: 'View all assignments', icon: 'document-text-outline', color: '#0284c7' },
  { id: 'Placements', title: 'Placements', desc: 'Drive approvals & pipeline', icon: 'briefcase-outline', color: '#4f46e5' },
  { id: 'Events', title: 'Events', desc: 'Event management', icon: 'megaphone-outline', color: '#dc2626' },
  { id: 'Library', title: 'Library', desc: 'Catalog & circulation', icon: 'book-outline', color: '#0891b2' },
  { id: 'Fees', title: 'Fees & Finance', desc: 'Collections & dues', icon: 'cash-outline', color: '#059669' },
  { id: 'Announcements', title: 'Announcements', desc: 'Publish & manage', icon: 'megaphone-outline', color: '#d97706' },
  { id: 'Settings', title: 'Settings', desc: 'Config & permissions', icon: 'settings-outline', color: '#64748b' },
];

const QUICK_ACTIONS = [
  { id: 'add-student', label: 'Add Student', icon: 'person-add-outline', color: '#2563eb', target: 'Students' },
  { id: 'add-teacher', label: 'Add Teacher', icon: 'school-outline', color: '#059669', target: 'Teachers' },
  { id: 'create-course', label: 'New Course', icon: 'book-outline', color: '#d97706', target: 'Courses' },
  { id: 'generate-report', label: 'Reports', icon: 'analytics-outline', color: '#0284c7', target: 'Reports' },
];

export default function AdminDashboard({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try { setError(null); setData(await adminApi.dashboard()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleModulePress = (moduleId) => {
    if (['Students', 'Teachers', 'Courses', 'Reports'].includes(moduleId)) navigation.switchTab(moduleId);
    else navigation.openModule(moduleId);
  };

  const handleQuickAction = (action) => {
    if (action.target) navigation.switchTab(action.target);
    else navigation.openModule(action.target);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading dashboard…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  const hero = data?.hero ?? {};
  const stats = data?.stats ?? {};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <LinearGradient colors={['#2563eb', '#1d4ed8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroContent}>
          <Text style={styles.heroGreeting}>Institution Overview</Text>
          <Text style={styles.heroTitle}>Learnix Institute</Text>
          <Text style={styles.heroSubtitle}>2026-27 Academic Year</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{hero.totalStudents ?? 0}</Text><Text style={styles.heroStatLabel}>Students</Text></View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{hero.totalTeachers ?? 0}</Text><Text style={styles.heroStatLabel}>Faculty</Text></View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{hero.totalCourses ?? 0}</Text><Text style={styles.heroStatLabel}>Courses</Text></View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {[
          { id: 'students', icon: 'people', value: stats.totalStudents ?? 0, label: 'Students', color: '#2563eb', subtitle: `${hero.totalDepartments ?? 0} departments` },
          { id: 'teachers', icon: 'school', value: stats.totalTeachers ?? 0, label: 'Faculty', color: '#059669', subtitle: 'Active staff' },
          { id: 'courses', icon: 'book', value: stats.totalCourses ?? 0, label: 'Courses', color: '#d97706', subtitle: 'Across programs' },
          { id: 'exams', icon: 'trophy', value: stats.totalExams ?? 0, label: 'Exams', color: '#0284c7', subtitle: 'Scheduled' },
        ].map((stat) => (
          <TouchableOpacity key={stat.id} style={styles.statCard} activeOpacity={0.8} onPress={() => handleModulePress(stat.id)}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}><Ionicons name={stat.icon} size={20} color={stat.color} /></View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
            <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.id} style={styles.quickActionCard} onPress={() => handleQuickAction(action)} activeOpacity={0.85}>
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '14' }]}><Ionicons name={action.icon} size={22} color={action.color} /></View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.sectionTitle}>Admin Modules</Text>
        <View style={styles.moduleGrid}>
          {MODULES.map((mod) => (
            <TouchableOpacity key={mod.id} style={styles.moduleCard} onPress={() => handleModulePress(mod.id)} activeOpacity={0.85}>
              <View style={[styles.moduleIcon, { backgroundColor: mod.color + '14' }]}><Ionicons name={mod.icon} size={22} color={mod.color} /></View>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
              <Text style={styles.moduleDesc} numberOfLines={2}>{mod.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {data?.recentActivity?.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {data.recentActivity.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: '#2563eb14' }]}><Ionicons name="pulse-outline" size={16} color="#2563eb" /></View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{item.action}</Text>
                  <Text style={styles.activityDesc}>{item.entityType} • {item.entityId ? item.entityId.substring(0, 8) + '…' : ''}</Text>
                  <Text style={styles.activityTime}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  hero: { borderRadius: 20, padding: 24, marginBottom: 24, position: 'relative', overflow: 'hidden', elevation: 8 },
  heroGlow: { position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroContent: { position: 'relative', zIndex: 1 },
  heroGreeting: { fontSize: 12, fontFamily: 'Manrope-Bold', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  heroTitle: { fontSize: 26, fontFamily: 'PlusJakartaSans-Bold', color: '#ffffff', letterSpacing: -0.5, marginBottom: 2 },
  heroSubtitle: { fontSize: 13, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.85)', marginBottom: 18 },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: '#ffffff' },
  heroStatLabel: { fontSize: 10, fontFamily: 'Manrope-Medium', color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 },
  statCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  statSubtitle: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
  block: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 14 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickActionCard: { width: '31%', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  quickActionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', color: '#1e293b', fontFamily: 'Manrope-SemiBold', textAlign: 'center' },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  moduleCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 2 },
  moduleIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  moduleTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 2 },
  moduleDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', lineHeight: 16 },
  activityList: { backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 2 },
  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(171,173,175,0.08)' },
  activityIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  activityDesc: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  activityTime: { fontSize: 10, color: '#94a3b8', fontFamily: 'Manrope-Regular', marginTop: 2 },
});
