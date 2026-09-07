import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { placementApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function StudentsModule({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try { setError(null); const res = await placementApi.students(); setStudents(Array.isArray(res) ? res : []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = students.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase());
  });

  const eligible = students.filter((s) => s.isEligible).length;
  const registered = students.filter((s) => s.registeredForDrives).length;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading students…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{students.length}</Text><Text style={styles.statLabel}>Eligible Pool</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{eligible}</Text><Text style={styles.statLabel}>Active</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{registered}</Text><Text style={styles.statLabel}>Registered</Text></View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search by name or roll no" placeholderTextColor="#94a3b8" />
      </View>

      {filtered.map((student) => (
        <View key={student.id} style={styles.studentCard}>
          <View style={[styles.studentAvatar, { backgroundColor: '#2563eb14' }]}><Text style={styles.studentInitial}>{student.name.split(' ').map((w) => w[0]).join('')}</Text></View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentMeta}>{student.rollNo}</Text>
            <View style={styles.studentChips}>
              <View style={[styles.statusChip, { backgroundColor: student.isEligible ? '#0596691A' : '#dc26261A' }]}>
                <Text style={[styles.statusText, { color: student.isEligible ? '#059669' : '#dc2626' }]}>{student.isEligible ? 'Eligible' : 'Blocked'}</Text>
              </View>
              {student.registeredForDrives && <View style={[styles.statusChip, { backgroundColor: '#2563eb1A' }]}><Text style={[styles.statusText, { color: '#2563eb' }]}>Registered</Text></View>}
            </View>
          </View>
        </View>
      ))}
      {filtered.length === 0 && <Text style={styles.emptyText}>No students found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' }, content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', marginLeft: 8 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  studentAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentInitial: { fontSize: 15, fontWeight: '800', fontFamily: 'PlusJakartaSans-Bold', color: '#2563eb' },
  studentInfo: { flex: 1 }, studentName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  studentMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  studentChips: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
