import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { examcellApi } from '../../../../services/api';

import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../../../constants/theme';

export default function HallTicketsModule({ navigation }) {
  const [data, setData] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('tickets');
  const [search, setSearch] = useState('');

  const fetchExams = useCallback(async () => {
    try {
      const res = await examcellApi.exams();
      setExams(Array.isArray(res) ? res : []);
      if (res.length > 0) setSelectedExamId(res[0].id);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    if (!selectedExamId) return;
    try {
      setError(null);
      const res = await examcellApi.hallTickets(selectedExamId);
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedExamId]);

  useEffect(() => { fetchExams(); }, [fetchExams]);
  useEffect(() => { if (selectedExamId) { setLoading(true); fetchTickets(); } }, [selectedExamId, fetchTickets]);

  const onRefresh = () => { setRefreshing(true); fetchTickets(); };

  const handleGenerate = async () => {
    if (!selectedExamId) return;
    try {
      const res = await examcellApi.generateHallTickets(selectedExamId);
      Alert.alert('Hall Tickets Generated', `${res.generated} tickets generated across ${res.totalSlots} slots.`);
      fetchTickets();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const stats = {
    total: data?.stats?.total ?? 0,
    generated: data?.stats?.generated ?? 0,
    downloaded: data?.stats?.downloaded ?? 0,
  };

  const allTickets = data?.tickets ?? [];
  const filteredTickets = allTickets.filter(
    (t) => t.studentName.toLowerCase().includes(search.toLowerCase()) || t.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { id: 'generated', label: 'Generated', value: stats.generated.toString(), icon: 'ticket', color: '#2563eb' },
    { id: 'downloaded', label: 'Downloaded', value: stats.downloaded.toString(), icon: 'download', color: '#059669' },
    { id: 'total', label: 'Total', value: stats.total.toString(), icon: 'people', color: '#0284c7' },
  ];

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading hall tickets…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />}
    >
      {/* Exam selector */}
      {exams.length > 0 && (
        <View style={styles.examSelector}>
          <Text style={styles.fieldLabel}>Select Exam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examRow}>
            {exams.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.examChip, selectedExamId === e.id && styles.examChipActive]}
                onPress={() => setSelectedExamId(e.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.examChipText, selectedExamId === e.id && styles.examChipTextActive]} numberOfLines={1}>{e.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {statCards.map((stat) => (
          <View key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '14' }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.85}>
        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        <Text style={styles.generateBtnText}>Generate All Hall Tickets</Text>
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or roll no"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {filteredTickets.map((ticket) => (
        <View key={ticket.id} style={styles.ticketCard}>
          <View style={[styles.ticketIcon, { backgroundColor: '#2563eb14' }]}>
            <Ionicons name="ticket-outline" size={18} color="#2563eb" />
          </View>
          <View style={styles.ticketInfo}>
            <Text style={styles.ticketName}>{ticket.studentName}</Text>
            <Text style={styles.ticketMeta}>{ticket.rollNo} • {ticket.courseCode} • Seat {ticket.seatNo}</Text>
            <View style={styles.ticketChips}>
              <View style={[styles.dlChip, { backgroundColor: ticket.status === 'DOWNLOADED' ? '#0596691A' : '#64748b1A' }]}>
                <Text style={[styles.dlText, { color: ticket.status === 'DOWNLOADED' ? '#059669' : '#64748b' }]}>
                  {ticket.status === 'DOWNLOADED' ? 'Downloaded' : 'Generated'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
      {filteredTickets.length === 0 && <Text style={styles.emptyText}>No hall tickets found.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f9' },
  content: { padding: 24, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b', fontFamily: 'Manrope-Regular' },
  errorText: { marginTop: 12, fontSize: 14, color: '#dc2626', fontFamily: 'Manrope-Regular', textAlign: 'center' },
  retryBtn: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700', fontFamily: 'Manrope-Bold' },
  emptyText: { fontSize: 13, color: '#94a3b8', fontFamily: 'Manrope-Regular', textAlign: 'center', marginTop: 20 },
  examSelector: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', fontFamily: 'Manrope-Bold', marginBottom: 6 },
  examRow: { gap: 8 },
  examChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  examChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  examChipText: { fontSize: 12, color: '#475569', fontFamily: 'Manrope-Medium', maxWidth: 150 },
  examChipTextActive: { color: '#FFFFFF' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14 },
  statIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a', fontFamily: 'PlusJakartaSans-Bold', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: '#64748b', fontFamily: 'Manrope-Medium', marginTop: 2 },
  generateBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 12, marginBottom: 14 },
  generateBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope-Bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#0f172a', fontFamily: 'Manrope-Regular', marginLeft: 8 },
  ticketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#eef2f7', padding: 14, marginBottom: 10 },
  ticketIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ticketInfo: { flex: 1 },
  ticketName: { fontSize: 14, fontWeight: '600', color: '#0f172a', fontFamily: 'Manrope-SemiBold' },
  ticketMeta: { fontSize: 11, color: '#64748b', fontFamily: 'Manrope-Regular', marginTop: 1 },
  ticketChips: { flexDirection: 'row', gap: 8, marginTop: 6 },
  dlChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dlText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope-Bold' },
});
