import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../../../services/api';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function TeachersModule({ navigation }) {
  const [teachers, setTeachers] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [t, l] = await Promise.all([adminApi.teachers(), adminApi.leaveRequests()]);
      setTeachers(Array.isArray(t) ? t : []);
      setLeaveRequests(Array.isArray(l) ? l : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = teachers.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  const pendingLeaves = leaveRequests.filter((r) => r.status === 'PENDING');

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.loadingText}>Loading teachers…</Text></View>;
  if (error) return <View style={styles.center}><Ionicons name="cloud-offline-outline" size={40} color="#94a3b8" /><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={fetchData} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statValue}>{teachers.length}</Text><Text style={styles.statLabel}>Total Teachers</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{pendingLeaves.length}</Text><Text style={styles.statLabel}>Pending Leaves</Text></View>
      </View>

      {pendingLeaves.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.sectionTitle}>Leave Requests</Text>
          {pendingLeaves.slice(0, 3).map((r) => (
            <View key={r.id} style={styles.leaveCard}>
              <View style={[styles.leaveAvatar, { backgroundColor: '#d9770614' }]}><Text style={styles.leaveInitial}>{r.teacherName.charAt(0)}</Text></View>
              <View style={styles.leaveInfo}>
                <Text style={styles.leaveName}>{r.teacherName}</Text>
                <Text style={styles.leaveMeta}>{r.type} • {r.days} days</Text>
              </View>
              <View style={[styles.statusChip, { backgroundColor: '#d977061A' }]}><Text style={[styles.statusText, { color: '#d97706' }]}>{r.status}</Text></View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search teachers" placeholderTextColor="#94a3b8" />
      </View>

      <Text style={styles.listLabel}>{filtered.length} teachers</Text>

      {filtered.map((teacher) => (
        <TouchableOpacity key={teacher.id} style={styles.teacherCard} activeOpacity={0.85}>
          <View style={[styles.avatar, { backgroundColor: '#05966914' }]}><Text style={styles.avatarText}>{teacher.name.split(' ').map((w) => w[0]).join('')}</Text></View>
          <View style={styles.teacherInfo}>
            <Text style={styles.teacherName}>{teacher.name}</Text>
            <Text style={styles.teacherMeta}>{teacher.designation || 'Faculty'} • {teacher.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
      {filtered.length === 0 && <Text style={styles.emptyText}>No teachers found.</Text>}
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
  block: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold', marginBottom: 14 },
  leaveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)' },
  leaveAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  leaveInitial: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold', color: '#d97706' },
  leaveInfo: { flex: 1 }, leaveName: { fontSize: 14, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  leaveMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', marginLeft: 8 },
  listLabel: { fontSize: 12, color: '#94a3b8', fontFamily: 'Manrope-Medium', marginBottom: 10 },
  teacherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(171,173,175,0.12)', elevation: 1 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 14, fontWeight: '700', fontFamily: 'PlusJakartaSans-Bold', color: '#059669' },
  teacherInfo: { flex: 1 }, teacherName: { fontSize: 15, fontWeight: '700', color: '#1e293b', fontFamily: 'PlusJakartaSans-Bold' },
  teacherMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  statusText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
