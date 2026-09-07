import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function CoursesModule({ navigation }) {
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('departments');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [d, c] = await Promise.all([adminApi.departments(), adminApi.courses()]);
      setDepartments(Array.isArray(d) ? d : []);
      setCourses(Array.isArray(c) ? c : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filteredCourses = courses.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading courses…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{departments.length}</Text><Text style={styles.statLabel}>Departments</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{courses.length}</Text><Text style={styles.statLabel}>Courses</Text></View>
      </View>

      <View style={styles.tabsRow}>
        {[{ id: 'departments', label: 'Departments' }, { id: 'courses', label: 'Courses' }].map((t) => (
          <TouchableOpacity key={t.id} style={[styles.tab, tab === t.id && styles.activeTab]} onPress={() => setTab(t.id)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'departments' && departments.map((dept) => (
        <View key={dept.id} style={styles.deptCard}>
          <View style={[styles.deptIcon, { backgroundColor: '#2563eb14' }]}><Ionicons name="business" size={20} color="#2563eb" /></View>
          <View style={styles.deptInfo}>
            <Text style={styles.deptName}>{dept.name}</Text>
            <Text style={styles.deptMeta}>Code: {dept.code} • {dept.programsCount} programs</Text>
          </View>
        </View>
      ))}

      {tab === 'courses' && (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={16} color="#94a3b8" />
            <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search courses" placeholderTextColor="#94a3b8" />
          </View>
          {filteredCourses.map((course) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={[styles.courseIcon, { backgroundColor: '#d9770614' }]}><Text style={styles.courseCode}>{course.code}</Text></View>
              <View style={styles.courseInfo}>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseMeta}>Sem {course.semester} • {course.credits} credits • {course.type}</Text>
              </View>
            </View>
          ))}
          {filteredCourses.length === 0 && <Text style={styles.emptyText}>No courses found.</Text>}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' }, content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  statLabel: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 14, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(171,173,175,0.15)' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#2563eb', elevation: 3 },
  tabText: { fontSize: 12, color: '#64748b', fontFamily: 'Manrope-SemiBold' }, activeTabText: { color: '#ffffff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', marginLeft: 8 },
  deptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  deptIcon: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  deptInfo: { flex: 1 }, deptName: { fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  deptMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  courseIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  courseCode: { fontSize: 10, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#d97706' },
  courseInfo: { flex: 1 }, courseName: { fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  courseMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
});
