import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function StudentsModule({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');

  const fetchData = useCallback(async () => {
    try { setError(null); const res = await adminApi.students(); setStudents(Array.isArray(res) ? res : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = students.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase());
  });

  const active = students.filter((s) => s.status === 'ACTIVE').length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading students…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{students.length}</Text><Text style={styles.statLabel}>Total Students</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{active}</Text><Text style={styles.statLabel}>Active</Text></View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name or roll no" placeholderTextColor="#94a3b8" />
      </View>

      <Text style={styles.listLabel}>{filtered.length} students</Text>

      {filtered.map((student) => (
        <TouchableOpacity key={student.id} style={styles.studentCard} activeOpacity={0.85}>
          <View style={[styles.avatar, { backgroundColor: '#2563eb14' }]}><Text style={styles.avatarText}>{student.name.split(' ').map((w) => w[0]).join('')}</Text></View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentMeta}>{student.rollNo} • Sem {student.currentSemester || 'N/A'}</Text>
            <View style={styles.chipRow}>
              <View style={[styles.statusChip, { backgroundColor: student.status === 'ACTIVE' ? '#05966914' : '#d9770614' }]}>
                <Text style={[styles.statusText, { color: student.status === 'ACTIVE' ? '#059669' : '#d97706' }]}>{student.status}</Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
      {filtered.length === 0 && <Text style={styles.emptyText}>No students found.</Text>}
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', marginLeft: 8 },
  listLabel: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 10 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  studentMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  chipRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
